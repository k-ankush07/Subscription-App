import { authenticate } from "../shopify.server";
import { getContractPreview, applyActionsToCycle } from "../lib/billing-preview.server";

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

    const cycleIndex = preview?.nextOrder?.cycleIndex;
    const actions = preview?.nextOrder?.willApply;

    // willApply either an array of actions, or a string message when nothing applies
    if (Array.isArray(actions) && actions.length > 0 && cycleIndex != null) {
      console.log(
        `[webhook] Applying ${actions.length} action(s) to contract ${normalizedContractId} cycle ${cycleIndex}`,
      );
      await applyActionsToCycle(admin, normalizedContractId, cycleIndex, actions);
      console.log("[webhook] Actions applied and committed successfully.");
    } else {
      console.log("[webhook] No actions to apply for this cycle.");
    }
  } catch (err) {
    console.error("[webhook] Failed to build/apply contract preview:", err);
  }

  return new Response(null, { status: 200 });
};