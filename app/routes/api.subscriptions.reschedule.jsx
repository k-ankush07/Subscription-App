



import { authenticate, unauthenticated } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const body = await request.json();
    const subscriptionContractId = body.subscriptionContractId;
    const billingCycleIndex = Number.isFinite(Number(body.billingCycleIndex))
      ? Number(body.billingCycleIndex)
      : 0;
    const newDate = body.newDate;

    if (!subscriptionContractId || !newDate) {
      return Response.json(
        { error: "subscriptionContractId and newDate are required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // What the customer actually asked for, as a plain calendar date string.
    // Used later purely for comparison — never re-parsed through `new Date()`.
    const requestedDateOnly = newDate; // e.g. "2026-07-12"
    const effectiveDateTime = `${newDate}T00:00:00.000Z`;

    const makeRequest = async (index, dateTime) => {
      return admin.graphql(
        `#graphql
        mutation RescheduleSubscriptionCycle($subscriptionContractId: ID!, $index: Int!, $newDate: DateTime!) {
          subscriptionBillingCycleScheduleEdit(
            billingCycleInput: { contractId: $subscriptionContractId, selector: { index: $index } }
            input: { billingDate: $newDate, reason: BUYER_INITIATED }
          ) {
            billingCycle {
              cycleIndex
              billingAttemptExpectedDate
            }
            userErrors {
              field
              message
            }
          }
        }`,
        { variables: { subscriptionContractId, index, newDate: dateTime } }
      );
    };

    let res = await makeRequest(billingCycleIndex, effectiveDateTime);
    let payload = await res.json();

    const userErrors1 = payload?.data?.subscriptionBillingCycleScheduleEdit?.userErrors ?? [];
    const indexOutOfRange = userErrors1.some((error) =>
      /outside of index range/i.test(error?.message || "")
    );

    if (indexOutOfRange && billingCycleIndex !== 1) {
      console.warn(
        `billingCycleIndex ${billingCycleIndex} out of range for contract ${subscriptionContractId} (likely already elapsed/locked). Falling back to index 1, the next editable cycle.`
      );
      res = await makeRequest(1, effectiveDateTime);
      payload = await res.json();
    }

    const { data, errors } = payload;

    const confirmedCycle = data?.subscriptionBillingCycleScheduleEdit?.billingCycle;
    const confirmedDateOnly = confirmedCycle?.billingAttemptExpectedDate
      ? confirmedCycle.billingAttemptExpectedDate.slice(0, 10)
      : null;

    // THIS is the key diagnostic: does Shopify's own mutation response
    // already differ from what we asked for? If so, Shopify adjusted it
    // at write time (most likely a minimum-notice / cutoff rule, or the
    // shop's fixed billing-attempt time-of-day) — it is not a bug in this
    // route or in the extension.
    console.log(
      "subscriptionBillingCycleScheduleEdit result:",
      JSON.stringify(
        {
          requestedDateOnly,
          requestedIndex: billingCycleIndex,
          confirmedBillingCycle: confirmedCycle,
          dateWasAdjusted: confirmedDateOnly !== null && confirmedDateOnly !== requestedDateOnly,
          userErrors: data?.subscriptionBillingCycleScheduleEdit?.userErrors,
        },
        null,
        2
      )
    );

    if (errors) {
      console.error("Reschedule subscription GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const userErrors = data?.subscriptionBillingCycleScheduleEdit?.userErrors ?? [];
    if (userErrors.length > 0) {
      return Response.json(
        { error: userErrors[0].message || "Unable to reschedule this order" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const dateWasAdjusted =
      confirmedDateOnly !== null && confirmedDateOnly !== requestedDateOnly;

    // Always trust what Shopify confirmed (confirmedCycle), never what the
    // customer requested, and tell the client explicitly if it changed so
    // the UI can show an honest message instead of a silently-wrong date.
    return Response.json(
      {
        success: true,
        billingCycle: confirmedCycle,
        requestedDate: requestedDateOnly,
        dateWasAdjusted,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("api.subscriptions.reschedule error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};


