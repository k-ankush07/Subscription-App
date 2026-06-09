// // app/routes/app.plan.$planId.jsx

// import { json } from "@remix-run/node";
// import { useLoaderData } from "react-router";
// import Templates from "./components/Templates"

// // This runs on the SERVER — no CORS, no mixed content issues
// const API_URL = import.meta.env.VITE_API_URL;
// export async function loader({ params }) {
//   const { planId } = params;
   

//   const res = await fetch(`${API_URL}/plans/${planId}`);
//   const data = await res.json();

//   if (!data.success) {
//     throw new Response(data.message || "Plan not found", { status: 404 });
//   }

//   return json(data.data);
// }

// export default function PlanId() {
//   const plan = useLoaderData();
//   const shop = plan.shop;
//   const planId= plan.planId;
//   if (!plan) return <div>No plan found</div>;

//   return (
//     <div style={{ padding: "1.5rem" }}>
//     <Templates  shop={plan.shop}  singlePlanId={planId} singlePlanData={plan} />
//     </div>
//   );
// }






import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";
import Templates from "./components/Templates";

const intervalMap = {
  day: "DAY", days: "DAY",
  week: "WEEK", weeks: "WEEK",
  month: "MONTH", months: "MONTH",
  year: "YEAR", years: "YEAR",
};

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request);
  const { planId } = params;

  // Shop metafield se data lo
  const res = await admin.graphql(`
    query getPlanData($namespace: String!, $key: String!) {
      shop {
        id
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
    }
  `, {
    variables: {
      namespace: "kaching_plans",
      key: `plan_${planId}`,
    },
  });

  const data = await res.json();
  const metaValue = data.data.shop.metafield?.value;

  if (!metaValue) throw new Response("Plan not found", { status: 404 });

  const planData = JSON.parse(metaValue);

  return json({
    shop: session.shop,
    ...planData,
  });
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const body = await request.json();
  const { type, planPayload, shopifyGroupId } = body;

  // Shop ID lo
  const shopRes = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopRes.json();
  const shopId = shopData.data.shop.id;

  //  DELETE 
  if (type === "delete") {
    // Shopify group delete
    const res = await admin.graphql(`
      mutation sellingPlanGroupDelete($id: ID!) {
        sellingPlanGroupDelete(id: $id) {
          deletedSellingPlanGroupId
          userErrors { field message }
        }
      }
    `, { variables: { id: shopifyGroupId } });

    const data = await res.json();
    const errors = data.data.sellingPlanGroupDelete.userErrors;
    if (errors?.length > 0) {
      return json({ success: false, error: errors.map(e => e.message).join(", ") });
    }

    // Shop metafield bhi delete karo
    const metaRes = await admin.graphql(`
      query getMetafieldId($namespace: String!, $key: String!) {
        shop {
          metafield(namespace: $namespace, key: $key) { id }
        }
      }
    `, { variables: { namespace: "kaching_plans", key: `plan_${params.planId}` } });

    const metaData = await metaRes.json();
    const metafieldId = metaData.data.shop.metafield?.id;

    if (metafieldId) {
      await admin.graphql(`
        mutation metafieldDelete($id: ID!) {
          metafieldDelete(id: $id) {
            deletedId
            userErrors { field message }
          }
        }
      `, { variables: { input: { id: metafieldId } } });
    }

    return json({ success: true, deleted: true });
  }

  //  UPDATE 
  try {
    // 1. Group name/description update
    await admin.graphql(`
      mutation sellingPlanGroupUpdate($id: ID!, $input: SellingPlanGroupInput!) {
        sellingPlanGroupUpdate(id: $id, input: $input) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        id: shopifyGroupId,
        input: {
          name: planPayload.title,
          description: planPayload.description,
        },
      },
    });

    // 2. Products update
    await admin.graphql(`
      mutation sellingPlanGroupAddProducts($id: ID!, $productIds: [ID!]!) {
        sellingPlanGroupAddProducts(id: $id, productIds: $productIds) {
          sellingPlanGroup { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        id: shopifyGroupId,
        productIds: planPayload.selectedProducts.map(p => p.productId),
      },
    });

    // 3. Shop metafield update
    await admin.graphql(`
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id }
          userErrors { field message }
        }
      }
    `, {
      variables: {
        metafields: [{
          ownerId: shopId,
          namespace: "kaching_plans",
          key: `plan_${planPayload.planId}`,
          type: "json",
          value: JSON.stringify({
            planId: planPayload.planId,
            shopifyGroupId,
            shop: planPayload.shop,
            description: planPayload.description,
            selectedProducts: planPayload.selectedProducts,
            productChanges: planPayload.productChanges,
            options: planPayload.options,
            title: planPayload.title,
          }),
        }],
      },
    });

    return json({ success: true, planId: planPayload.planId });

  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

export default function PlanId() {
  const plan = useLoaderData();
  return (
    <div style={{ padding: "1.5rem" }}>
      <Templates
        shop={plan.shop}
        singlePlanId={plan.planId}
        singlePlanData={plan}
      />
    </div>
  );
}