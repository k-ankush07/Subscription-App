import { Card, Page, Button, Thumbnail, InlineStack, BlockStack, Text, Badge } from '@shopify/polaris';
import React, { useCallback, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';

function QuickCheckoutPage() {
  const shopify = useAppBridge();
  const [selectedProducts, setSelectedProducts] = useState([]);

  const handleSelectProducts = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });

    if (selected) {
      const incoming = selected.map((product) => ({
        id: product.id,
        title: product.title,
        ProductImage: product.images?.[0]?.originalSrc || "",
        variants: (product.variants || []).map((v) => ({
          variantsId: v.id,
          variantsTitle: v.title,
        })),
      }));

      setSelectedProducts(incoming);
    }
  }, [shopify]);

  return (
    <Page title="Create quick checkout link">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">Products</Text>
            {selectedProducts.length > 0 && (
              <Badge tone="info">{selectedProducts.length} selected</Badge>
            )}
          </InlineStack>

          {selectedProducts.length > 0 ? (
            selectedProducts.map((product) => (
              <InlineStack key={product.id} gap="300" blockAlign="center">
                <Thumbnail source={product.ProductImage} alt={product.title} size="small" />
                <Text fontWeight="medium">{product.title}</Text>
              </InlineStack>
            ))
          ) : (
            <Text as="p" tone="subdued">No products selected</Text>
          )}

          <Button onClick={handleSelectProducts}>
            {selectedProducts.length > 0 ? "Add more products" : "Select products"}
          </Button>
        </BlockStack>
      </Card>
    </Page>
  );
}

export default QuickCheckoutPage;