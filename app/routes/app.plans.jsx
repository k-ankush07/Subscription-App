// import { Page,Icon } from "@shopify/polaris";
// import React from "react";
// import { useNavigate } from "react-router";
// import { DuplicateIcon } from '@shopify/polaris-icons';
// function plans() {
//   const navigate = useNavigate();
//   const Plans = [
//     {
//       id: 1,
//       planName: "Plan1",
//       product: "Vintage Nirvana Men Oversized Printed T-Shirt",
//       deliveryFrequency: "	2 delivery frequencies",
//       pricing: "20% off",
//       widgets: "#1",
//     },
//     {
//       id: 2,
//       planName: "Plan2",
//       product: "Vintage Nirvana Men Oversized Printed T-Shirt 2",
//       deliveryFrequency: "	1 delivery frequencies",
//       pricing: "10% off",
//       widgets: "#3",
//     },
//   ];
//   const handelPlan = () => {
//     navigate("/app/createPlan");
//   };
//   return (
//     <>
//       <Page
//   title="Selling Plans"
//   primaryAction={{
//     content: "Create Plan",
//     onAction: handelPlan,
//   }}
// >
//   <div >
//     <table border="1">
//       <thead>
       
//             {Plans.map((item, index)=>
//             {
//                 <tr key={index}>
//                     <th>{item.planName}</th>
//                     <th>{item.planName}</th>
//                     <th>{item.planName}</th>
//                     <th>{item.planName}</th>
//                     <th>{item.planName}</th>
//                         <td> <Icon source={DuplicateIcon} tone="base" /></td>
//                 </tr>
//             })}
          
        
//       </thead>
//     </table>
//   </div>
// </Page>
//     </>
//   );
// }

// export default plans;


import { Page, Icon, Card, EmptyState } from "@shopify/polaris";
import React from "react";
import { useNavigate } from "react-router";
import { DuplicateIcon } from "@shopify/polaris-icons";

function Plans() {
  const navigate = useNavigate();

  const Plans = [
    {
      id: 1,
      planName: "Plan1",
      product: "Vintage Nirvana Men Oversized Printed T-Shirt",
      deliveryFrequency: "2 delivery frequencies",
      pricing: "20% off",
      widgets: "#1",
    },
    {
      id: 2,
      planName: "Plan2",
      product: "Vintage Nirvana Men Oversized Printed T-Shirt 2",
      deliveryFrequency: "1 delivery frequencies",
      pricing: "10% off",
      widgets: "#3",
    },
  ];

  const handelPlan = () => {
    navigate("/app/createplan");
  };

  return (
  <>
   <Page
      title="Selling Plans"
      primaryAction={{
        content: "Create Plan",
        onAction: handelPlan,
      }}
    >
  {Plans.length===0? 
  <>
  <Card>
    <EmptyState>
        <img src="https://subscriptions.kachingappz.app/images/empty-subscriptions-list-state.png" />
        <h2>Get more repeat business</h2>
        <p>Allow customers to purchase products or services on a recurring basis</p>
    </EmptyState>
  </Card>
  </>
  :
  <>
   
      <Card>
         <table border="1">
          <thead>
            <tr>
              <th>Plan Title</th>
              <th>Product</th>
              <th>Delivery Frequency</th>
              <th>Pricing</th>
              <th>Widgets</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {Plans.map((item) => (
              <tr key={item.id}>
                <td>{item.planName}</td>
                <td>{item.product}</td>
                <td>{item.deliveryFrequency}</td>
                <td>{item.pricing}</td>
                <td>{item.widgets}</td>
                <td>
                  <Icon source={DuplicateIcon} tone="base" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    
  </>}
  </Page>
  </>
  
  );
}

export default Plans;