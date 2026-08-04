import React from 'react'
import { useLoaderData } from 'react-router'
import { authenticate } from '../shopify.server';
import CreateSubscription from "./components/createSubscription"



let API= import.meta.env.VITE_API_URL ;
let API_SECRET= import.meta.env.VITE_API_SECRET_KEY
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
?jsdjdjdjjdjjcjcb
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const payloadRaw = formData.get("payload");
  if (!payloadRaw) {
    return { errors: [{ message: "No payload received." }] };
  }

  const payload = JSON.parse(payloadRaw);
  const { contractDetails, customer, delivery, products } = payload;

  if (!customer?.customerId) {
    return { errors: [{ message: "Customer is required." }] };
  }
  if (!Array.isArray(products) || products.length === 0) {
    return { errors: [{ message: "Please select at least one product." }] };
  }

  try {
    const apiResponse = await fetch(
      `${API}/specific-subscription/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_SECRET,
        },
        body: JSON.stringify({
          shop: session.shop,
          contractDetails,
          customer,
          delivery,
          products,
        }),
      }
    );

    const result = await apiResponse.json();

    if (!apiResponse.ok || !result.success) {
      return {
        errors: [
          { message: result.message || "Failed to save subscription." },
        ],
      };
    }

    return {
      success: true,
      subscription: result.subscription,
    };
  } catch (err) {
    console.error("Custom DB save error:", err);
    return { errors: [{ message: "Server error while saving subscription." }] };
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