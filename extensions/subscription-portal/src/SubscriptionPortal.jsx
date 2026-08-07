// import "@shopify/ui-extensions/preact";
// import { render } from "preact";
// import { useState, useEffect, useCallback, useRef } from "preact/hooks";

// const API_BASE = "https://most-premiere-holidays-rounds.trycloudflare.com";
// const PAGE_SIZE = 7;

// export default async () => {
//   render(<Extension />, document.body);
// };

// function getNumericId(gid) {
//   if (!gid) return null;
//   return gid.split("/").pop();
// }

// function parseSubscriptionIdFromUrl(url) {
//   if (!url) return null;
//   const match = url.match(/\/subscriptions\/([^/?#]+)/);
//   return match ? match[1] : null;
// }

// function toDateOnlyString(value) {
//   if (!value) return value;
//   if (typeof value === "string") {
//     const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
//     if (match) return match[1];
//   }
//   const d = value instanceof Date ? value : new Date(value);
//   if (Number.isNaN(d.valueOf())) return null;
//   const y = d.getUTCFullYear();
//   const m = String(d.getUTCMonth() + 1).padStart(2, "0");
//   const day = String(d.getUTCDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// }

// function dateOnlyToUTCDate(dateOnlyStr) {
//   const [y, m, d] = dateOnlyStr.split("-").map(Number);
//   return new Date(Date.UTC(y, m - 1, d));
// }

// function formatShort(dateOnlyStr) {
//   if (!dateOnlyStr) return "-";
//   return dateOnlyToUTCDate(dateOnlyStr).toLocaleDateString("en-GB", {
//     day: "numeric",
//     month: "short",
//     timeZone: "UTC",
//   });
// }
// function formatShortWithYear(dateOnlyStr) {
//   if (!dateOnlyStr) return "-";
//   const d = dateOnlyToUTCDate(dateOnlyStr);
//   const opts = { day: "numeric", month: "short", timeZone: "UTC" };
//   if (d.getUTCFullYear() !== new Date().getUTCFullYear()) {
//     opts.year = "numeric";
//   }
//   return d.toLocaleDateString("en-GB", opts);
// }

// function getNextActionableCycle(cycles) {
//   return cycles.find((c) => !c.skipped && c.status !== "BILLED") ?? null;
// }

// const VISIBLE_CYCLES_LIMIT = 6;

// function SkeletonCard() {
//   return (
//     <s-box border="base" borderRadius="base" padding="base">
//       <s-stack direction="block" gap="tight">
//         <s-box
//           inlineSize="60px"
//           blockSize="20px"
//           borderRadius="base"
//           background="subdued"
//         />
//         <s-stack direction="inline" gap="tight" alignItems="center">
//           <s-box
//             inlineSize="56px"
//             blockSize="56px"
//             borderRadius="base"
//             background="subdued"
//           />
//           <s-box
//             inlineSize="140px"
//             blockSize="16px"
//             borderRadius="base"
//             background="subdued"
//           />
//         </s-stack>
//         <s-box
//           inlineSize="120px"
//           blockSize="14px"
//           borderRadius="base"
//           background="subdued"
//         />
//         <s-box
//           inlineSize="160px"
//           blockSize="14px"
//           borderRadius="base"
//           background="subdued"
//         />
//       </s-stack>
//     </s-box>
//   );
// }

// function Extension() {
//   const [subscriptions, setSubscriptions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [error, setError] = useState(null);
//   const [cursor, setCursor] = useState(null);
//   const [hasMore, setHasMore] = useState(false);
//   const [selectedSub, setSelectedSub] = useState(null);
//   const customerIdRef = useRef(null);

//   const getCustomerId = useCallback(async () => {
//     if (customerIdRef.current) return customerIdRef.current;

//     let customerId = shopify.authenticatedAccount.customer.current?.id;

//     if (!customerId) {
//       customerId = await new Promise((resolve) => {
//         const unsubscribe = shopify.authenticatedAccount.customer.subscribe(
//           (customer) => {
//             if (customer?.id) {
//               unsubscribe();
//               resolve(customer.id);
//             }
//           },
//         );
//       });
//     }

//     customerIdRef.current = customerId;
//     return customerId;
//   }, []);
//   useEffect(() => {
//     function syncFromEntry(entry) {
//       const id = parseSubscriptionIdFromUrl(entry?.url);
//       if (!id) {
//         setSelectedSub(null);
//         return;
//       }

//       const found = subscriptions.find((s) => getNumericId(s.id) === id);
//       if (found) {
//         setSelectedSub(found);
//         return;
//       }

//       const stateSub = entry.getState?.();
//       if (stateSub) {
//         setSelectedSub(stateSub);
//       }
//     }

//     syncFromEntry(shopify.navigation.currentEntry);

//     function onChange() {
//       syncFromEntry(shopify.navigation.currentEntry);
//     }

//     shopify.navigation.addEventListener("currententrychange", onChange);
//     return () =>
//       shopify.navigation.removeEventListener("currententrychange", onChange);
//   }, [subscriptions]);

//   const fetchPage = useCallback(
//     async ({ afterCursor = null, reset = true } = {}) => {
//       try {
//         const customerId = await getCustomerId();

//         if (!customerId) {
//           setError("Customer ID not found");
//           return null;
//         }

//         const token = await shopify.sessionToken.get();

//         const params = new URLSearchParams({
//           customerId,
//           limit: String(PAGE_SIZE),
//         });
//         if (afterCursor) params.set("cursor", afterCursor);

//         const res = await fetch(
//           `${API_BASE}/api/subscriptions?${params.toString()}`,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//             },
//           },
//         );

//         if (!res.ok) {
//           const text = await res.text();
//           throw new Error(`API ${res.status}: ${text}`);
//         }

