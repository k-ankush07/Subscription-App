
import { useLocation, useNavigate } from "react-router";
import { InlineStack, Button } from "@shopify/polaris";

export const PORTAL_TABS = [
  { label: "Customer portal", path: "/app/customer-portal" },
  { label: "Quick actions", path: "/app/customer-portal/quick-actions" },
  { label: "Cancellation reason", path: "/app/customer-portal/cancellation-reasons" },
];

export default function PortalNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <InlineStack gap="200" wrap>
      {PORTAL_TABS.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <Button
            key={tab.path}
            pressed={isActive}
            onClick={() => {
              if (!isActive) navigate(tab.path);
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </InlineStack>
  );
}