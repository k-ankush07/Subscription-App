
import React from "react";
import {
  Page,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
// orders
  const response = await admin.graphql(
    `#graphql
  query {
    orders(first: 10) {
      edges {
        cursor
        node {
          id
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }`,
  );
  const json = await response.json();
  return json.data;
}

export default function Plans() {

  const data = useLoaderData();

  console.log("plans data", data);

  return (

    <Page title="prodcut">

 

    </Page>
  );
}