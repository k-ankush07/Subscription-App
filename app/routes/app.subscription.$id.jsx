import { authenticate } from "../shopify.server";
import SubscriptionDetail from "./components/SubscriptionDetail";
import {
  collectActionsForCycle,        
  applyActionsToCycle,         
  getContractSettingsSnapshot,
  snapshotContractSettings,
  getContractPreview,
  getEffectiveSettingsForContract,
  removeAutomationVariant,
  addBaseLineRemoval,
  removeAllDiscounts,
  removeLineDiscount,
  clearAnyOpenDraft,   
  applyLineDiscount,   
} from "../lib/billing-preview.server";
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export async function loader({ request, params }) {
  const { admin,session } = await authenticate.admin(request);

  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  const startDate = new Date();
  const endDateObj = new Date();
  endDateObj.setMonth(endDateObj.getMonth() + 20);
  const endDate = endDateObj.toISOString();

  const graphqlResponse = await admin.graphql(
    `
    query SubscriptionContractWithUpcoming(
      $contractId: ID!
      $startDate: DateTime!
      $endDate: DateTime!
    ) {
      subscriptionContract(id: $contractId) {
        id
        status
        createdAt
        updatedAt
        nextBillingDate
        deliveryPrice {
          amount
          currencyCode
        }
        deliveryPolicy {
          interval
          intervalCount
        }
        billingPolicy {
          interval
          intervalCount
          minCycles
          maxCycles
        }
        originOrder {
          id
          name
        }
        customer {
          id
          firstName
          lastName
          note
          defaultEmailAddress{
          emailAddress
          }
        }
        deliveryMethod {
          ... on SubscriptionDeliveryMethodShipping {
            address {
              firstName
              lastName
              address1
              address2
              city
              province
              zip
              country
            }
          }
        }
        customerPaymentMethod {
          id
          instrument {
            ... on CustomerCreditCard {
              brand
              lastDigits
              expiryMonth
              expiryYear
            }
          }
        }
        orders(first: 10) {
          edges {
            node {
              id
              createdAt
              name
              processedAt
          displayFinancialStatus
          displayFulfillmentStatus
          cancelReason
          cancelledAt
          currencyCode

              shippingLine {
                title
              }
              totalShippingPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
        lines(first: 50) {
          edges {
            node {
              id
              title
              variantTitle
              quantity
              productId
              variantId
              sku
              sellingPlanId     
              sellingPlanName
              currentPrice {
                amount
                currencyCode
              }
              variantImage {
                url
              }
              pricingPolicy {
               basePrice { 
               amount
               currencyCode
                }
                cycleDiscounts {
                  afterCycle
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue {
                      percentage
                    }
                    ... on MoneyV2 {
                      amount
                      currencyCode
                    }
                  }
                  computedPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
      subscriptionBillingCycles(
        first:20
        contractId: $contractId
        billingCyclesDateRangeSelector: {
          startDate: $startDate
          endDate: $endDate
        }
      ) {
        edges {
          node {
           billingAttemptExpectedDate
             cycleEndAt
             cycleIndex
             cycleStartAt
             edited
              skipped
              sourceContract {
        id
      }
            status
          }
        }
      }
    }
    `,
    {
      variables: {
        contractId,
        startDate,
        endDate,
      },
    },
  );

  const data = await graphqlResponse.json();

  if (!data?.data?.subscriptionContract) {
    throw new Response("Subscription contract not found", { status: 404 });
  }

  const contract = data.data.subscriptionContract;
  const allCycles =
    data.data.subscriptionBillingCycles?.edges?.map((edge) => edge.node) || [];

  // Contract lines list
  const lines = contract.lines?.edges?.map((e) => e.node) || [];

  // Unique sellingPlanIds collect karo
  const sellingPlanIds = [
    ...new Set(lines.map((line) => line.sellingPlanId).filter(Boolean)),
  ];
  const maxCycles = contract?.billingPolicy?.maxCycles ?? null;
  const now = new Date();
  let upcomingCycles = allCycles.filter(
    (cycle) =>
      cycle.billingAttemptExpectedDate &&
      new Date(cycle.billingAttemptExpectedDate) >= now &&
      cycle.status !== "BILLED",
  );
  if (maxCycles != null) {
    upcomingCycles = upcomingCycles.filter(
      (cycle) =>
        typeof cycle.cycleIndex === "number" &&
        cycle.cycleIndex <= maxCycles - 1,
    );
  }
  const preview = await getContractPreview(admin, contractId);
  try {
    const res = await fetch(`${API}/api/subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SECRET_KEY,
      },
      body: JSON.stringify({
        subscriptionId,
        contractId,
        contract,
        upcomingCycles,
        preview,
      }),
    });
  } catch (err) {
    console.error("Backend save call failed:", err);
  }

  let internalNotes = "";
  let customerNotes = "";
  try {
    const notesRes = await fetch(`${API}/api/${subscriptionId}`, {
      method: "GET",
      headers: {
        "x-api-key": SECRET_KEY,
      },
    });
    if (notesRes.ok) {
      const notesData = await notesRes.json();
      internalNotes = notesData?.data?.internalNotes || "";
      customerNotes = notesData?.data?.customerNotes || "";
    }
  } catch (err) {
    console.error("Backend fetch notes failed:", err);
  }

  return { contract, upcomingCycles, internalNotes, customerNotes, preview ,shop: session.shop, };
}

const RESCHEDULE_MUTATION = `
  mutation SubscriptionBillingCycleScheduleEdit(
    $billingCycleInput: SubscriptionBillingCycleInput!
    $input: SubscriptionBillingCycleScheduleEditInput!
  ) {
    subscriptionBillingCycleScheduleEdit(
      billingCycleInput: $billingCycleInput
      input: $input
    ) {
      billingCycle {
        cycleIndex
        billingAttemptExpectedDate
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

async function rescheduleSingleCycle(admin, contractId, cycleIndex, isoDate) {
  const res = await admin.graphql(RESCHEDULE_MUTATION, {
    variables: {
      billingCycleInput: {
        contractId,
        selector: { index: cycleIndex },
      },
      input: {
        billingDate: isoDate,
        reason: "MERCHANT_INITIATED",
      },
    },
  });
  const data = await res.json();
  return data?.data?.subscriptionBillingCycleScheduleEdit;
}

export async function action({ request, params }) {
  const formData = await request.formData();
  const type = formData.get("type");
  const notes = formData.get("notes");
  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;
  const { admin } = await authenticate.admin(request);

  if (
    type === "pause" ||
    type === "cancel" ||
    type === "resume" ||
    type === "skip" ||
    type === "unskip" ||
    type === "reschedule" ||
    type === "charge_now" ||
    type === "remove_automation_item" ||
    type === "remove_base_line" ||
    type === "remove_all_discounts" ||   
    type === "remove_line_discount"   ||
    type === "apply_line_discount" 
  ) {
    if (type === "pause") {
      try {
    await clearAnyOpenDraft(admin, contractId);
  } catch (err) {
    console.warn(`[pause] clearAnyOpenDraft failed for ${contractId}:`, err);
  }
      const res = await admin.graphql(
        `
        mutation PauseSubscriptionContract($contractId: ID!) {
          subscriptionContractPause(
            subscriptionContractId: $contractId
          ) {
            contract {
              id
              status
              nextBillingDate
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        { variables: { contractId } },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionContractPause;
      if (!payload || payload.userErrors?.length) {
        console.error("Pause failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Pause failed",
        };
      }
      return { success: true, status: payload.contract.status };
    }
    if (type === "cancel") {
      try {
    await clearAnyOpenDraft(admin, contractId);
  } catch (err) {
    console.warn(`[cancel] clearAnyOpenDraft failed for ${contractId}:`, err);
  }
      const res = await admin.graphql(
        `
        mutation CancelSubscriptionContract($contractId: ID!) {
          subscriptionContractCancel(
            subscriptionContractId: $contractId
          ) {
            contract {
              id
              status
              nextBillingDate
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        { variables: { contractId } },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionContractCancel;
      if (!payload || payload.userErrors?.length) {
        console.error("Cancel failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Cancel failed",
        };
      }

      return { success: true, status: payload.contract.status };
    }
    if (type === "resume") {
      const res = await admin.graphql(
        `
      mutation ActivateSubscriptionContract($contractId: ID!) {
        subscriptionContractActivate(
          subscriptionContractId: $contractId
        ) {
          contract {
            id
            status
            nextBillingDate
          }
          userErrors {
            field
            message
            code
          }
        }
      }
      `,
        { variables: { contractId } },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionContractActivate;

      if (!payload || payload.userErrors?.length) {
        console.error("Resume failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Resume failed",
        };
      }

      return { success: true, status: payload.contract.status };
    }
    if (type === "skip") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

      if (Number.isNaN(cycleIndex)) {
        return {
          success: false,
          error: "Invalid billing cycle index",
        };
      }

      const res = await admin.graphql(
        `
        mutation SkipSubscriptionBillingCycle(
          $billingCycleInput: SubscriptionBillingCycleInput!
        ) {
          subscriptionBillingCycleSkip(
            billingCycleInput: $billingCycleInput
          ) {
            billingCycle {
              cycleIndex
              billingAttemptExpectedDate
              skipped
              edited
              status
            }
            userErrors {
              field
              message
              code
            }
          }
        }
        `,
        {
          variables: {
            billingCycleInput: {
              contractId,
              selector: {
                index: cycleIndex,
              },
            },
          },
        },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionBillingCycleSkip;

      if (!payload || payload.userErrors?.length) {
        console.error("Skip failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Skip failed",
        };
      }

      return {
        success: true,
        skippedCycleIndex: payload.billingCycle.cycleIndex,
      };
    }
    if (type === "unskip") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

      if (Number.isNaN(cycleIndex)) {
        return {
          success: false,
          error: "Invalid billing cycle index",
        };
      }

      const res = await admin.graphql(
        `
      mutation UnskipSubscriptionBillingCycle(
        $billingCycleInput: SubscriptionBillingCycleInput!
      ) {
        subscriptionBillingCycleUnskip(
          billingCycleInput: $billingCycleInput
        ) {
          billingCycle {
            cycleIndex
            billingAttemptExpectedDate
            skipped
            edited
            status
          }
          userErrors {
            field
            message
            code
          }
        }
      }
      `,
        {
          variables: {
            billingCycleInput: {
              contractId,
              selector: {
                index: cycleIndex,
              },
            },
          },
        },
      );

      const data = await res.json();
      const payload = data?.data?.subscriptionBillingCycleUnskip;

      if (!payload || payload.userErrors?.length) {
        console.error("Unskip failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Unskip failed",
        };
      }

      return {
        success: true,
        unskippedCycleIndex: payload.billingCycle.cycleIndex,
      };
    }
    if (type === "reschedule") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);
      const newDate = formData.get("newDate");
      const originalDate = formData.get("originalDate");

      if (Number.isNaN(cycleIndex) || !newDate) {
        return { success: false, error: "Invalid cycle index or date" };
      }

      const isoDate = new Date(newDate).toISOString();
      const payload = await rescheduleSingleCycle(
        admin,
        contractId,
        cycleIndex,
        isoDate,
      );

      if (!payload || payload.userErrors?.length) {
        console.error("Reschedule failed", payload?.userErrors);
        return {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Reschedule failed",
        };
      }

      return {
        success: true,
        rescheduledCycleIndex: payload.billingCycle.cycleIndex,
        newDate: payload.billingCycle.billingAttemptExpectedDate,
      };
    }
    if (type === "remove_automation_item") {
      const automationCycleIndex = parseInt(
        formData.get("automationCycleIndex"),
        10,
      );
      const automationActionIndex = parseInt(
        formData.get("automationActionIndex"),
        10,
      );
      const variantId = formData.get("variantId") || null;
      const sellingPlanId = formData.get("sellingPlanId") || null;

      if (
        Number.isNaN(automationCycleIndex) ||
        Number.isNaN(automationActionIndex)
      ) {
        return { success: false, error: "Invalid automation item reference" };
      }

      try {
        const currentSettings = await getEffectiveSettingsForContract(
          admin,
          contractId,
          sellingPlanId,
        );
        if (!currentSettings) {
          return {
            success: false,
            error: "No automation settings found for this subscription",
          };
        }
        const updatedSettings = removeAutomationVariant(
          currentSettings,
          automationCycleIndex,
          automationActionIndex,
          variantId,
        );
        const { snapshotted } = await snapshotContractSettings(
          admin,
          contractId,
          updatedSettings,
        );
        if (!snapshotted) {
          return {
            success: false,
            error: "Failed to save updated automation settings",
          };
        }
        return { success: true };
      } catch (err) {
        console.error("Remove automation item failed:", err);
        return { success: false, error: String(err?.message || err) };
      }
    }
    if (type === "remove_base_line") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);
      const productId = formData.get("productId") || null;
      const variantId = formData.get("variantId") || null;
      const sellingPlanId = formData.get("sellingPlanId") || null;

      if (Number.isNaN(cycleIndex)) {
        return { success: false, error: "Invalid billing cycle index" };
      }

      try {
        const currentSettings = await getEffectiveSettingsForContract(
          admin,
          contractId,
          sellingPlanId,
        );
        const updatedSettings = addBaseLineRemoval(
          currentSettings,
          cycleIndex,
          productId,
          variantId,
        );
        const { snapshotted } = await snapshotContractSettings(
          admin,
          contractId,
          updatedSettings,
        );
        if (!snapshotted) {
          return {
            success: false,
            error: "Failed to save updated automation settings",
          };
        }
        return { success: true };
      } catch (err) {
        console.error("Remove base line failed:", err);
        return { success: false, error: String(err?.message || err) };
      }
    }
    if (type === "remove_all_discounts") {
  const sellingPlanId = formData.get("sellingPlanId") || null;
  try {
    const currentSettings = await getEffectiveSettingsForContract(
      admin,
      contractId,
      sellingPlanId,
    );
    if (!currentSettings) {
      return {
        success: false,
        error: "No automation settings found for this subscription",
      };
    }
    const updatedSettings = removeAllDiscounts(currentSettings);
    const { snapshotted } = await snapshotContractSettings(
      admin,
      contractId,
      updatedSettings,
    );
    if (!snapshotted) {
      return {
        success: false,
        error: "Failed to save updated automation settings",
      };
    }
    return { success: true };
  } catch (err) {
    console.error("Remove all discounts failed:", err);
    return { success: false, error: String(err?.message || err) };
  }
    } 
    if (type === "remove_line_discount") {
      const isBaseLine = formData.get("isBaseLine") === "true";
      const discountPhase = formData.get("discountPhase") || null;
      const rawCycleIndex = formData.get("automationCycleIndex");
      const rawActionIndex = formData.get("automationActionIndex");
      const automationCycleIndex =
        rawCycleIndex !== "" ? parseInt(rawCycleIndex, 10) : null;
      const automationActionIndex =
        rawActionIndex !== "" ? parseInt(rawActionIndex, 10) : null;
      const sellingPlanId = formData.get("sellingPlanId") || null;

      if (!isBaseLine && (Number.isNaN(automationCycleIndex) || Number.isNaN(automationActionIndex))) {
        return { success: false, error: "Invalid discount reference" };
      }

      try {
        const currentSettings = await getEffectiveSettingsForContract(
          admin,
          contractId,
          sellingPlanId,
        );
        if (!currentSettings) {
          return {
            success: false,
            error: "No automation settings found for this subscription",
          };
        }
        const updatedSettings = removeLineDiscount(currentSettings, {
          isBaseLine,
          discountPhase,
          automationCycleIndex,
          automationActionIndex,
        });
        const { snapshotted } = await snapshotContractSettings(
          admin,
          contractId,
          updatedSettings,
        );
        if (!snapshotted) {
          return {
            success: false,
            error: "Failed to save updated automation settings",
          };
        }
        return { success: true };
      } catch (err) {
        console.error("Remove line discount failed:", err);
        return { success: false, error: String(err?.message || err) };
      }
    }
   if (type === "charge_now") {
    const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

    if (Number.isNaN(cycleIndex)) {
      return { success: false, error: "Invalid billing cycle index" };
    }

    try {
      await clearAnyOpenDraft(admin, contractId).catch((err) =>
        console.warn(`[charge_now] pre-apply clearAnyOpenDraft failed for ${contractId}:`, err),
      );

      const contractRes = await admin.graphql(
        `
        query getContractLineForCharge($contractId: ID!) {
          subscriptionContract(id: $contractId) {
            deliveryPrice { amount currencyCode }
             billingPolicy { maxCycles }
            lines(first: 5) {
              edges {
                node {
                  sellingPlanId
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
        { variables: { contractId } },
      );
      const contractData = await contractRes.json();
      if (contractData.errors) {
        console.error("[charge_now] getContractLineForCharge GraphQL errors:", JSON.stringify(contractData.errors));
      }

      const firstLine =
        contractData.data?.subscriptionContract?.lines?.edges?.[0]?.node;
      const basePriceAmount =
        firstLine?.pricingPolicy?.basePrice?.amount ?? null;
      const pricingPolicy = firstLine?.pricingPolicy ?? null;
      const deliveryPriceAmount =
        contractData.data?.subscriptionContract?.deliveryPrice?.amount ??
        null;
      const extraSettings = await getContractSettingsSnapshot(
        admin,
        contractId,
      );
      const actionsForThisCycle = extraSettings
        ? collectActionsForCycle(extraSettings, cycleIndex, pricingPolicy)
        : [];

      let skippedActions = [];
      if (actionsForThisCycle.length > 0) {
        const result = await applyActionsToCycle(
          admin,
          contractId,
          cycleIndex,
          actionsForThisCycle,
          basePriceAmount,
          pricingPolicy,
          null,
          deliveryPriceAmount,
        );
        skippedActions = result?.skippedActions || [];
      }

      const chargeRes = await admin.graphql(
        `
        mutation ChargeSubscriptionCycleNow($contractId: ID!, $index: Int!) {
          subscriptionBillingCycleCharge(
            subscriptionContractId: $contractId
            billingCycleSelector: { index: $index }
          ) {
            subscriptionBillingAttempt {
              id
              ready
              errorMessage
              order { id name }
            }
            userErrors { field message code }
          }
        }
        `,
        { variables: { contractId, index: cycleIndex } },
      );

      const chargeData = await chargeRes.json();
      const chargePayload = chargeData.data?.subscriptionBillingCycleCharge;

      if (!chargePayload || chargePayload.userErrors?.length) {
        console.error("Charge now failed", chargePayload?.userErrors);
        return {
          success: false,
          error:
            chargePayload?.userErrors?.map((e) => e.message).join(", ") ||
            "Charge failed",
        };
      }

      const attempt = chargePayload.subscriptionBillingAttempt;
      const maxCycles = Number(
        contractData.data?.subscriptionContract?.billingPolicy?.maxCycles ?? NaN,
      );
      const numericCycleIndex = Number(cycleIndex);

      console.log(
        `[charge_now] auto-cancel check: cycleIndex=${numericCycleIndex}, maxCycles=${maxCycles}, condition=${
          !Number.isNaN(maxCycles) && numericCycleIndex >= maxCycles - 1
        }`,
      );

      let autoCancelled = false;
      let autoCancelError = null;

      if (!Number.isNaN(maxCycles) && numericCycleIndex >= maxCycles - 1) {
        const CANCEL_MUTATION = `
          mutation CancelSubscriptionContract($contractId: ID!) {
            subscriptionContractCancel(subscriptionContractId: $contractId) {
              contract { id status }
              userErrors { field message code }
            }
          }
        `;

        const isOpenEditError = (payload) =>
          payload?.userErrors?.some((e) =>
            /billing cycle contract edit|incomplete billing attempts/i.test(e.message || ""),
          );

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        try {
          let cancelPayload = null;
          // Shopify's charge mutation returns before the billing attempt is
          // fully processed — clearing/cancelling right after can fail with
          // "incomplete billing attempts in progress". Retry a few times
          // with increasing waits instead of giving up after one try. If it
          // still hasn't settled after this, the cron job's own auto-cancel
          // check (which runs on a schedule) will catch it on a later pass.
          const WAIT_STEPS_MS = [2000, 4000, 6000];

          for (let attempt = 0; attempt <= WAIT_STEPS_MS.length; attempt++) {
            if (attempt > 0) {
              const waitMs = WAIT_STEPS_MS[attempt - 1];
              console.log(
                `[charge_now] cancel attempt ${attempt + 1}/${WAIT_STEPS_MS.length + 1} — waiting ${waitMs}ms for billing attempt to settle`,
              );
              await sleep(waitMs);
            }

            const clearResults = await clearAnyOpenDraft(admin, contractId, {
              fromIndex: 0,
              toIndex: numericCycleIndex + 3,
            });
            const clearedCount = clearResults.filter((r) => r.cleared).length;
            console.log(
              `[charge_now] pre-cancel clear (attempt ${attempt + 1}): ${clearedCount} cleared, ${
                clearResults.length - clearedCount
              } failed`,
            );

            const cancelRes = await admin.graphql(CANCEL_MUTATION, {
              variables: { contractId },
            });
            const cancelData = await cancelRes.json();
            cancelPayload = cancelData.data?.subscriptionContractCancel;

            if (cancelData.errors) {
              console.error("[charge_now] auto-cancel GraphQL errors:", JSON.stringify(cancelData.errors));
            }

            if (!isOpenEditError(cancelPayload)) {
              // Either it succeeded, or it failed for a DIFFERENT reason —
              // either way, no point retrying further.
              break;
            }

            console.warn(
              `[charge_now] cancel attempt ${attempt + 1} blocked by open/incomplete billing cycle edit`,
            );
          }

          if (cancelPayload?.userErrors?.length) {
            console.error(
              "[charge_now] auto-cancel failed after retries:",
              JSON.stringify(cancelPayload.userErrors),
            );
            autoCancelError = cancelPayload.userErrors
              .map((e) => e.message)
              .join(", ");
            if (isOpenEditError(cancelPayload)) {
              autoCancelError +=
                " (billing attempt hadn't settled in time — the scheduled cron job will retry cancellation automatically)";
            }
          } else if (cancelPayload?.contract) {
            autoCancelled = true;
            console.log(`[charge_now] auto-cancel SUCCESS — new status: ${cancelPayload.contract.status}`);
          } else {
            console.warn("[charge_now] auto-cancel: no payload returned, unknown state");
            autoCancelError = "No cancel payload returned from Shopify";
          }
        } catch (err) {
          console.error("[charge_now] auto-cancel errored:", err);
          autoCancelError = String(err?.message || err);
        }
      }

      return {
        success: true,
        chargedCycleIndex: cycleIndex,
        billingAttemptId: attempt?.id || null,
        orderId: attempt?.order?.id || null,
        orderName: attempt?.order?.name || null,
        ready: attempt?.ready ?? null,
        errorMessage: attempt?.errorMessage || null,
        appliedActions: actionsForThisCycle.map((a) => a.type),
        skippedActions,
        autoCancelled,
        autoCancelError,
      };
    } catch (err) {
      console.error("[charge_now] failed:", err);
      return { success: false, error: String(err?.message || err) };
    }
    }
   if (type === "apply_line_discount") {
  const isBaseLine = formData.get("isBaseLine") === "true";
  const rawCycleIndex = formData.get("automationCycleIndex");
  const rawActionIndex = formData.get("automationActionIndex");
  const automationCycleIndex = rawCycleIndex !== "" ? parseInt(rawCycleIndex, 10) : null;
  const automationActionIndex = rawActionIndex !== "" ? parseInt(rawActionIndex, 10) : null;
  const sellingPlanId = formData.get("sellingPlanId") || null;
  const discountType = formData.get("discountType");
  const discountValue = formData.get("discountValue");

  if (!isBaseLine && (Number.isNaN(automationCycleIndex) || Number.isNaN(automationActionIndex))) {
    return { success: false, error: "Invalid discount reference" };
  }

  try {
    const currentSettings = await getEffectiveSettingsForContract(
      admin,
      contractId,
      sellingPlanId,
    );
    const updatedSettings = applyLineDiscount(currentSettings, {
      isBaseLine,
      automationCycleIndex,
      automationActionIndex,
      discountType,
      discountValue,
    });
    const { snapshotted } = await snapshotContractSettings(
      admin,
      contractId,
      updatedSettings,
    );
    if (!snapshotted) {
      return {
        success: false,
        error: "Failed to save updated automation settings",
      };
    }
    return { success: true };
  } catch (err) {
    console.error("Apply line discount failed:", err);
    return { success: false, error: String(err?.message || err) };
  }
    }
  }

  const payload = {
    subscriptionId,
    contractId,
    ...(type === "internal"
      ? { internalNotes: notes }
      : { customerNotes: notes }),
  };

  try {
    await fetch(`${API}/api/subscription`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": SECRET_KEY,
      },
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    console.error("Backend save notes call failed:", err);
    return { success: false, error: err.message };
  }
}

export default function SubscriptionRoute() {
  return <SubscriptionDetail />;
}