//         const data = await res.json();
//         const newSubs = data.subscriptions || [];
//         const pageInfo = data.pageInfo || {
//           hasNextPage: false,
//           endCursor: null,
//         };

//         setSubscriptions((prev) => (reset ? newSubs : [...prev, ...newSubs]));
//         setHasMore(!!pageInfo.hasNextPage);
//         setCursor(pageInfo.endCursor || null);

//         return reset ? newSubs : [...subscriptions, ...newSubs];
//       } catch (err) {
//         console.error("Failed to load subscriptions", err);
//         setError(err.message);
//         return null;
//       }
//     },
//     [getCustomerId, subscriptions],
//   );

//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       await fetchPage({ afterCursor: null, reset: true });
//       setLoading(false);
//     })();
//   }, []);

//   async function handleViewMore() {
//     if (!hasMore || loadingMore) return;
//     setLoadingMore(true);
//     await fetchPage({ afterCursor: cursor, reset: false });
//     setLoadingMore(false);
//   }

//   function handleSelect(sub) {
//     setSelectedSub(sub);
//     const numericId = getNumericId(sub.id);
//     try {
//       shopify.navigation.navigate(`extension://subscriptions/${numericId}`, {
//         history: "push",
//         state: sub,
//       });
//     } catch (err) {
//       console.error("navigation.navigate failed:", err);
//     }
//   }

//   function handleBack() {
//     setSelectedSub(null);
//     try {
//       shopify.navigation.navigate("extension:/", { history: "push" });
//     } catch (err) {
//       console.error("navigation.navigate failed:", err);
//     }
//   }
//   const refreshSubscriptions = useCallback(async () => {
//     const list = await fetchPage({ afterCursor: null, reset: true });
//     const current = selectedSub;
//     if (!current) return null;

//     const updated = list?.find((s) => s.id === current.id);
//     if (updated) {
//       setSelectedSub(updated);
//       try {
//         shopify.navigation.navigate(shopify.navigation.currentEntry.url, {
//           history: "replace",
//           state: updated,
//         });
//       } catch (err) {
//         console.error("navigation state sync failed:", err);
//       }
//       return updated;
//     }
//     return null;
//   }, [fetchPage, selectedSub]);

//   if (error) {
//     return (
//       <s-page heading="Subscriptions">
//         <s-section>
//           <s-text tone="critical">Error: {error}</s-text>
//         </s-section>
//       </s-page>
//     );
//   }

//   if (selectedSub) {
//     return (
//       <SubscriptionDetail

//         key={getNumericId(selectedSub.id)}
//         sub={selectedSub}
//         onBack={handleBack}
//         refreshSubscriptions={refreshSubscriptions}
//       />
//     );
//   }

//   return (
//     <s-page heading="Subscriptions">
//       <s-section>
//         {loading ? (
//           <s-stack direction="block" gap="base">
//             {Array.from({ length: PAGE_SIZE }).map((_, i) => (
//               <SkeletonCard key={i} />
//             ))}
//           </s-stack>
//         ) : subscriptions.length === 0 ? (
//           <s-text>No subscriptions.....</s-text>
//         ) : (
//           <s-stack direction="block" gap="base">
//             {subscriptions.map((sub) => (
//               <SubscriptionCard
//                 key={sub.id}
//                 sub={sub}
//                 onClick={() => handleSelect(sub)}
//               />
//             ))}

//             {loadingMore &&
//               Array.from({ length: PAGE_SIZE }).map((_, i) => (
//                 <SkeletonCard key={`more-${i}`} />
//               ))}

//             {hasMore && !loadingMore && (
//               <s-button variant="secondary" onClick={handleViewMore}>
//                 View more
//               </s-button>
//             )}
//           </s-stack>
//         )}
//       </s-section>
//     </s-page>
//   );
// }

// function SubscriptionCard({ sub, onClick }) {
//   const line = sub.displayLine || sub.lines?.edges?.[0]?.node;
//   const imageUrl = line?.imageUrl || null;

//   return (
//     <s-box border="base" borderRadius="base" padding="base">
//       <s-stack direction="block" gap="tight">
//         <s-badge
//           tone={
//             sub.status === "ACTIVE"
//               ? "success"
//               : sub.status === "PAUSED"
//                 ? "warning"
//                 : "neutral"
//           }
//         >
//           {sub.status}
//         </s-badge>
//         <s-stack direction="inline" gap="tight" alignItems="center">
//           <s-box
//             inlineSize="56px"
//             blockSize="56px"
//             borderRadius="base"
//             overflow="hidden"
//           >
//             <s-image src={imageUrl} alt={line?.title || "Product image"} />
//           </s-box>
//           <s-text fontWeight="bold">{line?.title ?? "Subscription"}</s-text>
//         </s-stack>
//         <s-text tone="subdued">
//           Next order: {formatShort(toDateOnlyString(sub.nextBillingDate))}
//         </s-text>
//         <s-text tone="subdued">
//           Delivery every {sub.deliveryPolicy?.intervalCount}{" "}
//           {sub.deliveryPolicy?.interval?.toLowerCase()}
//         </s-text>
//         <s-button variant="secondary" onClick={onClick}>
//           View details
//         </s-button>
//       </s-stack>
//     </s-box>
//   );
// }

// function SubscriptionDetail({ sub, onBack, refreshSubscriptions }) {
//   const [upcomingCycles, setUpcomingCycles] = useState(
//     sub.upcomingCycles ?? [],
//   );
//   const [nextBillingDate, setNextBillingDate] = useState(sub.nextBillingDate);
//   const [hasMoreCycles, setHasMoreCycles] = useState(sub.hasMoreCycles ?? false);
//   const [loadingCycleIndex, setLoadingCycleIndex] = useState(null);
//   const [loadingAction, setLoadingAction] = useState(null);
   

//   useEffect(() => {
//     setUpcomingCycles(sub.upcomingCycles ?? []);
//     setNextBillingDate(sub.nextBillingDate);
//     setHasMoreCycles(sub.hasMoreCycles ?? false);
//   }, [sub]);

