
import React from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import CreateSubscription from "./components/createSubscription";
import {
  snapshotContractSettings,
} from "../../app/lib/billing-preview.server";
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

  const response = await admin.graphql(`
    query {
      shop {
        currencyCode
      }
    }
  `);

  const data = await response.json();
  const shopData = data.data.shop;

  return {
    currencyCode: shopData.currencyCode,
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
const EDIT_BILLING_CYCLE_SCHEDULE_MUTATION = `
mutation SubscriptionBillingCycleScheduleEdit(
  $contractId: ID!
  $index: Int!
  $date: DateTime!
) {
  subscriptionBillingCycleScheduleEdit(
    billingCycleInput: { contractId: $contractId, selector: { index: $index } }
    input: { billingDate: $date, reason: BUYER_INITIATED }
  ) {
    billingCycle {
      cycleIndex
      billingAttemptExpectedDate
    }
    userErrors {
      field
      message
    }
  }
}
`;
function computeVariantCurrentPrice(variant, sellingPlanDiscount) {
  const baseUnitPrice = Number(variant.unitPrice ?? variant.price ?? 0);
  const mode = variant.discountMode || "SELLING_PLAN";

  if (mode === "NONE") {
    return baseUnitPrice;
  }

  let type, amount;

  if (mode === "CUSTOM") {
    type = variant.discountType || "PERCENTAGE";
    amount = Number(variant.discountAmount || 0);
  } else {
    if (!sellingPlanDiscount?.giveDiscount) return baseUnitPrice;
    type = sellingPlanDiscount.discountType || "PERCENTAGE";
    amount = Number(sellingPlanDiscount.discountAmount || 0);
  }

  if (type === "PERCENTAGE") {
    return Math.max(0, baseUnitPrice - (baseUnitPrice * amount) / 100);
  }
  if (type === "FIXED_AMOUNT") {
    return Math.max(0, baseUnitPrice - amount);
  }
  return Math.max(0, amount);
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
    const nextBillingDate =
      contractDetails.nextBillingDateISO ||
      new Date(
        `${contractDetails.nextOrderDate}T${contractDetails.nextOrderTime}:00Z`,
      ).toISOString();

    const interval = contractDetails.interval || "MONTH";
    const intervalCount = Number(contractDetails.intervalCount ?? 1) || 1;

    const minCycles = contractDetails.minOrders
      ? Number(contractDetails.minOrders)
      : null;
    const maxCycles = contractDetails.maxOrders
      ? Number(contractDetails.maxOrders)
      : null;

    const hasAddress =
      delivery.address1?.trim() &&
      delivery.city?.trim() &&
      delivery.province?.trim() &&
      delivery.zip?.trim() &&
      delivery.country?.trim();

    const deliveryMethod = hasAddress
      ? {
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
        }
      : undefined;

    const deliveryPrice = String(Number(delivery.deliveryPrice || 0));
    const paymentMethodId = customer.paymentMethod?.id || null;

    const sellingPlanDiscount = {
      giveDiscount: contractDetails.giveDiscount,
      discountAmount: contractDetails.discountAmount,
      discountType: contractDetails.discountType,
    };

    const lines = products.flatMap((p) =>
      (p.variants || []).map((v) => {
        const quantity = Number(v.quantity || 1);
        const currentPrice = computeVariantCurrentPrice(v, sellingPlanDiscount);

        return {
          line: {
            productVariantId: v.variantsId,
            quantity,
            currentPrice,
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
        status: "PAUSED",
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

    if (result.errors?.length) {
      return {
        success: false,
        errors: result.errors.map((e) => ({ message: e.message })),
      };
    }

    const data = result.data?.subscriptionContractAtomicCreate;
    const userErrors = data?.userErrors || [];

    if (userErrors.length > 0) {
      return {
        success: false,
        errors: userErrors.map((e) => ({
          message: e.message,
          field: e.field,
        })),
      };
    }

    const contract = data?.contract;

    if (contract?.id) {
      try {
    const scheduleRes = await admin.graphql(
      EDIT_BILLING_CYCLE_SCHEDULE_MUTATION,
      {
        variables: {
          contractId: contract.id,
          index: 1, // pehla billing cycle
          date: nextBillingDate, // wahi ISO datetime jo merchant ne form me choose kiya
        },
      },
    );
    const scheduleData = await scheduleRes.json();
    const scheduleErrors =
      scheduleData.data?.subscriptionBillingCycleScheduleEdit?.userErrors;

    if (scheduleErrors?.length) {
      console.warn(
        `[contractCreate] subscriptionBillingCycleScheduleEdit failed for ${contract.id}:`,
        scheduleErrors,
      );
    }
  } catch (err) {
    console.warn(
      `[contractCreate] subscriptionBillingCycleScheduleEdit threw for ${contract.id}:`,
      err,
    );
  }
      try {
        await snapshotContractSettings(admin, contract.id, {
          giveDiscount: contractDetails.giveDiscount,
          discountAmount: contractDetails.discountAmount,
          discountType: contractDetails.discountType,
          changeDiscountAfterOrders: contractDetails.changeDiscountAfterOrders,
          afterOrders: contractDetails.afterOrders,
          afterDiscountValue: contractDetails.discountAmount2,
          afterDiscountType: contractDetails.discountType2,
          products,
          useStrictAfterOrders: true, 
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
  const { currencyCode, shop } = useLoaderData();

  return (
    <div>
      <CreateSubscription currencyCode={currencyCode} shop={shop} />
    </div>
  );
}

export default contractCreate;