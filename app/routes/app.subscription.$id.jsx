// import { Button, Card, Page } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import React, { useState } from "react";
// import { Link, useNavigate, useParams } from "react-router";
// import { useLoaderData } from "react-router";
// const API = import.meta.env.VITE_API_URL;
// const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY
// export async function loader({ request, params }) {
//   const { admin } = await authenticate.admin(request);
//   const subscriptionId = params.id;
//   const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;
//   console.log("bsvjhfvjhs", contractId);
//   const res = await admin.graphql(`
//  query {
//   subscriptionContract(id: "${contractId}") {
//     id
//     status
//     createdAt
//     updatedAt
//     nextBillingDate
//     deliveryPolicy {
//       interval
//       intervalCount
//     }
//     billingPolicy {
//       interval
//       intervalCount
//     }
//     originOrder {
//       id
//       name
//     }
//       customer {
//           id
//           firstName
//           lastName
//           email
//         }
//          deliveryMethod {
//   ... on SubscriptionDeliveryMethodShipping {
//      address {
//               firstName
//               lastName
//               address1
//               address2
//               city
//               province
//               zip
//               country
//             }
//   }
// }
//    customerPaymentMethod {
//           id
//           instrument {
//             ... on CustomerCreditCard {
//               brand
//               lastDigits
//               expiryMonth
//               expiryYear
//             }
//           }
//         }
//         orders(first: 10) {
//           edges {
//             node {
//               id
//               createdAt
//               name
//               shippingLine {
//         title
//       }
//           totalShippingPriceSet {
//         shopMoney {
//           amount
//           currencyCode
//         }
//       }
//             }
//           }
//         }
        
//     lines(first: 10) {
//       edges {
//         node {
//           id
//           title
//           variantTitle
//           quantity
//           productId       
//           variantId 
//           sku
//           currentPrice {
//             amount
//             currencyCode
//           }
//           variantImage {
//             url
//           }
//             pricingPolicy {
//                   cycleDiscounts {
//                     afterCycle
//                     adjustmentType
//                     adjustmentValue {
//                       ... on SellingPlanPricingPolicyPercentageValue {
//                         percentage
//                       }
//                       ... on MoneyV2 {
//                         amount
//                         currencyCode
//                       }
//                     }
//                     computedPrice {
//                       amount
//                       currencyCode
//                     }
//   }
// }
//         }
//       }
//     }
//   }
// }
//   `);
//  const data = await res.json();
//   const contract = data.data.subscriptionContract;
//   try {
//     await fetch(`https://habitant-startling-cassette.ngrok-free.dev/api/subscription`, {
//       method: "POST",
//       headers: {
//          "Content-Type": "application/json" ,
//          "x-api-key": SECRET_KEY,
//         },
//       body: JSON.stringify({ subscriptionId, contractId, contract }),
//     });
//   } catch (err) {
//     console.error("Backend save call failed:", err);
//   }
//   return { contract };
// }

// function subscriptionsId() {
//   const [showInternalNotes, setShowInternalNotes] = useState(false);
//   const [Internalnotes, setInternalNotes] = useState("");
//   const [showCustomerNotes, setshowCustomerNotes]= useState(false)
//   const [CustomerNotes, setCustomerNotes]= useState("")

//   const { id } = useParams();
//   const { contract } = useLoaderData();
//   console.log("billing ",contract)
//   const lines = contract?.lines?.edges;
//   const shipingChargesAmount= contract?.orders?.edges[0]?.node?.totalShippingPriceSet?.shopMoney?.amount;
//   const shipingChargesCurrency= contract?.orders?.edges[0]?.node?.totalShippingPriceSet?.shopMoney?.currencyCode;
//   const shippingTitle= contract?.orders?.edges[0]?.node?.shippingLine?.title;

//   const navigate = useNavigate();
//   const backButton = () => {
//     navigate("/app/subscriptions");
//   };
//    const handleSave = () => {
//     JSON.stringify(localStorage.setItem("notes data",Internalnotes))
//     setShowInternalNotes(false);
//     setInternalNotes("")
//   };
//    const handleSaveCustomer = () => {
//     JSON.stringify(localStorage.setItem("customer data",CustomerNotes))
//     setshowCustomerNotes(false);
//     setCustomerNotes("")
//   };
//   const formateDate = (date) => {
//     return new Date(date).toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//     });
//   };
//   const grandTotal = lines?.reduce((sum, item) => {
//     const price = parseFloat(item?.node?.currentPrice?.amount || 0);
//     const quantity = item?.node?.quantity || 0;
//     return sum + price * quantity;
//   }, 0);

