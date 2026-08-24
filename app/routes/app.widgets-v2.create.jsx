
import { Page, Select } from "@shopify/polaris";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import PurchaseOptionCard from "./components/PurchaseOptionCard";
import {
  normalizeSellingPlan,
  buildPurchaseCards,
} from "./utils/purchaseCardHelpers";

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

const styles = {
  wrapper: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    background: "#f1f1f1",
    padding: 24,
  },

  productPickerField: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    border: "1px solid #c9cccf",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
    minWidth: 220,
  },

  productPickerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
  },
};

function Widgets2() {
  const { plans, currencyCode } = useLoaderData();

  const shopify = useAppBridge();
  const navigate = useNavigate();
  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        label: p.planName,
        value: p.planId,
      })),
    [plans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState(
    planOptions[0]?.value || "",
  );

  const selectedPlanGroup = useMemo(
    () => plans.find((p) => p.planId === selectedPlanId) || plans[0],
    [plans, selectedPlanId],
  );

  const [previewProduct, setPreviewProduct] = useState(null);

  useEffect(() => {
    const first = selectedPlanGroup?.products?.[0];

    if (!first) {
      setPreviewProduct(null);
      return;
    }

    const price = Number(
      first?.price ??
        first?.minPrice ??
        first?.priceRangeV2?.minVariantPrice?.amount ??
        0,
    );

    setPreviewProduct({
      id: first.id,
      title: first.title,
      image: first.ProductImage,
      price,
    });
  }, [selectedPlanGroup]);

  const handlePickPreviewProduct = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",

      filter: {
        variants: false,
      },
    });

    if (selected && selected[0]) {
      const product = selected[0];

      const variant = product.variants?.[0];

      const price = Number(
        variant?.price ??
          product.priceRangeV2?.minVariantPrice?.amount ??
          product.price ??
          0,
      );

      setPreviewProduct({
        id: product.id,
        title: product.title,

        image: product.images?.[0]?.originalSrc,

        price,
      });
    }
  }, [shopify]);

  const basePrice = Number(previewProduct?.price) || 0;

  const normalizedPlans = useMemo(() => {
    if (!selectedPlanGroup?.sellingPlans) {
      return [];
    }

    return selectedPlanGroup.sellingPlans.map((sp) =>
      normalizeSellingPlan(sp, basePrice, currencyCode),
    );
  }, [selectedPlanGroup, basePrice, currencyCode]);

  const purchaseCards = useMemo(
    () => buildPurchaseCards(normalizedPlans, basePrice, currencyCode),
    [normalizedPlans, basePrice, currencyCode],
  );

  const [selectedMap, setSelectedMap] = useState({});

  const [selectedPlanMap, setSelectedPlanMap] = useState({});

  useEffect(() => {
    setSelectedMap(
      purchaseCards.reduce(
        (acc, c) => ({
          ...acc,
          [c.id]: "subscribe",
        }),
        {},
      ),
    );

    setSelectedPlanMap(
      purchaseCards.reduce(
        (acc, c) => ({
          ...acc,
          [c.id]: c.plans?.[0]?.id || null,
        }),
        {},
      ),
    );
  }, [selectedPlanGroup]);

  const select = (id, value) => {
    setSelectedMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const selectPlan = (id, planId) => {
    setSelectedPlanMap((prev) => ({
      ...prev,
      [id]: planId,
    }));
  };

  const getSelectedPlan = (data) =>
    data.plans?.find((p) => p.id === selectedPlanMap[data.id]) ||
    data.plans?.[0];
  const handelChooseBtn = (id) => {
    const data = purchaseCards.find((card) => card.id === id);

    navigate(`/app/widgets/create/${id}`, {
      state: {
        widget: data,
        selected: selectedMap[id],
        activePlan: data ? getSelectedPlan(data) : null,
        planId: selectedPlanId,
        productId: previewProduct?.id,
      },
    });
  };

  return (
    <Page title="Choose a template">
      <div
        style={{
          display: "flex",
        }}
      >
        <div
          style={{
            minWidth: "260px",
          }}
        >
          <h1>Previewing plan</h1>

          <Select
            label=""
            labelHidden
            options={planOptions}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
          />
        </div>

        <div
          style={{
            minWidth: "260px",
            marginLeft: 24,
          }}
        >
          <h1>Previewing product:</h1>

          <div>
            <div
              style={styles.productPickerField}
              onClick={handlePickPreviewProduct}
            >
              <span style={styles.productPickerText}>
                {previewProduct?.title || "Select a product"}
              </span>

              <span>⌄</span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.wrapper}>
        {purchaseCards.map((data) => (
          <PurchaseOptionCard
            key={data.id}
            data={data}
            selected={selectedMap[data.id]}
            activePlan={getSelectedPlan(data)}
            selectedPlanId={selectedPlanMap[data.id]}
            onSelect={(value) => select(data.id, value)}
            onSelectPlan={(planId) => selectPlan(data.id, planId)}
            onChoose={() => handelChooseBtn(data.id)}
          />
        ))}
      </div>
    </Page>
  );
}

export default Widgets2;