import { authenticate, unauthenticated } from "../shopify.server";
import {
  updateContractLineProduct,
  getContractSettingsSnapshot,
  snapshotContractSettings,
   getContractPreview, 
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

// contract ki current line (lineId) ka productId nikalta hai, taaki hum
// pata laga sakein ki request "same product ke andar variant change" hai
// ya "bilkul alag product pe swap" hai.
async function getCurrentLineProductId(admin, contractId, lineId) {
  if (!contractId) return null;

  const res = await admin.graphql(
    `
    query getContractLines($id: ID!) {
      subscriptionContract(id: $id) {
        lines(first: 50) {
          edges {
            node {
              id
              productId
            }
          }
        }
      }
    }
    `,
    { variables: { id: contractId } },
  );

  const data = await res.json();
  const lines = data.data?.subscriptionContract?.lines?.edges ?? [];

  if (lineId) {
    const match = lines.find((e) => e.node.id === lineId);
    if (match) return match.node.productId ?? null;
  }

  // lineId na mile ya na diya gaya ho to (single-line subscriptions ke liye)
  // pehli line ka productId fallback ke taur pe use karo.
  return lines[0]?.node.productId ?? null;
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

    const allowVariantChanges = !!settings?.customerProductChanges?.allowVariantChanges;
    const allowProductSwaps = !!settings?.customerProductChanges?.allowProductSwaps;
    const optionsCount = settings?.products?.length ?? 0;

    // Naye variant ka product id, aur contract ki current line ka product id —
    // dono compare karke decide karo ki yeh "variant-only change" hai ya
    // "cross-product swap".
    const [newProductId, currentProductId] = await Promise.all([
      getVariantProductId(admin, variantId),
      getCurrentLineProductId(admin, contractId, lineId),
    ]);

    const isSameProduct =
      !!currentProductId && !!newProductId && currentProductId === newProductId;

    const allowed = isSameProduct
      ? allowVariantChanges
      : allowProductSwaps && optionsCount > 1;

    if (!allowed) {
      return json(
        {
          success: false,
          error: isSameProduct
            ? "Variant change is not available for this subscription"
            : "Product swap is not available for this subscription",
        },
        403,
      );
    }

    const keepDiscounts = !!settings?.customerProductChanges?.keepDiscounts;
    let discountFractionOverride = null;
if (keepDiscounts) {
  try {
    const previewBeforeSwap = await getContractPreview(admin, contractId);
    const baseLineItem = previewBeforeSwap?.nextOrder?.lineItems?.find((li) => li.isBaseLine);
    const orig = Number(baseLineItem?.originalPricePerUnit?.amount);
    const disc = Number(baseLineItem?.pricePerUnit?.amount);
    if (orig > 0 && !Number.isNaN(disc)) {
      discountFractionOverride = Math.max(0, (orig - disc) / orig);
    }
  } catch (err) {
    console.warn(`[swap_product] failed to compute discount fraction from preview for ${contractId}:`, err);
  }
}

    const result = await updateContractLineProduct(admin, contractId, {
      lineId,
      variantId,
      quantity: quantity ?? 1,
      keepDiscount: keepDiscounts,
      allowQuantityChanges: !!settings?.customerProductChanges?.allowQuantityChanges,
       discountFractionOverride,
    });

    if (!result.success) {
      return json({ success: false, error: result.error }, 400);
    }
     if (settings) {
      try {
        const clonedSettings = JSON.parse(JSON.stringify(settings));
        let changed = false;

        if (!clonedSettings.beforeDiscountDisabled) {
          clonedSettings.beforeDiscountDisabled = true;
          changed = true;
        }
        if (clonedSettings.changeDiscountAfterOrders) {
          clonedSettings.changeDiscountAfterOrders = false;
          changed = true;
        }

        if (changed) {
          await snapshotContractSettings(admin, contractId, clonedSettings);
        }
      } catch (err) {
        console.warn(
          `[swap_product] failed to persist discount-disable flags for ${contractId}:`,
          err,
        );
      }
    }

    // if (!keepDiscounts && settings) {
    //   try {
    //     const clonedSettings = JSON.parse(JSON.stringify(settings));
    //     let changed = false;

    //     if (!clonedSettings.beforeDiscountDisabled) {
    //       clonedSettings.beforeDiscountDisabled = true;
    //       changed = true;
    //     }
    //     if (clonedSettings.changeDiscountAfterOrders) {
    //       clonedSettings.changeDiscountAfterOrders = false;
    //       changed = true;
    //     }

    //     if (changed) {
    //       await snapshotContractSettings(admin, contractId, clonedSettings);
    //     }
    //   } catch (err) {
    //     console.warn(
    //       `[swap_product] failed to persist discount-disable flags for ${contractId}:`,
    //       err,
    //     );
    //   }
    // }

    // Sirf cross-product swap ke case me hi automation-conflict clear karna
    // zaroori hai — variant-only change me product khud change nahi hua,
    // isliye source-product automation entries clash nahi karti.
    if (!isSameProduct) {
      try {
        await clearConflictingAutomationForProduct(admin, contractId, newProductId);
      } catch (err) {
        console.warn(
          `[swap_product] clearConflictingAutomationForProduct failed for ${contractId}:`,
          err,
        );
      }
    }

    return json({ success: true }, 200);
  } catch (err) {
    console.error("api.subscriptions.swap-product error:", err);
    return json({ success: false, error: err.message || "Unknown error" }, 500);
  }
};