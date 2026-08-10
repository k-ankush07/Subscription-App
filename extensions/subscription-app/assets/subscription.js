// (function () {
//   const shop = window.Shopify?.shop;
//   SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";
//   let allData = null;
//   async function getData() {
//     try {
//       const response = await fetch(
//         `http://localhost:5000/plans/getAllPlans?shop=${shop}`,
//         {
//           headers: {
//             "x-api-key": SECRET_KEY,
//           },
//         },
//       );
//       const data = await response.json();
//       allData = data.data;
//       updateWidgetVisibility();
//       // console.log("data from api", allData);
      
//       return data;
//     } catch (error) {
//       console.error("Fetch error:", error);
//     }
//   }

//   const widget = document.getElementById("subscription-widget");
//   if (!widget) return;
//   const quantityInput = document.querySelector('[name="quantity"]');
//   const radios = widget.querySelectorAll('input[name="purchase_type"]');
//   const plansContainer = document.getElementById("selling-plans-container");
//   const planSelect = document.getElementById("selling-plan-select");
//   const Subscription_innerText = document.getElementsByClassName(
//     "Subscription_innerText",
//   )[0];
//   const addToCartBtn =
//     document.querySelector('[name="add"]') ||
//     document.querySelector(".product-form__submit");
//   let currentSellingPlanId = null;
//   getData();

//   const variantInput = document.querySelector(
//     'form[action="/cart/add"] [name="id"]',
//   );

//   if (variantInput) {
//     const observer = new MutationObserver(() => {
//       updateWidgetVisibility();
//     });

//     observer.observe(variantInput, {
//       attributes: true,
//       attributeFilter: ["value"],
//     });
//   }

//   function updateWidgetVisibility() {
//     if (!variantInput || !allData) return;
//     console.log("variantInput.value =", variantInput.value);
//     const currentVariantId = `gid://shopify/ProductVariant/${variantInput.value}`;
//     console.log("currentVariantId =", currentVariantId);
//     const hasPlan = allData.some((plan) =>
//       plan.products.some((product) =>
//         product.variants.some(
//           (variant) => variant.variantsId === currentVariantId,
//         ),
//       ),
//     );
//     const outer = document.getElementById("subscription_Outer");
//     console.log("hasPlan:", hasPlan);
//     if (hasPlan) {
//       widget.style.display = "block";
//       outer.style.display = "block";
//     } else {
//       widget.style.display = "none";
//       outer.style.display = "none";
//     }
//   }
//   document.querySelectorAll('input[type="radio"]').forEach((radio) => {
//     radio.addEventListener("change", () => {
//       updateWidgetVisibility();
//     });
//   });

//   radios.forEach(function (radio) {
//     radio.addEventListener("change", function () {
//       if (this.value === "subscription") {
//         plansContainer.style.display = "block";
//         Subscription_innerText.style.display = "block";
//         //Pehli baar subscription select hone par default plan apply karo
//         if (planSelect.value) {
//           planSelect.dispatchEvent(new Event("change"));
//         }
//       } else {
//         plansContainer.style.display = "none";
//         currentSellingPlanId = null;
//         // One-time select hone par quantity reset karo
//         planSelect.selectedIndex = 0;
//         quantityInput.value = 1;
//         quantityInput.min = 1;
//         quantityInput.setAttribute("data-min", 1);
//         Subscription_innerText.style.display = "none";
//       }
//     });
//   });

//   planSelect.addEventListener("change", function () {
//     currentSellingPlanId = this.value;
//      console.log("Selected value:", currentSellingPlanId);
//   console.log("Available plan IDs:", allData.flatMap(g => g.sellingPlans).map(p => p.shopifySellingPlanId));
//     const matchedPlan = allData
//       .flatMap((group) => group.sellingPlans)
//       .find(
//         (plan) =>
//           plan.shopifySellingPlanId.split("/").pop() === currentSellingPlanId,
//       );

