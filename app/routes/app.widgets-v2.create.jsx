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

const purchaseCards = [
  {
    id: "card-1",
    variant: "simple",
    headerLabel: "PURCHASE OPTIONS", 
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
    () => plans.map((p) => ({
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

  const select = (id, value) => {
    setSelectedMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

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

          if (data.variant === "simple") {
            return (
              <div key={data.id} style={styles.card}>
                {data.headerLabel && (
                  <div style={styles.headerWithLines}>
                    <span style={styles.headerLine} />
                    <span style={styles.headerText}>
                      {data.headerLabel}
                    </span>
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
                      <span
                        style={styles.radioOuter(selected === "onetime")}
                      >
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
                      {data.price}
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
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={styles.radioOuter(selected === "subscribe")}
                    >
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

                    <span style={styles.badge}>
                      {data.discountLabel}
                    </span>
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

                    <span style={{ fontWeight: 700 }}>
                      {data.subPrice}
                    </span>
                  </div>
                </div>

                {selected !== "onetime" && (
                  <div style={styles.infoRow}>
                    Subscription details
                  </div>
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
                      <span
                        style={styles.radioOuter(selected === "onetime")}
                      >
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
                      {data.price}
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
                      selected === "subscribe"
                        ? "#111"
                        : "#d0d0d0"
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
                      <span
                        style={styles.radioOuter(
                          selected === "subscribe",
                        )}
                      >
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
                          <span style={styles.checkCircle}>
                            ✓
                          </span>

                          <span>{benefit}</span>
                        </div>

                        {isLast && (
                          <span
                            style={{
                              color: "#333",
                              fontSize: 14,
                              textAlign: "right",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Deliver every:
                            <br />
                            {data.deliverEvery}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selected !== "onetime" && (
                  <div style={styles.infoRow}>
                    Subscription details
                  </div>
                )}

                 <Button variant="primary" fullWidth>
                        Choose
                      </Button>
              </div>
            );
          }
          const checked = selected === "subscribe";

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
                onClick={() =>
                  select(
                    data.id,
                    checked ? "none" : "subscribe",
                  )
                }
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
                      border: checked
                        ? "none"
                        : "2px solid #999",
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
                        fontSize: 16,
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

                      <span style={{ fontWeight: 700 }}>
                        {data.subPrice}
                      </span>
                    </div>

                    <div
                      style={{
                        color: "#555",
                        marginTop: 6,
                      }}
                    >
                      Deliver every: {data.deliverEvery}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.infoRow}>
                Subscription details
              </div>

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