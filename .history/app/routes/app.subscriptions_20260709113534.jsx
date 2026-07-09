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
