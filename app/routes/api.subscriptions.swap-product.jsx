import { authenticate, unauthenticated } from "../shopify.server";
import {
  updateContractLineProduct,
  getContractSettingsSnapshot,
  snapshotContractSettings,
} from "../lib/billing-preview.server";

async function getVariantProductId(admin, variantId) {
  if (!variantId) return null;
  const res = await admin.graphql(
    `
    query getVariantProduct($id: ID!) {
      productVariant(id: $id) {
        product { id }
      }
    }
    `,
    { variables: { id: variantId } },
  );
  const data = await res.json();
  return data.data?.productVariant?.product?.id ?? null;
}


async function clearConflictingAutomationForProduct(admin, contractId, newProductId) {
  if (!newProductId) return;
  const settings = await getContractSettingsSnapshot(admin, contractId);
  if (!settings || !Array.isArray(settings.automationCycles)) return;

  const cloned = JSON.parse(JSON.stringify(settings));
  let changed = false;

  cloned.automationCycles = cloned.automationCycles
    .map((entry) => {
      const nextActions = (entry.actions ?? []).filter((action) => {
        const isConflictingSwap =
          action.type === "swap" && action.sourceProductId === newProductId;
        if (isConflictingSwap) changed = true;
        return !isConflictingSwap;
      });
      return { ...entry, actions: nextActions };
    })
    .filter((entry) => entry.actions.length > 0);

  if (changed) {
    await snapshotContractSettings(admin, contractId, cloned);
  }
}

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
  keepDiscount: !!settings?.customerProductChanges?.keepDiscounts,
  allowQuantityChanges: !!settings?.customerProductChanges?.allowQuantityChanges, // NEW LINE
})

    if (!result.success) {
      return json({ success: false, error: result.error }, 400);
    }

    // Manual swap safal — ab check karo ki merchant ki automation isi naye
    // product ko future me phir se kahin aur swap toh nahi karne wali.
    try {
      const newProductId = await getVariantProductId(admin, variantId);
      await clearConflictingAutomationForProduct(admin, contractId, newProductId);
    } catch (err) {
      console.warn(
        `[swap_product] clearConflictingAutomationForProduct failed for ${contractId}:`,
        err,
      );
      // Yeh best-effort hai — swap khud successful ho chuka hai, isliye fail nahi karna.
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("api.subscriptions.swap-product error:", err);
    return json({ success: false, error: err.message || "Unknown error" }, 500);
  }
};