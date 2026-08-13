import React from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import CreateSubscription from "./components/createSubscription";
// ---- FIX: discount snapshot ke liye import ----
// Apne actual path ke hisaab se adjust kar lena (jahan bhi
// contractsettings.js rakha hai — models/, utils/, lib/ etc.)
import { snapshotContractSettings } from "../models/contractsettings.js";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const customerSearchTerm = url.searchParams.get("customerSearch");

  if (customerSearchTerm) {
    const searchResponse = await admin.graphql(
      `#graphql
      query getCustomers($query: String!) {
        customers(first: 10, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              paymentMethods(first: 10) {
                edges {
                  node {
                    id
                    instrument {
                      __typename
                      ... on CustomerCreditCard {
                        name
                        brand
                        lastDigits
                        expiryMonth
                        expiryYear
                      }
                    }
                  }
                }
              }
              defaultAddress {
                company
                address1
                address2
                city
                province
                zip
                country
                countryCodeV2
              }
            }
          }
        }
      }`,
      { variables: { query: customerSearchTerm } },
    );

    const searchData = await searchResponse.json();

    if (searchData.errors) {
      return {
        success: false,
        message: "Could not search customers.",
        customers: [],
      };
    }

    const customers =
      (searchData.data?.customers?.edges || []).map((edge) => edge.node) || [];
    return { success: true, customers };
  }

  // shop currencyCode ke saath timezoneOffset bhi loader me hi le lo,
  // taaki UI khud bhi shop ke local time ke hisaab se date/time dikha sake
  const response = await admin.graphql(`
    query {
      shop {
        currencyCode
        timezoneOffset
        ianaTimezone
      }
    }
  `);

  const data = await response.json();
  const shopData = data.data.shop;

  return {
    currencyCode: shopData.currencyCode,
    timezoneOffset: shopData.timezoneOffset,
    ianaTimezone: shopData.ianaTimezone,
    shop: session.shop,
  };
}

const CREATE_CUSTOMER_SUBSCRIPTION_CONTRACT_MUTATION = `
mutation CreateCustomerSubscriptionContract(
  $input: SubscriptionContractAtomicCreateInput!
) {
  subscriptionContractAtomicCreate(input: $input) {
    contract {
      id
      status
      nextBillingDate
    }
    userErrors {
      field
      message
    }
  }
}
`;

// ---- FIX: discount ko actual price me apply karne ka helper ----
function applyDiscountToPrice(basePrice, type, amount) {
  const base = Number(basePrice) || 0;
  const val = Number(amount) || 0;
  if (!val) return base;
  if (type === "PERCENTAGE") {
    return Math.max(0, base - (base * val) / 100);
  }
  if (type === "PRICE") {
    return Math.max(0, val); // fixed price directly
  }
  return Math.max(0, base - val); // FIXED_AMOUNT
}

