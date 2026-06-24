import { authenticate } from "../shopify.server";
import Template from "./components/Template";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return Response.json({ shop: session.shop });
};




export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  console.log("body ,", payload);

  const sp = payload.sellingPlan;

  // Build pricing policies
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
          sellingPlansToCreate: [
            {
              name: sp.name,
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
            },
          ],
        },
      },
    },
  );

  const createData = await createRes.json();
  console.log("ffjwjkf", createData.data.sellingPlanGroupCreate);
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
    },
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
  // Variants bhi attach karo
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
    },
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


  // Selling Plan ID fetch karo
  const fetchRes = await admin.graphql(
    `
    query getSellingPlanId($id: ID!) {
      sellingPlanGroup(id: $id) {
        sellingPlans(first: 1) {
          edges {
            node { id }
          }
        }
      }
    }
  `,
    { variables: { id: shopifyGroupId } }
  );

  const fetchData = await fetchRes.json();
  const shopifySellingPlanId =
    fetchData.data.sellingPlanGroup.sellingPlans.edges[0]?.node?.id;
  const shopifySellingPlanIds = 
  fetchData.data.sellingPlanGroup.sellingPlans.edges.map(
    (edge) => edge.node.id
  );

  console.log("Shopify Selling Plan ID:", shopifySellingPlanId);

  return Response.json({ success: true, shopifyGroupId,shopifySellingPlanId, ...payload });
};


function CreatePlan() {
  const { shop } = useLoaderData();
  return <Template shop={shop} />;
}

export default CreatePlan;
