import React, { useEffect, useState } from "react";
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
} from "@shopify/polaris";
import { useFetcher, useNavigate } from "react-router";
import Product from "./Product";
import SellingPlan from "./SellingPlan";

function Template({ shop, editPlandData, dublicateData }) {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const fetcher = useFetcher();

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [planId, setPlanId] = useState(editPlandData?.planId || null);
  const [shopifyGroupId, setShopifyGroupId] = useState(null); //  state mein

  const [planName, setPlanName] = useState("Plan #1");
  const [widget, setWidget] = useState("widget1");
  const [allowProductSwaps, setAllowProductSwaps] = useState(true);
  const [allowVariantChanges, setAllowVariantChanges] = useState(true);
  const [allowQuantityChanges, setAllowQuantityChanges] = useState(true);
  const [keepDiscounts, setKeepDiscounts] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productError, setProductError] = useState(false);
  const [sellingPlan, setSellingPlan] = useState({
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
  });

  useEffect(() => {
    const data = editPlandData || dublicateData;
    if (!data) return;

    setPlanName(data.planName || "");
    setWidget(data.widget || "");
    setSelectedProducts(data.products || []);

    //  sirf edit case mein shopifyGroupId set karo
    setShopifyGroupId(editPlandData ? editPlandData.shopifyGroupId : null);

    const cpc = data.customerProductChanges;
    setAllowProductSwaps(cpc?.allowProductSwaps ?? true);
    setAllowVariantChanges(cpc?.allowVariantChanges ?? true);
    setAllowQuantityChanges(cpc?.allowQuantityChanges ?? true);
    setKeepDiscounts(cpc?.keepDiscounts ?? true);

    const newSellingPlan = {
      name: data.sellingPlan?.name || "",
      billingType: data.sellingPlan?.billingType || "PAY_AS_YOU_GO",
      intervalCount: data.sellingPlan?.intervalCount || 1,
      interval: data.sellingPlan?.interval || "MONTH",

      billingFrequency: data.sellingPlan?.billingFrequency || 1,
      billingInterval: data.sellingPlan?.billingInterval || "MONTH",

      giveSubscriptionDiscount:
        data.sellingPlan?.giveSubscriptionDiscount || true,
      discountValue: data.sellingPlan?.discountValue || 10,
      discountType: data.sellingPlan?.discountType || "PERCENTAGE",
      changeDiscountAfterOrders: data.sellingPlan?.changeDiscountAfterOrders || false,
      afterDiscountValue: data.sellingPlan?.afterDiscountValue || 0,
      afterOrders:  data.sellingPlan?.afterOrders ||1,
      afterDiscountType:  data.sellingPlan?.afterDiscountType ||"PERCENTAGE",

      minCycles: data.sellingPlan?.minCycles || null,
      maxCycles: data.sellingPlan?.maxCycles || null,
    };

    setSellingPlan(newSellingPlan);
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
      sellingPlan,
      //  sirf edit case mein shopifyGroupId bhejo
      ...(editPlandData && { shopifyGroupId }),
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

      //  edit pe planId same, create/duplicate pe naya
      const newPlanId = editPlandData ? planId : lastDigits;
      if (!editPlandData) setPlanId(newPlanId);

      const payload = {
        shop,
        planId: newPlanId,
        planName,
        widget,
        products: selectedProducts,
        sellingPlan,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log("Node API response:", data);
      console.log("Node API response:", data);
      if (data.success === true) {
        setToastMessage(data.message);
        setToastActive(true);

        // navigate(`/app/plan/${data.data.planId}`);
        navigate("/app/plans", { replace: true });
      }
    } catch (err) {
      console.error("Node API error:", err);
    }
  };

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
            <FormLayout>
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
              <Product
                selectedProducts={selectedProducts}
                setSelectedProducts={setSelectedProducts}
                setProductError={setProductError}
                productError={productError}
              />
            </FormLayout>
          </form>

          <SellingPlan
            sellingPlan={sellingPlan}
            setSellingPlan={setSellingPlan}
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
        </Card>
      </Page>
    </Frame>
  );
}

export default Template;
