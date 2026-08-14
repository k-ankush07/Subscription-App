import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";
import {
  collectActionsForCycle,
  applyActionsToCycle,
  getContractSettingsSnapshot,
  getContractPreview,
  clearAnyOpenDraft,
  fetchVariantPrice,
} from "../lib/billing-preview.server";

const EXTRA_SETTINGS_NAMESPACE = "subscription_app";

export const loader = () => new Response("Use POST", { status: 405 });

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const secret = request.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET) {
    console.error("CRON_SECRET is not set in environment variables");
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  if (!secret || secret !== process.env.CRON_SECRET) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const shopOverride = url.searchParams.get("shop");

  try {
    let shops = await getShopsWithOfflineTokens();
    if (shopOverride) {
      if (!shops.includes(shopOverride)) {
        return json(
          {
            success: false,
            error: `Shop "${shopOverride}" has no offline token / is not installed`,
          },
          404,
        );
      }
      shops = [shopOverride];
    }

    const results = [];

    for (const shop of shops) {
      try {
        const { admin } = await unauthenticated.admin(shop);
        const shopResult = await processShop(admin);
        results.push({ shop, ...shopResult });
      } catch (err) {
        console.error(`[process-billing-cycles] failed for ${shop}:`, err);
        results.push({ shop, error: String(err?.message || err) });
      }
    }

    return json({ success: true, processed: results }, 200);
  } catch (err) {
    console.error("[process-billing-cycles] fatal error:", err);
    return json({ success: false, error: String(err?.message || err) }, 500);
  }
};

function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getShopsWithOfflineTokens() {
  const sessions = await prisma.session.findMany({
    where: { isOnline: false },
    select: { shop: true },
    distinct: ["shop"],
  });
  return sessions.map((s) => s.shop);
}

async function loadPlanGroupsAndSettings(admin) {
  const res = await admin.graphql(`
    query {
      shop { id }
      sellingPlanGroups(first: 50) {
        edges {
          node {
            id
            name
            sellingPlans(first: 20) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `);
  const data = await res.json();
  const shopId = data.data.shop.id;
  const groups = data.data.sellingPlanGroups.edges.map((e) => e.node);
  const sellingPlanIdToInfo = new Map();
  for (const group of groups) {
    for (const { node: plan } of group.sellingPlans.edges) {
      sellingPlanIdToInfo.set(plan.id, {
        groupId: group.id,
        groupName: group.name,
      });
    }
  }

  return { shopId, sellingPlanIdToInfo };
}

const PROCESSED_CYCLES_KEY = "processed_billing_cycles";
const CHARGED_CYCLES_KEY = "charged_billing_cycles";
const AUDIT_LOG_KEY = "audit_log";
const EDIT_LOOKAHEAD_MINUTES = 5;

async function appendAuditLog(admin, shopId, entry) {
  const res = await admin.graphql(`
    query {
      shop {
        metafield(namespace: "${EXTRA_SETTINGS_NAMESPACE}", key: "${AUDIT_LOG_KEY}") {
          value
        }
      }
    }
  `);
  const data = await res.json();
  let log = [];
  try {
    log = JSON.parse(data.data?.shop?.metafield?.value || "[]");
  } catch {
    log = [];
  }

  log.push({ ...entry, appliedAt: new Date().toISOString() });
  log = log.slice(-200);

  await admin.graphql(
    `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: EXTRA_SETTINGS_NAMESPACE,
            key: AUDIT_LOG_KEY,
            type: "json",
            value: JSON.stringify(log),
          },
        ],
      },
    },
  );
}

async function getMarkerSet(admin, shopId, key) {
  const res = await admin.graphql(
    `
    query getMarkerSet($namespace: String!, $key: String!) {
      shop {
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
    }
  `,
    { variables: { namespace: EXTRA_SETTINGS_NAMESPACE, key } },
  );
  const data = await res.json();
  const raw = data.data?.shop?.metafield?.value;
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

async function getProcessedCycles(admin, shopId) {
  return getMarkerSet(admin, shopId, PROCESSED_CYCLES_KEY);
}

async function getChargedCycles(admin, shopId) {
  return getMarkerSet(admin, shopId, CHARGED_CYCLES_KEY);
}

async function addMarker(admin, shopId, key, markerSet, marker) {
  markerSet.add(marker);
  const trimmed = Array.from(markerSet).slice(-500);
  await admin.graphql(
    `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: EXTRA_SETTINGS_NAMESPACE,
            key,
            type: "json",
            value: JSON.stringify(trimmed),
          },
        ],
      },
    },
  );
}

