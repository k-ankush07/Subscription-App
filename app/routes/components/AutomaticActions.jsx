import React, { useState, useEffect } from "react";
import {
  BlockStack,
  Button,
  Checkbox,
  Text,
  Banner,
  InlineStack,
  Modal,
  Pagination,
} from "@shopify/polaris";
import Products from "./Products";
import { ActionDropdown, CycleCard } from "./AutomaticActionsComponents";

//  Main AutomaticActions Component 
function AutomaticActions({
  option,
  onChange,
  updateChecked,
  products,
  nextCursor,
  hasNextPage,
  index,
}) {
  const [cycles, setCycles] = useState([]);
  const [showMainDropdown, setShowMainDropdown] = useState(false);
  //  this new state near other modal states
const [modalSingleSelect, setModalSingleSelect] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Select product");
  const [modalPickVariant, setModalPickVariant] = useState(false);
  const [tempSelected, setTempSelected] = useState([]);
  const [modalCallback, setModalCallback] = useState(null);
  const [pagination, setPagination] = useState({
    hasPrevious: false,
    hasNext: false,
    handlePrev: () => {},
    handleNext: () => {},
  });

  useEffect(() => {
    console.log("===== CYCLES DATA =====");
    console.log("data", cycles);
  }, [cycles]);
   useEffect(() => {
  onChange(index, "automationCycles", cycles);
  // console.log("sfnsdjkbf", cycles)
}, [cycles]);

  const openPicker = (title, pickVariant, callback, singleSelect = false) => {
    setModalTitle(title);
    setModalPickVariant(pickVariant);
     setModalSingleSelect(singleSelect);
    setTempSelected([]);
    setModalCallback(() => callback);
    setModalOpen(true);
  };

  const handleModalSave = () => {
    if (modalCallback) modalCallback(tempSelected);
    setModalOpen(false);
    setModalCallback(null);
    setTempSelected([]);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalCallback(null);
    setTempSelected([]);
  };

  // Add action to a specific cycle by id
  const addToCycle = (cycleId, action) => {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? { ...c, actions: [...c.actions, { ...action, _id: Date.now() + Math.random() }] }
          : c
      )
    );
  };

  const addDestToCycle = (cycleId, ai, dest) => {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai ? { ...a, dests: [...(a.dests || []), dest] } : a
              ),
            }
          : c
      )
    );
  };

  const resolveActionType = (actionType, cycleId, actionIdx = null) => {
   if (actionType === "swap-product") {
  openPicker(
    "Select product",
    false,
    (selected) => {
      if (!selected?.length) return;

      const item = selected[0];

      addToCycle(cycleId, {
        type: "swap",
        sourceProductId: item.productId,
        sourceProductName:
          item.title || item.productTitle || item.productId,
        imageUrl: item.imageUrl || item.productImage || "",
        isVariant: false,
        dests: [],
      });
    },
    true //  SINGLE SELECT ENABLED
  );
}else if (actionType === "swap-variant") {
      openPicker(
  "Select variant",
  true,
  (selected) => {
    if (!selected?.length) return;

    const item = selected[0];

    addToCycle(cycleId, {
      type: "swap",
      sourceProductId: item.productId,
      sourceProductName:
        item.title || item.productTitle || item.productId,
      sourceVariantId: item.variantIds,
      sourceVariantName: Array.isArray(item.variantTitles)
        ? item.variantTitles
        : item.variantTitles
        ? [item.variantTitles]
        : [],
      imageUrl: item.imageUrl || item.productImage || "",
      dests: [],
    });
  },
  true // 
);
    }  else if (actionType === "add-product") {
  openPicker("Select product to add", false, (selected) => {
    if (!selected?.length) return;
    const item = selected[0];
    addToCycle(cycleId, {
      type: "add",
      productId: item.productId,
      productName: item.title || item.productTitle || item.productId,
      isVariant: false,
      imageUrl: item.imageUrl || item.productImage || "",
      quantity: 1,
      discountValue: "",
      discountType: "amount",
    });
  }, true);  //  singleSelect = true else if (actionType === "remove-product") {
      openPicker("Select product to remove", false, (selected) => {
        if (!selected?.length) return;
        const item = selected[0];
        addToCycle(cycleId, {
          type: "remove",
          productId: item.productId,
          productName: item.title || item.productTitle || item.productId,
          isVariant: false,
          imageUrl: item.imageUrl || item.productImage || "",
        });
      },
     true);
    } else if (actionType === "remove-variant") {
      openPicker("Select variant to remove", true, (selected) => {
        if (!selected?.length) return;
        const item = selected[0];
        addToCycle(cycleId, {
          type: "remove",
          productId: item.productId,
          productName: item.title || item.productTitle || item.productId,
          variantId: item.variantIds,
          variantName: Array.isArray(item.variantTitles)
            ? item.variantTitles
            : item.variantTitles
            ? [item.variantTitles]
            : [],
          imageUrl: item.imageUrl || item.productImage || "",
        });
      });
    }  else if (actionType === "add-dest" && actionIdx !== null) {
  const cycle = cycles.find((c) => c.id === cycleId);
  const action = cycle?.actions[actionIdx];
  const isVariantSwap = !!action?.sourceVariantId;
  openPicker(
    isVariantSwap ? "Select destination variant" : "Select destination product",
    isVariantSwap,
    (selected) => {
      if (!selected?.length) return;
      //  loop ALL selected instead of only selected[0]
  //     selected.forEach((item) => {
  //       addDestToCycle(cycleId, actionIdx, {
  //         id: item.productId,
  //         name: isVariantSwap
  // ? `${item.productTitle} — ${
  //     Array.isArray(item.variantTitles)
  //       ? item.variantTitles.join(", ")
  //       : item.variantTitles || ""
  //   }`
  // : item.productTitle,
  //         imageUrl: item.imageUrl || item.productImage || "",
  //       });
  //     });
  selected.forEach((item) => {
  addDestToCycle(cycleId, actionIdx, {
    id: item.productId,
    name: item.productTitle,
    variantNames: item.variantTitles || [],
    variantIds: item.variantIds || [],
    imageUrl: item.productImage || "",
  });
});
    },
    false  //  singleSelect = false, allow multi select
  );
}
  };

  // "Add action" button: create new cycle then add action
  const handleMainAddAction = (actionType) => {
    const newCycleId = Date.now();
    setCycles((prev) => [...prev, { id: newCycleId, orders: 1, actions: [] }]);
    setTimeout(() => resolveActionType(actionType, newCycleId), 0);
    setShowMainDropdown(false);
  };

  const deleteCycle = (cycleId) =>
    setCycles((prev) => prev.filter((c) => c.id !== cycleId));

  const deleteAction = (cycleId, ai) =>
    setCycles((prev) =>
      prev
        .map((c) =>
          c.id === cycleId
            ? { ...c, actions: c.actions.filter((_, i) => i !== ai) }
            : c
        )
        .filter((c) => c.actions.length > 0)
    );

  const deleteDestination = (cycleId, ai, di) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai
                  ? { ...a, dests: a.dests.filter((_, i) => i !== di) }
                  : a
              ),
            }
          : c
      )
    );

  const updateOrders = (cycleId, value) =>
    setCycles((prev) =>
      prev.map((c) => (c.id === cycleId ? { ...c, orders: value } : c))
    );

  const changeActionType = (cycleId, ai, newType) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai ? { ...a, type: newType } : a
              ),
            }
          : c
      )
    );

  return (
    <BlockStack gap="300">
      {/* Header row */}
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          Automatic actions
        </Text>
      </InlineStack>

      <Checkbox
        label="Allow automatic actions (swap, add or remove products)"
        checked={option.allowAutoActions}
        onChange={updateChecked("allowAutoActions")}
      />

      {option.allowAutoActions && (
        <>
          <Banner tone="info">
            <Text variant="bodySm">
              Automatic actions can change the subscription price. The price updates to the
              replacement product's price at the time of the swap.{" "}
              <a href="#">Learn more</a>
            </Text>
          </Banner>

          {/* Cycle cards */}
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
              />
            ))}

          {/* Main Add action button */}
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
                position="top"
                onSelect={handleMainAddAction}
                onClose={() => setShowMainDropdown(false)}
              />
            )}
          </div>
        </>
      )}

      {/* Product Picker Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        primaryAction={{ content: "Select", onAction: handleModalSave }}
        secondaryActions={[{ content: "Cancel", onAction: closeModal }]}
        footer={
          <InlineStack align="space-between">
            <Pagination
              hasPrevious={pagination.hasPrevious}
              onPrevious={pagination.handlePrev}
              hasNext={pagination.hasNext}
              onNext={pagination.handleNext}
            />
          </InlineStack>
        }
      >
        <Modal.Section>
          <Products
            products={products}
            hasNextPage={hasNextPage}
            nextCursor={nextCursor}
            selectedItems={tempSelected}
            onSelect={setTempSelected}
            onPaginationChange={setPagination}
            pickVariant={modalPickVariant}
            singleSelect={modalSingleSelect}
          />
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}

export default AutomaticActions;