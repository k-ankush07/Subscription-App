import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  await authenticate.admin(request);

  const { planId } = params;

  const response = await fetch(
    `https://habitant-startling-cassette.ngrok-free.app/plans/${planId}`
  );
  console.log(response.status);
console.log(response.url);

  const data = await response.json();

  return Response.json({
    plan: data.success ? data.data : null,
  });
};

function PlanId() {
  const { plan } = useLoaderData();

  console.log(plan);

  return (
    <div>
      {plan ? (
        <>
          <h2>{plan.planName}</h2>
          <p>Price: {plan.price}</p>
          <p>Description: {plan.description}</p>
        </>
      ) : (
        <p>Plan not found</p>
      )}
    </div>
  );
}

export default PlanId;