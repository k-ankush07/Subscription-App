import {
  Card,
  Button,
  InlineStack,
  Text,
  Thumbnail,
  BlockStack,
  Badge,
  Divider,
  InlineError,
  Icon
} from "@shopify/polaris";
import React, { useState, useCallback } from "react";
import { ViewIcon } from "@shopify/polaris-icons";

function Product({
  selectedProducts,
  setSelectedProducts,
  editPlandData,
  shop,
  productError,
}) {
  const shopName = shop.split(".")[0];
  console.log("shopNmae", shopName);
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
          <Text as="h2" variant="headingMd">
            Products
          </Text>
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
                          source={product.ProductImage || ""}
                          alt={product.title}
                          size="small"
                        />
                        <BlockStack gap="100">
                          {editPlandData ? (
                             <>
                             {product.title}
                            <a
                              href={`https://admin.shopify.com/store/${shopName}/products/${product.id.split("/").pop()}`}
                              target="_top"
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                                fontWeight: 600,
                              }}
                            >
                              <Icon source={ViewIcon} tone="base" />
                            </a>
                             </>

                          ) : (
                            <Text fontWeight="medium">{product.title}</Text>
                          )}
                          {/* <Text as="span" variant="bodyMd" fontWeight="medium">
                            {product.title}
                          </Text> */}
                          {variantLabel && (
                            <Text as="span" variant="bodySm" tone="subdued">
                              {editPlandData ? "" : ""}
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
        {productError && (
          <InlineError
            message="Please select at least one product."
            fieldID="products"
          />
        )}
      </BlockStack>
    </Card>
  );
}

export default Product;
