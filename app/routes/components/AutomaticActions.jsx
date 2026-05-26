import React from "react";
import { BlockStack, Button, Card, Checkbox, Divider, Text, Banner } from "@shopify/polaris";

function AutomaticActions({
  option,
  index,
  onChange,
  updateChecked,
  showActions,
  setShowActions,
}) {
  return (
    <BlockStack gap="300">
      <Text as="h3" variant="headingSm">
        Automatic actions
      </Text>

      <Checkbox
        label="Allow automatic actions (swap, add or remove products)"
        checked={option.allowAutoActions}
        onChange={updateChecked("allowAutoActions")}
      />

      {option.allowAutoActions && (
        <>
          <Banner tone="info">
            <Text variant="bodySm">
              Automatic actions can change the subscription price. The price
              updates to the replacement product's price at the time of the swap.
              <a href="#">Learn more</a>
            </Text>
          </Banner>

          <Button fullWidth onClick={() => setShowActions(!showActions)}>
            + Add action
          </Button>

          {showActions && (
            <Card>
              <BlockStack gap="400">

                {/* SWAP */}
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Swap to different product(s)</Text>

                  <div style={boxStyle}>
                    <Text>Add product swap</Text>
                  </div>

                  <div style={boxStyle}>
                    <Text>Add variant swap</Text>
                  </div>
                </BlockStack>

                <Divider />

                {/* ADD */}
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Add product to subscription</Text>

                  <div style={boxStyle}>
                    <Text>Add product</Text>
                  </div>
                </BlockStack>

                <Divider />

                {/* REMOVE */}
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Remove from subscription</Text>

                  <div style={boxStyle}>
                    <Text>Remove product</Text>
                  </div>

                  <div style={boxStyle}>
                    <Text>Remove specific variant</Text>
                  </div>
                </BlockStack>

              </BlockStack>
            </Card>
          )}
        </>
      )}
    </BlockStack>
  );
}

const boxStyle = {
  cursor: "pointer",
};

export default AutomaticActions;