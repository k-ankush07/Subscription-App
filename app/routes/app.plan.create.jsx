// import React from 'react'
// import Templates from "./components/Templates"

// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";
// import { useLoaderData } from 'react-router';

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   return json({
//     shop: session.shop,
//   });
// };
// function Create() {
//   const {shop}= useLoaderData()
//   return (
//    <>
//     <Templates  shop={shop} />
//    </>

//   )
// }

// export default Create

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

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { planPayload } = body;

  try {
    // Shop ID lo
    const shopRes = await admin.graphql(`query { shop { id } }`);
    const shopData = await shopRes.json();
    const shopId = shopData.data.shop.id;

    const sellingPlans = planPayload.options.map((opt) => {
      const interval =
        intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
      const intervalCount = parseInt(opt.deliveryFrequency || 1);
      return {
        name: opt.name || "Option",
        options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}`],
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
                        ? { percentage: parseFloat(opt.discountAmount) }
                        : { fixedValue: parseFloat(opt.discountAmount) },
                  },
                },
              ]
            : [],
      };
    });

    // 1. Selling Plan Group create
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
            merchantCode: `${planPayload.description}`,
            description: planPayload.description,
            options: planPayload.options.map((o) => o.name || "Option"),
            sellingPlansToCreate: sellingPlans,
          },
        },
      },
    );

    const createData = await createRes.json();
    const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
    if (userErrors?.length > 0) {
      return json({
        success: false,
        error: userErrors.map((e) => e.message).join(", "),
      });
    }

    const shopifyGroupId =
      createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
    const numericId = shopifyGroupId.split("/").pop();
    // 2. Products associate
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

    // 3. Shop metafield mein full data save karo
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

    return json({ success: true, shopifyGroupId, planId: numericId });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

function Create() {
  const { shop } = useLoaderData();
  return <Templates shop={shop} />;
}

export default Create;
