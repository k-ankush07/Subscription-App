import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import QuickCheckoutPage from "./components/QuickCheckoutPage";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const [linkResponse, plansResponse] = await Promise.all([
    fetch(`${API}/checkout-links/${id}`, {
      headers: { "x-api-key": SECRET_KEY },
    }),
    fetch(`${API}/plans/getAllPlans?shop=${session.shop}`, {
      headers: { "x-api-key": SECRET_KEY },
    }),
  ]);

  const linkData = await linkResponse.json();
  const plansData = await plansResponse.json();

  return {
    shop: session.shop,
    link: linkData.success ? linkData.data : null,
    plans: plansData.success ? plansData.data : [],
  };
};

export default function CheckoutLinkDetail() {
  const { shop, link, plans } = useLoaderData();

  if (!link) {
    return <div>Link not found</div>;
  }

  return (
    <QuickCheckoutPage
      shop={shop}
      plans={plans}
      linkId={link._id}
      initialData={link}
    />
  );
}