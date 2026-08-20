import {
  Page,
  Select,
  Card,
  Box,
  BlockStack,
  InlineStack,
  Text,
  RadioButton,
  Badge,
  Button,
  Divider,
  Checkbox,
} from "@shopify/polaris";
import React, { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

const API = import.meta.env.VITE_API_URL;
const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const plansResponse = await fetch(`${API}/plans/getAllPlans?shop=${shop}`, {
    headers: {
      "x-api-key": SECRET_KEY,
    },
  });

  const plansData = await plansResponse.json();

  return Response.json({
    plans: plansData.success ? plansData.data : [],
  });
};

const purchaseCards = [
  {
    id: "card-1",
    variant: "simple",
    price: "Rs. 895.00",
    subPrice: "Rs. 805.50",
    discountLabel: "10% off",
    deliverEvery: "month",
  },
  {
    id: "card-2",
    variant: "detailed",
    price: "Rs. 895.00",
    subPrice: "Rs. 805.50",
    bannerLabel: "Save 10% on every delivery",
    deliverEvery: "month",
    benefits: [
      "10% of all recurring orders",
      "Lowest price option",
      "Easily swap & skip deliveries",
      "Cancel quickly anytime",
    ],
  },
  {
    id: "card-3",
    variant: "compact",
    price: "Rs. 895.00",
    subPrice: "Rs. 805.50",
    deliverEvery: "month",
  },
];

