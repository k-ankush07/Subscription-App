import { authenticate } from "../shopify.server";
import Template from "./components/Template";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  console.log("shopi id ",session.shop)
  return Response.json({ shop: session.shop });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  
  console.log("body:", payload);

  //  sellingPlans array — pehle plan ya poora array
  const sellingPlans = payload.sellingPlans || [];

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

      if (sp.changeDiscountAfterOrders && sp.afterOrders) {
        pricingPolicies.push({
          recurring: {
            afterCycle: Number(sp.afterOrders),
            adjustmentType: sp.afterDiscountType ?? "PERCENTAGE",
            adjustmentValue:
              (sp.afterDiscountType ?? "PERCENTAGE") === "PERCENTAGE"
                ? { percentage: Number(sp.afterDiscountValue) ?? 0 }
                : { fixedValue: Number(sp.afterDiscountValue) ?? 0 },
          },
        });
      }
    }

    return pricingPolicies;
  };

  //  Saare plans ka sellingPlansToCreate array banao
  const sellingPlansToCreate = sellingPlans.map((sp) => {
    const pricingPolicies = buildPricingPolicies(sp);

    return {
      // name: sp.name ||  `Every ${sp.intervalCount} ${sp.interval.toLowerCase()}`,
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
    };
  });

  //  Shopify pe selling plan group create karo — saare plans ek saath
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
          sellingPlansToCreate,  //  saare plans array
        },
      },
    }
  );

  const createData = await createRes.json();
  console.log("sellingPlanGroupCreate:", createData.data.sellingPlanGroupCreate);

  const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
  if (userErrors?.length > 0) {
    console.log("Create userErrors:", userErrors);
    return Response.json({
      success: false,
      error: userErrors.map((e) => e.message).join(", "),
    });
  }

  const shopifyGroupId =
    createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
  console.log("Shopify Group ID:", shopifyGroupId);

  //  Products attach karo
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
    console.log("Add Products userErrors:", addProductsErrors);
    return Response.json({
      success: false,
      error: addProductsErrors[0].message,
    });
  }

  //  Variants attach 
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



  // add meta filed 
  const buildExtraSettings = (sp) => ({
    shippingDiscount: {
      enabled: sp.giveShippingDiscount ?? false,
      value: Number(sp.shippingDiscountValue) || 0,
      afterOrders: Number(sp.shippingAfterOrders) || 1,
      type: sp.shippingDiscountType ?? "PRICE",
    },
    quantityChange: {
      enabled: sp.changeQuantityAfterOrders ?? false,
      newQuantity: Number(sp.quantityAfterOrdersValue) || 1,
      afterOrders: Number(sp.quantityAfterOrders) || 1,
      products: sp.quantityProducts ?? [],
    },
    removeFreeProduct: {
      enabled: sp.RemoveFreeProdcut ?? false,
      afterOrders: Number(sp.removeFreeProductValue) || 1,
      products: sp.freeProducts ?? [],
    },
    automation: {
      enabled: sp.Automation ?? false,
      cycles: sp.automationCycles ?? [],
    },
    setQuantity:{
      enable: sp.MinimumQuanitity
    }
  });
 
  //  Har plan apni shopify id ke saath extra settings array mein
  const extraSettingsList = sellingPlans.map((sp, idx) => ({
    planName: sp.name?.trim() || null,
    shopifySellingPlanId: shopifySellingPlanIds[idx] ?? null,
    ...buildExtraSettings(sp),
  }));

 
  const metafieldRes = await admin.graphql(
    `
    mutation setSellingPlanExtraSettings($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            ownerId: shopifyGroupId,
            namespace: "subscription_app",
            key: "extra_settings",
            type: "json",
            value: JSON.stringify(extraSettingsList),
          },
        ],
      },
    }
  );
 
  const metafieldData = await metafieldRes.json();
  const metafieldErrors = metafieldData.data.metafieldsSet.userErrors;
 
  if (metafieldErrors?.length > 0) {
    console.log("Metafield userErrors:", metafieldErrors);
    // Group already ban chuka hai, isliye hard-fail nahi karte —
    // bas warning ke saath return karte hain
    return Response.json({
      success: true,
      shopifyGroupId,
      metafieldWarning: metafieldErrors.map((e) => e.message).join(", "),
    });
  }
 
  console.log("Extra settings metafield saved:", metafieldData.data.metafieldsSet.metafields);
  //  Saare plans ki IDs fetch karo — first: sellingPlans.length
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
  //  Saari ID array mein — har plan ki apni ID
  const shopifySellingPlanIds =
    fetchData.data.sellingPlanGroup.sellingPlans.edges.map(
      (edge) => edge.node.id
    );
  
  return Response.json({
    success: true,
    shopifyGroupId,
    shopifySellingPlanIds,  
    ...payload,
  });
  
};

function CreatePlan() {
  const { shop } = useLoaderData();
  return <Template shop={shop} />;
}

export default CreatePlan;