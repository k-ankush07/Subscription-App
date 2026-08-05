import { authenticate, unauthenticated } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = async () => new Response("Method not allowed", { status: 405 });

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

    const body = await request.json().catch(() => ({}));
    const { subscriptionContractId } = body;

    if (!subscriptionContractId) {
      return Response.json(
        { error: "subscriptionContractId is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const res = await admin.graphql(
      `#graphql
      mutation PauseSubscription($contractId: ID!) {
        subscriptionContractPause(subscriptionContractId: $contractId) {
          contract {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { contractId: subscriptionContractId } }
    );

    const { data, errors } = await res.json();

    if (errors) {
      console.error("Pause GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const userErrors = data?.subscriptionContractPause?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.error("Pause userErrors:", userErrors);
      return Response.json(
        { error: userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const contract = data?.subscriptionContractPause?.contract;

    return Response.json({ contract }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("api.subscriptions.pause error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};