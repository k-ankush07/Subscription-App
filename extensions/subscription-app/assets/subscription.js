(function () {
  const root = document.getElementById("subscription-widget-root");
  if (!root) return;

  const API = "https://your-production-api.com"; // TODO: prod URL daalo (same jo admin app use karti hai)
  const shop = root.dataset.shop;
  const productId = root.dataset.productId;
  const currencyCode = root.dataset.currency || "USD";

  const variantsJson = document.getElementById("subscription-variant-data");
  const variants = variantsJson ? JSON.parse(variantsJson.textContent) : [];

  let widgetConfig = null;
  let sellingPlans = [];
  let normalizedPlans = [];
  let selected = "onetime";
  let selectedPlanId = null;
  let basePrice = Number(root.dataset.price || 0) / 100; // Shopify prices are in cents in variant price field

  // ---------- ported helpers (from purchaseCardHelpers.js) ----------
  function formatMoney(amount, useCustomFormat) {
    const n = Number(amount) || 0;
    if (useCustomFormat) return `${n.toFixed(2)} ${currencyCode}`;
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode }).format(n);
    } catch {
      return `${n.toFixed(2)} ${currencyCode}`;
    }
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

  function discountLabelFor(sp, useCustomFormat) {
    if (!sp.giveSubscriptionDiscount) return undefined;
    if (sp.discountType === "PERCENTAGE") return `${sp.discountValue}% off`;
    if (sp.discountValue) return `${formatMoney(sp.discountValue, useCustomFormat)} off`;
    return undefined;
  }

  function computeSellingPlanPrice(base, sp) {
    if (!sp.giveSubscriptionDiscount) return base;
    if (sp.discountType === "PERCENTAGE") {
      return base - (base * Number(sp.discountValue || 0)) / 100;
    }
    return Math.max(base - Number(sp.discountValue || 0), 0);
  }

  function getSubscriptionDetails(sp) {
    if (!sp) return "";
    let discountText = "", afterOrderSubscription = "";
    if (sp.giveSubscriptionDiscount) {
      if (sp.discountType === "PERCENTAGE") discountText = `Discount: ${sp.discountValue}%.`;
      else if (sp.discountType === "PRICE") discountText = `Fixed Price: ${sp.discountValue}.`;
      else if (sp.discountType === "FIXED_AMOUNT") discountText = `Discount: ${sp.discountValue} off.`;

      if (sp.changeDiscountAfterOrders) {
        if (sp.afterDiscountType === "PERCENTAGE") afterOrderSubscription = `After ${sp.afterOrders} Orders Discount will change to ${sp.afterDiscountValue}%.`;
        else if (sp.afterDiscountType === "PRICE") afterOrderSubscription = `After ${sp.afterOrders} Orders price will be fixed at ${sp.afterDiscountValue}.`;
        else if (sp.afterDiscountType === "FIXED_AMOUNT") afterOrderSubscription = `After ${sp.afterOrders} Orders price will be reduced from original price ${sp.afterDiscountValue}.`;
      }
    }

    let cycles = "";
    if (sp.minCycles && sp.maxCycles) cycles = `You will be able to cancel your subscription after ${sp.minCycles} Orders. Subscription will cancel automatically after ${sp.maxCycles} Orders.`;
    else if (sp.minCycles) cycles = `You can cancel Subscription after ${sp.minCycles} Orders.`;
    else if (sp.maxCycles) cycles = `Subscription will cancel automatically after ${sp.maxCycles} Orders.`;

    let shipping = "";
    if (sp.giveShippingDiscount) {
      if (sp.shippingDiscountType === "PERCENTAGE") shipping = `Delivery price will be reduced by ${sp.shippingDiscountValue}% after ${sp.shippingAfterOrders} Orders.`;
      else if (sp.shippingDiscountType === "PRICE") shipping = `Delivery price will be fixed at ${sp.shippingDiscountValue} after ${sp.shippingAfterOrders} Orders.`;
      else if (sp.shippingDiscountType === "FIXED_AMOUNT") shipping = `Delivery price will be reduced by ${sp.shippingDiscountValue} after ${sp.shippingAfterOrders} Orders.`;
    }

    let qty = "";
    if (sp.changeQuantityAfterOrders) qty = `Quantity will change ${sp.quantityAfterOrdersValue} after ${sp.quantityAfterOrders} Orders.`;

    return [`Delivery: Every ${sp.intervalCount} ${sp.interval}.`, discountText, afterOrderSubscription, cycles, shipping, qty]
      .filter(Boolean).join(" ");
  }

  function normalizeSellingPlan(sp) {
    const useCustom = !!widgetConfig?.customize?.customCurrencyFormat;
    const price = computeSellingPlanPrice(basePrice, sp);
    return {
      id: String(sp.shopifySellingPlanId).split("/").pop(),
      name: sp.name,
      label: `Deliver ${deliveryPhrase(sp)}`,
      shortLabel: shortDeliveryLabel(sp),
      discountLabel: discountLabelFor(sp, useCustom),
      price: formatMoney(price, useCustom),
      comparePrice: formatMoney(basePrice, useCustom),
      raw: sp,
    };
  }

  // ---------- render ----------
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }

  function activePlan() {
    return normalizedPlans.find((p) => p.id === selectedPlanId) || normalizedPlans[0] || null;
  }

  function render() {
    const c = widgetConfig.customize || {};
    const template = widgetConfig.template; // radio | highlight | checkbox
    const plan = activePlan();

    let html = "";
    if (template === "radio") html = renderSimple(c, plan);
    else if (template === "highlight") html = renderDetailed(c, plan);
    else html = renderCompact(c, plan);

    root.querySelector(".sw-card")?.remove();
    root.insertAdjacentHTML("beforeend", `<div class="sw-card">${html}</div>`);
    bindEvents();
  }

  function radioDot(checked, color) {
    return `<span class="sw-radio" style="border-color:${checked ? color : "#999"}">
      ${checked ? `<span class="sw-radio-inner" style="background:${color}"></span>` : ""}
    </span>`;
  }

  function detailsBlock(plan) {
    if (selected === "onetime" || !plan?.raw) return "";
    return `<div class="sw-details"><strong>Subscription details</strong><div>${esc(getSubscriptionDetails(plan.raw))}</div></div>`;
  }

  function renderSimple(c, plan) {
    const radioColor = c.borderColor || "#111";
    const rows = normalizedPlans.map((p) => {
      const checked = selected === "subscribe" && plan?.id === p.id;
      const badge = c.customLabel ? esc(c.customLabelText || "") : esc(p.discountLabel || "");
      const label = c.displaySellingPlanName ? (p.name || p.label) : p.label;
      return `<div class="sw-plan-row" data-plan-id="${p.id}">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
          ${radioDot(checked, radioColor)}
          <span>${esc(label)}</span>
          ${badge ? `<span class="sw-badge" style="background:${c.labelBackgroundColor || "#eee"};color:${c.labelTextColor || "#111"}">${badge}</span>` : ""}
        </div>
        <div style="text-align:right">
          <span style="font-weight:700;color:${c.priceColor || "#000"}">${p.price}</span>
          ${c.displayCompareAtPrice ? `<div style="text-decoration:line-through;font-size:12px">${p.comparePrice}</div>` : ""}
        </div>
      </div>`;
    }).join("");

    return `
      ${c.blockTitle ? `<div class="sw-header"><span class="sw-line" style="background:${c.borderColor}"></span><span style="color:${c.blockTitleColor}">${esc(c.blockTitle)}</span><span class="sw-line" style="background:${c.borderColor}"></span></div>` : ""}
      <div class="sw-box ${selected === "onetime" ? "selected" : ""}" data-select="onetime" style="border-radius:${c.cornerRadius}px;padding:${c.spacing}px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px">${radioDot(selected === "onetime", radioColor)}<span style="color:${c.titleColor}">${esc(c.oneTimePurchaseTitle)}</span></div>
          <span style="color:${c.priceColor}">${formatMoney(basePrice, c.customCurrencyFormat)}</span>
        </div>
      </div>
      <div class="sw-box ${selected === "subscribe" ? "selected" : ""}" data-select="subscribe" style="border-radius:${c.cornerRadius}px;padding:${c.spacing}px">
        <div style="color:${c.titleColor};font-weight:700;margin-bottom:12px">${esc(c.subscriptionTitle)}</div>
        ${rows}
      </div>
      ${detailsBlock(plan)}`;
  }

  function renderDetailed(c, plan) {
    const radioColor = c.borderColor || "#111";
    const options = normalizedPlans.map((p) => `<option value="${p.id}" ${p.id === plan?.id ? "selected" : ""}>${esc(c.displaySellingPlanName ? (p.name || p.label) : p.label)}</option>`).join("");
    const benefits = [
      plan?.discountLabel ? `${plan.discountLabel} of all recurring orders` : "Discount on all recurring orders",
      "Lowest price option", "Easily swap & skip deliveries", "Cancel quickly anytime",
    ];
    const badge = c.customLabel ? esc(c.customLabelText || "") : (plan?.discountLabel ? `Save ${plan.discountLabel.replace(" off","")} on every delivery` : "Subscribe & save on every delivery");

    return `
      <div class="sw-box ${selected === "onetime" ? "selected" : ""}" data-select="onetime" style="border-radius:${c.cornerRadius}px;padding:${c.spacing}px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px">${radioDot(selected === "onetime", radioColor)}<span style="color:${c.titleColor}">${esc(c.oneTimePurchaseTitle)}</span></div>
          <span style="color:${c.priceColor}">${formatMoney(basePrice, c.customCurrencyFormat)}</span>
        </div>
      </div>
      <div class="sw-banner" style="background:${c.labelBackgroundColor};color:${c.labelTextColor}">${badge}</div>
      <div class="sw-box ${selected === "subscribe" ? "selected" : ""}" data-select="subscribe" style="border-radius:0 0 ${c.cornerRadius}px ${c.cornerRadius}px;padding:${c.spacing}px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px">${radioDot(selected === "subscribe", radioColor)}<span style="color:${c.titleColor}">${esc(c.subscriptionTitle)}</span></div>
          <div style="text-align:right">
            <div style="background:#eee;padding:4px 10px;border-radius:4px;color:${c.priceColor}">${plan?.price || ""}</div>
            ${c.displayCompareAtPrice ? `<div style="text-decoration:line-through;font-size:12px">${plan?.comparePrice || ""}</div>` : ""}
          </div>
        </div>
        <div style="font-weight:700;margin:16px 0 10px">How subscriptions work:</div>
        ${benefits.map((b, i) => `<div style="display:flex;gap:10px;margin-bottom:10px;${i === benefits.length -1 ? "justify-content:space-between" : ""}">
          <div style="display:flex;gap:10px"><span class="sw-check">✓</span><span>${esc(b)}</span></div>
          ${i === benefits.length - 1 ? `<select class="sw-plan-select">${options}</select>` : ""}
        </div>`).join("")}
      </div>
      ${detailsBlock(plan)}`;
  }

  function renderCompact(c, plan) {
    const checked = selected === "subscribe";
    const options = normalizedPlans.map((p) => `<option value="${p.id}" ${p.id === plan?.id ? "selected" : ""}>${esc(c.displaySellingPlanName ? (p.name || p.label) : p.label)}</option>`).join("");
    const badge = c.customLabel ? esc(c.customLabelText || "") : "";
    return `
      <div class="sw-box sw-dashed ${checked ? "selected" : ""}" data-select="${checked ? "onetime" : "subscribe"}" style="border-radius:${c.cornerRadius}px;padding:${c.spacing}px;border:2px dashed ${c.borderColor}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <span style="color:${c.titleColor};font-weight:700">
            ${esc(c.subscriptionTitle || "Subscribe & save")}
            ${c.displayCompareAtPrice ? ` <span style="text-decoration:line-through">${plan?.comparePrice || ""}</span>` : ""}
            ${badge ? `<span class="sw-badge">${badge}</span>` : ""}
          </span>
          <span style="color:${c.priceColor};font-weight:700">${plan?.price || ""}</span>
        </div>
        <div style="margin-top:8px">Deliver every: <select class="sw-plan-select">${options}</select></div>
      </div>
      ${checked ? detailsBlock(plan) : ""}`;
  }

  function bindEvents() {
    root.querySelectorAll("[data-select]").forEach((el) => {
      el.addEventListener("click", () => { selected = el.dataset.select; render(); });
    });
    root.querySelectorAll(".sw-plan-row").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); selected = "subscribe"; selectedPlanId = el.dataset.planId; render(); });
    });
    root.querySelector(".sw-plan-select")?.addEventListener("change", (e) => {
      e.stopPropagation(); selected = "subscribe"; selectedPlanId = e.target.value; render();
    });
  }

  // ---------- add to cart ----------
  function bindAddToCart() {
    const form = document.querySelector('form[action="/cart/add"]');
    const addBtn = form?.querySelector('[name="add"], .product-form__submit');
    if (!addBtn) return;
    addBtn.addEventListener("click", function (e) {
      if (selected !== "subscribe") return; // one-time -> normal Shopify flow
      const plan = activePlan();
      if (!plan) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const variantId = form.querySelector('[name="id"]').value;
      const quantity = form.querySelector('[name="quantity"]')?.value || 1;
      fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: parseInt(quantity), selling_plan: parseInt(plan.id) }),
      }).then((r) => r.json()).then(() => document.dispatchEvent(new CustomEvent("cart:refresh")))
        .catch((err) => console.error("Cart error:", err));
    }, true);
  }

  function updatePriceForVariant(variantId) {
    const v = variants.find((v) => String(v.id) === String(variantId));
    if (v) basePrice = Number(v.price) / 100;
  }

  function bindVariantWatcher() {
    const variantInput = document.querySelector('form[action="/cart/add"] [name="id"]');
    if (!variantInput) return;
    const sync = () => { updatePriceForVariant(variantInput.value); normalizedPlans = sellingPlans.map(normalizeSellingPlan); render(); };
    new MutationObserver(sync).observe(variantInput, { attributes: true, attributeFilter: ["value"] });
  }

  async function init() {
    try {
      const res = await fetch(`${API}/api/widgets/for-product?shop=${encodeURIComponent(shop)}&productId=${encodeURIComponent(productId)}`);
      const data = await res.json();
      if (!data.success || !data.widget) { root.style.display = "none"; return; }

      widgetConfig = data.widget;
      sellingPlans = data.plan?.sellingPlans || [];
      normalizedPlans = sellingPlans.map(normalizeSellingPlan);
      selected = widgetConfig.customize?.preselectSubscription ? "subscribe" : "onetime";
      selectedPlanId = normalizedPlans[0]?.id || null;

      render();
      bindAddToCart();
      bindVariantWatcher();
    } catch (err) {
      console.error("subscription widget fetch error:", err);
    }
  }

  init();
})();