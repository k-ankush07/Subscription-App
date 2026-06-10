// import { json } from "@remix-run/node";
// import { authenticate } from "../shopify.server";
// import { useLoaderData } from "react-router";
// import Templates from "./components/PlanPage/Templates";

// const intervalMap = {
//   day: "DAY",
//   days: "DAY",
//   week: "WEEK",
//   weeks: "WEEK",
//   month: "MONTH",
//   months: "MONTH",
//   year: "YEAR",
//   years: "YEAR",
// };

// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);
//   return json({ shop: session.shop });
// };

// export const action = async ({ request }) => {
//   const { admin } = await authenticate.admin(request);
//   const body = await request.json();
//   const { planPayload } = body;
//   // console.log("body log", planPayload)


//   try {
//     // Shop ID lo
//     const shopRes = await admin.graphql(`query { shop { id } }`);
//     const shopData = await shopRes.json();
//     const shopId = shopData.data.shop.id;

//     const sellingPlans = planPayload.options.map((opt,i) => {
//       const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
//       const intervalCount = parseInt(opt.deliveryFrequency) || 1;
//       return {
//         name: opt.name || `Option ${i + 1}` ,
//         options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}  ${i + 1}`],
//         category: "SUBSCRIPTION",
//         billingPolicy: { recurring: { interval, intervalCount } },
//         deliveryPolicy: { recurring: { interval, intervalCount } },
//         pricingPolicies:
//           opt.giveDiscount && opt.discountAmount
//             ? [
//                 {
//                   fixed: {
//                     adjustmentType:
//                       opt.discountType === "percentage" ? "PERCENTAGE" : "PRICE",
//                     adjustmentValue:
//                       opt.discountType === "percentage"
//                         ? { percentage: parseFloat(opt.discountAmount) }
//                         : { fixedValue: parseFloat(opt.discountAmount) },
//                   },
//                 },
//               ]
//             : [],
//       };
//     });


//     // 1. Selling Plan Group create
//     const createRes = await admin.graphql(
//       `
//       mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!) {
//         sellingPlanGroupCreate(input: $input) {
//           sellingPlanGroup { id }
//           userErrors { field message }
//         }
//       }
//     `,
//       {
//         variables: {
//           input: {
//             name: planPayload.title,
//             merchantCode: `${planPayload.description}`,
//             description: planPayload.description,
//             options: planPayload.options.map((o) => o.name || "Option"),
//             sellingPlansToCreate: sellingPlans,
//           },
//         },
//       },
//     );

//     const createData = await createRes.json();
//     console.log("ndsk", createData)

//     const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
//     if (userErrors?.length > 0) {
//       console.log("Create userErrors:", userErrors);
//       return json({
//         success: false,
//         error: userErrors.map((e) => e.message).join(", "),
//       });
//     }

//     const shopifyGroupId = createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
//     const numericId = shopifyGroupId.split("/").pop();

//     // 2. Products associate
//     const addProductsRes = await admin.graphql(
//       `
//       mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
//         sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
//           sellingPlanGroup { id }
//           userErrors { field message }
//         }
//       }
//     `,
//       {
//         variables: {
//           id: shopifyGroupId,
//           productIds: planPayload.selectedProducts.map((p) => p.productId),
//         },
//       },
//     );

//     const addProductsData = await addProductsRes.json();

//     const addProductsErrors = addProductsData.data.sellingPlanGroupAddProducts.userErrors;
//     if (addProductsErrors?.length > 0) {
//       console.log("Add Products userErrors:", addProductsErrors);
//     }

    
//  const metafieldSetRes = await admin.graphql(
//   `
//   mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
//     metafieldsSet(metafields: $metafields) {
//       metafields {
//         id
//         namespace
//         key
//         type
//         value
//         createdAt
//         updatedAt
//       }
//       userErrors {
//         field
//         message
//       }
//     }
//   }
//   `,
//   {
//     variables: {
//       metafields: [
//         {
//           ownerId: shopId,
//           namespace: "selling_plan",
//           key: `plan_${numericId}`,
//           type: "json",
//           value: JSON.stringify({
//             ...planPayload,
//             planId: numericId,
//             shopifyGroupId,
//           }),
//         },
//       ],
//     },
//   }
// );
// const metafieldSetData = await metafieldSetRes.json();

