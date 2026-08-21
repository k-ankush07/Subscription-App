

import { Button, Page, Select } from "@shopify/polaris";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { currencySymbol } from "./utils/formatMoney.js";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
    headers: {
      "x-api-key": SECRET_KEY,
    },
  });

  const plansData = await plansResponse.json();

  let currencyCode = "USD";

  try {
    const shopResponse = await admin.graphql(`
      {
        shop {
          currencyCode
        }
      }
    `);

    const shopJson = await shopResponse.json();

    currencyCode = shopJson?.data?.shop?.currencyCode || currencyCode;
  } catch (err) {
    console.error("Failed to fetch shop currencyCode:", err);
  }

  const plans = plansData.success ? plansData.data : [];

  
  const productIds = [
    ...new Set(
      plans.flatMap((plan) =>
        (plan.products || []).map((product) => product.id).filter(Boolean),
      ),
    ),
  ];

 
  const productPrices = {};

  for (const productId of productIds) {
    try {
      const productResponse = await admin.graphql(
        `#graphql
        query ProductPrice($id: ID!) {
          product(id: $id) {
            id
            title

            featuredImage {
              url
            }

            variants(first: 1) {
              nodes {
                price
              }
            }

            priceRangeV2 {
              minVariantPrice {
                amount
              }
            }
          }
        }`,
        {
          variables: {
            id: productId,
          },
        },
      );

      const productJson = await productResponse.json();

      const product = productJson?.data?.product;

      if (product) {
        const variantPrice = product?.variants?.nodes?.[0]?.price;

        const minPrice = product?.priceRangeV2?.minVariantPrice?.amount;

        productPrices[product.id] = {
          price: Number(variantPrice ?? minPrice ?? 0),
          image: product?.featuredImage?.url || null,
          title: product?.title || "",
        };
      }
    } catch (error) {
      console.error("Failed to fetch Shopify product:", productId, error);
    }
  }


  const updatedPlans = plans.map((plan) => ({
    ...plan,

    products: (plan.products || []).map((product) => {
      const shopifyProduct = productPrices[product.id];

      return {
        ...product,

        price:
          shopifyProduct?.price ?? product?.price ?? product?.minPrice ?? 0,

        ProductImage: shopifyProduct?.image ?? product?.ProductImage ?? null,

        title: shopifyProduct?.title ?? product?.title ?? "",
      };
    }),
  }));

  return Response.json({
    plans: updatedPlans,
    currencyCode,
  });
};

function formatMoney(amount, currencyCode) {
  const n = Number(amount) || 0;

  return `${currencySymbol(currencyCode)}${n.toFixed(2)}`;
}

function intervalUnit(interval, count) {
  const unit = String(interval || "").toLowerCase();

  return count > 1 ? `${unit}s` : unit;
}

function deliveryPhrase(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);

  return count > 1 ? `every ${count} ${unit}` : `every ${unit}`;
}

function shortDeliveryLabel(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);

  return count > 1 ? `${count} ${unit}` : unit;
}

function discountLabelFor(sp, currencyCode) {
  if (!sp.giveSubscriptionDiscount) {
    return undefined;
  }

  if (sp.discountType === "PERCENTAGE") {
    return `${sp.discountValue}% off`;
  }

  if (sp.discountValue) {
    return `${formatMoney(sp.discountValue, currencyCode)} off`;
  }

  return undefined;
}

function computeSellingPlanPrice(basePrice, sp) {
  if (!sp.giveSubscriptionDiscount) {
    return basePrice;
  }

  if (sp.discountType === "PERCENTAGE") {
    return basePrice - (basePrice * Number(sp.discountValue || 0)) / 100;
  }

  return Math.max(basePrice - Number(sp.discountValue || 0), 0);
}

function normalizeSellingPlan(sp, basePrice, currencyCode) {
  const price = computeSellingPlanPrice(basePrice, sp);

  return {
    id: sp.shopifySellingPlanId,
    name: sp.name,

    label: `Deliver ${deliveryPhrase(sp)}`,

    shortLabel: shortDeliveryLabel(sp),

    discountLabel: discountLabelFor(sp, currencyCode),

    price: formatMoney(price, currencyCode),

    comparePrice: formatMoney(basePrice, currencyCode),

    raw: sp,
  };
}

