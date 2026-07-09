import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const res = await admin.graphql(`
    query {
      subscriptionContracts(first: 50) {
        edges {
          node {
            id
            status
            createdAt
            nextBillingDate
            customer {
              id
              firstName
              lastName
            }
            lines(first: 5) {
              edges {
                node {
                  id
                  title
                  quantity
                  currentPrice { amount currencyCode }
                  sellingPlanName
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await res.json();
  return { contracts: data.data.subscriptionContracts.edges.map((e) => e.node) };
}

export default function SubscribersPage() {
  const { contracts } = useLoaderData();

  const statusColor = {
    ACTIVE: { bg: "#d1fae5", text: "#065f46" },
    PAUSED: { bg: "#fef3c7", text: "#92400e" },
    CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
    FAILED: { bg: "#fee2e2", text: "#991b1b" },
  };

  return (
    <s-page heading="Subscribers">
      <div style={styles.stats}>
        <div style={styles.statItem}><strong>{contracts.length}</strong> Total</div>
        <div style={styles.statItem}><strong>{contracts.filter((c) => c.status === "ACTIVE").length}</strong> Active</div>
        <div style={styles.statItem}><strong>{contracts.filter((c) => c.status === "PAUSED").length}</strong> Paused</div>
        <div style={styles.statItem}><strong>{contracts.filter((c) => c.status === "CANCELLED").length}</strong> Cancelled</div>
      </div>

      <div style={styles.section}>
        {contracts.length === 0 ? (
          <div style={styles.empty}>No subscribers yet!</div>
        ) : (
          contracts.map((contract) => (
            <div key={contract.id} style={styles.contractCard}>
              <div style={styles.contractHeader}>
                <div>
                  <div style={styles.customerName}>
                    👤 {contract.customer.firstName} {contract.customer.lastName}
                  </div>
                  {/* email removed — requires Protected Customer Data approval */}
                </div>
                <span style={{
                  ...styles.statusBadge,
                  background: statusColor[contract.status]?.bg,
                  color: statusColor[contract.status]?.text
                }}>
                  {contract.status}
                </span>
              </div>
              <div style={styles.contractLines}>
                {contract.lines.edges.map(({ node: line }) => (
                  <div key={line.id} style={styles.lineRow}>
                    <span>📦 {line.title} × {line.quantity}</span>
                    <span style={styles.linePrice}>{line.currentPrice.currencyCode} {line.currentPrice.amount}</span>
                    <span style={styles.planName}>{line.sellingPlanName}</span>
                  </div>
                ))}
              </div>
              <div style={styles.contractFooter}>
                <span>📅 Created: {new Date(contract.createdAt).toLocaleDateString()}</span>
                {contract.nextBillingDate && (
                  <span>🔄 Next Billing: {new Date(contract.nextBillingDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </s-page>
  );
}

const styles = {
  stats: { display: "flex", gap: "16px", marginBottom: "20px" },
  statItem: { background: "white", borderRadius: "8px", padding: "16px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", fontSize: "14px" },
  section: { background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  empty: { textAlign: "center", color: "#9ca3af", padding: "40px" },
  contractCard: { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px", marginBottom: "12px" },
  contractHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" },
  customerName: { fontWeight: "600", fontSize: "15px" },
  statusBadge: { padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" },
  contractLines: { background: "#f9fafb", borderRadius: "8px", padding: "10px", marginBottom: "10px" },
  lineRow: { display: "flex", alignItems: "center", gap: "12px", padding: "6px 0", fontSize: "14px" },
  linePrice: { fontWeight: "600", color: "#111827" },
  planName: { background: "#ede9fe", color: "#5b21b6", padding: "2px 8px", borderRadius: "10px", fontSize: "12px" },
  contractFooter: { display: "flex", gap: "20px", fontSize: "12px", color: "#6b7280" },
};
