import {
  Card,
  Button,
  InlineStack,
  Text,
  Thumbnail,
  BlockStack,
  Badge,
  Divider,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import React, { useState, useCallback } from "react";

function Product({selectedProducts,setSelectedProducts}) {
  const shopify = useAppBridge();
//   const [selectedProducts, setSelectedProducts] = useState([]);

  const handleSelectProduct = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      // Pre-check already selected products in the picker
      selectionIds: selectedProducts.map((p) => ({ id: p.id })),
    });

    if (selected) {
      const incoming = selected.map((product) => {
        const selectedVariants = product.variants || [];
        return {
          id: product.id,
          title: product.title,
          ProductImage: product.images?.[0].originalSrc,
          selectedVariantCount: selectedVariants.length,
          totalVariantCount: product.totalVariants || selectedVariants.length,
          variants: selectedVariants.map((variant) => ({
            id: variant.id,
            title: variant.title,
          })),
        };
      });


      //selct new prodcut and add state
      setSelectedProducts((prev) => {
        const incomingIds = new Set(incoming.map((p) => p.id));
        const kept = prev.filter((p) => !incomingIds.has(p.id));
        return [...kept, ...incoming];
      });
    }
  }, [shopify, selectedProducts]);

  const handleRemove = useCallback((productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const getVariantLabel = ({ selectedVariantCount, totalVariantCount }) => {
    if (selectedVariantCount === totalVariantCount) return null;
    return `${selectedVariantCount} of ${totalVariantCount} variants selected`;
  };

  return (
    <Card>
      <BlockStack gap="400">

        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">Products</Text>
          {selectedProducts.length > 0 && (
            <Badge tone="info">{selectedProducts.length} selected</Badge>
          )}
        </InlineStack>

        {/* Product list */}
        {selectedProducts.length > 0 ? (
          <BlockStack gap="0">
            {selectedProducts.map((product, index) => {
              const variantLabel = getVariantLabel(product);
              return (
                <div key={product.id}>
                  {index > 0 && <Divider />}
                  <div style={{ padding: "10px 0" }}>
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Thumbnail
                          source={product.ProductImage  || ""}
                          alt={product.title}
                          size="small"
                        />
                        <BlockStack gap="100">
                          <Text as="span" variant="bodyMd" fontWeight="medium">
                            {product.title}
                          </Text>
                          {variantLabel && (
                            <Text as="span" variant="bodySm" tone="subdued">
                              {variantLabel}
                            </Text>
                          )}
                        </BlockStack>
                      </InlineStack>
                      <Button
                        variant="plain"
                        tone="critical"
                        onClick={() => handleRemove(product.id)}
                      >
                        Remove
                      </Button>
                    </InlineStack>
                  </div>
                </div>
              );
            })}
          </BlockStack>
        ) : (
          <Text as="p" variant="bodyMd" tone="subdued">
            No products selected
          </Text>
        )}

        {/* Action button */}
        <Button onClick={handleSelectProduct}>
          {selectedProducts.length > 0 ? "Add more products" : "Select products"}
        </Button>

      </BlockStack>
    </Card>
  );
}

export default Product;