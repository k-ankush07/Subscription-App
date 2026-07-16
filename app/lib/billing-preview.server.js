// const EXTRA_SETTINGS_NAMESPACE = "subscription_app";

// function metaKeyForGroup(groupId) {
//   const numericId = groupId.split("/").pop();
//   return `extra_settings_${numericId}`;
// }

// function collectActionsForCycle(settings, cycleIndex) {
//   const actions = [];
//   if (!settings) return actions;

//   cycleIndex = Number(cycleIndex);

//   // N orders ke baad discount change
//     if (
//       settings.changeDiscountAfterOrders &&
//       cycleIndex >= Number(settings.afterOrders)
//     ) {
//       actions.push({
//         type: "DISCOUNT_CHANGE",
//         adjustmentType: settings.afterDiscountType ?? "PERCENTAGE",
//         adjustmentValue: Number(settings.afterDiscountValue) || 0,
//         after: settings.afterOrders,
//       });
//     }

 
//   if (
//     settings.giveShippingDiscount &&
//     cycleIndex >= Number(settings.shippingAfterOrders)
//   ) {
//     actions.push({
//       type: "SHIPPING_DISCOUNT",
//       discountType: settings.shippingDiscountType,
//       value: settings.shippingDiscountValue,
//       after: settings.shippingAfterOrders,
//     });
//   }

//   // 2. Quantity Change — "change quantity to X after N orders"
//   if (
//     settings.changeQuantityAfterOrders &&
//     cycleIndex >= Number(settings.quantityAfterOrders)
//   ) {
//     actions.push({
//       type: "QUANTITY_CHANGE",
//       value: settings.quantityAfterOrdersValue,
//       products: settings.quantityProducts ?? [],
//       after: settings.quantityAfterOrders,
//     });
//   }

//   // 3. Product Swap — "swap to variant X after N orders"
//   if (
//     settings.productSwapEnabled &&
//     cycleIndex >= Number(settings.productSwapAfterOrders)
//   ) {
//     actions.push({
//       type: "VARIANT_SWAP",
//       variantId: settings.productSwapVariantId,
//       after: settings.productSwapAfterOrders,
//     });
//   }

//   // 4. Remove Free Product — "after N orders"
//   if (
//     settings.RemoveFreeProdcut &&
//     cycleIndex >= Number(settings.removeFreeProductValue)
//   ) {
//     actions.push({
//       type: "REMOVE_FREE_PRODUCT",
//       products: settings.freeProducts ?? [],
//       after: settings.removeFreeProductValue,
//     });
//   }

//   // 5. Custom automation list — merchant ke defined arbitrary cycles
//   if (settings.Automation && Array.isArray(settings.automationCycles)) {
//     for (const auto of settings.automationCycles) {
//       if (cycleIndex >= Number(auto.orders)) {
//         for (const action of auto.actions ?? []) {
//           actions.push({ ...action, after: auto.orders });
//         }
//       }
//     }
//   }

//   // 6. Minimum quantity floor (always active if enabled)
//   if (settings.MinimumQuanitity) {
//     actions.push({
//       type: "MINIMUM_QUANTITY",
//       value: settings.MinimumQuanitityValue,
//     });
//   }

//   return actions;
// }

// function computePriceForCycle(pricingPolicy, cycleIndex) {
//   if (!pricingPolicy?.cycleDiscounts?.length) {
//     return pricingPolicy?.basePrice ?? null;
//   }

//   cycleIndex = Number(cycleIndex);
//   const applicableTiers = pricingPolicy.cycleDiscounts
//     .map((tier) => ({
//       ...tier,
//       afterCycle: Number(tier.afterCycle),
//     }))
//     .filter((tier) => cycleIndex >= tier.afterCycle)
//     .sort((a, b) => a.afterCycle - b.afterCycle);

//   const bestTier = applicableTiers[applicableTiers.length - 1] ?? null;
//   return bestTier ? bestTier.computedPrice : pricingPolicy.basePrice;
// }

