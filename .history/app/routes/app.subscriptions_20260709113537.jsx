// import { Page, Card, EmptyState } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import React from "react";
// import { useLoaderData, useNavigate } from "react-router";
// import { currencySymbol } from "./utils/formatMoney.js";
// export async function loader({ request }) {
//   const { admin } = await authenticate.admin(request);

//   const res = await admin.graphql(`
//     query {
//   subscriptionContracts(first: 100) {
//     edges {
//       node {
//         id
//         status
//         createdAt
//         updatedAt
//         nextBillingDate
//         currencyCode

//         customer {
//           id
//           firstName
//           lastName
//           email
//         }
//         deliveryPolicy {
//           interval
//           intervalCount
//         }
//         lines(first: 50) {
//           edges {
//             node {
//               id
//               title
//               quantity
//               sellingPlanName
//               sellingPlanId
//               pricingPolicy {
//                 cycleDiscounts {
//                   afterCycle
//                   adjustmentType
//                   adjustmentValue {
//                     ... on SellingPlanPricingPolicyPercentageValue {
//                       percentage
//                     }
//                     ... on MoneyV2 {
//                       amount
//                       currencyCode
//                     }
//                   }
//                   computedPrice {
//                     amount
//                     currencyCode
//                   }
//                 }
//               }

//               currentPrice {
//                 amount
//                 currencyCode
//               }
//             }
//           }
//         }
//       }
//     }
//   }
// }`);
//   const data = await res.json();

//   return {
//     contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
//   };
// }

// function Subscriptions() {
//   const { contracts } = useLoaderData();
//   const navigate = useNavigate();
//   const formatDate = (date) => {
//     return new Date(date).toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//     });
//   };

//   const handelRowClick = (id) => {
//     console.log("print id ", id);
//     navigate(`/app/subscription/${id}`);
//   };
//   // --- helper: discount ke hisaab se price, WITHOUT index ---
//   function getLinePriceWithoutIndex(line) {
//     const basePrice = parseFloat(line?.currentPrice?.amount ?? 0);
//     const discounts = line?.pricingPolicy?.cycleDiscounts || [];

//     // Agar koi discount nahi hai to simple base price return karo
//     if (!discounts.length) {
//       return basePrice;
//     }

//     // Har discount ka computedPrice nikaalo
//     const computedPrices = discounts
//       .map((d) => parseFloat(d?.computedPrice?.amount ?? NaN))
//       .filter((n) => !Number.isNaN(n));

//     // Agar computedPrice missing ho to fallback base price
//     if (!computedPrices.length) {
//       return basePrice;
//     }

//     // Sabse kam price ko choose kar lo (best discount)
//     const minComputed = Math.min(...computedPrices);
//     return minComputed || basePrice;
//   }

//   return (
//     <>
//       <Page title="Subscriptions">
//         {contracts.length === 0 ? (
//           <Card>
//             <EmptyState>
//               <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
//               {/* <h2>Get more repeat business</h2> */}
//               <p>No Subscriptions</p>
//             </EmptyState>
//           </Card>
//         ) : (
//           <Card>
//             <div>
//               <table border="1">
//                 <thead>
//                   <tr>
//                     <th>ContractId</th>
//                     <th>Status</th>
//                     <th>Customer Email</th>
//                     <th>Created</th>
//                     <th>Updated</th>
//                     {/* <th>Next Order Date</th> */}
//                     <th>Product</th>
//                     <th>Price</th>
//                     <th>Delivery Frequency</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {[...contracts].reverse().map((item) => {
//                     const lines = item.lines?.edges?.map((e) => e.node) ?? [];
//                     const total = lines.reduce((sum, line) => {
//                       const unitPrice = getLinePriceWithoutIndex(line);
//                       const qty = line?.quantity ?? 1;
//                       return sum + unitPrice * qty;
//                     }, 0);

//                     const currencyCode = lines[0]?.currentPrice?.currencyCode;

//                     const productLabel =
//                       lines.length === 1
//                         ? lines[0].title
//                         : `${lines.length} Products`;

