
import { Page, Icon, Card, EmptyState } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { DuplicateIcon, DeleteIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const response = await fetch(`${API}/plans/getAllPlans?shop=${shop}`,{
    headers:{
      "x-api-key": SECRET_KEY,
    }
  });
  const data = await response.json();
  return Response.json({ plans: data.success ? data.data : [] });
};
// export const loader = async ({ request }) => {
//   const { admin, session } = await authenticate.admin(request);
//   const shop = session.shop;

//   const response = await admin.graphql(
//     `#graphql
//     query GetSellingPlanGroups {
//       sellingPlanGroups(first: 100) {
//         edges {
//           node {
//             id
//             name
//             products(first: 100) {
//               edges {
//                 node {
//                   id
//                   title
//                   handle
//                 }
//               }
//             }
//             productVariants(first: 100) {
//               edges {
//                 node {
//                   id
//                   title
//                   sku
//                   product {
//                     id
//                     title
//                   }
//                 }
//               }
//             }
//             merchantCode
//             options
//             sellingPlans(first: 10) {
//               edges {
//                 node {
//                   id
//                   name
//                   category
//                   billingPolicy {
//                     ... on SellingPlanRecurringBillingPolicy {
//                       interval
//                       intervalCount
//                       minCycles
//                       maxCycles
//                     }
//                   }
//                   deliveryPolicy {
//                     ... on SellingPlanRecurringDeliveryPolicy {
//                       interval
//                       intervalCount
//                     }
//                   }
//                   pricingPolicies {
//                     ... on SellingPlanFixedPricingPolicy {
//                       adjustmentType
//                       adjustmentValue {
//                         ... on SellingPlanPricingPolicyPercentageValue {
//                           percentage
//                         }
//                         ... on MoneyV2 {
//                           amount
//                           currencyCode
//                         }
//                       }
//                     }
//                     ... on SellingPlanRecurringPricingPolicy {
//                       afterCycle
//                       adjustmentType
//                       adjustmentValue {
//                         ... on SellingPlanPricingPolicyPercentageValue {
//                           percentage
//                         }
//                         ... on MoneyV2 {
//                           amount
//                           currencyCode
//                         }
//                       }
//                     }
//                   }
//                   extraSettingsMetafield: metafield(
//                     namespace: "subscription_app"
//                     key: "extra_settings"
//                   ) {
//                     value
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }`
//   );

//   const result = await response.json();

//   console.log("🔥 Shopify Selling Plan Groups:");
//   console.dir(result.data.sellingPlanGroups, { depth: null });
//   const plans = result.data.sellingPlanGroups.edges.map((groupEdge) => {
//     const group = groupEdge.node;

//     const sellingPlans = group.sellingPlans.edges.map((planEdge) => {
//       const plan = planEdge.node;
//       let extraSettings = null;

//       if (plan.extraSettingsMetafield?.value) {
//         try {
//           extraSettings = JSON.parse(plan.extraSettingsMetafield.value);
//         } catch (err) {
//           console.error(
//             `Failed to parse extra_settings metafield for plan ${plan.id}:`,
//             err,
//           );
//         }
//       }

//       // extraSettingsMetafield (raw) hata ke extraSettings (parsed) rakh do
//       const { extraSettingsMetafield, ...restOfPlan } = plan;
//       return { ...restOfPlan, extraSettings };
//     });

//     return { ...group, sellingPlans: { edges: sellingPlans.map((node) => ({ node })) } };
//   });

//   return Response.json({ shop, plans });
// };

export const action = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    const formData = await request.formData();
    const planId = formData.get("planId");
    const shopifyGroupId = formData.get("shopifyGroupId");
    const status = formData.get("status");

    if (!planId) {
      return Response.json({ success: false, error: "planId missing" });
    }
    const isPublished = status !== "draft" && !!shopifyGroupId;

    if (isPublished) {
      const groupGid = shopifyGroupId.startsWith("gid://")
        ? shopifyGroupId
        : `gid://shopify/SellingPlanGroup/${planId}`;

      const response = await admin.graphql(
        `#graphql
        mutation deletePlan($id: ID!) {
          sellingPlanGroupDelete(id: $id) {
            deletedSellingPlanGroupId
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            id: groupGid,
          },
        },
      );

      const result = await response.json();
      const errors = result?.data?.sellingPlanGroupDelete?.userErrors;

      if (result?.errors?.length) {
        console.error("Shopify GraphQL top-level errors:", result.errors);
        return Response.json({ success: false, errors: result.errors });
      }

      if (errors?.length > 0) {
        console.error("Shopify userErrors:", errors);
        return Response.json({ success: false, errors });
      }
    }
    const dbResponse = await fetch(`${API}/plans/${planId}`, {
      method: "DELETE",
      headers: {
        "x-api-key": SECRET_KEY,
      },
    });
    const dbResult = await dbResponse.json();

    if (!dbResult.success) {
      console.error("Node DB delete failed:", dbResult.message);
      return Response.json({ success: false, error: dbResult.message });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Delete action error:", error);
    return Response.json({ success: false, error: error.message });
  }
};


function Plans() {
  const { plans } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const handelPlan = () => navigate("/app/createplan");

  const rowClick = (planId) => {
    setTimeout(() => navigate(`/app/plan/${planId}`), 1000);
  };

  const handelDublicate = (planId) => {
    setTimeout(() => navigate(`/app/plan/${planId}/dublicate`), 1000);
  };

  const planDelete = (item) => {
    fetcher.submit(
      {
        planId: item.planId,
        shopifyGroupId: item.shopifyGroupId || "",
        status: item.status || "",
      },
      { method: "DELETE" },
    );
  };
  const deletingId = fetcher.formData?.get("planId");
  return (
     <s-page heading="Subscription Contracts">
    <Page
      title="Selling Plans"
      primaryAction={{ content: "Create Plan", onAction: handelPlan }}
    >
      {plans.length === 0 ? (
        <Card>
          <EmptyState>
            <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
            <h2>Get more repeat business</h2>
            <p>
              Allow customers to purchase products or services on a recurring
              basis
            </p>
          </EmptyState>
        </Card>
      ) : (
        <Card>
          <table border="1">
            <thead>
              <tr>
                <th>Plan Title</th>
                <th>Product</th>
                <th>Delivery Frequency</th>
                <th>Pricing</th>
                <th>Status</th>
                <th>Widgets</th>
                <th>Action</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {[...plans].reverse().map((item) => (
                <tr
                  key={item._id}
                  onClick={() => rowClick(item.planId)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{item.planName}</td>
                  <td>
                    {Array.isArray(item.products) &&
                    item.products.length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {/* IMAGE */}
                        {item.products[0]?.ProductImage && (
                          <img
                            src={item.products[0].ProductImage}
                            alt={item.products[0].title}
                            style={{
                              width: "30px",
                              height: "30px",
                              objectFit: "cover",
                              borderRadius: "4px",
                            }}
                          />
                        )}

                        {/* TEXT */}
                        {item.products.length === 1
                          ? item.products[0]?.title
                          : `${item.products.length} products`}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {item.sellingPlans?.length === 1
                      ? `Every ${item.sellingPlans[0].intervalCount} ${item.sellingPlans[0].interval.toLowerCase()}`
                      : `${item.sellingPlans?.length || 0} delivery options`}
                  </td>
                  <td>
                    {item.sellingPlans?.length === 1
                      ? item.sellingPlans[0].discountType === "PERCENTAGE"
                        ? `${item.sellingPlans[0].discountValue}% off`
                        : `₹${item.sellingPlans[0].discountValue} off`
                      : `${item.sellingPlans?.length || 0} discount options`}
                  </td>
                  <td>{item?.status}</td>
                  <td>{item.widget}</td>
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      handelDublicate(item.planId);
                    }}
                  >
                    <Icon source={DuplicateIcon} tone="base" />
                  </td>
                  <td
                    onClick={(e) => {
                      e.stopPropagation();
                      planDelete(item);
                    }}
                  >
                    {deletingId === item.planId && fetcher.state !== "idle" ? (
                      "..."
                    ) : (
                      <Icon source={DeleteIcon} tone="base" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
    </s-page>
  );
}

export default Plans;