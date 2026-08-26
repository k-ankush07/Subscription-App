
// import React, { useCallback, useEffect, useState } from "react";
// import {
//   Page,
//   Card,
//   TextField,
//   Select,
//   Banner,
//   Checkbox,
//   Toast,
//   Frame,
//   Button,
//   Text,
// } from "@shopify/polaris";
// import { useFetcher, useNavigate } from "react-router";
// import Product from "./Product";
// import SellingPlan from "./SellingPlan";
// import PurchaseOptionCard from "./PurchaseOptionCard";
// import {
//   normalizeSellingPlan,
//   buildPurchaseCards,
// } from "../utils/purchaseCardHelpers";
// import { useAppBridge } from "@shopify/app-bridge-react";

// const TEMPLATE_TO_VARIANT = {
//   radio: "simple",
//   highlight: "detailed",
//   checkbox: "compact",
// };

// const defaultPlan = {
//   shopifySellingPlanId: null,
//   name: "",
//   billingType: "PAY_AS_YOU_GO",
//   intervalCount: 1,
//   interval: "MONTH",
//   billingFrequency: 1,
//   billingInterval: "MONTH",
//   giveSubscriptionDiscount: true,
//   discountValue: 10,
//   discountType: "PERCENTAGE",
//   changeDiscountAfterOrders: false,
//   afterDiscountValue: 0,
//   afterOrders: 1,
//   afterDiscountType: "PERCENTAGE",
//   minCycles: null,
//   maxCycles: null,
//   giveShippingDiscount: false,
//   shippingDiscountValue: 0,
//   shippingAfterOrders: 1,
//   shippingDiscountType: "PRICE",
//   changeQuantityAfterOrders: false,
//   quantityAfterOrdersValue: 1,
//   quantityAfterOrders: 1,
//   quantityProducts: [],
//   RemoveFreeProdcut: false,
//   removeFreeProducOrders: 1,
//   freeProducts: [],
//   Automation: false,
//   automationCycles: [],
//   MinimumQuanitity: false,
//   MinimumQuanitityValue: 1,
// };

// function normalizeSellingPlans(data) {
//   if (Array.isArray(data?.sellingPlans) && data.sellingPlans.length > 0) {
//     return data.sellingPlans;
//   }

//   if (data?.sellingPlan) {
//     const sp = data.sellingPlan;
//     return [
//       {
//         shopifySellingPlanId: sp.shopifySellingPlanId || null,
//         name: sp.name || "",
//         billingType: sp.billingType || "PAY_AS_YOU_GO",
//         intervalCount: sp.intervalCount || 1,
//         interval: sp.interval || "MONTH",
//         billingFrequency: sp.billingFrequency || 1,
//         billingInterval: sp.billingInterval || "MONTH",
//         giveSubscriptionDiscount: sp.giveSubscriptionDiscount ?? true,
//         discountValue: sp.discountValue || 10,
//         discountType: sp.discountType || "PERCENTAGE",
//         changeDiscountAfterOrders: sp.changeDiscountAfterOrders || false,
//         afterDiscountValue: sp.afterDiscountValue || 0,
//         afterOrders: sp.afterOrders || 1,
//         afterDiscountType: sp.afterDiscountType || "PERCENTAGE",
//         minCycles: sp.minCycles || null,
//         maxCycles: sp.maxCycles || null,
//         giveShippingDiscount: sp.giveShippingDiscount || false,
//         shippingDiscountValue: sp.shippingDiscountValue || 0,
//         shippingAfterOrders: sp.shippingAfterOrders || 1,
//         shippingDiscountType: sp.shippingDiscountType || "PRICE",
//         changeQuantityAfterOrders: sp.changeQuantityAfterOrders || false,
//         quantityAfterOrdersValue: sp.quantityAfterOrdersValue || 1,
//         quantityAfterOrders: sp.quantityAfterOrders || 1,
//         quantityProducts: sp.quantityProducts || [],
//         RemoveFreeProdcut: sp.RemoveFreeProdcut || false,
//         removeFreeProductOrders: sp.removeFreeProductOrders || 1,
//         freeProducts: sp.freeProducts?.flatMap((p) => p) || [],
//         MinimumQuanitity: sp.MinimumQuanitity || false,
//         MinimumQuanitityValue: sp.MinimumQuanitityValue || 1,
//         Automation: sp.Automation || false,
//         automationCycles: sp.automationCycles || [],
//       },
//     ];
//   }

//   return [{ ...defaultPlan }];
// }

// function Template({ shop, editPlandData, dublicateData, currencyCode = "INR" }) {
//   const shopify = useAppBridge();
//   const navigate = useNavigate();
//   const API = import.meta.env.VITE_API_URL;
//   const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
//   const fetcher = useFetcher();
//   const [toastActive, setToastActive] = useState(false);
//   const [toastMessage, setToastMessage] = useState("");
//   const [planId, setPlanId] = useState(editPlandData?.planId || null);
//   const [shopifyGroupId, setShopifyGroupId] = useState(null);
//   const [planName, setPlanName] = useState("Plan #1");
//   const [widget, setWidget] = useState();
//   const [allowProductSwaps, setAllowProductSwaps] = useState(true);
//   const [allowVariantChanges, setAllowVariantChanges] = useState(true);
//   const [allowQuantityChanges, setAllowQuantityChanges] = useState(true);
//   const [keepDiscounts, setKeepDiscounts] = useState(true);
//   const [selectedProducts, setSelectedProducts] = useState([]);
//   const [productError, setProductError] = useState(false);
//   const [sellingPlans, setSellingPlans] = useState([{ ...defaultPlan }]);
//   const [existingSellingPlanIds, setExistingSellingPlanIds] = useState([]);
//   const [planErrors, setPlanErrors] = useState({});
//   const [isPersisted, setIsPersisted] = useState(!!editPlandData);
//   const [planStatus, setPlanStatus] = useState(
//     editPlandData?.status || "draft",
//   );
//   const [initialSnapshot, setInitialSnapshot] = useState(null);

//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const isLoading = isSubmitting || fetcher.state !== "idle";

//   const [widgets, setWidgets] = useState([]);
//   const [widgetsLoading, setWidgetsLoading] = useState(true);
//   const [previewWidgetId, setPreviewWidgetId] = useState(null);
//   const [previewProductId, setPreviewProductId] = useState(null);
//   const [selectedPurchase, setSelectedPurchase] = useState("subscribe");
//   const [selectedPlanId, setSelectedPlanId] = useState(null);

//   useEffect(() => {
//     if (!shop) return;

//     const fetchWidgets = async () => {
//       try {
//         setWidgetsLoading(true);
//         const res = await fetch(
//           `http://localhost:5000/api/widgets?shop=${shop}`,
//           { headers: { "x-api-key": SECRET_KEY } },
//         );
//         const data = await res.json();
//         if (data.success) {
//           setWidgets(data.widgets || []);
//         }
//       } catch (err) {
//         console.error("Failed to fetch widgets:", err);
//       } finally {
//         setWidgetsLoading(false);
//       }
//     };

//     fetchWidgets();
//   }, [shop]);

