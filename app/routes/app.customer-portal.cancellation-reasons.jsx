// // import React from "react";
// // import PortalNav from "./components/PortalNav";
// // import {
// //   BlockStack,
// //   Page,
// //   Card,
// //   IndexTable,
// //   Badge,
// //   Text,
// //   EmptyState,
// //   Pagination,
// //   Link,
// // } from "@shopify/polaris";
// // import { useLoaderData, useSearchParams, useNavigate } from "react-router";
// // import { authenticate } from "../shopify.server";
// // import { formatDate } from "./utils/formatDate.js"
// // const API = import.meta.env.VITE_API_URL;
// // const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
// // const PAGE_SIZE = 10;

// // export async function loader({ request }) {
// //   const { session } = await authenticate.admin(request);
// //   const url = new URL(request.url);
// //   const cursor = url.searchParams.get("cursor") || "";

// //   const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
// //   if (cursor) params.set("cursor", cursor);

// //   let items = [];
// //   let pageInfo = { hasNextPage: false, endCursor: null };

// //   try {
// //     const res = await fetch(
// //       `${API}/api/subscriptions/cancellations?${params.toString()}`,
// //       { headers: { "x-api-key": SECRET_KEY } },
// //     );

// //     if (res.ok) {
// //       const data = await res.json();
// //       items = data.data || [];
// //       pageInfo = data.pageInfo || pageInfo;
// //     } else {
// //       const text = await res.text();
// //       console.error("[CancelSubscription] API failed:", res.status, text);
// //     }
// //   } catch (err) {
// //     console.error("[CancelSubscription] Failed to load cancellations:", err);
// //   }

// //   return { items, pageInfo, shop: session.shop };
// // }

// // function ActionBadge({ actionType }) {
// //   if (actionType === "cancelled") {
// //     return <Badge tone="critical">Cancelled</Badge>;
// //   }
// //   if (actionType === "paused") {
// //     return <Badge tone="warning">Paused</Badge>;
// //   }
// //   return <Badge>{actionType || "-"}</Badge>;
// // }

// // function CancelSubscription() {
// //   const { items, pageInfo } = useLoaderData();
// //   const [searchParams, setSearchParams] = useSearchParams();
// //   const navigate = useNavigate();

// //   const handleNext = () => {
// //     if (pageInfo?.endCursor) {
// //       setSearchParams({ cursor: pageInfo.endCursor });
// //     }
// //   };

// //   const rowMarkup = items.map((item, index) => (
// //     <IndexTable.Row id={item.id} key={item.id} position={index}>
// //       <IndexTable.Cell>
// //         <Text>
// //           {item.email}
// //         </Text>
// //       </IndexTable.Cell>
// //       <IndexTable.Cell>
// //         <Link onClick={() => navigate(`/app/subscription/${item.subscriptionId}`)}>
// //           #{item.subscriptionId}
// //         </Link>
// //       </IndexTable.Cell>
// //       <IndexTable.Cell>
// //         <ActionBadge actionType={item.actionType} />
// //       </IndexTable.Cell>
// //       <IndexTable.Cell>
// //         <Text as="span">{item.actionReason || "-"}</Text>
// //       </IndexTable.Cell>
// //       <IndexTable.Cell>{formatDate(item.actionAt)}</IndexTable.Cell>
// //     </IndexTable.Row>
// //   ));

// //   return (
// //     <Page title="Cancellation reason">
// //       <BlockStack gap="400">
// //         <PortalNav />
// //         <Card padding="0">
// //           {items.length === 0 ? (
// //             <EmptyState heading="No customer actions yet" image="">

// //             </EmptyState>
// //           ) : (
// //             <>
// //               <IndexTable
// //                 itemCount={items.length}
// //                 headings={[
// //                   { title: "Email" },
// //                   { title: "Subscription" },
// //                   { title: "Action" },
// //                   { title: "Reason" },
// //                   { title: "Date" },
// //                 ]}
// //                 selectable={false}
// //               >
// //                 {rowMarkup}
// //               </IndexTable>
// //               <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
// //                 <Pagination
// //                   hasNext={pageInfo?.hasNextPage}
// //                   onNext={handleNext}
// //                 />
// //               </div>
// //             </>
// //           )}
// //         </Card>
// //       </BlockStack>
// //     </Page>
// //   );
// // }

// // export default CancelSubscription;

// import React from "react";
// import PortalNav from "./components/PortalNav";
// import {
//   BlockStack,
//   Page,
//   Card,
//   IndexTable,
//   Badge,
//   Text,
//   EmptyState,
//   Pagination,
//   Link,
// } from "@shopify/polaris";
// import { useLoaderData, useSearchParams, useNavigate } from "react-router";
// import { authenticate } from "../shopify.server";
// import { formatDate } from "./utils/formatDate.js";

