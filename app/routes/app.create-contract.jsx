import React from 'react'
import { useLoaderData } from 'react-router'
import { authenticate } from '../shopify.server'; 
import CreateSubscription from "./components/createSubscription"

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      shop {
        currencyCode
      }
    }
  `);

  const data = await response.json();
  const shop = data.data.shop;

  return {
    currencyCode: shop.currencyCode,
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
  const { currencyCode } = useLoaderData();

  return (
    <div>
      <CreateSubscription currencyCode={currencyCode} />
    </div>
  )
}

export default contractCreate