// async function applyActionsToCycle(admin, contractId, cycleIndex, actions) {
//   // 1. Open the draft for this specific billing cycle.
//   const editRes = await admin.graphql(
//     `
//     mutation openCycleDraft($contractId: ID!, $index: Int!) {
//       subscriptionBillingCycleContractEdit(
//         billingCycleInput: { contractId: $contractId, selector: { index: $index } }
//       ) {
//         draft {
//           id
//           lines(first: 50) {
//             edges { node { id quantity } }
//           }
//         }
//         userErrors { field message }
//       }
//     }
//     `,
//     { variables: { contractId, index: cycleIndex } },
//   );

//   const editData = await editRes.json();
//   const payload = editData.data?.subscriptionBillingCycleContractEdit;
//   if (payload?.userErrors?.length) {
//     throw new Error(`subscriptionBillingCycleContractEdit failed: ${payload.userErrors[0].message}`);
//   }
//   if (!payload?.draft) {
//     throw new Error("subscriptionBillingCycleContractEdit returned no draft");
//   }

//   const draftId = payload.draft.id;
//   const lineId = payload.draft.lines.edges[0]?.node?.id;
//   const currentQty = payload.draft.lines.edges[0]?.node?.quantity ?? 1;

// // 👇 YE DEBUG QUERY YAHAN ADD KARO
// const draftCheckRes = await admin.graphql(
//   `
//   query($id: ID!) {
//     subscriptionDraft(id: $id) {
//       id
//       lines(first: 5) {
//         edges {
//           node {
//             id
//             quantity
//             currentPrice {
//               amount
//               currencyCode
//             }
//           }
//         }
//       }
//     }
//   }
//   `,
//   {
//     variables: {
//       id: draftId,
//     },
//   },
// );

// const draftCheckData = await draftCheckRes.json();

// console.log(
//   "Draft Before Update:",
//   JSON.stringify(draftCheckData, null, 2)
// );
//   for (const action of actions) {
//     // ── QUANTITY_CHANGE ──
//     if (action.type === "QUANTITY_CHANGE") {
//       if (!lineId) throw new Error("QUANTITY_CHANGE failed: no line found on draft");
//       const res = await admin.graphql(
//         `
//         mutation updateLineQty($draftId: ID!, $lineId: ID!, $qty: Int!) {
//           subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { quantity: $qty }) {
//             userErrors { field message }
//           }
//         }
//         `,
//         { variables: { draftId, lineId, qty: Number(action.value) } },
//       );
//       const data = await res.json();
//       const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
//       if (errors?.length) throw new Error(`QUANTITY_CHANGE failed: ${errors[0].message}`);
//     }

//     // ── MINIMUM_QUANTITY (floor, only bump up if below) ──
//     if (action.type === "MINIMUM_QUANTITY") {
//       const minQty = Number(action.value);
//       if (lineId && currentQty < minQty) {
//         const res = await admin.graphql(
//           `
//           mutation enforceMinQty($draftId: ID!, $lineId: ID!, $qty: Int!) {
//             subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { quantity: $qty }) {
//               userErrors { field message }
//             }
//           }
//           `,
//           { variables: { draftId, lineId, qty: minQty } },
//         );
//         const data = await res.json();
//         const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
//         if (errors?.length) throw new Error(`MINIMUM_QUANTITY failed: ${errors[0].message}`);
//       }
//     }
//     // ── DISCOUNT_CHANGE ──
//     if (action.type === "DISCOUNT_CHANGE") {
//       if (!lineId) throw new Error("DISCOUNT_CHANGE failed: no line found on draft");

//       const currentLine = draftCheckData?.data?.subscriptionDraft?.lines?.edges[0]?.node;
//       const basePrice = parseFloat(currentLine?.currentPrice?.amount ?? 0);

//       let newPrice = basePrice;
//       if (action.adjustmentType === "PERCENTAGE") {
//         newPrice = basePrice - (basePrice * Number(action.adjustmentValue)) / 100;
//       } else {
//         newPrice = basePrice - Number(action.adjustmentValue);
//       }
//       newPrice = Math.max(0, newPrice).toFixed(2);

