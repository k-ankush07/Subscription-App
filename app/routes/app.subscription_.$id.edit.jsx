import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";
import {
  useLoaderData,
  useNavigate,
  useFetcher,
  useParams,
} from "react-router";
import {
  Page,
  Card,
  Button,
  TextField,
  Select,
  Text,
  InlineStack,
  BlockStack,
  Thumbnail,
  Badge,
  Divider,
  Banner,
  Modal,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import {
  updateContractLineProduct,
  updateContractDeliveryDetails,
  removeContractLine,
  addContractLine,
  updateContractLinePrice,
  getContractPreview,
  getEffectiveSettingsForContract,
  removeAutomationVariant,
  updateAutomationVariantQuantity,
  setAutomationVariantPrice,
  snapshotContractSettings,
  addBaseLineRemoval,
  setBaseLineFixedPrice,
   setLineFixedPrice,
} from "../lib/billing-preview.server";

export async function loader({ params, request }) {
  const { admin, session } = await authenticate.admin(request);

  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  const res = await admin.graphql(
    `
    query GetContractForEdit($contractId: ID!) {
      subscriptionContract(id: $contractId) {
        id
        status
        deliveryPrice { amount currencyCode }
        deliveryPolicy { interval intervalCount }
        billingPolicy { interval intervalCount }
        lines(first: 50) {
          edges {
            node {
              id
              title
              variantTitle
              quantity
              productId
              variantId
              sellingPlanId
              currentPrice { amount currencyCode }
              variantImage { url }
            }
          }
        }
      }
    }
    `,
    { variables: { contractId } },
  );

  const data = await res.json();
  const contract = data?.data?.subscriptionContract;
  // console.log('vjdbvjdbvjh',contract)

  if (!contract) {
    throw new Response("Subscription not found", { status: 404 });
  }

  const lines = contract.lines.edges.map((e) => e.node);

  const variantIds = lines.map((l) => l.variantId).filter(Boolean);
  let variantPriceMap = {};
  if (variantIds.length > 0) {
    const variantRes = await admin.graphql(
      `
      query GetVariantPrices($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            price
          }
        }
      }
      `,
      { variables: { ids: variantIds } },
    );
    const variantData = await variantRes.json();
    for (const node of variantData?.data?.nodes ?? []) {
      if (node?.id) variantPriceMap[node.id] = node.price;
    }
  }

  const linesWithOneTimePrice = lines.map((l) => ({
    ...l,
    oneTimePrice: variantPriceMap[l.variantId] ?? null,
  }));

  const preview = await getContractPreview(admin, contractId);
  const willApply = Array.isArray(preview?.nextOrder?.willApply)
    ? preview.nextOrder.willApply
    : [];
  const removedVariantIds = willApply
    .filter((a) => a.type === "REMOVE_VARIANT" && a.sourceVariantId)
    .map((a) => a.sourceVariantId);
  const removedProductIds = willApply
    .filter((a) => a.type === "REMOVE_PRODUCT" && a.sourceProductId)
    .map((a) => a.sourceProductId);
  const currencyCode =
    contract.deliveryPrice?.currencyCode ||
    lines[0]?.currentPrice?.currencyCode ||
    "INR";

  return {
    contract,
    lines: linesWithOneTimePrice,
    previewLineItems: preview?.nextOrder?.lineItems || [],
    previewNextOrderCycleIndex: preview?.nextOrder?.cycleIndex ?? 0,
    removedVariantIds, // NEW
    removedProductIds,
    currencyCode,
    subscriptionId,
    shop: session.shop,
  };
}

export async function action({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;

  const type = formData.get("type");

  if (type === "save_draft") {
    try {
      const payload = JSON.parse(formData.get("payload"));

      const resultingRealLines =
        (payload.lines?.length || 0) + (payload.newLines?.length || 0);

      let removedLines = payload.removedLines || [];
      let deferredRemoval = null;

      // Agar sab committed/new lines hat rahi hain, to aakhri wali ko
      // turant delete karne ke bajaye "scheduled removal" bana do —
      // bilkul detail page ke "Remove" jaisa. Isse Shopify ka
      // "at least one line" error kabhi nahi aayega.
      if (resultingRealLines === 0 && removedLines.length > 0) {
        deferredRemoval = removedLines[removedLines.length - 1];
        removedLines = removedLines.slice(0, -1);
      }

      for (const newLine of payload.newLines || []) {
        const result = await addContractLine(admin, contractId, {
          variantId: newLine.variantId,
          quantity: Number(newLine.quantity) || 1,
          currentPrice: newLine.price != null ? Number(newLine.price) : null,
        });
        if (!result.success) return { success: false, error: result.error };
      }

      for (const line of payload.lines) {
        const result = await updateContractLineProduct(admin, contractId, {
          lineId: line.lineId,
          variantId: line.variantId,
          quantity: Number(line.quantity) || 1,
          keepDiscount: true,
          allowQuantityChanges: true,
        });
        if (!result.success) return { success: false, error: result.error };
      }

      for (const removed of removedLines) {
        const result = await removeContractLine(
          admin,
          contractId,
          removed.lineId,
        );
        if (!result.success) return { success: false, error: result.error };
      }

      if (deferredRemoval) {
        const currentSettings = await getEffectiveSettingsForContract(
          admin,
          contractId,
          null,
        );
        const updatedSettings = addBaseLineRemoval(
          currentSettings,
          payload.nextOrderCycleIndex ?? 0,
          deferredRemoval.productId,
          deferredRemoval.variantId,
        );
        const { snapshotted } = await snapshotContractSettings(
          admin,
          contractId,
          updatedSettings,
        );
        if (!snapshotted) {
          return {
            success: false,
            error: "Failed to schedule removal of last product",
          };
        }
      }

      const deliveryResult = await updateContractDeliveryDetails(
        admin,
        contractId,
        {
          interval: payload.deliveryInterval,
          intervalCount: payload.deliveryCount,
          deliveryPrice: payload.deliveryPrice,
        },
      );
      if (!deliveryResult.success) {
        return { success: false, error: deliveryResult.error };
      }

      return { success: true };
    } catch (err) {
      console.error("[edit save_draft] failed:", err);
      return { success: false, error: String(err?.message || err) };
    }
  }

  if (type === "remove_automation_item") {
    const automationCycleIndex = parseInt(
      formData.get("automationCycleIndex"),
      10,
    );
    const automationActionIndex = parseInt(
      formData.get("automationActionIndex"),
      10,
    );
    const variantId = formData.get("variantId") || null;
    const sellingPlanId = formData.get("sellingPlanId") || null;

    if (
      Number.isNaN(automationCycleIndex) ||
      Number.isNaN(automationActionIndex)
    ) {
      return { success: false, error: "Invalid automation item reference" };
    }

    try {
      const currentSettings = await getEffectiveSettingsForContract(
        admin,
        contractId,
        sellingPlanId,
      );
      if (!currentSettings) {
        return {
          success: false,
          error: "No automation settings found for this subscription",
        };
      }
      const updatedSettings = removeAutomationVariant(
        currentSettings,
        automationCycleIndex,
        automationActionIndex,
        variantId,
      );
      const { snapshotted } = await snapshotContractSettings(
        admin,
        contractId,
        updatedSettings,
      );
      if (!snapshotted) {
        return {
          success: false,
          error: "Failed to save updated automation settings",
        };
      }
      return { success: true, isAutomationChange: true };
    } catch (err) {
      console.error("[edit remove_automation_item] failed:", err);
      return { success: false, error: String(err?.message || err) };
    }
  }

  if (type === "update_automation_quantity") {
    const automationCycleIndex = parseInt(
      formData.get("automationCycleIndex"),
      10,
    );
    const automationActionIndex = parseInt(
      formData.get("automationActionIndex"),
      10,
    );
    const quantity = formData.get("quantity");
    const sellingPlanId = formData.get("sellingPlanId") || null;

    if (
      Number.isNaN(automationCycleIndex) ||
      Number.isNaN(automationActionIndex)
    ) {
      return { success: false, error: "Invalid automation item reference" };
    }

    try {
      const currentSettings = await getEffectiveSettingsForContract(
        admin,
        contractId,
        sellingPlanId,
      );
      if (!currentSettings) {
        return {
          success: false,
          error: "No automation settings found for this subscription",
        };
      }
      const updatedSettings = updateAutomationVariantQuantity(
        currentSettings,
        automationCycleIndex,
        automationActionIndex,
        quantity,
      );
      const { snapshotted } = await snapshotContractSettings(
        admin,
        contractId,
        updatedSettings,
      );
      if (!snapshotted) {
        return {
          success: false,
          error: "Failed to save updated automation settings",
        };
      }
      return { success: true, isAutomationChange: true };
    } catch (err) {
      console.error("[edit update_automation_quantity] failed:", err);
      return { success: false, error: String(err?.message || err) };
    }
  }

  // if (type === "update_automation_price") {
  //   const automationCycleIndex = parseInt(
  //     formData.get("automationCycleIndex"),
  //     10,
  //   );
  //   const automationActionIndex = parseInt(
  //     formData.get("automationActionIndex"),
  //     10,
  //   );
  //   const price = formData.get("price");
  //   const sellingPlanId = formData.get("sellingPlanId") || null;

  //   if (
  //     Number.isNaN(automationCycleIndex) ||
  //     Number.isNaN(automationActionIndex)
  //   ) {
  //     return { success: false, error: "Invalid automation item reference" };
  //   }
  //   if (price == null || price === "" || Number.isNaN(Number(price))) {
  //     return { success: false, error: "Invalid price" };
  //   }

  //   try {
  //     const currentSettings = await getEffectiveSettingsForContract(
  //       admin,
  //       contractId,
  //       sellingPlanId,
  //     );
  //     if (!currentSettings) {
  //       return {
  //         success: false,
  //         error: "No automation settings found for this subscription",
  //       };
  //     }
  //     const updatedSettings = setAutomationVariantPrice(
  //       currentSettings,
  //       automationCycleIndex,
  //       automationActionIndex,
  //       price,
  //     );
  //     const { snapshotted } = await snapshotContractSettings(
  //       admin,
  //       contractId,
  //       updatedSettings,
  //     );
  //     if (!snapshotted) {
  //       return {
  //         success: false,
  //         error: "Failed to save updated automation settings",
  //       };
  //     }
  //     return { success: true, isAutomationChange: true };
  //   } catch (err) {
  //     console.error("[edit update_automation_price] failed:", err);
  //     return { success: false, error: String(err?.message || err) };
  //   }
  // }

  if (type === "update_automation_price") {
    const automationCycleIndex = parseInt(
      formData.get("automationCycleIndex"),
      10,
    );
    const automationActionIndex = parseInt(
      formData.get("automationActionIndex"),
      10,
    );
    const price = formData.get("price");
    const sellingPlanId = formData.get("sellingPlanId") || null;

    if (
      Number.isNaN(automationCycleIndex) ||
      Number.isNaN(automationActionIndex)
    ) {
      return {
        success: false,
        error: "Invalid automation item reference",
        type: "update_automation_price",
      };
    }
    if (price == null || price === "" || Number.isNaN(Number(price))) {
      return {
        success: false,
        error: "Invalid price",
        type: "update_automation_price",
      };
    }

    try {
      const currentSettings = await getEffectiveSettingsForContract(
        admin,
        contractId,
        sellingPlanId,
      );
      if (!currentSettings) {
        return {
          success: false,
          error: "No automation settings found for this subscription",
          type: "update_automation_price",
        };
      }
      const updatedSettings = setAutomationVariantPrice(
        currentSettings,
        automationCycleIndex,
        automationActionIndex,
        price,
      );
      const { snapshotted } = await snapshotContractSettings(
        admin,
        contractId,
        updatedSettings,
      );
      if (!snapshotted) {
        return {
          success: false,
          error: "Failed to save updated automation settings",
          type: "update_automation_price",
        };
      }
      return {
        success: true,
        isAutomationChange: true,
        type: "update_automation_price",
        automationCycleIndex,
        automationActionIndex,
        price,
      };
    } catch (err) {
      console.error("[edit update_automation_price] failed:", err);
      return {
        success: false,
        error: String(err?.message || err),
        type: "update_automation_price",
      };
    }
  }

if (type === "update_line_price") {
  const lineId = formData.get("lineId");
  const variantId = formData.get("variantId");   // NEW
  const price = formData.get("price");

  if (!lineId) {
    return { success: false, error: "Invalid line reference", type: "update_line_price" };
  }
  if (price == null || price === "" || Number.isNaN(Number(price))) {
    return { success: false, error: "Invalid price", type: "update_line_price" };
  }

  try {
    const result = await updateContractLinePrice(admin, contractId, { lineId, price });
    if (!result.success) {
      return { success: false, error: result.error, type: "update_line_price" };
    }

    const currentSettings = await getEffectiveSettingsForContract(admin, contractId, null);
    const updatedSettings = variantId
      ? setLineFixedPrice(currentSettings, variantId, price)   // CHANGED
      : setBaseLineFixedPrice(currentSettings, price);          // fallback agar variantId na mile
    const { snapshotted } = await snapshotContractSettings(admin, contractId, updatedSettings);
    if (!snapshotted) {
      return {
        success: false,
        error: "Price updated but failed to save it for future orders",
        type: "update_line_price",
      };
    }

    return { success: true, isAutomationChange: true, type: "update_line_price", lineId, price };
  } catch (err) {
    console.error("[edit update_line_price] failed:", err);
    return { success: false, error: String(err?.message || err), type: "update_line_price" };
  }
}
// if (type === "update_line_price") {
//   const lineId = formData.get("lineId");
  
//   const price = formData.get("price");

//   if (!lineId) {
//     return { success: false, error: "Invalid line reference", type: "update_line_price" };
//   }
//   if (price == null || price === "" || Number.isNaN(Number(price))) {
//     return { success: false, error: "Invalid price", type: "update_line_price" };
//   }

//   try {
//     const result = await updateContractLinePrice(admin, contractId, { lineId, price });
//     if (!result.success) {
//       return { success: false, error: result.error, type: "update_line_price" };
//     }

//     const currentSettings = await getEffectiveSettingsForContract(admin, contractId, null);
//     const updatedSettings = setBaseLineFixedPrice(currentSettings, price);
//     const { snapshotted } = await snapshotContractSettings(admin, contractId, updatedSettings);
//     if (!snapshotted) {
//       return {
//         success: false,
//         error: "Price updated but failed to save it for future orders",
//         type: "update_line_price",
//       };
//     }

//     // NEW — client ko bhej do taaki formData pe depend na karna pade (idle hote hi wo undefined ho jata hai)
//     return {
//       success: true,
//       isAutomationChange: true,
//       type: "update_line_price",
//       lineId,
//       price,
//     };
//   } catch (err) {
//     console.error("[edit update_line_price] failed:", err);
//     return { success: false, error: String(err?.message || err), type: "update_line_price" };
//   }
// }

  return { success: false, error: "Unknown action type" };
}

export default function EditPage() {
  const {
    contract,
    lines: initialLines,
    previewLineItems,
    previewNextOrderCycleIndex,
    removedVariantIds, // NEW
    removedProductIds,
    currencyCode,
  } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { id } = useParams();

  const [lines, setLines] = useState(() =>
    initialLines
      .filter(
        (l) =>
          !removedVariantIds.includes(l.variantId) &&
          !removedProductIds.includes(l.productId),
      )
      .map((l) => {
        const previewMatch = previewLineItems.find(
          (pi) => pi.isBaseLine && pi.variantId === l.variantId,
        );
        const resolvedPrice =
          Number(previewMatch?.pricePerUnit?.amount) ||
          Number(l.currentPrice?.amount) ||
          0;

        return {
          ...l,
          quantity: String(Number(l.quantity) || 1), // "11" jaisa hi rahega, but safe
          displayPrice: resolvedPrice,
          originalPrice: previewMatch?.originalPricePerUnit?.amount ?? null,
          discountLabel: previewMatch?.discountLabel ?? null,
        };
      }),
  );
  const [removedLines, setRemovedLines] = useState([]);
  const [newLines, setNewLines] = useState([]);

  const automationLines = previewLineItems.filter(
    (li) => !li.isBaseLine && li.automationCycleIndex != null,
  );

  const [automationQtyDrafts, setAutomationQtyDrafts] = useState({});

  // Unified price-edit modal state
  // target = { kind: "committed" | "new" | "automation", ...refs }
  const [priceEditTarget, setPriceEditTarget] = useState(null);
  const [priceEditValue, setPriceEditValue] = useState("");
  const [priceEditError, setPriceEditError] = useState("");

  const [deliveryCount, setDeliveryCount] = useState(
    String(contract?.deliveryPolicy?.intervalCount ?? "1"),
  );
  const [deliveryInterval, setDeliveryInterval] = useState(
    contract?.deliveryPolicy?.interval || "DAY",
  );
  // Ab sirf "Pay as you go" hi support hai — Prepaid dropdown hata diya
  const [billingType, setBillingType] = useState("PAYASYOUGO");
  const [deliveryPrice, setDeliveryPrice] = useState(
    String(contract?.deliveryPrice?.amount ?? "0"),
  );

  const isSaving = fetcher.state !== "idle";
  const totalLineCount = lines.length + newLines.length;
  const totalVisibleLineCount = totalLineCount + automationLines.length;
  const sellingPlanId = initialLines?.[0]?.sellingPlanId || "";

  const handleBack = () => navigate(`/app/subscription/${id}`);


  // useEffect(() => {
  //   if (fetcher.state !== "idle" || fetcher.data == null) return;

  //   const submittedType = fetcher.formData?.get("type");
  //   const isPriceEditSubmit =
  //     submittedType === "update_automation_price" ||
  //     submittedType === "update_line_price";

  //   if (fetcher.data.success) {
  //     if (submittedType === "update_line_price") {
  //       const updatedLineId = fetcher.formData?.get("lineId");
  //       const updatedPrice = fetcher.formData?.get("price");
  //       setLines((prev) =>
  //         prev.map((l) =>
  //           l.id === updatedLineId
  //             ? {
  //                 ...l,
  //                 displayPrice: Number(updatedPrice) || 0,
  //                 originalPrice: null,   
  //                 discountLabel: null,   
  //               }
  //             : l,
  //         ),
  //       );
  //     }

  //     if (isPriceEditSubmit) {
  //       setPriceEditTarget(null);
  //       setPriceEditValue("");
  //       setPriceEditError("");
  //     }
  //     if (submittedType === "update_automation_quantity") {
  //       setAutomationQtyDrafts({});
  //     }
  //     if (!fetcher.data.isAutomationChange) {
  //       handleBack();
  //     }
  //   } else if (isPriceEditSubmit) {
  //     setPriceEditError(fetcher.data.error || "Failed to update price");
  //   }
  // }, [fetcher.state, fetcher.data]);
 useEffect(() => {
  if (fetcher.state !== "idle" || fetcher.data == null) return;

  const data = fetcher.data;
  const submittedType = data.type; // CHANGED — ab response se, formData se nahi (idle hote hi formData undefined ho jata hai)

  const isPriceEditSubmit =
    submittedType === "update_automation_price" ||
    submittedType === "update_line_price";

  if (data.success) {
    if (submittedType === "update_line_price") {
      setLines((prev) =>
        prev.map((l) =>
          l.id === data.lineId
            ? {
                ...l,
                displayPrice: Number(data.price) || 0,
                originalPrice: null,
                discountLabel: null,
              }
            : l,
        ),
      );
    }

    if (isPriceEditSubmit) {
      setPriceEditTarget(null);
      setPriceEditValue("");
      setPriceEditError("");
    }
    if (submittedType === "update_automation_quantity") {
      setAutomationQtyDrafts({});
    }
    if (!data.isAutomationChange) {
      handleBack();
    }
  } else if (isPriceEditSubmit) {
    setPriceEditError(data.error || "Failed to update price");
  }
}, [fetcher.state, fetcher.data]);
 
 
 
  const handleQuantityChange = (lineId, value) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, quantity: value } : l)),
    );
  };

  const handleNewLineQuantityChange = (tempId, value) => {
    setNewLines((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, quantity: value } : l)),
    );
  };

  const handleRemoveLine = (lineId, title) => {
    if (totalVisibleLineCount <= 1) return;
    const confirmed = confirm(`"${title}" `);
    if (!confirmed) return;

    const line = lines.find((l) => l.id === lineId);
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    setRemovedLines((prev) => [
      ...prev,
      { lineId, productId: line?.productId, variantId: line?.variantId },
    ]);
  };

  const handleRemoveNewLine = (tempId) => {
    setNewLines((prev) => prev.filter((l) => l.tempId !== tempId));
  };

  const handleRemoveAutomationLine = (li) => {
    const confirmed = confirm(
      `"${li.title}"`,
    );
    if (!confirmed) return;

    fetcher.submit(
      {
        type: "remove_automation_item",
        automationCycleIndex: li.automationCycleIndex,
        automationActionIndex: li.automationActionIndex,
        variantId: li.variantId || "",
        sellingPlanId,
      },
      { method: "post" },
    );
  };

  const automationKey = (li) =>
    `${li.automationCycleIndex}-${li.automationActionIndex}`;

  const getAutomationQty = (li) => {
    const key = automationKey(li);
    return automationQtyDrafts[key] ?? String(li.quantity);
  };

  const handleAutomationQtyInputChange = (li, value) => {
    const key = automationKey(li);
    setAutomationQtyDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleAutomationQtyBlur = (li) => {
    const value = getAutomationQty(li);
    const qty = Math.max(1, Number(value) || 1);
    if (qty === Number(li.quantity)) return;

    fetcher.submit(
      {
        type: "update_automation_quantity",
        automationCycleIndex: li.automationCycleIndex,
        automationActionIndex: li.automationActionIndex,
        quantity: String(qty),
        sellingPlanId,
      },
      { method: "post" },
    );
  };

  const isAutomationQtyPending = (li) =>
    fetcher.state !== "idle" &&
    fetcher.formData?.get("type") === "update_automation_quantity" &&
    fetcher.formData?.get("automationCycleIndex") ===
      String(li.automationCycleIndex) &&
    fetcher.formData?.get("automationActionIndex") ===
      String(li.automationActionIndex);

  const isAutomationRemovePending = (li) =>
    fetcher.state !== "idle" &&
    fetcher.formData?.get("type") === "remove_automation_item" &&
    fetcher.formData?.get("automationCycleIndex") ===
      String(li.automationCycleIndex) &&
    fetcher.formData?.get("automationActionIndex") ===
      String(li.automationActionIndex);

  const openPriceEditor = (kind, item) => {
    setPriceEditError("");
    if (kind === "committed") {
      setPriceEditTarget({ kind, lineId: item.id,variantId: item.variantId, title: item.title });
      setPriceEditValue(String(item.displayPrice ?? "0"));
    } else if (kind === "new") {
      setPriceEditTarget({ kind, tempId: item.tempId, title: item.title });
      setPriceEditValue(String(item.price ?? "0"));
    } else if (kind === "automation") {
      setPriceEditTarget({
        kind,
        automationCycleIndex: item.automationCycleIndex,
        automationActionIndex: item.automationActionIndex,
        title: item.title,
        discountLabel: item.discountLabel,
      });
      setPriceEditValue(String(item.pricePerUnit?.amount ?? "0"));
    }
  };

  const closePriceEditor = () => {
    if (isPriceUpdatePending) return; 
    setPriceEditTarget(null);
    setPriceEditValue("");
    setPriceEditError("");
  };

  const handleUpdatePrice = () => {
    if (!priceEditTarget) return;
    setPriceEditError("");

    if (priceEditTarget.kind === "new") {
      setNewLines((prev) =>
        prev.map((l) =>
          l.tempId === priceEditTarget.tempId
            ? { ...l, price: priceEditValue }
            : l,
        ),
      );
      setPriceEditTarget(null);
      setPriceEditValue("");
      return;
    }

    if (priceEditTarget.kind === "committed") {
      fetcher.submit(
        {
          type: "update_line_price",
          lineId: priceEditTarget.lineId,
           variantId: priceEditTarget.variantId,
          price: priceEditValue,
        },
        { method: "post" },
      );
      return; 
    }

    if (priceEditTarget.kind === "automation") {
      fetcher.submit(
        {
          type: "update_automation_price",
          automationCycleIndex: priceEditTarget.automationCycleIndex,
          automationActionIndex: priceEditTarget.automationActionIndex,
          price: priceEditValue,
          sellingPlanId,
        },
        { method: "post" },
      );
      return; 
    }
  };

  const isPriceUpdatePending =
    fetcher.state !== "idle" &&
    (fetcher.formData?.get("type") === "update_automation_price" ||
      fetcher.formData?.get("type") === "update_line_price");

  const handleAddLineItem = async () => {
    if (!window?.shopify?.resourcePicker) {
      alert("Product picker is not available in this environment.");
      return;
    }

    const selected = await window.shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
    });

    if (!selected || selected.length === 0) return;

    const existingVariantIds = new Set([
      ...lines.map((l) => l.variantId),
      ...newLines.map((l) => l.variantId),
      ...automationLines.map((l) => l.variantId),
    ]);

    const toAdd = [];
    const skippedTitles = [];

    for (const product of selected) {
      const pickedVariants = product.variants || [];

      for (const variant of pickedVariants) {
        if (existingVariantIds.has(variant.id)) {
          skippedTitles.push(`${product.title} (${variant.title})`);
          continue;
        }
        existingVariantIds.add(variant.id);

        toAdd.push({
          tempId: `new-${Date.now()}-${variant.id}`,
          variantId: variant.id,
          title: product.title,
          variantTitle:
            variant.title && variant.title !== "Default Title"
              ? variant.title
              : null,
          imageUrl:
            variant.image?.originalSrc ||
            product.images?.[0]?.originalSrc ||
            "",
          price: variant.price,
          quantity: "1",
        });
      }
    }

    if (toAdd.length > 0) {
      setNewLines((prev) => [...prev, ...toAdd]);
    }

    if (skippedTitles.length > 0) {
      alert(
        `Ye already subscription/upcoming order me hain, skip kar diye:\n${skippedTitles.join("\n")}`,
      );
    }
  };

  const subtotal =
    lines.reduce((sum, l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.displayPrice) || 0;
      return sum + qty * price;
    }, 0) +
    newLines.reduce((sum, l) => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.price) || 0;
      return sum + qty * price;
    }, 0) +
    automationLines.reduce((sum, li) => {
      const qty = Number(getAutomationQty(li)) || 0;
      const price = Number(li.pricePerUnit?.amount) || 0;
      return sum + qty * price;
    }, 0);

  const total = subtotal + (Number(deliveryPrice) || 0);

  const handleSave = () => {
    fetcher.submit(
      {
        type: "save_draft",
        payload: JSON.stringify({
          lines: lines.map((l) => ({
            lineId: l.id,
            variantId: l.variantId,
            quantity: l.quantity,
          })),
          removedLines,
          nextOrderCycleIndex: previewNextOrderCycleIndex, 
          newLines: newLines.map((l) => ({
            variantId: l.variantId,
            quantity: l.quantity,
            price: l.price,
          })),
          deliveryCount,
          deliveryInterval,
          deliveryPrice,
        }),
      },
      { method: "post" },
    );
  };

  return (
    <Page
      title="Edit subscription"
      backAction={{ onAction: handleBack }}
      titleMetadata={
         (
          <Badge tone="warning" >{contract?.status.toLowerCase()}</Badge>
        ) 
      }
      subtitle={id}
    >
      <BlockStack gap="400">
        {fetcher.data?.success === false &&
          !isPriceUpdatePending &&
          !priceEditTarget && (
            <Banner tone="critical" title="Save failed">
              {fetcher.data.error}
            </Banner>
          )}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Subscription details
            </Text>

            {lines.map((line) => {
              const hasDiscount =
                line.discountLabel &&
                line.originalPrice != null &&
                Number(line.originalPrice) !== Number(line.displayPrice);

              return (
                <InlineStack
                  key={line.id}
                  align="space-between"
                  blockAlign="center"
                  wrap={false}
                >
                  <InlineStack gap="300" blockAlign="center">
                    <Thumbnail
                      source={line.variantImage?.url || ""}
                      alt={line.title}
                      size="small"
                    />
                    <BlockStack gap="050">
                      <Text fontWeight="medium">{line.title}</Text>
                      {line.variantTitle && <Badge>{line.variantTitle}</Badge>}
                      {line.discountLabel && (
                        <Badge tone="success">{line.discountLabel}</Badge>
                      )}
                      
                    </BlockStack>
                  </InlineStack>

                  <InlineStack gap="300" blockAlign="center">
                    <div style={{ width: "80px" }}>
                      <TextField
                        label="Qty"
                        labelHidden
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(value) =>
                          handleQuantityChange(line.id, value)
                        }
                      />
                    </div>
                    <BlockStack gap="0" align="end">
                      {hasDiscount && (
                        <Text
                          as="span"
                          variant="bodySm"
                          tone="subdued"
                          textDecorationLine="line-through"
                        >
                          {currencyCode} {Number(line.originalPrice).toFixed(2)}
                        </Text>
                      )}
                      <Button
                        variant="plain"
                        onClick={() => openPriceEditor("committed", line)}
                      >
                        {currencyCode}{" "}
                        {Number(line.displayPrice ?? 0).toFixed(2)}
                      </Button>
                    </BlockStack>
                    {totalVisibleLineCount > 1 && ( // CHANGED
                      <Button
                        icon={DeleteIcon}
                        variant="tertiary"
                        tone="critical"
                        accessibilityLabel="Remove product"
                        onClick={() => handleRemoveLine(line.id, line.title)}
                      />
                    )}
                  </InlineStack>
                </InlineStack>
              );
            })}

            {newLines.map((line) => (
              <InlineStack
                key={line.tempId}
                align="space-between"
                blockAlign="center"
                wrap={false}
              >
                <InlineStack gap="300" blockAlign="center">
                  <Thumbnail
                    source={line.imageUrl || ""}
                    alt={line.title}
                    size="small"
                  />
                  <BlockStack gap="050">
                    <InlineStack gap="100" blockAlign="center">
                      <Text fontWeight="medium">{line.title}</Text>
                      <Badge tone="success">New</Badge>
                    </InlineStack>
                    {line.variantTitle && <Badge>{line.variantTitle}</Badge>}
                  </BlockStack>
                </InlineStack>

                <InlineStack gap="300" blockAlign="center">
                  <div style={{ width: "80px" }}>
                    <TextField
                      label="Qty"
                      labelHidden
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(value) =>
                        handleNewLineQuantityChange(line.tempId, value)
                      }
                    />
                  </div>
                  <Button
                    variant="plain"
                    onClick={() => openPriceEditor("new", line)}
                  >
                    {currencyCode} {line.price}
                  </Button>
                  <Button
                    icon={DeleteIcon}
                    variant="tertiary"
                    tone="critical"
                    accessibilityLabel="Remove product"
                    onClick={() => handleRemoveNewLine(line.tempId)}
                  />
                </InlineStack>
              </InlineStack>
            ))}

            {automationLines.length > 0 && (
              <>
                {automationLines.map((li) => (
                  <InlineStack
                    key={automationKey(li)}
                    align="space-between"
                    blockAlign="center"
                    wrap={false}
                  >
                    <InlineStack gap="300" blockAlign="center">
                      <Thumbnail
                        source={li.imageUrl || ""}
                        alt={li.title}
                        size="small"
                      />
                      <BlockStack gap="050">
                        <InlineStack gap="100" blockAlign="center">
                          <Text fontWeight="medium">{li.title}</Text>
                        </InlineStack>
                        {li.variantTitle && <Badge>{li.variantTitle}</Badge>}
                        {li.discountLabel && (
                          <Badge tone="success">{li.discountLabel}</Badge>
                        )}
                      </BlockStack>
                    </InlineStack>

                    <InlineStack gap="300" blockAlign="center">
                      <div style={{ width: "80px" }}>
                        <TextField
                          label="Qty"
                          labelHidden
                          type="number"
                          min={1}
                          value={getAutomationQty(li)}
                          onChange={(value) =>
                            handleAutomationQtyInputChange(li, value)
                          }
                          onBlur={() => handleAutomationQtyBlur(li)}
                          loading={isAutomationQtyPending(li)}
                        />
                      </div>

                      <Button
                        variant="plain"
                        onClick={() => openPriceEditor("automation", li)}
                      >
                        {currencyCode} {li.pricePerUnit?.amount}
                      </Button>

                      {totalVisibleLineCount > 1 && ( // NEW guard added
                        <Button
                          icon={DeleteIcon}
                          variant="tertiary"
                          tone="critical"
                          accessibilityLabel="Remove upcoming product"
                          loading={isAutomationRemovePending(li)}
                          onClick={() => handleRemoveAutomationLine(li)}
                        />
                      )}
                    </InlineStack>
                  </InlineStack>
                ))}
              </>
            )}

            <InlineStack gap="200">
              <Button onClick={handleAddLineItem}>Add line item</Button>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Delivery & Billing details
            </Text>

            <Select
  label="Billing type"
  options={[
    { label: "Pay as you go", value: "PAYASYOUGO" },
    // { label: "Pre-paid", value: "PREPAID" },
  ]}
  value={billingType}
  onChange={setBillingType}
