// --- Replaces the old "count due cycles" logic with actual edit + commit + charge ---

async function processShopBillingCycles(admin, shop) {
  const startDate = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const contracts = await getActiveContracts(admin);

  let dueCyclesFound = 0;
  let ordersCreated = 0;
  const contractErrors = [];

  for (const contract of contracts) {
    try {
      const settings = await getContractExtraSettings(admin, contract.id);
      const dueCycles = await getDueBillingCycles(admin, contract.id, startDate, endDate);

      for (const cycle of dueCycles) {
        // Only process cycles that are actually unbilled and not skipped
        if (cycle.skipped || cycle.status !== "UNBILLED") continue;

        dueCyclesFound++;
        try {
          const attempt = await applyBillingCycleEditsAndCharge(
            admin,
            contract.id,
            cycle.cycleIndex,
            settings,
          );
          if (attempt?.order?.id || attempt?.ready) ordersCreated++;
        } catch (err) {
          contractErrors.push({
            contractId: contract.id,
            cycleIndex: cycle.cycleIndex,
            error: err.message,
          });
        }
      }
    } catch (err) {
      contractErrors.push({ contractId: contract.id, error: err.message });
    }
  }

  return { contractsChecked: contracts.length, dueCyclesFound, ordersCreated, contractErrors };
}

// --- Fetch due (unbilled) cycles for a contract ---

async function getDueBillingCycles(admin, contractId, startDate, endDate) {
  const response = await admin.graphql(
    `
    query DueBillingCycles($contractId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
      subscriptionBillingCycles(
        first: 50
        contractId: $contractId
        billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
      ) {
        edges {
          node {
            cycleIndex
            billingAttemptExpectedDate
            skipped
            status
          }
        }
      }
    }
    `,
    { variables: { contractId, startDate, endDate } },
  );

  const data = await response.json();

  if (data.errors?.length) {
    const msg = data.errors.map((e) => e.message).join("; ");
    if (msg.includes("Billing cycle start date out of range")) return [];
    throw new Error(msg);
  }

  return data?.data?.subscriptionBillingCycles?.edges?.map((e) => e.node) || [];
}

// --- Fetch the app's extra_settings metafield stored on the contract ---

