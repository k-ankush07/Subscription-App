

// app/routes/app.quick-actions.jsx
import { useLoaderData } from "react-router";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import PortalNav from "./components/PortalNav";

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
          ... on CustomerAccountAppExtensionPage {
            appExtensionUuid
          }
        }
      }
    }
  `);

  const { data } = await res.json();
  const baseUrl = data.shop.customerAccountsV2.url;
  const targetUuid = process.env.SHOPIFY_CUSTOMER_UID;

  const myPage = data.customerAccountPages.nodes.find(
    (n) =>
      n.__typename === "CustomerAccountAppExtensionPage" &&
      n.appExtensionUuid === targetUuid,
  );

  const portalUrl = myPage ? `${baseUrl}/pages/${myPage.handle}` : baseUrl;

  return { portalUrl };
};

export default function QuickActions() {
  const { portalUrl } = useLoaderData();

  const pauseUrl = `${portalUrl}/subscriptions/${encodeURIComponent(
  "{{ subscriptionContractId }}"
)}?quickAction=pause`;

  const cancelUrl =
    `${portalUrl}/subscriptions/${encodeURIComponent(
  "{{ subscriptionContractId }}"
)}?quickAction=cancel`;

  const resumeUrl =
    `${portalUrl}/subscriptions/${encodeURIComponent(
  "{{ subscriptionContractId }}"
)}?quickAction=resume`;

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
  };
const trimUrl = (url, maxLength = 50) => {
  return url.length > maxLength ? `${url.slice(0, maxLength)}...` : url;
};
  return (
    <Page title="Quick actions">
      <BlockStack gap="400">
        <PortalNav />

        <Card>
          <BlockStack gap="200">
            <Card>
              <h2>Pause subscription</h2>
              <p>
                Send customers a direct link to pause their subscription.
              </p>
              <div style={{ /* same styles as before */ }}>
                <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                  {trimUrl(pauseUrl)}
                </span>
                <InlineStack gap="200">
                  <Button onClick={() => copy(pauseUrl)}>Copy</Button>
                </InlineStack>
              </div>
              <p>
                Email variable:{" "}
                <span>{`{{ pause_subscription_url }}`}</span>
              </p>
            </Card>

            <Card>
              <h2>Cancel subscription</h2>
              <p>Send customers a direct link to cancel their subscription.</p>
              <div style={{ /* same styles */ }}>
                <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                  {trimUrl(cancelUrl)}
                </span>
                <InlineStack gap="200">
                  <Button onClick={() => copy(cancelUrl)}>Copy</Button>
                </InlineStack>
              </div>
              <p>
                Email variable:{" "}
                <span>{`{{ cancel_subscription_url }}`}</span>
              </p>
            </Card>

            <Card>
              <h2>Resume subscription</h2>
              <p>Send customers a direct link to resume their subscription.</p>
              <div style={{ /* same styles */ }}>
                <span style={{ fontFamily: "monospace", fontSize: "13px" }}>
                  {trimUrl(resumeUrl)}
                </span>
                <InlineStack gap="200">
                  <Button onClick={() => copy(resumeUrl)}>Copy</Button>
                </InlineStack>
              </div>
              <p>
                Email variable:{" "}
                <span>{`{{ resume_subscription_url }}`}</span>
              </p>
            </Card>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}