import { getContractPreview } from "./billing-preview.server";
const CONTRACT_SHIPPING_QUERY = `#graphql
  query GetContractShippingInfo($id: ID!) {
    subscriptionContract(id: $id) {
      deliveryMethod {
        ... on SubscriptionDeliveryMethodShipping {
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
        instrument {
          ... on CustomerCreditCard {
            lastDigits
            brand
          }
        }
      }
    }
  }
`;
const PORTAL_URL_QUERY = `#graphql
  query GetCustomerAccountShareLinkData($pageCount: Int = 50) {
    shop {
      customerAccountsV2 {
        url
      }
    }
    customerAccountPages(first: $pageCount) {
      nodes {
        __typename
        handle
        title
        ... on CustomerAccountAppExtensionPage {
          appExtensionUuid
        }
      }
    }
  }
`;
export async function getCustomerPortalBaseUrl(admin) {
  const res = await admin.graphql(PORTAL_URL_QUERY, {
    variables: { pageCount: 50 },
  });
  const { data } = await res.json();

  const baseUrl = data?.shop?.customerAccountsV2?.url;
  const targetUuid = process.env.SHOPIFY_CUSTOMER_UID;

  const myPage = data?.customerAccountPages?.nodes?.find(
    (n) =>
      n.__typename === "CustomerAccountAppExtensionPage" &&
      n.appExtensionUuid === targetUuid,
  );

  if (!baseUrl) return null;
  return myPage ? `${baseUrl}/pages/${myPage.handle}` : baseUrl;
}
const SHOP_NAME_QUERY = `#graphql
  query GetShopName {
    shop {
      name
    }
  }
`;
export async function getShopName(admin) {
  const res = await admin.graphql(SHOP_NAME_QUERY);
  const { data } = await res.json();
  return data?.shop?.name || null;
}
export async function getContractEmailData(admin, contractId) {
  const [preview, shippingRes] = await Promise.all([
    getContractPreview(admin, contractId),
    admin.graphql(CONTRACT_SHIPPING_QUERY, { variables: { id: contractId } }),
  ]);

  if (!preview) return null;

  const { data: shippingData } = await shippingRes.json();
  const contract = shippingData?.subscriptionContract;
  const rawLineItems = preview.nextOrder?.lineItems?.length
    ? preview.nextOrder.lineItems
    : preview.lineItem
      ? [preview.lineItem]
      : [];

  const lineItems = rawLineItems.map((li) => ({
    title: li.title,
    variantTitle: li.variantTitle,
    quantity: li.quantity,
    imageUrl: li.imageUrl,
    currencyCode: li.itemTotal?.currencyCode || li.price?.currencyCode,
    amount: li.itemTotal?.amount || li.price?.amount,
  }));

  const subtotal = preview.nextOrder?.calculatedOrderTotal || null;
  const shipping = preview.nextOrder?.shipping?.calculatedPrice || null;

  const currencyCode =
    subtotal?.currencyCode || shipping?.currencyCode || lineItems[0]?.currencyCode || null;

  const total =
    subtotal && shipping
      ? {
          amount: (Number(subtotal.amount) + Number(shipping.amount)).toFixed(2),
          currencyCode,
        }
      : subtotal;

  return {
    email: preview.customer?.defaultEmailAddress?.emailAddress,
    customerName: preview.customer?.displayName,
    nextOrderDate: preview.nextOrder?.expectedDate,
    shippingAddress: contract?.deliveryMethod?.address || null,
    paymentLast4: contract?.customerPaymentMethod?.instrument?.lastDigits || null,
    paymentBrand: contract?.customerPaymentMethod?.instrument?.brand || null,
    lineItems,
    subtotal,
    shipping,
    total,
    lineItem: lineItems[0] || null,
  };
}