import React, { useEffect, useMemo, useState } from "react";
import { Card, Select, TextField, BlockStack } from "@shopify/polaris";

function CreateWidget({ plans = [] }) {
  const [widgetName, setWidgetName] = useState("Widgets #");
  const [template, setTemplate] = useState("radio");

  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const templateOptions = [
    {
      label: "Radio button",
      value: "radio",
    },
    {
      label: "Highlight",
      value: "highlight",
    },
    {
      label: "Checkbox",
      value: "checkbox",
    },
  ];

  // -----------------------------
  // PLAN OPTIONS
  // -----------------------------
  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        label: plan.planName,
        value: plan.planId,
      })),
    [plans],
  );

  // -----------------------------
  // SELECTED PLAN
  // -----------------------------
  const selectedPlanData = useMemo(() => {
    return (
      plans.find((plan) => plan.planId === selectedPlan) || plans[0] || null
    );
  }, [plans, selectedPlan]);

  // -----------------------------
  // PRODUCT OPTIONS
  // Selected plan ke products
  // -----------------------------
  const productOptions = useMemo(() => {
    if (!selectedPlanData?.products) {
      return [];
    }

    return selectedPlanData.products
      .filter((product) => product?.id)
      .map((product) => ({
        label: product.title || product.name || "Untitled product",
        value: product.id,
      }));
  }, [selectedPlanData]);

  // -----------------------------
  // FIRST PLAN AUTO SELECT
  // -----------------------------
  useEffect(() => {
    if (!selectedPlan && planOptions.length > 0) {
      setSelectedPlan(planOptions[0].value);
    }
  }, [planOptions, selectedPlan]);

  // -----------------------------
  // PLAN CHANGE
  // Automatically first product
  // -----------------------------
  useEffect(() => {
    if (productOptions.length > 0) {
      setSelectedProduct(productOptions[0].value);
    } else {
      setSelectedProduct("");
    }
  }, [selectedPlan, productOptions]);

  // -----------------------------
  // SELECTED PRODUCT
  // -----------------------------
  const selectedProductData = useMemo(() => {
    return (
      selectedPlanData?.products?.find(
        (product) => product.id === selectedProduct,
      ) || selectedPlanData?.products?.[0] || null
    );
  }, [selectedPlanData, selectedProduct]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "10px",
      }}
    >
      {/* LEFT SIDE */}
      <div style={{ width: "100%" }}>
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Widget name (internal)"
              value={widgetName}
              onChange={setWidgetName}
              placeholder="For your reference only"
              autoComplete="off"
            />

            <Select
              label="Widget template"
              options={templateOptions}
              value={template}
              onChange={setTemplate}
            />

            <h2>Plans assigned</h2>

            <Select
              label="Plan"
              options={planOptions}
              value={selectedPlan}
              onChange={setSelectedPlan}
            />

            <Select
              label="Product"
              options={
                productOptions.length > 0
                  ? productOptions
                  : [
                      {
                        label: "No products available",
                        value: "",
                      },
                    ]
              }
              value={selectedProduct}
              onChange={setSelectedProduct}
              disabled={productOptions.length === 0}
            />
          </BlockStack>
        </Card>
      </div>

      {/* RIGHT SIDE - PREVIEW */}
      <div style={{ width: "100%" }}>
        <Card>
          <h2>Preview</h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            {/* PLAN */}
            <div style={{ width: "100%" }}>
              <h2>Plan</h2>

              <Select
                label=""
                labelHidden
                options={planOptions}
                value={selectedPlan}
                onChange={setSelectedPlan}
              />
            </div>

            {/* PRODUCT */}
            <div style={{ width: "220px" }}>
              <h2>Product</h2>

              <Select
                label=""
                labelHidden
                options={
                  productOptions.length > 0
                    ? productOptions
                    : [
                        {
                          label: "No products available",
                          value: "",
                        },
                      ]
                }
                value={selectedProduct}
                onChange={setSelectedProduct}
                disabled={productOptions.length === 0}
              />

            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CreateWidget;