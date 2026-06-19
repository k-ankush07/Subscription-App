import { authenticate } from "../shopify.server";
import Template from "./components/Template"
import { useLoaderData } from "react-router";


export const loader = async ({request})=>
{
  const {session}= await authenticate.admin(request)
  return Response.json({shop:session.shop})
}

export const action = async ({request}) =>
{
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { payload } = body;
  console.log("body", payload)

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
            merchantCode: `${payload.planName}`,
            // description: `${planPayload.description}`,
            // options: ["Delivery Frequency"],
            // sellingPlansToCreate: sellingPlans,
          },
        },
      },
    );

    const createData = await createRes.json();
console.log("Create Response");
console.log(JSON.stringify(createData, null, 2));
    const userErrors = createData.data.sellingPlanGroupCreate.userErrors;
    if (userErrors?.length > 0) {
      console.log("Create userErrors:", userErrors);
      return json({
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
          productIds: payload.products.map((p) => p.productId),
        },
      },
    );

    const addProductsData = await addProductsRes.json();
    console.log(
  "Add Products Response",
  JSON.stringify(addProductsData, null, 2)
);

    const addProductsErrors =
      addProductsData.data.sellingPlanGroupAddProducts.userErrors;
    if (addProductsErrors?.length > 0) {
      console.log("Add Products userErrors:", addProductsErrors);
    }
}
function CreatePlan() {
  const {shop}= useLoaderData()
  return (
   <>
   <Template  shop={shop}/>
   </>
  );
}

export default CreatePlan;