//   return (
   
//     <>
//       <Page backAction={{ onAction: backButton }} title={`${id}`}>
//         <div>
//           <b>{contract.status}</b>, <b>{formateDate(contract?.createdAt)}</b> ,{" "}
//           <b>{contract?.originOrder?.name}</b>
//         </div>

//         {
//           contract?.status==="ACTIVE"
//           ? <>
//           <Button>Place order now</Button>
//           <Button>Pause</Button>
//           </>
//           : <>
//           <Button>Resume</Button>
//           </>
//         }
        
//         <Button>cancel subscription</Button>
//         <div>
//           <b>Next Order</b>
//           <p>{formateDate(contract?.nextBillingDate)}</p>
//           {
//             contract?.status==="ACTIVE" 
//             ? <><Button>Place next order</Button></>
//             : ""
//           }
//         </div>
//         <div>
//           <b>Customer</b>
//           <p>
//             <span>
//               {contract?.customer?.firstName} {contract?.customer?.lastName}
//             </span>
//           </p>
//           <span>{contract?.customer?.email}</span>

//           <div>
//             <b>Shipping address</b> <br />
//             <span>
//               {contract?.deliveryMethod?.address?.firstName}{" "}
//               {contract?.deliveryMethod?.address?.lastName}
//             </span>{" "}
//             <br />
//             <span>
//               {contract?.deliveryMethod?.address?.address1}{" "}
//               {contract?.deliveryMethod?.address?.address2}
//             </span>{" "}
//             <br />
//             <span>{contract?.deliveryMethod?.address?.zip}</span>{" "}
//             <span>{contract?.deliveryMethod?.address?.city}</span>{" "}
//             <span>{contract?.deliveryMethod?.address?.province}</span>{" "}
//             <span>{contract?.deliveryMethod?.address?.country}</span>
//           </div>

//           <div>
//             <b>Payment Method</b> <br />
//             <img
//               src="https://subscriptions-assets.kachingappz.app/payment-method-icons/bogus.svg"
//               alt={`${contract?.customerPaymentMethod?.instrument?.brand}`}
//             />
//             <span>
//               ●●●●●●●●●●●
//               {contract?.customerPaymentMethod?.instrument?.lastDigits}
//             </span>
//             <br />
//             <span>
//               Expires:{" "}
//               {contract?.customerPaymentMethod?.instrument?.expiryMonth}
//             </span>
//             /
//             <span>
//               {contract?.customerPaymentMethod?.instrument?.expiryYear}
//             </span>
//           </div>
//         </div>

//         <div>
//           <b> Subscription details</b>
//           <div>
//             {lines.map((item, index) => {
//               console.log("log", item);
//               const price = item?.node?.currentPrice?.amount;
//               const quantity = item?.node?.quantity;
//               const Total = parseFloat(price * quantity);
//               const cycleDiscounts =
//                 item?.node?.pricingPolicy?.cycleDiscounts || [];
//               return (
//                 <Card key={index}>
//                   <img
//                     src={item?.node?.variantImage?.url}
//                     alt="prodcut image"
//                     width={50}
//                     height={50}
//                   />
//                   <p>
//                     {item?.node?.title} {item?.node?.variantTitle}
//                   </p>
//                   <p>
//                     <span>
//                       ProdcutId: {item?.node?.productId.split("/").pop()}
//                     </span>{" "}
//                     <span>
//                       VariantId: {item?.node?.variantId.split("/").pop()}
//                     </span>
//                   </p>
//                   <p>
//                     {" "}
//                     {`${item?.node?.currentPrice?.amount} X ${item?.node?.quantity} = ${Total}`}
//                   </p>
//                   {cycleDiscounts.length > 0 && (
//                     <p>
//                       <span>
//                         {cycleDiscounts.length === 1
//                           ? `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}% for all orders ` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount} for  all orders`}`
//                           : `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount}`} off for the first ${cycleDiscounts[1]?.afterCycle || 1} order, then ${cycleDiscounts[1]?.adjustmentValue?.percentage ? `${cycleDiscounts[1]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[1]?.adjustmentValue?.amount}`} off`}
//                       </span>
//                     </p>
//                   )}
//                   <p>
//                     <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
//                     <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
//                   </p>
//                 </Card>
//               );
//             })}
//           </div>
//         </div>
//         <Card>
//           <b>Payment Summary</b>

