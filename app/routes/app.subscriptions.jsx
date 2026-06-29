import { Page, Card } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React from "react";
import { useLoaderData, useNavigate } from "react-router";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query {
  subscriptionContracts(first: 100) {
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
}`);
  const data = await res.json();

  return {
    contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
  };
}

function Subscriptions() {
  const { contracts } = useLoaderData();
  const navigate= useNavigate()
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handelRowClick = (id) => {
    console.log("print id ", id);
    navigate(`/app/subscription/${id}`)
  };
  return (
    <>
      <Page title="Subscriptions">
        <Card>
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
                {[...contracts].reverse().map((item) => {
                  const lines = item.lines?.edges?.map((e) => e.node) ?? [];

                  const currencySymbols = {
                    INR: "₹",
                    USD: "$",
                    EUR: "€",
                    GBP: "£",
                    JPY: "¥",
                    CAD: "CA$",
                    AUD: "A$",
                  };

                  // Sabhi lines ka total nikalo
                  const total = lines.reduce((sum, line) => {
                    return (
                      sum +
                      parseFloat(line?.currentPrice?.amount ?? 0) *
                        (line?.quantity ?? 1)
                    );
                  }, 0);

                  const currencyCode = lines[0]?.currentPrice?.currencyCode;
                  const symbol =
                    currencySymbols[currencyCode] ?? currencyCode ?? "";

                  const productLabel =
                    lines.length === 1
                      ? lines[0].title
                      : `${lines.length} Products`;

                  return (
                    <tr
                      key={item.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handelRowClick(item.id.split("/").pop())}
                    >
                      <td>{item.id.split("/").pop()}</td>
                      <td>{item.status}</td>
                      <td>
                        {item.customer?.firstName} {item.customer?.lastName}{" "}
                        <br />
                        {item.customer?.email}
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{formatDate(item.updatedAt)}</td>
                      <td>{formatDate(item.nextBillingDate)}</td>
                      <td>{productLabel}</td>
                      <td>
                        {symbol} {total.toFixed(2)}
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
        </Card>
      </Page>
    </>
  );
}

export default Subscriptions;
