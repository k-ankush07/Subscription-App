import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

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

export default function ProductsPage() {
  const products = useLoaderData();
 console.log(products)
  return (
    <div style={{ padding: "20px" }}>
      {products.map(({ node }) => (
        <div
          key={node.id}
          style={{
            border: "1px solid #ddd",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h2>{node.title}</h2>

          <p>
            <strong>Vendor:</strong> {node.vendor}
          </p>

          <p>
            <strong>Total Inventory:</strong> {node.totalInventory}
          </p>

          {/* Featured Image */}
          {node.featuredImage && (
            <img
              src={node.featuredImage.url}
              alt={node.title}
              width="150"
            />
          )}

          <h3>Variants</h3>

          {node.variants.edges.map(({ node: variant }) => (
            <div
              key={variant.id}
              style={{
                borderTop: "1px solid #eee",
                marginTop: "10px",
                paddingTop: "10px",
              }}
            >
              <p>
                <strong>{variant.title}</strong>
              </p>

              <p>Price: ${variant.price}</p>

              <p>Inventory: {variant.inventoryQuantity}</p>

              {variant.image && (
                <img
                  src={variant.image.url}
                  alt={variant.title}
                  width="100"
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}