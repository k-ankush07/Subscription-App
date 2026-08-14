import { Page, Icon, Button, Spinner } from "@shopify/polaris";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";
import React, { useState, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { formatDate } from "./utils/formatDate.js";

// Sirf naam/email chahiye yahan — lightweight, isliye badi batch size (250) safe hai.
async function fetchAllCustomersFromContracts(admin) {
  let hasNextPage = true;
  let cursor = null;
  const customerMap = new Map();

  while (hasNextPage) {
    const res = await admin.graphql(
      `
      query getCustomers($cursor: String) {
        subscriptionContracts(first: 250, after: $cursor) {
          edges {
            node {
              customer {
                id
                firstName
                lastName
                email
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      { variables: { cursor } },
    );
    const data = await res.json();
    const result = data.data.subscriptionContracts;

    for (const edge of result.edges) {
      const cust = edge.node.customer;
      if (!cust) continue;
      if (!customerMap.has(cust.id)) {
        customerMap.set(cust.id, {
          id: cust.id,
          numericId: cust.id.split("/").pop(),
          name: `${cust.firstName || ""} ${cust.lastName || ""}`.trim() || "—",
          email: cust.email,
        });
      }
    }

    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  return Array.from(customerMap.values());
}

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  const customers = await fetchAllCustomersFromContracts(admin);
  return { customers, shop };
}

// Ek customer ki subscriptions — apna alag fetcher, apna alag pagination state.
function CustomerRow({ customer, shop, navigate }) {
  const fetcher = useFetcher();
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setSubscriptions((prev) => [...prev, ...fetcher.data.contracts]);
      setCursor(fetcher.data.endCursor);
      setHasNextPage(fetcher.data.hasNextPage);
      setLoadedOnce(true);
    }
  }, [fetcher.state, fetcher.data]);

  const loadContracts = (afterCursor) => {
    const params = new URLSearchParams();
    params.set("customerId", customer.numericId);
    if (afterCursor) params.set("cursor", afterCursor);
    fetcher.load(
      `/app/subscriptions/customers/contracts?${params.toString()}`,
    );
  };

  const toggleExpand = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && !loadedOnce) {
      loadContracts(null);
    }
  };

  const handleLoadMore = () => {
    if (!hasNextPage || fetcher.state === "loading") return;
    loadContracts(cursor);
  };

  const isLoading = fetcher.state === "loading";

  const openShopifyCustomer = () => {
    window.open(
      `https://admin.shopify.com/store/${shop}/customers/${customer.numericId}`,
      "_blank",
    );
  };

  const handleSubscriptionClick = (contractId) => {
    navigate(`/app/subscription/${contractId.split("/").pop()}`);
  };

  const activeDates = subscriptions
    .filter((s) => s.status !== "CANCELLED" && s.nextBillingDate)
    .map((s) => new Date(s.nextBillingDate).getTime());
  const nextOrderDate = activeDates.length
    ? new Date(Math.min(...activeDates)).toISOString()
    : null;

  return (
    <React.Fragment>
      <tr>
        <td>
          <button
            onClick={toggleExpand}
            style={{ cursor: "pointer", background: "none", border: "none" }}
          >
            <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} />
          </button>
        </td>
        <td>
          <strong>{customer.name}</strong>
          <br />
          {customer.email}
        </td>
        <td>{loadedOnce ? (nextOrderDate ? formatDate(nextOrderDate) : "-") : "—"}</td>
        <td>
          <button
            onClick={openShopifyCustomer}
            style={{ cursor: "pointer", background: "none", border: "none" }}
          >
            <Icon source={ExternalIcon} />
          </button>
        </td>
      </tr>

      {isOpen && (
        <tr>
          <td></td>
          <td colSpan={3}>
            <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} style={{ background: "#fafafa" }}>
                    <td>
                      #{sub.id.split("/").pop()} — {sub.status}
                    </td>
                    <td>
                      {sub.status !== "CANCELLED"
                        ? formatDate(sub.nextBillingDate)
                        : "-"}
                    </td>
                    <td>{sub.productLabel}</td>
                    <td>
                      <button
                        onClick={() => handleSubscriptionClick(sub.id)}
                        style={{ cursor: "pointer", background: "none", border: "none" }}
                      >
                        <Icon source={ExternalIcon} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isLoading && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px" }}>
                <Spinner accessibilityLabel="Loading" size="small" />
              </div>
            )}

            {!isLoading && hasNextPage && (
              <div style={{ display: "flex", justifyContent: "center", padding: "8px" }}>
                <Button onClick={handleLoadMore} plain>
                  View more
                </Button>
              </div>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function CustomerPage() {
  const { customers, shop } = useLoaderData();
  const navigate = useNavigate();

  const handelBack = () => {
    navigate("/app/subscriptions");
  };

  return (
    <Page title="Customers" backAction={{ onAction: handelBack }}>
      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th></th>
            <th>Customer</th>
            <th>Next order date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              shop={shop}
              navigate={navigate}
            />
          ))}
        </tbody>
      </table>
    </Page>
  );
}

export default CustomerPage;