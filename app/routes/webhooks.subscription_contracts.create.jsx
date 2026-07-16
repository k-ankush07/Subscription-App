// import { authenticate } from "../shopify.server";
// import { getContractPreview, applyActionsToCycle } from "../lib/billing-preview.server";

// export const action = async ({ request }) => {
//   const { shop, topic, payload, admin } = await authenticate.webhook(request);

//   console.log(`[webhook] ${topic} for ${shop}`);

//   const contractId = payload?.admin_graphql_api_id || payload?.id;
//   console.log("New subscription contract created:", { contractId });

//   if (!contractId) {
//     console.log("[webhook] No contract id in payload — skipping preview.");
//     return new Response(null, { status: 200 });
//   }

//   const normalizedContractId = String(contractId).startsWith("gid://")
//     ? contractId
//     : `gid://shopify/SubscriptionContract/${contractId}`;

//   try {
//     const preview = await getContractPreview(admin, normalizedContractId);

//     const cycleIndex = preview?.nextOrder?.cycleIndex;
//     const actions = preview?.nextOrder?.willApply;

//     // willApply either an array of actions, or a string message when nothing applies
//     if (Array.isArray(actions) && actions.length > 0 && cycleIndex != null) {
//       console.log(
//         `[webhook] Applying ${actions.length} action(s) to contract ${normalizedContractId} cycle ${cycleIndex}`,
//       );
//       await applyActionsToCycle(admin, normalizedContractId, cycleIndex, actions);
//       console.log("[webhook] Actions applied and committed successfully.");
//     } else {
//       console.log("[webhook] No actions to apply for this cycle.");
//     }
//   } catch (err) {
//     console.error("[webhook] Failed to build/apply contract preview:", err);
//   }

//   return new Response(null, { status: 200 });
// };

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
    // NOTE: This webhook intentionally only builds and logs a preview.
    // Actual automation (quantity change, discount change, shipping
    // discount, product swap, etc.) is applied exclusively by the
    // process-billing-cycles cron job, which maintains a "processed
    // cycles" marker to guarantee each cycle is only ever edited once.
    //
    // If this webhook also called applyActionsToCycle directly, a cycle
    // could get edited twice (once here, once by the cron job that later
    // finds the same due cycle) — for actions like DISCOUNT_CHANGE that
    // would compound the discount on every run. Keeping application
    // logic in a single place (the cron job) avoids that entirely.
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