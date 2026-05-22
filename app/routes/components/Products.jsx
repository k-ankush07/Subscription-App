import React from 'react'
import {useLoaderData} from "react-router";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }) => {
  const { admin , session } = await authenticate.admin(request);
  
  
  const response = await admin.graphql(`
    query {
      products(first: 10) {
        edges {
          node {
            id
            title
            status
            vendor
            productType
            totalInventory

            featuredImage {
              url
            }

            images(first: 5) {
              edges {
                node {
                  id
                  url
                }
              }
            }

            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  price
                  inventoryQuantity

                  image {
                    url
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await response.json();

  return data.data.products.edges;
};
function Products() {
    const data= useLoaderData();
    console.log("product data", data)
  return (
    <>
    <div>
        <h2>Products</h2>

    </div>
    </>
  )
}

export default Products
