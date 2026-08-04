
// import React from 'react'
// import { useLoaderData } from 'react-router'
// import { authenticate } from '../shopify.server'; // apka auth helper (path adjust karein)
// import CreateSubscription from "./components/createSubscription"


// export async function loader({ request }) {
//   const { admin, session } = await authenticate.admin(request);

//   const url = new URL(request.url);
//   const customerSearchTerm = url.searchParams.get("customerSearch");

//   if (customerSearchTerm) {
//     const searchResponse = await admin.graphql(
//       `#graphql
//       query getCustomers($query: String!) {
//         customers(first: 10, query: $query) {
//           edges {
//             node {
//               id
//               firstName
//               lastName
//               email
//               phone
//               paymentMethods(first: 10) {
//           edges {
//             node {
//               id
//               instrument {
//                 __typename

//                 ... on CustomerCreditCard {
//                 name
//                   brand
//                   lastDigits
//                   expiryMonth
//                   expiryYear
//                 }
//               }
//             }
//           }
//         }
//               defaultAddress {
//                 company
//                 address1
//                 address2
//                 city
//                 province
//                 zip
//                 country
//                 countryCodeV2
//               }
//             }
//           }
//         }
//       }`,
//       {
//         variables: {
//           query: customerSearchTerm,
//         },
//       }
//     );

//     const searchData = await searchResponse.json();

//     if (searchData.errors) {
//       return { success: false, message: "Could not search customers.", customers: [] };
//     }

//     const customers = (searchData.data?.customers?.edges || []).map((edge) => edge.node);

//     return { success: true, customers };
//   }


//   const response = await admin.graphql(`
//     query {
//       shop {
//         currencyCode
//       }
//     }
//   `);

//   const data = await response.json();
//   const shopData = data.data.shop;

//   return {
//     currencyCode: shopData.currencyCode,
//     shop: session.shop, // e.g. "your-store.myshopify.com"
//   };
// }


// export async function action({ request }) {
//   const { admin } = await authenticate.admin(request);
//   const formData = await request.formData();

//   const nextOrderDate = formData.get("nextOrderDate");
//   const nextOrderTime = formData.get("nextOrderTime");
//   const currencyCode = formData.get("currencyCode");
//   const sellingPlanType = formData.get("sellingPlanType");
//   const deliveryFrequency = formData.get("deliveryFrequency");
//   const frequencyUnit = formData.get("frequencyUnit");

//   const nextBillingDate = new Date(`${nextOrderDate}T${nextOrderTime}:00`).toISOString();

//   const response = await admin.graphql(
//     `#graphql
//     mutation subscriptionContractCreate($input: SubscriptionContractCreateInput!) {
//       subscriptionContractCreate(input: $input) {
//         draft {
//           id
//         }
//         userErrors {
//           field
//           message
//         }
//       }
//     }`,
//     {
//       variables: {
//         input: {
//           currencyCode: currencyCode,
//           nextBillingDate: nextBillingDate,
//           status: "PAUSED",

//         },
//       },
//     }
//   );

//   const result = await response.json();

//   if (result.data?.subscriptionContractCreate?.userErrors?.length > 0) {
//     return { errors: result.data.subscriptionContractCreate.userErrors };
//   }

//   return { success: true, contract: result.data?.subscriptionContractCreate?.draft };
// }

// function contractCreate() {
//   const { currencyCode, shop } = useLoaderData();

//   return (
//     <div>
//       <CreateSubscription currencyCode={currencyCode} shop={shop} />
//     </div>
//   )
// }

// export default contractCreate



import React from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import {
  snapshotContractSettings,
  applyActionsToCycle,
  computeEffectiveDiscountForVariant,
} from "../lib/billing-preview.server";
import CreateSubscription from "./components/createSubscription";

const API_URL = process.env.API_URL; // .env me set karo (VITE_ prefix NAHI — server-side hai)
const API_SECRET_KEY = process.env.API_SECRET_KEY;

