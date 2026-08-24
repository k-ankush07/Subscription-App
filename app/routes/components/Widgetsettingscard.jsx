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

function WidgetSettingsCard({
  widgetName,
  onWidgetNameChange,
  template,
  onTemplateChange,
  customize,
  onCustomizeChange,
  showTemplate = true,
}) {
  const handleCustomizeChange = (field, value) => {
    onCustomizeChange({
      ...customize,
      [field]: value,
    });
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
            <h2>Customize</h2>

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

              <div>
                <h2>One-time purchase option title</h2>

                <TextField
                  value={customize.oneTimePurchaseTitle}
                  onChange={(value) =>
                    handleCustomizeChange("oneTimePurchaseTitle", value)
                  }
                  autoComplete="off"
                />
              </div>

              <div>
                <h2>Subscription option title</h2>

                <TextField
                  value={customize.subscriptionTitle}
                  onChange={(value) =>
                    handleCustomizeChange("subscriptionTitle", value)
                  }
                  autoComplete="off"
                />
              </div>
              <div>
                <div>
                    
                    <input type="checkbox"  />
                    <label>Preselect subscription option</label>
                </div>
                <div>
                   
                    <input type="checkbox"  />
                     <label>Display compare-at price</label>
                </div>
                <div>
                    
                    <input type="checkbox"  />
                    <label>Display selling plan name</label>
                </div>
                <div>
                    
                    <input type="checkbox"  />
                    <label>Custom currency format</label>
                </div>
                <div>
                    
                    <input type="checkbox"  />
                    <label>Custom label</label>
                </div>
              </div>
              <div>
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
            </div>
          </div>
        </BlockStack>
      </Card>
    </div>
  );
}

export default WidgetSettingsCard;
