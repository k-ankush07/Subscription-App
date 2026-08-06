import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";

const API_BASE = "https://patrol-miscellaneous-tunes-gnu.trycloudflare.com";
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
        <s-box inlineSize="60px" blockSize="20px" borderRadius="base" background="subdued" />
        <s-stack direction="inline" gap="tight" alignItems="center">
          <s-box inlineSize="56px" blockSize="56px" borderRadius="base" background="subdued" />
          <s-box inlineSize="140px" blockSize="16px" borderRadius="base" background="subdued" />
        </s-stack>
        <s-box inlineSize="120px" blockSize="14px" borderRadius="base" background="subdued" />
        <s-box inlineSize="160px" blockSize="14px" borderRadius="base" background="subdued" />
      </s-stack>
    </s-box>
  );
}

function Extension() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

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

  if (selected) {
    return <SubscriptionDetail subscription={selected} />;
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

function SubscriptionDetail({ subscription }) {
  function handleBack() {
    shopify.navigation.navigate("extension:/", {
      history: "push",
    });
  }

  const lines = subscription.lines?.edges?.map((e) => e.node) ?? [];
  const shippingTitle = subscription.deliveryMethod?.shippingOption?.title;

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
            <s-box border="base" borderRadius="base" padding="base">
              <s-stack
                direction="inline"
                justifyContent="space-between"
                blockAlignment="center"
              >
                <s-stack direction="block" gap="tight">
                  <s-text fontWeight="bold">Upcoming order</s-text>
                  <s-text tone="subdued">
                    {formatShort(toDateOnlyString(subscription.nextBillingDate))}
                  </s-text>
                </s-stack>
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
                    <s-stack
                      key={i}
                      direction="inline"
                      justifyContent="space-between"
                    >
                      <s-stack direction="inline" gap="base" alignItems="center">
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
          </s-stack>
        </s-grid>
      </s-section>
    </s-page>
  );
}