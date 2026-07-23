// import { unauthenticated } from "../shopify.server";
// import prisma from "../db.server";
// import {
//   collectActionsForCycle,
//   applyActionsToCycle,
//   getContractSettingsSnapshot,
// } from "../lib/billing-preview.server";

// const EXTRA_SETTINGS_NAMESPACE = "subscription_app";

// export const loader = () => new Response("Use POST", { status: 405 });

// export const action = async ({ request }) => {
//   if (request.method !== "POST") {
//     return new Response("Method Not Allowed", { status: 405 });
//   }
//   const secret = request.headers.get("x-cron-secret");

//   if (!process.env.CRON_SECRET) {
//     console.error("CRON_SECRET is not set in environment variables");
//     return json({ success: false, error: "Server misconfigured" }, 500);
//   }

//   if (!secret || secret !== process.env.CRON_SECRET) {
//     return json({ success: false, error: "Unauthorized" }, 401);
//   }

//   const url = new URL(request.url);
//   const shopOverride = url.searchParams.get("shop");

//   try {
//     let shops = await getShopsWithOfflineTokens();
//     if (shopOverride) {
//       if (!shops.includes(shopOverride)) {
//         return json(
//           { success: false, error: `Shop "${shopOverride}" has no offline token / is not installed` },
//           404,
//         );
//       }
//       shops = [shopOverride];
//     }

//     const results = [];

//     for (const shop of shops) {
//       try {
//         const { admin } = await unauthenticated.admin(shop);
//         const shopResult = await processShop(admin);
//         results.push({ shop, ...shopResult });
//       } catch (err) {
//         console.error(`[process-billing-cycles] failed for ${shop}:`, err);
//         results.push({ shop, error: String(err?.message || err) });
//       }
//     }

//     return json({ success: true, processed: results }, 200);
//   } catch (err) {
//     console.error("[process-billing-cycles] fatal error:", err);
//     return json({ success: false, error: String(err?.message || err) }, 500);
//   }
// };

// function json(data, status) {
//   return new Response(JSON.stringify(data, null, 2), {
//     status,
//     headers: { "Content-Type": "application/json" },
//   });
// }

// async function getShopsWithOfflineTokens() {
//   const sessions = await prisma.session.findMany({
//     where: { isOnline: false },
//     select: { shop: true },
//     distinct: ["shop"],
//   });
//   return sessions.map((s) => s.shop);
// }

// async function loadPlanGroupsAndSettings(admin) {
//   const res = await admin.graphql(`
//     query {
//       shop { id }
//       sellingPlanGroups(first: 50) {
//         edges {
//           node {
//             id
//             name
//             sellingPlans(first: 20) {
//               edges {
//                 node {
//                   id
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `);
//   const data = await res.json();
//   const shopId = data.data.shop.id;
//   const groups = data.data.sellingPlanGroups.edges.map((e) => e.node);

//   // sellingPlanId -> { groupId, groupName }
//   const sellingPlanIdToInfo = new Map();
//   for (const group of groups) {
//     for (const { node: plan } of group.sellingPlans.edges) {
//       sellingPlanIdToInfo.set(plan.id, {
//         groupId: group.id,
//         groupName: group.name,
//       });
//     }
//   }

//   return { shopId, sellingPlanIdToInfo };
// }

// const PROCESSED_CYCLES_KEY = "processed_billing_cycles";
// const CHARGED_CYCLES_KEY = "charged_billing_cycles";
// const AUDIT_LOG_KEY = "audit_log";

// async function appendAuditLog(admin, shopId, entry) {
//   const res = await admin.graphql(`
//     query {
//       shop {
//         metafield(namespace: "${EXTRA_SETTINGS_NAMESPACE}", key: "${AUDIT_LOG_KEY}") {
//           value
//         }
//       }
//     }
//   `);
//   const data = await res.json();
//   let log = [];
//   try {
//     log = JSON.parse(data.data?.shop?.metafield?.value || "[]");
//   } catch {
//     log = [];
//   }

