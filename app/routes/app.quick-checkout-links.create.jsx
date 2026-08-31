import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import QuickCheckoutPage from "./components/QuickCheckoutPage";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  return {
    shop: session.shop,
  };
};

function QuickCheckOut() {
  const { shop } = useLoaderData();

  return <QuickCheckoutPage shop={shop} />;
}

export default QuickCheckOut;