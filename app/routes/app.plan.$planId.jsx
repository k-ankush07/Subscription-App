import React from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Templates from "./components/PlanPage/Templates";
import { authenticate } from "../shopify.server";

const intervalMap = {
  day: "DAY",   days: "DAY",
  week: "WEEK", weeks: "WEEK",
  month: "MONTH", months: "MONTH",
  year: "YEAR", years: "YEAR",
};

// ─── Shared helper — builds billingPolicy, deliveryPolicy, pricingPolicies ───
const buildSellingPlanPolicies = (opt) => {
  const deliveryInterval =
    intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
  const deliveryIntervalCount = parseInt(opt.deliveryFrequency) || 1;

  const isPrepaid = opt.billingType === "prepaid";
  const billingInterval = isPrepaid
    ? intervalMap[opt.billingInterval?.toLowerCase()] ?? deliveryInterval
    : deliveryInterval;
  const billingIntervalCount = isPrepaid
    ? parseInt(opt.billingFrequency) || 1
    : deliveryIntervalCount;

  const pricingPolicies =
    opt.giveDiscount && opt.discountAmount
      ? [
          {
            fixed: {
              adjustmentType:
                opt.discountType === "percentage"
                  ? "PERCENTAGE"
                  : opt.discountType === "fixed"
                    ? "PRICE"
                    : "FIXED_AMOUNT",
              adjustmentValue:
                opt.discountType === "percentage"
                  ? { percentage: parseFloat(opt.discountAmount) }
                  : { fixedValue: parseFloat(opt.discountAmount) },
            },
          },
        ]
      : [];

  return {
    billingPolicy: {
      recurring: {
        interval: billingInterval,
        intervalCount: billingIntervalCount,
      },
    },
    deliveryPolicy: {
      recurring: {
        interval: deliveryInterval,
        intervalCount: deliveryIntervalCount,
      },
    },
    pricingPolicies,
  };
};