//   log.push({ ...entry, appliedAt: new Date().toISOString() });
//   log = log.slice(-200);

//   await admin.graphql(
//     `
//     mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
//       metafieldsSet(metafields: $metafields) {
//         userErrors { field message }
//       }
//     }
//   `,
//     {
//       variables: {
//         metafields: [
//           {
//             ownerId: shopId,
//             namespace: EXTRA_SETTINGS_NAMESPACE,
//             key: AUDIT_LOG_KEY,
//             type: "json",
//             value: JSON.stringify(log),
//           },
//         ],
//       },
//     },
//   );
// }

// async function getMarkerSet(admin, shopId, key) {
//   const res = await admin.graphql(
//     `
//     query getMarkerSet($namespace: String!, $key: String!) {
//       shop {
//         metafield(namespace: $namespace, key: $key) {
//           value
//         }
//       }
//     }
//   `,
//     { variables: { namespace: EXTRA_SETTINGS_NAMESPACE, key } },
//   );
//   const data = await res.json();
//   const raw = data.data?.shop?.metafield?.value;
//   if (!raw) return new Set();
//   try {
//     return new Set(JSON.parse(raw));
//   } catch {
//     return new Set();
//   }
// }

// async function getProcessedCycles(admin, shopId) {
//   return getMarkerSet(admin, shopId, PROCESSED_CYCLES_KEY);
// }

// async function getChargedCycles(admin, shopId) {
//   return getMarkerSet(admin, shopId, CHARGED_CYCLES_KEY);
// }

// async function addMarker(admin, shopId, key, markerSet, marker) {
//   markerSet.add(marker);
//   const trimmed = Array.from(markerSet).slice(-500);
//   await admin.graphql(
//     `
//     mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
//       metafieldsSet(metafields: $metafields) {
//         userErrors { field message }
//       }
//     }
//   `,
//     {
//       variables: {
//         metafields: [
//           {
//             ownerId: shopId,
//             namespace: EXTRA_SETTINGS_NAMESPACE,
//             key,
//             type: "json",
//             value: JSON.stringify(trimmed),
//           },
//         ],
//       },
//     },
//   );
// }

// async function markCycleProcessed(admin, shopId, processedSet, marker) {
//   return addMarker(admin, shopId, PROCESSED_CYCLES_KEY, processedSet, marker);
// }

// async function markCycleCharged(admin, shopId, chargedSet, marker) {
//   return addMarker(admin, shopId, CHARGED_CYCLES_KEY, chargedSet, marker);
// }

// const MAX_LOOKBACK_DAYS = 90;

// async function findEarliestDueCycle(admin, contractId, now, contractCreatedAt) {
//   const lookbackFloor = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
//   const createdAtDate = contractCreatedAt ? new Date(contractCreatedAt) : lookbackFloor;

//   const effectiveStart =
//     createdAtDate.getTime() > lookbackFloor.getTime() ? createdAtDate : lookbackFloor;
//   const startDate = effectiveStart.getTime() < now.getTime() ? effectiveStart.toISOString() : now.toISOString();
//   const endDate = now.toISOString();

//   let cycles = [];
//   try {
//     const res = await admin.graphql(
//       `
//       query getDueCycles($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
//         subscriptionBillingCycles(
//           first: 50
//           contractId: $contractId
//           billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
//         ) {
//           edges {
//             node {
//               cycleIndex
//               billingAttemptExpectedDate
//               status
//               skipped
//             }
//           }
//         }
//       }
//       `,
//       { variables: { contractId, startDate, endDate } },
//     );

