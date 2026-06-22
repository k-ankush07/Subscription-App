import { authenticate } from "../shopify.server";
import React from "react";
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API = import.meta.env.VITE_API_URL;

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { Id } = params;
  const response = await fetch(`${API}/plans/${Id}`);
  const data = await response.json();
  return json({
    plans: data.success ? data.data : null,
    shop: session.shop,
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  console.log("Duplicate action payload:", payload);

  //  Naya Shopify Group create karo
  const createRes = await admin.graphql(
    `
    mutation sellingPlanGroupCreate($input: SellingPlanGroupInput!) {
      sellingPlanGroupCreate(input: $input) {
        sellingPlanGroup { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        input: {
          name: payload.planName,
          merchantCode: payload.planName,
          options: ["Delivery Frequency"],
          sellingPlansToCreate: [
            {
              name: payload.sellingPlan.name,
              options: [
                `${payload.sellingPlan.intervalCount} ${payload.sellingPlan.interval.toLowerCase()}`,
              ],
              category: "SUBSCRIPTION",
              billingPolicy: {
                recurring: {
                  interval: payload.sellingPlan.interval,
                  intervalCount: payload.sellingPlan.intervalCount,
                },
              },
              deliveryPolicy: {
                recurring: {
                  interval: payload.sellingPlan.interval,
                  intervalCount: payload.sellingPlan.intervalCount,
                },
              },
            },
          ],
        },
      },
    }
  );

  const createData = await createRes.json();
  console.log("dublicate data",createData.data)
  const userErrors = createData.data.sellingPlanGroupCreate.userErrors;

  if (userErrors?.length > 0) {
    return Response.json({
      success: false,
      error: userErrors.map((e) => e.message).join(", "),
    });
  }

  const shopifyGroupId = createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
  console.log("New Shopify Group ID:", shopifyGroupId);

  const addProductsRes = await admin.graphql(
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

  const addProductsData = await addProductsRes.json();
  const addProductsErrors = addProductsData.data.sellingPlanGroupAddProducts.userErrors;

  if (addProductsErrors?.length > 0) {
    return Response.json({
      success: false,
      error: addProductsErrors[0].message,
    });
  }

  return Response.json({ success: true, shopifyGroupId, ...payload });
};

function DuplicatePlanPage() {
  const { plans, shop } = useLoaderData();
  return <Template shop={shop} dublicateData={plans} />;
}

export default DuplicatePlanPage;