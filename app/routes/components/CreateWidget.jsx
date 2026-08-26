import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Card, Select, TextField, BlockStack, Button } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import PurchaseOptionCard from "./PurchaseOptionCard";
import {
  normalizeSellingPlan,
  buildPurchaseCards,
} from "../utils/purchaseCardHelpers";
import { generateWidgetId } from "../utils/generateWidgetId";
import { useNavigate } from "react-router";
import WidgetSettingsCard, { DEFAULT_CUSTOMIZE } from "./WidgetSettingsCard";
const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    background: "#f1f1f1",
    padding: 24,
    borderRadius: 12,
  },
  productPickerField: {
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
  productPickerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
  },
};

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

const TEMPLATE_TO_VARIANT = {
  radio: "simple",
  highlight: "detailed",
  checkbox: "compact",
};
const VARIANT_TO_TEMPLATE = {
  simple: "radio",
  detailed: "highlight",
  compact: "checkbox",
};

function CreateWidget({
  plans = [],
  shop,
  currencyCode = "USD",
  initialVariant = "simple",
  initialPlanId = null,
  initialProductId = null,
  onVariantChange,
  widgetId = null,
  initialWidgetName = "Widgets #",
  initialAssignedPlanIds = null,
  initialCustomize = null,
  showAssignedPlans = true,
}) {
  const shopify = useAppBridge();

  const [widgetName, setWidgetName] = useState(initialWidgetName);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(
    VARIANT_TO_TEMPLATE[initialVariant] || "radio",
  );

  const [customize, setCustomize] = useState(
    initialCustomize || DEFAULT_CUSTOMIZE,
  );
  const navigate = useNavigate();
  useEffect(() => {
    setTemplate(VARIANT_TO_TEMPLATE[initialVariant] || "radio");
  }, [initialVariant]);

  const handleTemplateChange = (value) => {
    setTemplate(value);
    onVariantChange?.(TEMPLATE_TO_VARIANT[value] || "simple");
  };

  const [selectedPlan, setSelectedPlan] = useState(initialPlanId || "");

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        label: plan.planName,
        value: plan.planId,
      })),
    [plans],
  );
  const [assignedPlanIds, setAssignedPlanIds] = useState(
    initialAssignedPlanIds || [],
  );
  useEffect(() => {
    if (
      !initialAssignedPlanIds &&
      planOptions.length > 0 &&
      assignedPlanIds.length === 0
    ) {
      setAssignedPlanIds(planOptions.map((p) => p.value));
    }
  }, [planOptions]);

  const selectedPlanData = useMemo(() => {
    return (
      plans.find((plan) => plan.planId === selectedPlan) || plans[0] || null
    );
  }, [plans, selectedPlan]);

  useEffect(() => {
    if (!selectedPlan && planOptions.length > 0) {
      setSelectedPlan(planOptions[0].value);
    }
  }, [planOptions, selectedPlan]);

  const [previewProduct, setPreviewProduct] = useState(null);

  const initialProductIdRef = useRef(initialProductId || null);

  useEffect(() => {
    const products = selectedPlanData?.products || [];
    let target = null;

    if (initialProductIdRef.current) {
      target =
        products.find((p) => p.id === initialProductIdRef.current) || null;
      initialProductIdRef.current = null;
    }

    if (!target) {
      target = products[0] || null;
    }

    if (!target) {
      setPreviewProduct(null);
      return;
    }

    const price = Number(
      target.price ??
        target.minPrice ??
        target?.priceRangeV2?.minVariantPrice?.amount ??
        0,
    );

    setPreviewProduct({
      id: target.id,
      title: target.title || target.name || "Untitled product",
      image: target.ProductImage || null,
      price,
    });
  }, [selectedPlanData]);

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
        image: product.images?.[0]?.originalSrc || null,
        price,
      });
    }
  }, [shopify]);

  const basePrice = Number(previewProduct?.price) || 0;

  const normalizedPlans = useMemo(() => {
    if (!selectedPlanData?.sellingPlans) {
      return [];
    }

    return selectedPlanData.sellingPlans.map((sp) =>
      normalizeSellingPlan(
        sp,
        basePrice,
        currencyCode,
        customize.customCurrencyFormat,
      ),
    );
  }, [
    selectedPlanData,
    basePrice,
    currencyCode,
    customize.customCurrencyFormat,
  ]);

  const purchaseCards = useMemo(
    () =>
      buildPurchaseCards(
        normalizedPlans,
        basePrice,
        currencyCode,
        customize.customCurrencyFormat,
      ),
    [normalizedPlans, basePrice, currencyCode, customize.customCurrencyFormat],
  );
  const variant = TEMPLATE_TO_VARIANT[template] || "simple";

  const cardData = useMemo(
    () =>
      purchaseCards.find((c) => c.variant === variant) ||
      purchaseCards[0] ||
      null,
    [purchaseCards, variant],
  );

  const [selected, setSelected] = useState(
    customize.preselectSubscription ? "subscribe" : "onetime",
  );

  useEffect(() => {
    setSelected(customize.preselectSubscription ? "subscribe" : "onetime");
  }, [customize.preselectSubscription]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    const stillValid = cardData?.plans?.some((p) => p.id === selectedPlanId);

    if (!stillValid) {
      setSelectedPlanId(cardData?.plans?.[0]?.id || null);
    }
  }, [cardData]);

  const activePlan =
    cardData?.plans?.find((p) => p.id === selectedPlanId) ||
    cardData?.plans?.[0] ||
    null;

  // const handleSaveWidget = async () => {
  //   try {
  //     if (!widgetName.trim()) {
  //       alert("Widget name required");
  //       return;
  //     }
  //     if (!shop) {
  //       alert("Shop missing");
  //       return;
  //     }
  //     setSaving(true);
  //     const newWidgetId = generateWidgetId();

  //     const response = await fetch(`${API}/api/widgets`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "x-api-key": SECRET_KEY,
  //       },
  //       body: JSON.stringify({
  //         widgetId: newWidgetId,
  //         shop,
  //         widgetName,
  //         template,
  //         planId: selectedPlan,
  //         productId: previewProduct?.id || null,
  //          assignedPlanIds,
  //         customize,
  //       }),
  //     });

  //     const data = await response.json();
  //     console.log("vjhdhd", data)

  //     if (!response.ok || !data.success) {
  //       throw new Error(data.error || "Failed to create widget");
  //     }

  //     // console.log("Widget created:", data.widget);

  //     setTimeout(() => {
  //       navigate("/app/widgets");
  //     }, 2000);
  //     // navigate(`/app/widgets/${newWidgetId}`, {
  //     //   state: { widget: data.widget },
  //     // });
  //   } catch (error) {
  //     console.error("Save widget error:", error);
  //     alert(error.message || "Something went wrong");
  //   } finally {
  //     setSaving(false);
  //   }
  // };
  const handleSaveWidget = async () => {
    try {
      if (!widgetName.trim()) return alert("Widget name required");
      if (!shop) return alert("Shop missing");

      setSaving(true);
      const isEdit = Boolean(widgetId);
      const idToUse = widgetId || generateWidgetId();

      const response = await fetch(
        isEdit
          ? `${API}/api/widgets/${idToUse}?shop=${shop}`
          : `${API}/api/widgets`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": SECRET_KEY,
          },
          body: JSON.stringify({
            widgetId: idToUse,
            shop,
            widgetName,
            template,
            planId: selectedPlan,
            productId: previewProduct?.id || null,
            assignedPlanIds,
            customize,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(
          data.error || `Failed to ${isEdit ? "update" : "create"} widget`,
        );
      }
      console.log("dfjkdsfnjksdfn",data)
      setTimeout(() => navigate(`/app/widget/edit/${data.widget.widgetId}`), 1200);
    } catch (error) {
      console.error("Save widget error:", error);
      alert(error.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "10px",
      }}
    >
      {/* LEFT SIDE */}
      <WidgetSettingsCard
        widgetName={widgetName}
        onWidgetNameChange={setWidgetName}
        template={template}
        onTemplateChange={handleTemplateChange}
        customize={customize}
        onCustomizeChange={setCustomize}
        plans={plans}
        assignedPlanIds={assignedPlanIds}
        onAssignedPlanIdsChange={setAssignedPlanIds}
        showAssignedPlans={showAssignedPlans}
      />

      {/* RIGHT SIDE - PREVIEW */}
      <div style={{ width: "100%" }}>
        <Card>
          <h2>Preview</h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: 16,
            }}
          >
            {/* PLAN */}
            <div style={{ width: "100%" }}>
              <h2>Plan</h2>

              <Select
                label=""
                labelHidden
                options={planOptions}
                value={selectedPlan}
                onChange={setSelectedPlan}
              />
            </div>

            {/* PRODUCT */}
            <div style={{ width: "220px" }}>
              <h2>Product</h2>

              <div
                style={styles.productPickerField}
                onClick={handlePickPreviewProduct}
              >
                <span style={styles.productPickerText}>
                  {previewProduct?.title || "Select a product"}
                </span>
                <span>⌄</span>
              </div>
            </div>
          </div>

          {cardData ? (
            <>
              <div style={styles.wrapper}>
                <PurchaseOptionCard
                  data={cardData}
                  selected={selected}
                  activePlan={activePlan}
                  selectedPlanId={selectedPlanId}
                  onSelect={setSelected}
                  onSelectPlan={setSelectedPlanId}
                  customize={customize}
                />
              </div>

              <div style={{ paddingTop: " 10px" }}>
                <Button
                  variant="primary"
                  loading={saving}
                  disabled={saving}
                  onClick={handleSaveWidget}
                >
                  Save Widget
                </Button>
              </div>
            </>
          ) : (
            <p>No selling plans found for this plan/product to preview.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default CreateWidget;
