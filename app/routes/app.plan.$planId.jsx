import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
import Templates from "./components/PlanPage/Templates";

const intervalMap = {
  day: "DAY",
  days: "DAY",
  week: "WEEK",
  weeks: "WEEK",
  month: "MONTH",
  months: "MONTH",
  year: "YEAR",
  years: "YEAR",
};

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { planId } = params;

  const fullGid = `gid://shopify/SellingPlanGroup/${planId}`;

  const res = await admin.graphql(
    `
    query getSellingPlanGroup($id: ID!) {
      sellingPlanGroup(id: $id) {
        id
        name
        description
        merchantCode
        products(first: 20) {
          edges {
            node {
              id
              title
              featuredImage { url }
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          }
        }
        sellingPlans(first: 10) {
          edges {
            node {
              id
              name
              billingPolicy {
                ... on SellingPlanRecurringBillingPolicy {
                  interval
                  intervalCount
                }
              }
              pricingPolicies {
                ... on SellingPlanFixedPricingPolicy {
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue {
                      percentage
                    }
                    ... on MoneyV2 {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
    { variables: { id: fullGid } },
  );

  const metafieldRes = await admin.graphql(
    `
  query GetPlanMetafield($namespace: String!, $key: String!) {
    shop {
      metafield(namespace: $namespace, key: $key) {
        id
        namespace
        key
        type
        value
        createdAt
        updatedAt
      }
    }
  }
  `,
    {
      variables: {
        namespace: "selling_plan",
        key: `plan_${planId}`,
      },
    },
  );
  const metafieldData = await metafieldRes.json();
  const metadata = metafieldData.data.shop.metafield
    ? JSON.parse(metafieldData.data.shop.metafield.value)
    : null;
  // console.log('metadta', metadata)
  const data = await res.json();
  const group = data.data.sellingPlanGroup;
  // console.log('dfdfdfedfefe',group.products.edges)
  // console.log(`SellingPlanGroup fetched:`,group.sellingPlans.edges)

  if (!group) throw new Response("Plan not found", { status: 404 });

  return json({
    shop: session.shop,
    planId,
    shopifyGroupId: fullGid,
    metadata,
    id: group.id,
    title: group.name,
    description: group.description || "",
    selectedProducts: group.products.edges.map((e) => ({
      productId: e.node.id,
      productTitle: e.node.title,
      productImage: e.node.featuredImage?.url || "",
      variantIds: e.node.variants?.edges.map((v) => v.node.id) || [],
      variantTitles: e.node.variants?.edges.map((v) => v.node.title) || [],
    })),
    options: group.sellingPlans.edges.map((e, index) => {
      const plan = e.node;
      const billing = plan.billingPolicy;
      const pricing = plan.pricingPolicies?.[0];
      const adjustmentValue = pricing?.adjustmentValue;
      // Matching custom option
      const metaOption = metadata?.options?.[index] || {};

      return {
        sellingPlanId: plan.id,
        // Shopify fields
        name: plan.name,
        deliveryInterval: billing?.interval?.toLowerCase() || "month",
        deliveryFrequency: billing?.intervalCount || 1,
        billingType: metaOption.billingType || "pay_as_you_go",
        billingFrequency: metaOption.billingFrequency || "",
        // Custom metafield data
        minOrders: metaOption.minOrders || "disabled",
        maxOrders: metaOption.maxOrders || "unlimited",

        giveDiscount: metaOption.giveDiscount ?? !!pricing,
        discountType:
          metaOption.discountType ??
          (adjustmentValue?.percentage != null ? "percentage" : "fixed"),
        discountAmount:
          metaOption.discountAmount ??
          adjustmentValue?.percentage ??
          adjustmentValue?.amount ??
          0,

        giveShippingDiscount: metaOption.giveShippingDiscount ?? false,

        changeDiscountAfter: metaOption.changeDiscountAfter ?? false,
        discountAmount2: metaOption.discountAmount2 ?? "",
        afterOrders: metaOption.afterOrders ?? "",
        discountType2: metaOption.discountType2 ?? "amount",

        shippingDiscount: metaOption.shippingDiscount ?? "",
        shippingAfterOrders: metaOption.shippingAfterOrders ?? "",
        shippingDiscountType: metaOption.shippingDiscountType ?? "fixed",

        changeQtyAfterOrders: metaOption.changeQtyAfterOrders ?? false,
        changeQtyAfterOrdersNum: metaOption.changeQtyAfterOrdersNum ?? "",
        changeQtyQuantity: metaOption.changeQtyQuantity ?? "",

        // Array
        changeQtyProducts: metaOption.changeQtyProducts ?? [],

        removeFreeProducts: metaOption.removeFreeProducts ?? false,
        removeFreeAfterOrders: metaOption.removeFreeAfterOrders ?? "",
        removeFreeProductsList: metaOption.removeFreeProductsList ?? [],

        setMinQty: metaOption.setMinQty ?? false,
        minQuantity: metaOption.minQuantity ?? "",

        allowAutoActions: metaOption.allowAutoActions ?? false,
        automationCycles: metaOption.automationCycles ?? [],

        selectedProducts: metaOption.selectedProducts ?? [],
      };
    }),

    productChanges: metadata?.productChanges ?? {
      swap: true,
      variant: true,
      quantity: true,
      keepDiscount: true,
    },
  });
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { type, planPayload, shopifyGroupId } = body;
  console.log("Current Options", planPayload.options);
  const removedProductIds = planPayload.removedProductIds;
  const originalProductIds = planPayload.originalProductIds ?? [];
  const shopRes = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  // DELETE
  if (type === "delete") {
    const res = await admin.graphql(
      `
      mutation sellingPlanGroupDelete($id: ID!) {
        sellingPlanGroupDelete(id: $id) {
          deletedSellingPlanGroupId
          userErrors { field message }
        }
      }
    `,
      { variables: { id: shopifyGroupId } },
    );

    const data = await res.json();
    const errors = data.data.sellingPlanGroupDelete.userErrors;
    if (errors?.length > 0) {
      return json({
        success: false,
        error: errors.map((e) => e.message).join(", "),
      });
    }
    return json({ success: true, deleted: true });
  }

  // UPDATE (upsert)
  try {
    const updateRes = await admin.graphql(
      `
      mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
        sellingPlanGroupUpdate(id: $id, input: $input) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }
    `,
      {
        variables: {
          id: shopifyGroupId,
          input: {
            name: planPayload.title,
            description: planPayload.description,
            sellingPlansToUpdate: planPayload.options
              .filter((o) => o.sellingPlanId)
              .map((opt, i) => {
                // 
                const interval =
                  intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
                const intervalCount = parseInt(opt.deliveryFrequency || 1);
                return {
                  id: opt.sellingPlanId,
                  name: opt.name || "Option",
                  options: [
                    `Every ${intervalCount} ${opt.deliveryInterval || "month"}`,
                  ], 
                  billingPolicy: { recurring: { interval, intervalCount } },
                  deliveryPolicy: { recurring: { interval, intervalCount } },
                  pricingPolicies:
                    opt.giveDiscount && opt.discountAmount
                      ? [
                          {
                            fixed: {
                              adjustmentType:
                                opt.discountType === "percentage"
                                  ? "PERCENTAGE"
                                  : "PRICE",
                              adjustmentValue:
                                opt.discountType === "percentage"
                                  ? {
                                      percentage: parseFloat(
                                        opt.discountAmount,
                                      ),
                                    }
                                  : {
                                      fixedValue: parseFloat(
                                        opt.discountAmount,
                                      ),
                                    },
                            },
                          },
                        ]
                      : [],
                };
              }),

            sellingPlansToCreate: planPayload.options
              .filter((o) => !o.sellingPlanId)
              .map((opt, i) => {
                //
                const interval =
                  intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
                const intervalCount = parseInt(opt.deliveryFrequency || 1);
                return {
                  name: opt.name || "Option",
                  options: [
                    `Every ${intervalCount} ${opt.deliveryInterval || "month"}`,
                  ], //
                  category: "SUBSCRIPTION",
                  billingPolicy: { recurring: { interval, intervalCount } },
                  deliveryPolicy: { recurring: { interval, intervalCount } },
                  pricingPolicies:
                    opt.giveDiscount && opt.discountAmount
                      ? [
                          {
                            fixed: {
                              adjustmentType:
                                opt.discountType === "percentage"
                                  ? "PERCENTAGE"
                                  : "PRICE",
                              adjustmentValue:
                                opt.discountType === "percentage"
                                  ? {
                                      percentage: parseFloat(
                                        opt.discountAmount,
                                      ),
                                    }
                                  : {
                                      fixedValue: parseFloat(
                                        opt.discountAmount,
                                      ),
                                    },
                            },
                          },
                        ]
                      : [],
                };
              }),
          },
        },
      },
    );

    const updateData = await updateRes.json();
    const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;
    if (updateErrors?.length > 0) {
      return json({
        success: false,
        error: updateErrors.map((e) => e.message).join(", "),
      });
    }

    // Remove products
    if (removedProductIds?.length > 0) {
      const removeRes = await admin.graphql(
        `
    mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
      sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
        removedProductIds
        userErrors { field message }
      }
    }
  `,
        {
          variables: {
            id: shopifyGroupId,
            productIds: removedProductIds,
          },
        },
      );
      const removeData = await removeRes.json();
    }

    // console.log("removedProductIds:", planPayload.removedProductIds);
    // console.log("selectedProducts:", planPayload.selectedProducts);

    // Add products
    if (planPayload.selectedProducts?.length > 0) {
      const productsToAdd = planPayload.selectedProducts.filter(
        (p) => !originalProductIds.includes(p.productId),
      );

      if (productsToAdd.length > 0) {
        //
        const addRes = await admin.graphql(
          `
      mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
        sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }
    `,
          {
            variables: {
              id: shopifyGroupId,
              productIds: productsToAdd.map((p) => p.productId),
            },
          },
        );
        const addData = await addRes.json();
      }
    }

    // Update metafield
    const numericId = shopifyGroupId.split("/").pop();
    await admin.graphql(
      `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id key }
          userErrors { field message }
        }
      }
    `,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: "selling_plan",
              key: `plan_${numericId}`,
              type: "json",
              value: JSON.stringify({
                planId: numericId,
                shopifyGroupId,
                shop: planPayload.shop,
                description: planPayload.description,
                selectedProducts: planPayload.selectedProducts,
                productChanges: planPayload.productChanges,
                options: planPayload.options,
                title: planPayload.title,
              }),
            },
          ],
        },
      },
    );

    return json({ success: true, planId: params.planId });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

export default function PlanId() {
  const plan = useLoaderData();
  // console.log("Plan data loaded:", plan);
  return (
    <div style={{ padding: "1.5rem" }}>
      <Templates
        shop={plan.shop}
        singlePlanId={plan.planId}
        singlePlanData={plan}
      />
    </div>
  );
}
