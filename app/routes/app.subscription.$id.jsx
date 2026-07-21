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
} from "../lib/billing-preview.server";
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;



async function getSellingPlanExtraSettings(admin, sellingPlanId) {
  const res = await admin.graphql(
    `
    query GetSellingPlanExtraSettings($sellingPlanId: ID!) {
      node(id: $sellingPlanId) {
        ... on SellingPlan {
          id
          metafield(namespace: "subscription_app", key: "extra_settings") {
            value
          }
        }
      }
    }
    `,
    { variables: { sellingPlanId } },
  );

  const json = await res.json();
  const mf = json.data?.node?.metafield;

  if (!mf?.value) return null;

  try {
    return JSON.parse(mf.value);
  } catch (e) {
    console.error("Invalid extra_settings JSON metafield", e);
    return null;
  }
}


export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);

  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  const startDate = new Date()  
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
  ...new Set(
    lines
      .map((line) => line.sellingPlanId)
      .filter(Boolean),
  ),
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
  const preview = await getContractPreview(admin, contractId);
  return { contract, upcomingCycles, internalNotes, customerNotes,preview};
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
    type === "charge_now"||
    type === "remove_automation_item"
  ) {
    if (type === "pause") {
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
      const payload = await rescheduleSingleCycle(admin, contractId, cycleIndex, isoDate);

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
      const automationCycleIndex = parseInt(formData.get("automationCycleIndex"), 10);
      const automationActionIndex = parseInt(formData.get("automationActionIndex"), 10);
      const variantId = formData.get("variantId") || null;
      const sellingPlanId = formData.get("sellingPlanId") || null;

      if (Number.isNaN(automationCycleIndex) || Number.isNaN(automationActionIndex)) {
        return { success: false, error: "Invalid automation item reference" };
      }

      try {
        const currentSettings = await getEffectiveSettingsForContract(
          admin,
          contractId,
          sellingPlanId,
        );
        if (!currentSettings) {
          return { success: false, error: "No automation settings found for this subscription" };
        }
        const updatedSettings = removeAutomationVariant(
          currentSettings,
          automationCycleIndex,
          automationActionIndex,
          variantId,
        );
        const { snapshotted } = await snapshotContractSettings(admin, contractId, updatedSettings);
        if (!snapshotted) {
          return { success: false, error: "Failed to save updated automation settings" };
        }
        return { success: true };
      } catch (err) {
        console.error("Remove automation item failed:", err);
        return { success: false, error: String(err?.message || err) };
      }
    }
     if (type === "charge_now") {
      const cycleIndex = parseInt(formData.get("cycleIndex"), 10);

      if (Number.isNaN(cycleIndex)) {
        return { success: false, error: "Invalid billing cycle index" };
      }

      try {
        const contractRes = await admin.graphql(
          `
          query getContractLineForCharge($contractId: ID!) {
            subscriptionContract(id: $contractId) {
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
        const firstLine = contractData.data?.subscriptionContract?.lines?.edges?.[0]?.node;
        const sellingPlanId = firstLine?.sellingPlanId;
        const basePriceAmount = firstLine?.pricingPolicy?.basePrice?.amount ?? null;
        const pricingPolicy = firstLine?.pricingPolicy ?? null;
        let extraSettings = await getContractSettingsSnapshot(admin, contractId);
        if (!extraSettings && sellingPlanId) {
          extraSettings = await getSellingPlanExtraSettings(admin, sellingPlanId);
        }

        const actionsForThisCycle = extraSettings
          ? collectActionsForCycle(extraSettings, cycleIndex)
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
          );
          skippedActions = result?.skippedActions || [];
        }

        // 3. Ab actual charge karo
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
        };
      } catch (err) {
        console.error("[charge_now] failed:", err);
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