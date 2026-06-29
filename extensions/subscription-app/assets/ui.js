function buildDiscountText(plan) {
  if (!plan.giveSubscriptionDiscount) return "";
  const { discountType, discountValue } = plan;
  const map = {
    PERCENTAGE:   `| Discount: ${discountValue}%.`,
    PRICE:        `| Fixed Price: ₹${discountValue}.`,
    FIXED_AMOUNT: `| Discount: ₹${discountValue} off.`,
  };
  let text = map[discountType] || "";

  if (plan.changeDiscountAfterOrders) {
    const { afterDiscountType, afterDiscountValue, afterOrders } = plan;
    const afterMap = {
      PERCENTAGE:   `After ${afterOrders} Orders Discount will change to ${afterDiscountValue}%.`,
      PRICE:        `After ${afterOrders} Orders price will be fixed at ₹${afterDiscountValue}.`,
      FIXED_AMOUNT: `After ${afterOrders} Orders price will be reduce from original price ₹${afterDiscountValue}.`,
    };
    text += " " + (afterMap[afterDiscountType] || "");
  }
  return text;
}

function buildCycleText(plan) {
  const { minCycles: min, maxCycles: max } = plan;
  if (!min && !max) return "";
  if (min && max) return `You will be able to cancel your subscription after ${min} Orders. Subscription will cancel automatically after ${max} Orders.`;
  if (min) return `You can cancel Subscription after ${min} Orders.`;
  return `Subscription will cancel automatically after ${max} Orders.`;
}

function buildShippingText(plan) {
  if (!plan.giveShippingDiscount) return "";
  const { shippingDiscountType: type, shippingDiscountValue: val, shippingAfterOrders: after } = plan;
  const map = {
    PERCENTAGE:   `Delivery price will be reduced by ${val}% after ${after} Orders.`,
    PRICE:        `Delivery price will be fixed at ₹${val} after ${after} Orders.`,
    FIXED_AMOUNT: `Delivery price will be reduced by ₹${val} after ${after} Orders.`,
  };
  return map[type] || "";
}

function buildQuantityText(plan) {
  if (!plan.changeQuantityAfterOrders) return "";
  return `Quantity will change ${plan.quantityAfterOrdersValue} after ${plan.quantityAfterOrders} Orders.`;
}

export function handlePlanChange(selectedPlanId, allData) {
  const matchedPlan = allData
    .flatMap((group) => group.sellingPlans)
    .find((plan) => plan.shopifySellingPlanId.split("/").pop() === selectedPlanId);

  if (!matchedPlan) return;

  // Info text update
  const infoEl = document.getElementsByClassName("Subscription_innerText")[0];
  if (infoEl) {
    const { intervalCount, interval } = matchedPlan;
    infoEl.textContent = [
      `Delivery: Every ${intervalCount} ${interval}.`,
      buildDiscountText(matchedPlan),
      buildCycleText(matchedPlan),
      buildShippingText(matchedPlan),
      buildQuantityText(matchedPlan),
    ].filter(Boolean).join(" ");
  }

  // Quantity update
  const quantityInput = document.querySelector('[name="quantity"]');
  if (!quantityInput) return;
  if (matchedPlan.MinimumQuanitity) {
    const min = matchedPlan.MinimumQuanitityValue;
    quantityInput.value = min;
    quantityInput.min = min;
    quantityInput.setAttribute("data-min", min);
  } else {
    quantityInput.value = 1;
    quantityInput.min = 1;
    quantityInput.setAttribute("data-min", 1);
  }
}