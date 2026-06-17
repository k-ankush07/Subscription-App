import { Link, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const subId = params.subId;
  const contractId= `gid://shopify/SubscriptionContract/${subId}`
  
  const res = await admin.graphql(`
    query {
      subscriptionContract(id: "${contractId}") {
        id
        status
        createdAt
        nextBillingDate
        customer {
          firstName
          lastName
          email
          phone
        }
          deliveryMethod {
          ... on SubscriptionDeliveryMethodShipping {
            address {
              firstName
              lastName
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
            }
          }
        }
        billingPolicy {
          interval
          intervalCount
        }
          deliveryPolicy {
          interval
          intervalCount
        }
        orders(first: 100) {
          edges {
            node {
              id
              createdAt
              name
          totalShippingPriceSet {
        shopMoney {
          amount
          currencyCode
        }
        presentmentMoney {
          amount
          currencyCode
        }
      }
            }
          }
        }
        lines(first: 10) {
          edges {
            node {
              id
              title
              quantity
               productId       
               variantId 
              currentPrice { amount currencyCode }
               variantImage {        
            url
            altText
          }
              lineDiscountedPrice { amount currencyCode }
              sellingPlanName
               pricingPolicy {
                cycleDiscounts {
                  afterCycle
                  adjustmentType
                  adjustmentValue {
                    ... on SellingPlanPricingPolicyPercentageValue {
                      percentage
                    }
                    ... on MoneyV2 {
                      amount
                      currencyCode
                    }
                  }
                  computedPrice { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await res.json();
  return { contract: data.data.subscriptionContract };
}



function formatDate(dateStr) {
  if (!dateStr) return "—";

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SubscriptionDetails() {
  const { contract } = useLoaderData();
  console.log("vdbjdbjdbvjdfvbdfjvbfd", contract);
  if (!contract) return <p>Contract not found.</p>;

  const { customer, billingPolicy: bp, orders, lines } = contract;
  const subId = contract.id.split("/").pop();
  const addr = contract.deliveryMethod?.address;
  const card = contract.customerPaymentMethod?.instrument;
  // calculate subtotal
 const subtotal = lines?.edges?.reduce((acc, { node }) => {
  const price = parseFloat(node.lineDiscountedPrice?.amount || 0);
  return acc + price;
}, 0);
// console.log("orderss",orders?.edges?.[0].node?.totalShippingPriceSet?.presentmentMoney)

  // shipping fixed (abhi hardcoded hai, baad me API se la sakta hai)
  
  const shipping = parseInt(orders?.edges?.[0].node?.totalShippingPriceSet?.presentmentMoney?.amount);
  const money = orders?.edges?.[0]?.node?.totalShippingPriceSet?.presentmentMoney;

const formattedShipping = new Intl.NumberFormat("en", {
  style: "currency",
  currency: money.currencyCode,
}).format(Number(money.amount));



  // total
  const total = subtotal + shipping;
function getCardImage(brand) {
  const brandMap = {
    visa: "https://subscriptions-assets.kachingappz.app/payment-method-icons/visa.svg",
    mastercard: "https://subscriptions-assets.kachingappz.app/payment-method-icons/mastercard.svg",
    amex: "https://subscriptions-assets.kachingappz.app/payment-method-icons/amex.svg",
    bogus: "https://subscriptions-assets.kachingappz.app/payment-method-icons/bogus.svg",
  };
  return brandMap[brand?.toLowerCase()] || brandMap["bogus"];
}
  return (
    <div
      style={{ padding: 20, maxWidth: 800, fontFamily: "Arial, sans-serif" }}
    >
      <Link to="/app/subscriptions">Back to Subscription Page</Link>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Subscription #{subId}</h2>
        <div style={{ display: "flex", gap: 5 }}>
          <button style={{ borderRadius: "6px", cursor: "pointer" }}>
            Place Order Now
          </button>
          <button style={{ borderRadius: "6px", cursor: "pointer" }}>
            Pause
          </button>
          <button style={{ borderRadius: "6px", cursor: "pointer" }}>
            cancel Subscription
          </button>
        </div>
      </div>
      <p>
        {formatDate(orders?.edges?.[0]?.node?.createdAt)} ● Order{" "}
        {orders?.edges?.[0]?.node?.name}
      </p>
      <p></p>

      {/* Summary */}
      <div
        style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}
      >
        {[
          ["Status", contract.status],
          ["Created", formatDate(contract.createdAt)],
          ["Current billing cycle",1],
          ["Next Billing", formatDate(contract.nextBillingDate)],
          [
            "Frequency",
            `Every ${bp?.intervalCount} ${bp?.interval?.toLowerCase()}${bp?.intervalCount > 1 ? "s" : ""}`,
          ],
          ["Total Orders", orders?.edges?.length ?? 0],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "#f6f6f7",
              borderRadius: 8,
              padding: "10px 16px",
              minWidth: 120,
            }}
          >
            <div style={{ fontSize: 12, color: "#888" }}>{label}</div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 50 }}>
        <div>
          {/* Customer */}
          <b>Customer</b>
          <p>
            Name:-{" "}
            <b>
              {customer?.firstName} {customer?.lastName}
            </b>
          </p>
          <p>Email:- {customer.email}</p>
        </div>
        {/* shipping address */}
        <div>
          <b>Shipping Address</b>
          <p>
            {addr.firstName} {addr.lastName}
          </p>
          <p>{addr.city}</p>
          <p>
            {addr.zip} {addr.address1} {addr.address2} {addr.province}{" "}
          </p>
          <p>{addr.country}</p>
        </div>

        {/* card */}
        <div>
          <b>Card Info</b>

          <div style={{ display: "flex", gap: 2 }}>
            {" "}
            <img
              src={getCardImage(card.brand)}
              alt="atm card"
            />{" "}
            <p>● ● ● ● ● ● ● ● ● ● ● {card.lastDigits}</p>{" "}
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <p>
              Expires {card.expiryMonth} / {card.expiryYear}
            </p>
            <p></p>
          </div>
        </div>
      </div>

      {/* Products */}
      <h3>Products</h3>
      <table
        border="1"
        cellPadding="8"
        cellSpacing="0"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead style={{ background: "#f6f6f7" }}>
          <tr>
            <th>Title</th>
            <th>Plan</th>
            <th>Qty</th>
            <th>Price</th>
            <th> Total Price</th>
          </tr>
        </thead>
        <tbody>
          {lines?.edges?.map(({ node }) => (
            <tr key={node.id}>
              <td>
                <div>
                  <img
                    src={node.variantImage?.url}
                    alt={node.variantImage?.altText || node.title}
                    width={50}
                  />
                  {node.title}
                </div>
                <p>
                  {" "}
                  <span>Product: {node.productId?.split("/").pop()}</span>{" "}
                  <span> Variant: {node.variantId?.split("/").pop()}</span>
                </p>
                <p>
                  Off{" "}
                  {node?.pricingPolicy?.cycleDiscounts?.[0]?.adjustmentValue
                    ?.amount
                    ? `₹${node?.pricingPolicy?.cycleDiscounts?.[0]?.adjustmentValue?.amount}`
                    : `${node?.pricingPolicy?.cycleDiscounts?.[0]?.adjustmentValue?.percentage}%`}
                </p>
                <br />
                <b>Delivery</b>{" "}
                {`Every ${bp?.intervalCount} ${bp?.interval?.toLowerCase()}${bp?.intervalCount > 1 ? "s" : ""}`}{" "}
                <b>Billing</b>{" "}
                {`Every ${bp?.intervalCount} ${bp?.interval?.toLowerCase()}${bp?.intervalCount > 1 ? "s" : ""}`}
              </td>
              <td>{node.sellingPlanName || "—"}</td>
              <td>{node.quantity}</td>
              <td>
                {node.pricingPolicy?.cycleDiscounts?.[0]?.computedPrice
                  ?.currencyCode === "INR"
                  ? "₹"
                  : "$"}
                {/* {node.lineDiscountedPrice?.amount} */}

                {parseFloat(
                  node.pricingPolicy?.cycleDiscounts?.[0]?.computedPrice
                    ?.amount,
                ).toFixed(2)}
              </td>
              <td>
                {" "}
                {node.pricingPolicy?.cycleDiscounts?.[0]?.computedPrice
                  ?.currencyCode === "INR"
                  ? "₹"
                  : "$"}{" "}
                {parseFloat(
                  node.pricingPolicy?.cycleDiscounts?.[0]?.computedPrice
                    ?.amount,
                ).toFixed(2)}{" "}
                X {node.quantity} ={" "}
                {(
                  parseFloat(
                    node.pricingPolicy?.cycleDiscounts?.[0]?.computedPrice
                      ?.amount,
                  ) * node.quantity
                ).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Payment Summary</h3>

      <div
        style={{
          background: "#f6f6f7",
          padding: 16,
          borderRadius: 8,
          maxWidth: 300,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>
  {new Intl.NumberFormat("en", {
    style: "currency",
    currency: lines?.edges?.[0]?.node?.lineDiscountedPrice?.currencyCode,
  }).format(subtotal ?? 0)}
</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <span>Shipping (Standard)</span>
          <span>{formattedShipping}</span>
        </div>

        <hr />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
          }}
        >
          <span>Total</span>
          <span>{total}</span>
        </div>
      </div>
      {contract.status=="CANCEL" ?
      <>
      </>
      :
      <>
       <b>Upcoming orders</b>
      {orders?.edges?.length === 0 ? (
        <p style={{ color: "#888" }}>No orders yet.</p>
      ) : (
        <table cellPadding="8" cellSpacing="0">
          <thead style={{ background: "#f6f6f7" }}>
            <tr>
              {/* <th>Order</th> */}
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders?.edges?.map(({ node }) => (
              <tr key={node.id}>
                {/* <td>{node.name || `#${node.id.split("/").pop()}`}</td> */}
                <td>
                  {formatDate(contract.nextBillingDate)}{" "}
                  {contract.status === "ACTIVE" ? <Link>Skip</Link> : ""}{" "}
                  <Link>Edit </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </>
      
      }
      {/* Orders */}
     
    </div>
  );
}
