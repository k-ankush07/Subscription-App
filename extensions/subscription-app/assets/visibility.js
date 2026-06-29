export function updateWidgetVisibility(allData) {
  const variantInput = document.querySelector('form[action="/cart/add"] [name="id"]');
  const widget = document.getElementById("subscription-widget");
  const outer  = document.getElementById("subscription_Outer");

  if (!variantInput || !allData) return;

  const currentVariantId = `gid://shopify/ProductVariant/${variantInput.value}`;
  const hasPlan = allData.some((plan) =>
    plan.products.some((product) =>
      product.variants.some((variant) => variant.variantsId === currentVariantId)
    )
  );

  widget.style.display = hasPlan ? "block" : "none";
  outer.style.display  = hasPlan ? "block" : "none";
}

export function observeVariantChanges(allData) {
  const variantInput = document.querySelector('form[action="/cart/add"] [name="id"]');
  if (!variantInput) return;

  const observer = new MutationObserver(() => updateWidgetVisibility(allData));
  observer.observe(variantInput, { attributes: true, attributeFilter: ["value"] });

  // Radio buttons ke liye bhi
  document.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      setTimeout(() => updateWidgetVisibility(allData), 50);
    });
  });
}