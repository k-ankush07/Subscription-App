const EXTRA_SETTINGS_NAMESPACE = "subscription_app";
function metaKeyForGroup(groupId) {
  const numericId = groupId.split("/").pop();
  return `extra_settings_${numericId}`;
}

function collectActionsForCycle(settings, cycleIndex) {
  const actions = [];
  if (!settings) return actions;

  if (settings.shippingDiscount?.enabled && settings.shippingDiscount.after === cycleIndex) {
    actions.push({ ...settings.shippingDiscount, type: "SHIPPING_DISCOUNT" });
  }
  if (settings.quantityChange?.enabled && settings.quantityChange.after === cycleIndex) {
    actions.push({ ...settings.quantityChange, type: "QUANTITY_CHANGE" });
  }
  for (const auto of settings.automaticActions || []) {
    if (auto.afterCycle === cycleIndex) {
      actions.push({ ...auto, type: auto.type });
    }
  }
  return actions;
}

async function getContractPreview(admin, contractId) {
  const contractRes = await admin.graphql(`
    query getContract($id: ID!) {
      subscriptionContract(id: $id) {
        id
        status
        nextBillingDate
        customer { id displayName }
        lines(first: 5) {
          edges { node { id title quantity sellingPlanId currentPrice { amount currencyCode } } }
        }
      }
    }
  `, { variables: { id: contractId } });
  const contractData = await contractRes.json();
  const contract = contractData.data?.subscriptionContract;

  if (!contract) {
    console.log(`[preview] Contract not found: ${contractId}`);
    return null;
  }

  const sellingPlanId = contract.lines.edges[0]?.node?.sellingPlanId;

  let groupId = null;
  let groupName = null;
  if (sellingPlanId) {
    const groupsRes = await admin.graphql(`
      query {
        sellingPlanGroups(first: 50) {
          edges { node { id name sellingPlans(first: 20) { edges { node { id } } } } }
        }
      }
    `);
    const groupsData = await groupsRes.json();
    const groups = groupsData.data.sellingPlanGroups.edges.map((e) => e.node);
    for (const group of groups) {
      if (group.sellingPlans.edges.some(({ node }) => node.id === sellingPlanId)) {
        groupId = group.id;
        groupName = group.name;
        break;
      }
    }
  }

  let extraSettings = null;
  if (groupId) {
    const metaRes = await admin.graphql(`
      query {
        shop {
          metafield(namespace: "${EXTRA_SETTINGS_NAMESPACE}", key: "${metaKeyForGroup(groupId)}") {
            value
          }
        }
      }
    `);
    const metaData = await metaRes.json();
    const raw = metaData.data?.shop?.metafield?.value;
    if (raw) {
      try { extraSettings = JSON.parse(raw); } catch { extraSettings = null; }
    }
  }

  // ── Naya approach: singular subscriptionBillingCycle query, date selector se ──
  // Iske liye contract.nextBillingDate ka use karte hain — yeh directly wahi
  // upcoming cycle laata hai, koi range/status filter ki zaroorat nahi.
  let cycleIndex = null;
  let nextBillingDate = contract.nextBillingDate;

  if (contract.nextBillingDate) {
    const cycleRes = await admin.graphql(`
      query getCycleByDate($contractId: ID!, $date: DateTime!) {
        subscriptionBillingCycle(
          billingCycleInput: { contractId: $contractId, selector: { date: $date } }
        ) {
          cycleIndex
          billingAttemptExpectedDate
          skipped
        }
      }
    `, { variables: { contractId, date: contract.nextBillingDate } });

    const cycleData = await cycleRes.json();
    const cycle = cycleData.data?.subscriptionBillingCycle;
    if (cycle) {
      cycleIndex = cycle.cycleIndex;
      nextBillingDate = cycle.billingAttemptExpectedDate || nextBillingDate;
    }
  }

  const actionsForNextCycle = cycleIndex != null ? collectActionsForCycle(extraSettings, cycleIndex) : [];

  const preview = {
    contractId: contract.id,
    status: contract.status,
    customer: contract.customer,
    lineItem: {
      title: contract.lines.edges[0]?.node?.title,
      quantity: contract.lines.edges[0]?.node?.quantity,
      price: contract.lines.edges[0]?.node?.currentPrice,
    },
    planGroup: { id: groupId, name: groupName },
    nextOrder: {
      cycleIndex,
      expectedDate: nextBillingDate,
      willApply: actionsForNextCycle.length > 0 ? actionsForNextCycle : "No automatic changes configured for this cycle",
    },
    allExtraSettings: extraSettings,
  };

  console.log("─────────────────────────────────────────────");
  console.log(`📦 Contract: ${preview.contractId}`);
  console.log(`   Status: ${preview.status}`);
  console.log(`   Customer: ${preview.customer?.displayName || preview.customer?.id || "unknown"}`);
  console.log(`   Product: ${preview.lineItem.title} (qty ${preview.lineItem.quantity}, ${preview.lineItem.price?.amount} ${preview.lineItem.price?.currencyCode})`);
  console.log(`   Plan: ${preview.planGroup.name || "unknown"} (${preview.planGroup.id || "no group matched"})`);
  console.log(`   Next order date: ${preview.nextOrder.expectedDate}`);
  console.log(`   Next order cycle #: ${preview.nextOrder.cycleIndex}`);
  console.log(`   Will apply on next order:`, preview.nextOrder.willApply);
  console.log("─────────────────────────────────────────────");

  return preview;
}

export { getContractPreview, collectActionsForCycle, metaKeyForGroup, EXTRA_SETTINGS_NAMESPACE };