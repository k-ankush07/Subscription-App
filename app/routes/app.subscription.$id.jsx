// import { Banner, Button, Card, Page } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import React, { useEffect, useState } from "react";
// import {
//   Link,
//   useNavigate,
//   useParams,
//   useFetcher,
//   useLoaderData,
// } from "react-router";
// const API = import.meta.env.VITE_API_URL;
// const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
// export async function loader({ request, params }) {
//   const { admin } = await authenticate.admin(request);

//   const subscriptionId = params.id;
//   const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

//   // Date range: aaj se next 6 months (tum chaaho to yahan months change kar sakte ho)
//   const startDate = new Date().toISOString();
//   const endDateObj = new Date();
//   endDateObj.setMonth(endDateObj.getMonth() + 12);
//   const endDate = endDateObj.toISOString();

//   const graphqlResponse = await admin.graphql(
//     `
//     query SubscriptionContractWithUpcoming(
//       $contractId: ID!
//       $startDate: DateTime!
//       $endDate: DateTime!
//     ) {
//       subscriptionContract(id: $contractId) {
//         id
//         status
//         createdAt
//         updatedAt
//         nextBillingDate
//         deliveryPolicy {
//           interval
//           intervalCount
//         }
//         billingPolicy {
//           interval
//           intervalCount
//           minCycles
//           maxCycles
//         }
//         originOrder {
//           id
//           name
//         }
//         customer {
//           id
//           firstName
//           lastName
//           note
//           defaultEmailAddress{
//           emailAddress
//           }
//         }
//         deliveryMethod {
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
//         customerPaymentMethod {
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
//         orders(first: 10,reverse: true) {
//           edges {
//             node {
//               id
//               createdAt
//               name
//               processedAt
//           displayFinancialStatus
//           displayFulfillmentStatus
//           cancelReason
//           cancelledAt
//           currencyCode

//               shippingLine {
//                 title
//               }
//               totalShippingPriceSet {
//                 shopMoney {
//                   amount
//                   currencyCode
//                 }
//               }
//             }
//           }
//         }
//         lines(first: 10) {
//           edges {
//             node {
//               id
//               title
//               variantTitle
//               quantity
//               productId
//               variantId
//               sku
//               currentPrice {
//                 amount
//                 currencyCode
//               }
//               variantImage {
//                 url
//               }
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
//             }
//           }
//         }
//       }
//       subscriptionBillingCycles(
//         first: 250
//         contractId: $contractId
//         billingCyclesDateRangeSelector: {
//           startDate: $startDate
//           endDate: $endDate
//         }
//       ) {
//         edges {
//           node {
//            billingAttemptExpectedDate
//              cycleEndAt
//              cycleIndex
//              cycleStartAt
//              edited
//               skipped
//               sourceContract {
//         id
//       }
//             status
//           }
//         }
//       }
//     }
//     `,
//     {
//       variables: {
//         contractId,
//         startDate,
//         endDate,
//       },
//     },
//   );

//   const data = await graphqlResponse.json();

//   if (!data?.data?.subscriptionContract) {
//     throw new Response("Subscription contract not found", { status: 404 });
//   }

//   const contract = data.data.subscriptionContract;
//   const allCycles =
//     data.data.subscriptionBillingCycles?.edges?.map((edge) => edge.node) || [];
//   const maxCycles = contract?.billingPolicy?.maxCycles ?? null;
//   const now = new Date();
//   let upcomingCycles = allCycles.filter(
//     (cycle) =>
//       cycle.billingAttemptExpectedDate &&
//       new Date(cycle.billingAttemptExpectedDate) >= now,
//   );

//   if (maxCycles != null) {
//     upcomingCycles = upcomingCycles.filter(
//       (cycle) =>
//         typeof cycle.cycleIndex === "number" && cycle.cycleIndex <= maxCycles,
//     );
//   }
//   try {
//     await fetch(`${API}/api/subscription`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-api-key": SECRET_KEY,
//       },
//       body: JSON.stringify({
//         subscriptionId,
//         contractId,
//         contract,
//         upcomingCycles,
//       }),
//     });
//   } catch (err) {
//     console.error("Backend save call failed:", err);
//   }

//   let internalNotes = "";
//   let customerNotes = "";
//   try {
//     const notesRes = await fetch(`${API}/api/${subscriptionId}`, {
//       method: "GET",
//       headers: {
//         "x-api-key": SECRET_KEY,
//       },
//     });
//     if (notesRes.ok) {
//       const notesData = await notesRes.json();
//       internalNotes = notesData?.data?.internalNotes || "";
//       customerNotes = notesData?.data?.customerNotes || "";
//     }
//   } catch (err) {
//     console.error("Backend fetch notes failed:", err);
//   }
//   return { contract, upcomingCycles, internalNotes, customerNotes };
// }

// export async function action({ request, params }) {
//   const formData = await request.formData();
//   const type = formData.get("type"); // "internal" ya "customer"
//   const notes = formData.get("notes");
//   const subscriptionId = params.id;
//   const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;
//   const { admin } = await authenticate.admin(request);
//   if (
//     type === "pause" ||
//     type === "cancel" ||
//     type === "resume" ||
//     type === "skip" ||
//     type === "unskip"
//   ) {
//     if (type === "pause") {
//       const res = await admin.graphql(
//         `
//         mutation PauseSubscriptionContract($contractId: ID!) {
//           subscriptionContractPause(
//             subscriptionContractId: $contractId
//           ) {
//             contract {
//               id
//               status
//               nextBillingDate
//             }
//             userErrors {
//               field
//               message
//               code
//             }
//           }
//         }
//         `,
//         { variables: { contractId } },
//       );

