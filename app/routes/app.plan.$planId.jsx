import React from "react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API = import.meta.env.VITE_API_URL;

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const planId = params.planId;
  const response = await fetch(`${API}/plans/${planId}`);
  const data = await response.json();
  return json({
    plans: data.success ? data.data : null,
    shop: session.shop,
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  console.log("Edit payload:", payload);

  const shopifyGroupId = payload.shopifyGroupId;
  const sp = payload.sellingPlan;
  console.log("sp edit page", sp)

  if (!shopifyGroupId) {
    return Response.json({ success: false, error: "shopifyGroupId missing" });
  }

  // Pricing policies
  const pricingPolicies = [];

  if (sp.giveSubscriptionDiscount) {
    pricingPolicies.push({
      fixed: {
        adjustmentType: sp.discountType,
        adjustmentValue:
          sp.discountType === "PERCENTAGE"
            ? { percentage: sp.discountValue }
            : { fixedValue: sp.discountValue },
      },
    });

    if (sp.changeDiscountAfterOrders && sp.afterOrders) {
      pricingPolicies.push({
        recurring: {
          afterCycle: sp.afterOrders,
          adjustmentType: sp.afterDiscountType ?? "PERCENTAGE",
          adjustmentValue:
            (sp.afterDiscountType ?? "PERCENTAGE") === "PERCENTAGE"
              ? { percentage: sp.afterDiscountValue ?? 0 }
              : { fixedValue: sp.afterDiscountValue ?? 0 },
        },
      });
    }
  }

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
          name: payload.planName,
          merchantCode: payload.planName,
          sellingPlansToUpdate: [
            {
              id: sp.shopifySellingPlanId,
              name: sp.name,
              options: [`${sp.intervalCount} ${sp.interval.toLowerCase()}`],

              billingPolicy: {
                recurring: {
                  interval: sp.interval,
                  intervalCount: sp.intervalCount,
                  ...(sp.minCycles && sp.minCycles !== "disabled"
                    ? { minCycles: sp.minCycles }
                    : {}),
                  ...(sp.maxCycles && sp.maxCycles !== "unlimited"
                    ? { maxCycles: sp.maxCycles }
                    : {}),
                },
              },

              deliveryPolicy: {
                recurring: {
                  interval: sp.interval,
                  intervalCount: sp.intervalCount,
                },
              },

              ...(pricingPolicies.length > 0 ? { pricingPolicies } : {}),
            },
          ],
        },
      },
    }
  );

  const updateData = await updateRes.json();
  console.log("update data", updateData.data);
  const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;

  if (updateErrors?.length > 0) {
    return Response.json({
      success: false,
      error: updateErrors.map((e) => e.message).join(", "),
    });
  }

  // Pehle purane products remove karo, phir naye add karo
  await admin.graphql(
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
        productIds: payload.products.map((p) => p.id),
      },
    }
  );

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
        productIds: payload.products.map((p) => p.id),
      },
    }
  );

  const addData = await addRes.json();
  const addErrors = addData.data.sellingPlanGroupAddProducts.userErrors;

  if (addErrors?.length > 0) {
    return Response.json({
      success: false,
      error: addErrors.map((e) => e.message).join(", "),
    });
  }
  //  purane variants remove karo
const allVariantIds = payload.products.flatMap((p) =>
  p.variants.map((v) => v.variantsId)
);

if (allVariantIds.length > 0) {
  await admin.graphql(
    `
    mutation sellingPlanGroupRemoveProductVariants($id: ID!, $productVariantIds: [ID!]!) {
      sellingPlanGroupRemoveProductVariants(id: $id, productVariantIds: $productVariantIds) {
        removedProductVariantIds
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        id: shopifyGroupId,
        productVariantIds: allVariantIds,
      },
    }
  );
}
// Variants bhi add karo
if (allVariantIds.length > 0) {
  const addVariantsRes = await admin.graphql(
    `
    mutation sellingPlanGroupAddProductVariants($id: ID!, $productVariantIds: [ID!]!) {
      sellingPlanGroupAddProductVariants(id: $id, productVariantIds: $productVariantIds) {
        sellingPlanGroup { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        id: shopifyGroupId,
        productVariantIds: allVariantIds,
      },
    }
  );

  const addVariantsData = await addVariantsRes.json();
  const addVariantsErrors =
    addVariantsData.data.sellingPlanGroupAddProductVariants.userErrors;

  if (addVariantsErrors?.length > 0) {
    return Response.json({
      success: false,
      error: addVariantsErrors[0].message,
    });
  }

  console.log("Variants updated successfully");
}

  return Response.json({ success: true, shopifyGroupId, ...payload });
};

function PlanId() {
  const { plans, shop } = useLoaderData();
  return <Template shop={shop} editPlandData={plans} />;
}

export default PlanId;