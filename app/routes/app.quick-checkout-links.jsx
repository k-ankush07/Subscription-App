import { Page } from '@shopify/polaris';
import React from 'react';
import { useNavigate } from 'react-router';

function QuickCheckoutAll() {
  const navigate = useNavigate();

  const handleCreate = () => {
    navigate('/app/quick-checkout-link/create');
  };

  return (
    <Page
      title="Quick Checkout Links"
      primaryAction={{
        content: 'Create Quick Checkout Link',
        onAction: handleCreate,
      }}
    >
      No quick checkout links
    </Page>
  );
}

export default QuickCheckoutAll;