async function markCycleProcessed(admin, shopId, processedSet, marker) {
  return addMarker(admin, shopId, PROCESSED_CYCLES_KEY, processedSet, marker);
}

async function markCycleCharged(admin, shopId, chargedSet, marker) {
  return addMarker(admin, shopId, CHARGED_CYCLES_KEY, chargedSet, marker);
}

const MAX_LOOKBACK_DAYS = 90;

async function findEarliestDueCycle(admin, contractId, now, contractCreatedAt) {
  const lookbackFloor = new Date(
    now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
  const createdAtDate = contractCreatedAt
    ? new Date(contractCreatedAt)
    : lookbackFloor;

  const effectiveStart =
    createdAtDate.getTime() > lookbackFloor.getTime()
      ? createdAtDate
      : lookbackFloor;
  const startDate =
    effectiveStart.getTime() < now.getTime()
      ? effectiveStart.toISOString()
      : now.toISOString();
  const endDate = now.toISOString();

  let cycles = [];
  try {
    const res = await admin.graphql(
      `
      query getDueCycles($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
        subscriptionBillingCycles(
          first: 50
          contractId: $contractId
          billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
        ) {
          edges {
            node {
              cycleIndex
              billingAttemptExpectedDate
              status
              skipped
            }
          }
        }
      }
      `,
      { variables: { contractId, startDate, endDate } },
    );

    const data = await res.json();
    if (data.errors) {
      throw new Error(data.errors[0]?.message || "unknown GraphQL error");
    }
    cycles = (data.data?.subscriptionBillingCycles?.edges || []).map(
      (e) => e.node,
    );
  } catch (err) {
    console.error(
      `[findEarliestDueCycle] range query failed for ${contractId}, retrying with 7-day window:`,
      err,
    );
    const fallbackStart = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const res = await admin.graphql(
      `
      query getDueCyclesFallback($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
        subscriptionBillingCycles(
          first: 50
          contractId: $contractId
          billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
        ) {
          edges {
            node {
              cycleIndex
              billingAttemptExpectedDate
              status
              skipped
            }
          }
        }
      }
      `,
      { variables: { contractId, startDate: fallbackStart, endDate } },
    );
    const data = await res.json();
    if (data.errors) {
      throw new Error(
        data.errors[0]?.message || "unknown GraphQL error (fallback)",
      );
    }
    cycles = (data.data?.subscriptionBillingCycles?.edges || []).map(
      (e) => e.node,
    );
  }

  const nowTime = now.getTime();
  const dueUnbilled = cycles.filter((c) => {
    if (c.skipped) return false;
    if (c.status === "BILLED") return false;
    if (!c.billingAttemptExpectedDate) return false;
    return new Date(c.billingAttemptExpectedDate).getTime() <= nowTime;
  });

  if (dueUnbilled.length > 0) {
    dueUnbilled.sort((a, b) => a.cycleIndex - b.cycleIndex);
    return { cycle: dueUnbilled[0], nextUpcoming: null };
  }
  const FORWARD_LOOKAHEAD_DAYS = 30;
  const forwardEnd = new Date(
    now.getTime() + FORWARD_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let nextUpcoming = null;
  try {
    const forwardRes = await admin.graphql(
      `
      query getUpcomingCycle($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
        subscriptionBillingCycles(
          first: 5
          contractId: $contractId
          billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
        ) {
          edges {
            node {
              cycleIndex
              billingAttemptExpectedDate
              status
              skipped
            }
          }
        }
      }
      `,
      {
        variables: {
          contractId,
          startDate: now.toISOString(),
          endDate: forwardEnd,
        },
      },
    );
    const forwardData = await forwardRes.json();
    if (forwardData.errors) {
      throw new Error(
        forwardData.errors[0]?.message ||
          "unknown GraphQL error (forward lookahead)",
      );
    }
    const forwardCycles = (
      forwardData.data?.subscriptionBillingCycles?.edges || []
    ).map((e) => e.node);
    const upcoming = forwardCycles
      .filter(
        (c) =>
          !c.skipped && c.status !== "BILLED" && c.billingAttemptExpectedDate,
      )
      .sort(
        (a, b) =>
          new Date(a.billingAttemptExpectedDate) -
          new Date(b.billingAttemptExpectedDate),
      );
    nextUpcoming = upcoming[0] || null;
  } catch (err) {
    console.error(
      `[findEarliestDueCycle] forward lookahead failed for ${contractId}:`,
      err,
    );
  }

  return { cycle: null, nextUpcoming };
}

async function processShop(admin) {
  const { shopId, sellingPlanIdToInfo } =
    await loadPlanGroupsAndSettings(admin);
  const processedCycles = await getProcessedCycles(admin, shopId);
  const chargedCycles = await getChargedCycles(admin, shopId);

  // const contractsRes = await admin.graphql(`
  //   query {
  //     subscriptionContracts(first: 50, query: "status:active") {
  //       edges {
  //         node {
  //           id
  //           createdAt
  //           nextBillingDate
  //           deliveryPrice { amount currencyCode }
  //           billingPolicy {
  //             minCycles
  //             maxCycles
  //           }
  //           lines(first: 5) {
  //             edges {
  //               node {
  //                 id
  //                 sellingPlanId
  //                    variantId   
  //                 pricingPolicy {
  //                   basePrice { amount currencyCode }
  //                   cycleDiscounts {
  //                     afterCycle
  //                     adjustmentType
  //                     adjustmentValue {
  //                       ... on SellingPlanPricingPolicyPercentageValue { percentage }
  //                       ... on MoneyV2 { amount currencyCode }
  //                     }
  //                     computedPrice { amount currencyCode }
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }
  //   }
  // `);
  
  const contractsRes = await admin.graphql(`
    query {
      subscriptionContracts(first: 50, query: "status:active") {
        edges {
          node {
            id
            status
            createdAt
            nextBillingDate
            deliveryPrice { amount currencyCode }
            billingPolicy {
              minCycles
              maxCycles
            }
            customer {
              id
              displayName
              defaultEmailAddress { emailAddress }
            }
            lines(first: 50) {
              edges {
                node {
                  id
                  title
                  quantity
                  productId
                  sellingPlanId
                  variantId
                  currentPrice { amount currencyCode }
                  pricingPolicy {
                    basePrice { amount currencyCode }
                    cycleDiscounts {
                      afterCycle
                      adjustmentType
                      adjustmentValue {
                        ... on SellingPlanPricingPolicyPercentageValue { percentage }
                        ... on MoneyV2 { amount currencyCode }
                      }
                      computedPrice { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);
  const contractsData = await contractsRes.json();
  const contracts = contractsData.data.subscriptionContracts.edges.map(
    (e) => e.node,
  );

  const edited = [];
  const charged = [];
  const skipped = [];

  for (const contract of contracts) {
    const now = new Date();
    const { cycle, nextUpcoming } = await findEarliestDueCycle(
      admin,
      contract.id,
      now,
      contract.createdAt,
    );

    const sellingPlanId = contract.lines.edges[0]?.node?.sellingPlanId;
    // const basePriceAmount = contract.lines.edges[0]?.node?.pricingPolicy?.basePrice?.amount ?? null;
    const firstLineNode = contract.lines.edges[0]?.node;
    const liveVariantPrice = await fetchVariantPrice(
      admin,
      firstLineNode?.variantId,
    );
    const basePriceAmount =
      liveVariantPrice ??
      firstLineNode?.pricingPolicy?.basePrice?.amount ??
      null;
    const pricingPolicy = contract.lines.edges[0]?.node?.pricingPolicy ?? null; // needed for swap price recalc
    const deliveryPriceAmount = contract.deliveryPrice?.amount ?? null; // needed for shipping discount recalc
    const planInfo = sellingPlanId
      ? sellingPlanIdToInfo.get(sellingPlanId)
      : null;
    const groupId = planInfo?.groupId ?? null;
    const settings = await getContractSettingsSnapshot(
      admin,
      contract.id,
      shopId,
    );
    try {
      const minCycles = contract.billingPolicy?.minCycles ?? null;
      const maxCycles = contract.billingPolicy?.maxCycles ?? null;

      const preview = await getContractPreview(admin, contract.id,contract);
      const nextLineItems = preview?.nextOrder?.lineItems ?? [];
      const nextCycleIdx = preview?.nextOrder?.cycleIndex ?? null;

      let cancelReason = null;
      if (
        maxCycles != null &&
        nextCycleIdx != null &&
        nextCycleIdx >= maxCycles
      ) {
        cancelReason = `maximum billing cycles reached (cycle ${nextCycleIdx} >= max ${maxCycles})`;
      } else if (preview && nextLineItems.length === 0) {
        cancelReason =
          minCycles != null && nextCycleIdx != null && nextCycleIdx < minCycles
            ? `next order has zero line items (min cycles ${minCycles} not yet reached, but nothing left to bill)`
            : "next order has zero line items";
      }

      if (cancelReason) {
        const CANCEL_MUTATION = `
          mutation CancelSubscriptionContract($contractId: ID!) {
            subscriptionContractCancel(subscriptionContractId: $contractId) {
              contract { id status }
              userErrors { field message code }
            }
          }
        `;
        const isOpenEditError = (payload) =>
          payload?.userErrors?.some((e) =>
            /billing cycle contract edit|incomplete billing attempts/i.test(
              e.message || "",
            ),
          );
        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const WAIT_STEPS_MS = [2000, 4000, 6000];
        let cancelPayload = null;

        for (let attempt = 0; attempt <= WAIT_STEPS_MS.length; attempt++) {
          if (attempt > 0) {
            const waitMs = WAIT_STEPS_MS[attempt - 1];
            console.log(
              `[process-billing-cycles] cancel attempt ${attempt + 1}/${WAIT_STEPS_MS.length + 1} for ${contract.id} — waiting ${waitMs}ms`,
            );
            await sleep(waitMs);
          }

          const clearResults = await clearAnyOpenDraft(admin, contract.id, {
            fromIndex: 0,
            toIndex: (nextCycleIdx ?? 0) + 3,
          });
          const clearedCount = clearResults.filter((r) => r.cleared).length;
          console.log(
            `[process-billing-cycles] pre-cancel clear for ${contract.id} (attempt ${attempt + 1}): ${clearedCount} cleared, ${
              clearResults.length - clearedCount
            } failed`,
          );

          const cancelRes = await admin.graphql(CANCEL_MUTATION, {
            variables: { contractId: contract.id },
          });
          const cancelData = await cancelRes.json();
          cancelPayload = cancelData.data?.subscriptionContractCancel;

          if (cancelData.errors) {
            console.error(
              `[process-billing-cycles] auto-cancel GraphQL errors for ${contract.id}:`,
              JSON.stringify(cancelData.errors),
            );
          }

          if (!isOpenEditError(cancelPayload)) break;

          console.warn(
            `[process-billing-cycles] cancel attempt ${attempt + 1} for ${contract.id} blocked by open/incomplete billing cycle edit`,
          );
        }

        if (cancelPayload?.userErrors?.length) {
          console.error(
            `[process-billing-cycles] auto-cancel failed for ${contract.id}:`,
            cancelPayload.userErrors,
          );
          await appendAuditLog(admin, shopId, {
            contractId: contract.id,
            groupId,
            actions: ["AUTO_CANCEL"],
            status: "failed",
            reason: cancelReason,
            error: cancelPayload.userErrors.map((e) => e.message).join(", "),
          });
          skipped.push({
            contractId: contract.id,
            reason: `${cancelReason} — auto-cancel attempted but failed`,
            error: cancelPayload.userErrors.map((e) => e.message).join(", "),
          });
        } else {
          await appendAuditLog(admin, shopId, {
            contractId: contract.id,
            groupId,
            actions: ["AUTO_CANCEL"],
            status: "success",
            reason: cancelReason,
          });
          charged.push({
            contractId: contract.id,
            autoCancelled: true,
            newStatus: cancelPayload?.contract?.status ?? "CANCELLED",
            reason: cancelReason,
          });
        }
        continue;
      }
    } catch (err) {
      console.error(
        `[process-billing-cycles] failed auto-cancel check for ${contract.id}:`,
        err,
      );
    }

    if (nextUpcoming && settings) {
      const minsUntilDue =
        (new Date(nextUpcoming.billingAttemptExpectedDate).getTime() -
          now.getTime()) /
        60000;
      const editMarker = `${contract.id}:${nextUpcoming.cycleIndex}`;

      if (
        minsUntilDue >= 0 &&
        minsUntilDue <= EDIT_LOOKAHEAD_MINUTES &&
        !processedCycles.has(editMarker)
      ) {
        const actionsForUpcoming = collectActionsForCycle(
          settings,
          nextUpcoming.cycleIndex,
        );

        if (actionsForUpcoming.length > 0) {
          try {
            const { skippedActions } = await applyActionsToCycle(
              admin,
              contract.id,
              nextUpcoming.cycleIndex,
              actionsForUpcoming,
              basePriceAmount,
              pricingPolicy,
              nextUpcoming.billingAttemptExpectedDate, // still future here — date selector is valid
              deliveryPriceAmount,
            );
            await markCycleProcessed(
              admin,
              shopId,
              processedCycles,
              editMarker,
            );
            await appendAuditLog(admin, shopId, {
              contractId: contract.id,
              groupId,
              cycleIndex: nextUpcoming.cycleIndex,
              actions: actionsForUpcoming.map((a) => a.type),
              skippedActions: skippedActions?.length
                ? skippedActions
                : undefined,
              status: "success",
            });
            edited.push({
              contractId: contract.id,
              cycleIndex: nextUpcoming.cycleIndex,
              actions: actionsForUpcoming.map((a) => a.type),
              skippedActions: skippedActions?.length
                ? skippedActions
                : undefined,
            });
          } catch (err) {
            await appendAuditLog(admin, shopId, {
              contractId: contract.id,
              groupId,
              cycleIndex: nextUpcoming.cycleIndex,
              actions: actionsForUpcoming.map((a) => a.type),
              status: "failed",
              error: String(err?.message || err),
            });
            console.error(
              `[process-billing-cycles] failed to pre-edit upcoming contract ${contract.id}:`,
              err,
            );
            skipped.push({
              contractId: contract.id,
              cycleIndex: nextUpcoming.cycleIndex,
              reason:
                "error during pre-due draft apply — will retry next run if still not due",
              error: String(err?.message || err),
            });
          }
        }
      }
    }
    if (!cycle) {
      skipped.push({
        contractId: contract.id,
        reason: "no due cycle found (nothing overdue right now)",
        checkedAt: now.toISOString(),
        nextCycleIndex: nextUpcoming?.cycleIndex ?? null,
        nextExpectedDate: nextUpcoming?.billingAttemptExpectedDate ?? null,
      });
      continue;
    }

    const cycleIndex = cycle.cycleIndex;
    const chargeMarker = `${contract.id}:${cycleIndex}`;

    if (chargedCycles.has(chargeMarker)) {
      skipped.push({
        contractId: contract.id,
        cycleIndex,
        reason: "already charged",
        checkedAt: now.toISOString(),
      });
      continue;
    }
    const editMarkerForDueCycle = `${contract.id}:${cycleIndex}`;
    const actionsThatShouldHaveApplied = settings
      ? collectActionsForCycle(settings, cycleIndex)
      : [];
    if (
      actionsThatShouldHaveApplied.length > 0 &&
      !processedCycles.has(editMarkerForDueCycle)
    ) {
      console.warn(
        `[process-billing-cycles] contract ${contract.id} cycle ${cycleIndex} is due but was never pre-edited — configured automation actions will NOT apply to this charge.`,
      );
    }

    try {
      const chargeRes = await admin.graphql(
        `
        mutation ChargeSubscriptionCycle($contractId: ID!, $index: Int!) {
          subscriptionBillingCycleCharge(
            subscriptionContractId: $contractId
            billingCycleSelector: { index: $index }
          ) {
            subscriptionBillingAttempt {
              id
              ready
              errorMessage
              order { id }
            }
            userErrors { field message }
          }
        }
      `,
        { variables: { contractId: contract.id, index: cycleIndex } },
      );

      const chargeData = await chargeRes.json();
      const chargePayload = chargeData.data?.subscriptionBillingCycleCharge;
      const chargeErrors = chargePayload?.userErrors;

      if (chargeErrors?.length) {
        throw new Error(
          `subscriptionBillingCycleCharge failed: ${chargeErrors[0].message}`,
        );
      }

      const attempt = chargePayload?.subscriptionBillingAttempt;
      await markCycleCharged(admin, shopId, chargedCycles, chargeMarker);
      await appendAuditLog(admin, shopId, {
        contractId: contract.id,
        groupId,
        cycleIndex,
        actions: ["CHARGE"],
        status: "success",
        billingAttemptId: attempt?.id || null,
      });
      charged.push({
        contractId: contract.id,
        cycleIndex,
        billingAttemptId: attempt?.id || null,
        orderId: attempt?.order?.id || null,
        errorMessage: attempt?.errorMessage || null,
        ready: attempt?.ready ?? null,
      });
    } catch (err) {
      await appendAuditLog(admin, shopId, {
        contractId: contract.id,
        groupId,
        cycleIndex,
        actions: ["CHARGE"],
        status: "failed",
        error: String(err?.message || err),
      });
      console.error(
        `[process-billing-cycles] failed to charge contract ${contract.id}:`,
        err,
      );
      skipped.push({
        contractId: contract.id,
        cycleIndex,
        reason: "error during charge",
        error: String(err?.message || err),
      });
    }
  }
  return { contractsChecked: contracts.length, edited, charged, skipped };
}
