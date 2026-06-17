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
// console.log("body log", planPayload);

//   try {
//     const shopRes = await admin.graphql(`query { shop { id } }`);
//     const shopData = await shopRes.json();
//     const shopId = shopData.data.shop.id;

//     const sellingPlans = planPayload.options.map((opt, i) => {
//       const interval =
//         intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
//       const intervalCount = parseInt(opt.deliveryFrequency) || 1;
//       return {
//         name: opt.name || `Option ${i + 1}`,
//         options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}`],
//         category: "SUBSCRIPTION",
//         billingPolicy: { recurring: { interval, intervalCount } },
//         deliveryPolicy: { recurring: { interval, intervalCount } },
//         pricingPolicies:
//           opt.giveDiscount && opt.discountAmount
//             ? [
//                 {
//                   fixed: {
//                     adjustmentType:
//                       opt.discountType === "percentage"
//                         ? "PERCENTAGE"
//                         : opt.discountType === "fixed"
//                           ? "PRICE" //  fixed price
//                           : "FIXED_AMOUNT", //  amount off ✓
//                     adjustmentValue:
//                       opt.discountType === "percentage"
//                         ? { percentage: parseFloat(opt.discountAmount) }
//                         : opt.discountType === "fixed"
//                           ? { fixedValue: parseFloat(opt.discountAmount) }
//                           : { fixedValue: parseFloat(opt.discountAmount) }, // amount off
//                   },
//                 },
//               ]
//             : [],
//       };
//     });

//     //  console.log("fnjkbfjkedbffndb",sellingPlans.pricingPolicies)
//     //  console.log("fnjkbfjkedbffndbsddwqdwdwdqw",planPayload.options.map((o) => o.name || "Option"),)
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
//             description: `${planPayload.description}`,
//             options: ["Delivery Frequency"],
//             sellingPlansToCreate: sellingPlans,
//           },
//         },
//       },
//     );

//     const createData = await createRes.json();

//     const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
//     if (userErrors?.length > 0) {
//       console.log("Create userErrors:", userErrors);
//       return json({
//         success: false,
//         error: userErrors.map((e) => e.message).join(", "),
//       });
//     }

//     const shopifyGroupId =
//       createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
//     const numericId = shopifyGroupId.split("/").pop();
//     // console.log("shopifyGroupId:", shopifyGroupId, "| numericId:", numericId);

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

//     const addProductsErrors =
//       addProductsData.data.sellingPlanGroupAddProducts.userErrors;
//     if (addProductsErrors?.length > 0) {
//       console.log("Add Products userErrors:", addProductsErrors);
//     }

//     const metafieldSetRes = await admin.graphql(
//       `
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
//       {
//         variables: {
//           metafields: [
//             {
//               ownerId: shopId,
//               namespace: "selling_plan",
//               key: `plan_${numericId}`,
//               type: "json",
//               value: JSON.stringify({
//                 ...planPayload,
//                 planId: numericId,
//                 shopifyGroupId,
//               }),
//             },
//           ],
//         },
//       },
//     );
//     const metafieldSetData = await metafieldSetRes.json();
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
//   const { shop } = useLoaderData();
//   return <Templates shop={shop} />;
// }

// export default Create;


import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
import Templates from "./components/PlanPage/Templates";

const intervalMap = {
  day: "DAY", days: "DAY",
  week: "WEEK", weeks: "WEEK",
  month: "MONTH", months: "MONTH",
  year: "YEAR", years: "YEAR",
};