//   const widgetOptions = React.useMemo(
//     () =>
//       widgets.map((w) => ({
//         label: w.widgetName || `Widget ${w.widgetId}`,
//         value: String(w.widgetId),
//       })),
//     [widgets],
//   );

//   useEffect(() => {
//     if (!previewWidgetId && widget) {
//       setPreviewWidgetId(String(widget));
//     }
//   }, [widget, previewWidgetId]);


//   const selectedWidgetData = React.useMemo(
//     () =>
//       widgets.find((w) => String(w.widgetId) === String(previewWidgetId)) ||
//       null,
//     [widgets, previewWidgetId],
//   );

//   const validateSellingPlans = (plans) => {
//     const newErrors = {};
//     const names = [];
//     const intervals = [];

//     plans.forEach((plan, index) => {
//       if (plan.name && names.includes(plan.name.trim())) {
//         newErrors[`name_${index}`] = "Plan name must be unique";
//       } else if (plan.name) {
//         names.push(plan.name.trim());
//       }

//       const combo = `${plan.intervalCount}_${plan.interval}`;
//       if (intervals.includes(combo)) {
//         newErrors[`interval_${index}`] =
//           "This delivery frequency already exists";
//       } else {
//         intervals.push(combo);
//       }

//       if (
//         plan.changeQuantityAfterOrders &&
//         (!plan.quantityProducts || plan.quantityProducts.length === 0)
//       ) {
//         newErrors[`quantityProduct_${index}`] =
//           `Plan #${index + 1}: select a product for "Change quantity after orders"`;
//       }

//       if (
//         plan.RemoveFreeProdcut &&
//         (!plan.freeProducts || plan.freeProducts.length === 0)
//       ) {
//         newErrors[`freeProduct_${index}`] =
//           `Plan #${index + 1}: select a product for "Remove free products"`;
//       }
//     });

//     setPlanErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSelectProduct = useCallback(async () => {
//     const selectionIds = selectedProducts.map((p) => ({
//       id: p.id,
//       variants: p.variants.map((v) => ({ id: v.variantsId })),
//     }));

//     const selected = await shopify.resourcePicker({
//       type: "product",
//       multiple: true,
//       action: "select",
//       selectionIds,
//     });

//     if (selected) {
//       setProductError(false);

//       const extractPrice = (product, variant) => {
//         const raw =
//           variant?.price ??
//           variant?.priceV2?.amount ??
//           variant?.compareAtPrice ??
//           product?.priceRangeV2?.minVariantPrice?.amount ??
//           product?.priceRange?.minVariantPrice?.amount ??
//           product?.variants?.[0]?.price ??
//           0;

//         const parsed = typeof raw === "string" ? parseFloat(raw) : Number(raw);
//         return Number.isFinite(parsed) ? parsed : 0;
//       };

//       const incoming = selected.map((product) => {
//         const selectedVariants = product.variants || [];
//         const firstVariant = selectedVariants[0];

//         return {
//           id: product.id,
//           title: product.title,
//           ProductImage: product.images?.[0]?.originalSrc,
//           selectedVariantCount: selectedVariants.length,
//           totalVariantCount: product.totalVariants || selectedVariants.length,
//           price: extractPrice(product, firstVariant),
//           variants: selectedVariants.map((variant) => ({
//             variantsId: variant.id,
//             variantsTitle: variant.title,
//             price: extractPrice(product, variant),
//           })),
//         };
//       });

//       setSelectedProducts((prev) => {
//         const incomingIds = new Set(incoming.map((p) => p.id));
//         const kept = prev.filter((p) => !incomingIds.has(p.id));
//         return [...kept, ...incoming];
//       });
//     }
//   }, [shopify, selectedProducts]);
//   useEffect(() => {
//     const missingPriceProducts = selectedProducts.filter(
//       (p) => p.price === undefined || p.price === null,
//     );

//     if (missingPriceProducts.length === 0 || !shop) return;

//     let cancelled = false;

//     const fetchMissingPrices = async () => {
//       try {
//         const ids = missingPriceProducts.map((p) => p.id);
//         const res = await fetch(`${API}/products/prices`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             "x-api-key": SECRET_KEY,
//           },
//           body: JSON.stringify({ shop, productIds: ids }),
//         });
//         const data = await res.json();
//         if (!data.success || cancelled) return;
//         setSelectedProducts((prev) =>
//           prev.map((p) =>
//             p.price === undefined || p.price === null
//               ? { ...p, price: data.prices?.[p.id] ?? 0 }
//               : p,
//           ),
//         );
//       } catch (err) {
//         console.error("Failed to fetch missing product prices:", err);
//       }
//     };

//     fetchMissingPrices();

//     return () => {
//       cancelled = true;
//     };
//   }, [selectedProducts, shop, API, SECRET_KEY]);

//   useEffect(() => {
//     const allowedIds = new Set(selectedProducts.map((p) => p.id));

//     setSellingPlans((prev) => {
//       let changed = false;

//       const updated = prev.map((plan) => {
//         const filteredQuantity = (plan.quantityProducts || []).filter((p) =>
//           allowedIds.has(p.id),
//         );
//         const filteredFree = (plan.freeProducts || []).filter((p) =>
//           allowedIds.has(p.id),
//         );

//         const quantityChanged =
//           filteredQuantity.length !== (plan.quantityProducts || []).length;
//         const freeChanged =
//           filteredFree.length !== (plan.freeProducts || []).length;

//         if (quantityChanged || freeChanged) {
//           changed = true;
//           return {
//             ...plan,
//             quantityProducts: filteredQuantity,
//             freeProducts: filteredFree,
//           };
//         }
//         return plan;
//       });

//       return changed ? updated : prev;
//     });
//   }, [selectedProducts]);

//   useEffect(() => {
//     const data = editPlandData || dublicateData;
//     if (!data) return;

//     setPlanName(data.planName || "");
//     setWidget(data.widget || "");
//     setSelectedProducts(data.products || []);
//     setShopifyGroupId(editPlandData ? editPlandData.shopifyGroupId : null);
//     setPlanStatus(editPlandData?.status || "draft");

//     const cpc = data.customerProductChanges;
//     setAllowProductSwaps(cpc?.allowProductSwaps ?? true);
//     setAllowVariantChanges(cpc?.allowVariantChanges ?? true);
//     setAllowQuantityChanges(cpc?.allowQuantityChanges ?? true);
//     setKeepDiscounts(cpc?.keepDiscounts ?? true);
//     const loadedSellingPlans = normalizeSellingPlans(data);
//     setSellingPlans(loadedSellingPlans);
//     const ids = loadedSellingPlans
//       .map((sp) => sp.shopifySellingPlanId)
//       .filter(Boolean);
//     setExistingSellingPlanIds(ids);
//   }, [editPlandData, dublicateData]);

//   useEffect(() => {
//     const data = editPlandData || dublicateData;

//     if (!data) {
//       setInitialSnapshot(
//         JSON.stringify({
//           planName: "Plan #1",
//           widget: "",
//           selectedProducts: [],
//           sellingPlans: [{ ...defaultPlan }],
//           allowProductSwaps: true,
//           allowVariantChanges: true,
//           allowQuantityChanges: true,
//           keepDiscounts: true,
//         }),
//       );
//       return;
//     }

