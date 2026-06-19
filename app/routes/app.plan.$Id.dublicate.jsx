import { authenticate } from "../shopify.server";
import React from 'react'
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Template from "./components/Template";

const API= import.meta.env.VITE_API_URL;

export const loader = async({request,params})=>
{
  const {session}= await authenticate.admin(request)
  const {Id }= params;
  const planId= Id ;
  // console.log("bfhjsdsfdsf", planId)
  const response = await fetch(
      `${API}/plans/${planId}`
    );
    const data = await response.json();
    return json({
      plans: data.success ? data.data : [],
      shop: session.shop,
    });
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const payload = await request.json();
  console.log("body ,", payload);
  // const payload =
  //   typeof body.payload === "string" ? JSON.parse(body.payload) : body.payload;

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
        `${payload.sellingPlan.intervalCount} ${payload.sellingPlan.interval.toLowerCase()}`
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
          // sellingPlansToCreate: [
          //   {
          //     name: "Daily",
          //     options: ["Daily"],
          //     category: "SUBSCRIPTION",
          //     billingPolicy: {
          //       recurring: {
          //         interval: "DAY",
          //         intervalCount: 1,
          //       },
          //     },
          //     deliveryPolicy: {
          //       recurring: {
          //         interval: "DAY",
          //         intervalCount: 1,
          //       },
          //     },
          //   },
          //   {
          //     name: "Weekly",
          //     options: ["Weekly"],
          //     category: "SUBSCRIPTION",
          //     billingPolicy: {
          //       recurring: {
          //         interval: "WEEK",
          //         intervalCount: 1,
          //       },
          //     },
          //     deliveryPolicy: {
          //       recurring: {
          //         interval: "WEEK",
          //         intervalCount: 1,
          //       },
          //     },
          //   },
          //   {
          //     name: "Monthly",
          //     options: ["Monthly"],
          //     category: "SUBSCRIPTION",
          //     billingPolicy: {
          //       recurring: {
          //         interval: "MONTH",
          //         intervalCount: 1,
          //       },
          //     },
          //     deliveryPolicy: {
          //       recurring: {
          //         interval: "MONTH",
          //         intervalCount: 1,
          //       },
          //     },
          //   },
          // ],
        },
      },
    },
  );

  const createData = await createRes.json();
  const userErrors = createData.data.sellingPlanGroupCreate.userErrors;

  if (userErrors?.length > 0) {
    console.log("Create userErrors:", userErrors);
    return Response.json({
      success: false,
      error: userErrors.map((e) => e.message).join(", "),
    });
  }

  const shopifyGroupId =
    createData.data.sellingPlanGroupCreate.sellingPlanGroup.id;
  console.log("Shopify Group ID:", shopifyGroupId);

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
    },
  );

  const addProductsData = await addProductsRes.json();
  console.log(
    "product attached ",
    addProductsData.data.sellingPlanGroupAddProducts.sellingPlanGroup,
  );
  const addProductsErrors =
    addProductsData.data.sellingPlanGroupAddProducts.userErrors;

  if (addProductsErrors?.length > 0) {
    console.log("Add Products userErrors:", addProductsErrors);
    return Response.json({
      success: false,
      error: addProductsErrors[0].message,
    });
  }

  return Response.json({ success: true, shopifyGroupId, ...payload });
};
function DublicatePlanPage() {
  const {plans,shop }= useLoaderData()
  const dublicateData= plans;
  return (
    <>
     <Template 
     shop={shop}
     dublicateData={dublicateData}
     />
    </>
  )
}

export default DublicatePlanPage