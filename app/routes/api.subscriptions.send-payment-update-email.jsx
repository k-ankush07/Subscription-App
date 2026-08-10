import { authenticate, unauthenticated } from "../shopify.server";
import { sendMail } from "../lib/mailer.server";
import { buildPaymentUpdateEmail } from "../lib/email-templates/subscription-emails.server";
import {
  getContractEmailData,
  getCustomerPortalBaseUrl,
  getShopName,
} from "../lib/email-helpers.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const loader = () => new Response("Use POST", { status: 405 });

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const { contractId } = await request.json();

    if (!contractId) {
      return Response.json(
        { success: false, error: "contractId zaroori hai" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const emailData = await getContractEmailData(admin, contractId);
    if (!emailData?.email) {
      return Response.json(
        { success: false, error: "Customer email nahi mili" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const [manageBaseUrl, shopName] = await Promise.all([
      getCustomerPortalBaseUrl(admin),
      getShopName(admin),
    ]);

    const numericId = contractId.split("/").pop();
    const manageUrl = manageBaseUrl ? `${manageBaseUrl}/subscriptions/${numericId}` : "#";

    const { subject, html } = buildPaymentUpdateEmail({
      customerName: emailData.customerName,
      lineItem: emailData.lineItem,
      lineItems: emailData.lineItems,
      subtotal: emailData.subtotal,
      shipping: emailData.shipping,
      total: emailData.total,
      shippingAddress: emailData.shippingAddress,
      billingAddress: emailData.shippingAddress,
      paymentLast4: emailData.paymentLast4,
      paymentBrand: emailData.paymentBrand,
      manageUrl,
    });

    const result = await sendMail({
      to: emailData.email,
      subject,
      html,
      fromName: shopName,
    });

    if (!result.success) {
      return Response.json(
        { success: false, error: result.error || "Email send failed" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    return Response.json({ success: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("send-payment-update-email error:", err.message, err.stack);
    return Response.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};