import {
  Card,
  Page,
  Button,
  Thumbnail,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  Select,
  TextField,
  Divider,
  Toast,
  Frame,
  Checkbox,
  Collapsible,
  Box,
} from "@shopify/polaris";
import {
  DeleteIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
} from "@shopify/polaris-icons";
import React, { useCallback, useMemo, useState } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useNavigate } from "react-router";
import {
  buildCheckoutLink,
} from "../utils/checkoutLink";
let propertyIdCounter = 0;
const generatePropertyId = () =>
  `prop_${Date.now()}_${propertyIdCounter++}_${Math.random().toString(36).slice(2, 8)}`;
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;


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

function QuickCheckoutPage({
  shop,
  plans = [],
  initialData = null,
  linkId = null,
}) {
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const isEditMode = Boolean(linkId);

  const [selectedProducts, setSelectedProducts] = useState(
    initialData?.products || [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [properties, setProperties] = useState(
    initialData?.properties?.length
      ? initialData.properties.map((p) => ({
          id: generatePropertyId(),
          name: p.name || "",
          value: p.value || "",
        }))
      : [{ id: generatePropertyId(), name: "", value: "" }],
  );
  const [linkName, setLinkName] = useState(initialData?.name || "");
  const [linkDescription, setLinkDescription] = useState(
    initialData?.description || "",
  );

  const handleAddProperty = () => {
    setProperties((prev) => [
      ...prev,
      { id: generatePropertyId(), name: "", value: "" },
    ]);
  };

  const handleRemoveProperty = (id) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePropertyField = (id, field, value) => {
    if (id === undefined || id === null) return;
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  // Discount code section state
  const [discountOpen, setDiscountOpen] = useState(true);
  const [orderNote, setOrderNote] = useState(initialData?.orderNote || "");
  const [campaignOpen, setCampaignOpen] = useState(true);
  const [campaignParams, setCampaignParams] = useState({
    source: initialData?.campaignParams?.source || "",
    medium: initialData?.campaignParams?.medium || "",
    campaign: initialData?.campaignParams?.campaign || "",
    term: initialData?.campaignParams?.term || "",
    content: initialData?.campaignParams?.content || "",
  });

  const updateCampaignField = (field, value) => {
    setCampaignParams((prev) => ({ ...prev, [field]: value }));
  };
  const [removePreviousDiscounts, setRemovePreviousDiscounts] = useState(
    initialData?.removePreviousDiscounts ?? true,
  );
  const [discountCode, setDiscountCode] = useState(
    initialData?.discountCode || "",
  );

  // Customer information section state
  const [customerOpen, setCustomerOpen] = useState(true);
  const [customer, setCustomer] = useState({
    ...DEFAULT_CUSTOMER,
    ...(initialData?.customer || {}),
  });

  const updateCustomerField = (field, value) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };
  const nameError =
    linkName.trim().length === 0 ? "Name is required" : undefined;
  const countryCodeError =
    customer.countryCode.trim().length > 0 &&
    !/^[A-Za-z]{2}$/.test(customer.countryCode.trim())
      ? "Enter a 2-letter ISO country code"
      : undefined;

  const checkoutLink = useMemo(
    () =>
      buildCheckoutLink(
        shop,
        selectedProducts,
        discountCode,
        removePreviousDiscounts,
        customer,
        properties,
        orderNote,
        campaignParams,
      ),
    [
      shop,
      selectedProducts,
      discountCode,
      removePreviousDiscounts,
      customer,
      properties,
      orderNote,
      campaignParams,
    ],
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
          label:
            sp.name ||
            `Every ${sp.intervalCount} ${sp.interval?.toLowerCase()}`,
          value: sp.shopifySellingPlanId,
        })),
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
            ? {
                ...p,
                variants: p.variants.filter((v) => v.variantsId !== variantId),
              }
            : p,
        )
        .filter((p) => p.variants.length > 0),
    );
  };

  const updateVariantField = (productId, variantId, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.variantsId === variantId ? { ...v, [field]: value } : v,
              ),
            }
          : p,
      ),
    );
  };

  const handleSave = async () => {
    if (!linkName.trim()) {
      setToastMessage("Please enter a name for this link");
      setToastActive(true);
      return;
    }
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
        name: linkName.trim(),
        description: linkDescription.trim(),
        products: selectedProducts,
        discountCode: discountCode || "",
        removePreviousDiscounts,
        customer,
        properties: properties
          .filter((p) => p.name.trim() && p.value.trim())
          .map((p) => ({ name: p.name.trim(), value: p.value.trim() })),
        orderNote: orderNote.trim(),
        campaignParams: {
          source: campaignParams.source.trim(),
          medium: campaignParams.medium.trim(),
          campaign: campaignParams.campaign.trim(),
          term: campaignParams.term.trim(),
          content: campaignParams.content.trim(),
        },
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
          isEditMode ? "Link updated successfully" : "Link saved successfully",
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
        title={
          isEditMode
            ? initialData?.name || "Edit link"
            : "Create quick checkout link"
        }
        backAction={ {onAction: () => navigate("/app/quick-checkout-links")} }
      >
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Products
              </Text>
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
                      <Thumbnail
                        source={product.ProductImage}
                        alt={product.title}
                        size="small"
                      />
                      <Text fontWeight="medium">{product.title}</Text>
                    </InlineStack>
                    <Button
                      variant="plain"
                      tone="critical"
                      onClick={() => handleRemoveProduct(product.id)}
                    >
                      Remove
                    </Button>
                  </InlineStack>

                  {product.variants.map((variant) => {
                    const planOptions = getPlansForVariant(
                      product.id,
                      variant.variantsId,
                    );

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
                            onClick={() =>
                              handleRemoveVariant(
                                product.id,
                                variant.variantsId,
                              )
                            }
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
                            updateVariantField(
                              product.id,
                              variant.variantsId,
                              "purchaseOption",
                              value,
                            )
                          }
                        />

                        <TextField
                          label="Quantity"
                          type="number"
                          min={1}
                          value={variant.quantity}
                          onChange={(value) =>
                            updateVariantField(
                              product.id,
                              variant.variantsId,
                              "quantity",
                              value,
                            )
                          }
                        />
                      </BlockStack>
                    );
                  })}
                </BlockStack>
              ))
            ) : (
              <BlockStack gap="300">
                <Text as="p" tone="subdued">
                  No products selected
                </Text>
                <Button onClick={handleSelectProducts}>Select products</Button>
              </BlockStack>
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Checkout link
            </Text>

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
                <Text as="h2" variant="headingMd">
                  Discount code
                </Text>
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
                    setRemovePreviousDiscounts(
                      value.trim().length > 0 ? false : true,
                    );
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
                <Text as="h2" variant="headingMd">
                  Customer information
                </Text>
                <Badge tone="new">Optional</Badge>
              </InlineStack>
              <Button
                variant="plain"
                icon={customerOpen ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => setCustomerOpen((prev) => !prev)}
                accessibilityLabel="Toggle customer information section"
              />
            </InlineStack>

            <Collapsible
              open={customerOpen}
              id="customer-information-collapsible"
            >
              <BlockStack gap="300">
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="First name"
                      value={customer.firstName}
                      onChange={(value) =>
                        updateCustomerField("firstName", value)
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Last name"
                      value={customer.lastName}
                      onChange={(value) =>
                        updateCustomerField("lastName", value)
                      }
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
                      onChange={(value) =>
                        updateCustomerField("province", value)
                      }
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
                      onChange={(value) =>
                        updateCustomerField("country", value)
                      }
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>

                <TextField
                  label="Company name"
                  value={customer.companyName}
                  onChange={(value) =>
                    updateCustomerField("companyName", value)
                  }
                  autoComplete="off"
                />

                <TextField
                  label="Country code"
                  value={customer.countryCode}
                  onChange={(value) =>
                    updateCustomerField("countryCode", value)
                  }
                  autoComplete="off"
                  error={countryCodeError}
                  helpText="Use the 2-letter ISO code for the country (e.g., DE, FR, AU, JP). Takes priority over Country field in the generated link."
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
              onClick={() => setCampaignOpen((prev) => !prev)}
            >
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Campaign parameters
                </Text>
                <Badge tone="new">Optional</Badge>
              </InlineStack>
              <Button
                variant="plain"
                icon={campaignOpen ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => setCampaignOpen((prev) => !prev)}
                accessibilityLabel="Toggle campaign parameters section"
              />
            </InlineStack>

            <Collapsible
              open={campaignOpen}
              id="campaign-parameters-collapsible"
            >
              <BlockStack gap="300">
                <TextField
                  label="Campaign source"
                  placeholder="e.g., facebook, google, newsletter"
                  value={campaignParams.source}
                  onChange={(value) => updateCampaignField("source", value)}
                  autoComplete="off"
                  helpText="Identifies the source of traffic (utm_source)"
                />

                <TextField
                  label="Campaign medium"
                  placeholder="e.g., email, cpc, social"
                  value={campaignParams.medium}
                  onChange={(value) => updateCampaignField("medium", value)}
                  autoComplete="off"
                  helpText="Identifies the medium (utm_medium)"
                />

                <TextField
                  label="Campaign name"
                  placeholder="e.g., summer_sale, product_launch"
                  value={campaignParams.campaign}
                  onChange={(value) => updateCampaignField("campaign", value)}
                  autoComplete="off"
                  helpText="Identifies the campaign (utm_campaign)"
                />

                <TextField
                  label="Campaign term (optional)"
                  placeholder="e.g., running+shoes"
                  value={campaignParams.term}
                  onChange={(value) => updateCampaignField("term", value)}
                  autoComplete="off"
                  helpText="Identifies paid search keywords (utm_term)"
                />

                <TextField
                  label="Campaign content (optional)"
                  placeholder="e.g., banner_ad, text_link"
                  value={campaignParams.content}
                  onChange={(value) => updateCampaignField("content", value)}
                  autoComplete="off"
                  helpText="Differentiates similar content or links (utm_content)"
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
              onClick={() => setPropertiesOpen((prev) => !prev)}
            >
              <InlineStack gap="200" blockAlign="center">
                <Text as="h2" variant="headingMd">
                  Order properties
                </Text>
                <Badge tone="new">Optional</Badge>
              </InlineStack>
              <Button
                variant="plain"
                icon={propertiesOpen ? ChevronUpIcon : ChevronDownIcon}
                onClick={() => setPropertiesOpen((prev) => !prev)}
                accessibilityLabel="Toggle order properties section"
              />
            </InlineStack>

            <Collapsible
              open={propertiesOpen}
              id="order-properties-collapsible"
            >
              <BlockStack gap="300">
                {properties.map((prop) => (
                  <InlineStack
                    gap="300"
                    blockAlign="end"
                    wrap={false}
                    key={prop.id}
                  >
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Property name"
                        value={prop.name}
                        onChange={(value) =>
                          updatePropertyField(prop.id, "name", value)
                        }
                        autoComplete="off"
                        placeholder="e.g., gift"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextField
                        label="Property value"
                        value={prop.value}
                        onChange={(value) =>
                          updatePropertyField(prop.id, "value", value)
                        }
                        autoComplete="off"
                        placeholder="e.g.,  Happy Birthday"
                      />
                    </div>
                    <Button
                      icon={DeleteIcon}
                      accessibilityLabel="Remove property"
                      onClick={() => handleRemoveProperty(prop.id)}
                      disabled={properties.length === 1}
                    />
                  </InlineStack>
                ))}

                <Box>
                  <Button variant="plain" onClick={handleAddProperty}>
                    + Add property
                  </Button>
                </Box>
              </BlockStack>
            </Collapsible>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <TextField
              label="Name"
              value={linkName}
              onChange={setLinkName}
              autoComplete="off"
              maxLength={100}
              showCharacterCount
              requiredIndicator
              error={nameError}
              helpText="Give this link a memorable name"
            />

            <TextField
              label="Description (optional)"
              value={linkDescription}
              onChange={setLinkDescription}
              autoComplete="off"
              multiline={4}
              maxLength={500}
              showCharacterCount
              helpText="Add notes about this link for future reference"
            />
          </BlockStack>
        </Card>
        <Card>
          <BlockStack gap="300">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Order note
              </Text>
              <Badge tone="new">Optional</Badge>
            </InlineStack>
            <TextField
              label="Note"
              labelHidden
              placeholder="e.g., Please gift wrap this order"
              value={orderNote}
              onChange={setOrderNote}
              autoComplete="off"
              multiline={3}
             
            />
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
