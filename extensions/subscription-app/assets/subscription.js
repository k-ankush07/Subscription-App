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
  const upcomingCard = document.getElementById("upcoming-changes-card");
  const upcomingBody = document.getElementById("upcoming-changes-body");
  const addToCartBtn =
    document.querySelector('[name="add"]') ||
    document.querySelector(".product-form__submit");
  let currentSellingPlanId = null;
  getData();

  const variantInput = document.querySelector(
    'form[action="/cart/add"] [name="id"]',
  );

  // current product id — Liquid se data-product-id attribute me aata hai
  const currentProductGid = widget.dataset.productId
    ? `gid://shopify/Product/${widget.dataset.productId}`
    : null;

  if (variantInput) {
    const observer = new MutationObserver(() => {
      updateWidgetVisibility();
      if (currentSellingPlanId) planSelect.dispatchEvent(new Event("change"));
    });

    observer.observe(variantInput, {
      attributes: true,
      attributeFilter: ["value"],
    });
  }

  function updateWidgetVisibility() {
    if (!variantInput || !allData) return;
    const currentVariantId = `gid://shopify/ProductVariant/${variantInput.value}`;
    const hasPlan = allData.some((plan) =>
      plan.products.some((product) =>
        product.variants.some(
          (variant) => variant.variantsId === currentVariantId,
        ),
      ),
    );
    const outer = document.getElementById("subscription_Outer");
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
        Subscription_innerText.style.display = "none";
        if (upcomingCard) upcomingCard.style.display = "none";
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  // "Upcoming product changes" card — admin preview jaisa UI
  // ────────────────────────────────────────────────────────────────

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatPrice(amount) {
    if (amount == null || isNaN(Number(amount))) return "";
    return `Rs. ${Number(amount).toFixed(2)}`;
  }

  // matchedPlan.products se ek product ka data (title/image/variants) nikalta hai
  function findProduct(matchedPlan, productId) {
    return (matchedPlan.products || []).find((p) => p.id === productId) || null;
  }

  function findVariant(product, variantId) {
    if (!product) return null;
    return (product.variants || []).find((v) => v.variantsId === variantId) || null;
  }

  // ek "row" (thumbnail + title + optional subtext + optional price) ka HTML
  function rowHtml({ imageUrl, title, subtitle, price }) {
    const img = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" class="upc-row__img" />`
      : `<div class="upc-row__img upc-row__img--placeholder"></div>`;
    return `
      <div class="upc-row">
        ${img}
        <div class="upc-row__text">
          <div class="upc-row__title">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="upc-row__subtitle">${escapeHtml(subtitle)}</div>` : ""}
          ${price ? `<div class="upc-row__price">${escapeHtml(price)}</div>` : ""}
        </div>
      </div>
    `;
  }

  // action ka source current product/variant se match karta hai ya nahi
  function actionTargetsCurrent(action, currentVariantId) {
    if (!action.sourceVariantId && !action.sourceProductId) return true;
    if (action.sourceVariantId) return action.sourceVariantId === currentVariantId;
    if (action.sourceProductId) return action.sourceProductId === currentProductGid;
    return false;
  }

  // ek cycle (orders threshold) ke matched actions se ek "Order #N" section ka HTML banata hai
  function buildOrderSectionHtml(matchedPlan, cycle, currentVariantId) {
    const swapActions = (cycle.actions || []).filter(
      (a) => a.type === "swap" && actionTargetsCurrent(a, currentVariantId),
    );
    const removeActions = (cycle.actions || []).filter(
      (a) => a.type === "remove" && actionTargetsCurrent(a, currentVariantId),
    );
    const addActions = (cycle.actions || []).filter((a) => a.type === "add");

    // agar iss product se koi swap/remove match nahi hua, to yeh order section skip karo
    if (swapActions.length === 0 && removeActions.length === 0) return null;

    const orderNumber = Number(cycle.orders) + 1;
    const sourceProduct = findProduct(matchedPlan, currentProductGid);
    const sourceVariant = currentVariantId
      ? findVariant(sourceProduct, currentVariantId)
      : null;

    const anySourceHasVariant = swapActions
      .concat(removeActions)
      .some((a) => a.sourceVariantId);

    const sourceRow = rowHtml({
      imageUrl: sourceVariant?.image || sourceProduct?.ProductImage || null,
      title: sourceProduct?.title || "This product",
      subtitle: anySourceHasVariant
        ? sourceVariant?.title || "Selected variant"
        : "All variants",
    });

    let swapHtml = "";
    if (swapActions.length > 0) {
      const destRows = [];
      swapActions.forEach((action) => {
        (action.dests || []).forEach((dest) => {
          const destProduct = findProduct(matchedPlan, dest.id);
          const variantIds = dest.variantIds || [];
          variantIds.forEach((variantId, idx) => {
            const variantName = dest.variantNames?.[idx];
            const variantImage =
              dest.variantImages?.[idx] ||
              findVariant(destProduct, variantId)?.image ||
              destProduct?.ProductImage ||
              null;
            const variantPrice =
              dest.variantPrices?.[idx] ??
              findVariant(destProduct, variantId)?.price ??
              null;

            destRows.push(
              rowHtml({
                imageUrl: variantImage,
                title: destProduct?.title || dest.name || "Product",
                subtitle: variantName || null,
                price: formatPrice(variantPrice),
              }),
            );
          });
        });
      });
      if (destRows.length) {
        swapHtml = `
          <div class="upc-label">WILL SWAP TO:</div>
          ${destRows.join("")}
        `;
      }
    }

    let removeHtml = "";
    if (removeActions.length > 0) {
      removeHtml = `<div class="upc-label upc-label--remove">WILL BE REMOVED</div>`;
    }

    let addHtml = "";
    if (addActions.length > 0) {
      const addRows = addActions.map((action) => {
        const addProduct = action.productId ? findProduct(matchedPlan, action.productId) : null;
        const addVariant = action.variantId ? findVariant(addProduct, action.variantId) : null;
        return rowHtml({
          imageUrl: action.imageUrl || addVariant?.image || addProduct?.ProductImage || null,
          title: action.productName || addProduct?.title || "Product",
          subtitle: action.variantName || addVariant?.title || null,
          price: formatPrice(action.currentPrice ?? addVariant?.price ?? null),
        });
      });
      addHtml = `
        <div class="upc-label upc-label--add">WILL BE ADDED</div>
        ${addRows.join("")}
      `;
    }

    return `
      <div class="upc-order">
        <button type="button" class="upc-order__header" data-upc-toggle="order">
          <span>Order #${orderNumber}</span>
          <svg class="upc-chevron" width="16" height="16" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="upc-order__body">
          ${sourceRow}
          ${swapHtml}
          ${removeHtml}
          ${addHtml}
        </div>
      </div>
    `;
  }

  function renderUpcomingChanges(matchedPlan) {
    if (!upcomingCard || !upcomingBody) return;

    if (!matchedPlan?.Automation || !Array.isArray(matchedPlan.automationCycles)) {
      upcomingCard.style.display = "none";
      upcomingBody.innerHTML = "";
      return;
    }

    const currentVariantId = variantInput
      ? `gid://shopify/ProductVariant/${variantInput.value}`
      : null;

    const sections = matchedPlan.automationCycles
      .map((cycle) => buildOrderSectionHtml(matchedPlan, cycle, currentVariantId))
      .filter(Boolean);

    if (sections.length === 0) {
      upcomingCard.style.display = "none";
      upcomingBody.innerHTML = "";
      return;
    }

    upcomingBody.innerHTML = sections.join("");
    upcomingCard.style.display = "block";

    // accordion toggles (naye render hone par dobara bind karna padta hai)
    upcomingBody.querySelectorAll('[data-upc-toggle="order"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.parentElement.classList.toggle("is-open");
      });
    });
    // pehla order section by default open rakho
    const first = upcomingBody.querySelector(".upc-order");
    if (first) first.classList.add("is-open");
  }

  if (upcomingCard) {
    const cardHeader = upcomingCard.querySelector('[data-upc-toggle="card"]');
    if (cardHeader) {
      cardHeader.addEventListener("click", () => {
        upcomingCard.classList.toggle("is-open");
      });
    }
  }

  planSelect.addEventListener("change", function () {
    currentSellingPlanId = this.value;
    const matchedPlan = allData
      .flatMap((group) => group.sellingPlans)
      .find(
        (plan) =>
          plan.shopifySellingPlanId.split("/").pop() === currentSellingPlanId,
      );

    if (!matchedPlan) {
      console.warn("No matching plan found for", currentSellingPlanId);
      if (Subscription_innerText) {
        Subscription_innerText.textContent = "";
      }
      if (upcomingCard) upcomingCard.style.display = "none";
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

    let QuantityChange = "";
    if (matchedPlan.changeQuantityAfterOrders) {
      const quantityAfterOrdersValue = matchedPlan.quantityAfterOrdersValue;
      const quantityAfterOrders = matchedPlan.quantityAfterOrders;
      QuantityChange = ` Quantity will change ${quantityAfterOrdersValue} after ${quantityAfterOrders} Orders.`;
    }

    if (Subscription_innerText) {
      Subscription_innerText.textContent = `Delivery: Every ${DeliveryCount} ${DeliveryInterval}. ${discountText} ${afterOrderSubscription} ${BothCombine} ${ShippingDiscount}  ${QuantityChange}`;
    }

    // naya: "Upcoming product changes" card render karo
    renderUpcomingChanges(matchedPlan);

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