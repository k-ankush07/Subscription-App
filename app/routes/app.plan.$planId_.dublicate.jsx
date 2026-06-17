import React from 'react'
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Templates from "./components/PlanPage/Templates"
import { authenticate } from "../shopify.server";


const intervalMap = {
  day: "DAY", days: "DAY",
  week: "WEEK", weeks: "WEEK",
  month: "MONTH", months: "MONTH",
  year: "YEAR", years: "YEAR",
};

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { planId } = params;

  const fullGid = `gid://shopify/SellingPlanGroup/${planId}`;

  const res = await admin.graphql(`
    query getSellingPlanGroup($id: ID!) {
      sellingPlanGroup(id: $id) {
        id
        name
        description
        merchantCode
        products(first: 20) {
          edges {
            node {
              id
              title
              featuredImage { url }
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
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue {
                      percentage
                    }
                    ... on MoneyV2 {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { variables: { id: fullGid } });

  const data = await res.json();
  const group = data.data.sellingPlanGroup;

  if (!group) throw new Response("Plan not found", { status: 404 });

  return json({
    shop: session.shop,
    planId,                        // numeric — URL ke liye
    shopifyGroupId: fullGid,       // full GID — GraphQL ke liye
    title: group.name,
    description: group.description || "",
    selectedProducts:[],
    //  Existing selling plan IDs bhi return karo — update ke liye zaruri hain
    existingSellingPlanIds: group.sellingPlans.edges.map((e) => e.node.id),
    options: group.sellingPlans.edges.map((e) => {
      const plan = e.node;
      const billing = plan.billingPolicy;
      const pricing = plan.pricingPolicies?.[0];
      const adjustmentValue = pricing?.adjustmentValue;


      console.log("Fetching GID:", fullGid);

      return {
        sellingPlanId: plan.id,                                        //  update ke liye
        name: plan.name,
        deliveryInterval: billing?.interval?.toLowerCase() || "month",
        deliveryFrequency: billing?.intervalCount || 1,
        billingType: "pay_as_you_go",
        minOrders: "disabled",
        maxOrders: "unlimited",
        giveDiscount: !!pricing,
        discountType: adjustmentValue?.percentage != null ? "percentage" : "fixed",
        discountAmount: adjustmentValue?.percentage || adjustmentValue?.amount || 0,
        giveShippingDiscount: false,
        changeDiscountAfter: false,
        changeQtyAfterOrders: false,
        removeFreeProducts: false,
        setMinQty: false,
      };
    }),
    
    productChanges: {
      swap: true,
      variant: true,
      quantity: true,
      keepDiscount: true,
    },
  });
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { type, planPayload, shopifyGroupId } = body;

  const shopRes = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  //  DELETE 
  if (type === "delete") {
    const res = await admin.graphql(`
      mutation sellingPlanGroupDelete($id: ID!) {
        sellingPlanGroupDelete(id: $id) {
          deletedSellingPlanGroupId
          userErrors { field message }
        }
      }
    `, { variables: { id: shopifyGroupId } });

    const data = await res.json();
    const errors = data.data.sellingPlanGroupDelete.userErrors;
    if (errors?.length > 0) {
      return json({ success: false, error: errors.map(e => e.message).join(", ") });
    }
    return json({ success: true, deleted: true });
  }

  //  UPDATE (upsert) 
  try {
    // 1. Group name/description update
    const updateRes = await admin.graphql(`
      mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
        sellingPlanGroupUpdate(id: $id, input: $input) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        id: shopifyGroupId,
        input: {
          name: planPayload.title,
          description: planPayload.description,
          //  Selling plans update — existing wale update karo, naye add karo
          sellingPlansToUpdate: planPayload.options
            .filter(o => o.sellingPlanId)
            .map(opt => {
              const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
              const intervalCount = parseInt(opt.deliveryFrequency || 1);
              return {
                id: opt.sellingPlanId,
                name: opt.name || "Option",
                billingPolicy: { recurring: { interval, intervalCount } },
                deliveryPolicy: { recurring: { interval, intervalCount } },
                pricingPolicies: opt.giveDiscount && opt.discountAmount
                  ? [{ fixed: {
                      adjustmentType: opt.discountType === "percentage" ? "PERCENTAGE" : "PRICE",
                      adjustmentValue: opt.discountType === "percentage"
                        ? { percentage: parseFloat(opt.discountAmount) }
                        : { fixedValue: parseFloat(opt.discountAmount) },
                    }}]
                  : [],
              };
            }),
          //  Naye options (jo sellingPlanId nahi rakhte)
          sellingPlansToCreate: planPayload.options
            .filter(o => !o.sellingPlanId)
            .map(opt => {
              const interval = intervalMap[opt.deliveryInterval?.toLowerCase()] ?? "MONTH";
              const intervalCount = parseInt(opt.deliveryFrequency || 1);
              return {
                name: opt.name || "Option",
                options: [`Every ${intervalCount} ${opt.deliveryInterval || "month"}`],
                category: "SUBSCRIPTION",
                billingPolicy: { recurring: { interval, intervalCount } },
                deliveryPolicy: { recurring: { interval, intervalCount } },
                pricingPolicies: opt.giveDiscount && opt.discountAmount
                  ? [{ fixed: {
                      adjustmentType: opt.discountType === "percentage" ? "PERCENTAGE" : "PRICE",
                      adjustmentValue: opt.discountType === "percentage"
                        ? { percentage: parseFloat(opt.discountAmount) }
                        : { fixedValue: parseFloat(opt.discountAmount) },
                    }}]
                  : [],
              };
            }),
        },
      },
    });

    const updateData = await updateRes.json();
    console.log("jvdfvdjvvjkkjfe", updateData.data.sellingPlanGroupUpdate)
    const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;
    if (updateErrors?.length > 0) {
      return json({ success: false, error: updateErrors.map(e => e.message).join(", ") });
    }

    // 2. Products update — pehle remove karo, phir add karo
    // Remove all existing products first
    if (planPayload.removedProductIds?.length > 0) {
      await admin.graphql(`
        mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
          sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
            sellingPlanGroup { id }
            userErrors { field message }
          }
        }
      `, {
        variables: {
          id: shopifyGroupId,
          productIds: planPayload.removedProductIds,
        },
      });
    }

    // Add selected products
    if (planPayload.selectedProducts?.length > 0) {
      await admin.graphql(`
        mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
          sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
            sellingPlanGroup { id }
            userErrors { field message }
          }
        }
      `, {
        variables: {
          id: shopifyGroupId,
          productIds: planPayload.selectedProducts.map(p => p.productId),
        },
      });
    }

    return json({ success: true, planId: params.planId }); //  numeric planId return

  } catch (error) {
    return json({ success: false, error: error.message });
  }
};


function Plandublicate() {
    const dublicateplan = useLoaderData();
    // console.log("Plandublicate data:", dublicateplan); 
    const shop = dublicateplan.shop;
    const planId = dublicateplan.planId; 

    
    return (
        <div>
            <Templates shop={shop} 
            dublicateplanPlanId={planId} 
            dublicateplanPlanData={dublicateplan}
             isDuplicate={true} 
            singlePlanId={undefined}  
             />
        </div>
    )
}

export default Plandublicate;