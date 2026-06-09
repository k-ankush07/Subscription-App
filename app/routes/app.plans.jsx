import React, { useEffect, useState } from 'react';
import {
  Card, IndexTable, Text, useIndexResourceState,
  LegacyCard, EmptyState, Page, Button, TextField
} from '@shopify/polaris';
import { DuplicateIcon, DeleteIcon, SearchIcon } from '@shopify/polaris-icons';
import { useNavigate, useFetcher } from 'react-router';
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query getPlans {
      shop {
        metafields(first: 50, namespace: "selling_plan") {
          nodes {
            key
            value
          }
        }
      }
    }
  `);

  const data = await res.json();

  const nodes = data?.data?.shop?.metafields?.nodes || [];

  const plans = nodes
    .map(node => {
      try {
        return JSON.parse(node.value);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);

  return json({ plans });
};

// Delete action same rahega, bas shopifyGroupId + planId dono chahiye
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const { items } = await request.json();

  try {
    const shopRes = await admin.graphql(`query { shop { id } }`);
    const shopData = await shopRes.json();
    const shopId = shopData.data.shop.id;

    await Promise.all(
      items.map(async ({ shopifyGroupId, planId }) => {

        // 1. DELETE SELLING PLAN GROUP
        await admin.graphql(`
          mutation sellingPlanGroupDelete($id: ID!) {
            sellingPlanGroupDelete(id: $id) {
              deletedSellingPlanGroupId
              userErrors { message }
            }
          }
        `, {
          variables: {
            id: shopifyGroupId,
          },
        });

        // 2. FIND METAFIELD
        const metaRes = await admin.graphql(`
          query {
            shop {
              metafield(namespace: "kaching_plans", key: "plan_${planId}") {
                id
              }
            }
          }
        `);

        const metaData = await metaRes.json();
        const metafieldId = metaData?.data?.shop?.metafield?.id;

        // 3. DELETE METAFIELD (FIXED SYNTAX)
        if (metafieldId) {
          await admin.graphql(`
            mutation metafieldDelete($id: ID!) {
              metafieldDelete(id: $id) {
                deletedId
                userErrors { message }
              }
            }
          `, {
            variables: {
              id: metafieldId,
            },
          });
        }
      })
    );

    return json({
      success: true,
      deletedIds: items.map(i => i.shopifyGroupId),
    });

  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

function Plans() {
  const { plans: initialPlans } = useLoaderData(); //  fix — plans hai, plan nahi
  console.log("Loaded plans:", initialPlans); // debug log
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState(initialPlans);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");

 const {
  selectedResources,
  allResourcesSelected,
  handleSelectionChange,
} = useIndexResourceState(plans, {
  resourceIDResolver: (resource) =>
    resource.shopifyGroupId || resource.planId,
});

  // fetcher response — delete ke baad list update karo
useEffect(() => {
  if (fetcher.state === "idle" && fetcher.data?.success) {
    setPlans((prev) =>
      prev.filter(
        (p) => !fetcher.data.deletedIds.includes(p.shopifyGroupId)
      )
    );
  }
}, [fetcher.state, fetcher.data]);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => navigate('/app/plan/create'), 500);
  };

  const handleRowClick = (id) => {
    navigate(`/app/plan/${id}`);
  };

 // Single delete
const deletePlan = (plan, e) => {
  e.stopPropagation();

  fetcher.submit(
    {
      items: [
        {
          shopifyGroupId: plan.shopifyGroupId,
          planId: plan.planId,
        },
      ],
    },
    {
      method: "POST",
      encType: "application/json",
    }
  );
};

 // Bulk delete
const bulkDelete = () => {
  const items = plans
    .filter((p) =>
      selectedResources.includes(p.shopifyGroupId || p.planId)
    )
    .map((p) => ({
      shopifyGroupId: p.shopifyGroupId,
      planId: p.planId,
    }));

  fetcher.submit(
    { items },
    {
      method: "POST",
      encType: "application/json",
    }
  );
};

  const handleDuplicate = (plan, e) => {
    e.stopPropagation();
    navigate(`/app/plan/${plan.planId}/dublicate`);
  };

  const filteredPlans = plans.filter((plan) => {
    const title = plan.description || plan.name || "";
    return title.toLowerCase().includes(searchValue.toLowerCase());
  });

  const rowMarkup = filteredPlans.map((plan, index) => {
    const id = plan.planId || plan.shopifyGroupId;
    const opt = plan.options?.[0] || {};
    const selectedProducts = plan.selectedProducts ?? [];
    const productTitles = selectedProducts.length > 0
      ? selectedProducts.map(p => p.productTitle).join(" | ")
      : "-";

    return (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        onClick={() => handleRowClick(id)}
      >
        <IndexTable.Cell>
          <Text as="span" fontWeight="bold">
            {plan.description || plan.name}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div style={{ maxWidth: '200px' }}>
            <Text as="span" truncate>{productTitles}</Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {opt.deliveryFrequency
            ? `Every ${opt.deliveryFrequency} ${opt.deliveryInterval || ""}`
            : "-"}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {opt.discountAmount
            ? `${opt.discountAmount}${opt.discountType === "percentage" ? "%" : "₹"} off`
            : "No Discount"}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            icon={DuplicateIcon}
            tone="base"
            onClick={(e) => handleDuplicate(id, e)}
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            icon={DeleteIcon}
            tone="critical"
            variant="plain"
             onClick={(e) => deletePlan(plan, e)}  // pura plan object pass k
          />
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="Selling plans"
      primaryAction={
        plans.length !== 0
          ? { content: 'Create Plan', onAction: handleClick, loading }
          : null
      }
    >
      {plans.length === 0 ? (
        <LegacyCard>
          <EmptyState
            heading="Get more repeat business"
            action={{ content: 'Create Plan', loading, onAction: handleClick }}
            image="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png"
          >
            <p>Allow customers to purchase products or services on a recurring basis.</p>
          </EmptyState>
        </LegacyCard>
      ) : (
        <Card padding="0">
          <div style={{ padding: "6px 16px", borderBottom: "1px solid #e1e3e5", background: "#f6f6f7" }}>
            {!showSearch ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text>All</Text>
                <Button icon={SearchIcon} variant="tertiary" accessibilityLabel="Search" onClick={() => setShowSearch(true)} />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    autoComplete="off"
                    placeholder="Search by plan title"
                    value={searchValue}
                    onChange={setSearchValue}
                  />
                </div>
                <Button onClick={() => { setShowSearch(false); setSearchValue(""); }}>Cancel</Button>
              </div>
            )}
          </div>
          <IndexTable
            itemCount={plans.length}
            selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            bulkActions={[{
              content: "Delete selected",
              destructive: true,
              onAction: bulkDelete,
            }]}
            headings={[
              { title: 'Plan title' },
              { title: 'Products' },
              { title: 'Delivery frequency' },
              { title: 'Pricing' },
              { title: 'Duplicate' },
              { title: 'Delete' },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      )}
    </Page>
  );
}

export default Plans;