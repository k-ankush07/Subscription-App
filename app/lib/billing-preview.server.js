import { currencySymbol } from "../routes/utils/formatMoney.js";

const EXTRA_SETTINGS_NAMESPACE = "subscription_app";
const CONTRACT_SETTINGS_SNAPSHOTS_KEY = "contract_settings_snapshots";

async function getShopIdForSnapshot(admin) {
  const res = await admin.graphql(`query { shop { id } }`);
  const data = await res.json();
  return data.data?.shop?.id ?? null;
}
async function readContractSnapshotsList(admin) {
  const res = await admin.graphql(
    `
    query getContractSnapshots($namespace: String!, $key: String!) {
      shop {
        metafield(namespace: $namespace, key: $key) {
          value
        }
      }
    }
    `,
    { variables: { namespace: EXTRA_SETTINGS_NAMESPACE, key: CONTRACT_SETTINGS_SNAPSHOTS_KEY } },
  );
  const data = await res.json();
  if (data.errors) {
    console.warn(`[readContractSnapshotsList] query failed: ${data.errors[0]?.message}`);
    return [];
  }
  const raw = data.data?.shop?.metafield?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeContractSnapshotsList(admin, shopId, list) {
  const trimmed = list.slice(-500);
  const res = await admin.graphql(
    `
    mutation setContractSnapshots($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
    `,
    {
      variables: {
        metafields: [
          {
            ownerId: shopId,
            namespace: EXTRA_SETTINGS_NAMESPACE,
            key: CONTRACT_SETTINGS_SNAPSHOTS_KEY,
            type: "json",
            value: JSON.stringify(trimmed),
          },
        ],
      },
    },
  );
  const data = await res.json();
  const errors = data.data?.metafieldsSet?.userErrors;
  if (errors?.length) {
    throw new Error(`writeContractSnapshotsList failed: ${errors[0].message}`);
  }
}
async function getContractSettingsSnapshot(admin, contractId, shopId = null) {
  try {
    const resolvedShopId = shopId ?? (await getShopIdForSnapshot(admin));
    if (!resolvedShopId) return null;
    const list = await readContractSnapshotsList(admin);
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]?.contractId === contractId) {
        return list[i].settings ?? null;
      }
    }
    return null;
  } catch (err) {
    console.warn(`[getContractSettingsSnapshot] failed for ${contractId}:`, err);
    return null;
  }
}
async function snapshotContractSettings(admin, contractId, settings, shopId = null) {
  if (!settings) {
    console.warn(`[snapshotContractSettings] no settings to snapshot for ${contractId} — skipping`);
    return { snapshotted: false };
  }

  const resolvedShopId = shopId ?? (await getShopIdForSnapshot(admin));
  if (!resolvedShopId) {
    console.warn(`[snapshotContractSettings] could not resolve shop id — skipping snapshot for ${contractId}`);
    return { snapshotted: false };
  }

  const list = await readContractSnapshotsList(admin);
  list.push({ contractId, settings, capturedAt: new Date().toISOString() });
  await writeContractSnapshotsList(admin, resolvedShopId, list);
  return { snapshotted: true };
}

function normalizeAutomationAction(action, afterOrders) {
  if (action.type === "swap") {
    const allDests = Array.isArray(action.dests) ? action.dests : []
    const flatVariants = [];
    for (const dest of allDests) {
      const variantIds = Array.isArray(dest?.variantIds) ? dest.variantIds : [];
      for (const variantId of variantIds) {
        if (variantId) flatVariants.push({ dest, variantId });
      }
    }

    if (flatVariants.length === 0) {
      return [{
        ...action,
        type: "VARIANT_SWAP",
        variantId: null,
        dests: allDests,
        after: afterOrders,
      }];
    }

    const results = [];
    // Pehla variant  existing line ko swap karega
    results.push({
      ...action,
      type: "VARIANT_SWAP",
      variantId: flatVariants[0].variantId,
      dests: allDests,
      after: afterOrders,
    });
    for (let i = 1; i < flatVariants.length; i++) {
      results.push({
        type: "ADD_PRODUCT",
        variantId: flatVariants[i].variantId,
        quantity: action.quantity ?? 1,
        sourceProductId: action.sourceProductId,
        destProductId: flatVariants[i].dest?.id ?? null,
        productName: flatVariants[i].dest?.name ?? null,
        after: afterOrders,
      });
    }

    return results;
  }


  if (action.type === "remove") {
    const variantId = action.sourceVariantId || (action.isVariant ? action.variantId : null);
    const productId = action.sourceProductId || action.productId || null;

    return [{
      ...action,
      type: variantId ? "REMOVE_VARIANT" : "REMOVE_PRODUCT",
      sourceProductId: productId ?? action.sourceProductId,
      sourceVariantId: variantId ?? action.sourceVariantId,
      after: afterOrders,
    }];
  }

  if (action.type === "add") {
    return [{
      ...action,
      type: "ADD_PRODUCT",
      after: afterOrders,
    }];
  }

  return [{ ...action, after: afterOrders }];
}

const ACTION_ORDER = [
  "QUANTITY_CHANGE",
  "MINIMUM_QUANTITY",
  "REMOVE_PRODUCT",
  "REMOVE_VARIANT",
  "REMOVE_FREE_PRODUCT",
  "ADD_PRODUCT",
  "VARIANT_SWAP",
  "PRODUCT_SWAP",
  "DISCOUNT_CHANGE",
  "SHIPPING_DISCOUNT_CHANGE",
];

function sortActionsForApply(actions) {
  return [...actions].sort((a, b) => {
    const ai = ACTION_ORDER.indexOf(a.type);
    const bi = ACTION_ORDER.indexOf(b.type);
    return (ai === -1 ? ACTION_ORDER.length : ai) - (bi === -1 ? ACTION_ORDER.length : bi);
  });
}
function resolveDiscountForCycle(settings, pricingPolicy, cycleIndex) {
  cycleIndex = Number(cycleIndex);

  const customActive =
    settings?.changeDiscountAfterOrders &&
    cycleIndex >= Number(settings.afterOrders) &&
    Number(settings.afterDiscountValue) > 0;

  if (customActive) {
    return {
      type: "DISCOUNT_CHANGE",
      adjustmentType: settings.afterDiscountType ?? "PERCENTAGE",
      adjustmentValue: Number(settings.afterDiscountValue) || 0,
      after: settings.afterOrders,
      __phase: "after",
    };
  }

  // Custom "after" discount isn't active (either not configured, or we haven't hit the threshold yet).
  // Fall back to the native selling-plan discount tier, unless the merchant explicitly removed it
  // for this contract.
  if (!settings?.beforeDiscountDisabled) {
    const nativeTier = getDiscountTierForCycle(pricingPolicy, cycleIndex);
    if (nativeTier) {
      const isPct = nativeTier.adjustmentType === "PERCENTAGE";
      const value = isPct
        ? Number(nativeTier.adjustmentValue?.percentage ?? 0)
        : Number(nativeTier.adjustmentValue?.amount ?? 0);
      if (value > 0) {
        return {
          type: "DISCOUNT_CHANGE",
          adjustmentType: nativeTier.adjustmentType,
          adjustmentValue: value,
          after: nativeTier.afterCycle,
          __phase: "before",
        };
      }
    }
  }

  return {
    type: "DISCOUNT_CHANGE",
    adjustmentType: "PERCENTAGE",
    adjustmentValue: 0,
    after: 0,
    __default: true,
    __phase: "none",
  };
}

function resolveShippingDiscountForCycle(settings, cycleIndex) {
  cycleIndex = Number(cycleIndex);

  const active =
    settings?.giveShippingDiscount &&
    cycleIndex >= Number(settings.shippingAfterOrders ?? 0) &&
    settings.shippingDiscountValue != null &&
    Number(settings.shippingDiscountValue) >= 0;

  if (active) {
    return {
      type: "SHIPPING_DISCOUNT_CHANGE",
      adjustmentType: settings.shippingDiscountType ?? "PERCENTAGE",
      adjustmentValue: Number(settings.shippingDiscountValue) || 0,
      after: settings.shippingAfterOrders ?? 0,
    };
  }

  return {
    type: "SHIPPING_DISCOUNT_CHANGE",
    adjustmentType: "PERCENTAGE",
    adjustmentValue: 0,
    after: 0,
    __default: true,
  };
}

function applyShippingDiscountToPrice(basePrice, action) {
  const base = Number(basePrice) || 0;
  if (!action || action.__default) return base;

  const type = String(action.adjustmentType || "").toUpperCase();
  if (type === "PERCENTAGE") {
    return Math.max(0, base - (base * Number(action.adjustmentValue || 0)) / 100);
  }
  if (type === "FIXED_AMOUNT") {
    return Math.max(0, base - Number(action.adjustmentValue || 0));
  }
  // "PRICE" — merchant sets the final delivery price directly
  return Math.max(0, Number(action.adjustmentValue || 0));
}