//       const res = await admin.graphql(
//         `
//         mutation updateLinePrice($draftId: ID!, $lineId: ID!, $price: Decimal!) {
//           subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { currentPrice: $price }) {
//             userErrors { field message }
//           }
//         }
//         `,
//         { variables: { draftId, lineId, price: newPrice } },
//       );
//       const data = await res.json();
//       const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
//       if (errors?.length) throw new Error(`DISCOUNT_CHANGE failed: ${errors[0].message}`);
//     }

//     // ── PRODUCT_SWAP / VARIANT_SWAP ──
//     if (action.type === "PRODUCT_SWAP" || action.type === "VARIANT_SWAP") {
//       if (!lineId) throw new Error(`${action.type} failed: no line found on draft`);
//       if (!action.variantId) throw new Error(`${action.type} failed: no variantId configured`);
//       const res = await admin.graphql(
//         `
//         mutation swapLine($draftId: ID!, $lineId: ID!, $variantId: ID!) {
//           subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { productVariantId: $variantId }) {
//             userErrors { field message }
//           }
//         }
//         `,
//         { variables: { draftId, lineId, variantId: action.variantId } },
//       );
//       const data = await res.json();
//       const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
//       if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
//     }

//     // ── SHIPPING_DISCOUNT ──
//     if (action.type === "SHIPPING_DISCOUNT") {
//       const res = await admin.graphql(
//         `
//         mutation addShippingDiscount($draftId: ID!) {
//           subscriptionDraftFreeShippingDiscountAdd(
//             draftId: $draftId
//             input: { title: "Auto shipping discount" }
//           ) {
//             userErrors { field message }
//           }
//         }
//         `,
//         { variables: { draftId } },
//       );
//       const data = await res.json();
//       const errors = data.data?.subscriptionDraftFreeShippingDiscountAdd?.userErrors;
//       if (errors?.length) throw new Error(`SHIPPING_DISCOUNT failed: ${errors[0].message}`);
//     }

//     // ── REMOVE_PRODUCT / REMOVE_VARIANT / REMOVE_FREE_PRODUCT ──
//     if (
//       action.type === "REMOVE_PRODUCT" ||
//       action.type === "REMOVE_VARIANT" ||
//       action.type === "REMOVE_FREE_PRODUCT"
//     ) {
//       if (!lineId) throw new Error(`${action.type} failed: no line found on draft`);
//       const res = await admin.graphql(
//         `
//         mutation removeLine($draftId: ID!, $lineId: ID!) {
//           subscriptionDraftLineRemove(draftId: $draftId, lineId: $lineId) {
//             userErrors { field message }
//           }
//         }
//         `,
//         { variables: { draftId, lineId } },
//       );
//       const data = await res.json();
//       const errors = data.data?.subscriptionDraftLineRemove?.userErrors;
//       if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
//     }

//     // ── ADD_PRODUCT ──
//     if (action.type === "ADD_PRODUCT") {
//       if (!action.variantId) throw new Error("ADD_PRODUCT failed: no variantId configured");
//       const res = await admin.graphql(
//         `
//         mutation addLine($draftId: ID!, $variantId: ID!, $qty: Int!) {
//           subscriptionDraftLineAdd(draftId: $draftId, input: { productVariantId: $variantId, quantity: $qty }) {
//             userErrors { field message }
//           }
//         }
//         `,
//         { variables: { draftId, variantId: action.variantId, qty: Number(action.quantity) || 1 } },
//       );
//       const data = await res.json();
//       const errors = data.data?.subscriptionDraftLineAdd?.userErrors;
//       if (errors?.length) throw new Error(`ADD_PRODUCT failed: ${errors[0].message}`);
//     }
//   }

//   // const commitRes = await admin.graphql(
//   //   `
//   //   mutation commitCycleDraft($draftId: ID!) {
//   //     subscriptionBillingCycleContractDraftCommit(draftId: $draftId) {
//   //       contract {
//   //         id
//   //       }
//   //       userErrors { field message }
//   //     }
//   //   }
//   //   `,
//   //   { variables: { draftId } },
//   // );
// const commitRes = await admin.graphql(
//     `
//     mutation commitCycleDraft($draftId: ID!) {
//       subscriptionBillingCycleContractDraftCommit(draftId: $draftId) {
//         userErrors { field message }
//       }
//     }
//     `,
//     { variables: { draftId } },
//   );
//   const commitData = await commitRes.json();
//   if (commitData.errors) {
//     throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitData.errors[0]?.message}`);
//   }
//   const commitErrors = commitData.data?.subscriptionBillingCycleContractDraftCommit?.userErrors;
//   if (commitErrors?.length) {
//     throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitErrors[0].message}`);
//   }
// }

