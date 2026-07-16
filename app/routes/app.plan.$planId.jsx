import React from "react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const planId = params.planId;
  const response = await fetch(`${API}/plans/${planId}`,{
    headers:{
       "x-api-key": SECRET_KEY,
    }
  });
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

  //  sellingPlans array
  const sellingPlans = payload.sellingPlans || [];

  if (!shopifyGroupId) {
    return Response.json({ success: false, error: "shopifyGroupId missing" });
  }

  if (sellingPlans.length === 0) {
    return Response.json({ success: false, error: "No selling plans provided" });
  }

  //  Har plan ke liye pricingPolicies build karo
  const buildPricingPolicies = (sp) => {
    const pricingPolicies = [];

    if (sp.giveSubscriptionDiscount) {
      pricingPolicies.push({
        fixed: {
          adjustmentType: sp.discountType,
          adjustmentValue:
            sp.discountType === "PERCENTAGE"
              ? { percentage: Number(sp.discountValue) }
              : { fixedValue: Number(sp.discountValue) },
        },
      });

      // if (sp.changeDiscountAfterOrders && sp.afterOrders) {
      //   pricingPolicies.push({
      //     recurring: {
      //       afterCycle: Number(sp.afterOrders),
      //       adjustmentType: sp.afterDiscountType ?? "PERCENTAGE",
      //       adjustmentValue:
      //         (sp.afterDiscountType ?? "PERCENTAGE") === "PERCENTAGE"
      //           ? { percentage: Number(sp.afterDiscountValue) ?? 0 }
      //           : { fixedValue: Number(sp.afterDiscountValue) ?? 0 },
      //     },
      //   });
      // }
    }

    return pricingPolicies;
  };

  const buildMetafields = (sp) => {
  const extraSettings = {
      changeDiscountAfterOrders: sp.changeDiscountAfterOrders ?? false,
      afterOrders: sp.afterOrders ?? 1,
      afterDiscountType: sp.afterDiscountType ?? "PERCENTAGE",
      afterDiscountValue: sp.afterDiscountValue ?? 0,
    giveShippingDiscount: sp.giveShippingDiscount ?? false,
    shippingDiscountValue: sp.shippingDiscountValue ?? 0,
    shippingAfterOrders: sp.shippingAfterOrders ?? 1,
    shippingDiscountType: sp.shippingDiscountType ?? "PRICE",
    changeQuantityAfterOrders: sp.changeQuantityAfterOrders ?? false,
    quantityAfterOrdersValue: sp.quantityAfterOrdersValue ?? 1,
    quantityAfterOrders: sp.quantityAfterOrders ?? 1,
    quantityProducts: sp.quantityProducts ?? [],
    RemoveFreeProdcut: sp.RemoveFreeProdcut ?? false,
    removeFreeProductValue: sp.removeFreeProductValue ?? 1,
    freeProducts: sp.freeProducts ?? [],
    Automation: sp.Automation ?? false,
    automationCycles: sp.automationCycles ?? [],
    MinimumQuanitity: sp.MinimumQuanitity ?? false,
    MinimumQuanitityValue: sp.MinimumQuanitityValue ?? 1,
  };

  return [
    {
      namespace: "subscription_app",
      key: "extra_settings",
      type: "json",
      value: JSON.stringify(extraSettings),
    },
  ];
};
  //  Plans ko 3 categories mein baanto:

  const plansToUpdate = sellingPlans.filter((sp) => sp.shopifySellingPlanId);
  const plansToCreate = sellingPlans.filter((sp) => !sp.shopifySellingPlanId);

  //  Frontend se jo IDs aayi hain
  const incomingIds = new Set(
    sellingPlans
      .map((sp) => sp.shopifySellingPlanId)
      .filter(Boolean)
  );

  //  DB mein jo IDs pehle se saved thi (payload.existingSellingPlanIds se aayengi)
  // Yeh Frontend Template.jsx se bhejni padegi — neeche dekho
  const existingDbIds = payload.existingSellingPlanIds || [];

  //  Jo IDs DB mein thi par frontend se nahi aayi → DELETE
  const sellingPlansToDelete = existingDbIds.filter(
    (id) => !incomingIds.has(id)
  );

  console.log("Plans to delete:", sellingPlansToDelete);

  //  sellingPlansToUpdate array banao
  const sellingPlansToUpdate = plansToUpdate.map((sp) => {
    const pricingPolicies = buildPricingPolicies(sp);
     const metafields = buildMetafields(sp)
    return {
      id: sp.shopifySellingPlanId,  //  existing Shopify ID
      // name: sp.name,
      name:sp.name?.trim() || `Delivery: Every ${sp.intervalCount} ${sp.interval.toLowerCase()}`,
      options: [`${sp.intervalCount} ${sp.interval.toLowerCase()}`],
      billingPolicy: {
        recurring: {
          interval: sp.interval,
          intervalCount: sp.intervalCount,
          minCycles: sp.minCycles ? Number(sp.minCycles) : null,
          maxCycles: sp.maxCycles ? Number(sp.maxCycles) : null,
        },
      },
      deliveryPolicy: {
        recurring: {
          interval: sp.interval,
          intervalCount: sp.intervalCount,
        },
      },
      ...(pricingPolicies.length > 0 ? { pricingPolicies } : {}),
      metafields
    };
  });

  //  sellingPlansToCreate array banao (naye plans — ID nahi hai)
  const sellingPlansToCreate = plansToCreate.map((sp) => {
    const pricingPolicies = buildPricingPolicies(sp);
     const metafields = buildMetafields(sp); 
    return {
      // name: sp.name,
      name: sp.name?.trim() || `Delivery: Every ${sp.intervalCount} ${sp.interval.toLowerCase()}`,
      options: [`${sp.intervalCount} ${sp.interval.toLowerCase()}`],
      category: "SUBSCRIPTION",
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
      metafields
    };
  });

  //  Step 1: Shopify pe group update karo — update + create ek saath
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
          ...(sellingPlansToUpdate.length > 0 ? { sellingPlansToUpdate } : {}),
          ...(sellingPlansToCreate.length > 0 ? { sellingPlansToCreate } : {}),
          //  Jo plans user ne remove kiye — Shopify pe bhi delete karo
          ...(sellingPlansToDelete.length > 0 ? { sellingPlansToDelete } : {}),
        },
      },
    }
  );

  const updateData = await updateRes.json();
  console.log("sellingPlanGroupUpdate:", updateData.data.sellingPlanGroupUpdate);

  const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;
  if (updateErrors?.length > 0) {
    return Response.json({
      success: false,
      error: updateErrors.map((e) => e.message).join(", "),
    });
  }

  //  Step 2: Existing variants fetch karo
  const existingVariantsRes = await admin.graphql(
    `
    query getExistingVariants($id: ID!) {
      sellingPlanGroup(id: $id) {
        productVariants(first: 250) {
          edges { node { id } }
        }
      }
    }
  `,
    { variables: { id: shopifyGroupId } }
  );

  const existingVariantsData = await existingVariantsRes.json();
  const existingVariantIds =
    existingVariantsData.data.sellingPlanGroup.productVariants.edges.map(
      (e) => e.node.id
    );

  //  Step 3: Existing variants remove karo
  if (existingVariantIds.length > 0) {
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
          productVariantIds: existingVariantIds,
        },
      }
    );
  }

  //  Step 4: Existing products fetch karo
  const existingProductsRes = await admin.graphql(
    `
    query getExistingProducts($id: ID!) {
      sellingPlanGroup(id: $id) {
        products(first: 250) {
          edges { node { id } }
        }
      }
    }
  `,
    { variables: { id: shopifyGroupId } }
  );

  const existingProductsData = await existingProductsRes.json();
  const existingProductIds =
    existingProductsData.data.sellingPlanGroup.products.edges.map(
      (e) => e.node.id
    );

  //  Step 5: Existing products remove karo
  if (existingProductIds.length > 0) {
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
          productIds: existingProductIds,
        },
      }
    );
  }

  //  Step 6: Naye products add karo
  const addProductsRes = await admin.graphql(
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

  const addProductsData = await addProductsRes.json();
  const addProductsErrors =
    addProductsData.data.sellingPlanGroupAddProducts.userErrors;
  if (addProductsErrors?.length > 0) {
    return Response.json({
      success: false,
      error: addProductsErrors[0].message,
    });
  }

  //  Step 7: Naye variants add karo
  const allVariantIds = payload.products.flatMap((p) =>
    p.variants.map((v) => v.variantsId)
  );

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

  //  Step 8: Update ke baad saari plans ki IDs fetch karo
  const fetchRes = await admin.graphql(
    `
    query getSellingPlanIds($id: ID!, $first: Int!) {
      sellingPlanGroup(id: $id) {
        sellingPlans(first: $first) {
          edges {
            node { id }
          }
        }
      }
    }
  `,
    { variables: { id: shopifyGroupId, first: sellingPlans.length + 10 } }
  );

  const fetchData = await fetchRes.json();

  //  Saari IDs array mein
  const shopifySellingPlanIds =
    fetchData.data.sellingPlanGroup.sellingPlans.edges.map(
      (edge) => edge.node.id
    );

  console.log("Updated Shopify Selling Plan IDs:", shopifySellingPlanIds);

  return Response.json({
    success: true,
    shopifyGroupId,
    shopifySellingPlanIds,  //  array — frontend pe map hoga
    ...payload,
  });
};

function PlanId() {
  const { plans, shop } = useLoaderData();
  return <Template shop={shop} editPlandData={plans} />;
}

export default PlanId;