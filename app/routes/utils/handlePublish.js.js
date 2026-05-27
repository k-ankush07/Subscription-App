export const handlePublish = ({
  selectedProducts,
  options,
  productChanges,
  title,
  description,
  setPublishErrors,
}) => {
  const errors = [];

  // 1. Product selected nahi
  if (selectedProducts.length === 0) {
    errors.push("At least one product or variant must be selected");
  }

  // 2. Delivery frequency checks
  const freqMap = new Map();

  options.forEach((opt, i) => {
    const label = opt.name || `Option #${i + 1}`;

    const key = `${opt.deliveryFrequency}-${opt.deliveryInterval}`;

    if (opt.deliveryFrequency) {
      if (freqMap.has(key)) {
        errors.push(
          `${label}: Delivery frequency "${opt.deliveryFrequency} ${opt.deliveryInterval}" is duplicate`
        );
      } else {
        freqMap.set(key, true);
      }
    }

    if (!opt.deliveryFrequency) {
      errors.push(`${label}: Delivery frequency is required`);
    }

    if (opt.billingType === "prepaid") {
      if (!opt.billingFrequency) {
        errors.push(`${label}: Billing frequency is required for prepaid`);
      } else if (
        Number(opt.billingFrequency) <= Number(opt.deliveryFrequency) ||
        Number(opt.billingFrequency) % Number(opt.deliveryFrequency) !== 0
      ) {
        errors.push(
          `${label}: Billing frequency must be greater and multiple of delivery frequency`
        );
      }
    }

    if (opt.changeQtyAfterOrders) {
      if (!opt.changeQtyQuantity) {
        errors.push(`${label}: Quantity is required`);
      }
      if (!opt.changeQtyAfterOrdersNum) {
        errors.push(`${label}: After orders is required`);
      }
      if (!opt.changeQtyProducts?.length) {
        errors.push(`${label}: Select at least one product`);
      }
    }

    if (opt.removeFreeProducts) {
      if (!opt.removeFreeAfterOrders) {
        errors.push(`${label}: After orders required`);
      }
      if (!opt.removeFreeProductsList?.length) {
        errors.push(`${label}: Select at least one product`);
      }
    }

    if (opt.setMinQty && !opt.minQuantity) {
      errors.push(`${label}: Minimum quantity required`);
    }
  });

  setPublishErrors(errors);

  if (errors.length > 0) return null;

  return {
    title,
    description,
    options,
    productChanges,
    selectedProducts: selectedProducts.map((p) => ({
      productId: p.productId,
      variantIds: p.variantIds || [],
    })),
  };
};