
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

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;
const PAGE_SIZE = 10;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") || "";

  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);

  let items = [];
  let pageInfo = { hasNextPage: false, endCursor: null };

  try {
    const res = await fetch(
      `${API}/api/subscriptions/cancellations?${params.toString()}`,
      { headers: { "x-api-key": SECRET_KEY } },
    );

    if (res.ok) {
      const data = await res.json();
      items = data.data || [];
      pageInfo = data.pageInfo || pageInfo;
    } else {
      const text = await res.text();
      console.error("[CancelSubscription] API failed:", res.status, text);
    }
  } catch (err) {
    console.error("[CancelSubscription] Failed to load cancellations:", err);
  }

  return { items, pageInfo, shop: session.shop };
}

function formatDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function ActionBadge({ actionType }) {
  if (actionType === "cancelled") {
    return <Badge tone="critical">Cancelled</Badge>;
  }
  if (actionType === "paused") {
    return <Badge tone="warning">Paused</Badge>;
  }
  return <Badge>{actionType || "-"}</Badge>;
}

function CancelSubscription() {
  const { items, pageInfo } = useLoaderData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleNext = () => {
    if (pageInfo?.endCursor) {
      setSearchParams({ cursor: pageInfo.endCursor });
    }
  };

  const rowMarkup = items.map((item, index) => (
    <IndexTable.Row id={item.id} key={item.id} position={index}>
      <IndexTable.Cell>
        <Text>
          {item.email}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Link onClick={() => navigate(`/app/subscription/${item.subscriptionId}`)}>
          #{item.subscriptionId}
        </Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ActionBadge actionType={item.actionType} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text as="span">{item.actionReason || "-"}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{formatDate(item.actionAt)}</IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page title="Cancellation reason">
      <BlockStack gap="400">
        <PortalNav />
        <Card padding="0">
          {items.length === 0 ? (
            <EmptyState heading="No customer actions yet" image="">
              
            </EmptyState>
          ) : (
            <>
              <IndexTable
                itemCount={items.length}
                headings={[
                  { title: "Email" },
                  { title: "Subscription" },
                  { title: "Action" },
                  { title: "Reason" },
                  { title: "Date" },
                ]}
                selectable={false}
              >
                {rowMarkup}
              </IndexTable>
              <div style={{ display: "flex", justifyContent: "center", padding: "16px" }}>
                <Pagination
                  hasNext={pageInfo?.hasNextPage}
                  onNext={handleNext}
                />
              </div>
            </>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}

export default CancelSubscription;