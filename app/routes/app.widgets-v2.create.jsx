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

// When a plan has multiple delivery frequencies, list them here.
// Each frequency has its own discount + price. If a card only has
// ONE frequency, this array will just have a single entry and the
// UI automatically falls back to the old single-row / static-label look.
const frequencyOptions = [
  {
    value: "1w",
    label: "week",
    discountLabel: "10% off",
    subPrice: "Rs. 535.50",
  },
  {
    value: "5w",
    label: "5 weeks",
    discountLabel: "70% off",
    subPrice: "Rs. 178.50",
  },
];

const purchaseCards = [
  {
    id: "card-1",
    variant: "simple",
    headerLabel: "PURCHASE OPTIONS",
    price: "Rs. 595.00",
    frequencyOptions,
  },
  {
    id: "card-2",
    variant: "detailed",
    price: "Rs. 595.00",
    benefits: [
      "10% of all recurring orders",
      "Lowest price option",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ],
    frequencyOptions,
  },
  {
    id: "card-3",
    variant: "compact",
    price: "Rs. 595.00",
    frequencyOptions,
  },
];

const styles = {
  wrapper: {
    display: "flex",
    gap: 20,
    alignItems: "stretch",
    flexWrap: "nowrap",
    background: "#f1f1f1",
    padding: 24,
  },

  card: {
    background: "#fff",
    borderRadius: 8,
    padding: 24,
    flex: 1,
    minWidth: 0,
    boxSizing: "border-box",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
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
    fontSize: 15,
    color: "#100e0e",
    whiteSpace: "nowrap",
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

  freqSelect: {
    border: "1px solid #ccc",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 14,
    fontFamily: "sans-serif",
    background: "#fff",
    cursor: "pointer",
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

  const [selectedMap, setSelectedMap] = useState(
    purchaseCards.reduce(
      (acc, c) => ({
        ...acc,
        [c.id]: "subscribe",
      }),
      {},
    ),
  );

  const [frequencyMap, setFrequencyMap] = useState(
    purchaseCards.reduce(
      (acc, c) => ({
        ...acc,
        [c.id]: c.frequencyOptions?.[0]?.value || null,
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

  const selectFrequency = (id, value) => {
    setFrequencyMap((prev) => ({
      ...prev,
      [id]: value,
    }));
    // picking a frequency implies the subscribe option is chosen
    select(id, "subscribe");
  };

  const getFrequency = (data, id) =>
    data.frequencyOptions?.find((f) => f.value === frequencyMap[id]) ||
    data.frequencyOptions?.[0];

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
          const freq = getFrequency(data, data.id);
          const hasMultipleFrequencies = (data.frequencyOptions || []).length > 1;

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
                          fontSize: 18,
                        }}
                      >
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
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 18,
                      marginBottom: hasMultipleFrequencies ? 12 : 0,
                    }}
                  >
                    Subscribe & save
                  </div>

                  {hasMultipleFrequencies ? (
                    data.frequencyOptions.map((f, index) => {
                      const isSelected =
                        selected === "subscribe" &&
                        frequencyMap[data.id] === f.value;
                      const isLast =
                        index === data.frequencyOptions.length - 1;

                      return (
                        <div
                          key={f.value}
                          onClick={() => selectFrequency(data.id, f.value)}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            marginBottom: isLast ? 0 : 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <span style={styles.radioOuter(isSelected)}>
                              {isSelected && (
                                <span style={styles.radioInner} />
                              )}
                            </span>

                            <span>Deliver every {f.label}</span>

                            <span style={styles.badge}>
                              {f.discountLabel}
                            </span>
                          </div>

                          <span style={{ fontWeight: 700 }}>
                            {f.subPrice}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => select(data.id, "subscribe")}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span
                          style={styles.radioOuter(selected === "subscribe")}
                        >
                          {selected === "subscribe" && (
                            <span style={styles.radioInner} />
                          )}
                        </span>

                        <span>Deliver every {freq?.label}</span>

                        <span style={styles.badge}>{freq?.discountLabel}</span>
                      </div>

                      <span style={{ fontWeight: 700 }}>{freq?.subPrice}</span>
                    </div>
                  )}
                </div>

                {checked && (
                  <div style={styles.infoRow}>Subscription details</div>
                )}

                <div style={{ marginTop: "auto" }}>
                  <Button variant="primary" fullWidth>
                    Choose
                  </Button>
                </div>
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
                          fontSize: 18,
                        }}
                      >
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
                  }}
                >
                  Save {freq?.discountLabel} on every delivery
                </div>

                <div
                  style={{
                    border: `2px solid ${
                      selected === "subscribe" ? "#111" : "#d0d0d0"
                    }`,
                    borderRadius: "  0 0 8px 8px",
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
                          fontSize: 18,
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
                        {freq?.subPrice}
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
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 6,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              style={{
                                color: "#333",
                                fontSize: 14,
                                whiteSpace: "nowrap",
                              }}
                            >
                              Deliver every:
                            </span>

                            {hasMultipleFrequencies ? (
                              <select
                                style={styles.freqSelect}
                                value={frequencyMap[data.id]}
                                onChange={(e) =>
                                  selectFrequency(data.id, e.target.value)
                                }
                              >
                                {data.frequencyOptions.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ whiteSpace: "nowrap" }}>
                                {freq?.label}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected !== "onetime" && (
                  <div style={styles.infoRow}>Subscription details</div>
                )}

                <div style={{ marginTop: "auto" }}>
                  <Button variant="primary" fullWidth>
                    Choose
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={data.id} style={styles.card}>
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

                  <div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
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
                      <span style={{ fontWeight: 700 }}>{freq?.subPrice}</span>
                    </div>

                    <div
                      style={{
                        color: "#555",
                        marginTop: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Deliver every:</span>

                      {hasMultipleFrequencies ? (
                        <select
                          style={styles.freqSelect}
                          value={frequencyMap[data.id]}
                          onChange={(e) =>
                            selectFrequency(data.id, e.target.value)
                          }
                        >
                          {data.frequencyOptions.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{freq?.label}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {checked && (
                <div style={styles.infoRow}>Subscription details</div>
              )}

              <div style={{ marginTop: "auto" }}>
                <Button variant="primary" fullWidth>
                  Choose
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

export default Widgets2;