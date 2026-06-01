import React, { useEffect, useState } from 'react';

import {
  Card,
  IndexTable,
  Text,
  Icon,
  useIndexResourceState,
  LegacyCard,
  EmptyState,
  Page,
  Button,
} from '@shopify/polaris';

import { DuplicateIcon } from '@shopify/polaris-icons';

import { useNavigate } from 'react-router';
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { useLoaderData } from 'react-router';

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const res = await fetch("https://habitant-startling-cassette.ngrok-free.dev/plans/getAllPlans");
  const data = await res.json();
  // console.log("bjfdjf", data)

  return json({ shop: session.shop, plan: data.data });
};

function plans() {
  const { plan } = useLoaderData()
 

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([])
  const [plans, setPlans] = useState(plan)

  const handleClick = async () => {
    setLoading(true);
    setTimeout(() => navigate('/app/plan/create'), 500)
  };
  const handelapiclick = (id) => {
    setTimeout(() => {
      navigate(`/app/plan/${id}`)
    }, 500);
  }

  // const plans = [
  //     {
  //     id: '1',
  //     planTitle: 'Plan #1',
  //     products: 'Vittelo Belt',
  //     deliveryFrequency: 'Every month',
  //     pricing: '10% off',
  //   },
  //   {
  //     id: '2',
  //     planTitle: 'Plan #1',
  //     products: 'Vittelo Belt',
  //     deliveryFrequency: 'Every month',
  //     pricing: '70% off',
  //   },

  // ];


  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
  } = useIndexResourceState(plans);

  // const rowMarkup = plans.map(
  //   ({ planId, description, products, deliveryFrequency, pricing }, index) => (
  //     <IndexTable.Row
  //       id={ planId}
  //       key={ planId}
  //       selected={selectedResources.includes( planId)}
  //       position={index}
  //       onClick={() => {}}
  //     >
  //       <IndexTable.Cell>
  //         <Text as="span" variant="bodyMd" fontWeight="bold">
  //           {description}
  //         </Text>
  //       </IndexTable.Cell>

  //       <IndexTable.Cell>{products}</IndexTable.Cell>

  //       <IndexTable.Cell>{deliveryFrequency}</IndexTable.Cell>

  //       <IndexTable.Cell>{pricing}</IndexTable.Cell>

  //       <IndexTable.Cell>
  //         <Icon source={DuplicateIcon} tone="base" />
  //       </IndexTable.Cell>
  //     </IndexTable.Row>
  //   )
  // );

  const rowMarkup = plans.map((plan, index) => {
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
          {/* {`${opt.discountAmount || "No Discount"} ${opt.discountType === "percentage" ? "%" : "₹"} off`} */}
          {opt.discountAmount
            ? `${opt.discountAmount} ${opt.discountType === "percentage" ? "%" : "₹"} off`
            : "No Discount"}

        </IndexTable.Cell>

        <IndexTable.Cell>
          <Icon source={DuplicateIcon} tone="base" />
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
            <IndexTable

              itemCount={plans.length}
              selectedItemsCount={
                allResourcesSelected ? 'All' : selectedResources.length
              }
              onSelectionChange={handleSelectionChange}
              bulkActions={[]}
              headings={[
                { title: 'Plan title' },
                { title: 'Products' },
                { title: 'Delivery frequency' },
                { title: 'Pricing' },
                { title: 'Actions' },
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