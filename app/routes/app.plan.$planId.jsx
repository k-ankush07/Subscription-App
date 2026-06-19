import React from "react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API = import.meta.env.VITE_API_URL;


export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);

  const planId = params.planId; 
  const response = await fetch(
    `${API}/plans/${planId}`
  );
  const data = await response.json();
  return json({
    plans: data.success ? data.data : [],
    shop: session.shop,
  });
};
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  console.log("idnjasbd", payload)

  // Shopify pe SellingPlanGroup update karo
  const updateRes = await admin.graphql(
    `
    mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
      sellingPlanGroupUpdate(id: $id, input: $input) {
        sellingPlanGroup { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        id: payload.shopifyGroupId, // MongoDB se aa raha hai
        input: {
          name: payload.planName,
          merchantCode: payload.planName,
        },
      },
    }
  );

  const updateData = await updateRes.json();
  const userErrors = updateData.data.sellingPlanGroupUpdate.userErrors;

  if (userErrors?.length > 0) {
    return Response.json({ success: false, error: userErrors[0].message });
  }

  // Products update karo
  const updateProductsRes = await admin.graphql(
    `
    mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
      sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
        sellingPlanGroup { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        id: payload.shopifyGroupId,
        productIds: payload.products.map((p) => p.id),
      },
    }
  );

  const updateProductsData = await updateProductsRes.json();
  const updateProductsErrors =
    updateProductsData.data.sellingPlanGroupAddProducts.userErrors;

  if (updateProductsErrors?.length > 0) {
    return Response.json({
      success: false,
      error: updateProductsErrors[0].message,
    });
  }

  return Response.json({ success: true, shopifyGroupId: payload.shopifyGroupId });
};

function planId() {
  const {plans,shop }= useLoaderData();
  const editPlandData= plans
  return (
    <>
      <Template 
      shop={shop}
      editPlandData={editPlandData}
      />
    </>
  );
}

export default planId;