import { unauthenticated } from "../shopify.server";
import { clearBillingCycleEdit } from "../lib/billing-preview.server";

export const loader = () => new Response("Use POST", { status: 405 });

export const action = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const secret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || !secret || secret !== process.env.CRON_SECRET) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const rawContractId = url.searchParams.get("contractId");
  const shouldCancel = url.searchParams.get("cancel") !== "false";
  const maxCycleIndex = parseInt(url.searchParams.get("maxCycleIndex") ?? "5", 10);

  if (!shop || !rawContractId) {
    return json({ success: false, error: "shop and contractId are required" }, 400);
  }

  const contractId = rawContractId.startsWith("gid://")
    ? rawContractId
    : `gid://shopify/SubscriptionContract/${rawContractId}`;

  try {
    const { admin } = await unauthenticated.admin(shop);

    const clearAttempts = [];
    for (let idx = 0; idx <= maxCycleIndex; idx++) {
      try {
        const result = await clearBillingCycleEdit(admin, contractId, idx);
        clearAttempts.push({ cycleIndex: idx, ...result });
      } catch (err) {
        clearAttempts.push({ cycleIndex: idx, cleared: false, error: String(err?.message || err) });
      }
    }

    let cancelResult = null;
    if (shouldCancel) {
      const cancelRes = await admin.graphql(
        `
        mutation CancelSubscriptionContract($contractId: ID!) {
          subscriptionContractCancel(subscriptionContractId: $contractId) {
            contract { id status }
            userErrors { field message code }
          }
        }
        `,
        { variables: { contractId } },
      );
      const cancelData = await cancelRes.json();
      const payload = cancelData?.data?.subscriptionContractCancel;
      cancelResult = {
        status: payload?.contract?.status ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    }

    return json({ success: true, shop, contractId, clearAttempts, cancelResult }, 200);
  } catch (err) {
    console.error(`[cleanup-stuck-contract] failed for ${contractId} on ${shop}:`, err);
    return json({ success: false, error: String(err?.message || err) }, 500);
  }
};

function json(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}