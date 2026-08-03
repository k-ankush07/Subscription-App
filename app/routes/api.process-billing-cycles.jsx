
import React from 'react'
import { useLoaderData } from 'react-router'
import { authenticate } from '../shopify.server'; // apka auth helper (path adjust karein)
import CreateSubscription from "./components/createSubscription"

// ---- LOADER ----
// Ye ek hi loader do kaam karta hai:
// 1) Normal page load -> currencyCode + shop domain return karta hai
// 2) Agar URL me ?customerSearch=xxx aaye -> Shopify Admin API se customers search karke return karta hai
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const customerSearchTerm = url.searchParams.get("customerSearch");

  // ---- Customer search branch (Shopify Admin GraphQL API) ----
  if (customerSearchTerm) {
    const searchResponse = await admin.graphql(
      `#graphql
      query getCustomers($query: String!) {
        customers(first: 10, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              defaultAddress {
                company
                address1
                address2
                city
                province
                zip
                country
                countryCodeV2
              }
            }
          }
        }
      }`,
      {
        variables: {
          query: customerSearchTerm,
        },
      }
    );

    const searchData = await searchResponse.json();

    if (searchData.errors) {
      return { success: false, message: "Could not search customers.", customers: [] };
    }

    const customers = (searchData.data?.customers?.edges || []).map((edge) => edge.node);

    return { success: true, customers };
  }

  // ---- Normal page load branch ----
  const response = await admin.graphql(`
    query {
      shop {
        currencyCode
      }
    }
  `);

  const data = await response.json();
  const shopData = data.data.shop;

  return {
    currencyCode: shopData.currencyCode,
    shop: session.shop, // e.g. "your-store.myshopify.com"
  };
}

// ---- Helpers for real contract creation ----

// Shopify billing/delivery interval enum: DAY | WEEK | MONTH | YEAR
function toIntervalEnum(frequencyUnit) {
  const map = {
    days: "DAY",
    weeks: "WEEK",
    months: "MONTH",
    years: "YEAR",
  };
  return map[frequencyUnit] || "WEEK";
}

// Yahan koi pre-existing selling plan nahi use ho raha — form se jo bhi details aayi hain
// (delivery frequency, min/max orders, discount, after-N-orders discount), unhi se
// is contract ke liye ek naya selling plan group on-the-fly banaya jaata hai, aur
// selected products ko usse attach kar diya jaata hai.
function buildAdjustmentValue(discountType, discountAmount) {
  if (discountType === "PERCENTAGE") {
    return { percentage: Number(discountAmount) || 0 };
  }
  // FIXED_AMOUNT aur PRICE dono "fixedValue" field use karte hain
  return { fixedValue: Number(discountAmount) || 0 };
}

async function createSellingPlanGroupForContract(
  admin,
  {
    interval,
    intervalCount,
    minCycles,
    maxCycles,
    giveDiscount,
    discountType,
    discountAmount,
    changeDiscountAfterOrders,
    afterOrders,
    discountType2,
    discountAmount2,
    productIds,
  }
) {
  const pricingPolicies = [];

  if (giveDiscount) {
    pricingPolicies.push({
      recurring: {
        afterCycle: 1,
        adjustmentType: discountType,
        adjustmentValue: buildAdjustmentValue(discountType, discountAmount),
      },
    });

    if (changeDiscountAfterOrders) {
      pricingPolicies.push({
        recurring: {
          afterCycle: Number(afterOrders) || 1,
          adjustmentType: discountType2,
          adjustmentValue: buildAdjustmentValue(discountType2, discountAmount2),
        },
      });
    }
  }

  const billingPolicyRecurring = { interval, intervalCount };
  if (minCycles) billingPolicyRecurring.minCycles = minCycles;
  if (maxCycles) billingPolicyRecurring.maxCycles = maxCycles;

  const res = await admin.graphql(
    `#graphql
    mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
      sellingPlanGroupCreate(input: $input, resources: $resources) {
        sellingPlanGroup {
          id
          sellingPlans(first: 5) {
            edges {
              node {
                id
              }
            }
          }
        }
        userErrors {
          field
          message
          code
        }
      }
    }`,
    {
      variables: {
        input: {
          name: "Subscription",
          merchantCode: `subscription-${Date.now()}`,
          options: ["Delivery every"],
          sellingPlansToCreate: [
            {
              name: `Delivers every ${intervalCount} ${interval.toLowerCase()}(s)`,
              options: [`Every ${intervalCount} ${interval.toLowerCase()}(s)`],
              billingPolicy: { recurring: billingPolicyRecurring },
              deliveryPolicy: { recurring: { interval, intervalCount } },
              pricingPolicies,
            },
          ],
        },
        resources: {
          productIds,
        },
      },
    }
  );

  const data = await res.json();
  const userErrors = data.data?.sellingPlanGroupCreate?.userErrors || [];
  const sellingPlanId =
    data.data?.sellingPlanGroupCreate?.sellingPlanGroup?.sellingPlans?.edges?.[0]?.node?.id ?? null;

  return { sellingPlanId, userErrors };
}