// const API = import.meta.env.VITE_API_URL;
// const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
// const PAGE_SIZE = 10;

// export async function loader({ request }) {
//   const { session } = await authenticate.admin(request);

//   const url = new URL(request.url);
//   const cursor = url.searchParams.get("cursor") || "";

//   const params = new URLSearchParams({
//     limit: String(PAGE_SIZE),
//   });

//   if (cursor) {
//     params.set("cursor", cursor);
//   }

//   let items = [];
//   let pageInfo = {
//     hasNextPage: false,
//     endCursor: null,
//   };

//   try {
//     const res = await fetch(
//       `${API}/api/subscriptions/cancellations?${params.toString()}`,
//       {
//         headers: {
//           "x-api-key": SECRET_KEY,
//         },
//       },
//     );

//     if (res.ok) {
//       const data = await res.json();

//       items = data.data || [];
//       pageInfo = data.pageInfo || pageInfo;
//     } else {
//       const text = await res.text();

//       console.error(
//         "[CancelSubscription] API failed:",
//         res.status,
//         text,
//       );
//     }
//   } catch (err) {
//     console.error(
//       "[CancelSubscription] Failed to load cancellations:",
//       err,
//     );
//   }

//   return {
//     items,
//     pageInfo,
//     shop: session.shop,
//   };
// }

// /**
//  * Show only CANCELLED and PAUSED subscriptions.
//  * Status is displayed instead of actionType.
//  */
// function StatusBadge({ status }) {
//   const normalizedStatus = String(status || "").toUpperCase();

//   if (normalizedStatus === "CANCELLED") {
//     return <Badge tone="critical">CANCELLED</Badge>;
//   }

//   if (normalizedStatus === "PAUSED") {
//     return <Badge tone="warning">PAUSED</Badge>;
//   }

//   return <Badge>{normalizedStatus || "-"}</Badge>;
// }

// function CancelSubscription() {
//   const { items, pageInfo } = useLoaderData();

//   const [, setSearchParams] = useSearchParams();
//   const navigate = useNavigate();

//   /**
//    * Only show:
//    * - CANCELLED
//    * - PAUSED
//    *
//    * ACTIVE and any other status will not be shown.
//    */
//   const visibleItems = items.filter((item) => {
//     const status = String(
//       item.status || item.contract?.status || "",
//     ).toUpperCase();

//     return status === "CANCELLED" || status === "PAUSED";
//   });

//   const handleNext = () => {
//     if (pageInfo?.endCursor) {
//       setSearchParams({
//         cursor: pageInfo.endCursor,
//       });
//     }
//   };

//   const rowMarkup = visibleItems.map((item, index) => {
//     /**
//      * Status can come from:
//      * item.status
//      * or item.contract.status
//      */
//     const status = String(
//       item.status || item.contract?.status || "",
//     ).toUpperCase();

//     return (
//       <IndexTable.Row
//         id={item.id}
//         key={item.id}
//         position={index}
//       >
//         {/* Email */}
//         <IndexTable.Cell>
//           <Text as="span">
//             {item.email || item.customer?.email || "-"}
//           </Text>
//         </IndexTable.Cell>

//         {/* Subscription */}
//         <IndexTable.Cell>
//           <Link
//             onClick={() =>
//               navigate(
//                 `/app/subscription/${item.subscriptionId}`,
//               )
//             }
//           >
//             #{item.subscriptionId}
//           </Link>
//         </IndexTable.Cell>

//         {/* STATUS - NOT actionType */}
//         <IndexTable.Cell>
//           <StatusBadge status={status} />
//         </IndexTable.Cell>

//         {/* Reason */}
//         <IndexTable.Cell>
//           <Text as="span">
//             {item.actionReason || "-"}
//           </Text>
//         </IndexTable.Cell>

//         {/* Date */}
//         <IndexTable.Cell>
//           {formatDate(item.actionAt)}
//         </IndexTable.Cell>
//       </IndexTable.Row>
//     );
//   });

//   return (
//     <Page title="Cancellation reason">
//       <BlockStack gap="400">
//         <PortalNav />

//         <Card padding="0">
//           {visibleItems.length === 0 ? (
//             <EmptyState
//               heading="No customer actions yet"
//               image=""
//             />
//           ) : (
//             <>
//               <IndexTable
//                 itemCount={visibleItems.length}
//                 headings={[
//                   { title: "Email" },
//                   { title: "Subscription" },
//                   { title: "Status" },
//                   { title: "Reason" },
//                   { title: "Date" },
//                 ]}
//                 selectable={false}
//               >
//                 {rowMarkup}
//               </IndexTable>

