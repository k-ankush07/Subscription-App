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

// export const loader = async ({ request, params }) => {
//   const { admin, session } = await authenticate.admin(request);
//   const { planId } = params;

//   const fullGid = `gid://shopify/SellingPlanGroup/${planId}`;

//   const res = await admin.graphql(
//     `
//     query getSellingPlanGroup($id: ID!) {
//       sellingPlanGroup(id: $id) {
//         id
//         name
//         description
//         merchantCode
//         products(first: 20) {
//           edges {
//             node {
//               id
//               title
//               featuredImage { url }
//               variants(first: 100) {
//                 edges {
//                   node {
//                     id
//                     title
//                   }
//                 }
//               }
//             }
//           }
//         }
//         sellingPlans(first: 10) {
//           edges {
//             node {
//               id
//               name
//               billingPolicy {
//                 ... on SellingPlanRecurringBillingPolicy {
//                   interval
//                   intervalCount
//                 }
//               }
//               pricingPolicies {
//                 ... on SellingPlanFixedPricingPolicy {
//                   adjustmentType
//                   adjustmentValue {
//                     ... on SellingPlanPricingPolicyPercentageValue {
//                       percentage
//                     }
//                     ... on MoneyV2 {
//                       amount
//                       currencyCode
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `,
//     { variables: { id: fullGid } },
//   );



//   const metafieldRes = await admin.graphql(
//     `
//   query GetPlanMetafield($namespace: String!, $key: String!) {
//     shop {
//       metafield(namespace: $namespace, key: $key) {
//         id
//         namespace
//         key
//         type
//         value
//         createdAt
//         updatedAt
//       }
//     }
//   }
//   `,
//     {
//       variables: {
//         namespace: "selling_plan",
//         key: `plan_${planId}`,
//       },
//     },
//   );
//   const metafieldData = await metafieldRes.json();
//   const metadata = metafieldData.data.shop.metafield
//     ? JSON.parse(metafieldData.data.shop.metafield.value)
//     : null;
//   // console.log('metadta', metadata)
//   const data = await res.json();
//   // console.log("log data", JSON.stringify(data.data.sellingPlanGroup.sellingPlans.edges, null, 2));
//   const group = data.data.sellingPlanGroup;
//   // console.log('dfdfdfedfefe',group.products.edges)

//   if (!group) throw new Response("Plan not found", { status: 404 });

//   return json({
//     shop: session.shop,
//     planId,
//     shopifyGroupId: fullGid,
//     metadata,
//     id: group.id,
//     title: group.name,
//     description: group.description || "",
//     selectedProducts: group.products.edges.map((e) => ({
//       productId: e.node.id,
//       productTitle: e.node.title,
//       productImage: e.node.featuredImage?.url || "",
//       variantIds: e.node.variants?.edges.map((v) => v.node.id) || [],
//       variantTitles: e.node.variants?.edges.map((v) => v.node.title) || [],
//     })),
//     options: group.sellingPlans.edges.map((e, index) => {
//       const plan = e.node;
//       const billing = plan.billingPolicy;
//       const pricing = plan.pricingPolicies?.[0];
//       const adjustmentValue = pricing?.adjustmentValue;
//       // Matching custom option
//       // const metaOption = metadata?.options?.[index] || {};
//       const metaOption =
//         metadata?.options?.find((o) => o.sellingPlanId === plan.id) ||
//         metadata?.options?.[index] ||
//         {};

//       return {
//         sellingPlanId: plan.id,
//         // Shopify fields
//         name: plan.name,
//         deliveryInterval: billing?.interval?.toLowerCase() || "month",
//         deliveryFrequency: billing?.intervalCount || 1,
//         billingType: metaOption.billingType || "pay_as_you_go",
//         billingFrequency: metaOption.billingFrequency || "",
//         // Custom metafield data
//         minOrders: metaOption.minOrders || "disabled",
//         maxOrders: metaOption.maxOrders || "unlimited",

//         giveDiscount: metaOption.giveDiscount ?? !!pricing,
//         discountType:
//           metaOption.discountType ??
//           (adjustmentValue?.percentage != null ? "percentage" : "fixed"),
//         discountAmount:
//           metaOption.discountAmount ??
//           adjustmentValue?.percentage ??
//           adjustmentValue?.amount ??
//           0,

//         giveShippingDiscount: metaOption.giveShippingDiscount ?? false,

//         changeDiscountAfter: metaOption.changeDiscountAfter ?? false,
//         discountAmount2: metaOption.discountAmount2 ?? "",
//         afterOrders: metaOption.afterOrders ?? "",
//         discountType2: metaOption.discountType2 ?? "amount",

