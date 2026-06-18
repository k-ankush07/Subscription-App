


import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const search = url.searchParams.get("query");

  const query = `
{
    shop {
    currencyCode
  }
  products(first: 10 ${cursor ? `, after: "${cursor}"` : ""}${search ? `, query: "title:*${search}*"` : ""}) {
    edges {
      cursor
      node {
        id
        title
        handle   
        status
        images(first: 1) {
          edges {
            node { url }
          }
        }
          
        variants(first: 100) {
          edges {
            node {
              id
              title
              price
              sku
              availableForSale
              image {
                url
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;

  const res = await admin.graphql(query);
  const data = await res.json();
  // console.log(data.data.shop.currencyCode);
  return json(data);
};
