import {
  Card, Page, Button, Thumbnail, InlineStack, BlockStack,
  Text, Badge, Select, TextField, Divider, Toast, Frame,
  Checkbox, Collapsible, Box
} from '@shopify/polaris';
import { DeleteIcon, ChevronUpIcon, ChevronDownIcon, ClipboardIcon } from '@shopify/polaris-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { useNavigate } from "react-router";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

// Extracts the trailing numeric id from a Shopify GID
// e.g. "gid://shopify/ProductVariant/47460524818644" -> "47460524818644"
const extractNumericId = (gid) => {
  if (!gid) return "";
  const match = String(gid).match(/(\d+)$/);
  return match ? match[1] : String(gid);
};

// Builds the "items[i][id]=..&items[i][quantity]=..&items[i][selling_plan]=.." query string
const buildItemsQueryString = (products) => {
  const parts = [];
  let index = 0;
  (products || []).forEach((product) => {
    (product.variants || []).forEach((variant) => {
      const numericId = extractNumericId(variant.variantsId);
      const qty = variant.quantity || 1;
      if (!numericId) return;
      parts.push(`items[${index}][id]=${numericId}`);
      parts.push(`items[${index}][quantity]=${qty}`);
      if (variant.purchaseOption && variant.purchaseOption !== "onetime") {
        const sellingPlanNumericId = extractNumericId(variant.purchaseOption);
        if (sellingPlanNumericId) {
          parts.push(`items[${index}][selling_plan]=${sellingPlanNumericId}`);
        }
      }
      index++;
    });
  });
  return parts.join("&");
};

// Builds the full quick-checkout link:
// https://{shop}/cart/clear?return_to=/cart/add?items[...]&return_to=/checkout?discount=CODE
// When removePreviousDiscounts is false, /cart/clear is skipped so the existing cart is preserved.
const buildCheckoutLink = (shop, products, discountCode, removePreviousDiscounts) => {
  if (!shop) return "";

  const itemsQuery = buildItemsQueryString(products);
  if (!itemsQuery) return "";

  const trimmedDiscount = (discountCode || "").trim();
  const checkoutPath = trimmedDiscount
    ? `/checkout?discount=${encodeURIComponent(trimmedDiscount)}`
    : `/checkout`;

  const cartAddPath = `/cart/add?${itemsQuery}&return_to=${encodeURIComponent(checkoutPath)}`;

  if (removePreviousDiscounts) {
    return `https://${shop}/cart/clear?return_to=${encodeURIComponent(cartAddPath)}`;
  }

  return `https://${shop}${cartAddPath}`;
};

const DEFAULT_CUSTOMER = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  zip: "",
  country: "United States",
  companyName: "",
  countryCode: "",
};

