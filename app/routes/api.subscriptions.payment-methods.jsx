import { authenticate, unauthenticated } from "../shopify.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const loader = async ({ request }) => {
  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const url = new URL(request.url);
    let customerId = url.searchParams.get("customerId");

    if (!customerId) {
      return Response.json(
        { error: "customerId missing" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (/^\d+$/.test(customerId)) {
      customerId = `gid://shopify/Customer/${customerId}`;
    }

    const res = await admin.graphql(
      `#graphql
      query GetCustomerPaymentMethods($customerId: ID!) {
        customer(id: $customerId) {
          paymentMethods(first: 20) {
            edges {
              node {
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
          }
        }
      }`,
      { variables: { customerId } },
    );

    const { data, errors } = await res.json();
    if (errors) {
      console.error("payment-methods GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const edges = data?.customer?.paymentMethods?.edges ?? [];
    const methods = edges
      .map((e) => e.node)
      .filter((n) => n.instrument)
      .map((n) => ({
        id: n.id,
        brand: n.instrument.brand ?? null,
        lastDigits: n.instrument.lastDigits ?? null,
        expiryMonth: n.instrument.expiryMonth ?? null,
        expiryYear: n.instrument.expiryYear ?? null,
        cardHolderName: n.instrument.name ?? null,
      }));

    return Response.json({ paymentMethods: methods }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("payment-methods error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};