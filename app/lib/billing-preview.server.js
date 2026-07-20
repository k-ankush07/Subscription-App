const EXTRA_SETTINGS_NAMESPACE = "subscription_app";

const CONTRACT_SETTINGS_SNAPSHOTS_KEY = "contract_settings_snapshots"; 

function metaKeyForGroup(groupId) {
  const numericId = groupId.split("/").pop();
  return `extra_settings_${numericId}`;
}
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
    // list ke end se search karo — same contract ka latest snapshot jeetega
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

// NEW — contract creation ke time plan settings ka snapshot save karo
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
    const allDests = Array.isArray(action.dests) ? action.dests : [];

    // Har dest se pehla variant lo, empty/invalid dests skip karo
    const validDests = allDests
      .map((dest) => ({ dest, variantId: dest?.variantIds?.[0] ?? null }))
      .filter((d) => d.variantId);

    if (validDests.length === 0) {
      return [{
        ...action,
        type: "VARIANT_SWAP",
        variantId: null,
        dests: allDests,
        after: afterOrders,
      }];
    }

    const results = [];

    // Pehla dest -> existing line SWAP hoga
    results.push({
      ...action,
      type: "VARIANT_SWAP",
      variantId: validDests[0].variantId,
      dests: allDests,
      after: afterOrders,
    });

   
    for (let i = 1; i < validDests.length; i++) {
      results.push({
        type: "ADD_PRODUCT",
        variantId: validDests[i].variantId,
        quantity: action.quantity ?? 1,
        sourceProductId: action.sourceProductId,
        destProductId: validDests[i].dest?.id ?? null,
        after: afterOrders,
      });
    }

    return results; // ⬅ ab array return hota hai
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
  "SHIPPING_DISCOUNT",
  "VARIANT_SWAP",
  "PRODUCT_SWAP",
  "DISCOUNT_CHANGE", // must stay last
];

function sortActionsForApply(actions) {
  return [...actions].sort((a, b) => {
    const ai = ACTION_ORDER.indexOf(a.type);
    const bi = ACTION_ORDER.indexOf(b.type);
    return (ai === -1 ? ACTION_ORDER.length : ai) - (bi === -1 ? ACTION_ORDER.length : bi);
  });
}

function collectActionsForCycle(settings, cycleIndex) {
  const actions = [];
  if (!settings) return actions;

  cycleIndex = Number(cycleIndex);
  if (
    settings.changeDiscountAfterOrders &&
    cycleIndex >= Number(settings.afterOrders)
  ) {
    actions.push({
      type: "DISCOUNT_CHANGE",
      adjustmentType: settings.afterDiscountType ?? "PERCENTAGE",
      adjustmentValue: Number(settings.afterDiscountValue) || 0,
      after: settings.afterOrders,
    });
  }

  // 2. Shipping discount — "after N orders"
  if (
    settings.giveShippingDiscount &&
    cycleIndex >= Number(settings.shippingAfterOrders)
  ) {
    actions.push({
      type: "SHIPPING_DISCOUNT",
      discountType: settings.shippingDiscountType,
      value: settings.shippingDiscountValue,
      after: settings.shippingAfterOrders,
    });
  }

  // 3. Quantity Change — "change quantity to X after N orders"
  // FIXED — checkout/original subscription quantity kabhi use nahi honi
  // chahiye. Agar merchant ne "change quantity" configure ki hai aur uska
  // threshold pura ho gaya hai to wahi value use hogi; warna hamesha DEFAULT
  // 1 quantity force hogi (checkout wali quantity, jaise 9, kabhi nahi).
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
      __default: true, // preview me alag se "willApply" list mein nahi dikhana
    });
  }

  // 4. Product Swap — "swap to variant X after N orders"
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
    for (const auto of settings.automationCycles) {
      if (cycleIndex >= Number(auto.orders)) {
        for (const action of auto.actions ?? []) {
          actions.push(...normalizeAutomationAction(action, auto.orders)); // spread — array aata hai
        }
      }
    }
  }

  // 7. Minimum quantity floor — DISABLED (user ne mana kiya use karne se)
  // if (settings.MinimumQuanitity) {
  //   actions.push({
  //     type: "MINIMUM_QUANTITY",
  //     value: settings.MinimumQuanitityValue,
  //   });
  // }

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

