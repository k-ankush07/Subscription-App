import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getContractPreview } from "./billing-preview.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

 const url = new URL(request.url);
  let contractId = url.searchParams.get("id");

  if (!contractId) {
    return { error: "No contract id provided in URL." };
  }

  if (!contractId.startsWith("gid://")) {
    contractId = `gid://shopify/SubscriptionContract/${contractId}`;
  }

  try {
    const preview = await getContractPreview(admin, contractId);
    if (!preview) {
      return { error: "Contract not found." };
    }
    return { preview };
  } catch (err) {
    return { error: String(err?.message || err) };
  }
  
};

export default function SubscriptionDetailPage() {
  const { preview, error } = useLoaderData();

  if (error) {
    return (
      <s-page heading="Subscription">
        <p style={{ color: "#991b1b" }}>{error}</p>
      </s-page>
    );
  }

  const willApply = Array.isArray(preview.nextOrder.willApply) ? preview.nextOrder.willApply : [];

  return (
    <s-page heading="Subscription Details">
      <div style={{ background: "white", borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ marginTop: 0 }}>{preview.lineItem.title}</h3>
        <p>Customer: {preview.customer?.displayName || preview.customer?.id}</p>
        <p>Status: {preview.status}</p>
        <p>Current quantity: {preview.lineItem.quantity}</p>
        <p>Current price: {preview.lineItem.price?.amount} {preview.lineItem.price?.currencyCode}</p>
        <p>Plan: {preview.planGroup?.name || "unknown"}</p>
        <p>{typeof preview.nextOrder.willApply === "string" ? preview.nextOrder.willApply : "No changes scheduled."}</p>

      </div>

      <div style={{ background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ marginTop: 0 }}>Next Order — Cycle #{preview.nextOrder.cycleIndex}</h3>
        <p>Expected date: {preview.nextOrder.expectedDate}</p>
        {willApply.length > 0 ? (
  <ul>
    {willApply.map((a, i) => (
      <li key={i}>
        <strong>{a.type}</strong>
        {" — "}
        {a.productTitle || a.variantTitle ? (
          <>
            {a.variantTitle || a.productTitle}
            {a.variantTitle && a.productTitle && a.variantTitle !== a.productTitle && ` (${a.productTitle})`}
          </>
        ) : a.value !== undefined && a.value !== "" ? (
          `value: ${a.value}`
        ) : (
          <span style={{ color: "#991b1b" }}>⚠️ no product/value set</span>
        )}
        {" , after cycle: "}{a.after ?? a.afterCycle}
      </li>
    ))}
  </ul>
) : (
  <p>{preview.nextOrder.willApply}</p>
)}
      </div>
    </s-page>
  );
}