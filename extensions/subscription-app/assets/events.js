import { updateWidgetVisibility, observeVariantChanges } from "./visibility.js";
import { handlePlanChange } from "./ui.js";
import { handleAddToCart } from "./cart.js";

export function bindAllEvents(allData) {
  let currentSellingPlanId = null;

  const planSelect    = document.getElementById("selling-plan-select");
  const plansContainer = document.getElementById("selling-plans-container");
  const infoEl        = document.getElementsByClassName("Subscription_innerText")[0];
  const quantityInput = document.querySelector('[name="quantity"]');
  const addToCartBtn  = document.querySelector('[name="add"]') ||
                        document.querySelector(".product-form__submit");
  const radios        = document.querySelectorAll('input[name="purchase_type"]');

  // Variant observer
  observeVariantChanges(allData);
  updateWidgetVisibility(allData);

  // Radio: one-time vs subscription toggle
  radios.forEach((radio) => {
    radio.addEventListener("change", function () {
      if (this.value === "subscription") {
        plansContainer.style.display = "block";
        infoEl.style.display = "block";
        if (planSelect.value) planSelect.dispatchEvent(new Event("change"));
      } else {
        plansContainer.style.display = "none";
        infoEl.style.display = "none";
        currentSellingPlanId = null;
        planSelect.selectedIndex = 0;
        quantityInput.value = 1;
        quantityInput.min   = 1;
        quantityInput.setAttribute("data-min", 1);
      }
    });
  });

  // Plan dropdown
  planSelect.addEventListener("change", function () {
    currentSellingPlanId = this.value;
    handlePlanChange(currentSellingPlanId, allData);
  });

  // Add to cart button
  if (addToCartBtn) {
    addToCartBtn.addEventListener(
      "click",
      (e) => handleAddToCart(e, currentSellingPlanId),
      true
    );
  }
}