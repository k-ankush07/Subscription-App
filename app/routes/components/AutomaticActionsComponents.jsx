import React, { useState, useRef, useEffect } from "react";
import { Text, Badge, InlineStack, TextField, Icon } from "@shopify/polaris";
import { DeleteIcon } from '@shopify/polaris-icons';

//  Action Dropdown Popover 
export function ActionDropdown({ onSelect, onClose, position = "top" }) {
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
                (e.currentTarget.style.background = "var(--p-color-bg-surface-secondary)")
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
export function ActionCard({ action, onDelete, onAddDest, onDeleteDest, onChangeType }) {
  const [collapsed, setCollapsed] = useState(false);

  const isSwap = action.type === "swap";
  const isRemove = action.type === "remove";
  const isAdd = action.type === "add";

  const badgeTone = isRemove ? "critical" : isAdd ? "success" : "info";
  const badgeLabel = isSwap ? "Swap" : isAdd ? "Add" : "Remove";

  const productName = action.productName || action.sourceProductName || "Unknown product";
  const variantNames = Array.isArray(action.sourceVariantName || action.variantName)
    ? (action.sourceVariantName || action.variantName)
    : [];
  const subLabel =
    variantNames.length > 0 ? null : action.type === "swap" ? "Will match all variants" : null;

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
        {action.imageUrl ? (
          <img src={action.imageUrl} alt="" style={styles.actionThumb} />
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
            {variantNames.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {variantNames.map((variant, index) => (
                  <span key={index} style={styles.variantTag}>
                    {variant}
                  </span>
                ))}
              </div>
            )}
            {subLabel && (
              <Text variant="bodySm" tone="subdued">
                {subLabel}
              </Text>
            )}
          </div>

          {/* Badge + delete */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Badge tone={badgeTone}>{badgeLabel}</Badge>
          </div>
          <button style={styles.iconBtn} onClick={onDelete} title="Delete action">
            <Icon source={DeleteIcon} tone="base" />
          </button>

          {/* Radio buttons — only for swap/remove product actions (not add) */}
          {(isSwap || isRemove) && !action.isVariant && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
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
              This product will be removed from the subscription after the specified order.
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
                      <img src={dest.imageUrl} alt="" style={styles.destThumb} />
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
                      ></div>
                    )}
                    <div style={{ flex: 1 }}>
                      <Text variant="bodySm">{dest.name}</Text>
                      {dest.variantName && (
                        <Text variant="bodySm" tone="subdued">
                          {dest.variantName}
                        </Text>
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
        <button style={styles.iconBtn} onClick={onDelete} title="Delete cycle">
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

//  Shared Styles 
export const styles = {
  cycleCard: {
    border: "1px solid var(--p-color-border)",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "visible",
    background: "var(--p-color-bg-surface)",
  },
  cycleHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "var(--p-color-bg-surface-secondary)",
    borderRadius: "8px 8px 0 0",
    borderBottom: "1px solid var(--p-color-border)",
  },
  actionCard: {
    border: "1px solid var(--p-color-border)",
    borderRadius: 8,
    padding: "10px 12px",
    marginBottom: 10,
    background: "var(--p-color-bg-surface-secondary)",
  },
  actionThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: "cover",
    border: "1px solid var(--p-color-border)",
    flexShrink: 0,
  },
  destCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    border: "1px solid var(--p-color-border)",
    borderRadius: 6,
    background: "var(--p-color-bg-surface)",
    marginTop: 6,
  },
  destThumb: {
    width: 32,
    height: 32,
    borderRadius: 4,
    objectFit: "cover",
    border: "1px solid var(--p-color-border)",
    flexShrink: 0,
  },
  variantTag: {
    display: "inline-block",
    background: "var(--p-color-bg-fill-tertiary)",
    border: "1px solid var(--p-color-border)",
    borderRadius: 10,
    fontSize: 11,
    padding: "1px 7px",
    marginTop: 3,
    color: "var(--p-color-text-secondary)",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 6px",
    fontSize: 16,
    color: "var(--p-color-text-secondary)",
    borderRadius: 4,
    lineHeight: 1,
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#005bd3",
    fontSize: 13,
    cursor: "pointer",
    padding: "4px 0",
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  collapseAllBtn: {
    background: "none",
    border: "none",
    color: "#005bd3",
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
  },
  dropdownSectionHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: "black",
    padding: "5px 14px",
  },
  dropdownItem: {
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "var(--p-color-text)",
    background: "transparent",
    transition: "background 0.1s",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: 13,
    cursor: "pointer",
    color: "var(--p-color-text)",
  },
};