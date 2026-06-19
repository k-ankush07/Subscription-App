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
import { useNavigate } from "react-router";
import Product from "./Product";
function Template({ shop, editPlandData }) {
  const navigate = useNavigate();
  const API = import.meta.env.VITE_API_URL;
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const PlandId = editPlandData?.PlandId || Date.now();
  // const PlandId = editPlandData?.PlandId || Date.now();
  const [planName, setPlanName] = useState("Plan #1");
  const [widget, setWidget] = useState("widget1");

  //customer prodcut chnages checkbox check uncheck
  const [allowProductSwaps, setAllowProductSwaps] = useState(true);
  const [allowVariantChanges, setAllowVariantChanges] = useState(true);
  const [allowQuantityChanges, setAllowQuantityChanges] = useState(true);
  const [keepDiscounts, setKeepDiscounts] = useState(true);

  //prodcut seleect in product page
  const [selectedProducts, setSelectedProducts] = useState([]);
  //prodcut error id not product select then publish
  const [productError, setProductError] = useState(false);

  useEffect(() => {
    if (editPlandData) {
      setPlanName(editPlandData.planName || "");
      setWidget(editPlandData.widget || "");
      setSelectedProducts(editPlandData.products || []);

      setAllowProductSwaps(
        editPlandData.customerProductChanges?.allowProductSwaps ?? true,
      );
      setAllowVariantChanges(
        editPlandData.customerProductChanges?.allowVariantChanges ?? true,
      );
      setAllowQuantityChanges(
        editPlandData.customerProductChanges?.allowQuantityChanges ?? true,
      );
      setKeepDiscounts(
        editPlandData.customerProductChanges?.keepDiscounts ?? true,
      );
    }
  }, [editPlandData]);

  const handleBack = () => {
    setTimeout(() => {
      navigate("/app/plans");
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) return setProductError(true);
    setProductError(false);
    const payload = {
      shop: shop || editPlandData?.shop,
      PlandId,
      planName,
      widget,
      products: selectedProducts,
      customerProductChanges: {
        allowProductSwaps,
        allowVariantChanges,
        allowQuantityChanges,
        keepDiscounts,
      },
    };
    const url = editPlandData
      ? `${API}/plans/update/${PlandId}`
      : `${API}/plans/create`;

    const method = editPlandData ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success === true) {
        setToastMessage(editPlandData ? data.message : data.message);
        setToastActive(true);
        setTimeout(() => {
          navigate(`/app/plan/${PlandId}`);
        }, 2000);
      }
      console.log("data", data);
    } catch (error) {
      console.error("Error:", error);
    }

    console.log(payload);

    localStorage.setItem("users", JSON.stringify(payload));
  };

  return (
    <>
      <Frame>
        {toastActive && (
          <Toast
            content={toastMessage}
            onDismiss={() => setToastActive(false)}
          />
        )}
        <Page
          title={
            editPlandData
              ? `Edit: ${planName || "subscription plan"}`
              : "Create subscription plan"
          }
          backAction={{
            content: "Plans",
            onAction: handleBack,
          }}
          primaryAction={{
            content: editPlandData ? "Update" : " Publish",
            onAction: handleSubmit,
          }}
          // secondaryActions={[
          //   {
          //     content: "Save as a draft",
          //   },
          // ]}
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

            {/* customer prodcut changes */}
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
                    ? " Customers will be able to change to a different variant of the same product (e.g., size, color)."
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
                    : "Customers won't be able to change the quantity of their subscription items."}{" "}
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

          {/* Summary side  */}

          <Card>
            <h2>Summary</h2>
            <p> Widget: {widget}</p>
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
    </>
  );
}

export default Template;