async function createDraft(admin, { customerId, currencyCode, nextBillingDate }) {
  const res = await admin.graphql(
    `#graphql
    mutation subscriptionContractCreate($input: SubscriptionContractCreateInput!) {
      subscriptionContractCreate(input: $input) {
        draft {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: {
          customerId,
          currencyCode,
          nextBillingDate,
          status: "PAUSED",
        },
      },
    }
  );
  const data = await res.json();
  const userErrors = data.data?.subscriptionContractCreate?.userErrors || [];
  const draftId = data.data?.subscriptionContractCreate?.draft?.id || null;
  return { draftId, userErrors };
}

async function setDraftPolicies(admin, draftId, { interval, intervalCount }) {
  const res = await admin.graphql(
    `#graphql
    mutation subscriptionDraftUpdate($draftId: ID!, $input: SubscriptionDraftInput!) {
      subscriptionDraftUpdate(draftId: $draftId, input: $input) {
        draft {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        draftId,
        input: {
          billingPolicy: { interval, intervalCount },
          deliveryPolicy: { interval, intervalCount },
        },
      },
    }
  );
  const data = await res.json();
  return data.data?.subscriptionDraftUpdate?.userErrors || [];
}

async function addDraftLine(admin, draftId, { productVariantId, sellingPlanId, quantity, currentPrice }) {
  const res = await admin.graphql(
    `#graphql
    mutation subscriptionDraftLineAdd($draftId: ID!, $input: SubscriptionLineInput!) {
      subscriptionDraftLineAdd(draftId: $draftId, input: $input) {
        lineAdded {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        draftId,
        input: {
          productVariantId,
          sellingPlanId,
          quantity,
          currentPrice,
        },
      },
    }
  );
  const data = await res.json();
  return data.data?.subscriptionDraftLineAdd?.userErrors || [];
}

async function commitDraft(admin, draftId) {
  const res = await admin.graphql(
    `#graphql
    mutation subscriptionDraftCommit($draftId: ID!) {
      subscriptionDraftCommit(draftId: $draftId) {
        contract {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }`,
    { variables: { draftId } }
  );
  const data = await res.json();
  const userErrors = data.data?.subscriptionDraftCommit?.userErrors || [];
  const contract = data.data?.subscriptionDraftCommit?.contract || null;
  return { contract, userErrors };
}

// ---- ACTION: form submit hone par yahan asli subscription contract create hoga ----
export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();

  const {
    customerId,
    nextOrderDate,
    nextOrderTime,
    currencyCode,
    deliveryFrequency,
    frequencyUnit,
    minOrders,
    maxOrders,
    giveDiscount,
    discountAmount,
    discountType,
    changeDiscountAfterOrders,
    afterOrders,
    discountAmount2,
    discountType2,
    products,
  } = body;

  if (!customerId) {
    return { success: false, message: "Customer select karna zaroori hai." };
  }
  if (!products || products.length === 0) {
    return { success: false, message: "Kam se kam ek product select karna zaroori hai." };
  }

  const nextBillingDate = new Date(`${nextOrderDate}T${nextOrderTime}:00`).toISOString();
  const interval = toIntervalEnum(frequencyUnit);
  const intervalCount = Number(deliveryFrequency) || 1;
  const minCycles = minOrders ? Number(minOrders) : null;
  const maxCycles = maxOrders ? Number(maxOrders) : null;

  try {
    // 1) Draft contract create
    const { draftId, userErrors: createErrors } = await createDraft(admin, {
      customerId,
      currencyCode,
      nextBillingDate,
    });

    if (createErrors.length > 0 || !draftId) {
      return { success: false, message: createErrors[0]?.message || "Contract draft create nahi ho paya." };
    }

    // 2) Billing + delivery policy set (draft/contract level)
    const policyErrors = await setDraftPolicies(admin, draftId, { interval, intervalCount });
    if (policyErrors.length > 0) {
      return { success: false, message: policyErrors[0]?.message || "Billing/delivery policy set nahi ho payi." };
    }

    // 3) Form ki details se hi naya selling plan banao (koi pre-existing plan nahi chahiye)
    const productIds = products.map((p) => p.id);
    const { sellingPlanId, userErrors: planErrors } = await createSellingPlanGroupForContract(admin, {
      interval,
      intervalCount,
      minCycles,
      maxCycles,
      giveDiscount,
      discountType,
      discountAmount,
      changeDiscountAfterOrders,
      afterOrders,
      discountType2,
      discountAmount2,
      productIds,
    });

    if (planErrors.length > 0 || !sellingPlanId) {
      return { success: false, message: planErrors[0]?.message || "Selling plan create nahi ho paya." };
    }

    // 4) Har selected product/variant ke liye draft line add (naye banaye gaye plan ke saath)
    for (const product of products) {
      for (const variant of product.variants || []) {
        const lineErrors = await addDraftLine(admin, draftId, {
          productVariantId: variant.variantsId,
          sellingPlanId,
          quantity: Number(variant.quantity) || 1,
          currentPrice: String(variant.unitPrice ?? variant.price ?? "0"),
        });

        if (lineErrors.length > 0) {
          return { success: false, message: lineErrors[0]?.message || "Product line add nahi ho payi." };
        }
      }
    }

    // 5) Draft ko commit karke actual contract bana do
    const { contract, userErrors: commitErrors } = await commitDraft(admin, draftId);
    if (commitErrors.length > 0 || !contract) {
      return { success: false, message: commitErrors[0]?.message || "Contract commit nahi ho paya." };
    }

    return { success: true, contract };
  } catch (err) {
    console.error("[contractCreate action] error:", err);
    return { success: false, message: "Subscription contract create karte waqt error aaya." };
  }
}

function contractCreate() {
  const { currencyCode, shop } = useLoaderData();

  return (
    <div>
      <CreateSubscription currencyCode={currencyCode} shop={shop} />
    </div>
  )
}

export default contractCreate