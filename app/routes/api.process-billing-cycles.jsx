import { unauthenticated } from "../shopify.server";
import prisma from "../db.server";
import { collectActionsForCycle, applyActionsToCycle } from "../lib/billing-preview.server";

const EXTRA_SETTINGS_NAMESPACE = "subscription_app";

// Reject GET/other verbs politely rather than 500ing.
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

// ─────────────────────────────────────────────
// FIX: extra_settings tumhare create-plan flow me SELLING PLAN ke upar
// save hota hai (namespace "subscription_app", key "extra_settings"),
// shop ke upar nahi. Pehle ye function shop-level metafields
// ("extra_settings_<groupId>") padh raha tha jo kabhi exist hi nahi
// karta — isliye settings hamesha null aate the aur koi action apply
// nahi hota tha. Ab exactly wahi tareeka use ho raha hai jo
// getContractPreview() me already sahi tha.
// ─────────────────────────────────────────────
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
                  extraSettingsMetafield: metafield(
                    namespace: "subscription_app"
                    key: "extra_settings"
                  ) {
                    value
                  }
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

  // sellingPlanId -> { groupId, groupName, settings }
  const sellingPlanIdToInfo = new Map();
  for (const group of groups) {
    for (const { node: plan } of group.sellingPlans.edges) {
      const raw = plan.extraSettingsMetafield?.value;
      let settings = null;
      if (raw) {
        try {
          settings = JSON.parse(raw);
        } catch {
          settings = null;
        }
      }
      sellingPlanIdToInfo.set(plan.id, {
        groupId: group.id,
        groupName: group.name,
        settings,
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
            nextBillingDate
            lines(first: 5) {
              edges { node { id sellingPlanId } }
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
    // Use "now" as the date selector — NOT contract.nextBillingDate, which
    // Shopify never auto-advances once a cycle bills.
    const nowIso = new Date().toISOString();
    const cycleRes = await admin.graphql(
      `
      query getCycleByDate($contractId: ID!, $date: DateTime!) {
        subscriptionBillingCycle(
          billingCycleInput: { contractId: $contractId, selector: { date: $date } }
        ) {
          cycleIndex
          billingAttemptExpectedDate
          skipped
        }
      }
    `,
      { variables: { contractId: contract.id, date: nowIso } },
    );

    const cycleData = await cycleRes.json();
    const cycle = cycleData.data?.subscriptionBillingCycle;
    if (!cycle) {
      skipped.push({ contractId: contract.id, reason: "no cycle found for current date" });
      continue;
    }

    if (cycle.skipped) {
      skipped.push({ contractId: contract.id, cycleIndex: cycle.cycleIndex, reason: "cycle marked skipped" });
      continue;
    }

    const cycleIndex = cycle.cycleIndex;
    const editMarker = `${contract.id}:${cycleIndex}`;

    const expectedDate = cycle.billingAttemptExpectedDate ? new Date(cycle.billingAttemptExpectedDate) : null;
    const now = new Date();
    if (!expectedDate || expectedDate.getTime() > now.getTime()) {
      skipped.push({
        contractId: contract.id,
        cycleIndex,
        reason: "not due yet",
        expectedDate: cycle.billingAttemptExpectedDate || null,
      });
      continue;
    }

    // FIX: look up settings by sellingPlanId directly, from the selling-plan-level
    // metafield map, instead of the old (broken) shop-level groupId lookup.
    const sellingPlanId = contract.lines.edges[0]?.node?.sellingPlanId;
    const planInfo = sellingPlanId ? sellingPlanIdToInfo.get(sellingPlanId) : null;
    const groupId = planInfo?.groupId ?? null;
    const settings = planInfo?.settings ?? null;
    const actionsForThisCycle = settings ? collectActionsForCycle(settings, cycleIndex) : [];

    if (actionsForThisCycle.length > 0 && !processedCycles.has(editMarker)) {
      try {
        await applyActionsToCycle(admin, contract.id, cycleIndex, actionsForThisCycle);
        await markCycleProcessed(admin, shopId, processedCycles, editMarker);
        await appendAuditLog(admin, shopId, {
          contractId: contract.id,
          groupId,
          cycleIndex,
          actions: actionsForThisCycle.map((a) => a.type),
          status: "success",
        });
        edited.push({ contractId: contract.id, cycleIndex, actions: actionsForThisCycle.map((a) => a.type) });
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
      skipped.push({ contractId: contract.id, cycleIndex, reason: "already charged" });
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