import React from "react";
import CreateWidget from "./components/CreateWidget";
import { Page } from "@shopify/polaris";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const shop = session.shop;

  try {
    const plansResponse = await fetch(
      `${API}/plans/getAllPlans?shop=${shop}`,
      {
        headers: {
          "x-api-key": SECRET_KEY,
        },
      },
    );

    const plansData = await plansResponse.json();

    const plans = plansData.success ? plansData.data : [];

    return Response.json({
      plans,
    });
  } catch (error) {
    console.error("Failed to fetch plans:", error);

    return Response.json({
      plans: [],
    });
  }
};

function WidgetCreate() {
  const navigate = useNavigate();
const { plans } = useLoaderData();
  const handelBack = () => {
    navigate("/app/widgets-v2/create");
  };

  return (
    <Page
      title="Widgets Editor"
      backAction={{
        content: "Widgets",
        onAction: handelBack,
      }}
    >
      <CreateWidget  plans={plans}/>
    </Page>
  );
}

export default WidgetCreate;