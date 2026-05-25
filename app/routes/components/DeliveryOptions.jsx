import React, { useState } from "react";
import {
  BlockStack, Button, Card, Checkbox, Divider,
  Icon, InlineGrid, InlineStack, Select, Text, TextField, Banner, InlineError
} from "@shopify/polaris";
import { DuplicateIcon } from "@shopify/polaris-icons";

const defaultOption = {
  name: "",
  billingType: "pay",
  billingFrequency: "",
  billingInterval: "weeks",
  deliveryInterval: "days",
  minOrders: "disabled",
  maxOrders: "unlimited",
  giveDiscount: false,
  discountAmount: "",
  discountType: "amount",
  changeDiscountAfter: false,
  discountAmount2: "",
  afterOrders: "",
  discountType2: "amount",
  giveShippingDiscount: false,
  shippingDiscount: "",
  shippingAfterOrders: "",
  shippingDiscountType: "fixed",
  allowAutoActions: false,
  changeQtyAfterOrders: false,
  changeQtyQuantity: "1",
  changeQtyAfterOrdersNum: "1",
  removeFreeProducts: false,
  removeFreeAfterOrders: "1",
  setMinQty: false,
  minQuantity: "1",
};

function DeliveryOptionCard({ option, index, onChange }) {
  const update = (field) => (value) => onChange(index, field, value);
  const updateChecked = (field) => (checked) => onChange(index, field, checked);
  const [showActions, setShowActions] = useState(false);

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text as="h3" variant="headingSm">Option #{index + 1}</Text>
          <div style={{ margin: 0 }}>
            <Icon source={DuplicateIcon} tone="base" />
          </div>

        </InlineStack>

        {/* NAME */}
        <BlockStack gap="200">
          <Text>Name</Text>
          <TextField
            label=""
            autoComplete="off"
            value={option.name}
            onChange={update("name")}
          />
          <Text tone="subdued" variant="bodySm">
            Leave empty to generate automatically
          </Text>
        </BlockStack>

        <Divider />

        {/* BILLING TYPE */}
        <BlockStack gap="200">
          <Text>Billing type</Text>
          <Select
            label=""
            value={option.billingType}
            onChange={update("billingType")}
            options={[
              { label: "Pay as you go", value: "pay" },
              { label: "Pre-paid", value: "prepaid" },
            ]}
          />
        </BlockStack>

        {/* DELIVERY */}
        {/* DELIVERY */}
        <InlineGrid columns={2} gap="400">

          {/* DELIVERY FREQUENCY */}
          <BlockStack gap="200">
            <Text>Delivery frequency</Text>

            <TextField
              label=""
              autoComplete="off"
              value={option.deliveryFrequency}
              onChange={update("deliveryFrequency")}
            />
          </BlockStack>

          {/* DELIVERY INTERVAL */}
          <BlockStack gap="200">
            <Text>Delivery interval</Text>

            <Select
              label=""
              value={option.deliveryInterval}
              onChange={update("deliveryInterval")}
              options={[
                { label: "days", value: "days" },
                { label: "weeks", value: "weeks" },
                { label: "months", value: "months" },
                { label: "years", value: "years" },
              ]}
            />
          </BlockStack>

        </InlineGrid>

        {/* SHOW ONLY WHEN PREPAID */}
        {option.billingType === "prepaid" && (
          <>
            <div />

            <InlineGrid columns={2} gap="400">

              {/* BILLING FREQUENCY */}
             <BlockStack gap="200">
  <Text>Billing frequency</Text>

  <TextField
  label=""
  type="number"
  min={1}
  prefix="Every"
  autoComplete="off"
  value={option.billingFrequency || ""}
  onChange={(value) => {
    // 0 aur negative block
    if (Number(value) <= 0) return;

    update("billingFrequency")(value);
  }}
  error={
    option.billingFrequency &&
    option.deliveryFrequency &&
    Number(option.billingFrequency) %
      Number(option.deliveryFrequency) !==
      0
      ? `Billing frequency must be multiple of ${option.deliveryFrequency}`
      : ""
  }
/>
</BlockStack>

              {/* BILLING INTERVAL */}
              <BlockStack gap="200">
                <Text>Delivery interval</Text>
                <Select
                  disabled
                  label=""
                  value={option.deliveryInterval}
                  options={[
                    { label: "days", value: "days" },
                    { label: "weeks", value: "weeks" },
                    { label: "months", value: "months" },
                    { label: "years", value: "years" },
                  ]}
                />
              </BlockStack>

            </InlineGrid>
          </>
        )}

        <Divider />

        {/* SUBSCRIPTION ORDERS */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">Subscription orders</Text>
          <InlineGrid columns={2} gap="400">
            <BlockStack gap="200">
              <Text>Minimum number of orders</Text>
              <Select
                label=""
                value={option.minOrders}
                onChange={update("minOrders")}
                options={[
                  { label: "Disabled", value: "disabled" },

                  ...Array.from({ length: 250 }, (_, i) => ({
                    label: `${i + 1}`,
                    value: `${i + 1}`,
                  })),
                ]}
              />
            </BlockStack>
            <BlockStack gap="200">
              <Text>Maximum number of orders</Text>
              <Select
                label=""
                value={option.maxOrders}
                onChange={update("maxOrders")}
                options={[
                  { label: "Unlimited", value: "unlimited" },

                  ...Array.from({ length: 250 }, (_, i) => ({
                    label: `${i + 1}`,
                    value: `${i + 1}`,
                  })),
                ]}
              />
            </BlockStack>
          </InlineGrid>
        </BlockStack>

        <Divider />

        {/* SUBSCRIPTION DISCOUNT */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">Subscription discount</Text>

          <Checkbox
            label="Give discount"
            checked={option.giveDiscount}
            onChange={updateChecked("giveDiscount")}
          />

          {option.giveDiscount && (
            <>
              <InlineGrid columns={2} gap="400">
                <BlockStack gap="200">
                  <Text>Discount amount</Text>
                  <TextField
                    label=""
                    prefix={
                      option.discountType === "percentage"
                        ? ""
                        : "₹"
                    }
                    suffix={
                      option.discountType === "percentage"
                        ? "%"
                        : ""
                    }
                    autoComplete="off"
                    value={option.discountAmount}
                    onChange={update("discountAmount")}
                  />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>Discount type</Text>
                  <Select
                    label=""
                    value={option.discountType}
                    onChange={update("discountType")}
                    options={[
                      { label: "Amount off", value: "amount" },
                      { label: "Percentage off", value: "percentage" },
                      { label: "Fixed price", value: "fixed" },
                    ]}
                  />
                </BlockStack>
              </InlineGrid>

              <Checkbox
                label="Change discount after specific number of orders"
                checked={option.changeDiscountAfter}
                onChange={updateChecked("changeDiscountAfter")}
              />

              {option.changeDiscountAfter && (
                <InlineGrid columns={3} gap="400">
                  <BlockStack gap="200">
                    <Text>Discount amount</Text>
                    <TextField
                      label=""
                      prefix={
                        option.discountType2 === "percentage"
                          ? ""
                          : "₹"
                      }
                      suffix={
                        option.discountType2 === "percentage"
                          ? "%"
                          : ""
                      }
                      autoComplete="off"
                      value={option.discountAmount2}
                      onChange={update("discountAmount2")}
                    />
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text>After # of orders</Text>
                    <TextField
                      label=""
                      autoComplete="off"
                      value={option.afterOrders}
                      onChange={update("afterOrders")}
                    />
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text>Discount type</Text>
                    <Select
                      label=""
                      value={option.discountType2}
                      onChange={update("discountType2")}
                      options={[
                        { label: "Amount off", value: "amount" },
                        { label: "Percentage off", value: "percentage" },
                        { label: "Fixed price", value: "fixed" },
                      ]}
                    />
                  </BlockStack>
                </InlineGrid>
              )}
            </>
          )}
        </BlockStack>

        <Divider />

        {/* SHIPPING DISCOUNT */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">Shipping discount</Text>

          <Checkbox
            label="Give discount"
            checked={option.giveShippingDiscount}
            onChange={updateChecked("giveShippingDiscount")}
          />

          {option.giveShippingDiscount && (
            <>
              <InlineGrid columns={3} gap="400">
                <BlockStack gap="200">
                  <Text>Discount</Text>
                  <TextField
                    label=""
                    prefix={
                      option.shippingDiscountType  === "percentage"
                        ? ""
                        : "₹"
                    }
                    suffix={
                      option.shippingDiscountType  === "percentage"
                        ? "%"
                        : ""
                    }
                    autoComplete="off"
                    value={option.shippingDiscount}
                    onChange={update("shippingDiscount")}
                  />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>After # of orders</Text>
                  <TextField
                    label=""
                    autoComplete="off"
                    value={option.shippingAfterOrders}
                    onChange={update("shippingAfterOrders")}
                  />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>Discount type</Text>
                  <Select
                    label=""
                    value={option.shippingDiscountType}
                    onChange={update("shippingDiscountType")}
                    options={[
                      { label: "Fixed price", value: "fixed" },
                      { label: "Amount off", value: "amount" },
                      { label: "Percentage off", value: "percentage" },
                    ]}
                  />
                </BlockStack>
              </InlineGrid>
              <Text tone="subdued" variant="bodySm">
                This will be the new delivery price
              </Text>
            </>
          )}
        </BlockStack>

        <Divider />

        {/* AUTOMATIC ACTIONS */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">Automatic actions</Text>
          <Checkbox
            label="Allow automatic actions (swap, add or remove products)"
            checked={option.allowAutoActions}
            onChange={updateChecked("allowAutoActions")}
          />
          {option.allowAutoActions && (
            <>
              <Banner tone="info">
                <Text variant="bodySm">
                  Automatic actions can change the subscription price. The price
                  updates to the replacement product's price at the time of the
                  swap. <a href="#">Learn more</a>
                </Text>
              </Banner>
              <Button fullWidth onClick={() => setShowActions(!showActions)}>
                + Add action
              </Button>

              {showActions && (
                <Card>
                  <BlockStack gap="400">

                    {/* SWAP PRODUCTS */}
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Swap to different product(s)
                      </Text>

                      <div
                        style={{
                          padding: "10px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <Text>Add product swap</Text>
                      </div>

                      <div
                        style={{
                          padding: "10px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <Text>Add variant swap</Text>
                      </div>
                    </BlockStack>

                    <Divider />

                    {/* ADD PRODUCT */}
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Add product to subscription
                      </Text>

                      <div
                        style={{
                          padding: "10px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <Text>Add product</Text>
                      </div>
                    </BlockStack>

                    <Divider />

                    {/* REMOVE PRODUCT */}
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm">
                        Remove from subscription
                      </Text>

                      <div
                        style={{
                          padding: "10px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <Text>Remove product</Text>
                      </div>

                      <div
                        style={{
                          padding: "10px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <Text>Remove specific variant</Text>
                      </div>
                    </BlockStack>

                  </BlockStack>
                </Card>
              )}
            </>
          )}
        </BlockStack>

        <Divider />

        {/* SETTINGS */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">Settings</Text>

          {/* Change product quantity */}
          <Checkbox
            label="Change product quantity after specific number of orders"
            checked={option.changeQtyAfterOrders}
            onChange={updateChecked("changeQtyAfterOrders")}
          />
          {option.changeQtyAfterOrders && (
            <BlockStack gap="300">
              <Banner tone="warning">
                <BlockStack gap="100">
                  <Text variant="bodySm">
                    • This setting applies to the selected products for both new
                    and recurring subscription orders.
                  </Text>
                  <Text variant="bodySm">
                    • Product & bundle discounts will be readjusted for the new
                    quantity
                  </Text>
                </BlockStack>
              </Banner>
              <InlineGrid columns={2} gap="400">
                <BlockStack gap="200">
                  <Text>Quantity</Text>
                  <TextField
                    label=""
                    autoComplete="off"
                    value={option.changeQtyQuantity}
                    onChange={update("changeQtyQuantity")}
                    helpText="Quantity will not be greater than the initial order quantity"
                  />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>After # of orders</Text>
                  <TextField
                    label=""
                    autoComplete="off"
                    value={option.changeQtyAfterOrdersNum}
                    onChange={update("changeQtyAfterOrdersNum")}
                    helpText="After how many orders to change quantity"
                  />
                </BlockStack>
              </InlineGrid>
              <Button>Select products</Button>
              <Text tone="critical" variant="bodySm">
                <InlineError message="At least one product must be selected" fieldID="myFieldID" />
              </Text>
            </BlockStack>
          )}

          {/* Remove free products */}
          <Checkbox
            label="Remove free products from subscription after specific number of orders"
            checked={option.removeFreeProducts}
            onChange={updateChecked("removeFreeProducts")}
          />
          {option.removeFreeProducts && (
            <BlockStack gap="300">
              <Banner tone="warning">
                <Text variant="bodySm">
                  • This setting applies to the selected products for both new
                  and recurring subscription orders.
                </Text>
              </Banner>
              <BlockStack gap="200">
                <Text>After # of orders</Text>
                <TextField
                  label=""
                  autoComplete="off"
                  value={option.removeFreeAfterOrders}
                  onChange={update("removeFreeAfterOrders")}
                  helpText="After how many orders to remove free products from subscription"
                />
              </BlockStack>
              <Button>Select products</Button>
              <Text tone="critical" variant="bodySm">
                <InlineError message="At least one product must be selected" fieldID="myFieldID" />
              </Text>
            </BlockStack>
          )}

          {/* Set minimum quantity */}
          <Checkbox
            label="Set minimum quantity for this plan"
            checked={option.setMinQty}
            onChange={updateChecked("setMinQty")}
          />
          {option.setMinQty && (
            <BlockStack gap="200">
              <Text tone="subdued" variant="bodySm">
                Has no effect when using Kaching Bundles
              </Text>
              <Text>Minimum quantity</Text>
              <TextField
                label=""
                autoComplete="off"
                value={option.minQuantity}
                onChange={update("minQuantity")}
                helpText="When this plan is selected, the product quantity will automatically be set to this value and customers will not be able to select a lower quantity. For example, set this to 2 if you want customers to purchase at least 2 units with this subscription plan. Has no effect when using Kaching Bundles."
              />
            </BlockStack>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

function DeliveryOptions() {
  const [options, setOptions] = useState([{ ...defaultOption }]);


  const handleChange = (index, field, value) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
    );
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { ...defaultOption }]);
  };

  return (
    <div style={{ paddingBottom: "30px" }}>
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd">Delivery options</Text>

          {options.map((opt, i) => (
            <DeliveryOptionCard
              key={i}
              option={opt}
              index={i}
              onChange={handleChange}
            />
          ))}

          <div style={{ paddingTop: "20px" }}>
            <Button onClick={addOption}>Add option</Button>
          </div>
        </BlockStack>
      </Card>
    </div>
  );
}

export default DeliveryOptions;