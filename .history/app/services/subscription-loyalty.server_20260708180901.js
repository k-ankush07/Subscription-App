// app/services/subscription-free-shipping.server.js

export async function maybeApplyFreeShippingAfterXOrders({
  admin,
  contractId,
  ordersCompleted,       // ab tak complete Orders count (current order se pehle)
  shippingAfterOrders,   // tumhare plan config se aayega
}) {
  // Agar abhi threshold nahi aaya, kuch mat karo
  if (ordersCompleted + 1 < shippingAfterOrders) {
    return { applied: false };
  }

  // 1) Draft create
  const draftId = await createSubscriptionDraft(admin, contractId);

  // 2) Draft pe free shipping discount add
  await addFreeShippingToDraft(admin, draftId, {
    title: `Free shipping after ${shippingAfterOrders} orders`,
    recurringCycleLimit: null, // ya koi specific limit
  });

  // 3) Draft commit
  const updatedContractId = await commitSubscriptionDraft(admin, draftId);

  return {
    applied: true,
    subscriptionContractId: updatedContractId,
  };
}