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

//   // Route sync: URL se ID nikaal ke, ya to navigate() ke saath pass ki hui state se,
//   // ya subscriptions list me match karke selectedSub set karta hai.
//   // Ye back/forward button aur direct-URL open dono handle karta hai.
//   useEffect(() => {
//     function syncFromEntry(entry) {
//       const id = parseSubscriptionIdFromUrl(entry?.url);
//       if (!id) {
//         setSelectedSub(null);
//         return;
//       }
//       const stateSub = entry.getState?.();
//       if (stateSub) {
//         setSelectedSub(stateSub);
//         return;
//       }
//       const found = subscriptions.find((s) => getNumericId(s.id) === id);
//       if (found) setSelectedSub(found);
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
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   async function handleViewMore() {
//     if (!hasMore || loadingMore) return;
//     setLoadingMore(true);
//     await fetchPage({ afterCursor: cursor, reset: false });
//     setLoadingMore(false);
//   }

//   // setSelectedSub PEHLE call karo — turant view switch. Fir navigate() jo browser URL
//   // ko "/subscriptions/{id}" banata hai. navigate() try/catch me hai taaki state
//   // serialize fail hone par bhi UI switch hone se na ruke.
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
//     return <SubscriptionDetail sub={selectedSub} onBack={handleBack}
//      refreshSubscriptions={async () => {
//     const list = await fetchPage({ afterCursor: null, reset: true });
//     const updated = list?.find((s) => s.id === selectedSub.id);
//     if (updated) {
//       setSelectedSub(updated);
//     }
//   }}
//     />;
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
//   // List me sirf PEHLA product dikhana hai (displayLine agar backend se aaya hai,
//   // warna fallback contract ki base line)
//   const line = sub.displayLine || sub.lines?.edges?.[0]?.node;
//   const imageUrl = line?.imageUrl || null;

//   // NOTE: s-box onClick support nahi karta (ye sirf layout container hai).
//   // Click ke liye actual interactive component (s-button) chahiye.
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

// function SubscriptionDetail({ sub, onBack,refreshSubscriptions  }) {
//   const [upcomingCycles, setUpcomingCycles] = useState(
//   sub.upcomingCycles ?? []
// );

// const [nextBillingDate, setNextBillingDate] = useState(
//   sub.nextBillingDate
// );

// const [skipLoading, setSkipLoading] = useState(false);
// async function handleSkip(contractId, cycleIndex) {
//   try {
//     setSkipLoading(true);

//     const token = await shopify.sessionToken.get();

//     const res = await fetch(`${API_BASE}/api/subscriptions/skip`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         contractId,
//         cycleIndex,
//       }),
//     });

//     const data = await res.json();

//     if (!res.ok || !data.success) {
//       throw new Error(data.error || "Skip failed");
//     }

//     const updatedCycles = upcomingCycles.map((c) =>
//   c.cycleIndex === cycleIndex
//     ? { ...c, skipped: true }
//     : c
// );

// setUpcomingCycles(updatedCycles);

// // Next order = first non-skipped cycle
// const nextCycle = updatedCycles.find(
//   (c) => !c.skipped && c.status !== "BILLED"
// );

// if (nextCycle) {
//   setNextBillingDate(nextCycle.billingAttemptExpectedDate);
// }

// await refreshSubscriptions();


//     shopify.toast.show("Order skipped");
//   } catch (err) {
//     console.error(err);
//     shopify.toast.show(err.message);
//   } finally {
//     setSkipLoading(false);
//   }
// }
//   const items = sub.nextOrderLineItems?.length
//     ? sub.nextOrderLineItems
//     : (sub.lines?.edges?.map((e) => e.node) ?? []);

//   const address = sub.deliveryMethod?.address ?? null;
//   console.log("sddjfjdfjdfjj",address)
//   const total = sub.nextOrderTotal;
//   const shipping = sub.nextOrderShipping;
//   const grandTotal =
//     total != null
//       ? (
//           Number(total.amount) + Number(shipping?.calculatedPrice?.amount ?? 0)
//         ).toFixed(2)
//       : null;

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
//           {(() => {
//             const numericId = getNumericId(sub.id);
//             const modalId = `upcoming-orders-modal-${numericId}`;
//             // const cycles = sub.upcomingCycles ?? [];
//             const cycles = upcomingCycles;

//             return (
//               <s-box border="base" borderRadius="base" padding="base">
//                 <s-stack direction="block" gap="base">
//                   <s-stack direction="block" gap="tight">
//                     <s-text fontWeight="bold">Upcoming order</s-text>
//                     <s-text tone="subdued">
//                       {/* {formatShort(toDateOnlyString(sub.nextBillingDate))} */}
//                       {formatShort(toDateOnlyString(nextBillingDate))}
//                     </s-text>
//                   </s-stack>

//                   <s-stack direction="inline" gap="tight">
//                     <s-button
//   variant="secondary"
//   disabled={!cycles.length || skipLoading}
//   onClick={() => handleSkip(sub.id, cycles[0].cycleIndex)}
// >
//   {skipLoading ? "Skipping..." : "Skip"}
// </s-button>
                    
//                   </s-stack>

//                   {cycles.length > 0 && (
//                     <s-link command="--show" commandFor={modalId}>
//                       Show upcoming orders
//                     </s-link>
//                   )}
//                 </s-stack>

//                 {/* Upcoming orders modal */}
//                 <s-modal id={modalId} heading="Upcoming orders">
//                   <s-stack direction="block" gap="base">
//                     {cycles.map((cycle) => (
//                       <s-stack
//                         key={cycle.cycleIndex}
//                         direction="inline"
//                         gap="base"
//                         alignItems="center"
//                         justifyContent="space-between"
//                       >
//                         <s-stack direction="inline" gap="tight" alignItems="center">
//   <s-text>
//     {formatShortWithYear(
//       toDateOnlyString(cycle.billingAttemptExpectedDate)
//     )}
//   </s-text>

//   {cycle.skipped && (
//     <s-badge tone="warning">
//       Skipped
//     </s-badge>
//   )}
// </s-stack>
//                         <s-stack direction="inline" gap="20">
//                           <s-link
//                             onClick={() =>
//                               handleReschedule(sub.id, cycle.cycleIndex)
//                             }
//                           >
//                             Reschedule
//                           </s-link>
//                      {!cycle.skipped && (
//   <s-link
//     disabled={skipLoading}
//     onClick={() => handleSkip(sub.id, cycle.cycleIndex)}
//   >
//     {skipLoading ? "Skipping..." : "Skip"}
//   </s-link>
// )}
//                         </s-stack>
//                       </s-stack>
//                     ))}
//                   </s-stack>

//                   <s-button
//                     variant="primary"
//                     command="--hide"
//                     commandFor={modalId}
//                     slot="primary-action"
//                   >
//                     Close
//                   </s-button>
//                 </s-modal>
//               </s-box>
//             );
//           })()}

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
//                     {address.city ? `, ${address.city}` : ""}
//                     {address.province
//                       ? `, ${address.province}`
//                       : ""}{" "}
//                     {address.zip ?? ""}
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

// Cycles array me se pehla aisa cycle jo skip nahi hua aur bill bhi nahi hua —
// yahi hamesha "next order" / quick-skip button ka target hona chahiye.
// cycles[0] hardcode karna hi original bug tha (already-skipped cycle ko
// baar baar target karta tha).
function getNextActionableCycle(cycles) {
  return cycles.find((c) => !c.skipped && c.status !== "BILLED") ?? null;
}

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

  // Route sync: URL se ID nikaal ke subscriptions me match karke selectedSub
  // set karta hai. IMPORTANT: fresh `subscriptions` list ko hamesha priority
  // di jaati hai — history state (`entry.getState()`) sirf fallback hai
  // (jab list abhi load hi na hui ho). Pehle iska ulta tha, isliye skip/unskip
  // ke baad reload/back-forward par purana (stale) snapshot wapas dikh jaata tha.
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

  // Server se fresh data laata hai AUR navigation history state ko bhi
  // replace karta hai — warna agla back/forward navigation phir se purana
  // (skip/unskip se pehle wala) snapshot utha lega.
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
        // key = subscription id: jab tum ek subscription se doosre subscription
        // par jaate ho tab component fresh mount hoga (local upcomingCycles state
        // sahi se re-init hoga). Same subscription ke andar refresh hone par
        // (skip/unskip) key nahi badalta, isliye optimistic UI bina flicker/reset
        // ke bani rehti hai.
        key={getNumericId(selectedSub.id)}
        sub={selectedSub}
        onBack={handleBack}
        refreshSubscriptions={refreshSubscriptions}
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

function SubscriptionDetail({ sub, onBack, refreshSubscriptions }) {
  const [upcomingCycles, setUpcomingCycles] = useState(
    sub.upcomingCycles ?? [],
  );
  const [nextBillingDate, setNextBillingDate] = useState(sub.nextBillingDate);

  // Boolean ki jagah cycleIndex store karte hain — taaki sirf wahi button/link
  // disable ho jise user ne click kiya hai, baaki sab usable rahe.
  const [loadingCycleIndex, setLoadingCycleIndex] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null); // "skip" | "unskip"

  function applyCycleUpdate(cycleIndex, patch) {
    setUpcomingCycles((prev) => {
      const updated = prev.map((c) =>
        c.cycleIndex === cycleIndex ? { ...c, ...patch } : c,
      );
      const next = getNextActionableCycle(updated);
      if (next) {
        setNextBillingDate(next.billingAttemptExpectedDate);
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
      await refreshSubscriptions();
      shopify.toast.show("Order skipped");
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
      await refreshSubscriptions();
      shopify.toast.show("Order un-skipped");
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message);
    } finally {
      setLoadingCycleIndex(null);
      setLoadingAction(null);
    }
  }

  // Reschedule abhi implement nahi hai — placeholder taaki click par crash na ho.
  function handleReschedule(contractId, cycleIndex) {
    console.log("TODO: implement reschedule for", contractId, cycleIndex);
  }

  const items = sub.nextOrderLineItems?.length
    ? sub.nextOrderLineItems
    : (sub.lines?.edges?.map((e) => e.node) ?? []);

  const address = sub.deliveryMethod?.address ?? null;
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
  const cycles = upcomingCycles;
  // Quick "Skip" button hamesha isi cycle ko target karega — pehla cycle jo
  // abhi tak skip nahi hua. Yehi wo fix hai jo "sirf pehli date skip hoti hai"
  // wale bug ko theek karta hai (pehle hardcoded cycles[0] use hota tha).
  const nextActionable = getNextActionableCycle(cycles);

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
                <s-text tone="subdued">
                  {formatShort(toDateOnlyString(nextBillingDate))}
                </s-text>
              </s-stack>

              <s-stack direction="inline" gap="tight">
                <s-button
                  variant="secondary"
                  disabled={
                    !nextActionable ||
                    (loadingCycleIndex != null &&
                      loadingCycleIndex === nextActionable?.cycleIndex)
                  }
                  onClick={() =>
                    nextActionable &&
                    handleSkip(sub.id, nextActionable.cycleIndex)
                  }
                >
                  {loadingAction === "skip" &&
                  loadingCycleIndex === nextActionable?.cycleIndex
                    ? "Skipping..."
                    : "Skip"}
                </s-button>
              </s-stack>

              {cycles.length > 0 && (
                <s-link command="--show" commandFor={modalId}>
                  Show upcoming orders
                </s-link>
              )}
            </s-stack>

            {/* Upcoming orders modal */}
            <s-modal id={modalId} heading="Upcoming orders">
              <s-stack direction="block" gap="base">
                {cycles.map((cycle) => {
                  const isThisLoading = loadingCycleIndex === cycle.cycleIndex;
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

                      <s-stack direction="inline" gap="20">
                        {!cycle.skipped && (
                          <s-link
                            disabled={loadingCycleIndex != null}
                            onClick={() =>
                              handleReschedule(sub.id, cycle.cycleIndex)
                            }
                          >
                            Reschedule
                          </s-link>
                        )}

                        {cycle.skipped ? (
                          <s-link
                            disabled={loadingCycleIndex != null}
                            onClick={() => handleUnskip(sub.id, cycle.cycleIndex)}
                          >
                            {isThisLoading && loadingAction === "unskip"
                              ? "Unskipping..."
                              : "Unskip"}
                          </s-link>
                        ) : (
                          <s-link
                            disabled={loadingCycleIndex != null}
                            onClick={() => handleSkip(sub.id, cycle.cycleIndex)}
                          >
                            {isThisLoading && loadingAction === "skip"
                              ? "Skipping..."
                              : "Skip"}
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
                </>
              )}
            </s-stack>
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