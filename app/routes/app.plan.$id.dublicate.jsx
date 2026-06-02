import React from 'react'
import { json } from "@remix-run/node";
import { useLoaderData } from "react-router";
import Templates from "./components/Templates"

// This runs on the SERVER — no CORS, no mixed content issues
const API_URL = import.meta.env.VITE_API_URL;
console.log("API_URL", API_URL);
export async function loader({ params }) {
    const { id } = params;


    const res = await fetch(`${API_URL}/plans/${id}`);
    const data = await res.json();

    if (!data.success) {
        throw new Response(data.message || "Plan not found", { status: 404 });
    }

    return json(data.data);
}


function Plandublicate() {
    const dublicateplan = useLoaderData();
    console.log("Plandublicate data:", dublicateplan); 
    const shop = dublicateplan.shop;
    const planId = dublicateplan.id;

    return (
        <div>
            <Templates shop={shop} 
            dublicateplanPlanId={planId} 
            dublicateplanPlanData={dublicateplan}
             isDuplicate={true} 
            singlePlanId={undefined}  
             />
        </div>
    )
}
export default Plandublicate;
