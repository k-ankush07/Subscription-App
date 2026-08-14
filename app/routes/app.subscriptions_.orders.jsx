import {
  Page,
  Card,
  EmptyState,
  TextField,
  Spinner,
  Badge,
  Icon,
} from "@shopify/polaris";
import { ExternalIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import React, { useState, useMemo, useCallback } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { currencySymbol } from "./utils/formatMoney.js";
import { formatDate } from "./utils/formatDate.js";
import { PaginationBar } from "./components/PaginationBar";

const PAGE_SIZE = 20;
const ORDERS_PER_CONTRACT = 50;
const CONTRACT_BATCH_SIZE = 25; // ek GraphQL call me kitne contracts khinchne hain

const CONTRACTS_WITH_ORDERS_QUERY = `
  query getContractsWithOrders($cursor: String, $batchSize: Int!) {
    subscriptionContracts(first: $batchSize, after: $cursor, reverse: true) {
      edges {
        node {
          id
          status
          customer {
            email
            firstName
            lastName
          }
          orders(first: ${ORDERS_PER_CONTRACT}, reverse: true) {
            edges {
              node {
                id
                name
                createdAt
                displayFinancialStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
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
  }
`;

function flattenContractEdges(edges) {
  const rows = [];
  for (const edge of edges) {
    const contract = edge.node;
    const contractNumericId = contract.id.split("/").pop();
    // orders(reverse:true) => naya order pehle; cycle number ke liye ascending order chahiye.
    const orderNodes = contract.orders.edges.map((e) => e.node).reverse();

    orderNodes.forEach((order, cycleIndex) => {
      rows.push({
        orderId: order.id,
        orderNumericId: order.id.split("/").pop(),
        orderName: order.name,
        contractId: contract.id,
        contractNumericId,
        email: contract.customer?.email ?? "-",
        customerName:
          `${contract.customer?.firstName || ""} ${contract.customer?.lastName || ""}`.trim(),
        price: order.totalPriceSet?.shopMoney?.amount ?? "0.00",
        currencyCode: order.totalPriceSet?.shopMoney?.currencyCode ?? "USD",
        cycle: cycleIndex,
        status: contract.status,
        financialStatus: order.displayFinancialStatus,
        createdAt: order.createdAt,
      });
    });
  }
  return rows;
}

// Sirf utne contracts fetch karta hai jitne "neededRows" order-rows jama karne ke
// liye zaroori hain — poore store ko har baar walk NAHI karta. Isi se speed fix hoti hai.
async function fetchOrderRowsUpTo(admin, { neededRows }) {
  let rows = [];
  let cursor = null;
  let hasMoreContracts = true;

  while (rows.length < neededRows && hasMoreContracts) {
    const res = await admin.graphql(CONTRACTS_WITH_ORDERS_QUERY, {
      variables: { cursor, batchSize: CONTRACT_BATCH_SIZE },
    });
    const data = await res.json();
    const result = data.data.subscriptionContracts;

    rows = rows.concat(flattenContractEdges(result.edges));

    hasMoreContracts = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  // Sabse naya order sabse upar (jitna data ab tak khincha hai usi ke andar sort)
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { rows, hasMoreContracts };
}

// Search me poora data chahiye (filter kisi bhi row par match ho sakta hai) —
// isliye ye path pura scan karta hai, sirf tab jab user search karta hai.
async function fetchAllContractsWithOrders(admin) {
  const { rows } = await fetchOrderRowsUpTo(admin, { neededRows: Infinity });
  return rows;
}

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (q) {
    const rows = await fetchAllContractsWithOrders(admin);
    return { mode: "search", rows, shop };
  }

  const page = parseInt(url.searchParams.get("page") || "1", 10);
  // +1 extra row fetch karke pata chal jata hai ki agla page hai ya nahi.
  const { rows, hasMoreContracts } = await fetchOrderRowsUpTo(admin, {
    neededRows: page * PAGE_SIZE + 1,
  });

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasNextPage = rows.length > page * PAGE_SIZE || hasMoreContracts;

  return { mode: "page", rows: pageRows, page, hasNextPage, shop };
}

function statusBadge(status) {
  const tone =
    status === "ACTIVE"
      ? "success"
      : status === "PAUSED"
        ? "warning"
        : status === "CANCELLED"
          ? "critical"
          : undefined;
  const label =
    status?.charAt(0) + status?.slice(1).toLowerCase();
  return <Badge tone={tone}>{label}</Badge>;
}

function SubscriptionOrders() {
  const loaderData = useLoaderData();
  const { shop } = loaderData;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  const isSearchMode = loaderData.mode === "search";

  // Search mode: poora dataset aaya hai, isliye client-side filter + paginate karte hain.
  const filteredRows = useMemo(() => {
    if (!isSearchMode) return [];
    const search = searchValue.trim().toLowerCase();
    if (!search) return loaderData.rows;
    return loaderData.rows.filter((r) => {
      return (
        r.orderNumericId.includes(search) ||
        r.contractNumericId.includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.orderName?.toLowerCase().includes(search)
      );
    });
  }, [isSearchMode, loaderData.rows, searchValue]);

  const page = parseInt(searchParams.get("page") || "1", 10);

  let paginatedRows, safePage, totalPages, totalItems, hasNextPage;

  if (isSearchMode) {
    totalItems = filteredRows.length;
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    paginatedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
    hasNextPage = safePage < totalPages;
  } else {
    // Page mode: loader ne sirf isi page ke rows bheje hain (server-side paginated).
    paginatedRows = loaderData.rows;
    safePage = loaderData.page;
    totalItems = undefined; // total count nahi pata (poora store scan nahi kiya)
    hasNextPage = loaderData.hasNextPage;
    totalPages = safePage + (hasNextPage ? 1 : 0);
  }

  const handleSearchChange = useCallback(
    (value) => {
      setSearchValue(value);
      const next = new URLSearchParams(searchParams);
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const openOrderInShopify = (numericId) => {
    window.open(
      `https://admin.shopify.com/store/${shop}/orders/${numericId}`,
      "_blank",
    );
  };

  const openContract = (numericId) => {
    navigate(`/app/subscription/${numericId}`);
  };

  return (
    <Page
      title="Subscription orders"
      backAction={{ onAction: () => navigate("/app/subscriptions") }}
    >
      <Card>
        <div style={{ padding: "10px 0" }}>
          <TextField
            label="Search orders"
            labelHidden
            placeholder="Search by Order ID, Contract ID or Email"
            value={searchValue}
            onChange={handleSearchChange}
            autoComplete="off"
          />
        </div>

        {paginatedRows.length === 0 ? (
          <EmptyState heading="No subscription orders found" image="">
            <p>No orders have been generated by your subscriptions yet.</p>
          </EmptyState>
        ) : (
          <div>
            <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Contract</th>
                  <th>Email</th>
                  <th>Price</th>
                  <th>Cycle</th>
                  <th>Status</th>
                  <th>Created at</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr key={row.orderId}>
                    <td>
                      {row.orderName}{" "}
                      <button
                        onClick={() => openOrderInShopify(row.orderNumericId)}
                        style={{ cursor: "pointer", background: "none", border: "none" }}
                      >
                        <Icon source={ExternalIcon} />
                      </button>
                    </td>
                    <td>
                      #{row.contractNumericId}{" "}
                      <button
                        onClick={() => openContract(row.contractNumericId)}
                        style={{ cursor: "pointer", background: "none", border: "none" }}
                      >
                        <Icon source={ExternalIcon} />
                      </button>
                    </td>
                    <td>{row.email}</td>
                    <td>
                      {currencySymbol(row.currencyCode)}
                      {Number(row.price).toFixed(2)}
                    </td>
                    <td>{row.cycle}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td>{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <PaginationBar
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => {
                const next = new URLSearchParams(searchParams);
                if (p === 1) next.delete("page");
                else next.set("page", p);
                setSearchParams(next, { replace: isSearchMode });
              }}
            />
          </div>
        )}
      </Card>
    </Page>
  );
}

export default SubscriptionOrders;