//     const data = await res.json();
//     if (data.errors) {
//       throw new Error(data.errors[0]?.message || "unknown GraphQL error");
//     }
//     cycles = (data.data?.subscriptionBillingCycles?.edges || []).map((e) => e.node);
//   } catch (err) {
//     console.error(`[findEarliestDueCycle] range query failed for ${contractId}, retrying with 7-day window:`, err);
//     const fallbackStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
//     const res = await admin.graphql(
//       `
//       query getDueCyclesFallback($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
//         subscriptionBillingCycles(
//           first: 50
//           contractId: $contractId
//           billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
//         ) {
//           edges {
//             node {
//               cycleIndex
//               billingAttemptExpectedDate
//               status
//               skipped
//             }
//           }
//         }
//       }
//       `,
//       { variables: { contractId, startDate: fallbackStart, endDate } },
//     );
//     const data = await res.json();
//     if (data.errors) {
//       throw new Error(data.errors[0]?.message || "unknown GraphQL error (fallback)");
//     }
//     cycles = (data.data?.subscriptionBillingCycles?.edges || []).map((e) => e.node);
//   }

//   const nowTime = now.getTime();
//   const dueUnbilled = cycles.filter((c) => {
//     if (c.skipped) return false;
//     if (c.status === "BILLED") return false;
//     if (!c.billingAttemptExpectedDate) return false;
//     return new Date(c.billingAttemptExpectedDate).getTime() <= nowTime;
//   });

//   if (dueUnbilled.length > 0) {
//     dueUnbilled.sort((a, b) => a.cycleIndex - b.cycleIndex);
//     return { cycle: dueUnbilled[0], nextUpcoming: null };
//   }

//   // FIX: nothing due in the [start, now] window — that window can't contain
//   // a future cycle by construction, so look ahead separately with a
//   // forward-looking range to find the next upcoming (not-yet-due) cycle.
//   const FORWARD_LOOKAHEAD_DAYS = 30;
//   const forwardEnd = new Date(now.getTime() + FORWARD_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString();

//   let nextUpcoming = null;
//   try {
//     const forwardRes = await admin.graphql(
//       `
//       query getUpcomingCycle($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
//         subscriptionBillingCycles(
//           first: 5
//           contractId: $contractId
//           billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
//         ) {
//           edges {
//             node {
//               cycleIndex
//               billingAttemptExpectedDate
//               status
//               skipped
//             }
//           }
//         }
//       }
//       `,
//       { variables: { contractId, startDate: now.toISOString(), endDate: forwardEnd } },
//     );
//     const forwardData = await forwardRes.json();
//     if (forwardData.errors) {
//       throw new Error(forwardData.errors[0]?.message || "unknown GraphQL error (forward lookahead)");
//     }
//     const forwardCycles = (forwardData.data?.subscriptionBillingCycles?.edges || []).map((e) => e.node);
//     const upcoming = forwardCycles
//       .filter((c) => !c.skipped && c.status !== "BILLED" && c.billingAttemptExpectedDate)
//       .sort((a, b) => new Date(a.billingAttemptExpectedDate) - new Date(b.billingAttemptExpectedDate));
//     nextUpcoming = upcoming[0] || null;
//   } catch (err) {
//     console.error(`[findEarliestDueCycle] forward lookahead failed for ${contractId}:`, err);
//     // Non-fatal — just leave nextUpcoming as null, same as today's behavior.
//   }

//   return { cycle: null, nextUpcoming };
// }

// async function processShop(admin) {
//   const { shopId, sellingPlanIdToInfo } = await loadPlanGroupsAndSettings(admin);
//   const processedCycles = await getProcessedCycles(admin, shopId);
//   const chargedCycles = await getChargedCycles(admin, shopId);

//   const contractsRes = await admin.graphql(`
//     query {
//       subscriptionContracts(first: 50, query: "status:active") {
//         edges {
//           node {
//             id
//             createdAt
//             nextBillingDate
//             lines(first: 5) {
//               edges {
//                 node {
//                   id
//                   sellingPlanId
//                   pricingPolicy {
//                     basePrice { amount currencyCode }
//                     cycleDiscounts {
//                       afterCycle
//                       adjustmentType
//                       adjustmentValue {
//                         ... on SellingPlanPricingPolicyPercentageValue { percentage }
//                         ... on MoneyV2 { amount currencyCode }
//                       }
//                       computedPrice { amount currencyCode }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `);
//   const contractsData = await contractsRes.json();
//   const contracts = contractsData.data.subscriptionContracts.edges.map((e) => e.node);