function collectActionsForCycle(settings, cycleIndex, pricingPolicy = null) {
  const actions = [];
  if (!settings) return actions;

  cycleIndex = Number(cycleIndex);

  actions.push(resolveDiscountForCycle(settings, pricingPolicy, cycleIndex));
  actions.push(resolveShippingDiscountForCycle(settings, cycleIndex));

  if (
    settings.changeQuantityAfterOrders &&
    cycleIndex >= Number(settings.quantityAfterOrders)
  ) {
    actions.push({
      type: "QUANTITY_CHANGE",
      value: settings.quantityAfterOrdersValue,
      products: settings.quantityProducts ?? [],
      after: settings.quantityAfterOrders,
    });
  } else {
    actions.push({
      type: "QUANTITY_CHANGE",
      value: 1,
      products: [],
      after: 0,
      __default: true, 
    });
  }

  if (
    settings.productSwapEnabled &&
    cycleIndex >= Number(settings.productSwapAfterOrders)
  ) {
    actions.push({
      type: "VARIANT_SWAP",
      variantId: settings.productSwapVariantId,
      after: settings.productSwapAfterOrders,
    });
  }

  // 5. Remove Free Product — "after N orders"
  if (
    settings.RemoveFreeProdcut &&
    cycleIndex >= Number(settings.removeFreeProductValue)
  ) {
    actions.push({
      type: "REMOVE_FREE_PRODUCT",
      products: settings.freeProducts ?? [],
      after: settings.removeFreeProductValue,
    });
  }
  // 6. Custom automation list — merchant ke defined arbitrary cycles
if (settings.Automation && Array.isArray(settings.automationCycles)) {
  settings.automationCycles.forEach((auto, automationCycleIndex) => {
    if (cycleIndex >= Number(auto.orders)) {
      (auto.actions ?? []).forEach((action, automationActionIndex) => {
        const normalized = normalizeAutomationAction(action, auto.orders);
        for (const n of normalized) {
          n.__automationCycleIndex = automationCycleIndex;
          n.__automationActionIndex = automationActionIndex;
        }
        actions.push(...normalized);
      });
    }
  });
}
  const hasSwapAction = actions.some(
  (a) => a.type === "VARIANT_SWAP" || a.type === "PRODUCT_SWAP"
);

if (hasSwapAction) {
  return actions.filter(
    (a) => a.type !== "DISCOUNT_CHANGE" &&
           a.type !== "QUANTITY_CHANGE"
  );
}
  

  const hasBaseLineRemoval = actions.some(
    (a) =>
      (a.type === "REMOVE_PRODUCT" || a.type === "REMOVE_VARIANT") &&
      a.__automationCycleIndex != null,
  );

  if (hasSwapAction || hasBaseLineRemoval) {
    return actions.filter((a) => a.type !== "DISCOUNT_CHANGE");
  }

  return actions;
}

function computePriceForCycle(pricingPolicy, cycleIndex) {
  if (!pricingPolicy?.cycleDiscounts?.length) {
    return pricingPolicy?.basePrice ?? null;
  }
  cycleIndex = Number(cycleIndex);
  const applicableTiers = pricingPolicy.cycleDiscounts
    .map((tier) => ({
      ...tier,
      afterCycle: Number(tier.afterCycle),
    }))
    .filter((tier) => cycleIndex >= tier.afterCycle)
    .sort((a, b) => a.afterCycle - b.afterCycle);

  const bestTier = applicableTiers[applicableTiers.length - 1] ?? null;
  return bestTier ? bestTier.computedPrice : pricingPolicy.basePrice;
}
function getDiscountTierForCycle(pricingPolicy, cycleIndex) {
  if (!pricingPolicy?.cycleDiscounts?.length) return null;
  cycleIndex = Number(cycleIndex);
  const applicable = pricingPolicy.cycleDiscounts
    .map((t) => ({ ...t, afterCycle: Number(t.afterCycle) }))
    .filter((t) => cycleIndex >= t.afterCycle)
    .sort((a, b) => a.afterCycle - b.afterCycle);
  return applicable[applicable.length - 1] ?? null;
}

function applyDiscountTierToPrice(basePrice, tier) {
  const base = Number(basePrice);
  if (!tier) return base;
  if (tier.adjustmentType === "PERCENTAGE") {
    const pct = Number(tier.adjustmentValue?.percentage ?? 0);
    return Math.max(0, base - (base * pct) / 100);
  }
  const amt = Number(tier.adjustmentValue?.amount ?? 0);
  return Math.max(0, base - amt);
}

async function fetchVariantPrice(admin, variantId) {
  if (!variantId) return null;
  const res = await admin.graphql(
    `
    query getVariantPrice($id: ID!) {
      productVariant(id: $id) {
        id
        price
      }
    }
    `,
    { variables: { id: variantId } },
  );
  const data = await res.json();
  const price = data.data?.productVariant?.price;
  return price != null ? Number(price) : null;
}

