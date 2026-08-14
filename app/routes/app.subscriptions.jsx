
import {
  Page,
  Card,
  EmptyState,
  Tabs,
  TextField,
  Spinner,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
  useLocation,
  useFetcher,
} from "react-router";
import { currencySymbol } from "./utils/formatMoney.js";
import { PaginationBar } from "./components/PaginationBar";
import { formatDate } from "./utils/formatDate.js"
const PAGE_SIZE = 10;

export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }) {
  if (currentUrl.pathname !== nextUrl.pathname) {
    return defaultShouldRevalidate;
  }
  const keys = ["status", "q"];
  return keys.some((k) => currentUrl.searchParams.get(k) !== nextUrl.searchParams.get(k));
}

const CONTRACT_FIELDS = `
  id
  status
  createdAt
  updatedAt
  nextBillingDate
  currencyCode
  customer {
    id
    firstName
    lastName
    email
  }
  deliveryPolicy {
    interval
    intervalCount
  }
  lines(first: 50) {
    edges {
      node {
        id
        title
        quantity
        sellingPlanName
        sellingPlanId
        pricingPolicy {
          cycleDiscounts {
            afterCycle
            adjustmentType
            adjustmentValue {
              ... on SellingPlanPricingPolicyPercentageValue {
                percentage
              }
              ... on MoneyV2 {
                amount
                currencyCode
              }
            }
            computedPrice {
              amount
              currencyCode
            }
          }
        }
        currentPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;


async function fetchContractsPage(admin, { status, cursor }) {
  const query = status && status !== "ALL" ? `status:${status.toLowerCase()}` : undefined;

  const res = await admin.graphql(
    `
    query getContractsPage($after: String, $query: String) {
      subscriptionContracts(first: ${PAGE_SIZE}, after: $after, reverse: true, query: $query) {
        edges {
          node {
            ${CONTRACT_FIELDS}
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
    { variables: { after: cursor || null, query } },
  );
  const data = await res.json();
  const result = data.data.subscriptionContracts;
  return {
    contracts: result.edges.map((e) => e.node),
    hasNextPage: result.pageInfo.hasNextPage,
    endCursor: result.pageInfo.endCursor,
  };
}

async function fetchPageByWalking(admin, { status, targetPage }) {
  const cursors = { 1: null };
  let cursor = null;
  let result = { contracts: [], hasNextPage: false, endCursor: null };

  for (let p = 1; p <= targetPage; p++) {
    result = await fetchContractsPage(admin, { status, cursor });
    if (p < targetPage && !result.hasNextPage) break; // target page exist nahi karta
    cursor = result.endCursor;
    if (p + 1 <= targetPage) cursors[p + 1] = result.endCursor;
  }
  return { ...result, cursors };
}

async function fetchAllContracts(admin, { status }) {
  const query = status && status !== "ALL" ? `status:${status.toLowerCase()}` : undefined;

  let allContracts = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const res = await admin.graphql(
      `
      query getAllContracts($cursor: String, $query: String) {
        subscriptionContracts(first: 50, after: $cursor, reverse: true, query: $query) {
          edges {
            node {
              ${CONTRACT_FIELDS}
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      { variables: { cursor, query } },
    );
    const data = await res.json();
    const result = data.data.subscriptionContracts;
    allContracts = allContracts.concat(result.edges.map((e) => e.node));
    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  return allContracts;
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const page = parseInt(url.searchParams.get("page") || "1", 10);

  const cursor = url.searchParams.get("cursor");

  if (q) {
    const contracts = await fetchAllContracts(admin, { status });
    return { mode: "search", contracts };
  }

  if (cursor) {

    const result = await fetchContractsPage(admin, { status, cursor });
    return { mode: "page", ...result, page };
  }

  if (page <= 1) {
    const result = await fetchContractsPage(admin, { status, cursor: null });
    return { mode: "page", ...result, page: 1, cursors: { 1: null } };
  }


  const result = await fetchPageByWalking(admin, { status, targetPage: page });
  return { mode: "page", ...result, page };
}

function Subscriptions() {
  const loaderData = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const currentStatus = (searchParams.get("status") || "ALL").toUpperCase();

  const [displayData, setDisplayData] = useState(loaderData);
  const [currentPage, setCurrentPage] = useState(loaderData.page || 1);
  const cursorMapRef = useRef(loaderData.cursors || { 1: null });
  const pendingRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setDisplayData(loaderData);
    setCurrentPage(loaderData.page || 1);
    if (loaderData.mode === "page") {
      cursorMapRef.current = { ...cursorMapRef.current, ...(loaderData.cursors || {}) };
    }
  }, [loaderData]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && pendingRef.current) {
      const { targetPage, cursor } = pendingRef.current;
      setDisplayData(fetcher.data);
      setCurrentPage(targetPage);
      cursorMapRef.current = { ...cursorMapRef.current, [targetPage]: cursor };
      const next = new URLSearchParams(searchParams);
      if (targetPage === 1) next.delete("page");
      else next.set("page", targetPage);
      setSearchParams(next, { replace: true });
      pendingRef.current = null;
    }

  }, [fetcher.state, fetcher.data]);

  const isNavLoading =
    navigation.state === "loading" &&
    navigation.location?.pathname === location.pathname;

  const isLoading = fetcher.state === "loading" || isNavLoading;

  const handelRowClick = (id) => {
    navigate(`/app/subscription/${id}`);
  };

  const createSubscription = () => {
  navigate("/app/create-contract");
};

  const handelCustomer= ()=>
  {
    navigate(`/app/subscriptions/customers`)
  }
  const handelOrders= ()=>
  {
    navigate(`/app/subscriptions/orders`)
  }
  function getLinePriceWithoutIndex(line) {
    const basePrice = parseFloat(line?.currentPrice?.amount ?? 0);
    const discounts = line?.pricingPolicy?.cycleDiscounts || [];
    if (!discounts.length) return basePrice;
    const computedPrices = discounts
      .map((d) => parseFloat(d?.computedPrice?.amount ?? NaN))
      .filter((n) => !Number.isNaN(n));
    if (!computedPrices.length) return basePrice;
    const minComputed = Math.min(...computedPrices);
    return minComputed || basePrice;
  }

  const tabs = [
  { id: "all", content: "All", status: "ALL" },
  { id: "active", content: "Active", status: "ACTIVE" },
  { id: "paused", content: "Paused", status: "PAUSED" },
  { id: "cancelled", content: "Cancelled", status: "CANCELLED" },
  // { id: "billing_issues", content: "Billing issues", status: "FAILED" },
];

  const selectedTabIndex = tabs.findIndex((t) => t.status === currentStatus);
  const selected = selectedTabIndex === -1 ? 0 : selectedTabIndex;

  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  const handleTabChange = useCallback(
    (selectedTabIndexValue) => {
      const newStatus = tabs[selectedTabIndexValue].status;
      cursorMapRef.current = { 1: null };
      updateParams({
        status: newStatus === "ALL" ? null : newStatus.toLowerCase(),
        page: null,
      });
    },
    [updateParams],
  );

  const handleSearchChange = useCallback(
    (value) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParams({ q: value || null, page: null });
      }, 400);
    },
    [updateParams],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);


  if (loaderData.mode === "search") {
    const { contracts } = loaderData;
    const search = searchValue.trim().toLowerCase();
    const filtered = contracts.filter((item) => {
      const contractId = item.id.split("/").pop();
      const email = item.customer?.email?.toLowerCase() || "";
      return contractId.includes(search) || email.includes(search);
    });

    const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const safePage = pageFromUrl > totalPages ? totalPages : pageFromUrl;
    const startIndex = (safePage - 1) * PAGE_SIZE;
    const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    return renderPage({
      tabs,
      selected,
      currentStatus,
      handleTabChange,
      searchValue,
      handleSearchChange,
      isLoading, 
      contracts: paginated,
      formatDate,
      handelRowClick,
      handelCustomer,   
      handelOrders,   
      getLinePriceWithoutIndex,
      createSubscription,
      pagination: (
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => updateParams({ page: p === 1 ? null : p })}
        />
      ),
    });
  }


  const { contracts, hasNextPage } = displayData;

  const triggerFetch = (targetPage, cursor) => {
    const params = new URLSearchParams();
    if (currentStatus !== "ALL") params.set("status", currentStatus.toLowerCase());
    if (cursor) params.set("cursor", cursor);
    pendingRef.current = { targetPage, cursor };
    fetcher.load(`${location.pathname}?${params.toString()}`);
  };

  const handleNext = () => {
    if (!hasNextPage || fetcher.state === "loading") return;
    triggerFetch(currentPage + 1, displayData.endCursor);
  };

  const handlePrev = () => {
    if (currentPage <= 1 || fetcher.state === "loading") return;
    const prevPage = currentPage - 1;
    const cursorForPrevPage = cursorMapRef.current[prevPage] ?? null;
    triggerFetch(prevPage, cursorForPrevPage);
  };

  const totalPages = currentPage + (hasNextPage ? 1 : 0);

  return renderPage({
    tabs,
    selected,
    currentStatus,
    handleTabChange,
    searchValue,
    handleSearchChange,
    isLoading,
    contracts,
    formatDate,
    handelRowClick,
     handelCustomer,  
     handelOrders,
    getLinePriceWithoutIndex,
    createSubscription,
    pagination: (
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={undefined}
        pageSize={PAGE_SIZE}
        onPageChange={(p) => (p < currentPage ? handlePrev() : handleNext())}
      />
    ),
  });
}

function renderPage({
  tabs,
  selected,
  currentStatus,
  handleTabChange,
  searchValue,
  handleSearchChange,
  isLoading,
  contracts,
  formatDate,
  handelRowClick,
  handelCustomer,
  handelOrders,
  getLinePriceWithoutIndex,
  pagination,
  createSubscription,
}) {
  return (
    <Page
      title="Subscriptions"
       primaryAction={{
        content: "Create Subscription",
        onAction: createSubscription,   
      }}
      // secondaryActions={[
      //   {
      //     content: "Import Subscription ",
      //   },
      //   {
      //     content: "Export Subscription",
      //   },
      // ]}
      actionGroups={[
        {
          title: "More Action",
          actions: [
            // {
            //   content: "View Event",
            // },
            {
              content: "View Orders",
              onAction: handelOrders,
            },
            {
              content: "View Customer",
              onAction: handelCustomer,
            },
          ],
        },
      ]}
    >
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: 1 }}>
            <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} />
          </div>
          <div style={{ width: 24, marginLeft: 8 }}>
            {isLoading && <Spinner accessibilityLabel="Loading" size="small" />}
          </div>
        </div>
        <div style={{ padding: "10px 0" }}>
          <TextField
            label="Search Contract ID"
            labelHidden
            placeholder="Search by Contract ID and Email Id"
            value={searchValue}
            onChange={handleSearchChange}
            autoComplete="off"
          />
        </div>

        {contracts.length === 0  && contracts.status !== "FAILED" ?(
          <EmptyState>
            <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
            <p>No Subscriptions</p>
          </EmptyState>
        ) : (
          <div style={{ opacity: isLoading ? 0.5 : 1, transition: "opacity 0.15s" }}>
            <table border="1">
              <thead>
                <tr>
                  <th>ContractId</th>
                  <th>Status</th>
                  <th>Customer Email</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Next Order Date</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Delivery Frequency</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((item) => {
                  const lines = item.lines?.edges?.map((e) => e.node) ?? [];
                  const total = lines.reduce((sum, line) => {
                    const unitPrice = getLinePriceWithoutIndex(line);
                    const qty = line?.quantity ?? 1;
                    return sum + unitPrice * qty;
                  }, 0);
                  const currencyCode = lines[0]?.currentPrice?.currencyCode;
                  const productLabel =
                    lines.length === 1 ? lines[0].title : `${lines.length} Products`;

                  return (
                    <tr key={item.id}>
                      <td
                        style={{ cursor: "pointer" }}
                        onClick={() => handelRowClick(item.id.split("/").pop())}
                      >
                        {item.id.split("/").pop()}
                      </td>
                      <td style={{ textTransform: "lowercase" }}>{item.status}</td>
                      <td>
                        {item.customer?.firstName} {item.customer?.lastName} <br />
                        {item.customer?.email}
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{formatDate(item.updatedAt)}</td>
                      <td>{item.status !== "CANCELLED" ? formatDate(item.nextBillingDate) : ""}</td>
                      <td>{productLabel}</td>
                      <td>
                        {currencySymbol(currencyCode)} {total.toFixed(2)}
                      </td>
                      <td>
                        Every {item.deliveryPolicy?.intervalCount} {item.deliveryPolicy?.interval}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagination}
          </div>
        )}
      </Card>
    </Page>
  );
}

export default Subscriptions;