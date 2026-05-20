import React from 'react'
import Planpage from './components/Planpage'
import { Page } from '@shopify/polaris';
 import { authenticate } from "../shopify.server";
import { useLoaderData } from 'react-router';


 export const loader = async ({request}) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
  query findContract($subscriptionContractId: ID!) {
    subscriptionContract(id: $subscriptionContractId) {
      id
      status
      nextBillingDate
    }
  }`,
  {
    variables: {
        "subscriptionContractId": "gid://shopify/SubscriptionContract/593791907"
    },
  },
  );
  const json = await response.json();
  return json.data;
}
function plan() {
   

    const data= useLoaderData();
    console.log("status apis data", data);
    
    return (

        <Page title="Selling plans">
            <Planpage />
        </Page>



    )
}

export default plan