//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "center",
//                   padding: "16px",
//                 }}
//               >
//                 <Pagination
//                   hasNext={pageInfo?.hasNextPage}
//                   onNext={handleNext}
//                 />
//               </div>
//             </>
//           )}
//         </Card>
//       </BlockStack>
//     </Page>
//   );
// }

// export default CancelSubscription;|

import React from "react";

import PortalNav from "./components/PortalNav";

import {
  BlockStack,
  Page,
  Card,
  IndexTable,
  Badge,
  Text,
  EmptyState,
  Pagination,
  Link,
} from "@shopify/polaris";

import { useLoaderData, useSearchParams, useNavigate } from "react-router";

import { authenticate } from "../shopify.server";

import { formatDate } from "./utils/formatDate.js";

const API = import.meta.env.VITE_API_URL;

const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

const PAGE_SIZE = 10;


export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);

  const cursor = url.searchParams.get("cursor") || "";

  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    status: "PAUSED,CANCELLED",
    shop: session.shop, 
  });

  if (cursor) {
    params.set("cursor", cursor);
  }

  let items = [];

  let pageInfo = {
    hasNextPage: false,
    endCursor: null,
  };

  try {
    const res = await fetch(
      `${API}/api/subscriptions/cancellations?${params.toString()}`,
      {
        headers: {
          "x-api-key": SECRET_KEY,
        },
      },
    );

    if (res.ok) {
      const data = await res.json();

      items = data.data || [];

      pageInfo = data.pageInfo || {
        hasNextPage: false,
        endCursor: null,
      };
    } else {
      const text = await res.text();

      console.error("[CancelSubscription] API failed:", res.status, text);
    }
  } catch (err) {
    console.error("[CancelSubscription] Failed to load cancellations:", err);
  }


  const visibleItems = items.filter((item) => {
    const status = String(item.status || "").toUpperCase();

    return status === "PAUSED" || status === "CANCELLED";
  });

  return {
    items: visibleItems,
    pageInfo,
    shop: session.shop,
  };
}


function StatusBadge({ status }) {
  const normalizedStatus = String(status || "").toUpperCase();

  if (normalizedStatus === "PAUSED") {
    return <Badge tone="warning">PAUSED</Badge>;
  }

  if (normalizedStatus === "CANCELLED") {
    return <Badge tone="critical">CANCELLED</Badge>;
  }

  return <Badge>{normalizedStatus || "-"}</Badge>;
}



function CancelSubscription() {
  const { items, pageInfo } = useLoaderData();

  const [, setSearchParams] = useSearchParams();

  const navigate = useNavigate();

  const handleNext = () => {
    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      setSearchParams({
        cursor: pageInfo.endCursor,
      });
    }
  };

  
  const rowMarkup = items.map((item, index) => {
    const status = String(item.status || "");

    return (
      <IndexTable.Row
        id={item.id || item._id}
        key={item.id || item._id}
        position={index}
      >
        {/* Email */}
        <IndexTable.Cell>
          <Text as="span">{item.email || "-"}</Text>
        </IndexTable.Cell>

        {/* Subscription */}
        <IndexTable.Cell>
          <Link
            onClick={() => navigate(`/app/subscription/${item.subscriptionId}`)}
          >
            #{item.subscriptionId}
          </Link>
        </IndexTable.Cell>

        {/* Status */}
        <IndexTable.Cell>
          <StatusBadge status={status.toLowerCase()} />
        </IndexTable.Cell>

        {/* Reason */}
        <IndexTable.Cell>
          <Text as="span">{item.actionReason || "-"}</Text>
        </IndexTable.Cell>

        {/* Date */}
        <IndexTable.Cell>
          {item.actionAt ? formatDate(item.actionAt) : "-"}
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
     <Card padding="0">
          {items.length === 0 ? (
            <EmptyState heading="No customer actions yet" image="https://subscriptions-assets.kachingappz.app/emptystate-files.avif" >
            </EmptyState>
          ) : (
            <>
              <IndexTable
                itemCount={items.length}

                headings={[
                  {
                    title: "Email",
                  },
                  {
                    title: "Subscription",
                  },
                  {
                    title: "Status",
                  },
                  {
                    title: "Reason",
                  },
                  {
                    title: "Date",
                  },
                ]}

                selectable={false}
              >
                {rowMarkup}
              </IndexTable>

              <div
                style={{
                  display: "flex",

                  justifyContent: "center",

                  padding: "16px",
                }}
              >
                <Pagination
                  hasNext={Boolean(pageInfo?.hasNextPage)}

                  onNext={handleNext}
                />
              </div>
            </>
          )}
        </Card>
  );
}

export default CancelSubscription;
