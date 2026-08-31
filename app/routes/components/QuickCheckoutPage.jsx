import {
  Card, Page, Button, Thumbnail, InlineStack, BlockStack,
  Text, Badge, Select, TextField, Divider, Toast, Frame
} from '@shopify/polaris';
import { DeleteIcon } from '@shopify/polaris-icons';
import React, { useCallback, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useNavigate } from "react-router";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

function QuickCheckoutPage({ shop, plans = [] }) {
  const shopify = useAppBridge();
  const navigate = useNavigate(); 
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const getPlansForVariant = (productId, variantId) => {
    const matchingPlans = plans.filter((plan) => {
      if (plan.status === "draft") return false;
      const product = (plan.products || []).find((p) => p.id === productId);
      if (!product) return false;
      return (product.variants || []).some((v) => v.variantsId === variantId);
    });

    return matchingPlans
      .flatMap((plan) =>
        (plan.sellingPlans || []).map((sp) => ({
          label: sp.name || `Every ${sp.intervalCount} ${sp.interval?.toLowerCase()}`,
          value: sp.shopifySellingPlanId,
        }))
      )
      .filter((opt) => opt.value);
  };

  const handleSelectProducts = useCallback(async () => {
    const selectionIds = selectedProducts.map((p) => ({
      id: p.id,
      variants: p.variants.map((v) => ({ id: v.variantsId })),
    }));

    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds,
    });

    if (selected) {
      const incoming = selected.map((product) => ({
        id: product.id,
        title: product.title,
        ProductImage: product.images?.[0]?.originalSrc || "",
        variants: (product.variants || []).map((v) => ({
          variantsId: v.id,
          variantsTitle: v.title,
          purchaseOption: "onetime",
          quantity: "1",
        })),
      }));

      setSelectedProducts(incoming);
    }
  }, [shopify, selectedProducts]);

  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleRemoveVariant = (productId, variantId) => {
    setSelectedProducts((prev) =>
      prev
        .map((p) =>
          p.id === productId
            ? { ...p, variants: p.variants.filter((v) => v.variantsId !== variantId) }
            : p
        )
        .filter((p) => p.variants.length > 0)
    );
  };

  const updateVariantField = (productId, variantId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.variantsId === variantId ? { ...v, [field]: value } : v
              ),
            }
          : p
      )
    );
  };

  const handleSave = async () => {
    if (selectedProducts.length === 0) {
      setToastMessage("Please select at least one product");
      setToastActive(true);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API}/checkout-links/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify({
          shop,
          name: "Link #1",
          products: selectedProducts,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTimeout(()=>
        {
navigate(`/app/quick-checkout-link/${data.data._id}`);
        },2000)
        
      } else {
        setToastMessage(data.message || "Failed to save link");
        setToastActive(true);
      }
    } catch (err) {
      console.error("Save error:", err);
      setToastMessage("Something went wrong while saving");
      setToastActive(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Frame>
      {toastActive && (
        <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
      )}
      <Page title="Create quick checkout link">
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">Products</Text>
              <InlineStack gap="200">
                {selectedProducts.length > 0 && (
                  <Badge tone="info">{selectedProducts.length} selected</Badge>
                )}
                <Button variant="plain" onClick={handleSelectProducts}>
                  Select products
                </Button>
              </InlineStack>
            </InlineStack>

            {selectedProducts.length > 0 ? (
              selectedProducts.map((product, index) => (
                <BlockStack gap="300" key={product.id}>
                  {index > 0 && <Divider />}

                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail source={product.ProductImage} alt={product.title} size="small" />
                      <Text fontWeight="medium">{product.title}</Text>
                    </InlineStack>
                    <Button variant="plain" tone="critical" onClick={() => handleRemoveProduct(product.id)}>
                      Remove
                    </Button>
                  </InlineStack>

                  {product.variants.map((variant) => {
                    const planOptions = getPlansForVariant(product.id, variant.variantsId);

                    return (
                      <BlockStack gap="200" key={variant.variantsId}>
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="p" variant="bodySm" tone="subdued">
                            {variant.variantsTitle}
                          </Text>
                          <Button
                            variant="plain"
                            tone="critical"
                            icon={DeleteIcon}
                            onClick={() => handleRemoveVariant(product.id, variant.variantsId)}
                          />
                        </InlineStack>

                        <Select
                          label="Purchase option"
                          options={[
                            { label: "One-time purchase", value: "onetime" },
                            ...planOptions,
                          ]}
                          value={variant.purchaseOption}
                          onChange={(value) =>
                            updateVariantField(product.id, variant.variantsId, "purchaseOption", value)
                          }
                        />

                        <TextField
                          label="Quantity"
                          type="number"
                          min={1}
                          value={variant.quantity}
                          onChange={(value) =>
                            updateVariantField(product.id, variant.variantsId, "quantity", value)
                          }
                        />
                      </BlockStack>
                    );
                  })}
                </BlockStack>
              ))
            ) : (
              <BlockStack gap="300">
                <Text as="p" tone="subdued">No products selected</Text>
                <Button onClick={handleSelectProducts}>Select products</Button>
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        <Button loading={isSaving} onClick={handleSave}>Save</Button>
      </Page>
    </Frame>
  );
}

export default QuickCheckoutPage;