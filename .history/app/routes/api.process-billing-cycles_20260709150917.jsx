// app/routes/api.process-billing-cycles.jsx
//
// Remix flat-routes convention: this file maps to POST /api/process-billing-cycles
// Matches your curl test:
//   curl.exe -X POST https://<your-tunnel>.trycloudflare.com/api/process-billing-cycles \
//     -H "x-cron-secret: kittyrama_super_secret_2026"
//
// This route is meant to be hit by an external cron service, NOT by the
// Shopify admin iframe — so it does NOT use authenticate.admin(request)
// (there's no Shopify session/cookie on a cron request). Instead it's
// protected by a shared secret header.

import { unauthenticated } from "../shopify.server";
// ^ ASSUMPTION: your shopify.server.js exports `unauthenticated`
//   (this comes from @shopify/shopify-app-remix). If it doesn't yet, add:
//     export const unauthenticated = shopify.unauthenticated;
//   to shopify.server.js.

import db from "../db.server";
// ^ ASSUMPTION: you have a Prisma client (or similar) at app/db.server.js
//   that can list installed shops from the Session table. Adjust the
//   query in getInstalledShops() below to match your actual schema.

const CRON_SECRET = process.env.CRON_SECRET;

// GET/other methods aren't supported - only POST from the cron job
export const loader = () => new Response("Method Not Allowed", { status: 405 });

export async function action({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const incomingSecret = request.headers.get("x-cron-secret");

  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set in environment variables");
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  if (!incomingSecret || incomingSecret !== CRON_SECRET) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  try {
    const results = await processBillingCyclesForAllShops();
    return json({ success: true, ...results }, 200);
  } catch (err) {
    console.error("process-billing-cycles failed:", err);
    return json({ success: false, error: err.message }, 500);
  }
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// --- Core logic -------------------------------------------------------

async function getInstalledShops() {
  // ASSUMPTION: adjust table/field names to your actual Prisma schema.
  // Typically the Shopify Remix template's Session model has a `shop` field
  // and only offline sessions (isOnline: false) are usable for background jobs.
  const sessions = await db.session.findMany({
    where: { isOnline: false },
    select: { shop: true },
    distinct: ["shop"],
  });
  return sessions.map((s) => s.shop);
}

async function processBillingCyclesForAllShops() {
  const shops = await getInstalledShops();
  const processedShops = [];
  const errors = [];

  for (const shop of shops) {
    try {
      const { admin } = await unauthenticated.admin(shop);
      const summary = await processShopBillingCycles(admin, shop);
      processedShops.push({ shop, ...summary });
    } catch (err) {
      console.error(`Failed processing shop ${shop}:`, err);
      errors.push({ shop, error: err.message });
    }
  }

  return { processedShops, errors };
}

async function processShopBillingCycles(admin, shop) {
  // Shopify's subscriptionBillingCycles field always requires a contractId —
  // there is no shop-wide "all cycles" query. So we first list active
  // contracts, then query billing cycles per contract.

  const today = new Date().toISOString().split("T")[0];
  const startDate = `${today}T00:00:00Z`;
  const endDate = `${today}T23:59:59Z`;

  const contracts = await getActiveContracts(admin);

  let dueCyclesFound = 0;
  const contractErrors = [];

  for (const contract of contracts) {
    try {
      const response = await admin.graphql(
        `
        query DueBillingCycles(
          $contractId: ID!
          $startDate: DateTime!
          $endDate: DateTime!
        ) {
          subscriptionBillingCycles(
            first: 50
            contractId: $contractId
            billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
          ) {
            edges {
              node {
                cycleIndex
                billingAttemptExpectedDate
                skipped
                status
              }
            }
          }
        }
        `,
        {
          variables: { contractId: contract.id, startDate, endDate },
        },
      );

      const data = await response.json();
      const cycles =
        data?.data?.subscriptionBillingCycles?.edges?.map((e) => e.node) || [];

      // TODO: replace with real processing (skip/notify/sync to backend etc.)
      dueCyclesFound += cycles.length;
    } catch (err) {
      contractErrors.push({ contractId: contract.id, error: err.message });
    }
  }

  return { contractsChecked: contracts.length, dueCyclesFound, contractErrors };
}

async function getActiveContracts(admin) {
  // Paginates through all ACTIVE subscription contracts for this shop.
  const contracts = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.graphql(
      `
      query ActiveContracts($cursor: String) {
        subscriptionContracts(first: 100, after: $cursor, query: "status:ACTIVE") {
          edges {
            cursor
            node { id }
          }
          pageInfo { hasNextPage }
        }
      }
      `,
      { variables: { cursor } },
    );

    const data = await response.json();
    const payload = data?.data?.subscriptionContracts;
    const edges = payload?.edges || [];

    contracts.push(...edges.map((e) => e.node));
    hasNextPage = payload?.pageInfo?.hasNextPage || false;
    cursor = edges.length ? edges[edges.length - 1].cursor : null;
  }

  return contracts;
}