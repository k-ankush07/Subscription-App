import React from "react";
import { Page } from "@shopify/polaris";
import CreateWidget from "./components/CreateWidget";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
    headers: {
      "x-api-key": SECRET_KEY,
    },
  });

  const plansData = await plansResponse.json();

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

  const plans = plansData.success ? plansData.data : [];

  const productIds = [
    ...new Set(
      plans.flatMap((plan) =>
        (plan.products || []).map((product) => product.id).filter(Boolean),
      ),
    ),
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

            featuredImage {
              url
            }

            variants(first: 1) {
              nodes {
                price
              }
            }

            priceRangeV2 {
              minVariantPrice {
                amount
              }
            }
          }
        }`,
        {
          variables: {
            id: productId,
          },
        },
      );

      const productJson = await productResponse.json();

      const product = productJson?.data?.product;

      if (product) {
        const variantPrice = product?.variants?.nodes?.[0]?.price;

        const minPrice = product?.priceRangeV2?.minVariantPrice?.amount;

        productPrices[product.id] = {
          price: Number(variantPrice ?? minPrice ?? 0),
          image: product?.featuredImage?.url || null,
          title: product?.title || "",
        };
      }
    } catch (error) {
      console.error("Failed to fetch Shopify product:", productId, error);
    }
  }

  const updatedPlans = plans.map((plan) => ({
    ...plan,

    products: (plan.products || []).map((product) => {
      const shopifyProduct = productPrices[product.id];

      return {
        ...product,

        price:
          shopifyProduct?.price ?? product?.price ?? product?.minPrice ?? 0,

        ProductImage: shopifyProduct?.image ?? product?.ProductImage ?? null,

        title: shopifyProduct?.title ?? product?.title ?? "",
      };
    }),
  }));

  return Response.json({
    plans: updatedPlans,
    currencyCode,
  });
};

function WidgetCreate() {
  return (
    <Page>
      <CreateWidget />
    </Page>
  );
}

export default WidgetCreate;