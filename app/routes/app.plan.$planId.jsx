// app/routes/app.plan.$planId.jsx

import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Templates from "./components/Templates"

// This runs on the SERVER — no CORS, no mixed content issues
export async function loader({ params }) {
  const { planId } = params;

  const res = await fetch(`http://localhost:5000/plans/${planId}`);
  const data = await res.json();

  if (!data.success) {
    throw new Response(data.message || "Plan not found", { status: 404 });
  }

  return json(data.data);
}

export default function PlanId() {
  const plan = useLoaderData();
  const shop = plan.shop;
  const planId= plan.planId;
  console.log("shop", shop)
  console.log("plan", plan)
  console.log("planId", planId)
  if (!plan) return <div>No plan found</div>;

  return (
    <div style={{ padding: "1.5rem" }}>
    <Templates  shop={plan.shop}  singlePlanId={planId} singlePlanData={plan} />
    </div>
  );
}