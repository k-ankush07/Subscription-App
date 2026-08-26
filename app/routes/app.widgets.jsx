import { Badge, Card, Page, Button, Popover, ActionList } from "@shopify/polaris";
import { PlusCircleIcon, MenuHorizontalIcon } from "@shopify/polaris-icons";
import React, { useState } from "react";
import { useNavigate, useLoaderData, useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  try {
    const response = await fetch(`${API}/api/widgets?shop=${shop}`, {
      headers: { "x-api-key": SECRET_KEY },
    });
    const data = await response.json();
    return { widgets: response.ok && data.success ? data.widgets : [] };
  } catch (error) {
    console.error("Loader fetch widgets error:", error);
    return { widgets: [] };
  }
}

export async function action({ request }) {
  await authenticate.admin(request);
  const formData = await request.formData();
  const widgetId = formData.get("widgetId");
  const intent = formData.get("intent"); // "delete" | "duplicate"

  try {
    if (intent === "delete") {
      const response = await fetch(`${API}/api/widgets/${widgetId}`, {
        method: "DELETE",
        headers: { "x-api-key": SECRET_KEY },
      });
      const data = await response.json();
      return { success: response.ok && data.success, error: data.error };
    }

    if (intent === "duplicate") {
      const response = await fetch(`${API}/api/widgets/${widgetId}/duplicate`, {
        method: "POST",
        headers: { "x-api-key": SECRET_KEY },
      });
      const data = await response.json();
      return { success: response.ok && data.success, error: data.error };
    }

    return { success: false, error: "Unknown action" };
  } catch (error) {
    console.error("Widget action error:", error);
    return { success: false, error: "Something went wrong" };
  }
}

function Widgets() {
  const { widgets } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [activePopoverId, setActivePopoverId] = useState(null);

  const createWidgets = () => {
    navigate("/app/widgets-v2/create");
  };

  const togglePopover = (widgetId) => {
    setActivePopoverId((prev) => (prev === widgetId ? null : widgetId));
  };

  const closePopover = () => setActivePopoverId(null);

  const handleDelete = (widgetId) => {
    closePopover();
    if (!window.confirm("Are you sure you want to delete this widget?")) return;
    submit({ widgetId, intent: "delete" }, { method: "post" });
  };

  const handleDuplicate = (widgetId) => {
    closePopover();
    submit({ widgetId, intent: "duplicate" }, { method: "post" });
  };

  return (
    <Page>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignContent: "center",
            padding: " 10px 0px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "bold" }}>
            Widgets
          </h2>

          <Button variant="primary" icon={PlusCircleIcon} onClick={createWidgets}>
            Create widget
          </Button>
        </div>

        <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Widget title</th>
              <th>Plans assigned</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {widgets.length === 0 ? (
              <tr style={{ textAlign: "center" }}>
               <td>No Widgets right now</td>
                
              </tr>
            ) : (
              widgets.map((widget) => (
                <tr key={widget._id || widget.widgetId} style={{ textAlign: "center" }}>
                  <td>{widget.widgetName}</td>
                  <td>{widget.assignedPlanIds?.length || 0}</td>
                  <td>
                    <Popover
                      active={activePopoverId === widget.widgetId}
                      activator={
                        <Button
                          icon={MenuHorizontalIcon}
                          onClick={() => togglePopover(widget.widgetId)}
                          accessibilityLabel="Widget actions"
                          variant="tertiary"
                        />
                      }
                      onClose={closePopover}
                    >
                      <ActionList
                        items={[
                          {
                            content: "Edit",
                            onAction: () => {
                              closePopover();
                              navigate(`/app/widget/edit/${widget.widgetId}`);
                            },
                          },
                          {
                            content: "Duplicate",
                            onAction: () => handleDuplicate(widget.widgetId),
                          },
                          {
                            content: "Delete",
                            destructive: true,
                            onAction: () => handleDelete(widget.widgetId),
                          },
                        ]}
                      />
                    </Popover>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </Page>
  );
}

export default Widgets;