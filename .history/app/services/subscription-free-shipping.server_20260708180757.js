// app/services/subscription-free-shipping.server.js

/**
 * Subscription contract ke liye draft create karta hai
 */
export async function createSubscriptionDraft(admin, contractId) {
  const mutation = `
    mutation subscriptionContractCreateDraft($contractId: ID!) {
      subscriptionContractUpdate(contractId: $contractId) {
        draft {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const res = await admin.graphql(mutation, {
    variables: { contractId },
  });
  const data = await res.json();

  const root = data?.data?.subscriptionContractUpdate;
  const errors = root?.userErrors || [];

  if (errors.length > 0) {
    console.error("subscriptionContractUpdate errors:", errors);
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return root.draft.id; // SubscriptionDraft ID
}

/**
 * Subscription draft par free shipping discount add karta hai
 */
export async function addFreeShippingToDraft(
  admin,
  draftId,
  { title, recurringCycleLimit = null }
) {
  const mutation = `
    mutation subscriptionDraftFreeShippingDiscountAddExample(
      $draftId: ID!
      $input: SubscriptionFreeShippingDiscountInput!
    ) {
      subscriptionDraftFreeShippingDiscountAdd(draftId: $draftId, input: $input) {
        discountAdded {
          __typename
          ... on SubscriptionManualDiscount {
            id
            title
          }
        }
        draft {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const res = await admin.graphql(mutation, {
    variables: {
      draftId,
      input: {
        title,
        recurringCycleLimit,
      },
    },
  });

  const data = await res.json();
  const root = data?.data?.subscriptionDraftFreeShippingDiscountAdd;
  const errors = root?.userErrors || [];

  if (errors.length > 0) {
    console.error("subscriptionDraftFreeShippingDiscountAdd errors:", errors);
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return root.discountAdded;
}

/**
 * Draft commit karta hai, changes ko live subscription contract par apply karta hai
 */
export async function commitSubscriptionDraft(admin, draftId) {
  const mutation = `
    mutation subscriptionDraftCommit($draftId: ID!) {
      subscriptionDraftCommit(draftId: $draftId) {
        subscriptionContract {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const res = await admin.graphql(mutation, {
    variables: { draftId },
  });

  const data = await res.json();
  const root = data?.data?.subscriptionDraftCommit;
  const errors = root?.userErrors || [];

  if (errors.length > 0) {
    console.error("subscriptionDraftCommit errors:", errors);
    throw new Error(errors.map((e) => e.message).join(", "));
  }

  return root.subscriptionContract.id;
}