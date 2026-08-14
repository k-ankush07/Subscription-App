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
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
  useLocation,
  useFetcher,
} from "react-router";
import { currencySymbol } from "./utils/formatMoney.js";
import { formatDate } from "./utils/formatDate.js";
import { PaginationBar } from "./components/PaginationBar";

const PAGE_SIZE = 20;
const ORDERS_PAGE_SIZE = 250; 
const CONTRACT_BATCH_SIZE = 25; 
const SEARCH_DEBOUNCE_MS = 500;

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
          orders(first: ${ORDERS_PAGE_SIZE}, reverse: true) {
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
            pageInfo {
              hasNextPage
              endCursor
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

const CONTRACT_ORDERS_PAGE_QUERY = `
  query getContractOrdersPage($id: ID!, $cursor: String) {
    subscriptionContract(id: $id) {
      orders(first: ${ORDERS_PAGE_SIZE}, after: $cursor, reverse: true) {
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
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

async function fetchRemainingOrdersForContract(admin, contractId, firstCursor) {
  let edges = [];
  let cursor = firstCursor;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await admin.graphql(CONTRACT_ORDERS_PAGE_QUERY, {
      variables: { id: contractId, cursor },
    });
    const data = await res.json();
    const ordersConn = data.data?.subscriptionContract?.orders;
    if (!ordersConn) break;

    edges = edges.concat(ordersConn.edges);
    hasNextPage = ordersConn.pageInfo.hasNextPage;
    cursor = ordersConn.pageInfo.endCursor;
  }

  return edges;
}

function flattenContract(contract, orderEdges) {
  const rows = [];
  const contractNumericId = contract.id.split("/").pop();
  const orderNodes = orderEdges.map((e) => e.node).reverse();

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
  return rows;
}

async function flattenContractEdgesFull(admin, edges) {
  let rows = [];
  for (const edge of edges) {
    const contract = edge.node;
    let orderEdges = contract.orders.edges;

    if (contract.orders.pageInfo?.hasNextPage) {
      const rest = await fetchRemainingOrdersForContract(
        admin,
        contract.id,
        contract.orders.pageInfo.endCursor,
      );
      orderEdges = orderEdges.concat(rest);
    }

    rows = rows.concat(flattenContract(contract, orderEdges));
  }
  return rows;
}

async function fetchOrderRowsFrom(admin, { cursor, neededRows }) {
  let rows = [];
  let currentCursor = cursor ?? null;
  let hasMoreContracts = true;

  while (rows.length < neededRows && hasMoreContracts) {
    const res = await admin.graphql(CONTRACTS_WITH_ORDERS_QUERY, {
      variables: { cursor: currentCursor, batchSize: CONTRACT_BATCH_SIZE },
    });
    const data = await res.json();
    const result = data.data.subscriptionContracts;

    const batchRows = await flattenContractEdgesFull(admin, result.edges);
    rows = rows.concat(batchRows);

    hasMoreContracts = result.pageInfo.hasNextPage;
    currentCursor = result.pageInfo.endCursor;
  }

  return { rows, hasMoreContracts, endCursor: currentCursor };
}

async function fetchAllContractsWithOrders(admin) {
  const { rows } = await fetchOrderRowsFrom(admin, {
    cursor: null,
    neededRows: Infinity,
  });
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  const cursorParam = url.searchParams.get("cursor");
  const needParam = url.searchParams.get("need");

  if (cursorParam !== null) {
    const { rows, hasMoreContracts, endCursor } = await fetchOrderRowsFrom(admin, {
      cursor: cursorParam === "null" ? null : cursorParam,
      neededRows: parseInt(needParam || String(PAGE_SIZE + 1), 10),
    });
    return { mode: "more", rows, hasMoreContracts, endCursor };
  }

  const { rows, hasMoreContracts, endCursor } = await fetchOrderRowsFrom(admin, {
    cursor: null,
    neededRows: PAGE_SIZE + 1,
  });

  return { mode: "initial", rows, hasMoreContracts, endCursor, shop };
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
  const label = status?.charAt(0) + status?.slice(1).toLowerCase();
  return <Badge tone={tone}>{label}</Badge>;
}

function SubscriptionOrders() {
  const loaderData = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  // searchValue: TextField ka live value — har keystroke pe turant update,
  // taaki typing me koi lag na ho.
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  const shop = loaderData.shop;
  const isSearchMode = loaderData.mode === "search";
  const [rowsState, setRowsState] = useState(() =>
    loaderData.mode === "initial"
      ? {
          allRows: loaderData.rows,
          cursor: loaderData.endCursor,
          hasMoreContracts: loaderData.hasMoreContracts,
        }
      : { allRows: [], cursor: null, hasMoreContracts: false },
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pendingTargetPageRef = useRef(null);

  useEffect(() => {
    if (loaderData.mode === "initial") {
      setRowsState({
        allRows: loaderData.rows,
        cursor: loaderData.endCursor,
        hasMoreContracts: loaderData.hasMoreContracts,
      });
      setCurrentPage(1);
    }
  }, [loaderData]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && pendingTargetPageRef.current != null) {
      const targetPage = pendingTargetPageRef.current;
      setRowsState((prev) => {
        const merged = [...prev.allRows, ...fetcher.data.rows];
        merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return {
          allRows: merged,
          cursor: fetcher.data.endCursor,
          hasMoreContracts: fetcher.data.hasMoreContracts,
        };
      });
      setCurrentPage(targetPage);
      pendingTargetPageRef.current = null;
    }
  }, [fetcher.state, fetcher.data]);

  // Search input ke liye alag debounce timer. Query param (aur isliye loader's
  // heavy fetchAllContractsWithOrders call) sirf tab update hota hai jab user
  // 500ms tak typing rok de — har keystroke pe navigation/API call nahi hoti.
  const searchDebounceTimerRef = useRef(null);

  const commitSearchParam = useCallback(
    (value) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSearchChange = useCallback(
    (value) => {
      setSearchValue(value);

      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      searchDebounceTimerRef.current = setTimeout(() => {
        commitSearchParam(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [commitSearchParam],
  );

  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

  const isLoadingMore = fetcher.state === "loading";
  const isNavigatingHere =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname;

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

  let paginatedRows, safePage, totalPages, totalItems, hasNextPage;

  if (isSearchMode) {
    const page = parseInt(searchParams.get("page") || "1", 10);
    totalItems = filteredRows.length;
    totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * PAGE_SIZE;
    paginatedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);
    hasNextPage = safePage < totalPages;
  } else {
    safePage = currentPage;
    paginatedRows = rowsState.allRows.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE,
    );
    totalItems = undefined; 
    hasNextPage =
      rowsState.allRows.length > currentPage * PAGE_SIZE || rowsState.hasMoreContracts;
    totalPages = currentPage + (hasNextPage ? 1 : 0);
  }

  const goToPage = useCallback(
    (targetPage) => {
      if (isSearchMode) {
        const next = new URLSearchParams(searchParams);
        if (targetPage === 1) next.delete("page");
        else next.set("page", targetPage);
        setSearchParams(next, { replace: true });
        return;
      }

      if (isLoadingMore) return; 

      const neededRows = targetPage * PAGE_SIZE + 1;
      if (rowsState.allRows.length >= neededRows || !rowsState.hasMoreContracts) {
        setCurrentPage(targetPage);
        return;
      }

      const params = new URLSearchParams();
      params.set("cursor", rowsState.cursor ?? "null");
      params.set("need", String(neededRows - rowsState.allRows.length));
      pendingTargetPageRef.current = targetPage;
      fetcher.load(`${location.pathname}?${params.toString()}`);
    },
    [isSearchMode, isLoadingMore, rowsState, searchParams, setSearchParams, fetcher, location.pathname],
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

  const showBusy = isLoadingMore || isNavigatingHere;

  return (
    <Page
      title="Subscription orders"
      backAction={{ onAction: () => navigate("/app/subscriptions") }}
    >
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <TextField
              label="Search orders"
              labelHidden
              placeholder="Search by Order ID, Contract ID or Email"
              value={searchValue}
              onChange={handleSearchChange}
              autoComplete="off"
            />
          </div>
          <div style={{ width: 24, marginLeft: 8 }}>
            {showBusy && <Spinner accessibilityLabel="Loading" size="small" />}
          </div>
        </div>

        {paginatedRows.length === 0 && !showBusy ? (
          <EmptyState heading="No subscription orders found" image="">
            <p>No orders have been generated by your subscriptions yet.</p>
          </EmptyState>
        ) : (
          <div style={{ opacity: showBusy ? 0.5 : 1, transition: "opacity 0.15s" }}>
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
              onPageChange={(p) => goToPage(p)}
            />
          </div>
        )}
      </Card>
    </Page>
  );
}

export default SubscriptionOrders;