// async function getContractPreview(admin, contractId) {
//   const contractRes = await admin.graphql(
//     `
//     query getContract($id: ID!) {
//       subscriptionContract(id: $id) {
//         id
//         status
//         nextBillingDate
//         customer {
//          id 
//          displayName
//          defaultEmailAddress{
//           emailAddress
//           }
//           }
//         lines(first: 5) {
//           edges {
//             node {
//               id
//               title
//               quantity
//               sellingPlanId
//               currentPrice { amount currencyCode }
//               pricingPolicy {
//                 basePrice { amount currencyCode }
//                 cycleDiscounts {
//                   afterCycle
//                   adjustmentType
//                   adjustmentValue {
//                     ... on SellingPlanPricingPolicyPercentageValue { percentage }
//                     ... on MoneyV2 { amount currencyCode }
//                   }
//                   computedPrice { amount currencyCode }
//                 }
//               }
//             }
//           }
//         }
//       }
//     }
//     `,
//     { variables: { id: contractId } },
//   );
//   const contractData = await contractRes.json();
//   const contract = contractData.data?.subscriptionContract;

//   if (!contract) {
//     console.log(`[preview] Contract not found: ${contractId}`);
//     return null;
//   }

//   const firstLine = contract.lines.edges[0]?.node;
//   const sellingPlanId = firstLine?.sellingPlanId;

//   let groupId = null;
//   let groupName = null;
//   let extraSettings = null;

//   if (sellingPlanId) {
//     const groupsRes = await admin.graphql(`
//       query {
//         sellingPlanGroups(first: 50) {
//           edges {
//             node {
//               id
//               name
//               sellingPlans(first: 20) {
//                 edges {
//                   node {
//                     id
//                     extraSettingsMetafield: metafield(namespace: "subscription_app", key: "extra_settings") {
//                       value
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       }
//     `);

//     const groupsData = await groupsRes.json();

//     for (const { node: group } of groupsData.data.sellingPlanGroups.edges) {
//       const plan = group.sellingPlans.edges.find(({ node }) => node.id === sellingPlanId);
//       if (!plan) continue;

//       groupId = group.id;
//       groupName = group.name;

//       const raw = plan.node.extraSettingsMetafield?.value;
//       if (raw) {
//         try {
//           extraSettings = JSON.parse(raw);
//         } catch {
//           extraSettings = null;
//         }
//       }
//       break;
//     }
//   }

//   let cycleIndex = null;
//   let nextBillingDate = contract.nextBillingDate;
//   let cycleStatus = null;

//   if (contract.nextBillingDate) {
//     const cycleRes = await admin.graphql(
//       `
//       query getCycleByDate($contractId: ID!, $date: DateTime!) {
//         subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { date: $date } }) {
//           cycleIndex
//           billingAttemptExpectedDate
//           status
//           skipped
//         }
//       }
//       `,
//       { variables: { contractId, date: contract.nextBillingDate } },
//     );

//     let cycleData = await cycleRes.json();
//     let cycle = cycleData.data?.subscriptionBillingCycle;

//     if (cycle) {
//       cycleIndex = cycle.cycleIndex;
//       nextBillingDate = cycle.billingAttemptExpectedDate || nextBillingDate;
//       cycleStatus = cycle.status;

//       let safetyCounter = 0;
//       while (cycleStatus === "BILLED" && safetyCounter < 20) {
//         cycleIndex += 1;
//         safetyCounter += 1;

