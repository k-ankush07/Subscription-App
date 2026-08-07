// import { authenticate, unauthenticated } from "../shopify.server";

// const CORS_HEADERS = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "POST, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

// const SKIP_MUTATION = `#graphql
//   mutation SkipSubscriptionBillingCycle(
//     $billingCycleInput: SubscriptionBillingCycleInput!
//   ) {
//     subscriptionBillingCycleSkip(
//       billingCycleInput: $billingCycleInput
//     ) {
//       billingCycle {
//         cycleIndex
//         billingAttemptExpectedDate
//         skipped
//         edited
//         status
//       }
//       userErrors {
//         field
//         message
//         code
//       }
//     }
//   }
// `;

// // contract ka asli owner customer hi hai ya nahi, ye check karne ke liye
// const CONTRACT_OWNER_QUERY = `#graphql
//   query GetContractOwner($contractId: ID!) {
//     subscriptionContract(id: $contractId) {
//       id
//       customer {
//         id
//       }
//     }
//   }
// `;

// export const action = async ({ request }) => {
//   if (request.method === "OPTIONS") {
//     return new Response(null, { headers: CORS_HEADERS });
//   }
//   if (request.method !== "POST") {
//     return new Response("Method not allowed", {
//       status: 405,
//       headers: CORS_HEADERS,
//     });
//   }

//   try {
//     const { sessionToken } = await authenticate.public.customerAccount(request);
//     const shop = sessionToken.dest.replace("https://", "");
//     const { admin } = await unauthenticated.admin(shop);

//     const body = await request.json();
//     let { contractId, cycleIndex } = body || {};

//     if (!contractId) {
//       return Response.json(
//         { success: false, error: "contractId missing" },
//         { status: 400, headers: CORS_HEADERS },
//       );
//     }

//     if (/^\d+$/.test(String(contractId))) {
//       contractId = `gid://shopify/SubscriptionContract/${contractId}`;
//     }

//     cycleIndex = parseInt(cycleIndex, 10);
//     if (Number.isNaN(cycleIndex)) {
//       return Response.json(
//         { success: false, error: "Invalid billing cycle index" },
//         { status: 400, headers: CORS_HEADERS },
//       );
//     }

//     const ownerRes = await admin.graphql(CONTRACT_OWNER_QUERY, {
//       variables: { contractId },
//     });
//     const ownerData = await ownerRes.json();
//     const contractCustomerId =
//       ownerData?.data?.subscriptionContract?.customer?.id;

//     if (!contractCustomerId) {
//       return Response.json(
//         { success: false, error: "Subscription contract not found" },
//         { status: 404, headers: CORS_HEADERS },
//       );
//     }

//     const tokenCustomerId = sessionToken.sub?.startsWith("gid://")
//       ? sessionToken.sub
//       : `gid://shopify/Customer/${sessionToken.sub}`;

//     if (tokenCustomerId !== contractCustomerId) {
//       console.warn(
//         `[skip] ownership mismatch: token=${tokenCustomerId} contractOwner=${contractCustomerId}`,
//       );
//       return Response.json(
//         { success: false, error: "Not authorized to modify this subscription" },
//         { status: 403, headers: CORS_HEADERS },
//       );
//     }

//     // --- actual skip ---
//     const res = await admin.graphql(SKIP_MUTATION, {
//       variables: {
//         billingCycleInput: {
//           contractId,
//           selector: { index: cycleIndex },
//         },
//       },
//     });

//     const { data, errors } = await res.json();

//     if (errors) {
//       console.error("[skip] GraphQL errors:", JSON.stringify(errors, null, 2));
//       return Response.json(
//         { success: false, error: errors },
//         { status: 500, headers: CORS_HEADERS },
//       );
//     }

//     const payload = data?.subscriptionBillingCycleSkip;

//     if (!payload || payload.userErrors?.length) {
//       console.error("[skip] userErrors:", payload?.userErrors);
//       return Response.json(
//         {
//           success: false,
//           error:
//             payload?.userErrors?.map((e) => e.message).join(", ") ||
//             "Skip failed",
//         },
//         { status: 400, headers: CORS_HEADERS },
//       );
//     }

//     return Response.json(
//       {
//         success: true,
//         skippedCycleIndex: payload.billingCycle.cycleIndex,
//         billingAttemptExpectedDate:
//           payload.billingCycle.billingAttemptExpectedDate,
//       },
//       { headers: CORS_HEADERS },
//     );
//   } catch (err) {
//     console.error("api.subscriptions.skip error:", err.message, err.stack);
//     return Response.json(
//       { success: false, error: err.message || "Unknown error" },
//       { status: 500, headers: CORS_HEADERS },
//     );
//   }
// };

