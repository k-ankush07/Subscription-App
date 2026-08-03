
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
  Icon,
  TextField,
  Select,
  Checkbox,
} from "@shopify/polaris";
import React, { useCallback } from "react";
import { ViewIcon } from "@shopify/polaris-icons";

const discountModeOptions = [
  // { label: "Use discounts from selling plan", value: "SELLING_PLAN" },
  { label: "None", value: "NONE" },
  { label: "Set custom discounts", value: "CUSTOM" },
  
];

const discountTypeOptions = [
  { label: "Percentage off", value: "PERCENTAGE" },
  { label: "Amount off", value: "FIXED_AMOUNT" },
  { label: "Fixed price", value: "PRICE" },
];

function Product({
  selectedProducts,
  setSelectedProducts,
  editPlandData,
  shop,
  productError,
  currencyCode,
  showOrderOptions = false, 
}) {
  const shopName = shop.split(".")[0];

  const handleRemove = useCallback((productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const updateVariantField = useCallback((productId, variantId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: (p.variants || []).map((v) =>
                v.variantsId === variantId ? { ...v, [field]: value } : v
              ),
            }
          : p
      )
    );
  }, []);

  const handleDiscountAmountChange = (productId, variantId, field, type, value) => {
    if (type === "PERCENTAGE") {
      if (value === "") {
        updateVariantField(productId, variantId, field, "");
        return;
      }
      let num = Number(value);
      if (num > 100) num = 100;
      if (num < 0) num = 0;
      updateVariantField(productId, variantId, field, String(num));
    } else {
      updateVariantField(productId, variantId, field, value);
    }
  };

  const handleDiscountTypeChange = (productId, variantId, typeField, amountField, currentAmount, value) => {
    updateVariantField(productId, variantId, typeField, value);
    if (value === "PERCENTAGE" && Number(currentAmount) > 100) {
      updateVariantField(productId, variantId, amountField, "100");
    }
  };

  const suffixFor = (type) => (type === "PERCENTAGE" ? "%" : currencyCode);

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

                    {/* ---- Per-variant Quantity / Unit price / Discounts (CreateSubscription page only) ---- */}
                    {showOrderOptions && (
                      <div style={{ marginTop: "12px" }}>
                        {(product.variants || []).map((variant, vIndex) => {
                          const vDiscountMode = variant.discountMode || "SELLING_PLAN";
                          const vDiscountType = variant.discountType || "PERCENTAGE";
                          const vDiscountType2 = variant.discountType2 || "PERCENTAGE";

                          return (
                            <div
                              key={variant.variantsId}
                              style={{
                                marginTop: vIndex > 0 ? "12px" : 0,
                                paddingTop: vIndex > 0 ? "12px" : 0,
                                borderTop: vIndex > 0 ? "1px dashed #e1e1e1" : "none",
                              }}
                            >
                              <InlineStack gap="200" blockAlign="center" wrap={false}>
                                <Thumbnail
                                  source={variant.variantImageUrl || product.ProductImage || ""}
                                  alt={variant.variantImageAlt || variant.variantsTitle || product.title}
                                  size="extraSmall"
                                />
                                {variant.variantsTitle && (
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {variant.variantsTitle}
                                  </Text>
                                )}
                              </InlineStack>

                              <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                                <div style={{ flex: 1 }}>
                                  <TextField
                                    label="Quantity"
                                    type="number"
                                    min={1}
                                    value={variant.quantity ?? "1"}
                                    onChange={(value) =>
                                      updateVariantField(product.id, variant.variantsId, "quantity", value)
                                    }
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <TextField
                                    label="Unit Price"
                                    type="number"
                                    min={0}
                                    prefix={currencyCode === "INR" ? "₹" : undefined}
                                    value={variant.unitPrice ?? "0"}
                                    onChange={(value) =>
                                      updateVariantField(product.id, variant.variantsId, "unitPrice", value)
                                    }
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Select
                                    label="Discounts"
                                    options={discountModeOptions}
                                    value={vDiscountMode}
                                    onChange={(value) =>
                                      updateVariantField(product.id, variant.variantsId, "discountMode", value)
                                    }
                                  />
                                </div>
                              </div>

                              {vDiscountMode === "CUSTOM" && (
                                <>
                                  <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                                    <div style={{ flex: 1 }}>
                                      <TextField
                                        label="Discount amount"
                                        type="number"
                                        min={0}
                                        max={vDiscountType === "PERCENTAGE" ? 100 : undefined}
                                        value={variant.discountAmount ?? "0"}
                                        onChange={(value) =>
                                          handleDiscountAmountChange(
                                            product.id,
                                            variant.variantsId,
                                            "discountAmount",
                                            vDiscountType,
                                            value
                                          )
                                        }
                                        suffix={suffixFor(vDiscountType)}
                                      />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <Select
                                        label="Discount type"
                                        options={discountTypeOptions}
                                        value={vDiscountType}
                                        onChange={(value) =>
                                          handleDiscountTypeChange(
                                            product.id,
                                            variant.variantsId,
                                            "discountType",
                                            "discountAmount",
                                            variant.discountAmount,
                                            value
                                          )
                                        }
                                      />
                                    </div>
                                  </div>

                                  <div style={{ marginTop: "12px" }}>
                                    <Checkbox
                                      label="Change discount after specific number of orders"
                                      checked={!!variant.changeDiscountAfterOrders}
                                      onChange={(checked) =>
                                        updateVariantField(
                                          product.id,
                                          variant.variantsId,
                                          "changeDiscountAfterOrders",
                                          checked
                                        )
                                      }
                                    />
                                  </div>

                                  {variant.changeDiscountAfterOrders && (
                                    <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                                      <div style={{ flex: 1 }}>
                                        <TextField
                                          label="Discount amount"
                                          type="number"
                                          min={0}
                                          max={vDiscountType2 === "PERCENTAGE" ? 100 : undefined}
                                          value={variant.discountAmount2 ?? "0"}
                                          onChange={(value) =>
                                            handleDiscountAmountChange(
                                              product.id,
                                              variant.variantsId,
                                              "discountAmount2",
                                              vDiscountType2,
                                              value
                                            )
                                          }
                                          suffix={suffixFor(vDiscountType2)}
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <TextField
                                          label="After # of orders"
                                          type="number"
                                          min={1}
                                          value={variant.afterOrders ?? "1"}
                                          onChange={(value) =>
                                            updateVariantField(
                                              product.id,
                                              variant.variantsId,
                                              "afterOrders",
                                              value
                                            )
                                          }
                                        />
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <Select
                                          label="Discount type"
                                          options={discountTypeOptions}
                                          value={vDiscountType2}
                                          onChange={(value) =>
                                            handleDiscountTypeChange(
                                              product.id,
                                              variant.variantsId,
                                              "discountType2",
                                              "discountAmount2",
                                              variant.discountAmount2,
                                              value
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