//         const nextCycleRes = await admin.graphql(
//           `
//           query getCycleByIndex($contractId: ID!, $index: Int!) {
//             subscriptionBillingCycle(billingCycleInput: { contractId: $contractId, selector: { index: $index } }) {
//               cycleIndex
//               billingAttemptExpectedDate
//               status
//               skipped
//             }
//           }
//           `,
//           { variables: { contractId, index: cycleIndex } },
//         );

//         const nextCycleData = await nextCycleRes.json();
//         const nextCycle = nextCycleData.data?.subscriptionBillingCycle;
//         if (!nextCycle) break;

//         cycleIndex = nextCycle.cycleIndex;
//         nextBillingDate = nextCycle.billingAttemptExpectedDate || nextBillingDate;
//         cycleStatus = nextCycle.status;
//       }
//     }
//   }

//   const actionsForNextCycle =
//     cycleIndex != null ? collectActionsForCycle(extraSettings, cycleIndex) : [];

//   const calculatedPricePerUnit =
//     cycleIndex != null ? computePriceForCycle(firstLine?.pricingPolicy, cycleIndex) : null;

//   const quantityAction = Array.isArray(actionsForNextCycle)
//     ? actionsForNextCycle.find((a) => a.type === "QUANTITY_CHANGE")
//     : null;
//   const calculatedQuantity = quantityAction ? Number(quantityAction.value) : firstLine?.quantity;

//   const calculatedItemTotal =
//     calculatedPricePerUnit && calculatedQuantity != null
//       ? {
//           amount: (Number(calculatedPricePerUnit.amount) * calculatedQuantity).toFixed(2),
//           currencyCode: calculatedPricePerUnit.currencyCode,
//         }
//       : null;

//   const preview = {
//     contractId: contract.id,
//     status: contract.status,
//     customer: contract.customer,
//     lineItem: {
//       id: firstLine?.id,
//       title: firstLine?.title,
//       quantity: firstLine?.quantity,
//       price: firstLine?.currentPrice,
//       pricingPolicyDebug: firstLine?.pricingPolicy ?? null,
//     },
//     planGroup: { id: groupId, name: groupName },
//     nextOrder: {
//       cycleIndex,
//       expectedDate: nextBillingDate,
//       calculatedPricePerUnit,
//       calculatedQuantity,
//       calculatedItemTotal,
//       willApply:
//         actionsForNextCycle.length > 0
//           ? actionsForNextCycle
//           : "No automatic changes configured for this cycle",
//     },
//     allExtraSettings: extraSettings,
//   };

//   console.log("─────────────────────────────────────────────");
//   console.log(`📦 Contract: ${preview.contractId}`);
//   console.log(`   Status: ${preview.status}`);
//   console.log(
//     `   Customer: ${preview.customer?.displayName || preview.customer?.id || "unknown"}`,
//   );
//   console.log(
//     `   Product: ${preview.lineItem.title} (qty ${preview.lineItem.quantity}, ${preview.lineItem.price?.amount} ${preview.lineItem.price?.currencyCode})`,
//   );
//   console.log(
//     `   Plan: ${preview.planGroup.name || "unknown"} (${preview.planGroup.id || "no group matched"})`,
//   );
//   console.log(`   Next order date: ${preview.nextOrder.expectedDate}`);
//   console.log(`   Next order cycle #: ${preview.nextOrder.cycleIndex}`);
//   console.log(
//     `   Next order calculated price/unit: ${preview.nextOrder.calculatedPricePerUnit?.amount} ${preview.nextOrder.calculatedPricePerUnit?.currencyCode}`,
//   );
//   console.log(`   Next order calculated quantity: ${preview.nextOrder.calculatedQuantity}`);
//   console.log(
//     `   Next order calculated total: ${preview.nextOrder.calculatedItemTotal?.amount} ${preview.nextOrder.calculatedItemTotal?.currencyCode}`,
//   );
//   console.log(`   Will apply on next order:`, preview.nextOrder.willApply);
//   console.log("─────────────────────────────────────────────");

//   return preview;
// }

// export {
//   getContractPreview,
//   collectActionsForCycle,
//   applyActionsToCycle,
//   computePriceForCycle,
//   metaKeyForGroup,
//   EXTRA_SETTINGS_NAMESPACE,
// };


const EXTRA_SETTINGS_NAMESPACE = "subscription_app";