//     // console.log("Matched Plan", matchedPlan);
//     if (!matchedPlan) {
//       console.warn("No matching plan found for", currentSellingPlanId);
//       if (Subscription_innerText) {
//       Subscription_innerText.textContent = "";
//     }
//     quantityInput.value = 1;
//     quantityInput.min = 1;
//     quantityInput.setAttribute("data-min", 1);
//       return;
//     }
//     const DeliveryCount = matchedPlan.intervalCount;
//     const DeliveryInterval = matchedPlan.interval;

//     let discountText = "";
//     let afterOrderSubscription = "";

//     if (matchedPlan.giveSubscriptionDiscount) {
//       const discountType = matchedPlan.discountType;
//       const discountValue = matchedPlan.discountValue;
//       if (discountType === "PERCENTAGE") {
//         discountText = ` | Discount: ${discountValue}%.`;
//       } else if (discountType === "PRICE") {
//         discountText = ` | Fixed Price: ₹${discountValue}.`;
//       } else if (discountType === "FIXED_AMOUNT") {
//         discountText = ` | Discount: ₹${discountValue} off.`;
//       }

//       if (matchedPlan.changeDiscountAfterOrders) {
//         const afterDiscountType = matchedPlan.afterDiscountType;
//         const afterDiscountValue = matchedPlan.afterDiscountValue;
//         const afterOrders = matchedPlan.afterOrders;
//         if (afterDiscountType === "PERCENTAGE") {
//           afterOrderSubscription = ` After ${afterOrders} Orders Discount will change to ${afterDiscountValue}%.`;
//         } else if (afterDiscountType === "PRICE") {
//           afterOrderSubscription = `After ${afterOrders} Orders price will be fixed at ₹${afterDiscountValue}.`;
//         } else if (afterDiscountType === "FIXED_AMOUNT") {
//           afterOrderSubscription = ` After ${afterOrders} Orders price will be reduce from original price ₹${afterDiscountValue}.`;
//         }
//       }
//     }

//     let MinCycle = null;
//     let MaxCycle = null;
//     let BothCombine = "";
//     if (matchedPlan.minCycles !== null || matchedPlan.maxCycles !== null) {
//       MinCycle = matchedPlan.minCycles;
//       MaxCycle = matchedPlan.maxCycles;
//       if (MinCycle && MaxCycle) {
//         BothCombine = ` You will be able to cancel your subscription after ${MinCycle} Orders. Subscription will cancel automatically after  ${MaxCycle} Orders.`;
//       } else if (MinCycle) {
//         BothCombine = `You can cancel Subscription after ${MinCycle} Orders.`;
//       } else if (MaxCycle) {
//         BothCombine = `Subscription will cancel automatically after ${MaxCycle} Orders.`;
//       }
//     }
//     let ShippingDiscount = "";
//     if (matchedPlan.giveShippingDiscount) {
//       const shippingDiscountType = matchedPlan.shippingDiscountType;
//       const shippingDiscountValue = matchedPlan.shippingDiscountValue;
//       const shippingAfterOrders = matchedPlan.shippingAfterOrders;

//       if (shippingDiscountType === "PERCENTAGE") {
//         ShippingDiscount = `Delivery price will be reduced by ${shippingDiscountValue}% after ${shippingAfterOrders} Orders.`;
//       } else if (shippingDiscountType === "PRICE") {
//         ShippingDiscount = `Delivery price will be fixed at ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
//       } else if (shippingDiscountType === "FIXED_AMOUNT") {
//         ShippingDiscount = `Delivery price will be reduced by ₹${shippingDiscountValue} after ${shippingAfterOrders} Orders.`;
//       }
//     }

//     //quantity chnage
//     let QuantityChange = "";
//     if (matchedPlan.changeQuantityAfterOrders) {
//       const quantityAfterOrdersValue = matchedPlan.quantityAfterOrdersValue;
//       const quantityAfterOrders = matchedPlan.quantityAfterOrders;
//       QuantityChange = ` Quantity will change ${quantityAfterOrdersValue} after ${quantityAfterOrders} Orders.`;
//     }

