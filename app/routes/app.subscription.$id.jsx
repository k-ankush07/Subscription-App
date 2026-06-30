import { Page } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React from "react";
import { useNavigate, useParams } from "react-router";
import { useLoaderData } from "react-router";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const subscriptionId = params.id;
  console.log("idd", subscriptionId);
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;
  console.log("bsvjhfvjhs", contractId);
  const res = await admin.graphql(`
 query {
  subscriptionContract(id: "${contractId}") {
    id
    status
    createdAt
    updatedAt
    nextBillingDate
    originOrder {
      id
      name
    }
    lines(first: 10) {
      edges {
        node {
          id
          title
          variantTitle
          quantity
          productId       
          variantId 
          sku
          currentPrice {
            amount
            currencyCode
          }
          variantImage {
            url
          }
        }
      }
    }
  }
}
  `);
  const data = await res.json();
  return { contract: data.data.subscriptionContract };
}

function subscriptionsId() {
  const { id } = useParams();
  const { contract } = useLoaderData();
  const lines = contract?.lines?.edges;
  const navigate = useNavigate();
  const backButton = () => {
    navigate("/app/subscriptions");
  };
  const formateDate= (date)=>
  {
     return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return (
    <>
      <Page backAction={{ onAction: backButton }} title={`${id}`}>
        <div>
          <b>{contract.status}</b>, {" "}
          <b>{formateDate(contract.createdAt)}</b> ,{" "}
          <b>{contract?.originOrder?.name}</b>
        </div>

        <div>
          <h2> Subscription details</h2>
          <div>
            {lines.map((item, index)=>{
              console.log("log",item)
              const price = item?.node?.currentPrice?.amount;
              const quantity= item?.node?.currentPrice?.currency;
              const Total= parseFloat(price* quantity)
              return (
                <div key={index}>
                  <img src={item?.node?.variantImage?.url}  alt="prodcut image" width={50} height={50} />
                  <p>{item?.node?.title}  {item?.node?.variantTitle}</p>
                  <p><span>ProdcutId: {item?.node?.productId.split('/').pop()}</span> <span>VariantId: {item?.node?.variantId.split('/').pop()}</span></p>
                  <p><span>price: {Total}</span></p>
                </div>
              )
            })}
          </div>
        </div>
      </Page>
    </>
  );
}

export default subscriptionsId;