function metaKeyForGroup(groupId) {
  const numericId = groupId.split("/").pop();
  return `extra_settings_${numericId}`;
}

function collectActionsForCycle(settings, cycleIndex) {
  const actions = [];
  if (!settings) return actions;

  cycleIndex = Number(cycleIndex);

  // 1. Subscription discount — "N orders ke baad discount change karo"
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
          actions.push({ ...action, after: auto.orders });
        }
      }
    }
  }

  // 7. Minimum quantity floor (always active if enabled)
  if (settings.MinimumQuanitity) {
    actions.push({
      type: "MINIMUM_QUANTITY",
      value: settings.MinimumQuanitityValue,
    });
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

/**
 * Applies collected automation actions (quantity change, discount change,
 * shipping discount, product swap, remove/add product, minimum quantity)
 * to a specific billing cycle draft, then commits the draft.
 *
 * @param {object} admin - authenticated admin GraphQL client
 * @param {string} contractId - gid of the SubscriptionContract
 * @param {number} cycleIndex - the billing cycle index to edit
 * @param {Array}  actions - actions collected via collectActionsForCycle
 * @param {number|string|null} basePriceAmount - the ORIGINAL undiscounted
 *   base price for this line (from pricingPolicy.basePrice.amount). Passing
 *   this in prevents DISCOUNT_CHANGE from compounding on top of an already
 *   discounted currentPrice if this function ever runs more than once for
 *   the same cycle (e.g. webhook + cron both firing). If not provided,
 *   falls back to the draft's live currentPrice (old, less-safe behavior).
 */
async function applyActionsToCycle(admin, contractId, cycleIndex, actions, basePriceAmount = null) {
  // 1. Open the draft for this specific billing cycle.
  const editRes = await admin.graphql(
    `
    mutation openCycleDraft($contractId: ID!, $index: Int!) {
      subscriptionBillingCycleContractEdit(
        billingCycleInput: { contractId: $contractId, selector: { index: $index } }
      ) {
        draft {
          id
          lines(first: 50) {
            edges { node { id quantity } }
          }
        }
        userErrors { field message }
      }
    }
    `,
    { variables: { contractId, index: cycleIndex } },
  );

  const editData = await editRes.json();
  const payload = editData.data?.subscriptionBillingCycleContractEdit;
  if (payload?.userErrors?.length) {
    throw new Error(`subscriptionBillingCycleContractEdit failed: ${payload.userErrors[0].message}`);
  }
  if (!payload?.draft) {
    throw new Error("subscriptionBillingCycleContractEdit returned no draft");
  }

  const draftId = payload.draft.id;
  const lineId = payload.draft.lines.edges[0]?.node?.id;
  const currentQty = payload.draft.lines.edges[0]?.node?.quantity ?? 1;

  // Fetch the draft's live current price — used as a fallback base price
  // for DISCOUNT_CHANGE if no stable basePriceAmount was supplied.
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

  console.log(
    "Draft Before Update:",
    JSON.stringify(draftCheckData, null, 2)
  );

  for (const action of actions) {
    // ── QUANTITY_CHANGE ──
    if (action.type === "QUANTITY_CHANGE") {
      if (!lineId) throw new Error("QUANTITY_CHANGE failed: no line found on draft");
      const res = await admin.graphql(
        `
        mutation updateLineQty($draftId: ID!, $lineId: ID!, $qty: Int!) {
          subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { quantity: $qty }) {
            userErrors { field message }
          }
        }
        `,
        { variables: { draftId, lineId, qty: Number(action.value) } },
      );
      const data = await res.json();
      const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
      if (errors?.length) throw new Error(`QUANTITY_CHANGE failed: ${errors[0].message}`);
    }

    // ── MINIMUM_QUANTITY (floor, only bump up if below) ──
    if (action.type === "MINIMUM_QUANTITY") {
      const minQty = Number(action.value);
      if (lineId && currentQty < minQty) {
        const res = await admin.graphql(
          `
          mutation enforceMinQty($draftId: ID!, $lineId: ID!, $qty: Int!) {
            subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { quantity: $qty }) {
              userErrors { field message }
            }
          }
          `,
          { variables: { draftId, lineId, qty: minQty } },
        );
        const data = await res.json();
        const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
        if (errors?.length) throw new Error(`MINIMUM_QUANTITY failed: ${errors[0].message}`);
      }
    }

    // ── DISCOUNT_CHANGE ──
    if (action.type === "DISCOUNT_CHANGE") {
      if (!lineId) throw new Error("DISCOUNT_CHANGE failed: no line found on draft");

      const currentLine = draftCheckData?.data?.subscriptionDraft?.lines?.edges[0]?.node;

      // Prefer the stable, original base price passed in by the caller.
      // Only fall back to the draft's live currentPrice if no stable base
      // price was provided — this avoids compounding the discount if this
      // function ever runs twice for the same cycle.
      const basePrice =
        basePriceAmount != null && Number(basePriceAmount) > 0
          ? Number(basePriceAmount)
          : parseFloat(currentLine?.currentPrice?.amount ?? 0);

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
      const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
      if (errors?.length) throw new Error(`DISCOUNT_CHANGE failed: ${errors[0].message}`);
    }

    // ── PRODUCT_SWAP / VARIANT_SWAP ──
    if (action.type === "PRODUCT_SWAP" || action.type === "VARIANT_SWAP") {
      if (!lineId) throw new Error(`${action.type} failed: no line found on draft`);
      if (!action.variantId) throw new Error(`${action.type} failed: no variantId configured`);
      const res = await admin.graphql(
        `
        mutation swapLine($draftId: ID!, $lineId: ID!, $variantId: ID!) {
          subscriptionDraftLineUpdate(draftId: $draftId, lineId: $lineId, input: { productVariantId: $variantId }) {
            userErrors { field message }
          }
        }
        `,
        { variables: { draftId, lineId, variantId: action.variantId } },
      );
      const data = await res.json();
      const errors = data.data?.subscriptionDraftLineUpdate?.userErrors;
      if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
    }

    // ── SHIPPING_DISCOUNT ──
    if (action.type === "SHIPPING_DISCOUNT") {
      const res = await admin.graphql(
        `
        mutation addShippingDiscount($draftId: ID!) {
          subscriptionDraftFreeShippingDiscountAdd(
            draftId: $draftId
            input: { title: "Auto shipping discount" }
          ) {
            userErrors { field message }
          }
        }
        `,
        { variables: { draftId } },
      );
      const data = await res.json();
      const errors = data.data?.subscriptionDraftFreeShippingDiscountAdd?.userErrors;
      if (errors?.length) throw new Error(`SHIPPING_DISCOUNT failed: ${errors[0].message}`);
    }

    // ── REMOVE_PRODUCT / REMOVE_VARIANT / REMOVE_FREE_PRODUCT ──
    if (
      action.type === "REMOVE_PRODUCT" ||
      action.type === "REMOVE_VARIANT" ||
      action.type === "REMOVE_FREE_PRODUCT"
    ) {
      if (!lineId) throw new Error(`${action.type} failed: no line found on draft`);
      const res = await admin.graphql(
        `
        mutation removeLine($draftId: ID!, $lineId: ID!) {
          subscriptionDraftLineRemove(draftId: $draftId, lineId: $lineId) {
            userErrors { field message }
          }
        }
        `,
        { variables: { draftId, lineId } },
      );
      const data = await res.json();
      const errors = data.data?.subscriptionDraftLineRemove?.userErrors;
      if (errors?.length) throw new Error(`${action.type} failed: ${errors[0].message}`);
    }

    // ── ADD_PRODUCT ──
    if (action.type === "ADD_PRODUCT") {
      if (!action.variantId) throw new Error("ADD_PRODUCT failed: no variantId configured");
      const res = await admin.graphql(
        `
        mutation addLine($draftId: ID!, $variantId: ID!, $qty: Int!) {
          subscriptionDraftLineAdd(draftId: $draftId, input: { productVariantId: $variantId, quantity: $qty }) {
            userErrors { field message }
          }
        }
        `,
        { variables: { draftId, variantId: action.variantId, qty: Number(action.quantity) || 1 } },
      );
      const data = await res.json();
      const errors = data.data?.subscriptionDraftLineAdd?.userErrors;
      if (errors?.length) throw new Error(`ADD_PRODUCT failed: ${errors[0].message}`);
    }
  }

  // Commit the draft. Note: subscriptionBillingCycleContractDraftCommit's
  // `contract` field returns type SubscriptionBillingCycleEditedContract,
  // which does NOT have an `id` field — do not request it here.
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
    throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitData.errors[0]?.message}`);
  }
  const commitErrors = commitData.data?.subscriptionBillingCycleContractDraftCommit?.userErrors;
  if (commitErrors?.length) {
    throw new Error(`subscriptionBillingCycleContractDraftCommit failed: ${commitErrors[0].message}`);
  }
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
  let extraSettings = null;

  if (sellingPlanId) {
    const groupsRes = await admin.graphql(`
      query {
        sellingPlanGroups(first: 50) {
          edges {
            node {
              id
              name
              sellingPlans(first: 20) {
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

    for (const { node: group } of groupsData.data.sellingPlanGroups.edges) {
      const plan = group.sellingPlans.edges.find(({ node }) => node.id === sellingPlanId);
      if (!plan) continue;

      groupId = group.id;
      groupName = group.name;

      const raw = plan.node.extraSettingsMetafield?.value;
      if (raw) {
        try {
          extraSettings = JSON.parse(raw);
        } catch {
          extraSettings = null;
        }
      }
      break;
    }
  }

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

  // If a DISCOUNT_CHANGE action applies for the upcoming cycle, layer it on
  // top of the original base price so the preview matches what
  // applyActionsToCycle will actually charge. We deliberately use the
  // ORIGINAL basePrice (not the native-cycleDiscount-adjusted price) as the
  // starting point, matching applyActionsToCycle's own calculation.
  const discountAction = Array.isArray(actionsForNextCycle)
    ? actionsForNextCycle.find((a) => a.type === "DISCOUNT_CHANGE")
    : null;

  if (discountAction) {
    const rawBase = Number(firstLine?.pricingPolicy?.basePrice?.amount);
    const base = Number.isFinite(rawBase) && rawBase > 0
      ? rawBase
      : Number(calculatedPricePerUnit?.amount ?? 0);

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
  const calculatedQuantity = quantityAction ? Number(quantityAction.value) : firstLine?.quantity;

  const calculatedItemTotal =
    calculatedPricePerUnit && calculatedQuantity != null
      ? {
          amount: (Number(calculatedPricePerUnit.amount) * calculatedQuantity).toFixed(2),
          currencyCode: calculatedPricePerUnit.currencyCode,
        }
      : null;

  const preview = {
    contractId: contract.id,
    status: contract.status,
    customer: contract.customer,
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
      willApply:
        actionsForNextCycle.length > 0
          ? actionsForNextCycle
          : "No automatic changes configured for this cycle",
    },
    allExtraSettings: extraSettings,
  };

  console.log("─────────────────────────────────────────────");
  console.log(`📦 Contract: ${preview.contractId}`);
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
  console.log(`   Next order date: ${preview.nextOrder.expectedDate}`);
  console.log(`   Next order cycle #: ${preview.nextOrder.cycleIndex}`);
  console.log(
    `   Next order calculated price/unit: ${preview.nextOrder.calculatedPricePerUnit?.amount} ${preview.nextOrder.calculatedPricePerUnit?.currencyCode}`,
  );
  console.log(`   Next order calculated quantity: ${preview.nextOrder.calculatedQuantity}`);
  console.log(
    `   Next order calculated total: ${preview.nextOrder.calculatedItemTotal?.amount} ${preview.nextOrder.calculatedItemTotal?.currencyCode}`,
  );
  console.log(`   Will apply on next order:`, preview.nextOrder.willApply);
  console.log("─────────────────────────────────────────────");

  return preview;
}

export {
  getContractPreview,
  collectActionsForCycle,
  applyActionsToCycle,
  computePriceForCycle,
  metaKeyForGroup,
  EXTRA_SETTINGS_NAMESPACE,
};