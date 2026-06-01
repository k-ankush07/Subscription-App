import React from 'react'
import Templates from "./components/Templates"

import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from 'react-router';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({
    shop: session.shop,
  });
};
function Create() {
  const {shop}= useLoaderData()
  return (
   <>
    <Templates  shop={shop} />
   </>
     
   
  )
}

export default Create
