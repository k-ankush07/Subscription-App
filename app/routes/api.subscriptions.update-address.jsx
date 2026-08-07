import { authenticate, unauthenticated } from "../shopify.server";
import { updateContractAddress } from "../lib/billing-preview.server";

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
    const { contractId, customerId, address } = body;

    if (!contractId || !address?.address1 || !address?.city || !address?.country) {
      return Response.json(
        { success: false, error: "Missing required address fields" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const ownerRes = await admin.graphql(
      `#graphql
      query VerifyOwner($id: ID!) {
        subscriptionContract(id: $id) {
          customer {
            id
          }
        }
      }`,
      { variables: { id: contractId } },
    );
    const ownerData = await ownerRes.json();
    const ownerId = ownerData?.data?.subscriptionContract?.customer?.id;
    const numericOwnerId = ownerId?.split("/").pop();
    const numericCustomerId = String(customerId || "").split("/").pop();

    if (!ownerId || numericOwnerId !== numericCustomerId) {
      return Response.json(
        { success: false, error: "Not authorized to edit this subscription" },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    const result = await updateContractAddress(admin, contractId, {
      firstName: address.firstName || "",
      lastName: address.lastName || "",
      address1: address.address1 || "",
      address2: address.address2 || "",
      city: address.city || "",
      province: address.province || "",
      zip: address.zip || "",
      country: address.country || "",
      phone: address.phone || undefined,
    });

    return Response.json(result, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("api.subscriptions.update-address error:", err.message, err.stack);
    return Response.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};