//         shippingDiscount: metaOption.shippingDiscount ?? "",
//         shippingAfterOrders: metaOption.shippingAfterOrders ?? "",
//         shippingDiscountType: metaOption.shippingDiscountType ?? "fixed",

//         changeQtyAfterOrders: metaOption.changeQtyAfterOrders ?? false,
//         changeQtyAfterOrdersNum: metaOption.changeQtyAfterOrdersNum ?? "",
//         changeQtyQuantity: metaOption.changeQtyQuantity ?? "",

//         // Array
//         changeQtyProducts: metaOption.changeQtyProducts ?? [],

//         removeFreeProducts: metaOption.removeFreeProducts ?? false,
//         removeFreeAfterOrders: metaOption.removeFreeAfterOrders ?? "",
//         removeFreeProductsList: metaOption.removeFreeProductsList ?? [],

//         setMinQty: metaOption.setMinQty ?? false,
//         minQuantity: metaOption.minQuantity ?? "",

//         allowAutoActions: metaOption.allowAutoActions ?? false,
//         automationCycles: metaOption.automationCycles ?? [],

//         selectedProducts: metaOption.selectedProducts ?? [],
//       };
//     }),

//     productChanges: metadata?.productChanges ?? {
//       swap: true,
//       variant: true,
//       quantity: true,
//       keepDiscount: true,
//     },
//   });
// };

// export const action = async ({ request, params }) => {
//   const { admin } = await authenticate.admin(request);
//   const body = await request.json();
//   const { type, planPayload, shopifyGroupId } = body;
//   // console.log("Current Options", planPayload.options);

//   const removedProductIds = planPayload.removedProductIds;
//   const originalProductIds = planPayload.originalProductIds ?? [];
//   const shopRes = await admin.graphql(`query { shop { id } }`);
//   const shopData = await shopRes.json();
//   const shopId = shopData.data.shop.id;

//   // DELETE
//   if (type === "delete") {
//     const res = await admin.graphql(
//       `
//       mutation sellingPlanGroupDelete($id: ID!) {
//         sellingPlanGroupDelete(id: $id) {
//           deletedSellingPlanGroupId
//           userErrors { field message }
//         }
//       }
//     `,
//       { variables: { id: shopifyGroupId } },
//     );

//     const data = await res.json();
//     const errors = data.data.sellingPlanGroupDelete.userErrors;
//     if (errors?.length > 0) {
//       return json({
//         success: false,
//         error: errors.map((e) => e.message).join(", "),
//       });
//     }
//     return json({ success: true, deleted: true });
//   }

//   // UPDATE (upsert)
//   try {
//     const updateRes = await admin.graphql(
//       `
//       mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
//         sellingPlanGroupUpdate(id: $id, input: $input) {
//           sellingPlanGroup { id }
//           userErrors { field message }
//         }
//       }
//     `,
//       {
//         variables: {
//           id: shopifyGroupId,
//           input: {
//             name: planPayload.title,
//             description: planPayload.description,
//             sellingPlansToDelete: planPayload.deletedPlanIds ?? [],
//             sellingPlansToUpdate: planPayload.options
//               .filter((o) => o.sellingPlanId)
//               .map((opt, i) => {
//                 //
//                 const interval =
//                   intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
//                 const intervalCount = parseInt(opt.deliveryFrequency || 1);
//                 return {
//                   id: opt.sellingPlanId,
//                   name: opt.name || "Option",
//                   options: [
//                     `Every ${intervalCount} ${opt.deliveryInterval || "month"}`,
//                   ],
//                   billingPolicy: { recurring: { interval, intervalCount } },
//                   deliveryPolicy: { recurring: { interval, intervalCount } },
//                   pricingPolicies:
//                     opt.giveDiscount && opt.discountAmount
//                       ? [
//                           {
//                             fixed: {
//                               adjustmentType:
//                                 opt.discountType === "percentage"
//                                   ? "PERCENTAGE"
//                                   : opt.discountType === "fixed"
//                                     ? "PRICE" //  fixed price
//                                     : "FIXED_AMOUNT", //  amount off ✓
//                               adjustmentValue:
//                                 opt.discountType === "percentage"
//                                   ? {
//                                       percentage: parseFloat(
//                                         opt.discountAmount,
//                                       ),
//                                     }
//                                   : opt.discountType === "fixed"
//                                     ? {
//                                         fixedValue: parseFloat(
//                                           opt.discountAmount,
//                                         ),
//                                       }
//                                     : {
//                                         fixedValue: parseFloat(
//                                           opt.discountAmount,
//                                         ),
//                                       }, // amount off
//                             },
//                           },
//                         ]
//                       : [],
//                 };
//               }),

