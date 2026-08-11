import {
  updateContractLineProduct,
  getContractSettingsSnapshot,
  snapshotContractSettings,
} from "../lib/billing-preview.server";

// ... existing getVariantProductId, clearConflictingAutomationForProduct same rehne do ...

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

    const keepDiscounts = !!settings?.customerProductChanges?.keepDiscounts;

    const result = await updateContractLineProduct(admin, contractId, {
      lineId,
      variantId,
      quantity: quantity ?? 1,
      keepDiscount: keepDiscounts,
      allowQuantityChanges: !!settings?.customerProductChanges?.allowQuantityChanges,
    });

    if (!result.success) {
      return json({ success: false, error: result.error }, 400);
    }

    // NEW: keepDiscounts false hai → native discount tier permanently disable karo
    // taaki future me chahe koi bhi product/variant line pe ho (swap back bhi),
    // wo discount phir se auto-apply na ho.
    if (!keepDiscounts && settings) {
      try {
        const clonedSettings = JSON.parse(JSON.stringify(settings));
        if (!clonedSettings.beforeDiscountDisabled) {
          clonedSettings.beforeDiscountDisabled = true;
          await snapshotContractSettings(admin, contractId, clonedSettings);
        }
      } catch (err) {
        console.warn(
          `[swap_product] failed to persist beforeDiscountDisabled for ${contractId}:`,
          err,
        );
        // best-effort — swap khud successful ho chuka hai, fail nahi karna
      }
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
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("api.subscriptions.swap-product error:", err);
    return json({ success: false, error: err.message || "Unknown error" }, 500);
  }
};