//     const cpc = data.customerProductChanges;

//     setInitialSnapshot(
//       JSON.stringify({
//         planName: data.planName || "",
//         widget: data.widget || "",
//         selectedProducts: data.products || [],
//         sellingPlans: normalizeSellingPlans(data),
//         allowProductSwaps: cpc?.allowProductSwaps ?? true,
//         allowVariantChanges: cpc?.allowVariantChanges ?? true,
//         allowQuantityChanges: cpc?.allowQuantityChanges ?? true,
//         keepDiscounts: cpc?.keepDiscounts ?? true,
//       }),
//     );
//   }, [editPlandData, dublicateData]);

//   const buildCurrentState = useCallback(
//     () =>
//       JSON.stringify({
//         planName,
//         widget,
//         selectedProducts,
//         sellingPlans,
//         allowProductSwaps,
//         allowVariantChanges,
//         allowQuantityChanges,
//         keepDiscounts,
//       }),
//     [
//       planName,
//       widget,
//       selectedProducts,
//       sellingPlans,
//       allowProductSwaps,
//       allowVariantChanges,
//       allowQuantityChanges,
//       keepDiscounts,
//     ],
//   );

//   const isDirty =
//     initialSnapshot !== null && buildCurrentState() !== initialSnapshot;

//   const handleBack = () => {
//     navigate("/app/plans");
//   };

//   const handleSubmit = async (e, mode = "publish") => {
//     e?.preventDefault?.();

//     if (!isDirty) return;

//     if (selectedProducts.length === 0) return setProductError(true);
//     setProductError(false);
//     if (!validateSellingPlans(sellingPlans)) return;
//     setIsSubmitting(true);

//     const status = mode === "draft" ? "draft" : "published";

//     const payload = {
//       shop: shop || editPlandData?.shop || dublicateData?.shop,
//       planId,
//       planName,
//       widget,
//       products: selectedProducts,
//       sellingPlans,
//       status,
//       ...(editPlandData && { shopifyGroupId }),
//       ...(editPlandData && { existingSellingPlanIds }),
//       customerProductChanges: {
//         allowProductSwaps,
//         allowVariantChanges,
//         allowQuantityChanges,
//         keepDiscounts,
//       },
//     };
//     if (mode === "draft") {
//       const draftPlanId = planId || `draft_${Date.now()}`;
//       if (!planId) setPlanId(draftPlanId);

//       await saveToNodeAPI({ ...payload, planId: draftPlanId });
//       return;
//     }
//     fetcher.submit(payload, {
//       method: "POST",
//       encType: "application/json",
//     });
//   };

//   useEffect(() => {
//     if (fetcher.state === "idle" && fetcher.data) {
//       const actionData = fetcher.data;
//       console.log("Fetcher action data:", actionData);

//       if (!actionData.success) {
//         console.error("Shopify error:", actionData.error);
//         setIsSubmitting(false);
//         return;
//       }

//       const rawGroupId = actionData.shopifyGroupId || "";
//       const lastDigits = rawGroupId.split("/").pop();

//       const oldPlanId = planId;
//       const wasDraft = !!oldPlanId && oldPlanId.startsWith("draft_");

//       const newPlanId = !editPlandData || wasDraft ? lastDigits : oldPlanId;

//       if (!editPlandData || wasDraft) setPlanId(newPlanId);
//       const updatedSellingPlans = sellingPlans.map((plan, i) => ({
//         ...plan,
//         shopifySellingPlanId:
//           actionData.shopifySellingPlanIds?.[i] ||
//           actionData.shopifySellingPlanId ||
//           plan.shopifySellingPlanId,
//       }));

//       const payload = {
//         shop,
//         planId: newPlanId,
//         planName,
//         widget,
//         products: selectedProducts,
//         sellingPlans: updatedSellingPlans,
//         shopifyGroupId: actionData.shopifyGroupId,
//         status: "published",
//         customerProductChanges: {
//           allowProductSwaps,
//           allowVariantChanges,
//           allowQuantityChanges,
//           keepDiscounts,
//         },
//       };
//       saveToNodeAPI(payload, oldPlanId);
//     }
//   }, [fetcher.state, fetcher.data]);

//   const saveToNodeAPI = async (payload, lookupPlanId = payload.planId) => {
//     try {
//       const fixedSellingPlans = payload.sellingPlans.map((sp) => ({
//         ...sp,
//         name:
//           sp.name?.trim() ||
//           `Delivery: Every ${sp.intervalCount} ${sp.interval.toLowerCase()}`,
//       }));
//       const finalPayload = {
//         ...payload,
//         sellingPlans: fixedSellingPlans,
//       };
//       const url = isPersisted
//         ? `${API}/plans/update/${lookupPlanId}`
//         : `${API}/plans/create`;
//       const method = isPersisted ? "PUT" : "POST";

//       const response = await fetch(url, {
//         method,
//         headers: {
//           "Content-Type": "application/json",
//           "x-api-key": SECRET_KEY,
//         },
//         body: JSON.stringify(finalPayload),
//       });
//       const data = await response.json();
//       console.log("Node API response:", data);

//       if (data.success === true) {
//         setIsPersisted(true);
//         setPlanStatus(payload.status || "draft");
//         setInitialSnapshot(buildCurrentState());
//         setToastMessage(data.message);
//         setToastActive(true);
//         navigate("/app/plans", { replace: true });
//       }
//     } catch (err) {
//       console.error("Node API error:", err);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const showCustomerChanges =
//     allowProductSwaps ||
//     allowVariantChanges ||
//     allowQuantityChanges ||
//     keepDiscounts;

//   const diablecheck =
//     !allowProductSwaps && !allowVariantChanges && !allowQuantityChanges;

//   useEffect(() => {
//     if (diablecheck) {
//       setKeepDiscounts(false);
//     }
//   }, [diablecheck]);

//   const allPlanErrorMessages = Object.values(planErrors);
//   const hasAnyError = productError || allPlanErrorMessages.length > 0;

//   const assignedWidgetData = React.useMemo(
//     () => widgets.find((w) => String(w.widgetId) === String(widget)) || null,
//     [widgets, widget],
//   );

//   const previewProductOptions = React.useMemo(
//     () =>
//       selectedProducts.map((p) => ({
//         label: p.title,
//         value: p.id,
//       })),
//     [selectedProducts],
//   );

//   useEffect(() => {
//     if (!previewProductId && selectedProducts.length > 0) {
//       setPreviewProductId(selectedProducts[0].id);
//       return;
//     }
//     if (
//       previewProductId &&
//       !selectedProducts.some((p) => p.id === previewProductId)
//     ) {
//       setPreviewProductId(selectedProducts[0]?.id || null);
//     }
//   }, [selectedProducts, previewProductId]);

//   const previewProduct = React.useMemo(() => {
//     const p = selectedProducts.find((sp) => sp.id === previewProductId);
//     if (!p) return null;

//     const price = Number(
//       p.price ?? p.minPrice ?? p?.priceRangeV2?.minVariantPrice?.amount ?? 0,
//     );

//     return {
//       id: p.id,
//       title: p.title,
//       image: p.ProductImage || null,
//       price,
//     };
//   }, [selectedProducts, previewProductId]);