//     if (Subscription_innerText) {
//       Subscription_innerText.textContent = `Delivery: Every ${DeliveryCount} ${DeliveryInterval}. ${discountText} ${afterOrderSubscription} ${BothCombine} ${ShippingDiscount}  ${QuantityChange}`;
//     }

//     if (matchedPlan.MinimumQuanitity) {
//       const minVal = matchedPlan.MinimumQuanitityValue;
//       quantityInput.value = minVal;
//       quantityInput.min = minVal;
//       quantityInput.setAttribute("data-min", minVal);
//     } else {
//       quantityInput.value = 1;
//       quantityInput.min = 1;
//       quantityInput.setAttribute("data-min", 1);
//     }
//   });

//   if (addToCartBtn) {
//     addToCartBtn.addEventListener(
//       "click",
//       function (e) {
//         if (!currentSellingPlanId) return;

//         e.preventDefault();
//         e.stopImmediatePropagation();

//         const form = document.querySelector('form[action="/cart/add"]');
//         // const variantId = form.querySelector('[name="id"]').value;
//         const variantId = variantInput.value;
//         const quantity = form.querySelector('[name="quantity"]')?.value || 1;

//         fetch("/cart/add.js", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             id: variantId,
//             quantity: parseInt(quantity),
//             selling_plan: parseInt(currentSellingPlanId),
//           }),
//         })
//           .then(function (res) {
//             return res.json();
//           })
//           .then(function (data) {
//             // console.log("Cart response:", data);

//             document.dispatchEvent(new CustomEvent("cart:refresh"));
//           })
//           .catch(function (err) {
//             console.error("Cart error:", err);
//           });
//       },
//       true,
//     );
//   }
// })();


