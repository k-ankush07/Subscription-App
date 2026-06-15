import React from "react";

import { Link, replace, useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query {
      subscriptionContracts(first: 50) {
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
               orders(first: 100) {
          edges {
            node {
              id
              createdAt
            }
          }
        }
            lines(first: 5) {
              edges {
                node {
                  id
                  title
                  quantity
                  currentPrice { amount currencyCode }
                  sellingPlanName
                  lineDiscountedPrice { amount currencyCode }
                  pricingPolicy {
                    cycleDiscounts {
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
                    }
                  }
                  sellingPlanId
                }
              }
            }
           billingPolicy {
  interval
  intervalCount
}

deliveryPolicy {
  interval
  intervalCount
}
          }
        }
      }
    }
  `);

  const data = await res.json();
  return {
    contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
  };
}
function subscription() {
  const navigate = useNavigate();
  const { contracts } = useLoaderData();
  //   console.log("data will this ", contracts);
  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate()} ${d.toLocaleString("en-GB", {
      month: "long",
    })}, ${d.getFullYear()}`;
  };

  const handelClick = (id) => {
    
    const subId = id.split("/").pop();
    console.log("id ", subId);
    // navigate(`/app/subscription/${subId}`);
  };
  return (
    <>
      <style>{`
        .table-container {
          margin: 20px;
          overflow-x: auto;
        }

        .subscription-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, sans-serif;
        }

        .subscription-table thead {
          background: #f6f6f7;
        }

        .subscription-table th {
          text-align: left;
          padding: 14px;
          border-bottom: 1px solid #ddd;
          font-size: 14px;
        }

        .subscription-table td {
          padding: 16px 14px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }


        .status {
          background: #AFFEBF  ;
          color: #226D58 ;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .subscription-table small {
          color: #666;
        }
      `}</style>

      <div className="table-container">
        <table className="subscription-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Created</th>
              <th>Next Billing</th>
              <th>Product</th>
              <th>Price</th>
              <th>Frequency</th>
              <th>Total Orders</th>
            </tr>
          </thead>

          <tbody>
            {contracts.map((contract) => {
              const line = contract.lines?.edges?.[0]?.node;
              const totalOrders = contract.orders?.edges?.length || 0;
              return (
                <tr key={contract.id}>
                  
                    <td onClick={() => handelClick(contract.id)} style={{ cursor: "pointer" }}>
                      #
                      {contract.id.replace(
                        "gid://shopify/SubscriptionContract/",
                        "",
                      )}
                    </td>
                 
                  <td>
                    <span className="status">{contract.status}</span>
                  </td>

                  <td>
                    <strong>
                      {contract.customer?.firstName}{" "}
                      {contract.customer?.lastName}
                    </strong>
                    <br />
                    <small>{contract.customer?.email}</small>
                  </td>

                  <td>{formatDate(contract.createdAt)}</td>

                  <td>{formatDate(contract.nextBillingDate)}</td>

                  <td>{line?.title}</td>

                  <td>
                    {line?.currentPrice?.currencyCode === "INR" ? "₹" : "$"}
                    {line?.currentPrice?.amount}
                  </td>

                  <td>
                    Every {contract.billingPolicy?.intervalCount}{" "}
                    {contract.billingPolicy?.interval?.toLowerCase()}
                    {contract.billingPolicy?.intervalCount > 1 ? "s" : ""}
                  </td>
                  <td>{totalOrders}</td>
                  {/* <td>
                    {contract.orders?.edges?.map(({ node }) => (
                        <div key={node.id}>
                        {node.totalPriceSet.shopMoney.currencyCode === "INR" ? "₹" : "$"}
                        {node.totalPriceSet.shopMoney.amount}
                        </div>
                    ))}
                    </td> */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default subscription;
