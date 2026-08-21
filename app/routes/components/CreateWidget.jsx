import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Page,
  Card,
  Button,
  Badge,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Select,
  Checkbox,
  Popover,
  Collapsible,
  Icon,
  Divider,
  Box,
} from "@shopify/polaris";
import { ChevronUpIcon, ChevronDownIcon } from "@shopify/polaris-icons";
import { useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { currencySymbol } from "../utils/formatMoney.js";

function formatMoney(amount, currencyCode) {
  const n = Number(amount) || 0;
  return `${currencySymbol(currencyCode)}${n.toFixed(2)}`;
}

function intervalUnit(interval, count) {
  const unit = String(interval || "").toLowerCase();
  return count > 1 ? `${unit}s` : unit;
}

function deliveryPhrase(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);
  return count > 1 ? `every ${count} ${unit}` : `every ${unit}`;
}

function shortDeliveryLabel(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);
  return count > 1 ? `${count} ${unit}` : unit;
}

function discountLabelFor(sp, currencyCode) {
  if (!sp.giveSubscriptionDiscount) {
    return undefined;
  }

  if (sp.discountType === "PERCENTAGE") {
    return `${sp.discountValue}% off`;
  }

  if (sp.discountValue) {
    return `${formatMoney(sp.discountValue, currencyCode)} off`;
  }

  return undefined;
}

function computeSellingPlanPrice(basePrice, sp) {
  if (!sp.giveSubscriptionDiscount) {
    return basePrice;
  }

  if (sp.discountType === "PERCENTAGE") {
    return basePrice - (basePrice * Number(sp.discountValue || 0)) / 100;
  }

  return Math.max(basePrice - Number(sp.discountValue || 0), 0);
}

function normalizeSellingPlan(sp, basePrice, currencyCode) {
  const price = computeSellingPlanPrice(basePrice, sp);

  return {
    id: sp.shopifySellingPlanId,
    name: sp.name,
    label: `Deliver ${deliveryPhrase(sp)}`,
    shortLabel: shortDeliveryLabel(sp),
    discountLabel: discountLabelFor(sp, currencyCode),
    price,
    comparePrice: basePrice,
    raw: sp,
  };
}

const TEMPLATE_OPTIONS = [
  { label: "Radio buttons", value: "simple" },
  { label: "Highlights", value: "highlights" },
  { label: "Checkbox", value: "checkbox" },
];

// Fixed defaults (customization UI removed for now)
const DEFAULT_COLORS = {
  card: "#ffffff",
  selectedCard: "#ffffff",
  borderColor: "#000000",
  blockTitle: "#100e0e",
  title: "#100e0e",
  price: "#100e0e",
  labelBackground: "#eeeeee",
  labelText: "#111111",
  badgeBackground: "#111111",
  badgeText: "#ffffff",
};
const DEFAULT_CORNER_RADIUS = 10;
const DEFAULT_SPACING = 10;

const productPickerStyles = {
  field: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    border: "1px solid #c9cccf",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
  },
  text: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
  },
};

