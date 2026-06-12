
(function () {
  var widget = document.getElementById('subscription-widget');
  if (!widget) return;

  var radios = widget.querySelectorAll('input[name="purchase_type"]');
  var plansContainer = document.getElementById('selling-plans-container');
  var planSelect = document.getElementById('selling-plan-select');
  var addToCartBtn = document.querySelector('[name="add"]') 
                  || document.querySelector('.product-form__submit');

 

  var currentSellingPlanId = null;

  radios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (this.value === 'subscription') {
        plansContainer.style.display = 'block';
        currentSellingPlanId = planSelect.value;
      } else {
        plansContainer.style.display = 'none';
        currentSellingPlanId = null;
      }
    });
  });

  planSelect.addEventListener('change', function () {
    currentSellingPlanId = this.value;
  });

  // Add to cart intercept
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function (e) {
      if (!currentSellingPlanId) return; // one-time — normal flow

      e.preventDefault();
      e.stopImmediatePropagation();

      var form = document.querySelector('form[action="/cart/add"]');
      var variantId = form.querySelector('[name="id"]').value;
      var quantity = form.querySelector('[name="quantity"]')?.value || 1;
      


      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: variantId,
          quantity: parseInt(quantity),
          selling_plan: parseInt(currentSellingPlanId),
        }),
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        console.log("Cart response:", data);
        // Cart refresh karo
        document.dispatchEvent(new CustomEvent('cart:refresh'));
        // window.location.reload();
      })
      .catch(function (err) {
        console.error("Cart error:", err);
      });
    }, true); //  true = capture phase, theme se pehle chalega
  }

})();