// // GET support nahi hai is route pe
// export const loader = async () => {
//   return new Response("Method not allowed", {
//     status: 405,
//     headers: CORS_HEADERS,
//   });
// };


import { authenticate, unauthenticated } from "../shopify.server";
import { sendMail } from "../lib/mailer.server";
import { buildSkipEmail } from "../lib/email-templates/subscription-emails.server";
import {
  getContractEmailData,
  getNextBillingDate,
  getCustomerPortalBaseUrl,
  getShopName,
} from "../lib/email-helpers.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SKIP_MUTATION = `#graphql
  mutation SkipSubscriptionBillingCycle(
    $billingCycleInput: SubscriptionBillingCycleInput!
  ) {
    subscriptionBillingCycleSkip(
      billingCycleInput: $billingCycleInput
    ) {
      billingCycle {
        cycleIndex
        billingAttemptExpectedDate
        skipped
        edited
        status
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const CONTRACT_OWNER_QUERY = `#graphql
  query GetContractOwner($contractId: ID!) {
    subscriptionContract(id: $contractId) {
      id
      customer {
        id
      }
    }
  }
`;

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
    let { contractId, cycleIndex } = body || {};

    if (!contractId) {
      return Response.json(
        { success: false, error: "contractId missing" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (/^\d+$/.test(String(contractId))) {
      contractId = `gid://shopify/SubscriptionContract/${contractId}`;
    }

    cycleIndex = parseInt(cycleIndex, 10);
    if (Number.isNaN(cycleIndex)) {
      return Response.json(
        { success: false, error: "Invalid billing cycle index" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const ownerRes = await admin.graphql(CONTRACT_OWNER_QUERY, {
      variables: { contractId },
    });
    const ownerData = await ownerRes.json();
    const contractCustomerId =
      ownerData?.data?.subscriptionContract?.customer?.id;

    if (!contractCustomerId) {
      return Response.json(
        { success: false, error: "Subscription contract not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const tokenCustomerId = sessionToken.sub?.startsWith("gid://")
      ? sessionToken.sub
      : `gid://shopify/Customer/${sessionToken.sub}`;

    if (tokenCustomerId !== contractCustomerId) {
      console.warn(
        `[skip] ownership mismatch: token=${tokenCustomerId} contractOwner=${contractCustomerId}`,
      );
      return Response.json(
        { success: false, error: "Not authorized to modify this subscription" },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    // --- actual skip ---
    const res = await admin.graphql(SKIP_MUTATION, {
      variables: {
        billingCycleInput: {
          contractId,
          selector: { index: cycleIndex },
        },
      },
    });

    const { data, errors } = await res.json();

    if (errors) {
      console.error("[skip] GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json(
        { success: false, error: errors },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const payload = data?.subscriptionBillingCycleSkip;

    if (!payload || payload.userErrors?.length) {
      console.error("[skip] userErrors:", payload?.userErrors);
      return Response.json(
        {
          success: false,
          error:
            payload?.userErrors?.map((e) => e.message).join(", ") ||
            "Skip failed",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // --- email bhejna (best-effort — fail ho bhi jaye to skip response fail nahi hona chahiye) ---
    try {
      const [emailData, nextDate, portalBaseUrl, shopName] = await Promise.all([
        getContractEmailData(admin, contractId),
        getNextBillingDate(admin, contractId, cycleIndex),
        getCustomerPortalBaseUrl(admin),
        getShopName(admin),
      ]);

      if (emailData?.email && portalBaseUrl) {
        const { subject, html } = buildSkipEmail({
          customerName: emailData.customerName,
          skippedDate: formatDateDisplay(payload.billingCycle.billingAttemptExpectedDate),
          nextOrderDate: formatDateDisplay(nextDate),
          lineItem: emailData.lineItem,
          shippingAddress: emailData.shippingAddress,
          billingAddress: emailData.shippingAddress, // billing address alag se store nahi ho rahi abhi
          paymentLast4: emailData.paymentLast4,
          manageUrl: `${portalBaseUrl}/subscriptions/${getNumericId(contractId)}`,
        });

        await sendMail({ to: emailData.email, subject, html, fromName: shopName });
      } else if (emailData?.email && !portalBaseUrl) {
        console.warn("[skip] portal base URL not resolved — email skipped");
      }
    } catch (mailErr) {
      console.error("[skip] email notification failed:", mailErr.message);
    }

    return Response.json(
      {
        success: true,
        skippedCycleIndex: payload.billingCycle.cycleIndex,
        billingAttemptExpectedDate:
          payload.billingCycle.billingAttemptExpectedDate,
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error("api.subscriptions.skip error:", err.message, err.stack);
    return Response.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};

// GET support nahi hai is route pe
export const loader = async () => {
  return new Response("Method not allowed", {
    status: 405,
    headers: CORS_HEADERS,
  });
};