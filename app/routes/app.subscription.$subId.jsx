// import { useLoaderData } from "react-router";
// import { authenticate } from "../shopify.server";

// export async function loader({ request, params }) {
//   const { admin } = await authenticate.admin(request);
//   const subId = params.subId;

//   const res = await admin.graphql(`
//     query {
//       subscriptionContract(id: "gid://shopify/SubscriptionContract/${subId}") {
//         id
//         status
//         createdAt
//         nextBillingDate
//         customer {
//           firstName
//           lastName
//           email
//           phone
//         }
//           deliveryMethod {
//           ... on SubscriptionDeliveryMethodShipping {
//             address {
//               firstName
//               lastName
//               address1
//               address2
//               city
//               province
//               zip
//               country
//             }
//           }
//         }
//            customerPaymentMethod {
//           id
//           instrument {
//             ... on CustomerCreditCard {
//               brand
//               lastDigits
//               expiryMonth
//               expiryYear
//             }
//           }
//         }
//         billingPolicy {
//           interval
//           intervalCount
//         }
//           deliveryPolicy {
//           interval
//           intervalCount
//         }
//         orders(first: 100) {
//           edges {
//             node {
//               id
//               createdAt
//               name
//             }
//           }
//         }
//         lines(first: 10) {
//           edges {
//             node {
//               id
//               title
//               quantity
//               currentPrice { amount currencyCode }
//               lineDiscountedPrice { amount currencyCode }
//               sellingPlanName
//                pricingPolicy {
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
//                   computedPrice { amount currencyCode }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//   `);

//   const data = await res.json();
//   return { contract: data.data.subscriptionContract };
// }

// function formatDate(dateStr) {
//   if (!dateStr) return "—";
//   const d = new Date(dateStr);
//   return `${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "long" })}, ${d.getUTCFullYear()}`;
// }

// export default function SubscriptionDetails() {
//   const { contract } = useLoaderData();
//   console.log("vdbjdbjdbvjdfvbdfjvbfd",contract)
//   if (!contract) return <p>Contract not found.</p>;

//   const { customer, billingPolicy: bp, orders, lines } = contract;
//   const subId = contract.id.split("/").pop();

//   return (
//     <div style={{ padding: 20, maxWidth: 800, fontFamily: "Arial, sans-serif" }}>

//       <h2>Subscription #{subId}</h2>

//       {/* Summary */}
//       <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
//         {[
//           ["Status", contract.status],
//           ["Created", formatDate(contract.createdAt)],
//           ["Next Billing", formatDate(contract.nextBillingDate)],
//           ["Frequency", `Every ${bp?.intervalCount} ${bp?.interval?.toLowerCase()}${bp?.intervalCount > 1 ? "s" : ""}`],
//           ["Total Orders", orders?.edges?.length ?? 0],
//         ].map(([label, value]) => (
//           <div key={label} style={{ background: "#f6f6f7", borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
//             <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
//             <div style={{ fontWeight: 600, marginTop: 4 }}>{value}</div>
//           </div>
//         ))}
//       </div>

//       {/* Customer */}
//       <h3>Customer</h3>
//       <p><b>{customer?.firstName} {customer?.lastName}</b> — {customer?.email}</p>

//       {/* Products */}
//       <h3>Products</h3>
//       <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
//         <thead style={{ background: "#f6f6f7" }}>
//           <tr>
//             <th>Title</th>
//             <th>Plan</th>
//             <th>Qty</th>
//             <th>Price</th>
//           </tr>
//         </thead>
//         <tbody>
//           {lines?.edges?.map(({ node }) => (
//             <tr key={node.id}>
//               <td>{node.title}</td>
//               <td>{node.sellingPlanName || "—"}</td>
//               <td>{node.quantity}</td>
//               <td>{node.currentPrice?.currencyCode === "INR" ? "₹" : "$"}{node.currentPrice?.amount}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Orders */}
//       <h3>Order History</h3>
//       {orders?.edges?.length === 0 ? (
//         <p style={{ color: "#888" }}>No orders yet.</p>
//       ) : (
//         <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
//           <thead style={{ background: "#f6f6f7" }}>
//             <tr>
//               <th>Order</th>
//               <th>Date</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders?.edges?.map(({ node }) => (
//               <tr key={node.id}>
//                 <td>{node.name || `#${node.id.split("/").pop()}`}</td>
//                 <td>{formatDate(node.createdAt)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}

//     </div>
//   );
// }

import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const subId = params.subId;

  const res = await admin.graphql(`
    query {
      subscriptionContract(id: "gid://shopify/SubscriptionContract/${subId}") {
        id
        status
        createdAt
        nextBillingDate
        currentBillingCycleIndex
        customer {
          firstName
          lastName
          email
          phone
        }
        deliveryMethod {
          ... on SubscriptionDeliveryMethodShipping {
            address {
              firstName
              lastName
              address1
              address2
              city
              province
              zip
              country
            }
          }
        }
        customerPaymentMethod {
          instrument {
            ... on CustomerCreditCard {
              brand
              lastDigits
              expiryMonth
              expiryYear
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
        orders(first: 100) {
          edges {
            node {
              id
              createdAt
              name
            }
          }
        }
        lines(first: 10) {
          edges {
            node {
              id
              title
              quantity
              currentPrice { amount currencyCode }
              lineDiscountedPrice { amount currencyCode }
              sellingPlanName
              pricingPolicy {
                cycleDiscounts {
                  afterCycle
                  computedPrice { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await res.json();
  return { contract: data.data.subscriptionContract };
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "long" })}, ${d.getUTCFullYear()}`;
}

