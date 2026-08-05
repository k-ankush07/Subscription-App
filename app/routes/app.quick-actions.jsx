// import {
//   Page,
//   Card,
//   BlockStack,
//   Text,
//   InlineStack,
//   Button,
// } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import PortalNav from "./components/PortalNav";

// export const loader = async ({ request }) => {
//   await authenticate.admin(request);
//   // TODO: load quick actions data here
//   return {};
// };

// export default function QuickActions() {
//   return (
//     <Page title="Quick actions">
//       <BlockStack gap="400">
//         <PortalNav />

//         <Card>
//           <BlockStack gap="200">
//             <Card>
//               <h2>Pause subscription</h2>
//               <p>
//                 Send customers a direct link to pause their subscription.
//                 Clicking it opens the portal with a pause confirmation prompt.
//               </p>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   gap: "12px",
//                   border: "1px solid #d1d5db",
//                   borderRadius: "8px",
//                   padding: "10px 14px",
//                   background: "#f9fafb",
//                 }}
//               >
//                 <span
//                   style={{
//                     fontFamily: "monospace",
//                     fontSize: "13px",
//                     wordBreak: "break-all",
//                   }}
//                 >
//                   https://shopify.com/73325314260/account/pages/7c4a25d5-0da8-4259-bf5f-40ed6112e4d6
//                 </span>

//                 <InlineStack gap="200">
//                   <Button>Copy</Button>
//                 </InlineStack>
//               </div>
//               <p>Email variable: <span>{`{{ pause_subscription_url }}`}</span></p>
//             </Card>
//              <Card>
//               <h2>Cancel subscription</h2>
//               <p>
//                 Send customers a direct link to cancel their subscription. Clicking it opens the portal with a cancellation confirmation prompt
//               </p>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   gap: "12px",
//                   border: "1px solid #d1d5db",
//                   borderRadius: "8px",
//                   padding: "10px 14px",
//                   background: "#f9fafb",
//                 }}
//               >
//                 <span
//                   style={{
//                     fontFamily: "monospace",
//                     fontSize: "13px",
//                     wordBreak: "break-all",
//                   }}
//                 >
//                   https://shopify.com/73325314260/account/pages/7c4a25d5-0da8-4259-bf5f-40ed6112e4d6
//                 </span>

//                 <InlineStack gap="200">
//                   <Button>Copy</Button>
//                 </InlineStack>
//               </div>
//               <p>Email variable: <span>{`{{ cancel_subscription_url }}`}</span></p>
//             </Card>
//              <Card>
//               <h2>Resume subscription</h2>
//               <p>
//                Send customers a direct link to resume their paused subscription. Clicking it opens the portal with a resume confirmation prompt.
//               </p>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   gap: "12px",
//                   border: "1px solid #d1d5db",
//                   borderRadius: "8px",
//                   padding: "10px 14px",
//                   background: "#f9fafb",
//                 }}
//               >
//                 <span
//                   style={{
//                     fontFamily: "monospace",
//                     fontSize: "13px",
//                     wordBreak: "break-all",
//                   }}
//                 >
//                   https://shopify.com/73325314260/account/pages/7c4a25d5-0da8-4259-bf5f-40ed6112e4d6
//                 </span>

//                 <InlineStack gap="200">
//                   <Button>Copy</Button>
//                 </InlineStack>
//               </div>
//               <p>Email variable: <span>{`{{ resume_subscription_url  }}`}</span></p>
//             </Card>
            
//           </BlockStack>
//         </Card>
//       </BlockStack>
//     </Page>
//   );
// }



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
                  {pauseUrl}
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
                  {cancelUrl}
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
                  {resumeUrl}
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