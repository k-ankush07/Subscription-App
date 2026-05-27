import React from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  DataTable,
  Badge,
  Frame,
} from '@shopify/polaris';
import { useNavigate } from 'react-router';

function Index() {
  const navigate= useNavigate()
  return (
    <Frame>
      <Page
        title="Subscriptions"
        subtitle="Manage your subscription plans and customers"
        primaryAction={{
          content: 'Create plan',
          onAction: () => {
            navigate("/app/plans")
          },
        }}
      >
        <BlockStack gap="500">

          {/* Welcome Banner */}
          <Banner
            title="Welcome to Subscription App"
            tone="success"
          >
            <p>
              Create flexible subscription plans, offer discounts, and grow recurring revenue.
            </p>
          </Banner>

          <Layout>

           

          </Layout>
        </BlockStack>
      </Page>
    </Frame>
  );
}

export default Index;