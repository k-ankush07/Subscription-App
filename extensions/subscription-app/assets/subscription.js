(function () {
  const shop = window.Shopify?.shop;
  SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";
  console.log("key", SECRET_KEY);
  let planData = null;
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
      planData = data?.data?.[0];

      applyMinQuantity();

      console.log("Custom API data:", planData);
      return data;
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }

  getData();


 function applyMinQuantity() {
  const quantityInput = document.querySelector('[name="quantity"]');
  const currentQty = parseInt(quantityInput?.value || 1);
  console.log("Current quantity:", currentQty);

  planData?.sellingPlans?.forEach((plan, index) => {
    console.log(`Plan ${index + 1} - ${plan.name}`);

    if (plan.MinimumQuanitity === true) {
      console.log(`MinimumQuanitityValue:`, plan.MinimumQuanitityValue);
      // Current quantity me set karo
      if (quantityInput) {
        quantityInput.value = plan.MinimumQuanitityValue;
        console.log(`Quantity setsss to:`, plan.MinimumQuanitityValue);
      }
    } else {
      console.log(`MinimumQuanitity disabledsss, default value: 1`);
    }
  });
}
  const widget = document.getElementById("subscription-widget");
  if (!widget) return;

  const radios = widget.querySelectorAll('input[name="purchase_type"]');
  const plansContainer = document.getElementById("selling-plans-container");
  const planSelect = document.getElementById("selling-plan-select");
  const addToCartBtn =
    document.querySelector('[name="add"]') ||
    document.querySelector(".product-form__submit");

  let currentSellingPlanId = null;

  radios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (this.value === "subscription") {
        plansContainer.style.display = "block";
        currentSellingPlanId = planSelect.value;
      } else {
        plansContainer.style.display = "none";
        currentSellingPlanId = null;
      }
    });
  });

  planSelect.addEventListener("change", function () {
    currentSellingPlanId = this.value;
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