function curr(code) {
  return code === "INR" ? "₹" : "$";
}

export default function SubscriptionDetails() {
  const { contract } = useLoaderData();
  if (!contract) return <p>Contract not found.</p>;

  const { customer, billingPolicy: bp, deliveryPolicy: dp, orders, lines } = contract;
  const subId = contract.id.split("/").pop();
  const addr = contract.deliveryMethod?.address;
  const card = contract.customerPaymentMethod?.instrument;

  return (
    <div style={{ padding: 20, maxWidth: 860, fontFamily: "Arial, sans-serif" }}>

      <h2>Subscription #{subId}</h2>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          ["Status", contract.status],
          ["Created", formatDate(contract.createdAt)],
          ["Next Billing", formatDate(contract.nextBillingDate)],
          ["Billing", `Every ${bp?.intervalCount} ${bp?.interval?.toLowerCase()}${bp?.intervalCount > 1 ? "s" : ""}`],
          ["Current Cycle", contract.currentBillingCycleIndex ?? "—"],
          ["Total Orders", orders?.edges?.length ?? 0],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "#f6f6f7", borderRadius: 8, padding: "10px 16px", minWidth: 120 }}>
            <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Customer */}
        <div style={{ border: "1px solid #e4e4e4", borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px" }}>Customer</h3>
          <p style={{ margin: "0 0 4px" }}><b>{customer?.firstName} {customer?.lastName}</b></p>
          <p style={{ margin: "0 0 4px", color: "#555" }}>{customer?.email}</p>
          {customer?.phone && <p style={{ margin: 0, color: "#555" }}>{customer.phone}</p>}
        </div>

        {/* Shipping address */}
        <div style={{ border: "1px solid #e4e4e4", borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px" }}>Shipping address</h3>
          {addr ? (
            <p style={{ margin: 0, lineHeight: 1.8, color: "#555" }}>
              {addr.firstName} {addr.lastName}<br />
              {addr.address1}{addr.address2 ? `, ${addr.address2}` : ""}<br />
              {addr.city}{addr.zip ? ` ${addr.zip}` : ""}{addr.province ? `, ${addr.province}` : ""}<br />
              {addr.country}
            </p>
          ) : <p style={{ color: "#888" }}>No address on file</p>}
        </div>

        {/* Payment */}
        <div style={{ border: "1px solid #e4e4e4", borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px" }}>Payment method</h3>
          {card ? (
            <p style={{ margin: 0, color: "#555" }}>
              {card.brand?.toUpperCase()} •••• •••• •••• {card.lastDigits}<br />
              <span style={{ fontSize: 13 }}>Expires {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}</span>
            </p>
          ) : <p style={{ color: "#888" }}>No payment method</p>}
        </div>

        {/* Delivery & Billing */}
        <div style={{ border: "1px solid #e4e4e4", borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: "0 0 10px" }}>Delivery & Billing</h3>
          <p style={{ margin: "0 0 6px" }}>
            <b>Delivery:</b> Every {dp?.intervalCount} {dp?.interval?.toLowerCase()}{dp?.intervalCount > 1 ? "s" : ""}
          </p>
          <p style={{ margin: 0 }}>
            <b>Billing:</b> Every {bp?.intervalCount} {bp?.interval?.toLowerCase()}{bp?.intervalCount > 1 ? "s" : ""}
          </p>
        </div>

      </div>

      {/* Lines */}
      <h3>Subscription lines</h3>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead style={{ background: "#f6f6f7" }}>
          <tr>
            <th style={{ textAlign: "left" }}>Product</th>
            <th style={{ textAlign: "left" }}>Plan</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Discounted</th>
            <th style={{ textAlign: "left" }}>Pricing cycles</th>
          </tr>
        </thead>
        <tbody>
          {lines?.edges?.map(({ node }) => {
            const cycles = node.pricingPolicy?.cycleDiscounts ?? [];
            const pricingText = cycles
              .map((c, i) =>
                `${curr(c.computedPrice?.currencyCode)}${c.computedPrice?.amount}${i === 0 ? " (first)" : " (then)"}`
              )
              .join(" → ");

            return (
              <tr key={node.id}>
                <td>{node.title}</td>
                <td>{node.sellingPlanName || "—"}</td>
                <td style={{ textAlign: "center" }}>{node.quantity}</td>
                <td>{curr(node.currentPrice?.currencyCode)}{node.currentPrice?.amount}</td>
                <td>{curr(node.lineDiscountedPrice?.currencyCode)}{node.lineDiscountedPrice?.amount}</td>
                <td style={{ fontSize: 13, color: "#555" }}>{pricingText || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Order history */}
      <h3>Order history ({orders?.edges?.length ?? 0})</h3>
      {orders?.edges?.length === 0 ? (
        <p style={{ color: "#888" }}>No orders yet.</p>
      ) : (
        <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f6f6f7" }}>
            <tr>
              <th style={{ textAlign: "left" }}>Order</th>
              <th style={{ textAlign: "left" }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders?.edges?.map(({ node }) => (
              <tr key={node.id}>
                <td>{node.name || `#${node.id.split("/").pop()}`}</td>
                <td>{formatDate(node.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

    </div>
  );
}