const cardShells = [
  {
    id: "card-1",
    variant: "simple",
    headerLabel: "PURCHASE OPTIONS",
  },

  {
    id: "card-2",
    variant: "detailed",

    benefitsTemplate: [
      "Lowest price option",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ],
  },

  {
    id: "card-3",
    variant: "compact",
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

  productPickerField: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    border: "1px solid #c9cccf",
    borderRadius: 8,
    padding: "8px 12px",
    cursor: "pointer",
    background: "#fff",
    minWidth: 220,
  },

  productPickerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 14,
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
  const { plans, currencyCode } = useLoaderData();

  const shopify = useAppBridge();
  const navigate= useNavigate()
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

  const selectedPlanGroup = useMemo(
    () => plans.find((p) => p.planId === selectedPlanId) || plans[0],
    [plans, selectedPlanId],
  );

  const [previewProduct, setPreviewProduct] = useState(null);

 
  useEffect(() => {
    const first = selectedPlanGroup?.products?.[0];

    if (!first) {
      setPreviewProduct(null);
      return;
    }

    const price = Number(
      first?.price ??
        first?.minPrice ??
        first?.priceRangeV2?.minVariantPrice?.amount ??
        0,
    );

    setPreviewProduct({
      id: first.id,
      title: first.title,
      image: first.ProductImage,
      price,
    });
  }, [selectedPlanGroup]);

 
  const handlePickPreviewProduct = useCallback(async () => {
    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: false,
      action: "select",

      filter: {
        variants: false,
      },
    });

    if (selected && selected[0]) {
      const product = selected[0];

      const variant = product.variants?.[0];

      const price = Number(
        variant?.price ??
          product.priceRangeV2?.minVariantPrice?.amount ??
          product.price ??
          0,
      );

      setPreviewProduct({
        id: product.id,
        title: product.title,

        image: product.images?.[0]?.originalSrc,

        price,
      });
    }
  }, [shopify]);

  const basePrice = Number(previewProduct?.price) || 0;

  const normalizedPlans = useMemo(() => {
    if (!selectedPlanGroup?.sellingPlans) {
      return [];
    }

    return selectedPlanGroup.sellingPlans.map((sp) =>
      normalizeSellingPlan(sp, basePrice, currencyCode),
    );
  }, [selectedPlanGroup, basePrice, currencyCode]);

  const purchaseCards = useMemo(() => {
    return cardShells.map((shell) => {
      const base = {
        id: shell.id,

        variant: shell.variant,

        onetimePrice: formatMoney(basePrice, currencyCode),
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
        return {
          ...base,

          benefitsTemplate: shell.benefitsTemplate,

          plans: normalizedPlans.map((p) => ({
            id: p.id,
            label: p.shortLabel,
            price: p.price,
            comparePrice: p.comparePrice,
            discountLabel: p.discountLabel,
          })),
        };
      }

      return {
        ...base,

        plans: normalizedPlans.map((p) => ({
          id: p.id,
          label: p.shortLabel,
          price: p.price,
          comparePrice: p.comparePrice,
          discountLabel: p.discountLabel,
        })),
      };
    });
  }, [normalizedPlans, basePrice, currencyCode]);

  const [selectedMap, setSelectedMap] = useState({});

  const [selectedPlanMap, setSelectedPlanMap] = useState({});

  useEffect(() => {
    setSelectedMap(
      purchaseCards.reduce(
        (acc, c) => ({
          ...acc,
          [c.id]: "subscribe",
        }),
        {},
      ),
    );

    setSelectedPlanMap(
      purchaseCards.reduce(
        (acc, c) => ({
          ...acc,
          [c.id]: c.plans?.[0]?.id || null,
        }),
        {},
      ),
    );
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

    const handelChooseBtn =()=>
    {
      navigate("/app/widgets/create")
    }
  return (
    <Page title="Choose a template">
      <div
        style={{
          display: "flex",
        }}
      >
        <div
          style={{
            minWidth: "260px",
          }}
        >
          <h1>Previewing plan</h1>

          <Select
            label=""
            labelHidden
            options={planOptions}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
          />
        </div>

        <div
          style={{
            minWidth: "260px",
            marginLeft: 24,
          }}
        >
          <h1>Previewing product:</h1>

          <div>
            <div
              style={styles.productPickerField}
              onClick={handlePickPreviewProduct}
            >
              <span style={styles.productPickerText}>
                {previewProduct?.title || "Select a product"}
              </span>

              <span>⌄</span>
            </div>
          </div>
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

                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
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
                            {planChecked && <span style={styles.radioInner} />}
                          </span>

                          <span>{plan.label}</span>

                          {plan.discountLabel && (
                            <span style={styles.badge}>
                              {plan.discountLabel}
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            fontWeight: 700,
                          }}
                        >
                          {plan.price}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {checked && (
                  <div style={styles.infoRow}>Subscription details</div>
                )}

                <Button variant="primary" fullWidth onClick={handelChooseBtn}>
                  Choose
                </Button>
              </div>
            );
          }
          if (data.variant === "detailed") {
            const bannerLabel = activePlan?.discountLabel
              ? `Save ${activePlan.discountLabel.replace(
                  " off",
                  "",
                )} on every delivery`
              : "Subscribe & save on every delivery";

            const firstBenefit = activePlan?.discountLabel
              ? `${activePlan.discountLabel} of all recurring orders`
              : "Discount on all recurring orders";

            const benefits = [firstBenefit, ...(data.benefitsTemplate || [])];

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

                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
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
                  {bannerLabel}
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

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
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

                  {benefits.map((benefit, index) => {
                    const isLast = index === benefits.length - 1;

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
                              width: 130,
                            }}
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

                <Button variant="primary" fullWidth onClick={handelChooseBtn}>
                  Choose
                </Button>
              </div>
            );
          }

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

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
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
                      <span
                        style={{
                          fontWeight: 700,
                        }}
                      >
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
                      <span
                        style={{
                          color: "#555",
                        }}
                      >
                        Deliver every:
                      </span>

                      <div
                        style={{
                          width: 110,
                        }}
                      >
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

              <Button variant="primary" fullWidth onClick={handelChooseBtn}>
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