//             sellingPlansToCreate: planPayload.options
//               .filter((o) => !o.sellingPlanId)
//               .map((opt, i) => {
//                 //
//                 const interval =
//                   intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
//                 const intervalCount = parseInt(opt.deliveryFrequency || 1);
//                 return {
//                   name: opt.name || "Option",
//                   options: [
//                     `Every ${intervalCount} ${opt.deliveryInterval || "month"}`,
//                   ], //
//                   category: "SUBSCRIPTION",
//                   billingPolicy: { recurring: { interval, intervalCount } },
//                   deliveryPolicy: { recurring: { interval, intervalCount } },
//                   pricingPolicies:
//                     opt.giveDiscount && opt.discountAmount
//                       ? [
//                           {
//                             fixed: {
//                               adjustmentType:
//                                 opt.discountType === "percentage"
//                                   ? "PERCENTAGE"
//                                   : "PRICE",
//                               adjustmentValue:
//                                 opt.discountType === "percentage"
//                                   ? {
//                                       percentage: parseFloat(
//                                         opt.discountAmount,
//                                       ),
//                                     }
//                                   : {
//                                       fixedValue: parseFloat(
//                                         opt.discountAmount,
//                                       ),
//                                     },
//                             },
//                           },
//                         ]
//                       : [],
//                 };
//               }),
//           },
//         },
//       },
//     );
//   console.log("CREATE sending:", planPayload.options
//   .filter((o) => !o.sellingPlanId)
//   .map((opt) => ({
//     name: opt.name,
//     interval: intervalMap[opt.deliveryInterval?.toLowerCase()],
//     frequency: opt.deliveryFrequency,
//     optionStr: `Every ${parseInt(opt.deliveryFrequency || 1)} ${opt.deliveryInterval || "month"}`,
//   }))
// );

//     const updateData = await updateRes.json();
//     // console.log("jcdscdbcjkdbcjd", updateData.data.sellingPlanGroupUpdate)
//     const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;
//     console.log(
//       "Shopify userErrors:",
//       JSON.stringify(
//         updateData.data.sellingPlanGroupUpdate.userErrors,
//         null,
//         2,
//       ),
//     );
//     if (updateErrors?.length > 0) {
//       return json({
//         success: false,
//         error: updateErrors.map((e) => e.message).join(", "),
//       });
//     }

//     // Remove products
//     if (removedProductIds?.length > 0) {
//       const removeRes = await admin.graphql(
//         `
//     mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
//       sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
//         removedProductIds
//         userErrors { field message }
//       }
//     }
//   `,
//         {
//           variables: {
//             id: shopifyGroupId,
//             productIds: removedProductIds,
//           },
//         },
//       );
//       const removeData = await removeRes.json();
//     }

//     // console.log("removedProductIds:", planPayload.removedProductIds);
//     // console.log("selectedProducts:", planPayload.selectedProducts);

//     // Add products
//     if (planPayload.selectedProducts?.length > 0) {
//       const productsToAdd = planPayload.selectedProducts.filter(
//         (p) => !originalProductIds.includes(p.productId),
//       );

//       if (productsToAdd.length > 0) {
//         //
//         const addRes = await admin.graphql(
//           `
//       mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
//         sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
//           sellingPlanGroup { id }
//           userErrors { field message }
//         }
//       }
//     `,
//           {
//             variables: {
//               id: shopifyGroupId,
//               productIds: productsToAdd.map((p) => p.productId),
//             },
//           },
//         );
//         const addData = await addRes.json();
//       }
//     }