//   const basePrice = Number(previewProduct?.price) || 0;

//   const normalizedPlans = React.useMemo(() => {
//     if (!sellingPlans?.length) return [];

//     return sellingPlans.map((sp) =>
//       normalizeSellingPlan(
//         sp,
//         basePrice,
//         currencyCode,
//         selectedWidgetData?.customize?.customCurrencyFormat,
//       ),
//     );
//   }, [sellingPlans, basePrice, currencyCode, selectedWidgetData]);

//   const purchaseCards = React.useMemo(
//     () =>
//       buildPurchaseCards(
//         normalizedPlans,
//         basePrice,
//         currencyCode,
//         selectedWidgetData?.customize?.customCurrencyFormat,
//       ),
//     [normalizedPlans, basePrice, currencyCode, selectedWidgetData],
//   );

//   const previewVariant =
//     TEMPLATE_TO_VARIANT[selectedWidgetData?.template] || "simple";

//   const cardData = React.useMemo(
//     () =>
//       purchaseCards.find((c) => c.variant === previewVariant) ||
//       purchaseCards[0] ||
//       null,
//     [purchaseCards, previewVariant],
//   );

//   useEffect(() => {
//     const stillValid = cardData?.plans?.some((p) => p.id === selectedPlanId);
//     if (!stillValid) {
//       setSelectedPlanId(cardData?.plans?.[0]?.id || null);
//     }
//   }, [cardData]);

//   const activePlan =
//     cardData?.plans?.find((p) => p.id === selectedPlanId) ||
//     cardData?.plans?.[0] ||
//     null;

//   return (
//     <Frame>
//       {toastActive && (
//         <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
//       )}
//       <Page
//         title={
//           editPlandData
//             ? `Edit: ${planName || "subscription plan"}`
//             : dublicateData
//               ? `Duplicate ${planName || "subscription Plan"}`
//               : "Create subscription plan"
//         }
//         backAction={{ content: "Plans", onAction: handleBack }}
//         primaryAction={{
//           content: editPlandData ? "Update" : "Publish",
//           onAction: (e) => handleSubmit(e, "publish"),
//           disabled: !isDirty || isLoading,
//           loading: isLoading,
//         }}
//         secondaryActions={
//           planStatus === "published"
//             ? []
//             : [
//                 {
//                   content: "Save as draft",
//                   onAction: () => handleSubmit(null, "draft"),
//                   disabled: !isDirty || isLoading,
//                   loading: isLoading,
//                 },
//               ]
//         }
//       >
//         {hasAnyError && (
//           <Banner tone="critical" title="Validation error">
//             <ul style={{ margin: 0, paddingLeft: "20px" }}>
//               {productError && <li>Please select at least one product.</li>}
//               {allPlanErrorMessages.map((msg, i) => (
//                 <li key={i}>{msg}</li>
//               ))}
//             </ul>
//           </Banner>
//         )}

//         <div
//           style={{
//             display: "flex",
//             gap: "16px",
//             alignItems: "flex-start",
//           }}
//         >
//           <div style={{ flex: 1, minWidth: 0 }}>
//             <Card>
//               <form onSubmit={(e) => handleSubmit(e, "publish")}>
//                 <TextField
//                   label="Plan name (internal)"
//                   value={planName}
//                   onChange={setPlanName}
//                   helpText="For your reference only"
//                 />
//                 <Select
//                   label="Widget assigned"
//                   options={
//                     widgetOptions.length > 0
//                       ? widgetOptions
//                       : [
//                           {
//                             label: widgetsLoading
//                               ? "Loading widgets..."
//                               : "No widgets found",
//                             value: "",
//                           },
//                         ]
//                   }
//                   value={widget}
//                   onChange={setWidget}
//                   helpText=" If you don't have any widgets yet, please create at least one widget first, and then create a plan"
//                   disabled={widgetsLoading || widgetOptions.length === 0}
//                 />
//                 <Card>
//                   <Product
//                     selectedProducts={selectedProducts}
//                     setSelectedProducts={setSelectedProducts}
//                     editPlandData={editPlandData}
//                     shop={shop}
//                     productError={productError}
//                   />
//                   <Button onClick={handleSelectProduct}>
//                     {selectedProducts.length > 0
//                       ? "Add more products"
//                       : "Select products"}
//                   </Button>
//                 </Card>
//               </form>

//               {/* sellingPlans array pass karo */}
//               <SellingPlan
//                 selectedProducts={selectedProducts}
//                 sellingPlans={sellingPlans}
//                 setSellingPlans={setSellingPlans}
//                 defaultPlan={defaultPlan}
//                 planErrors={planErrors}
//                 validateSellingPlans={validateSellingPlans}
//               />

//               <Card>
//                 <h2>Customer product changes</h2>
//                 <div>
//                   <Checkbox
//                     label="Allow product swaps"
//                     checked={allowProductSwaps}
//                     onChange={setAllowProductSwaps}
//                   />
//                   <p>
//                     {allowProductSwaps
//                       ? "Customers will be able to swap their current product to a different product in this selling plan group via the customer portal."
//                       : "Customers won't be able to swap their product to a different product in the customer portal."}
//                   </p>
//                 </div>
//                 <div>
//                   <Checkbox
//                     label="Allow variant changes"
//                     checked={allowVariantChanges}
//                     onChange={setAllowVariantChanges}
//                   />
//                   <p>
//                     {allowVariantChanges
//                       ? "Customers will be able to change to a different variant of the same product (e.g., size, color)."
//                       : "Customers won't be able to change the product variant in the customer portal."}
//                   </p>
//                 </div>
//                 <div>
//                   <Checkbox
//                     label="Allow quantity changes"
//                     checked={allowQuantityChanges}
//                     onChange={setAllowQuantityChanges}
//                   />
//                   <p>
//                     {allowQuantityChanges
//                       ? "Customers will be able to change the quantity of their subscription items."
//                       : "Customers won't be able to change the quantity of their subscription items."}
//                   </p>
//                 </div>
//                 <div>
//                   <Checkbox
//                     label="Keep discounts on product changes"
//                     disabled={diablecheck}
//                     checked={keepDiscounts}
//                     onChange={setKeepDiscounts}
//                   />
//                   <p>
//                     {keepDiscounts
//                       ? "Discounts and pricing policies will be preserved when customers swap products, change variants, or adjust quantities."
//                       : "Existing discounts and pricing policies will not carry over - the current product price will apply."}
//                   </p>
//                 </div>
//               </Card>
//             </Card>

//             <Card>
//               <h2>Summary</h2>
//               <p>Widget: {assignedWidgetData?.widgetName || widget}</p>
//               <p>
//                 {selectedProducts.length === 0
//                   ? ""
//                   : selectedProducts.length === 1
//                     ? selectedProducts[0].title
//                     : `${selectedProducts.length} products`}
//               </p>
//               {showCustomerChanges && (
//                 <>
//                   <Text as="h2" variant="headingMd">
//                     Customer product changes
//                   </Text>
//                   {allowProductSwaps && <p>Allow product swaps</p>}
//                   {allowVariantChanges && <p>Allow variant changes</p>}
//                   {allowQuantityChanges && <p>Allow quantity changes</p>}
//                   {keepDiscounts && <p>Keep discounts on product changes</p>}
//                 </>
//               )}
//             </Card>
//           </div>

