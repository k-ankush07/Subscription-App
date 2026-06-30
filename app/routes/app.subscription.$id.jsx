import { Page } from "@shopify/polaris";
import React from "react";
import { useNavigate, useParams } from "react-router";

function subscriptionsId() {
  const { id } = useParams();
  const navigate = useNavigate();
  const backButton = () => {
    navigate("/app/subscriptions");
  };
  return (
    <>
      <Page backAction={{ onAction: backButton }} title={`${id}`}>

        
      </Page>
    </>
  );
}

export default subscriptionsId;
