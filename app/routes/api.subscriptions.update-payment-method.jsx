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

    // Step 1: contract se draft banao
    const draftRes = await admin.graphql(
      `#graphql
      mutation CreateDraft($contractId: ID!) {
        subscriptionContractUpdate(contractId: $contractId) {
          draft { id }
          userErrors { field message }
        }
      }`,
      { variables: { contractId } },
    );
    const draftJson = await draftRes.json();
    if (draftJson.errors) {
      console.error("subscriptionContractUpdate errors:", JSON.stringify(draftJson.errors, null, 2));
      return Response.json({ success: false, error: draftJson.errors[0]?.message }, { status: 500, headers: CORS_HEADERS });
    }
    const draftPayload = draftJson.data?.subscriptionContractUpdate;
    if (draftPayload?.userErrors?.length) {
      return Response.json(
        { success: false, error: draftPayload.userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const draftId = draftPayload?.draft?.id;
    if (!draftId) {
      return Response.json({ success: false, error: "Draft create failed" }, { status: 500, headers: CORS_HEADERS });
    }

    // Step 2: draft me naya payment method set karo
    const updateRes = await admin.graphql(
      `#graphql
      mutation UpdateDraftPaymentMethod($draftId: ID!, $paymentMethodId: ID!) {
        subscriptionDraftUpdate(draftId: $draftId, input: { paymentMethodId: $paymentMethodId }) {
          draft { id }
          userErrors { field message }
        }
      }`,
      { variables: { draftId, paymentMethodId } },
    );
    const updateJson = await updateRes.json();
    if (updateJson.errors) {
      console.error("subscriptionDraftUpdate errors:", JSON.stringify(updateJson.errors, null, 2));
      return Response.json({ success: false, error: updateJson.errors[0]?.message }, { status: 500, headers: CORS_HEADERS });
    }
    const updatePayload = updateJson.data?.subscriptionDraftUpdate;
    if (updatePayload?.userErrors?.length) {
      return Response.json(
        { success: false, error: updatePayload.userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Step 3: draft commit karo — ye asli contract update karega
    const commitRes = await admin.graphql(
      `#graphql
      mutation CommitDraft($draftId: ID!) {
        subscriptionDraftCommit(draftId: $draftId) {
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
          userErrors { field message }
        }
      }`,
      { variables: { draftId } },
    );
    const { data, errors } = await commitRes.json();
    if (errors) {
      console.error("subscriptionDraftCommit errors:", JSON.stringify(errors, null, 2));
      return Response.json({ success: false, error: errors[0]?.message }, { status: 500, headers: CORS_HEADERS });
    }

    const payload = data?.subscriptionDraftCommit;
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