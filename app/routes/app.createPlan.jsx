import { authenticate } from "../shopify.server";
import Template from "./components/Template"
import { useLoaderData } from "react-router";


export const loader = async ({request})=>
{
  const {session}= await authenticate.admin(request)
  return Response.json({shop:session.shop})
}
function CreatePlan() {
  const {shop}= useLoaderData()
  console.log("bfdfbdsj", shop)

  return (
   <>
   <Template  shop={shop}/>
   </>
  );
}

export default CreatePlan;