// ==========================================================
// Commit ke turant baad actual next billing cycle (index + date)
// confirm karta hai. Cycle-0 assume karna risky hai — Shopify
// se hi confirm karke wahi selector applyActionsToCycle ko diya
// jayega, taaki discount EXACTLY next order pe hi lage.
// ==========================================================
async function getConfirmedNextCycle(admin, contractId) {
  const res = await admin.graphql(
    `
    query getNextCycle($id: ID!) {
      subscriptionContract(id: $id) {
        nextBillingDate
      }
    }
    `,
    { variables: { id: contractId } },
  );
  const data = await res.json();
  const nextBillingDate = data.data?.subscriptionContract?.nextBillingDate;
  if (!nextBillingDate) return null;

  const cycleRes = await admin.graphql(
    `
    query getCycleByDate($contractId: ID!, $date: DateTime!) {
      subscriptionBillingCycle(
        billingCycleInput: { contractId: $contractId, selector: { date: $date } }
      ) {
        cycleIndex
        billingAttemptExpectedDate
        status
      }
    }
    `,
    { variables: { contractId, date: nextBillingDate } },
  );
  const cycleData = await cycleRes.json();
  const cycle = cycleData.data?.subscriptionBillingCycle;
  if (!cycle) return null;

  return {
    cycleIndex: cycle.cycleIndex,
    cycleDate: cycle.billingAttemptExpectedDate,
  };
}

// ==========================================================
// LOADER — shop currency + customer search
// ==========================================================
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const customerSearchTerm = url.searchParams.get("customerSearch");

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
              paymentMethods(first: 10) {
                edges {
                  node {
                    id
                    instrument {
                      __typename
                      ... on CustomerCreditCard {
                        name
                        brand
                        lastDigits
                        expiryMonth
                        expiryYear
                      }
                    }
                  }
                }
              }
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
      { variables: { query: customerSearchTerm } }
    );

    const searchData = await searchResponse.json();

    if (searchData.errors) {
      return { success: false, message: "Could not search customers.", customers: [] };
    }

    const customers = (searchData.data?.customers?.edges || []).map((edge) => edge.node);
    return { success: true, customers };
  }

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
    shop: session.shop,
  };
}

