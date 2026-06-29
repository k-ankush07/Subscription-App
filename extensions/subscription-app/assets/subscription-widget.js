// ============================================================
// subscription-widget.js
// Handles all DOM interactions, event listeners, and cart logic.
// Depends on: subscription-api.js  (must load first)
// ============================================================

(function () {
  // ── Element refs ────────────────────────────────────────────
  const widget = document.getElementById("subscription-widget");
  if (!widget) return;

  const outer = document.getElementById("subscription_Outer");
  const quantityInput = document.querySelector('[name="quantity"]');
  const radios = widget.querySelectorAll('input[name="purchase_type"]');
  const plansContainer = document.getElementById("selling-plans-container");
  const planSelect = document.getElementById("selling-plan-select");
  const subscriptionInnerText = document.getElementsByClassName(
    "Subscription_innerText"
  )[0];
  const addToCartBtn =
    document.querySelector('[name="add"]') ||
    document.querySelector(".product-form__submit");

  let currentSellingPlanId = null;

  // ── Variant visibility ───────────────────────────────────────
  function updateWidgetVisibility() {
    const variantInput = document.querySelector(
      'form[action="/cart/add"] [name="id"]'
    );
    console.log("INPUT ", variantInput);

    if (!variantInput || !window.SubscriptionApp.allData) return;

    console.log("Variant value:", variantInput.value);
    const hasPlan = window.SubscriptionApp.variantHasPlan(variantInput.value);
    console.log("hasPlan:", hasPlan);

    if (hasPlan) {
      console.log("SHOW");
      widget.style.display = "block";
      outer.style.display = "block";
    } else {
      console.log("HIDE");
      widget.style.display = "none";
      outer.style.display = "none";
    }
  }

  function observeVariantInput() {
    const variantInput = document.querySelector(
      'form[action="/cart/add"] [name="id"]'
    );
    if (!variantInput) return;

    const observer = new MutationObserver(() => {
      console.log("Variant changed to:", variantInput.value);
      updateWidgetVisibility();
    });

    observer.observe(variantInput, {
      attributes: true,
      attributeFilter: ["value"],
    });
  }

  // ── Radio change (purchase type) ────────────────────────────
  // Global radios — give Shopify time to update the hidden variant id
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      setTimeout(updateWidgetVisibility, 50);
    });
  });

  // Widget-scoped radios — toggle plans container
  radios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (this.value === "subscription") {
        plansContainer.style.display = "block";
        subscriptionInnerText.style.display = "block";
        if (planSelect.value) {
          planSelect.dispatchEvent(new Event("change"));
        }
      } else {
        plansContainer.style.display = "none";
        currentSellingPlanId = null;
        planSelect.selectedIndex = 0;
        quantityInput.value = 1;
        quantityInput.min = 1;
        quantityInput.setAttribute("data-min", 1);
        subscriptionInnerText.style.display = "none";
      }
    });
  });

  // ── Plan select change ───────────────────────────────────────
  planSelect.addEventListener("change", function () {
    currentSellingPlanId = this.value;
    console.log("Selected plan id:", currentSellingPlanId);

    const matchedPlan = window.SubscriptionApp.getMatchedPlan(currentSellingPlanId);
    console.log("Matched Plan:", matchedPlan);
    if (!matchedPlan) return;

    const deliveryCount = matchedPlan.intervalCount;
    const deliveryInterval = matchedPlan.interval;

    // — Discount text —
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
          afterOrderSubscription = `After ${afterOrders} Orders price will be fixed at ₹${afterDiscountValue}.`;
        } else if (afterDiscountType === "FIXED_AMOUNT") {
          afterOrderSubscription = ` After ${afterOrders} Orders price will be reduce from original price ₹${afterDiscountValue}.`;
        }
      }
    }

    // — Min / Max cycles —
    let bothCombine = "";
    const minCycle = matchedPlan.minCycles;
    const maxCycle = matchedPlan.maxCycles;
    if (minCycle !== null || maxCycle !== null) {
      if (minCycle && maxCycle) {
        bothCombine = ` You will be able to cancel your subscription after ${minCycle} Orders. Subscription will cancel automatically after ${maxCycle} Orders.`;
      } else if (minCycle) {
        bothCombine = `You can cancel Subscription after ${minCycle} Orders.`;
      } else if (maxCycle) {
        bothCombine = `Subscription will cancel automatically after ${maxCycle} Orders.`;
      }
    }

    // — Shipping discount —
    let shippingDiscount = "";
    if (matchedPlan.giveShippingDiscount) {
      const { shippingDiscountType, shippingDiscountValue, shippingAfterOrders } = matchedPlan;
      if (shippingDiscountType === "PERCENTAGE") {
        shippingDiscount = `Delivery price will be reduced by ${shippingDiscountValue}% after ${shippingAfterOrders} Orders.`;
      } else if (shippingDiscountType === "PRICE") {
        shippingDiscount = `Delivery price will be fixed at ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
      } else if (shippingDiscountType === "FIXED_AMOUNT") {
        shippingDiscount = `Delivery price will be reduced by ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
      }
    }

    // — Quantity change —
    let quantityChange = "";
    if (matchedPlan.changeQuantityAfterOrders) {
      const { quantityAfterOrdersValue, quantityAfterOrders } = matchedPlan;
      quantityChange = ` Quantity will change ${quantityAfterOrdersValue} after ${quantityAfterOrders} Orders.`;
    }

    // — Update inner text —
    if (subscriptionInnerText) {
      subscriptionInnerText.textContent =
        `Delivery: Every ${deliveryCount} ${deliveryInterval}. ${discountText} ${afterOrderSubscription} ${bothCombine} ${shippingDiscount} ${quantityChange}`;
    }

    // — Minimum quantity —
    if (matchedPlan.MinimumQuanitity) {
      const minVal = matchedPlan.MinimumQuanitityValue;
      quantityInput.value = minVal;
      quantityInput.min = minVal;
      quantityInput.setAttribute("data-min", minVal);
    } else {
      quantityInput.value = 1;
      quantityInput.min = 1;
      quantityInput.setAttribute("data-min", 1);
    }
  });

  // ── Add to cart ──────────────────────────────────────────────
  if (addToCartBtn) {
    addToCartBtn.addEventListener(
      "click",
      function (e) {
        if (!currentSellingPlanId) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const form = document.querySelector('form[action="/cart/add"]');
        const variantId = form.querySelector('[name="id"]').value;
        const quantity = form.querySelector('[name="quantity"]')?.value || 1;

        fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: variantId,
            quantity: parseInt(quantity),
            selling_plan: parseInt(currentSellingPlanId),
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log("Cart response:", data);
            document.dispatchEvent(new CustomEvent("cart:refresh"));
          })
          .catch((err) => {
            console.error("Cart error:", err);
          });
      },
      true
    );
  }

  // ── Init ─────────────────────────────────────────────────────
  // Wait for API data before checking visibility
  document.addEventListener("subscription:dataReady", () => {
    observeVariantInput();
    updateWidgetVisibility();
  });
})();