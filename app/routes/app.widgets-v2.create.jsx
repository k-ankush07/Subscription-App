import { Page, TextField, Select, Tooltip, Spinner } from "@shopify/polaris";
import React, { useState, useEffect, useMemo } from "react";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

const purchaseCards = [
  {
    id: "card-1",
    variant: "simple",
    price: "Rs. 895.00",
    subPrice: "Rs. 805.50",
    discountLabel: "10% off",
    deliverEvery: "month",
  },
  {
    id: "card-2",
    variant: "detailed",
    price: "Rs. 895.00",
    subPrice: "Rs. 805.50",
    bannerLabel: "Save 10% on every delivery",
    deliverEvery: "month",
    benefits: [
      "10% of all recurring orders",
      "Lowest price option",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ],
  },
  {
    id: "card-3",
    variant: "compact",
    price: "Rs. 895.00",
    subPrice: "Rs. 805.50",
    deliverEvery: "month",
  },
];

const styles = {
  wrapper: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    flexWrap: "wrap",
    background: "#f1f1f1",
    padding: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 20,
    width: 340,
    boxSizing: "border-box",
    fontFamily: "sans-serif",
  },
  optionBoxUnselected: {
    border: "2px solid #d0d0d0",
    borderRadius: 8,
    padding: "14px 16px",
    marginBottom: 12,
    cursor: "pointer",
  },
  optionBoxSelected: {
    border: "2px solid #111",
    borderRadius: 8,
    padding: "14px 16px",
    marginBottom: 12,
    cursor: "pointer",
  },
  radioOuter: (checked) => ({
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: `2px solid ${checked ? "#111" : "#999"}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  }),
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#111",
  },
  badge: {
    background: "#eee",
    color: "#333",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 12,
    padding: "2px 10px",
    marginLeft: 8,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#111",
    color: "#fff",
    fontSize: 11,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chooseBtn: {
    width: "100%",
    background: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "12px 0",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 12,
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#555",
    fontSize: 13,
    marginTop: 4,
    cursor: "default",
  },
  productField: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    border: "1px solid #c9cccf",
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
    background: "#fff",
  },
};

// Ported from the storefront widget script (doc 3) — same text logic,
// so the admin preview matches exactly what shows on the storefront.
function buildSubscriptionDetailsText(matchedPlan) {
  if (!matchedPlan) return "";

  const DeliveryCount = matchedPlan.intervalCount;
  const DeliveryInterval = matchedPlan.interval;

  let discountText = "";
  let afterOrderSubscription = "";

  if (matchedPlan.giveSubscriptionDiscount) {
    const { discountType, discountValue } = matchedPlan;
    if (discountType === "PERCENTAGE") {
      discountText = ` | Discount: ${discountValue}%.`;
    } else if (discountType === "PRICE") {
      discountText = ` | Fixed Price: ₹${discountValue}.`;
    } else if (discountType === "FIXED_AMOUNT") {
      discountText = ` | Discount: ₹${discountValue} off.`;
    }

    if (matchedPlan.changeDiscountAfterOrders) {
      const { afterDiscountType, afterDiscountValue, afterOrders } = matchedPlan;
      if (afterDiscountType === "PERCENTAGE") {
        afterOrderSubscription = ` After ${afterOrders} Orders Discount will change to ${afterDiscountValue}%.`;
      } else if (afterDiscountType === "PRICE") {
        afterOrderSubscription = ` After ${afterOrders} Orders price will be fixed at ₹${afterDiscountValue}.`;
      } else if (afterDiscountType === "FIXED_AMOUNT") {
        afterOrderSubscription = ` After ${afterOrders} Orders price will be reduce from original price ₹${afterDiscountValue}.`;
      }
    }
  }

  let BothCombine = "";
  const MinCycle = matchedPlan.minCycles;
  const MaxCycle = matchedPlan.maxCycles;
  if (MinCycle !== null || MaxCycle !== null) {
    if (MinCycle && MaxCycle) {
      BothCombine = ` You will be able to cancel your subscription after ${MinCycle} Orders. Subscription will cancel automatically after ${MaxCycle} Orders.`;
    } else if (MinCycle) {
      BothCombine = ` You can cancel Subscription after ${MinCycle} Orders.`;
    } else if (MaxCycle) {
      BothCombine = ` Subscription will cancel automatically after ${MaxCycle} Orders.`;
    }
  }

  let ShippingDiscount = "";
  if (matchedPlan.giveShippingDiscount) {
    const { shippingDiscountType, shippingDiscountValue, shippingAfterOrders } = matchedPlan;
    if (shippingDiscountType === "PERCENTAGE") {
      ShippingDiscount = ` Delivery price will be reduced by ${shippingDiscountValue}% after ${shippingAfterOrders} Orders.`;
    } else if (shippingDiscountType === "PRICE") {
      ShippingDiscount = ` Delivery price will be fixed at ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
    } else if (shippingDiscountType === "FIXED_AMOUNT") {
      ShippingDiscount = ` Delivery price will be reduced by ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
    }
  }

  let QuantityChange = "";
  if (matchedPlan.changeQuantityAfterOrders) {
    const { quantityAfterOrdersValue, quantityAfterOrders } = matchedPlan;
    QuantityChange = ` Quantity will change ${quantityAfterOrdersValue} after ${quantityAfterOrders} Orders.`;
  }

  return `Deliver every ${DeliveryCount} ${DeliveryInterval}.${discountText}${afterOrderSubscription}${BothCombine}${ShippingDiscount}${QuantityChange}`;
}

function Widgets2() {
  const [selectedMap, setSelectedMap] = useState(
    purchaseCards.reduce((acc, c) => ({ ...acc, [c.id]: "subscribe" }), {}),
  );

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [previewingPlanId, setPreviewingPlanId] = useState("");

  const [previewingProduct, setPreviewingProduct] = useState(null);
  const [productPickerLoading, setProductPickerLoading] = useState(false);

  const select = (id, value) =>
    setSelectedMap((prev) => ({ ...prev, [id]: value }));

  // Fetch plan list for the "Previewing plan" dropdown.
  useEffect(() => {
    const shop = window.Shopify?.shop;
    async function fetchPlans() {
      try {
        const res = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
          headers: { "x-api-key": SECRET_KEY },
        });
        const data = await res.json();
        const list = data.success ? data.data : [];
        setPlans(list);
        if (list.length > 0) setPreviewingPlanId(list[0].planId);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      } finally {
        setPlansLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const selectedPlanGroup = useMemo(
    () => plans.find((p) => p.planId === previewingPlanId) || null,
    [plans, previewingPlanId],
  );

  // Preview uses the first selling plan tier of the selected group.
  const matchedSellingPlan = selectedPlanGroup?.sellingPlans?.[0] || null;

  const subscriptionDetailsText = useMemo(
    () => buildSubscriptionDetailsText(matchedSellingPlan),
    [matchedSellingPlan],
  );

  const planOptions = plans.map((p) => ({
    label: p.planName,
    value: p.planId,
  }));

  // Opens the native Shopify "Add product" resource picker.
  async function openProductPicker() {
    if (!window.shopify?.resourcePicker) {
      console.error("App Bridge resourcePicker is not available");
      return;
    }
    try {
      setProductPickerLoading(true);
      const selected = await window.shopify.resourcePicker({
        type: "product",
        multiple: false,
        action: "select",
      });
      if (selected && selected.length > 0) {
        setPreviewingProduct(selected[0]);
      }
    } catch (err) {
      // user cancelled the picker or an error occurred
      console.error("resourcePicker error:", err);
    } finally {
      setProductPickerLoading(false);
    }
  }

  return (
    <Page title="Choose a template">
      <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
        <div>
          <h1>Previewing plan</h1>
          {plansLoading ? (
            <Spinner size="small" />
          ) : (
            <Select
              label=""
              labelHidden
              options={planOptions}
              value={previewingPlanId}
              onChange={(value) => setPreviewingPlanId(value)}
              placeholder="Select a plan"
            />
          )}
        </div>

        <div>
          <h1>Previewing product:</h1>
          <div style={styles.productField} onClick={openProductPicker}>
            <span>
              {productPickerLoading
                ? "Loading..."
                : previewingProduct?.title || "Select a product"}
            </span>
            <span>⌄</span>
          </div>
        </div>
      </div>

      <div style={styles.wrapper}>
        {purchaseCards.map((data) => {
          const selected = selectedMap[data.id];

          const detailsTooltip = subscriptionDetailsText ? (
            <Tooltip content={subscriptionDetailsText} dismissOnMouseOut>
              <div style={styles.infoRow}>ⓘ Subscription details</div>
            </Tooltip>
          ) : (
            <div style={styles.infoRow}>ⓘ Subscription details</div>
          );

          if (data.variant === "simple") {
            return (
              <div key={data.id} style={styles.card}>
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: 1,
                    marginBottom: 16,
                    borderBottom: "1px solid #ddd",
                    paddingBottom: 10,
                  }}
                >
                  PURCHASE OPTIONS
                </div>

                <div
                  style={
                    selected === "onetime"
                      ? styles.optionBoxSelected
                      : styles.optionBoxUnselected
                  }
                  onClick={() => select(data.id, "onetime")}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={styles.radioOuter(selected === "onetime")}>
                        {selected === "onetime" && <span style={styles.radioInner} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        One time purchase
                      </span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{data.price}</span>
                  </div>
                </div>

                <div
                  style={
                    selected === "subscribe"
                      ? styles.optionBoxSelected
                      : styles.optionBoxUnselected
                  }
                  onClick={() => select(data.id, "subscribe")}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <span style={styles.radioOuter(selected === "subscribe")}>
                      {selected === "subscribe" && <span style={styles.radioInner} />}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      Subscribe & save
                    </span>
                    <span style={styles.badge}>{data.discountLabel}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingLeft: 32,
                    }}
                  >
                    <span style={{ color: "#555" }}>
                      Deliver every {data.deliverEvery}
                    </span>
                    <span style={{ fontWeight: 700 }}>{data.subPrice}</span>
                  </div>
                </div>

                {selected !== "onetime" && detailsTooltip}
                <button style={styles.chooseBtn}>Choose</button>
              </div>
            );
          }

          if (data.variant === "detailed") {
            return (
              <div key={data.id} style={styles.card}>
                <div
                  style={
                    selected === "onetime"
                      ? styles.optionBoxSelected
                      : styles.optionBoxUnselected
                  }
                  onClick={() => select(data.id, "onetime")}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={styles.radioOuter(selected === "onetime")}>
                        {selected === "onetime" && <span style={styles.radioInner} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        One time purchase
                      </span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{data.price}</span>
                  </div>
                </div>

                <div
                  style={{
                    background: "#e8e8e8",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "8px 0",
                    borderRadius: "8px 8px 0 0",
                    border: `2px solid ${selected === "subscribe" ? "#111" : "#d0d0d0"}`,
                    borderBottom: "none",
                  }}
                >
                  {data.bannerLabel}
                </div>

                <div
                  style={{
                    border: `2px solid ${selected === "subscribe" ? "#111" : "#d0d0d0"}`,
                    borderRadius: "0 0 8px 8px",
                    padding: 16,
                    marginBottom: 12,
                    cursor: "pointer",
                  }}
                  onClick={() => select(data.id, "subscribe")}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={styles.radioOuter(selected === "subscribe")}>
                        {selected === "subscribe" && <span style={styles.radioInner} />}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>
                        Subscribe & save
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          background: "#eee",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: 4,
                        }}
                      >
                        {data.subPrice}
                      </div>
                      <div
                        style={{
                          color: "#999",
                          textDecoration: "line-through",
                          fontSize: 13,
                          marginTop: 2,
                        }}
                      >
                        {data.price}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 10 }}>
                    How subscriptions work:
                  </div>
                  {data.benefits.map((b, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span style={styles.checkCircle}>✓</span>
                      <span>{b}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      textAlign: "right",
                      color: "#333",
                      fontSize: 14,
                      marginTop: 8,
                    }}
                  >
                    Deliver every:
                    <br />
                    {data.deliverEvery}
                  </div>
                </div>

                {selected !== "onetime" && detailsTooltip}
                <button style={styles.chooseBtn}>Choose</button>
              </div>
            );
          }

          const checked = selected === "subscribe";
          return (
            <div key={data.id} style={{ ...styles.card, width: 300 }}>
              <div
                style={{
                  border: "2px dashed #bbb",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  cursor: "pointer",
                }}
                onClick={() => select(data.id, checked ? "none" : "subscribe")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: checked ? "#111" : "#fff",
                      border: checked ? "none" : "2px solid #999",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {checked && "✓"}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      Subscribe & save{" "}
                      <span
                        style={{
                          color: "#999",
                          textDecoration: "line-through",
                          fontWeight: 400,
                          fontSize: 14,
                        }}
                      >
                        {data.price}
                      </span>{" "}
                      <span style={{ fontWeight: 700 }}>{data.subPrice}</span>
                    </div>
                    <div style={{ color: "#555", marginTop: 6 }}>
                      Deliver every: {data.deliverEvery}
                    </div>
                  </div>
                </div>
              </div>
              {detailsTooltip}
              <button style={styles.chooseBtn}>Choose</button>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export default Widgets2;