//       const data = await res.json();
//       const payload = data?.data?.subscriptionContractPause;
//       if (!payload || payload.userErrors?.length) {
//         console.error("Pause failed", payload?.userErrors);
//         return {
//           success: false,
//           error:
//             payload?.userErrors?.map((e) => e.message).join(", ") ||
//             "Pause failed",
//         };
//       }
//       return { success: true, status: payload.contract.status };
//     }

//     if (type === "cancel") {
//       const res = await admin.graphql(
//         `
//         mutation CancelSubscriptionContract($contractId: ID!) {
//           subscriptionContractCancel(
//             subscriptionContractId: $contractId
//           ) {
//             contract {
//               id
//               status
//               nextBillingDate
//             }
//             userErrors {
//               field
//               message
//               code
//             }
//           }
//         }
//         `,
//         { variables: { contractId } },
//       );

//       const data = await res.json();
//       const payload = data?.data?.subscriptionContractCancel;
//       if (!payload || payload.userErrors?.length) {
//         console.error("Cancel failed", payload?.userErrors);
//         return {
//           success: false,
//           error:
//             payload?.userErrors?.map((e) => e.message).join(", ") ||
//             "Cancel failed",
//         };
//       }

//       return { success: true, status: payload.contract.status };
//     }
//     if (type === "resume") {
//       const res = await admin.graphql(
//         `
//       mutation ActivateSubscriptionContract($contractId: ID!) {
//         subscriptionContractActivate(
//           subscriptionContractId: $contractId
//         ) {
//           contract {
//             id
//             status
//             nextBillingDate
//           }
//           userErrors {
//             field
//             message
//             code
//           }
//         }
//       }
//       `,
//         { variables: { contractId } },
//       );

//       const data = await res.json();
//       const payload = data?.data?.subscriptionContractActivate;

//       if (!payload || payload.userErrors?.length) {
//         console.error("Resume failed", payload?.userErrors);
//         return {
//           success: false,
//           error:
//             payload?.userErrors?.map((e) => e.message).join(", ") ||
//             "Resume failed",
//         };
//       }

//       return { success: true, status: payload.contract.status };
//     }
//     if (type === "skip") {
//       const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

//       if (Number.isNaN(cycleIndex)) {
//         return {
//           success: false,
//           error: "Invalid billing cycle index",
//         };
//       }

//       const res = await admin.graphql(
//         `
//         mutation SkipSubscriptionBillingCycle(
//           $billingCycleInput: SubscriptionBillingCycleInput!
//         ) {
//           subscriptionBillingCycleSkip(
//             billingCycleInput: $billingCycleInput
//           ) {
//             billingCycle {
//               cycleIndex
//               billingAttemptExpectedDate
//               skipped
//               edited
//               status
//             }
//             userErrors {
//               field
//               message
//               code
//             }
//           }
//         }
//         `,
//         {
//           variables: {
//             billingCycleInput: {
//               contractId,
//               // Use the cycle index to identify which cycle to skip
//               selector: {
//                 index: cycleIndex,
//               },
//             },
//           },
//         },
//       );

//       const data = await res.json();
//       const payload = data?.data?.subscriptionBillingCycleSkip;

//       if (!payload || payload.userErrors?.length) {
//         console.error("Skip failed", payload?.userErrors);
//         return {
//           success: false,
//           error:
//             payload?.userErrors?.map((e) => e.message).join(", ") ||
//             "Skip failed",
//         };
//       }

//       return {
//         success: true,
//         skippedCycleIndex: payload.billingCycle.cycleIndex,
//       };
//     }
//     if (type === "unskip") {
//       const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

//       if (Number.isNaN(cycleIndex)) {
//         return {
//           success: false,
//           error: "Invalid billing cycle index",
//         };
//       }

//       const res = await admin.graphql(
//         `
//       mutation UnskipSubscriptionBillingCycle(
//         $billingCycleInput: SubscriptionBillingCycleInput!
//       ) {
//         subscriptionBillingCycleUnskip(
//           billingCycleInput: $billingCycleInput
//         ) {
//           billingCycle {
//             cycleIndex
//             billingAttemptExpectedDate
//             skipped
//             edited
//             status
//           }
//           userErrors {
//             field
//             message
//             code
//           }
//         }
//       }
//       `,
//         {
//           variables: {
//             billingCycleInput: {
//               contractId,
//               selector: {
//                 index: cycleIndex,
//               },
//             },
//           },
//         },
//       );

//       const data = await res.json();
//       const payload = data?.data?.subscriptionBillingCycleUnskip;

//       if (!payload || payload.userErrors?.length) {
//         console.error("Unskip failed", payload?.userErrors);
//         return {
//           success: false,
//           error:
//             payload?.userErrors?.map((e) => e.message).join(", ") ||
//             "Unskip failed",
//         };
//       }

//       return {
//         success: true,
//         unskippedCycleIndex: payload.billingCycle.cycleIndex,
//       };
//     }
//   }

//   const payload = {
//     subscriptionId,
//     contractId,
//     ...(type === "internal"
//       ? { internalNotes: notes }
//       : { customerNotes: notes }),
//   };

