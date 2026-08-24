// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import { Card, Select, TextField, BlockStack, Button } from "@shopify/polaris";
// import { useAppBridge } from "@shopify/app-bridge-react";

// const styles = {
//   productPickerField: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     gap: 8,
//     border: "1px solid #c9cccf",
//     borderRadius: 8,
//     padding: "8px 12px",
//     cursor: "pointer",
//     background: "#fff",
//   },
//   productPickerText: {
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//     whiteSpace: "nowrap",
//     fontSize: 14,
//   },
// };
// const API = import.meta.env.VITE_API_URL;
// const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
// function CreateWidget({ plans = [], shop }) {
//   const shopify = useAppBridge();

//   const [widgetName, setWidgetName] = useState("Widgets #");
//   const [template, setTemplate] = useState("radio");

//   const [selectedPlan, setSelectedPlan] = useState("");

//   const templateOptions = [
//     { label: "Radio button", value: "radio" },
//     { label: "Highlight", value: "highlight" },
//     { label: "Checkbox", value: "checkbox" },
//   ];

//   const planOptions = useMemo(
//     () =>
//       plans.map((plan) => ({
//         label: plan.planName,
//         value: plan.planId,
//       })),
//     [plans],
//   );

//   const selectedPlanData = useMemo(() => {
//     return (
//       plans.find((plan) => plan.planId === selectedPlan) || plans[0] || null
//     );
//   }, [plans, selectedPlan]);

//   useEffect(() => {
//     if (!selectedPlan && planOptions.length > 0) {
//       setSelectedPlan(planOptions[0].value);
//     }
//   }, [planOptions, selectedPlan]);

//   const [previewProduct, setPreviewProduct] = useState(null);

//   useEffect(() => {
//     const first = selectedPlanData?.products?.[0];

//     if (!first) {
//       setPreviewProduct(null);
//       return;
//     }

//     setPreviewProduct({
//       id: first.id,
//       title: first.title || first.name || "Untitled product",
//     });
//   }, [selectedPlanData]);

//   const handlePickPreviewProduct = useCallback(async () => {
//     const selected = await shopify.resourcePicker({
//       type: "product",
//       multiple: false,
//       action: "select",
//       filter: {
//         variants: false,
//       },
//     });

//     if (selected && selected[0]) {
//       const product = selected[0];

//       setPreviewProduct({
//         id: product.id,
//         title: product.title,
//       });
//     }
//   }, [shopify]);

//   const handleSaveWidget = async () => {
//     try {
//       if (!widgetName.trim()) {
//         alert("Widget name required");
//         return;
//       }

//       if (!shop) {
//         alert("Shop missing");
//         return;
//       }

//       const response = await fetch(`${API}/api/widgets`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": SECRET_KEY,
//         },
//         body: JSON.stringify({
//           shop,
//           widgetName,
//           template,
//         }),
//       });

//       const data = await response.json();

//       if (!response.ok || !data.success) {
//         throw new Error(data.error || "Failed to create widget");
//       }

//       console.log("Widget created:", data.widget);

//       alert("Widget saved successfully!");
//     } catch (error) {
//       console.error("Save widget error:", error);
//       alert(error.message || "Something went wrong");
//     }
//   };
//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         gap: "10px",
//       }}
//     >
//       {/* LEFT SIDE */}
//       <div style={{ width: "100%" }}>
//         <Card>
//           <BlockStack gap="400">
//             <TextField
//               label="Widget name (internal)"
//               value={widgetName}
//               onChange={setWidgetName}
//               placeholder="For your reference only"
//               autoComplete="off"
//             />

//             <Select
//               label="Widget template"
//               options={templateOptions}
//               value={template}
//               onChange={setTemplate}
//             />
//           </BlockStack>
//         </Card>
//         <div style={{ paddingTop: "10px" }}>
//           <Button variant="primary" onClick={handleSaveWidget}>
//             Save Widget
//           </Button>
//         </div>
//       </div>

//       {/* RIGHT SIDE - PREVIEW */}
//       <div style={{ width: "100%" }}>
//         <Card>
//           <h2>Preview</h2>

//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               gap: "10px",
//             }}
//           >
//             {/* PLAN */}
//             <div style={{ width: "100%" }}>
//               <h2>Plan</h2>

//               <Select
//                 label=""
//                 labelHidden
//                 options={planOptions}
//                 value={selectedPlan}
//                 onChange={setSelectedPlan}
//               />
//             </div>

//             {/* PRODUCT */}
//             <div style={{ width: "220px" }}>
//               <h2>Product</h2>

//               <div
//                 style={styles.productPickerField}
//                 onClick={handlePickPreviewProduct}
//               >
//                 <span style={styles.productPickerText}>
//                   {previewProduct?.title || "Select a product"}
//                 </span>
//                 <span>⌄</span>
//               </div>
//             </div>
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// }

