import React, { useEffect, useMemo, useState } from "react";
import { Card, Select, TextField, BlockStack } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";

function CreateWidget({ plans = [] }) {
  const shopify = useAppBridge();

  const [widgetName, setWidgetName] = useState("Widgets #");
  const [template, setTemplate] = useState("radio");

  const [selectedPlan, setSelectedPlan] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null); // { id, title }

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

  useEffect(() => {
    if (!selectedPlan && planOptions.length > 0) {
      setSelectedPlan(planOptions[0].value);
    }
  }, [planOptions, selectedPlan]);

  const handleProductPick = async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: false,
    });

    if (selected && selected.length > 0) {
      setSelectedProduct({
        id: selected[0].id,
        title: selected[0].title,
      });
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
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

          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
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

            <div style={{ width: "220px" }}>
              <h2>Product</h2>

              <div onClick={handleProductPick} style={{ cursor: "pointer" }}>
                <TextField
                  label=""
                  labelHidden
                  value={selectedProduct ? selectedProduct.title : ""}
                  placeholder="Select product"
                  readOnly
                  autoComplete="off"
                  suffix="▾"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default CreateWidget;