import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import { hideModalById, showModalById } from "./modalUtils";

const API_BASE = "https://chancellor-suggestion-have-clubs.trycloudflare.com";

export default async () => {
    render(<Extension />, document.body);
};



/* ----------------------------------------------------------------------- *
 * DATE HELPERS
 *
 * The bug: `new Date("2026-07-12")` parses the string as UTC midnight,
 * but `new Date("2026-07-13T11:00:00Z").toISOString()` still carries the
 * "11:00:00Z" time. If you build upcoming dates by incrementing a Date
 * object that started from a full timestamp (e.g. nextBillingDate with a
 * non-midnight time), then later call `.toISOString().split("T")[0]`,
 * the *calendar date* is still correct in UTC — but if anything upstream
 * (the date picker, or a user in a timezone behind UTC) treats that value
 * as a *local* date instead of a UTC one, you get an off-by-one day.
 *
 * Fix: never let a date-only value pick up a time-of-day. Do all
 * calendar-day math on Y/M/D integers directly, and only ever format
 * "YYYY-MM-DD" strings — never round-trip through `new Date(str)` +
 * `toISOString()` for values that are supposed to be pure calendar dates.
 * ----------------------------------------------------------------------- */

// Extract just the "YYYY-MM-DD" part from any date-like input (string or Date),
// treating it as a calendar date, not a timezone-sensitive instant.

