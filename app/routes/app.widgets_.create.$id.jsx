import React from "react";
import CreateWidget from "./components/CreateWidget";
import { Page } from "@shopify/polaris";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
      headers: { "x-api-key": SECRET_KEY },
    });
    const plansData = await plansResponse.json();
    const plans = plansData.success ? plansData.data : [];

    // ⬇️ Store ka pehla product fetch karo
    const productRes = await admin.graphql(`
      query {
        products(first: 1) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `);
    const productJson = await productRes.json();
    const firstProduct =
      productJson.data?.products?.edges?.[0]?.node || null;

    return Response.json({
      plans,
      defaultProduct: firstProduct, // { id, title }
    });
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return Response.json({ plans: [], defaultProduct: null });
  }
};

function WidgetCreate() {
  const navigate = useNavigate();
  const { plans, defaultProduct } = useLoaderData();

  const handelBack = () => navigate("/app/widgets-v2/create");

  return (
    <Page title="Widgets Editor" backAction={{ content: "Widgets", onAction: handelBack }}>
      <CreateWidget plans={plans} defaultProduct={defaultProduct} />
    </Page>
  );
}

export default WidgetCreate;


// export const loader = async ({ request }) => {
//   const { session } = await authenticate.admin(request);

//   const shop = session.shop;

//   try {
//     const plansResponse = await fetch(
//       `${API}/plans/getAllPlans?shop=${shop}`,
//       {
//         headers: {
//           "x-api-key": SECRET_KEY,
//         },
//       },
//     );

//     const plansData = await plansResponse.json();

//     const plans = plansData.success ? plansData.data : [];

//     return Response.json({
//       plans,
//     });
//   } catch (error) {
//     console.error("Failed to fetch plans:", error);

//     return Response.json({
//       plans: [],
//     });
//   }
// };

// function WidgetCreate() {
//   const navigate = useNavigate();
// const { plans } = useLoaderData();
//   const handelBack = () => {
//     navigate("/app/widgets-v2/create");
//   };

//   return (
//     <Page
//       title="Widgets Editor"
//       backAction={{
//         content: "Widgets",
//         onAction: handelBack,
//       }}
//     >
//       <CreateWidget  plans={plans}/>
//     </Page>
//   );
// }

// export default WidgetCreate;