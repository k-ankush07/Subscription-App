import React, { useEffect, useState } from 'react';

import {
  Card,
  IndexTable,
  Text,
  Icon,
  useIndexResourceState,
  LegacyCard,
  EmptyState,
  Page,
  Button,
} from '@shopify/polaris';

import { DuplicateIcon } from '@shopify/polaris-icons';

import { useNavigate } from 'react-router';
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from 'react-router';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return json({
    shop: session.shop,
  });
};

function plans() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData]= useState([])

  const handleClick = async () => {
    setLoading(true);
     await new Promise((resolve) => setTimeout(resolve, 500));
    navigate('/app/plan/create');
  };

  const plans = [
      {
      id: '1',
      planTitle: 'Plan #1',
      products: 'Vittelo Belt',
      deliveryFrequency: 'Every month',
      pricing: '10% off',
    },
    {
      id: '2',
      planTitle: 'Plan #1',
      products: 'Vittelo Belt',
      deliveryFrequency: 'Every month',
      pricing: '70% off',
    },

  ];

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(plans);

  const rowMarkup = plans.map(
    ({ id, planTitle, products, deliveryFrequency, pricing }, index) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        onClick={() => {}}
      >
        <IndexTable.Cell>
          <Text as="span" variant="bodyMd" fontWeight="bold">
            {planTitle}
          </Text>
        </IndexTable.Cell>

        <IndexTable.Cell>{products}</IndexTable.Cell>

        <IndexTable.Cell>{deliveryFrequency}</IndexTable.Cell>

        <IndexTable.Cell>{pricing}</IndexTable.Cell>

        <IndexTable.Cell>
          <Icon source={DuplicateIcon} tone="base" />
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  );

  return (
    <Page
      title="Selling plans"
      primaryAction={
       plans.length !== 0
    ? {
        content: 'Create Plan',
        onAction: handleClick,
        loading: loading,
      }
    : null
      }
    >
      {plans.length === 0 ? (
        <LegacyCard >
          <EmptyState
            heading="Get more repeat business"
            action={{
              content: 'Create Plan',
              onAction: handleClick,
            }}
            image="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png"
          >
            <p>
              Allow customers to purchase products or services on a recurring
              basis.
            </p>
          </EmptyState>
        </LegacyCard>
      ) : (
        <>
          

          <Card padding="0">
            <IndexTable
            
              itemCount={plans.length}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
               bulkActions={[]}
              headings={[
                { title: 'Plan title' },
                { title: 'Products' },
                { title: 'Delivery frequency' },
                { title: 'Pricing' },
                { title: 'Actions' },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </>
      )}
    </Page>
  );
}

export default plans;