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
  });
};

function planId() {
  const {plans}= useLoaderData();
  const editPlandData= plans
  console.log("editPlandData", editPlandData)
  return (
    <>
      <Template 
      editPlandData={editPlandData}
      />
    </>
  );
}

export default planId;