//   try {
//     await fetch(`${API}/api/subscription`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-api-key": SECRET_KEY,
//       },
//       body: JSON.stringify(payload),
//     });
//     return { success: true };
//   } catch (err) {
//     console.error("Backend save notes call failed:", err);
//     return { success: false, error: err.message };
//   }
// }
// function subscriptionsId() {
//   const { contract, upcomingCycles, internalNotes, customerNotes } = useLoaderData();
//   console.log("contract", contract, "upcoming orders ", upcomingCycles);
//   const [showInternalNotes, setShowInternalNotes] = useState(false);
//   const [Internalnotes, setInternalNotes] = useState(internalNotes || "");
//   const [showCustomerNotes, setshowCustomerNotes] = useState(false);
//   const [CustomerNotes, setCustomerNotes] = useState(customerNotes || "");
//   const { id } = useParams();
//   const fetcher = useFetcher();
//   useEffect(() => {
//     setInternalNotes(internalNotes || "");
//     setCustomerNotes(customerNotes || "");
//   }, [internalNotes, customerNotes]);
//   const lines = contract?.lines?.edges;
//   const firstUpcomingCycle = upcomingCycles?.[0] || null;
//   const nextCycleIndex = upcomingCycles?.[0]?.cycleIndex ?? null;
//   const nextCycleDate = upcomingCycles?.[0]?.billingAttemptExpectedDate ?? null;
//   const isFirstUpcomingSkipped = firstUpcomingCycle?.skipped === true;
//   const shipingChargesAmount =
//     contract?.orders?.edges[0]?.node?.totalShippingPriceSet?.shopMoney?.amount;
//   const shipingChargesCurrency =
//     contract?.orders?.edges[0]?.node?.totalShippingPriceSet?.shopMoney
//       ?.currencyCode;
//   const shippingTitle = contract?.orders?.edges[0]?.node?.shippingLine?.title;

//   const navigate = useNavigate();
//   const backButton = () => {
//     navigate("/app/subscriptions");
//   };
//   const handleSave = () => {
//     fetcher.submit(
//       { type: "internal", notes: Internalnotes },
//       { method: "post" },
//     );
//     setShowInternalNotes(false);
//     setInternalNotes("");
//   };

//   const handleSaveCustomer = () => {
//     fetcher.submit(
//       { type: "customer", notes: CustomerNotes },
//       { method: "post" },
//     );
//     setshowCustomerNotes(false);
//     setCustomerNotes("");
//   };
//   const formateDate = (date) => {
//     return new Date(date).toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//     });
//   };
//   const grandTotal = lines?.reduce((sum, item) => {
//     const price = parseFloat(item?.node?.currentPrice?.amount || 0);
//     const quantity = item?.node?.quantity || 0;
//     return sum + price * quantity;
//   }, 0);
//   function getCardImage(brand) {
//     const brandMap = {
//       visa: "https://subscriptions-assets.kachingappz.app/payment-method-icons/visa.svg",
//       mastercard:
//         "https://subscriptions-assets.kachingappz.app/payment-method-icons/mastercard.svg",
//       amex: "https://subscriptions-assets.kachingappz.app/payment-method-icons/amex.svg",
//       bogus:
//         "https://subscriptions-assets.kachingappz.app/payment-method-icons/bogus.svg",
//     };
//     return brandMap[brand?.toLowerCase()] || brandMap["bogus"];
//   }
//   const handlePause = () => {
//     fetcher.submit({ type: "pause" }, { method: "post" });
//   };
//   const handleResume = () => {
//     fetcher.submit({ type: "resume" }, { method: "post" });
//   };
//   const handleCancelSubscription = () => {
//      let confirmed= confirm(
//       "Are you sure you want to cancel this subscription? This action cannot be undone.",
//     );
//     if (!confirmed) return;
//     fetcher.submit({ type: "cancel" }, { method: "post" });
//   };
//   return (
//     <>
//       <Page backAction={{ onAction: backButton }} title={`${id}`}>
//         {contract?.status === "CANCELLED" && (
//           <Banner
//             title="This subscription has been cancelled."
//             tone="critical"
//           ></Banner>
//         )}
//         <div>
//           <b>{contract.status}</b>, <b>{formateDate(contract?.createdAt)}</b> ,{" "}
//           <b>{contract?.originOrder?.name}</b>
//         </div>

//         {contract?.status === "ACTIVE" ? (
//           <>
//             <Button onClick={handlePause}>Pause</Button>
//           </>
//         ) : (
//           <>
//             {contract?.status !== "CANCELLED" && (
//               <Button onClick={handleResume}>Resume</Button>
//             )}
//           </>
//         )}

//         {contract?.status !== "CANCELLED" ? (
//           <Button onClick={handleCancelSubscription}>
//             Cancel Subscription
//           </Button>
//         ) : (
//           ""
//         )}

//         {contract?.status !== "CANCELLED" && (
//           <div>
//             <b>Next Order</b>
//             <p>{formateDate(nextCycleDate)}</p>
//             {contract?.status === "ACTIVE"  && !isFirstUpcomingSkipped  ? (
//               <>
//               </>
//             ) : (
//               ""
//             )}{" "}
//             <br />
//             {(contract?.billingPolicy?.minCycles != null ||
//               contract?.billingPolicy?.maxCycles != null) && (
//               <>
//                 <b>Order limits</b>
//                 {contract?.billingPolicy?.minCycles != null && (
//                   <p>Minimum cycles: {contract.billingPolicy.minCycles}</p>
//                 )}
//                 {contract?.billingPolicy?.maxCycles != null && (
//                   <p>Maximum cycles: {contract.billingPolicy.maxCycles}</p>
//                 )}
//               </>
//             )}
//           </div>
//         )}

//         <div>
//           <b>Billing Cycle</b>

//           <p>{nextCycleIndex}</p>
//         </div>
//         <div>
//           <b>Customer</b>
//           <p>
//             <span>
//               {contract?.customer?.firstName} {contract?.customer?.lastName}
//             </span>
//           </p>
//           <span>{contract?.customer?.defaultEmailAddress?.emailAddress}</span>

