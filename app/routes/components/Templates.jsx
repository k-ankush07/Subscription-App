import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import Products from "../components/Products";

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
  Checkbox
} from "@shopify/polaris";
import { CheckboxIcon } from '@shopify/polaris-icons';

function Templates({ products, nextCursor, hasNextPage }) {
  const navigate = useNavigate();

  const [openProductModal, setOpenProductModal] = useState(false);
  const [tempSelected, setTempSelected] = useState([]);
  const [productChanges, setProductChanges] = useState({
    swap: false,
    variant: false,
    quantity: false,
    keepDiscount: false,
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

  return (
    <Page
      backAction={{
        content: 'Products',
        onAction: handleClick,
      }}
      title="Plan name"
      primaryAction={{ content: 'Publish' }}
      secondaryActions={[
        { content: 'Save as draft' },
      ]}
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
                  value="Subscribe and save"
                  autoComplete="off"
                  helpText="Customers will see this on the storefront product pages that have subscriptions."
                />

                <TextField
                  label="Internal description"
                  value="Plan1"
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

                <InlineStack>
                  <Button
                    onClick={() => {
                      setTempSelected([]);
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
                  setOpenProductModal(false);
                  setTempSelected([]);
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
            
          </BlockStack>
        </Grid.Cell>

        {/* RIGHT SIDE */}
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
          <div style={{position:"sticky", top:"0px"}}>
            <Card>
            <BlockStack gap="300">

              <div>
                <Text variant="headingMd" as="h2">
                  Summary
                </Text>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li>1 delivery</li>
                </ul>
              </div>


              <div>
                <Text variant="headingMd" as="h2">
                  Customer product changes
                </Text>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li> Allow product swaps</li>
                  <li>Allow variant changes</li>
                  <li>Allow quantity changes</li>
                  <li>Keep discounts on product changes</li>
                </ul>
              </div>

              <div>
                <Text variant="headingMd" as="h2">
                  Option 1
                </Text>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li>Delivery: every 2 months</li>
                  <li>Save 10% off on the initial order and all future orders</li>
                </ul>
              </div>

            </BlockStack>
          </Card>
          </div>
        </Grid.Cell>

      </Grid>
    </Page>
  );
}

export default Templates;
