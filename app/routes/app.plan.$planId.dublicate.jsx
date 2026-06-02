import React from 'react'
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Templates from "./components/Templates"

// This runs on the SERVER — no CORS, no mixed content issues
const API_URL = import.meta.env.VITE_API_URL;
export async function loader({ params }) {
    const { planId } = params;


    const res = await fetch(`${API_URL}/plans/${planId}`);
    const data = await res.json();

    if (!data.success) {
        throw new Response(data.message || "Plan not found", { status: 404 });
    }

    return json(data.data);
}

function Plandublicate() {
    const dublicateplan = useLoaderData();
    const shop = dublicateplan.shop;
    const planId = dublicateplan.planId;
    return (
        <div>
            <Templates shop={shop} dublicateplanPlanId={planId} dublicateplanPlanData={dublicateplan} isDuplicate={true} />
        </div>
    )
}
export default Plandublicate;