function CreateWidget() {
  const { plans, currencyCode } = useLoaderData();
  const shopify = useAppBridge();
  const navigate = useNavigate();

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        label: p.planName,
        value: p.planId,
      })),
    [plans],
  );

  const [previewPlanId, setPreviewPlanId] = useState(planOptions[0]?.value || "");

  const selectedPlanGroup = useMemo(
    () => plans.find((p) => p.planId === previewPlanId) || plans[0],
    [plans, previewPlanId],
  );

  const [plansAssigned, setPlansAssigned] = useState([]);
  const [plansPopoverActive, setPlansPopoverActive] = useState(false);

  useEffect(() => {
    setPlansAssigned(plans.map((p) => p.planId));
  }, [plans]);

  const togglePlanAssigned = (id) => {
    setPlansAssigned((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const [previewProduct, setPreviewProduct] = useState(null);

  useEffect(() => {
    const first = selectedPlanGroup?.products?.[0];

    if (!first) {
      setPreviewProduct(null);
      return;
    }

    const price = Number(
      first?.price ??
        first?.minPrice ??
        first?.priceRangeV2?.minVariantPrice?.amount ??
        0,
    );

    setPreviewProduct({
      id: first.id,
      title: first.title,
      image: first.ProductImage,
      price,
    });
  }, [selectedPlanGroup]);

  const handlePickPreviewProduct = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",
      filter: {
        variants: false,
      },
    });

    if (selected && selected[0]) {
      const product = selected[0];
      const variant = product.variants?.[0];

      const price = Number(
        variant?.price ??
          product.priceRangeV2?.minVariantPrice?.amount ??
          product.price ??
          0,
      );

      setPreviewProduct({
        id: product.id,
        title: product.title,
        image: product.images?.[0]?.originalSrc,
        price,
      });
    }
  }, [shopify]);

  const basePrice = Number(previewProduct?.price) || 0;

  const normalizedPlans = useMemo(() => {
    if (!selectedPlanGroup?.sellingPlans) {
      return [];
    }

    return selectedPlanGroup.sellingPlans.map((sp) =>
      normalizeSellingPlan(sp, basePrice, currencyCode),
    );
  }, [selectedPlanGroup, basePrice, currencyCode]);

  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    setSelectedPlanId(normalizedPlans[0]?.id || null);
  }, [normalizedPlans]);

  const activePlan =
    normalizedPlans.find((p) => p.id === selectedPlanId) || normalizedPlans[0];

  const [widgetName, setWidgetName] = useState("Widget");
  const [template, setTemplate] = useState("simple");

  const [customizeOpen, setCustomizeOpen] = useState(true);
  const [oneTimeTitle, setOneTimeTitle] = useState("One time purchase");
  const [subscriptionTitle, setSubscriptionTitle] = useState("Subscribe & save");

  const [selectedOption, setSelectedOption] = useState("subscribe"); // subscribe | onetime

  const handleBackBtn = () => {
    navigate("/app/widgets-v2/create");
  };

  const handleChangeTemplate = () => {
    document.getElementById("widget-template-select")?.focus();
  };

  const dynamicStyles = useMemo(
    () => ({
      card: {
        background: DEFAULT_COLORS.card,
        borderRadius: DEFAULT_CORNER_RADIUS,
        padding: 20,
        width: 360,
        boxSizing: "border-box",
        fontFamily: "sans-serif",
      },
      optionBox: (isSelected) => ({
        border: `2px solid ${isSelected ? DEFAULT_COLORS.borderColor : "#d0d0d0"}`,
        borderRadius: DEFAULT_CORNER_RADIUS,
        padding: 14,
        marginBottom: DEFAULT_SPACING,
        cursor: "pointer",
        background: isSelected ? DEFAULT_COLORS.selectedCard : DEFAULT_COLORS.card,
      }),
      radioOuter: (checked) => ({
        width: 20,
        height: 20,
        borderRadius: "50%",
        border: `2px solid ${checked ? DEFAULT_COLORS.borderColor : "#999"}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }),
      radioInner: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: DEFAULT_COLORS.borderColor,
      },
      badge: {
        background: DEFAULT_COLORS.labelBackground,
        color: DEFAULT_COLORS.labelText,
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 12,
        padding: "2px 10px",
        marginLeft: 8,
      },
      title: { color: DEFAULT_COLORS.blockTitle, fontWeight: 700, fontSize: 16 },
      price: { color: DEFAULT_COLORS.price, fontWeight: 700 },
    }),
    [],
  );

  const fmt = (amount) => formatMoney(amount, currencyCode);

  const displayPlanLabel = (plan) => plan.label;

  const renderPreviewCard = () => {
    if (!previewProduct) {
      return (
        <div style={dynamicStyles.card}>
          <Text as="p" tone="subdued">
            Select a product above to see the preview.
          </Text>
        </div>
      );
    }

    const checked = selectedOption === "subscribe";

    if (template === "simple") {
      return (
        <div style={{ position: "relative", ...dynamicStyles.card }}>
          <div
            style={dynamicStyles.optionBox(selectedOption === "onetime")}
            onClick={() => setSelectedOption("onetime")}
          >
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <span style={dynamicStyles.radioOuter(selectedOption === "onetime")}>
                  {selectedOption === "onetime" && <span style={dynamicStyles.radioInner} />}
                </span>
                <span style={dynamicStyles.title}>{oneTimeTitle}</span>
              </InlineStack>
              <span style={dynamicStyles.price}>{fmt(basePrice)}</span>
            </InlineStack>
          </div>

          <div style={dynamicStyles.optionBox(checked)} onClick={() => setSelectedOption("subscribe")}>
            <div style={{ ...dynamicStyles.title, marginBottom: DEFAULT_SPACING }}>{subscriptionTitle}</div>

            {normalizedPlans.map((plan) => {
              const planChecked = checked && selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: DEFAULT_SPACING - 2,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOption("subscribe");
                    setSelectedPlanId(plan.id);
                  }}
                >
                  <InlineStack gap="200" blockAlign="center">
                    <span style={dynamicStyles.radioOuter(planChecked)}>
                      {planChecked && <span style={dynamicStyles.radioInner} />}
                    </span>
                    <span>{displayPlanLabel(plan)}</span>
                    {plan.discountLabel && <span style={dynamicStyles.badge}>{plan.discountLabel}</span>}
                  </InlineStack>
                  <div style={{ textAlign: "right" }}>
                    <span style={dynamicStyles.price}>{fmt(plan.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="primary" fullWidth>
            Choose
          </Button>
        </div>
      );
    }
    return (
      <div style={{ position: "relative", ...dynamicStyles.card }}>
        <div
          style={dynamicStyles.optionBox(selectedOption === "onetime")}
          onClick={() => setSelectedOption("onetime")}
        >
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <span style={dynamicStyles.radioOuter(selectedOption === "onetime")}>
                {selectedOption === "onetime" && <span style={dynamicStyles.radioInner} />}
              </span>
              <span style={dynamicStyles.title}>{oneTimeTitle}</span>
            </InlineStack>
            <span style={dynamicStyles.price}>{fmt(basePrice)}</span>
          </InlineStack>
        </div>

        <div
          style={{ ...dynamicStyles.optionBox(checked), marginBottom: DEFAULT_SPACING }}
          onClick={() => setSelectedOption("subscribe")}
        >
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <span style={dynamicStyles.radioOuter(checked)}>
                {checked && <span style={dynamicStyles.radioInner} />}
              </span>
              <span style={dynamicStyles.title}>{subscriptionTitle}</span>
            </InlineStack>
            <div style={{ textAlign: "right" }}>
              <span style={dynamicStyles.price}>{fmt(activePlan?.price)}</span>
            </div>
          </InlineStack>

          <div style={{ marginTop: DEFAULT_SPACING, width: 180 }} onClick={(e) => e.stopPropagation()}>
            <Select
              label="Deliver every:"
              options={normalizedPlans.map((p) => ({ label: displayPlanLabel(p), value: p.id }))}
              value={selectedPlanId || ""}
              onChange={(v) => {
                setSelectedOption("subscribe");
                setSelectedPlanId(v);
              }}
            />
          </div>
        </div>

        <Button variant="primary" fullWidth>
          Choose
        </Button>
      </div>
    );
  };

  return (
    <Page title="Widget editor" backAction={{ content: "Back", onAction: handleBackBtn }}>
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 380px", maxWidth: 420 }}>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="200" blockAlign="center">
                <Text variant="headingLg" as="h1">
                  Widget editor
                </Text>
                <Badge>Default widget</Badge>
              </InlineStack>

              <TextField
                label="Widget name (internal)"
                value={widgetName}
                onChange={setWidgetName}
                helpText="For your reference only"
                autoComplete="off"
              />

              <Select
                id="widget-template-select"
                label="Widget template"
                options={TEMPLATE_OPTIONS}
                value={template}
                onChange={setTemplate}
              />

              <Popover
                active={plansPopoverActive}
                activator={
                  <Button disclosure fullWidth onClick={() => setPlansPopoverActive((v) => !v)}>
                    {`Plans assigned (${plansAssigned.length})`}
                  </Button>
                }
                onClose={() => setPlansPopoverActive(false)}
              >
                <Box padding="300">
                  <BlockStack gap="200">
                    {plans.length === 0 && (
                      <Text as="p" tone="subdued">
                        No plans found.
                      </Text>
                    )}
                    {plans.map((plan) => (
                      <Checkbox
                        key={plan.planId}
                        label={plan.planName}
                        checked={plansAssigned.includes(plan.planId)}
                        onChange={() => togglePlanAssigned(plan.planId)}
                      />
                    ))}
                  </BlockStack>
                </Box>
              </Popover>

              <Divider />
              <BlockStack gap="200">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen((v) => !v)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text variant="headingSm" as="h2">
                    Customize
                  </Text>
                  <Icon source={customizeOpen ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
                </button>

                <Collapsible open={customizeOpen}>
                  <BlockStack gap="300">
                    <TextField
                      label="One-time purchase option title"
                      value={oneTimeTitle}
                      onChange={setOneTimeTitle}
                      autoComplete="off"
                    />
                    <TextField
                      label="Subscription option title"
                      value={subscriptionTitle}
                      onChange={setSubscriptionTitle}
                      autoComplete="off"
                    />
                  </BlockStack>
                </Collapsible>
              </BlockStack>
            </BlockStack>
          </Card>
        </div>

        <div style={{ flex: "1 1 380px" }}>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">
                  Preview
                </Text>
                <Button onClick={handleChangeTemplate}>Change widget template</Button>
              </InlineStack>

              <InlineStack gap="400">
                <div style={{ minWidth: 200 }}>
                  <Select
                    label="Plan"
                    options={planOptions}
                    value={previewPlanId}
                    onChange={setPreviewPlanId}
                  />
                </div>
                <div style={{ minWidth: 220 }}>
                  <Text as="p" variant="bodyMd">
                    Product
                  </Text>
                  <div style={productPickerStyles.field} onClick={handlePickPreviewProduct}>
                    <span style={productPickerStyles.text}>
                      {previewProduct?.title || "Select a product"}
                    </span>
                    <span>⌄</span>
                  </div>
                </div>
              </InlineStack>

              <div
                style={{
                  background: "#f6f6f7",
                  padding: 24,
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                {renderPreviewCard()}
              </div>
            </BlockStack>
          </Card>
        </div>
      </div>
    </Page>
  );
}

export default CreateWidget;