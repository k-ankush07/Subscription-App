// ============================================================
// subscription-api.js
// Handles API calls and variant-level plan data
// ============================================================

(function () {
  const SECRET_KEY =
    "08466sdmfbf94374nkjsnfdkyry89nfksd388934jkdsf89y389bjkkr32";

  // Shared state — exposed on window so subscription-widget.js can read it
  window.SubscriptionApp = window.SubscriptionApp || {};
  window.SubscriptionApp.allData = null;

  async function getData() {
    const shop = window.Shopify?.shop;
    try {
      const response = await fetch(
        `http://localhost:5000/plans/getAllPlans?shop=${shop}`,
        {
          headers: {
            "x-api-key": SECRET_KEY,
          },
        }
      );
      const data = await response.json();
      window.SubscriptionApp.allData = data.data;
      console.log("data from api", window.SubscriptionApp.allData);

      // Notify widget that data is ready
      document.dispatchEvent(new CustomEvent("subscription:dataReady"));
      return data;
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }

  /**
   * Returns true if the given Shopify variant GID has at least one selling plan.
   * @param {string} variantId  — raw numeric variant id (e.g. "123456789")
   */
  window.SubscriptionApp.variantHasPlan = function (variantId) {
    const allData = window.SubscriptionApp.allData;
    if (!allData) return false;
    const gid = `gid://shopify/ProductVariant/${variantId}`;
    return allData.some((plan) =>
      plan.products.some((product) =>
        product.variants.some((variant) => variant.variantsId === gid)
      )
    );
  };

  /**
   * Finds and returns the selling plan object matching a given Shopify selling plan id.
   * @param {string} sellingPlanId  — numeric id (last segment after "/")
   */
  window.SubscriptionApp.getMatchedPlan = function (sellingPlanId) {
    const allData = window.SubscriptionApp.allData;
    if (!allData) return null;
    return allData
      .flatMap((group) => group.sellingPlans)
      .find(
        (plan) =>
          plan.shopifySellingPlanId.split("/").pop() === sellingPlanId
      ) || null;
  };

  // Kick off the fetch as soon as this script loads
  getData();
})();