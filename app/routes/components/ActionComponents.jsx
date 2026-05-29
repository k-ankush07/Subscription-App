import React, { useState, useRef, useEffect } from "react";
import {
  BlockStack,
  Text,
  TextField,
  Badge,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";

// =====================
// Action Dropdown
// =====================
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
          <div style={{ fontSize: 12, fontWeight: 600, padding: "5px 14px" }}>
            {section.header}
          </div>

          {section.items.map((item) => (
            <div
              key={item.key}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
              }}
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

// =====================
// Action Card
// =====================
export function ActionCard({
  action,
  onDelete,
  onAddDest,
  onDeleteDest,
  onChangeType,
  onUpdateAddProduct,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const isSwap = action.type === "swap";
  const isRemove = action.type === "remove";
  const isAdd = action.type === "add";

  const badgeTone = isRemove ? "critical" : isAdd ? "success" : "info";
  const badgeLabel = isSwap ? "Swap" : isAdd ? "Add" : "Remove";

  const productName =
    action.productName || action.sourceProductName || "Unknown product";

  const variantNames = Array.isArray(
    action.sourceVariantName || action.variantName
  )
    ? action.sourceVariantName || action.variantName
    : [];

  const subLabel =
    variantNames.length > 0
      ? null
      : action.type === "swap"
      ? "Will match all variants"
      : null;

  return (
    <div
      style={{
        border: "1px solid var(--p-color-border)",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 10,
        background: "var(--p-color-bg-surface-secondary)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button onClick={() => setCollapsed((s) => !s)}>
          {collapsed ? "›" : "‹"}
        </button>

        {action.imageUrl ? (
          <img
            src={action.imageUrl}
            alt=""
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              objectFit: "cover",
            }}
          />
        ) : (
          <div>🖼️</div>
        )}
      </div>

      {!collapsed && (
        <>
          <Text>{productName}</Text>

          {variantNames.map((v, i) => (
            <span key={i}>{v}</span>
          ))}

          <Badge tone={badgeTone}>{badgeLabel}</Badge>

          <button onClick={onDelete}>
            <Icon source={DeleteIcon} />
          </button>

          {/* ADD */}
          {isAdd && (
            <BlockStack gap="300">
              <TextField
                label="Quantity"
                type="number"
                value={String(action.quantity || 1)}
                onChange={(v) =>
                  onUpdateAddProduct("quantity", v)
                }
              />

              <TextField
                label="Discount"
                type="number"
                value={String(action.discountValue || "")}
                onChange={(v) =>
                  onUpdateAddProduct("discountValue", v)
                }
              />
            </BlockStack>
          )}

          {/* SWAP */}
          {isSwap && (
            <>
              <button onClick={onAddDest}>
                + Add swap destination
              </button>

              {action.dests?.map((d, di) => (
                <div key={di}>
                  <Text>{d.name}</Text>
                  <button onClick={() => onDeleteDest(di)}>
                    Delete
                  </button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// =====================
// Cycle Card
// =====================
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
    <div
      style={{
        border: "1px solid var(--p-color-border)",
        borderRadius: 8,
        marginBottom: 12,
      }}
    >
      <InlineStack align="space-between">
        <Text>After # of orders:</Text>

        <TextField
          type="number"
          value={String(cycle.orders)}
          onChange={(v) => onUpdateOrders(parseInt(v) || 1)}
        />

        <button onClick={onDelete}>Delete</button>
      </InlineStack>

      {!collapsed && (
        <>
          {cycle.actions.map((action, ai) => (
            <ActionCard
              key={action._id || ai}
              action={action}
              onDelete={() => onDeleteAction(ai)}
              onAddDest={() => onAddDest(ai)}
              onDeleteDest={(di) =>
                onDeleteDest(ai, di)
              }
              onChangeType={(t) =>
                onChangeActionType(ai, t)
              }
            />
          ))}

          <button onClick={() => setShowDropdown(!showDropdown)}>
            + Add action
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
        </>
      )}
    </div>
  );
}