// console.log("dsfsdgdgergrdgrgrdggg",metafieldSetData.data.metafieldsSet.metafields,);

//     const metafieldErrors = metafieldSetData.data.metafieldsSet.userErrors;
//     if (metafieldErrors?.length > 0) {
//       console.log("Metafield userErrors:", metafieldErrors);
//     }
//     return json({ success: true, shopifyGroupId, planId: numericId });

//   } catch (error) {
//     console.error("Action error:", error.message);
//     return json({ success: false, error: error.message });
//   }
// };

// function Create() {
//   const {shop } = useLoaderData();
//   return <Templates shop={shop} />;
// }

// export default Create;



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
    const shopRes = await admin.graphql(`query { shop { id } }`);
    const shopData = await shopRes.json();
    const shopId = shopData.data.shop.id;

    const sellingPlans = planPayload.options.map((opt, i) => {
      const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
      const intervalCount = parseInt(opt.deliveryFrequency) || 1;
      return {
        name: opt.name || `Option ${i + 1}`,
        options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"} ${i + 1}`],
        category: "SUBSCRIPTION",
        // ✅ Saara custom data description mein
        description: JSON.stringify({
          billingType: opt.billingType || "pay_as_you_go",
          billingFrequency: opt.billingFrequency || "",
          minOrders: opt.minOrders || "disabled",
          maxOrders: opt.maxOrders || "unlimited",
          giveDiscount: opt.giveDiscount ?? false,
          discountType: opt.discountType ?? "percentage",
          discountAmount: opt.discountAmount ?? 0,
          changeDiscountAfter: opt.changeDiscountAfter ?? false,
          discountAmount2: opt.discountAmount2 ?? "",
          afterOrders: opt.afterOrders ?? "",
          discountType2: opt.discountType2 ?? "amount",
          giveShippingDiscount: opt.giveShippingDiscount ?? false,
          shippingDiscount: opt.shippingDiscount ?? "",
          shippingAfterOrders: opt.shippingAfterOrders ?? "",
          shippingDiscountType: opt.shippingDiscountType ?? "fixed",
          changeQtyAfterOrders: opt.changeQtyAfterOrders ?? false,
          changeQtyAfterOrdersNum: opt.changeQtyAfterOrdersNum ?? "",
          changeQtyQuantity: opt.changeQtyQuantity ?? "",
          changeQtyProducts: opt.changeQtyProducts ?? [],
          removeFreeProducts: opt.removeFreeProducts ?? false,
          removeFreeAfterOrders: opt.removeFreeAfterOrders ?? "",
          removeFreeProductsList: opt.removeFreeProductsList ?? [],
          setMinQty: opt.setMinQty ?? false,
          minQuantity: opt.minQuantity ?? "",
          allowAutoActions: opt.allowAutoActions ?? false,
          automationCycles: opt.automationCycles ?? [],
          selectedProducts: opt.selectedProducts ?? [],
        }),
        billingPolicy: { recurring: { interval, intervalCount } },
        deliveryPolicy: { recurring: { interval, intervalCount } },
        pricingPolicies:
          opt.giveDiscount && opt.discountAmount
            ? [
                {
                  fixed: {
                    adjustmentType:
                      opt.discountType === "percentage" ? "PERCENTAGE" : "PRICE",
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
      }
    );

    const createData = await createRes.json();
    console.log("ndsk", createData);

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

    // 2. Products associate
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
      }
    );

    const addProductsData = await addProductsRes.json();
    const addProductsErrors =
      addProductsData.data.sellingPlanGroupAddProducts.userErrors;
    if (addProductsErrors?.length > 0) {
      console.log("Add Products userErrors:", addProductsErrors);
    }

    // 3. Metafield save
    const metafieldSetRes = await admin.graphql(
      `
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            type
            value
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
          }
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
      }
    );

    const metafieldSetData = await metafieldSetRes.json();
    console.log(
      "Metafield saved:",
      metafieldSetData.data.metafieldsSet.metafields
    );

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

function Create() {
  const { shop } = useLoaderData();
  return <Templates shop={shop} />;
}

export default Create;