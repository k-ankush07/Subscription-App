import React from "react";
import {
  Card,
  Select,
  TextField,
  BlockStack,
  RangeSlider,
} from "@shopify/polaris";

export const TEMPLATE_OPTIONS = [
  { label: "Radio button", value: "radio" },
  { label: "Highlight", value: "highlight" },
  { label: "Checkbox", value: "checkbox" },
];

export const DEFAULT_CUSTOMIZE = {
  blockTitle: "Abc",
  oneTimePurchaseTitle: "One time purchase",
  subscriptionTitle: "Save and subscribe",
  preselectSubscription: true,
  displayCompareAtPrice: false,
  displaySellingPlanName: false,
  customLabel: true,
  cornerRadius: 8,
  spacing: 8,
  cardColor: "#FFFFFF",
  selectedCardColor: "#FFFFFF",
  borderColor: "#000000",
  blockTitleColor: "#000000",
  titleColor: "#000000",
  priceColor: "#000000",
  labelBackgroundColor: "#D9D9D9",
  labelTextColor: "#000000",
};

function WidgetSettingsCard({
  widgetName,
  onWidgetNameChange,
  template,
  onTemplateChange,
  customize,
  onCustomizeChange,
  showTemplate = true,
  plans = [],
  assignedPlanIds = [],
  onAssignedPlanIdsChange,
  showAssignedPlans = true,
  currentWidgetId = null,
  validWidgetIds = new Set(),
}) {
  const handleCustomizeChange = (field, value) => {
    onCustomizeChange({
      ...customize,
      [field]: value,
    });
  };

  const handlePlanToggle = (planId, checked) => {
    if (checked) {
      onAssignedPlanIdsChange?.([...assignedPlanIds, planId]);
    } else {
      onAssignedPlanIdsChange?.(assignedPlanIds.filter((id) => id !== planId));
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <Card>
        <BlockStack gap="400">
          <TextField
            label="Widget name (internal)"
            value={widgetName}
            onChange={onWidgetNameChange}
            placeholder="For your reference only"
            autoComplete="off"
          />

          {showTemplate && (
            <Select
              label="Widget template"
              options={TEMPLATE_OPTIONS}
              value={template}
              onChange={onTemplateChange}
            />
          )}

          <div>
            {showAssignedPlans && (
              <div>
                <h2>Plans assigned</h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {plans.length === 0 && <p>No plans available</p>}
                  {plans.map((plan) => {
                    // 👇 defensive: sirf tab disable karo jab plan.widget REAL existing widget ho
                    const assignedToOther =
                      !!plan.widget &&
                      String(plan.widget) !== String(currentWidgetId) &&
                      validWidgetIds.has(String(plan.widget));

                    const isChecked = assignedPlanIds.includes(plan.planId);

                    return (
                      <div
                        key={plan.planId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={assignedToOther}
                          onChange={(e) =>
                            handlePlanToggle(plan.planId, e.target.checked)
                          }
                        />
                        <label style={assignedToOther ? { opacity: 0.5 } : {}}>
                          {plan.planName}
                          {assignedToOther &&
                            " (Already assigned to another widget)"}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <b>Customize</b>

            <div>
              {template === "radio" && (
                <div>
                  <h2>Block title</h2>

                  <TextField
                    value={customize.blockTitle}
                    onChange={(value) =>
                      handleCustomizeChange("blockTitle", value)
                    }
                    autoComplete="off"
                  />
                </div>
              )}

              <div style={{ paddingTop: "10px" }}>
                <h2>One-time purchase option title</h2>

                <TextField
                  value={customize.oneTimePurchaseTitle}
                  onChange={(value) =>
                    handleCustomizeChange("oneTimePurchaseTitle", value)
                  }
                  autoComplete="off"
                />
              </div>

              <div style={{ paddingTop: "10px" }}>
                <h2>Subscription option title</h2>

                <TextField
                  value={customize.subscriptionTitle}
                  onChange={(value) =>
                    handleCustomizeChange("subscriptionTitle", value)
                  }
                  autoComplete="off"
                />
              </div>
              <div
                style={{
                  paddingTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div>
                  <input
                    type="checkbox"
                    checked={customize.preselectSubscription}
                    onChange={(e) =>
                      handleCustomizeChange(
                        "preselectSubscription",
                        e.target.checked,
                      )
                    }
                  />
                  <label>Preselect subscription option</label>
                </div>

                <div>
                  <input
                    type="checkbox"
                    checked={customize.displayCompareAtPrice}
                    onChange={(e) =>
                      handleCustomizeChange(
                        "displayCompareAtPrice",
                        e.target.checked,
                      )
                    }
                  />
                  <label>Display compare-at price</label>
                </div>

                <div>
                  <input
                    type="checkbox"
                    checked={customize.displaySellingPlanName}
                    onChange={(e) =>
                      handleCustomizeChange(
                        "displaySellingPlanName",
                        e.target.checked,
                      )
                    }
                  />
                  <label>Display selling plan name</label>
                </div>
              </div>
              <div style={{ paddingTop: "5px" }}>
                <b>Style</b>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <RangeSlider
                    label="Corner radius"
                    value={Number(customize.cornerRadius)}
                    min={0}
                    max={50}
                    step={1}
                    onChange={(value) =>
                      onCustomizeChange((prev) => ({
                        ...prev,
                        cornerRadius: value,
                      }))
                    }
                    output
                  />

                  <RangeSlider
                    label="Spacing"
                    value={Number(customize.spacing)}
                    min={0}
                    max={20}
                    step={1}
                    onChange={(value) =>
                      onCustomizeChange((prev) => ({
                        ...prev,
                        spacing: value,
                      }))
                    }
                    output
                  />
                </div>
              </div>

              <div style={{ paddingTop: "5px" }}>
                <b>Colors</b>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    marginTop: "12px",
                  }}
                >
                  <ColorField
                    label="Card"
                    value={customize.cardColor}
                    onChange={(value) =>
                      handleCustomizeChange("cardColor", value)
                    }
                  />

                  <ColorField
                    label="Selected card"
                    value={customize.selectedCardColor}
                    onChange={(value) =>
                      handleCustomizeChange("selectedCardColor", value)
                    }
                  />

                  <ColorField
                    label="Border color"
                    value={customize.borderColor}
                    onChange={(value) =>
                      handleCustomizeChange("borderColor", value)
                    }
                  />

                  <ColorField
                    label="Block title"
                    value={customize.blockTitleColor}
                    onChange={(value) =>
                      handleCustomizeChange("blockTitleColor", value)
                    }
                  />

                  <ColorField
                    label="Title"
                    value={customize.titleColor}
                    onChange={(value) =>
                      handleCustomizeChange("titleColor", value)
                    }
                  />

                  <ColorField
                    label="Price"
                    value={customize.priceColor}
                    onChange={(value) =>
                      handleCustomizeChange("priceColor", value)
                    }
                  />

                  <ColorField
                    label="Label background"
                    value={customize.labelBackgroundColor}
                    onChange={(value) =>
                      handleCustomizeChange("labelBackgroundColor", value)
                    }
                  />

                  <ColorField
                    label="Label text"
                    value={customize.labelTextColor}
                    onChange={(value) =>
                      handleCustomizeChange("labelTextColor", value)
                    }
                  />
                  {/* 
                  <ColorField
                    label="Badge background"
                    value={customize.badgeBackgroundColor}
                    onChange={(value) =>
                      handleCustomizeChange("badgeBackgroundColor", value)
                    }
                  />

                  <ColorField
                    label="Badge text"
                    value={customize.badgeTextColor}
                    onChange={(value) =>
                      handleCustomizeChange("badgeTextColor", value)
                    }
                  /> */}
                </div>
              </div>
            </div>
          </div>
        </BlockStack>
      </Card>
    </div>
  );
}

export default WidgetSettingsCard;

function ColorField({ label, value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "62px",
          height: "32px",
          padding: 0,
          border: "1px solid #c9cccf",
          borderRadius: "4px",
          cursor: "pointer",
          background: "#fff",
        }}
      />

      <label>{label}</label>
    </div>
  );
}