// s Loader 
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
              deliveryPolicy {
                ... on SellingPlanRecurringDeliveryPolicy {
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

  const data = await res.json();
  const group = data.data.sellingPlanGroup;

  if (!group) throw new Response("Plan not found", { status: 404 });

  return json({
    shop: session.shop,
    planId,
    shopifyGroupId: fullGid,
    title: group.name,
    description: group.description || "",
    selectedProducts: group.products.edges.map((e) => ({
      productId: e.node.id,
      productTitle: e.node.title,
      productImage: e.node.featuredImage?.url || "",
    })),
    existingSellingPlanIds: group.sellingPlans.edges.map((e) => e.node.id),
    options: group.sellingPlans.edges.map((e) => {
      const plan = e.node;
      const billing = plan.billingPolicy;
      const delivery = plan.deliveryPolicy;
      const pricing = plan.pricingPolicies?.[0];
      const adjustmentValue = pricing?.adjustmentValue;

      // Prepaid: billing and delivery policies differ
      const isPrepaid =
        billing?.intervalCount !== delivery?.intervalCount ||
        billing?.interval !== delivery?.interval;

      return {
        sellingPlanId: plan.id,
        name: plan.name,
        billingType: isPrepaid ? "prepaid" : "pay",
        billingFrequency: isPrepaid ? String(billing?.intervalCount ?? 1) : "",
        billingInterval: billing?.interval?.toLowerCase() || "month",
        deliveryInterval: delivery?.interval?.toLowerCase() || "month",
        deliveryFrequency: delivery?.intervalCount || 1,
        minOrders: "disabled",
        maxOrders: "unlimited",
        giveDiscount: !!pricing,
        discountType:
          adjustmentValue?.percentage != null
            ? "percentage"
            : pricing?.adjustmentType === "PRICE"
              ? "fixed"
              : "amount",
        discountAmount:
          adjustmentValue?.percentage ?? adjustmentValue?.amount ?? 0,
        // second discount tier — not stored in Shopify, reset on load
        changeDiscountAfter: false,
        discountAmount2: "",
        afterOrders: "",
        discountType2: "amount",
        giveShippingDiscount: false,
        shippingDiscount: "",
        shippingAfterOrders: "",
        shippingDiscountType: "fixed",
        allowAutoActions: false,
        automationCycles: [],
        changeQtyAfterOrders: false,
        changeQtyQuantity: "",
        changeQtyAfterOrdersNum: "",
        changeQtyProducts: [],
        removeFreeProducts: false,
        removeFreeAfterOrders: "",
        removeFreeProductsList: [],
        setMinQty: false,
        minQuantity: "1",
      };
    }),
    productChanges: {
      swap: true,
      variant: true,
      quantity: true,
      keepDiscount: true,
    },
  });
};

//  Action 
export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { type, planPayload, shopifyGroupId } = body;

  const shopRes = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  //  DELETE 
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

  //  UPDATE 
  try {
    // 1. Delete removed selling plans first
    if (planPayload.deletedPlanIds?.length > 0) {
      await admin.graphql(
        `
        mutation sellingPlanGroupRemovePlans($id: ID!, $sellingPlanIds: [ID!]!) {
          sellingPlanGroupRemoveSellingPlans(id: $id, sellingPlanIds: $sellingPlanIds) {
            sellingPlanGroup { id }
            userErrors { field message }
          }
        }
      `,
        {
          variables: {
            id: shopifyGroupId,
            sellingPlanIds: planPayload.deletedPlanIds,
          },
        },
      );
    }

    // 2. Group + selling plans update
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

            // Update existing plans
            sellingPlansToUpdate: planPayload.options
              .filter((o) => o.sellingPlanId)
              .map((opt) => ({
                id: opt.sellingPlanId,
                name: opt.name || "Option",
                options: [
                  `Every ${parseInt(opt.deliveryFrequency) || 1} ${opt.deliveryInterval || "month"}`,
                ],
                ...buildSellingPlanPolicies(opt),
              })),

            // Create new plans (no sellingPlanId)
            sellingPlansToCreate: planPayload.options
              .filter((o) => !o.sellingPlanId)
              .map((opt) => ({
                name: opt.name || "Option",
                options: [
                  `Every ${parseInt(opt.deliveryFrequency) || 1} ${opt.deliveryInterval || "month"}`,
                ],
                category: "SUBSCRIPTION",
                ...buildSellingPlanPolicies(opt),
              })),
          },
        },
      },
    );

    const updateData = await updateRes.json();
    console.log(
      "sellingPlanGroupUpdate result:",
      updateData.data.sellingPlanGroupUpdate,
    );

    const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;
    if (updateErrors?.length > 0) {
      return json({
        success: false,
        error: updateErrors.map((e) => e.message).join(", "),
      });
    }

    // 3. Remove products that were deselected
    if (planPayload.removedProductIds?.length > 0) {
      await admin.graphql(
        `
        mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
          sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
            sellingPlanGroup { id }
            userErrors { field message }
          }
        }
      `,
        {
          variables: {
            id: shopifyGroupId,
            productIds: planPayload.removedProductIds,
          },
        },
      );
    }

    // 4. Add newly selected products
    if (planPayload.selectedProducts?.length > 0) {
      await admin.graphql(
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
            productIds: planPayload.selectedProducts.map((p) => p.productId),
          },
        },
      );
    }

    // 5. Update metafield with latest planPayload
    const numericId = shopifyGroupId.split("/").pop();
    await admin.graphql(
      `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
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
                ...planPayload,
                planId: numericId,
                shopifyGroupId,
              }),
            },
          ],
        },
      },
    );

    return json({ success: true, planId: params.planId });
  } catch (error) {
    console.error("Action error:", error.message);
    return json({ success: false, error: error.message });
  }
};

//  Component 
function PlanEdit() {
  const planData = useLoaderData();
  const shop = planData.shop;
  const planId = planData.planId;

  return (
    <div>
      <Templates
        shop={shop}
        dublicateplanPlanId={planId}
        dublicateplanPlanData={planData}
        isDuplicate={true}
        singlePlanId={undefined}
      />
    </div>
  );
}

export default PlanEdit;