//   function applyCycleUpdate(cycleIndex, patch) {
//     setUpcomingCycles((prev) => {
//       const updated = prev.map((c) =>
//         c.cycleIndex === cycleIndex ? { ...c, ...patch } : c,
//       );

//       const visible = updated.slice(0, VISIBLE_CYCLES_LIMIT);
//       const next = getNextActionableCycle(visible);
//       if (next) {
//         setNextBillingDate(next.billingAttemptExpectedDate);
//       } else {
//         const beyond = updated
//           .slice(VISIBLE_CYCLES_LIMIT)
//           .find((c) => !c.skipped && c.status !== "BILLED");
//         setNextBillingDate(beyond ? beyond.billingAttemptExpectedDate : null);
//       }

//       return updated;
//     });
//   }

//   async function handleSkip(contractId, cycleIndex) {
//     if (cycleIndex == null || loadingCycleIndex != null) return;
//     try {
//       setLoadingCycleIndex(cycleIndex);
//       setLoadingAction("skip");

//       const token = await shopify.sessionToken.get();
//       const res = await fetch(`${API_BASE}/api/subscriptions/skip`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ contractId, cycleIndex }),
//       });

//       const data = await res.json();
//       if (!res.ok || !data.success) {
//         throw new Error(data.error || "Skip failed");
//       }

//       applyCycleUpdate(cycleIndex, { skipped: true });
//       shopify.toast.show("Order skipped");
//       refreshSubscriptions().catch((err) =>
//         console.error("Background refresh after skip failed:", err),
//       );
//     } catch (err) {
//       console.error(err);
//       shopify.toast.show(err.message);
//     } finally {
//       setLoadingCycleIndex(null);
//       setLoadingAction(null);
//     }
//   }

//   async function handleUnskip(contractId, cycleIndex) {
//     if (cycleIndex == null || loadingCycleIndex != null) return;
//     try {
//       setLoadingCycleIndex(cycleIndex);
//       setLoadingAction("unskip");

//       const token = await shopify.sessionToken.get();
//       const res = await fetch(`${API_BASE}/api/subscriptions/unskip`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ contractId, cycleIndex }),
//       });

//       const data = await res.json();
//       if (!res.ok || !data.success) {
//         throw new Error(data.error || "Unskip failed");
//       }

//       applyCycleUpdate(cycleIndex, { skipped: false });
//       shopify.toast.show("Order un-skipped");
//       refreshSubscriptions().catch((err) =>
//         console.error("Background refresh after unskip failed:", err),
//       );
//     } catch (err) {
//       console.error(err);
//       shopify.toast.show(err.message);
//     } finally {
//       setLoadingCycleIndex(null);
//       setLoadingAction(null);
//     }
//   }

//   function handleReschedule(contractId, cycleIndex) {
//     console.log("TODO: implement reschedule for", contractId, cycleIndex);
//   }

//   const items = sub.nextOrderLineItems?.length
//     ? sub.nextOrderLineItems
//     : (sub.lines?.edges?.map((e) => e.node) ?? []);

//   const address = sub.deliveryMethod?.address ?? null;
//   const total = sub.nextOrderTotal;
//   const shipping = sub.nextOrderShipping;
//   const grandTotal =
//     total != null
//       ? (
//           Number(total.amount) + Number(shipping?.calculatedPrice?.amount ?? 0)
//         ).toFixed(2)
//       : null;

//   const numericId = getNumericId(sub.id);
//   const modalId = `upcoming-orders-modal-${numericId}`;
//   const cycles = upcomingCycles;

//   const visibleCycles = cycles.slice(0, VISIBLE_CYCLES_LIMIT);


//   const nextActionable = getNextActionableCycle(visibleCycles);


//   const maxSkipReached =
//     visibleCycles.length === VISIBLE_CYCLES_LIMIT && !nextActionable;

//   return (
//     <s-page heading="Manage subscription">
//       <s-section>
//         <s-stack direction="block" gap="base">
//           <s-stack direction="inline" gap="tight" alignItems="center">
//             <s-button variant="tertiary" onClick={onBack}>
//               ← Back
//             </s-button>
//           </s-stack>

//           <s-badge
//             tone={
//               sub.status === "ACTIVE"
//                 ? "success"
//                 : sub.status === "PAUSED"
//                   ? "warning"
//                   : "neutral"
//             }
//           >
//             Status: {sub.status}
//           </s-badge>

//           <s-box border="base" borderRadius="base" padding="base">
//             <s-stack direction="block" gap="base">
//               <s-stack direction="block" gap="tight">
//                 <s-text fontWeight="bold">Upcoming order</s-text>
//                 {nextBillingDate ? (
//                   <s-text tone="subdued">
//                     {formatShort(toDateOnlyString(nextBillingDate))}
//                   </s-text>
//                 ) : (
//                   <s-text tone="subdued">-</s-text>
//                 )}
//               </s-stack>

//               <s-stack direction="inline" gap="tight">
//                 <s-button
//                   variant="secondary"
//                   disabled={!nextActionable || loadingCycleIndex != null}
//                   onClick={() =>
//                     nextActionable &&
//                     handleSkip(sub.id, nextActionable.cycleIndex)
//                   }
//                 >
//                   {loadingAction === "skip" &&
//                   loadingCycleIndex === nextActionable?.cycleIndex ? (
//                     <s-spinner size="small" />
//                   ) : (
//                     "Skip"
//                   )}
//                 </s-button>
//               </s-stack>