async function getContractExtraSettings(admin, contractId) {
  const response = await admin.graphql(
    `
    query ContractExtraSettings($id: ID!) {
      subscriptionContract(id: $id) {
        metafield(namespace: "subscription_app", key: "extra_settings") {
          value
        }
      }
    }
    `,
    { variables: { id: contractId } },
  );

  const data = await response.json();
  const raw = data?.data?.subscriptionContract?.metafield?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- Decide what edits apply to this specific cycle index ---
// ASSUMPTION: "afterOrders" fields mean "from this cycle index onward" (cycleIndex >= afterOrders).
// If your intended semantics are "exactly on this cycle" (cycleIndex === afterOrders), change >= to ===.

function getEditsForCycle(settings, cycleIndex) {
  const edits = {
    changeQuantity: false,
    quantityValue: null,
    quantityProducts: [],
    removeFreeProduct: false,
    freeProducts: [],
    addShippingDiscount: false,
    shippingDiscountValue: 0,
    shippingDiscountType: "PERCENTAGE",
  };

  if (!settings) return edits;

  if (settings.giveShippingDiscount && cycleIndex >= (settings.shippingAfterOrders ?? 1)) {
    edits.addShippingDiscount = true;
    edits.shippingDiscountValue = settings.shippingDiscountValue ?? 0;
    edits.shippingDiscountType = settings.shippingDiscountType ?? "PERCENTAGE";
  }

  if (settings.changeQuantityAfterOrders && cycleIndex >= (settings.quantityAfterOrders ?? 1)) {
    edits.changeQuantity = true;
    edits.quantityValue = settings.quantityAfterOrdersValue ?? 1;
    edits.quantityProducts = settings.quantityProducts ?? [];
  }

  if (settings.RemoveFreeProdcut && cycleIndex >= (settings.removeFreeProductValue ?? 1)) {
    edits.removeFreeProduct = true;
    edits.freeProducts = settings.freeProducts ?? [];
  }

  return edits;
}

// --- Open draft, apply edits, commit, then charge to create the order ---

async function applyBillingCycleEditsAndCharge(admin, contractId, cycleIndex, settings) {
  const edits = getEditsForCycle(settings, cycleIndex);
  const hasEdits = edits.addShippingDiscount || edits.changeQuantity || edits.removeFreeProduct;

  if (hasEdits) {
    // Step 1: open a draft for this specific billing cycle
    const editRes = await admin.graphql(
      `
      mutation OpenDraft($contractId: ID!, $index: Int!) {
        subscriptionBillingCycleContractEdit(
          billingCycleInput: { contractId: $contractId, selector: { index: $index } }
        ) {
          draft {
            id
            lines(first: 50) {
              edges { node { id variantId quantity } }
            }
          }
          userErrors { field message }
        }
      }
      `,
      { variables: { contractId, index: cycleIndex } },
    );

    const editData = await editRes.json();
    const editErrors = editData?.data?.subscriptionBillingCycleContractEdit?.userErrors || [];
    if (editErrors.length) throw new Error(editErrors.map((e) => e.message).join("; "));

    const draft = editData?.data?.subscriptionBillingCycleContractEdit?.draft;
    if (!draft) throw new Error("No draft returned from subscriptionBillingCycleContractEdit");

    const draftId = draft.id;
    const lines = draft.lines?.edges?.map((e) => e.node) || [];

    // Quantity change on matching line items
    if (edits.changeQuantity) {
      const targetVariantIds = new Set(
        edits.quantityProducts.flatMap((p) => (p.variants || []).map((v) => v.variantsId)),
      );
      for (const line of lines) {
        if (targetVariantIds.size === 0 || targetVariantIds.has(line.variantId)) {
          const res = await admin.graphql(
            `
            mutation UpdateLineQuantity($draftId: ID!, $lineId: ID!, $quantity: Int!) {
              subscriptionDraftLineUpdate(
                draftId: $draftId
                lineId: $lineId
                input: { quantity: $quantity }
              ) {
                userErrors { field message }
              }
            }
            `,
            { variables: { draftId, lineId: line.id, quantity: edits.quantityValue } },
          );
          const errs = (await res.json())?.data?.subscriptionDraftLineUpdate?.userErrors || [];
          if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
        }
      }
    }

    // Remove free product line(s)
    if (edits.removeFreeProduct) {
      const removeVariantIds = new Set(
        edits.freeProducts.flatMap((p) => (p.variants || []).map((v) => v.variantsId)),
      );
      for (const line of lines) {
        if (removeVariantIds.has(line.variantId)) {
          const res = await admin.graphql(
            `
            mutation RemoveLine($draftId: ID!, $lineId: ID!) {
              subscriptionDraftLineRemove(draftId: $draftId, lineId: $lineId) {
                userErrors { field message }
              }
            }
            `,
            { variables: { draftId, lineId: line.id } },
          );
          const errs = (await res.json())?.data?.subscriptionDraftLineRemove?.userErrors || [];
          if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
        }
      }
    }

    // Shipping discount
    // NOTE: verify this exact input shape (SubscriptionDraftFreeShippingDiscountAdd /
    // SubscriptionManualDiscountInput) against the Admin API schema in your API version
    // before relying on it — Shopify's docs page didn't show the full input for this one.
    if (edits.addShippingDiscount) {
      const res = await admin.graphql(
        `
        mutation AddShippingDiscount($draftId: ID!, $value: Float!) {
          subscriptionDraftFreeShippingDiscountAdd(
            draftId: $draftId
            input: { value: { percentage: $value } }
          ) {
            userErrors { field message }
          }
        }
        `,
        { variables: { draftId, value: edits.shippingDiscountValue } },
      );
      const errs =
        (await res.json())?.data?.subscriptionDraftFreeShippingDiscountAdd?.userErrors || [];
      if (errs.length) throw new Error(errs.map((e) => e.message).join("; "));
    }

    // Step 2: commit the draft — this makes edits live on the billing cycle
    const commitRes = await admin.graphql(
      `
      mutation CommitDraft($draftId: ID!) {
        subscriptionBillingCycleContractDraftCommit(draftId: $draftId) {
          contract { id }
          userErrors { field message }
        }
      }
      `,
      { variables: { draftId } },
    );
    const commitData = await commitRes.json();
    const commitErrors =
      commitData?.data?.subscriptionBillingCycleContractDraftCommit?.userErrors || [];
    if (commitErrors.length) throw new Error(commitErrors.map((e) => e.message).join("; "));
  }

  // Step 3: charge the billing cycle to actually create the order
  const chargeRes = await admin.graphql(
    `
    mutation ChargeCycle($contractId: ID!, $index: Int!) {
      subscriptionBillingCycleCharge(
        subscriptionContractId: $contractId
        billingCycleSelector: { index: $index }
      ) {
        subscriptionBillingAttempt {
          id
          ready
          errorMessage
          order { id }
        }
        userErrors { field message }
      }
    }
    `,
    { variables: { contractId, index: cycleIndex } },
  );
  const chargeData = await chargeRes.json();
  const chargeErrors = chargeData?.data?.subscriptionBillingCycleCharge?.userErrors || [];
  if (chargeErrors.length) throw new Error(chargeErrors.map((e) => e.message).join("; "));

  return chargeData?.data?.subscriptionBillingCycleCharge?.subscriptionBillingAttempt;
}