import {
  getContractPreview,
  snapshotContractSettings,
  fetchVariantsBatch,
  resolveLineDiscountForCycle,
} from "./billing-preview.server";

function buildLineSettingsFromVariant(variant, sellingPlanDiscount) {
  const mode = variant.discountMode || "SELLING_PLAN";

  if (mode === "NONE") {
    return {
      initialEnabled: false, initialType: "PERCENTAGE", initialValue: 0,
      afterEnabled: false, afterOrders: 0, afterType: "PERCENTAGE", afterValue: 0,
    };
  }

  if (mode === "CUSTOM") {
    return {
      initialEnabled: Number(variant.discountAmount) > 0,
      initialType: variant.discountType || "PERCENTAGE",
      initialValue: Number(variant.discountAmount) || 0,
      afterEnabled: !!variant.changeDiscountAfterOrders && Number(variant.discountAmount2) > 0,
      afterOrders: Number(variant.afterOrders) || 0,
      afterType: variant.discountType2 || "PERCENTAGE",
      afterValue: Number(variant.discountAmount2) || 0,
    };
  }

  const sp = sellingPlanDiscount || {};
  return {
    initialEnabled: !!sp.giveDiscount && Number(sp.discountAmount) > 0,
    initialType: sp.discountType || "PERCENTAGE",
    initialValue: Number(sp.discountAmount) || 0,
    afterEnabled: !!sp.giveDiscount && !!sp.changeDiscountAfterOrders && Number(sp.discountAmount2) > 0,
    afterOrders: Number(sp.afterOrders) || 0,
    afterType: sp.discountType2 || "PERCENTAGE",
    afterValue: Number(sp.discountAmount2) || 0,
  };
}

export async function snapshotAdhocContractDiscounts(admin, contractId, products, contractDetails) {
  if (!contractId) return { snapshotted: false, reason: "no contractId" };

  try {
    const initialPreview = await getContractPreview(admin, contractId);
    const baselineCycleIndex = initialPreview?.nextOrder?.cycleIndex ?? 0;

    const sellingPlanDiscount = {
      giveDiscount: contractDetails.giveDiscount,
      discountAmount: contractDetails.discountAmount,
      discountType: contractDetails.discountType,
      changeDiscountAfterOrders: contractDetails.changeDiscountAfterOrders,
      discountAmount2: contractDetails.discountAmount2,
      afterOrders: contractDetails.afterOrders,
      discountType2: contractDetails.discountType2,
    };

    const lines = {};
    for (const product of products || []) {
      for (const variant of product.variants || []) {
        if (!variant.variantsId) continue;
        const lineSettings = buildLineSettingsFromVariant(variant, sellingPlanDiscount);
        lineSettings.afterOrders = baselineCycleIndex + lineSettings.afterOrders;
        lines[variant.variantsId] = lineSettings;
      }
    }

    const settings = { lines };
    const { snapshotted } = await snapshotContractSettings(admin, contractId, settings);

    console.log(
      snapshotted
        ? `[adhoc-subscription] multi-line settings snapshotted for ${contractId} (baseline cycle ${baselineCycleIndex}):`
        : `[adhoc-subscription] settings snapshot skipped for ${contractId} (no shop id resolved):`,
      JSON.stringify(settings),
    );

    return { snapshotted, baselineCycleIndex, settings };
  } catch (err) {
    console.error(`[adhoc-subscription] failed to snapshot settings for ${contractId}:`, err);
    return { snapshotted: false, error: String(err?.message || err) };
  }
}

