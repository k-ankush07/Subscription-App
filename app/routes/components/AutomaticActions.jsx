import React, { useState } from "react";
import { BlockStack, Button, Card, Checkbox, Divider, Text, Banner } from "@shopify/polaris";
import { Modal } from "@shopify/polaris";
function AutomaticActions({
  option,
  index,
  onChange,
  updateChecked,
  showActions,
  setShowActions,
}) {
  const [activeAction, setActiveAction] = useState(null);
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

                  <div style={boxStyle} onClick={() => setActiveAction("swap_product")}>
                    <Text>Add product swap</Text>
                  </div>

                  <div style={boxStyle} onClick={() => setActiveAction("swap_variant")}>
                    <Text>Add variant swap</Text>
                  </div>
                </BlockStack>

                <Divider />

                {/* ADD */}
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Add product to subscription</Text>

                  <div style={boxStyle} onClick={() => setActiveAction("add_product")}>
                    <Text>Add product</Text>
                  </div>
                </BlockStack>

                <Divider />

                {/* REMOVE */}
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Remove from subscription</Text>

                  <div style={boxStyle} onClick={() => setActiveAction("remove_product")}>
                    <Text>Remove product</Text>
                  </div>

                  <div style={boxStyle} onClick={() => setActiveAction("remove_variant")}>
                    <Text>Remove specific variant</Text>
                  </div>
                </BlockStack>

              </BlockStack>
            </Card>
          )}
        </>
      )}
      <Modal
  open={activeAction !== null}
  onClose={() => setActiveAction(null)}
  title="Action"
>
  <Modal.Section>
    {activeAction === "swap_product" && <Text>Swap Product UI</Text>}
    {activeAction === "swap_variant" && <Text>Swap Variant UI</Text>}
    {activeAction === "add_product" && <Text>Add Product UI</Text>}
    {activeAction === "remove_product" && <Text>Remove Product UI</Text>}
    {activeAction === "remove_variant" && <Text>Remove Variant UI</Text>}
  </Modal.Section>
</Modal>
    </BlockStack>
  );
}

const boxStyle = {
  cursor: "pointer",
};

export default AutomaticActions;