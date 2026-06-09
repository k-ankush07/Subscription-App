import React, { useState } from "react";
import {
  Card,
  IndexTable,
  Text,
  useIndexResourceState,
  LegacyCard,
  EmptyState,
  Page,
  Button,
  TextField,
} from "@shopify/polaris";
import { DuplicateIcon, DeleteIcon, SearchIcon } from "@shopify/polaris-icons";
import { useNavigate, useFetcher } from "react-router";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";

//  Seedha sellingPlanGroups se data lo — no metafields
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query {
      sellingPlanGroups(first: 50) {
        edges {
          node {
            id
            name
            description
            merchantCode
            products(first: 5) {
              edges {
                node {
                  id
                  title
                }
              }
              pageInfo { hasNextPage }
            }
            sellingPlans(first: 10) {
              edges {
                node {
                  id
                  name
                  billingPolicy {
                    ... on SellingPlanRecurringBillingPolicy {
                      interval
                      intervalCount
                    }
                  }
                  pricingPolicies {
                    ... on SellingPlanFixedPricingPolicy {
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
                    }
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
  const groups = data.data.sellingPlanGroups.edges.map((e) => e.node);
  return json({ groups });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const { items } = await request.json();

  try {
    await Promise.all(
      items.map(async ({ shopifyGroupId }) => {
        await admin.graphql(
          `
          mutation sellingPlanGroupDelete($id: ID!) {
            sellingPlanGroupDelete(id: $id) {
              deletedSellingPlanGroupId
              userErrors { message }
            }
          }
        `,
          { variables: { id: shopifyGroupId } },
        );
      }),
    );

    return json({
      success: true,
      deletedIds: items.map((i) => i.shopifyGroupId),
    });
  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

function Plans() {
  const { groups: initialGroups } = useLoaderData();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState(initialGroups);
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(groups, {
      resourceIDResolver: (g) => g.id,
    });

  // Delete ke baad UI se hata do
  React.useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setGroups((prev) =>
        prev.filter((g) => !fetcher.data.deletedIds.includes(g.id)),
      );
    }
  }, [fetcher.state, fetcher.data]);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => navigate("/app/plan/create"), 500);
  };

  const handleRowClick = (id) => {
    const numericId = id.split("/").pop();
    navigate(`/app/plan/${numericId}`);
  };

  const deletePlan = (group, e) => {
    e.stopPropagation();
    fetcher.submit(
      { items: [{ shopifyGroupId: group.id }] },
      { method: "POST", encType: "application/json" },
    );
  };

  const bulkDelete = () => {
    const items = groups
      .filter((g) => selectedResources.includes(g.id))
      .map((g) => ({ shopifyGroupId: g.id }));

    if (items.length === 0) return;
    fetcher.submit(
      { items },
      { method: "POST", encType: "application/json" },
    );
  };

  const handleDuplicate = (group, e) => {
    e.stopPropagation();
     const numericId = group.id.split("/").pop();
     console.log("Numeric ID:", numericId);
    navigate(`/app/plan/${numericId}/dublicate`);
  };

  const filteredGroups = groups.filter((g) => {
    const title = g.name || g.description || "";
    return title.toLowerCase().includes(searchValue.toLowerCase());
  });

  const rowMarkup = filteredGroups.map((group, index) => {
    const plan = group.sellingPlans.edges[0]?.node;
    const billing = plan?.billingPolicy;
    const pricing = plan?.pricingPolicies?.[0];
    const productTitles =
      group.products.edges.length > 0
        ? group.products.edges.map((e) => e.node.title).join(" | ") +
          (group.products.pageInfo.hasNextPage ? "..." : "")
        : "-";

    const discountText = () => {
      if (!pricing) return "No Discount";
      const val = pricing.adjustmentValue;
      if (val?.percentage) return `${val.percentage}% off`;
      if (val?.amount) return `₹${val.amount} off`;
      return "No Discount";
    };

    return (
      <IndexTable.Row
        id={group.id}
        key={group.id}
        selected={selectedResources.includes(group.id)}
        position={index}
        onClick={() => handleRowClick(group.id)}
      >
        <IndexTable.Cell>
          <Text as="span" fontWeight="bold">
            {group.description}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div style={{ maxWidth: "200px" }}>
            <Text as="span" truncate>
              {productTitles}
            </Text>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {billing
            ? `Every ${billing.intervalCount} ${billing.interval}`
            : "-"}
        </IndexTable.Cell>
        <IndexTable.Cell>{discountText()}</IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            icon={DuplicateIcon}
            tone="base"
            onClick={(e) => handleDuplicate(group, e)}
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            icon={DeleteIcon}
            tone="critical"
            variant="plain"
            onClick={(e) => deletePlan(group, e)}
          />
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  return (
    <Page
      title="Selling plans"
      primaryAction={
        groups.length !== 0
          ? { content: "Create Plan", onAction: handleClick, loading }
          : null
      }
    >
      {groups.length === 0 ? (
        <LegacyCard>
          <EmptyState
            heading="Get more repeat business"
            action={{ content: "Create Plan", loading, onAction: handleClick }}
            image="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png"
          >
            <p>
              Allow customers to purchase products or services on a recurring
              basis.
            </p>
          </EmptyState>
        </LegacyCard>
      ) : (
        <Card padding="0">
          <div
            style={{
              padding: "6px 16px",
              borderBottom: "1px solid #e1e3e5",
              background: "#f6f6f7",
            }}
          >
            {!showSearch ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text>All</Text>
                <Button
                  icon={SearchIcon}
                  variant="tertiary"
                  accessibilityLabel="Search"
                  onClick={() => setShowSearch(true)}
                />
              </div>
            ) : (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div style={{ flex: 1 }}>
                  <TextField
                    label=""
                    autoComplete="off"
                    placeholder="Search by plan title"
                    value={searchValue}
                    onChange={setSearchValue}
                  />
                </div>
                <Button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchValue("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          <IndexTable
            itemCount={groups.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            bulkActions={[
              {
                content: "Delete selected",
                destructive: true,
                onAction: bulkDelete,
              },
            ]}
            headings={[
              { title: "Plan title" },
              { title: "Products" },
              { title: "Delivery frequency" },
              { title: "Pricing" },
              { title: "Duplicate" },
              { title: "Delete" },
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