//     // Update metafield
//     const numericId = shopifyGroupId.split("/").pop();
//     await admin.graphql(
//       `
//       mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
//         metafieldsSet(metafields: $metafields) {
//           metafields { id key }
//           userErrors { field message }
//         }
//       }
//     `,
//       {
//         variables: {
//           metafields: [
//             {
//               ownerId: shopId,
//               namespace: "selling_plan",
//               key: `plan_${numericId}`,
//               type: "json",
//               value: JSON.stringify({
//                 planId: numericId,
//                 shopifyGroupId,
//                 shop: planPayload.shop,
//                 description: planPayload.description,
//                 selectedProducts: planPayload.selectedProducts,
//                 productChanges: planPayload.productChanges,
//                 options: planPayload.options,
//                 title: planPayload.title,
//               }),
//             },
//           ],
//         },
//       },
//     );
//     const freshRes = await admin.graphql(
//       `query getSellingPlanGroup($id: ID!) {
//     sellingPlanGroup(id: $id) {
//       sellingPlans(first: 10) {
//         edges { node { id name } }
//       }
//     }
//   }`,
//       { variables: { id: shopifyGroupId } },
//     );
//     const freshData = await freshRes.json();
//     const freshPlans = freshData.data.sellingPlanGroup.sellingPlans.edges.map(
//       (e) => ({ id: e.node.id, name: e.node.name }),
//     );
//     return json({ success: true, planId: params.planId, freshPlans });
//   } catch (error) {
//     return json({ success: false, error: error.message });
//   }
// };

// export default function PlanId() {
//   const plan = useLoaderData();
//   console.log("Plan data loaded:", plan);
//   return (
//     <div style={{ padding: "1.5rem" }}>
//       <Templates
//         shop={plan.shop}
//         singlePlanId={plan.planId}
//         singlePlanData={plan}
//       />
//     </div>
//   );
// }


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

const parsePlanName = (nameStr) => {
  try { return JSON.parse(nameStr); } catch { return { displayName: nameStr }; }
};

