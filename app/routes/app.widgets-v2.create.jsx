import { Button, Page, Select } from "@shopify/polaris";
import React, { useMemo, useState } from "react";
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

  return Response.json({
    plans: plansData.success ? plansData.data : [],
  });
};

// NOTE: each card now has a `plans` array instead of a single
// price/subPrice/deliverEvery — this is what lets one card offer
// multiple delivery frequencies (e.g. "week" / "5 weeks").
const purchaseCards = [
  {
    id: "card-1",
    variant: "simple",
    headerLabel: "PURCHASE OPTIONS",
    onetimePrice: "Rs. 595.00",
    plans: [
      {
        id: "week",
        label: "Deliver every week",
        discountLabel: "10% off",
        price: "Rs. 535.50",
      },
      {
        id: "5weeks",
        label: "Deliver every 5 weeks",
        discountLabel: "70% off",
        price: "Rs. 178.50",
      },
    ],
  },
  {
    id: "card-2",
    variant: "detailed",
    onetimePrice: "Rs. 595.00",
    bannerLabel: "Save 10% on every delivery",
    benefits: [
      "10% of all recurring orders",
      "Lowest price option",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ],
    plans: [
      {
        id: "week",
        label: "week",
        price: "Rs. 535.50",
        comparePrice: "Rs. 595.00",
      },
      {
        id: "5weeks",
        label: "5 weeks",
        price: "Rs. 178.50",
        comparePrice: "Rs. 595.00",
      },
    ],
  },
  {
    id: "card-3",
    variant: "compact",
    plans: [
      {
        id: "week",
        label: "week",
        price: "Rs. 535.50",
        comparePrice: "Rs. 595.00",
      },
      {
        id: "5weeks",
        label: "5 weeks",
        price: "Rs. 178.50",
        comparePrice: "Rs. 595.00",
      },
    ],
  },
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

  // onetime vs subscribe, per card
  const [selectedMap, setSelectedMap] = useState(
    purchaseCards.reduce(
      (acc, c) => ({
        ...acc,
        [c.id]: "subscribe",
      }),
      {},
    ),
  );

  // which delivery-frequency plan is chosen, per card
  const [selectedPlanMap, setSelectedPlanMap] = useState(
    purchaseCards.reduce(
      (acc, c) => ({
        ...acc,
        [c.id]: c.plans?.[0]?.id || null,
      }),
      {},
    ),
  );

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