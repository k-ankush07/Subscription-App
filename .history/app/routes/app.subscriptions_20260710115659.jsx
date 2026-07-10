// import { Page, Card, EmptyState } from "@shopify/polaris";
// import { authenticate } from "../shopify.server";
// import React from "react";
// import { useLoaderData, useNavigate } from "react-router";
// import { currencySymbol } from "./utils/formatMoney.js";
// export async function loader({ request }) {
//   const { admin } = await authenticate.admin(request);

//   const res = await admin.graphql(`
//     query {
//   subscriptionContracts(first: 100) {
//     edges {
//       node {
//         id
//         status
//         createdAt
//         updatedAt
//         nextBillingDate
//         currencyCode

//         customer {
//           id
//           firstName
//           lastName
//           email
//         }
//         deliveryPolicy {
//           interval
//           intervalCount
//         }
//         lines(first: 50) {
//           edges {
//             node {
//               id
//               title
//               quantity
//               sellingPlanName
//               sellingPlanId
//               pricingPolicy {
//                 cycleDiscounts {
//                   afterCycle
//                   adjustmentType
//                   adjustmentValue {
//                     ... on SellingPlanPricingPolicyPercentageValue {
//                       percentage
//                     }
//                     ... on MoneyV2 {
//                       amount
//                       currencyCode
//                     }
//                   }
//                   computedPrice {
//                     amount
//                     currencyCode
//                   }
//                 }
//               }

//               currentPrice {
//                 amount
//                 currencyCode
//               }
//             }
//           }
//         }
//       }
//     }
//   }
// }`);
//   const data = await res.json();

//   return {
//     contracts: data.data.subscriptionContracts.edges.map((e) => e.node),
//   };
// }

// function Subscriptions() {
//   const { contracts } = useLoaderData();
//   const navigate = useNavigate();
//   const formatDate = (date) => {
//     return new Date(date).toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//     });
//   };

//   const handelRowClick = (id) => {
//     console.log("print id ", id);
//     navigate(`/app/subscription/${id}`);
//   };
//   // --- helper: discount ke hisaab se price, WITHOUT index ---
//   function getLinePriceWithoutIndex(line) {
//     const basePrice = parseFloat(line?.currentPrice?.amount ?? 0);
//     const discounts = line?.pricingPolicy?.cycleDiscounts || [];

//     // Agar koi discount nahi hai to simple base price return karo
//     if (!discounts.length) {
//       return basePrice;
//     }

//     // Har discount ka computedPrice nikaalo
//     const computedPrices = discounts
//       .map((d) => parseFloat(d?.computedPrice?.amount ?? NaN))
//       .filter((n) => !Number.isNaN(n));

//     // Agar computedPrice missing ho to fallback base price
//     if (!computedPrices.length) {
//       return basePrice;
//     }

//     // Sabse kam price ko choose kar lo (best discount)
//     const minComputed = Math.min(...computedPrices);
//     return minComputed || basePrice;
//   }

//   return (
//     <>
//       <Page title="Subscriptions">
//         {contracts.length === 0 ? (
//           <Card>
//             <EmptyState>
//               <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
//               {/* <h2>Get more repeat business</h2> */}
//               <p>No Subscriptions</p>
//             </EmptyState>
//           </Card>
//         ) : (
//           <Card>
//             <div>
//               <table border="1">
//                 <thead>
//                   <tr>
//                     <th>ContractId</th>
//                     <th>Status</th>
//                     <th>Customer Email</th>
//                     <th>Created</th>
//                     <th>Updated</th>
//                     {/* <th>Next Order Date</th> */}
//                     <th>Product</th>
//                     <th>Price</th>
//                     <th>Delivery Frequency</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {[...contracts].reverse().map((item) => {
//                     const lines = item.lines?.edges?.map((e) => e.node) ?? [];
//                     const total = lines.reduce((sum, line) => {
//                       const unitPrice = getLinePriceWithoutIndex(line);
//                       const qty = line?.quantity ?? 1;
//                       return sum + unitPrice * qty;
//                     }, 0);

