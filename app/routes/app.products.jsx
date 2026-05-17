import {
  useLoaderData,
  Form,
} from "react-router";

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

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
 
  

  const productId = formData.get("productId");
  const title = formData.get("title");
 
  
  const vendor = formData.get("vendor");
  const status = formData.get("status");
  //  console.log(status);
  const productType = formData.get("productType");

  const response = await admin.graphql(
    `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            title
            vendor
            productType
            status
          }

          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: {
          id: productId,
          title,
          vendor,
          productType,
          status
        },
      },
    }
  );

  const data = await response.json();

  // console.log(data);

  return null;
};

export default function ProductsPage() {
  const products = useLoaderData();

  return (
    <div style={{ padding: "20px" }}>
      {products.map(({ node }) => (
        <div
          key={node.id}
          style={{
            border: "1px solid #ddd",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "10px",
          }}
        >
          {/* Product Image */}
          {node.featuredImage && (
            <img
              src={node.featuredImage.url}
              alt={node.title}
              width="150"
              style={{
                borderRadius: "10px",
                marginBottom: "10px",
              }}
            />
          )}

          {/* Update Form */}
          <Form method="post">
            <input
              type="hidden"
              name="productId"
              value={node.id}
              
            />

            <div style={{ marginBottom: "10px" }}>
              <label>Title</label>
              <br />

              <input
                type="text"
                name="title"
                defaultValue={node.title}
                style={{
                  width: "300px",
                  padding: "8px",
                }}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label>Vendor</label>
              <br />

              <input
                type="text"
                name="vendor"
                defaultValue={node.vendor}
                style={{
                  width: "300px",
                  padding: "8px",
                }}
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>Status</label>
              <br />

              <input
                type="text"
                name="status"
                defaultValue={node.status}
                style={{
                  width: "300px",
                  padding: "8px",
                }}
              />
            </div>

            <div style={{ marginBottom: "10px" }}>
              <label>Product Type</label>
              <br />

              <input
                type="text"
                name="productType"
                defaultValue={node.productType}
                style={{
                  width: "300px",
                  padding: "8px",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: "black",
                color: "white",
                border: "none",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Update Product
            </button>
          </Form>

          {/* Product Info */}
          <div style={{ marginTop: "20px" }}>
            <p>
              <strong>Status:</strong> {node.status}
            </p>

            <p>
              <strong>Total Inventory:</strong>{" "}
              {node.totalInventory}
            </p>
          </div>

          {/* Product Images */}
          <div style={{ marginTop: "20px" }}>
            <h3>Product Images</h3>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {node.images.edges.map(({ node: image }) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt="product"
                  width="100"
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #ddd",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Variants */}
          <div style={{ marginTop: "20px" }}>
            <h3>Variants</h3>

            {node.variants.edges.map(({ node: variant }) => (
              <div
                key={variant.id}
                style={{
                  borderTop: "1px solid #eee",
                  paddingTop: "15px",
                  marginTop: "15px",
                }}
              >
                <p>
                  <strong>{variant.title}</strong>
                </p>

                <p>
                  <strong>Price:</strong> ${variant.price}
                </p>

                <p>
                  <strong>Inventory:</strong>{" "}
                  {variant.inventoryQuantity}
                </p>

                {variant.image && (
                  <img
                    src={variant.image.url}
                    alt={variant.title}
                    width="100"
                    style={{
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 