import React from "react";
import { Card, Button, BlockStack, Text } from "@shopify/polaris";
import { useNavigate } from "react-router";

function CreateWidget() {
  const navigate = useNavigate();

  const handleBackBtn = () => {
    navigate("/app/widgets-v2/create");
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Button onClick={handleBackBtn}>
          Back
        </Button>

        <Text variant="headingLg" as="h1">
          Widget editor
        </Text>
      </BlockStack>
    </Card>
  );
}

export default CreateWidget;