export async function buildAdhocMultiLinePreview(admin, contract, extraSettings, cycleIndex, nextBillingDate) {
  const lines = contract.lines?.edges?.map((e) => e.node) || [];
  const variantIds = lines.map((l) => l.variantId).filter(Boolean);
  const variantData = await fetchVariantsBatch(admin, variantIds);

  const lineItems = lines.map((line) => {
    const lineSettings = extraSettings.lines?.[line.variantId] || null;
    const discount = resolveLineDiscountForCycle(lineSettings, cycleIndex);
    const info = variantData[line.variantId];
    const basePrice = Number(line.currentPrice?.amount) || Number(info?.price) || 0;
    const currencyCode = line.currentPrice?.currencyCode || "INR";

    let pricePerUnit = basePrice;
    let discountLabel = null;
    if (discount) {
      pricePerUnit =
        discount.adjustmentType === "PERCENTAGE"
          ? Math.max(0, basePrice - (basePrice * discount.adjustmentValue) / 100)
          : Math.max(0, basePrice - discount.adjustmentValue);
      discountLabel =
        discount.adjustmentType === "PERCENTAGE"
          ? `${discount.adjustmentValue}% off`
          : `${discount.adjustmentValue} off`;
    }

    const quantity = Number(line.quantity) || 1;

    return {
      title: line.title,
      productId: line.productId,
      variantId: line.variantId,
      quantity,
      imageUrl: line.variantImage?.url || info?.image?.url || null,
      imageAlt: line.title,
      pricePerUnit: { amount: pricePerUnit.toFixed(2), currencyCode },
      itemTotal: { amount: (pricePerUnit * quantity).toFixed(2), currencyCode },
      originalPricePerUnit: { amount: basePrice.toFixed(2), currencyCode },
      originalItemTotal: { amount: (basePrice * quantity).toFixed(2), currencyCode },
      isBaseLine: true,
      automationCycleIndex: null,
      automationActionIndex: null,
      discountPhase: discount?.__phase ?? null,
      discountLabel,
    };
  });

  const currencyCode = lineItems[0]?.pricePerUnit.currencyCode || "INR";
  const calculatedOrderTotal = {
    amount: lineItems.reduce((s, li) => s + Number(li.itemTotal.amount), 0).toFixed(2),
    currencyCode,
  };
  const originalOrderTotal = {
    amount: lineItems.reduce((s, li) => s + Number(li.originalItemTotal.amount), 0).toFixed(2),
    currencyCode,
  };

  const originalShippingPriceAmount = Number(contract.deliveryPrice?.amount ?? 0);
  const shippingCurrency = contract.deliveryPrice?.currencyCode ?? currencyCode;
  const shippingPreview = contract.deliveryPrice
    ? {
        originalPrice: { amount: originalShippingPriceAmount.toFixed(2), currencyCode: shippingCurrency },
        calculatedPrice: { amount: originalShippingPriceAmount.toFixed(2), currencyCode: shippingCurrency },
        discountLabel: null,
      }
    : null;

  const willApplyActions = lineItems
    .filter((li) => li.discountLabel)
    .map((li) => ({
      type: "LINE_DISCOUNT_CHANGE",
      sourceVariantId: li.variantId,
      discountLabel: li.discountLabel,
      phase: li.discountPhase,
    }));

  return {
    contractId: contract.id,
    status: contract.status,
    customer: contract.customer,
    settingsSource: "contract_snapshot",
    lineItem: {
      id: lines[0]?.id,
      title: lines[0]?.title,
      quantity: lines[0]?.quantity,
      price: lines[0]?.currentPrice,
      productId: lines[0]?.productId,
      variantId: lines[0]?.variantId,
    },
    planGroup: { id: null, name: null },
    billingPolicy: {
      minCycles: contract.billingPolicy?.minCycles ?? null,
      maxCycles: contract.billingPolicy?.maxCycles ?? null,
      summary: "Unlimited — runs until cancelled",
    },
    nextOrder: {
      cycleIndex,
      expectedDate: nextBillingDate,
      lineItems,
      calculatedOrderTotal,
      originalOrderTotal,
      shipping: shippingPreview,
      willApply:
        willApplyActions.length > 0
          ? willApplyActions
          : "No automatic changes configured for this cycle",
    },
    allExtraSettings: extraSettings,
  };
}