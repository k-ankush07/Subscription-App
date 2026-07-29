

import { Page, Card, EmptyState, Tabs, TextField, Pagination, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React, { useState, useCallback, useEffect } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { currencySymbol } from "./utils/formatMoney.js";

const PAGE_SIZE = 7;

export function shouldRevalidate({ currentUrl, nextUrl, defaultShouldRevalidate }) {
  if (currentUrl.pathname !== nextUrl.pathname) {
    return defaultShouldRevalidate;
  }
  return false;
}

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(
    `
    query getContracts {
      subscriptionContracts(first: 250) {
        edges {
          node {
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
          }
        }
      }
    }`,
  );

  const data = await res.json();

  return {
    contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
  };
}

function Subscriptions() {
  const { contracts } = useLoaderData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  const currentStatus = searchParams.get("status") || "ALL";

  // URL se current page nikal lo (default 1)
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = Number.isNaN(pageFromUrl) || pageFromUrl < 1 ? 1 : pageFromUrl;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handelRowClick = (id) => {
    navigate(`/app/subscription/${id}`);
  };

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

  // Tabs
  const tabs = [
    { id: "all", content: "All", status: "ALL" },
    { id: "active", content: "Active", status: "ACTIVE" },
    { id: "paused", content: "Paused", status: "PAUSED" },
    { id: "cancelled", content: "Cancelled", status: "CANCELLED" },
  ];

  const selectedTabIndex = tabs.findIndex((t) => t.status === currentStatus);
  const selected = selectedTabIndex === -1 ? 0 : selectedTabIndex;

  // Helper: searchParams update karo, aur agar naya param page nahi hai to page ko 1 pe reset kar do
  const updateParams = useCallback(
    (updates, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      if (resetPage) {
        next.delete("page");
      }
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams],
  );

  const handleTabChange = useCallback(
    (selectedTabIndexValue) => {
      const newStatus = tabs[selectedTabIndexValue].status;
      updateParams({ status: newStatus === "ALL" ? null : newStatus });
    },
    [updateParams],
  );

  const handleSearchChange = useCallback(
    (value) => {
      setSearchValue(value);
      updateParams({ q: value || null });
    },
    [updateParams],
  );

  const handlePageChange = useCallback(
    (newPage) => {
      updateParams({ page: newPage === 1 ? null : newPage }, false);
    },
    [updateParams],
  );

  // Status aur search dono client-side filter hote hain (saare 200 records me se),
  // isliye tab switch instant hai — koi naya server call nahi
  const filteredContracts = contracts.filter((item) => {
    if (currentStatus !== "ALL" && item.status !== currentStatus) return false;

    const contractId = item.id.split("/").pop();
    const email = item.customer?.email?.toLowerCase() || "";
    const search = searchValue.trim().toLowerCase();
    if (!search) return true;
    return contractId.includes(search) || email.includes(search);
  });

  const reversedContracts = [...filteredContracts].reverse();
  const totalItems = reversedContracts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Agar current page total pages se zyada ho gaya (e.g. search ke baad), page 1 pe le aao
  const safePage = currentPage > totalPages ? totalPages : currentPage;
  useEffect(() => {
    if (currentPage !== safePage) {
      handlePageChange(safePage === 1 ? null : safePage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedContracts = reversedContracts.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  return (
    <>
      <Page title="Subscriptions">
        <Card>
          <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} />
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
          {paginatedContracts.length === 0 ? (
            <EmptyState>
              <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
              <p>No Subscriptions</p>
            </EmptyState>
          ) : (
            <div>
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
                  {paginatedContracts.map((item) => {
                    const lines = item.lines?.edges?.map((e) => e.node) ?? [];
                    const total = lines.reduce((sum, line) => {
                      const unitPrice = getLinePriceWithoutIndex(line);
                      const qty = line?.quantity ?? 1;
                      return sum + unitPrice * qty;
                    }, 0);
                    const currencyCode = lines[0]?.currentPrice?.currencyCode;
                    const productLabel =
                      lines.length === 1
                        ? lines[0].title
                        : `${lines.length} Products`;

                    return (
                      <tr key={item.id}>
                        <td
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            handelRowClick(item.id.split("/").pop())
                          }
                        >
                          {item.id.split("/").pop()}
                        </td>
                        <td>{item.status}</td>
                        <td>
                          {item.customer?.firstName} {item.customer?.lastName}{" "}
                          <br />
                          {item.customer?.email}
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>{formatDate(item.updatedAt)}</td>
                        <td>
                          {item.status !== "CANCELLED"
                            ? formatDate(item.nextBillingDate)
                            : ""}
                        </td>
                        <td>{productLabel}</td>
                        <td>
                          {currencySymbol(currencyCode)} {total.toFixed(2)}
                        </td>
                        <td>
                          Every {item.deliveryPolicy?.intervalCount}{" "}
                          {item.deliveryPolicy?.interval}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                }}
              >
                <Text variant="bodySm" tone="subdued">
                  Showing {totalItems === 0 ? 0 : startIndex + 1}-
                  {Math.min(startIndex + PAGE_SIZE, totalItems)} of {totalItems}
                </Text>
                <Pagination
                  hasPrevious={safePage > 1}
                  onPrevious={() => handlePageChange(safePage - 1)}
                  hasNext={safePage < totalPages}
                  onNext={() => handlePageChange(safePage + 1)}
                  label={`Page ${safePage} of ${totalPages}`}
                />
              </div>
            </div>
          )}
        </Card>
      </Page>
    </>
  );
}

export default Subscriptions;