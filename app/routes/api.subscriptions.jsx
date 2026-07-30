import { authenticate, unauthenticated } from "../shopify.server";
import prisma from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
// nffrejfvfj
export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  return new Response("Method not allowed", { status: 405 });
};

export const loader = async ({ request }) => {
  try {
    const { sessionToken } = await authenticate.public.customerAccount(request);
    const shop = sessionToken.dest.replace("https://", "");
    const { admin } = await unauthenticated.admin(shop);

    const url = new URL(request.url);
    let customerId = url.searchParams.get("customerId");

    if (!customerId || customerId === "undefined" || customerId === "null") {
      return Response.json(
        { error: "customerId missing or invalid" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (/^\d+$/.test(customerId)) {
      customerId = `gid://shopify/Customer/${customerId}`;
    }

    const res = await admin.graphql(
      `#graphql
      query GetCustomerSubscriptions($customerId: ID!) {
        customer(id: $customerId) {
          subscriptionContracts(first: 30) {
            edges {
              node {
                id
                status
                nextBillingDate
                note
                deliveryPolicy {
                  interval
                  intervalCount
                }
                lines(first: 10) {
                  edges {
                    node {
                      title
                      variantTitle
                      quantity
                      lineDiscountedPrice {
                        amount
                        currencyCode
                      }
                      currentPrice {
                        amount
                        currencyCode
                      }
                      productId
                    }
                  }
                }
                deliveryMethod {
                  ... on SubscriptionDeliveryMethodShipping {
                    shippingOption {
                      title
                      presentmentTitle
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { customerId } }
    );

    const { data, errors } = await res.json();

    // ------------------------------------------------------------------
    // TEMP DEBUG — remove once the empty-subscriptions issue is resolved.
    // Prints exactly which shop + customerId were queried, and whether
    // Shopify actually found a customer node for that ID.
    // ------------------------------------------------------------------
    console.log(
      "DEBUG subscriptions lookup:",
      JSON.stringify(
        {
          shop,
          queriedCustomerId: customerId,
          customerFound: data?.customer !== null && data?.customer !== undefined,
          rawCustomer: data?.customer,
        },
        null,
        2
      )
    );

    if (errors) {
      console.error("GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json({ error: errors }, { status: 500, headers: CORS_HEADERS });
    }

    const contracts = data?.customer?.subscriptionContracts?.edges?.map((e) => e.node) ?? [];

    const productIds = [
      ...new Set(
        contracts.flatMap((contract) =>
          contract.lines?.edges?.map((edge) => edge.node.productId).filter(Boolean) ?? []
        )
      ),
    ];

    const productImagesMap = {};
    if (productIds.length > 0) {
      const imagesRes = await admin.graphql(
        `#graphql
        query GetProductsByIds($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              featuredImage {
                url
              }
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
            }
          }
        }`,
        { variables: { ids: productIds } }
      );

      const imagesData = await imagesRes.json();
      const nodes = imagesData.data?.nodes ?? [];
      nodes.forEach((node) => {
        if (node?.id) {
          productImagesMap[node.id] =
            node.images?.edges?.[0]?.node?.url || node.featuredImage?.url || null;
        }
      });
    }

    // Fetch the REAL upcoming billing cycles for a contract, since
    // `nextBillingDate` on the contract does not reliably reflect
    // individual cycle edits made via subscriptionBillingCycleScheduleEdit.
    //
    // IMPORTANT: this API version requires the selector argument named
    // exactly `billingCyclesDateRangeSelector`, typed as
    // `SubscriptionBillingCyclesDateRangeSelector!` (NOT a bare
    // `contractId` + `first`, and NOT `billingCyclesDateRange`). Passing
    // just `contractId`/`first` throws:
    //   "subscriptionBillingCycles requires exactly one of
    //    billing_cycles_date_range_selector, billing_cycles_index_range_selector"
    async function fetchUpcomingBillingCycles(contractId) {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000 // look 90 days ahead
      ).toISOString();

      try {
        const cyclesRes = await admin.graphql(
          `#graphql
          query GetUpcomingBillingCycles($contractId: ID!, $rangeSelector: SubscriptionBillingCyclesDateRangeSelector!) {
            subscriptionBillingCycles(
              contractId: $contractId
              first: 6
              billingCyclesDateRangeSelector: $rangeSelector
            ) {
              edges {
                node {
                  cycleIndex
                  billingAttemptExpectedDate
                  status
                  skipped
                  edited
                }
              }
            }
          }`,
          {
            variables: {
              contractId,
              rangeSelector: { startDate, endDate },
            },
          }
        );

        const cyclesPayload = await cyclesRes.json();
        if (cyclesPayload.errors) {
          console.error(
            `subscriptionBillingCycles query errors for ${contractId}:`,
            JSON.stringify(cyclesPayload.errors, null, 2)
          );
          return [];
        }

        const cycles =
          cyclesPayload.data?.subscriptionBillingCycles?.edges?.map((e) => e.node) ?? [];

        // Defensive sort — API should already return these in order, but
        // don't rely on it for something as important as "what's next."
        cycles.sort(
          (a, b) => new Date(a.billingAttemptExpectedDate) - new Date(b.billingAttemptExpectedDate)
        );

        return cycles;
      } catch (e) {
        console.error(`Failed to fetch billing cycles for ${contractId}:`, e.message);
        return [];
      }
    }

    // Har contract ke liye apna custom payment-policy rule merge karo (Prisma se)
    const enriched = await Promise.all(
      contracts.map(async (contract) => {
        const contractIdNumeric = contract.id.split("/").pop();

        let policy = null;
        try {
          policy = await prisma.subscriptionPolicy.findUnique({
            where: { subscriptionContractId: contractIdNumeric },
          });
        } catch (e) {
          console.error("Policy lookup failed for", contractIdNumeric, e.message);
        }

        // Line item totals se subtotal compute karo, plus attach product images
        const lines = contract.lines?.edges?.map((e) => {
          const node = e.node;
          return {
            ...node,
            imageUrl: node.productId ? productImagesMap[node.productId] || null : null,
          };
        }) ?? [];
        const subtotal = lines.reduce(
          (sum, line) => sum + parseFloat(line.lineDiscountedPrice?.amount ?? 0),
          0
        );

        const upcomingCycles = await fetchUpcomingBillingCycles(contract.id);

        // Use the first not-yet-billed, not-skipped cycle as the real
        // "next billing date" — this reflects any per-cycle reschedule,
        // unlike the stale `contract.nextBillingDate` scalar.
        const nextCycle =
          upcomingCycles.find((c) => !c.skipped && c.status !== "BILLED") ?? upcomingCycles[0];

        const realNextBillingDate = nextCycle?.billingAttemptExpectedDate ?? contract.nextBillingDate;

        return {
          ...contract,
          lines: { edges: lines.map((line) => ({ node: line })) },
          nextBillingDate: realNextBillingDate,
          nextBillingCycleIndex: nextCycle?.cycleIndex ?? null,
          upcomingCycles, // [{ cycleIndex, billingAttemptExpectedDate, status, skipped, edited }, ...]
          subtotal,
          currencyCode: lines[0]?.lineDiscountedPrice?.currencyCode ?? "INR",
          paymentsCompleted: policy?.paymentsCompleted ?? 0,
          minPaymentsRequired: policy?.minPaymentsRequired ?? null,
        };
      })
    );

    return Response.json({ subscriptions: enriched }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("api.subscriptions error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
};