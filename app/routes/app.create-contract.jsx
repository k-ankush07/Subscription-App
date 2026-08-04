// import React from 'react'
// import { useLoaderData } from 'react-router'
// import { authenticate } from '../shopify.server';
// import CreateSubscription from "./components/createSubscription"



// let API= import.meta.env.VITE_API_URL ;
// let API_SECRET= import.meta.env.VITE_API_SECRET_KEY
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
//                 edges {
//                   node {
//                     id
//                     instrument {
//                       __typename
//                       ... on CustomerCreditCard {
//                         name
//                         brand
//                         lastDigits
//                         expiryMonth
//                         expiryYear
//                       }
//                     }
//                   }
//                 }
//               }
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
//       { variables: { query: customerSearchTerm } }
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
//     shop: session.shop,
//   };
// }

// export async function action({ request }) {
//   const { session } = await authenticate.admin(request);
//   const formData = await request.formData();

//   const payloadRaw = formData.get("payload");
//   if (!payloadRaw) {
//     return { errors: [{ message: "No payload received." }] };
//   }

//   const payload = JSON.parse(payloadRaw);
//   const { contractDetails, customer, delivery, products } = payload;

//   if (!customer?.customerId) {
//     return { errors: [{ message: "Customer is required." }] };
//   }
//   if (!Array.isArray(products) || products.length === 0) {
//     return { errors: [{ message: "Please select at least one product." }] };
//   }

//   try {
//     const apiResponse = await fetch(
//       `${API}/specific-subscription/create`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": API_SECRET,
//         },
//         body: JSON.stringify({
//           shop: session.shop,
//           contractDetails,
//           customer,
//           delivery,
//           products,
//         }),
//       }
//     );

//     const result = await apiResponse.json();

//     if (!apiResponse.ok || !result.success) {
//       return {
//         errors: [
//           { message: result.message || "Failed to save subscription." },
//         ],
//       };
//     }

//     return {
//       success: true,
//       subscription: result.subscription,
//     };
//   } catch (err) {
//     console.error("Custom DB save error:", err);
//     return { errors: [{ message: "Server error while saving subscription." }] };
//   }
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
import CreateSubscription from "./components/createSubscription";

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
      { variables: { query: customerSearchTerm } },
    );

    const searchData = await searchResponse.json();

    if (searchData.errors) {
      return {
        success: false,
        message: "Could not search customers.",
        customers: [],
      };
    }

    const customers =
      (searchData.data?.customers?.edges || []).map((edge) => edge.node) || [];
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

// ---- Admin GraphQL mutation (validated) ----
const CREATE_CUSTOMER_SUBSCRIPTION_CONTRACT_MUTATION = `
mutation CreateCustomerSubscriptionContract(
  $input: SubscriptionContractAtomicCreateInput!
) {
  subscriptionContractAtomicCreate(input: $input) {
    contract {
      id
      status
      nextBillingDate
    }
    userErrors {
      field
      message
    }
  }
}
` as const;

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  const payloadRaw = formData.get("payload");
  if (!payloadRaw || typeof payloadRaw !== "string") {
    return { success: false, errors: [{ message: "No payload received." }] };
  }

  const payload = JSON.parse(payloadRaw);
  const { contractDetails, customer, delivery, products } = payload;

  if (!customer?.customerId) {
    return { success: false, errors: [{ message: "Customer is required." }] };
  }
  if (!Array.isArray(products) || products.length === 0) {
    return {
      success: false,
      errors: [{ message: "Please select at least one product." }],
    };
  }

  try {
    // ---- Build nextBillingDate (date + time) ----
    const nextOrderDate: string = contractDetails.nextOrderDate; // "YYYY-MM-DD"
    const nextOrderTime: string = contractDetails.nextOrderTime; // "HH:MM"
    const nextBillingDate = new Date(
      `${nextOrderDate}T${nextOrderTime}:00Z`,
    ).toISOString();

    // ---- Billing / delivery policies ----
    const interval: string = contractDetails.interval || "MONTH";
    const intervalCount: number =
      Number(contractDetails.intervalCount ?? 1) || 1;

    const minCycles = contractDetails.minOrders
      ? Number(contractDetails.minOrders)
      : null;
    const maxCycles = contractDetails.maxOrders
      ? Number(contractDetails.maxOrders)
      : null;

    // ---- Delivery (physical vs digital) ----
    const isDigital = !!delivery.isDigitalProduct;

    const deliveryMethod = isDigital
      ? undefined
      : {
          shipping: {
            address: {
              firstName: customer.firstName || "",
              lastName: customer.lastName || "",
              address1: delivery.address1 || "",
              address2: delivery.address2 || "",
              city: delivery.city || "",
              provinceCode: delivery.province || "",
              countryCode: delivery.country || "",
              zip: delivery.zip || "",
              phone: customer.phoneNumber || "",
              company: customer.company || "",
            },
          },
        };

    const deliveryPrice = Number(delivery.deliveryPrice || 0);

    // ---- Payment method ----
    const paymentMethodId: string | null = customer.paymentMethod?.id || null;

    // ---- Lines from selected products / variants ----
    const lines = products.flatMap((p: any) =>
      (p.variants || []).map((v: any) => {
        const quantity = Number(v.quantity || 1);
        const currentPrice = Number(
          v.unitPrice ?? v.price ?? 0,
        );

        return {
          line: {
            productVariantId: v.variantsId, // variant GID
            quantity,
            currentPrice,
          },
          // discounts: [] // agar baad me chahiye ho to yahan add karo
        };
      }),
    );

    if (lines.length === 0) {
      return {
        success: false,
        errors: [{ message: "No variants found on selected products." }],
      };
    }

    const input = {
      customerId: customer.customerId, // "gid://shopify/Customer/123"
      currencyCode: contractDetails.currencyCode, // e.g. "INR"
      nextBillingDate,
      contract: {
        status: "ACTIVE", // ya "PAUSED" agar pehle pause rakhna ho
        note: "Created from app UI",
        paymentMethodId: paymentMethodId || undefined,
        billingPolicy: {
          interval,
          intervalCount,
          minCycles: minCycles ?? undefined,
          maxCycles: maxCycles ?? undefined,
        },
        deliveryPolicy: {
          interval,
          intervalCount,
        },
        deliveryMethod,
        deliveryPrice,
      },
      lines,
    };

    const gqlResponse = await admin.graphql(
      CREATE_CUSTOMER_SUBSCRIPTION_CONTRACT_MUTATION,
      {
        variables: { input },
      },
    );

    const result = await gqlResponse.json();
    const data = result.data?.subscriptionContractAtomicCreate;
    const userErrors = data?.userErrors || [];

    if (userErrors.length > 0) {
      return {
        success: false,
        errors: userErrors.map((e: any) => ({
          message: e.message,
          field: e.field,
        })),
      };
    }

    const contract = data?.contract;

    return {
      success: true,
      subscription: {
        id: contract?.id,
        status: contract?.status,
        nextBillingDate: contract?.nextBillingDate,
        shop: session.shop,
      },
    };
  } catch (err) {
    console.error("Subscription contract create error:", err);
    return {
      success: false,
      errors: [{ message: "Server error while creating subscription." }],
    };
  }
}

function contractCreate() {
  const { currencyCode, shop } = useLoaderData();

  return (
    <div>
      <CreateSubscription currencyCode={currencyCode} shop={shop} />
    </div>
  );
}

export default contractCreate;