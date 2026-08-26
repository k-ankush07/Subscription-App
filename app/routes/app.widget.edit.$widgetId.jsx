import React from "react";
import CreateWidget from "./components/CreateWidget";
import { Page } from "@shopify/polaris";
import { useLoaderData, useNavigate, useParams } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const { widgetId } = params;

  try {
    // 1. existing widget fetch karo
    const widgetRes = await fetch(`${API}/api/widgets/${widgetId}?shop=${shop}`, {
      headers: { "x-api-key": SECRET_KEY },
    });
    const widgetJson = await widgetRes.json();
const widget = widgetJson.success ? widgetJson.widget : null;

    if (!widget) {
      throw new Response("Widget not found", { status: 404 });
    }

    // 2. plans fetch (same as create loader)
    const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
      headers: { "x-api-key": SECRET_KEY },
    });
    const plansData = await plansResponse.json();
    const plans = plansData.success ? plansData.data : [];

    const productIds = [
      ...new Set(plans.flatMap((p) => (p.products || []).map((pr) => pr.id).filter(Boolean))),
    ];

    const productPrices = {};
    for (const productId of productIds) {
      try {
        const productResponse = await admin.graphql(
          `#graphql
          query ProductPrice($id: ID!) {
            product(id: $id) {
              id
              title
              featuredImage { url }
              variants(first: 1) { nodes { price } }
              priceRangeV2 { minVariantPrice { amount } }
            }
          }`,
          { variables: { id: productId } },
        );
        const productJson = await productResponse.json();
        const product = productJson?.data?.product;
        if (product) {
          productPrices[product.id] = {
            price: Number(product?.variants?.nodes?.[0]?.price ?? product?.priceRangeV2?.minVariantPrice?.amount ?? 0),
            image: product?.featuredImage?.url || null,
            title: product?.title || "",
          };
        }
      } catch (err) {
        console.error("Failed to fetch product:", productId, err);
      }
    }

    const updatedPlans = plans.map((plan) => ({
      ...plan,
      products: (plan.products || []).map((product) => {
        const sp = productPrices[product.id];
        return {
          ...product,
          price: sp?.price ?? product?.price ?? 0,
          ProductImage: sp?.image ?? product?.ProductImage ?? null,
          title: sp?.title ?? product?.title ?? "",
        };
      }),
    }));

    let currencyCode = "USD";
    try {
      const shopResponse = await admin.graphql(`{ shop { currencyCode } }`);
      const shopJson = await shopResponse.json();
      currencyCode = shopJson?.data?.shop?.currencyCode || currencyCode;
    } catch (err) {
      console.error("Failed to fetch currencyCode:", err);
    }

    return Response.json({ plans: updatedPlans, shop, currencyCode, widget });
  } catch (error) {
    console.error("Failed to load widget for edit:", error);
    throw error;
  }
};

function WidgetEdit() {
  const navigate = useNavigate();
  const { plans, shop, currencyCode, widget } = useLoaderData();

  const handleBack = () => navigate("/app/widgets");

  return (
    <Page title="Edit Widget" backAction={{ content: "Widgets", onAction: handleBack }}>
      <CreateWidget
        plans={plans}
        shop={shop}
        currencyCode={currencyCode}
        widgetId={widget.widgetId}
        initialVariant={widget.template === "radio" ? "simple" : widget.template === "highlight" ? "detailed" : "compact"}
        initialPlanId={widget.planId}
        initialProductId={widget.productId}
        initialWidgetName={widget.widgetName}
        initialAssignedPlanIds={widget.assignedPlanIds}
        initialCustomize={widget.customize}
         showAssignedPlans={false}
      />
    </Page>
  );
}

export default WidgetEdit;