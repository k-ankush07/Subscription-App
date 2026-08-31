import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const { id } = params;

  const response = await fetch(`${API}/checkout-links/${id}`, {
    headers: { "x-api-key": SECRET_KEY },
  });
  const data = await response.json();

  return {
    shop: session.shop,
    link: data.success ? data.data : null,
  };
};

export default function CheckoutLinkDetail() {
  const { shop, link } = useLoaderData();

  if (!link) {
    return <div>Link not found</div>;
  }

  return (
    <div>
      <h1>{link.name}</h1>
      <p>Shop: {link.shop}</p>
      <p>Products: {link.products?.length || 0}</p>
    </div>
  );
}