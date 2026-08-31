import {
  Page, Card, EmptyState, IndexTable, Text, Button,
  InlineStack, Toast, Frame
} from '@shopify/polaris';
import { DeleteIcon, ClipboardIcon } from '@shopify/polaris-icons';
import React, { useState } from 'react';
import { useLoaderData, useNavigate, useFetcher } from 'react-router';
import { authenticate } from "../shopify.server";
import { buildCheckoutLink } from "./utils/checkoutLink";
const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const response = await fetch(`${API}/checkout-links/getAllCheckoutLinks?shop=${shop}`, {
    headers: { "x-api-key": SECRET_KEY },
  });
  const data = await response.json();

  return {
    shop,
    links: data.success ? data.data : [],
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");

  const response = await fetch(`${API}/checkout-links/${id}`, {
    method: "DELETE",
    headers: { "x-api-key": SECRET_KEY },
  });
  const data = await response.json();

  return data;
};

function QuickCheckoutAll() {
  const { shop,links } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const handleCreate = () => {
    navigate('/app/quick-checkout-link/create');
  };

  const handleRowClick = (id) => {
    navigate(`/app/quick-checkout-link/${id}`);
  };

  const handleCopy = (e, link) => {
  e.stopPropagation();
  const url = buildCheckoutLink(
    shop,
    link.products,
    link.discountCode,
    link.removePreviousDiscounts,
    link.customer,
    link.properties,
    link.orderNote,
    link.campaignParams,
  );

  if (!url) {
    setToastMessage("This link has no products — cannot copy");
    setToastActive(true);
    return;
  }

  navigator.clipboard.writeText(url);
  setToastMessage("Link copied to clipboard");
  setToastActive(true);
};

  const handleDelete = (e, id) => {
    e.stopPropagation();
    fetcher.submit({ id }, { method: "POST" });
  };

  const deletingId = fetcher.formData?.get("id");

  const resourceName = { singular: 'link', plural: 'links' };

  const rowMarkup = links.map((link, index) => (
    <IndexTable.Row
      id={link._id}
      key={link._id}
      position={index}
      onClick={() => handleRowClick(link._id)}
    >
      <IndexTable.Cell>
        <Text fontWeight="semibold" as="span">{link.name || "Untitled link"}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {link.description ? link.description : "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(link.createdAt).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        })}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <InlineStack gap="200">
          <Button
            icon={ClipboardIcon}
            onClick={(e) => handleCopy(e, link)}
            accessibilityLabel="Copy link"
          />
          <Button
            icon={DeleteIcon}
            tone="critical"
            loading={deletingId === link._id && fetcher.state !== "idle"}
            onClick={(e) => handleDelete(e, link._id)}
            accessibilityLabel="Delete link"
          />
        </InlineStack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Frame>
      {toastActive && (
        <Toast content={toastMessage} onDismiss={() => setToastActive(false)} />
      )}
      <Page
        title="Quick Checkout Links"
        primaryAction={{
          content: 'Create Quick Checkout Link',
          onAction: handleCreate,
        }}
      >
        {links.length === 0 ? (
          <Card>
            <EmptyState
              heading="No quick checkout links yet"
              action={{ content: 'Create Quick Checkout Link', onAction: handleCreate }}
              image="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
            >
              <p>Create a shareable checkout link for your products or subscriptions.</p>
            </EmptyState>
          </Card>
        ) : (
          <Card padding="0">
            <IndexTable
              resourceName={resourceName}
              itemCount={links.length}
              selectable={false}
              headings={[
                { title: 'Name' },
                { title: 'Description' },
                { title: 'Created' },
                { title: 'Actions' },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        )}
      </Page>
    </Frame>
  );
}

export default QuickCheckoutAll;