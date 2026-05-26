import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Products from "../components/Products";
import DeliveryOption from "../components/DeliveryOptions";
import { defaultOption } from "../constants/deliveryOption"
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
  Icon
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";


function Templates({ products, nextCursor, hasNextPage }) {
  const navigate = useNavigate();
  const [options, setOptions] = useState([{ ...defaultOption }]);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [tempSelected, setTempSelected] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [title, setTitle] = useState("Subscribe and save");
  const [description, setDescription] = useState("Plan1");

  const [productChanges, setProductChanges] = useState({
    swap: true,
    variant: true,
    quantity: true,
    keepDiscount: true,
  });
  const [pagination, setPagination] = useState({
    hasPrevious: false,
    hasNext: false,
    handlePrev: () => { },
    handleNext: () => { },
  });

  const handleClick = () => {
    navigate('/app/plans');
  };


  const text = {
    swap: {
      on: "Customers will be able to swap their current product to a different product in this selling plan group via the customer portal.",
      off: "Customers won't be able to swap their product to a different product in the customer portal."
    },
    variant: {
      on: "Customers will be able to change to a different variant of the same product",
      off: "Customers won't be able to change the product variant in the customer portal."
    },
    quantity: {
      on: "Customers will be able to change the quantity of their subscription items.",
      off: "Customers won't be able to change the quantity of their subscription items."
    },
    keepDiscount: {
      on: "Discounts and pricing policies will be preserved when customers swap products, change variants, or adjust quantities.",
      off: "Existing discounts and pricing policies will not carry over - the current product price will apply."
    }
  };
  const handleChange = (key, value) => {
    setProductChanges(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const addOption = () => {
    setOptions((prev) => [...prev, { ...defaultOption }]);
  };
  useEffect(() => {
    const { swap, variant, quantity } = productChanges;

    const allOff = !swap && !variant && !quantity;

    if (allOff) {
      setProductChanges(prev => ({
        ...prev,
        keepDiscount: false
      }));
    }
  }, [productChanges.swap, productChanges.variant, productChanges.quantity]);

  useEffect(() => {
    console.log("selectedProductssdw =>", selectedProducts);
  }, [selectedProducts]);
  return (
    <Page
      backAction={{
        content: 'Products',
        onAction: handleClick,
      }}
      title={description || 'Create subscription plan'}
      primaryAction={{ content: 'Publish' }}
    // secondaryActions={[
    //   { content: 'Save as draft' },
    // ]}
    >


      <Grid>


        {/* LEFT SIDE */}
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 8 }}>
          <BlockStack gap="500">
            <MediaCard
              title="New to Kaching Subscriptions?"
              primaryAction={{
                content: 'Optional tutorials',
                onAction: () => { },
              }}
              description="Discover how Shopify can power up your entrepreneurial journey."
            >
              <img
                alt=""
                width="100%"
                height="100%"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
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

            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Products
                </Text>
                {selectedProducts.length > 0 && (
                  <BlockStack gap="200">

                    {selectedProducts.map((product) => (
                      <div
                        key={product.productId}
                        style={{
                          border: "1px solid #dfe3e8",
                          borderRadius: "12px",
                          padding: "10px",
                        }}
                      >
                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={product.productImage}
                              alt={product.productTitle}
                              style={{
                                width: "45px",
                                height: "45px",
                                borderRadius: "8px",
                                objectFit: "cover",
                              }}
                            />

                            <Text fontWeight="medium">
                              {product.productTitle}
                            </Text>
                          </div>

                          <Button

                            onClick={() => {
                              setSelectedProducts((prev) =>
                                prev.filter(
                                  (p) => p.productId !== product.productId
                                )
                              );
                            }}
                          >
                            <Icon
                              source={DeleteIcon}
                              tone="base"
                            />
                          </Button>

                        </InlineStack>
                      </div>
                    ))}

                  </BlockStack>
                )}

                <InlineStack>
                  <Button
                    onClick={() => {
                      setTempSelected(selectedProducts);
                      setOpenProductModal(true);
                    }}
                  >
                    Select products
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>


            <Modal
              open={openProductModal}
              onClose={() => setOpenProductModal(false)}
              title="Select Product"
              primaryAction={{
                content: 'Save',
                onAction: () => {
                  setSelectedProducts(tempSelected);
                  setOpenProductModal(false);

                }
              }}
              secondaryActions={[
                {
                  content: 'Close',
                  onAction: () => setOpenProductModal(false)
                }
              ]}
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

            <Card>
              <BlockStack gap="200">
                <Text variant="headingMd" as="h2">
                  Customer product changes
                </Text>

                {/* SWAP */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Checkbox
                    checked={productChanges.swap}
                    onChange={(val) => handleChange("swap", val)}
                  />
                  <div>
                    <Text variant="headingSm" as="h2">
                      Allow product swaps
                    </Text>
                    <p>{productChanges.swap ? text.swap.on : text.swap.off}</p>
                  </div>
                </div>

                {/* VARIANT */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Checkbox
                    checked={productChanges.variant}
                    onChange={(val) => handleChange("variant", val)}
                  />
                  <div>
                    <Text variant="headingSm" as="h2">
                      Allow variant changes
                    </Text>
                    <p>{productChanges.variant ? text.variant.on : text.variant.off}</p>
                  </div>
                </div>

                {/* QUANTITY */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Checkbox
                    checked={productChanges.quantity}
                    onChange={(val) => handleChange("quantity", val)}
                  />
                  <div>
                    <Text variant="headingSm" as="h2">
                      Allow quantity changes
                    </Text>
                    <p>{productChanges.quantity ? text.quantity.on : text.quantity.off}</p>
                  </div>
                </div>

                {/* DISCOUNT */}
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Checkbox
                    checked={productChanges.keepDiscount}
                    disabled={
                      !productChanges.swap &&
                      !productChanges.variant &&
                      !productChanges.quantity
                    }
                    onChange={(val) => handleChange("keepDiscount", val)}
                  />
                  <div>
                    <Text variant="headingSm" as="h2">
                      Keep discounts on product changes
                    </Text>
                    <p>
                      {productChanges.keepDiscount
                        ? text.keepDiscount.on
                        : text.keepDiscount.off}
                    </p>
                  </div>
                </div>
              </BlockStack>
            </Card>

            <DeliveryOption options={options} setOptions={setOptions} addOption={addOption} products={products} nextCursor={nextCursor}
              hasNextPage={hasNextPage}  />
          </BlockStack>
        </Grid.Cell>


        {/* RIGHT SIDE - DYNAMIC SUMMARY */}
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
          <div style={{ position: "sticky", top: "0px" }}>
            <Card>
              <BlockStack gap="300">

                {/* PLAN SUMMARY */}
                <div>
                  <Text variant="headingMd" as="h2">Summary</Text>
                  <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    <li>{options.length} delivery option{options.length !== 1 ? 's' : ''}</li>
                  </ul>
                </div>

                {/* CUSTOMER CHANGES */}
                <div>

                  {Object.values(productChanges).every(v => !v) ? (
                    ""
                  ) : (
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

                {/* DELIVERY OPTIONS */}
                {options.map((opt, i) => (
                  <div key={i}>
                    <Text variant="headingMd" as="h2">
                      {opt.name || `Option ${i + 1}`}
                    </Text>
                    <ul style={{ paddingLeft: '18px', margin: 0 }}>

                      {/* Delivery */}
                      {opt.deliveryFrequency && (
                        <li>Delivery: every {opt.deliveryFrequency} {opt.deliveryInterval}</li>
                      )}

                      {/* Billing type */}
                      <li>{opt.billingType === 'prepaid' ? 'Pre-paid' : 'Pay as you go'}</li>

                      {/* Orders range */}
                      {opt.minOrders !== 'disabled' && (
                        <li>Min {opt.minOrders} orders</li>
                      )}
                      {opt.maxOrders !== 'unlimited' && (
                        <li>Max {opt.maxOrders} orders</li>
                      )}

                      {/* Discount */}
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

                      {/* Shipping discount */}
                      {opt.giveShippingDiscount && opt.shippingDiscount && (
                        <li>
                          Shipping: {opt.shippingDiscountType === 'percentage'
                            ? `${opt.shippingDiscount}% off`
                            : `₹${opt.shippingDiscount} off`}
                          {opt.shippingAfterOrders ? ` after ${opt.shippingAfterOrders} orders` : ''}
                        </li>
                      )}

                      {/* Change Qty After Orders */}
                      {opt.changeQtyAfterOrders && opt.changeQtyQuantity && (
                        <li>
                          Change qty to {opt.changeQtyQuantity} after {opt.changeQtyAfterOrdersNum} orders
                        </li>
                      )}

                      {/* Remove Free Products */}
                      {opt.removeFreeProducts && (
                        <li>
                          Remove free products after {opt.removeFreeAfterOrders} orders
                        </li>
                      )}

                      {/* Min quantity */}
                      {opt.setMinQty && opt.minQuantity && (
                        <li>Min qty: {opt.minQuantity}</li>
                      )}

                      {/* Min quantity */}
                      {opt.setMinQty && opt.minQuantity && (
                        <li>Min qty: {opt.minQuantity}</li>
                      )}

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
