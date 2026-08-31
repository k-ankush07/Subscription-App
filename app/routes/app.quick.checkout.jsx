import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import QuickCheckoutPage from "../components/QuickCheckoutPage";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return json({
    shop: session.shop,
  });
};

export default function Route() {
  const { shop } = useLoaderData();

  return <QuickCheckoutPage shop={shop} />;
}