//           <div style={{ width: "420px", flexShrink: 0 }}>
//             <Card>
//               <h2>Preview</h2>

//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   gap: "10px",
//                   marginBottom: 16,
//                 }}
//               >
//                 <div style={{ width: "100%", minWidth: 0 }}>
//                   <Select
//                     label="Widget"
//                     options={
//                       widgetOptions.length > 0
//                         ? widgetOptions
//                         : [{ label: "No widgets found", value: "" }]
//                     }
//                     value={previewWidgetId || ""}
//                     onChange={setPreviewWidgetId}
//                   />
//                 </div>

//                 <div style={{ width: "100%", minWidth: 0 }}>
//                   <Select
//                     label="Product"
//                     options={
//                       previewProductOptions.length > 0
//                         ? previewProductOptions
//                         : [{ label: "Select products first", value: "" }]
//                     }
//                     value={previewProductId || ""}
//                     onChange={setPreviewProductId}
//                     disabled={previewProductOptions.length === 0}
//                   />
//                 </div>
//               </div>

//               {cardData ? (
//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     background: "#f1f1f1",
//                     padding: 24,
//                     borderRadius: 12,
//                   }}
//                 >
//                   <PurchaseOptionCard
//                     data={cardData}
//                     selected={selectedPurchase}
//                     activePlan={activePlan}
//                     selectedPlanId={selectedPlanId}
//                     onSelect={setSelectedPurchase}
//                     onSelectPlan={setSelectedPlanId}
//                     customize={selectedWidgetData?.customize || {}}
//                   />
//                 </div>
//               ) : (
//                 <p>
//                 </p>
//               )}
//             </Card>
//           </div>
//         </div>
//       </Page>
//     </Frame>
//   );
// }

// export default Template;


import React, { useCallback, useEffect, useState } from "react";
import {
  Page,
  Card,
  TextField,
  Select,
  Banner,
  Checkbox,
  Toast,
  Frame,
  Button,
  Text,
} from "@shopify/polaris";
import { useFetcher, useNavigate } from "react-router";
import Product from "./Product";
import SellingPlan from "./SellingPlan";
import PurchaseOptionCard from "./PurchaseOptionCard";
import {
  normalizeSellingPlan,
  buildPurchaseCards,
} from "../utils/purchaseCardHelpers";
import { useAppBridge } from "@shopify/app-bridge-react";

const TEMPLATE_TO_VARIANT = {
  radio: "simple",
  highlight: "detailed",
  checkbox: "compact",
};

const defaultPlan = {
  shopifySellingPlanId: null,
  name: "",
  billingType: "PAY_AS_YOU_GO",
  intervalCount: 1,
  interval: "MONTH",
  billingFrequency: 1,
  billingInterval: "MONTH",
  giveSubscriptionDiscount: true,
  discountValue: 10,
  discountType: "PERCENTAGE",
  changeDiscountAfterOrders: false,
  afterDiscountValue: 0,
  afterOrders: 1,
  afterDiscountType: "PERCENTAGE",
  minCycles: null,
  maxCycles: null,
  giveShippingDiscount: false,
  shippingDiscountValue: 0,
  shippingAfterOrders: 1,
  shippingDiscountType: "PRICE",
  changeQuantityAfterOrders: false,
  quantityAfterOrdersValue: 1,
  quantityAfterOrders: 1,
  quantityProducts: [],
  RemoveFreeProdcut: false,
  removeFreeProducOrders: 1,
  freeProducts: [],
  Automation: false,
  automationCycles: [],
  MinimumQuanitity: false,
  MinimumQuanitityValue: 1,
};

function normalizeSellingPlans(data) {
  if (Array.isArray(data?.sellingPlans) && data.sellingPlans.length > 0) {
    return data.sellingPlans;
  }

  if (data?.sellingPlan) {
    const sp = data.sellingPlan;
    return [
      {
        shopifySellingPlanId: sp.shopifySellingPlanId || null,
        name: sp.name || "",
        billingType: sp.billingType || "PAY_AS_YOU_GO",
        intervalCount: sp.intervalCount || 1,
        interval: sp.interval || "MONTH",
        billingFrequency: sp.billingFrequency || 1,
        billingInterval: sp.billingInterval || "MONTH",
        giveSubscriptionDiscount: sp.giveSubscriptionDiscount ?? true,
        discountValue: sp.discountValue || 10,
        discountType: sp.discountType || "PERCENTAGE",
        changeDiscountAfterOrders: sp.changeDiscountAfterOrders || false,
        afterDiscountValue: sp.afterDiscountValue || 0,
        afterOrders: sp.afterOrders || 1,
        afterDiscountType: sp.afterDiscountType || "PERCENTAGE",
        minCycles: sp.minCycles || null,
        maxCycles: sp.maxCycles || null,
        giveShippingDiscount: sp.giveShippingDiscount || false,
        shippingDiscountValue: sp.shippingDiscountValue || 0,
        shippingAfterOrders: sp.shippingAfterOrders || 1,
        shippingDiscountType: sp.shippingDiscountType || "PRICE",
        changeQuantityAfterOrders: sp.changeQuantityAfterOrders || false,
        quantityAfterOrdersValue: sp.quantityAfterOrdersValue || 1,
        quantityAfterOrders: sp.quantityAfterOrders || 1,
        quantityProducts: sp.quantityProducts || [],
        RemoveFreeProdcut: sp.RemoveFreeProdcut || false,
        removeFreeProductOrders: sp.removeFreeProductOrders || 1,
        freeProducts: sp.freeProducts?.flatMap((p) => p) || [],
        MinimumQuanitity: sp.MinimumQuanitity || false,
        MinimumQuanitityValue: sp.MinimumQuanitityValue || 1,
        Automation: sp.Automation || false,
        automationCycles: sp.automationCycles || [],
      },
    ];
  }

  return [{ ...defaultPlan }];
}