// export default CreateWidget;


import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Select, TextField, BlockStack, Button } from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import PurchaseOptionCard from "./PurchaseOptionCard";
import {
  normalizeSellingPlan,
  buildPurchaseCards,
} from "../utils/purchaseCardHelpers";

const styles = {
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

const TEMPLATE_OPTIONS = [
  { label: "Radio button", value: "radio" },
  { label: "Highlight", value: "highlight" },
  { label: "Checkbox", value: "checkbox" },
];

// "template" (what the Select shows) <-> "variant" (what PurchaseOptionCard
// switches on) are just two names for the same 3 layouts.
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

// initialVariant/initialPlanId/initialProduct come from whatever card was
// chosen on the Widgets2 page (via navigate state) - they just seed the
// pickers below; after that, Plan / Product / Widget template all drive the
// live preview independently.
function CreateWidget({
  plans = [],
  shop,
  currencyCode = "USD",
  initialVariant = null,
  initialPlanId = null,
  initialProduct = null,
}) {
  const shopify = useAppBridge();

  const [widgetName, setWidgetName] = useState("Widgets #");
  const [template, setTemplate] = useState(
    VARIANT_TO_TEMPLATE[initialVariant] || "radio",
  );

  const [selectedPlan, setSelectedPlan] = useState(initialPlanId || "");

  const planOptions = useMemo(
    () =>
      plans.map((plan) => ({
        label: plan.planName,
        value: plan.planId,
      })),
    [plans],
  );

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

  const [previewProduct, setPreviewProduct] = useState(initialProduct || null);

  // Auto-fill the preview product from the selected plan's first product
  // whenever the plan changes - but don't stomp on a product that was
  // seeded in from the Widgets2 "Choose" click on first render.
  const skipNextAutoFill = useRef(Boolean(initialProduct));

  useEffect(() => {
    if (skipNextAutoFill.current) {
      skipNextAutoFill.current = false;
      return;
    }

    const first = selectedPlanData?.products?.[0];

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
      title: first.title || first.name || "Untitled product",
      image: first.ProductImage || null,
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

  // --- Live card preview, rebuilt from Plan + Product + Widget template ---
  const basePrice = Number(previewProduct?.price) || 0;

  const normalizedPlans = useMemo(() => {
    if (!selectedPlanData?.sellingPlans) {
      return [];
    }

    return selectedPlanData.sellingPlans.map((sp) =>
      normalizeSellingPlan(sp, basePrice, currencyCode),
    );
  }, [selectedPlanData, basePrice, currencyCode]);

  const purchaseCards = useMemo(
    () => buildPurchaseCards(normalizedPlans, basePrice, currencyCode),
    [normalizedPlans, basePrice, currencyCode],
  );

  const variant = TEMPLATE_TO_VARIANT[template] || "simple";

  const cardData = useMemo(
    () => purchaseCards.find((c) => c.variant === variant) || purchaseCards[0] || null,
    [purchaseCards, variant],
  );

  const [selected, setSelected] = useState("subscribe");
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // Keep the chosen selling plan valid whenever the available plans change
  // (new product/plan picked, or template swapped to a card with different ids).
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

  const handleSaveWidget = async () => {
    try {
      if (!widgetName.trim()) {
        alert("Widget name required");
        return;
      }

      if (!shop) {
        alert("Shop missing");
        return;
      }

      const response = await fetch(`${API}/api/widgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify({
          shop,
          widgetName,
          template,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create widget");
      }

      console.log("Widget created:", data.widget);

      alert("Widget saved successfully!");
    } catch (error) {
      console.error("Save widget error:", error);
      alert(error.message || "Something went wrong");
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
      <div style={{ width: "100%" }}>
        <Card>
          <BlockStack gap="400">
            <TextField
              label="Widget name (internal)"
              value={widgetName}
              onChange={setWidgetName}
              placeholder="For your reference only"
              autoComplete="off"
            />

            <Select
              label="Widget template"
              options={TEMPLATE_OPTIONS}
              value={template}
              onChange={setTemplate}
            />
          </BlockStack>
        </Card>
        <div style={{ paddingTop: "10px" }}>
          <Button variant="primary" onClick={handleSaveWidget}>
            Save Widget
          </Button>
        </div>
      </div>

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
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PurchaseOptionCard
                data={cardData}
                selected={selected}
                activePlan={activePlan}
                selectedPlanId={selectedPlanId}
                onSelect={setSelected}
                onSelectPlan={setSelectedPlanId}
              />
            </div>
          ) : (
            <p>No selling plans found for this plan/product to preview.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default CreateWidget;