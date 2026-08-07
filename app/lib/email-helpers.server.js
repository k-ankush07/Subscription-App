import { getContractPreview } from "./billing-preview.server";

// deliveryMethod address aur payment method — ye getContractPreview me nahi hai,
// isliye alag se ek chhota query lagta hai. Isme line items nahi hain, to
// wahi purani "image field galat" wali dikkat yahan nahi ayegi.
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

// CustomerPortal admin loader jaisi hi logic — customer account base URL + is app ke
// extension page ka handle dhundh ke portal ka base URL banata hai.
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

// email ke "From" display name ke liye actual shop ka naam Shopify se hi le lo
export async function getShopName(admin) {
  const res = await admin.graphql(SHOP_NAME_QUERY);
  const { data } = await res.json();
  return data?.shop?.name || null;
}

// email banane ke liye zaroori sab kuch — customer, saare line items (image samet),
// subtotal/shipping/total, next order date — sab getContractPreview() se hi aata hai
// (already tested/working, jaisa portal preview me dikhta hai). Sirf shipping address
// + payment last4 alag se query karna padta hai.
export async function getContractEmailData(admin, contractId) {
  const [preview, shippingRes] = await Promise.all([
    getContractPreview(admin, contractId),
    admin.graphql(CONTRACT_SHIPPING_QUERY, { variables: { id: contractId } }),
  ]);

  if (!preview) return null;

  const { data: shippingData } = await shippingRes.json();
  const contract = shippingData?.subscriptionContract;

  // next order ke saare line items use karo (base line + automation se add hue products).
  // agar khali hai (sab remove ho gaye / preview me kuch nahi bacha) to purane single
  // preview.lineItem pe fallback karo taaki email kabhi khali na jaye.
  const rawLineItems = preview.nextOrder?.lineItems?.length
    ? preview.nextOrder.lineItems
    : preview.lineItem
      ? [preview.lineItem]
      : [];

  const lineItems = rawLineItems.map((li) => ({
    title: li.title,
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
    // naye fields — email template me multiple items + summary render karne ke liye
    lineItems,
    subtotal,
    shipping,
    total,
    // purana single-item field bhi rakha hai backward-compat ke liye (agar kahin aur use ho raha ho)
    lineItem: lineItems[0] || null,
  };
}