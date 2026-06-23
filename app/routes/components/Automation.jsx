import { Button, Checkbox, Text, Card } from "@shopify/polaris";
import React, { useState } from "react";

function Automation({ sellingPlan, setSellingPlan }) {
  const [showActions, setShowActions] = useState(false);

  const actions = [
    { key: "add_product_swap", label: "Add product swap" },
    { key: "add_variant_swap", label: "Add variant swap" },
    { key: "add_product", label: "Add product" },
    { key: "remove_product", label: "Remove product" },
    { key: "remove_specific_variant", label: "Remove specific variant" },
  ];
  const handleActionClick = (action) => {
    console.log("Key:", action.key);
    console.log("Value:", action.label);
    setShowActions(false); // close after selection
  };
  return (
    <>
      <Text as="h2" variant="headingMd">
        Automation
      </Text>

      <Checkbox
        label="Change product quantity after specific number of orders"
        checked={sellingPlan.Automation}
        onChange={(newChecked) =>
          setSellingPlan((prev) => ({
            ...prev,
            Automation: newChecked,
          }))
        }
      />
      <br />

      {sellingPlan.Automation && (
        <Button onClick={() => setShowActions((prev) => !prev)}>
          + Action
        </Button>
      )}

      {showActions && (
        <>
          {actions.map((action) => (
            <p
              key={action.key}
              style={{ cursor: "pointer" }}
              onClick={() => handleActionClick(action)}
            >
              {action.label}
            </p>
          ))}
        </>
      )}
    </>
  );
}

export default Automation;
