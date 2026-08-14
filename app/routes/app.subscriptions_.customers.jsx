import { Page, Icon, Button } from "@shopify/polaris";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";
import React, { useState, useMemo, useEffect } from "react";
import { useLoaderData, useNavigate, useFetcher, useLocation } from "react-router";
import { authenticate } from "../shopify.server";
import { formatDate } from "./utils/formatDate.js";

const PAGE_SIZE = 30;

async function fetchContractsPage(admin, cursor) {
  const res = await admin.graphql(
    `
    query getContractsPage($cursor: String) {
      subscriptionContracts(first: ${PAGE_SIZE}, after: $cursor) {
        edges {
          node {
            id
            status
            createdAt
            nextBillingDate
            customer {
              id
              firstName
              lastName
              email
            }
            lines(first: 50) {
              edges {
                node {
                  title
                  quantity
                  currentPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    { variables: { cursor: cursor || null } },
  );
  const data = await res.json();
  const result = data.data.subscriptionContracts;
  return {
    contracts: result.edges.map((e) => e.node),
    hasNextPage: result.pageInfo.hasNextPage,
    endCursor: result.pageInfo.endCursor,
  };
}

// Pure function — client aur server dono jagah reuse hoti hai.
// Raw contracts ki list leke customer-wise group + aggregate karti hai.
function groupContractsByCustomer(contracts) {
  const customerMap = new Map();

  for (const contract of contracts) {
    const cust = contract.customer;
    if (!cust) continue;
    const key = cust.id;

    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: cust.id,
        numericId: cust.id.split("/").pop(),
        name: `${cust.firstName || ""} ${cust.lastName || ""}`.trim() || "—",
        email: cust.email,
        subscriptions: [],
      });
    }

    const entry = customerMap.get(key);

    const lines = contract.lines?.edges?.map((e) => e.node) ?? [];
    const contractTotal = lines.reduce((sum, l) => {
      const price = parseFloat(l?.currentPrice?.amount ?? 0);
      const qty = l?.quantity ?? 1;
      return sum + price * qty;
    }, 0);
    const currencyCode = lines[0]?.currentPrice?.currencyCode;
    const productLabel =
      lines.length === 1 ? lines[0].title : `${lines.length} Products`;

    entry.subscriptions.push({
      id: contract.id,
      status: contract.status,
      nextBillingDate: contract.nextBillingDate,
      total: contractTotal,
      currencyCode,
      productLabel,
    });
  }

  return Array.from(customerMap.values()).map((c) => {
    const activeDates = c.subscriptions
      .filter((s) => s.status !== "CANCELLED" && s.nextBillingDate)
      .map((s) => new Date(s.nextBillingDate).getTime());
    const nextOrderDate = activeDates.length
      ? new Date(Math.min(...activeDates)).toISOString()
      : null;

    return {
      ...c,
      nextOrderDate,
      subscriptionCount: c.subscriptions.length,
    };
  });
}

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const shop = session.shop.replace(".myshopify.com", "");

  const { contracts, hasNextPage, endCursor } = await fetchContractsPage(
    admin,
    cursor,
  );

  return { contracts, hasNextPage, endCursor, shop };
}

function CustomerPage() {
  const loaderData = useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher();

  const [allContracts, setAllContracts] = useState(loaderData.contracts);
  const [cursor, setCursor] = useState(loaderData.endCursor);
  const [hasNextPage, setHasNextPage] = useState(loaderData.hasNextPage);
  const [expanded, setExpanded] = useState({});

  // Fresh load hone par (revalidate ya first mount) state reset.
  useEffect(() => {
    setAllContracts(loaderData.contracts);
    setCursor(loaderData.endCursor);
    setHasNextPage(loaderData.hasNextPage);
  }, [loaderData]);

  // "Load more" se aaya naya batch, purane data ke sath merge karo.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setAllContracts((prev) => [...prev, ...fetcher.data.contracts]);
      setCursor(fetcher.data.endCursor);
      setHasNextPage(fetcher.data.hasNextPage);
    }
  }, [fetcher.state, fetcher.data]);

  const customers = useMemo(
    () => groupContractsByCustomer(allContracts),
    [allContracts],
  );

  const isLoadingMore = fetcher.state === "loading";

  const handelBack = () => {
    navigate("/app/subscriptions");
  };

  const toggleExpand = (customerId) => {
    setExpanded((prev) => ({ ...prev, [customerId]: !prev[customerId] }));
  };

  const handleSubscriptionClick = (contractId) => {
    navigate(`/app/subscription/${contractId.split("/").pop()}`);
  };

  const openShopifyCustomer = (numericId) => {
    window.open(
      `https://admin.shopify.com/store/${loaderData.shop}/customers/${numericId}`,
      "_blank",
    );
  };

  const handleLoadMore = () => {
    if (!hasNextPage || isLoadingMore) return;
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    fetcher.load(`${location.pathname}?${params.toString()}`);
  };

  return (
    <Page title="Customers" backAction={{ onAction: handelBack }}>
      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th></th>
            <th>Customer</th>
            <th>Subscriptions</th>
            <th>Next order date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const isOpen = !!expanded[customer.id];
            return (
              <React.Fragment key={customer.id}>
                <tr>
                  <td>
                    <button
                      onClick={() => toggleExpand(customer.id)}
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
                  <td>{customer.subscriptionCount}</td>
                  <td>
                    {customer.nextOrderDate
                      ? formatDate(customer.nextOrderDate)
                      : "-"}
                  </td>
                  <td>
                    <button
                      onClick={() => openShopifyCustomer(customer.numericId)}
                      style={{ cursor: "pointer", background: "none", border: "none" }}
                    >
                      <Icon source={ExternalIcon} />
                    </button>
                  </td>
                </tr>

                {isOpen &&
                  customer.subscriptions.map((sub) => (
                    <tr key={sub.id} style={{ background: "#fafafa" }}>
                      <td></td>
                      <td colSpan={2}>
                        #{sub.id.split("/").pop()} — {sub.status}
                      </td>
                      <td>
                        {sub.status !== "CANCELLED"
                          ? formatDate(sub.nextBillingDate)
                          : "-"}
                      </td>
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
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {hasNextPage && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
          <Button onClick={handleLoadMore} loading={isLoadingMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading…" : "Show more"}
          </Button>
        </div>
      )}
    </Page>
  );
}

export default CustomerPage;