//   const edited = [];
//   const charged = [];
//   const skipped = [];

//   for (const contract of contracts) {
//     const now = new Date();
//     const { cycle, nextUpcoming } = await findEarliestDueCycle(admin, contract.id, now, contract.createdAt);

//     if (!cycle) {
//       skipped.push({
//         contractId: contract.id,
//         reason: "no due cycle found (nothing overdue right now)",
//         checkedAt: now.toISOString(),
//         nextCycleIndex: nextUpcoming?.cycleIndex ?? null,
//         nextExpectedDate: nextUpcoming?.billingAttemptExpectedDate ?? null,
//       });
//       continue;
//     }

//     const cycleIndex = cycle.cycleIndex;
//     const editMarker = `${contract.id}:${cycleIndex}`;
//     const sellingPlanId = contract.lines.edges[0]?.node?.sellingPlanId;
//     const basePriceAmount = contract.lines.edges[0]?.node?.pricingPolicy?.basePrice?.amount ?? null;
//     const pricingPolicy = contract.lines.edges[0]?.node?.pricingPolicy ?? null; // needed for swap price recalc
//     const planInfo = sellingPlanId ? sellingPlanIdToInfo.get(sellingPlanId) : null;
//     const groupId = planInfo?.groupId ?? null;
//     const settings = await getContractSettingsSnapshot(admin, contract.id, shopId);

//     const actionsForThisCycle = settings ? collectActionsForCycle(settings, cycleIndex) : [];

//     if (actionsForThisCycle.length > 0 && !processedCycles.has(editMarker)) {
//       try {
//         const { skippedActions } = await applyActionsToCycle(
//           admin,
//           contract.id,
//           cycleIndex,
//           actionsForThisCycle,
//           basePriceAmount,
//           pricingPolicy, 
//         );
//         await markCycleProcessed(admin, shopId, processedCycles, editMarker);
//         await appendAuditLog(admin, shopId, {
//           contractId: contract.id,
//           groupId,
//           cycleIndex,
//           actions: actionsForThisCycle.map((a) => a.type),
//           skippedActions: skippedActions?.length ? skippedActions : undefined,
//           status: "success",
//         });
//         edited.push({
//           contractId: contract.id,
//           cycleIndex,
//           actions: actionsForThisCycle.map((a) => a.type),
//           skippedActions: skippedActions?.length ? skippedActions : undefined,
//         });
//       } catch (err) {
//         await appendAuditLog(admin, shopId, {
//           contractId: contract.id,
//           groupId,
//           cycleIndex,
//           actions: actionsForThisCycle.map((a) => a.type),
//           status: "failed",
//           error: String(err?.message || err),
//         });
//         console.error(`[process-billing-cycles] failed to edit contract ${contract.id}:`, err);
//         skipped.push({
//           contractId: contract.id,
//           cycleIndex,
//           reason: "error during draft apply — cycle NOT charged, will retry next run",
//           error: String(err?.message || err),
//         });
//         continue;
//       }
//     }

//     const chargeMarker = `${contract.id}:${cycleIndex}`;
//     if (chargedCycles.has(chargeMarker)) {
//       skipped.push({ contractId: contract.id, cycleIndex, reason: "already charged", checkedAt: now.toISOString() });
//       continue;
//     }

//     try {
//       const chargeRes = await admin.graphql(
//         `
//         mutation ChargeSubscriptionCycle($contractId: ID!, $index: Int!) {
//           subscriptionBillingCycleCharge(
//             subscriptionContractId: $contractId
//             billingCycleSelector: { index: $index }
//           ) {
//             subscriptionBillingAttempt {
//               id
//               ready
//               errorMessage
//               order { id }
//             }
//             userErrors { field message }
//           }
//         }
//       `,
//         { variables: { contractId: contract.id, index: cycleIndex } },
//       );

