// // (function () {
// //   var widget = document.getElementById('subscription-widget');
// //   if (!widget) return; 

// //   var radios = widget.querySelectorAll('input[name="purchase_type"]');
// //   var plansContainer = document.getElementById('selling-plans-container');
// //   var planSelect = document.getElementById('selling-plan-select');
// //   var addToCartBtn = document.querySelector('[name="add"]') 
// //                   || document.querySelector('.product-form__submit');
                  

// //   // Show/hide plan dropdown based on selected radio
// //   radios.forEach(function (radio) {
// //     radio.addEventListener('change', function () {
// //       if (this.value === 'subscription') {
// //         plansContainer.style.display = 'block';
// //         setSellingPlan(planSelect.value);
// //       } else {
// //         plansContainer.style.display = 'none';
// //         clearSellingPlan();
// //       }
// //     });
// //   });

// //   // When plan dropdown changes
// //   planSelect.addEventListener('change', function () {
// //     setSellingPlan(this.value);
// //   });

// //   function setSellingPlan(planId) {

// //     // Remove old hidden input if exists
// //     clearSellingPlan();
// //      var numericId = String(planId).split('/').pop();
// //      console.log("numve", numericId)
// //     var input = document.createElement('input');
// //     input.type = 'hidden';
// //     input.name = 'selling_plan';
// //     input.id = 'selling-plan-input';
// //     // input.value = numericId; 
// //     input.value = planId;
// //     var form = document.querySelector('form[action="/cart/add"]');
// //     if (form) form.appendChild(input);
// //     //  console.log("form:", form); 
// //   }

// //   function clearSellingPlan() {
// //     var old = document.getElementById('selling-plan-input');
// //     if (old) old.remove();
// //   }

// // })();


// (function () {
//   var widget = document.getElementById('subscription-widget');
//   if (!widget) return;

//   var radios = widget.querySelectorAll('input[name="purchase_type"]');
//   var plansContainer = document.getElementById('selling-plans-container');
//   var planSelect = document.getElementById('selling-plan-select');
//   var addToCartBtn = document.querySelector('[name="add"]') 
//                   || document.querySelector('.product-form__submit');

 

//   var currentSellingPlanId = null;

//   radios.forEach(function (radio) {
//     radio.addEventListener('change', function () {
//       if (this.value === 'subscription') {
//         plansContainer.style.display = 'block';
//         currentSellingPlanId = planSelect.value;
//         showDiscountInfo(currentSellingPlanId); 
//       } else {
//         plansContainer.style.display = 'none';
//         currentSellingPlanId = null;
//       }
//     });
//   });

//   planSelect.addEventListener('change', function () {
//     currentSellingPlanId = this.value;
//      showDiscountInfo(currentSellingPlanId);
//   });

//   // Add to cart intercept
//   if (addToCartBtn) {
//     addToCartBtn.addEventListener('click', function (e) {
//       if (!currentSellingPlanId) return; // one-time — normal flow

//       e.preventDefault();
//       e.stopImmediatePropagation();

//       var form = document.querySelector('form[action="/cart/add"]');
//       var variantId = form.querySelector('[name="id"]').value;
//       var quantity = form.querySelector('[name="quantity"]')?.value || 1;
      
//       console.log("Adding to cart:", { form,variantId, quantity, sellingPlan: currentSellingPlanId });

//       fetch('/cart/add.js', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           id: variantId,
//           quantity: parseInt(quantity),
//           selling_plan: parseInt(currentSellingPlanId),
//         }),
//       })
//       .then(function (res) { return res.json(); })
//       .then(function (data) {
//         console.log("Cart response:", data);
//         // Cart refresh karo
//         document.dispatchEvent(new CustomEvent('cart:refresh'));
//         // window.location.reload();
//       })
//       .catch(function (err) {
//         console.error("Cart error:", err);
//       });
//     }, true); //  true = capture phase, theme se pehle chalega
//   }

// })();


// // Discount info element create karo
// function showDiscountInfo(sellingPlanId) {
//   // Pehle purana remove karo
//   var old = document.getElementById('subscription-discount-info');
//   if (old) old.remove();

//   if (!productData || !sellingPlanId) return;

//   var discountInfo = null;

//   productData.selling_plan_groups.forEach(function(group) {
//     group.selling_plans.forEach(function(plan) {
//       if (String(plan.id) === String(sellingPlanId)) {
//         discountInfo = plan.price_adjustments;
//       }
//     });
//   });

//   if (!discountInfo || discountInfo.length === 0) return;

//   var html = '<div id="subscription-discount-info" style="margin-top:10px; font-size:13px; color:#333;">';

