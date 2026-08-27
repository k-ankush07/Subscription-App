



(function () {
  const shop = window.Shopify?.shop;
  const SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";
  const API_BASE = "https://habitant-startling-cassette.ngrok-free.dev";

  const mount = document.getElementById("subscription-widget-mount");
  if (!mount) return;

  const variantInput = document.querySelector('form[action="/cart/add"] [name="id"]');
  const quantityInput = document.querySelector('[name="quantity"]');
  const addToCartBtn =
    document.querySelector('[name="add"]') || document.querySelector(".product-form__submit");

  const currencyCode = mount.dataset.currency || "USD";

  let allPlans = null;
  const widgetCache = {};
  let currentSellingPlanId = null;
  const state = { selected: null, selectedPlanId: null };

  // ---------------- data fetching ----------------

  async function fetchPlans() {
    try {
      const res = await fetch(`${API_BASE}/plans/getAllPlans?shop=${shop}`, {
        headers: { "x-api-key": SECRET_KEY, "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      allPlans = data.data || [];
      render();
    } catch (err) {
      console.error("Fetch plans error:", err);
    }
  }

  // NOTE: assumes a GET /api/widgets/:widgetId endpoint (per widgetController.getWidgetById).
  // Update API_BASE / path here if your widget routes are mounted elsewhere.
  async function fetchWidget(widgetId) {
    if (!widgetId) return null;
    if (widgetCache[widgetId]) return widgetCache[widgetId];
    try {
      const res = await fetch(`${API_BASE}/api/widgets/${widgetId}`, {
        headers: { "x-api-key": SECRET_KEY, "ngrok-skip-browser-warning": "true" },
      });
      const data = await res.json();
      if (data.success) {
        widgetCache[widgetId] = data.widget;
        return data.widget;
      }
    } catch (err) {
      console.error("Fetch widget error:", err);
    }
    return null;
  }

  function findMatchedPlan(variantId) {
    if (!allPlans || !variantId) return null;
    const gid = `gid://shopify/ProductVariant/${variantId}`;
    return (
      allPlans.find((plan) =>
        (plan.products || []).some((product) =>
          (product.variants || []).some((v) => v.variantsId === gid)
        )
      ) || null
    );
  }

  function findMatchedProduct(plan, variantId) {
    const gid = `gid://shopify/ProductVariant/${variantId}`;
    return (
      (plan.products || []).find((p) => (p.variants || []).some((v) => v.variantsId === gid)) ||
      null
    );
  }

  // ---------------- money / plan helpers (mirrors purchaseCardHelpers.js) ----------------

  function currencySymbol(code) {
    const map = { USD: "$", INR: "₹", EUR: "€", GBP: "£" };
    return map[code] || "";
  }
  function formatMoney(amount) {
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
  function discountLabelFor(sp) {
    if (!sp.giveSubscriptionDiscount) return "";
    if (sp.discountType === "PERCENTAGE") return `${sp.discountValue}% off`;
    if (sp.discountValue) return `${formatMoney(sp.discountValue)} off`;
    return "";
  }
  function computeSellingPlanPrice(basePrice, sp) {
    if (!sp.giveSubscriptionDiscount) return basePrice;
    if (sp.discountType === "PERCENTAGE") {
      return basePrice - (basePrice * Number(sp.discountValue || 0)) / 100;
    }
    return Math.max(basePrice - Number(sp.discountValue || 0), 0);
  }
  function getSubscriptionDetails(sp) {
    const parts = [`Delivery: Every ${sp.intervalCount} ${sp.interval}.`];
    if (sp.giveSubscriptionDiscount) {
      if (sp.discountType === "PERCENTAGE") parts.push(`Discount: ${sp.discountValue}%.`);
      else if (sp.discountType === "PRICE") parts.push(`Fixed Price: ${sp.discountValue}.`);
      else if (sp.discountType === "FIXED_AMOUNT") parts.push(`Discount: ${sp.discountValue} off.`);

      if (sp.changeDiscountAfterOrders) {
        if (sp.afterDiscountType === "PERCENTAGE")
          parts.push(`After ${sp.afterOrders} Orders Discount will change to ${sp.afterDiscountValue}%.`);
        else if (sp.afterDiscountType === "PRICE")
          parts.push(`After ${sp.afterOrders} Orders price will be fixed at ${sp.afterDiscountValue}.`);
        else if (sp.afterDiscountType === "FIXED_AMOUNT")
          parts.push(`After ${sp.afterOrders} Orders price will be reduced by ${sp.afterDiscountValue}.`);
      }
    }
    if (sp.minCycles || sp.maxCycles) {
      if (sp.minCycles && sp.maxCycles)
        parts.push(`You can cancel after ${sp.minCycles} orders. Auto-cancels after ${sp.maxCycles} orders.`);
      else if (sp.minCycles) parts.push(`You can cancel after ${sp.minCycles} orders.`);
      else if (sp.maxCycles) parts.push(`Auto-cancels after ${sp.maxCycles} orders.`);
    }
    if (sp.giveShippingDiscount) {
      if (sp.shippingDiscountType === "PERCENTAGE")
        parts.push(`Delivery price reduced by ${sp.shippingDiscountValue}% after ${sp.shippingAfterOrders} orders.`);
      else if (sp.shippingDiscountType === "PRICE")
        parts.push(`Delivery price fixed at ${sp.shippingDiscountValue} after ${sp.shippingAfterOrders} orders.`);
      else if (sp.shippingDiscountType === "FIXED_AMOUNT")
        parts.push(`Delivery price reduced by ${sp.shippingDiscountValue} after ${sp.shippingAfterOrders} orders.`);
    }
    if (sp.changeQuantityAfterOrders) {
      parts.push(`Quantity changes to ${sp.quantityAfterOrdersValue} after ${sp.quantityAfterOrders} orders.`);
    }
    return parts.filter(Boolean).join(" ");
  }
  function truncateText(text, max = 22) {
    if (!text) return text;
    return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
  }
  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function normalizePlans(planDoc, basePrice) {
    return (planDoc.sellingPlans || []).map((sp) => {
      const price = computeSellingPlanPrice(basePrice, sp);
      return {
        id: String(sp.shopifySellingPlanId).split("/").pop(),
        raw: sp,
        name: sp.name,
        label: `Deliver ${deliveryPhrase(sp)}`,
        shortLabel: shortDeliveryLabel(sp),
        discountLabel: discountLabelFor(sp),
        price: formatMoney(price),
        comparePrice: formatMoney(basePrice),
      };
    });
  }

  function activePlan(plans) {
    return plans.find((p) => p.id === state.selectedPlanId) || plans[0] || null;
  }

  // ---------------- render ----------------

  function render() {
    if (!allPlans) return;
    const isDesignMode = mount.dataset.designMode === "true";
    const variantId = variantInput ? variantInput.value : null;

    let matchedPlan = variantId ? findMatchedPlan(variantId) : null;
    let isFallbackPreview = false;

    // Real storefront: only show when this product/variant actually has a plan assigned.
    // Theme editor (design mode): always show something so the merchant can see the widget.
    if (!matchedPlan) {
      if (isDesignMode && allPlans.length > 0) {
        matchedPlan = allPlans[0];
        isFallbackPreview = true;
      } else {
        mount.style.display = "none";
        mount.innerHTML = "";
        return;
      }
    }

    fetchWidget(matchedPlan.widget).then((widget) => {
      if (!widget) {
        mount.style.display = "none";
        mount.innerHTML = "";
        return;
      }

      const product = isFallbackPreview ? null : findMatchedProduct(matchedPlan, variantId);
      const basePrice = Number(
        mount.dataset.price || product?.price || product?.minPrice || 0
      );

      const plans = normalizePlans(matchedPlan, basePrice);
      if (!plans.length) {
        mount.style.display = "none";
        mount.innerHTML = "";
        return;
      }

      if (!state.selectedPlanId || !plans.some((p) => p.id === state.selectedPlanId)) {
        state.selectedPlanId = plans[0].id;
      }
      if (state.selected === null) {
        // default to "subscribe" unless the merchant explicitly turned preselect off
        state.selected = widget.customize?.preselectSubscription === false ? "onetime" : "subscribe";
        currentSellingPlanId = state.selected === "subscribe" ? state.selectedPlanId : null;
        if (currentSellingPlanId) applyMinQuantity(plans);
      }

      mount.style.display = "block";
      mount.innerHTML = renderCard(widget, plans, basePrice);
      bindEvents(widget, plans, basePrice);
    });
  }

  const TEMPLATE_TO_VARIANT = { radio: "simple", highlight: "detailed", checkbox: "compact" };

  function renderCard(widget, plans, basePrice) {
    const variant = TEMPLATE_TO_VARIANT[widget.template] || "simple";
    if (variant === "compact") return renderCompact(widget, plans, basePrice);
    if (variant === "detailed") return renderDetailed(widget, plans, basePrice);
    return renderSimple(widget, plans, basePrice);
  }

  function getCustomize(widget) {
    return Object.assign(
      {
        blockTitle: "",
        oneTimePurchaseTitle: "One-time purchase",
        subscriptionTitle: "Subscribe & save",
        cornerRadius: 8,
        spacing: 14,
        borderWidth: 2,
        borderStyle: "solid",
        cardColor: "#fff",
        selectedCardColor: "#fff",
        borderColor: "#111",
        blockTitleColor: "#100e0e",
        titleColor: "#111",
        priceColor: "#000",
        labelBackgroundColor: "#e8e8e8",
        labelTextColor: "#111",
        displayCompareAtPrice: false,
        displaySellingPlanName: false,
        customLabel: false,
        customLabelText: "",
      },
      widget.customize || {}
    );
  }

  function radioDot(checked, color) {
    return `<span style="width:18px;height:18px;border-radius:50%;border:2px solid ${
      checked ? color : "#999"
    };display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
      ${checked ? `<span style="width:9px;height:9px;border-radius:50%;background:${color};"></span>` : ""}
    </span>`;
  }

  function detailsBlockHtml(selected, ap) {
    if (!(selected === "subscribe" && ap?.raw)) return "";
    return `<div style="margin-bottom:12px;color:#555;font-size:13px;line-height:1.6;">
      <strong>Subscription details</strong>
      <div style="margin-top:6px;">${escapeHtml(getSubscriptionDetails(ap.raw))}</div>
    </div>`;
  }

  // ---- compact (checkbox) template — single card with a "Deliver every" select ----
  function renderCompact(widget, plans, basePrice) {
    const c = getCustomize(widget);
    const border = c.borderStyle === "none" ? "none" : `${c.borderWidth}px ${c.borderStyle} ${c.borderColor}`;
    const checked = state.selected === "subscribe";
    const ap = activePlan(plans);
    const customBadge = c.customLabel ? c.customLabelText || "" : "";
    const titleText = escapeHtml(truncateText(c.subscriptionTitle?.trim() || "Subscribe & save", 28));

    const optionsHtml = plans
      .map((p) => {
        const label = escapeHtml(c.displaySellingPlanName ? truncateText(p.name || p.shortLabel, 18) : p.shortLabel);
        return `<option value="${p.id}" ${p.id === ap?.id ? "selected" : ""}>${label}</option>`;
      })
      .join("");

    return `
      <div style="background:#808080;border-radius:8px;padding:20px;font-family:sans-serif;box-sizing:border-box;">
        <div class="sw-toggle" style="border:${border};border-radius:${c.cornerRadius}px;padding:${c.spacing}px;margin-bottom:12px;cursor:pointer;background:${checked ? c.selectedCardColor : c.cardColor};box-sizing:border-box;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <span style="width:20px;height:20px;border-radius:4px;background:${checked ? "#111" : "#fff"};border:${checked ? "none" : "2px solid #999"};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:2px;">${checked ? "✓" : ""}</span>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
                <span style="font-weight:700;font-size:15px;color:${c.titleColor};">
                  ${titleText}
                  ${customBadge ? `<span style="background:${c.labelBackgroundColor};color:${c.labelTextColor};font-size:12px;font-weight:600;border-radius:12px;padding:2px 10px;margin-left:8px;">${escapeHtml(customBadge)}</span>` : ""}
                </span>
                <span style="text-align:right;flex-shrink:0;white-space:nowrap;">
                  ${c.displayCompareAtPrice && ap?.comparePrice ? `<span style="color:#888;text-decoration:line-through;font-size:13px;margin-right:6px;">${ap.comparePrice}</span>` : ""}
                  <span style="font-weight:700;color:${c.priceColor};">${ap?.price || ""}</span>
                </span>
              </div>
              <div class="sw-select-row" style="display:flex;align-items:center;gap:6px;margin-top:6px;">
                <span style="color:#555;font-size:13px;flex-shrink:0;">Deliver every:</span>
                <select class="sw-plan-select" style="padding:5px;border-radius:8px;outline:0;">
                  ${optionsHtml}
                </select>
              </div>
            </div>
          </div>
        </div>
        ${detailsBlockHtml(state.selected, ap)}
      </div>`;
  }

  // ---- detailed (highlight) template — banner + benefits list + select ----
  function renderDetailed(widget, plans, basePrice) {
    const c = getCustomize(widget);
    const border = c.borderStyle === "none" ? "none" : `${c.borderWidth}px ${c.borderStyle} ${c.borderColor}`;
    const oneTimeSelected = state.selected === "onetime";
    const subSelected = state.selected === "subscribe";
    const ap = activePlan(plans);
    const customBadge = c.customLabel ? c.customLabelText || "" : "";
    const bannerLabel = customBadge || (ap?.discountLabel ? `Save ${ap.discountLabel.replace(" off", "")} on every delivery` : "Subscribe & save on every delivery");
    const benefits = [
      ap?.discountLabel ? `${ap.discountLabel} of all recurring orders` : "Discount on all recurring orders",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ];
    const optionsHtml = plans
      .map((p) => {
        const label = escapeHtml(c.displaySellingPlanName ? truncateText(p.name || p.shortLabel, 20) : p.shortLabel);
        return `<option value="${p.id}" ${p.id === ap?.id ? "selected" : ""}>${label}</option>`;
      })
      .join("");

    const benefitsHtml = benefits
      .map(
        (b, i) => `
      <div style="display:flex;align-items:flex-start;justify-content:${i === benefits.length - 1 ? "space-between" : "flex-start"};gap:10px;margin-bottom:10px;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <span style="width:18px;height:18px;border-radius:50%;background:#111;color:#fff;font-size:11px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">✓</span>
          <span>${escapeHtml(b)}</span>
        </div>
        ${
          i === benefits.length - 1
            ? `<div style="width:150px;flex-shrink:0;">
                 <div style="font-size:13px;color:#333;margin-bottom:4px;">Deliver every:</div>
                 <select class="sw-plan-select" style="padding:5px;border-radius:8px;outline:0;width:100%;">${optionsHtml}</select>
               </div>`
            : ""
        }
      </div>`
      )
      .join("");

    return `
      <div style="background:#808080;border-radius:8px;padding:20px;font-family:sans-serif;box-sizing:border-box;">
        <div class="sw-onetime" style="border:${border};border-radius:${c.cornerRadius}px;padding:${c.spacing}px;margin-bottom:12px;cursor:pointer;background:${oneTimeSelected ? c.selectedCardColor : c.cardColor};box-sizing:border-box;display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${radioDot(oneTimeSelected, c.borderColor)}
            <span style="font-weight:700;font-size:16px;color:${c.titleColor};">${escapeHtml(c.oneTimePurchaseTitle)}</span>
          </div>
          <span style="font-weight:600;color:${c.priceColor};">${formatMoney(basePrice)}</span>
        </div>
        <div style="background:${c.labelBackgroundColor};color:${c.labelTextColor};text-align:center;font-weight:600;font-size:13px;padding:8px 0;border-radius:${c.cornerRadius}px ${c.cornerRadius}px 0 0;">${escapeHtml(bannerLabel)}</div>
        <div class="sw-subscribe" style="border:${border};border-radius:0 0 ${c.cornerRadius}px ${c.cornerRadius}px;padding:${c.spacing}px;margin-bottom:12px;cursor:pointer;background:${subSelected ? c.selectedCardColor : c.cardColor};box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${radioDot(subSelected, c.borderColor)}
              <span style="font-weight:700;font-size:16px;color:${c.titleColor};">${escapeHtml(c.subscriptionTitle)}</span>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <div style="background:#eee;font-weight:700;color:${c.priceColor};padding:4px 10px;border-radius:4px;">${ap?.price || ""}</div>
              ${c.displayCompareAtPrice && ap?.comparePrice ? `<div style="color:#000;text-decoration:line-through;font-size:13px;margin-top:2px;">${ap.comparePrice}</div>` : ""}
            </div>
          </div>
          <div style="font-weight:700;margin-top:16px;margin-bottom:10px;">How subscriptions work:</div>
          ${benefitsHtml}
        </div>
        ${detailsBlockHtml(state.selected, ap)}
      </div>`;
  }

  function renderSimple(widget, plans, basePrice) {
    const c = Object.assign(
      {
        blockTitle: "",
        oneTimePurchaseTitle: "One-time purchase",
        subscriptionTitle: "Subscribe & save",
        cornerRadius: 8,
        spacing: 14,
        borderWidth: 2,
        borderStyle: "solid",
        cardColor: "#fff",
        selectedCardColor: "#fff",
        borderColor: "#111",
        blockTitleColor: "#100e0e",
        titleColor: "#111",
        priceColor: "#000",
        labelBackgroundColor: "#e8e8e8",
        labelTextColor: "#111",
        displayCompareAtPrice: false,
        displaySellingPlanName: false,
        customLabel: false,
        customLabelText: "",
      },
      widget.customize || {}
    );

    const border = c.borderStyle === "none" ? "none" : `${c.borderWidth}px ${c.borderStyle} ${c.borderColor}`;
    const oneTimeSelected = state.selected === "onetime";
    const subSelected = state.selected === "subscribe";
    const ap = activePlan(plans);

    const boxStyle = (sel) =>
      `border-radius:${c.cornerRadius}px;padding:${c.spacing}px;margin-bottom:12px;cursor:pointer;background:${
        sel ? c.selectedCardColor : c.cardColor
      };border:${border};box-sizing:border-box;`;

    const radio = (checked) => `
      <span style="width:18px;height:18px;border-radius:50%;border:2px solid ${
        checked ? c.borderColor : "#999"
      };display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
        ${checked ? `<span style="width:9px;height:9px;border-radius:50%;background:${c.borderColor};"></span>` : ""}
      </span>`;

    const planRows = plans
      .map((p) => {
        const checked = subSelected && ap?.id === p.id;
        const label = escapeHtml(c.displaySellingPlanName ? truncateText(p.name || p.label, 26) : p.label);
        const badge = c.customLabel ? c.customLabelText || "" : p.discountLabel || "";
        return `
        <div class="sp-option" data-plan-id="${p.id}" style="display:flex;justify-content:space-between;align-items:center;padding-left:4px;margin-bottom:10px;gap:12px;cursor:pointer;">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            ${radio(checked)}
            <span style="color:${c.titleColor};word-break:break-word;">${label}</span>
            ${
              badge
                ? `<span style="background:${c.labelBackgroundColor};color:${c.labelTextColor};font-size:12px;font-weight:600;border-radius:12px;padding:2px 10px;">${escapeHtml(
                    badge
                  )}</span>`
                : ""
            }
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <span style="font-weight:700;color:${c.priceColor};">${p.price}</span>
            ${
              c.displayCompareAtPrice
                ? `<div style="color:#000;text-decoration:line-through;font-size:12px;">${p.comparePrice}</div>`
                : ""
            }
          </div>
        </div>`;
      })
      .join("");

    const detailsBlock =
      state.selected === "subscribe" && ap?.raw
        ? `<div style="margin-bottom:12px;color:#555;font-size:13px;line-height:1.6;">
             <strong>Subscription details</strong>
             <div style="margin-top:6px;">${escapeHtml(getSubscriptionDetails(ap.raw))}</div>
           </div>`
        : "";

    return `
      <div style="background:#808080;border-radius:8px;padding:20px;font-family:sans-serif;">
        ${
          c.blockTitle
            ? `<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                 <span style="flex:1;height:2px;background:${c.borderColor};"></span>
                 <span style="font-weight:bold;font-size:14px;color:${c.blockTitleColor};">${escapeHtml(
                c.blockTitle
              )}</span>
                 <span style="flex:1;height:2px;background:${c.borderColor};"></span>
               </div>`
            : ""
        }
        <div class="sw-onetime" style="${boxStyle(oneTimeSelected)}display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            ${radio(oneTimeSelected)}
            <span style="font-weight:700;color:${c.titleColor};">${escapeHtml(c.oneTimePurchaseTitle)}</span>
          </div>
          <span style="font-weight:600;color:${c.priceColor};">${formatMoney(basePrice)}</span>
        </div>
        <div class="sw-subscribe" style="${boxStyle(subSelected)}">
          <div style="font-weight:700;font-size:16px;color:${c.titleColor};margin-bottom:12px;">${escapeHtml(
      c.subscriptionTitle
    )}</div>
          ${planRows}
        </div>
        ${detailsBlock}
      </div>`;
  }

  function rerender(widget, plans, basePrice) {
    mount.innerHTML = renderCard(widget, plans, basePrice);
    bindEvents(widget, plans, basePrice);
  }

  function selectSubscribe(planId, plans) {
    state.selected = "subscribe";
    state.selectedPlanId = planId;
    currentSellingPlanId = planId;
    applyMinQuantity(plans);
  }

  function selectOneTime() {
    state.selected = "onetime";
    currentSellingPlanId = null;
    resetQuantity();
  }

  function bindEvents(widget, plans, basePrice) {
    // simple template
    mount.querySelector(".sw-onetime")?.addEventListener("click", () => {
      selectOneTime();
      rerender(widget, plans, basePrice);
    });
    mount.querySelectorAll(".sp-option").forEach((el) => {
      el.addEventListener("click", () => {
        selectSubscribe(el.dataset.planId, plans);
        rerender(widget, plans, basePrice);
      });
    });

    // detailed template — same .sw-onetime handler above also applies here
    mount.querySelector(".sw-subscribe")?.addEventListener("click", (e) => {
      if (e.target.closest(".sw-plan-select")) return;
      selectSubscribe(state.selectedPlanId || plans[0]?.id, plans);
      rerender(widget, plans, basePrice);
    });

    // compact template
    mount.querySelector(".sw-toggle")?.addEventListener("click", (e) => {
      if (e.target.closest(".sw-select-row")) return;
      if (state.selected === "subscribe") selectOneTime();
      else selectSubscribe(state.selectedPlanId || plans[0]?.id, plans);
      rerender(widget, plans, basePrice);
    });

    // compact + detailed dropdown
    mount.querySelector(".sw-plan-select")?.addEventListener("click", (e) => e.stopPropagation());
    mount.querySelector(".sw-plan-select")?.addEventListener("change", (e) => {
      selectSubscribe(e.target.value, plans);
      rerender(widget, plans, basePrice);
    });
  }

  function resetQuantity() {
    if (!quantityInput) return;
    quantityInput.value = 1;
    quantityInput.min = 1;
    quantityInput.setAttribute("data-min", 1);
  }

  function applyMinQuantity(plans) {
    if (!quantityInput) return;
    const ap = activePlan(plans);
    if (ap?.raw?.MinimumQuanitity) {
      const minVal = ap.raw.MinimumQuanitityValue;
      quantityInput.value = minVal;
      quantityInput.min = minVal;
      quantityInput.setAttribute("data-min", minVal);
    } else {
      resetQuantity();
    }
  }

  // ---------------- variant change + add to cart ----------------

  if (variantInput) {
    const observer = new MutationObserver(render);
    observer.observe(variantInput, { attributes: true, attributeFilter: ["value"] });
  }

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
          .then((res) => res.json())
          .then(() => document.dispatchEvent(new CustomEvent("cart:refresh")))
          .catch((err) => console.error("Cart error:", err));
      },
      true
    );
  }

  fetchPlans();
})();