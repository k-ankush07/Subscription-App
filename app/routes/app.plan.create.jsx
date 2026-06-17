import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
import Templates from "./components/PlanPage/Templates";

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

//  Loader 
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop });
};

//  Action 
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { planPayload } = body;
  console.log("body log", planPayload);

  try {
    const shopRes = await admin.graphql(`query { shop { id } }`);
    const shopData = await shopRes.json();
    const shopId = shopData.data.shop.id;

    // Build selling plans using shared helper
    const sellingPlans = planPayload.options.map((opt, i) => ({
      name: opt.name || `Option ${i + 1}`,
      options: [
        `Every ${parseInt(opt.deliveryFrequency) || 1} ${opt.deliveryInterval || "month"}`,
      ],
      category: "SUBSCRIPTION",
      ...buildSellingPlanPolicies(opt),
    }));

    // 1. Create selling plan group
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
            name: planPayload.title,
            merchantCode: planPayload.description,
            description: planPayload.description,
            options: ["Delivery Frequency"],
            sellingPlansToCreate: sellingPlans,
          },
        },
      },
    );

    const createData = await createRes.json();
    const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
    if (userErrors?.length > 0) {
      console.log("Create userErrors:", userErrors);
      return json({
        success: false,
        error: userErrors.map((e) => e.message).join(", "),
      });
    }

    const shopifyGroupId =
      createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
    const numericId = shopifyGroupId.split("/").pop();

    // 2. Associate products
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
          productIds: planPayload.selectedProducts.map((p) => p.productId),
        },
      },
    );

    const addProductsData = await addProductsRes.json();
    const addProductsErrors =
      addProductsData.data.sellingPlanGroupAddProducts.userErrors;
    if (addProductsErrors?.length > 0) {
      console.log("Add Products userErrors:", addProductsErrors);
    }

    // 3. Save full payload to metafield
    const metafieldSetRes = await admin.graphql(
      `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key type value createdAt updatedAt }
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

    const metafieldSetData = await metafieldSetRes.json();
    const metafieldErrors = metafieldSetData.data.metafieldsSet.userErrors;
    if (metafieldErrors?.length > 0) {
      console.log("Metafield userErrors:", metafieldErrors);
    }

    return json({ success: true, shopifyGroupId, planId: numericId });
  } catch (error) {
    console.error("Action error:", error.message);
    return json({ success: false, error: error.message });
  }
};

//  Component 
function Create() {
  const { shop } = useLoaderData();
  return <Templates shop={shop} />;
}

export default Create;