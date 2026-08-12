// import React from "react";
// import PortalNav from "./components/PortalNav";
// import { BlockStack, Page } from "@shopify/polaris";
// function CancelSubscription() {
//   return (
//     <Page title="Cancellation reason">
//       <BlockStack gap="400">
//         <PortalNav />
//       </BlockStack>
//     </Page>
//   );
// }

// export default CancelSubscription;

import {
  Page,
  Card,
  EmptyState,
  Badge,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React from "react";
import { useLoaderData, useNavigate, useNavigation } from "react-router";
import PortalNav from "./components/PortalNav";
import { BlockStack } from "@shopify/polaris";
const FETCH_LIMIT = 10;

const CONTRACT_FIELDS = `
  id
  status
  createdAt
  updatedAt
  customer {
    id
    firstName
    lastName
    email
  }
  lines(first: 5) {
    edges {
      node {
        id
        title
      }
    }
  }
`;

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  // paused OR cancelled dono chahiye — Shopify search query me OR support hota hai
  const res = await admin.graphql(
    `
    query getCancelledOrPausedContracts($query: String) {
      subscriptionContracts(first: ${FETCH_LIMIT}, reverse: true, query: $query) {
        edges {
          node {
            ${CONTRACT_FIELDS}
          }
        }
      }
    }`,
    {
      variables: {
        query: "(status:cancelled OR status:paused)",
      },
    },
  );

  const data = await res.json();
  const contracts = data.data.subscriptionContracts.edges.map((e) => e.node);

  return { contracts };
}

function StatusBadge({ status }) {
  if (status === "CANCELLED") {
    return <Badge tone="critical">Cancelled</Badge>;
  }
  if (status === "PAUSED") {
    return <Badge tone="warning">Paused</Badge>;
  }
  return <Badge>{status}</Badge>;
}

function CancelSubscription() {
  const { contracts } = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const handleRowClick = (id) => {
    navigate(`/app/subscription/${id}`);
  };

  return (
    <Page title="Cancellation reasons">
         <BlockStack gap="400">
         <PortalNav />
     
      <Card>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "4px 0 12px",
          }}
        >
          {isLoading && <Spinner accessibilityLabel="Loading" size="small" />}
        </div>

        {contracts.length === 0 ? (
          <EmptyState>
            <p>No paused or cancelled subscriptions</p>
          </EmptyState>
        ) : (
          <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Subscription</th>
                <th>Action</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((item) => {
                const contractId = item.id.split("/").pop();
                return (
                  <tr key={item.id}>
                    <td>
                      {item.customer?.firstName} {item.customer?.lastName}
                      <br />
                      {item.customer?.email}
                    </td>
                    <td
                      style={{ cursor: "pointer" }}
                      onClick={() => handleRowClick(contractId)}
                    >
                      #{contractId}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>{formatDate(item.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
       </BlockStack>
    </Page>
  );
}

export default CancelSubscription;
