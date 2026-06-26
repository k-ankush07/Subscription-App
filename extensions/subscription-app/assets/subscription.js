(function () {
  const shop = window.Shopify?.shop;
  SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";
  let allData = null;
  async function getData() {
    try {
      const response = await fetch(
        `http://localhost:5000/plans/getAllPlans?shop=${shop}`,
        {
          headers: {
            "x-api-key": SECRET_KEY,
          },
        },
      );
      const data = await response.json();
      allData = data.data;

      console.log("Custom API data:", data);
      console.log("data from api", allData);
      return data;
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }
  getData();

  const widget = document.getElementById("subscription-widget");
  if (!widget) return;
  const quantityInput = document.querySelector('[name="quantity"]');
  const radios = widget.querySelectorAll('input[name="purchase_type"]');
  const plansContainer = document.getElementById("selling-plans-container");
  const planSelect = document.getElementById("selling-plan-select");
  const Subscription_innerText = document.getElementsByClassName(
    "Subscription_innerText",
  )[0];
  const addToCartBtn =
    document.querySelector('[name="add"]') ||
    document.querySelector(".product-form__submit");
  let currentSellingPlanId = null;

  radios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (this.value === "subscription") {
        plansContainer.style.display = "block";
        Subscription_innerText.style.display = "block";
        //Pehli baar subscription select hone par default plan apply karo
        if (planSelect.value) {
          planSelect.dispatchEvent(new Event("change"));
        }
      } else {
        plansContainer.style.display = "none";
        currentSellingPlanId = null;
        // One-time select hone par quantity reset karo
        planSelect.selectedIndex = 0;
        quantityInput.value = 1;
        quantityInput.min = 1;
        quantityInput.setAttribute("data-min", 1);
        Subscription_innerText.style.display = "none";
      }
    });
  });

  planSelect.addEventListener("change", function () {
    currentSellingPlanId = this.value;
    console.log("idss", currentSellingPlanId);
    const matchedPlan = allData
      .flatMap((group) => group.sellingPlans)
      .find(
        (plan) =>
          plan.shopifySellingPlanId.split("/").pop() === currentSellingPlanId,
      );

    console.log("Matched Plan", matchedPlan);
    if (!matchedPlan) return;
    const DeliveryCount = matchedPlan.intervalCount;
    const DeliveryInterval = matchedPlan.interval;

    let discountText = "";
    let afterOrderSubscription = "";

    if (matchedPlan.giveSubscriptionDiscount) {
      const discountType = matchedPlan.discountType;
      const discountValue = matchedPlan.discountValue;
      if (discountType === "PERCENTAGE") {
        discountText = ` | Discount: ${discountValue}%.`;
      } else if (discountType === "PRICE") {
        discountText = ` | Fixed Price: ₹${discountValue}.`;
      } else if (discountType === "FIXED_AMOUNT") {
        discountText = ` | Discount: ₹${discountValue} off.`;
      }

      if (matchedPlan.changeDiscountAfterOrders) {
        const afterDiscountType = matchedPlan.afterDiscountType;
        const afterDiscountValue = matchedPlan.afterDiscountValue;
        const afterOrders = matchedPlan.afterOrders;
        if (afterDiscountType === "PERCENTAGE") {
          afterOrderSubscription = ` After ${afterOrders} Orders Discount will change to ${afterDiscountValue}%.`;
        } else if (afterDiscountType === "PRICE") {
          afterOrderSubscription = `After ${afterOrders} Orders price will be fixed at ₹${afterDiscountValue}.`;
        } else if (afterDiscountType === "FIXED_AMOUNT") {
          afterOrderSubscription = ` After ${afterOrders} Orders price will be reduce from original price ₹${afterDiscountValue}.`;
        }
      }
    }

    let MinCycle = null;
    let MaxCycle = null;
    let BothCombine = "";
    if (matchedPlan.minCycles !== null || matchedPlan.maxCycles !== null) {
      MinCycle = matchedPlan.minCycles;
      MaxCycle = matchedPlan.maxCycles;
      if (MinCycle && MaxCycle) {
        BothCombine = ` You will be able to cancel your subscription after ${MinCycle} Orders. Subscription will cancel automatically after  ${MaxCycle} Orders.`;
      } else if (MinCycle) {
        BothCombine = `You can cancel Subscription after ${MinCycle} Orders.`;
      } else if (MaxCycle) {
        BothCombine = `Subscription will cancel automatically after ${MaxCycle} Orders.`;
      }
    }
    let ShippingDiscount = "";
    if (matchedPlan.giveShippingDiscount) {
      const shippingDiscountType = matchedPlan.shippingDiscountType;
      const shippingDiscountValue = matchedPlan.shippingDiscountValue;
      const shippingAfterOrders = matchedPlan.shippingAfterOrders;

      if (shippingDiscountType === "PERCENTAGE") {
        ShippingDiscount = `Delivery price will be reduced by ${shippingDiscountValue}% after ${shippingAfterOrders} Orders.`;
      } else if (shippingDiscountType === "PRICE") {
        ShippingDiscount = `Delivery price will be fixed at ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
      } else if (shippingDiscountType === "FIXED_AMOUNT") {
        ShippingDiscount = `Delivery price will be reduced by ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
      }
    }

    if (Subscription_innerText) {
      Subscription_innerText.textContent = `Delivery: Every ${DeliveryCount} ${DeliveryInterval}. ${discountText} ${afterOrderSubscription} ${BothCombine} ${ShippingDiscount} `;
    }

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
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            console.log("Cart response:", data);

            document.dispatchEvent(new CustomEvent("cart:refresh"));
          })
          .catch(function (err) {
            console.error("Cart error:", err);
          });
      },
      true,
    );
  }
})();
