import { Button, Page, Select } from "@shopify/polaris";
import React, { useEffect, useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
    headers: { "x-api-key": SECRET_KEY },
  });

  const plansData = await plansResponse.json();

  // We keep the FULL plan-group objects here (not just id/name) because the
  // widget now needs each group's `sellingPlans` array + `products` array to
  // build the purchase cards on the client.
  return Response.json({
    plans: plansData.success ? plansData.data : [],
  });
};

// ---------------------------------------------------------------------------
// Helpers: turn raw sellingPlan objects (as returned by the API) into the
// price / label strings the UI needs. This replaces the old hardcoded
// `purchaseCards[].plans` arrays.
// ---------------------------------------------------------------------------

const CURRENCY_PREFIX = "Rs. ";

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return `${CURRENCY_PREFIX}${n.toFixed(2)}`;
}

// NOTE / ASSUMPTION: your sample plan-group JSON has a `products` array but
// didn't show its shape, so I'm reading the base price off
// `products[0].price`. If your API names that field differently
// (e.g. `variantPrice`, `amount`, `compareAtPrice`), change this one line.
function getBasePrice(planGroup) {
  const product = planGroup?.products?.[0];
  return Number(product?.price ?? product?.variantPrice ?? product?.amount ?? 0);
}

function intervalUnit(interval, count) {
  const unit = String(interval || "").toLowerCase(); // day | week | month | year
  return count > 1 ? `${unit}s` : unit;
}

// "every week" / "every 5 weeks"
function deliveryPhrase(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);
  return count > 1 ? `every ${count} ${unit}` : `every ${unit}`;
}

// "week" / "5 weeks" — used by the detailed & compact card variants
function shortDeliveryLabel(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);
  return count > 1 ? `${count} ${unit}` : unit;
}

function discountLabelFor(sp) {
  if (!sp.giveSubscriptionDiscount) return undefined;
  if (sp.discountType === "PERCENTAGE") return `${sp.discountValue}% off`;
  if (sp.discountValue) return `${formatMoney(sp.discountValue)} off`;
  return undefined;
}

function computeSellingPlanPrice(basePrice, sp) {
  if (!sp.giveSubscriptionDiscount) return basePrice;
  if (sp.discountType === "PERCENTAGE") {
    return basePrice - (basePrice * sp.discountValue) / 100;
  }
  // Flat/PRICE style discount
  return Math.max(basePrice - sp.discountValue, 0);
}

// Normalizes one API sellingPlan into everything every card variant needs.
function normalizeSellingPlan(sp, basePrice) {
  const price = computeSellingPlanPrice(basePrice, sp);

  return {
    id: sp.shopifySellingPlanId,
    name: sp.name,
    label: `Deliver ${deliveryPhrase(sp)}`, // simple variant
    shortLabel: shortDeliveryLabel(sp), // detailed / compact variant
    discountLabel: discountLabelFor(sp),
    price: formatMoney(price),
    comparePrice: formatMoney(basePrice),
    raw: sp,
  };
}

// Static, UI-only info per card (layout, copy that isn't plan-specific).
// This is the ONLY hardcoded thing left — everything price/plan related now
// comes from the API.
const cardShells = [
  { id: "card-1", variant: "simple", headerLabel: "PURCHASE OPTIONS" },
  {
    id: "card-2",
    variant: "detailed",
    benefitsTemplate: [
      "Lowest price option",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ],
  },
  { id: "card-3", variant: "compact" },
];

const styles = {
  wrapper: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
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

  headerWithLines: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  headerLine: {
    flex: 1,
    height: 2,
    background: "#c4c1c1",
  },

  headerText: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#100e0e",
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
  },
};

