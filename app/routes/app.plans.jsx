import { Page, Icon, Card, EmptyState } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import React, { useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { DuplicateIcon } from "@shopify/polaris-icons";


const API= import.meta.env.VITE_API_URL
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const response = await fetch(
    `${API}/plans/getAllPlans?shop=${shop}`,
  );
  const data = await response.json();

  return Response.json({ plans: data.success ? data.data : [] });
};

function Plans() {
  const { plans } = useLoaderData();
  const navigate = useNavigate();
    const [loading, setLoading] = useState(false);;

  // const Plans = [
  //   {
  //     id: 1,
  //     planName: "Plan1",
  //     product: "Vintage Nirvana Men Oversized Printed T-Shirt",
  //     deliveryFrequency: "2 delivery frequencies",
  //     pricing: "20% off",
  //     widgets: "#1",
  //   },
  //   {
  //     id: 2,
  //     planName: "Plan2",
  //     product: "Vintage Nirvana Men Oversized Printed T-Shirt 2",
  //     deliveryFrequency: "1 delivery frequencies",
  //     pricing: "10% off",
  //     widgets: "#3",
  //   },
  // ];

  const handelPlan = () => {
    navigate("/app/createplan");
  };

  const rowClick = (PlandId) => {
    console.log("Clicked", PlandId);
    setTimeout(()=>
    {
      navigate(`/app/plan/${PlandId}`);
    },1000)
  };
  return (
    <>
      <Page
        title="Selling Plans"
        primaryAction={{
          content: "Create Plan",
          onAction: handelPlan,
        }}
      >
        {plans.length === 0 ? (
          <>
            <Card>
              <EmptyState>
                <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
                <h2>Get more repeat business</h2>
                <p>
                  Allow customers to purchase products or services on a
                  recurring basis
                </p>
              </EmptyState>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <table border="1">
                <thead>
                  <tr>
                    <th>Plan Title</th>
                    <th>Product</th>
                    <th>Delivery Frequency</th>
                    <th>Pricing</th>
                    <th>Widgets</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {[...plans].reverse().map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => rowClick(item.PlandId)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{item.planName}</td>
                      <td>
                        {Array.isArray(item.products) &&
                        item.products.length > 0
                          ? item.products.length === 1
                            ? item.products[0]?.title
                            : `${item.products.length} products`
                          : "—"}
                      </td>
                      <td>{item.deliveryFrequency || ""}</td>
                      <td>{item.pricing || ""}</td>
                      <td>{item.widget}</td>
                      <td>
                        <Icon source={DuplicateIcon} tone="base" />
                      </td>
                    </tr>
                  ))}
                  {/* {Plans.map((item) => (
              <tr key={item.id}>
                <td>{item.planName}</td>
                <td>{item.product}</td>
                <td>{item.deliveryFrequency}</td>
                <td>{item.pricing}</td>
                <td>{item.widgets}</td>
                <td>
                  <Icon source={DuplicateIcon} tone="base" />
                </td>
              </tr>
            ))} */}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </Page>
    </>
  );
}

export default Plans;
