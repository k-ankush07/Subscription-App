import React, { useState, useRef, useEffect } from "react";
import {
  BlockStack,
  Button,
  Checkbox,
  Text,
  Banner,
  InlineStack,
  Badge,
  TextField,
  Select,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";

//  Styles
const styles = {
  cycleCard: {
    border: "1px solid black",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  cycleHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderBottom: "1px solid black",
  },
  actionCard: {
    border: "1px solid black",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    position: "relative",
  },
  actionThumb: {
    width: 40,
    height: 40,
    objectFit: "cover",
    borderRadius: 4,
  },
  destCard: {
    border: "1px solid black",
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    display: "flex",
    gap: 8,
  },
  destThumb: {
    width: 28,
    height: 28,
    objectFit: "cover",
    borderRadius: 4,
    flexShrink: 0,
  },
  variantTag: {
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 11,
    color: "black",
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    borderRadius: 4,
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "black",
    fontSize: 13,
    padding: "4px 0",
    textDecoration: "underline",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    cursor: "pointer",
  },
  dropdownSectionHeader: {
    padding: "4px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: "black",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  dropdownItem: {
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 4,
    margin: "0 4px",
  },
  warningNote: {
    fontSize: 11,
    color: "#8a6d3b",
    marginTop: 4,
  },
};

//  ActionDropdown
function ActionDropdown({ onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const sections = [
    {
      header: "Swap",
      items: [
        { key: "swap-product", label: "Add product swap" },
        { key: "swap-variant", label: "Add variant swap" },
      ],
    },
    {
      header: "Add",
      items: [{ key: "add-product", label: "Add product" }],
    },
    {
      header: "Remove",
      items: [
        { key: "remove-product", label: "Remove product" },
        { key: "remove-variant", label: "Remove specific variant" },
      ],
    },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "calc(100% + 4px)",
        background: "#FFFFFF",
        border: "1px solid black",
        borderRadius: 8,
        zIndex: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        padding: "6px 0",
        minWidth: 207,
      }}
    >
      {sections.map((section) => (
        <React.Fragment key={section.header}>
          <div style={styles.dropdownSectionHeader}>{section.header}</div>
          {section.items.map((item) => (
            <div
              key={item.key}
              style={styles.dropdownItem}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "var(--p-color-bg-surface-secondary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              onClick={() => {
                onSelect(item.key);
                onClose();
              }}
            >
              {item.label}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

//  ActionCard
function ActionCard({
  action,
  onDelete,
  onAddDest,
  onDeleteDest,
  onChangeType,
  onUpdateField,
  onDeleteDestVariant,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const isSwap = action.type === "swap";
  const isRemove = action.type === "remove";
  const isAdd = action.type === "add";

  const badgeTone = isRemove ? "critical" : isAdd ? "success" : "info";
  const badgeLabel = isSwap ? "Swap" : isAdd ? "Add" : "Remove";
  const productName =
    action.sourceProductName || 
    action.productName || 
    "Unknown product";
  const singleVariantName =
    action.sourceVariantName || action.variantName || null;
  const displayImage = action.imageUrl || null;

  const variantNames = Array.isArray(singleVariantName)
    ? singleVariantName
    : [];

  const subLabel =
    action.sourceVariantName || action.sourceVariantId
      ? null 
      : action.type === "swap"
        ? "Will match all variants" 
        : null;

  return (
    <div style={styles.actionCard}>
      {/* Top row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: collapsed ? 0 : 8,
        }}
      >
        <button
          style={styles.iconBtn}
          onClick={() => setCollapsed((s) => !s)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? "›" : "‹"}
        </button>
        {displayImage ? (
          <img src={displayImage} alt="" style={styles.actionThumb} />
        ) : (
          <div
            style={{
              ...styles.actionThumb,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🖼️
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div style={{ marginBottom: 8 }}>
            <Text variant="bodySm" fontWeight="semibold">
              {productName}
            </Text>

            {singleVariantName && typeof singleVariantName === "string" ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 4,
                }}
              >
                <span style={styles.variantTag}>{singleVariantName}</span>
              </div>
            ) : variantNames.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {variantNames.map((v, idx) => (
                  <span key={idx} style={styles.variantTag}>
                    {v}
                  </span>
                ))}
              </div>
            ) : null}

            {subLabel && (
              <Text variant="bodySm" tone="subdued">
                {subLabel}
              </Text>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
          </div>

          <button
            style={styles.iconBtn}
            onClick={onDelete}
            title="Delete action"
          >
            <Icon source={DeleteIcon} tone="base" />
          </button>

          {/* Add — quantity + discount */}
          {isAdd && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text variant="bodySm">Quantity:</Text>
                <div style={{ width: 80 }}>
                  <TextField
                    type="number"
                    value={String(action.quantity ?? 1)}
                    onChange={(v) =>
                      onUpdateField("quantity", parseInt(v) || 1)
                    }
                    autoComplete="off"
                    min={1}
                  />
                </div>
              </div>

              <Checkbox
                label="Apply discount"
                checked={!!action.discountEnabled}
                onChange={(checked) => {
                  onUpdateField("discountEnabled", checked);
                  if (!checked) {
                    onUpdateField("discountValue", "");
                    onUpdateField("discountType", "amount");
                  }
                }}
              />

              {action.discountEnabled && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "flex-end",
                    paddingLeft: 8,
                  }}
                >
                  <div style={{ width: 90 }}>
                    <TextField
                      label="Amount"
                      type="number"
                      value={String(action.discountValue ?? "")}
                      onChange={(v) => onUpdateField("discountValue", v)}
                      autoComplete="off"
                      min={0}
                    />
                  </div>
                  <div style={{ width: 150 }}>
                    <Select
                      label="Type"
                      options={[
                        { label: "Fixed Amount", value: "fixed_amount" },
                        { label: "Amount", value: "amount" },
                        { label: "Percentage (%)", value: "percentage" },
                      ]}
                      value={action.discountType || "amount"}
                      onChange={(v) => onUpdateField("discountType", v)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Swap / Remove radio */}
          {(isSwap || isRemove) && !isAdd && (
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name={`action-type-${action.sourceVariantId || action.sourceProductId || action.variantId}`}
                  checked={isSwap}
                  onChange={() => onChangeType("swap")}
                  style={{ marginRight: 8 }}
                />
                Swap to different product(s)
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name={`action-type-${action.sourceVariantId || action.sourceProductId || action.variantId}`}
                  checked={isRemove}
                  onChange={() => onChangeType("remove")}
                  style={{ marginRight: 8 }}
                />
                Remove from subscription
              </label>
            </div>
          )}

          {isRemove && !action.isVariant && (
            <Text variant="bodySm" tone="subdued">
              This product will be removed from the subscription after the
              specified order.
            </Text>
          )}

          {/* Swap destinations */}
          {isSwap && (
            <div style={{ marginTop: 10 }}>
              <Text variant="bodySm" fontWeight="medium">
                Will swap to:
              </Text>
             

              {action.dests && action.dests.length > 0 ? (
                action.dests.map((dest, di) => (
                  <div key={di} style={styles.destCard}>
                    <div style={{ flex: 1 }}>
                      <Text variant="bodySm">{dest.name}</Text>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {dest.imageUrl && (
                          <img
                            src={dest.imageUrl}
                            alt=""
                            style={styles.destThumb}
                          />
                        )}
                        <button
                          style={{ ...styles.iconBtn, marginLeft: "auto" }}
                          onClick={() => onDeleteDest(di)}
                          title="Remove destination"
                        >
                          <Icon source={DeleteIcon} tone="base" />
                        </button>
                      </div>

                      {dest.variantNames?.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            marginTop: 6,
                          }}
                        >
                          {dest.variantNames.map((variant, idx) => (
                            <div
                              key={idx}
                              style={{
                                width: "100%",
                                padding: "0px 5px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                {dest.variantImages?.[idx] && (
                                  <img
                                    src={dest.variantImages[idx]}
                                    width={24}
                                    height={24}
                                    style={{ borderRadius: 4 }}
                                    alt=""
                                  />
                                )}
                                <span style={styles.variantTag}>
                                  {typeof variant === "string"
                                    ? variant
                                    : variant.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteDestVariant(di, idx)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Icon source={DeleteIcon} tone="critical" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <Text variant="bodySm" tone="subdued">
                  No swap destinations configured
                </Text>
              )}
              <button style={styles.linkBtn} onClick={onAddDest}>
                + Add swap destination
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

//  CycleCard
function CycleCard({
  cycle,
  onDelete,
  onUpdateOrders,
  onAddAction,
  onDeleteAction,
  onAddDest,
  onDeleteDest,
  onChangeActionType,
  onUpdateActionField,
  onDeleteDestVariant,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div style={styles.cycleCard}>
      <div style={styles.cycleHeader}>
        <InlineStack align="start" blockAlign="center" gap="200">
          <button
            style={styles.iconBtn}
            onClick={() => setCollapsed((s) => !s)}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "›" : "‹"}
          </button>
          <Text variant="bodySm">After # of orders:</Text>
          <div style={{ width: 80 }}>
            <TextField
              type="number"
              value={String(cycle.orders)}
              onChange={(v) => onUpdateOrders(parseInt(v) || 1)}
              autoComplete="off"
              min={1}
            />
          </div>
        </InlineStack>
        <button style={styles.iconBtn} onClick={onDelete} title="Delete cycle">
          <Icon source={DeleteIcon} tone="base" />
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: "12px 14px" }}>
          {cycle.actions.map((action, ai) => (
            <ActionCard
              key={action._id || ai}
              action={action}
              onDelete={() => onDeleteAction(ai)}
              onAddDest={() => onAddDest(ai)}
              onDeleteDest={(di) => onDeleteDest(ai, di)}
              onChangeType={(newType) => onChangeActionType(ai, newType)}
              onUpdateField={(field, value) =>
                onUpdateActionField(ai, field, value)
              }
              onDeleteDestVariant={(di, vi) => onDeleteDestVariant(ai, di, vi)}
            />
          ))}

          <div style={{ position: "relative", marginTop: 8 }}>
            <button
              style={styles.linkBtn}
              onClick={() => setShowDropdown((s) => !s)}
            >
              + Add action to this cycle
            </button>
            {showDropdown && (
              <ActionDropdown
                onSelect={(key) => {
                  onAddAction(key);
                  setShowDropdown(false);
                }}
                onClose={() => setShowDropdown(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function normaliseProductSelection(selection, { pickVariants = false } = {}) {
  if (!selection?.length) return [];

  const results = [];

  for (const product of selection) {
    const productId = product.id; // "gid://shopify/Product/123"
    const productTitle = product.title || "";
    const productImage =
      product.images?.[0]?.originalSrc || product.images?.[0]?.src || "";

    if (!pickVariants) {
      // product-level action — we don't need variant info
      results.push({ productId, productTitle, imageUrl: productImage });
      continue;
    }

    // variant-level — flatten each variant
    const selectedVariants = product.variants || [];
    if (selectedVariants.length === 0) continue;

    results.push({
      productId,
      productTitle,
      imageUrl: productImage,
      variantIds: selectedVariants.map((v) => v.id),
      variantTitles: selectedVariants.map((v) => v.title || ""),
      variantImages: selectedVariants.map(
        (v) => v.image?.originalSrc || v.image?.src || productImage,
      ),
    });
  }

  return results;
}

//  Main Automation Component
function Automation({ sellingPlan, setSellingPlan }) {
  const shopify = useAppBridge();

  // Wrapper around shopify.resourcePicker() — same API as SellingPlan.jsx uses
  const pickProducts = ({ multiple = true, showVariants = true } = {}) =>
    shopify
      .resourcePicker({
        type: "product",
        multiple,
        filter: { variants: showVariants },
      })
      .then((selection) => selection ?? null)
      .catch(() => null);

  const [cycles, setCycles] = useState(() => {
  if (!sellingPlan.automationCycles?.length) return [];
  return sellingPlan.automationCycles.map((cycle) => ({
    ...cycle,
    actions: (cycle.actions || []).map((action) => ({ ...action })),
  }));
});

const [showMainDropdown, setShowMainDropdown] = useState(false);
useEffect(() => {
  const incoming = sellingPlan.automationCycles || [];
  if (JSON.stringify(incoming) !== JSON.stringify(cycles)) {
    setCycles(
      incoming.map((cycle) => ({
        ...cycle,
        actions: (cycle.actions || []).map((action) => ({ ...action })),
      })),
    );
  }
}, [sellingPlan.automationCycles]);

// Sync cycles up to parent
useEffect(() => {
  setSellingPlan((prev) => ({ ...prev, automationCycles: cycles }));
}, [cycles]);

  //  Cycle / action helpers
  const addToCycle = (cycleId, action) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: [...c.actions, { ...action }],
            }
          : c,
      ),
    );

  const addDestToCycle = (cycleId, ai, dest) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai ? { ...a, dests: [...(a.dests || []), dest] } : a,
              ),
            }
          : c,
      ),
    );

  const updateActionField = (cycleId, ai, field, value) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai ? { ...a, [field]: value } : a,
              ),
            }
          : c,
      ),
    );

  const updateOrders = (cycleId, value) =>
    setCycles((prev) =>
      prev.map((c) => (c.id === cycleId ? { ...c, orders: value } : c)),
    );

  const changeActionType = (cycleId, ai, newType) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai ? { ...a, type: newType } : a,
              ),
            }
          : c,
      ),
    );

  const deleteAction = (cycleId, ai) =>
    setCycles((prev) =>
      prev
        .map((c) =>
          c.id === cycleId
            ? { ...c, actions: c.actions.filter((_, i) => i !== ai) }
            : c,
        )
        .filter((c) => c.actions.length > 0),
    );

  const deleteCycle = (cycleId) =>
    setCycles((prev) => prev.filter((c) => c.id !== cycleId));

  const deleteDestination = (cycleId, ai, di) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai
                  ? { ...a, dests: a.dests.filter((_, i) => i !== di) }
                  : a,
              ),
            }
          : c,
      ),
    );

  const deleteDestinationVariant = (cycleId, ai, di, vi) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, actionIndex) =>
                actionIndex === ai
                  ? {
                      ...a,
                      dests: a.dests.map((dest, destIndex) =>
                        destIndex === di
                          ? {
                              ...dest,
                              variantNames: (dest.variantNames || []).filter(
                                (_, i) => i !== vi,
                              ),
                              variantIds: (dest.variantIds || []).filter(
                                (_, i) => i !== vi,
                              ),
                              variantImages: (dest.variantImages || []).filter(
                                (_, i) => i !== vi,
                              ),
                            }
                          : dest,
                      ),
                    }
                  : a,
              ),
            }
          : c,
      ),
    );

  //  Resource picker handlers
  const resolveActionType = async (actionType, cycleId, actionIdx = null) => {
    if (actionType === "swap-product") {
      const selection = await pickProducts({
        multiple: false,
        showVariants: false,
      });
      const items = normaliseProductSelection(selection, {
        pickVariants: false,
      });
      if (!items.length) return;
      const item = items[0];
      addToCycle(cycleId, {
        type: "swap",
        sourceProductId: item.productId,
        sourceProductName: item.productTitle,
        imageUrl: item.imageUrl,
        dests: [],
      });
    } else if (actionType === "swap-variant") {
      const selection = await pickProducts({
        multiple: false,
        showVariants: true,
      });
      const items = normaliseProductSelection(selection, {
        pickVariants: true,
      });
      items.forEach((item) => {
        (item.variantIds || []).forEach((variantId, vi) => {
          addToCycle(cycleId, {
            type: "swap",
            _id: Date.now(),
            sourceProductId: item.productId,
            sourceProductName: item.productTitle,
            sourceVariantId: variantId,
            sourceVariantName: item.variantTitles?.[vi] || "",
            imageUrl: item.variantImages?.[vi] || item.imageUrl || "",
            dests: [],
          });
        });
      });
    } else if (actionType === "add-product") {
      const selection = await pickProducts({
        multiple: false,
        showVariants: true,
      });
      const items = normaliseProductSelection(selection, {
        pickVariants: true,
      });
      items.forEach((item) => {
        (item.variantIds || []).forEach((variantId, vi) => {
          addToCycle(cycleId, {
            type: "add",
            productId: item.productId,
            productName: item.productTitle,
            variantId,
            variantName: item.variantTitles?.[vi] || "",
            imageUrl: item.variantImages?.[vi] || item.imageUrl || "",
            quantity: 1,
            discountEnabled: false,
            discountValue: "",
            discountType: "amount",
          });
        });
      });
    } else if (actionType === "remove-product") {
      const selection = await pickProducts({
        multiple: false,
        showVariants: false,
      });
      const items = normaliseProductSelection(selection, {
        pickVariants: false,
      });
      if (!items.length) return;
      const item = items[0];
      addToCycle(cycleId, {
        type: "remove",
        productId: item.productId,
        productName: item.productTitle,
        imageUrl: item.imageUrl,
      });
    } else if (actionType === "remove-variant") {
      const selection = await pickProducts({
        multiple: false,
        showVariants: true,
      });
      const items = normaliseProductSelection(selection, {
        pickVariants: true,
      });
      items.forEach((item) => {
        (item.variantIds || []).forEach((variantId, vi) => {
          addToCycle(cycleId, {
            type: "remove",
            productId: item.productId,
            productName: item.productTitle,
            variantId,
            variantName: item.variantTitles?.[vi] || "",
            imageUrl: item.variantImages?.[vi] || item.imageUrl || "",
            isVariant: true,
          });
        });
      });
    } else if (actionType === "add-dest" && actionIdx !== null) {
      // Hamesha variants show karo destination picker mein
      const selection = await pickProducts({
        multiple: true,
        showVariants: true, // Always true
      });
      const items = normaliseProductSelection(selection, {
        pickVariants: true, // Always true
      });

      items.forEach((item) => {
        addDestToCycle(cycleId, actionIdx, {
          id: item.productId,
          name: item.productTitle,
          imageUrl: item.imageUrl,
          variantNames: item.variantTitles || [],
          variantIds: item.variantIds || [],
          variantImages: item.variantImages || [],
        });
      });
    }
  };

  const handleMainAddAction = (actionType) => {
    const newCycleId = Date.now();
    setCycles((prev) => [...prev, { id: newCycleId, orders: 1, actions: [] }]);
    setTimeout(() => resolveActionType(actionType, newCycleId), 0);
    setShowMainDropdown(false);
  };

  //  Render
  return (
    <BlockStack gap="300">
      <Text as="h2" variant="headingMd">
        Automation
      </Text>

      <Checkbox
        label="Allow automatic actions (swap, add or remove products)"
        checked={!!sellingPlan.Automation}
        onChange={(newChecked) =>
          setSellingPlan((prev) => ({ ...prev, Automation: newChecked }))
        }
      />

      {sellingPlan.Automation && (
        <>
          {cycles
            .filter((cycle) => cycle.actions.length > 0)
            .map((cycle) => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                onDelete={() => deleteCycle(cycle.id)}
                onUpdateOrders={(v) => updateOrders(cycle.id, v)}
                onAddAction={(key) => resolveActionType(key, cycle.id)}
                onDeleteAction={(ai) => deleteAction(cycle.id, ai)}
                onAddDest={(ai) => resolveActionType("add-dest", cycle.id, ai)}
                onDeleteDest={(ai, di) => deleteDestination(cycle.id, ai, di)}
                onChangeActionType={(ai, newType) =>
                  changeActionType(cycle.id, ai, newType)
                }
                onUpdateActionField={(ai, field, value) =>
                  updateActionField(cycle.id, ai, field, value)
                }
                onDeleteDestVariant={(ai, di, vi) =>
                  deleteDestinationVariant(cycle.id, ai, di, vi)
                }
              />
            ))}

          <div style={{ position: "relative" }}>
            <Button
              fullWidth
              onClick={() => setShowMainDropdown((s) => !s)}
              disclosure={showMainDropdown ? "up" : "down"}
            >
              + Add action
            </Button>
            {showMainDropdown && (
              <ActionDropdown
                onSelect={handleMainAddAction}
                onClose={() => setShowMainDropdown(false)}
              />
            )}
          </div>
        </>
      )}
    </BlockStack>
  );
}

export default Automation;