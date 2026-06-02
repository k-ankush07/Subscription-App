import React, { useEffect, useState } from 'react';

import {
  Card,
  IndexTable,
  Text,
  useIndexResourceState,
  LegacyCard,
  EmptyState,
  Page,
  Button, TextField
} from '@shopify/polaris';

import { DuplicateIcon, DeleteIcon, SearchIcon } from '@shopify/polaris-icons';
import { useNavigate } from 'react-router';
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from 'react-router';



const API_URL = import.meta.env.VITE_API_URL;
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);


  const res = await fetch(`${API_URL}/plans/getAllPlans`);
  const data = await res.json();

  return json({ shop: session.shop, plan: data.data });
};

function plans() {
  const { plan } = useLoaderData()


  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState(plan)
  const [showSearch, setShowSearch] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(plans, {
    resourceIDResolver: (resource) =>
      resource.planId || resource._id,
  });

  const handleClick = async () => {
    setLoading(true);
    setTimeout(() => navigate('/app/plan/create'), 500)
  };
  const handelapiclick = (id) => {
    setTimeout(() => {
      navigate(`/app/plan/${id}`)
    }, 500);
  }
  const deletePlan = async (planId) => {
    try {
      const res = await fetch(`${API_URL}/plans/${planId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setPlans((prev) => prev.filter((p) => (p.planId || p._id) !== planId));
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };
  const handelDublicate= (planId)=>
  {
    console.log("planId", planId)

    const id = planId;
    navigate(`/app/plan/${id}/dublicate`)
  }

  const bulkDelete = async () => {
    try {
      await Promise.all(
        selectedResources.map((id) =>
          fetch(`${API_URL}/plans/${id}`, {
            method: "DELETE",
          })
        )
      );

      setPlans((prev) =>
        prev.filter((p) => !selectedResources.includes(p.planId || p._id))
      );
    } catch (err) {
      console.error(err);
    }
  };
  
  const filteredPlans = plans.filter((plan) => {
  const title =
    plan.options?.[0]?.description || plan.description || "";

  return title.toLowerCase().includes(searchValue.toLowerCase());
});


  const rowMarkup = filteredPlans.map((plan, index) => {
    const id = plan.planId || plan._id;
    const opt = plan.options?.[0] || {};
  

    const selectedProducts = plan.selectedProducts ?? [];

    const productTitles =
      selectedProducts.length > 0
        ? selectedProducts.map(p => p.productTitle).join(" | ")
        : "-";

    return (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        onClick={() => handelapiclick(id)}
      >
        <IndexTable.Cell>
          <Text as="span" fontWeight="bold">
            {opt.description || plan.description}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div style={{ maxWidth: '200px' }}>
            <Text as="span" truncate>
              {productTitles}
            </Text>
          </div>
        </IndexTable.Cell>

        <IndexTable.Cell>
          {`Every ${opt.deliveryInterval || "-"}`}
        </IndexTable.Cell>

        <IndexTable.Cell>
          {opt.discountAmount
            ? `${opt.discountAmount} ${opt.discountType === "percentage" ? "%" : "₹"} off`
            : "No Discount"}

        </IndexTable.Cell>

        <IndexTable.Cell>
          <Button
            icon={DuplicateIcon}
            tone="base"
            onClick={(e) => {
              handelDublicate(id)
              e.stopPropagation();
            }}
          />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Button
            icon={DeleteIcon}
            tone="critical"
            variant="plain"
            onClick={(e) => {
              e.stopPropagation();
              deletePlan(id);
            }}
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
          ? {
            content: 'Create Plan',
            onAction: handleClick,
            loading: loading,
          }
          : null
      }
    >
      {plans.length === 0 ? (
        <LegacyCard >
          <EmptyState
            heading="Get more repeat business"
            action={{
              content: 'Create Plan',
              loading: loading,
              onAction: handleClick,
            }}
            image="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png"
          >
            <p>
              Allow customers to purchase products or services on a recurring
              basis.
            </p>
          </EmptyState>
        </LegacyCard>
      ) : (
        <>


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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
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

              itemCount={plans.length}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
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
                { title: 'Plan title' },
                { title: 'Products' },
                { title: 'Delivery frequency' },
                { title: 'Pricing' },
                { title: 'Actions' },
                { title: 'DELETE' },
              ]}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </>
      )}
    </Page>
  );
}

export default plans;