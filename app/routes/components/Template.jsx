import React, { useEffect, useState } from "react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  Banner,
  Checkbox,
} from "@shopify/polaris";
import { useNavigate } from "react-router";
import Product from "./Product";
function Template({shop}) {
  const navigate = useNavigate();
  const API= import.meta.env.VITE_API_URL
  const PlandId= Date.now();
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

  const handleBack = () => {
    navigate("/app/plans");
  };

  const handleSubmit =  async (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) return setProductError(true);
    setProductError(false);
    const payload = {
      shop,
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
    try {
      const response= await fetch(`${API}/plans/create`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify(payload)
      })
      const data= await response.json();
      if(data.success===true){
       setTimeout(()=>
      {
         navigate("/app/plans")
      },2000)
      }
      console.log("data", data)
    } catch (error) {
       console.error("Error:", error);
    }

    console.log(payload);

    localStorage.setItem("users", JSON.stringify(payload));
  };

  return (
    <>
      <Page
        title={planName ?  planName : "Create subscription plan"}
        backAction={{
          content: "Plans",
          onAction: handleBack,
        }}
        primaryAction={{
          content: "Publish",
          onAction: handleSubmit,
        }}
        secondaryActions={[
          {
            content: "Save as a draft",
          },
        ]}
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
              <p>{allowProductSwaps
      ? "Customers will be able to swap their current product to a different product in this selling plan group via the customer portal."
      : "Customers won't be able to swap their product to a different product in the customer portal."}</p>   
            </div>
            <div>
             <Checkbox
          label="Allow variant changes"
          checked={allowVariantChanges}
          onChange={setAllowVariantChanges}
        />
              <p>
                {
                  allowVariantChanges ? " Customers will be able to change to a different variant of the same product (e.g., size, color).": "Customers won't be able to change the product variant in the customer portal."
                }
               </p>   
            </div>
            <div>
             <Checkbox
          label="Allow quantity changes"
          checked={allowQuantityChanges}
          onChange={setAllowQuantityChanges}
        />
              <p>{allowQuantityChanges ? "Customers will be able to change the quantity of their subscription items." : "Customers won't be able to change the quantity of their subscription items."} </p>   
            </div>
            <div>
                <Checkbox
          label="Keep discounts on product changes"
          checked={keepDiscounts}
          onChange={setKeepDiscounts}
        />
              <p>
                {keepDiscounts ? "Discounts and pricing policies will be preserved when customers swap products, change variants, or adjust quantities." :"Existing discounts and pricing policies will not carry over - the current product price will apply."}
                </p>   
            </div>
          </Card>
        </Card>

        {/* Summary side  */}

        <Card>
          <h2>Summary</h2>
          <p> Widget: {widget}</p>
          <p> {selectedProducts.length===1 ? selectedProducts[0].title : [`${selectedProducts.length} products`]}</p>
        </Card>
      </Page>
    </>
  );
}

export default Template;
