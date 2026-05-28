import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import Products from "../components/Products";
import DeliveryOption from "../components/DeliveryOptions";
import { defaultOption } from "../constants/deliveryOption"
import { handlePublish as buildPayload } from "../utils/handlePublish";
import {
  FormLayout,
  Card,
  Text,
  Button,
  TextField,
  InlineStack,
  BlockStack,
  Modal,
  Page,
  Grid,
  Pagination,
  MediaCard,
  Checkbox,
  Icon,
  Banner,
  InlineError,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";


//  Validation helper 
function validate({ selectedProducts, options }) {
  const errors = {};

  // No products selected
  if (selectedProducts.length === 0) {
    errors.noProducts = "Please select at least one product to continue.";
  }

  //  Duplicate delivery (frequency must be unique across options)
  const deliveryKeys = options.map(
    (o) => `${o.deliveryFrequency ?? ''}|${o.deliveryInterval ?? ''}`
  );
  const duplicateDeliveryIndexes = new Set();
  deliveryKeys.forEach((key, i) => {
    deliveryKeys.forEach((k2, j) => {
      if (i !== j && key === k2) {
        duplicateDeliveryIndexes.add(i);
        duplicateDeliveryIndexes.add(j);
      }
    });
  });
  if (duplicateDeliveryIndexes.size > 0) {
    errors.duplicateDelivery = {
      message: "Each delivery option must have a unique delivery frequency",
      indexes: [...duplicateDeliveryIndexes],
    };
  }

  // Per-option billing frequency not a multiple of delivery frequency
  // const billingErrors = {};
  // options.forEach((o, i) => {
  //   if (o.billingType === 'prepaid') {
  //     const df = Number(o.deliveryFrequency);
  //     const bf = Number(o.billingFrequency);
  //     if (df && bf && bf % df !== 0) {
  //       billingErrors[i] =
  //         ` Billing frequency  must be a multiple of delivery frequency .`;
  //     }
  //   }
  // });
  // if (Object.keys(billingErrors).length > 0) {
  //   errors.billingMultiple = billingErrors;
  // }

  //  Settings changeQty ON but no products selected
  const billingErrors = {};

options.forEach((o, i) => {
  if (o.billingType === 'prepaid') {
    const df = Number(o.deliveryFrequency);
    const bf = Number(o.billingFrequency);

    // required validation
    if (!o.deliveryFrequency || !o.billingFrequency) {
      billingErrors[i] =
        ' Billing frequency are required.';
      return;
    }

    // greater than validation
    if (bf <= df) {
      billingErrors[i] =
        'Billing frequency must be greater than delivery frequency.';
      return;
    }

    // multiple validation
    if (bf % df !== 0) {
      billingErrors[i] =
        'Billing frequency must be a multiple of delivery frequency.';
    }
  }
});

if (Object.keys(billingErrors).length > 0) {
  errors.billingMultiple = billingErrors;
}
  
  
  const changeQtyErrors = [];
  options.forEach((o, i) => {
    if (o.changeQtyAfterOrders && !(o.changeQtyProducts?.length > 0)) {
      changeQtyErrors.push(`Option ${i + 1}: Please select products for "Change product quantity" setting.`);
    }
  });
  if (changeQtyErrors.length > 0) {
    errors.changeQtyProducts = changeQtyErrors;
  }

  //  Settings removeFreeProducts ON but no products selected
  const removeFreeErrors = [];
  options.forEach((o, i) => {
    if (o.removeFreeProducts && !(o.removeFreeProductsList?.length > 0)) {
      removeFreeErrors.push(`Option ${i + 1}: Please select products for "Remove free products" setting.`);
    }
  });
  if (removeFreeErrors.length > 0) {
    errors.removeFreeProducts = removeFreeErrors;
  }

  return errors; // {} = valid
}

function Templates({ products, nextCursor, hasNextPage }) {
  const navigate = useNavigate();
  const [options, setOptions] = useState([{ ...defaultOption }]);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [tempSelected, setTempSelected] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [title, setTitle] = useState("Subscribe and save");
  const [description, setDescription] = useState("Plan1");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  // Show validation errors 
  const [submitted, setSubmitted] = useState(false);

  const [savedState, setSavedState] = useState({
    title: "Subscribe and save",
    description: "Plan1",
    selectedProducts: [],
    options: [{ ...defaultOption }],
    productChanges: {
      swap: true,
      variant: true,
      quantity: true,
      keepDiscount: true,
    },
  });

  const [productChanges, setProductChanges] = useState({
    swap: true,
    variant: true,
    quantity: true,
    keepDiscount: true,
  });

  const [pagination, setPagination] = useState({
    hasPrevious: false,
    hasNext: false,
    handlePrev: () => {},
    handleNext: () => {},
  });

  //  validation
  const errors = validate({ selectedProducts, options });
  const isValid = Object.keys(errors).length === 0;
  

  // isDirty
  const isDirty =
    title !== savedState.title ||
    description !== savedState.description ||
    JSON.stringify(selectedProducts) !== JSON.stringify(savedState.selectedProducts) ||
    JSON.stringify(options) !== JSON.stringify(savedState.options) ||
    JSON.stringify(productChanges) !== JSON.stringify(savedState.productChanges);

  useEffect(() => {
    const saveBar = document.getElementById('templates-save-bar');
    if (!saveBar) return;
    isDirty ? saveBar.show() : saveBar.hide();
  }, [isDirty]);

  useEffect(() => {
    const saveBtn = document.getElementById('templates-save-btn');
    if (!saveBtn) return;
    if (loading) {
      saveBtn.setAttribute('loading', '');
      saveBtn.setAttribute('disabled', '');
    } else {
      saveBtn.removeAttribute('loading');
      saveBtn.removeAttribute('disabled');
    }
  }, [loading]);

  const handlePublishClick = async () => {
    setSubmitted(true); // show errors from now on

    if (!isValid) return; // block save if errors

    setLoading(true);
    const payload = buildPayload({ selectedProducts, options, productChanges, title, description });

   
    if (!payload) { setLoading(false); return; }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setTimeout(() => navigate(`/app/plans`), 1000);

    setSavedState({ title, description, selectedProducts, options, productChanges });
     console.log("ddata",payload)
    setLoading(false);
  };

  const handleDiscard = () => {
    setTitle(savedState.title);
    setDescription(savedState.description);
    setSelectedProducts(savedState.selectedProducts);
    setOptions(savedState.options);
    setProductChanges(savedState.productChanges);
    setSubmitted(false);
  };

  const handleClick = () => {
    if (isDirty) setShowLeaveModal(true);
    else navigate('/app/plans');
  };

  const text = {
    swap: {
      on: "Customers will be able to swap their current product to a different product in this selling plan group via the customer portal.",
      off: "Customers won't be able to swap their product to a different product in the customer portal.",
    },
    variant: {
      on: "Customers will be able to change to a different variant of the same product",
      off: "Customers won't be able to change the product variant in the customer portal.",
    },
    quantity: {
      on: "Customers will be able to change the quantity of their subscription items.",
      off: "Customers won't be able to change the quantity of their subscription items.",
    },
    keepDiscount: {
      on: "Discounts and pricing policies will be preserved when customers swap products, change variants, or adjust quantities.",
      off: "Existing discounts and pricing policies will not carry over - the current product price will apply.",
    },
  };

  const handleChange = (key, value) => {
    setProductChanges((prev) => ({ ...prev, [key]: value }));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { ...defaultOption }]);
  };

  useEffect(() => {
    const { swap, variant, quantity } = productChanges;
    if (!swap && !variant && !quantity) {
      setProductChanges((prev) => ({ ...prev, keepDiscount: false }));
    }
  }, [productChanges.swap, productChanges.variant, productChanges.quantity]);

  // Errors to display (only after submit)
  const showErrors = submitted ? errors : {};

  return (
    <Page
      backAction={{ content: 'Products', onAction: handleClick }}
      title={description || 'Create subscription plan'}
      primaryAction={{ content: 'Publish', onAction: handlePublishClick, loading: loading }}
    >
      <ui-save-bar id="templates-save-bar">
        <button variant="primary" id="templates-save-btn" onClick={handlePublishClick}>Save</button>
        <button onClick={handleDiscard}>Discard</button>
      </ui-save-bar>

      <Modal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Unsaved changes"
        primaryAction={{
          content: "Save",
          loading: loading,
          onAction: async () => {
            setShowLeaveModal(false);
            await handlePublishClick(true);
          },
        }}
        secondaryActions={[{
          content: "Discard",
          destructive: true,
          onAction: () => { handleDiscard(); setShowLeaveModal(false); },
        }]}
      >
        <Modal.Section>
          <Text>You have unsaved changes. Do you want to save before leaving?</Text>
        </Modal.Section>
      </Modal>

      <Grid>
        {/* LEFT SIDE */}
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 8 }}>
          <BlockStack gap="500">

            {/*  Global error banner (show after submit)  */}
            {submitted && !isValid && (
              <Banner tone="critical" title="Please fix the following errors before publishing">
                <BlockStack gap="100">
                  {showErrors.noProducts && (
                    <Text variant="bodySm">• {showErrors.noProducts}</Text>
                  )}
                  {showErrors.duplicateDelivery && (
                    <Text variant="bodySm">• {showErrors.duplicateDelivery.message}</Text>
                  )}
                  {showErrors.billingMultiple &&
                    Object.values(showErrors.billingMultiple).map((msg, i) => (
                      <Text key={i} variant="bodySm">• {msg}</Text>
                    ))}
                  {showErrors.changeQtyProducts?.map((msg, i) => (
                    <Text key={i} variant="bodySm">• {msg}</Text>
                  ))}
                  {showErrors.removeFreeProducts?.map((msg, i) => (
                    <Text key={i} variant="bodySm">• {msg}</Text>
                  ))}
                </BlockStack>
              </Banner>
            )}

            <MediaCard
              title="New to Kaching Subscriptions?"
              primaryAction={{ content: 'Optional tutorials', onAction: () => {} }}
              description="Discover how Shopify can power up your entrepreneurial journey."
            >
              <img
                alt=""
                width="100%"
                height="100%"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                src="https://subscriptions-assets.kachingappz.app/kaching-tutorial.jpg"
              />
            </MediaCard>

            <Card>
              <FormLayout>
                <TextField
                  label="Title"
                  value={title}
                  onChange={(val) => setTitle(val)}
                  autoComplete="off"
                  helpText="Customers will see this on the storefront product pages that have subscriptions."
                />
                <TextField
                  label="Internal description"
                  value={description}
                  onChange={(val) => setDescription(val)}
                  autoComplete="off"
                  helpText="For your reference only"
                />
              </FormLayout>
            </Card>

            {/*  Products card  */}
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">Products</Text>

                

                {selectedProducts.length > 0 && (
                  <BlockStack gap="200">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.productId}
                        style={{ border: "1px solid #dfe3e8", borderRadius: "12px", padding: "10px" }}
                      >
                        <InlineStack align="space-between" blockAlign="center">
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={product.productImage}
                              alt={product.productTitle}
                              style={{ width: "45px", height: "45px", borderRadius: "8px", objectFit: "cover" }}
                            />
                            <Text fontWeight="medium">{product.productTitle}</Text>
                          </div>
                          <Button
                            onClick={() =>
                              setSelectedProducts((prev) =>
                                prev.filter((p) => p.productId !== product.productId)
                              )
                            }
                          >
                            <Icon source={DeleteIcon} tone="base" />
                          </Button>
                        </InlineStack>
                      </div>
                    ))}
                  </BlockStack>
                )}

                <InlineStack>
                  <Button
                    onClick={() => { setTempSelected(selectedProducts); setOpenProductModal(true); }}
                  >
                    Select products
                  </Button>
                </InlineStack>
                {/* Inline error for no products */}
                {showErrors.noProducts && (
                  <InlineError message={showErrors.noProducts} />
                )}
              </BlockStack>
            </Card>

            <Modal
              open={openProductModal}
              onClose={() => setOpenProductModal(false)}
              title="Select Product"
              primaryAction={{
                content: 'Save',
                onAction: () => { setSelectedProducts(tempSelected); setOpenProductModal(false); },
              }}
              secondaryActions={[{ content: 'Close', onAction: () => setOpenProductModal(false) }]}
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

            {/*  Customer product changes  */}
            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">Customer product changes</Text>
                {['swap', 'variant', 'quantity', 'keepDiscount'].map((key) => (
                  <div key={key} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <Checkbox
                      checked={productChanges[key]}
                      disabled={
                        key === 'keepDiscount' &&
                        !productChanges.swap &&
                        !productChanges.variant &&
                        !productChanges.quantity
                      }
                      onChange={(val) => handleChange(key, val)}
                    />
                    <div>
                      <Text variant="headingSm" as="h2">
                        {key === 'swap' && 'Allow product swaps'}
                        {key === 'variant' && 'Allow variant changes'}
                        {key === 'quantity' && 'Allow quantity changes'}
                        {key === 'keepDiscount' && 'Keep discounts on product changes'}
                      </Text>
                      <p>{productChanges[key] ? text[key].on : text[key].off}</p>
                    </div>
                  </div>
                ))}
              </BlockStack>
            </Card>

            {/*  Delivery options — pass errors down  */}
            <DeliveryOption
              options={options}
              setOptions={setOptions}
              addOption={addOption}
              products={products}
              nextCursor={nextCursor}
              hasNextPage={hasNextPage}
              selectedProducts={selectedProducts}
              // validation props
              validationErrors={showErrors}
              submitted={submitted}
            />
          </BlockStack>
        </Grid.Cell>

        {/* RIGHT SIDE */}
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
          <div style={{ position: "sticky", top: "0px" }}>
            <Card>
              <BlockStack gap="300">
                <div>
                  <Text variant="headingMd" as="h2">Summary</Text>
                  <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li>{options.length} delivery option{options.length !== 1 ? 's' : ''}</li>
                  </ul>
                </div>
                <div>
                  {Object.values(productChanges).every(v => !v) ? "" : (
                    <>
                      <Text variant="headingMd" as="h2">Customer product changes</Text>
                      <ul style={{ paddingLeft: '18px', margin: 0 }}>
                        {productChanges.swap && <li>Allow product swaps</li>}
                        {productChanges.variant && <li>Allow variant changes</li>}
                        {productChanges.quantity && <li>Allow quantity changes</li>}
                        {productChanges.keepDiscount && <li>Keep discounts on product changes</li>}
                      </ul>
                    </>
                  )}
                </div>
                {options.map((opt, i) => (
                  <div key={i}>
                    <Text variant="headingMd" as="h2">{opt.name || `Option ${i + 1}`}</Text>
                    <ul style={{ paddingLeft: '18px', margin: 0 }}>
                      {opt.deliveryFrequency && (
                        <li>Delivery: every {opt.deliveryFrequency} {opt.deliveryInterval}</li>
                      )}
                      <li>{opt.billingType === 'prepaid' ? 'Pre-paid' : 'Pay as you go'}</li>
                      {opt.minOrders !== 'disabled' && <li>Min {opt.minOrders} orders</li>}
                      {opt.maxOrders !== 'unlimited' && <li>Max {opt.maxOrders} orders</li>}
                      {opt.giveDiscount && opt.discountAmount && (
                        <li>
                          {opt.discountType === 'percentage'
                            ? `${opt.discountAmount}% off`
                            : opt.discountType === 'fixed'
                            ? `Fixed price ₹${opt.discountAmount}`
                            : `₹${opt.discountAmount} off`}
                          {opt.changeDiscountAfter && opt.discountAmount2 && opt.afterOrders
                            ? `, then ${opt.discountType2 === 'percentage'
                                ? `${opt.discountAmount2}%`
                                : `₹${opt.discountAmount2}`} after ${opt.afterOrders} orders`
                            : ''}
                        </li>
                      )}
                      {opt.giveShippingDiscount && opt.shippingDiscount && (
                        <li>
                          Shipping: {opt.shippingDiscountType === 'percentage'
                            ? `${opt.shippingDiscount}% off`
                            : `₹${opt.shippingDiscount} off`}
                          {opt.shippingAfterOrders ? ` after ${opt.shippingAfterOrders} orders` : ''}
                        </li>
                      )}
                      {opt.changeQtyAfterOrders && opt.changeQtyQuantity && (
                        <li>Change qty to {opt.changeQtyQuantity} after {opt.changeQtyAfterOrdersNum} orders</li>
                      )}
                      {opt.removeFreeProducts && (
                        <li>Remove free products after {opt.removeFreeAfterOrders} orders</li>
                      )}
                      {opt.setMinQty && opt.minQuantity && <li>Min qty: {opt.minQuantity}</li>}
                    </ul>
                  </div>
                ))}
              </BlockStack>
            </Card>
          </div>
        </Grid.Cell>
      </Grid>
    </Page>
  );
}

export default Templates;
