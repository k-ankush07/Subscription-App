const EXTRA_SETTINGS_NAMESPACE = "subscription_app";
function metaKeyForGroup(groupId) {
  const numericId = groupId.split("/").pop();
  return `extra_settings_${numericId}`;
}

// function collectActionsForCycle(settings, cycleIndex) {
//   const actions = [];
//   console.log("setting", settings, "index", cycleIndex);
//   if (!settings) return actions;

//   if (
//     settings.shippingDiscount?.enabled &&
//     settings.shippingDiscount.after === cycleIndex
//   ) {
//     actions.push({ ...settings.shippingDiscount, type: "SHIPPING_DISCOUNT" });
//   }
//   if (
//     settings.quantityChange?.enabled &&
//     settings.quantityChange.after === cycleIndex
//   ) {
//     actions.push({ ...settings.quantityChange, type: "QUANTITY_CHANGE" });
//   }
//   for (const auto of settings.automaticActions || []) {
//     if (auto.afterCycle === cycleIndex) {
//       actions.push({ ...auto, type: auto.type });
//     }
//   }
//   return actions;
// }
function collectActionsForCycle(settings, cycleIndex) {
  const actions = [];

//   console.log("settings:", settings);
//   console.log("cycleIndex:", cycleIndex);

  if (!settings) return actions;

  cycleIndex = Number(cycleIndex);

  // Shipping Discount
  if (
    settings.giveShippingDiscount &&
    Number(settings.shippingAfterOrders) === cycleIndex
  ) {
    actions.push({
      type: "SHIPPING_DISCOUNT",
      discountType: settings.shippingDiscountType,
      value: settings.shippingDiscountValue,
      after: settings.shippingAfterOrders,
    });
  }

  // Quantity Change
  if (
    settings.changeQuantityAfterOrders &&
    Number(settings.quantityAfterOrders) === cycleIndex
  ) {
    actions.push({
      type: "QUANTITY_CHANGE",
      value: settings.quantityAfterOrdersValue,
      products: settings.quantityProducts ?? [],
      after: settings.quantityAfterOrders,
    });
  }

  // Remove Free Product
  if (
    settings.RemoveFreeProdcut &&
    Number(settings.removeFreeProductValue) === cycleIndex
  ) {
    actions.push({
      type: "REMOVE_FREE_PRODUCT",
      products: settings.freeProducts ?? [],
      after: settings.removeFreeProductValue,
    });
  }

  // Automation
 // Automation
if (settings.Automation && Array.isArray(settings.automationCycles)) {
  for (const auto of settings.automationCycles) {
    if (Number(auto.orders) === cycleIndex) {
      for (const action of auto.actions ?? []) {
        actions.push({
          ...action,
          after: auto.orders,
        });
      }
    }
  }
}

  // Minimum Quantity
  if (settings.MinimumQuanitity) {
    actions.push({
      type: "MINIMUM_QUANTITY",
      value: settings.MinimumQuanitityValue,
    });
  }

  return actions;
}

async function getContractPreview(admin, contractId) {
  const contractRes = await admin.graphql(
    `
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
  `,
    { variables: { id: contractId } },
  );
  const contractData = await contractRes.json();
  const contract = contractData.data?.subscriptionContract;

  if (!contract) {
    console.log(`[preview] Contract not found: ${contractId}`);
    return null;
  }

  const sellingPlanId = contract.lines.edges[0]?.node?.sellingPlanId;

//   let groupId = null;
//   let groupName = null;
//   if (sellingPlanId) {
//     const groupsRes = await admin.graphql(`
//       query {
//         sellingPlanGroups(first: 50) {
//           edges { node { id name sellingPlans(first: 20) { edges { node { id } } } } }
//         }
//       }
//     `);
//     const groupsData = await groupsRes.json();
//     const groups = groupsData.data.sellingPlanGroups.edges.map((e) => e.node);
//     for (const group of groups) {
//       if (
//         group.sellingPlans.edges.some(({ node }) => node.id === sellingPlanId)
//       ) {
//         groupId = group.id;
//         groupName = group.name;
//         break;
//       }
//     }
//   }
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

                  extraSettingsMetafield: metafield(
                    namespace: "subscription_app"
                    key: "extra_settings"
                  ) {
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

    const plan = group.sellingPlans.edges.find(
      ({ node }) => node.id === sellingPlanId
    );

    if (!plan) continue;

    groupId = group.id;
    groupName = group.name;

    const raw = plan.node.extraSettingsMetafield?.value;

    if (raw) {
      extraSettings = JSON.parse(raw);
    }

    break;
  }
}

//   let extraSettings = null;
//   if (groupId) {
//     const metaRes = await admin.graphql(`
//       query {
//         shop {
//           metafield(namespace: "${EXTRA_SETTINGS_NAMESPACE}", key: "${metaKeyForGroup(groupId)}") {
//             value
//           }
//         }
//       }
//     `);
//     const metaData = await metaRes.json();
//     const raw = metaData.data?.shop?.metafield?.value;
//     if (raw) {
//       try {
//         extraSettings = JSON.parse(raw);
//       } catch {
//         extraSettings = null;
//       }
//     }
//   }

  let cycleIndex = null;
  let nextBillingDate = contract.nextBillingDate;

  if (contract.nextBillingDate) {
    const cycleRes = await admin.graphql(
      `
      query getCycleByDate($contractId: ID!, $date: DateTime!) {
        subscriptionBillingCycle(
          billingCycleInput: { contractId: $contractId, selector: { date: $date } }
        ) {
          cycleIndex
          billingAttemptExpectedDate
          skipped
        }
      }
    `,
      { variables: { contractId, date: contract.nextBillingDate } },
    );

    const cycleData = await cycleRes.json();
    const cycle = cycleData.data?.subscriptionBillingCycle;
    if (cycle) {
      cycleIndex = cycle.cycleIndex;
      nextBillingDate = cycle.billingAttemptExpectedDate || nextBillingDate;
    }
  }

  const actionsForNextCycle =
    cycleIndex != null ? collectActionsForCycle(extraSettings, cycleIndex) : [];
    console.log("gnjggsgrhghsrehgsehglflkdsfkdsklfsdkl",collectActionsForCycle(extraSettings, 2));

  const preview = {
    contractId: contract.id,
    status: contract.status,
    customer: contract.customer,
    lineItem: {
        id: contract.lines.edges[0]?.node?.id,
      title: contract.lines.edges[0]?.node?.title,
      quantity: contract.lines.edges[0]?.node?.quantity,
      price: contract.lines.edges[0]?.node?.currentPrice,
    },
    planGroup: { id: groupId, name: groupName },
    nextOrder: {
      cycleIndex,
      expectedDate: nextBillingDate,
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
  console.log(`   Will apply on next order:`, preview.nextOrder.willApply);
  console.log("─────────────────────────────────────────────");

  return preview;
}

export {
  getContractPreview,
  collectActionsForCycle,
  metaKeyForGroup,
  EXTRA_SETTINGS_NAMESPACE,
};
