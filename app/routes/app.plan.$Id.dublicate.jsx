import { authenticate } from "../shopify.server";
import React from 'react'


const API= import.meta.env.VITE_API_URL;

export const loader = async({request,params})=>
{
  const {session}= await authenticate.admin(request)
  const response = await fetch(
      `${API}/plans/${planId}`
    );
    const data = await response.json();
    return json({
      plans: data.success ? data.data : [],
    });
}
function DublicatePlanPage() {
  return (
    <>
    <hello>
        dublicate
        </hello> 
    </>
  )
}

export default DublicatePlanPage