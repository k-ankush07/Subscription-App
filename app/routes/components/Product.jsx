import { Card, Button, InlineStack, Text, Thumbnail, BlockStack } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import React, { useState, useCallback } from "react";

function Product() {
  const shopify = useAppBridge();
  const [selectedProducts, setSelectedProducts] = useState([]);

  const handleSelectProduct = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });

    if (selected) {
      setSelectedProducts(
        selected.map((product) => ({
          id: product.id,
          title: product.title,
          handle: product.handle,
          image: product.images?.[0],
          variants: product.variants,
        }))
      );
    }
  }, [shopify]);

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">
          Product
        </Text>

        {selectedProducts.length > 0 ? (
          <BlockStack gap="300">
            {selectedProducts.map((product) => (
              <InlineStack key={product.id} gap="300" blockAlign="center">
                <Thumbnail
                  source={product.image?.originalSrc || product.image?.src || ""}
                  alt={product.title}
                  size="small"
                />
                <Text as="span" variant="bodyMd">
                  {product.title}
                </Text>
              </InlineStack>
            ))}
          </BlockStack>
        ) : (
          <Text as="p" variant="bodyMd" tone="subdued">
            No products selected
          </Text>
        )}

        <Button onClick={handleSelectProduct}>
          {selectedProducts.length > 0 ? "Change product" : "Select product"}
        </Button>
      </BlockStack>
    </Card>
  );
}

export default Product;