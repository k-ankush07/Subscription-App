import { authenticate, unauthenticated } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const UNSKIP_MUTATION = `#graphql
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
`;

const CONTRACT_OWNER_QUERY = `#graphql
  query GetContractOwner($contractId: ID!) {
    subscriptionContract(id: $contractId) {
      id
      customer {
        id
      }
    }
  }
`;

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const body = await request.json();
    let { contractId, cycleIndex } = body || {};

    if (!contractId) {
      return Response.json(
        { success: false, error: "contractId missing" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (/^\d+$/.test(String(contractId))) {
      contractId = `gid://shopify/SubscriptionContract/${contractId}`;
    }

    cycleIndex = parseInt(cycleIndex, 10);
    if (Number.isNaN(cycleIndex)) {
      return Response.json(
        { success: false, error: "Invalid billing cycle index" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const ownerRes = await admin.graphql(CONTRACT_OWNER_QUERY, {
      variables: { contractId },
    });
    const ownerData = await ownerRes.json();
    const contractCustomerId =
      ownerData?.data?.subscriptionContract?.customer?.id;

    if (!contractCustomerId) {
      return Response.json(
        { success: false, error: "Subscription contract not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const tokenCustomerId = sessionToken.sub?.startsWith("gid://")
      ? sessionToken.sub
      : `gid://shopify/Customer/${sessionToken.sub}`;

    if (tokenCustomerId !== contractCustomerId) {
      console.warn(
        `[unskip] ownership mismatch: token=${tokenCustomerId} contractOwner=${contractCustomerId}`,
      );
      return Response.json(
        { success: false, error: "Not authorized to modify this subscription" },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    const res = await admin.graphql(UNSKIP_MUTATION, {
      variables: {
        billingCycleInput: {
          contractId,
          selector: { index: cycleIndex },
        },
      },
    });

    const { data, errors } = await res.json();

    if (errors) {
      console.error("[unskip] GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json(
        { success: false, error: errors },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const payload = data?.subscriptionBillingCycleUnskip;

    if (!payload || payload.userErrors?.length) {
      console.error("[unskip] userErrors:", payload?.userErrors);
      return Response.json(
        {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Unskip failed",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    return Response.json(
      {
        success: true,
        cycleIndex: payload.billingCycle.cycleIndex,
        billingAttemptExpectedDate:
          payload.billingCycle.billingAttemptExpectedDate,
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error("api.subscriptions.unskip error:", err.message, err.stack);
    return Response.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};

export const loader = async () => {
  return new Response("Method not allowed", {
    status: 405,
    headers: CORS_HEADERS,
  });
};