//       const chargeData = await chargeRes.json();
//       const chargePayload = chargeData.data?.subscriptionBillingCycleCharge;
//       const chargeErrors = chargePayload?.userErrors;

//       if (chargeErrors?.length) {
//         throw new Error(`subscriptionBillingCycleCharge failed: ${chargeErrors[0].message}`);
//       }

//       const attempt = chargePayload?.subscriptionBillingAttempt;
//       await markCycleCharged(admin, shopId, chargedCycles, chargeMarker);
//       await appendAuditLog(admin, shopId, {
//         contractId: contract.id,
//         groupId,
//         cycleIndex,
//         actions: ["CHARGE"],
//         status: "success",
//         billingAttemptId: attempt?.id || null,
//       });
//       charged.push({
//         contractId: contract.id,
//         cycleIndex,
//         billingAttemptId: attempt?.id || null,
//         orderId: attempt?.order?.id || null,
//         errorMessage: attempt?.errorMessage || null,
//         ready: attempt?.ready ?? null,
//       });
//     } catch (err) {
//       await appendAuditLog(admin, shopId, {
//         contractId: contract.id,
//         groupId,
//         cycleIndex,
//         actions: ["CHARGE"],
//         status: "failed",
//         error: String(err?.message || err),
//       });
//       console.error(`[process-billing-cycles] failed to charge contract ${contract.id}:`, err);
//       skipped.push({
//         contractId: contract.id,
//         cycleIndex,
//         reason: "error during charge",
//         error: String(err?.message || err),
//       });
//     }
//   }
//   return { contractsChecked: contracts.length, edited, charged, skipped };
// }



import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";
import {
  collectActionsForCycle,
  applyActionsToCycle,
  getContractSettingsSnapshot,
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
          { success: false, error: `Shop "${shopOverride}" has no offline token / is not installed` },
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

  // sellingPlanId -> { groupId, groupName }
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
  const lookbackFloor = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const createdAtDate = contractCreatedAt ? new Date(contractCreatedAt) : lookbackFloor;

  const effectiveStart =
    createdAtDate.getTime() > lookbackFloor.getTime() ? createdAtDate : lookbackFloor;
  const startDate = effectiveStart.getTime() < now.getTime() ? effectiveStart.toISOString() : now.toISOString();
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
    cycles = (data.data?.subscriptionBillingCycles?.edges || []).map((e) => e.node);
  } catch (err) {
    console.error(`[findEarliestDueCycle] range query failed for ${contractId}, retrying with 7-day window:`, err);
    const fallbackStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
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
      throw new Error(data.errors[0]?.message || "unknown GraphQL error (fallback)");
    }
    cycles = (data.data?.subscriptionBillingCycles?.edges || []).map((e) => e.node);
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

  // FIX: nothing due in the [start, now] window — that window can't contain
  // a future cycle by construction, so look ahead separately with a
  // forward-looking range to find the next upcoming (not-yet-due) cycle.
  const FORWARD_LOOKAHEAD_DAYS = 30;
  const forwardEnd = new Date(now.getTime() + FORWARD_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000).toISOString();

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
      { variables: { contractId, startDate: now.toISOString(), endDate: forwardEnd } },
    );
    const forwardData = await forwardRes.json();
    if (forwardData.errors) {
      throw new Error(forwardData.errors[0]?.message || "unknown GraphQL error (forward lookahead)");
    }
    const forwardCycles = (forwardData.data?.subscriptionBillingCycles?.edges || []).map((e) => e.node);
    const upcoming = forwardCycles
      .filter((c) => !c.skipped && c.status !== "BILLED" && c.billingAttemptExpectedDate)
      .sort((a, b) => new Date(a.billingAttemptExpectedDate) - new Date(b.billingAttemptExpectedDate));
    nextUpcoming = upcoming[0] || null;
  } catch (err) {
    console.error(`[findEarliestDueCycle] forward lookahead failed for ${contractId}:`, err);
    // Non-fatal — just leave nextUpcoming as null, same as today's behavior.
  }

  return { cycle: null, nextUpcoming };
}

