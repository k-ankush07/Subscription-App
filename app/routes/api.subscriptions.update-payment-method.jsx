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

    const { contractId, paymentMethodId } = await request.json();

    if (!contractId || !paymentMethodId) {
      return Response.json(
        { success: false, error: "contractId aur paymentMethodId dono zaroori hain" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const res = await admin.graphql(
      `#graphql
      mutation SetSubscriptionPaymentMethod($contractId: ID!, $paymentMethodId: ID!) {
        subscriptionContractSetPaymentMethod(
          subscriptionContractId: $contractId
          paymentMethodId: $paymentMethodId
        ) {
          contract {
            id
            customerPaymentMethod {
              id
              instrument {
                ... on CustomerCreditCard {
                  brand
                  lastDigits
                  expiryMonth
                  expiryYear
                  name
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { contractId, paymentMethodId } },
    );

    const { data, errors } = await res.json();
    if (errors) {
      console.error("update-payment-method GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ success: false, error: errors[0]?.message }, { status: 500, headers: CORS_HEADERS });
    }

    const payload = data?.subscriptionContractSetPaymentMethod;
    if (payload?.userErrors?.length) {
      return Response.json(
        { success: false, error: payload.userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const pm = payload?.contract?.customerPaymentMethod;
    const paymentMethod = pm?.instrument
      ? {
          id: pm.id,
          brand: pm.instrument.brand ?? null,
          lastDigits: pm.instrument.lastDigits ?? null,
          expiryMonth: pm.instrument.expiryMonth ?? null,
          expiryYear: pm.instrument.expiryYear ?? null,
          cardHolderName: pm.instrument.name ?? null,
        }
      : null;

    return Response.json({ success: true, paymentMethod }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("update-payment-method error:", err.message, err.stack);
    return Response.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};