//           <p>Subtotal {grandTotal}</p>
//           <p>Shipping {shippingTitle} {parseFloat(shipingChargesAmount)}</p>
//           <p>Total {grandTotal + parseFloat(shipingChargesAmount)} </p>
//         </Card>
//         <Card>
//           <b>Upcoming orders</b>
//           <div  style={{ display:"flex", justifyContent:"space-between" }}>
//             <p>{formateDate(contract?.nextBillingDate)}</p>
//           <div style={{ display:"flex", gap:"30px", }}>
//               <Link>Edit</Link> 
//             <Link>skip</Link>
//           </div>
//           </div>
//         </Card>
//       <div>
//       <b>Internal Notes</b><br/>
//       <Button onClick={() => setShowInternalNotes(true)}>Click</Button><br/>
//       {showInternalNotes && (
//         <>
//           <textarea value={Internalnotes} onChange={(e) => setInternalNotes(e.target.value)}></textarea>
//           <Button onClick={() => {
//             localStorage.removeItem("notes data")
//             setShowInternalNotes(false)
//           }}>Cancel</Button>
//           <Button onClick={handleSave}>Save</Button>
//         </>
//       )}
//     </div>
//      <div>
//       <b>Customer Notes</b><br/>
//       <Button onClick={() => setshowCustomerNotes(true)}>Click</Button><br/>
//       {showCustomerNotes && (
//         <>
//           <textarea value={CustomerNotes} onChange={(e) => setCustomerNotes(e.target.value)}></textarea>
//           <Button onClick={() => {
//             localStorage.removeItem("customer data")
//             setshowCustomerNotes(false)
//           }}>Cancel</Button>
//           <Button onClick={handleSaveCustomer}>Save</Button>
//         </>
//       )}
//     </div>
//       </Page>
//     </>
//   );
// }

// export default subscriptionsId;


import { Button, Card, Page } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useLoaderData } from "react-router";
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY
export async function loader({ request, params }) {
  const { admin } = await authenticate.admin(request);
  const subscriptionId = params.id;
  const contractId = `gid://shopify/SubscriptionContract/${subscriptionId}`;
  console.log("bsvjhfvjhs", contractId);
  const res = await admin.graphql(`
 query {
  subscriptionContract(id: "${contractId}") {
    id
    status
    createdAt
    updatedAt
    nextBillingDate
    deliveryPolicy {
      interval
      intervalCount
    }
    billingPolicy {
      interval
      intervalCount
    }
    originOrder {
      id
      name
    }
      customer {
          id
          firstName
          lastName
          email
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
        orders(first: 10) {
          edges {
            node {
              id
              createdAt
              name
              shippingLine {
        title
      }
          totalShippingPriceSet {
        shopMoney {
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
          variantTitle
          quantity
          productId       
          variantId 
          sku
          currentPrice {
            amount
            currencyCode
          }
          variantImage {
            url
          }
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
                    computedPrice {
                      amount
                      currencyCode
                    }
  }
}
        }
      }
    }
  }
}
  `);
 const data = await res.json();
  const contract = data.data.subscriptionContract;

  // Fetch upcoming billing cycles for this contract (next 90 days)
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const upcomingRes = await admin.graphql(
    `query UpcomingSubscriptionOrders(
      $contractId: ID!
      $startDate: DateTime!
      $endDate: DateTime!
    ) {
      subscriptionBillingCycles(
        first: 20
        contractId: $contractId
        billingCyclesDateRangeSelector: { startDate: $startDate, endDate: $endDate }
      ) {
        edges {
          node {
            billingAttemptExpectedDate
            billingAttempts(first: 1) {
              edges {
                node {
                  ready
                  errorMessage
                  errorCode
                  completedAt
                }
              }
            }
          }
        }
      }
    }`,
    {
      variables: { contractId, startDate, endDate },
    }
  );
  const upcomingData = await upcomingRes.json();
  const upcomingOrders =
    upcomingData?.data?.subscriptionBillingCycles?.edges?.map(
      (edge) => edge.node
    ) || [];

  try {
    await fetch(`https://habitant-startling-cassette.ngrok-free.dev/api/subscription`, {
      method: "POST",
      headers: {
         "Content-Type": "application/json" ,
         "x-api-key": SECRET_KEY,
        },
      body: JSON.stringify({ subscriptionId, contractId, contract }),
    });
  } catch (err) {
    console.error("Backend save call failed:", err);
  }
  return { contract, upcomingOrders };
}