function Widgets2() {
  const { plans } = useLoaderData();

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        label: p.planName,
        value: p.planId,
      })),
    [plans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState(
    planOptions[0]?.value || "",
  );

  // The full plan-group object (with sellingPlans + products) for whichever
  // plan is currently being previewed in the "Previewing plan" dropdown.
  const selectedPlanGroup = useMemo(
    () => plans.find((p) => p.planId === selectedPlanId) || plans[0],
    [plans, selectedPlanId],
  );

  const basePrice = useMemo(
    () => getBasePrice(selectedPlanGroup),
    [selectedPlanGroup],
  );

  // TEMP DEBUG — remove once basePrice is coming through correctly.
  // Open the browser console and check what `products[0]` actually looks
  // like, then update getBasePrice() to read the right field.
  useEffect(() => {
    if (selectedPlanGroup) {
      console.log("selectedPlanGroup.products:", selectedPlanGroup.products);
      console.log("computed basePrice:", basePrice);
    }
  }, [selectedPlanGroup, basePrice]);

  // Raw API sellingPlans -> normalized { id, label, shortLabel, price, ... }
  const normalizedPlans = useMemo(() => {
    if (!selectedPlanGroup?.sellingPlans) return [];
    return selectedPlanGroup.sellingPlans.map((sp) =>
      normalizeSellingPlan(sp, basePrice),
    );
  }, [selectedPlanGroup, basePrice]);

  // purchaseCards is now DERIVED from the API response every time the
  // previewed plan changes, instead of being a hardcoded constant.
  const purchaseCards = useMemo(() => {
    const topDiscount = normalizedPlans.find((p) => p.discountLabel);

    return cardShells.map((shell) => {
      const base = {
        id: shell.id,
        variant: shell.variant,
        onetimePrice: formatMoney(basePrice),
      };

      if (shell.variant === "simple") {
        return {
          ...base,
          headerLabel: shell.headerLabel,
          plans: normalizedPlans.map((p) => ({
            id: p.id,
            label: p.label,
            discountLabel: p.discountLabel,
            price: p.price,
          })),
        };
      }

      if (shell.variant === "detailed") {
        const benefits = [
          topDiscount
            ? `${topDiscount.discountLabel} of all recurring orders`
            : "Discount on all recurring orders",
          ...shell.benefitsTemplate,
        ];

        return {
          ...base,
          bannerLabel: topDiscount
            ? `Save ${topDiscount.discountLabel.replace(" off", "")} on every delivery`
            : "Subscribe & save on every delivery",
          benefits,
          plans: normalizedPlans.map((p) => ({
            id: p.id,
            label: p.shortLabel,
            price: p.price,
            comparePrice: p.comparePrice,
          })),
        };
      }

      // compact
      return {
        ...base,
        plans: normalizedPlans.map((p) => ({
          id: p.id,
          label: p.shortLabel,
          price: p.price,
          comparePrice: p.comparePrice,
        })),
      };
    });
  }, [normalizedPlans, basePrice]);

  // onetime vs subscribe, per card
  const [selectedMap, setSelectedMap] = useState({});

  // which delivery-frequency plan is chosen, per card
  const [selectedPlanMap, setSelectedPlanMap] = useState({});

  // Whenever the previewed plan (or the cards derived from it) changes,
  // reset each card back to "subscribe" + its first sellingPlan, since the
  // old selected sellingPlan id almost certainly no longer exists.
  useEffect(() => {
    setSelectedMap(
      purchaseCards.reduce((acc, c) => ({ ...acc, [c.id]: "subscribe" }), {}),
    );
    setSelectedPlanMap(
      purchaseCards.reduce(
        (acc, c) => ({ ...acc, [c.id]: c.plans?.[0]?.id || null }),
        {},
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanGroup]);

  const select = (id, value) => {
    setSelectedMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const selectPlan = (id, planId) => {
    setSelectedPlanMap((prev) => ({
      ...prev,
      [id]: planId,
    }));
  };

  const getSelectedPlan = (data) =>
    data.plans?.find((p) => p.id === selectedPlanMap[data.id]) ||
    data.plans?.[0];

  return (
    <Page title="Choose a template">
      <div
        style={{
          display: "flex",
        }}
      >
        <div style={{ minWidth: "260px" }}>
          <h1>Previewing plan</h1>

          <Select
            label=""
            labelHidden
            options={planOptions}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
          />
        </div>
      </div>

      <div style={styles.wrapper}>
        {purchaseCards.map((data) => {
          const selected = selectedMap[data.id];
          const checked = selected === "subscribe";
          const activePlan = getSelectedPlan(data);

          if (data.variant === "simple") {
            return (
              <div key={data.id} style={styles.card}>
                {data.headerLabel && (
                  <div style={styles.headerWithLines}>
                    <span style={styles.headerLine} />
                    <span style={styles.headerText}>{data.headerLabel}</span>
                    <span style={styles.headerLine} />
                  </div>
                )}

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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={styles.radioOuter(selected === "onetime")}>
                        {selected === "onetime" && (
                          <span style={styles.radioInner} />
                        )}
                      </span>

                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        One time purchase
                      </span>
                    </div>

                    <span style={{ fontWeight: 600 }}>
                      {data.onetimePrice}
                    </span>
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
                      fontWeight: 700,
                      fontSize: 16,
                      marginBottom: 12,
                    }}
                  >
                    Subscribe & save
                  </div>

                  {data.plans.map((plan) => {
                    const planChecked =
                      selected === "subscribe" && activePlan?.id === plan.id;

                    return (
                      <div
                        key={plan.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingLeft: 4,
                          marginBottom: 10,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          select(data.id, "subscribe");
                          selectPlan(data.id, plan.id);
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <span style={styles.radioOuter(planChecked)}>
                            {planChecked && (
                              <span style={styles.radioInner} />
                            )}
                          </span>

                          <span>{plan.label}</span>

                          {plan.discountLabel && (
                            <span style={styles.badge}>
                              {plan.discountLabel}
                            </span>
                          )}
                        </div>

                        <span style={{ fontWeight: 700 }}>{plan.price}</span>
                      </div>
                    );
                  })}
                </div>

                {checked && (
                  <div style={styles.infoRow}>Subscription details</div>
                )}

                <Button variant="primary" fullWidth>
                  Choose
                </Button>
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={styles.radioOuter(selected === "onetime")}>
                        {selected === "onetime" && (
                          <span style={styles.radioInner} />
                        )}
                      </span>

                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
                        One time purchase
                      </span>
                    </div>

                    <span style={{ fontWeight: 600 }}>
                      {data.onetimePrice}
                    </span>
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
                  }}
                >
                  {data.bannerLabel}
                </div>

                <div
                  style={{
                    border: `2px solid ${
                      selected === "subscribe" ? "#111" : "#d0d0d0"
                    }`,
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
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={styles.radioOuter(selected === "subscribe")}>
                        {selected === "subscribe" && (
                          <span style={styles.radioInner} />
                        )}
                      </span>

                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                        }}
                      >
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
                        {activePlan?.price}
                      </div>

                      {activePlan?.comparePrice && (
                        <div
                          style={{
                            color: "#999",
                            textDecoration: "line-through",
                            fontSize: 13,
                            marginTop: 2,
                          }}
                        >
                          {activePlan.comparePrice}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      marginTop: 16,
                      marginBottom: 10,
                    }}
                  >
                    How subscriptions work:
                  </div>

                  {data.benefits.map((benefit, index) => {
                    const isLast = index === data.benefits.length - 1;

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: isLast
                            ? "space-between"
                            : "flex-start",
                          gap: 10,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 10,
                          }}
                        >
                          <span style={styles.checkCircle}>✓</span>

                          <span>{benefit}</span>
                        </div>

                        {isLast && (
                          <div
                            style={{ width: 130 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                color: "#333",
                                marginBottom: 4,
                              }}
                            >
                              Deliver every:
                            </div>

                            <Select
                              label=""
                              labelHidden
                              options={data.plans.map((p) => ({
                                label: p.label,
                                value: p.id,
                              }))}
                              value={selectedPlanMap[data.id]}
                              onChange={(value) => {
                                select(data.id, "subscribe");
                                selectPlan(data.id, value);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected !== "onetime" && (
                  <div style={styles.infoRow}>Subscription details</div>
                )}

                <Button variant="primary" fullWidth>
                  Choose
                </Button>
              </div>
            );
          }

          // compact variant
          return (
            <div
              key={data.id}
              style={{
                ...styles.card,
                width: 300,
              }}
            >
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
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

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      Subscribe & save{" "}
                      {activePlan?.comparePrice && (
                        <span
                          style={{
                            color: "#999",
                            textDecoration: "line-through",
                            fontWeight: 400,
                            fontSize: 14,
                          }}
                        >
                          {activePlan.comparePrice}
                        </span>
                      )}{" "}
                      <span style={{ fontWeight: 700 }}>
                        {activePlan?.price}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 8,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span style={{ color: "#555" }}>Deliver every:</span>

                      <div style={{ width: 110 }}>
                        <Select
                          label=""
                          labelHidden
                          options={data.plans.map((p) => ({
                            label: p.label,
                            value: p.id,
                          }))}
                          value={selectedPlanMap[data.id]}
                          onChange={(value) => {
                            select(data.id, "subscribe");
                            selectPlan(data.id, value);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {checked && (
                <div style={styles.infoRow}>Subscription details</div>
              )}

              <Button variant="primary" fullWidth>
                Choose
              </Button>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export default Widgets2;