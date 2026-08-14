import { Page, Icon, Button, Spinner, TextField } from "@shopify/polaris";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalIcon,
} from "@shopify/polaris-icons";
import React, { useState, useEffect, useMemo } from "react";
import {
  useLoaderData,
  useNavigate,
  useFetcher,
  useLocation,
} from "react-router";
import { authenticate } from "../shopify.server";
import { formatDate } from "./utils/formatDate.js";

const PAGE_SIZE = 30;

// Sirf naam/email/nextOrderDate chahiye yahan — lightweight list build karne ke liye.
// Ye poore store ke contracts ek baar walk karta hai (250 per page), isliye
// "next order date" ko saare contracts (na ki sirf 30) se accurately compute
// kar sakte hain, bina extra API calls badhaye.
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
              status
              nextBillingDate
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
      const node = edge.node;
      const cust = node.customer;
      if (!cust) continue;

      if (!customerMap.has(cust.id)) {
        customerMap.set(cust.id, {
          id: cust.id,
          numericId: cust.id.split("/").pop(),
          name: `${cust.firstName || ""} ${cust.lastName || ""}`.trim() || "—",
          email: cust.email,
          nextOrderDate: null,
        });
      }

      // Har contract ke liye nearest active billing date track karo,
      // taaki poore customer ka sabse jaldi wala "next order date" mile —
      // saare contracts se, na ki sirf pehle 30 (jo expand pe lazy-load hote hain).
      if (node.status !== "CANCELLED" && node.nextBillingDate) {
        const entry = customerMap.get(cust.id);
        const candidate = new Date(node.nextBillingDate).getTime();
        if (
          entry.nextOrderDate === null ||
          candidate < new Date(entry.nextOrderDate).getTime()
        ) {
          entry.nextOrderDate = node.nextBillingDate;
        }
      }
    }

    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  return Array.from(customerMap.values());
}

// Ek customer ke contracts, page-by-page (30 per batch), expand hone par lazy-fetch.
async function fetchContractsForCustomer(admin, customerNumericId, cursor) {
  const res = await admin.graphql(
    `
    query getCustomerContracts($cursor: String, $query: String) {
      subscriptionContracts(first: ${PAGE_SIZE}, after: $cursor, query: $query) {
        edges {
          node {
            id
            status
            nextBillingDate
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
    {
      variables: {
        cursor: cursor || null,
        query: `customer_id:${customerNumericId}`,
      },
    },
  );

  const data = await res.json();
  const result = data.data.subscriptionContracts;

  const contracts = result.edges.map((e) => {
    const node = e.node;
    const lines = node.lines?.edges?.map((l) => l.node) ?? [];
    const productLabel =
      lines.length === 1 ? lines[0].title : `${lines.length} Products`;

    return {
      id: node.id,
      status: node.status,
      nextBillingDate: node.nextBillingDate,
      productLabel,
    };
  });

  return {
    contracts,
    hasNextPage: result.pageInfo.hasNextPage,
    endCursor: result.pageInfo.endCursor,
  };
}

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  // Fetcher call: sirf ek customer ke contracts chahiye (row expand / view more).
  if (customerId) {
    const cursor = url.searchParams.get("cursor");
    const result = await fetchContractsForCustomer(admin, customerId, cursor);
    return { mode: "contracts", ...result };
  }

  // Normal page load: saare customers (lightweight, name/email/nextOrderDate).
  const shop = session.shop.replace(".myshopify.com", "");
  const customers = await fetchAllCustomersFromContracts(admin);
  return { mode: "customers", customers, shop };
}

// Ek customer ki subscriptions — apna alag fetcher, apna alag pagination state.
function CustomerRow({ customer, shop, navigate, location }) {
  const fetcher = useFetcher();
  const [isOpen, setIsOpen] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Kaunse contract ID pe "View details" click hua hai, taaki sirf usi
  // row ka button loading dikhaye, baaki sab normal rahein.
  const [navigatingId, setNavigatingId] = useState(null);

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
    fetcher.load(`${location.pathname}?${params.toString()}`);
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
    const numericId = contractId.split("/").pop();
    setNavigatingId(contractId);
    navigate(`/app/subscription/${numericId}`);
  };

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
        <td>
          {customer.nextOrderDate ? formatDate(customer.nextOrderDate) : "-"}
        </td>
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
                        disabled={navigatingId === sub.id}
                        style={{ cursor: "pointer", background: "none", border: "none" }}
                      >
                        {navigatingId === sub.id ? (
                          <Spinner accessibilityLabel="Loading" size="small" />
                        ) : (
                          <Icon source={ExternalIcon} />
                        )}
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

            {!isLoading && loadedOnce && subscriptions.length === 0 && (
              <p style={{ padding: "8px", color: "gray" }}>
                No subscriptions found.
              </p>
            )}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}

function CustomerPage() {
  const loaderData = useLoaderData();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState("");

  const handelBack = () => {
    navigate("/app/subscriptions");
  };

  // Ye guard sirf tab kaam aata hai jab fetcher se return hua data
  // kabhi is top-level component se accidentally read ho jaye —
  // normally fetcher.load se ye path navigate/re-render nahi karta.
  const allCustomers = loaderData.mode === "customers" ? loaderData.customers : [];
  const shop = loaderData.shop;

  const filteredCustomers = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return allCustomers;
    return allCustomers.filter((c) => {
      const name = c.name?.toLowerCase() || "";
      const email = c.email?.toLowerCase() || "";
      return name.includes(search) || email.includes(search);
    });
  }, [allCustomers, searchValue]);

  return (
    <Page title="Customers" backAction={{ onAction: handelBack }}>
      <div style={{ padding: "10px 0" }}>
        <TextField
          label="Search by name or email"
          labelHidden
          placeholder="Search by name or email"
          value={searchValue}
          onChange={setSearchValue}
          autoComplete="off"
        />
      </div>

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
          {filteredCustomers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              shop={shop}
              navigate={navigate}
              location={location}
            />
          ))}
        </tbody>
      </table>

      {filteredCustomers.length === 0 && (
        <p style={{ padding: "16px", textAlign: "center", color: "gray" }}>
          No customers found.
        </p>
      )}
    </Page>
  );
}

export default CustomerPage;