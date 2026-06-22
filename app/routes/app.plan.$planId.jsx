import React from "react";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API = import.meta.env.VITE_API_URL;

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const planId = params.planId;
  const response = await fetch(`${API}/plans/${planId}`);
  const data = await response.json();
  return json({
    plans: data.success ? data.data : null,
    shop: session.shop,
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  console.log("Edit payload:", payload);

  const shopifyGroupId = payload.shopifyGroupId;

  if (!shopifyGroupId) {
    return Response.json({
      success: false,
      error: "shopifyGroupId missing",
    });
  }

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
        id: shopifyGroupId,
        input: {
          name: payload.planName,
          merchantCode: payload.planName,
        },
      },
    }
  );

  const updateData = await updateRes.json();
    console.log("update data",updateData.sellingPlanGroup)
  const updateErrors = updateData.data.sellingPlanGroupUpdate.userErrors;

  if (updateErrors?.length > 0) {
    return Response.json({
      success: false,
      error: updateErrors.map((e) => e.message).join(", "),
    });
  }

  await admin.graphql(
    `
    mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
      sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
        removedProductIds
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        id: shopifyGroupId,
        productIds: payload.products.map((p) => p.id),
      },
    }
  );

  const addRes = await admin.graphql(
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
        id: shopifyGroupId,
        productIds: payload.products.map((p) => p.id),
      },
    }
  );

  const addData = await addRes.json();

  const addErrors = addData.data.sellingPlanGroupAddProducts.userErrors;

  if (addErrors?.length > 0) {
    return Response.json({
      success: false,
      error: addErrors.map((e) => e.message).join(", "),
    });
  }

  return Response.json({ success: true, shopifyGroupId, ...payload });
};

function PlanId() {
  const { plans, shop } = useLoaderData();
  return <Template shop={shop} editPlandData={plans} />;
}

export default PlanId;