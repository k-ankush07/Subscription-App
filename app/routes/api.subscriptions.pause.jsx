// import { authenticate, unauthenticated } from "../shopify.server";
// import { sendMail } from "../lib/mailer.server";
// import { buildPauseEmail } from "../lib/email-templates/subscription-emails.server";
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
//       mutation PauseSubscription($contractId: ID!) {
//         subscriptionContractPause(subscriptionContractId: $contractId) {
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
//       console.error("Pause GraphQL errors:", JSON.stringify(errors, null, 2));
//       return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
//     }

//     const userErrors = data?.subscriptionContractPause?.userErrors ?? [];
//     if (userErrors.length > 0) {
//       console.error("Pause userErrors:", userErrors);
//       return Response.json(
//         { error: userErrors.map((e) => e.message).join(", ") },
//         { status: 400, headers: CORS_HEADERS }
//       );
//     }

//     const contract = data?.subscriptionContractPause?.contract;

//     // --- email bhejna (best-effort — fail ho bhi jaye to pause response fail nahi hona chahiye) ---
//     try {
//       const [emailData, portalBaseUrl, shopName] = await Promise.all([
//         getContractEmailData(admin, subscriptionContractId),
//         getCustomerPortalBaseUrl(admin),
//         getShopName(admin),
//       ]);

//       if (emailData?.email && portalBaseUrl) {
//         const { subject, html } = buildPauseEmail({
//           customerName: emailData.customerName,
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
//         console.warn("[pause] portal base URL not resolved — email skipped");
//       }
//     } catch (mailErr) {
//       console.error("[pause] email notification failed:", mailErr.message);
//     }

//     return Response.json({ contract }, { headers: CORS_HEADERS });
//   } catch (err) {
//     console.error("api.subscriptions.pause error:", err.message, err.stack);
//     return Response.json(
//       { error: err.message || "Unknown error" },
//       { status: 500, headers: CORS_HEADERS }
//     );
//   }
// };

import { authenticate, unauthenticated } from "../shopify.server";
import { sendMail } from "../lib/mailer.server";
import { buildPauseEmail } from "../lib/email-templates/subscription-emails.server";
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

const API = process.env.VITE_API_URL || import.meta.env.VITE_API_URL;
const SECRET_KEY = process.env.VITE_API_SECRET_KEY || import.meta.env.VITE_API_SECRET_KEY;

function getNumericId(gid) {
  if (!gid) return null;
  return gid.split("/").pop();
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
    const { subscriptionContractId, reason } = body;

    if (!subscriptionContractId) {
      return Response.json(
        { error: "subscriptionContractId is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const res = await admin.graphql(
      `#graphql
      mutation PauseSubscription($contractId: ID!) {
        subscriptionContractPause(subscriptionContractId: $contractId) {
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
      console.error("Pause GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const userErrors = data?.subscriptionContractPause?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.error("Pause userErrors:", userErrors);
      return Response.json(
        { error: userErrors.map((e) => e.message).join(", ") },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const contract = data?.subscriptionContractPause?.contract;

    // 👇 FIX: emailData ko sabse pehle fetch karo, taaki DB-update aur email-send
    // dono isi ek variable ko reuse kar saken — pehle yeh block neeche tha,
    // isliye emailData undefined hone se DB update hi silently fail ho raha tha
    let emailData = null;
    let portalBaseUrl = null;
    let shopName = null;
    try {
      [emailData, portalBaseUrl, shopName] = await Promise.all([
        getContractEmailData(admin, subscriptionContractId),
        getCustomerPortalBaseUrl(admin),
        getShopName(admin),
      ]);
    } catch (fetchErr) {
      console.error("[pause] pre-fetch for email/DB failed:", fetchErr.message);
    }

    // --- DB record update ---
    try {
      await fetch(`${API}/api/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": SECRET_KEY },
        body: JSON.stringify({
          subscriptionId: getNumericId(subscriptionContractId),
          contractId: subscriptionContractId,
          actionBy: "customer",
          actionAt: new Date().toISOString(),
          actionReason: reason || "",
          customerEmail: emailData?.email || "",
        }),
      });
    } catch (err) {
      console.error("[pause] failed to record action:", err.message);
    }

    // --- email bhejna (best-effort — fail ho bhi jaye to pause response fail nahi hona chahiye) ---
    try {
      if (emailData?.email && portalBaseUrl) {
        const { subject, html } = buildPauseEmail({
          customerName: emailData.customerName,
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
        console.warn("[pause] portal base URL not resolved — email skipped");
      }
    } catch (mailErr) {
      console.error("[pause] email notification failed:", mailErr.message);
    }

    return Response.json({ contract }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("api.subscriptions.pause error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};