
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import EditWidget from "./components/EditWidget.jsx"; 
import { useLoaderData } from "react-router";

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  return json({
    shop: session.shop,
    widgetId: params.widgetId,
  });
};

export default function WidgetEditPage() {
  const { shop, widgetId } = useLoaderData();

  return <EditWidget shop={shop} widgetId={widgetId} />;
}