import { unauthenticated } from "../shopify.server";
import db from "../db.server";

const CRON_SECRET = process.env.CRON_SECRET;

// GET/other methods aren't supported - only POST from the cron job
export const loader = () => new Response("Method Not Allowed", { status: 405 });

export async function action({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const incomingSecret = request.headers.get("x-cron-secret");

  if (!CRON_SECRET) {
    console.error("CRON_SECRET is not set in environment variables");
    return json({ success: false, error: "Server misconfigured" }, 500);
  }

  if (!incomingSecret || incomingSecret !== CRON_SECRET) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  // Don't await — respond immediately so the cron caller / Cloudflare tunnel
  // doesn't time out (Quick Tunnels cut off around ~100s). The job keeps
  // running in this Node process after the response is sent; check server
  // logs for the outcome.
  processBillingCyclesForAllShops()
    .then((results) => {
      console.log("process-billing-cycles completed:", JSON.stringify(results));
    })
    .catch((err) => {
      console.error("process-billing-cycles failed:", err);
    });

  return json({ success: true, message: "Billing cycle processing started" }, 202);
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// --- Shops -------------------------------------------------------------

async function getInstalledShops() {
  const sessions = await db.session.findMany({
    where: { isOnline: false },
    select: { shop: true },
    distinct: ["shop"],
  });
  return sessions.map((s) => s.shop);
}

async function processBillingCyclesForAllShops() {
  const shops = await getInstalledShops();
  const processedShops = [];
  const errors = [];

  for (const shop of shops) {
    try {
      const { admin } = await unauthenticated.admin(shop);
      const summary = await processShopBillingCycles(admin, shop);
      processedShops.push({ shop, ...summary });
    } catch (err) {
      console.error(`Failed processing shop ${shop}:`, err);
      errors.push({ shop, error: err.message });
    }
  }

  return { processedShops, errors };
}

// --- Per-shop processing: edit due cycles, commit, then charge ---------

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

// --- Active contracts (no pagination, single page of 100) --------------

async function getActiveContracts(admin) {
  const response = await admin.graphql(
    `
    query ActiveContracts {
      subscriptionContracts(first: 100, query: "status:ACTIVE") {
        edges {
          node { id }
        }
      }
    }
    `,
  );

  const data = await response.json();
  const edges = data?.data?.subscriptionContracts?.edges || [];

  return edges.map((e) => e.node);
}

// --- Due (unbilled) cycles for a contract -------------------------------

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

// --- App's extra_settings metafield, stored on the SellingPlan ----------
// (SubscriptionContract itself doesn't implement HasMetafields, so we go
// via the contract's line -> sellingPlanId -> SellingPlan.metafield)

async function getContractExtraSettings(admin, contractId) {
  // Step 1: get the sellingPlanId used by this contract's line item
  const lineRes = await admin.graphql(
    `
    query ContractSellingPlan($id: ID!) {
      subscriptionContract(id: $id) {
        lines(first: 1) {
          edges {
            node { sellingPlanId }
          }
        }
      }
    }
    `,
    { variables: { id: contractId } },
  );

  const lineData = await lineRes.json();
  const sellingPlanId =
    lineData?.data?.subscriptionContract?.lines?.edges?.[0]?.node?.sellingPlanId;

  if (!sellingPlanId) return null;

  // Step 2: fetch the extra_settings metafield off that SellingPlan
  const metafieldRes = await admin.graphql(
    `
    query SellingPlanExtraSettings($id: ID!) {
      node(id: $id) {
        ... on SellingPlan {
          metafield(namespace: "subscription_app", key: "extra_settings") {
            value
          }
        }
      }
    }
    `,
    { variables: { id: sellingPlanId } },
  );

  const metafieldData = await metafieldRes.json();
  const raw = metafieldData?.data?.node?.metafield?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- Decide what edits apply to this specific cycle index ---------------
// ASSUMPTION: "afterOrders" fields mean "from this cycle index onward"
// (cycleIndex >= afterOrders). Change >= to === if you want it to apply
// on exactly that one cycle instead.

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
    // NOTE: verify this exact input shape (SubscriptionDraftFreeShippingDiscountAdd)
    // against the Admin API schema in your API version before relying on it in prod.
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