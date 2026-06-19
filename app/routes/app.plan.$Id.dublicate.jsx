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
  console.log("bfhjsdsfdsf", planId)
  const response = await fetch(
      `${API}/plans/${planId}`
    );
    const data = await response.json();
    return json({
      plans: data.success ? data.data : [],
      shop: session.shop,
    });
}
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