function subscriptionsId() {
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [Internalnotes, setInternalNotes] = useState("");
  const [showCustomerNotes, setshowCustomerNotes]= useState(false)
  const [CustomerNotes, setCustomerNotes]= useState("")

  const { id } = useParams();
  const { contract, upcomingOrders } = useLoaderData();
  console.log("billing ",contract,upcomingOrders)
  const lines = contract?.lines?.edges;
  const shipingChargesAmount= contract?.orders?.edges[0]?.node?.totalShippingPriceSet?.shopMoney?.amount;
  const shipingChargesCurrency= contract?.orders?.edges[0]?.node?.totalShippingPriceSet?.shopMoney?.currencyCode;
  const shippingTitle= contract?.orders?.edges[0]?.node?.shippingLine?.title;

  const navigate = useNavigate();
  const backButton = () => {
    navigate("/app/subscriptions");
  };
   const handleSave = () => {
    JSON.stringify(localStorage.setItem("notes data",Internalnotes))
    setShowInternalNotes(false);
    setInternalNotes("")
  };
   const handleSaveCustomer = () => {
    JSON.stringify(localStorage.setItem("customer data",CustomerNotes))
    setshowCustomerNotes(false);
    setCustomerNotes("")
  };
  const formateDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };
  const grandTotal = lines?.reduce((sum, item) => {
    const price = parseFloat(item?.node?.currentPrice?.amount || 0);
    const quantity = item?.node?.quantity || 0;
    return sum + price * quantity;
  }, 0);

  return (
   
    <>
      <Page backAction={{ onAction: backButton }} title={`${id}`}>
        <div>
          <b>{contract.status}</b>, <b>{formateDate(contract?.createdAt)}</b> ,{" "}
          <b>{contract?.originOrder?.name}</b>
        </div>

        {
          contract?.status==="ACTIVE"
          ? <>
          <Button>Place order now</Button>
          <Button>Pause</Button>
          </>
          : <>
          <Button>Resume</Button>
          </>
        }
        
        <Button>cancel subscription</Button>
        <div>
          <b>Next Order</b>
          <p>{formateDate(contract?.nextBillingDate)}</p>
          {
            contract?.status==="ACTIVE" 
            ? <><Button>Place next order</Button></>
            : ""
          }
        </div>
        <div>
          <b>Customer</b>
          <p>
            <span>
              {contract?.customer?.firstName} {contract?.customer?.lastName}
            </span>
          </p>
          <span>{contract?.customer?.email}</span>

          <div>
            <b>Shipping address</b> <br />
            <span>
              {contract?.deliveryMethod?.address?.firstName}{" "}
              {contract?.deliveryMethod?.address?.lastName}
            </span>{" "}
            <br />
            <span>
              {contract?.deliveryMethod?.address?.address1}{" "}
              {contract?.deliveryMethod?.address?.address2}
            </span>{" "}
            <br />
            <span>{contract?.deliveryMethod?.address?.zip}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.city}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.province}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.country}</span>
          </div>

          <div>
            <b>Payment Method</b> <br />
            <img
              src="https://subscriptions-assets.kachingappz.app/payment-method-icons/bogus.svg"
              alt={`${contract?.customerPaymentMethod?.instrument?.brand}`}
            />
            <span>
              ●●●●●●●●●●●
              {contract?.customerPaymentMethod?.instrument?.lastDigits}
            </span>
            <br />
            <span>
              Expires:{" "}
              {contract?.customerPaymentMethod?.instrument?.expiryMonth}
            </span>
            /
            <span>
              {contract?.customerPaymentMethod?.instrument?.expiryYear}
            </span>
          </div>
        </div>

        <div>
          <b> Subscription details</b>
          <div>
            {lines.map((item, index) => {
              console.log("log", item);
              const price = item?.node?.currentPrice?.amount;
              const quantity = item?.node?.quantity;
              const Total = parseFloat(price * quantity);
              const cycleDiscounts =
                item?.node?.pricingPolicy?.cycleDiscounts || [];
              return (
                <Card key={index}>
                  <img
                    src={item?.node?.variantImage?.url}
                    alt="prodcut image"
                    width={50}
                    height={50}
                  />
                  <p>
                    {item?.node?.title} {item?.node?.variantTitle}
                  </p>
                  <p>
                    <span>
                      ProdcutId: {item?.node?.productId.split("/").pop()}
                    </span>{" "}
                    <span>
                      VariantId: {item?.node?.variantId.split("/").pop()}
                    </span>
                  </p>
                  <p>
                    {" "}
                    {`${item?.node?.currentPrice?.amount} X ${item?.node?.quantity} = ${Total}`}
                  </p>
                  {cycleDiscounts.length > 0 && (
                    <p>
                      <span>
                        {cycleDiscounts.length === 1
                          ? `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}% for all orders ` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount} for  all orders`}`
                          : `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount}`} off for the first ${cycleDiscounts[1]?.afterCycle || 1} order, then ${cycleDiscounts[1]?.adjustmentValue?.percentage ? `${cycleDiscounts[1]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[1]?.adjustmentValue?.amount}`} off`}
                      </span>
                    </p>
                  )}
                  <p>
                    <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
                    <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
        <Card>
          <b>Payment Summary</b>

          <p>Subtotal {grandTotal}</p>
          <p>Shipping {shippingTitle} {parseFloat(shipingChargesAmount)}</p>
          <p>Total {grandTotal + parseFloat(shipingChargesAmount)} </p>
        </Card>
        <Card>
          <b>Upcoming orders</b>
          {upcomingOrders && upcomingOrders.length > 0 ? (
            upcomingOrders.map((cycle, index) => {
              const attempt = cycle?.billingAttempts?.edges?.[0]?.node;
              let statusLabel = "";
              if (attempt) {
                if (attempt.errorMessage) {
                  statusLabel = ` (Failed: ${attempt.errorMessage})`;
                } else if (attempt.completedAt) {
                  statusLabel = " (Completed)";
                } else if (attempt.ready === false) {
                  statusLabel = " (Processing)";
                }
              }
              return (
                <div
                  key={index}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <p>
                    {formateDate(cycle?.billingAttemptExpectedDate)}
                    {statusLabel}
                  </p>
                  <div style={{ display: "flex", gap: "30px" }}>
                    <Link to="#">Edit</Link>
                    <Link to="#">skip</Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p>{formateDate(contract?.nextBillingDate)}</p>
              <div style={{ display: "flex", gap: "30px" }}>
                <Link to="#">Edit</Link>
                <Link to="#">skip</Link>
              </div>
            </div>
          )}
        </Card>
      <div>
      <b>Internal Notes</b><br/>
      <Button onClick={() => setShowInternalNotes(true)}>Click</Button><br/>
      {showInternalNotes && (
        <>
          <textarea value={Internalnotes} onChange={(e) => setInternalNotes(e.target.value)}></textarea>
          <Button onClick={() => {
            localStorage.removeItem("notes data")
            setShowInternalNotes(false)
          }}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </>
      )}
    </div>
     <div>
      <b>Customer Notes</b><br/>
      <Button onClick={() => setshowCustomerNotes(true)}>Click</Button><br/>
      {showCustomerNotes && (
        <>
          <textarea value={CustomerNotes} onChange={(e) => setCustomerNotes(e.target.value)}></textarea>
          <Button onClick={() => {
            localStorage.removeItem("customer data")
            setshowCustomerNotes(false)
          }}>Cancel</Button>
          <Button onClick={handleSaveCustomer}>Save</Button>
        </>
      )}
    </div>
      </Page>
    </>
  );
}

export default subscriptionsId;