//           <div>
//             <b>Shipping address</b> <br />
//             <span>
//               {contract?.deliveryMethod?.address?.firstName}{" "}
//               {contract?.deliveryMethod?.address?.lastName}
//             </span>{" "}
//             <br />
//             <span>
//               {contract?.deliveryMethod?.address?.address1}{" "}
//               {contract?.deliveryMethod?.address?.address2}
//             </span>{" "}
//             <br />
//             <span>{contract?.deliveryMethod?.address?.zip}</span>{" "}
//             <span>{contract?.deliveryMethod?.address?.city}</span>{" "}
//             <span>{contract?.deliveryMethod?.address?.province}</span>{" "}
//             <span>{contract?.deliveryMethod?.address?.country}</span>
//           </div>

//           <div>
//             <b>Payment Method</b> <br />
//             <img
//               src={getCardImage(
//                 contract?.customerPaymentMethod?.instrument?.brand,
//               )}
//               alt={`${contract?.customerPaymentMethod?.instrument?.brand}`}
//             />
//             <span>
//               ●●●●●●●●●●●
//               {contract?.customerPaymentMethod?.instrument?.lastDigits}
//             </span>
//             <br />
//             <span>
//               Expires:{" "}
//               {contract?.customerPaymentMethod?.instrument?.expiryMonth}
//             </span>
//             /
//             <span>
//               {contract?.customerPaymentMethod?.instrument?.expiryYear}
//             </span>
//           </div>
//         </div>

//         <div>
//           <b> Subscription details</b>
//           <Link to="">Edit</Link>
//           <div>
//             {lines.map((item, index) => {
//               const price = item?.node?.currentPrice?.amount;
//               const quantity = item?.node?.quantity;
//               const Total = parseFloat(price * quantity);
//               const cycleDiscounts =
//                 item?.node?.pricingPolicy?.cycleDiscounts || [];

//               return (
//                 <Card key={index}>
//                   <img
//                     src={item?.node?.variantImage?.url}
//                     alt="prodcut image"
//                     width={50}
//                     height={50}
//                   />
//                   <p>
//                     {item?.node?.title} {item?.node?.variantTitle}
//                   </p>
//                   <p>
//                     <span>
//                       ProdcutId: {item?.node?.productId.split("/").pop()}
//                     </span>{" "}
//                     <span>
//                       VariantId: {item?.node?.variantId.split("/").pop()}
//                     </span>
//                   </p>
//                   <p>
//                     {" "}
//                     {`${item?.node?.currentPrice?.amount} X ${item?.node?.quantity} = ${Total}`}
//                   </p>
//                   {cycleDiscounts.length > 0 && (
//                     <p>
//                       <span>
//                         {cycleDiscounts.length === 1
//                           ? `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}% for all orders ` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount} for  all orders`}`
//                           : `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount}`} off for the first ${cycleDiscounts[1]?.afterCycle || 1} order, then ${cycleDiscounts[1]?.adjustmentValue?.percentage ? `${cycleDiscounts[1]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[1]?.adjustmentValue?.amount}`} off`}
//                       </span>
//                     </p>
//                   )}
//                   <p>
//                     <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
//                     <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
//                   </p>
//                 </Card>
//               );
//             })}
//           </div>
//         </div>
//         <Card>
//           <b>Payment Summary</b>

//           <p>Subtotal {grandTotal}</p>
//           <p>
//             Shipping {shippingTitle} {parseFloat(shipingChargesAmount)}
//           </p>
//           <p>Total {grandTotal + parseFloat(shipingChargesAmount)} </p>
//         </Card>
//         {/* {contract?.status !== "CANCELLED" && (
//           <Card>
//             <b>Upcoming orders</b>
//             {upcomingCycles?.map((cycle, index) => (
//               <div
//                 key={cycle.cycleIndex ?? index}
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   marginTop: "8px",
//                 }}
//               >
//                 <p>{formateDate(cycle.billingAttemptExpectedDate)}</p>
//                 <div style={{ display: "flex", gap: "30px" }}>
//                   <Link>Edit</Link>
//                   {contract?.status === "ACTIVE" &&(
//                     <Button
//               plain
//               onClick={() => {
//                 fetcher.submit(
//                   {
//                     type: "skip",
//                     cycleIndex: String(cycle.cycleIndex),
//                   },
//                   { method: "post" },
//                 );
//               }}
//             >
//               Skip
//             </Button>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </Card>
//         )} */}
//         {contract?.status !== "CANCELLED" && (
//           <Card>
//             <b>Upcoming orders</b>
//             {upcomingCycles?.map((cycle, index) => (
//               <div
//                 key={cycle.cycleIndex ?? index}
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   marginTop: "8px",
//                 }}
//               >
//                 <p>
//                   {formateDate(cycle.billingAttemptExpectedDate)}{" "}
//                   {cycle.skipped && <span>(Skipped)</span>}
//                 </p>

//                 <div
//                   style={{ display: "flex", gap: "30px", alignItems: "center" }}
//                 >
//                   {!cycle.skipped && <Button>Edit</Button>}
//                   {contract?.status === "ACTIVE" && !cycle.skipped && (
//                     <Button
//                       plain
//                       onClick={() => {
//                         fetcher.submit(
//                           {
//                             type: "skip",
//                             cycleIndex: String(cycle.cycleIndex),
//                           },
//                           { method: "post" },
//                         );
//                       }}
//                     >
//                       Skip
//                     </Button>
//                   )}

//                   {contract?.status === "ACTIVE" && cycle.skipped && (
//                     <Button
//                       plain
//                       onClick={() => {
//                         fetcher.submit(
//                           {
//                             type: "unskip",
//                             cycleIndex: String(cycle.cycleIndex),
//                           },
//                           { method: "post" },
//                         );
//                       }}
//                     >
//                       Resume
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </Card>
//         )}