(function () {
  const shop = window.Shopify?.shop;
  // ⚠️ SECURITY WARNING: This secret key is exposed in client-side JS and visible
  // to anyone via browser dev tools. This should be moved to a server-side proxy.
  // Also update the API URL below — localhost:5000 will not work in production.
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

        // Purchase type one-time pe switch hone par upcoming products preview bhi clear karo
        const upcomingContainer = document.getElementById(
          "upcoming-products-container",
        );
        if (upcomingContainer) upcomingContainer.innerHTML = "";
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
          String(plan.shopifySellingPlanId).split("/").pop() ===
          String(currentSellingPlanId),
      );

    // console.log("Matched Plan", matchedPlan);
    if (!matchedPlan) {
      console.warn("No matching plan found for", currentSellingPlanId);
      if (Subscription_innerText) {
        Subscription_innerText.textContent = "";
      }
      const upcomingContainer = document.getElementById(
        "upcoming-products-container",
      );
      if (upcomingContainer) upcomingContainer.innerHTML = "";
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

    // ============ UPCOMING PRODUCTS PREVIEW ============
    // Simulates future billing cycles for this plan's automation config
    // (swap / add / remove) so the customer can see what will actually
    // ship in upcoming orders, before they even subscribe.
    const currentVariantIdForPreview = `gid://shopify/ProductVariant/${variantInput.value}`;
    let currentProductIdForPreview = null;

    for (const group of allData) {
      for (const product of group.products || []) {
        if (
          product.variants?.some(
            (v) => v.variantsId === currentVariantIdForPreview,
          )
        ) {
          currentProductIdForPreview = product.id;
          break;
        }
      }
      if (currentProductIdForPreview) break;
    }

    const numCyclesForPreview = matchedPlan.maxCycles
      ? Math.min(matchedPlan.maxCycles, 6)
      : 6;

    const timeline = computeUpcomingProductsPreview(
      matchedPlan,
      currentVariantIdForPreview,
      currentProductIdForPreview,
      numCyclesForPreview,
    );
    renderUpcomingProducts(timeline);
    // ====================================================
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

  // =========================================================
  // Upcoming products preview — helper functions
  // =========================================================

  // Looks up display info (title/image) for a variant from the plan data
  // returned by /plans/getAllPlans. Adjust field names below if your API
  // response uses different keys (check via console.log(allData)).
  function getVariantMeta(variantId) {
    if (!allData) return null;
    for (const group of allData) {
      for (const product of group.products || []) {
        for (const variant of product.variants || []) {
          if (variant.variantsId === variantId) {
            return {
              title: variant.title || product.title || "Product",
              image: variant.image || product.image || null,
            };
          }
        }
      }
    }
    return null;
  }

  // Simulates the first `numCycles` billing cycles using the same
  // automation rules the backend applies (settings.automationCycles,
  // productSwapEnabled, etc. — see billing-preview.server.js) so we can
  // show the customer which product(s) will ship in each upcoming order.
  function computeUpcomingProductsPreview(
    settings,
    baseVariantId,
    baseProductId,
    numCycles = 6,
  ) {
    const timeline = [];
    let activeVariantId = baseVariantId;
    let activeProductId = baseProductId;

    for (let cycle = 0; cycle < numCycles; cycle++) {
      let lines = [];
      let cycleRemoved = false;
      let cycleSwapped = false;

      // Legacy single-swap field
      if (
        settings.productSwapEnabled &&
        cycle >= Number(settings.productSwapAfterOrders)
      ) {
        activeVariantId = settings.productSwapVariantId;
        cycleSwapped = true;
      }

      // Custom automationCycles (swap / add / remove), merchant-configured
      if (settings.Automation && Array.isArray(settings.automationCycles)) {
        settings.automationCycles.forEach((auto) => {
          if (cycle < Number(auto.orders)) return;

          (auto.actions || []).forEach((action) => {
            if (action.type === "swap") {
              (action.dests || []).forEach((dest) => {
                (dest.variantIds || []).forEach((vId, idx) => {
                  lines.push({
                    variantId: vId,
                    title: dest.variantNames?.[idx] || dest.name,
                    image: dest.variantImages?.[idx] || null,
                  });
                });
              });
              cycleSwapped = true;
            } else if (action.type === "add") {
              lines.push({
                variantId: action.variantId,
                title: action.productName || action.variantName || "Added product",
                image: action.imageUrl || null,
              });
            } else if (action.type === "remove") {
              const matchesVariant =
                action.sourceVariantId &&
                action.sourceVariantId === activeVariantId;
              const matchesProduct =
                action.sourceProductId &&
                action.sourceProductId === activeProductId &&
                !action.sourceVariantId;
              if (matchesVariant || matchesProduct) cycleRemoved = true;
            }
          });
        });
      }

      // Agar is cycle mein koi swap/remove nahi hua, toh current active
      // variant hi order mein continue karega
      if (!cycleSwapped && !cycleRemoved) {
        const meta = getVariantMeta(activeVariantId);
        lines.unshift({
          variantId: activeVariantId,
          title: meta?.title || "Current product",
          image: meta?.image || null,
        });
      }

      timeline.push({ cycle: cycle + 1, lines, removed: cycleRemoved });
    }

    return timeline;
  }

  // Renders only the cycles where something actually changes, to avoid
  // repeating the same line for every single order.
  function renderUpcomingProducts(timeline) {
    const container = document.getElementById("upcoming-products-container");
    if (!container) return;

    const changePoints = timeline.filter((t, i) => {
      if (i === 0) return true;
      const prevIds = timeline[i - 1].lines
        .map((l) => l.variantId)
        .sort()
        .join(",");
      const currIds = t.lines
        .map((l) => l.variantId)
        .sort()
        .join(",");
      return prevIds !== currIds || t.removed;
    });

    container.innerHTML = changePoints
      .map((t) => {
        if (t.removed && t.lines.length === 0) {
          return `<div class="upcoming-item">Order #${t.cycle}: This product will be removed</div>`;
        }
        const names = t.lines.map((l) => l.title).join(", ");
        return `<div class="upcoming-item">Order #${t.cycle}: ${names}</div>`;
      })
      .join("");
  }
})();