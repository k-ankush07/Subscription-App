
import { authenticate } from "../shopify.server";
import { getContractPreview } from "../lib/billing-preview.server";

export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request);

  console.log(`[webhook] ${topic} for ${shop}`);

  const contractId = payload?.admin_graphql_api_id || payload?.id;
  console.log("New subscription contract created:", { contractId });

  if (!contractId) {
    console.log("[webhook] No contract id in payload — skipping preview.");
    return new Response(null, { status: 200 });
  }
  const normalizedContractId = String(contractId).startsWith("gid://")
    ? contractId
    : `gid://shopify/SubscriptionContract/${contractId}`;

  try {
    const preview = await getContractPreview(admin, normalizedContractId);

    console.log(
      `[webhook] Preview built for ${normalizedContractId} — cycle ${preview?.nextOrder?.cycleIndex}, will apply:`,
      preview?.nextOrder?.willApply,
    );
  } catch (err) {
    console.error("[webhook] Failed to build contract preview:", err);
  }

  return new Response(null, { status: 200 });
};