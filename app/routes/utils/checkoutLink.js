export const extractNumericId = (gid) => {
  if (!gid) return "";
  const match = String(gid).match(/(\d+)$/);
  return match ? match[1] : String(gid);
};

export const buildShippingAddressParams = (customer) => {
  if (!customer) return "";
  const parts = [];

  const addField = (key, value) => {
    if (value && String(value).trim() !== "") {
      parts.push(
        `checkout[shipping_address][${key}]=${encodeURIComponent(value.trim())}`,
      );
    }
  };

  addField("first_name", customer.firstName);
  addField("last_name", customer.lastName);
  addField("company", customer.companyName);
  addField("address1", customer.address1);
  addField("address2", customer.address2);
  addField("city", customer.city);
  addField("province", customer.province);
  addField("zip", customer.zip);

  const countryValue = customer.countryCode?.trim() || customer.country;
  addField("country", countryValue);

  return parts.join("&");
};

export const buildAttributesParams = (properties) => {
  const parts = [];
  (properties || []).forEach((prop) => {
    const name = (prop.name || "").trim();
    const value = (prop.value || "").trim();
    if (name && value) {
      parts.push(
        `attributes[${encodeURIComponent(name)}]=${encodeURIComponent(value)}`,
      );
    }
  });
  return parts.join("&");
};

export const buildNoteParam = (note) => {
  const trimmed = (note || "").trim();
  return trimmed ? `note=${encodeURIComponent(trimmed)}` : "";
};

export const buildCampaignParams = (campaignParams) => {
  if (!campaignParams) return "";
  const parts = [];

  const addField = (key, value) => {
    const trimmed = (value || "").trim();
    if (trimmed) parts.push(`${key}=${encodeURIComponent(trimmed)}`);
  };

  addField("utm_source", campaignParams.source);
  addField("utm_medium", campaignParams.medium);
  addField("utm_campaign", campaignParams.campaign);
  addField("utm_term", campaignParams.term);
  addField("utm_content", campaignParams.content);

  return parts.join("&");
};

export const buildItemsQueryString = (products) => {
  const parts = [];
  let index = 0;
  (products || []).forEach((product) => {
    (product.variants || []).forEach((variant) => {
      const numericId = extractNumericId(variant.variantsId);
      const qty = variant.quantity || 1;
      if (!numericId) return;
      parts.push(`items[${index}][id]=${numericId}`);
      parts.push(`items[${index}][quantity]=${qty}`);
      if (variant.purchaseOption && variant.purchaseOption !== "onetime") {
        const sellingPlanNumericId = extractNumericId(variant.purchaseOption);
        if (sellingPlanNumericId) {
          parts.push(`items[${index}][selling_plan]=${sellingPlanNumericId}`);
        }
      }
      index++;
    });
  });
  return parts.join("&");
};

export const buildCheckoutLink = (
  shop,
  products,
  discountCode,
  removePreviousDiscounts,
  customer,
  properties,
  orderNote,
  campaignParams,
) => {
  if (!shop) return "";

  const itemsQuery = buildItemsQueryString(products);
  if (!itemsQuery) return "";

  const trimmedDiscount = (discountCode || "").trim();
  let checkoutPath = trimmedDiscount
    ? `/checkout?discount=${encodeURIComponent(trimmedDiscount)}`
    : `/checkout`;

  const noteQuery = buildNoteParam(orderNote);
  if (noteQuery) {
    checkoutPath += `${checkoutPath.includes("?") ? "&" : "?"}${noteQuery}`;
  }

  const shippingAddressQuery = buildShippingAddressParams(customer);
  if (shippingAddressQuery) {
    checkoutPath += `${checkoutPath.includes("?") ? "&" : "?"}${shippingAddressQuery}`;
  }

  const attributesQuery = buildAttributesParams(properties);
  if (attributesQuery) {
    checkoutPath += `${checkoutPath.includes("?") ? "&" : "?"}${attributesQuery}`;
  }

  const cartAddPath = `/cart/add?${itemsQuery}&return_to=${encodeURIComponent(checkoutPath)}`;

  let finalUrl = removePreviousDiscounts
    ? `https://${shop}/cart/clear?return_to=${encodeURIComponent(cartAddPath)}`
    : `https://${shop}${cartAddPath}`;

  const campaignQuery = buildCampaignParams(campaignParams);
  if (campaignQuery) {
    finalUrl += `${finalUrl.includes("?") ? "&" : "?"}${campaignQuery}`;
  }

  return finalUrl;
};