function Widgets2() {
  const { plans } = useLoaderData();

  const planOptions = useMemo(
    () =>
      plans.map((p) => ({
        label: p.planName,
        value: p.planId,
      })),
    [plans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState(
    planOptions[0]?.value || "",
  );

  const [selectedMap, setSelectedMap] = useState(
    purchaseCards.reduce(
      (acc, card) => ({
        ...acc,
        [card.id]: "subscribe",
      }),
      {},
    ),
  );

  const selectPurchase = (id, value) => {
    setSelectedMap((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  return (
    <Page title="Choose a template">
      <BlockStack gap="500">

        {/* PLAN SELECT */}
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Previewing plan
              </Text>

              <Select
                label="Plan"
                options={planOptions}
                value={selectedPlanId}
                onChange={setSelectedPlanId}
              />
            </BlockStack>
          </Box>
        </Card>

        {/* PURCHASE CARDS */}
        <InlineStack gap="400" align="start" wrap>

          {purchaseCards.map((data) => {
            const selected = selectedMap[data.id];

            {/* SIMPLE */}
            if (data.variant === "simple") {
              return (
                <Box key={data.id} width="340px">
                  <Card>
                    <BlockStack gap="400">

                      <InlineStack
                        gap="300"
                        align="center"
                        blockAlign="center"
                      >
                        <Box width="100%">
                          <Divider />
                        </Box>

                        <Text
                          variant="headingSm"
                          as="h3"
                          fontWeight="bold"
                        >
                          PURCHASE OPTIONS
                        </Text>

                        <Box width="100%">
                          <Divider />
                        </Box>
                      </InlineStack>

                      {/* ONE TIME */}
                      <Box
                        borderWidth="025"
                        borderColor={
                          selected === "onetime"
                            ? "border-strong"
                            : "border"
                        }
                        borderRadius="300"
                        padding="400"
                      >
                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                        >
                          <RadioButton
                            label="One time purchase"
                            checked={selected === "onetime"}
                            id={`${data.id}-onetime`}
                            name={data.id}
                            onChange={() =>
                              selectPurchase(data.id, "onetime")
                            }
                          />

                          <Text fontWeight="bold">
                            {data.price}
                          </Text>
                        </InlineStack>
                      </Box>

                      {/* SUBSCRIBE */}
                      <Box
                        borderWidth="025"
                        borderColor={
                          selected === "subscribe"
                            ? "border-strong"
                            : "border"
                        }
                        borderRadius="300"
                        padding="400"
                      >
                        <BlockStack gap="300">
                          <InlineStack
                            align="space-between"
                            blockAlign="center"
                          >
                            <RadioButton
                              label="Subscribe & save"
                              checked={selected === "subscribe"}
                              id={`${data.id}-subscribe`}
                              name={data.id}
                              onChange={() =>
                                selectPurchase(
                                  data.id,
                                  "subscribe",
                                )
                              }
                            />

                            <Badge>
                              {data.discountLabel}
                            </Badge>
                          </InlineStack>

                          <InlineStack align="space-between">
                            <Text tone="subdued">
                              Deliver every {data.deliverEvery}
                            </Text>

                            <Text fontWeight="bold">
                              {data.subPrice}
                            </Text>
                          </InlineStack>
                        </BlockStack>
                      </Box>

                      <Button variant="primary" fullWidth>
                        Choose
                      </Button>
                    </BlockStack>
                  </Card>
                </Box>
              );
            }

            {/* DETAILED */}
            if (data.variant === "detailed") {
              return (
                <Box key={data.id} width="340px">
                  <Card padding="0">

                    {/* ONE TIME */}
                    <Box padding="400">
                      <Box
                        borderWidth="025"
                        borderColor={
                          selected === "onetime"
                            ? "border-strong"
                            : "border"
                        }
                        borderRadius="300"
                        padding="400"
                      >
                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                        >
                          <RadioButton
                            label="One time purchase"
                            checked={selected === "onetime"}
                            id={`${data.id}-onetime`}
                            name={data.id}
                            onChange={() =>
                              selectPurchase(data.id, "onetime")
                            }
                          />

                          <Text fontWeight="bold">
                            {data.price}
                          </Text>
                        </InlineStack>
                      </Box>
                    </Box>

                    {/* SAVE BANNER */}
                    <Box
                      background="bg-surface-secondary"
                      padding="300"
                    >
                      <InlineStack align="center">
                        <Text
                          variant="bodySm"
                          fontWeight="semibold"
                        >
                          {data.bannerLabel}
                        </Text>
                      </InlineStack>
                    </Box>

                    {/* SUBSCRIBE */}
                    <Box padding="400">
                      <Box
                        borderWidth="025"
                        borderColor={
                          selected === "subscribe"
                            ? "border-strong"
                            : "border"
                        }
                        borderRadius="300"
                        padding="400"
                      >
                        <BlockStack gap="500">

                          {/* TITLE + PRICE */}
                          <InlineStack
                            align="space-between"
                            blockAlign="start"
                          >
                            <RadioButton
                              label="Subscribe & save"
                              checked={selected === "subscribe"}
                              id={`${data.id}-subscribe`}
                              name={data.id}
                              onChange={() =>
                                selectPurchase(
                                  data.id,
                                  "subscribe",
                                )
                              }
                            />

                            <BlockStack gap="100">
                              <Box
                                background="bg-surface-secondary"
                                padding="200"
                                borderRadius="200"
                              >
                                <Text
                                  fontWeight="bold"
                                  alignment="end"
                                >
                                  {data.subPrice}
                                </Text>
                              </Box>

                              <Text
                                tone="subdued"
                                alignment="end"
                                textDecorationLine="line-through"
                              >
                                {data.price}
                              </Text>
                            </BlockStack>
                          </InlineStack>

                          {/* HOW SUBSCRIPTIONS WORK */}
                          <BlockStack gap="300">
                            <Text
                              variant="headingSm"
                              as="h3"
                              fontWeight="bold"
                            >
                              How subscriptions work:
                            </Text>

                            {data.benefits.map((benefit, index) => (
                              <InlineStack
                                key={index}
                                gap="300"
                                blockAlign="start"
                              >
                                <Box
                                  background="bg-fill-inverse"
                                  borderRadius="full"
                                  padding="100"
                                >
                                  <Text
                                    as="span"
                                    tone="text-inverse"
                                  >
                                    ✓
                                  </Text>
                                </Box>

                                <Box width="100%">
                                  <Text>{benefit}</Text>
                                </Box>
                              </InlineStack>
                            ))}
                          </BlockStack>

                          <Divider />

                          {/* DELIVERY */}
                          <BlockStack gap="200">
                            <Text
                              variant="bodySm"
                              fontWeight="semibold"
                            >
                              Deliver every:
                            </Text>

                            <Select
                              label="Delivery frequency"
                              labelHidden
                              options={[
                                {
                                  label: "Every month",
                                  value: "month",
                                },
                                {
                                  label: "Every 2 months",
                                  value: "2-months",
                                },
                                {
                                  label: "Every 3 months",
                                  value: "3-months",
                                },
                              ]}
                              value={data.deliverEvery}
                              onChange={(value) => {
                                console.log(
                                  "delivery:",
                                  value,
                                );
                              }}
                            />
                          </BlockStack>
                        </BlockStack>
                      </Box>

                      <Box paddingBlockStart="300">
                        <Text tone="subdued">
                          Subscription details
                        </Text>
                      </Box>

                      <Box paddingBlockStart="400">
                        <Button
                          variant="primary"
                          fullWidth
                        >
                          Choose
                        </Button>
                      </Box>
                    </Box>
                  </Card>
                </Box>
              );
            }

            {/* COMPACT */}
            const checked = selected === "subscribe";

            return (
              <Box key={data.id} width="300px">
                <Card>
                  <BlockStack gap="400">

                    <Box
                      borderWidth="025"
                      borderColor="border"
                      borderRadius="300"
                      padding="400"
                    >
                      <InlineStack
                        gap="300"
                        blockAlign="start"
                      >
                        <Checkbox
                          checked={checked}
                          onChange={() =>
                            selectPurchase(
                              data.id,
                              checked
                                ? "none"
                                : "subscribe",
                            )
                          }
                        />

                        <BlockStack gap="200">
                          <InlineStack gap="200">
                            <Text fontWeight="bold">
                              Subscribe & save
                            </Text>

                            <Text
                              tone="subdued"
                              textDecorationLine="line-through"
                            >
                              {data.price}
                            </Text>

                            <Text fontWeight="bold">
                              {data.subPrice}
                            </Text>
                          </InlineStack>

                          <Text tone="subdued">
                            Deliver every:{" "}
                            {data.deliverEvery}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>

                    <Text tone="subdued">
                      Subscription details
                    </Text>

                    <Button variant="primary" fullWidth>
                      Choose
                    </Button>
                  </BlockStack>
                </Card>
              </Box>
            );
          })}
        </InlineStack>
      </BlockStack>
    </Page>
  );
}

export default Widgets2;