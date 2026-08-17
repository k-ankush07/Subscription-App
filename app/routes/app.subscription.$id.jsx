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
  updateContractAddress,
  fetchVariantPrice,
} from "../lib/billing-preview.server";
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

async function fetchAllBillingCycles(admin, contractId, startDate, endDate,maxCycles = 60) {
  let cycles = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage && cycles.length < maxCycles) {
    const res = await admin.graphql(
      `
      query getCycles(
        $contractId: ID!
        $startDate: DateTime!
        $endDate: DateTime!
        $after: String
      ) {
        subscriptionBillingCycles(
          contractId: $contractId
          first: 50
          after: $after
          billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
        ) {
          edges {
            cursor
            node {
              billingAttemptExpectedDate
              cycleEndAt
              cycleIndex
              cycleStartAt
              edited
              skipped
              sourceContract { id }
              status
            }
          }
          pageInfo { hasNextPage }
        }
      }
      `,
      { variables: { contractId, startDate, endDate, after: cursor } },
    );
    const data = await res.json();

    if (data.errors) {
      console.error("[fetchAllBillingCycles] GraphQL errors:", JSON.stringify(data.errors));
      break;
    }

    const conn = data?.data?.subscriptionBillingCycles;
    const edges = conn?.edges || [];
    cycles.push(...edges.map((e) => e.node));

      hasNextPage =
      !!conn?.pageInfo?.hasNextPage &&
      edges.length > 0 &&
      cycles.length < maxCycles;
    cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

    // hasNextPage = !!conn?.pageInfo?.hasNextPage && edges.length > 0;
    // cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
  }

  return cycles;
}
async function fetchAllLines(admin, contractId) {
  let edges = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await admin.graphql(
      `
      query getContractLines($contractId: ID!, $after: String) {
        subscriptionContract(id: $contractId) {
          lines(first: 50, after: $after) {
            edges {
              cursor
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
                currentPrice { amount currencyCode }
                variantImage { url }
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
            pageInfo { hasNextPage }
          }
        }
      }
      `,
      { variables: { contractId, after: cursor } },
    );
    const data = await res.json();

    if (data.errors) {
      console.error("[fetchAllLines] GraphQL errors:", JSON.stringify(data.errors));
      break;
    }

    const conn = data?.data?.subscriptionContract?.lines;
    const pageEdges = conn?.edges || [];
    edges.push(...pageEdges);

    hasNextPage = !!conn?.pageInfo?.hasNextPage && pageEdges.length > 0;
    cursor = pageEdges.length > 0 ? pageEdges[pageEdges.length - 1].cursor : null;
  }

  return edges;
}

