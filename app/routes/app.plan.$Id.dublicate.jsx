import { authenticate } from "../shopify.server";
import React from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { Id } = params;
  const response = await fetch(`${API}/plans/${Id}`,{
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
  console.log("Duplicate action payload:", payload);

  //  Step 1: sellingPlans array lo
  const sellingPlans = payload.sellingPlans || [];

  if (sellingPlans.length === 0) {
    return Response.json({ success: false, error: "No selling plans provided" });
  }

  //  Step 2: Har plan ke liye pricingPolicies build karne ka helper
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

      // if (sp.changeDiscountAfterOrders && sp.afterOrders != null) {
      //   pricingPolicies.push({
      //     recurring: {
      //       afterCycle: Math.max(0, Number(sp.afterOrders) - 1),
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
  const buildMetafields = (sp, customerProductChanges) => {
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
     customerProductChanges: customerProductChanges ?? {},
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

  //  Step 3: Saare plans ka sellingPlansToCreate array banao
  // Duplicate mein saare plans NAYE honge — koi existing ID use nahi hogi
  const sellingPlansToCreate = sellingPlans.map((sp) => {
    const pricingPolicies = buildPricingPolicies(sp);
    const metafields = buildMetafields(sp,payload.customerProductChanges);
    return {
      // name: sp.name,
      name: sp.name?.trim() || `Delivery: Every ${sp.intervalCount} ${sp.interval.toLowerCase()}`,
      options: [`${sp.intervalCount} ${sp.interval.toLowerCase()}`],
      category: "SUBSCRIPTION",
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

  //  Step 4: Shopify pe naya group create karo — saare plans ek saath
  const createRes = await admin.graphql(
    `
    mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!) {
      sellingPlanGroupCreate(input: $input) {
        sellingPlanGroup { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        input: {
          name: payload.planName,
          merchantCode: payload.planName,
          options: ["Delivery Frequency"],
          sellingPlansToCreate, //  saare plans array
        },
      },
    }
  );

  const createData = await createRes.json();
  console.log("Duplicate create data:", createData.data);

  const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
  if (userErrors?.length > 0) {
    return Response.json({
      success: false,
      error: userErrors.map((e) => e.message).join(", "),
    });
  }

  const shopifyGroupId =
    createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
  console.log("New Shopify Group ID:", shopifyGroupId);

  //  Step 5: Products attach karo
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

  //  Step 6: Variants attach karo
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
      console.log("Add Variants userErrors:", addVariantsErrors);
      return Response.json({
        success: false,
        error: addVariantsErrors[0].message,
      });
    }

    console.log("Variants attached successfully");
  }

  //  Step 7: Saare naye plans ki IDs fetch karo
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
    { variables: { id: shopifyGroupId, first: sellingPlans.length } }
  );

  const fetchData = await fetchRes.json();

  //  Saari IDs array mein — har plan ki apni naye ID
  const shopifySellingPlanIds =
    fetchData.data.sellingPlanGroup.sellingPlans.edges.map(
      (edge) => edge.node.id
    );

  console.log("Duplicate Shopify Selling Plan IDs:", shopifySellingPlanIds);

  return Response.json({
    success: true,
    shopifyGroupId,
    shopifySellingPlanIds, 
    ...payload,
  });
};

function DuplicatePlanPage() {
  const { plans, shop } = useLoaderData();
  return <Template shop={shop} dublicateData={plans} />;
}

export default DuplicatePlanPage;