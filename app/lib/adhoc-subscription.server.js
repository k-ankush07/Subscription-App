import { getContractPreview, snapshotContractSettings } from "./billing-preview.server";

/**
 * Handles discount-settings snapshotting for subscriptions created via the
 * ad-hoc "Create subscription" admin UI (contractCreate.jsx) — these
 * contracts have no selling plan, so their discount config has to be stored
 * separately (same snapshot store the checkout-webhook flow uses), and it
 * needs to support BOTH tiers:
 *   - an "initial" discount active from the contract's real first cycle
 *   - an optional "after N orders" discount that overrides it later
 *
 * Kept in its own file so contractCreate.jsx stays a thin route file and
 * this logic can be reused/tested independently. Does NOT touch anything
 * used by the selling-plan / webhook flow.
 */
export async function snapshotAdhocContractDiscounts(admin, contractId, contractDetails) {
  if (!contractId) {
    return { snapshotted: false, reason: "no contractId" };
  }

  try {
    // Shopify assigns the first billing cycle's index based on interval +
    // chosen next-order date — it isn't always 0. Read it back so "after N
    // orders" means N orders after the REAL first cycle, not a literal
    // index that may not line up.
    const initialPreview = await getContractPreview(admin, contractId);
    const baselineCycleIndex = initialPreview?.nextOrder?.cycleIndex ?? 0;

    const hasInitialDiscount =
      !!contractDetails.giveDiscount &&
      Number(contractDetails.discountAmount) > 0;
    const hasAfterDiscount =
      !!contractDetails.changeDiscountAfterOrders &&
      Number(contractDetails.discountAmount2) > 0;

    const settings = {
      // Tier 1: active from the contract's real first cycle onward.
      initialDiscountEnabled: hasInitialDiscount,
      initialDiscountType: contractDetails.discountType || "PERCENTAGE",
      initialDiscountValue: Number(contractDetails.discountAmount) || 0,

      // Tier 2: overrides tier 1 once cycleIndex >= baseline + afterOrders.
      changeDiscountAfterOrders: hasAfterDiscount,
      afterOrders:
        baselineCycleIndex + (Number(contractDetails.afterOrders) || 0),
      afterDiscountType: contractDetails.discountType2 || "PERCENTAGE",
      afterDiscountValue: Number(contractDetails.discountAmount2) || 0,

      // Must stay false so resolveDiscountForCycle's initialDiscountEnabled
      // fallback (used only when there's no native selling-plan pricing
      // tier) actually gets evaluated for these ad-hoc contracts.
      beforeDiscountDisabled: false,
    };

    const { snapshotted } = await snapshotContractSettings(admin, contractId, settings);

    console.log(
      snapshotted
        ? `[adhoc-subscription] settings snapshotted for ${contractId} (baseline cycle ${baselineCycleIndex}):`
        : `[adhoc-subscription] settings snapshot skipped for ${contractId} (no shop id resolved):`,
      JSON.stringify(settings),
    );

    return { snapshotted, baselineCycleIndex, settings };
  } catch (err) {
    // Never let a snapshot failure break contract creation.
    console.error(`[adhoc-subscription] failed to snapshot settings for ${contractId}:`, err);
    return { snapshotted: false, error: String(err?.message || err) };
  }
}