// ==========================================================
// ACTION — contract create + base-price lines + discount apply
// ==========================================================
export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  const payload = JSON.parse(formData.get("payload"));
  const { contractDetails, customer, delivery, products } = payload;

  // ---- Step 0: basic validation ----
  if (!customer?.customerId) {
    return { success: false, step: "validate", errors: [{ message: "Customer is required" }] };
  }
  if (!customer?.paymentMethod?.id) {
    return { success: false, step: "validate", errors: [{ message: "Payment method is required" }] };
  }
  if (!products || products.length === 0) {
    return { success: false, step: "validate", errors: [{ message: "At least one product is required" }] };
  }

  const nextBillingDate = new Date(
    `${contractDetails.nextOrderDate}T${contractDetails.nextOrderTime}:00`
  ).toISOString();

  const interval = contractDetails.interval || "MONTH";

  const shippingAddress = delivery.isDigitalProduct
    ? {
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        address1: delivery.address1,
        address2: delivery.address2,
        city: delivery.city,
        province: delivery.province,
        country: delivery.country,
        zip: delivery.zip,
        phone: customer.phoneNumber || "",
        company: customer.company || "",
      }
    : null;

  // ==========================================================
  // STEP 1: subscriptionContractCreate -> draft banao (PAUSED)
  // ==========================================================
  const contractInput = {
    customerId: customer.customerId,
    nextBillingDate,
    currencyCode: contractDetails.currencyCode,
    contract: {
      status: "PAUSED", // status contract ke andar, root pe nahi
      paymentMethodId: customer.paymentMethod.id,
      billingPolicy: {
        interval,
        intervalCount: Number(contractDetails.intervalCount) || 1,
        minCycles: contractDetails.minOrders ? Number(contractDetails.minOrders) : null,
        maxCycles: contractDetails.maxOrders ? Number(contractDetails.maxOrders) : null,
      },
      deliveryPolicy: {
        interval,
        intervalCount: Number(contractDetails.intervalCount) || 1,
      },
      deliveryPrice: String(delivery.deliveryPrice || "0.0"),
      ...(shippingAddress
        ? {
            deliveryMethod: {
              shipping: {
                address: shippingAddress,
                shippingOption: {
                  title: delivery.deliveryMethodTitle || "Standard Delivery",
                  presentmentTitle: delivery.deliveryMethodTitle || "Standard Delivery",
                  code: "STANDARD",
                },
              },
            },
          }
        : {}),
    },
  };

  const draftResponse = await admin.graphql(
    `#graphql
    mutation SubscriptionContractCreate($input: SubscriptionContractCreateInput!) {
      subscriptionContractCreate(input: $input) {
        draft { id }
        userErrors { field message }
      }
    }`,
    { variables: { input: contractInput } }
  );

  const draftResult = await draftResponse.json();
  const draftErrors = draftResult.data?.subscriptionContractCreate?.userErrors;
  if (draftErrors?.length > 0) {
    return { success: false, step: "create", errors: draftErrors };
  }

  const draftId = draftResult.data?.subscriptionContractCreate?.draft?.id;
  if (!draftId) {
    return { success: false, step: "create", errors: [{ message: "Draft ID not returned" }] };
  }

  // ==========================================================
  // STEP 2: subscriptionDraftLineAdd -> har variant BASE price pe
  // add karo. Koi discount yahan NAHI — discount ab STEP 5 me
  // applyActionsToCycle ke through, cycle-level par lagta hai,
  // taaki creation aur future auto-billing dono same logic use
  // karein (single source of truth).
  // ==========================================================
  for (const product of products) {
    for (const variant of product.variants) {
      const baseUnitPrice = Number(variant.unitPrice ?? variant.price ?? 0);

      const lineResponse = await admin.graphql(
        `#graphql
        mutation SubscriptionDraftLineAdd($draftId: ID!, $input: SubscriptionLineInput!) {
          subscriptionDraftLineAdd(draftId: $draftId, input: $input) {
            draft { id }
            lineAdded { id }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            draftId,
            input: {
              productVariantId: variant.variantsId,
              currentPrice: baseUnitPrice.toFixed(2),
              quantity: Number(variant.quantity) || 1,
            },
          },
        }
      );

      const lineResult = await lineResponse.json();
      const lineErrors = lineResult.data?.subscriptionDraftLineAdd?.userErrors;
      if (lineErrors?.length > 0) {
        return { success: false, step: "lineAdd", errors: lineErrors };
      }
    }
  }

  // ==========================================================
  // STEP 3: subscriptionDraftCommit -> draft ko final PAUSED
  // contract me convert karo
  // ==========================================================
  const commitResponse = await admin.graphql(
    `#graphql
    mutation SubscriptionDraftCommit($draftId: ID!) {
      subscriptionDraftCommit(draftId: $draftId) {
        contract { id status }
        userErrors { field message }
      }
    }`,
    { variables: { draftId } }
  );

  const commitResult = await commitResponse.json();
  const commitErrors = commitResult.data?.subscriptionDraftCommit?.userErrors;
  if (commitErrors?.length > 0) {
    return { success: false, step: "commit", errors: commitErrors };
  }

  const contract = commitResult.data?.subscriptionDraftCommit?.contract;

  let discountApplyWarning = null;

  if (contract?.id) {
    // ==========================================================
    // STEP 4: Automation settings snapshot save karo — dono layers:
    // - contract-level fallback ("Give discount" jo poore contract
    //   ke un variants pe lagta hai jinka apna CUSTOM discount nahi hai)
    // - per-variant overrides ("Set custom discounts" jo Product.jsx
    //   me set hota hai, sirf us specific variant ke liye)
    // Ye contract manual/specific hai (koi selling plan nahi), isliye
    // webhook wala auto-snapshot yaha kaam nahi karega — isliye yahin
    // seedha snapshot save kar rahe hain taaki future billing cycles
    // (cron) me bhi yehi discount continue ho sake.
    // ==========================================================
    const variantOverrides = [];
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.discountMode === "CUSTOM") {
          variantOverrides.push({
            variantId: variant.variantsId,
            productId: product.id,
            discountMode: "CUSTOM",
            discountAmount: Number(variant.discountAmount) || 0,
            discountType: variant.discountType || "PERCENTAGE",
            changeDiscountAfterOrders: !!variant.changeDiscountAfterOrders,
            afterOrders: Number(variant.afterOrders) || 1,
            discountAmount2: Number(variant.discountAmount2) || 0,
            discountType2: variant.discountType2 || "PERCENTAGE",
          });
        }
      }
    }

    const settingsSnapshot = {
      // contract-level fallback discount
      giveDiscount: !!contractDetails.giveDiscount,
      discountType: contractDetails.discountType,
      discountAmount: Number(contractDetails.discountAmount) || 0,
      changeDiscountAfterOrders: !!contractDetails.changeDiscountAfterOrders,
      afterOrders: Number(contractDetails.afterOrders) || 1,
      afterDiscountType: contractDetails.discountType2,
      afterDiscountValue: Number(contractDetails.discountAmount2) || 0,
      // price ab line-add time pe bake nahi hoti, isliye ye hack
      // zaroorat nahi — manual contract me native selling-plan tier
      // hota hi nahi
      beforeDiscountDisabled: false,
      // per-variant overrides — cron/future-cycle logic isse padh
      // ke us specific variant ka discount decide karega
      variantOverrides,
    };

    try {
      await snapshotContractSettings(admin, contract.id, settingsSnapshot);
    } catch (err) {
      console.error("Failed to snapshot contract settings:", err);
    }

    // ==========================================================
    // STEP 5: Shopify khud jab NEXT order banayega, usme discount
    // already baked-in ho — isliye commit ke turant baad hi
    // "next" billing cycle ko confirm karke, uspe applyActionsToCycle
    // se DISCOUNT_CHANGE actions commit kar rahe hain (per-variant,
    // sourceVariantId ke sath targeted).
    // ==========================================================
    const initialActions = [];
    for (const product of products) {
      for (const variant of product.variants) {
        const effective = computeEffectiveDiscountForVariant(variant, contractDetails);
        if (effective.initial) {
          initialActions.push({
            type: "DISCOUNT_CHANGE",
            adjustmentType: effective.initial.adjustmentType,
            adjustmentValue: effective.initial.adjustmentValue,
            sourceVariantId: variant.variantsId, // sirf isi variant ki line update hogi
            sourceProductId: product.id,
            after: 0,
            __phase: effective.source === "variant" ? "variant-before" : "before",
          });
        }
      }
    }

    if (initialActions.length > 0) {
      try {
        const confirmedCycle = await getConfirmedNextCycle(admin, contract.id);

        if (confirmedCycle) {
          const fallbackBasePrice =
            Number(
              products?.[0]?.variants?.[0]?.unitPrice ?? products?.[0]?.variants?.[0]?.price ?? 0
            ) || 0;

          await applyActionsToCycle(
            admin,
            contract.id,
            confirmedCycle.cycleIndex,
            initialActions,
            fallbackBasePrice,
            null, // pricingPolicy — manual contract me native selling-plan tiers nahi hote
            confirmedCycle.cycleDate,
            Number(delivery.deliveryPrice) || 0,
          );
        } else {
          console.error(
            `Could not confirm next billing cycle for contract ${contract.id} — discounts not applied.`
          );
          discountApplyWarning =
            "Contract created, but we couldn't confirm the next billing cycle to apply discounts. Please check the contract manually.";
        }
      } catch (err) {
        console.error("Failed to apply initial per-variant discounts:", err);
        discountApplyWarning =
          "Contract created, but some product discounts could not be applied to the next order automatically. Please check the contract.";
      }
    }
  }

  // ==========================================================
  // STEP 6: apne Node API me bhi record store karo (non-blocking)
  // ==========================================================
  let nodeStoreWarning = null;

  if (!API_URL) {
    console.error("API_URL is not set in environment variables");
    nodeStoreWarning = "Contract created in Shopify, but backend URL is not configured.";
  } else {
    try {
      const nodeResponse = await fetch(`${API_URL}/specific-subscription/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_SECRET_KEY,
        },
        body: JSON.stringify({
          shop: session.shop,
          shopifyContractId: contract?.id,
          shopifyContractStatus: contract?.status,
          contractDetails,
          customer,
          delivery,
          products,
        }),
      });

      const nodeData = await nodeResponse.json();

      if (!nodeData.success) {
        nodeStoreWarning =
          nodeData.message || "Contract created in Shopify, but failed to save in our records.";
      }
    } catch (err) {
      console.error("Node API store error:", err);
      nodeStoreWarning = "Contract created in Shopify, but could not reach our server to save the record.";
    }
  }

  // ==========================================================
  // FINAL RESPONSE
  // ==========================================================
  return {
    success: true,
    contract,
    warning: nodeStoreWarning || discountApplyWarning,
  };
}

// ==========================================================
// PAGE COMPONENT
// ==========================================================
function ContractCreate() {
  const { currencyCode, shop } = useLoaderData();

  return (
    <div>
      <CreateSubscription currencyCode={currencyCode} shop={shop} />
    </div>
  );
}

export default ContractCreate;