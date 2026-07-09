import { authenticate } from "../shopify.server";
import { getContractPreview } from "../lib/billing-preview.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  let contractId = url.searchParams.get("contractId");

  if (!contractId) {
    return new Response(
      JSON.stringify({ error: "Pass ?contractId=gid://shopify/SubscriptionContract/123 (or just the numeric id)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!contractId.startsWith("gid://")) {
    contractId = `gid://shopify/SubscriptionContract/${contractId}`;
  }
  try {
    const preview = await getContractPreview(admin, contractId);
    if (!preview) {
      return new Response(JSON.stringify({ error: "Contract not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    let cycleCommittedState = null;
    if (preview.nextOrder?.cycleIndex != null) {
      try {
        const cycleRes = await admin.graphql(`
          query getCycleDetails($contractId: ID!, $index: Int!) {
            subscriptionBillingCycle(
              billingCycleInput: { contractId: $contractId, selector: { index: $index } }
            ) {
              cycleIndex
              billingAttemptExpectedDate
              skipped
            }
          }
        `, { variables: { contractId, index: preview.nextOrder.cycleIndex } });

        const cycleData = await cycleRes.json();
        if (cycleData.errors) {
          cycleCommittedState = { error: cycleData.errors[0]?.message || "unknown GraphQL error" };
        } else {
          cycleCommittedState = cycleData.data?.subscriptionBillingCycle || null;
        }
      } catch (err) {
        cycleCommittedState = { error: String(err?.message || err) };
      }
    }

    // ── Billing attempt history ──
    // This is the piece that was missing before: without it, there's no way
    // to tell from this endpoint whether a previously-triggered charge
    // (subscriptionBillingCycleCharge) actually succeeded, is still stuck
    // "pending", or silently failed — which is exactly what determines
    // whether nextOrder.cycleIndex ever advances. `ready: true` + an order
    // id means the charge completed and an order exists; `ready: false`
    // with no order after a long time usually means it's stuck or the
    // customer's payment needs attention.
    let billingAttempts = null;
    try {
      const attemptsRes = await admin.graphql(`
        query getBillingAttempts($contractId: ID!) {
          subscriptionContract(id: $contractId) {
            billingAttempts(first: 10, reverse: true) {
              edges {
                node {
                  id
                  ready
                  errorMessage
                  errorCode
                  order {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `, { variables: { contractId } });

      const attemptsData = await attemptsRes.json();
      if (attemptsData.errors) {
        billingAttempts = { error: attemptsData.errors[0]?.message || "unknown GraphQL error" };
      } else {
        billingAttempts = (attemptsData.data?.subscriptionContract?.billingAttempts?.edges || []).map(
          (e) => e.node
        );
      }
    } catch (err) {
      billingAttempts = { error: String(err?.message || err) };
    }

    let billingPolicy = null;
    try {
      const policyRes = await admin.graphql(`
        query getBillingPolicy($contractId: ID!) {
          subscriptionContract(id: $contractId) {
            billingPolicy {
              ... on SubscriptionBillingPolicy {
                interval
                intervalCount
                minCycles
                maxCycles
              }
            }
          }
        }
      `, { variables: { contractId } });

      const policyData = await policyRes.json();
      if (policyData.errors) {
        billingPolicy = { error: policyData.errors[0]?.message || "unknown GraphQL error" };
      } else {
        const bp = policyData.data?.subscriptionContract?.billingPolicy || null;
        billingPolicy = bp
          ? {
              ...bp,
              hasEndDate: !!(bp.maxCycles && bp.maxCycles > 0),
              summary:
                bp.maxCycles && bp.maxCycles > 0
                  ? `Ends automatically after ${bp.maxCycles} cycles`
                  : "Unlimited — runs until cancelled",
            }
          : null;
      }
    } catch (err) {
      billingPolicy = { error: String(err?.message || err) };
    }

    return new Response(
      JSON.stringify({ ...preview, cycleCommittedState, billingAttempts, billingPolicy }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[contract-preview] failed:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};