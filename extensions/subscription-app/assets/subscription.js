(function () {
  const shop = window.Shopify?.shop;
  const SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";
  let allData = null;
  async function getData() {
    try {
      const response = await fetch(
        `https://habitant-startling-cassette.ngrok-free.dev/plans/getAllPlans?shop=${shop}`,
        {
          headers: {
            "x-api-key": SECRET_KEY,
          },
        },
      );
      const data = await response.json();
      allData = data.data;
      updateWidgetVisibility();
      // console.log("data from api", allData);
      
      return data;
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }

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
  getData();

  const variantInput = document.querySelector(
    'form[action="/cart/add"] [name="id"]',
  );

  if (variantInput) {
    const observer = new MutationObserver(() => {
      updateWidgetVisibility();
    });

    observer.observe(variantInput, {
      attributes: true,
      attributeFilter: ["value"],
    });
  }

  function updateWidgetVisibility() {
    if (!variantInput || !allData) return;
    console.log("variantInput.value =", variantInput.value);
    const currentVariantId = `gid://shopify/ProductVariant/${variantInput.value}`;
    console.log("currentVariantId =", currentVariantId);
    const hasPlan = allData.some((plan) =>
      plan.products.some((product) =>
        product.variants.some(
          (variant) => variant.variantsId === currentVariantId,
        ),
      ),
    );
    const outer = document.getElementById("subscription_Outer");
    console.log("hasPlan:", hasPlan);
    if (hasPlan) {
      widget.style.display = "block";
      outer.style.display = "block";
    } else {
      widget.style.display = "none";
      outer.style.display = "none";
    }
  }
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      updateWidgetVisibility();
    });
  });

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
     console.log("Selected value:", currentSellingPlanId);
  console.log("Available plan IDs:", allData.flatMap(g => g.sellingPlans).map(p => p.shopifySellingPlanId));
    const matchedPlan = allData
      .flatMap((group) => group.sellingPlans)
      .find(
        (plan) =>
          plan.shopifySellingPlanId.split("/").pop() === currentSellingPlanId,
      );

    // console.log("Matched Plan", matchedPlan);
    if (!matchedPlan) {
      console.warn("No matching plan found for", currentSellingPlanId);
      if (Subscription_innerText) {
      Subscription_innerText.textContent = "";
    }
    quantityInput.value = 1;
    quantityInput.min = 1;
    quantityInput.setAttribute("data-min", 1);
      return;
    }
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

    //quantity chnage
    let QuantityChange = "";
    if (matchedPlan.changeQuantityAfterOrders) {
      const quantityAfterOrdersValue = matchedPlan.quantityAfterOrdersValue;
      const quantityAfterOrders = matchedPlan.quantityAfterOrders;
      QuantityChange = ` Quantity will change ${quantityAfterOrdersValue} after ${quantityAfterOrders} Orders.`;
    }

    if (Subscription_innerText) {
      Subscription_innerText.textContent = `Delivery: Every ${DeliveryCount} ${DeliveryInterval}. ${discountText} ${afterOrderSubscription} ${BothCombine} ${ShippingDiscount}  ${QuantityChange}`;
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
        // const variantId = form.querySelector('[name="id"]').value;
        const variantId = variantInput.value;
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
            // console.log("Cart response:", data);

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