//         <div>
//           <b>Internal Notes</b>
//           <br />
//           <Button onClick={() => setShowInternalNotes(true)}>Click</Button>
//           <br />
//           {showInternalNotes && (
//             <>
//               <textarea
//                 value={Internalnotes}
//                 onChange={(e) => setInternalNotes(e.target.value)}
//               ></textarea>
//               <Button
//                 onClick={() => {
//                   localStorage.removeItem("notes data");
//                   setShowInternalNotes(false);
//                 }}
//               >
//                 Cancel
//               </Button>
//               <Button onClick={handleSave}>Save</Button>
//             </>
//           )}
//         </div>
//         <div>
//           <b>Customer Notes</b>
//           <br />
//           <Button onClick={() => setshowCustomerNotes(true)}>Click</Button>
//           <br />
//           {showCustomerNotes && (
//             <>
//               <textarea
//                 value={CustomerNotes}
//                 onChange={(e) => setCustomerNotes(e.target.value)}
//               ></textarea>
//               <Button
//                 onClick={() => {
//                   localStorage.removeItem("customer data");
//                   setshowCustomerNotes(false);
//                 }}
//               >
//                 Cancel
//               </Button>
//               <Button onClick={handleSaveCustomer}>Save</Button>
//             </>
//           )}
//         </div>
//       </Page>
//     </>
//   );
// }
// export default subscriptionsId;

import { Banner, Button, Card, Page } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React, { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useFetcher,
  useLoaderData,
} from "react-router";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

