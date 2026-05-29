

import React,{ useState, useEffect } from "react";
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

  // for swap-variant and remove-variant — only one product's variants selectable
  const [singleProductVariant, setSingleProductVariant] = useState(false);
  // NEW: hide variant rows in picker (for swap-product, add-product, remove-product)
  const [hideVariants, setHideVariants] = useState(false);

  useEffect(() => {
    console.log("===== CYCLES DATA =====");
    console.log("data", cycles);
  }, [cycles]);

  useEffect(() => {
    onChange(index, "automationCycles", cycles);
  }, [cycles]);

  const openPicker = (
    title,
    pickVariant,
    callback,
    singleSelect = false,
    singleProdVariant = false,
    hideVars = false   // NEW
  ) => {
    setModalTitle(title);
    setModalPickVariant(pickVariant);
    setModalSingleSelect(singleSelect);
    setSingleProductVariant(singleProdVariant);
    setHideVariants(hideVars);
    setTempSelected([]);
    setModalCallback(() => callback);
    setModalOpen(true);
  };

  const handleModalSave = () => {
    if (modalCallback) modalCallback(tempSelected);
    setModalOpen(false);
    setModalCallback(null);
    setTempSelected([]);
    setSingleProductVariant(false);
    setHideVariants(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalCallback(null);
    setTempSelected([]);
    setSingleProductVariant(false);
    setHideVariants(false);
  };

  // Add action to a specific cycle by id
  const addToCycle = (cycleId, action) => {
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: [
                ...c.actions,
                { ...action, _id: Date.now() + Math.random() },
              ],
            }
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
                idx === ai
                  ? { ...a, dests: [...(a.dests || []), dest] }
                  : a
              ),
            }
          : c
      )
    );
  };

  const resolveActionType = (actionType, cycleId, actionIdx = null) => {
    if (actionType === "swap-product") {
      // hideVariants=true: only products shown, no variant rows
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
            dests: [],
          });
        },
        true,  // singleSelect
        false, // singleProductVariant
        true   // hideVariants
      );
    } else if (actionType === "swap-variant") {
      // singleProductVariant=true, variants shown
      openPicker(
        "Select variant",
        true,
        (selected) => {
          if (!selected?.length) return;
          selected.forEach((item) => {
            const variantIds = item.variantIds || [];
            const variantTitles = Array.isArray(item.variantTitles)
              ? item.variantTitles
              : item.variantTitles
              ? [item.variantTitles]
              : [];
            const variantImages = item.variantImages || [];

            variantIds.forEach((variantId, vi) => {
              addToCycle(cycleId, {
                type: "swap",
                sourceProductId: item.productId,
                sourceProductName:
                  item.title || item.productTitle || item.productId,
                sourceVariantId: variantId,
                sourceVariantName: variantTitles[vi] || "",
                imageUrl:
                  variantImages[vi] ||
                  item.productImage ||
                  item.imageUrl ||
                  "",
                dests: [],
              });
            });
          });
        },
        false, // singleSelect
        true,  // singleProductVariant
        false  // hideVariants — show variants
      );
    } else if (actionType === "add-product") {
      // hideVariants=true: only products shown
      // openPicker(
      //   "Select product to add",
      //   false,
      //   (selected) => {
      //     if (!selected?.length) return;
      //     selected.forEach((item) => {
      //       const variantIds = item.variantIds || [];
      //       const variantTitles = Array.isArray(item.variantTitles)
      //         ? item.variantTitles
      //         : item.variantTitles
      //         ? [item.variantTitles]
      //         : [];
      //       const variantImages = item.variantImages || [];

      //       if (variantIds.length === 0) {
      //         addToCycle(cycleId, {
      //           type: "add",
      //           productId: item.productId,
      //           productName:
      //             item.title || item.productTitle || item.productId,
      //           imageUrl: item.imageUrl || item.productImage || "",
      //           // variantId: null,
      //           // variantName: null,
      //           quantity: 1,
      //           discountEnabled: false,
      //           discountValue: "",
      //           discountType: "amount",
      //         },
      //       false, // singleSelect
      //   true,  // singleProductVariant
      //   false  // hideVariants — show variants
      //     );
      //       } else {
      //         variantIds.forEach((variantId, vi) => {
      //           addToCycle(cycleId, {
      //             type: "add",
      //             productId: item.productId,
      //             productName:
      //               item.title || item.productTitle || item.productId,
      //             imageUrl:
      //               variantImages[vi] ||
      //               item.imageUrl ||
      //               item.productImage ||
      //               "",
      //             variantId: variantId,
      //             variantName: variantTitles[vi] || "",
      //             quantity: 1,
      //             discountEnabled: false,
      //             discountValue: "",
      //             discountType: "amount",
      //           });
      //         });
      //       }
      //     });
      //   },
      //   true,  // singleSelect
      //   false, // singleProductVariant
      //   true   // hideVariants
      // );
      openPicker(
  "Select product to add",
  true,
  (selected) => {
    if (!selected?.length) return;

    selected.forEach((item) => {
      const variantIds = item.variantIds || [];
      const variantTitles = item.variantTitles || [];
      const variantImages = item.variantImages || [];

      variantIds.forEach((variantId, vi) => {
        addToCycle(cycleId, {
          type: "add",
          productId: item.productId,
          productName:
            item.productTitle || item.title || item.productId,
          variantId,
          variantName: variantTitles[vi] || "",
          imageUrl:
            variantImages[vi] ||
            item.productImage ||
            item.imageUrl ||
            "",
          quantity: 1,
          discountEnabled: false,
          discountValue: "",
          discountType: "amount",
        });
      });
    });
  },
  false, // singleSelect
  true,  // singleProductVariant
  false  // hideVariants
);
    } else if (actionType === "remove-product") {
      // hideVariants=true: only products shown
      openPicker(
        "Select product to remove",
        false,
        (selected) => {
          if (!selected?.length) return;
          const item = selected[0];
          addToCycle(cycleId, {
            type: "remove",
            productId: item.productId,
            productName:
              item.title || item.productTitle || item.productId,
            imageUrl: item.imageUrl || item.productImage || "",
          });
        },
        true,  // singleSelect
        false, // singleProductVariant
        true   // hideVariants
      );
    } else if (actionType === "remove-variant") {
      // singleProductVariant=true, variants shown
      openPicker(
        "Select variant to remove",
        true,
        (selected) => {
          if (!selected?.length) return;
          selected.forEach((item) => {
            const variantIds = item.variantIds || [];
            const variantTitles = Array.isArray(item.variantTitles)
              ? item.variantTitles
              : item.variantTitles
              ? [item.variantTitles]
              : [];
            const variantImages = item.variantImages || [];

            variantIds.forEach((variantId, vi) => {
              addToCycle(cycleId, {
                type: "remove",
                productId: item.productId,
                productName:
                  item.title || item.productTitle || item.productId,
                variantId: variantId,
                variantName: variantTitles[vi] || "",
                variantImages: variantImages,
                imageUrl:
                  variantImages[vi] ||
                  item.imageUrl ||
                  item.productImage ||
                  "",
              });
            });
          });
        },
        false, // singleSelect
        true,  // singleProductVariant
        false  // hideVariants — show variants
      );
    } else if (actionType === "add-dest" && actionIdx !== null) {
      const cycle = cycles.find((c) => c.id === cycleId);
      const action = cycle?.actions[actionIdx];
      const isVariantSwap = !!action?.sourceVariantId;
      openPicker(
        isVariantSwap
          ? "Select destination variant"
          : "Select destination product",
        isVariantSwap,
        (selected) => {
          if (!selected?.length) return;
          selected.forEach((item) => {
            addDestToCycle(cycleId, actionIdx, {
              id: item.productId,
              name: item.productTitle,
              variantNames: item.variantTitles || [],
              variantIds: item.variantIds || [],
              variantImages: item.variantImages || [],
              imageUrl: item.productImage || "",
            });
          });
        },
        false, // singleSelect
        false, // singleProductVariant
        false  // hideVariants
      );
    }
  };

  // "Add action" button: create new cycle then add action
  const handleMainAddAction = (actionType) => {
    const newCycleId = Date.now();
    setCycles((prev) => [
      ...prev,
      { id: newCycleId, orders: 1, actions: [] },
    ]);
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

  const updateActionField = (cycleId, ai, field, value) =>
    setCycles((prev) =>
      prev.map((c) =>
        c.id === cycleId
          ? {
              ...c,
              actions: c.actions.map((a, idx) =>
                idx === ai ? { ...a, [field]: value } : a
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
              Automatic actions can change the subscription price. The price
              updates to the replacement product's price at the time of the
              swap. <a href="#">Learn more</a>
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
                onAddDest={(ai) =>
                  resolveActionType("add-dest", cycle.id, ai)
                }
                onDeleteDest={(ai, di) =>
                  deleteDestination(cycle.id, ai, di)
                }
                onChangeActionType={(ai, newType) =>
                  changeActionType(cycle.id, ai, newType)
                }
                onUpdateActionField={(ai, field, value) =>
                  updateActionField(cycle.id, ai, field, value)
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
            singleProductVariant={singleProductVariant}
            hideVariants={hideVariants}
          />
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}

export default AutomaticActions;