// import { authenticate, unauthenticated } from "../shopify.server";
// import { sendMail } from "../lib/mailer.server";
// import { buildResumeEmail } from "../lib/email-templates/subscription-emails.server";
// import {
//   getContractEmailData,
//   getCustomerPortalBaseUrl,
//   getShopName,
// } from "../lib/email-helpers.server";

// const CORS_HEADERS = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "POST, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

// function getNumericId(gid) {
//   if (!gid) return null;
//   return gid.split("/").pop();
// }

// function formatDateDisplay(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   return d.toLocaleDateString("en-GB", {
//     day: "numeric",
//     month: "long",
//     year: "numeric",
//     timeZone: "UTC",
//   });
// }

// export const loader = async () => new Response("Method not allowed", { status: 405 });

// export const action = async ({ request }) => {
//   if (request.method === "OPTIONS") {
//     return new Response(null, { headers: CORS_HEADERS });
//   }

//   if (request.method !== "POST") {
//     return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
//   }

//   try {
//     const { sessionToken } = await authenticate.public.customerAccount(request);
//     const shop = sessionToken.dest.replace("https://", "");
//     const { admin } = await unauthenticated.admin(shop);

//     const body = await request.json().catch(() => ({}));
//     const { subscriptionContractId } = body;

//     if (!subscriptionContractId) {
//       return Response.json(
//         { error: "subscriptionContractId is required" },
//         { status: 400, headers: CORS_HEADERS }
//       );
//     }

//     const res = await admin.graphql(
//       `#graphql
//       mutation ResumeSubscription($contractId: ID!) {
//         subscriptionContractActivate(subscriptionContractId: $contractId) {
//           contract {
//             id
//             status
//           }
//           userErrors {
//             field
//             message
//           }
//         }
//       }`,
//       { variables: { contractId: subscriptionContractId } }
//     );

//     const { data, errors } = await res.json();

//     if (errors) {
//       console.error("Resume GraphQL errors:", JSON.stringify(errors, null, 2));
//       return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
//     }

//     const userErrors = data?.subscriptionContractActivate?.userErrors ?? [];
//     if (userErrors.length > 0) {
//       console.error("Resume userErrors:", userErrors);
//       return Response.json(
//         { error: userErrors.map((e) => e.message).join(", ") },
//         { status: 400, headers: CORS_HEADERS }
//       );
//     }

//     const contract = data?.subscriptionContractActivate?.contract;
//     try {
//       const [emailData, portalBaseUrl, shopName] = await Promise.all([
//         getContractEmailData(admin, subscriptionContractId),
//         getCustomerPortalBaseUrl(admin),
//         getShopName(admin),
//       ]);

//       if (emailData?.email && portalBaseUrl) {
//         const { subject, html } = buildResumeEmail({
//           customerName: emailData.customerName,
//           nextOrderDate: formatDateDisplay(emailData.nextOrderDate),
//           lineItems: emailData.lineItems,
//           subtotal: emailData.subtotal,
//           shipping: emailData.shipping,
//           total: emailData.total,
//           shippingAddress: emailData.shippingAddress,
//           billingAddress: emailData.shippingAddress,
//           paymentLast4: emailData.paymentLast4,
//           paymentBrand: emailData.paymentBrand,
//           manageUrl: `${portalBaseUrl}/subscriptions/${getNumericId(subscriptionContractId)}`,
//         });

//         await sendMail({
//           to: emailData.email,
//           subject,
//           html,
//           fromName: shopName,
//         });
//       } else if (emailData?.email && !portalBaseUrl) {
//         console.warn("[resume] portal base URL not resolved — email skipped");
//       }
//     } catch (mailErr) {
//       console.error("[resume] email notification failed:", mailErr.message);
//     }

//     return Response.json({ contract }, { headers: CORS_HEADERS });
//   } catch (err) {
//     console.error("api.subscriptions.resume error:", err.message, err.stack);
//     return Response.json(
//       { error: err.message || "Unknown error" },
//       { status: 500, headers: CORS_HEADERS }
//     );
//   }
// };

import { authenticate, unauthenticated } from "../shopify.server";
import { sendMail } from "../lib/mailer.server";
import { buildResumeEmail } from "../lib/email-templates/subscription-emails.server";
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

// 👇 ADD KARO — pause/cancel route jaisa hi
const API = process.env.VITE_API_URL || import.meta.env.VITE_API_URL;
const SECRET_KEY = process.env.VITE_API_SECRET_KEY || import.meta.env.VITE_API_SECRET_KEY;

function getNumericId(gid) {
  if (!gid) return null;
  return gid.split("/").pop();
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const loader = async () => new Response("Method not allowed", { status: 405 });

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

    const body = await request.json().catch(() => ({}));
    const { subscriptionContractId } = body;

    if (!subscriptionContractId) {
      return Response.json(
        { error: "subscriptionContractId is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const res = await admin.graphql(
      `#graphql
      mutation ResumeSubscription($contractId: ID!) {
        subscriptionContractActivate(subscriptionContractId: $contractId) {
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
      { variables: { contractId: subscriptionContractId } }
    );

    const { data, errors } = await res.json();

    if (errors) {
      console.error("Resume GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const userErrors = data?.subscriptionContractActivate?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.error("Resume userErrors:", userErrors);
      return Response.json(
        { error: userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const contract = data?.subscriptionContractActivate?.contract;

    // 👇 ADD KARO — DB record update (yahi missing tha, isliye resume ke baad bhi "paused" hi reh jaata tha)
    try {
      await fetch(`${API}/api/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": SECRET_KEY },
        body: JSON.stringify({
          subscriptionId: getNumericId(subscriptionContractId),
          contractId: subscriptionContractId,
          actionType: "active",
          actionBy: "customer",
          actionAt: new Date().toISOString(),
          actionReason: "",
        }),
      });
    } catch (err) {
      console.error("[resume] failed to record action:", err.message);
    }

    try {
      const [emailData, portalBaseUrl, shopName] = await Promise.all([
        getContractEmailData(admin, subscriptionContractId),
        getCustomerPortalBaseUrl(admin),
        getShopName(admin),
      ]);

      if (emailData?.email && portalBaseUrl) {
        const { subject, html } = buildResumeEmail({
          customerName: emailData.customerName,
          nextOrderDate: formatDateDisplay(emailData.nextOrderDate),
          lineItems: emailData.lineItems,
          subtotal: emailData.subtotal,
          shipping: emailData.shipping,
          total: emailData.total,
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
      } else if (emailData?.email && !portalBaseUrl) {
        console.warn("[resume] portal base URL not resolved — email skipped");
      }
    } catch (mailErr) {
      console.error("[resume] email notification failed:", mailErr.message);
    }

    return Response.json({ contract }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("api.subscriptions.resume error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};