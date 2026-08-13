import { authenticate, unauthenticated } from "../shopify.server";
import { getContractPreview } from "../lib/billing-preview.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
const API = process.env.VITE_API_URL || import.meta.env.VITE_API_URL;
const SECRET_KEY = process.env.VITE_API_SECRET_KEY || import.meta.env.VITE_API_SECRET_KEY;
const DEFAULT_LIMIT = 7;
const MAX_LIMIT = 50;

const BILLING_CYCLES_FETCH_LIMIT = 20;
const PAST_ORDERS_FETCH_LIMIT = 10;

const ALLOWED_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"];

export const action = async ({ request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  return new Response("Method not allowed", { status: 405 });
};


function hasAutomationSwapForProduct(extraSettings, productId, cycleIndex) {
  if (!productId) return false;
  const cycles = extraSettings?.automationCycles;
  if (!Array.isArray(cycles)) return false;

  return cycles.some((entry) => {
    if (cycleIndex != null && Number(entry.orders) > Number(cycleIndex)) {
      return false;
    }
    return (entry.actions ?? []).some(
      (action) => action.type === "swap" && action.sourceProductId === productId,
    );
  });
}
function getNumericId(gid) {
  if (!gid) return null;
  return gid.split("/").pop();
}
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

    const statusParam = url.searchParams.get("status");

    if (!customerId || customerId === "undefined" || customerId === "null") {
      return Response.json(
        { error: "customerId missing or invalid" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (/^\d+$/.test(customerId)) {
      customerId = `gid://shopify/Customer/${customerId}`;
    }
    const numericCustomerId = customerId.split("/").pop();
    const searchParts = [`customer_id:${numericCustomerId}`];
    if (statusParam && ALLOWED_STATUSES.includes(statusParam.toUpperCase())) {
      searchParts.push(`status:${statusParam.toUpperCase()}`);
    }
    const searchQuery = searchParts.join(" AND ");

    const res = await admin.graphql(
      `#graphql
      query GetCustomerSubscriptions($first: Int!, $after: String, $query: String) {
        subscriptionContracts(first: $first, after: $after, reverse: true, query: $query) {
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
               customer {
                    id
                    displayName
                    defaultEmailAddress {
                      emailAddress
                    }
                  }
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
              customerPaymentMethod {
                id
                instrument {
                  ... on CustomerCreditCard {
                    brand
                    lastDigits
                    expiryMonth
                    expiryYear
                    name
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { first: limit, after: cursor, query: searchQuery } },
    );

    const { data, errors } = await res.json();

    if (errors) {
      console.error("GraphQL errors:", JSON.stringify(errors, null, 2));
      return Response.json(
        { error: errors },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const connection = data?.subscriptionContracts;
    const contracts = connection?.edges?.map((e) => e.node) ?? [];
    const pageInfo = connection?.pageInfo ?? {
      hasNextPage: false,
      endCursor: null,
    };

    let shopNumericId = null;
    try {
      const shopRes = await admin.graphql(`#graphql
        query GetShopId {
          shop { id }
        }`);
      const shopPayload = await shopRes.json();
      shopNumericId = shopPayload.data?.shop?.id?.split("/").pop() ?? null;
    } catch (e) {
      console.error("Failed to fetch shop id:", e.message);
    }

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

    async function fetchUpcomingBillingCycles(contractId) {
      const now = new Date();
      const startDate = now.toISOString();
      const endDate = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000,
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

    async function fetchPastOrders(contractId) {
      try {
        const res = await admin.graphql(
          `#graphql
          query GetPastOrders($contractId: ID!, $first: Int!) {
            subscriptionContract(id: $contractId) {
              originOrder {
                id
                name
                createdAt
                displayFinancialStatus
                currentTotalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
              billingAttempts(first: $first, reverse: true) {
                edges {
                  node {
                    id
                    order {
                      id
                      name
                      createdAt
                      displayFinancialStatus
                      currentTotalPriceSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          }`,
          { variables: { contractId, first: PAST_ORDERS_FETCH_LIMIT } },
        );

        const payload = await res.json();
        if (payload.errors) {
          console.error(
            `subscriptionContract.billingAttempts errors for ${contractId}:`,
            JSON.stringify(payload.errors, null, 2),
          );
          return [];
        }

        const contract = payload.data?.subscriptionContract;
        const edges = contract?.billingAttempts?.edges ?? [];

        const ordersFromAttempts = edges
          .map((e) => e.node.order)
          .filter(Boolean);
        const originOrder = contract?.originOrder ?? null;

        const allOrdersRaw = originOrder
          ? [
              originOrder,
              ...ordersFromAttempts.filter((o) => o.id !== originOrder.id),
            ]
          : ordersFromAttempts;

        const orders = allOrdersRaw.map((order) => {
          const numericId = order.id.split("/").pop();
          return {
            id: order.id,
            numericId,
            name: order.name,
            createdAt: order.createdAt,
            financialStatus: order.displayFinancialStatus,
            total: order.currentTotalPriceSet?.shopMoney ?? null,
            orderUrl: shopNumericId
              ? `https://shopify.com/${shopNumericId}/account/orders/${numericId}`
              : null,
          };
        });

        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return orders;
      } catch (e) {
        console.error(
          `Failed to fetch past orders for ${contractId}:`,
          e.message,
        );
        return [];
      }
    }

    const enriched = await Promise.all(
      contracts.map(async (contract) => {
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

        const [preview, cyclesResult, pastOrders] = await Promise.all([
          (async () => {
            if (
              contract.status === "ACTIVE" ||
              contract.status === "PAUSED" ||
              contract.status === "CANCELLED"
            ) {
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
          fetchPastOrders(contract.id),
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
          : null;

        const extraSettings = preview?.allExtraSettings ?? null;
        const customerChanges = extraSettings?.customerProductChanges ?? null;
        const swapOptions = extraSettings?.products ?? [];

       const currentBaseProductId =
  preview?.lineItem?.productId ?? lines[0]?.productId ?? null;

const upcomingCycleIndex = preview?.nextOrder?.cycleIndex ?? null;

const automationOwnsCurrentProduct = hasAutomationSwapForProduct(
  extraSettings,
  currentBaseProductId,
  upcomingCycleIndex,
);

const allowProductSwaps = !!customerChanges?.allowProductSwaps;
const allowVariantChanges = !!customerChanges?.allowVariantChanges;

const currentProductEntry = swapOptions.find((p) => p.id === currentBaseProductId);
const currentProductHasMultipleVariants =
  (currentProductEntry?.variants?.length ?? 0) > 1;
const hasOtherProducts = swapOptions.some((p) => p.id !== currentBaseProductId);

const canSwapProduct =
  !automationOwnsCurrentProduct &&
  ((allowProductSwaps && hasOtherProducts) ||
    (allowVariantChanges && currentProductHasMultipleVariants));

        const { cycles: upcomingCycles, hasMoreCycles } = cyclesResult;

        const nextCycle = upcomingCycles.find(
          (c) => !c.skipped && c.status !== "BILLED",
        );

        const realNextBillingDate = nextCycle
          ? nextCycle.billingAttemptExpectedDate
          : hasMoreCycles
            ? null
            : contract.nextBillingDate;

        return {
          ...contract,
          customerProductChanges: customerChanges,
          swapOptions,
          canSwapProduct,
          automationOwnsCurrentProduct,
          lines: { edges: lines.map((line) => ({ node: line })) },
          displayLine,
          nextOrderLineItems: preview?.nextOrder?.lineItems ?? [],
          nextOrderTotal: preview?.nextOrder?.calculatedOrderTotal ?? null,
          billingPolicy: preview?.billingPolicy ?? null,
          nextOrderShipping: preview?.nextOrder?.shipping ?? null,
          nextBillingDate: realNextBillingDate,
          nextBillingCycleIndex:
            preview?.nextOrder?.cycleIndex ?? nextCycle?.cycleIndex ?? null,
          upcomingCycles,
          hasMoreCycles,
          pastOrders,
          subtotal,
          currencyCode: lines[0]?.lineDiscountedPrice?.currencyCode,
          shippingMethodTitle:
            contract.deliveryMethod?.shippingOption?.presentmentTitle ||
            contract.deliveryMethod?.shippingOption?.title ||
            null,
          paymentMethod: contract.customerPaymentMethod?.instrument
            ? {
                id: contract.customerPaymentMethod.id,
                brand: contract.customerPaymentMethod.instrument.brand ?? null,
                lastDigits:
                  contract.customerPaymentMethod.instrument.lastDigits ?? null,
                expiryMonth:
                  contract.customerPaymentMethod.instrument.expiryMonth ?? null,
                expiryYear:
                  contract.customerPaymentMethod.instrument.expiryYear ?? null,
                cardHolderName:
                  contract.customerPaymentMethod.instrument.name ?? null,
              }
            : null,
        };
      }),
    );
  Promise.all(
      enriched.map((sub) =>
        fetch(`${API}/api/subscription`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": SECRET_KEY },
          body: JSON.stringify({
            subscriptionId: getNumericId(sub.id),
            contractId: sub.id,
            customerEmail: sub.customer?.defaultEmailAddress?.emailAddress || "",
            contract: {
              id: sub.id,
              status: sub.status,
              customer: {
                defaultEmailAddress: {
                  emailAddress: sub.customer?.defaultEmailAddress?.emailAddress || "",
                },
              },
              customerName: sub.customer?.displayName || "",
              lineItems: sub.nextOrderLineItems || [],
              subtotal: sub.subtotal ?? null,
              shipping: sub.nextOrderShipping ?? null,
              total: sub.nextOrderTotal ?? null,
              shippingAddress: sub.deliveryMethod?.address || null,
              paymentBrand: sub.paymentMethod?.brand || null,
              paymentLast4: sub.paymentMethod?.lastDigits || null,
            },
          }),
        }).catch((err) =>
          console.error(`[sync] failed to save subscription ${sub.id}:`, err.message),
        ),
      ),
    ).catch(() => {});
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