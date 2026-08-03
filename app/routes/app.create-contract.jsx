
import React from 'react'
import { useLoaderData } from 'react-router'
import { authenticate } from '../shopify.server'; // apka auth helper (path adjust karein)
import CreateSubscription from "./components/createSubscription"


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


export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const nextOrderDate = formData.get("nextOrderDate");
  const nextOrderTime = formData.get("nextOrderTime");
  const currencyCode = formData.get("currencyCode");
  const sellingPlanType = formData.get("sellingPlanType");
  const deliveryFrequency = formData.get("deliveryFrequency");
  const frequencyUnit = formData.get("frequencyUnit");

  const nextBillingDate = new Date(`${nextOrderDate}T${nextOrderTime}:00`).toISOString();

  const response = await admin.graphql(
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
          currencyCode: currencyCode,
          nextBillingDate: nextBillingDate,
          status: "PAUSED",

        },
      },
    }
  );

  const result = await response.json();

  if (result.data?.subscriptionContractCreate?.userErrors?.length > 0) {
    return { errors: result.data.subscriptionContractCreate.userErrors };
  }

  return { success: true, contract: result.data?.subscriptionContractCreate?.draft };
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