const buildPackedName = (opt, index) => JSON.stringify({
  displayName: opt.name || `Option ${index + 1}`,
  billingType: opt.billingType || "pay_as_you_go",
  billingFrequency: opt.billingFrequency || "",
  minOrders: opt.minOrders || "disabled",
  maxOrders: opt.maxOrders || "unlimited",
  giveDiscount: opt.giveDiscount ?? false,
  discountType: opt.discountType || "amount",
  discountAmount: opt.discountAmount || "",
  changeDiscountAfter: opt.changeDiscountAfter ?? false,
  discountAmount2: opt.discountAmount2 || "",
  afterOrders: opt.afterOrders || "",
  discountType2: opt.discountType2 || "amount",
  giveShippingDiscount: opt.giveShippingDiscount ?? false,
  shippingDiscount: opt.shippingDiscount || "",
  shippingAfterOrders: opt.shippingAfterOrders || "",
  shippingDiscountType: opt.shippingDiscountType || "fixed",
  allowAutoActions: opt.allowAutoActions ?? false,
  automationCycles: opt.automationCycles ?? [],
  changeQtyAfterOrders: opt.changeQtyAfterOrders ?? false,
  changeQtyAfterOrdersNum: opt.changeQtyAfterOrdersNum || "",
  changeQtyQuantity: opt.changeQtyQuantity || "",
  changeQtyProducts: opt.changeQtyProducts ?? [],
  removeFreeProducts: opt.removeFreeProducts ?? false,
  removeFreeAfterOrders: opt.removeFreeAfterOrders || "",
  removeFreeProductsList: opt.removeFreeProductsList ?? [],
  setMinQty: opt.setMinQty ?? false,
  minQuantity: opt.minQuantity || "1",
  selectedProducts: opt.selectedProducts ?? [],
});

const buildPricingPolicies = (opt) => {
  const policies = [];
  if (opt.giveDiscount && opt.discountAmount) {
    policies.push({
      fixed: {
        afterCycle: 0,
        adjustmentType:
          opt.discountType === "percentage" ? "PERCENTAGE"
          : opt.discountType === "fixed"    ? "PRICE"
          :                                   "FIXED_AMOUNT",
        adjustmentValue:
          opt.discountType === "percentage"
            ? { percentage: parseFloat(opt.discountAmount) }
            : { fixedValue: parseFloat(opt.discountAmount) },
      },
    });
  }
  if (opt.changeDiscountAfter && opt.discountAmount2 && opt.afterOrders) {
    policies.push({
      fixed: {
        afterCycle: parseInt(opt.afterOrders),
        adjustmentType:
          opt.discountType2 === "percentage" ? "PERCENTAGE"
          : opt.discountType2 === "fixed"    ? "PRICE"
          :                                    "FIXED_AMOUNT",
        adjustmentValue:
          opt.discountType2 === "percentage"
            ? { percentage: parseFloat(opt.discountAmount2) }
            : { fixedValue: parseFloat(opt.discountAmount2) },
      },
    });
  }
  return policies;
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { planPayload } = body;
  console.log("body log", planPayload);

  try {
    const sellingPlans = planPayload.options.map((opt, i) => {
      const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
      const intervalCount = parseInt(opt.deliveryFrequency) || 1;
      return {
        name: buildPackedName(opt, i),
        options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}`],
        category: "SUBSCRIPTION",
        billingPolicy: { recurring: { interval, intervalCount } },
        deliveryPolicy: { recurring: { interval, intervalCount } },
        pricingPolicies: buildPricingPolicies(opt),
      };
    });

    const groupName = JSON.stringify({
      displayTitle: planPayload.title,
      description: planPayload.description,
      productChanges: planPayload.productChanges ?? {
        swap: true, variant: true, quantity: true, keepDiscount: true,
      },
      selectedProducts: planPayload.selectedProducts,
    });

    const createRes = await admin.graphql(
      `mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!) {
        sellingPlanGroupCreate(input: $input) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          input: {
            name: groupName,
            merchantCode: planPayload.title,
            description: planPayload.description || "",
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
      return json({ success: false, error: userErrors.map((e) => e.message).join(", ") });
    }

    const shopifyGroupId = createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
    const numericId = shopifyGroupId.split("/").pop();

    if (planPayload.selectedProducts?.length > 0) {
      const addProductsRes = await admin.graphql(
        `mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
          sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
            sellingPlanGroup { id }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            id: shopifyGroupId,
            productIds: planPayload.selectedProducts.map((p) => p.productId),
          },
        },
      );
      const addProductsData = await addProductsRes.json();
      const addProductsErrors = addProductsData.data.sellingPlanGroupAddProducts.userErrors;
      if (addProductsErrors?.length > 0) {
        console.log("Add Products userErrors:", addProductsErrors);
      }
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