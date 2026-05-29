


import React, { useState, useRef, useEffect } from "react";
import {
  Text,
  Badge,
  InlineStack,
  TextField,
  Icon,
  Select,
  Checkbox,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { styles } from "../ui/automationAction/styles.js";

//  Action Dropdown Popover — UNCHANGED
export function ActionDropdown({ onSelect, onClose }) {
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
        top: -300,
        background: "#FFFFFF",
        border: "1px solid white",
        borderRadius: 8,
        zIndex: 200,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        padding: "6px 0",
        width: "207px",
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

//  Single Action Card
export function ActionCard({
  action,
  onDelete,
  onAddDest,
  onDeleteDest,
  onChangeType,
  onUpdateField,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const isSwap = action.type === "swap";
  const isRemove = action.type === "remove";
  const isAdd = action.type === "add";

  const badgeTone = isRemove ? "critical" : isAdd ? "success" : "info";
  const badgeLabel = isSwap ? "Swap" : isAdd ? "Add" : "Remove";

  const productName =
    action.productName || action.sourceProductName || "Unknown product";

  const singleVariantName =
    action.sourceVariantName || action.variantName || null;

  const displayImage = action.imageUrl || null;

  const variantNames = Array.isArray(
    action.sourceVariantName || action.variantName
  )
    ? action.sourceVariantName || action.variantName
    : [];

  const subLabel =
    variantNames.length > 0
      ? null
      : action.type === "swap" && !action.isVariant
        ? "Will match all variants"
        : null;

  return (
    <div style={styles.actionCard}>
      {/* Top row: chevron + product image */}
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
              background: "var(--p-color-bg-surface-secondary)",
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
          {/* Product name + variant tag */}
          <div style={{ marginBottom: 8 }}>
            <Text variant="bodySm" fontWeight="semibold">
              {productName}
            </Text>

            {singleVariantName && typeof singleVariantName === "string" ? (
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}
              >
                <span style={styles.variantTag}>{singleVariantName}</span>
              </div>
            ) : variantNames.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {variantNames.map((variant, idx) => (
                  <span key={idx} style={styles.variantTag}>
                    {variant}
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

          {/* Badge + delete */}
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

          {/* Add product — quantity + discount */}
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

          {/* Radio buttons — swap/remove (product level + variant level) */}
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
                  name={`action-type-${action._id}`}
                  checked={isSwap}
                  onChange={() => onChangeType("swap")}
                  style={{ marginRight: 8 }}
                />
                Swap to different product(s)
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name={`action-type-${action._id}`}
                  checked={isRemove}
                  onChange={() => onChangeType("remove")}
                  style={{ marginRight: 8 }}
                />
                Remove from subscription
              </label>
            </div>
          )}

          {/* Remove description */}
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
                    {dest.imageUrl ? (
                     ""
                    ) : (
                      <div
                        style={{
                          ...styles.destThumb,
                          background: "var(--p-color-bg-surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <Text variant="bodySm">{dest.name}</Text>
                      {(dest.variants?.length > 0 || dest.variantNames?.length > 0) && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                          {(dest.variants || dest.variantNames || []).map((variant, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                flexWrap: "wrap",
                              }}
                            >
                              {/* image (if exists like screenshot) */}
                              {dest.variantImages?.[idx] && (
                                <img
                                  src={dest.variantImages[idx]}
                                  width={24}
                                  height={24}
                                  style={{ borderRadius: 4 }}
                                  alt=""
                                />
                              )}

                              {/* variant title */}
                              <span style={styles.variantTag}>
                                {typeof variant === "string" ? variant : variant.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      style={{ ...styles.iconBtn, marginLeft: "auto" }}
                      onClick={() => onDeleteDest(di)}
                      title="Remove destination"
                    >
                      <Icon source={DeleteIcon} tone="base" />
                    </button>
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

//  Single Cycle Card
export function CycleCard({
  cycle,
  onDelete,
  onUpdateOrders,
  onAddAction,
  onDeleteAction,
  onAddDest,
  onDeleteDest,
  onChangeActionType,
  onUpdateActionField,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div style={styles.cycleCard}>
      {/* Cycle header */}
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
        <button
          style={styles.iconBtn}
          onClick={onDelete}
          title="Delete cycle"
        >
          <Icon source={DeleteIcon} tone="base" />
        </button>
      </div>

      {/* Actions */}
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
            />
          ))}

          {/* Add action to this cycle */}
          <div style={{ position: "relative", marginTop: 8 }}>
            <button
              style={styles.linkBtn}
              onClick={() => setShowDropdown((s) => !s)}
            >
              + Add action to this cycle
            </button>
            {showDropdown && (
              <ActionDropdown
                position="bottom"
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