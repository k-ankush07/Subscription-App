import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Select, TextField, BlockStack } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

const styles = {
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
  },
  productPickerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
  },
};

function CreateWidget({ plans = [] }) {
  const shopify = useAppBridge();

  const [widgetName, setWidgetName] = useState("Widgets #");
  const [template, setTemplate] = useState("radio");

  const [selectedPlan, setSelectedPlan] = useState("");

  const templateOptions = [
    { label: "Radio button", value: "radio" },
    { label: "Highlight", value: "highlight" },
    { label: "Checkbox", value: "checkbox" },
  ];

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        label: plan.planName,
        value: plan.planId,
      })),
    [plans],
  );

  const selectedPlanData = useMemo(() => {
    return (
      plans.find((plan) => plan.planId === selectedPlan) || plans[0] || null
    );
  }, [plans, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan && planOptions.length > 0) {
      setSelectedPlan(planOptions[0].value);
    }
  }, [planOptions, selectedPlan]);

  // ⬇️ Preview product state (Widgets2.jsx jaisa)
  const [previewProduct, setPreviewProduct] = useState(null);

  // ⬇️ Plan badalte hi uska pehla product auto-select
  useEffect(() => {
    const first = selectedPlanData?.products?.[0];

    if (!first) {
      setPreviewProduct(null);
      return;
    }

    setPreviewProduct({
      id: first.id,
      title: first.title || first.name || "Untitled product",
    });
  }, [selectedPlanData]);

  // ⬇️ ResourcePicker se poore store me se koi bhi product choose kar sako
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

      setPreviewProduct({
        id: product.id,
        title: product.title,
      });
    }
  }, [shopify]);

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
        </Card>
      </div>
    </div>
  );
}

export default CreateWidget;