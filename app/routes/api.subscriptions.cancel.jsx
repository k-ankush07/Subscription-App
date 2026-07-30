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

    if (!subscriptionContractId) {
      return Response.json(
        { error: "subscriptionContractId is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const res = await admin.graphql(
      `#graphql
      mutation CancelSubscriptionContract($subscriptionContractId: ID!) {
        subscriptionContractCancel(subscriptionContractId: $subscriptionContractId) {
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
      { variables: { subscriptionContractId } }
    );

    const { data, errors } = await res.json();

    if (errors) {
      console.error("Cancel subscription GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const userErrors = data?.subscriptionContractCancel?.userErrors ?? [];
    if (userErrors.length > 0) {
      return Response.json(
        { error: userErrors[0].message || "Unable to cancel subscription" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    return Response.json(
      { success: true, subscription: data?.subscriptionContractCancel?.contract },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("api.subscriptions.cancel error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};
