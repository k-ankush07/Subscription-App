export const handlePublish = ({
  shop,
  planId,
  selectedProducts,
  options,
  productChanges,
  title,
  description,
}) => {
  return {
    shop,
    planId,
    title,
    description,
    productChanges,
    selectedProducts: selectedProducts.map((p) => ({
      productId: p.productId,
      productTitle: p.productTitle,
      productImage: p.productImage ?? "",
      variantIds: p.variantIds || [],
      variantTitles: p.variantTitles || [],
      // variantImages: p.variantImages || [],
    })),
    options: options.map((opt) => ({
      ...opt,
      automationCycles: (opt.automationCycles || []).map((cycle) => ({
        orders: cycle.orders,
        actions: cycle.actions.map((action) => {
          const base = {
            type: action.type,
            imageUrl: action.imageUrl || "",
          };

          if (action.type === "swap") {
            const payload = {
              ...base,
              sourceProductId: action.sourceProductId,
              sourceProductName: action.sourceProductName,
              dests: (action.dests || []).map((d) => ({
                id: d.id,
                name: d.name,
                imageUrl: d.imageUrl || "",
                variantIds: d.variantIds || [],
                variantNames: d.variantNames || [],
                variantImages: d.variantImages || [],
              })),
            };

            if (action.isVariant) {
              payload.sourceVariantId = action.sourceVariantId || [];
              payload.sourceVariantName = action.sourceVariantName || [];
              payload.sourceVariantImages = action.sourceVariantImages || [];
            }

            return payload;
          }

          if (action.type === "add") {
            return {
              ...base,
              productId: action.productId,
              productName: action.productName,
              variantId: action.variantId || [],
              variantName: action.variantName || [],
              variantImage: action.imageUrl || "",
            };
          }

          if (action.type === "remove") {
            return {
              ...base,
              productId: action.productId,
              productName: action.productName,
              variantId: action.variantId || [],
              variantName: action.variantName || [],
              variantImage: action.imageUrl || "",
            };
          }

          return base;
        }),
      })),
    })),
  };
};