function toDateOnlyString(value) {
    if (!value) return value;

    if (typeof value === "string") {
        // Already date-only, or has a time component — either way, the first
        // 10 chars of an ISO-ish string are the calendar date. This avoids
        // ever handing the string to `new Date()` and risking a UTC/local shift.
        const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) return match[1];
    }

    // Fallback for Date objects: use UTC getters (not local getters) since
    // all our source data is UTC-anchored (Shopify timestamps end in "Z").
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.valueOf())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// Build a UTC-midnight Date from a "YYYY-MM-DD" string, purely for display
// formatting (e.g. toLocaleDateString). Never used for the value sent to
// the server — that always stays a plain string.
function dateOnlyToUTCDate(dateOnlyStr) {
    const [y, m, d] = dateOnlyStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

// Add `count` of `interval` units to a "YYYY-MM-DD" string, doing the math
// on the calendar fields directly so no timezone conversion can creep in.
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

function Extension() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);

    const fetchSubscriptions = useCallback(async () => {
        try {
            let customerId = shopify.authenticatedAccount.customer.current?.id;

            if (!customerId) {
                customerId = await new Promise((resolve) => {
                    const unsubscribe = shopify.authenticatedAccount.customer.subscribe((customer) => {
                        if (customer?.id) {
                            unsubscribe();
                            resolve(customer.id);
                        }
                    });
                });
            }

            console.log("Customer ID from extension:", customerId);

            if (!customerId) {
                setError("Customer ID not found");
                setLoading(false);
                return [];
            }

            const token = await shopify.sessionToken.get();

            const res = await fetch(
                `${API_BASE}/api/subscriptions?customerId=${encodeURIComponent(customerId)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`API ${res.status}: ${text}`);
            }

            const data = await res.json();
            const subscriptions = data.subscriptions || [];
            setSubscriptions(subscriptions);
            return subscriptions;
        } catch (err) {
            console.error("Failed to load subscriptions", err);
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubscriptions();
    }, [fetchSubscriptions]);

    if (loading) {
        return (
            <s-page heading="Subscriptions">
                <s-section>
                    <s-text>Loading...</s-text>
                </s-section>
            </s-page>
        );
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

    async function handleSubscriptionRescheduled(subscriptionId, nextBillingDate) {
        console.log("handleSubscriptionRescheduled called", { subscriptionId, nextBillingDate });
        const updatedSubscriptions = await fetchSubscriptions();
        const updated = updatedSubscriptions.find((sub) => sub.id === subscriptionId);
        console.log("handleSubscriptionRescheduled fetched subscriptions", { updated, updatedSubscriptionsCount: updatedSubscriptions.length });
        if (updated) {
            const updatedWithDate = nextBillingDate ? { ...updated, nextBillingDate } : updated;
            setSelected(updatedWithDate);
            setSubscriptions((prev) =>
                prev.map((sub) => (sub.id === subscriptionId ? updatedWithDate : sub))
            );
            return;
        }

        if (nextBillingDate) {
            console.log("handleSubscriptionRescheduled fallback update nextBillingDate", nextBillingDate);
            setSelected((prev) =>
                prev?.id === subscriptionId ? { ...prev, nextBillingDate } : prev
            );
            setSubscriptions((prev) =>
                prev.map((sub) =>
                    sub.id === subscriptionId ? { ...sub, nextBillingDate } : sub
                )
            );
        }
    }

    if (selected) {
        return (
            <SubscriptionDetail
                subscription={selected}
                onBack={() => setSelected(null)}
                onRescheduled={handleSubscriptionRescheduled}
            />
        );
    }

    return (
        <s-page heading="Subscriptions">
            <s-section>
                {subscriptions.length === 0 ? (
                    <s-text>Aapke paas abhi koi active subscription nahi hai.</s-text>
                ) : (
                    <s-stack direction="block" gap="base">
                        {subscriptions.map((sub) => (
                            <SubscriptionCard key={sub.id} sub={sub} onClick={() => setSelected(sub)} />
                        ))}
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
                    <s-badge tone={sub.status === "ACTIVE" ? "success" : "neutral"}>
                        {sub.status}
                    </s-badge>
                    <s-stack direction="inline" gap="tight" alignItems="center">
                        <s-box inlineSize="56px" blockSize="56px" borderRadius="base" overflow="hidden">
                            <s-image src={imageUrl} alt={line?.title || "Product image"} />
                        </s-box>
                        <s-text fontWeight="bold">{line?.title ?? "Subscription"}</s-text>
                    </s-stack>
                    <s-text tone="subdued">
                        Next order: {formatShort(toDateOnlyString(sub.nextBillingDate))}
                    </s-text>
                    <s-text tone="subdued">
                        Delivery every {sub.deliveryPolicy?.intervalCount} {sub.deliveryPolicy?.interval?.toLowerCase()}
                    </s-text>
                </s-stack>
            </s-box>
        </s-clickable>
    );
}

function SubscriptionDetail({ subscription, onBack, onRescheduled }) {
    const lines = subscription.lines?.edges?.map((e) => e.node) ?? [];
    const shippingTitle = subscription.deliveryMethod?.shippingOption?.title;
    const canCancel =
        subscription.minPaymentsRequired == null ||
        subscription.paymentsCompleted >= subscription.minPaymentsRequired;

    // rescheduleDate is ALWAYS a plain "YYYY-MM-DD" string now — never a
    // Date object, never a full ISO timestamp. This is the single source of
    // truth that gets sent to the server, so there's nothing left to shift.
    const [rescheduleDate, setRescheduleDate] = useState(
        toDateOnlyString(subscription.nextBillingDate)
    );
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancelError, setCancelError] = useState(null);
    const [cancelled, setCancelled] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleError, setRescheduleError] = useState(null);
    const [rescheduled, setRescheduled] = useState(false);
    const [rescheduleAdjustedNote, setRescheduleAdjustedNote] = useState(null);
    const previousSubscriptionRef = useRef({
        id: subscription.id,
        nextBillingDate: subscription.nextBillingDate,
    });

    useEffect(() => {
        if (
            previousSubscriptionRef.current.id !== subscription.id ||
            previousSubscriptionRef.current.nextBillingDate !== subscription.nextBillingDate
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
        // Prefer real cycles from Shopify (with real cycleIndex) over
        // client-side date math, which has no way to know about reschedules,
        // skips, or which cycle indices actually exist/are editable.
        if (Array.isArray(subscription.upcomingCycles) && subscription.upcomingCycles.length > 0) {
            return subscription.upcomingCycles
                .filter((c) => !c.skipped)
                .map((c) => ({
                    dateOnly: toDateOnlyString(c.billingAttemptExpectedDate),
                    cycleIndex: c.cycleIndex,
                }));
        }

        // Fallback for contracts where the cycles query returned nothing —
        // approximate as before, but flag cycleIndex as unknown (null) so the
        // reschedule handler knows to fall back to its own default behavior.
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

    // The specific cycle the customer is targeting. Defaults to the
    // subscription's real next-billing cycle index (from the API), not a
    // hardcoded 0 — some contracts don't have an editable cycle at index 0.
    const [targetCycleIndex, setTargetCycleIndex] = useState(
        subscription.nextBillingCycleIndex ?? null
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
            // rescheduleDate is already a clean "YYYY-MM-DD" string — no
            // `new Date(...).toISOString()` round trip, so no timezone shift.
            const dateOnly = rescheduleDate;
            console.log("handleConfirmReschedule sending", { subscriptionId: subscription.id, dateOnly, billingCycleIndex: 0 });
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
            console.log("handleConfirmReschedule response", { ok: res.ok, status: res.status, data });

            if (!res.ok) {
                throw new Error(data.error || "Unable to reschedule this order right now.");
            }

            // Shopify's confirmed billing cycle is the source of truth, not the
            // date the customer picked. If Shopify adjusted it (usually due to a
            // minimum-notice/cutoff rule, or the shop's fixed billing-attempt
            // time), reflect that honestly instead of showing the requested date.
            const confirmedDate = data.billingCycle?.billingAttemptExpectedDate
                ? toDateOnlyString(data.billingCycle.billingAttemptExpectedDate)
                : dateOnly;

            setRescheduled(true);
            setRescheduleDate(confirmedDate);

            if (data.dateWasAdjusted) {
                setRescheduleAdjustedNote(
                    `The date you selected wasn't available, so your order was scheduled for the next available date instead: ${formatShort(confirmedDate)}.`
                );
                shopify.toast.show(`Scheduled for ${formatShort(confirmedDate)} (nearest available date)`);
            } else {
                shopify.toast.show(`Rescheduled to ${formatShort(confirmedDate)}`);
            }

            hideModalById("reschedule-modal");
            if (typeof onRescheduled === "function") {
                const nextBillingDate =
                    data.billingCycle?.billingAttemptExpectedDate || `${confirmedDate}T00:00:00.000Z`;
                await onRescheduled(subscription.id, nextBillingDate);
            }
        } catch (err) {
            console.error("Failed to reschedule subscription", err);
            setRescheduleError(err.message || "Unable to reschedule this order right now.");
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
                throw new Error(data.error || "Unable to cancel subscription right now.");
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

    return (
        <s-page heading="Manage subscription">
            <s-section>
                <s-button onClick={onBack} variant="tertiary">
                    ← Back
                </s-button>

                <s-stack direction="block" gap="tight">
                    <s-text tone="subdued">Status: {subscription.status}</s-text>
                </s-stack>

                <s-grid gridTemplateColumns="2fr 1fr" gap="base">
                    {/* LEFT COLUMN */}
                    <s-stack direction="block" gap="base">
                        <s-box border="base" borderRadius="base" padding="base">
                            <s-stack direction="inline" justifyContent="space-between" blockAlignment="center">
                                <s-stack direction="block" gap="tight">
                                    <s-text fontWeight="bold">Upcoming order</s-text>
                                    <s-text tone="subdued">
                                        {formatShort(rescheduleDate || toDateOnlyString(subscription.nextBillingDate))}
                                    </s-text>
                                    <s-link command="--show" commandfor="upcoming-orders-modal">
                                        Show upcoming orders
                                    </s-link>
                                </s-stack>

                                <s-button command="--show" commandfor="reschedule-modal" variant="secondary">
                                    Reschedule
                                </s-button>
                            </s-stack>
                        </s-box>

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
                                        <s-stack key={i} direction="inline" justifyContent="space-between">
                                            <s-stack direction="inline" gap="base" alignItems="center">
                                                <s-image
                                                    src={imageUrl}
                                                    alt={line?.title || "Product image"}
                                                    inlineSize="56px"
                                                    blockSize="56px"
                                                />
                                                <s-stack direction="block" gap="tight">
                                                    <s-text fontWeight="bold">{line.title}</s-text>
                                                    {line.variantTitle && <s-text tone="subdued">{line.variantTitle}</s-text>}
                                                    <s-text tone="subdued">Qty: {line.quantity}</s-text>
                                                </s-stack>
                                            </s-stack>
                                            <s-text>
                                                {line.lineDiscountedPrice?.currencyCode} {line.lineDiscountedPrice?.amount}
                                            </s-text>
                                        </s-stack>
                                    );
                                })}

                                <s-stack direction="inline" justifyContent="space-between">
                                    <s-text>Subtotal</s-text>
                                    <s-text>
                                        {subscription.currencyCode} {subscription.subtotal?.toFixed(2)}
                                    </s-text>
                                </s-stack>

                                <s-stack direction="inline" justifyContent="space-between">
                                    <s-text fontWeight="bold">Total</s-text>
                                    <s-text fontWeight="bold">
                                        {subscription.currencyCode} {subscription.subtotal?.toFixed(2)}
                                    </s-text>
                                </s-stack>
                            </s-stack>
                        </s-box>

                        <s-box border="base" borderRadius="base" padding="base">
                            <s-stack direction="block" gap="tight">
                                <s-text fontWeight="bold">Order note</s-text>
                                <s-text tone="subdued">{subscription.note || "No order note"}</s-text>
                            </s-stack>
                        </s-box>

                        {!canCancel && (
                            <s-box border="base" borderRadius="base" padding="base">
                                <s-stack direction="block" gap="tight">
                                    <s-text tone="subdued">
                                        You can't yet cancel this subscription, as you didn't yet reach the
                                        required number of payments.
                                    </s-text>
                                    <s-text>Required number of payments: {subscription.minPaymentsRequired}</s-text>
                                </s-stack>
                            </s-box>
                        )}

                        {canCancel && !cancelled && (
                            <s-stack direction="block" gap="tight">
                                <s-button variant="secondary" onClick={handleCancelSubscription} disabled={isCanceling}>
                                    {isCanceling ? "Cancelling..." : "Cancel subscription"}
                                </s-button>
                                {cancelError && <s-text tone="critical">{cancelError}</s-text>}
                            </s-stack>
                        )}

                        {cancelled && (
                            <s-box border="base" borderRadius="base" padding="base">
                                <s-text tone="success">This subscription has been cancelled.</s-text>
                            </s-box>
                        )}
                    </s-stack>
                </s-grid>
            </s-section>

            <s-modal id="reschedule-modal" heading="Reschedule next order">
                <s-stack direction="block" gap="base">
                    <s-date-picker
                        selected={rescheduleDate}
                        onChange={(e) => setRescheduleDate(toDateOnlyString(e.target.value))}
                    />
                    <s-stack direction="inline" justifyContent="end" gap="base">
                        <s-button command="--hide" commandfor="reschedule-modal" variant="tertiary">
                            Close
                        </s-button>
                        <s-button onClick={handleConfirmReschedule} variant="primary" disabled={isRescheduling}>
                            {isRescheduling ? "Saving..." : "Confirm"}
                        </s-button>
                    </s-stack>
                    {rescheduleError && <s-text tone="critical">{rescheduleError}</s-text>}
                    {rescheduled && !rescheduleAdjustedNote && (
                        <s-text tone="success">Your next order date has been updated.</s-text>
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
                                    setTargetCycleIndex(cycle.cycleIndex ?? subscription.nextBillingCycleIndex ?? null);
                                    hideModalById("upcoming-orders-modal");
                                    showModalById("reschedule-modal");
                                }}
                            >
                                Reschedule
                            </s-link>
                        </s-stack>
                    ))}
                    <s-stack direction="inline" justifyContent="end">
                        <s-button command="--hide" commandfor="upcoming-orders-modal" variant="primary">
                            Close
                        </s-button>
                    </s-stack>
                </s-stack>
            </s-modal>
        </s-page>
    );
}