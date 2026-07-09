// app/routes/webhooks.orders_create.js
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import {
  maybeApplyFreeShippingAfterXOrders,
} from "../services/subscription-free-shipping.server";

// yeh function tumhare DB layer ka placeholder hai
import {
  getSubscriptionConfigBySellingPlanId,
  incrementAndGetOrdersCompletedForContract,
} from "../services/subscription-db.server";

export const action = async ({ request }) => {
  // 1) Shopify webhook auth
  const { admin } = await authenticate.admin(request);

  const payload = await request.json();

  // 2) Subscription line identify karo
  const lineItems = payload?.line_items || [];

  const subscriptionLine = lineItems.find((line) => line.selling_plan_id);
  if (!subscriptionLine) {
    // Non-subscription order, ignore
    return json({ ok: true, reason: "No subscription line" });
  }

  // NOTE: yahan se tumhe apni store / DB ki structure ke hisab se
  // subscriptionContractId nikalna padega.
  // Kai setups me order tags / properties ya subscription app ke data se milta hai.

  const sellingPlanId = subscriptionLine.selling_plan_id; // numeric id, convert to GID agar zarurat ho

  // 3) Plan config fetch karo apni DB se
  const planConfig = await getSubscriptionConfigBySellingPlanId(sellingPlanId);
  if (!planConfig || !planConfig.shippingAfterOrders) {
    return json({ ok: true, reason: "No shippingAfterOrders config" });
  }

  const { shippingAfterOrders, subscriptionContractId } = planConfig;

  // 4) Orders count update karo
  const ordersCompleted =
    await incrementAndGetOrdersCompletedForContract(subscriptionContractId);

  // 5) Possibly apply free shipping
  const result = await maybeApplyFreeShippingAfterXOrders({
    admin,
    contractId: subscriptionContractId,
    ordersCompleted,
    shippingAfterOrders,
  });

  return json({ ok: true, applied: result.applied });
};