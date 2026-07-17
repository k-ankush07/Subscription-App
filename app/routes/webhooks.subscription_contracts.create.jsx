
// import { authenticate } from "../shopify.server";
// import { getContractPreview } from "../lib/billing-preview.server";

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

//     console.log(
//       `[webhook] Preview built for ${normalizedContractId} — cycle ${preview?.nextOrder?.cycleIndex}, will apply:`,
//       preview?.nextOrder?.willApply,
//     );
//   } catch (err) {
//     console.error("[webhook] Failed to build contract preview:", err);
//   }

//   return new Response(null, { status: 200 });
// };


import { authenticate } from "../shopify.server";
import { getContractPreview } from "../lib/billing-preview.server";

const NS = "subscription_app";
const SNAPSHOT_KEY = "extra_settings_snapshot";

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

  // ── NAYA CODE: contract create hote hi plan settings snapshot karo ──
  try {
    const planRes = await admin.graphql(
      `query getPlan($id: ID!) {
        subscriptionContract(id: $id) {
          id
          lines(first: 1) { edges { node { sellingPlanId } } }
        }
      }`,
      { variables: { id: normalizedContractId } },
    );
    const planData = await planRes.json();
    const shopifyId = planData.data?.subscriptionContract?.id;
    const sellingPlanId = planData.data?.subscriptionContract?.lines?.edges?.[0]?.node?.sellingPlanId;

    if (sellingPlanId && shopifyId) {
      const spRes = await admin.graphql(
        `query getPlanSettings($id: ID!) {
          node(id: $id) {
            ... on SellingPlan {
              metafield(namespace: "${NS}", key: "extra_settings") { value }
            }
          }
        }`,
        { variables: { id: sellingPlanId } },
      );
      const spData = await spRes.json();
      const rawSettings = spData.data?.node?.metafield?.value;

      if (rawSettings) {
        await admin.graphql(
          `mutation setSnapshot($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) { userErrors { field message } }
          }`,
          {
            variables: {
              metafields: [{
                ownerId: shopifyId,
                namespace: NS,
                key: SNAPSHOT_KEY,
                type: "json",
                value: rawSettings,
              }],
            },
          },
        );
        console.log(`[webhook] extra_settings snapshotted on contract ${shopifyId}`);
      }
    }
  } catch (err) {
    console.error("[webhook] snapshot failed:", err);
  }
  // ── NAYA CODE END ──

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