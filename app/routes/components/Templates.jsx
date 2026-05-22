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
  MediaCard
} from "@shopify/polaris";

function Templates({ products, nextCursor, hasNextPage }) {
  const navigate = useNavigate();

  const [openProductModal, setOpenProductModal] = useState(false);
  const [tempSelected, setTempSelected] = useState([]);
  const [pagination, setPagination] = useState({
    hasPrevious: false,
    hasNext: false,
    handlePrev: () => { },
    handleNext: () => { },
  });

  const handleClick = () => {
    navigate('/app/plans');
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
                <TextField label="Title" autoComplete="off" />
                <TextField label="Internal description" autoComplete="off" />
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

          </BlockStack>
        </Grid.Cell>

        {/* RIGHT SIDE */}
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
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
                  Option 1
                </Text>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  <li>Delivery: every 2 months</li>
                  <li>Save 10% off on all orders</li>
                </ul>
              </div>

            </BlockStack>
          </Card>
        </Grid.Cell>

      </Grid>
    </Page>
  );
}

export default Templates;