async function fetchVariantsBatch(admin, variantIds) {
  const uniqueIds = [...new Set((variantIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return {};
  const CHUNK_SIZE = 200;
  const map = {};

  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);

    const res = await admin.graphql(
      `
      query getVariantsBatch($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            price
            image { url altText }
            product {  title featuredImage { url altText } }
          }
        }
      }
      `,
      { variables: { ids: chunk } },
    );
    const data = await res.json();

    if (data.errors) {
      console.warn(`[fetchVariantsBatch] query failed: ${data.errors[0]?.message}`);
      continue;
    }

    for (const node of data.data?.nodes ?? []) {
      if (!node?.id) continue;
      const imageUrl = node.image?.url ?? node.product?.featuredImage?.url ?? null;
      const imageAlt = node.image?.altText ?? node.product?.featuredImage?.altText ?? null;
      map[node.id] = {
        price: node.price != null ? Number(node.price) : null,
        title: node.title ?? null, 
        productTitle: node.product?.title ?? null, 
        image: imageUrl ? { url: imageUrl, altText: imageAlt } : null,
      };
    }
  }

  return map;
}

async function getEffectiveBasePrice(admin, actions, fallbackBasePrice) {
  const swap = actions?.find(
    (a) => a.type === "VARIANT_SWAP" || a.type === "PRODUCT_SWAP",
  );
  if (swap?.variantId) {
    const newPrice = await fetchVariantPrice(admin, swap.variantId);
    if (newPrice != null) return newPrice;
    console.warn(
      `[getEffectiveBasePrice] swap target variant (${swap.variantId}) price fetch failed — ` +
        `falling back to the original line's base price (may be inaccurate post-swap).`,
    );
  }
  return Number(fallbackBasePrice) || 0;
}

function applyCustomDiscountAction(basePrice, discountAction) {
  const base = Number(basePrice);
  if (!discountAction) return base;
  const type = String(discountAction.adjustmentType || "").toLowerCase();
  if (type === "percentage") {
    return Math.max(0, base - (base * Number(discountAction.adjustmentValue)) / 100);
  }
  if (type === "fixed_amount") {
    return Math.max(0, Number(discountAction.adjustmentValue));
  }
  return Math.max(0, base - Number(discountAction.adjustmentValue));
}


function computeLinePriceFromKnownPrice(
  variantPrice,
  { isSwapGenerated, discountEnabled, discountType, discountValue },
  effectiveBasePrice,
  discountTierForCycle,
  customDiscountAction = null,
) {
  const basePriceForLine = variantPrice ?? effectiveBasePrice ?? 0;

  if (!discountEnabled) {
    return basePriceForLine;
  }

  if (isSwapGenerated) {
    if (customDiscountAction) {
      return applyCustomDiscountAction(basePriceForLine, customDiscountAction);
    }
    if (discountTierForCycle) {
      return applyDiscountTierToPrice(basePriceForLine, discountTierForCycle);
    }
    // discountEnabled hai lekin apply karne layak koi tier/custom action nahi mila
    return applyCustomDiscountAction(basePriceForLine, {
      adjustmentType: discountType,
      adjustmentValue: discountValue,
    });
  }

  const type = String(discountType).toLowerCase();
  if (type === "percentage") {
    return Math.max(0, basePriceForLine - (basePriceForLine * Number(discountValue || 0)) / 100);
  }
  if (type === "fixed_amount") {
    // "fixed_amount" = final price directly set to this value
    return Math.max(0, Number(discountValue || 0));
  }
  // "amount" = subtract this much from base price
  return Math.max(0, basePriceForLine - Number(discountValue || 0));
}
function getActionTargetIds(action) {
  const targetProductIds = [];
  const targetVariantIds = [];

  if (Array.isArray(action.products)) {
    for (const p of action.products) {
      if (typeof p === "string") {
        targetProductIds.push(p);
        continue;
      }
      const variantIds = (p?.variants ?? [])
        .map((v) => v?.variantsId)
        .filter(Boolean);

      if (variantIds.length > 0) {
        // specific variants configured — match ONLY those, not the whole product
        targetVariantIds.push(...variantIds);
      } else if (p?.id) {
        targetProductIds.push(p.id);
      }
    }
  }

  if (action.sourceVariantId) {
    // variant-specific target — don't also fall back to product-level match
    targetVariantIds.push(action.sourceVariantId);
  } else if (action.sourceProductId) {
    targetProductIds.push(action.sourceProductId);
  }

  return { targetProductIds, targetVariantIds };
}

function actionRequiresExplicitTarget(action) {
  if (action.type === "REMOVE_FREE_PRODUCT") return true;
  if (action.type === "QUANTITY_CHANGE" && !action.__default) return true;
  return false;
}

function actionMatchesLine(action, line) {
  if (!line) return false;
  const { targetProductIds, targetVariantIds } = getActionTargetIds(action);

  if (targetProductIds.length === 0 && targetVariantIds.length === 0) {
    if (actionRequiresExplicitTarget(action)) {

      return false;
    }

    return true;
  }

  return (
    (line.variantId && targetVariantIds.includes(line.variantId)) ||
    (line.productId && targetProductIds.includes(line.productId))
  );
}

const LINE_MATCH_REQUIRED_TYPES = new Set([
  "QUANTITY_CHANGE",
  "VARIANT_SWAP",
  "PRODUCT_SWAP",
  "REMOVE_PRODUCT",
  "REMOVE_VARIANT",
  "REMOVE_FREE_PRODUCT",
  "ADD_PRODUCT",
]);

function resolveLineForAction(draftLines, action) {
  if (!draftLines?.length) return null;

  const { targetProductIds, targetVariantIds } = getActionTargetIds(action);

  if (targetProductIds.length === 0 && targetVariantIds.length === 0) {
    if (actionRequiresExplicitTarget(action)) {
      console.warn(
        `[applyActionsToCycle] ${action.type}: no product/variant configured — action will be SKIPPED (explicit target required, no base-line fallback).`,
      );
      return null;
    }
    return draftLines[0];
  }

  const match = draftLines.find((line) => actionMatchesLine(action, line));
  if (!match) {
    console.warn(
      `[applyActionsToCycle] ${action.type}: configured source product/variant does not match this subscription's product — action will be SKIPPED (not applied to an unrelated product).`,
    );
  }
  return match || null;
}
async function clearBillingCycleEdit(admin, contractId, cycleIndex, cycleDate = null) {
  if (cycleIndex == null && !cycleDate) {
    return { cleared: false, reason: "no cycleIndex or cycleDate provided" };
  }

  const selector = cycleDate ? { date: cycleDate } : { index: cycleIndex };

  const res = await admin.graphql(
    `
    mutation clearCycleEdit($contractId: ID!, $selector: SubscriptionBillingCycleSelector!) {
      subscriptionBillingCycleEditDelete(
        billingCycleInput: { contractId: $contractId, selector: $selector }
      ) {
        billingCycles {
          cycleIndex
          cycleStartAt
          cycleEndAt
          edited
        }
        userErrors { field message }
      }
    }
    `,
    { variables: { contractId, selector } },
  );

  const data = await res.json();
  if (data.errors) {
    throw new Error(`subscriptionBillingCycleEditDelete failed: ${data.errors[0]?.message}`);
  }

  const payload = data.data?.subscriptionBillingCycleEditDelete;
  const errors = payload?.userErrors;
  if (errors?.length) {
    throw new Error(`subscriptionBillingCycleEditDelete failed: ${errors[0].message}`);
  }

  return {
    cleared: (payload?.billingCycles?.length ?? 0) > 0,
    billingCycles: payload?.billingCycles ?? [],
  };
}

async function applyActionsToCycle(
  admin,
  contractId,
  cycleIndex,
  actions,
  basePriceAmount = null,
  pricingPolicy = null,
  cycleDate = null,
  deliveryPriceAmount = null, // original/current shipping price for this contract
) {
  const openSelector = cycleDate ? { date: cycleDate } : { index: cycleIndex };
   console.log(`[applyActionsToCycle date ] contract=${contractId} selector=${JSON.stringify(openSelector)}`); // ADD THIS
  const editRes = await admin.graphql(
    `
    mutation openCycleDraft($contractId: ID!, $selector: SubscriptionBillingCycleSelector!) {
      subscriptionBillingCycleContractEdit(
        billingCycleInput: { contractId: $contractId, selector: $selector }
      ) {
        draft {
          id
          lines(first: 50) {
            edges { node { id quantity productId variantId  sellingPlanId } }
          }
        }
        userErrors { field message  code }
      }
    }
    `,
    { variables: { contractId, selector: openSelector } },
  );

  const editData = await editRes.json();
  const payload = editData.data?.subscriptionBillingCycleContractEdit;
  if (payload?.userErrors?.length) {
    console.error("FULL userErrors:", JSON.stringify(payload.userErrors));
    throw new Error(`subscriptionBillingCycleContractEdit failed: ${payload.userErrors[0].message}`);
  }
  if (!payload?.draft) {
    throw new Error("subscriptionBillingCycleContractEdit returned no draft");
  }
  const draftId = payload.draft.id;
  const draftLines = payload.draft.lines.edges.map((e) => e.node);
  const lineId = draftLines[0]?.id;
  const removedLineIds = new Set(); 
  const sellingPlanIdForNewLines = draftLines.find((l) => l.sellingPlanId)?.sellingPlanId ?? null;

  const allActionVariantIds = actions
    .map((a) => a.variantId)
    .filter(Boolean);
  const batchedVariantData = await fetchVariantsBatch(admin, allActionVariantIds);

  const effectiveBasePrice = await getEffectiveBasePrice(admin, actions, basePriceAmount);
  const discountTierForCycle = getDiscountTierForCycle(pricingPolicy, cycleIndex);

  const hasCustomDiscountChange = actions.some((a) => a.type === "DISCOUNT_CHANGE" && !a.__default);
  const discountActionEntry = actions.find((a) => a.type === "DISCOUNT_CHANGE");

  const orderedActions = sortActionsForApply(actions);


  try {
    for (const action of orderedActions) {
      // ── QUANTITY_CHANGE ──
      if (action.type === "QUANTITY_CHANGE") {
        const targetLine = resolveLineForAction(draftLines, action);
        if (!targetLine) {
          console.warn(`[applyActionsToCycle] QUANTITY_CHANGE skipped — configured product doesn't match this subscription`);
          action.__skippedReason = "Configured product doesn't match this subscription's product — quantity change not applied.";
          continue;
        }
        if (removedLineIds.has(targetLine.id)) {
          console.warn(`[applyActionsToCycle] QUANTITY_CHANGE skipped — target line already removed this cycle`);
          action.__skippedReason = "Target line was already removed by another action this cycle.";
          continue;
        }
        const res = await admin.graphql(
          `
          mutation updateLineQty($draftId: ID!, $lineId: ID!, $qty: Int!) {
            subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { quantity: $qty }) {
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, lineId: targetLine.id, qty: Number(action.value) } },
        );
        const data = await res.json();
        if (data.errors) throw new Error(`QUANTITY_CHANGE failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
        if (errors?.length) throw new Error(`QUANTITY_CHANGE failed: ${errors[0].message}`);
      }
      if (action.type === "PRODUCT_SWAP" || action.type === "VARIANT_SWAP") {
        const targetLine = resolveLineForAction(draftLines, action);
        if (!targetLine) {
          console.warn(`[applyActionsToCycle] ${action.type} skipped — configured source product doesn't match this subscription's product`);
          action.__skippedReason = "Configured source product doesn't match this subscription's product — swap not applied.";
          continue;
        }
        if (removedLineIds.has(targetLine.id)) {
          console.warn(`[applyActionsToCycle] ${action.type} skipped — target line already removed this cycle`);
          action.__skippedReason = "Target line was already removed by another action this cycle.";
          continue;
        }
        if (!action.variantId) throw new Error(`${action.type} failed: no variantId configured`);



const ownVariantPrice = batchedVariantData[action.variantId]?.price;
        const basePriceForThisSwap = ownVariantPrice != null ? ownVariantPrice : effectiveBasePrice;

        let recalculatedPrice = null;
        if (action.discountEnabled && basePriceForThisSwap != null) {
          recalculatedPrice = applyCustomDiscountAction(basePriceForThisSwap, {
            adjustmentType: action.discountType,
            adjustmentValue: action.discountValue,
          }).toFixed(2);
        }
        if (!hasCustomDiscountChange && basePriceForThisSwap != null) {
          recalculatedPrice = applyDiscountTierToPrice(basePriceForThisSwap, discountTierForCycle).toFixed(2);
        }

        // FIX: quantity ko explicitly set karo, warna purani line ki quantity carry ho jati hai
        const swapQuantity = Number(action.quantity) || 1;

        const res = await admin.graphql(
          `
          mutation swapLine($draftId: ID!, $lineId: ID!, $variantId: ID!, $price: Decimal, $qty: Int) {
            subscriptionDraftLineUpdate(
              draftId: $draftId
              lineId: $lineId
              input: { productVariantId: $variantId, currentPrice: $price, quantity: $qty }
            ) {
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, lineId: targetLine.id, variantId: action.variantId, price: recalculatedPrice, qty: swapQuantity } },
        );
        const data = await res.json();
        if (data.errors) throw new Error(`${action.type} failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
        if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
      }

      // ── DISCOUNT_CHANGE ── (base line price — runs after line edits)
      if (action.type === "DISCOUNT_CHANGE") {
        if (!lineId) throw new Error("DISCOUNT_CHANGE failed: no line found on draft");
        if (removedLineIds.has(lineId)) {
          console.warn(`[applyActionsToCycle] DISCOUNT_CHANGE skipped — base line already removed this cycle`);
          action.__skippedReason = "Base line was already removed by another action this cycle.";
          continue;
        }
        const basePrice = effectiveBasePrice;

        let newPrice = basePrice;
        if (action.adjustmentType === "PERCENTAGE") {
          newPrice = basePrice - (basePrice * Number(action.adjustmentValue)) / 100;
        } else {
          newPrice = basePrice - Number(action.adjustmentValue);
        }
        newPrice = Math.max(0, newPrice).toFixed(2);

        const res = await admin.graphql(
          `
          mutation updateLinePrice($draftId: ID!, $lineId: ID!, $price: Decimal!) {
            subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { currentPrice: $price }) {
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, lineId, price: newPrice } },
        );
        const data = await res.json();
        if (data.errors) throw new Error(`DISCOUNT_CHANGE failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
        if (errors?.length) throw new Error(`DISCOUNT_CHANGE failed: ${errors[0].message}`);
      }
      if (action.type === "SHIPPING_DISCOUNT_CHANGE") {
        if (action.__default) continue; // no shipping discount configured for this cycle

        if (deliveryPriceAmount == null) {
          console.warn(
            `[applyActionsToCycle] SHIPPING_DISCOUNT_CHANGE skipped — original delivery price not provided`,
          );
          action.__skippedReason = "Original delivery price not available — shipping discount not applied.";
          continue;
        }

        const newShippingPrice = applyShippingDiscountToPrice(deliveryPriceAmount, action).toFixed(2);

        const res = await admin.graphql(
          `
          mutation updateDraftShippingPrice($draftId: ID!, $input: SubscriptionDraftInput!) {
            subscriptionDraftUpdate(draftId: $draftId, input: $input) {
              draft {
                id
                deliveryPrice { amount currencyCode }
              }
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, input: { deliveryPrice: newShippingPrice } } },
        );
        const data = await res.json();
        if (data.errors) throw new Error(`SHIPPING_DISCOUNT_CHANGE failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftUpdate?.userErrors;
        if (errors?.length) throw new Error(`SHIPPING_DISCOUNT_CHANGE failed: ${errors[0].message}`);
      }
      if (
        action.type === "REMOVE_PRODUCT" ||
        action.type === "REMOVE_VARIANT" ||
        action.type === "REMOVE_FREE_PRODUCT"
      ) {
        const targetLine = resolveLineForAction(draftLines, action);
        if (!targetLine) {
          console.warn(`[applyActionsToCycle] ${action.type} skipped — configured product doesn't match this subscription`);
          action.__skippedReason = "Configured product doesn't match this subscription's product — removal not applied.";
          continue;
        }
        if (removedLineIds.has(targetLine.id)) {
          console.warn(`[applyActionsToCycle] ${action.type} skipped — line already removed this cycle`);
          continue;
        }
        const res = await admin.graphql(
          `
          mutation removeLine($draftId: ID!, $lineId: ID!) {
            subscriptionDraftLineRemove(draftId: $draftId, lineId: $lineId) {
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, lineId: targetLine.id } },
        );
        const data = await res.json();
        if (data.errors) throw new Error(`${action.type} failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftLineRemove?.userErrors;
        if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
        removedLineIds.add(targetLine.id); // CHANGED
      }

      if (action.type === "ADD_PRODUCT") {
        const { targetProductIds, targetVariantIds } = getActionTargetIds(action);
        if (targetProductIds.length > 0 || targetVariantIds.length > 0) {
          const sourceMatchLine = draftLines.find((line) => actionMatchesLine(action, line));
          if (!sourceMatchLine) {
            console.warn(
              `[applyActionsToCycle] ADD_PRODUCT skipped — configured source product doesn't match this subscription's product`,
            );
            action.__skippedReason =
              "Configured source product doesn't match this subscription's product — add not applied.";
            continue;
          }
          if (removedLineIds.has(sourceMatchLine.id)) {
            console.warn(`[applyActionsToCycle] ADD_PRODUCT skipped — source line already removed this cycle`);
            action.__skippedReason = "Source line was already removed by another action this cycle.";
            continue;
          }
        }

        if (!action.variantId) throw new Error("ADD_PRODUCT failed: no variantId configured");
        let addPrice = action.currentPrice ?? null;

        if (addPrice == null) {
          const isSwapGenerated = !!action.destProductId || !!action.sourceProductId;
          const knownPrice = batchedVariantData[action.variantId]?.price ?? null;
          const price = computeLinePriceFromKnownPrice(
            knownPrice,
            {
              isSwapGenerated,
              discountEnabled: action.discountEnabled,
              discountType: action.discountType,
              discountValue: action.discountValue,
            },
            effectiveBasePrice,
            discountTierForCycle,
            hasCustomDiscountChange ? discountActionEntry : null,
          );
          addPrice = price.toFixed(2);
        }
        const res = await admin.graphql(
          `
          mutation addLine($draftId: ID!, $variantId: ID!, $qty: Int!, $price: Decimal!, $sellingPlanId: ID) {
            subscriptionDraftLineAdd(
              draftId: $draftId
              input: { productVariantId: $variantId, quantity: $qty, currentPrice: $price, sellingPlanId: $sellingPlanId }
            ) {
              userErrors { field message }
            }
          }
          `,
          {
            variables: {
              draftId,
              variantId: action.variantId,
              qty: Number(action.quantity) || 1,
              price: addPrice,
              sellingPlanId: sellingPlanIdForNewLines,
            },
          },
        );
       
        const data = await res.json();
        if (data.errors) throw new Error(`ADD_PRODUCT failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftLineAdd?.userErrors;
        if (errors?.length) throw new Error(`ADD_PRODUCT failed: ${errors[0].message}`);
      }
    }
  } catch (err) {
    try {
      await clearBillingCycleEdit(admin, contractId, cycleIndex, cycleDate); // CHANGED — forward cycleDate
    } catch (cleanupErr) {
      console.error(
        `[applyActionsToCycle] cleanup after failure also failed for ${contractId}:${cycleIndex}:`,
        cleanupErr,
      );
    }
    throw err;
  }

  const commitRes = await admin.graphql(
    `
    mutation commitCycleDraft($draftId: ID!) {
      subscriptionBillingCycleContractDraftCommit(draftId: $draftId) {
        userErrors { field message }
      }
    }
    `,
    { variables: { draftId } },
  );

  const commitData = await commitRes.json();
  if (commitData.errors) {

    try {
      await clearBillingCycleEdit(admin, contractId, cycleIndex, cycleDate); // CHANGED — forward cycleDate
    } catch (cleanupErr) {
      console.error(
        `[applyActionsToCycle] cleanup after commit failure also failed for ${contractId}:${cycleIndex}:`,
        cleanupErr,
      );
    }
    throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitData.errors[0]?.message}`);
  }
  const commitErrors = commitData.data?.subscriptionBillingCycleContractDraftCommit?.userErrors;
  if (commitErrors?.length) {
    try {
      await clearBillingCycleEdit(admin, contractId, cycleIndex, cycleDate); // CHANGED — forward cycleDate
    } catch (cleanupErr) {
      console.error(
        `[applyActionsToCycle] cleanup after commit userErrors also failed for ${contractId}:${cycleIndex}:`,
        cleanupErr,
      );
    }
    throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitErrors[0].message}`);
  }
  return {
    skippedActions: actions
      .filter((a) => a.__skippedReason)
      .map((a) => ({ type: a.type, reason: a.__skippedReason })),
  };
}
function removeAutomationVariant(settings, automationCycleIndex, automationActionIndex, variantId) {
  if (!settings || !Array.isArray(settings.automationCycles)) {
    throw new Error("removeAutomationVariant: no automationCycles configured");
  }
  const clonedSettings = JSON.parse(JSON.stringify(settings));
  const entry = clonedSettings.automationCycles[automationCycleIndex];
  if (!entry || !Array.isArray(entry.actions)) {
    throw new Error("removeAutomationVariant: automation cycle entry not found");
  }

  const actionOwnsVariant = (a) => {
    if (!a) return false;
    if (a.type === "swap") {
      return (a.dests || []).some((d) => (d.variantIds || []).includes(variantId));
    }
    return a.variantId === variantId || a.sourceVariantId === variantId;
  };
  let actionIndex = automationActionIndex;
  let action = entry.actions[actionIndex];

  if (!variantId || !actionOwnsVariant(action)) {
    const foundIndex = entry.actions.findIndex(actionOwnsVariant);
    if (foundIndex === -1) {
      throw new Error(
        "removeAutomationVariant: target action not found (stale index) — please refresh and retry",
      );
    }
    actionIndex = foundIndex;
    action = entry.actions[actionIndex];
  }

  if (action.type === "swap") {
    const dests = Array.isArray(action.dests) ? action.dests : [];
    const nextDests = [];
    for (const dest of dests) {
      const variantIds = Array.isArray(dest.variantIds) ? dest.variantIds : [];
      const idx = variantId ? variantIds.indexOf(variantId) : -1;
      if (idx === -1) {
        nextDests.push(dest);
        continue;
      }
      const nextDest = { ...dest };
      ["variantIds", "variantNames", "variantImages"].forEach((key) => {
        if (Array.isArray(nextDest[key])) {
          nextDest[key] = nextDest[key].filter((_, i) => i !== idx);
        }
      });
      if (nextDest.variantIds?.length > 0) {
        nextDests.push(nextDest);
      }
    }
    action.dests = nextDests;

    if (nextDests.length === 0) {
      if (action.sourceVariantId) {
        entry.actions[actionIndex] = {
          type: "remove",
          sourceProductId: action.sourceProductId ?? null,
          sourceVariantId: action.sourceVariantId,
          isVariant: true,
        };
      } else if (action.sourceProductId) {
        entry.actions[actionIndex] = {
          type: "remove",
          sourceProductId: action.sourceProductId,
          sourceVariantId: null,
          isVariant: false,
        };
      } else {

        entry.actions.splice(actionIndex, 1);
      }
    }
  } else {
    entry.actions.splice(actionIndex, 1);
  }

  if (entry.actions.length === 0) {
    clonedSettings.automationCycles.splice(automationCycleIndex, 1);
  }

  return clonedSettings;
}
function removeAllDiscounts(settings) {
  if (!settings) {
    throw new Error("removeAllDiscounts: no settings configured");
  }
  const clonedSettings = JSON.parse(JSON.stringify(settings));
  clonedSettings.changeDiscountAfterOrders = false;
  clonedSettings.beforeDiscountDisabled = true;
  if (Array.isArray(clonedSettings.automationCycles)) {
    clonedSettings.automationCycles.forEach((entry) => {
      (entry.actions ?? []).forEach((action) => {
        if (action && action.discountEnabled) {
          action.discountEnabled = false;
        }
      });
    });
  }

  return clonedSettings;
}

function removeLineDiscount(settings, { isBaseLine, discountPhase, automationCycleIndex, automationActionIndex }) {
  if (!settings) {
    throw new Error("removeLineDiscount: no settings configured");
  }
  const clonedSettings = JSON.parse(JSON.stringify(settings));

  if (isBaseLine) {
    if (discountPhase === "before") {
      clonedSettings.beforeDiscountDisabled = true;
    } else {
      // "after" ya legacy calls (jinme phase nahi bheja gaya) → purana behavior
      clonedSettings.changeDiscountAfterOrders = false;
    }
    return clonedSettings;
  }

  if (!Array.isArray(clonedSettings.automationCycles)) {
    throw new Error("removeLineDiscount: no automationCycles configured");
  }
  const entry = clonedSettings.automationCycles[automationCycleIndex];
  if (!entry || !Array.isArray(entry.actions)) {
    throw new Error("removeLineDiscount: automation cycle entry not found");
  }
  const action = entry.actions[automationActionIndex];
  if (!action) {
    throw new Error(
      "removeLineDiscount: target action not found (stale index) — please refresh and retry",
    );
  }
  action.discountEnabled = false;

  return clonedSettings;
}
function addBaseLineRemoval(settings, cycleIndex, productId, variantId) {
  const clonedSettings = settings
    ? JSON.parse(JSON.stringify(settings))
    : {};

  if (!Array.isArray(clonedSettings.automationCycles)) {
    clonedSettings.automationCycles = [];
  }

  clonedSettings.Automation = true;

  clonedSettings.automationCycles.push({
    orders: Number(cycleIndex) || 0,
    actions: [
      {
        type: "remove",
        sourceProductId: productId ?? null,
        sourceVariantId: variantId ?? null,
        isVariant: !!variantId,
      },
    ],
  });

  return clonedSettings;
}
async function getEffectiveSettingsForContract(admin, contractId, sellingPlanId, shopId = null) {
  return await getContractSettingsSnapshot(admin, contractId, shopId);
}

async function getContractPreview(admin, contractId) {
  const contractRes = await admin.graphql(
    `
    query getContract($id: ID!) {
      subscriptionContract(id: $id) {
        id
        status
        nextBillingDate
        deliveryPrice { amount currencyCode }
        billingPolicy {
          interval
          intervalCount
          minCycles
          maxCycles
        }
        customer {
         id
         displayName
         defaultEmailAddress{
          emailAddress
          }
          }
        lines(first: 5) {
          edges {
            node {
              id
              title
              quantity
              sellingPlanId
              productId
              variantId
              currentPrice { amount currencyCode }
              pricingPolicy {
                basePrice { amount currencyCode }
                cycleDiscounts {
                  afterCycle
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue { percentage }
                    ... on MoneyV2 { amount currencyCode }
                  }
                  computedPrice { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
    `,
    { variables: { id: contractId } },
  );
  const contractData = await contractRes.json();
  const contract = contractData.data?.subscriptionContract;

  if (!contract) {
    console.log(`[preview] Contract not found: ${contractId}`);
    return null;
  }

  const firstLine = contract.lines.edges[0]?.node;
  const sellingPlanId = firstLine?.sellingPlanId;
  let groupId = null;
  let groupName = null;

  if (sellingPlanId) {
    const groupsRes = await admin.graphql(`
      query {
        sellingPlanGroups(first: 100) {
          edges {
            node {
              id
              name
              sellingPlans(first: 100) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `);
    const groupsData = await groupsRes.json();
    for (const { node: group } of groupsData.data.sellingPlanGroups.edges) {
      const plan = group.sellingPlans.edges.find(({ node }) => node.id === sellingPlanId);
      if (!plan) continue;
      groupId = group.id;
      groupName = group.name;
      break;
    }
  }

  const extraSettings = await getContractSettingsSnapshot(admin, contractId);
  const settingsSource = extraSettings ? "contract_snapshot" : "no_snapshot_found";

  let cycleIndex = null;
  let nextBillingDate = contract.nextBillingDate;
  let cycleStatus = null;

  if (contract.nextBillingDate) {
    const cycleRes = await admin.graphql(
      `
      query getCycleByDate($contractId: ID!, $date: DateTime!) {
        subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { date: $date } }) {
          cycleIndex
          billingAttemptExpectedDate
          status
          skipped
        }
      }
      `,
      { variables: { contractId, date: contract.nextBillingDate } },
    );

    let cycleData = await cycleRes.json();
    let cycle = cycleData.data?.subscriptionBillingCycle;

    // if (cycle) {
    //   cycleIndex = cycle.cycleIndex;
    //   nextBillingDate = cycle.billingAttemptExpectedDate || nextBillingDate;
    //   cycleStatus = cycle.status;

    //   let safetyCounter = 0;
    //   while (cycleStatus === "BILLED" && safetyCounter < 20) {
    //     cycleIndex += 1;
    //     safetyCounter += 1;

    //     const nextCycleRes = await admin.graphql(
    //       `
    //       query getCycleByIndex($contractId: ID!, $index: Int!) {
    //         subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { index: $index } }) {
    //           cycleIndex
    //           billingAttemptExpectedDate
    //           status
    //           skipped
    //         }
    //       }
    //       `,
    //       { variables: { contractId, index: cycleIndex } },
    //     );

    //     const nextCycleData = await nextCycleRes.json();
    //     const nextCycle = nextCycleData.data?.subscriptionBillingCycle;
    //     if (!nextCycle) break;

    //     cycleIndex = nextCycle.cycleIndex;
    //     nextBillingDate = nextCycle.billingAttemptExpectedDate || nextBillingDate;
    //     cycleStatus = nextCycle.status;
    //   }
    // }
    if (cycle) {
      cycleIndex = cycle.cycleIndex;
      nextBillingDate = cycle.billingAttemptExpectedDate || nextBillingDate;
      cycleStatus = cycle.status;
      let cycleSkipped = cycle.skipped; // naya — properly declared

      let safetyCounter = 0;
      while ((cycleStatus === "BILLED" || cycleSkipped) && safetyCounter < 20) {
        cycleIndex += 1;
        safetyCounter += 1;

        const nextCycleRes = await admin.graphql(
          `
          query getCycleByIndex($contractId: ID!, $index: Int!) {
            subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { index: $index } }) {
              cycleIndex
              billingAttemptExpectedDate
              status
              skipped
            }
          }
          `,
          { variables: { contractId, index: cycleIndex } },
        );

        const nextCycleData = await nextCycleRes.json();
        const nextCycle = nextCycleData.data?.subscriptionBillingCycle;
        if (!nextCycle) break;

        cycleIndex = nextCycle.cycleIndex;
        nextBillingDate = nextCycle.billingAttemptExpectedDate || nextBillingDate;
        cycleStatus = nextCycle.status;
        cycleSkipped = nextCycle.skipped;
      }
    }
  }

  const rawActionsForNextCycle =
    cycleIndex != null ? collectActionsForCycle(extraSettings, cycleIndex, firstLine?.pricingPolicy) : [];
  const actionsForNextCycle = rawActionsForNextCycle.filter((a) => {
    if (!LINE_MATCH_REQUIRED_TYPES.has(a.type)) return true;
    return actionMatchesLine(a, firstLine);
  });

  // let calculatedPricePerUnit =
  //   cycleIndex != null ? computePriceForCycle(firstLine?.pricingPolicy, cycleIndex) : null;
  let calculatedPricePerUnit = firstLine?.pricingPolicy?.basePrice ?? null;
  const swapAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "VARIANT_SWAP" || a.type === "PRODUCT_SWAP")
    : null;

  const addProductActions = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.filter((a) => a.type === "ADD_PRODUCT")
    : [];


  const allVariantIdsNeeded = [
    firstLine?.variantId,
    swapAction?.variantId,
    ...addProductActions.map((a) => a.variantId),
  ].filter(Boolean);

  const variantDataMap = await fetchVariantsBatch(admin, allVariantIdsNeeded);

  let effectiveBase = Number(firstLine?.pricingPolicy?.basePrice?.amount) || 0;

  // if (swapAction?.variantId) {
  //   const swappedInfo = variantDataMap[swapAction.variantId];
  //   if (swappedInfo?.price != null) {
  //     effectiveBase = swappedInfo.price;
  //     const tier = getDiscountTierForCycle(firstLine?.pricingPolicy, cycleIndex);
  //     calculatedPricePerUnit = {
  //       amount: applyDiscountTierToPrice(effectiveBase, tier).toFixed(2),
  //       currencyCode:
  //         firstLine?.pricingPolicy?.basePrice?.currencyCode ??
  //         firstLine?.currentPrice?.currencyCode,
  //     };
  //   } else {
  //     console.warn(
  //       `[preview] swap target variant (${swapAction.variantId}) price fetch failed — ` +
  //         `falling back to original product's price for calculations (may be inaccurate).`,
  //     );
  //   }
  // }

  // Unified discount for the base line — either "before" (native selling-plan tier) or
  // "after" (merchant's custom afterOrders override). Never both, never a stray "0% off".
  
  if (swapAction?.variantId) {
  const swappedInfo = variantDataMap[swapAction.variantId];
  if (swappedInfo?.price != null) {
    effectiveBase = swappedInfo.price;

    if (swapAction.discountEnabled) {
      calculatedPricePerUnit = {
        amount: applyCustomDiscountAction(effectiveBase, {
          adjustmentType: swapAction.discountType,
          adjustmentValue: swapAction.discountValue,
        }).toFixed(2),
        currencyCode: firstLine?.pricingPolicy?.basePrice?.currencyCode ?? firstLine?.currentPrice?.currencyCode,
      };
    } else {
      // koi discount config nahi hai → swap product apni full price pe rahega
      calculatedPricePerUnit = {
        amount: effectiveBase.toFixed(2),
        currencyCode: firstLine?.pricingPolicy?.basePrice?.currencyCode ?? firstLine?.currentPrice?.currencyCode,
      };
    }
  } else {
    console.warn(
      `[preview] swap target variant (${swapAction.variantId}) price fetch failed — ` +
        `falling back to original product's price for calculations (may be inaccurate).`,
    );
  }
}
  
  const discountAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "DISCOUNT_CHANGE")
    : null;
  const hasRealDiscount =
    discountAction && !discountAction.__default && Number(discountAction.adjustmentValue) > 0;

  if (hasRealDiscount) {
    const base = effectiveBase;

    let discounted = base;
    if (discountAction.adjustmentType === "PERCENTAGE") {
      discounted = base - (base * Number(discountAction.adjustmentValue)) / 100;
    } else {
      discounted = base - Number(discountAction.adjustmentValue);
    }

    calculatedPricePerUnit = {
      amount: Math.max(0, discounted).toFixed(2),
      currencyCode:
        calculatedPricePerUnit?.currencyCode ??
        firstLine?.pricingPolicy?.basePrice?.currencyCode ??
        firstLine?.currentPrice?.currencyCode,
    };
  }
  const quantityAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "QUANTITY_CHANGE")
    : null;
  const calculatedQuantity = quantityAction ? Number(quantityAction.value) : 1;

  const calculatedItemTotal =
    calculatedPricePerUnit && calculatedQuantity != null
      ? {
          amount: (Number(calculatedPricePerUnit.amount) * calculatedQuantity).toFixed(2),
          currencyCode: calculatedPricePerUnit.currencyCode,
        }
      : null;
  const currencyCode =
    calculatedPricePerUnit?.currencyCode ??
    firstLine?.pricingPolicy?.basePrice?.currencyCode ??
    firstLine?.currentPrice?.currencyCode ??
    "INR";

  const lineItems = [];
  const originalVariantInfo = variantDataMap[firstLine?.variantId];
  let mainLineImageUrl = originalVariantInfo?.image?.url ?? null;
  let mainLineImageAlt = originalVariantInfo?.image?.altText ?? firstLine?.title ?? null;

  if (swapAction?.variantId) {
    const swappedInfo = variantDataMap[swapAction.variantId];
    if (swappedInfo?.image) {
      mainLineImageUrl = swappedInfo.image.url;
      mainLineImageAlt = swappedInfo.image.altText ?? mainLineImageAlt;
    }
  }
let swappedTitle ;
  if (swapAction?.variantId) {
    const matchedDest = (swapAction.dests || []).find((d) =>
      (d.variantIds || []).includes(swapAction.variantId),
    );
    if (matchedDest) {
      const variantIdx = matchedDest.variantIds.indexOf(swapAction.variantId);
      const variantName = matchedDest.variantNames?.[variantIdx];
      swappedTitle = variantName ? `${matchedDest.name}` : matchedDest.name;
    }
  }
  const isBaseLineRemoved = actionsForNextCycle.some(
    (a) =>
      (a.type === "REMOVE_PRODUCT" || a.type === "REMOVE_VARIANT") &&
      actionMatchesLine(a, firstLine),
  );

  const baseOriginalPricePerUnit = {
    amount: effectiveBase.toFixed(2),
    currencyCode,
  };
  const baseOriginalItemTotal = {
    amount: (effectiveBase * calculatedQuantity).toFixed(2),
    currencyCode,
  };

  if (calculatedPricePerUnit && !isBaseLineRemoved) {
    lineItems.push({
      title: swapAction?.variantId ? swappedTitle : firstLine?.title,
      variantTitle: swapAction?.variantId            
      ? (variantDataMap[swapAction.variantId]?.title ?? null)
      : (originalVariantInfo?.title ?? null),
      productId: swapAction?.variantId
        ? (swapAction?.dests?.length ? swapAction.dests[0]?.id ?? null : null)
        : firstLine?.productId,
      variantId: swapAction?.variantId ?? firstLine?.variantId,
      quantity: calculatedQuantity,
      imageUrl: mainLineImageUrl,
      imageAlt: mainLineImageAlt,
      pricePerUnit: calculatedPricePerUnit,
      itemTotal: calculatedItemTotal,
      originalPricePerUnit: hasRealDiscount ? baseOriginalPricePerUnit : calculatedPricePerUnit,
      originalItemTotal: hasRealDiscount ? baseOriginalItemTotal : calculatedItemTotal,
      isBaseLine: true,
      automationCycleIndex: swapAction?.__automationCycleIndex ?? null,
      automationActionIndex: swapAction?.__automationActionIndex ?? null,
      // "before" = native selling-plan discount tier, "after" = merchant's custom afterOrders override.
      // The UI needs this to know which setting to flip when "Remove discount" is clicked.
      discountPhase: hasRealDiscount ? discountAction.__phase : null,
      discountLabel: hasRealDiscount
        ? (String(discountAction.adjustmentType).toUpperCase() === "PERCENTAGE"
            ? `${discountAction.adjustmentValue}% off`
            : String(discountAction.adjustmentType).toUpperCase() === "FIXED_AMOUNT"
              ? `Fixed price: ${currencySymbol(currencyCode)}${discountAction.adjustmentValue}`
              : `${currencySymbol(currencyCode)}${discountAction.adjustmentValue} off`)
        : null,
    });
  }

  const discountTierForCycle = getDiscountTierForCycle(firstLine?.pricingPolicy, cycleIndex);
  for (const action of addProductActions) {
    const isSwapGenerated = !!action.destProductId || !!action.sourceProductId;
    const qty = Number(action.quantity) || 1;

    const variantInfo = variantDataMap[action.variantId];
    const knownPrice = variantInfo?.price ?? null;

    let pricePerUnit;
    try {
      pricePerUnit = computeLinePriceFromKnownPrice(
        knownPrice,
        {
          isSwapGenerated,
          discountEnabled: action.discountEnabled,
          discountType: action.discountType,
          discountValue: action.discountValue,
        },
        effectiveBase,
        discountTierForCycle,
        hasRealDiscount ? discountAction : null,
      );
    } catch (err) {
      console.warn(`[preview] failed computing price for ADD_PRODUCT variant ${action.variantId}:`, err);
      pricePerUnit = 0;
    }

    let addedImageUrl = action.imageUrl ?? variantInfo?.image?.url ?? null;
    let addedImageAlt = action.productName ?? action.variantName ?? variantInfo?.image?.altText ?? null;

    const originalPriceValue =
      knownPrice != null ? knownPrice : isSwapGenerated ? effectiveBase : pricePerUnit;

    lineItems.push({
      title: action.productName ?? action.variantName ?? "Added product",
      variantTitle: variantInfo?.title ?? null,
      productId: action.productId ?? action.destProductId ?? null,
      variantId: action.variantId,
      quantity: qty,
      imageUrl: addedImageUrl,
      imageAlt: addedImageAlt,
      pricePerUnit: { amount: pricePerUnit.toFixed(2), currencyCode },
      itemTotal: { amount: (pricePerUnit * qty).toFixed(2), currencyCode },
      originalPricePerUnit: { amount: originalPriceValue.toFixed(2), currencyCode },
      originalItemTotal: { amount: (originalPriceValue * qty).toFixed(2), currencyCode },
      isBaseLine: false,
      automationCycleIndex: action.__automationCycleIndex ?? null,
      automationActionIndex: action.__automationActionIndex ?? null,
      discountPhase: null, // automation-item discounts aren't phased — remove just disables discountEnabled
      discountLabel:
        action.discountEnabled && Number(action.discountValue) > 0
          ? (String(action.discountType).toLowerCase() === "percentage"
              ? `${action.discountValue}% off`
              : String(action.discountType).toLowerCase() === "fixed_amount"
                ? `Fixed price: ${currencySymbol(currencyCode)}${action.discountValue}`
                : `${currencySymbol(currencyCode)}${action.discountValue} off`)
          : null,
    });
  }

  const calculatedOrderTotal = {
    amount: lineItems.reduce((sum, li) => sum + Number(li.itemTotal.amount), 0).toFixed(2),
    currencyCode,
  };
  const originalOrderTotal = {
    amount: lineItems
      .reduce((sum, li) => sum + Number((li.originalItemTotal ?? li.itemTotal).amount), 0)
      .toFixed(2),
    currencyCode,
  };

  // ── Shipping discount for next order (independent of line items) ──
  const shippingAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "SHIPPING_DISCOUNT_CHANGE")
    : null;
  const hasRealShippingDiscount = shippingAction && !shippingAction.__default;
  const originalShippingPriceAmount = Number(contract.deliveryPrice?.amount ?? 0);
  const shippingCurrency = contract.deliveryPrice?.currencyCode ?? currencyCode;
  const calculatedShippingPriceAmount = hasRealShippingDiscount
    ? applyShippingDiscountToPrice(originalShippingPriceAmount, shippingAction)
    : originalShippingPriceAmount;

  const shippingPreview = contract.deliveryPrice
    ? {
        originalPrice: { amount: originalShippingPriceAmount.toFixed(2), currencyCode: shippingCurrency },
        calculatedPrice: { amount: calculatedShippingPriceAmount.toFixed(2), currencyCode: shippingCurrency },
        discountLabel: hasRealShippingDiscount
          ? (String(shippingAction.adjustmentType).toUpperCase() === "PERCENTAGE"
              ? `${shippingAction.adjustmentValue}% off shipping`
              : String(shippingAction.adjustmentType).toUpperCase() === "FIXED_AMOUNT"
                ? `${currencySymbol(shippingCurrency)}${shippingAction.adjustmentValue} off shipping`
                : `Fixed shipping: ${currencySymbol(shippingCurrency)}${shippingAction.adjustmentValue}`)
          : null,
      }
    : null;

  // ── Min/Max cycle info, for UI display ──
  const minCycles = contract.billingPolicy?.minCycles ?? null;
  const maxCycles = contract.billingPolicy?.maxCycles ?? null;
  const cyclesRemainingUntilMax =
    maxCycles != null && cycleIndex != null ? Math.max(0, maxCycles - cycleIndex) : null;
  const cyclesRemainingUntilMin =
    minCycles != null && cycleIndex != null ? Math.max(0, minCycles - cycleIndex) : null;

  const billingPolicySummary = {
    minCycles,
    maxCycles,
    hasMinCycles: minCycles != null,
    hasMaxCycles: maxCycles != null,
    minCyclesReached: minCycles != null && cycleIndex != null ? cycleIndex >= minCycles : null,
    maxCyclesReached: maxCycles != null && cycleIndex != null ? cycleIndex >= maxCycles : null,
    cyclesRemainingUntilMin,
    cyclesRemainingUntilMax,
    summary:
      minCycles == null && maxCycles == null
        ? "Unlimited — runs until cancelled"
        : [
            minCycles != null ? `Min ${minCycles} cycles` : null,
            maxCycles != null ? `Max ${maxCycles} cycles` : null,
          ]
            .filter(Boolean)
            .join(" • "),
  };

  const preview = {
    contractId: contract.id,
    status: contract.status,
    customer: contract.customer,
    settingsSource,
    lineItem: {
      id: firstLine?.id,
      title: firstLine?.title,
      quantity: firstLine?.quantity,
      price: firstLine?.currentPrice,
      productId: firstLine?.productId,      
      variantId: firstLine?.variantId,
      variantName: originalVariantInfo?.title ?? null,
      imageUrl: originalVariantInfo?.image?.url ?? null,
      imageAlt: originalVariantInfo?.image?.altText ?? firstLine?.title ?? null,
      pricingPolicyDebug: firstLine?.pricingPolicy ?? null,
    },
    planGroup: { id: groupId, name: groupName },
    billingPolicy: billingPolicySummary,
    nextOrder: {
      cycleIndex,
      expectedDate: nextBillingDate,
      lineItems,
      calculatedOrderTotal,
      originalOrderTotal,
      shipping: shippingPreview,
      willApply: (() => {
        const visible = actionsForNextCycle
          .filter((a) => !a.__default)
          .map(({ variantId, ...rest }) => rest);
        return visible.length > 0 ? visible : "No automatic changes configured for this cycle";
      })(),
    },
    allExtraSettings: extraSettings,
  };
  return preview;
}

async function clearAnyOpenDraft(admin, contractId, { fromIndex = 0, toIndex = 6 } = {}) {
  const results = [];
  for (let i = fromIndex; i <= toIndex; i++) {
    try {
      const r = await clearBillingCycleEdit(admin, contractId, i);
      results.push({ cycleIndex: i, ...r });
    } catch (err) {
      results.push({ cycleIndex: i, cleared: false, error: String(err?.message || err) });
    }
  }
  return results;
}
async function isBlockedByOpenDraft(admin, contractId) {
  const res = await admin.graphql(
    `
    query checkOpenDraft($id: ID!) {
      subscriptionContract(id: $id) {
        id
        status
      }
    }
    `,
    { variables: { id: contractId } },
  );
  const data = await res.json();

  return { status: data?.data?.subscriptionContract?.status ?? null };
}
const CONTRACT_UPDATE_MUTATION = `
  mutation SubscriptionContractUpdate($contractId: ID!) {
    subscriptionContractUpdate(contractId: $contractId) {
      draft { id }
      userErrors { field message code }
    }
  }
`;

const DRAFT_UPDATE_ADDRESS_MUTATION = `
  mutation SubscriptionDraftUpdateAddress(
    $draftId: ID!
    $deliveryMethod: SubscriptionDeliveryMethodInput!
  ) {
    subscriptionDraftUpdate(draftId: $draftId, input: { deliveryMethod: $deliveryMethod }) {
      draft { id }
      userErrors { field message code }
    }
  }
`;

const DRAFT_COMMIT_MUTATION = `
  mutation SubscriptionDraftCommit($draftId: ID!) {
    subscriptionDraftCommit(draftId: $draftId) {
      contract { id }
      userErrors { field message code }
    }
  }
`;

async function updateContractAddress(admin, contractId, addressInput) {
  try {
    await clearAnyOpenDraft(admin, contractId);
  } catch (err) {
    console.warn(`[update_address] clearAnyOpenDraft failed for ${contractId}:`, err);
  }

  const draftRes = await admin.graphql(CONTRACT_UPDATE_MUTATION, {
    variables: { contractId },
  });
  const draftData = await draftRes.json();
  const draftPayload = draftData?.data?.subscriptionContractUpdate;
  if (!draftPayload?.draft?.id || draftPayload.userErrors?.length) {
    return {
      success: false,
      error:
        draftPayload?.userErrors?.map((e) => e.message).join(", ") ||
        "Failed to open draft for address update",
    };
  }
  const draftId = draftPayload.draft.id;

  const updateRes = await admin.graphql(DRAFT_UPDATE_ADDRESS_MUTATION, {
    variables: {
      draftId,
      deliveryMethod: { shipping: { address: addressInput } },
    },
  });
  const updateData = await updateRes.json();
  const updatePayload = updateData?.data?.subscriptionDraftUpdate;
  if (updatePayload?.userErrors?.length) {
    return {
      success: false,
      error: updatePayload.userErrors.map((e) => e.message).join(", "),
    };
  }

  const commitRes = await admin.graphql(DRAFT_COMMIT_MUTATION, {
    variables: { draftId },
  });
  const commitData = await commitRes.json();
  const commitPayload = commitData?.data?.subscriptionDraftCommit;
  if (!commitPayload?.contract || commitPayload.userErrors?.length) {
    return {
      success: false,
      error:
        commitPayload?.userErrors?.map((e) => e.message).join(", ") ||
        "Failed to commit address change",
    };
  }

  return { success: true };
}

const SWAP_DRAFT_LINE_MUTATION = `
  mutation swapDraftLine($draftId: ID!, $lineId: ID!, $variantId: ID!, $price: Decimal!, $qty: Int!) {
    subscriptionDraftLineUpdate(
      draftId: $draftId
      lineId: $lineId
      input: { productVariantId: $variantId, currentPrice: $price, quantity: $qty }
    ) {
      userErrors { field message }
    }
  }
`;

const CONTRACT_UPDATE_MUTATION_WITH_LINES = `
  mutation SubscriptionContractUpdateForSwap($contractId: ID!) {
    subscriptionContractUpdate(contractId: $contractId) {
      draft {
        id
        lines(first: 50) {
          edges {
            node {
              id
              productId
              variantId
              quantity
              currentPrice { amount currencyCode }
            }
          }
        }
      }
      userErrors { field message code }
    }
  }
`;

async function updateContractLineProduct(
  admin,
  contractId,
  { lineId, variantId, quantity, keepDiscount = false, allowQuantityChanges = true },
) {
  try {
    await clearAnyOpenDraft(admin, contractId);
  } catch (err) {
    console.warn(`[swap_product] clearAnyOpenDraft failed for ${contractId}:`, err);
  }

  const draftRes = await admin.graphql(CONTRACT_UPDATE_MUTATION_WITH_LINES, {
    variables: { contractId },
  });
  const draftData = await draftRes.json();
  const draftPayload = draftData?.data?.subscriptionContractUpdate;

  if (!draftPayload?.draft?.id || draftPayload.userErrors?.length) {
    return {
      success: false,
      error:
        draftPayload?.userErrors?.map((e) => e.message).join(", ") ||
        "Failed to open draft for product swap",
    };
  }

  const draftId = draftPayload.draft.id;
  const draftLines = draftPayload.draft.lines?.edges?.map((e) => e.node) ?? [];
  const targetLine = (lineId && draftLines.find((l) => l.id === lineId)) || draftLines[0];

  if (!targetLine) {
    return { success: false, error: "Subscription line not found" };
  }

  const newRawPrice = await fetchVariantPrice(admin, variantId);
  if (newRawPrice == null) {
    return { success: false, error: "Could not fetch price for selected variant" };
  }

  let finalPrice = newRawPrice;

  if (keepDiscount && targetLine.variantId) {
    const oldRawPrice = await fetchVariantPrice(admin, targetLine.variantId);
    const oldCurrentPrice = Number(targetLine.currentPrice?.amount);

    if (oldRawPrice > 0 && !Number.isNaN(oldCurrentPrice)) {
      const discountFraction = Math.max(0, (oldRawPrice - oldCurrentPrice) / oldRawPrice);
      finalPrice = Math.max(0, newRawPrice * (1 - discountFraction));
    }
    // agar oldRawPrice fetch fail ho jaye ya currentPrice na mile, finalPrice = newRawPrice hi rahega (safe fallback)
  }

  // allowQuantityChanges false → purani line ki quantity hi preserve karo, client se aayi qty ignore karo
  const finalQuantity = allowQuantityChanges
    ? (Number(quantity) || 1)
    : (Number(targetLine.quantity) || 1);

  const updateRes = await admin.graphql(SWAP_DRAFT_LINE_MUTATION, {
    variables: {
      draftId,
      lineId: targetLine.id,
      variantId,
      price: finalPrice.toFixed(2),
      qty: finalQuantity,
    },
  });
  const updateData = await updateRes.json();
  const updatePayload = updateData?.data?.subscriptionDraftLineUpdate;
  if (updatePayload?.userErrors?.length) {
    return { success: false, error: updatePayload.userErrors.map((e) => e.message).join(", ") };
  }

  const commitRes = await admin.graphql(DRAFT_COMMIT_MUTATION, { variables: { draftId } });
  const commitData = await commitRes.json();
  const commitPayload = commitData?.data?.subscriptionDraftCommit;
  if (!commitPayload?.contract || commitPayload.userErrors?.length) {
    return {
      success: false,
      error:
        commitPayload?.userErrors?.map((e) => e.message).join(", ") ||
        "Failed to commit product swap",
    };
  }

  return { success: true };
}

export {
  getContractPreview,
  collectActionsForCycle,
  resolveDiscountForCycle,
  resolveShippingDiscountForCycle,
  applyShippingDiscountToPrice,
  applyActionsToCycle,
  computePriceForCycle,
  getDiscountTierForCycle,
  applyDiscountTierToPrice,
  fetchVariantPrice,
  fetchVariantsBatch,
  getEffectiveBasePrice,
  computeLinePriceFromKnownPrice,
  EXTRA_SETTINGS_NAMESPACE,
  sortActionsForApply,
  clearBillingCycleEdit,
  getContractSettingsSnapshot,
  snapshotContractSettings,
  removeAutomationVariant,
  getEffectiveSettingsForContract,
  addBaseLineRemoval,
  removeAllDiscounts,      
  removeLineDiscount, 
  clearAnyOpenDraft,        
  isBlockedByOpenDraft, 
   updateContractAddress,
   updateContractLineProduct,

};