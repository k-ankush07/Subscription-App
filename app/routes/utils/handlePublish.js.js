export const handlePublish = ({
  selectedProducts,
  options,
  productChanges,
  title,
  description,
}) => {
  return {
    title,
    description,
    options,
    productChanges,
   
    selectedProducts: selectedProducts.map((p) => ({
      productId: p.productId,
      productTitle: p.productTitle,
      variantIds: p.variantIds || [],
    })),
  };
};