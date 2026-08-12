
import { authenticate } from "../shopify.server";
import { snapshotContractSettings } from "../lib/billing-preview.server";

async function getContractSellingPlanId(admin, contractId) {
  const res = await admin.graphql(
    `
    query getContractLine($id: ID!) {
      subscriptionContract(id: $id) {
        lines(first: 50) {
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


async function fetchAllPages(admin, { query, getEdgesAndPageInfo, variables }) {
  let allNodes = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await admin.graphql(query, {
      variables: { ...variables, cursor },
    });
    const data = await res.json();
    if (data.errors) {
      console.error("[webhook] paginated query failed:", data.errors[0]?.message);
      break;
    }

    const { edges, pageInfo } = getEdgesAndPageInfo(data);
    allNodes.push(...edges.map((e) => e.node));

    hasNextPage = pageInfo?.hasNextPage ?? false;
    cursor = pageInfo?.endCursor ?? null;
  }

  return allNodes;
}


async function findSellingPlanGroupId(admin, sellingPlanId) {
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await admin.graphql(
      `
      query getSellingPlanGroups($cursor: String) {
        sellingPlanGroups(first: 100, after: $cursor) {
          edges {
            node {
              id
              sellingPlans(first: 100) {
                edges { node { id } }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
      `,
      { variables: { cursor } },
    );
    const data = await res.json();
    if (data.errors) {
      console.error("[webhook] findSellingPlanGroupId query failed:", data.errors[0]?.message);
      return null;
    }

    const edges = data.data?.sellingPlanGroups?.edges ?? [];
    const match = edges.find(({ node }) =>
      node.sellingPlans.edges.some(({ node: sp }) => sp.id === sellingPlanId),
    );
    if (match) return match.node.id;

    hasNextPage = data.data?.sellingPlanGroups?.pageInfo?.hasNextPage ?? false;
    cursor = data.data?.sellingPlanGroups?.pageInfo?.endCursor ?? null;
  }

  return null;
}

async function getAllGroupProducts(admin, groupId) {
  return fetchAllPages(admin, {
    query: `
      query getGroupProducts($id: ID!, $cursor: String) {
        sellingPlanGroup(id: $id) {
          products(first: 100, after: $cursor) {
            edges {
              node {
                id
                title
                featuredImage { url altText }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `,
    variables: { id: groupId },
    getEdgesAndPageInfo: (data) => ({
      edges: data.data?.sellingPlanGroup?.products?.edges ?? [],
      pageInfo: data.data?.sellingPlanGroup?.products?.pageInfo,
    }),
  });
}


async function getAllGroupVariants(admin, groupId) {
  return fetchAllPages(admin, {
    query: `
      query getGroupVariants($id: ID!, $cursor: String) {
        sellingPlanGroup(id: $id) {
          productVariants(first: 100, after: $cursor) {
            edges {
              node {
                id
                title
                price
                product { id }
              }
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `,
    variables: { id: groupId },
    getEdgesAndPageInfo: (data) => ({
      edges: data.data?.sellingPlanGroup?.productVariants?.edges ?? [],
      pageInfo: data.data?.sellingPlanGroup?.productVariants?.pageInfo,
    }),
  });
}


async function getSellingPlanGroupSnapshotData(admin, sellingPlanId) {
  if (!sellingPlanId) return null;

  const groupId = await findSellingPlanGroupId(admin, sellingPlanId);
  if (!groupId) return null;

  const [allProducts, allVariants] = await Promise.all([
    getAllGroupProducts(admin, groupId),
    getAllGroupVariants(admin, groupId),
  ]);

  const variantsByProduct = {};
  for (const v of allVariants) {
    const pid = v.product?.id;
    if (!pid) continue;
    if (!variantsByProduct[pid]) variantsByProduct[pid] = [];
    variantsByProduct[pid].push({
      variantsId: v.id,
      variantsTitle: v.title,
      price: v.price != null ? Number(v.price) : null,
    });
  }

  const products = allProducts.map((p) => ({
    id: p.id,
    title: p.title,
    ProductImage: p.featuredImage?.url ?? null,
    variants: variantsByProduct[p.id] ?? [],
  }));

  return { groupId, products };
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

    const groupSnapshotData = await getSellingPlanGroupSnapshotData(admin, sellingPlanId);

    if (liveSettings || groupSnapshotData) {
      const combinedSettings = {
        ...(liveSettings || {}), 
        products: groupSnapshotData?.products ?? [],
      };

      const { snapshotted } = await snapshotContractSettings(
        admin,
        normalizedContractId,
        combinedSettings,
      );
      console.log(`[webhook] settings snapshotted for ${normalizedContractId}:`, snapshotted);
    } else {
      console.log(`[webhook] no plan settings found to snapshot for ${normalizedContractId}`);
    }
  } catch (err) {
    console.error("[webhook] Failed to fetch/snapshot settings:", err);
  }

  return new Response(null, { status: 200 });
};