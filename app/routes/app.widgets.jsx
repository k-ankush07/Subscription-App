import { Badge, Card, Page, Button } from "@shopify/polaris";
import { PlusCircleIcon } from "@shopify/polaris-icons";
import React from "react";
import {Outlet, useNavigate } from "react-router";

function Widgets() {

  const navigate = useNavigate()
  const createWidgets=()=>
  {
 navigate("/app/widgets/create")
    
  }
  return (
    <Page>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignContent:"center",
            padding: " 10px 0px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight:"bold",
            }}
          >
            Widgets
          </h2>

          <Button variant="primary" icon={PlusCircleIcon} onClick={createWidgets}>
            Create widget
          </Button>
        </div>

        <table
          border="1"
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th>Widget title</th>
              <th>Plans assigned</th>
              <th>Highlights</th>
              <th>Sticky ATC</th>
              <th>Card badge</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr style={{ textAlign: "center" }}>
              <td>
                Widgets <Badge tone="attention">Default</Badge>
              </td>

              <td>0</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>...</td>
            </tr>
          </tbody>
        </table>
      </Card> 
    </Page>
  );
}

export default Widgets;
