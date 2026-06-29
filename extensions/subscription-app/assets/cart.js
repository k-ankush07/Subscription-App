export function handleAddToCart(e, currentSellingPlanId) {
  if (!currentSellingPlanId) return;
  e.preventDefault();
  e.stopImmediatePropagation();

  const form      = document.querySelector('form[action="/cart/add"]');
  const variantId = form.querySelector('[name="id"]').value;
  const quantity  = form.querySelector('[name="quantity"]')?.value || 1;

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
    .catch((err) => console.error("Cart error:", err));
}