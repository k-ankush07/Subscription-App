// app/routes/app.plan.jsx

import React from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
} from "@shopify/polaris";

import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";



// ======================
// LOADER
// ======================

export async function loader({ request }) {

  const { admin } = await authenticate.admin(request);

  try {

    const response = await admin.graphql(`
      #graphql
      query {
        sellingPlanGroups(first: 20) {

          nodes {
            id
            name
            merchantCode
            options

            sellingPlans(first: 20) {
              nodes {
                id
                name
                description
                category
              }
            }

            products(first: 20) {
              nodes {
                id
                title
                handle
              }
            }
          }

        }
      }
    `);

    const result = await response.json();

    console.log("GRAPHQL RESULT:", result);

    return {
      plans: result,
      error: null,
    };

  } catch (error) {

    console.log("ERROR:", error);

    return {
      plans: [],
      error: error.message,
    };
  }
}



// ======================
// PAGE
// ======================

export default function Plans() {

  const { plans, error } = useLoaderData();

  console.log("plans data", plans);

  return (

    <Page title="Selling Plans">

      <Layout>

        {/* ERROR */}
        {error && (
          <Layout.Section>
            <Card>
              <Text as="p" tone="critical">
                {error}
              </Text>
            </Card>
          </Layout.Section>
        )}


        {/* NO PLANS */}
        {!error && plans.length === 0 && (
          <Layout.Section>
            <Card>
              <Text as="h3" variant="headingMd">
                No Selling Plans Found
              </Text>
            </Card>
          </Layout.Section>
        )}


        {/* PLANS */}
        {plans.map((node) => (

          <Layout.Section key={node.id}>

            <Card roundedAbove="sm">

              <BlockStack gap="400">

                {/* HEADER */}
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                >

                  <BlockStack gap="100">

                    <Text
                      as="h2"
                      variant="headingLg"
                    >
                      {node.name}
                    </Text>

                    <Text
                      as="p"
                      tone="subdued"
                    >
                      Merchant Code: {node.merchantCode || "N/A"}
                    </Text>

                  </BlockStack>

                  <Badge tone="success">
                    Active
                  </Badge>

                </InlineStack>



                {/* OPTIONS */}
                <BlockStack gap="200">

                  <Text
                    as="h3"
                    variant="headingMd"
                  >
                    Options
                  </Text>

                  <InlineStack gap="200">

                    {node.options?.length > 0 ? (
                      node.options.map((option, index) => (
                        <Badge key={index}>
                          {option}
                        </Badge>
                      ))
                    ) : (
                      <Text as="p">No options</Text>
                    )}

                  </InlineStack>

                </BlockStack>



                {/* SELLING PLANS */}
                <BlockStack gap="300">

                  <Text
                    as="h3"
                    variant="headingMd"
                  >
                    Plans
                  </Text>

                  {node.sellingPlans?.nodes?.map((plan) => (

                    <Card key={plan.id}>

                      <BlockStack gap="200">

                        <InlineStack
                          align="space-between"
                        >

                          <Text
                            as="h4"
                            variant="headingMd"
                          >
                            {plan.name}
                          </Text>

                          <Badge tone="info">
                            {plan.category}
                          </Badge>

                        </InlineStack>

                        <Text as="p">
                          {plan.description || "No description"}
                        </Text>

                      </BlockStack>

                    </Card>

                  ))}

                </BlockStack>



                {/* PRODUCTS */}
                <BlockStack gap="300">

                  <Text
                    as="h3"
                    variant="headingMd"
                  >
                    Products
                  </Text>

                  {node.products?.nodes?.map((product) => (

                    <Card key={product.id}>

                      <BlockStack gap="100">

                        <Text
                          as="h4"
                          variant="bodyLg"
                          fontWeight="bold"
                        >
                          {product.title}
                        </Text>

                        <Text
                          as="p"
                          tone="subdued"
                        >
                          /products/{product.handle}
                        </Text>

                      </BlockStack>

                    </Card>

                  ))}

                </BlockStack>

              </BlockStack>

            </Card>

          </Layout.Section>

        ))}

      </Layout>

    </Page>
  );
}