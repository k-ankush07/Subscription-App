import { authenticate, unauthenticated } from "../shopify.server";
import { updateContractLineProduct, getContractSettingsSnapshot } from "../lib/billing-preview.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const loader = () =>
  new Response("Use POST", { status: 405, headers: CORS_HEADERS });

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const body = await request.json();
    const { contractId, lineId, variantId, quantity } = body || {};

    if (!contractId || !variantId) {
      return json({ success: false, error: "contractId and variantId required" }, 400);
    }

    // Server-side permission check — client flag sirf UI ke liye hai, yahan real check hai
    const settings = await getContractSettingsSnapshot(admin, contractId);
    const allowed = !!settings?.customerProductChanges?.allowProductSwaps;
    const optionsCount = settings?.products?.length ?? 0;

    if (!allowed || optionsCount <= 1) {
      return json(
        { success: false, error: "Product swap is not available for this subscription" },
        403,
      );
    }

    const result = await updateContractLineProduct(admin, contractId, {
      lineId,
      variantId,
      quantity: quantity ?? 1,
    });

    if (!result.success) {
      return json({ success: false, error: result.error }, 400);
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("api.subscriptions.swap-product error:", err);
    return json({ success: false, error: err.message || "Unknown error" }, 500);
  }
};