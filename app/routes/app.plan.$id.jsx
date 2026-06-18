import React from 'react'
import { useLoaderData } from 'react-router';
import { authenticate } from "../shopify.server";
export const loader = async ({request,params})=>
{
  
   const { session } = await authenticate.admin(request);
  const { id } = params;

  const response = await fetch(
    `https://habitant-startling-cassette.ngrok-free.dev/plans/getPlanById?id=${id}`
  );

  const data = await response.json();

  return Response.json({
    plan: data.success ? data.data : null,
  });
}

function PlanId () {
  const { plan} = useLoaderData()
  console.log("bcjhsvcjhvcjh",plan)
  return (
    <>
    hello
    </>
  )
}

export default PlanId