
import { authenticate } from "../shopify.server";
import { snapshotContractSettings } from "../lib/billing-preview.server";

async function getContractSellingPlanId(admin, contractId) {
  const res = await admin.graphql(
    `
    query getContractLine($id: ID!) {
      subscriptionContract(id: $id) {
        lines(first: 1) {
          edges {
            node {
              sellingPlanId
            }
          }
        }
      }
    }
    `,
    { variables: { id: contractId } },
  );
  const data = await res.json();
  return data.data?.subscriptionContract?.lines?.edges?.[0]?.node?.sellingPlanId ?? null;
}

export const action = async ({ request }) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request);

  console.log(`[webhook] ${topic} for ${shop}`);

  const contractId = payload?.admin_graphql_api_id || payload?.id;
  console.log("New subscription contract created:", { contractId });

  if (!contractId) {
    console.log("[webhook] No contract id in payload — skipping snapshot.");
    return new Response(null, { status: 200 });
  }
  const normalizedContractId = String(contractId).startsWith("gid://")
    ? contractId
    : `gid://shopify/SubscriptionContract/${contractId}`;

  try {

    const sellingPlanId = await getContractSellingPlanId(admin, normalizedContractId);

    const liveSettings = sellingPlanId
      ? await (async () => {
          const res = await admin.graphql(
            `
            query getSellingPlanExtraSettings($sellingPlanId: ID!) {
              node(id: $sellingPlanId) {
                ... on SellingPlan {
                  metafield(namespace: "subscription_app", key: "extra_settings") {
                    value
                  }
                }
              }
            }
            `,
            { variables: { sellingPlanId } },
          );
          const data = await res.json();
          const raw = data.data?.node?.metafield?.value;
          if (!raw) return null;
          try {
            return JSON.parse(raw);
          } catch (e) {
            console.error("[webhook] Invalid extra_settings JSON metafield", e);
            return null;
          }
        })()
      : null;

    if (liveSettings) {
      const { snapshotted } = await snapshotContractSettings(admin, normalizedContractId, liveSettings);
      console.log(`[webhook] settings snapshotted for ${normalizedContractId}:`, snapshotted);
    } else {
      console.log(`[webhook] no plan settings found to snapshot for ${normalizedContractId}`);
    }
  } catch (err) {
    console.error("[webhook] Failed to fetch/snapshot settings:", err);
  }

  return new Response(null, { status: 200 });
};