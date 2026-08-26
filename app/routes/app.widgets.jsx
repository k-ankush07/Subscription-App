// import { Badge, Card, Page, Button } from "@shopify/polaris";
// import { PlusCircleIcon } from "@shopify/polaris-icons";
// import React from "react";
// import {Outlet, useNavigate } from "react-router";

// function Widgets() {

//   const navigate = useNavigate()
//   const createWidgets=()=>
//   {
//  navigate("/app/widgets-v2/create")
    
//   }
//   return (
//     <Page>
//       <Card>
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignContent:"center",
//             padding: " 10px 0px",
//           }}
//         >
//           <h2
//             style={{
//               margin: 0,
//               fontSize: "20px",
//               fontWeight:"bold",
//             }}
//           >
//             Widgets
//           </h2>

//           <Button variant="primary" icon={PlusCircleIcon} onClick={createWidgets}>
//             Create widget
//           </Button>
//         </div>

//         <table
//           border="1"
//           style={{
//             width: "100%",
//             borderCollapse: "collapse",
//           }}
//         >
//           <thead>
//             <tr>
//               <th>Widget title</th>
//               <th>Plans assigned</th>
//               <th>Highlights</th>
//               {/* <th>Sticky ATC</th>
//               <th>Card badge</th> */}
//               <th>Actions</th>
//             </tr>
//           </thead>

//           <tbody>
//             <tr style={{ textAlign: "center" }}>
//               <td>
//                 Widgets <Badge tone="attention">Default</Badge>
//               </td>

//               <td>0</td>
//               <td>-</td>
//               {/* <td>-</td>
//               <td>-</td> */}
//               <td>...</td>
//             </tr>
//           </tbody>
//         </table>
//       </Card> 
//     </Page>
//   );
// }

// export default Widgets;


import { Badge, Card, Page, Button } from "@shopify/polaris";
import { PlusCircleIcon } from "@shopify/polaris-icons";
import React from "react";
import { Outlet, useNavigate, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server"; 

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  try {
    const response = await fetch(
      `${API}/api/widgets?shop=${shop}`,
      {
        headers: {
          "x-api-key": SECRET_KEY,
        },
      }
    );

    const data = await response.json();

    return {
      widgets: response.ok && data.success ? data.widgets : [],
    };
  } catch (error) {
    console.error("Loader fetch widgets error:", error);
    return { widgets: [] };
  }
}

function Widgets() {
  const { widgets } = useLoaderData();
  const navigate = useNavigate();

  const createWidgets = () => {
    navigate("/app/widgets-v2/create");
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
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "bold",
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
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {widgets.length === 0 ? (
              <tr style={{ textAlign: "center" }}>
                <td>
                  Widgets <Badge tone="attention">Default</Badge>
                </td>
                <td>0</td>
                <td>-</td>
                <td>...</td>
              </tr>
            ) : (
              widgets.map((widget) => (
                <tr key={widget._id || widget.widgetId} style={{ textAlign: "center" }}>
                  <td>{widget.widgetName}</td>
                  <td>{widget.assignedPlanIds?.length || 0}</td>
                  <td>-</td>
                  <td><Button onClick={() => navigate(`/app/widget/edit/${widget.widgetId}`)}>
  Edit
</Button></td>
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