export async function action({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  const payloadRaw = formData.get("payload");
  if (!payloadRaw || typeof payloadRaw !== "string") {
    return { success: false, errors: [{ message: "No payload received." }] };
  }

  const payload = JSON.parse(payloadRaw);
  const { contractDetails, customer, delivery, products } = payload;

  if (!customer?.customerId) {
    return { success: false, errors: [{ message: "Customer is required." }] };
  }
  if (!Array.isArray(products) || products.length === 0) {
    return {
      success: false,
      errors: [{ message: "Please select at least one product." }],
    };
  }

  try {
    // ---- FIX 1: shop ka actual timezone offset lo (Z hardcode hata diya) ----
    const shopTzRes = await admin.graphql(`
      query { shop { timezoneOffset } }
    `);
    const shopTzData = await shopTzRes.json();
    const timezoneOffset = shopTzData.data?.shop?.timezoneOffset || "+00:00";

    const nextOrderDate = contractDetails.nextOrderDate; // "YYYY-MM-DD"
    const nextOrderTime = contractDetails.nextOrderTime; // "HH:MM"

    if (!nextOrderDate || !nextOrderTime) {
      return {
        success: false,
        errors: [{ message: "Next order date and time are required." }],
      };
    }

    // Selected date/time ko shop ke local timezone me treat karke sahi UTC nikalo
    const nextBillingDate = new Date(
      `${nextOrderDate}T${nextOrderTime}:00${timezoneOffset}`,
    ).toISOString();

    // ---- FIX 2: agar (sahi timezone ke baad bhi) time past/bahut close ho, reject karo ----
    // Yehi cheez cycle-8 wale bug se bachati hai — kyunki agar galti se past
    // date chali jaaye aur contract ACTIVE ho, Shopify turant elapsed cycles
    // process karke cycleIndex aage bhga deta hai.
    if (new Date(nextBillingDate).getTime() <= Date.now()) {
      return {
        success: false,
        errors: [
          {
            message:
              "Selected next order date/time is in the past (shop timezone ke hisaab se). Please choose a future date/time.",
          },
        ],
      };
    }

    const interval = contractDetails.interval || "MONTH";
    const intervalCount = Number(contractDetails.intervalCount ?? 1) || 1;

    const minCycles = contractDetails.minOrders
      ? Number(contractDetails.minOrders)
      : null;
    const maxCycles = contractDetails.maxOrders
      ? Number(contractDetails.maxOrders)
      : null;

    const isDigital = !!delivery.isDigitalProduct;

    const deliveryMethod = isDigital
      ? undefined
      : {
          shipping: {
            address: {
              firstName: customer.firstName || "",
              lastName: customer.lastName || "",
              address1: delivery.address1 || "",
              address2: delivery.address2 || "",
              city: delivery.city || "",
              provinceCode: delivery.province || "",
              countryCode: delivery.country || "",
              zip: delivery.zip || "",
              phone: customer.phoneNumber || "",
              company: customer.company || "",
            },
          },
        };

    const deliveryPrice = Number(delivery.deliveryPrice || 0);
    const paymentMethodId = customer.paymentMethod?.id || null;

    // ---- FIX: discount ko yahan hi first-order price me apply kar do ----
    const lines = products.flatMap((p) =>
      (p.variants || []).map((v) => {
        const quantity = Number(v.quantity || 1);
        const baseUnitPrice = Number(v.unitPrice ?? v.price ?? 0);

        let currentPrice = baseUnitPrice;

        if (v.discountMode === "CUSTOM") {
          // variant ke apne custom discount fields use karo
          currentPrice = applyDiscountToPrice(
            baseUnitPrice,
            v.discountType,
            v.discountAmount,
          );
        } else if (
          v.discountMode === "SELLING_PLAN" &&
          contractDetails.giveDiscount
        ) {
          // top-level "Selling Plan Discount" use karo
          currentPrice = applyDiscountToPrice(
            baseUnitPrice,
            contractDetails.discountType,
            contractDetails.discountAmount,
          );
        }
        // discountMode === "NONE" → currentPrice = baseUnitPrice as-is

        return {
          line: {
            productVariantId: v.variantsId,
            quantity,
            currentPrice: Number(currentPrice.toFixed(2)),
          },
        };
      }),
    );

    if (lines.length === 0) {
      return {
        success: false,
        errors: [{ message: "No variants found on selected products." }],
      };
    }

    const input = {
      customerId: customer.customerId,
      currencyCode: contractDetails.currencyCode,
      nextBillingDate,
      contract: {
        // ---- FIX 3: ACTIVE ki jagah PAUSED ----
        // UI khud "pause" dikha rahi hai, isliye backend ko bhi wahi bhejna
        // chahiye. Agar merchant chahta hai ki selected date pe khud-ba-khud
        // activate ho jaaye, uske liye alag se scheduler/cron chahiye hoga.
        status: contractDetails.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
        note: "Created from app UI",
        paymentMethodId: paymentMethodId || undefined,
        billingPolicy: {
          interval,
          intervalCount,
          minCycles: minCycles ?? undefined,
          maxCycles: maxCycles ?? undefined,
        },
        deliveryPolicy: {
          interval,
          intervalCount,
        },
        deliveryMethod,
        deliveryPrice,
      },
      lines,
    };

    const gqlResponse = await admin.graphql(
      CREATE_CUSTOMER_SUBSCRIPTION_CONTRACT_MUTATION,
      { variables: { input } },
    );

    const result = await gqlResponse.json();
    const data = result.data?.subscriptionContractAtomicCreate;
    const userErrors = data?.userErrors || [];

    if (userErrors.length > 0) {
      return {
        success: false,
        errors: userErrors.map((e) => ({ message: e.message, field: e.field })),
      };
    }

    const contract = data?.contract;

    // ---- FIX: contract create hone ke baad discount settings snapshot karo ----
    // Isse "changeDiscountAfterOrders" / "afterOrders" wale rules agle
    // billing cycles pe automatically apply ho payenge
    // (contractsettings.js ka collectActionsForCycle / resolveDiscountForCycle
    // isi snapshot ko read karte hain).
    if (contract?.id) {
      try {
        await snapshotContractSettings(admin, contract.id, {
          giveDiscount: contractDetails.giveDiscount,
          discountAmount: contractDetails.discountAmount,
          discountType: contractDetails.discountType,
          changeDiscountAfterOrders: contractDetails.changeDiscountAfterOrders,
          afterOrders: contractDetails.afterOrders,
          afterDiscountValue: contractDetails.discountAmount2,
          afterDiscountType: contractDetails.discountType2,
          // per-variant discount config bhi rakh do future reference ke liye
          products,
        });
      } catch (err) {
        console.warn(
          `[contractCreate] snapshotContractSettings failed for ${contract.id}:`,
          err,
        );
      }
    }

    return {
      success: true,
      subscription: {
        id: contract?.id,
        status: contract?.status,
        nextBillingDate: contract?.nextBillingDate,
        shop: session.shop,
      },
    };
  } catch (err) {
    console.error("Subscription contract create error:", err);
    return {
      success: false,
      errors: [{ message: "Server error while creating subscription." }],
    };
  }
}

function contractCreate() {
  const { currencyCode, shop, timezoneOffset, ianaTimezone } = useLoaderData();

  return (
    <div>
      <CreateSubscription
        currencyCode={currencyCode}
        shop={shop}
        timezoneOffset={timezoneOffset}
        ianaTimezone={ianaTimezone}
      />
    </div>
  );
}

export default contractCreate;