function QuickCheckoutPage({ shop, plans = [], initialData = null, linkId = null }) {
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const isEditMode = Boolean(linkId);

  const [selectedProducts, setSelectedProducts] = useState(
    initialData?.products || []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Discount code section state
  const [discountOpen, setDiscountOpen] = useState(true);
  const [removePreviousDiscounts, setRemovePreviousDiscounts] = useState(
    initialData?.removePreviousDiscounts ?? true
  );
  const [discountCode, setDiscountCode] = useState(initialData?.discountCode || "");

  // Customer information section state
  const [customerOpen, setCustomerOpen] = useState(true);
  const [customer, setCustomer] = useState({
    ...DEFAULT_CUSTOMER,
    ...(initialData?.customer || {}),
  });

  const updateCustomerField = (field, value) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const countryCodeError =
    customer.countryCode.trim().length > 0 &&
    !/^[A-Za-z]{2}$/.test(customer.countryCode.trim())
      ? "Enter a 2-letter ISO country code"
      : undefined;

  const checkoutLink = useMemo(
    () => buildCheckoutLink(shop, selectedProducts, discountCode, removePreviousDiscounts),
    [shop, selectedProducts, discountCode, removePreviousDiscounts]
  );

  const handleCopyLink = async () => {
    if (!checkoutLink) return;
    try {
      await navigator.clipboard.writeText(checkoutLink);
      setToastMessage("Link copied to clipboard");
      setToastActive(true);
    } catch (err) {
      console.error("Copy failed:", err);
      setToastMessage("Could not copy link");
      setToastActive(true);
    }
  };

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

    if (countryCodeError) {
      setToastMessage(countryCodeError);
      setToastActive(true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        shop,
        name: initialData?.name || "Link #1",
        products: selectedProducts,
        discountCode: discountCode || "",
        removePreviousDiscounts,
        customer,
      };

      const url = isEditMode
        ? `${API}/checkout-links/${linkId}`
        : `${API}/checkout-links/create`;
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage(
          isEditMode ? "Link updated successfully" : "Link saved successfully"
        );
        setToastActive(true);

        if (!isEditMode) {
          setTimeout(() => {
            navigate(`/app/quick-checkout-link/${data.data._id}`);
          }, 2000);
        }
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
      <Page
        title={isEditMode ? (initialData?.name || "Edit link") : "Create quick checkout link"}
        backAction={isEditMode ? { onAction: () => navigate("/app/quick-checkout-links") } : undefined}
      >
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

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Checkout link</Text>

            <Box
              padding="300"
              background="bg-surface-secondary"
              borderRadius="200"
              borderWidth="025"
              borderColor="border"
            >
              <Text as="span" variant="bodySm" tone="subdued" truncate>
                {checkoutLink || "Select products to generate a checkout link"}
              </Text>
            </Box>

            <Button
              icon={ClipboardIcon}
              onClick={handleCopyLink}
              disabled={!checkoutLink}
              fullWidth
            >
              Copy link
            </Button>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack
              align="space-between"
              blockAlign="center"
              onClick={() => setDiscountOpen((prev) => !prev)}
            >
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">Discount code</Text>
                <Badge tone="new">Optional</Badge>
              </InlineStack>
              <Button
                variant="plain"
                icon={discountOpen ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => setDiscountOpen((prev) => !prev)}
                accessibilityLabel="Toggle discount code section"
              />
            </InlineStack>

            <Collapsible open={discountOpen} id="discount-code-collapsible">
              <BlockStack gap="300">
                <BlockStack gap="100">
                  <Checkbox
                    label="Remove previous discounts"
                    checked={removePreviousDiscounts}
                    onChange={(value) => {
                      setRemovePreviousDiscounts(value);
                      if (value) {
                        setDiscountCode("");
                      }
                    }}
                    disabled={discountCode.trim().length > 0}
                  />
                  <Text as="p" variant="bodySm" tone="subdued">
                    Removes any previous discounts applied to the cart
                  </Text>
                </BlockStack>

                <TextField
                  label="Discount code"
                  labelHidden
                  placeholder="e.g., SUMMER2024"
                  value={discountCode}
                  onChange={(value) => {
                    setDiscountCode(value);
                    setRemovePreviousDiscounts(value.trim().length > 0 ? false : true);
                  }}
                  autoComplete="off"
                  disabled={removePreviousDiscounts}
                  helpText="The discount code will be automatically applied at checkout"
                />
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <InlineStack
              align="space-between"
              blockAlign="center"
              onClick={() => setCustomerOpen((prev) => !prev)}
            >
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">Customer information</Text>
                <Badge tone="new">Optional</Badge>
              </InlineStack>
              <Button
                variant="plain"
                icon={customerOpen ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => setCustomerOpen((prev) => !prev)}
                accessibilityLabel="Toggle customer information section"
              />
            </InlineStack>

            <Collapsible open={customerOpen} id="customer-information-collapsible">
              <BlockStack gap="300">
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="First name"
                      value={customer.firstName}
                      onChange={(value) => updateCustomerField("firstName", value)}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Last name"
                      value={customer.lastName}
                      onChange={(value) => updateCustomerField("lastName", value)}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>

                <TextField
                  label="Address 1"
                  value={customer.address1}
                  onChange={(value) => updateCustomerField("address1", value)}
                  autoComplete="off"
                />

                <TextField
                  label="Address 2"
                  value={customer.address2}
                  onChange={(value) => updateCustomerField("address2", value)}
                  autoComplete="off"
                />

                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="City"
                      value={customer.city}
                      onChange={(value) => updateCustomerField("city", value)}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="State / Province"
                      value={customer.province}
                      onChange={(value) => updateCustomerField("province", value)}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>

                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Zip / Postal code"
                      value={customer.zip}
                      onChange={(value) => updateCustomerField("zip", value)}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Country"
                      value={customer.country}
                      onChange={(value) => updateCustomerField("country", value)}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>

                <TextField
                  label="Company name"
                  value={customer.companyName}
                  onChange={(value) => updateCustomerField("companyName", value)}
                  autoComplete="off"
                />

                <TextField
                  label="Country code"
                  value={customer.countryCode}
                  onChange={(value) => updateCustomerField("countryCode", value)}
                  autoComplete="off"
                  error={countryCodeError}
                  helpText="Use the 2-letter ISO code for the country (e.g., DE, FR, AU, JP). Takes priority over Country field in the generated link."
                />
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>

        <Button loading={isSaving} onClick={handleSave}>
          {isEditMode ? "Update" : "Save"}
        </Button>
      </Page>
    </Frame>
  );
}

export default QuickCheckoutPage;