//               {visibleCycles.length > 0 && (
//                 <s-link command="--show" commandFor={modalId}>
//                   Show upcoming orders
//                 </s-link>
//               )}
//               {maxSkipReached && (
//                 <s-text tone="subdued">
//                   The maximum number of orders have been skipped
//                 </s-text>
//               )}
//             </s-stack>
//             <s-modal id={modalId} heading="Upcoming orders">
//               <s-stack direction="block" gap="base">
//                 {visibleCycles.map((cycle) => {
//                   const isThisLoading = loadingCycleIndex === cycle.cycleIndex;
//                   const isAnyLoading = loadingCycleIndex != null;
//                   return (
//                     <s-stack
//                       key={cycle.cycleIndex}
//                       direction="inline"
//                       gap="base"
//                       alignItems="center"
//                       justifyContent="space-between"
//                     >
//                       <s-stack
//                         direction="inline"
//                         gap="tight"
//                         alignItems="center"
//                       >
//                         <s-text>
//                           {formatShortWithYear(
//                             toDateOnlyString(cycle.billingAttemptExpectedDate),
//                           )}
//                         </s-text>

//                         {cycle.skipped && <s-badge tone="warning">Skipped</s-badge>}
//                       </s-stack>

//                       <s-stack direction="inline" gap="tight" alignItems="center">
//                         {!cycle.skipped &&
//                           (isAnyLoading ? (
//                             <s-text tone="subdued">Reschedule</s-text>
//                           ) : (
//                             <s-link
//                               onClick={() =>
//                                 handleReschedule(sub.id, cycle.cycleIndex)
//                               }
//                             >
//                               Reschedule
//                             </s-link>
//                           ))}

//                         {isThisLoading ? (

//                           <s-spinner size="small" />
//                         ) : cycle.skipped ? (
//                           isAnyLoading ? (
//                             <s-text tone="subdued">Unskip</s-text>
//                           ) : (
//                             <s-link
//                               onClick={() =>
//                                 handleUnskip(sub.id, cycle.cycleIndex)
//                               }
//                             >
//                               Unskip
//                             </s-link>
//                           )
//                         ) : isAnyLoading ? (
//                           <s-text tone="subdued">Skip</s-text>
//                         ) : (
//                           <s-link
//                             onClick={() => handleSkip(sub.id, cycle.cycleIndex)}
//                           >
//                             Skip
//                           </s-link>
//                         )}
//                       </s-stack>
//                     </s-stack>
//                   );
//                 })}
//               </s-stack>

//               <s-button
//                 variant="primary"
//                 command="--hide"
//                 commandFor={modalId}
//                 slot="primary-action"
//               >
//                 Close
//               </s-button>
//             </s-modal>
//           </s-box>

//           <s-box border="base" borderRadius="base" padding="base">
//             <s-stack direction="block" gap="tight">
//               <s-text fontWeight="bold">Delivery frequency</s-text>
//               <s-text tone="subdued">
//                 Delivery every {sub.deliveryPolicy?.intervalCount}{" "}
//                 {sub.deliveryPolicy?.interval?.toLowerCase()}
//               </s-text>

//               {address && (
//                 <>
//                   <s-text fontWeight="bold">Shipping address</s-text>
//                   <s-text tone="subdued">
//                     {address.name}
//                     {address.address1 ? `, ${address.address1}` : ""}
//                     {address.address2 ? `, ${address.address2}` : ""}
//                     {address.zip ?? ""}
//                     {address.city ? `, ${address.city}` : ""}
//                     {address.province ? `, ${address.province}` : ""}{" "}
                    
//                     {address.country ? `, ${address.country}` : ""}
//                   </s-text>
//                 </>
//               )}
//             </s-stack>
//           </s-box>

//           <s-box border="base" borderRadius="base" padding="base">
//             <s-stack direction="block" gap="base">
//               {items.map((item, i) => (
//                 <s-stack
//                   key={item.variantId ?? item.id ?? i}
//                   direction="inline"
//                   gap="tight"
//                   alignItems="center"
//                 >
//                   <s-box
//                     inlineSize="56px"
//                     blockSize="56px"
//                     borderRadius="base"
//                     overflow="hidden"
//                   >
//                     <s-image
//                       src={item.imageUrl}
//                       alt={item.title || "Product image"}
//                     />
//                   </s-box>
//                   <s-stack direction="block" gap="none">
//                     <s-text fontWeight="bold">{item.title}</s-text>
//                     {item.variantTitle &&
//                       item.variantTitle !== "Default Title" && (
//                         <s-text tone="subdued">{item.variantTitle}</s-text>
//                       )}
//                     <s-text tone="subdued">Qty {item.quantity}</s-text>
//                   </s-stack>
//                   <s-text>
//                     {item.itemTotal?.currencyCode} {item.itemTotal?.amount}
//                   </s-text>
//                 </s-stack>
//               ))}

//               {total && (
//                 <s-stack direction="block" gap="tight">
//                   <s-stack direction="inline" gap="tight">
//                     <s-text>Subtotal</s-text>
//                     <s-text>
//                       {total.currencyCode} {total.amount}
//                     </s-text>
//                   </s-stack>
//                   {shipping && (
//                     <s-stack direction="inline" gap="tight">
//                       <s-text>Shipping</s-text>
//                       <s-text>
//                         {shipping.calculatedPrice?.currencyCode}{" "}
//                         {shipping.calculatedPrice?.amount}
//                       </s-text>
//                     </s-stack>
//                   )}
//                   <s-stack direction="inline" gap="tight">
//                     <s-text fontWeight="bold">Total</s-text>
//                     <s-text fontWeight="bold">
//                       {total.currencyCode} {grandTotal}
//                     </s-text>
//                   </s-stack>
//                 </s-stack>
//               )}
//             </s-stack>
//           </s-box>
//         </s-stack>
//       </s-section>
//     </s-page>
//   );
// }


import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";

const API_BASE = "https://most-premiere-holidays-rounds.trycloudflare.com";
const PAGE_SIZE = 7;

export default async () => {
  render(<Extension />, document.body);
};