async function processShop(admin) {
  const { shopId, sellingPlanIdToInfo } = await loadPlanGroupsAndSettings(admin);
  const processedCycles = await getProcessedCycles(admin, shopId);
  const chargedCycles = await getChargedCycles(admin, shopId);

  const contractsRes = await admin.graphql(`
    query {
      subscriptionContracts(first: 50, query: "status:active") {
        edges {
          node {
            id
            createdAt
            nextBillingDate
            lines(first: 5) {
              edges {
                node {
                  id
                  sellingPlanId
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
  const contracts = contractsData.data.subscriptionContracts.edges.map((e) => e.node);

  const edited = [];
  const charged = [];
  const skipped = [];

  for (const contract of contracts) {
    const now = new Date();
    const { cycle, nextUpcoming } = await findEarliestDueCycle(admin, contract.id, now, contract.createdAt);

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
    // CHANGED — keep the cycle's expected billing date so we can use it as a
    // date selector when opening the draft edit below. Shopify's
    // subscriptionBillingCycleContractEdit can reject an `index` selector
    // with "Billing cycle selector is invalid" for a cycle that hasn't been
    // realized yet (no billing attempt / edit ever touched it) — the date
    // selector is the reliable one in that case.
    const cycleDate = cycle.billingAttemptExpectedDate;
    const editMarker = `${contract.id}:${cycleIndex}`;
    const sellingPlanId = contract.lines.edges[0]?.node?.sellingPlanId;
    const basePriceAmount = contract.lines.edges[0]?.node?.pricingPolicy?.basePrice?.amount ?? null;
    const pricingPolicy = contract.lines.edges[0]?.node?.pricingPolicy ?? null; // needed for swap price recalc
    const planInfo = sellingPlanId ? sellingPlanIdToInfo.get(sellingPlanId) : null;
    const groupId = planInfo?.groupId ?? null;
    const settings = await getContractSettingsSnapshot(admin, contract.id, shopId);

    const actionsForThisCycle = settings ? collectActionsForCycle(settings, cycleIndex) : [];

    if (actionsForThisCycle.length > 0 && !processedCycles.has(editMarker)) {
      try {
        const { skippedActions } = await applyActionsToCycle(
          admin,
          contract.id,
          cycleIndex,
          actionsForThisCycle,
          basePriceAmount,
          pricingPolicy,
          cycleDate, // CHANGED — pass the date through so the draft-edit uses a date selector
        );
        await markCycleProcessed(admin, shopId, processedCycles, editMarker);
        await appendAuditLog(admin, shopId, {
          contractId: contract.id,
          groupId,
          cycleIndex,
          actions: actionsForThisCycle.map((a) => a.type),
          skippedActions: skippedActions?.length ? skippedActions : undefined,
          status: "success",
        });
        edited.push({
          contractId: contract.id,
          cycleIndex,
          actions: actionsForThisCycle.map((a) => a.type),
          skippedActions: skippedActions?.length ? skippedActions : undefined,
        });
      } catch (err) {
        await appendAuditLog(admin, shopId, {
          contractId: contract.id,
          groupId,
          cycleIndex,
          actions: actionsForThisCycle.map((a) => a.type),
          status: "failed",
          error: String(err?.message || err),
        });
        console.error(`[process-billing-cycles] failed to edit contract ${contract.id}:`, err);
        skipped.push({
          contractId: contract.id,
          cycleIndex,
          reason: "error during draft apply — cycle NOT charged, will retry next run",
          error: String(err?.message || err),
        });
        continue;
      }
    }

    const chargeMarker = `${contract.id}:${cycleIndex}`;
    if (chargedCycles.has(chargeMarker)) {
      skipped.push({ contractId: contract.id, cycleIndex, reason: "already charged", checkedAt: now.toISOString() });
      continue;
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
        throw new Error(`subscriptionBillingCycleCharge failed: ${chargeErrors[0].message}`);
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
      console.error(`[process-billing-cycles] failed to charge contract ${contract.id}:`, err);
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