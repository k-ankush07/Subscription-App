function formatAddress(address) {
  if (!address) return "";
  const parts = [
    address.name,
    address.address1,
    address.address2,
    address.city,
    address.province,
    address.zip,
    address.country,
  ].filter(Boolean);
  return parts.join(", ");
}

function baseWrapper(innerHtml) {
  return `
  <div style="background:#f3f4f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:32px;border-radius:6px;">
      ${innerHtml}
    </div>
  </div>`;
}

function lineItemHtml(item) {
  return `
    <table style="width:100%;background:#f3f4f6;border-radius:6px;margin:8px 0;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px;width:64px;">
          <img src="${item.imageUrl || ""}" alt="${item.title || "Product"}" width="56" height="56" style="border-radius:4px;object-fit:cover;" />
        </td>
        <td style="padding:16px 0;">
          <div style="font-size:14px;color:#111;">${item.title || ""}</div>
          <div style="font-size:13px;color:#555;">Quantity: ${item.quantity ?? 1}</div>
        </td>
        <td style="padding:16px;text-align:right;font-size:14px;color:#111;white-space:nowrap;">
          ${item.currencyCode || "₹"} ${item.amount ?? ""}
        </td>
      </tr>
    </table>`;
}

// ek saath saare products render karo — cancel/skip email me ab sirf base product nahi,
// automation se add hue products bhi dikhne chahiye (jaisa customer portal preview me dikhta hai)
function lineItemsListHtml(lineItems) {
  if (!lineItems || lineItems.length === 0) return "";
  return lineItems.map((item) => lineItemHtml(item)).join("");
}

function summaryRowHtml(label, value, { bold = false } = {}) {
  if (!value) return "";
  const fontSize = bold ? "14px" : "13px";
  const weight = bold ? "bold" : "normal";
  const color = bold ? "#111" : "#555";
  return `
    <tr>
      <td style="padding:${bold ? "8px" : "4px"} 16px 0;font-size:${fontSize};font-weight:${weight};color:${color};">${label}</td>
      <td style="padding:${bold ? "8px" : "4px"} 16px 0;text-align:right;font-size:${fontSize};font-weight:${weight};color:#111;">${value.currencyCode || "₹"} ${value.amount}</td>
    </tr>`;
}

// Subtotal / Shipping / Total block — Image 2 wale customer-portal preview jaisa
function orderSummaryHtml({ subtotal, shipping, total }) {
  if (!subtotal && !shipping && !total) return "";
  return `
    <table style="width:100%;margin-top:4px;padding-top:8px;border-top:1px solid #e5e7eb;" cellpadding="0" cellspacing="0">
      ${summaryRowHtml("Subtotal", subtotal)}
      ${summaryRowHtml("Shipping", shipping)}
      ${summaryRowHtml("Total", total, { bold: true })}
    </table>`;
}

function addressBlockHtml({ shippingAddress, billingAddress, nextOrderDate, paymentLast4 }) {
  return `
    <table style="width:100%;margin-top:16px;" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;padding-right:16px;width:50%;">
          <div style="font-weight:bold;font-size:13px;color:#111;margin-bottom:6px;">Shipping Address</div>
          <div style="font-size:13px;color:#555;line-height:1.5;">${formatAddress(shippingAddress)}</div>
        </td>
        <td style="vertical-align:top;width:50%;">
          <div style="font-weight:bold;font-size:13px;color:#111;margin-bottom:6px;">Billing Address</div>
          <div style="font-size:13px;color:#555;line-height:1.5;">${formatAddress(billingAddress)}</div>
        </td>
      </tr>
      ${
        nextOrderDate
          ? `<tr><td style="padding-top:16px;vertical-align:top;">
              <div style="font-weight:bold;font-size:13px;color:#111;margin-bottom:6px;">Next Order Date</div>
              <div style="font-size:13px;color:#555;">${nextOrderDate}</div>
            </td>
            <td style="padding-top:16px;vertical-align:top;">
              <div style="font-weight:bold;font-size:13px;color:#111;margin-bottom:6px;">Payment Method</div>
              <div style="font-size:13px;color:#555;">${paymentLast4 ? `Ending in ${paymentLast4}` : "-"}</div>
            </td></tr>`
          : ""
      }
    </table>`;
}

function manageButtonHtml(manageUrl) {
  return `
    <a href="${manageUrl}"
       style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;
              padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold;margin:20px 0;">
      Manage Subscription
    </a>`;
}

// caller purana single `lineItem` bheje ya naya `lineItems` array — dono handle ho jayenge
function resolveLineItems({ lineItems, lineItem }) {
  if (lineItems && lineItems.length > 0) return lineItems;
  if (lineItem) return [lineItem];
  return [];
}

// ---------- SKIP EMAIL ----------
export function buildSkipEmail({
  customerName,
  skippedDate,
  nextOrderDate,
  lineItem,
  lineItems,
  subtotal,
  shipping,
  total,
  shippingAddress,
  billingAddress,
  paymentLast4,
  manageUrl,
}) {
  const items = resolveLineItems({ lineItems, lineItem });
  const subject = "Your upcoming order was skipped";
  const html = baseWrapper(`
    <p style="font-size:14px;color:#111;">Hello ${customerName},</p>
    <p style="font-size:14px;color:#111;line-height:1.6;">
      Your upcoming order for <strong>${skippedDate}</strong> was skipped. You will not be charged.
      Your next subscription charge date is <strong>${nextOrderDate}</strong>.
    </p>
    <p style="font-size:14px;color:#111;">You can manage the subscription using the button below:</p>
    ${manageButtonHtml(manageUrl)}
    ${lineItemsListHtml(items)}
    ${orderSummaryHtml({ subtotal, shipping, total })}
    ${addressBlockHtml({ shippingAddress, billingAddress, nextOrderDate, paymentLast4 })}
  `);
  return { subject, html };
}

// ---------- CANCEL EMAIL ----------
export function buildCancelEmail({
  customerName,
  lineItem,
  lineItems,
  subtotal,
  shipping,
  total,
  shippingAddress,
  billingAddress,
  paymentLast4,
  manageUrl,
}) {
  const items = resolveLineItems({ lineItems, lineItem });
  const subject = "Your subscription has been cancelled";
  const html = baseWrapper(`
    <p style="font-size:14px;color:#111;">Hello ${customerName},</p>
    <p style="font-size:14px;color:#111;">Your subscription has been cancelled.</p>
    <p style="font-size:14px;color:#111;">You can manage the subscription using the button below:</p>
    ${manageButtonHtml(manageUrl)}
    ${lineItemsListHtml(items)}
    ${orderSummaryHtml({ subtotal, shipping, total })}
    ${addressBlockHtml({ shippingAddress, billingAddress, paymentLast4 })}
  `);
  return { subject, html };
}