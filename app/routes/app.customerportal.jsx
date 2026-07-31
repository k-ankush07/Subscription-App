// app/routes/app.customer-portal.jsx

import { useLoaderData } from "react-router";
import { useState } from "react";
import {
  Page,
  Card,
  TextField,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query GetCustomerAccountShareLinkData($pageCount: Int = 50) {
      shop {
        customerAccountsV2 {
          url
        }
      }
      customerAccountPages(first: $pageCount) {
        nodes {
          __typename
          handle
          title
          ... on CustomerAccountAppExtensionPage {
            appExtensionUuid
          }
        }
      }
      checkoutProfiles(first: 1, query: "is_published:true") {
        nodes {
          id
        }
      }
    }
  `);

  const { data } = await res.json();
  const baseUrl = data.shop.customerAccountsV2.url;
  const targetUuid = process.env.SHOPIFY_CUSTOMER_UID; // "Customer Portal Page"

  const myPage = data.customerAccountPages.nodes.find(
    (n) =>
      n.__typename === "CustomerAccountAppExtensionPage" &&
      n.appExtensionUuid === targetUuid,
  );

  const portalUrl = myPage
    ? `${baseUrl}/pages/${myPage.handle}`
    : baseUrl;

  const checkoutProfileId = data.checkoutProfiles.nodes[0]?.id.split("/").pop();

  const storeHandle = session.shop.replace(".myshopify.com", "");
  const checkoutEditorUrl = checkoutProfileId
    ? `https://admin.shopify.com/store/${storeHandle}/settings/checkout/editor/profiles/${checkoutProfileId}?page=profile&context=apps`
    : `https://${session.shop}/admin/settings/checkout`;

  return {
    portalUrl,
    shopDomain: session.shop,
    foundExtension: Boolean(myPage),
    checkoutEditorUrl,
  };
};

export default function CustomerPortal() {
  const { portalUrl, shopDomain, foundExtension, checkoutEditorUrl } =
    useLoaderData();
  const [copied, setCopied] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const copyUrl = async () => {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Page title="Customer portal">
      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text variant="headingSm" as="h2">
                Self-service
              </Text>
              <Text tone="subdued" as="p">
                To let customers manage subscriptions, enable it in{" "}
                <Link url={checkoutEditorUrl} target="_blank">
                  Checkout settings
                </Link>
                .
              </Text>
            </BlockStack>

            <BlockStack gap="100">
              <Text variant="headingSm" as="h2">
                Customer portal URL
              </Text>
              <Text tone="subdued" as="p">
                Add the customer portal URL anywhere you'd like to give
                customers an entry point to the subscriptions management page.
              </Text>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  background: "#f9fafb",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "13px",
                    wordBreak: "break-all",
                  }}
                >
                  {portalUrl}
                </span>

                <InlineStack gap="200">
                  <Button onClick={copyUrl}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button onClick={() => window.open(portalUrl, "_blank")}>
                    Open
                  </Button>
                </InlineStack>
              </div>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}