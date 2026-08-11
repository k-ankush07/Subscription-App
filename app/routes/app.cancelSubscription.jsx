import React from "react";
import PortalNav from "./components/PortalNav";
import { BlockStack, Page } from "@shopify/polaris";
function CancelSubscription() {
  return (
    <Page title="Cancellation reason">
      <BlockStack gap="400">
        <PortalNav />
      </BlockStack>
    </Page>
  );
}

export default CancelSubscription;