async function fetchAllOrders(admin, contractId) {
  let edges = [];
  let cursor = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await admin.graphql(
      `
      query getContractOrders($contractId: ID!, $after: String) {
        subscriptionContract(id: $contractId) {
          orders(first: 50, after: $after) {
            edges {
              cursor
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
                shippingLine { title }
                totalShippingPriceSet {
                  shopMoney { amount currencyCode }
                }
              }
            }
            pageInfo { hasNextPage }
          }
        }
      }
      `,
      { variables: { contractId, after: cursor } },
    );
    const data = await res.json();

    if (data.errors) {
      console.error("[fetchAllOrders] GraphQL errors:", JSON.stringify(data.errors));
      break;
    }

    const conn = data?.data?.subscriptionContract?.orders;
    const pageEdges = conn?.edges || [];
    edges.push(...pageEdges);

    hasNextPage = !!conn?.pageInfo?.hasNextPage && pageEdges.length > 0;
    cursor = pageEdges.length > 0 ? pageEdges[pageEdges.length - 1].cursor : null;
  }

  return edges;
}
export async function loader({ request, params }) {
  const { admin,session } = await authenticate.admin(request);

  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  const startDate = new Date();
  const endDateObj = new Date();
  endDateObj.setMonth(endDateObj.getMonth() +4 );
  const endDate = endDateObj.toISOString();

const graphqlResponse = await admin.graphql(
    `
    query SubscriptionContractWithUpcoming(
      $contractId: ID!
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
              displayName
              note
              defaultEmailAddress { emailAddress }
              addresses {
                id
                firstName
                lastName
                address1
                address2
                city
                province
                zip
                country
                phone
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
      }
    }
    `,
    {
      variables: {
        contractId,
      },
    },
  );
  const data = await graphqlResponse.json();

  if (!data?.data?.subscriptionContract) {
    throw new Response("Subscription contract not found", { status: 404 });
  }

const contract = data.data.subscriptionContract;

  // lines pehle chahiye kyunki preview isi par depend karta hai
  const allLineEdges = await fetchAllLines(admin, contractId);
  contract.lines = { edges: allLineEdges };

  // Ye teeno ek dusre se independent hain — ek saath (parallel) chalao
  const [allOrderEdges, allCycles, preview] = await Promise.all([
    fetchAllOrders(admin, contractId),
    fetchAllBillingCycles(admin, contractId, startDate, endDate,60),
    getContractPreview(admin, contractId, contract),
  ]);
  contract.orders = { edges: allOrderEdges };

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
  const pastOrders = contract.orders?.edges?.map((edge) => edge.node) || [];
  const pastSkippedCycles = allCycles.filter(
    (cycle) =>
      cycle.skipped &&
      cycle.billingAttemptExpectedDate &&
      new Date(cycle.billingAttemptExpectedDate) < now,
  );

  // Sirf logging/analytics ke liye hai, response use nahi hota — page ko block mat karo
  fetch(`${API}/api/subscription`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": SECRET_KEY,
    },
    body: JSON.stringify({
       shop: session.shop,
      subscriptionId,
      contractId,
      contract,
      upcomingCycles,
      preview,
      pastSkippedCycles,
      pastOrders,
    }),
  }).catch((err) => console.error("Backend save call failed:", err));

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

  return { contract, upcomingCycles,   pastSkippedCycles, pastOrders, internalNotes, customerNotes, preview ,shop: session.shop, };
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
  const { admin , session} = await authenticate.admin(request);

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
    type === "remove_line_discount"  ||
    type === "update_address"
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

      try {
    await fetch(`${API}/api/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": SECRET_KEY },
      body: JSON.stringify({
         shop: session.shop,
        subscriptionId,
        contractId,
        actionType: "paused",
        actionBy: "merchant",
        actionAt: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Failed to record pause source:", err);
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
 try {
    await fetch(`${API}/api/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": SECRET_KEY },
      body: JSON.stringify({
         shop: session.shop,
        subscriptionId,
        contractId,
        cancelledBy: "merchant",
        cancelledAt: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("Failed to record cancel source:", err);
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

  let autoSkippedCycles = [];
  try {
    const now = new Date();
    const rangeStart = new Date();
    rangeStart.setFullYear(rangeStart.getFullYear() - 3);

    let overdueCyclesRaw = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const cyclesRes = await admin.graphql(
        `
        query getOverdueCycles(
          $contractId: ID!
          $startDate: DateTime!
          $endDate: DateTime!
          $after: String
        ) {
          subscriptionBillingCycles(
            contractId: $contractId
            first: 50
            after: $after
            billingCyclesDateRangeSelector: {
              startDate: $startDate
              endDate: $endDate
            }
          ) {
            edges {
              cursor
              node {
                cycleIndex
                billingAttemptExpectedDate
                status
                skipped
              }
            }
            pageInfo { hasNextPage }
          }
        }
        `,
        {
          variables: {
            contractId,
            startDate: rangeStart.toISOString(),
            endDate: now.toISOString(),
            after: cursor,
          },
        },
      );
      const cyclesData = await cyclesRes.json();

      if (cyclesData.errors) {
        console.error("[resume] getOverdueCycles GraphQL errors:", JSON.stringify(cyclesData.errors));
        break;
      }

      const conn = cyclesData?.data?.subscriptionBillingCycles;
      const edges = conn?.edges || [];
      overdueCyclesRaw.push(...edges.map((e) => e.node));

      hasNextPage = !!conn?.pageInfo?.hasNextPage && edges.length > 0;
      cursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;
    }

    const overdueCycles = overdueCyclesRaw.filter(
      (c) =>
        !c.skipped &&
        c.status !== "BILLED" &&
        c.billingAttemptExpectedDate &&
        new Date(c.billingAttemptExpectedDate) < now,
    );

    for (const c of overdueCycles) {
      try {
        const skipRes = await admin.graphql(
          `
          mutation SkipOverdueCycle(
            $billingCycleInput: SubscriptionBillingCycleInput!
          ) {
            subscriptionBillingCycleSkip(
              billingCycleInput: $billingCycleInput
            ) {
              billingCycle {
                cycleIndex
                skipped
              }
              userErrors { field message code }
            }
          }
          `,
          {
            variables: {
              billingCycleInput: {
                contractId,
                selector: { index: c.cycleIndex },
              },
            },
          },
        );
        const skipData = await skipRes.json();
        const skipPayload = skipData?.data?.subscriptionBillingCycleSkip;
        if (skipPayload?.userErrors?.length) {
          console.warn(
            `[resume] skip failed for overdue cycle ${c.cycleIndex}:`,
            skipPayload.userErrors,
          );
        } else {
          autoSkippedCycles.push(c.cycleIndex);
        }
      } catch (err) {
        console.warn(
          `[resume] skip errored for overdue cycle ${c.cycleIndex}:`,
          err,
        );
      }
    }
  } catch (err) {
    console.warn(
      `[resume] failed to fetch/skip overdue cycles for ${contractId}:`,
      err,
    );
  }

  return {
    success: true,
    status: payload.contract.status,
    autoSkippedCycles,
  };
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
          variantId: formData.get("variantId") || null,
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
                   variantId 
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
      const liveVariantPrice = await fetchVariantPrice(admin, firstLine?.variantId);
const basePriceAmount = liveVariantPrice ?? firstLine?.pricingPolicy?.basePrice?.amount ?? null;
      const pricingPolicy = firstLine?.pricingPolicy ?? null;
      const deliveryPriceAmount =
        contractData.data?.subscriptionContract?.deliveryPrice?.amount ??
        null;
      const extraSettings = await getContractSettingsSnapshot(
        admin,
        contractId,
      );
      const actionsForThisCycle = extraSettings
        ? collectActionsForCycle(extraSettings, cycleIndex, pricingPolicy, firstLine?.variantId)
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
   if (type === "update_address") {
      const mode = formData.get("mode");

      const buildAddressInput = (a) => ({
        firstName: a.firstName || "",
        lastName: a.lastName || "",
        address1: a.address1 || "",
        address2: a.address2 || "",
        city: a.city || "",
        province: a.province || "",
        zip: a.zip || "",
        country: a.country || "",
        phone: a.phone || undefined,
      });

      try {
        let addressInput;

        if (mode === "select") {
          const addressId = formData.get("addressId");

          const custRes = await admin.graphql(
            `query GetContractCustomerAddresses($contractId: ID!) {
              subscriptionContract(id: $contractId) {
                customer {
                  addresses {
                    id
                    firstName
                    lastName
                    address1
                    address2
                    city
                    province
                    zip
                    country
                    phone
                  }
                }
              }
            }`,
            { variables: { contractId } },
          );
          const custData = await custRes.json();
          const addresses =
            custData?.data?.subscriptionContract?.customer?.addresses || [];
          const match = addresses.find((a) => a.id === addressId);

          if (!match) {
            return { success: false, error: "Selected address not found" };
          }
          addressInput = buildAddressInput(match);
        } else {
          addressInput = buildAddressInput({
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            address1: formData.get("address1"),
            address2: formData.get("address2"),
            city: formData.get("city"),
            province: formData.get("province"),
            zip: formData.get("zip"),
            country: formData.get("country"),
            phone: formData.get("phone"),
          });

          if (!addressInput.address1 || !addressInput.city || !addressInput.country) {
            return {
              success: false,
              error: "Address line 1, city aur country zaroori hain",
            };
          }
        }

        const result = await updateContractAddress(admin, contractId, addressInput);
        return result;
      } catch (err) {
        console.error("Update address failed:", err);
        return { success: false, error: String(err?.message || err) };
      }
    }
  }

  const payload = {
     shop: session.shop,
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