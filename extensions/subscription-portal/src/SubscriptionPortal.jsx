import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { hideModalById, showModalById } from "./Modalutils";
const API_BASE = "https://mainstream-marcus-gotta-app.trycloudflare.com";
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

function addIntervalToDateOnly(dateOnlyStr, interval, count) {
  const [y, m, d] = dateOnlyStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  switch (interval) {
    case "DAY":
      dt.setUTCDate(dt.getUTCDate() + count);
      break;
    case "WEEK":
      dt.setUTCDate(dt.getUTCDate() + count * 7);
      break;
    case "MONTH":
      dt.setUTCMonth(dt.getUTCMonth() + count);
      break;
    case "YEAR":
      dt.setUTCFullYear(dt.getUTCFullYear() + count);
      break;
    default:
      dt.setUTCDate(dt.getUTCDate() + 7);
  }

  return toDateOnlyString(dt);
}

function formatShort(dateOnlyStr) {
  return dateOnlyToUTCDate(dateOnlyStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
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
  const [loading, setLoading] = useState(true); // initial full-page load
  const [loadingMore, setLoadingMore] = useState(false); // "View more" click load
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  // pagination state
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
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
        setSelected(null);
        return;
      }
      const stateSub = entry.getState?.();
      if (stateSub) {
        setSelected(stateSub);
        return;
      }
      const found = subscriptions.find((s) => getNumericId(s.id) === id);
      if (found) setSelected(found);
    }

    syncFromEntry(shopify.navigation.currentEntry);

    function onChange() {
      syncFromEntry(shopify.navigation.currentEntry);
    }

    shopify.navigation.addEventListener("currententrychange", onChange);
    return () =>
      shopify.navigation.removeEventListener("currententrychange", onChange);
  }, [subscriptions]);

  // fetchPage: reset=true => replace list (page 1). reset=false => append (next page)
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

  // initial load
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

  // Refetch first page only (used after reschedule/cancel/pause/resume to refresh currently-loaded subscription)
  const refreshFirstPage = useCallback(async () => {
    return fetchPage({ afterCursor: null, reset: true });
  }, [fetchPage]);
  function handleSelect(sub) {
    const numericId = getNumericId(sub.id);
    shopify.navigation.navigate(`extension://subscriptions/${numericId}`, {
      history: "push",
      state: sub,
    });
    setSelected(sub);
  }
  if (error) {
    return (
      <s-page heading="Subscriptions">
        <s-section>
          <s-text tone="critical">Error: {error}</s-text>
        </s-section>
      </s-page>
    );
  }

  async function handleSubscriptionRescheduled(
    subscriptionId,
    nextBillingDate,
  ) {
    console.log("handleSubscriptionRescheduled called", {
      subscriptionId,
      nextBillingDate,
    });
    const updatedSubscriptions = (await refreshFirstPage()) || [];
    const updated = updatedSubscriptions.find(
      (sub) => sub.id === subscriptionId,
    );
    console.log("handleSubscriptionRescheduled fetched subscriptions", {
      updated,
      updatedSubscriptionsCount: updatedSubscriptions.length,
    });
    if (updated) {
      const updatedWithDate = nextBillingDate
        ? { ...updated, nextBillingDate }
        : updated;
      setSelected(updatedWithDate);
      setSubscriptions((prev) =>
        prev.map((sub) => (sub.id === subscriptionId ? updatedWithDate : sub)),
      );
      return;
    }

    if (nextBillingDate) {
      console.log(
        "handleSubscriptionRescheduled fallback update nextBillingDate",
        nextBillingDate,
      );
      setSelected((prev) =>
        prev?.id === subscriptionId ? { ...prev, nextBillingDate } : prev,
      );
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === subscriptionId ? { ...sub, nextBillingDate } : sub,
        ),
      );
    }
  }

  // NEW: called after pause/resume succeeds — updates status everywhere
  function handleSubscriptionStatusChanged(subscriptionId, newStatus) {
    setSelected((prev) =>
      prev?.id === subscriptionId ? { ...prev, status: newStatus } : prev,
    );
    setSubscriptions((prev) =>
      prev.map((sub) =>
        sub.id === subscriptionId ? { ...sub, status: newStatus } : sub,
      ),
    );
  }

  if (selected) {
    return (
      <SubscriptionDetail
        subscription={selected}
        onRescheduled={handleSubscriptionRescheduled}
        onStatusChanged={handleSubscriptionStatusChanged}
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

function getLineImageUrl(line) {
  return line?.imageUrl || null;
}

function SubscriptionCard({ sub, onClick }) {
  const line = sub.lines?.edges?.[0]?.node;
  const imageUrl = getLineImageUrl(line);

  return (
    <s-clickable onClick={onClick}>
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
        </s-stack>
      </s-box>
    </s-clickable>
  );
}

function SubscriptionDetail({
  subscription,
  onRescheduled,
  onStatusChanged,
}) {
  function handleBack() {
    shopify.navigation.navigate("extension:/", {
      history: "push",
    });

  }
  const lines = subscription.lines?.edges?.map((e) => e.node) ?? [];
  const shippingTitle = subscription.deliveryMethod?.shippingOption?.title;
  const isCancelled = subscription.status === "CANCELLED";
  const canCancel =
    subscription.minPaymentsRequired == null ||
    subscription.paymentsCompleted >= subscription.minPaymentsRequired;
  const [rescheduleDate, setRescheduleDate] = useState(
    toDateOnlyString(subscription.nextBillingDate),
  );
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);
  const [rescheduled, setRescheduled] = useState(false);
  const [rescheduleAdjustedNote, setRescheduleAdjustedNote] = useState(null);

  // NEW: pause/resume state
  const [isPausing, setIsPausing] = useState(false);
  const [pauseError, setPauseError] = useState(null);

  const previousSubscriptionRef = useRef({
    id: subscription.id,
    nextBillingDate: subscription.nextBillingDate,
  });

  useEffect(() => {
    if (
      previousSubscriptionRef.current.id !== subscription.id ||
      previousSubscriptionRef.current.nextBillingDate !==
        subscription.nextBillingDate
    ) {
      setRescheduleDate(toDateOnlyString(subscription.nextBillingDate));
      setTargetCycleIndex(subscription.nextBillingCycleIndex ?? null);
      setRescheduled(false);
      setRescheduleError(null);
      previousSubscriptionRef.current = {
        id: subscription.id,
        nextBillingDate: subscription.nextBillingDate,
      };
    }
  }, [subscription]);

  function computeUpcomingDates() {
    if (
      Array.isArray(subscription.upcomingCycles) &&
      subscription.upcomingCycles.length > 0
    ) {
      return subscription.upcomingCycles
        .filter((c) => !c.skipped)
        .map((c) => ({
          dateOnly: toDateOnlyString(c.billingAttemptExpectedDate),
          cycleIndex: c.cycleIndex,
        }));
    }

    const dates = [];
    const interval = subscription.deliveryPolicy?.interval;
    const count = subscription.deliveryPolicy?.intervalCount ?? 1;
    let current = toDateOnlyString(subscription.nextBillingDate);

    for (let i = 0; i < 4; i++) {
      dates.push({ dateOnly: current, cycleIndex: null });
      current = addIntervalToDateOnly(current, interval, count);
    }
    return dates;
  }

  const upcomingDates = computeUpcomingDates();

  const [targetCycleIndex, setTargetCycleIndex] = useState(
    subscription.nextBillingCycleIndex ?? null,
  );

  async function handleConfirmReschedule() {
    if (!subscription?.id || !rescheduleDate) {
      setRescheduleError("Please select a valid date.");
      return;
    }

    setIsRescheduling(true);
    setRescheduleError(null);
    setRescheduleAdjustedNote(null);

    try {
      const token = await shopify.sessionToken.get();

      const dateOnly = rescheduleDate;
      const res = await fetch(`${API_BASE}/api/subscriptions/reschedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscriptionContractId: subscription.id,
          billingCycleIndex: targetCycleIndex ?? 0,
          newDate: dateOnly,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to reschedule this order right now.",
        );
      }

      const confirmedDate = data.billingCycle?.billingAttemptExpectedDate
        ? toDateOnlyString(data.billingCycle.billingAttemptExpectedDate)
        : dateOnly;

      setRescheduled(true);
      setRescheduleDate(confirmedDate);

      if (data.dateWasAdjusted) {
        setRescheduleAdjustedNote(
          `The date you selected wasn't available, so your order was scheduled for the next available date instead: ${formatShort(confirmedDate)}.`,
        );
        shopify.toast.show(
          `Scheduled for ${formatShort(confirmedDate)} (nearest available date)`,
        );
      } else {
        shopify.toast.show(`Rescheduled to ${formatShort(confirmedDate)}`);
      }

      hideModalById("reschedule-modal");
      if (typeof onRescheduled === "function") {
        const nextBillingDate =
          data.billingCycle?.billingAttemptExpectedDate ||
          `${confirmedDate}T00:00:00.000Z`;
        await onRescheduled(subscription.id, nextBillingDate);
      }
    } catch (err) {
      console.error("Failed to reschedule subscription", err);
      setRescheduleError(
        err.message || "Unable to reschedule this order right now.",
      );
    } finally {
      setIsRescheduling(false);
    }
  }

  async function handleCancelSubscription() {
    if (!subscription?.id) {
      setCancelError("Subscription ID is missing.");
      return;
    }

    setIsCanceling(true);
    setCancelError(null);

    try {
      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionContractId: subscription.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to cancel subscription right now.",
        );
      }

      setCancelled(true);
      shopify.toast.show("Subscription cancelled successfully");
    } catch (err) {
      console.error("Failed to cancel subscription", err);
      setCancelError(err.message || "Unable to cancel subscription right now.");
    } finally {
      setIsCanceling(false);
    }
  }

  // NEW: pause subscription
  async function handlePauseSubscription() {
    if (!subscription?.id) {
      setPauseError("Subscription ID is missing.");
      return;
    }

    setIsPausing(true);
    setPauseError(null);

    try {
      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/pause`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionContractId: subscription.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to pause subscription right now.",
        );
      }

      const newStatus = data.contract?.status || "PAUSED";
      shopify.toast.show("Subscription paused");

      if (typeof onStatusChanged === "function") {
        onStatusChanged(subscription.id, newStatus);
      }
    } catch (err) {
      console.error("Failed to pause subscription", err);
      setPauseError(err.message || "Unable to pause subscription right now.");
    } finally {
      setIsPausing(false);
    }
  }

  // NEW: resume subscription
  async function handleResumeSubscription() {
    if (!subscription?.id) {
      setPauseError("Subscription ID is missing.");
      return;
    }

    setIsPausing(true);
    setPauseError(null);

    try {
      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscriptionContractId: subscription.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to resume subscription right now.",
        );
      }

      const newStatus = data.contract?.status || "ACTIVE";
      shopify.toast.show("Subscription resumed");

      if (typeof onStatusChanged === "function") {
        onStatusChanged(subscription.id, newStatus);
      }
    } catch (err) {
      console.error("Failed to resume subscription", err);
      setPauseError(err.message || "Unable to resume subscription right now.");
    } finally {
      setIsPausing(false);
    }
  }
  console.log("djkfjdfjd",subscription)

  const isPaused = subscription.status === "PAUSED";
  const isActive = subscription.status === "ACTIVE";

  return (
    <s-page heading="Manage subscription">
      <s-section>
        <s-button onClick={handleBack} variant="tertiary">
          ← Back
        </s-button>

        <s-stack direction="block" gap="tight">
          <s-text tone="subdued">Status: {subscription.status}</s-text>
        </s-stack>

        <s-grid gridTemplateColumns="2fr 1fr" gap="base">
          {/* LEFT COLUMN */}
          <s-stack direction="block" gap="base">
            {!isCancelled && (
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack
                direction="inline"
                justifyContent="space-between"
                blockAlignment="center"
              >
                <s-stack direction="block" gap="tight">
                  <s-text fontWeight="bold">Upcoming order</s-text>
                  <s-text tone="subdued">
                    {formatShort(
                      rescheduleDate ||
                        toDateOnlyString(subscription.nextBillingDate),
                    )}
                  </s-text>
                  <s-link command="--show" commandfor="upcoming-orders-modal">
                    Show upcoming orders
                  </s-link>
                </s-stack>

                <s-button
                  command="--show"
                  commandfor="reschedule-modal"
                  variant="secondary"
                  disabled={isPaused}
                >
                  Reschedule
                </s-button>
              </s-stack>
            </s-box>
)}
            <s-box border="base" borderRadius="base" padding="base">
              <s-grid gridTemplateColumns="1fr 1fr" gap="base">
                <s-stack direction="block" gap="tight">
                  <s-text fontWeight="bold">Delivery frequency</s-text>
                  <s-text tone="subdued">
                    Delivery: every {subscription.deliveryPolicy?.intervalCount}{" "}
                    {subscription.deliveryPolicy?.interval?.toLowerCase()}
                  </s-text>
                </s-stack>
                <s-stack direction="block" gap="tight">
                  <s-text fontWeight="bold">Shipping method</s-text>
                  <s-text tone="subdued">{shippingTitle ?? "Standard"}</s-text>
                </s-stack>
              </s-grid>
            </s-box>
          </s-stack>

          {/* RIGHT COLUMN */}
          <s-stack direction="block" gap="base">
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack direction="block" gap="base">
                {lines.map((line, i) => {
                  const imageUrl = getLineImageUrl(line);
                  return (
                    <s-stack
                      key={i}
                      direction="inline"
                      justifyContent="space-between"
                    >
                      <s-stack
                        direction="inline"
                        gap="base"
                        alignItems="center"
                      >
                        <s-image
                          src={imageUrl}
                          alt={line?.title || "Product image"}
                          inlineSize="56px"
                          blockSize="56px"
                        />
                        <s-stack direction="block" gap="tight">
                          <s-text fontWeight="bold">{line.title}</s-text>
                          {line.variantTitle && (
                            <s-text tone="subdued">{line.variantTitle}</s-text>
                          )}
                          <s-text tone="subdued">Qty: {line.quantity}</s-text>
                        </s-stack>
                      </s-stack>
                      <s-text>
                        {line.lineDiscountedPrice?.currencyCode}{" "}
                        {line.lineDiscountedPrice?.amount}
                      </s-text>
                    </s-stack>
                  );
                })}

                <s-stack direction="inline" justifyContent="space-between">
                  <s-text>Subtotal</s-text>
                  <s-text>
                    {subscription.currencyCode}{" "}
                    {subscription.subtotal?.toFixed(2)}
                  </s-text>
                </s-stack>

                <s-stack direction="inline" justifyContent="space-between">
                  <s-text fontWeight="bold">Total</s-text>
                  <s-text fontWeight="bold">
                    {subscription.currencyCode}{" "}
                    {subscription.subtotal?.toFixed(2)}
                  </s-text>
                </s-stack>
              </s-stack>
            </s-box>

            {/* NEW: Pause / Resume block */}
            {!cancelled && (isActive || isPaused) && (
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack direction="block" gap="tight">
                  {isPaused ? (
                    <>
                      <s-button
                        variant="primary"
                        onClick={handleResumeSubscription}
                        disabled={isPausing}
                      >
                        {isPausing ? "Resuming..." : "Resume subscription"}
                      </s-button>
                    </>
                  ) : (
                    <s-button
                      variant="secondary"
                      onClick={handlePauseSubscription}
                      disabled={isPausing}
                    >
                      {isPausing ? "Pausing..." : "Pause subscription"}
                    </s-button>
                  )}
                  {pauseError && <s-text tone="critical">{pauseError}</s-text>}
                </s-stack>
              </s-box>
            )}

            {!canCancel && (
              <s-box border="base" borderRadius="base" padding="base">
                <s-stack direction="block" gap="tight">
                  <s-text tone="subdued">
                    You can't yet cancel this subscription, as you didn't yet
                    reach the required number of payments.
                  </s-text>
                  <s-text>
                    Required number of payments:{" "}
                    {subscription.minPaymentsRequired}
                  </s-text>
                </s-stack>
              </s-box>
            )}

            {canCancel && !cancelled && !isCancelled && (
              <s-stack direction="block" gap="tight">
                <s-button
                  variant="secondary"
                  onClick={handleCancelSubscription}
                  disabled={isCanceling}
                >
                  {isCanceling ? "Cancelling..." : "Cancel subscription"}
                </s-button>
                {cancelError && <s-text tone="critical">{cancelError}</s-text>}
              </s-stack>
            )}

            {cancelled && (
              <s-box border="base" borderRadius="base" padding="base">
                <s-text tone="success">
                  This subscription has been cancelled.
                </s-text>
              </s-box>
            )}
          </s-stack>
        </s-grid>
      </s-section>

      <s-modal id="reschedule-modal" heading="Reschedule next order">
        <s-stack direction="block" gap="base">
          <s-date-picker
            selected={rescheduleDate}
            onChange={(e) =>
              setRescheduleDate(toDateOnlyString(e.target.value))
            }
          />
          <s-stack direction="inline" justifyContent="end" gap="base">
            <s-button
              command="--hide"
              commandfor="reschedule-modal"
              variant="tertiary"
            >
              Close
            </s-button>
            <s-button
              onClick={handleConfirmReschedule}
              variant="primary"
              disabled={isRescheduling}
            >
              {isRescheduling ? "Saving..." : "Confirm"}
            </s-button>
          </s-stack>
          {rescheduleError && (
            <s-text tone="critical">{rescheduleError}</s-text>
          )}
          {rescheduled && !rescheduleAdjustedNote && (
            <s-text tone="success">
              Your next order date has been updated.
            </s-text>
          )}
          {rescheduleAdjustedNote && (
            <s-text tone="warning">{rescheduleAdjustedNote}</s-text>
          )}
        </s-stack>
      </s-modal>

      <s-modal id="upcoming-orders-modal" heading="Upcoming orders">
        <s-stack direction="block" gap="base">
          {upcomingDates.map((cycle, i) => (
            <s-stack key={i} direction="inline" justifyContent="space-between">
              <s-text>{formatShort(cycle.dateOnly)}</s-text>
              <s-link
                onClick={() => {
                  setRescheduleDate(cycle.dateOnly);
                  setTargetCycleIndex(
                    cycle.cycleIndex ??
                      subscription.nextBillingCycleIndex ??
                      null,
                  );
                  hideModalById("upcoming-orders-modal");
                  showModalById("reschedule-modal");
                }}
              >
                Reschedule
              </s-link>
            </s-stack>
          ))}
          <s-stack direction="inline" justifyContent="end">
            <s-button
              command="--hide"
              commandfor="upcoming-orders-modal"
              variant="primary"
            >
              Close
            </s-button>
          </s-stack>
        </s-stack>
      </s-modal>
    </s-page>
  );
}
