import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { COUNTRIES } from "../../../app/routes/utils/countries";

const API_BASE = "https://lead-freely-brilliant-concerned.trycloudflare.com";
const PAGE_SIZE = 7;
const CANCEL_REASONS = [
  "Too expensive",
  "Found a better deal elsewhere",
  "The product/service isn't worth the price",
  "I wasn't using it enough",
  "I only needed it for a short time",
  "My needs have changed",
  "The product didn't meet my expectations",
  "I had issues with product quality or performance",
  "I had trouble using the product",
  "I had issues with customer support",
  "Delivery or fulfillment was unreliable",
  "The website or app was difficult to use",
  "I switched to another brand/service",
  "I already have a similar product",
  "I'm taking a break / going on vacation",
  "Financial reasons or budgeting",
  "Other (please specify)",
];

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
  const [statusFilter, setStatusFilter] = useState("ALL");
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
const [resolvingDeepLink, setResolvingDeepLink] = useState(false);

const fetchSubscriptionById = useCallback(
  async (id) => {
    try {
      const customerId = await getCustomerId();
      const token = await shopify.sessionToken.get();
      const params = new URLSearchParams({ customerId });
      const res = await fetch(
        `${API_BASE}/api/subscriptions/${id}?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.subscription || data || null;
    } catch (err) {
      console.error("Failed to fetch subscription by id", err);
      return null;
    }
  },
  [getCustomerId],
);
  // useEffect(() => {
  //   function syncFromEntry(entry) {
  //     const id = parseSubscriptionIdFromUrl(entry?.url);
  //     if (!id) {
  //       setSelectedSub(null);
  //       return;
  //     }

  //     const found = subscriptions.find((s) => getNumericId(s.id) === id);
  //     if (found) {
  //       setSelectedSub(found);
  //       return;
  //     }

  //     const stateSub = entry.getState?.();
  //     if (stateSub) {
  //       setSelectedSub(stateSub);
  //     }
  //   }

  //   syncFromEntry(shopify.navigation.currentEntry);

  //   function onChange() {
  //     syncFromEntry(shopify.navigation.currentEntry);
  //   }

  //   shopify.navigation.addEventListener("currententrychange", onChange);
  //   return () =>
  //     shopify.navigation.removeEventListener("currententrychange", onChange);
  // }, [subscriptions]);
useEffect(() => {
  async function syncFromEntry(entry) {
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
      return;
    }

    if (!loading) {
      setResolvingDeepLink(true);
      const fetched = await fetchSubscriptionById(id);
      setResolvingDeepLink(false);
      if (fetched) {
        setSelectedSub(fetched);
      }
    }
  }

  syncFromEntry(shopify.navigation.currentEntry);

  function onChange() {
    syncFromEntry(shopify.navigation.currentEntry);
  }

  shopify.navigation.addEventListener("currententrychange", onChange);
  return () =>
    shopify.navigation.removeEventListener("currententrychange", onChange);
}, [subscriptions, loading, fetchSubscriptionById]);
  const fetchPage = useCallback(
    async ({
      afterCursor = null,
      reset = true,
      status = statusFilter,
    } = {}) => {
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
        if (status && status !== "ALL") params.set("status", status);

        const res = await fetch(
          `${API_BASE}/api/subscriptions?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
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
    [getCustomerId, subscriptions, statusFilter],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setCursor(null);
      setHasMore(false);
      await fetchPage({ afterCursor: null, reset: true, status: statusFilter });
      setLoading(false);
    })();
  }, [statusFilter]);

  async function handleViewMore() {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPage({ afterCursor: cursor, reset: false });
    setLoadingMore(false);
  }
  function handleStatusFilterChange(e) {
    setStatusFilter(e.target.value);
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
  if (resolvingDeepLink) {
  return (
    <s-page heading="Subscriptions">
      <s-section>
        <s-stack direction="block" gap="base">
          <SkeletonCard />
        </s-stack>
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
        <s-box paddingBlockEnd="base" inlineSize="200px">
          <s-select
            label="Status"
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <s-option value="ALL">All</s-option>
            <s-option value="ACTIVE">Active</s-option>
            <s-option value="PAUSED">Paused</s-option>
            <s-option value="CANCELLED">Cancelled</s-option>
          </s-select>
        </s-box>

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

function SubscriptionDetail({
  sub,
  onBack,
  refreshSubscriptions,
  getCustomerId,
}) {
  const [upcomingCycles, setUpcomingCycles] = useState(
    sub.upcomingCycles ?? [],
  );
  const [pastOrders, setPastOrders] = useState(sub.pastOrders ?? []);

  const paymentMenuModalRef = useRef(null);

  const [paymentMethod, setPaymentMethod] = useState(sub.paymentMethod ?? null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [paymentUpdateSaving, setPaymentUpdateSaving] = useState(false);
  const [paymentUpdateError, setPaymentUpdateError] = useState(null);
  const [nextBillingDate, setNextBillingDate] = useState(sub.nextBillingDate);
  const [hasMoreCycles, setHasMoreCycles] = useState(
    sub.hasMoreCycles ?? false,
  );
  const swapModalRef = useRef(null);
  const [swapSelections, setSwapSelections] = useState({});
  const [savingProductId, setSavingProductId] = useState(null);
  const [swapError, setSwapError] = useState(null);

  const [loadingCycleIndex, setLoadingCycleIndex] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  const [address, setAddress] = useState(sub.deliveryMethod?.address ?? null);
  const addressModalRef = useRef(null);

  const [addressForm, setAddressForm] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "IN",
    phone: "",
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState(null);
  const [status, setStatus] = useState(sub.status);
  const [pauseResumeLoading, setPauseResumeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const cancelModalRef = useRef(null);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonNote, setCancelReasonNote] = useState("");
  const [cancelReasonError, setCancelReasonError] = useState(null);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseReasonNote, setPauseReasonNote] = useState("");
  const [pauseReasonError, setPauseReasonError] = useState(null);
  const pauseModalRef = useRef(null);

  const [rescheduleCycle, setRescheduleCycle] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);
  const rescheduleModalRef = useRef(null); // outer top-level "Reschedule" button ke liye
  const upcomingModalRef = useRef(null);

  useEffect(() => {
    setUpcomingCycles(sub.upcomingCycles ?? []);
    setNextBillingDate(sub.nextBillingDate);
    setHasMoreCycles(sub.hasMoreCycles ?? false);
    setAddress(sub.deliveryMethod?.address ?? null);
    setStatus(sub.status);
    setPastOrders(sub.pastOrders ?? []);
    setPaymentMethod(sub.paymentMethod ?? null);
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
  async function handlePause() {
    if (pauseResumeLoading) return;

    if (!pauseReason) {
      setPauseReasonError("Please select a reason");
      return;
    }

    const finalReason = pauseReasonNote.trim()
      ? `${pauseReason}; ${pauseReasonNote.trim()}`
      : pauseReason;

    try {
      setPauseResumeLoading(true);
      setPauseReasonError(null);
      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/pause`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionContractId: sub.id,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Pause failed",
        );
      }

      setStatus(data.contract?.status || "PAUSED");
      shopify.toast.show("Subscription paused");
      pauseModalRef.current?.hide?.();
      setPauseReason("");
      setPauseReasonNote("");

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after pause failed:", err),
      );
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message);
    } finally {
      setPauseResumeLoading(false);
    }
  }
  async function handleResume() {
    if (pauseResumeLoading) return;
    try {
      setPauseResumeLoading(true);
      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionContractId: sub.id }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Resume failed",
        );
      }

      setStatus(data.contract?.status || "ACTIVE");
      shopify.toast.show("Subscription resumed");

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after resume failed:", err),
      );
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message);
    } finally {
      setPauseResumeLoading(false);
    }
  }

  // async function handleCancel() {
  //   if (cancelLoading) return;
  //   try {
  //     setCancelLoading(true);
  //     const token = await shopify.sessionToken.get();
  //     const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ subscriptionContractId: sub.id }),
  //     });

  //     const data = await res.json();
  //     if (!res.ok || !data.success) {
  //       throw new Error(data.error || "Cancel failed");
  //     }

  //     setStatus(data.subscription?.status || "CANCELLED");
  //     shopify.toast.show("Subscription cancelled");
  //     cancelModalRef.current?.hide?.();

  //     refreshSubscriptions().catch((err) =>
  //       console.error("Background refresh after cancel failed:", err),
  //     );
  //   } catch (err) {
  //     console.error(err);
  //     shopify.toast.show(err.message);
  //   } finally {
  //     setCancelLoading(false);
  //   }
  // }
  async function handleCancel() {
    if (cancelLoading) return;

    if (!cancelReason) {
      setCancelReasonError("Please select a reason");
      return;
    }

    const finalReason = cancelReasonNote.trim()
      ? `${cancelReason}; ${cancelReasonNote.trim()}`
      : cancelReason;

    try {
      setCancelLoading(true);
      setCancelReasonError(null);
      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionContractId: sub.id,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Cancel failed");
      }

      setStatus(data.subscription?.status || "CANCELLED");
      shopify.toast.show("Subscription cancelled");
      cancelModalRef.current?.hide?.();
      setCancelReason("");
      setCancelReasonNote("");

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after cancel failed:", err),
      );
    } catch (err) {
      console.error(err);
      shopify.toast.show(err.message);
    } finally {
      setCancelLoading(false);
    }
  }

  function openRescheduleModal(cycle) {
    if (!cycle || loadingCycleIndex != null) return;
    setRescheduleCycle(cycle);
    setRescheduleDate(toDateOnlyString(cycle.billingAttemptExpectedDate) || "");
    setRescheduleError(null);
  }

  function openRescheduleInsideUpcomingModal(cycle) {
    openRescheduleModal(cycle);
  }

  function closeUpcomingModal() {
    upcomingModalRef.current?.hide?.();
    setRescheduleCycle(null);
    setRescheduleError(null);
  }

  function backToUpcomingList() {
    setRescheduleCycle(null);
    setRescheduleError(null);
  }

  async function handleSaveReschedule() {
    if (!rescheduleCycle || !rescheduleDate || rescheduleSaving) return;
    const cycleIndex = rescheduleCycle.cycleIndex;
    const wasFromUpcomingModal = rescheduleCycle.__fromUpcomingModal;

    try {
      setRescheduleSaving(true);
      setRescheduleError(null);

      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/reschedule`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: sub.id,
          cycleIndex,
          newDate: rescheduleDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Reschedule failed");
      }

      applyCycleUpdate(cycleIndex, {
        billingAttemptExpectedDate:
          data.billingAttemptExpectedDate || rescheduleDate,
        edited: true,
      });

      shopify.toast.show("Order rescheduled");

      if (wasFromUpcomingModal) {
        setRescheduleCycle(null);
      } else {
        rescheduleModalRef.current?.hide?.();
        setRescheduleCycle(null);
      }

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after reschedule failed:", err),
      );
    } catch (err) {
      console.error(err);
      setRescheduleError(err.message);
    } finally {
      setRescheduleSaving(false);
    }
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
    const { firstName, lastName } =
      a.firstName != null || a.lastName != null
        ? { firstName: a.firstName || "", lastName: a.lastName || "" }
        : splitName(a.name);
    const matchedCountry = COUNTRIES.find(
      (c) => c.label === a.country || c.value === a.country,
    );
    setAddressForm({
      firstName,
      lastName,
      address1: a.address1 || "",
      address2: a.address2 || "",
      city: a.city || "",
      province: a.province || "",
      zip: a.zip || "",
      country: matchedCountry ? matchedCountry.value : "IN",
      phone: a.phone || "",
    });
    setAddressError(null);
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

      const countryLabel =
        COUNTRIES.find((c) => c.value === addressForm.country)?.label ||
        addressForm.country;

      const res = await fetch(`${API_BASE}/api/subscriptions/update-address`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: sub.id,
          customerId,
          address: { ...addressForm, country: countryLabel },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Address update failed");
      }

      setAddress({
        firstName: addressForm.firstName,
        lastName: addressForm.lastName,
        name: `${addressForm.firstName} ${addressForm.lastName}`.trim(),
        address1: addressForm.address1,
        address2: addressForm.address2,
        city: addressForm.city,
        province: addressForm.province,
        zip: addressForm.zip,
        country: countryLabel,
        phone: addressForm.phone,
      });

      shopify.toast.show("Address updated");
      addressModalRef.current?.hide?.();

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

  async function openChoosePaymentModal() {
    setPaymentUpdateError(null);
    setPaymentMethodsLoading(true);
    try {
      const token = await shopify.sessionToken.get();
      const customerId = await getCustomerId();
      const params = new URLSearchParams({ customerId });
      const res = await fetch(
        `${API_BASE}/api/subscriptions/payment-methods?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load payment methods");

      const methods = data.paymentMethods || [];
      setAvailablePaymentMethods(methods);

      const currentMatch = methods.find(
        (m) =>
          m.lastDigits === paymentMethod?.lastDigits &&
          m.cardHolderName === paymentMethod?.cardHolderName,
      );
      setSelectedPaymentMethodId(currentMatch?.id || methods[0]?.id || "");
    } catch (err) {
      console.error(err);
      setPaymentUpdateError(err.message);
    } finally {
      setPaymentMethodsLoading(false);
    }
  }

  async function handleUpdatePaymentMethod() {
    if (!selectedPaymentMethodId || paymentUpdateSaving) return;
    try {
      setPaymentUpdateSaving(true);
      setPaymentUpdateError(null);

      const token = await shopify.sessionToken.get();
      const res = await fetch(
        `${API_BASE}/api/subscriptions/update-payment-method`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contractId: sub.id,
            paymentMethodId: selectedPaymentMethodId,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment method update failed");
      }

      if (data.paymentMethod) {
        console.log("New payment method saved:", data.paymentMethod);
        setPaymentMethod(data.paymentMethod);
      }
      shopify.toast.show("Payment method updated");
      paymentMenuModalRef.current?.hide?.();

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after payment update failed:", err),
      );
    } catch (err) {
      console.error(err);
      setPaymentUpdateError(err.message);
    } finally {
      setPaymentUpdateSaving(false);
    }
  }

  function openSwapModal() {
    setSwapError(null);
    const allowProductSwaps = !!(sub.customerProductChanges ?? {})
      .allowProductSwaps;
    const currentProductId = items[0]?.productId;
    const currentQuantity = items[0]?.quantity ?? 1;
    const visible = (sub.swapOptions ?? []).filter(
      (product) => allowProductSwaps || product.id === currentProductId,
    );
    const defaults = {};
    visible.forEach((product) => {
      const isCurrentProductCard = product.id === currentProductId;
      defaults[product.id] = {
        variantId: isCurrentProductCard
          ? (items[0]?.variantId ?? product.variants?.[0]?.variantsId ?? "")
          : (product.variants?.[0]?.variantsId ?? ""),
        quantity: isCurrentProductCard ? currentQuantity : 1,
      };
    });
    setSwapSelections(defaults);
  }

  async function handleSwapProduct(product) {
    if (savingProductId != null) return;
    const selection = swapSelections[product.id];
    const variantId = selection?.variantId || product.variants?.[0]?.variantsId;
    const quantity = allowQuantityChanges
      ? selection?.quantity || 1
      : items[0]?.quantity || 1;

    if (!variantId) {
      setSwapError("Please select a variant");
      return;
    }

    try {
      setSavingProductId(product.id);
      setSwapError(null);

      const token = await shopify.sessionToken.get();
      const res = await fetch(`${API_BASE}/api/subscriptions/swap-product`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: sub.id,
          lineId: items[0]?.id,
          variantId,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Swap failed");
      }

      shopify.toast.show("Product swapped");
      swapModalRef.current?.hide?.();

      refreshSubscriptions().catch((err) =>
        console.error("Background refresh after swap failed:", err),
      );
    } catch (err) {
      console.error(err);
      setSwapError(err.message);
    } finally {
      setSavingProductId(null);
    }
  }

  const items = sub.nextOrderLineItems?.length
    ? sub.nextOrderLineItems
    : (sub.lines?.edges?.map((e) => e.node) ?? []);

  const customerChanges = sub.customerProductChanges ?? {};
  const allowQuantityChanges = !!customerChanges.allowQuantityChanges;
  const allowProductSwaps = !!customerChanges.allowProductSwaps;
  const allowVariantChanges = !!customerChanges.allowVariantChanges;
  const keepDiscounts = !!customerChanges.keepDiscounts;
  const visibleSwapProducts = (sub.swapOptions ?? []).filter(
    (product) => allowProductSwaps || product.id === items[0]?.productId,
  );
  const total = sub.nextOrderTotal;
  const shipping = sub.nextOrderShipping;
  const grandTotal =
    total != null
      ? (
          Number(total.amount) + Number(shipping?.calculatedPrice?.amount ?? 0)
        ).toFixed(2)
      : null;

  const minCycles = sub.billingPolicy?.minCycles ?? null;
  const minCyclesReached = sub.billingPolicy?.minCyclesReached;
  const canModifySubscription = minCyclesReached !== false;

  const numericId = getNumericId(sub.id);
  const modalId = `upcoming-orders-modal-${numericId}`;
  const addressModalId = `edit-address-modal-${numericId}`;
  const swapModalId = `swap-product-modal-${numericId}`;
  const rescheduleModalId = `reschedule-modal-${numericId}`;
  const paymentMenuModalId = `payment-menu-modal-${numericId}`;
  const cycles = upcomingCycles;
  const visibleCycles = cycles.slice(0, VISIBLE_CYCLES_LIMIT);

  const nextActionable = getNextActionableCycle(visibleCycles);

  const maxSkipReached =
    visibleCycles.length === VISIBLE_CYCLES_LIMIT && !nextActionable;

  const isRescheduleViewInUpcomingModal =
    rescheduleCycle && rescheduleCycle.__fromUpcomingModal;

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
              status === "ACTIVE"
                ? "success"
                : status === "PAUSED"
                  ? "warning"
                  : "neutral"
            }
          >
            Status: {status}
          </s-badge>
          {status !== "CANCELLED" &&
            status !== "EXPIRED" &&
            canModifySubscription && (
              <s-stack direction="inline" gap="tight">
                {status === "PAUSED" ? (
                  <s-button
                    variant="secondary"
                    disabled={pauseResumeLoading}
                    onClick={handleResume}
                  >
                    {pauseResumeLoading ? <s-spinner size="small" /> : "Resume"}
                  </s-button>
                ) : (
                  <s-button
                    variant="secondary"
                    command="--show"
                    commandFor={`pause-modal-${numericId}`}
                    disabled={pauseResumeLoading}
                  >
                    {pauseResumeLoading ? <s-spinner size="small" /> : "Pause"}
                  </s-button>
                )}

                <s-button
                  variant="tertiary"
                  tone="critical"
                  command="--show"
                  commandFor={`cancel-modal-${numericId}`}
                  disabled={pauseResumeLoading || cancelLoading}
                >
                  Cancel subscription
                </s-button>
              </s-stack>
            )}
          {sub.canSwapProduct && (
            <s-button
              variant="primary"
              command="--show"
              commandFor={swapModalId}
              onClick={openSwapModal}
            >
              Swap product
            </s-button>
          )}
          <s-box border="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="base">
              <s-text fontWeight="bold">Subscription permissions</s-text>
              <s-stack direction="inline" gap="tight" alignItems="center">
                <s-badge tone={allowProductSwaps ? "success" : "neutral"}>
                  Product swaps: {allowProductSwaps ? "Allowed" : "Not allowed"}
                </s-badge>
              </s-stack>
              <s-stack direction="inline" gap="tight" alignItems="center">
                <s-badge tone={allowVariantChanges ? "success" : "neutral"}>
                  Variant changes:{" "}
                  {allowVariantChanges ? "Allowed" : "Not allowed"}
                </s-badge>
              </s-stack>
              <s-stack direction="inline" gap="tight" alignItems="center">
                <s-badge tone={allowQuantityChanges ? "success" : "neutral"}>
                  Quantity changes:{" "}
                  {allowQuantityChanges ? "Allowed" : "Not allowed"}
                </s-badge>
              </s-stack>
              <s-stack direction="inline" gap="tight" alignItems="center">
                <s-badge tone={keepDiscounts ? "success" : "neutral"}>
                  Keep discount on change: {keepDiscounts ? "Yes" : "No"}
                </s-badge>
              </s-stack>
            </s-stack>
          </s-box>
          {/* CANCEL MODEL */}
          <s-modal
            id={`cancel-modal-${numericId}`}
            ref={cancelModalRef}
            heading="Cancel subscription"
          >
            <s-stack direction="block" gap="base">
              <s-text tone="subdued">
                If you cancel your subscription, billing and delivery will end
                immediately. Canceling a subscription cannot be undone. To
                temporarily stop receiving orders, pause your subscription.
              </s-text>

              {cancelReasonError && (
                <s-text tone="critical">{cancelReasonError}</s-text>
              )}

              <s-select
                label="Select a reason"
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  setCancelReasonError(null);
                  if (e.target.value !== "Other (please specify)") {
                    setCancelReasonNote("");
                  }
                }}
              >
                <s-option value="">-- Select a reason --</s-option>
                {CANCEL_REASONS.map((reason) => (
                  <s-option key={reason} value={reason}>
                    {reason}
                  </s-option>
                ))}
              </s-select>

              {cancelReason === "Other (please specify)" && (
                <s-text-field
                  label="Please specify"
                  placeholder="Tell us more"
                  value={cancelReasonNote}
                  onInput={(e) => setCancelReasonNote(e.target.value)}
                />
              )}
            </s-stack>

            <s-button
              slot="primary-action"
              variant="primary"
              tone="critical"
              disabled={cancelLoading}
              onClick={handleCancel}
            >
              {cancelLoading ? <s-spinner size="small" /> : "Yes, cancel"}
            </s-button>
            <s-button
              slot="secondary-actions"
              command="--hide"
              commandFor={`cancel-modal-${numericId}`}
              disabled={cancelLoading}
              onClick={() => {
                setCancelReason("");
                setCancelReasonNote("");
                setCancelReasonError(null);
              }}
            >
              Keep subscription
            </s-button>
          </s-modal>

          {/* PAUSE MODEL */}
          <s-modal
            id={`pause-modal-${numericId}`}
            ref={pauseModalRef}
            heading="Pause subscription"
          >
            <s-stack direction="block" gap="base">
              <s-text tone="subdued">
                Your subscription will be paused temporarily. You can resume it
                anytime.
              </s-text>

              {pauseReasonError && (
                <s-text tone="critical">{pauseReasonError}</s-text>
              )}

              <s-select
                label="Select a reason"
                value={pauseReason}
                onChange={(e) => {
                  setPauseReason(e.target.value);
                  setPauseReasonError(null);
                  if (e.target.value !== "Other (please specify)") {
                    setPauseReasonNote("");
                  }
                }}
              >
                <s-option value="">-- Select a reason --</s-option>
                {CANCEL_REASONS.map((reason) => (
                  <s-option key={reason} value={reason}>
                    {reason}
                  </s-option>
                ))}
              </s-select>

              {pauseReason === "Other (please specify)" && (
                <s-text-field
                  label="Please specify"
                  placeholder="Tell us more"
                  value={pauseReasonNote}
                  onInput={(e) => setPauseReasonNote(e.target.value)}
                />
              )}
            </s-stack>

            <s-button
              slot="primary-action"
              variant="primary"
              disabled={pauseResumeLoading}
              onClick={handlePause}
            >
              {pauseResumeLoading ? <s-spinner size="small" /> : "Yes, pause"}
            </s-button>
            <s-button
              slot="secondary-actions"
              command="--hide"
              commandFor={`pause-modal-${numericId}`}
              disabled={pauseResumeLoading}
              onClick={() => {
                setPauseReason("");
                setPauseReasonNote("");
                setPauseReasonError(null);
              }}
            >
              Keep active
            </s-button>
          </s-modal>

          <s-modal id={swapModalId} ref={swapModalRef} heading="Swap product">
            <s-stack direction="block" gap="base">
              {swapError && <s-text tone="critical">{swapError}</s-text>}

              {visibleSwapProducts.map((product) => {
                const isCurrentProductCard = product.id === items[0]?.productId;
                const currentQuantity = items[0]?.quantity ?? 1;
                const currentVariantId =
                  items[0]?.variantId ?? product.variants?.[0]?.variantsId;

                const selection = swapSelections[product.id] ?? {
                  variantId: isCurrentProductCard
                    ? (currentVariantId ?? "")
                    : (product.variants?.[0]?.variantsId ?? ""),
                  quantity: isCurrentProductCard ? currentQuantity : 1,
                };

                const selectedVariant =
                  product.variants?.find(
                    (v) => v.variantsId === selection.variantId,
                  ) ?? product.variants?.[0];

                const canEditThisCard = isCurrentProductCard
                  ? allowVariantChanges
                  : allowProductSwaps;

                const isNoChangeSelected =
                  isCurrentProductCard &&
                  selection.variantId === currentVariantId &&
                  Number(selection.quantity) === Number(currentQuantity);

                return (
                  <s-box
                    key={product.id}
                    border="base"
                    borderRadius="base"
                    padding="base"
                  >
                    <s-stack direction="block" gap="tight">
                      <s-stack
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
                            src={
                              isCurrentProductCard
                                ? (items[0]?.imageUrl ?? product.ProductImage)
                                : product.ProductImage
                            }
                            alt={product.title}
                          />
                        </s-box>
                        <s-stack direction="block" gap="none">
                          <s-text fontWeight="bold">{product.title}</s-text>
                          {selectedVariant?.variantsTitle && (
                            <s-text tone="subdued">
                              {selectedVariant.variantsTitle}
                            </s-text>
                          )}
                          {selectedVariant?.price != null && (
                            <s-text tone="subdued">
                              ₹{selectedVariant.price}.00
                            </s-text>
                          )}
                          {isCurrentProductCard && (
                            <s-text tone="subdued">(Current product)</s-text>
                          )}
                        </s-stack>
                      </s-stack>

                      <s-select
                        label="Select variant"
                        value={selection.variantId}
                        disabled={!canEditThisCard}
                        onChange={(e) =>
                          setSwapSelections((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...selection,
                              variantId: e.target.value,
                            },
                          }))
                        }
                      >
                        {(product.variants ?? []).map((v) => (
                          <s-option key={v.variantsId} value={v.variantsId}>
                            {v.variantsTitle}
                          </s-option>
                        ))}
                      </s-select>

                      <s-text-field
                        label="Quantity"
                        type="number"
                        value={String(selection.quantity)}
                        disabled={
                          !canEditThisCard ||
                          !allowQuantityChanges ||
                          savingProductId != null
                        }
                        onInput={(e) =>
                          setSwapSelections((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...selection,
                              quantity: Math.max(
                                1,
                                Number(e.target.value) || 1,
                              ),
                            },
                          }))
                        }
                      />

                      <s-button
                        variant="primary"
                        disabled={
                          !canEditThisCard ||
                          savingProductId != null ||
                          isNoChangeSelected
                        }
                        onClick={() => handleSwapProduct(product)}
                      >
                        {savingProductId === product.id ? (
                          <s-spinner size="small" />
                        ) : (
                          "Swap product"
                        )}
                      </s-button>
                    </s-stack>
                  </s-box>
                );
              })}
            </s-stack>

            <s-button
              slot="secondary-actions"
              command="--hide"
              commandFor={swapModalId}
              disabled={savingProductId != null}
            >
              Close
            </s-button>
          </s-modal>
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
                  command="--show"
                  commandFor={rescheduleModalId}
                  disabled={!nextActionable || loadingCycleIndex != null}
                  onClick={() => openRescheduleModal(nextActionable)}
                >
                  Reschedule
                </s-button>

                {canModifySubscription && (
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
                )}
              </s-stack>
              {maxSkipReached && (
                <s-text tone="subdued">
                  The maximum number of orders have been skipped
                </s-text>
              )}

              {!canModifySubscription && minCycles != null && (
                <s-box border="base" borderRadius="base" padding="base">
                  <s-text tone="subdued">
                    You can't yet cancel, pause, or skip this subscription, as
                    you haven't yet reached the required number of payments.
                  </s-text>
                  <s-text tone="subdued">
                    Required number of payments: {minCycles}
                  </s-text>
                </s-box>
              )}

              {visibleCycles.length > 0 && (
                <s-link
                  command="--show"
                  commandFor={modalId}
                  onClick={() => {
                    setRescheduleCycle(null);
                    setRescheduleError(null);
                  }}
                >
                  Show upcoming orders
                </s-link>
              )}

              {maxSkipReached && (
                <s-text tone="subdued">
                  The maximum number of orders have been skipped
                </s-text>
              )}
            </s-stack>
            <s-modal
              id={modalId}
              ref={upcomingModalRef}
              heading={
                isRescheduleViewInUpcomingModal
                  ? "Reschedule order"
                  : "Upcoming orders"
              }
            >
              {isRescheduleViewInUpcomingModal ? (
                <>
                  <s-stack direction="block" gap="base">
                    {rescheduleError && (
                      <s-text tone="critical">{rescheduleError}</s-text>
                    )}
                    <s-date-picker
                      selected={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                    />
                  </s-stack>

                  <s-button
                    slot="primary-action"
                    variant="primary"
                    disabled={rescheduleSaving || !rescheduleDate}
                    onClick={handleSaveReschedule}
                  >
                    {rescheduleSaving ? <s-spinner size="small" /> : "Save"}
                  </s-button>
                  <s-button
                    slot="secondary-actions"
                    disabled={rescheduleSaving}
                    onClick={backToUpcomingList}
                  >
                    Back
                  </s-button>
                </>
              ) : (
                <>
                  <s-stack direction="block" gap="base">
                    {visibleCycles.map((cycle) => {
                      const isThisLoading =
                        loadingCycleIndex === cycle.cycleIndex;
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
                                toDateOnlyString(
                                  cycle.billingAttemptExpectedDate,
                                ),
                              )}
                            </s-text>

                            {cycle.skipped && (
                              <s-badge tone="warning">Skipped</s-badge>
                            )}
                          </s-stack>

                          {!cycle.skipped &&
                            (isAnyLoading ? (
                              <s-text tone="subdued">Reschedule</s-text>
                            ) : (
                              <s-link
                                onClick={() =>
                                  openRescheduleInsideUpcomingModal({
                                    ...cycle,
                                    __fromUpcomingModal: true,
                                  })
                                }
                              >
                                Reschedule
                              </s-link>
                            ))}

                          {canModifySubscription &&
                            (isThisLoading ? (
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
                                onClick={() =>
                                  handleSkip(sub.id, cycle.cycleIndex)
                                }
                              >
                                Skip
                              </s-link>
                            ))}
                        </s-stack>
                      );
                    })}
                  </s-stack>

                  <s-button
                    variant="primary"
                    slot="primary-action"
                    onClick={closeUpcomingModal}
                  >
                    Close
                  </s-button>
                </>
              )}
            </s-modal>
          </s-box>
          {status !== "CANCELLED" && status !== "EXPIRED" && (
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack direction="block" gap="tight">
                <s-text fontWeight="bold">Delivery frequency</s-text>
                <s-text tone="subdued">
                  Delivery every {sub.deliveryPolicy?.intervalCount}{" "}
                  {sub.deliveryPolicy?.interval?.toLowerCase()}
                </s-text>

                <s-stack
                  direction="inline"
                  gap="base"
                  alignItems="start"
                  justifyContent="space-between"
                >
                  <s-stack direction="block" gap="tight">
                    <s-text fontWeight="bold">Shipping method</s-text>
                    <s-text tone="subdued">
                      {sub.shippingMethodTitle || "-"}
                    </s-text>
                  </s-stack>

                  {paymentMethod && (
                    <s-stack direction="block" gap="tight">
                      <s-stack
                        direction="inline"
                        gap="extra-tight"
                        alignItems="center"
                      >
                        <s-text fontWeight="bold">Payment details</s-text>
                        <s-link
                          command="--show"
                          commandFor={paymentMenuModalId}
                          onClick={openChoosePaymentModal}
                        >
                          <s-icon type="edit" />
                        </s-link>
                      </s-stack>
                      <s-text tone="subdued">
                        Credit card: •••• •••• ••••{" "}
                        {paymentMethod.lastDigits || "----"}
                      </s-text>
                      <s-text tone="subdued">
                        Card holder name: {paymentMethod.cardHolderName || "-"}
                      </s-text>
                      <s-text tone="subdued">
                        Card expires: {paymentMethod.expiryMonth}/
                        {paymentMethod.expiryYear}
                      </s-text>
                    </s-stack>
                  )}
                </s-stack>

                <s-modal
                  id={paymentMenuModalId}
                  ref={paymentMenuModalRef}
                  heading="Choose payment method"
                >
                  <s-stack direction="block" gap="base">
                    {paymentUpdateError && (
                      <s-text tone="critical">{paymentUpdateError}</s-text>
                    )}

                    {paymentMethodsLoading ? (
                      <s-spinner size="small" />
                    ) : (
                      <s-select
                        label="Select Payment Method"
                        value={selectedPaymentMethodId}
                        onChange={(e) =>
                          setSelectedPaymentMethodId(e.target.value)
                        }
                      >
                        {availablePaymentMethods.map((m) => (
                          <s-option key={m.id} value={m.id}>
                            {m.cardHolderName || "Card"} ••••{" "}
                            {m.lastDigits || "----"}
                            {m.expiryMonth && m.expiryYear
                              ? ` (exp ${m.expiryMonth}/${m.expiryYear})`
                              : ""}
                          </s-option>
                        ))}
                      </s-select>
                    )}
                  </s-stack>

                  <s-button
                    slot="primary-action"
                    variant="primary"
                    disabled={paymentUpdateSaving || !selectedPaymentMethodId}
                    onClick={handleUpdatePaymentMethod}
                  >
                    {paymentUpdateSaving ? (
                      <s-spinner size="small" />
                    ) : (
                      "Update"
                    )}
                  </s-button>
                  <s-button
                    slot="secondary-actions"
                    command="--hide"
                    commandFor={paymentMenuModalId}
                    disabled={paymentUpdateSaving}
                  >
                    Cancel
                  </s-button>
                </s-modal>
                {/* </s-stack> */}

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
                    <s-link
                      command="--show"
                      commandFor={addressModalId}
                      onClick={openAddressModal}
                    >
                      <s-stack
                        direction="inline"
                        gap="extra-tight"
                        alignItems="center"
                      >
                        <s-icon type="edit" />
                      </s-stack>
                    </s-link>
                  </>
                )}
              </s-stack>

              <s-modal
                id={addressModalId}
                ref={addressModalRef}
                heading="Edit shipping address"
              >
                <s-stack direction="block" gap="base">
                  {addressError && (
                    <s-text tone="critical">{addressError}</s-text>
                  )}

                  <s-select
                    label="Country/region"
                    value={addressForm.country}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        country: e.target.value,
                        province: "",
                      })
                    }
                  >
                    {COUNTRIES.map((c) => (
                      <s-option key={c.value} value={c.value}>
                        {c.label}
                      </s-option>
                    ))}
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
                      setAddressForm({
                        ...addressForm,
                        address1: e.target.value,
                      })
                    }
                  />
                  <s-text-field
                    label="Apartment, suite, etc (optional)"
                    value={addressForm.address2}
                    onInput={(e) =>
                      setAddressForm({
                        ...addressForm,
                        address2: e.target.value,
                      })
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
                    {addressForm.country === "IN" ? (
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
                    ) : (
                      <s-text-field
                        label="State/Province"
                        value={addressForm.province}
                        onInput={(e) =>
                          setAddressForm({
                            ...addressForm,
                            province: e.target.value,
                          })
                        }
                      />
                    )}
                    <s-text-field
                      label="PIN code"
                      value={addressForm.zip}
                      onInput={(e) =>
                        setAddressForm({ ...addressForm, zip: e.target.value })
                      }
                    />
                  </s-stack>

                  {/* <s-text-field
                    label="Phone"
                    type="tel"
                    value={addressForm.phone}
                    onInput={(e) =>
                      setAddressForm({ ...addressForm, phone: e.target.value })
                    }
                  /> */}
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

              <s-modal
                id={rescheduleModalId}
                ref={rescheduleModalRef}
                heading="Reschedule order"
              >
                <s-stack direction="block" gap="base">
                  {!isRescheduleViewInUpcomingModal && rescheduleError && (
                    <s-text tone="critical">{rescheduleError}</s-text>
                  )}
                  <s-date-picker
                    selected={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </s-stack>

                <s-button
                  slot="primary-action"
                  variant="primary"
                  disabled={rescheduleSaving || !rescheduleDate}
                  onClick={handleSaveReschedule}
                >
                  {rescheduleSaving ? <s-spinner size="small" /> : "Save"}
                </s-button>
                <s-button
                  slot="secondary-actions"
                  command="--hide"
                  commandFor={rescheduleModalId}
                  disabled={rescheduleSaving}
                  onClick={() => setRescheduleCycle(null)}
                >
                  Cancel
                </s-button>
              </s-modal>
            </s-box>
          )}

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

      {pastOrders.length > 0 && (
        <s-section>
          <s-box border="base" borderRadius="base" padding="base">
            <s-stack direction="block" gap="base">
              <s-text fontWeight="bold">Past orders</s-text>
              {pastOrders.map((order) => (
                <s-stack
                  key={order.id}
                  direction="inline"
                  gap="tight"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <s-text tone="subdued">
                    {formatShort(toDateOnlyString(order.createdAt))}
                  </s-text>

                  {order.orderUrl ? (
                    <s-link href={order.orderUrl}>View</s-link>
                  ) : (
                    <s-text tone="subdued">View</s-text>
                  )}
                </s-stack>
              ))}
            </s-stack>
          </s-box>
        </s-section>
      )}
    </s-page>
  );
}
