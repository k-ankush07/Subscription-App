import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} for ${shop}`);

  const orderId = payload?.admin_graphql_api_id || payload?.id;
  console.log("New order created (checkout completed):", { orderId });

  if (!orderId) {
    console.log("[webhook] No order id in payload — skipping.");
    return new Response(null, { status: 200 });
  }

  const normalizedOrderId = String(orderId).startsWith("gid://")
    ? orderId
    : `gid://shopify/Order/${orderId}`;

  // Does this order contain a subscription line item (i.e. came from
  // checking out with a selling plan)? payload.line_items each carry a
  // `selling_plan_allocation` if a selling plan was applied.
  const subscriptionLineItems = (payload?.line_items || []).filter(
    (li) => li.selling_plan_allocation,
  );

  if (subscriptionLineItems.length === 0) {
    console.log("[webhook] No subscription line items on this order — skipping.");
    return new Response(null, { status: 200 });
  }

  try {
    // TODO: this is where the actual per-order subscription logic goes —
    // e.g. reading the selling plan's `extra_settings` metafield and
    // acting on shipping discount / free product removal / quantity change.
    console.log(
      "[webhook] Order has subscription line items:",
      subscriptionLineItems.map((li) => li.selling_plan_allocation?.selling_plan?.name),
    );
  } catch (err) {
    console.error("[webhook] Failed to process subscription order:", err);
  }

  return new Response(null, { status: 200 });
};