//                     const currencyCode = lines[0]?.currentPrice?.currencyCode;

//                     const productLabel =
//                       lines.length === 1
//                         ? lines[0].title
//                         : `${lines.length} Products`;

//                     return (
//                       <tr key={item.id}>
//                         <td
//                           style={{ cursor: "pointer" }}
//                           onClick={() =>
//                             handelRowClick(item.id.split("/").pop())
//                           }
//                         >
//                           {item.id.split("/").pop()}
//                         </td>
//                         <td>{item.status}</td>
//                         <td>
//                           {item.customer?.firstName} {item.customer?.lastName}{" "}
//                           <br />
//                           {item.customer?.email}
//                         </td>
//                         <td>{formatDate(item.createdAt)}</td>
//                         <td>{formatDate(item.updatedAt)}</td>
//                         {/* <td>{
//                         item.status !=="CANCELLED" ? formatDate(item.nextBillingDate) :""
//                         }</td> */}
//                         <td>{productLabel}</td>
//                         <td>
//                           {currencySymbol(currencyCode)} {total.toFixed(2)}
//                         </td>
//                         <td>
//                           Every {item.deliveryPolicy?.intervalCount}{" "}
//                           {item.deliveryPolicy?.interval}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           </Card>
//         )}
//       </Page>
//     </>
//   );
// }

// export default Subscriptions;

import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getContractPreview } from "../lib/billing-preview.server.js";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  let contractId = url.searchParams.get("id");
  console.log("contractId", contractId);

  if (!contractId) {
    return { error: "No contract id provided in URL." };
  }

  if (!contractId.startsWith("gid://")) {
    contractId = `gid://shopify/SubscriptionContract/${contractId}`;
  }

  try {
    const preview = await getContractPreview(admin, contractId);
    if (!preview) {
      return { error: "Contract not found." };
    }
    return { preview };
  } catch (err) {
    return { error: String(err?.message || err) };
  }
};

// Chhota helper — gid se numeric/id part nikaal ke dikhata hai
function shortId(gid) {
  if (!gid) return "";
  return gid.split("/").pop();
}

// QUANTITY_CHANGE ke liye detailed card
function QuantityChangeDetails({ a }) {
  const products = Array.isArray(a.products) ? a.products : [];

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: "4px 0" }}>
        <strong>New quantity:</strong>{" "}
        {a.value !== undefined && a.value !== "" ? (
          a.value
        ) : (
          <span style={{ color: "#991b1b" }}>⚠️ not set</span>
        )}
      </p>
      {products.map((p, idx) => (
        <div
          key={p.id || idx}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 10,
            marginTop: 6,
          }}
        >
          <p style={{ margin: "2px 0" }}>
            <strong>{p.title}</strong>
          </p>
          <p style={{ margin: "2px 0", fontSize: 12, color: "#6b7280" }}>
            Product ID: {shortId(p.id)}
          </p>
          {Array.isArray(p.variants) && p.variants.length > 0 && (
            <ul style={{ margin: "4px 0", paddingLeft: 18 }}>
              {p.variants.map((v) => (
                <li key={v.variantsId} style={{ fontSize: 13 }}>
                  {v.variantsTitle}{" "}
                  <span style={{ color: "#9ca3af" }}>
                    ({shortId(v.variantsId)})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// SWAP ke liye detailed card — source aur destination dono images ke saath
function SwapDetails({ a }) {
  const dests = Array.isArray(a.dests) ? a.dests : [];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginTop: 8,
        flexWrap: "wrap",
      }}
    >
      {/* Source product */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 10,
          width: 220,
        }}
      >
        {a.imageUrl && (
          <img
            src={a.imageUrl}
            alt={a.sourceProductName}
            style={{
              width: "100%",
              height: 120,
              objectFit: "cover",
              borderRadius: 6,
              marginBottom: 6,
            }}
          />
        )}
        <p style={{ margin: "2px 0", fontWeight: 600, fontSize: 13 }}>
          {a.sourceProductName || (
            <span style={{ color: "#991b1b" }}>⚠️ no source product</span>
          )}
        </p>
        <p style={{ margin: "2px 0", fontSize: 12, color: "#6b7280" }}>
          Product ID: {shortId(a.sourceProductId)}
        </p>
        <p style={{ margin: "2px 0", fontSize: 11, color: "#9ca3af" }}>
          FROM
        </p>
      </div>

      {/* Arrow */}
      <div style={{ fontSize: 24, color: "#6b7280" }}>→</div>

      {/* Destination product(s) */}
      {dests.length > 0 ? (
        dests.map((d, idx) => (
          <div
            key={d.id || idx}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 10,
              width: 220,
            }}
          >
            {d.imageUrl && (
              <img
                src={d.imageUrl}
                alt={d.name}
                style={{
                  width: "100%",
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 6,
                  marginBottom: 6,
                }}
              />
            )}
            <p style={{ margin: "2px 0", fontWeight: 600, fontSize: 13 }}>
              {d.name}
            </p>
            <p style={{ margin: "2px 0", fontSize: 12, color: "#6b7280" }}>
              Product ID: {shortId(d.id)}
            </p>
            {Array.isArray(d.variantNames) &&
              d.variantNames.map((vn, vIdx) => (
                <p
                  key={vIdx}
                  style={{ margin: "2px 0", fontSize: 12, color: "#374151" }}
                >
                  Variant: {vn}{" "}
                  <span style={{ color: "#9ca3af" }}>
                    ({shortId(d.variantIds?.[vIdx])})
                  </span>
                </p>
              ))}
            <p style={{ margin: "2px 0", fontSize: 11, color: "#9ca3af" }}>
              TO
            </p>
          </div>
        ))
      ) : (
        <span style={{ color: "#991b1b" }}>⚠️ no destination product set</span>
      )}
    </div>
  );
}

