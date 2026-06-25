import React, { useCallback, useEffect, useState } from "react";
import {
  Page,
  Card,
  FormLayout,
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
import { useAppBridge } from "@shopify/app-bridge-react";

//  defaultPlan component ke bahar — stable reference, re-render pe recreate nahi hoga
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
  removeFreeProductValue: 1,
  freeProducts: [],
  MinimumQuanitity: false,
  MinimumQuanitityValue: 1,
  Automation: false,
  automationCycles: [],
};



function Template({ shop, editPlandData, dublicateData }) {
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY
  const fetcher = useFetcher();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [planId, setPlanId] = useState(editPlandData?.planId || null);
  const [shopifyGroupId, setShopifyGroupId] = useState(null);
  const [planName, setPlanName] = useState("Plan #1");
  const [widget, setWidget] = useState("widget1");
  const [allowProductSwaps, setAllowProductSwaps] = useState(true);
  const [allowVariantChanges, setAllowVariantChanges] = useState(true);
  const [allowQuantityChanges, setAllowQuantityChanges] = useState(true);
  const [keepDiscounts, setKeepDiscounts] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productError, setProductError] = useState(false);
  //  Array of selling plans
  const [sellingPlans, setSellingPlans] = useState([{ ...defaultPlan }]);
  //  Edit load hote waqt jo IDs DB mein thi — delete detect karne ke liye
  const [existingSellingPlanIds, setExistingSellingPlanIds] = useState([]);

  //  Product picker handler
  const handleSelectProduct = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: selectedProducts.map((p) => ({ id: p.id })),
    });

    if (selected) {
      setProductError(false);
      const incoming = selected.map((product) => {
        const selectedVariants = product.variants || [];
        return {
          id: product.id,
          title: product.title,
          ProductImage: product.images?.[0]?.originalSrc,
          selectedVariantCount: selectedVariants.length,
          totalVariantCount: product.totalVariants || selectedVariants.length,
          variants: selectedVariants.map((variant) => ({
            variantsId: variant.id,
            variantsTitle: variant.title,
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

  //  Edit / Duplicate data load — sellingPlans array mein set karo
  useEffect(() => {
    const data = editPlandData || dublicateData;
    if (!data) return;

    setPlanName(data.planName || "");
    setWidget(data.widget || "");
    setSelectedProducts(data.products || []);
    setShopifyGroupId(editPlandData ? editPlandData.shopifyGroupId : null);

    const cpc = data.customerProductChanges;
    setAllowProductSwaps(cpc?.allowProductSwaps ?? true);
    setAllowVariantChanges(cpc?.allowVariantChanges ?? true);
    setAllowQuantityChanges(cpc?.allowQuantityChanges ?? true);
    setKeepDiscounts(cpc?.keepDiscounts ?? true);
// selling plan araay me aye to okh brna object me aye to use array me convert kro 
    if (Array.isArray(data.sellingPlans) && data.sellingPlans.length > 0) {
      setSellingPlans(data.sellingPlans);
      // delete detect karne ke liye
      setExistingSellingPlanIds(
        data.sellingPlans
          .map((sp) => sp.shopifySellingPlanId)
          .filter(Boolean)
      );
    } else if (data.sellingPlan) {
      const sp = data.sellingPlan;
      setSellingPlans([
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
          removeFreeProductValue: sp.removeFreeProductValue || 1,
          freeProducts: sp.freeProducts?.flatMap((p) => p) || [],
          MinimumQuanitity: sp.MinimumQuanitity || false,
          MinimumQuanitityValue: sp.MinimumQuanitityValue || 1,
          Automation: sp.Automation || false,
          automationCycles : sp.automationCycles || [],
        },
      ]);
      // Purane single plan ki ID 
      if (sp.shopifySellingPlanId) {
        setExistingSellingPlanIds([sp.shopifySellingPlanId]);
      }
    }
  }, [editPlandData, dublicateData]);

  const handleBack = () => {
    navigate("/app/plans");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) return setProductError(true);
    setProductError(false);


    const payload = {
      shop: shop || editPlandData?.shop || dublicateData?.shop,
      planId,
      planName,
      widget,
      products: selectedProducts,
      sellingPlans,
      ...(editPlandData && { shopifyGroupId }),
      ...(editPlandData && { existingSellingPlanIds }),
      customerProductChanges: {
        allowProductSwaps,
        allowVariantChanges,
        allowQuantityChanges,
        keepDiscounts,
      },
    };

    fetcher.submit(payload, {
      method: "POST",
      encType: "application/json",
    });
  };

  //  Fetcher response handle
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      const actionData = fetcher.data;
      console.log("Fetcher action data:", actionData);

      if (!actionData.success) {
        console.error("Shopify error:", actionData.error);
        return;
      }

      const rawGroupId = actionData.shopifyGroupId || "";
      const lastDigits = rawGroupId.split("/").pop();

      const newPlanId = editPlandData ? planId : lastDigits;
      if (!editPlandData) setPlanId(newPlanId);

      //  sellingPlans array ke har plan mein shopifySellingPlanId update karo
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
        sellingPlans: updatedSellingPlans,   //  array
        shopifyGroupId: actionData.shopifyGroupId,
        customerProductChanges: {
          allowProductSwaps,
          allowVariantChanges,
          allowQuantityChanges,
          keepDiscounts,
        },
      };

      saveToNodeAPI(payload);
    }
  }, [fetcher.state, fetcher.data]);

  const saveToNodeAPI = async (payload) => {
    try {
      const url = editPlandData
        ? `${API}/plans/update/${payload.planId}`
        : `${API}/plans/create`;
      const method = editPlandData ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log("Node API response:", data);

      if (data.success === true) {
        setToastMessage(data.message);
        setToastActive(true);
        navigate("/app/plans", { replace: true });
      }
    } catch (err) {
      console.error("Node API error:", err);
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
          onAction: handleSubmit,
        }}
      >
        {productError && (
          <Banner tone="critical" title="Validation error">
            <p>Please select at least one product.</p>
          </Banner>
        )}

        <Card>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Plan name (internal)"
              value={planName}
              onChange={setPlanName}
              helpText="For your reference only"
            />
            <Select
              label="Widget assigned"
              options={[
                { label: "Widget 1", value: "widget1" },
                { label: "Widget 2", value: "widget2" },
                { label: "Widget 3", value: "widget3" },
                { label: "Widget 4", value: "widget4" },
              ]}
              value={widget}
              onChange={setWidget}
              helpText="Will be visible for customers on the product page"
            />
            <Card>
              {/* {selectedProducts.length === 0 ? null : ( */}
                <Product
                  selectedProducts={selectedProducts}
                  setSelectedProducts={setSelectedProducts}
                  editPlandData={editPlandData}
                  shop={shop}
                  productError={productError}
                />
              {/* )} */}
              <Button onClick={handleSelectProduct}>
                {selectedProducts.length > 0
                  ? "Add more products"
                  : "Select products"}
              </Button>
            </Card>
          </form>

          {/*  sellingPlans array pass karo */}
          <SellingPlan
            selectedProducts={selectedProducts}
            sellingPlans={sellingPlans}
            setSellingPlans={setSellingPlans}
            defaultPlan={defaultPlan}
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
          <p>Widget: {widget}</p>
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
      </Page>
    </Frame>
  );
}

export default Template;