import React, { useEffect, useState } from "react";
import {
  Card,
  Select,
  TextField,
  BlockStack,
  Button,
  Spinner,
  Page,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import PurchaseOptionCard from "./PurchaseOptionCard";
import {
  normalizeSellingPlan,
  buildPurchaseCards,
} from "../utils/purchaseCardHelpers";
import { useLocation, useNavigate, useParams } from "react-router";
import WidgetSettingsCard from "./WidgetSettingsCard";
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

function EditWidget({ plans = [], shop, currencyCode = "USD" }) {
  const { widgetId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const [loading, setLoading] = useState(true);
  const [widgetName, setWidgetName] = useState("");
  const [template, setTemplate] = useState("radio");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [previewProduct, setPreviewProduct] = useState(null);

  useEffect(() => {
    const fromState = location.state?.widget;

    if (fromState) {
      hydrateFromWidget(fromState);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API}/api/widgets/${widgetId}`, {
          headers: { "x-api-key": SECRET_KEY },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load widget");
        }
        hydrateFromWidget(data.widget);
      } catch (err) {
        console.error("Load widget error:", err);
        alert(err.message || "Could not load widget");
      } finally {
        setLoading(false);
      }
    })();
  }, [widgetId]);

  function hydrateFromWidget(widget) {
    setWidgetName(widget.widgetName || "");
    setTemplate(
      VARIANT_TO_TEMPLATE[widget.variant] || widget.template || "radio",
    );
    setSelectedPlan(widget.planId || "");
    if (widget.product) {
      setPreviewProduct(widget.product);
    }
  }

  const handlePickPreviewProduct = async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",
      filter: { variants: false },
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
  };

  const backAction =()=>
  {
    navigate("/app/widgets")
  }
  const planOptions = plans.map((p) => ({
    label: p.planName,
    value: p.planId,
  }));
  const selectedPlanData =
    plans.find((p) => p.planId === selectedPlan) || plans[0] || null;

  const basePrice = Number(previewProduct?.price) || 0;
  const normalizedPlans = (selectedPlanData?.sellingPlans || []).map((sp) =>
    normalizeSellingPlan(sp, basePrice, currencyCode),
  );
  const purchaseCards = buildPurchaseCards(
    normalizedPlans,
    basePrice,
    currencyCode,
  );
  const variant = TEMPLATE_TO_VARIANT[template] || "simple";
  const cardData =
    purchaseCards.find((c) => c.variant === variant) ||
    purchaseCards[0] ||
    null;

  const [selected, setSelected] = useState("subscribe");
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    const stillValid = cardData?.plans?.some((p) => p.id === selectedPlanId);
    if (!stillValid) setSelectedPlanId(cardData?.plans?.[0]?.id || null);
  }, [cardData]);

  const activePlan =
    cardData?.plans?.find((p) => p.id === selectedPlanId) ||
    cardData?.plans?.[0] ||
    null;

  const handleUpdateWidget = async () => {
    try {
      if (!widgetName.trim()) {
        alert("Widget name required");
        return;
      }
      const response = await fetch(`${API}/api/widgets/${widgetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify({
          shop,
          widgetName,
          template,
          planId: selectedPlan,
          productId: previewProduct?.id || null,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to update widget");
      }

      alert("Widget updated successfully!");
      navigate(`/app/widgets-v2/${widgetId}`, {
        state: { widget: data.widget },
      });
    } catch (error) {
      console.error("Update widget error:", error);
      alert(error.message || "Something went wrong");
    }
  };

  if (loading)
    return <Spinner accessibilityLabel="Loading widget" size="large" />;

  return (
  <Page
  title="Widgets Edit Page"
  backAction={backAction}
  >
      <div
      style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}
    >
      <WidgetSettingsCard
        widgetName={widgetName}
        onWidgetNameChange={setWidgetName}
        template={template}
        onTemplateChange={setTemplate}
        showTemplate={false}
      />

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
            <div style={{ width: "220px" }}>
              <h2>Product</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  border: "1px solid #c9cccf",
                  borderRadius: 8,
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: "#fff",
                }}
                onClick={handlePickPreviewProduct}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 14,
                  }}
                >
                  {previewProduct?.title || "Select a product"}
                </span>
                <span>⌄</span>
              </div>
            </div>
          </div>

          {cardData ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  background: "#f1f1f1",
                  padding: 24,
                  borderRadius: 12,
                }}
              >
                <PurchaseOptionCard
                  data={cardData}
                  selected={selected}
                  activePlan={activePlan}
                  selectedPlanId={selectedPlanId}
                  onSelect={setSelected}
                  onSelectPlan={setSelectedPlanId}
                />
              </div>
              <div style={{ paddingTop: "10px" }}>
                <Button variant="primary" onClick={handleUpdateWidget}>
                  Update Widget
                </Button>
              </div>
            </>
          ) : (
            <p>No selling plans found for this plan/product to preview.</p>
          )}
        </Card>
      </div>
    </div>

  </Page>
  );
}

export default EditWidget;
