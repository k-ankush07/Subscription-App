import { Page, Card, EmptyState, Tabs, TextField } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React, { useState, useCallback } from "react";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import { currencySymbol } from "./utils/formatMoney.js";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "ALL";

  // Shopify query filter banao status ke hisaab se
  let queryFilter = "";
  if (status !== "ALL") {
    queryFilter = `status:${status}`;
  }

  const res = await admin.graphql(
    `
    query getContracts($query: String) {
      subscriptionContracts(first: 200, query: $query) {
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
    {
      variables: { query: queryFilter || null },
    },
  );

  const data = await res.json();

  return {
    contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
    currentStatus: status,
  };
}

function Subscriptions() {
  const { contracts, currentStatus } = useLoaderData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchValue, setSearchValue] = useState("");
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

  const handleTabChange = useCallback(
    (selectedTabIndexValue) => {
      const newStatus = tabs[selectedTabIndexValue].status;
      // URL update  loader re-run hoga refresh pe bhi yehi status rahega
      setSearchParams(newStatus === "ALL" ? {} : { status: newStatus }, {
        replace: false,
      });
    },
    [setSearchParams],
  );

  const filteredContracts = contracts.filter((item) => {
    const contractId = item.id.split("/").pop();
     const email = item.customer?.email?.toLowerCase() || "";
  const search = searchValue.trim().toLowerCase();
  if (!search) return true;
    return (
      contractId.includes(search) ||
    email.includes(search)
    );
  });
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
              onChange={setSearchValue}
              autoComplete="off"
            />
          </div>
          {filteredContracts.length === 0 ? (
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
                  {[...filteredContracts].reverse().map((item) => {
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
            </div>
          )}
        </Card>
      </Page>
    </>
  );
}

export default Subscriptions;