function resolveLineForAction(draftLines, action) {
  if (!draftLines?.length) return null;

  const targetProductIds = [];
  const targetVariantIds = [];

  if (Array.isArray(action.products)) {
    for (const p of action.products) {
      if (typeof p === "string") {
        targetProductIds.push(p);
        continue;
      }
      if (p?.id) targetProductIds.push(p.id);
      for (const v of p?.variants ?? []) {
        if (v?.variantsId) targetVariantIds.push(v.variantsId);
      }
    }
  }

  if (action.sourceProductId) targetProductIds.push(action.sourceProductId);
  if (action.sourceVariantId) targetVariantIds.push(action.sourceVariantId);

  if (targetProductIds.length === 0 && targetVariantIds.length === 0) {
    return draftLines[0];
  }

  const match = draftLines.find(
    (line) =>
      (line.variantId && targetVariantIds.includes(line.variantId)) ||
      (line.productId && targetProductIds.includes(line.productId)),
  );

  if (match) return match;

  console.warn(
    `[applyActionsToCycle] ${action.type}: configured target product/variant not found on any draft line — falling back to first line.`,
  );
  return draftLines[0];
}

// FIXED — schema mein `deletedSubscriptionBillingCycleEditContractId` /
// `deletedSubscriptionBillingCycleEditScheduleId` jaise fields exist hi nahi
// karte. Actual payload `billingCycles` array + `userErrors` return karta hai.
async function clearBillingCycleEdit(admin, contractId, cycleIndex) {
  if (cycleIndex == null) return { cleared: false, reason: "no cycleIndex provided" };

  const res = await admin.graphql(
    `
    mutation clearCycleEdit($contractId: ID!, $index: Int!) {
      subscriptionBillingCycleEditDelete(
        billingCycleInput: { contractId: $contractId, selector: { index: $index } }
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
    { variables: { contractId, index: cycleIndex } },
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

async function findBlockingBillingCycleIndex(admin, contractId, aroundDate = new Date()) {
  const res = await admin.graphql(
    `
    query getCycleAround($contractId: ID!, $date: DateTime!) {
      subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { date: $date } }) {
        cycleIndex
        edited
        status
      }
    }
    `,
    { variables: { contractId, date: aroundDate.toISOString() } },
  );
  const data = await res.json();
  const cycle = data.data?.subscriptionBillingCycle;
  if (!cycle) return null;

  if (cycle.edited) return cycle.cycleIndex;

  // Also check the immediately following cycle — "upcoming" edits count too.
  const nextRes = await admin.graphql(
    `
    query getNextCycle($contractId: ID!, $index: Int!) {
      subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { index: $index } }) {
        cycleIndex
        edited
        status
      }
    }
    `,
    { variables: { contractId, index: cycle.cycleIndex + 1 } },
  );
  const nextData = await nextRes.json();
  const nextCycle = nextData.data?.subscriptionBillingCycle;
  if (nextCycle?.edited) return nextCycle.cycleIndex;

  return cycle.cycleIndex;
}


async function applyActionsToCycle(
  admin,
  contractId,
  cycleIndex,
  actions,
  basePriceAmount = null,
  pricingPolicy = null, 
) {
  const editRes = await admin.graphql(
    `
    mutation openCycleDraft($contractId: ID!, $index: Int!) {
      subscriptionBillingCycleContractEdit(
        billingCycleInput: { contractId: $contractId, selector: { index: $index } }
      ) {
        draft {
          id
          lines(first: 50) {
            edges { node { id quantity productId variantId } }
          }
        }
        userErrors { field message  code }
      }
    }
    `,
    { variables: { contractId, index: cycleIndex } },
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
  const currentQty = draftLines[0]?.quantity ?? 1;
  const draftCheckRes = await admin.graphql(
    `
    query($id: ID!) {
      subscriptionDraft(id: $id) {
        id
        lines(first: 5) {
          edges {
            node {
              id
              quantity
              currentPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
    `,
    {
      variables: {
        id: draftId,
      },
    },
  );

  const draftCheckData = await draftCheckRes.json();


  const effectiveBasePrice = await getEffectiveBasePrice(admin, actions, basePriceAmount);
  const discountTierForCycle = getDiscountTierForCycle(pricingPolicy, cycleIndex);

  const hasCustomDiscountChange = actions.some((a) => a.type === "DISCOUNT_CHANGE");
  const discountActionEntry = actions.find((a) => a.type === "DISCOUNT_CHANGE");

  const orderedActions = sortActionsForApply(actions);

  const skippedActionsLog = [];

 
  try {
    for (const action of orderedActions) {
      // ── QUANTITY_CHANGE ──
      if (action.type === "QUANTITY_CHANGE") {
        const targetLine = resolveLineForAction(draftLines, action);
        if (!targetLine) throw new Error("QUANTITY_CHANGE failed: no line found on draft");
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

      // ── MINIMUM_QUANTITY ── DISABLED (user ne mana kiya use karne se)
      // if (action.type === "MINIMUM_QUANTITY") {
      //   const minQty = Number(action.value);
      //   if (lineId && currentQty < minQty) {
      //     const res = await admin.graphql(
      //       `
      //       mutation enforceMinQty($draftId: ID!, $lineId: ID!, $qty: Int!) {
      //         subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { quantity: $qty }) {
      //           userErrors { field message }
      //         }
      //       }
      //       `,
      //       { variables: { draftId, lineId, qty: minQty } },
      //     );
      //     const data = await res.json();
      //     if (data.errors) throw new Error(`MINIMUM_QUANTITY failed (GraphQL): ${data.errors[0]?.message}`);
      //     const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
      //     if (errors?.length) throw new Error(`MINIMUM_QUANTITY failed: ${errors[0].message}`);
      //   }
      // }

      // ── PRODUCT_SWAP / VARIANT_SWAP ──
      if (action.type === "PRODUCT_SWAP" || action.type === "VARIANT_SWAP") {
        const targetLine = resolveLineForAction(draftLines, action);
        if (!targetLine) throw new Error(`${action.type} failed: no line found on draft`);
        if (!action.variantId) throw new Error(`${action.type} failed: no variantId configured`);

        // Individual line pricing — pricing-policy tier discount lagao (agar
        // custom DISCOUNT_CHANGE nahi hai, warna DISCOUNT_CHANGE action isse
        // baad me overwrite kar dega apne hisaab se).
        let recalculatedPrice = null;
        if (!hasCustomDiscountChange && effectiveBasePrice != null) {
          recalculatedPrice = applyDiscountTierToPrice(effectiveBasePrice, discountTierForCycle).toFixed(2);
        }

        const res = await admin.graphql(
          `
          mutation swapLine($draftId: ID!, $lineId: ID!, $variantId: ID!, $price: Decimal) {
            subscriptionDraftLineUpdate(
              draftId: $draftId
              lineId: $lineId
              input: { productVariantId: $variantId, currentPrice: $price }
            ) {
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, lineId: targetLine.id, variantId: action.variantId, price: recalculatedPrice } },
        );
        const data = await res.json();
        if (data.errors) throw new Error(`${action.type} failed (GraphQL): ${data.errors[0]?.message}`);
        const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
        if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
      }

      // ── DISCOUNT_CHANGE ── (always runs last — see sortActionsForApply)
      if (action.type === "DISCOUNT_CHANGE") {
        if (!lineId) throw new Error("DISCOUNT_CHANGE failed: no line found on draft");
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

      // ── SHIPPING_DISCOUNT ──
      if (action.type === "SHIPPING_DISCOUNT") {
        const configuredValue = Number(action.value);
        const isFullFreeShipping =
          action.discountType === "PERCENTAGE"
            ? configuredValue >= 100
            : false; // fixed-amount shipping discounts aren't supported at all via this mutation

        if (!isFullFreeShipping) {
          console.warn(
            `[applyActionsToCycle] SHIPPING_DISCOUNT skipped: configured value (${action.discountType} ${action.value}) is a partial shipping discount, ` +
              `but Shopify's subscription API (subscriptionDraftFreeShippingDiscountAdd) only supports 100% free shipping. ` +
              `Not applying free shipping to avoid over-discounting. This cycle's shipping was left unchanged.`,
          );
          action.__skippedReason = "Partial shipping discounts are not supported by Shopify's subscription API (100% free shipping only).";
        } else {
          const res = await admin.graphql(
            `
            mutation addShippingDiscount($draftId: ID!, $input: SubscriptionFreeShippingDiscountInput!) {
              subscriptionDraftFreeShippingDiscountAdd(draftId: $draftId, input: $input) {
                userErrors { field message }
              }
            }
            `,
            { variables: { draftId, input: { title: "Auto shipping discount" } } },
          );
          const data = await res.json();
          if (data.errors) throw new Error(`SHIPPING_DISCOUNT failed (GraphQL): ${data.errors[0]?.message}`);
          const errors = data.data?.subscriptionDraftFreeShippingDiscountAdd?.userErrors;
          if (errors?.length) throw new Error(`SHIPPING_DISCOUNT failed: ${errors[0].message}`);
        }
      }

      // ── REMOVE_PRODUCT / REMOVE_VARIANT / REMOVE_FREE_PRODUCT ──
      if (
        action.type === "REMOVE_PRODUCT" ||
        action.type === "REMOVE_VARIANT" ||
        action.type === "REMOVE_FREE_PRODUCT"
      ) {
        const targetLine = resolveLineForAction(draftLines, action);
        if (!targetLine) throw new Error(`${action.type} failed: no line found on draft`);
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
      }

      if (action.type === "ADD_PRODUCT") {
        if (!action.variantId) throw new Error("ADD_PRODUCT failed: no variantId configured");
        let addPrice = action.currentPrice ?? null;

        // if (addPrice == null) {
        //   const variantPrice = await fetchVariantPrice(admin, action.variantId);
        //   const basePriceForNewLine = variantPrice ?? effectiveBasePrice ?? 0;

        //   if (hasCustomDiscountChange && discountActionEntry) {
        //     let discounted = basePriceForNewLine;
        //     if (discountActionEntry.adjustmentType === "PERCENTAGE") {
        //       discounted =
        //         basePriceForNewLine -
        //         (basePriceForNewLine * Number(discountActionEntry.adjustmentValue)) / 100;
        //     } else {
        //       discounted = basePriceForNewLine - Number(discountActionEntry.adjustmentValue);
        //     }
        //     addPrice = Math.max(0, discounted).toFixed(2);
        //   } else {
        //     addPrice = applyDiscountTierToPrice(basePriceForNewLine, discountTierForCycle).toFixed(2);
        //   }
        // }
        if (addPrice == null) {
  const variantPrice = await fetchVariantPrice(admin, action.variantId);
  const basePriceForNewLine = variantPrice ?? effectiveBasePrice ?? 0;

  const isSwapGenerated =
    !!action.destProductId || !!action.sourceProductId;

  if (isSwapGenerated) {
    addPrice = applyDiscountTierToPrice(
      basePriceForNewLine,
      discountTierForCycle,
    ).toFixed(2);
  } else if (action.discountEnabled) {
    let discounted = basePriceForNewLine;

    if (
      String(action.discountType).toLowerCase() === "percentage"
    ) {
      discounted =
        basePriceForNewLine -
        (basePriceForNewLine *
          Number(action.discountValue || 0)) /
          100;
    } else {
      discounted =
        basePriceForNewLine -
        Number(action.discountValue || 0);
    }

    addPrice = Math.max(0, discounted).toFixed(2);
  } else {
    addPrice = basePriceForNewLine.toFixed(2);
  }
}

        const res = await admin.graphql(
          `
          mutation addLine($draftId: ID!, $variantId: ID!, $qty: Int!, $price: Decimal!) {
            subscriptionDraftLineAdd(
              draftId: $draftId
              input: { productVariantId: $variantId, quantity: $qty, currentPrice: $price }
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
      await clearBillingCycleEdit(admin, contractId, cycleIndex);
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
    // Commit itself failed at the transport/GraphQL level — same cleanup story.
    try {
      await clearBillingCycleEdit(admin, contractId, cycleIndex);
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
      await clearBillingCycleEdit(admin, contractId, cycleIndex);
    } catch (cleanupErr) {
      console.error(
        `[applyActionsToCycle] cleanup after commit userErrors also failed for ${contractId}:${cycleIndex}:`,
        cleanupErr,
      );
    }
    throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitErrors[0].message}`);
  }
  return {
    skippedActions: [
      ...actions.filter((a) => a.__skippedReason).map((a) => ({ type: a.type, reason: a.__skippedReason })),
      ...skippedActionsLog,
    ],
  };
}

async function getContractPreview(admin, contractId) {
  const contractRes = await admin.graphql(
    `
    query getContract($id: ID!) {
      subscriptionContract(id: $id) {
        id
        status
        nextBillingDate
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
  let livePlanSettings = null; // renamed from extraSettings — this is the LIVE selling-plan config

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
                    extraSettingsMetafield: metafield(namespace: "subscription_app", key: "extra_settings") {
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    `);

    const groupsData = await groupsRes.json();
 //  DEBUG — isse pata chalega exact mismatch kaha hai
  console.log("Looking for sellingPlanId:", JSON.stringify(sellingPlanId));
  const allPlanIds = groupsData.data.sellingPlanGroups.edges.flatMap(({ node: g }) =>
    g.sellingPlans.edges.map((e) => e.node.id)
  );
  console.log("All plan IDs found in shop:", JSON.stringify(allPlanIds));
  console.log("Total groups found:", groupsData.data.sellingPlanGroups.edges.length);

    for (const { node: group } of groupsData.data.sellingPlanGroups.edges) {
      const plan = group.sellingPlans.edges.find(({ node }) => node.id === sellingPlanId);
      if (!plan) continue;

      groupId = group.id;
      groupName = group.name;

      const raw = plan.node.extraSettingsMetafield?.value;
      if (raw) {
        try {
          livePlanSettings = JSON.parse(raw);
        } catch {
          livePlanSettings = null;
        }
      }
      break;
    }
  }

  // NEW — contract ka apna frozen snapshot check karo. Agar contract create
  // hote waqt snapshot liya gaya tha, to wahi authoritative hai — live plan
  // settings me baad me hua koi bhi change is contract ko touch nahi karega.
  // Snapshot na hone par (purane contracts, is fix se pehle bane) live plan
  // settings pe hi fallback karo — backward compatible behaviour.
  const snapshotSettings = await getContractSettingsSnapshot(admin, contractId);
  const extraSettings = snapshotSettings ?? livePlanSettings;
  const settingsSource = snapshotSettings ? "contract_snapshot" : "selling_plan_live";

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

    if (cycle) {
      cycleIndex = cycle.cycleIndex;
      nextBillingDate = cycle.billingAttemptExpectedDate || nextBillingDate;
      cycleStatus = cycle.status;

      let safetyCounter = 0;
      while (cycleStatus === "BILLED" && safetyCounter < 20) {
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
      }
    }
  }

  const actionsForNextCycle =
    cycleIndex != null ? collectActionsForCycle(extraSettings, cycleIndex) : [];

  let calculatedPricePerUnit =
    cycleIndex != null ? computePriceForCycle(firstLine?.pricingPolicy, cycleIndex) : null;
  const swapAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "VARIANT_SWAP" || a.type === "PRODUCT_SWAP")
    : null;

  let effectiveBase = Number(firstLine?.pricingPolicy?.basePrice?.amount) || 0;

  if (swapAction?.variantId) {
    const newVariantPrice = await fetchVariantPrice(admin, swapAction.variantId);
    if (newVariantPrice != null) {
      effectiveBase = newVariantPrice;
      const tier = getDiscountTierForCycle(firstLine?.pricingPolicy, cycleIndex);
      calculatedPricePerUnit = {
        amount: applyDiscountTierToPrice(effectiveBase, tier).toFixed(2),
        currencyCode:
          firstLine?.pricingPolicy?.basePrice?.currencyCode ??
          firstLine?.currentPrice?.currencyCode,
      };
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

  if (discountAction) {
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
  // FIXED — QUANTITY_CHANGE ab hamesha maujood hoti hai (configured value ya
  // default 1) — checkout/original quantity kabhi fallback nahi banti.
  const calculatedQuantity = quantityAction ? Number(quantityAction.value) : 1;

  const calculatedItemTotal =
    calculatedPricePerUnit && calculatedQuantity != null
      ? {
          amount: (Number(calculatedPricePerUnit.amount) * calculatedQuantity).toFixed(2),
          currencyCode: calculatedPricePerUnit.currencyCode,
        }
      : null;
  const shippingAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "SHIPPING_DISCOUNT")
    : null;
  if (shippingAction) {
    const isFullFreeShipping =
      shippingAction.discountType === "PERCENTAGE" && Number(shippingAction.value) >= 100;
    shippingAction.willActuallyApply = isFullFreeShipping;
    if (!isFullFreeShipping) {
      shippingAction.warning =
        "Shopify's subscription API only supports 100% free shipping — this configured partial discount will NOT be applied automatically.";
    }
  }

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
      pricingPolicyDebug: firstLine?.pricingPolicy ?? null,
    },
    planGroup: { id: groupId, name: groupName },
    nextOrder: {
      cycleIndex,
      expectedDate: nextBillingDate,
      calculatedPricePerUnit,
      calculatedQuantity,
      calculatedItemTotal,
      willApply: (() => {
        const visible = actionsForNextCycle.filter((a) => !a.__default);
        return visible.length > 0 ? visible : "No automatic changes configured for this cycle";
      })(),
    },
    allExtraSettings: extraSettings,
  };

  console.log(` Contract: ${preview.contractId}`);
  console.log(`   Status: ${preview.status}`);
  console.log(
    `   Customer: ${preview.customer?.displayName || preview.customer?.id || "unknown"}`,
  );
  console.log(
    `   Product: ${preview.lineItem.title} (qty ${preview.lineItem.quantity}, ${preview.lineItem.price?.amount} ${preview.lineItem.price?.currencyCode})`,
  );
  console.log(
    `   Plan: ${preview.planGroup.name || "unknown"} (${preview.planGroup.id || "no group matched"})`,
  );
  console.log(`   Settings source: ${preview.settingsSource}`);
  console.log(`   Next order date: ${preview.nextOrder.expectedDate}`);
  console.log(`   Next order cycle #: ${preview.nextOrder.cycleIndex}`);
  console.log(
    `   Next order calculated price/unit: ${preview.nextOrder.calculatedPricePerUnit?.amount} ${preview.nextOrder.calculatedPricePerUnit?.currencyCode}`,
  );
  console.log(`   Next order calculated quantity: ${preview.nextOrder.calculatedQuantity}`);
  console.log(
    `   Next order calculated total: ${preview.nextOrder.calculatedItemTotal?.amount} ${preview.nextOrder.calculatedItemTotal?.currencyCode}`,
  );
  console.log(`Will apply on next order:`, preview.nextOrder.willApply);

  return preview;
}

export {
  getContractPreview,
  collectActionsForCycle,
  applyActionsToCycle,
  computePriceForCycle,
  getDiscountTierForCycle,
  applyDiscountTierToPrice,
  fetchVariantPrice,
  getEffectiveBasePrice,
  metaKeyForGroup,
  EXTRA_SETTINGS_NAMESPACE,
  sortActionsForApply,
  clearBillingCycleEdit,
  findBlockingBillingCycleIndex,
  getContractSettingsSnapshot,
  snapshotContractSettings,
};