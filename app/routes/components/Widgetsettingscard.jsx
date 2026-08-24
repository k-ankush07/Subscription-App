import React from "react";
import { Card, Select, TextField, BlockStack } from "@shopify/polaris";

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

              <div>
                <h2>One-time purchase option title</h2>

                <TextField
                  value={customize.oneTimePurchaseTitle}
                  onChange={(value) =>
                    handleCustomizeChange(
                      "oneTimePurchaseTitle",
                      value
                    )
                  }
                  autoComplete="off"
                />
              </div>

              <div>
                <h2>Subscription option title</h2>

                <TextField
                  value={customize.subscriptionTitle}
                  onChange={(value) =>
                    handleCustomizeChange(
                      "subscriptionTitle",
                      value
                    )
                  }
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </BlockStack>
      </Card>
    </div>
  );
}

export default WidgetSettingsCard;