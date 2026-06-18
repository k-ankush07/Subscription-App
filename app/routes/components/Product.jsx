import { Card, Button } from "@shopify/polaris";
import React from "react";
import { useAuthenticatedFetch } from "../utils/useAuthenticatedFetch";
function Product() {

  return (
    <>
      <div>
        <Card>
          <h2>Product</h2>

          <Button>Select product</Button>
        </Card>
      </div>
    </>
  );
}

export default Product;