//   discountInfo.forEach(function(adj, i) {
//     var typeLabel = adj.value_type === 'percentage' 
//       ? adj.value + '% off'
//       : adj.value_type === 'fixed_amount'
//       ? '₹' + (adj.value / 100) + ' off'
//       : '₹' + (adj.value / 100) + ' fixed price';

//     if (i === 0) {
//       html += '<p>✓ First discount: <strong>' + typeLabel + '</strong></p>';
//     } else {
//       html += '<p>✓ After <strong>' + adj.order_count + '</strong> orders: <strong>' + typeLabel + '</strong></p>';
//     }
//   });

//   html += '</div>';

//   // Widget ke neeche add karo
//   var widget = document.getElementById('subscription-widget');
//   if (widget) widget.insertAdjacentHTML('afterend', html);
// }



(function () {
  var widget = document.getElementById('subscription-widget');
  if (!widget) return;

  var radios = widget.querySelectorAll('input[name="purchase_type"]');
  var plansContainer = document.getElementById('selling-plans-container');
  var planSelect = document.getElementById('selling-plan-select');
  var addToCartBtn = document.querySelector('[name="add"]') 
                  || document.querySelector('.product-form__submit');

  var currentSellingPlanId = null;
  var productData = null; // ← top pe declare karo

  // Product data fetch karo
  var handle = window.location.pathname.split('/products/')[1].split('?')[0];
  fetch('/products/' + handle + '.js')
    .then(function(res) { return res.json(); })
    .then(function(product) {
      productData = product;
    });

  // Discount info show karo
  function showDiscountInfo(sellingPlanId) {
    var old = document.getElementById('subscription-discount-info');
    if (old) old.remove();
    if (!productData || !sellingPlanId) return;

    var form = document.querySelector('form[action="/cart/add"]');
    var variantId = form ? form.querySelector('[name="id"]')?.value : null;
    var variant = variantId ? productData.variants.find(function(v) {
      return String(v.id) === String(variantId);
    }) : null;
    var originalPrice = variant ? variant.price : 0;

    var discountInfo = null;
    productData.selling_plan_groups.forEach(function(group) {
      group.selling_plans.forEach(function(plan) {
        if (String(plan.id) === String(sellingPlanId)) {
          discountInfo = plan.price_adjustments;
        }
      });
    });

    if (!discountInfo || discountInfo.length === 0) return;

    var html = '<div id="subscription-discount-info" style="margin-top:10px; padding:10px; background:#f4f4f4; border-radius:8px; font-size:13px;">';

    discountInfo.forEach(function(adj, i) {
      var discountedPrice, discountAmount, typeLabel;

      if (adj.value_type === 'percentage') {
        discountedPrice = originalPrice * (1 - adj.value / 100);
        discountAmount = originalPrice - discountedPrice;
        typeLabel = adj.value + '% off';
      } else if (adj.value_type === 'fixed_amount') {
        discountAmount = adj.value;
        discountedPrice = originalPrice - discountAmount;
        typeLabel = '₹' + (discountAmount / 100).toFixed(2) + ' off';
      } else {
        discountedPrice = adj.value;
        discountAmount = originalPrice - discountedPrice;
        typeLabel = '₹' + (discountedPrice / 100).toFixed(2) + ' fixed';
      }

      var finalPrice = (discountedPrice / 100).toFixed(2);
      var saved = (discountAmount / 100).toFixed(2);

      if (i === 0) {
        html += '<p style="margin:4px 0;">🏷️ <strong>Subscription price: ₹' + finalPrice + '</strong> (Save ₹' + saved + ' — ' + typeLabel + ')</p>';
      } else {
        html += '<p style="margin:4px 0;">🔄 After <strong>' + adj.order_count + ' orders</strong>: ₹' + finalPrice + ' (Save ₹' + saved + ' — ' + typeLabel + ')</p>';
      }
    });

    html += '</div>';
    var widgetEl = document.getElementById('subscription-widget');
    if (widgetEl) widgetEl.insertAdjacentHTML('afterend', html);
  }

  // Radio change
  radios.forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (this.value === 'subscription') {
        plansContainer.style.display = 'block';
        currentSellingPlanId = planSelect.value;
        showDiscountInfo(currentSellingPlanId);
      } else {
        plansContainer.style.display = 'none';
        currentSellingPlanId = null;
        showDiscountInfo(null);
      }
    });
  });

  // Plan dropdown change
  planSelect.addEventListener('change', function () {
    currentSellingPlanId = this.value;
    showDiscountInfo(currentSellingPlanId);
  });

  // Add to cart
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function (e) {
      if (!currentSellingPlanId) return;

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
      .then(function(res) { return res.json(); })
      .then(function(data) {
        console.log("Cart response:", data);
        document.dispatchEvent(new CustomEvent('cart:refresh'));
      })
      .catch(function(err) {
        console.error("Cart error:", err);
      });
    }, true);
  }

})();