// Type ke hisaab se sahi detail component choose karta hai
function renderActionDetails(a) {
  switch (a.type) {
    case "QUANTITY_CHANGE":
      return <QuantityChangeDetails a={a} />;
    case "swap":
      return <SwapDetails a={a} />;
    default:
      return (
        <pre style={{ fontSize: 12, background: "#f9fafb", padding: 8 }}>
          {JSON.stringify(a, null, 2)}
        </pre>
      );
  }
}

export default function SubscriptionDetailPage() {
  const { preview, error } = useLoaderData();

  if (error) {
    return (
      <s-page heading="Subscription">
        <p style={{ color: "#991b1b" }}>{error}</p>
      </s-page>
    );
  }

  const willApply = Array.isArray(preview.nextOrder.willApply)
    ? preview.nextOrder.willApply
    : [];

  return (
    <s-page heading="Subscription Details">
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{preview.lineItem.title}</h3>
        <p>Customer: {preview.customer?.displayName || preview.customer?.id}</p>
        <p>Status: {preview.status}</p>
        <p>Current quantity: {preview.lineItem.quantity}</p>
        <p>
          Current price: {preview.lineItem.price?.amount}{" "}
          {preview.lineItem.price?.currencyCode}
        </p>
        <p>Plan: {preview.planGroup?.name || "unknown"}</p>
        {willApply.length === 0 && <p>No changes scheduled.</p>}
      </div>

      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          Next Order — Cycle #{preview.nextOrder.cycleIndex}
        </h3>
        <p>Expected date: {preview.nextOrder.expectedDate}</p>

        {willApply.length > 0 ? (
          <div>
            {willApply.map((a, i) => (
              <div
                key={i}
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 14,
                  marginTop: 14,
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong style={{ textTransform: "uppercase" }}>
                    {a.type}
                  </strong>{" "}
                  <span style={{ fontSize: 12, color: "#6b7280" }}>
                    (applies after cycle {a.after ?? a.afterCycle})
                  </span>
                </p>
                {renderActionDetails(a)}
              </div>
            ))}
          </div>
        ) : (
          <p>No changes scheduled.</p>
        )}
      </div>
    </s-page>
  );
}