import React, { useEffect, useState } from "react";
import {
  BlockStack, Button, Card, Checkbox, Divider,
  Icon, InlineGrid, InlineStack, Select, Text, TextField, Banner, Modal, Pagination,
  InlineError
} from "@shopify/polaris";
import { DuplicateIcon, DeleteIcon } from "@shopify/polaris-icons";
import Products from "./Products";
import AutomaticActions from "./AutomaticActions";

function DeliveryOptionCard({
  option, index, onChange, onDelete, onDuplicate,
  products, nextCursor, hasNextPage, selectedProducts,
  isDuplicateDelivery,
  billingError,
  submitted,
}) {
  const update = (field) => (value) => onChange(index, field, value);
  const [modalType, setModalType] = useState(null);
  const [tempSelected, setTempSelected] = useState([]);
  const [changeQtyProductsAttempted, setChangeQtyProductsAttempted] = useState(false);
  const [removeFreeProductsAttempted, setRemoveFreeProductsAttempted] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [pagination, setPagination] = useState({
    hasPrevious: false, hasNext: false,
    handlePrev: () => {}, handleNext: () => {},
  });

  // Derived errors — trigger on submit 
  const changeQtyProductsError =
    (submitted || changeQtyProductsAttempted) &&
    option.changeQtyAfterOrders &&
    !(option.changeQtyProducts?.length > 0);

  const removeFreeProductsError =
    (submitted || removeFreeProductsAttempted) &&
    option.removeFreeProducts &&
    !(option.removeFreeProductsList?.length > 0);

  const updateChecked = (field) => (checked) => {
    onChange(index, field, checked);
    if (field === "giveDiscount" && !checked) {
      onChange(index, "discountAmount", "");
      onChange(index, "discountType", "amount");
      onChange(index, "changeDiscountAfter", false);
      onChange(index, "discountAmount2", "");
      onChange(index, "afterOrders", "");
      onChange(index, "discountType2", "amount");
    }
    if (field === "giveShippingDiscount" && !checked) {
      onChange(index, "shippingDiscount", "");
      onChange(index, "shippingAfterOrders", "");
      onChange(index, "shippingDiscountType", "fixed");
    }
    if (field === "changeQtyAfterOrders" && !checked) {
      onChange(index, "changeQtyQuantity", "");
      onChange(index, "changeQtyAfterOrdersNum", "");
      onChange(index, "changeQtyProducts", []);
      setChangeQtyProductsAttempted(false);
    }
    if (field === "removeFreeProducts" && !checked) {
      onChange(index, "removeFreeAfterOrders", "");
      onChange(index, "removeFreeProductsList", []);
      setRemoveFreeProductsAttempted(false);
    }
    if (field === "setMinQty" && !checked) {
      onChange(index, "minQuantity", "0");
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between">
          <Text as="h3" variant="headingSm">
            {option.name ? option.name : `Option #${index + 1}`}
          </Text>
          <InlineStack gap="300">
            <Button icon={DuplicateIcon} variant="tertiary" onClick={() => onDuplicate(index)} />
            {index !== 0 && (
              <Button icon={DeleteIcon} variant="tertiary" onClick={() => onDelete(index)} />
            )}
          </InlineStack>
        </InlineStack>


        {/* NAME */}
        <BlockStack gap="200">
          <Text>Name</Text>
          <TextField label="" autoComplete="off" value={option.name} onChange={update("name")} />
          <Text tone="subdued" variant="bodySm">Leave empty to generate automatically</Text>
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
        <InlineGrid columns={2} gap="400">
          <BlockStack gap="200">
            <Text>Delivery frequency</Text>
            <TextField
              label=""
              type="number"
              min={0}
              autoComplete="off"
              value={option.deliveryFrequency || 1}
              onChange={(value) => {
                if (value === "" || Number(value) < 1) { update("deliveryFrequency")("1"); return; }
                update("deliveryFrequency")(value);
              }}
              error={isDuplicateDelivery ? "Duplicate delivery frequency" : undefined}
            />
          </BlockStack>
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

        {/* PREPAID billing frequency */}
        {option.billingType === "prepaid" && (
          <>
            <div />

            <InlineGrid columns={2} gap="400">
              <BlockStack gap="200">
                <Text>Billing frequency</Text>
                <TextField
                  label=""
                  type="number"
                  min={1}
                  prefix="Every"
                  autoComplete="off"
                  value={option.billingFrequency || ""}
                  onChange={(value) => { if (Number(value) < 1) return; update("billingFrequency")(value); }}
                  error={billingError ? billingError  : undefined}
                />
              </BlockStack>
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
                  ...Array.from({ length: 250 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
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
                  ...Array.from({ length: 250 }, (_, i) => ({ label: `${i + 1}`, value: `${i + 1}` })),
                ]}
              />
            </BlockStack>
          </InlineGrid>
        </BlockStack>

        <Divider />

        {/* SUBSCRIPTION DISCOUNT */}
        <BlockStack gap="300">
          <Text as="h3" variant="headingSm">Subscription discount</Text>
          <Checkbox label="Give discount" checked={option.giveDiscount} onChange={updateChecked("giveDiscount")} />
          {option.giveDiscount && (
            <>
              <InlineGrid columns={2} gap="400">
                <BlockStack gap="200">
                  <Text>Discount amount</Text>
                  <TextField
                    label="" type="number" min={0}
                    prefix={option.discountType === "percentage" ? "" : "₹"}
                    suffix={option.discountType === "percentage" ? "%" : ""}
                    autoComplete="off" value={option.discountAmount} onChange={update("discountAmount")}
                  />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>Discount type</Text>
                  <Select
                    label="" value={option.discountType} onChange={update("discountType")}
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
                      label="" min={0} type="number"
                      prefix={option.discountType2 === "percentage" ? "" : "₹"}
                      suffix={option.discountType2 === "percentage" ? "%" : ""}
                      autoComplete="off" value={option.discountAmount2} onChange={update("discountAmount2")}
                    />
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text>After # of orders</Text>
                    <TextField label="" type="number" min={1} autoComplete="off" value={option.afterOrders} onChange={update("afterOrders")} />
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text>Discount type</Text>
                    <Select
                      label="" value={option.discountType2} onChange={update("discountType2")}
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
          <Checkbox label="Give discount" checked={option.giveShippingDiscount} onChange={updateChecked("giveShippingDiscount")} />
          {option.giveShippingDiscount && (
            <>
              <InlineGrid columns={3} gap="400">
                <BlockStack gap="200">
                  <Text>Discount</Text>
                  <TextField
                    label="" type="number" min={0}
                    prefix={option.shippingDiscountType === "percentage" ? "" : "₹"}
                    suffix={option.shippingDiscountType === "percentage" ? "%" : ""}
                    autoComplete="off" value={option.shippingDiscount} onChange={update("shippingDiscount")}
                  />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>After # of orders</Text>
                  <TextField label="" type="number" min={1} autoComplete="off" value={option.shippingAfterOrders} onChange={update("shippingAfterOrders")} />
                </BlockStack>
                <BlockStack gap="200">
                  <Text>Discount type</Text>
                  <Select
                    label="" value={option.shippingDiscountType} onChange={update("shippingDiscountType")}
                    options={[
                      { label: "Fixed price", value: "fixed" },
                      { label: "Amount off", value: "amount" },
                      { label: "Percentage off", value: "percentage" },
                    ]}
                  />
                </BlockStack>
              </InlineGrid>
              <Text tone="subdued" variant="bodySm">This will be the new delivery price</Text>
            </>
          )}
        </BlockStack>
           <Divider />
             <AutomaticActions
              option={option}
              index={index}
              onChange={onChange}
              updateChecked={updateChecked}
              showActions={showActions}
              setShowActions={setShowActions}

            />
        {/* SETTINGS */}
        {selectedProducts?.length > 0 && (
          <>
       

          
            <Divider />
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">Settings</Text>

              {/* Change quantity */}
              <Checkbox
                label="Change product quantity after specific number of orders"
                checked={option.changeQtyAfterOrders}
                onChange={updateChecked("changeQtyAfterOrders")}
              />
              {option.changeQtyAfterOrders && (
                <BlockStack gap="300">
                  <Banner tone="warning">
                    <BlockStack gap="100">
                      <Text variant="bodySm">• This setting applies to the selected products for both new and recurring subscription orders.</Text>
                      <Text variant="bodySm">• Product &amp; bundle discounts will be readjusted for the new quantity</Text>
                    </BlockStack>
                  </Banner>
                  <InlineGrid columns={2} gap="400">
                    <BlockStack gap="200">
                      <Text>Quantity</Text>
                      <TextField
                        label="" type="number"  autoComplete="off"
                        value={option.changeQtyQuantity} onChange={update("changeQtyQuantity")}
                        helpText="Quantity will not be greater than the initial order quantity"
                      />
                    </BlockStack>
                    <BlockStack gap="200">
                      <Text>After # of orders</Text>
                      <TextField
                        label="" type="number"  autoComplete="off"
                        value={option.changeQtyAfterOrdersNum} onChange={update("changeQtyAfterOrdersNum")}
                        helpText="After how many orders to change quantity"
                      />
                    </BlockStack>
                  </InlineGrid>

                  

                  <Button
                    onClick={() => {
                      setTempSelected(option.changeQtyProducts || []);
                      setModalType('changeQty');
                    }}
                  >
                    Select products{option.changeQtyProducts?.length > 0 ? ` (${option.changeQtyProducts.length} selected)` : ''}
                  </Button>
                  {changeQtyProductsError && (
                    <InlineError message=
                     ' Please select at least one product for quantity change.'
                    />
                  )}

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
                    <Text variant="bodySm">• This setting applies to the selected products for both new and recurring subscription orders.</Text>
                  </Banner>
                  <BlockStack gap="200">
                    <Text>After # of orders</Text>
                    <TextField
                      label="" type="number"  autoComplete="off"
                      value={option.removeFreeAfterOrders} onChange={update("removeFreeAfterOrders")}
                      helpText="After how many orders to remove free products from subscription"
                    />
                  </BlockStack>


                  <Button
                    onClick={() => {
                      setTempSelected(option.removeFreeProductsList || []);
                      setModalType('removeFree');
                    }}
                  >
                    Select products{option.removeFreeProductsList?.length > 0 ? ` (${option.removeFreeProductsList.length} selected)` : ''}
                  </Button>

                  {removeFreeProductsError && (
                   <InlineError message=
                     ' Please select at least one product for quantity change.'
                    />
                  )}
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
                  <Text tone="subdued" variant="bodySm">Has no effect when using Kaching Bundles</Text>
                  <Text>Minimum quantity</Text>
                  <TextField
                    label="" type="number" min={0} autoComplete="off"
                    value={option.minQuantity} onChange={update("minQuantity")}
                    helpText="When this plan is selected, the product quantity will automatically be set to this value and customers will not be able to select a lower quantity."
                  />
                </BlockStack>
              )}
            </BlockStack>
          </>
        )}
      </BlockStack>

      {/* Product select modal */}
      <Modal
        open={modalType !== null}
        onClose={() => setModalType(null)}
        title="Select Products"
        primaryAction={{
          content: 'Save',
          onAction: () => {
            if (modalType === 'changeQty') {
              setChangeQtyProductsAttempted(true);
              if (tempSelected.length > 0) {
                onChange(index, 'changeQtyProducts', tempSelected.map(p => ({
                  productId: p.productId,
                  variantIds: p.variantIds || [],
                })));
              }
              setModalType(null);
            } else {
              setRemoveFreeProductsAttempted(true);
              if (tempSelected.length > 0) {
                onChange(index, 'removeFreeProductsList', tempSelected.map(p => ({
                  productId: p.productId,
                  variantIds: p.variantIds || [],
                })));
              }
              setModalType(null);
            }
          },
        }}
        secondaryActions={[{ content: 'Close', onAction: () => setModalType(null) }]}
        footer={
          <InlineStack align="space-between">
            <Pagination
              hasPrevious={pagination.hasPrevious}
              onPrevious={pagination.handlePrev}
              hasNext={pagination.hasNext}
              onNext={pagination.handleNext}
            />
          </InlineStack>
        }
      >
        <Modal.Section>
          <Products
            products={products}
            hasNextPage={hasNextPage}
            nextCursor={nextCursor}
            selectedItems={tempSelected}
            onSelect={setTempSelected}
            onPaginationChange={setPagination}
          />
        </Modal.Section>
      </Modal>
    </Card>
  );
}

function DeliveryOptions({
  options, setOptions, addOption,
  products, nextCursor, hasNextPage, selectedProducts,
  validationErrors = {},
  submitted = false,
}) {
  // const handleChange = (index, field, value) => {
  //   setOptions((prev) =>
  //     prev.map((opt, i) => (i === index ? { ...opt, [field]: value } : opt))
  //   );
  // };
  const handleChange = (index, field, value) => {
  setOptions((prev) =>
    prev.map((opt, i) => {
      if (i !== index) return opt;

      const updated = { ...opt, [field]: value };

      // IMPORTANT: when switching billing type, reset only dependent fields
      if (field === "billingType") {
        if (value === "pay") {
          updated.billingFrequency = "";
        }

        if (value === "prepaid") {
          updated.billingFrequency = opt.billingFrequency || "";
        }
      }

      return updated;
    })
  );
};

  const deleteOption = (index) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateOption = (index) => {
    setOptions((prev) => {
      const copied = { ...prev[index] };
      return [...prev.slice(0, index + 1), copied, ...prev.slice(index + 1)];
    });
  };

  const duplicateIndexes = validationErrors.duplicateDelivery?.indexes ?? [];

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
              onDelete={deleteOption}
              onDuplicate={duplicateOption}
              products={products}
              nextCursor={nextCursor}
              hasNextPage={hasNextPage}
              selectedProducts={selectedProducts}
              isDuplicateDelivery={duplicateIndexes.includes(i)}
              billingError={validationErrors.billingMultiple?.[i] ?? null}
              submitted={submitted}
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