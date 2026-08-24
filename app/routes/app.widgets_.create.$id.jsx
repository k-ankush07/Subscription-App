// import React from "react";
// import CreateWidget from "./components/CreateWidget";
// import { Page } from "@shopify/polaris";
// import { useLoaderData, useNavigate } from "react-router";
// import { authenticate } from "../shopify.server";

// const API = import.meta.env.VITE_API_URL;
// const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
// export const loader = async ({ request }) => {
//   const { session, admin } = await authenticate.admin(request);
//   const shop = session.shop;

//   try {
//     const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
//       headers: { "x-api-key": SECRET_KEY },
//     });
//     const plansData = await plansResponse.json();
//     const plans = plansData.success ? plansData.data : [];

//     const productRes = await admin.graphql(`
//       query {
//         products(first: 1) {
//           edges {
//             node {
//               id
//               title
//             }
//           }
//         }
//       }
//     `);
//     const productJson = await productRes.json();
//     const firstProduct =
//       productJson.data?.products?.edges?.[0]?.node || null;

//     return Response.json({
//       plans,
//       defaultProduct: firstProduct,
//       shop,
//     });
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//     return Response.json({ plans: [], defaultProduct: null });
//   }
// };

// function WidgetCreate() {
//   const navigate = useNavigate();
//   const { plans, defaultProduct ,shop,} = useLoaderData();

//   const handelBack = () => navigate("/app/widgets-v2/create");

//   return (
//     <Page title="Widgets Editor" backAction={{ content: "Widgets", onAction: handelBack }}>
//       <CreateWidget plans={plans} defaultProduct={defaultProduct} shop={shop} />
//     </Page>
//   );
// }

// export default WidgetCreate;

import React from "react";
import CreateWidget from "./components/CreateWidget";
import { Page } from "@shopify/polaris";
import { useLoaderData, useLocation, useNavigate } from "react-router";
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

    let currencyCode = "USD";
    try {
      const shopResponse = await admin.graphql(`
        {
          shop {
            currencyCode
          }
        }
      `);
      const shopJson = await shopResponse.json();
      currencyCode = shopJson?.data?.shop?.currencyCode || currencyCode;
    } catch (err) {
      console.error("Failed to fetch shop currencyCode:", err);
    }

    return Response.json({
      plans,
      defaultProduct: firstProduct,
      shop,
      currencyCode,
    });
  } catch (error) {
    console.error("Failed to fetch data:", error);
    return Response.json({ plans: [], defaultProduct: null });
  }
};

function WidgetCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { plans, defaultProduct, shop, currencyCode } = useLoaderData();

  // This is what Widgets2's "Choose" button put here via navigate(..., { state }).
  // `widget.variant` tells CreateWidget which template (radio/highlight/checkbox)
  // to preselect, and `planId`/`product` seed the Plan & Product preview pickers
  // so the preview looks the same as what was chosen on the Widgets2 page.
  const { widget, planId, product } = location.state || {};

  const handelBack = () => navigate("/app/widgets-v2/create");

  return (
    <Page title="Widgets Editor" backAction={{ content: "Widgets", onAction: handelBack }}>
      <CreateWidget
        plans={plans}
        defaultProduct={defaultProduct}
        shop={shop}
        currencyCode={currencyCode}
        initialVariant={widget?.variant}
        initialPlanId={planId}
        initialProduct={product}
      />
    </Page>
  );
}

export default WidgetCreate;