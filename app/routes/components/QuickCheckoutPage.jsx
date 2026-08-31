import {
  Card, Page, Button, Thumbnail, InlineStack, BlockStack,
  Text, Badge, Select, TextField, Divider
} from '@shopify/polaris';
import { DeleteIcon } from '@shopify/polaris-icons';
import React, { useCallback, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';

function QuickCheckoutPage({ shop, plans = [] }) {
  const shopify = useAppBridge();
  const [selectedProducts, setSelectedProducts] = useState([]);

  // ---- Variant-level match: is product+variant par jo selling plans lage hain ----
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
          label:
            sp.name ||
            `Every ${sp.intervalCount} ${sp.interval?.toLowerCase()}`,
          value: sp.shopifySellingPlanId,
        }))
      )
      .filter((opt) => opt.value);
  };

  // ---- Product picker khulne par purane selections pass karein ----
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

  // ---- Poore product ko remove karein ----
  const handleRemoveProduct = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // ---- Sirf ek variant remove karein ----
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

  // ---- Variant ka field (purchaseOption / quantity) update karein ----
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

  return (
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
    </Page>
  );
}

export default QuickCheckoutPage;