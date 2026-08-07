import { authenticate, unauthenticated } from "../shopify.server";
import { getContractPreview } from "../lib/billing-preview.server";
import prisma from "../db.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 50;

// Modal sirf 6 dikhata hai; thoda buffer (7th cycle ki date "Upcoming
// order" card pe dikhane ke liye) rakhne ke liye 20 fetch karte hain.
// Pehle 60 tha — jitna zyada fetch karoge utni GraphQL query slow hoti hai,
// aur 60 ki zaroorat hi nahi thi.
const BILLING_CYCLES_FETCH_LIMIT = 20;

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

    const cursor = url.searchParams.get("cursor") || null;
    let limit = parseInt(url.searchParams.get("limit"), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    if (!customerId || customerId === "undefined" || customerId === "null") {
      return Response.json(
        { error: "customerId missing or invalid" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (/^\d+$/.test(customerId)) {
      customerId = `gid://shopify/Customer/${customerId}`;
    }

    const res = await admin.graphql(
      `#graphql
      query GetCustomerSubscriptions($customerId: ID!, $first: Int!, $after: String) {
        customer(id: $customerId) {
          subscriptionContracts(first: $first, after: $after,reverse: true) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              cursor
              node {
                id
                status
                nextBillingDate
                note
                deliveryPolicy {
                  interval
                  intervalCount
                }
                lines(first: 50) {
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
                        address {
                        name
                        address1
                        address2
                        city
                       province
                        zip
                        country
                      }
                      
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { customerId, first: limit, after: cursor } },
    );

    const { data, errors } = await res.json();

    console.log(
      "DEBUG subscriptions lookup:",
      JSON.stringify(
        {
          shop,
          queriedCustomerId: customerId,
          limit,
          cursor,
          customerFound:
            data?.customer !== null && data?.customer !== undefined,
        },
        null,
        2,
      ),
    );

    if (errors) {
      console.error("GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json(
        { error: errors },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const connection = data?.customer?.subscriptionContracts;
    const contracts = connection?.edges?.map((e) => e.node) ?? [];
    const pageInfo = connection?.pageInfo ?? {
      hasNextPage: false,
      endCursor: null,
    };

    const productIds = [
      ...new Set(
        contracts.flatMap(
          (contract) =>
            contract.lines?.edges
              ?.map((edge) => edge.node.productId)
              .filter(Boolean) ?? [],
        ),
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
        { variables: { ids: productIds } },
      );

      const imagesData = await imagesRes.json();
      const nodes = imagesData.data?.nodes ?? [];
      nodes.forEach((node) => {
        if (node?.id) {
          productImagesMap[node.id] =
            node.images?.edges?.[0]?.node?.url ||
            node.featuredImage?.url ||
            null;
        }
      });
    }

    // Ab pageInfo.hasNextPage bhi return karta hai — isse pata chalta hai ki
    // fetched window (90 din / BILLING_CYCLES_FETCH_LIMIT cycles) ke AAGE bhi
    // aur cycles maujood hain ya nahi. Agar saare fetched cycles skip/billed
    // ho chuke hon aur hasNextPage=true ho, toh humein pata hai ki asli agla
    // order abhi bhi "unknown lekin exists" hai — hum galat/purani date show
    // nahi karenge.
    async function fetchUpcomingBillingCycles(contractId) {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000, // look 90 days ahead
      ).toISOString();

      try {
        const cyclesRes = await admin.graphql(
          `#graphql
          query GetUpcomingBillingCycles($contractId: ID!, $first: Int!, $rangeSelector: SubscriptionBillingCyclesDateRangeSelector!) {
            subscriptionBillingCycles(
              contractId: $contractId
              first: $first
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
              pageInfo {
                hasNextPage
              }
            }
          }`,
          {
            variables: {
              contractId,
              first: BILLING_CYCLES_FETCH_LIMIT,
              rangeSelector: { startDate, endDate },
            },
          },
        );

        const cyclesPayload = await cyclesRes.json();
        if (cyclesPayload.errors) {
          console.error(
            `subscriptionBillingCycles query errors for ${contractId}:`,
            JSON.stringify(cyclesPayload.errors, null, 2),
          );
          return { cycles: [], hasMoreCycles: false };
        }

        const connection = cyclesPayload.data?.subscriptionBillingCycles;
        const cycles = connection?.edges?.map((e) => e.node) ?? [];
        const hasMoreCycles = !!connection?.pageInfo?.hasNextPage;

        cycles.sort(
          (a, b) =>
            new Date(a.billingAttemptExpectedDate) -
            new Date(b.billingAttemptExpectedDate),
        );

        return { cycles, hasMoreCycles };
      } catch (e) {
        console.error(
          `Failed to fetch billing cycles for ${contractId}:`,
          e.message,
        );
        return { cycles: [], hasMoreCycles: false };
      }
    }

    const enriched = await Promise.all(
      contracts.map(async (contract) => {
        const contractIdNumeric = contract.id.split("/").pop();

        let policy = null;
        try {
          policy = await prisma.subscriptionPolicy.findUnique({
            where: { subscriptionContractId: contractIdNumeric },
          });
        } catch (e) {
          console.error(
            "Policy lookup failed for",
            contractIdNumeric,
            e.message,
          );
        }

        const lines =
          contract.lines?.edges?.map((e) => {
            const node = e.node;
            return {
              ...node,
              imageUrl: node.productId
                ? productImagesMap[node.productId] || null
                : null,
            };
          }) ?? [];
        const subtotal = lines.reduce(
          (sum, line) =>
            sum + parseFloat(line.lineDiscountedPrice?.amount ?? 0),
          0,
        );
        // Yeh do heavy GraphQL calls (order preview + billing cycles) pehle
        // sequentially (ek ke baad ek) chalte the — Promise.all se parallel
        // kar diya, isse har contract ka processing time ~aadha ho jaata hai.
        const [preview, cyclesResult] = await Promise.all([
          (async () => {
            if (contract.status === "ACTIVE" || contract.status === "PAUSED") {
              try {
                return await getContractPreview(admin, contract.id);
              } catch (e) {
                console.error(
                  `getContractPreview failed for ${contract.id}:`,
                  e.message,
                );
                return null;
              }
            }
            return null;
          })(),
          fetchUpcomingBillingCycles(contract.id),
        ]);

        const resolvedLine =
          preview?.nextOrder?.lineItems?.find((li) => li.isBaseLine) ??
          preview?.nextOrder?.lineItems?.[0] ??
          null;

        const displayLine = resolvedLine
          ? {
              title: resolvedLine.title,
              variantTitle:
                resolvedLine.variantTitle ?? lines[0]?.variantTitle ?? null,
              imageUrl: resolvedLine.imageUrl,
              productId: resolvedLine.productId,
              variantId: resolvedLine.variantId,
              quantity: resolvedLine.quantity,
              priceAmount: resolvedLine.pricePerUnit?.amount,
              currencyCode: resolvedLine.pricePerUnit?.currencyCode,
            }
          : null; // fallback widget me lines[0] use kar lega

        const { cycles: upcomingCycles, hasMoreCycles } = cyclesResult;

        const nextCycle = upcomingCycles.find(
          (c) => !c.skipped && c.status !== "BILLED",
        );

        // Agar current window me koi actionable cycle NAHI mila:
        //  - hasMoreCycles === true  -> aage aur cycles maujood hain, sirf
        //    fetch nahi hue. Galat/purani `contract.nextBillingDate` show
        //    karne ke bajaye null bhejo — frontend "maximum orders skipped
        //    in this period" jaisa message dikhayega.
        //  - hasMoreCycles === false -> genuinely window me koi aage cycle
        //    hi nahi hai, tabhi raw contract.nextBillingDate par fallback
        //    theek hai.
        const realNextBillingDate = nextCycle
          ? nextCycle.billingAttemptExpectedDate
          : hasMoreCycles
            ? null
            : contract.nextBillingDate;

        return {
          ...contract,
          lines: { edges: lines.map((line) => ({ node: line })) },
          displayLine, // list card ke liye — sirf pehla product
          nextOrderLineItems: preview?.nextOrder?.lineItems ?? [], // detail view ke liye — SAARE products
          nextOrderTotal: preview?.nextOrder?.calculatedOrderTotal ?? null,
          nextOrderShipping: preview?.nextOrder?.shipping ?? null,
          nextBillingDate: realNextBillingDate,
          nextBillingCycleIndex:
            preview?.nextOrder?.cycleIndex ?? nextCycle?.cycleIndex ?? null,
          upcomingCycles,
          hasMoreCycles,
          subtotal,
          currencyCode: lines[0]?.lineDiscountedPrice?.currencyCode,
          paymentsCompleted: policy?.paymentsCompleted ?? 0,
          minPaymentsRequired: policy?.minPaymentsRequired ?? null,
        };
      }),
    );

    return Response.json(
      {
        subscriptions: enriched,
        pageInfo: {
          hasNextPage: pageInfo.hasNextPage,
          endCursor: pageInfo.endCursor,
        },
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error("api.subscriptions error:", err.message, err.stack);
    return Response.json(
      { error: err.message || "Unknown error" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
};