// Helper: calculate unit price for a given line & cycleIndex based on basePrice + cycleDiscounts
function getUnitPriceForCycle(lineNode, cycleIndex) {
  const base = parseFloat(
    lineNode?.pricingPolicy?.basePrice?.amount ??
      lineNode?.currentPrice?.amount ??
      0,
  );

  const discounts = lineNode?.pricingPolicy?.cycleDiscounts || [];

  if (!discounts.length || cycleIndex == null) {
    return base;
  }

  // pick the discount whose afterCycle <= cycleIndex with the highest afterCycle
  const applicable = discounts
    .filter(
      (d) =>
        typeof d.afterCycle === "number" && d.afterCycle <= Number(cycleIndex),
    )
    .sort((a, b) => a.afterCycle - b.afterCycle)
    .at(-1);

  if (!applicable) return base;

  const val = applicable.adjustmentValue;

  // Percentage discount
  if (val && typeof val.percentage === "number") {
    const pct = val.percentage;
    return base * (1 - pct / 100);
  }

  // MoneyV2 amount off
  if (val && val.amount != null) {
    const amtOff = parseFloat(val.amount);
    return Math.max(base - amtOff, 0);
  }

  return base;
}

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  // Date range: now to next 12 months
  const startDate = new Date().toISOString();
  const endDateObj = new Date();
  endDateObj.setMonth(endDateObj.getMonth() + 12);
  const endDate = endDateObj.toISOString();

  const graphqlResponse = await admin.graphql(
    `
    query SubscriptionContractWithUpcoming(
      $contractId: ID!
      $startDate: DateTime!
      $endDate: DateTime!
    ) {
      subscriptionContract(id: $contractId) {
        id
        status
        createdAt
        updatedAt
        nextBillingDate
        deliveryPolicy {
          interval
          intervalCount
        }
        billingPolicy {
          interval
          intervalCount
          minCycles
          maxCycles
        }
        originOrder {
          id
          name
        }
        customer {
          id
          firstName
          lastName
          note
          defaultEmailAddress {
            emailAddress
          }
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
          id
          instrument {
            ... on CustomerCreditCard {
              brand
              lastDigits
              expiryMonth
              expiryYear
            }
          }
        }
        orders(first: 10, reverse: true) {
          edges {
            node {
              id
              createdAt
              name
              processedAt
              displayFinancialStatus
              displayFulfillmentStatus
              cancelReason
              cancelledAt
              currencyCode
              shippingLine {
                title
              }
              totalShippingPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
        lines(first: 10) {
          edges {
            node {
              id
              title
              variantTitle
              quantity
              productId
              variantId
              sku
              currentPrice {
                amount
                currencyCode
              }
              pricingPolicy {
                basePrice {
                  amount
                  currencyCode
                }
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
              variantImage {
                url
              }
            }
          }
        }
      }
      subscriptionBillingCycles(
        first: 250
        contractId: $contractId
        billingCyclesDateRangeSelector: {
          startDate: $startDate
          endDate: $endDate
        }
      ) {
        edges {
          node {
            billingAttemptExpectedDate
            cycleEndAt
            cycleIndex
            cycleStartAt
            edited
            skipped
            sourceContract {
              id
            }
            status
          }
        }
      }
    }
    `,
    {
      variables: {
        contractId,
        startDate,
        endDate,
      },
    },
  );

  const data = await graphqlResponse.json();

  if (!data?.data?.subscriptionContract) {
    throw new Response("Subscription contract not found", { status: 404 });
  }

  const contract = data.data.subscriptionContract;
  const allCycles =
    data.data.subscriptionBillingCycles?.edges?.map((edge) => edge.node) || [];
  const maxCycles = contract?.billingPolicy?.maxCycles ?? null;
  const now = new Date();
  let upcomingCycles = allCycles.filter(
    (cycle) =>
      cycle.billingAttemptExpectedDate &&
      new Date(cycle.billingAttemptExpectedDate) >= now,
  );

  if (maxCycles != null) {
    upcomingCycles = upcomingCycles.filter(
      (cycle) =>
        typeof cycle.cycleIndex === "number" && cycle.cycleIndex <= maxCycles,
    );
  }

  try {
    await fetch(`${API}/api/subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SECRET_KEY,
      },
      body: JSON.stringify({
        subscriptionId,
        contractId,
        contract,
        upcomingCycles,
      }),
    });
  } catch (err) {
    console.error("Backend save call failed:", err);
  }

  let internalNotes = "";
  let customerNotes = "";
  try {
    const notesRes = await fetch(`${API}/api/${subscriptionId}`, {
      method: "GET",
      headers: {
        "x-api-key": SECRET_KEY,
      },
    });
    if (notesRes.ok) {
      const notesData = await notesRes.json();
      internalNotes = notesData?.data?.internalNotes || "";
      customerNotes = notesData?.data?.customerNotes || "";
    }
  } catch (err) {
    console.error("Backend fetch notes failed:", err);
  }

  return { contract, upcomingCycles, internalNotes, customerNotes };
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const type = formData.get("type"); // "internal" ya "customer"
  const notes = formData.get("notes");
  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;
  const { admin } = await authenticate.admin(request);

  if (
    type === "pause" ||
    type === "cancel" ||
    type === "resume" ||
    type === "skip" ||
    type === "unskip"
  ) {
    if (type === "pause") {
      const res = await admin.graphql(
        `
        mutation PauseSubscriptionContract($contractId: ID!) {
          subscriptionContractPause(
            subscriptionContractId: $contractId
          ) {
            contract {
              id
              status
              nextBillingDate
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        { variables: { contractId } },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionContractPause;
      if (!payload || payload.userErrors?.length) {
        console.error("Pause failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Pause failed",
        };
      }
      return { success: true, status: payload.contract.status };
    }

    if (type === "cancel") {
      const res = await admin.graphql(
        `
        mutation CancelSubscriptionContract($contractId: ID!) {
          subscriptionContractCancel(
            subscriptionContractId: $contractId
          ) {
            contract {
              id
              status
              nextBillingDate
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        { variables: { contractId } },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionContractCancel;
      if (!payload || payload.userErrors?.length) {
        console.error("Cancel failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Cancel failed",
        };
      }

      return { success: true, status: payload.contract.status };
    }

    if (type === "resume") {
      const res = await admin.graphql(
        `
        mutation ActivateSubscriptionContract($contractId: ID!) {
          subscriptionContractActivate(
            subscriptionContractId: $contractId
          ) {
            contract {
              id
              status
              nextBillingDate
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        { variables: { contractId } },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionContractActivate;

      if (!payload || payload.userErrors?.length) {
        console.error("Resume failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Resume failed",
        };
      }

      return { success: true, status: payload.contract.status };
    }

    if (type === "skip") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

      if (Number.isNaN(cycleIndex)) {
        return {
          success: false,
          error: "Invalid billing cycle index",
        };
      }

      const res = await admin.graphql(
        `
        mutation SkipSubscriptionBillingCycle(
          $billingCycleInput: SubscriptionBillingCycleInput!
        ) {
          subscriptionBillingCycleSkip(
            billingCycleInput: $billingCycleInput
          ) {
            billingCycle {
              cycleIndex
              billingAttemptExpectedDate
              skipped
              edited
              status
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        {
          variables: {
            billingCycleInput: {
              contractId,
              selector: {
                index: cycleIndex,
              },
            },
          },
        },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionBillingCycleSkip;

      if (!payload || payload.userErrors?.length) {
        console.error("Skip failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Skip failed",
        };
      }

      return {
        success: true,
        skippedCycleIndex: payload.billingCycle.cycleIndex,
      };
    }

    if (type === "unskip") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

      if (Number.isNaN(cycleIndex)) {
        return {
          success: false,
          error: "Invalid billing cycle index",
        };
      }

      const res = await admin.graphql(
        `
        mutation UnskipSubscriptionBillingCycle(
          $billingCycleInput: SubscriptionBillingCycleInput!
        ) {
          subscriptionBillingCycleUnskip(
            billingCycleInput: $billingCycleInput
          ) {
            billingCycle {
              cycleIndex
              billingAttemptExpectedDate
              skipped
              edited
              status
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        {
          variables: {
            billingCycleInput: {
              contractId,
              selector: {
                index: cycleIndex,
              },
            },
          },
        },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionBillingCycleUnskip;

      if (!payload || payload.userErrors?.length) {
        console.error("Unskip failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Unskip failed",
        };
      }

      return {
        success: true,
        unskippedCycleIndex: payload.billingCycle.cycleIndex,
      };
    }
  }

  const payload = {
    subscriptionId,
    contractId,
    ...(type === "internal"
      ? { internalNotes: notes }
      : { customerNotes: notes }),
  };

  try {
    await fetch(`${API}/api/subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SECRET_KEY,
      },
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    console.error("Backend save notes call failed:", err);
    return { success: false, error: err.message };
  }
}

function subscriptionsId() {
  const { contract, upcomingCycles, internalNotes, customerNotes } =
    useLoaderData();
  console.log("contract", contract, "upcoming orders ", upcomingCycles);

  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [Internalnotes, setInternalNotes] = useState(internalNotes || "");
  const [showCustomerNotes, setshowCustomerNotes] = useState(false);
  const [CustomerNotes, setCustomerNotes] = useState(customerNotes || "");

  const { id } = useParams();
  const fetcher = useFetcher();

  useEffect(() => {
    setInternalNotes(internalNotes || "");
    setCustomerNotes(customerNotes || "");
  }, [internalNotes, customerNotes]);

  const lines = contract?.lines?.edges || [];
  const firstUpcomingCycle = upcomingCycles?.[0] || null;
  const nextCycleIndex = upcomingCycles?.[0]?.cycleIndex ?? null;
  const nextCycleDate = upcomingCycles?.[0]?.billingAttemptExpectedDate ?? null;
  const isFirstUpcomingSkipped = firstUpcomingCycle?.skipped === true;

  const shipingChargesAmount =
    contract?.orders?.edges?.[0]?.node?.totalShippingPriceSet?.shopMoney
      ?.amount;
  const shipingChargesCurrency =
    contract?.orders?.edges?.[0]?.node?.totalShippingPriceSet?.shopMoney
      ?.currencyCode;
  const shippingTitle =
    contract?.orders?.edges?.[0]?.node?.shippingLine?.title || "";

  const navigate = useNavigate();
  const backButton = () => {
    navigate("/app/subscriptions");
  };

  const handleSave = () => {
    fetcher.submit(
      { type: "internal", notes: Internalnotes },
      { method: "post" },
    );
    setShowInternalNotes(false);
    setInternalNotes("");
  };

  const handleSaveCustomer = () => {
    fetcher.submit(
      { type: "customer", notes: CustomerNotes },
      { method: "post" },
    );
    setshowCustomerNotes(false);
    setCustomerNotes("");
  };

  const formateDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // current contract snapshot subtotal (using currentPrice)
  const grandTotal = lines.reduce((sum, item) => {
    const price = parseFloat(item?.node?.currentPrice?.amount || 0);
    const quantity = item?.node?.quantity || 0;
    return sum + price * quantity;
  }, 0);

  // Next order subtotal using cycle discounts and nextCycleIndex
  const nextOrderSubtotal = lines.reduce((sum, item) => {
    const lineNode = item?.node;
    if (!lineNode) return sum;
    const unitPriceForNextCycle = getUnitPriceForCycle(lineNode, nextCycleIndex);
    const quantity = lineNode.quantity || 0;
    return sum + unitPriceForNextCycle * quantity;
  }, 0);

  const shippingAmount = parseFloat(shipingChargesAmount || 0);
  const nextOrderTotal = nextOrderSubtotal + shippingAmount;

  function getCardImage(brand) {
    const brandMap = {
      visa: "https://subscriptions-assets.kachingappz.app/payment-method-icons/visa.svg",
      mastercard:
        "https://subscriptions-assets.kachingappz.app/payment-method-icons/mastercard.svg",
      amex: "https://subscriptions-assets.kachingappz.app/payment-method-icons/amex.svg",
      bogus:
        "https://subscriptions-assets.kachingappz.app/payment-method-icons/bogus.svg",
    };
    return brandMap[brand?.toLowerCase()] || brandMap["bogus"];
  }

  const handlePause = () => {
    fetcher.submit({ type: "pause" }, { method: "post" });
  };

  const handleResume = () => {
    fetcher.submit({ type: "resume" }, { method: "post" });
  };

  const handleCancelSubscription = () => {
    let confirmed = confirm(
      "Are you sure you want to cancel this subscription? This action cannot be undone.",
    );
    if (!confirmed) return;
    fetcher.submit({ type: "cancel" }, { method: "post" });
  };

  return (
    <>
      <Page backAction={{ onAction: backButton }} title={`${id}`}>
        {contract?.status === "CANCELLED" && (
          <Banner
            title="This subscription has been cancelled."
            tone="critical"
          ></Banner>
        )}

        <div>
          <b>{contract.status}</b>, <b>{formateDate(contract?.createdAt)}</b>,{" "}
          <b>{contract?.originOrder?.name}</b>
        </div>

        {contract?.status === "ACTIVE" ? (
          <Button onClick={handlePause}>Pause</Button>
        ) : (
          contract?.status !== "CANCELLED" && (
            <Button onClick={handleResume}>Resume</Button>
          )
        )}

        {contract?.status !== "CANCELLED" && (
          <Button onClick={handleCancelSubscription}>
            Cancel Subscription
          </Button>
        )}

        {contract?.status !== "CANCELLED" && (
          <div>
            <b>Next Order</b>
            <p>{nextCycleDate ? formateDate(nextCycleDate) : "N/A"}</p>
            {contract?.status === "ACTIVE" && !isFirstUpcomingSkipped && (
              <>
                <p>
                  Next order subtotal: {nextOrderSubtotal.toFixed(2)}{" "}
                  {shipingChargesCurrency}
                </p>
                <p>
                  Shipping: {shippingTitle} {shippingAmount.toFixed(2)}{" "}
                  {shipingChargesCurrency}
                </p>
                <p>
                  Next order total: {nextOrderTotal.toFixed(2)}{" "}
                  {shipingChargesCurrency}
                </p>
              </>
            )}
            <br />
            {(contract?.billingPolicy?.minCycles != null ||
              contract?.billingPolicy?.maxCycles != null) && (
              <>
                <b>Order limits</b>
                {contract?.billingPolicy?.minCycles != null && (
                  <p>Minimum cycles: {contract.billingPolicy.minCycles}</p>
                )}
                {contract?.billingPolicy?.maxCycles != null && (
                  <p>Maximum cycles: {contract.billingPolicy.maxCycles}</p>
                )}
              </>
            )}
          </div>
        )}

        <div>
          <b>Billing Cycle</b>
          <p>{nextCycleIndex}</p>
        </div>

        <div>
          <b>Customer</b>
          <p>
            <span>
              {contract?.customer?.firstName} {contract?.customer?.lastName}
            </span>
          </p>
          <span>{contract?.customer?.defaultEmailAddress?.emailAddress}</span>

          <div>
            <b>Shipping address</b> <br />
            <span>
              {contract?.deliveryMethod?.address?.firstName}{" "}
              {contract?.deliveryMethod?.address?.lastName}
            </span>
            <br />
            <span>
              {contract?.deliveryMethod?.address?.address1}{" "}
              {contract?.deliveryMethod?.address?.address2}
            </span>
            <br />
            <span>{contract?.deliveryMethod?.address?.zip}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.city}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.province}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.country}</span>
          </div>

          <div>
            <b>Payment Method</b> <br />
            <img
              src={getCardImage(
                contract?.customerPaymentMethod?.instrument?.brand,
              )}
              alt={`${contract?.customerPaymentMethod?.instrument?.brand}`}
            />
            <span>
              ●●●●●●●●●●●
              {contract?.customerPaymentMethod?.instrument?.lastDigits}
            </span>
            <br />
            <span>
              Expires:{" "}
              {contract?.customerPaymentMethod?.instrument?.expiryMonth}
            </span>
            /
            <span>
              {contract?.customerPaymentMethod?.instrument?.expiryYear}
            </span>
          </div>
        </div>

        <div>
          <b> Subscription details</b>
          <Link to="">Edit</Link>
          <div>
            {lines.map((item, index) => {
              const lineNode = item?.node;
              const quantity = lineNode?.quantity || 0;
              const cycleDiscounts =
                lineNode?.pricingPolicy?.cycleDiscounts || [];

              const unitPriceForNextCycle = getUnitPriceForCycle(
                lineNode,
                nextCycleIndex,
              );
              const lineTotalForNextCycle =
                unitPriceForNextCycle * quantity;

              return (
                <Card key={index}>
                  <img
                    src={lineNode?.variantImage?.url}
                    alt="product image"
                    width={50}
                    height={50}
                  />
                  <p>
                    {lineNode?.title} {lineNode?.variantTitle}
                  </p>
                  <p>
                    <span>
                      ProductId: {lineNode?.productId.split("/").pop()}
                    </span>{" "}
                    <span>
                      VariantId: {lineNode?.variantId.split("/").pop()}
                    </span>
                  </p>
                  <p>
                    {`${unitPriceForNextCycle.toFixed(2)} X ${quantity} = ${lineTotalForNextCycle.toFixed(
                      2,
                    )}`}
                  </p>
                  {cycleDiscounts.length > 0 && (
                    <p>
                      <span>
                        {cycleDiscounts.length === 1
                          ? cycleDiscounts[0]?.adjustmentValue
                              ?.percentage != null
                            ? `${cycleDiscounts[0].adjustmentValue.percentage}% for all orders`
                            : `₹${cycleDiscounts[0].adjustmentValue.amount} for all orders`
                          : `${cycleDiscounts[0]?.adjustmentValue
                                ?.percentage != null
                              ? `${cycleDiscounts[0].adjustmentValue.percentage}%`
                              : `₹${cycleDiscounts[0].adjustmentValue.amount}`
                            } off from cycle ${
                              cycleDiscounts[0].afterCycle
                            }, then ${
                              cycleDiscounts[1]?.adjustmentValue
                                ?.percentage != null
                                ? `${cycleDiscounts[1].adjustmentValue.percentage}%`
                                : `₹${cycleDiscounts[1].adjustmentValue.amount}`
                            } off from cycle ${cycleDiscounts[1].afterCycle}`}
                      </span>
                    </p>
                  )}
                  <p>
                    <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
                    <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <b>Payment Summary</b>
          <p>Current subtotal (contract): {grandTotal.toFixed(2)}</p>
          <p>
            Current shipping {shippingTitle} {shippingAmount.toFixed(2)}{" "}
            {shipingChargesCurrency}
          </p>
          <p>
            Current total (contract):{" "}
            {(grandTotal + shippingAmount).toFixed(2)}{" "}
            {shipingChargesCurrency}
          </p>
          <hr />
          <p>
            Next order subtotal (with discounts):{" "}
            {nextOrderSubtotal.toFixed(2)} {shipingChargesCurrency}
          </p>
          <p>
            Next order total: {nextOrderTotal.toFixed(2)}{" "}
            {shipingChargesCurrency}
          </p>
        </Card>

        {contract?.status !== "CANCELLED" && (
          <Card>
            <b>Upcoming orders</b>
            {upcomingCycles?.map((cycle, index) => (
              <div
                key={cycle.cycleIndex ?? index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                }}
              >
                <p>
                  {formateDate(cycle.billingAttemptExpectedDate)}{" "}
                  {cycle.skipped && <span>(Skipped)</span>}
                </p>

                <div
                  style={{ display: "flex", gap: "30px", alignItems: "center" }}
                >
                  {!cycle.skipped && <Button>Edit</Button>}
                  {contract?.status === "ACTIVE" && !cycle.skipped && (
                    <Button
                      plain
                      onClick={() => {
                        fetcher.submit(
                          {
                            type: "skip",
                            cycleIndex: String(cycle.cycleIndex),
                          },
                          { method: "post" },
                        );
                      }}
                    >
                      Skip
                    </Button>
                  )}

                  {contract?.status === "ACTIVE" && cycle.skipped && (
                    <Button
                      plain
                      onClick={() => {
                        fetcher.submit(
                          {
                            type: "unskip",
                            cycleIndex: String(cycle.cycleIndex),
                          },
                          { method: "post" },
                        );
                      }}
                    >
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}

        <div>
          <b>Internal Notes</b>
          <br />
          <Button onClick={() => setShowInternalNotes(true)}>Click</Button>
          <br />
          {showInternalNotes && (
            <>
              <textarea
                value={Internalnotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              ></textarea>
              <Button
                onClick={() => {
                  localStorage.removeItem("notes data");
                  setShowInternalNotes(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </>
          )}
        </div>

        <div>
          <b>Customer Notes</b>
          <br />
          <Button onClick={() => setshowCustomerNotes(true)}>Click</Button>
          <br />
          {showCustomerNotes && (
            <>
              <textarea
                value={CustomerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              ></textarea>
              <Button
                onClick={() => {
                  localStorage.removeItem("customer data");
                  setshowCustomerNotes(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveCustomer}>Save</Button>
            </>
          )}
        </div>
      </Page>
    </>
  );
}

export default subscriptionsId;