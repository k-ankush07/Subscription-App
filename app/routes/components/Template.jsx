import React, { useEffect, useState } from "react";
import { Page, Card, FormLayout, TextField, Select } from "@shopify/polaris";
import { useNavigate } from "react-router";
import Product from "./Product"
function Template() {
  const navigate = useNavigate();

  const [planName, setPlanName] = useState("Plan 1");
  const [widget, setWidget] = useState("widget1");
    const [selectedProducts, setSelectedProducts] = useState([]);

  const handleBack = () => {
    navigate("/app/plans");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      planName,
      widget,
      products: selectedProducts,
    };

    console.log(payload);

    localStorage.setItem("users", JSON.stringify(payload));
  };


  return (
    <>
      <Page
        title="Create Plan"
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
            content: "Delete Plan",
            onAction: handleBack,
          },
        ]}
      >
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
              />
            </FormLayout>
          </form>
        </Card>
      </Page>
    </>
  );
}

export default Template;
