// (function () {
//   const shop = window.Shopify?.shop;
//   SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32"
//   console.log("key", SECRET_KEY)
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

//       console.log("Custom API data:", data);
//       return data;
//     } catch (error) {
//       console.error("Fetch error:", error);
//     }
//   }

//   getData();
//   const widget = document.getElementById("subscription-widget");
//   if (!widget) return;

//   const radios = widget.querySelectorAll('input[name="purchase_type"]');
//   const plansContainer = document.getElementById("selling-plans-container");
//   const planSelect = document.getElementById("selling-plan-select");
//   const addToCartBtn =
//     document.querySelector('[name="add"]') ||
//     document.querySelector(".product-form__submit");

//   let currentSellingPlanId = null;

//   radios.forEach(function (radio) {
//     radio.addEventListener("change", function () {
//       if (this.value === "subscription") {
//         plansContainer.style.display = "block";
//         currentSellingPlanId = planSelect.value;
//       } else {
//         plansContainer.style.display = "none";
//         currentSellingPlanId = null;
//       }
//     });
//   });

//   planSelect.addEventListener("change", function () {
//     currentSellingPlanId = this.value;
//   });

//   if (addToCartBtn) {
//     addToCartBtn.addEventListener(
//       "click",
//       function (e) {
//         if (!currentSellingPlanId) return;

//         e.preventDefault();
//         e.stopImmediatePropagation();

//         const form = document.querySelector('form[action="/cart/add"]');
//         const variantId = form.querySelector('[name="id"]').value;
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
//             console.log("Cart response:", data);

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
  const SECRET_KEY = "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";

  let allPlansData = []; // ← store karo

  function extractId(gid) {
    return String(gid).split("/").pop(); // GID → numeric
  }

  async function getData() {
    try {
      const response = await fetch(
        `http://localhost:5000/plans/getAllPlans?shop=${shop}`,
        { headers: { "x-api-key": SECRET_KEY } }
      );
      const data = await response.json();
      allPlansData = data; // ← save karo
      console.log("Plans loaded:", allPlansData);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }

  function applyMinimumQuantity(selectedPlanId) {
    const quantityInput = document.querySelector('input[name="quantity"]');
    if (!quantityInput || !allPlansData.length) return;

    // Step 3 — selectedPlanId se match karo
    const matched = allPlansData.find(
      (plan) => extractId(plan.shopifySellingPlanId) === extractId(selectedPlanId)
    );

    console.log("Matched plan:", matched);

    if (matched && matched.MinimumQuantity === true) {
      const minVal = matched.MinimumQuantityValue || 1;
      quantityInput.min = minVal;
      if (parseInt(quantityInput.value) < minVal) {
        quantityInput.value = minVal;
      }
    } else {
      quantityInput.min = 1; // reset
    }
  }

  getData(); // ← fetch on load

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
        applyMinimumQuantity(currentSellingPlanId); // ← apply
      } else {
        plansContainer.style.display = "none";
        currentSellingPlanId = null;
        const quantityInput = document.querySelector('input[name="quantity"]');
        if (quantityInput) quantityInput.min = 1; // reset
      }
    });
  });

  planSelect.addEventListener("change", function () {
    currentSellingPlanId = this.value;
    applyMinimumQuantity(currentSellingPlanId); // ← apply on change
  });

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", function (e) {
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
        .then((res) => res.json())
        .then((data) => {
          console.log("Cart response:", data);
          document.dispatchEvent(new CustomEvent("cart:refresh"));
        })
        .catch((err) => console.error("Cart error:", err));
    }, true);
  }
})();