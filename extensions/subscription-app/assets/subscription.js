(function () {
  var widget = document.getElementById('subscription-widget');
  if (!widget) return; 

  var radios = widget.querySelectorAll('input[name="purchase_type"]');
  var plansContainer = document.getElementById('selling-plans-container');
  var planSelect = document.getElementById('selling-plan-select');
  var addToCartBtn = document.querySelector('[name="add"]') 
                  || document.querySelector('.product-form__submit');

  // Show/hide plan dropdown based on selected radio
  radios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (this.value === 'subscription') {
        plansContainer.style.display = 'block';
        setSellingPlan(planSelect.value);
      } else {
        plansContainer.style.display = 'none';
        clearSellingPlan();
      }
    });
  });

  // When plan dropdown changes
  planSelect.addEventListener('change', function () {
    setSellingPlan(this.value);
  });

  function setSellingPlan(planId) {
    // Remove old hidden input if exists
    clearSellingPlan();
    var input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'selling_plan';
    input.id = 'selling-plan-input';
    input.value = planId;
    var form = document.querySelector('form[action="/cart/add"]');
    if (form) form.appendChild(input);
  }

  function clearSellingPlan() {
    var old = document.getElementById('selling-plan-input');
    if (old) old.remove();
  }

})();