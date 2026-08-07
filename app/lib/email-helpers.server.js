const CONTRACT_EMAIL_QUERY = `#graphql
  query GetContractForEmail($id: ID!) {
    subscriptionContract(id: $id) {
      id
      customer {
        email
        firstName
        lastName
      }
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
      lines(first: 5) {
        edges {
          node {
            title
            quantity
            currentPrice {
              amount
              currencyCode
            }
            image {
              url
            }
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
// Result cache kiya ja sakta hai per-request agar zaroorat pade (abhi fresh query karta hai).
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

const NEXT_CYCLE_QUERY = `#graphql
  query GetNextBillingCycle($contractId: ID!, $index: Int!) {
    subscriptionBillingCycle(
      billingCycleInput: { contractId: $contractId, selector: { index: $index } }
    ) {
      billingAttemptExpectedDate
    }
  }
`;

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

// contract + customer + address + line item — email banane ke liye zaroori sab kuch
export async function getContractEmailData(admin, contractId) {
  const res = await admin.graphql(CONTRACT_EMAIL_QUERY, {
    variables: { id: contractId },
  });
  const { data } = await res.json();
  const contract = data?.subscriptionContract;
  if (!contract) return null;

  const line = contract.lines?.edges?.[0]?.node;

  return {
    email: contract.customer?.email,
    customerName: [contract.customer?.firstName, contract.customer?.lastName]
      .filter(Boolean)
      .join(" "),
    shippingAddress: contract.deliveryMethod?.address
      ? {
          name: contract.deliveryMethod.address.name,
          address1: contract.deliveryMethod.address.address1,
          address2: contract.deliveryMethod.address.address2,
          city: contract.deliveryMethod.address.city,
          province: contract.deliveryMethod.address.province,
          zip: contract.deliveryMethod.address.zip,
          country: contract.deliveryMethod.address.country,
        }
      : null,
    paymentLast4: contract.customerPaymentMethod?.instrument?.lastDigits || null,
    lineItem: line
      ? {
          title: line.title,
          quantity: line.quantity,
          imageUrl: line.image?.url,
          currencyCode: line.currentPrice?.currencyCode,
          amount: line.currentPrice?.amount,
        }
      : null,
  };
}

export async function getNextBillingDate(admin, contractId, afterCycleIndex) {
  const res = await admin.graphql(NEXT_CYCLE_QUERY, {
    variables: { contractId, index: afterCycleIndex + 1 },
  });
  const { data } = await res.json();
  return data?.subscriptionBillingCycle?.billingAttemptExpectedDate || null;
}