/>

            <InlineStack gap="300" wrap={false}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Delivery frequency"
                  type="number"
                  min={1}
                  value={deliveryCount}
                  onChange={setDeliveryCount}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Select
                  label="Delivery interval"
                  options={[
                    { label: "days", value: "DAY" },
                    { label: "weeks", value: "WEEK" },
                    { label: "months", value: "MONTH" },
                  ]}
                  value={deliveryInterval}
                  onChange={setDeliveryInterval}
                />
              </div>
            </InlineStack>

            <TextField
              label="Billing frequency"
              disabled
              value={`Every ${deliveryCount} ${deliveryInterval.toLowerCase()}`}
            />

            <Divider />

            <TextField
              label="Delivery price"
              type="number"
              min={0}
              prefix={currencyCode === "INR" ? "₹" : undefined}
              value={deliveryPrice}
              onChange={setDeliveryPrice}
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Payment Summary
            </Text>
            <InlineStack align="space-between">
              <Text>Subtotal</Text>
              <Text>
                {currencyCode} {subtotal.toFixed(2)}
              </Text>
            </InlineStack>
            <InlineStack align="space-between">
              <Text>Shipping</Text>
              <Text>
                {currencyCode} {(Number(deliveryPrice) || 0).toFixed(2)}
              </Text>
            </InlineStack>
            <Divider />
            <InlineStack align="space-between">
              <Text fontWeight="bold">Total</Text>
              <Text fontWeight="bold">
                {currencyCode} {total.toFixed(2)}
              </Text>
            </InlineStack>
          </BlockStack>
        </Card>

        <InlineStack align="end" gap="200">
          <Button onClick={handleBack} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" loading={isSaving} onClick={handleSave}>
            Save
          </Button>
        </InlineStack>
      </BlockStack>

      <Modal
        open={!!priceEditTarget}
        onClose={closePriceEditor}
        title="Edit price"
        primaryAction={{
          content: "Update",
          onAction: handleUpdatePrice,
          loading: isPriceUpdatePending,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: closePriceEditor,
            disabled: isPriceUpdatePending,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="200">
            <TextField
              label="Subscription price"
              type="number"
              min={0}
              autoComplete="off"
              disabled={isPriceUpdatePending}
              prefix={currencyCode === "INR" ? "₹" : undefined}
              value={priceEditValue}
              onChange={setPriceEditValue}
            />
            {priceEditTarget?.discountLabel && (
              <Text as="p" variant="bodySm" tone="subdued">
                {priceEditTarget.discountLabel} discount currently applied to{" "}
                {priceEditTarget.title}. Updating here will set a fixed
                subscription price instead.
              </Text>
            )}
            {priceEditError && (
              <Text as="p" tone="critical" variant="bodySm">
                {priceEditError}
              </Text>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
