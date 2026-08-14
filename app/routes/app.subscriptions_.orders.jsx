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

const PAGE_SIZE = 30;
const ORDERS_PER_CONTRACT = 50; // ek contract se max kitne orders khinchne hain

// Har subscription contract ke andar uski "orders" connection hoti hai
// (SubscriptionContract.orders) — yahi se hume asli generated orders milte hain.
async function fetchAllContractsWithOrders(admin) {
  let allRows = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const res = await admin.graphql(
      `
      query getContractsWithOrders($cursor: String) {
        subscriptionContracts(first: 50, after: $cursor, reverse: true) {
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
      `,
      { variables: { cursor } },
    );
    const data = await res.json();
    const result = data.data.subscriptionContracts;

    for (const edge of result.edges) {
      const contract = edge.node;
      const contractNumericId = contract.id.split("/").pop();
      // orders(reverse:true) => sabse naya order pehle aata hai.
      // Cycle number nikalne ke liye ascending order chahiye (0 = sabse pehla order).
      const orderNodes = contract.orders.edges.map((e) => e.node).reverse();

      orderNodes.forEach((order, cycleIndex) => {
        allRows.push({
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

    hasNextPage = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  // Sabse naya order sabse upar
  allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return allRows;
}

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop.replace(".myshopify.com", "");
  const rows = await fetchAllContractsWithOrders(admin);
  return { rows, shop };
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
  const { rows, shop } = useLoaderData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");

  const filteredRows = useMemo(() => {
    const search = searchValue.trim().toLowerCase();
    if (!search) return rows;
    return rows.filter((r) => {
      return (
        r.orderNumericId.includes(search) ||
        r.contractNumericId.includes(search) ||
        r.email?.toLowerCase().includes(search) ||
        r.orderName?.toLowerCase().includes(search)
      );
    });
  }, [rows, searchValue]);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  // Display "ID" column — running serial number (naya sabse upar, bada number).
  // NOTE: ye aapke kisi internal DB record ka real id nahi hai — Shopify API se
  // per-order koi standalone sequential "app id" nahi milta. Agar aapke paas
  // Prisma me OrderLog jaisi table hai to us table ka real `id` yahan use karein.
  const totalCount = totalItems;

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
                  <th>ID</th>
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
                {paginatedRows.map((row, i) => (
                  <tr key={row.orderId}>
                    <td>{totalCount - (startIndex + i)}</td>
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
                setSearchParams(next, { replace: false });
              }}
            />
          </div>
        )}
      </Card>
    </Page>
  );
}

export default SubscriptionOrders;