function Template({ shop, editPlandData, dublicateData, currencyCode = "INR" }) {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
  const fetcher = useFetcher();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [planId, setPlanId] = useState(editPlandData?.planId || null);
  const [shopifyGroupId, setShopifyGroupId] = useState(null);
  const [planName, setPlanName] = useState("Plan #1");
  const [widget, setWidget] = useState();
  const [allowProductSwaps, setAllowProductSwaps] = useState(true);
  const [allowVariantChanges, setAllowVariantChanges] = useState(true);
  const [allowQuantityChanges, setAllowQuantityChanges] = useState(true);
  const [keepDiscounts, setKeepDiscounts] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productError, setProductError] = useState(false);
  const [sellingPlans, setSellingPlans] = useState([{ ...defaultPlan }]);
  const [existingSellingPlanIds, setExistingSellingPlanIds] = useState([]);
  const [planErrors, setPlanErrors] = useState({});
  const [isPersisted, setIsPersisted] = useState(!!editPlandData);
  const [planStatus, setPlanStatus] = useState(
    editPlandData?.status || "draft",
  );
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tracks WHICH button triggered the submit ("draft" | "publish" | null),
  // so we can show the loading spinner only on the button that was actually clicked.
  const [activeAction, setActiveAction] = useState(null);
  const isLoading = isSubmitting || fetcher.state !== "idle";

  const [widgets, setWidgets] = useState([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [previewWidgetId, setPreviewWidgetId] = useState(null);
  const [previewProductId, setPreviewProductId] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState("subscribe");
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  useEffect(() => {
    if (!shop) return;

    const fetchWidgets = async () => {
      try {
        setWidgetsLoading(true);
        const res = await fetch(
          `http://localhost:5000/api/widgets?shop=${shop}`,
          { headers: { "x-api-key": SECRET_KEY } },
        );
        const data = await res.json();
        if (data.success) {
          setWidgets(data.widgets || []);
        }
      } catch (err) {
        console.error("Failed to fetch widgets:", err);
      } finally {
        setWidgetsLoading(false);
      }
    };

    fetchWidgets();
  }, [shop]);

  const widgetOptions = React.useMemo(
    () =>
      widgets.map((w) => ({
        label: w.widgetName || `Widget ${w.widgetId}`,
        value: String(w.widgetId),
      })),
    [widgets],
  );

  // Auto-select the first widget for a brand new plan (not edit/duplicate)
  // once the widgets list has finished loading and nothing is selected yet.
  useEffect(() => {
    if (
      !widgetsLoading &&
      widgetOptions.length > 0 &&
      !editPlandData &&
      !dublicateData &&
      !widget
    ) {
      setWidget(widgetOptions[0].value);
    }
  }, [widgetsLoading, widgetOptions, editPlandData, dublicateData, widget]);

  useEffect(() => {
    if (!previewWidgetId && widget) {
      setPreviewWidgetId(String(widget));
    }
  }, [widget, previewWidgetId]);


  const selectedWidgetData = React.useMemo(
    () =>
      widgets.find((w) => String(w.widgetId) === String(previewWidgetId)) ||
      null,
    [widgets, previewWidgetId],
  );

  const validateSellingPlans = (plans) => {
    const newErrors = {};
    const names = [];
    const intervals = [];

    plans.forEach((plan, index) => {
      if (plan.name && names.includes(plan.name.trim())) {
        newErrors[`name_${index}`] = "Plan name must be unique";
      } else if (plan.name) {
        names.push(plan.name.trim());
      }

      const combo = `${plan.intervalCount}_${plan.interval}`;
      if (intervals.includes(combo)) {
        newErrors[`interval_${index}`] =
          "This delivery frequency already exists";
      } else {
        intervals.push(combo);
      }

      if (
        plan.changeQuantityAfterOrders &&
        (!plan.quantityProducts || plan.quantityProducts.length === 0)
      ) {
        newErrors[`quantityProduct_${index}`] =
          `Plan #${index + 1}: select a product for "Change quantity after orders"`;
      }

      if (
        plan.RemoveFreeProdcut &&
        (!plan.freeProducts || plan.freeProducts.length === 0)
      ) {
        newErrors[`freeProduct_${index}`] =
          `Plan #${index + 1}: select a product for "Remove free products"`;
      }
    });

    setPlanErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectProduct = useCallback(async () => {
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
      setProductError(false);

      const extractPrice = (product, variant) => {
        const raw =
          variant?.price ??
          variant?.priceV2?.amount ??
          variant?.compareAtPrice ??
          product?.priceRangeV2?.minVariantPrice?.amount ??
          product?.priceRange?.minVariantPrice?.amount ??
          product?.variants?.[0]?.price ??
          0;

        const parsed = typeof raw === "string" ? parseFloat(raw) : Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const incoming = selected.map((product) => {
        const selectedVariants = product.variants || [];
        const firstVariant = selectedVariants[0];

        return {
          id: product.id,
          title: product.title,
          ProductImage: product.images?.[0]?.originalSrc,
          selectedVariantCount: selectedVariants.length,
          totalVariantCount: product.totalVariants || selectedVariants.length,
          price: extractPrice(product, firstVariant),
          variants: selectedVariants.map((variant) => ({
            variantsId: variant.id,
            variantsTitle: variant.title,
            price: extractPrice(product, variant),
          })),
        };
      });

      setSelectedProducts((prev) => {
        const incomingIds = new Set(incoming.map((p) => p.id));
        const kept = prev.filter((p) => !incomingIds.has(p.id));
        return [...kept, ...incoming];
      });
    }
  }, [shopify, selectedProducts]);
  useEffect(() => {
    const missingPriceProducts = selectedProducts.filter(
      (p) => p.price === undefined || p.price === null,
    );

    if (missingPriceProducts.length === 0 || !shop) return;

    let cancelled = false;

    const fetchMissingPrices = async () => {
      try {
        const ids = missingPriceProducts.map((p) => p.id);
        const res = await fetch(`${API}/products/prices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": SECRET_KEY,
          },
          body: JSON.stringify({ shop, productIds: ids }),
        });
        const data = await res.json();
        if (!data.success || cancelled) return;
        setSelectedProducts((prev) =>
          prev.map((p) =>
            p.price === undefined || p.price === null
              ? { ...p, price: data.prices?.[p.id] ?? 0 }
              : p,
          ),
        );
      } catch (err) {
        console.error("Failed to fetch missing product prices:", err);
      }
    };

    fetchMissingPrices();

    return () => {
      cancelled = true;
    };
  }, [selectedProducts, shop, API, SECRET_KEY]);

  useEffect(() => {
    const allowedIds = new Set(selectedProducts.map((p) => p.id));

    setSellingPlans((prev) => {
      let changed = false;

      const updated = prev.map((plan) => {
        const filteredQuantity = (plan.quantityProducts || []).filter((p) =>
          allowedIds.has(p.id),
        );
        const filteredFree = (plan.freeProducts || []).filter((p) =>
          allowedIds.has(p.id),
        );

        const quantityChanged =
          filteredQuantity.length !== (plan.quantityProducts || []).length;
        const freeChanged =
          filteredFree.length !== (plan.freeProducts || []).length;

        if (quantityChanged || freeChanged) {
          changed = true;
          return {
            ...plan,
            quantityProducts: filteredQuantity,
            freeProducts: filteredFree,
          };
        }
        return plan;
      });

      return changed ? updated : prev;
    });
  }, [selectedProducts]);

  useEffect(() => {
    const data = editPlandData || dublicateData;
    if (!data) return;

    setPlanName(data.planName || "");
    setWidget(data.widget || "");
    setSelectedProducts(data.products || []);
    setShopifyGroupId(editPlandData ? editPlandData.shopifyGroupId : null);
    setPlanStatus(editPlandData?.status || "draft");

    const cpc = data.customerProductChanges;
    setAllowProductSwaps(cpc?.allowProductSwaps ?? true);
    setAllowVariantChanges(cpc?.allowVariantChanges ?? true);
    setAllowQuantityChanges(cpc?.allowQuantityChanges ?? true);
    setKeepDiscounts(cpc?.keepDiscounts ?? true);
    const loadedSellingPlans = normalizeSellingPlans(data);
    setSellingPlans(loadedSellingPlans);
    const ids = loadedSellingPlans
      .map((sp) => sp.shopifySellingPlanId)
      .filter(Boolean);
    setExistingSellingPlanIds(ids);
  }, [editPlandData, dublicateData]);

  useEffect(() => {
    const data = editPlandData || dublicateData;

    if (!data) {
      setInitialSnapshot(
        JSON.stringify({
          planName: "Plan #1",
          widget: "",
          selectedProducts: [],
          sellingPlans: [{ ...defaultPlan }],
          allowProductSwaps: true,
          allowVariantChanges: true,
          allowQuantityChanges: true,
          keepDiscounts: true,
        }),
      );
      return;
    }

    const cpc = data.customerProductChanges;

    setInitialSnapshot(
      JSON.stringify({
        planName: data.planName || "",
        widget: data.widget || "",
        selectedProducts: data.products || [],
        sellingPlans: normalizeSellingPlans(data),
        allowProductSwaps: cpc?.allowProductSwaps ?? true,
        allowVariantChanges: cpc?.allowVariantChanges ?? true,
        allowQuantityChanges: cpc?.allowQuantityChanges ?? true,
        keepDiscounts: cpc?.keepDiscounts ?? true,
      }),
    );
  }, [editPlandData, dublicateData]);

  const buildCurrentState = useCallback(
    () =>
      JSON.stringify({
        planName,
        widget,
        selectedProducts,
        sellingPlans,
        allowProductSwaps,
        allowVariantChanges,
        allowQuantityChanges,
        keepDiscounts,
      }),
    [
      planName,
      widget,
      selectedProducts,
      sellingPlans,
      allowProductSwaps,
      allowVariantChanges,
      allowQuantityChanges,
      keepDiscounts,
    ],
  );

  const isDirty =
    initialSnapshot !== null && buildCurrentState() !== initialSnapshot;

  const handleBack = () => {
    navigate("/app/plans");
  };

  const handleSubmit = async (e, mode = "publish") => {
    e?.preventDefault?.();

    if (!isDirty) return;

    if (selectedProducts.length === 0) return setProductError(true);
    setProductError(false);
    if (!validateSellingPlans(sellingPlans)) return;
    setActiveAction(mode);
    setIsSubmitting(true);

    const status = mode === "draft" ? "draft" : "published";

    const payload = {
      shop: shop || editPlandData?.shop || dublicateData?.shop,
      planId,
      planName,
      widget,
      products: selectedProducts,
      sellingPlans,
      status,
      ...(editPlandData && { shopifyGroupId }),
      ...(editPlandData && { existingSellingPlanIds }),
      customerProductChanges: {
        allowProductSwaps,
        allowVariantChanges,
        allowQuantityChanges,
        keepDiscounts,
      },
    };
    if (mode === "draft") {
      const draftPlanId = planId || `draft_${Date.now()}`;
      if (!planId) setPlanId(draftPlanId);

      await saveToNodeAPI({ ...payload, planId: draftPlanId });
      return;
    }
    fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const actionData = fetcher.data;
      console.log("Fetcher action data:", actionData);

      if (!actionData.success) {
        console.error("Shopify error:", actionData.error);
        setIsSubmitting(false);
        setActiveAction(null);
        return;
      }

      const rawGroupId = actionData.shopifyGroupId || "";
      const lastDigits = rawGroupId.split("/").pop();

      const oldPlanId = planId;
      const wasDraft = !!oldPlanId && oldPlanId.startsWith("draft_");

      const newPlanId = !editPlandData || wasDraft ? lastDigits : oldPlanId;

      if (!editPlandData || wasDraft) setPlanId(newPlanId);
      const updatedSellingPlans = sellingPlans.map((plan, i) => ({
        ...plan,
        shopifySellingPlanId:
          actionData.shopifySellingPlanIds?.[i] ||
          actionData.shopifySellingPlanId ||
          plan.shopifySellingPlanId,
      }));

      const payload = {
        shop,
        planId: newPlanId,
        planName,
        widget,
        products: selectedProducts,
        sellingPlans: updatedSellingPlans,
        shopifyGroupId: actionData.shopifyGroupId,
        status: "published",
        customerProductChanges: {
          allowProductSwaps,
          allowVariantChanges,
          allowQuantityChanges,
          keepDiscounts,
        },
      };
      saveToNodeAPI(payload, oldPlanId);
    }
  }, [fetcher.state, fetcher.data]);

  const saveToNodeAPI = async (payload, lookupPlanId = payload.planId) => {
    try {
      const fixedSellingPlans = payload.sellingPlans.map((sp) => ({
        ...sp,
        name:
          sp.name?.trim() ||
          `Delivery: Every ${sp.intervalCount} ${sp.interval.toLowerCase()}`,
      }));
      const finalPayload = {
        ...payload,
        sellingPlans: fixedSellingPlans,
      };
      const url = isPersisted
        ? `${API}/plans/update/${lookupPlanId}`
        : `${API}/plans/create`;
      const method = isPersisted ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify(finalPayload),
      });
      const data = await response.json();
      console.log("Node API response:", data);

      if (data.success === true) {
        setIsPersisted(true);
        setPlanStatus(payload.status || "draft");
        setInitialSnapshot(buildCurrentState());
        setToastMessage(data.message);
        setToastActive(true);
        navigate("/app/plans", { replace: true });
      }
    } catch (err) {
      console.error("Node API error:", err);
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  const showCustomerChanges =
    allowProductSwaps ||
    allowVariantChanges ||
    allowQuantityChanges ||
    keepDiscounts;

  const diablecheck =
    !allowProductSwaps && !allowVariantChanges && !allowQuantityChanges;

  useEffect(() => {
    if (diablecheck) {
      setKeepDiscounts(false);
    }
  }, [diablecheck]);

  const allPlanErrorMessages = Object.values(planErrors);
  const hasAnyError = productError || allPlanErrorMessages.length > 0;

  const assignedWidgetData = React.useMemo(
    () => widgets.find((w) => String(w.widgetId) === String(widget)) || null,
    [widgets, widget],
  );

  const previewProductOptions = React.useMemo(
    () =>
      selectedProducts.map((p) => ({
        label: p.title,
        value: p.id,
      })),
    [selectedProducts],
  );

  useEffect(() => {
    if (!previewProductId && selectedProducts.length > 0) {
      setPreviewProductId(selectedProducts[0].id);
      return;
    }
    if (
      previewProductId &&
      !selectedProducts.some((p) => p.id === previewProductId)
    ) {
      setPreviewProductId(selectedProducts[0]?.id || null);
    }
  }, [selectedProducts, previewProductId]);

  const previewProduct = React.useMemo(() => {
    const p = selectedProducts.find((sp) => sp.id === previewProductId);
    if (!p) return null;

    const price = Number(
      p.price ?? p.minPrice ?? p?.priceRangeV2?.minVariantPrice?.amount ?? 0,
    );

    return {
      id: p.id,
      title: p.title,
      image: p.ProductImage || null,
      price,
    };
  }, [selectedProducts, previewProductId]);

  const basePrice = Number(previewProduct?.price) || 0;

  const normalizedPlans = React.useMemo(() => {
    if (!sellingPlans?.length) return [];

    return sellingPlans.map((sp) =>
      normalizeSellingPlan(
        sp,
        basePrice,
        currencyCode,
        selectedWidgetData?.customize?.customCurrencyFormat,
      ),
    );
  }, [sellingPlans, basePrice, currencyCode, selectedWidgetData]);

  const purchaseCards = React.useMemo(
    () =>
      buildPurchaseCards(
        normalizedPlans,
        basePrice,
        currencyCode,
        selectedWidgetData?.customize?.customCurrencyFormat,
      ),
    [normalizedPlans, basePrice, currencyCode, selectedWidgetData],
  );

  const previewVariant =
    TEMPLATE_TO_VARIANT[selectedWidgetData?.template] || "simple";

  const cardData = React.useMemo(
    () =>
      purchaseCards.find((c) => c.variant === previewVariant) ||
      purchaseCards[0] ||
      null,
    [purchaseCards, previewVariant],
  );

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

  return (
    <Frame>
      {toastActive && (
        <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
      )}
      <Page
        title={
          editPlandData
            ? `Edit: ${planName || "subscription plan"}`
            : dublicateData
              ? `Duplicate ${planName || "subscription Plan"}`
              : "Create subscription plan"
        }
        backAction={{ content: "Plans", onAction: handleBack }}
        primaryAction={{
          content: editPlandData ? "Update" : "Publish",
          onAction: (e) => handleSubmit(e, "publish"),
          disabled: !isDirty || isLoading,
          loading: isLoading && activeAction === "publish",
        }}
        secondaryActions={
          planStatus === "published"
            ? []
            : [
                {
                  content: "Save as draft",
                  onAction: () => handleSubmit(null, "draft"),
                  disabled: !isDirty || isLoading,
                  loading: isLoading && activeAction === "draft",
                },
              ]
        }
      >
        {hasAnyError && (
          <Banner tone="critical" title="Validation error">
            <ul style={{ margin: 0, paddingLeft: "20px" }}>
              {productError && <li>Please select at least one product.</li>}
              {allPlanErrorMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </Banner>
        )}

        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Card>
              <form onSubmit={(e) => handleSubmit(e, "publish")}>
                <TextField
                  label="Plan name (internal)"
                  value={planName}
                  onChange={setPlanName}
                  helpText="For your reference only"
                />
                <Select
                  label="Widget assigned"
                  options={
                    widgetOptions.length > 0
                      ? widgetOptions
                      : [
                          {
                            label: widgetsLoading
                              ? "Loading widgets..."
                              : "No widgets found",
                            value: "",
                          },
                        ]
                  }
                  value={widget}
                  onChange={setWidget}
                  helpText=" If you don't have any widgets yet, please create at least one widget first, and then create a plan"
                  disabled={widgetsLoading || widgetOptions.length === 0}
                />
                <Card>
                  <Product
                    selectedProducts={selectedProducts}
                    setSelectedProducts={setSelectedProducts}
                    editPlandData={editPlandData}
                    shop={shop}
                    productError={productError}
                  />
                  <Button onClick={handleSelectProduct}>
                    {selectedProducts.length > 0
                      ? "Add more products"
                      : "Select products"}
                  </Button>
                </Card>
              </form>

              {/* sellingPlans array pass karo */}
              <SellingPlan
                selectedProducts={selectedProducts}
                sellingPlans={sellingPlans}
                setSellingPlans={setSellingPlans}
                defaultPlan={defaultPlan}
                planErrors={planErrors}
                validateSellingPlans={validateSellingPlans}
              />

              <Card>
                <h2>Customer product changes</h2>
                <div>
                  <Checkbox
                    label="Allow product swaps"
                    checked={allowProductSwaps}
                    onChange={setAllowProductSwaps}
                  />
                  <p>
                    {allowProductSwaps
                      ? "Customers will be able to swap their current product to a different product in this selling plan group via the customer portal."
                      : "Customers won't be able to swap their product to a different product in the customer portal."}
                  </p>
                </div>
                <div>
                  <Checkbox
                    label="Allow variant changes"
                    checked={allowVariantChanges}
                    onChange={setAllowVariantChanges}
                  />
                  <p>
                    {allowVariantChanges
                      ? "Customers will be able to change to a different variant of the same product (e.g., size, color)."
                      : "Customers won't be able to change the product variant in the customer portal."}
                  </p>
                </div>
                <div>
                  <Checkbox
                    label="Allow quantity changes"
                    checked={allowQuantityChanges}
                    onChange={setAllowQuantityChanges}
                  />
                  <p>
                    {allowQuantityChanges
                      ? "Customers will be able to change the quantity of their subscription items."
                      : "Customers won't be able to change the quantity of their subscription items."}
                  </p>
                </div>
                <div>
                  <Checkbox
                    label="Keep discounts on product changes"
                    disabled={diablecheck}
                    checked={keepDiscounts}
                    onChange={setKeepDiscounts}
                  />
                  <p>
                    {keepDiscounts
                      ? "Discounts and pricing policies will be preserved when customers swap products, change variants, or adjust quantities."
                      : "Existing discounts and pricing policies will not carry over - the current product price will apply."}
                  </p>
                </div>
              </Card>
            </Card>

            <Card>
              <h2>Summary</h2>
              <p>Widget: {assignedWidgetData?.widgetName || widget}</p>
              <p>
                {selectedProducts.length === 0
                  ? ""
                  : selectedProducts.length === 1
                    ? selectedProducts[0].title
                    : `${selectedProducts.length} products`}
              </p>
              {showCustomerChanges && (
                <>
                  <Text as="h2" variant="headingMd">
                    Customer product changes
                  </Text>
                  {allowProductSwaps && <p>Allow product swaps</p>}
                  {allowVariantChanges && <p>Allow variant changes</p>}
                  {allowQuantityChanges && <p>Allow quantity changes</p>}
                  {keepDiscounts && <p>Keep discounts on product changes</p>}
                </>
              )}
            </Card>
          </div>

          <div style={{ width: "420px", flexShrink: 0 }}>
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
                <div style={{ width: "100%", minWidth: 0 }}>
                  <Select
                    label="Widget"
                    options={
                      widgetOptions.length > 0
                        ? widgetOptions
                        : [{ label: "No widgets found", value: "" }]
                    }
                    value={previewWidgetId || ""}
                    onChange={setPreviewWidgetId}
                  />
                </div>

                <div style={{ width: "100%", minWidth: 0 }}>
                  <Select
                    label="Product"
                    options={
                      previewProductOptions.length > 0
                        ? previewProductOptions
                        : [{ label: "Select products first", value: "" }]
                    }
                    value={previewProductId || ""}
                    onChange={setPreviewProductId}
                    disabled={previewProductOptions.length === 0}
                  />
                </div>
              </div>

              {cardData ? (
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
                    selected={selectedPurchase}
                    activePlan={activePlan}
                    selectedPlanId={selectedPlanId}
                    onSelect={setSelectedPurchase}
                    onSelectPlan={setSelectedPlanId}
                    customize={selectedWidgetData?.customize || {}}
                  />
                </div>
              ) : (
                <p>
                </p>
              )}
            </Card>
          </div>
        </div>
      </Page>
    </Frame>
  );
}

export default Template;