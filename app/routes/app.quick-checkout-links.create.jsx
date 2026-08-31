import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import QuickCheckoutPage from "./components/QuickCheckoutPage";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
    headers: { "x-api-key": SECRET_KEY },
  });
  const plansData = await plansResponse.json();

  return {
    shop,
    plans: plansData.success ? plansData.data : [],
  };
};

function QuickCheckOut() {
  const { shop, plans } = useLoaderData();

  return <QuickCheckoutPage shop={shop} plans={plans} />;
}

export default QuickCheckOut;