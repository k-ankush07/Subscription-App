
import { currencySymbol } from "./formatMoney.js";

export function formatMoney(amount, currencyCode, useCustomFormat = false) {
  const n = Number(amount) || 0;
  if (useCustomFormat) {
    return `${n.toFixed(2)} ${currencyCode}`;
  }
  return `${currencySymbol(currencyCode)}${n.toFixed(2)}`;
}

export function intervalUnit(interval, count) {
  const unit = String(interval || "").toLowerCase();
  return count > 1 ? `${unit}s` : unit;
}

export function deliveryPhrase(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);
  return count > 1 ? `every ${count} ${unit}` : `every ${unit}`;
}

export function shortDeliveryLabel(sp) {
  const count = sp.intervalCount || 1;
  const unit = intervalUnit(sp.interval, count);
  return count > 1 ? `${count} ${unit}` : unit;
}

export function discountLabelFor(sp, currencyCode, useCustomFormat = false) {
  if (!sp.giveSubscriptionDiscount) {
    return undefined;
  }

  if (sp.discountType === "PERCENTAGE") {
    return `${sp.discountValue}% off`;
  }

  if (sp.discountValue) {
    return `${formatMoney(sp.discountValue, currencyCode, useCustomFormat)} off`;
  }

  return undefined;
}

export function getSubscriptionDetails(sp) {
  if (!sp) return "";

  const DeliveryCount = sp.intervalCount;
  const DeliveryInterval = sp.interval;

  let discountText = "";
  let afterOrderSubscription = "";

  if (sp.giveSubscriptionDiscount) {
    if (sp.discountType === "PERCENTAGE") {
      discountText = `Discount: ${sp.discountValue}%.`;
    } else if (sp.discountType === "PRICE") {
      discountText = `Fixed Price: ${sp.discountValue}.`;
    } else if (sp.discountType === "FIXED_AMOUNT") {
      discountText = `Discount: ${sp.discountValue} off.`;
    }

    if (sp.changeDiscountAfterOrders) {
      if (sp.afterDiscountType === "PERCENTAGE") {
        afterOrderSubscription = `After ${sp.afterOrders} Orders Discount will change to ${sp.afterDiscountValue}%.`;
      } else if (sp.afterDiscountType === "PRICE") {
        afterOrderSubscription = `After ${sp.afterOrders} Orders price will be fixed at ${sp.afterDiscountValue}.`;
      } else if (sp.afterDiscountType === "FIXED_AMOUNT") {
        afterOrderSubscription = `After ${sp.afterOrders} Orders price will be reduced from original price ${sp.afterDiscountValue}.`;
      }
    }
  }

  let BothCombine = "";

  if (sp.minCycles !== null || sp.maxCycles !== null) {
    if (sp.minCycles && sp.maxCycles) {
      BothCombine = `You will be able to cancel your subscription after ${sp.minCycles} Orders. Subscription will cancel automatically after ${sp.maxCycles} Orders.`;
    } else if (sp.minCycles) {
      BothCombine = `You can cancel Subscription after ${sp.minCycles} Orders.`;
    } else if (sp.maxCycles) {
      BothCombine = `Subscription will cancel automatically after ${sp.maxCycles} Orders.`;
    }
  }

  let ShippingDiscount = "";

  if (sp.giveShippingDiscount) {
    if (sp.shippingDiscountType === "PERCENTAGE") {
      ShippingDiscount = `Delivery price will be reduced by ${sp.shippingDiscountValue}% after ${sp.shippingAfterOrders} Orders.`;
    } else if (sp.shippingDiscountType === "PRICE") {
      ShippingDiscount = `Delivery price will be fixed at ${sp.shippingDiscountValue} after ${sp.shippingAfterOrders} Orders.`;
    } else if (sp.shippingDiscountType === "FIXED_AMOUNT") {
      ShippingDiscount = `Delivery price will be reduced by ${sp.shippingDiscountValue} after ${sp.shippingAfterOrders} Orders.`;
    }
  }

  let QuantityChange = "";

  if (sp.changeQuantityAfterOrders) {
    QuantityChange = `Quantity will change ${sp.quantityAfterOrdersValue} after ${sp.quantityAfterOrders} Orders.`;
  }

  return [
    `Delivery: Every ${DeliveryCount} ${DeliveryInterval}.`,
    discountText,
    afterOrderSubscription,
    BothCombine,
    ShippingDiscount,
    QuantityChange,
  ]
    .filter(Boolean)
    .join(" ");
}

export function computeSellingPlanPrice(basePrice, sp) {
  if (!sp.giveSubscriptionDiscount) {
    return basePrice;
  }

  if (sp.discountType === "PERCENTAGE") {
    return basePrice - (basePrice * Number(sp.discountValue || 0)) / 100;
  }

  return Math.max(basePrice - Number(sp.discountValue || 0), 0);
}

export function normalizeSellingPlan(sp, basePrice, currencyCode, useCustomFormat = false) {
  const price = computeSellingPlanPrice(basePrice, sp);

  return {
    id: sp.shopifySellingPlanId,
    name: sp.name,
    label: `Deliver ${deliveryPhrase(sp)}`,
    shortLabel: shortDeliveryLabel(sp),
    discountLabel: discountLabelFor(sp, currencyCode, useCustomFormat),
    price: formatMoney(price, currencyCode, useCustomFormat),
    comparePrice: formatMoney(basePrice, currencyCode, useCustomFormat),
    raw: sp,
  };
}

export const cardShells = [
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

export function getVariantForCardId(id) {
  return cardShells.find((c) => c.id === id)?.variant || cardShells[0].variant;
}

export function getCardIdForVariant(variant) {
  return cardShells.find((c) => c.variant === variant)?.id || cardShells[0].id;
}

export function buildPurchaseCards(normalizedPlans, basePrice, currencyCode, useCustomFormat = false) {
  return cardShells.map((shell) => {
    const base = {
      id: shell.id,
      variant: shell.variant,
      onetimePrice: formatMoney(basePrice, currencyCode, useCustomFormat),
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
          comparePrice: p.comparePrice,
          name: p.name,
          raw: p.raw,
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
          name: p.name,
          raw: p.raw,
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
        name: p.name,
        raw: p.raw,
      })),
    };
  });
}

export const cardStyles = {
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

  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#555",
    fontSize: 13,
    marginTop: 4,
  },
};