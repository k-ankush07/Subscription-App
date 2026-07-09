import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request);
  console.log(`[webhook] ${topic} for ${shop}`);
  console.log("jkvjdjjdg")

  const orderId = payload?.admin_graphql_api_id || payload?.id;
  console.log("New order created (checkout completed):", { orderId });

  if (!orderId) {
    console.log("[webhook] No order id in payload — skipping.");
    return new Response(null, { status: 200 });
  }

  const normalizedOrderId = String(orderId).startsWith("gid://")
    ? orderId
    : `gid://shopify/Order/${orderId}`;


  const subscriptionLineItems = (payload?.line_items || []).filter(
    (li) => li.selling_plan_allocation,
  );

  if (subscriptionLineItems.length === 0) {
    console.log("[webhook] No subscription line items on this order — skipping.");
    return new Response(null, { status: 200 });
  }

  try {

    console.log(
      "[webhook] Order has subscription line items:",
      subscriptionLineItems.map((li) => li.selling_plan_allocation?.selling_plan?.name),
    );
  } catch (err) {
    console.error("[webhook] Failed to process subscription order:", err);
  }

  return new Response(null, { status: 200 });
};