const parseGroupName = (nameStr) => {
  try { return JSON.parse(nameStr); } catch { return { displayTitle: nameStr }; }
};

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { planId } = params;
  const fullGid = `gid://shopify/SellingPlanGroup/${planId}`;

  const res = await admin.graphql(
    `query getSellingPlanGroup($id: ID!) {
      sellingPlanGroup(id: $id) {
        id
        name
        merchantCode
        products(first: 20) {
          edges {
            node {
              id
              title
              featuredImage { url }
              variants(first: 100) {
                edges { node { id title } }
              }
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
              pricingPolicies {
                ... on SellingPlanFixedPricingPolicy {
                  afterCycle
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue { percentage }
                    ... on MoneyV2 { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { variables: { id: fullGid } },
  );

  const data = await res.json();
  const group = data.data.sellingPlanGroup;
  if (!group) throw new Response("Plan not found", { status: 404 });

  const groupMeta = parseGroupName(group.name);

  return json({
    shop: session.shop,
    planId,
    shopifyGroupId: fullGid,
    id: group.id,
    title: groupMeta.displayTitle || group.merchantCode || "",
    description: groupMeta.description || "",
    productChanges: groupMeta.productChanges ?? {
      swap: true, variant: true, quantity: true, keepDiscount: true,
    },
    selectedProducts: group.products.edges.map((e) => ({
      productId: e.node.id,
      productTitle: e.node.title,
      productImage: e.node.featuredImage?.url || "",
      variantIds: e.node.variants?.edges.map((v) => v.node.id) || [],
      variantTitles: e.node.variants?.edges.map((v) => v.node.title) || [],
    })),
    options: group.sellingPlans.edges.map((e) => {
      const plan = e.node;
      const billing = plan.billingPolicy;
      const opt = parsePlanName(plan.name);

      const basePricing = plan.pricingPolicies?.find((p) => p.afterCycle === 0);
      const afterPricing = plan.pricingPolicies?.find((p) => p.afterCycle > 0);

      return {
        sellingPlanId: plan.id,
        name: opt.displayName || plan.name,
        deliveryInterval: billing?.interval?.toLowerCase() || "month",
        deliveryFrequency: billing?.intervalCount || 1,
        billingType: opt.billingType || "pay_as_you_go",
        billingFrequency: opt.billingFrequency || "",
        minOrders: opt.minOrders || "disabled",
        maxOrders: opt.maxOrders || "unlimited",
        giveDiscount: opt.giveDiscount ?? !!basePricing,
        discountType: opt.discountType ||
          (basePricing?.adjustmentValue?.percentage != null ? "percentage" : "fixed"),
        discountAmount: opt.discountAmount ||
          basePricing?.adjustmentValue?.percentage ||
          basePricing?.adjustmentValue?.amount || "",
        changeDiscountAfter: opt.changeDiscountAfter ?? !!afterPricing,
        discountAmount2: opt.discountAmount2 ||
          afterPricing?.adjustmentValue?.percentage ||
          afterPricing?.adjustmentValue?.amount || "",
        afterOrders: opt.afterOrders || afterPricing?.afterCycle || "",
        discountType2: opt.discountType2 ||
          (afterPricing?.adjustmentValue?.percentage != null ? "percentage" : "fixed"),
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
      };
    }),
  });
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { type, planPayload, shopifyGroupId } = body;

  const removedProductIds = planPayload.removedProductIds ?? [];
  const originalProductIds = planPayload.originalProductIds ?? [];

  // DELETE
  if (type === "delete") {
    const res = await admin.graphql(
      `mutation sellingPlanGroupDelete($id: ID!) {
        sellingPlanGroupDelete(id: $id) {
          deletedSellingPlanGroupId
          userErrors { field message }
        }
      }`,
      { variables: { id: shopifyGroupId } },
    );
    const data = await res.json();
    const errors = data.data.sellingPlanGroupDelete.userErrors;
    if (errors?.length > 0) {
      return json({ success: false, error: errors.map((e) => e.message).join(", ") });
    }
    return json({ success: true, deleted: true });
  }

  // UPDATE
  try {
    const groupName = JSON.stringify({
      displayTitle: planPayload.title,
      description: planPayload.description,
      productChanges: planPayload.productChanges,
      selectedProducts: planPayload.selectedProducts,
    });

    const updateRes = await admin.graphql(
      `mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
        sellingPlanGroupUpdate(id: $id, input: $input) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          id: shopifyGroupId,
          input: {
            name: groupName,
            merchantCode: planPayload.title,
            description: planPayload.description || "",
            sellingPlansToDelete: planPayload.deletedPlanIds ?? [],
            sellingPlansToUpdate: planPayload.options
              .filter((o) => o.sellingPlanId)
              .map((opt, i) => {
                const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
                const intervalCount = parseInt(opt.deliveryFrequency || 1);
                return {
                  id: opt.sellingPlanId,
                  name: buildPackedName(opt, i),
                  options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}`],
                  billingPolicy: { recurring: { interval, intervalCount } },
                  deliveryPolicy: { recurring: { interval, intervalCount } },
                  pricingPolicies: buildPricingPolicies(opt),
                };
              }),
            sellingPlansToCreate: planPayload.options
              .filter((o) => !o.sellingPlanId)
              .map((opt, i) => {
                const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
                const intervalCount = parseInt(opt.deliveryFrequency || 1);
                return {
                  name: buildPackedName(opt, i),
                  options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}`],
                  category: "SUBSCRIPTION",
                  billingPolicy: { recurring: { interval, intervalCount } },
                  deliveryPolicy: { recurring: { interval, intervalCount } },
                  pricingPolicies: buildPricingPolicies(opt),
                };
              }),
          },
        },
      },
    );

    const updateData = await updateRes.json();
    const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;
    console.log("Shopify userErrors:", JSON.stringify(updateErrors, null, 2));
    if (updateErrors?.length > 0) {
      return json({ success: false, error: updateErrors.map((e) => e.message).join(", ") });
    }

    // Products remove
    if (removedProductIds.length > 0) {
      await admin.graphql(
        `mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
          sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
            removedProductIds
            userErrors { field message }
          }
        }`,
        { variables: { id: shopifyGroupId, productIds: removedProductIds } },
      );
    }

    // Products add
    if (planPayload.selectedProducts?.length > 0) {
      const productsToAdd = planPayload.selectedProducts.filter(
        (p) => !originalProductIds.includes(p.productId),
      );
      if (productsToAdd.length > 0) {
        await admin.graphql(
          `mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
            sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
              sellingPlanGroup { id }
              userErrors { field message }
            }
          }`,
          {
            variables: {
              id: shopifyGroupId,
              productIds: productsToAdd.map((p) => p.productId),
            },
          },
        );
      }
    }

    // Fresh plans return karo (frontend ke liye sellingPlanId sync)
    const freshRes = await admin.graphql(
      `query getSellingPlanGroup($id: ID!) {
        sellingPlanGroup(id: $id) {
          sellingPlans(first: 10) {
            edges { node { id name } }
          }
        }
      }`,
      { variables: { id: shopifyGroupId } },
    );
    const freshData = await freshRes.json();
    const freshPlans = freshData.data.sellingPlanGroup.sellingPlans.edges.map(
      (e) => ({ id: e.node.id, name: e.node.name }),
    );

    return json({ success: true, planId: params.planId, freshPlans });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

export default function PlanId() {
  const plan = useLoaderData();
  return (
    <div style={{ padding: "1.5rem" }}>
      <Templates
        shop={plan.shop}
        singlePlanId={plan.planId}
        singlePlanData={plan}
      />
    </div>
  );
}