function getNumericId(gid) {
  if (!gid) return null;
  return gid.split("/").pop();
}

function parseSubscriptionIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/subscriptions\/([^/?#]+)/);
  return match ? match[1] : null;
}

function toDateOnlyString(value) {
  if (!value) return value;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.valueOf())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateOnlyToUTCDate(dateOnlyStr) {
  const [y, m, d] = dateOnlyStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatShort(dateOnlyStr) {
  if (!dateOnlyStr) return "-";
  return dateOnlyToUTCDate(dateOnlyStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
function formatShortWithYear(dateOnlyStr) {
  if (!dateOnlyStr) return "-";
  const d = dateOnlyToUTCDate(dateOnlyStr);
  const opts = { day: "numeric", month: "short", timeZone: "UTC" };
  if (d.getUTCFullYear() !== new Date().getUTCFullYear()) {
    opts.year = "numeric";
  }
  return d.toLocaleDateString("en-GB", opts);
}

function getNextActionableCycle(cycles) {
  return cycles.find((c) => !c.skipped && c.status !== "BILLED") ?? null;
}

const VISIBLE_CYCLES_LIMIT = 6;

function SkeletonCard() {
  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack direction="block" gap="tight">
        <s-box
          inlineSize="60px"
          blockSize="20px"
          borderRadius="base"
          background="subdued"
        />
        <s-stack direction="inline" gap="tight" alignItems="center">
          <s-box
            inlineSize="56px"
            blockSize="56px"
            borderRadius="base"
            background="subdued"
          />
          <s-box
            inlineSize="140px"
            blockSize="16px"
            borderRadius="base"
            background="subdued"
          />
        </s-stack>
        <s-box
          inlineSize="120px"
          blockSize="14px"
          borderRadius="base"
          background="subdued"
        />
        <s-box
          inlineSize="160px"
          blockSize="14px"
          borderRadius="base"
          background="subdued"
        />
      </s-stack>
    </s-box>
  );
}

function Extension() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const customerIdRef = useRef(null);

  const getCustomerId = useCallback(async () => {
    if (customerIdRef.current) return customerIdRef.current;

    let customerId = shopify.authenticatedAccount.customer.current?.id;

    if (!customerId) {
      customerId = await new Promise((resolve) => {
        const unsubscribe = shopify.authenticatedAccount.customer.subscribe(
          (customer) => {
            if (customer?.id) {
              unsubscribe();
              resolve(customer.id);
            }
          },
        );
      });
    }

    customerIdRef.current = customerId;
    return customerId;
  }, []);

  useEffect(() => {
    function syncFromEntry(entry) {
      const id = parseSubscriptionIdFromUrl(entry?.url);
      if (!id) {
        setSelectedSub(null);
        return;
      }

      const found = subscriptions.find((s) => getNumericId(s.id) === id);
      if (found) {
        setSelectedSub(found);
        return;
      }

      const stateSub = entry.getState?.();
      if (stateSub) {
        setSelectedSub(stateSub);
      }
    }

    syncFromEntry(shopify.navigation.currentEntry);

    function onChange() {
      syncFromEntry(shopify.navigation.currentEntry);
    }

    shopify.navigation.addEventListener("currententrychange", onChange);
    return () =>
      shopify.navigation.removeEventListener("currententrychange", onChange);
  }, [subscriptions]);

  const fetchPage = useCallback(
    async ({ afterCursor = null, reset = true } = {}) => {
      try {
        const customerId = await getCustomerId();

        if (!customerId) {
          setError("Customer ID not found");
          return null;
        }

        const token = await shopify.sessionToken.get();

        const params = new URLSearchParams({
          customerId,
          limit: String(PAGE_SIZE),
        });
        if (afterCursor) params.set("cursor", afterCursor);

        const res = await fetch(
          `${API_BASE}/api/subscriptions?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API ${res.status}: ${text}`);
        }

        const data = await res.json();
        const newSubs = data.subscriptions || [];
        const pageInfo = data.pageInfo || {
          hasNextPage: false,
          endCursor: null,
        };

        setSubscriptions((prev) => (reset ? newSubs : [...prev, ...newSubs]));
        setHasMore(!!pageInfo.hasNextPage);
        setCursor(pageInfo.endCursor || null);

        return reset ? newSubs : [...subscriptions, ...newSubs];
      } catch (err) {
        console.error("Failed to load subscriptions", err);
        setError(err.message);
        return null;
      }
    },
    [getCustomerId, subscriptions],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPage({ afterCursor: null, reset: true });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleViewMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPage({ afterCursor: cursor, reset: false });
    setLoadingMore(false);
  }

  function handleSelect(sub) {
    setSelectedSub(sub);
    const numericId = getNumericId(sub.id);
    try {
      shopify.navigation.navigate(`extension://subscriptions/${numericId}`, {
        history: "push",
        state: sub,
      });
    } catch (err) {
      console.error("navigation.navigate failed:", err);
    }
  }

  function handleBack() {
    setSelectedSub(null);
    try {
      shopify.navigation.navigate("extension:/", { history: "push" });
    } catch (err) {
      console.error("navigation.navigate failed:", err);
    }
  }

  const refreshSubscriptions = useCallback(async () => {
    const list = await fetchPage({ afterCursor: null, reset: true });
    const current = selectedSub;
    if (!current) return null;

    const updated = list?.find((s) => s.id === current.id);
    if (updated) {
      setSelectedSub(updated);
      try {
        shopify.navigation.navigate(shopify.navigation.currentEntry.url, {
          history: "replace",
          state: updated,
        });
      } catch (err) {
        console.error("navigation state sync failed:", err);
      }
      return updated;
    }
    return null;
  }, [fetchPage, selectedSub]);

  if (error) {
    return (
      <s-page heading="Subscriptions">
        <s-section>
          <s-text tone="critical">Error: {error}</s-text>
        </s-section>
      </s-page>
    );
  }

  if (selectedSub) {
    return (
      <SubscriptionDetail
        key={getNumericId(selectedSub.id)}
        sub={selectedSub}
        onBack={handleBack}
        refreshSubscriptions={refreshSubscriptions}
        getCustomerId={getCustomerId}
      />
    );
  }

  return (
    <s-page heading="Subscriptions">
      <s-section>
        {loading ? (
          <s-stack direction="block" gap="base">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </s-stack>
        ) : subscriptions.length === 0 ? (
          <s-text>No subscriptions.....</s-text>
        ) : (
          <s-stack direction="block" gap="base">
            {subscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onClick={() => handleSelect(sub)}
              />
            ))}

            {loadingMore &&
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <SkeletonCard key={`more-${i}`} />
              ))}

            {hasMore && !loadingMore && (
              <s-button variant="secondary" onClick={handleViewMore}>
                View more
              </s-button>
            )}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

function SubscriptionCard({ sub, onClick }) {
  const line = sub.displayLine || sub.lines?.edges?.[0]?.node;
  const imageUrl = line?.imageUrl || null;

  return (
    <s-box border="base" borderRadius="base" padding="base">
      <s-stack direction="block" gap="tight">
        <s-badge
          tone={
            sub.status === "ACTIVE"
              ? "success"
              : sub.status === "PAUSED"
                ? "warning"
                : "neutral"
          }
        >
          {sub.status}
        </s-badge>
        <s-stack direction="inline" gap="tight" alignItems="center">
          <s-box
            inlineSize="56px"
            blockSize="56px"
            borderRadius="base"
            overflow="hidden"
          >
            <s-image src={imageUrl} alt={line?.title || "Product image"} />
          </s-box>
          <s-text fontWeight="bold">{line?.title ?? "Subscription"}</s-text>
        </s-stack>
        <s-text tone="subdued">
          Next order: {formatShort(toDateOnlyString(sub.nextBillingDate))}
        </s-text>
        <s-text tone="subdued">
          Delivery every {sub.deliveryPolicy?.intervalCount}{" "}
          {sub.deliveryPolicy?.interval?.toLowerCase()}
        </s-text>
        <s-button variant="secondary" onClick={onClick}>
          View details
        </s-button>
      </s-stack>
    </s-box>
  );
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

function SubscriptionDetail({ sub, onBack, refreshSubscriptions, getCustomerId }) {
  const [upcomingCycles, setUpcomingCycles] = useState(
    sub.upcomingCycles ?? [],
  );
  const [nextBillingDate, setNextBillingDate] = useState(sub.nextBillingDate);
  const [hasMoreCycles, setHasMoreCycles] = useState(sub.hasMoreCycles ?? false);

  const [loadingCycleIndex, setLoadingCycleIndex] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  const [address, setAddress] = useState(sub.deliveryMethod?.address ?? null);

  const [addressForm, setAddressForm] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "India",
    phone: "",
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState(null);

  useEffect(() => {
    setUpcomingCycles(sub.upcomingCycles ?? []);
    setNextBillingDate(sub.nextBillingDate);
    setHasMoreCycles(sub.hasMoreCycles ?? false);
    setAddress(sub.deliveryMethod?.address ?? null);
  }, [sub]);

  function applyCycleUpdate(cycleIndex, patch) {
    setUpcomingCycles((prev) => {
      const updated = prev.map((c) =>
        c.cycleIndex === cycleIndex ? { ...c, ...patch } : c,
      );

      const visible = updated.slice(0, VISIBLE_CYCLES_LIMIT);
      const next = getNextActionableCycle(visible);
      if (next) {
        setNextBillingDate(next.billingAttemptExpectedDate);
      } else {
        const beyond = updated
          .slice(VISIBLE_CYCLES_LIMIT)
          .find((c) => !c.skipped && c.status !== "BILLED");
        setNextBillingDate(beyond ? beyond.billingAttemptExpectedDate : null);
      }

      return updated;
    });
  }

  async function handleSkip(contractId, cycleIndex) {
    if (cycleIndex == null || loadingCycleIndex != null) return;
    try {
      setLoadingCycleIndex(cycleIndex);
      setLoadingAction("skip");

      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/skip`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractId, cycleIndex }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Skip failed");
      }

      applyCycleUpdate(cycleIndex, { skipped: true });
      shopify.toast.show("Order skipped");

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after skip failed:", err),
      );
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message);
    } finally {
      setLoadingCycleIndex(null);
      setLoadingAction(null);
    }
  }

  async function handleUnskip(contractId, cycleIndex) {
    if (cycleIndex == null || loadingCycleIndex != null) return;
    try {
      setLoadingCycleIndex(cycleIndex);
      setLoadingAction("unskip");

      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/unskip`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractId, cycleIndex }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unskip failed");
      }

      applyCycleUpdate(cycleIndex, { skipped: false });
      shopify.toast.show("Order un-skipped");

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after unskip failed:", err),
      );
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message);
    } finally {
      setLoadingCycleIndex(null);
      setLoadingAction(null);
    }
  }

  function handleReschedule(contractId, cycleIndex) {
    console.log("TODO: implement reschedule for", contractId, cycleIndex);
  }

  function splitName(fullName) {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.trim().split(" ");
    return {
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
    };
  }

  function openAddressModal() {
    const a = address ?? {};
    const { firstName, lastName } = splitName(a.name);
    setAddressForm({
      firstName,
      lastName,
      address1: a.address1 || "",
      address2: a.address2 || "",
      city: a.city || "",
      province: a.province || "",
      zip: a.zip || "",
      country: a.country || "India",
      phone: a.phone || "",
    });
    setAddressError(null);
    shopify.modal?.show?.(`edit-address-modal-${numericId}`);
  }

  async function handleSaveAddress() {
    if (!addressForm.address1 || !addressForm.city || !addressForm.country) {
      setAddressError("Address, city aur country zaroori hain");
      return;
    }
    try {
      setAddressSaving(true);
      setAddressError(null);

      const token = await shopify.sessionToken.get();
      const customerId = await getCustomerId();

      const res = await fetch(
        `${API_BASE}/api/subscriptions/update-address`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId: sub.id,
            customerId,
            address: addressForm,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Address update failed");
      }

      setAddress({
        name: `${addressForm.firstName} ${addressForm.lastName}`.trim(),
        address1: addressForm.address1,
        address2: addressForm.address2,
        city: addressForm.city,
        province: addressForm.province,
        zip: addressForm.zip,
        country: addressForm.country,
        phone: addressForm.phone,
      });

      shopify.toast.show("Address updated");
      shopify.modal?.hide?.(`edit-address-modal-${numericId}`);

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after address update failed:", err),
      );
    } catch (err) {
      console.error(err);
      setAddressError(err.message);
    } finally {
      setAddressSaving(false);
    }
  }

  const items = sub.nextOrderLineItems?.length
    ? sub.nextOrderLineItems
    : (sub.lines?.edges?.map((e) => e.node) ?? []);

  const total = sub.nextOrderTotal;
  const shipping = sub.nextOrderShipping;
  const grandTotal =
    total != null
      ? (
          Number(total.amount) + Number(shipping?.calculatedPrice?.amount ?? 0)
        ).toFixed(2)
      : null;

  const numericId = getNumericId(sub.id);
  const modalId = `upcoming-orders-modal-${numericId}`;
  const addressModalId = `edit-address-modal-${numericId}`;
  const cycles = upcomingCycles;

  const visibleCycles = cycles.slice(0, VISIBLE_CYCLES_LIMIT);

  const nextActionable = getNextActionableCycle(visibleCycles);

  const maxSkipReached =
    visibleCycles.length === VISIBLE_CYCLES_LIMIT && !nextActionable;

  return (
    <s-page heading="Manage subscription">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="tight" alignItems="center">
            <s-button variant="tertiary" onClick={onBack}>
              ← Back
            </s-button>
          </s-stack>

          <s-badge
            tone={
              sub.status === "ACTIVE"
                ? "success"
                : sub.status === "PAUSED"
                  ? "warning"
                  : "neutral"
            }
          >
            Status: {sub.status}
          </s-badge>

          <s-box border="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="base">
              <s-stack direction="block" gap="tight">
                <s-text fontWeight="bold">Upcoming order</s-text>
                {nextBillingDate ? (
                  <s-text tone="subdued">
                    {formatShort(toDateOnlyString(nextBillingDate))}
                  </s-text>
                ) : (
                  <s-text tone="subdued">-</s-text>
                )}
              </s-stack>

              <s-stack direction="inline" gap="tight">
                <s-button
                  variant="secondary"
                  disabled={!nextActionable || loadingCycleIndex != null}
                  onClick={() =>
                    nextActionable &&
                    handleSkip(sub.id, nextActionable.cycleIndex)
                  }
                >
                  {loadingAction === "skip" &&
                  loadingCycleIndex === nextActionable?.cycleIndex ? (
                    <s-spinner size="small" />
                  ) : (
                    "Skip"
                  )}
                </s-button>
              </s-stack>

              {visibleCycles.length > 0 && (
                <s-link command="--show" commandFor={modalId}>
                  Show upcoming orders
                </s-link>
              )}

              {maxSkipReached && (
                <s-text tone="subdued">
                  The maximum number of orders have been skipped
                </s-text>
              )}
            </s-stack>

            <s-modal id={modalId} heading="Upcoming orders">
              <s-stack direction="block" gap="base">
                {visibleCycles.map((cycle) => {
                  const isThisLoading = loadingCycleIndex === cycle.cycleIndex;
                  const isAnyLoading = loadingCycleIndex != null;
                  return (
                    <s-stack
                      key={cycle.cycleIndex}
                      direction="inline"
                      gap="base"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <s-stack
                        direction="inline"
                        gap="tight"
                        alignItems="center"
                      >
                        <s-text>
                          {formatShortWithYear(
                            toDateOnlyString(cycle.billingAttemptExpectedDate),
                          )}
                        </s-text>

                        {cycle.skipped && <s-badge tone="warning">Skipped</s-badge>}
                      </s-stack>

                      <s-stack direction="inline" gap="tight" alignItems="center">
                        {!cycle.skipped &&
                          (isAnyLoading ? (
                            <s-text tone="subdued">Reschedule</s-text>
                          ) : (
                            <s-link
                              onClick={() =>
                                handleReschedule(sub.id, cycle.cycleIndex)
                              }
                            >
                              Reschedule
                            </s-link>
                          ))}

                        {isThisLoading ? (
                          <s-spinner size="small" />
                        ) : cycle.skipped ? (
                          isAnyLoading ? (
                            <s-text tone="subdued">Unskip</s-text>
                          ) : (
                            <s-link
                              onClick={() =>
                                handleUnskip(sub.id, cycle.cycleIndex)
                              }
                            >
                              Unskip
                            </s-link>
                          )
                        ) : isAnyLoading ? (
                          <s-text tone="subdued">Skip</s-text>
                        ) : (
                          <s-link
                            onClick={() => handleSkip(sub.id, cycle.cycleIndex)}
                          >
                            Skip
                          </s-link>
                        )}
                      </s-stack>
                    </s-stack>
                  );
                })}
              </s-stack>

              <s-button
                variant="primary"
                command="--hide"
                commandFor={modalId}
                slot="primary-action"
              >
                Close
              </s-button>
            </s-modal>
          </s-box>

          <s-box border="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">Delivery frequency</s-text>
              <s-text tone="subdued">
                Delivery every {sub.deliveryPolicy?.intervalCount}{" "}
                {sub.deliveryPolicy?.interval?.toLowerCase()}
              </s-text>

              {address && (
                <>
                  <s-text fontWeight="bold">Shipping address</s-text>
                  <s-text tone="subdued">
                    {address.name}
                    {address.address1 ? `, ${address.address1}` : ""}
                    {address.address2 ? `, ${address.address2}` : ""}
                    {address.city ? `, ${address.city}` : ""}
                    {address.province ? `, ${address.province}` : ""}{" "}
                    {address.zip ?? ""}
                    {address.country ? `, ${address.country}` : ""}
                  </s-text>
                  <s-link command="--show" commandFor={addressModalId} onClick={openAddressModal}>
                    Change address
                  </s-link>
                </>
              )}
            </s-stack>

            <s-modal id={addressModalId} heading="Edit shipping address">
              <s-stack direction="block" gap="base">
                {addressError && (
                  <s-text tone="critical">{addressError}</s-text>
                )}

                <s-select
                  label="Country/region"
                  value={addressForm.country}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, country: e.target.value })
                  }
                >
                  <s-option value="India">India</s-option>
                </s-select>

                <s-stack direction="inline" gap="base">
                  <s-text-field
                    label="First name"
                    value={addressForm.firstName}
                    onInput={(e) =>
                      setAddressForm({
                        ...addressForm,
                        firstName: e.target.value,
                      })
                    }
                  />
                  <s-text-field
                    label="Last name"
                    value={addressForm.lastName}
                    onInput={(e) =>
                      setAddressForm({
                        ...addressForm,
                        lastName: e.target.value,
                      })
                    }
                  />
                </s-stack>

                <s-text-field
                  label="Address"
                  value={addressForm.address1}
                  onInput={(e) =>
                    setAddressForm({ ...addressForm, address1: e.target.value })
                  }
                />
                <s-text-field
                  label="Apartment, suite, etc (optional)"
                  value={addressForm.address2}
                  onInput={(e) =>
                    setAddressForm({ ...addressForm, address2: e.target.value })
                  }
                />

                <s-stack direction="inline" gap="base">
                  <s-text-field
                    label="City"
                    value={addressForm.city}
                    onInput={(e) =>
                      setAddressForm({ ...addressForm, city: e.target.value })
                    }
                  />
                  <s-select
                    label="State"
                    value={addressForm.province}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        province: e.target.value,
                      })
                    }
                  >
                    <s-option value="">Select state</s-option>
                    {INDIAN_STATES.map((state) => (
                      <s-option key={state} value={state}>
                        {state}
                      </s-option>
                    ))}
                  </s-select>
                  <s-text-field
                    label="PIN code"
                    value={addressForm.zip}
                    onInput={(e) =>
                      setAddressForm({ ...addressForm, zip: e.target.value })
                    }
                  />
                </s-stack>

                <s-box
                  border="base"
                  borderRadius="base"
                  padding="tight"
                >
                  <s-stack
                    direction="inline"
                    gap="tight"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <s-stack direction="block" gap="none">
                      <s-text tone="subdued" fontSize="small">
                        Phone
                      </s-text>
                      <s-text-field
                        value={addressForm.phone}
                        placeholder="+91"
                        onInput={(e) =>
                          setAddressForm({
                            ...addressForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </s-stack>
                    <s-stack
                      direction="inline"
                      gap="extra-tight"
                      alignItems="center"
                    >
                      <s-text>🇮🇳</s-text>
                      <s-text tone="subdued">▾</s-text>
                    </s-stack>
                  </s-stack>
                </s-box>
              </s-stack>

              <s-button
                slot="primary-action"
                variant="primary"
                disabled={addressSaving}
                onClick={handleSaveAddress}
              >
                {addressSaving ? <s-spinner size="small" /> : "Continue"}
              </s-button>
              <s-button
                slot="secondary-actions"
                command="--hide"
                commandFor={addressModalId}
                disabled={addressSaving}
              >
                Cancel
              </s-button>
            </s-modal>
          </s-box>

          <s-box border="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="base">
              {items.map((item, i) => (
                <s-stack
                  key={item.variantId ?? item.id ?? i}
                  direction="inline"
                  gap="tight"
                  alignItems="center"
                >
                  <s-box
                    inlineSize="56px"
                    blockSize="56px"
                    borderRadius="base"
                    overflow="hidden"
                  >
                    <s-image
                      src={item.imageUrl}
                      alt={item.title || "Product image"}
                    />
                  </s-box>
                  <s-stack direction="block" gap="none">
                    <s-text fontWeight="bold">{item.title}</s-text>
                    {item.variantTitle &&
                      item.variantTitle !== "Default Title" && (
                        <s-text tone="subdued">{item.variantTitle}</s-text>
                      )}
                    <s-text tone="subdued">Qty {item.quantity}</s-text>
                  </s-stack>
                  <s-text>
                    {item.itemTotal?.currencyCode} {item.itemTotal?.amount}
                  </s-text>
                </s-stack>
              ))}

              {total && (
                <s-stack direction="block" gap="tight">
                  <s-stack direction="inline" gap="tight">
                    <s-text>Subtotal</s-text>
                    <s-text>
                      {total.currencyCode} {total.amount}
                    </s-text>
                  </s-stack>
                  {shipping && (
                    <s-stack direction="inline" gap="tight">
                      <s-text>Shipping</s-text>
                      <s-text>
                        {shipping.calculatedPrice?.currencyCode}{" "}
                        {shipping.calculatedPrice?.amount}
                      </s-text>
                    </s-stack>
                  )}
                  <s-stack direction="inline" gap="tight">
                    <s-text fontWeight="bold">Total</s-text>
                    <s-text fontWeight="bold">
                      {total.currencyCode} {grandTotal}
                    </s-text>
                  </s-stack>
                </s-stack>
              )}
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}