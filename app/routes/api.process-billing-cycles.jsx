
import { unauthenticated } from "../shopify.server";
import db from "../db.server";

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

async function getInstalledShops() {
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
  // Example: only from now -5 min to +24h
  const startDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const endDate   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
            billingCyclesDateRangeSelector: {
              startDate: $startDate
              endDate: $endDate
            }
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

      // Handle GraphQL-level errors (they may appear under `errors`)
      if (data.errors && data.errors.length) {
        const msg = data.errors.map(e => e.message).join("; ");
        if (msg.includes("Billing cycle start date out of range")) {
          contractErrors.push({
            contractId: contract.id,
            error: msg,
            note: "Ignored as out-of-range (treated as zero cycles)",
          });
          continue;
        }
        throw new Error(msg);
      }

      const cycles =
        data?.data?.subscriptionBillingCycles?.edges?.map((e) => e.node) || [];

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
      query ActiveContracts() {
        subscriptionContracts(first: 100, query: "status:ACTIVE") {
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