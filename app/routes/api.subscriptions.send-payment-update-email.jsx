import { authenticate, unauthenticated } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = () => new Response("Use POST", { status: 405 });

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

    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return Response.json(
        { success: false, error: "paymentMethodId zaroori hai" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const res = await admin.graphql(
      `#graphql
      mutation SendCustomerPaymentUpdateEmail($customerPaymentMethodId: ID!) {
        customerPaymentMethodSendUpdateEmail(customerPaymentMethodId: $customerPaymentMethodId) {
          customer { id }
          userErrors { field message }
        }
      }`,
      { variables: { customerPaymentMethodId: paymentMethodId } },
    );

    const { data, errors } = await res.json();
    if (errors) {
      console.error("send-payment-update-email GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ success: false, error: errors[0]?.message }, { status: 500, headers: CORS_HEADERS });
    }

    const payload = data?.customerPaymentMethodSendUpdateEmail;
    if (payload?.userErrors?.length) {
      return Response.json(
        { success: false, error: payload.userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    return Response.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("send-payment-update-email error:", err.message, err.stack);
    return Response.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};