import { authenticate, unauthenticated } from "../shopify.server";
import { sendMail } from "../lib/mailer.server";
import { buildCancelEmail } from "../lib/email-templates/subscription-emails.server";
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
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
function getNumericId(gid) {
  if (!gid) return null;
  return gid.split("/").pop();
}

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const body = await request.json();
    const subscriptionContractId = body.subscriptionContractId;
const cancelReason = body.reason || "";
    if (!subscriptionContractId) {
      return Response.json(
        { error: "subscriptionContractId is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    let emailData = null;
    try {
      emailData = await getContractEmailData(admin, subscriptionContractId);
    } catch (fetchErr) {
      console.error("[cancel] pre-fetch for email failed:", fetchErr.message);
    }

    const res = await admin.graphql(
      `#graphql
      mutation CancelSubscriptionContract($subscriptionContractId: ID!) {
        subscriptionContractCancel(subscriptionContractId: $subscriptionContractId) {
          contract {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
      { variables: { subscriptionContractId } },
    );

    const { data, errors } = await res.json();

    if (errors) {
      console.error(
        "Cancel subscription GraphQL errors:",
        JSON.stringify(errors, null, 2),
      );
      return Response.json(
        { error: errors },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const userErrors = data?.subscriptionContractCancel?.userErrors ?? [];
    if (userErrors.length > 0) {
      return Response.json(
        { error: userErrors[0].message || "Unable to cancel subscription" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
try {
  await fetch(`${API}/api/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": SECRET_KEY },
    body: JSON.stringify({
      subscriptionId: getNumericId(subscriptionContractId),
      contractId: subscriptionContractId,
      actionBy: "customer",     
      actionAt: new Date().toISOString(),
      actionReason: cancelReason,  
      customerEmail: emailData?.email || "",
    }),
  });
} catch (err) {
  console.error("Failed to record cancel source:", err.message);
}
    try {
      if (emailData?.email) {
        const [portalBaseUrl, shopName] = await Promise.all([
          getCustomerPortalBaseUrl(admin),
          getShopName(admin),
        ]);

        if (portalBaseUrl) {
          const { subject, html } = buildCancelEmail({
            customerName: emailData.customerName,
            lineItems: emailData.lineItems, // was: lineItem: emailData.lineItem
            subtotal: emailData.subtotal, // naya
            shipping: emailData.shipping, // naya
            total: emailData.total, // naya
            shippingAddress: emailData.shippingAddress,
            billingAddress: emailData.shippingAddress,
            paymentLast4: emailData.paymentLast4,
            paymentBrand: emailData.paymentBrand, 
            manageUrl: `${portalBaseUrl}/subscriptions/${getNumericId(subscriptionContractId)}`,
          });

          await sendMail({
            to: emailData.email,
            subject,
            html,
            fromName: shopName,
          });
        } else {
          console.warn("[cancel] portal base URL not resolved — email skipped");
        }
      }
    } catch (mailErr) {
      console.error("[cancel] email notification failed:", mailErr.message);
    }

    return Response.json(
      {
        success: true,
        subscription: data?.subscriptionContractCancel?.contract,
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error("api.subscriptions.cancel error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
