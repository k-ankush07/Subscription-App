import { authenticate } from "../shopify.server";
import crypto from "crypto";

const CRON_SECRET = process.env.CRON_SECRET;

// A helper to create a unique idempotency key per attempt
function createIdempotencyKey(contractId: string) {
  // contractId + timestamp + random value => practically unique
  return crypto
    .createHash("sha256")
    .update(`${contractId}:${Date.now()}:${Math.random()}`)
    .digest("hex");
}

export async function action({ request, params }) {
  // 1. Verify cron secret
  const headerSecret = request.headers.get("x-cron-secret");
  if (!CRON_SECRET || headerSecret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Get subscription contract ID
  const subscriptionId = params.id; // from the route param
  if (!subscriptionId) {
    return new Response("Missing subscription ID", { status: 400 });
  }

  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  // 3. Get authenticated admin client
  const { admin } = await authenticate.admin(request);

  // 4. Create a unique idempotency key
  const idempotencyKey = createIdempotencyKey(contractId);

  // 5. Call the subscriptionBillingAttemptCreate mutation
  const graphqlResponse = await admin.graphql(
    `
    mutation CreateSubscriptionBillingAttempt(
      $contractId: ID!
      $idempotencyKey: String!
    ) {
      subscriptionBillingAttemptCreate(
        subscriptionContractId: $contractId
        subscriptionBillingAttemptInput: {
          idempotencyKey: $idempotencyKey
        }
      ) {
        subscriptionBillingAttempt {
          id
          state
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
        contractId,
        idempotencyKey,
      },
    },
  );

  const data = await graphqlResponse.json();
  const payload = data?.data?.subscriptionBillingAttemptCreate;

  if (!payload) {
    console.error("Billing attempt failed: no payload", data?.errors);
    return new Response(
      JSON.stringify({
        success: false,
        error: "No payload returned",
        rawErrors: data?.errors || null,
      }),
      { status: 500 },
    );
  }

  if (payload.userErrors?.length) {
    console.error("Billing attempt userErrors", payload.userErrors);
    return new Response(
      JSON.stringify({
        success: false,
        error: payload.userErrors.map((e) => e.message).join(", "),
        userErrors: payload.userErrors,
      }),
      { status: 400 },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      billingAttemptId: payload.subscriptionBillingAttempt?.id,
      state: payload.subscriptionBillingAttempt?.state,
    }),
    { status: 200 },
  );
}