//                     return (
//                       <tr key={item.id}>
//                         <td
//                           style={{ cursor: "pointer" }}
//                           onClick={() =>
//                             handelRowClick(item.id.split("/").pop())
//                           }
//                         >
//                           {item.id.split("/").pop()}
//                         </td>
//                         <td>{item.status}</td>
//                         <td>
//                           {item.customer?.firstName} {item.customer?.lastName}{" "}
//                           <br />
//                           {item.customer?.email}
//                         </td>
//                         <td>{formatDate(item.createdAt)}</td>
//                         <td>{formatDate(item.updatedAt)}</td>
//                         {/* <td>{
//                         item.status !=="CANCELLED" ? formatDate(item.nextBillingDate) :""
//                         }</td> */}
//                         <td>{productLabel}</td>
//                         <td>
//                           {currencySymbol(currencyCode)} {total.toFixed(2)}
//                         </td>
//                         <td>
//                           Every {item.deliveryPolicy?.intervalCount}{" "}
//                           {item.deliveryPolicy?.interval}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </Card>
//         )}
//       </Page>
//     </>
//   );
// }

// export default Subscriptions;

import { useLoaderData } from "react-router";
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
            }
            lines(first: 5) {
              edges {
                node {
                  id
                  title
                  quantity
                  currentPrice { amount currencyCode }
                  sellingPlanName
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await res.json();
  return { contracts: data.data.subscriptionContracts.edges.map((e) => e.node) };
}

export default function SubscribersPage() {
  const { contracts } = useLoaderData();

  const statusColor = {
    ACTIVE: { bg: "#d1fae5", text: "#065f46" },
    PAUSED: { bg: "#fef3c7", text: "#92400e" },
    CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
    FAILED: { bg: "#fee2e2", text: "#991b1b" },
  };

  return (
    <s-page heading="Subscribers">
      <div style={styles.stats}>
        <div style={styles.statItem}><strong>{contracts.length}</strong> Total</div>
        <div style={styles.statItem}><strong>{contracts.filter((c) => c.status === "ACTIVE").length}</strong> Active</div>
        <div style={styles.statItem}><strong>{contracts.filter((c) => c.status === "PAUSED").length}</strong> Paused</div>
        <div style={styles.statItem}><strong>{contracts.filter((c) => c.status === "CANCELLED").length}</strong> Cancelled</div>
      </div>

      <div style={styles.section}>
        {contracts.length === 0 ? (
          <div style={styles.empty}>No subscribers yet!</div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} style={styles.contractCard}>
              <div style={styles.contractHeader}>
                <div>
                  <div style={styles.customerName}>
                    👤 {contract.customer.firstName} {contract.customer.lastName}
                  </div>
                  {/* email removed — requires Protected Customer Data approval */}
                </div>
                <span style={{
                  ...styles.statusBadge,
                  background: statusColor[contract.status]?.bg,
                  color: statusColor[contract.status]?.text
                }}>
                  {contract.status}
                </span>
              </div>
              <div style={styles.contractLines}>
                {contract.lines.edges.map(({ node: line }) => (
                  <div key={line.id} style={styles.lineRow}>
                    <span>📦 {line.title} × {line.quantity}</span>
                    <span style={styles.linePrice}>{line.currentPrice.currencyCode} {line.currentPrice.amount}</span>
                    <span style={styles.planName}>{line.sellingPlanName}</span>
                  </div>
                ))}
              </div>
              <div style={styles.contractFooter}>
                <span>📅 Created: {new Date(contract.createdAt).toLocaleDateString()}</span>
                {contract.nextBillingDate && (
                  <span>🔄 Next Billing: {new Date(contract.nextBillingDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </s-page>
  );
}

const styles = {
  stats: { display: "flex", gap: "16px", marginBottom: "20px" },
  statItem: { background: "white", borderRadius: "8px", padding: "16px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", fontSize: "14px" },
  section: { background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  empty: { textAlign: "center", color: "#9ca3af", padding: "40px" },
  contractCard: { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px", marginBottom: "12px" },
  contractHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  customerName: { fontWeight: "600", fontSize: "15px" },
  statusBadge: { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  contractLines: { background: "#f9fafb", borderRadius: "8px", padding: "10px", marginBottom: "10px" },
  lineRow: { display: "flex", alignItems: "center", gap: "12px", padding: "6px 0", fontSize: "14px" },
  linePrice: { fontWeight: "600", color: "#111827" },
  planName: { background: "#ede9fe", color: "#5b21b6", padding: "2px 8px", borderRadius: "10px", fontSize: "12px" },
  contractFooter: { display: "flex", gap: "20px", fontSize: "12px", color: "#6b7280" },
};
