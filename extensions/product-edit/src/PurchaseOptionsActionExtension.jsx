import "@shopify/ui-extensions/preact";
import { useState, useEffect } from "preact/hooks";

export default function PurchaseOptionsActionExtension() {
  const { i18n, extension: { target }, close, data } = shopify;
  console.log("nvjdnvjnd",data)

  const selected = data?.selected?.[0];
  const productId = selected?.id;
  const sellingPlanGroupId = selected?.sellingPlanId;
  const isEditing = !!sellingPlanGroupId;

  console.log('productId:', productId);
  console.log('sellingPlanGroupId:', sellingPlanGroupId);
  console.log('isEditing:', isEditing);

  const [merchantCode, setMerchantCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [discountType, setDiscountType] = useState("percentageOff");
  const [deliveryOptions, setDeliveryOptions] = useState({
    frequency: "1",
    timeType: "month",
    discount: "0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingSellingPlanId, setExistingSellingPlanId] = useState(null);

  useEffect(() => {
    if (isEditing && sellingPlanGroupId) {
      fetchSellingPlanGroup(sellingPlanGroupId);
    }
  }, []);

  async function fetchSellingPlanGroup(groupId) {
    try {
      const query = `
        query GetSellingPlanGroup($id: ID!) {
          sellingPlanGroup(id: $id) {
            id
            name
            description
            merchantCode
            sellingPlans(first: 1) {
              edges {
                node {
                  id
                  name
                  billingPolicy {
                    ... on SellingPlanRecurringBillingPolicy {
                      interval
                      intervalCount
                    }
                  }
                  pricingPolicies {
                    ... on SellingPlanFixedPricingPolicy {
                      adjustmentType
                      adjustmentValue {
                        ... on SellingPlanPricingPolicyPercentageValue {
                          percentage
                        }
                        ... on MoneyV2 {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch("shopify:admin/api/graphql.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: groupId } }),
      });

      const result = await response.json();
      console.log('Fetched group:', JSON.stringify(result, null, 2));

      const group = result?.data?.sellingPlanGroup;
      console.log('vdbvjbv', group)
      if (group) {
        setPlanName(group.title || "");
        setMerchantCode(group.merchantCode || "");

        const plan = group.sellingPlans?.edges?.[0]?.node;
        if (plan) {
          setExistingSellingPlanId(plan.id);

          // Pre-fill delivery options
          const billing = plan.billingPolicy;
          if (billing?.interval) {
            setDeliveryOptions((prev) => ({
              ...prev,
              timeType: billing.interval.toLowerCase(),
              frequency: String(billing.intervalCount || 1),
            }));
          }

          // Pre-fill pricing
          const pricing = plan.pricingPolicies?.[0];
          if (pricing?.adjustmentType) {
            if (pricing.adjustmentType === 'PERCENTAGE') {
              setDiscountType('percentageOff');
              setDeliveryOptions((prev) => ({
                ...prev,
                discount: String(pricing.adjustmentValue?.percentage || 0),
              }));
            } else if (pricing.adjustmentType === 'FIXED_AMOUNT') {
              setDiscountType('amountOff');
              setDeliveryOptions((prev) => ({
                ...prev,
                discount: String(pricing.adjustmentValue?.amount || 0),
              }));
            } else if (pricing.adjustmentType === 'PRICE') {
              setDiscountType('flatRate');
              setDeliveryOptions((prev) => ({
                ...prev,
                discount: String(pricing.adjustmentValue?.amount || 0),
              }));
            }
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }

  const updateDeliveryOption = (field, value) => {
    setDeliveryOptions((prev) => ({ ...prev, [field]: value }));
  };

  function getDiscountLabel(type) {
    switch (type) {
      case "percentageOff": return "Percentage off";
      case "amountOff": return "Amount off";
      case "flatRate": return "Flat rate";
    }
  }

  function buildSellingPlanInput() {
    const freq = parseInt(deliveryOptions.frequency) || 1;
    const disc = parseFloat(deliveryOptions.discount) || 0;
    const intervalLabel = `Every ${freq} ${deliveryOptions.timeType}${freq > 1 ? 's' : ''}`;

    const deliveryPolicy = {
      recurring: {
        interval: deliveryOptions.timeType.toUpperCase(),
        intervalCount: freq,
      },
    };

    const billingPolicy = {
      recurring: {
        interval: deliveryOptions.timeType.toUpperCase(),
        intervalCount: freq,
      },
    };

    let pricingPolicies = [];
    if (discountType === "percentageOff") {
      pricingPolicies = [{ fixed: { adjustmentType: "PERCENTAGE", adjustmentValue: { percentage: disc } } }];
    } else if (discountType === "amountOff") {
      pricingPolicies = [{ fixed: { adjustmentType: "FIXED_AMOUNT", adjustmentValue: { fixedValue: disc } } }];
    } else if (discountType === "flatRate") {
      pricingPolicies = [{ fixed: { adjustmentType: "PRICE", adjustmentValue: { fixedValue: disc } } }];
    }

    return {
      name: planName,
      category: "SUBSCRIPTION",
      options: [intervalLabel],
      deliveryPolicy,
      billingPolicy,
      pricingPolicies,
    };
  }

  async function handleSave() {
    if (!planName.trim()) {
      setError("Plan name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const sellingPlanInput = buildSellingPlanInput();

      if (isEditing) {
        // UPDATE existing selling plan group
        const mutation = `
          mutation UpdateSellingPlanGroup($id: ID!, $input: SellingPlanGroupInput!) {
            sellingPlanGroupUpdate(id: $id, input: $input) {
              sellingPlanGroup { id name }
              userErrors { field message }
            }
          }
        `;

        const response = await fetch("shopify:admin/api/graphql.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: mutation,
            variables: {
              id: sellingPlanGroupId,
              input: {
                name: planName,
                merchantCode: merchantCode,
                sellingPlansToUpdate: existingSellingPlanId
                  ? [{ id: existingSellingPlanId, ...sellingPlanInput }]
                  : [],
              },
            },
          }),
        });

        const result = await response.json();
        console.log("Update result:", JSON.stringify(result, null, 2));

        const errors = result?.data?.sellingPlanGroupUpdate?.userErrors;
        if (errors?.length > 0) {
          setError(errors.map((e) => e.message).join(", "));
          setLoading(false);
          return;
        }

      } else {
        const mutation = `
          mutation CreateSellingPlanGroup($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput!) {
            sellingPlanGroupCreate(input: $input, resources: $resources) {
              sellingPlanGroup { id name }
              userErrors { field message }
            }
          }
        `;

        const response = await fetch("shopify:admin/api/graphql.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: mutation,
            variables: {
              input: {
                name: planName,
                merchantCode: merchantCode,
                options: ["Delivery frequency"],
                sellingPlansToCreate: [sellingPlanInput],
              },
              resources: {
                productIds: productId ? [productId] : [],
                productVariantIds: [],
              },
            },
          }),
        });

        const result = await response.json();
        console.log("Create result:", JSON.stringify(result, null, 2));

        const errors = result?.data?.sellingPlanGroupCreate?.userErrors;
        if (errors?.length > 0) {
          setError(errors.map((e) => e.message).join(", "));
          setLoading(false);
          return;
        }
      }

      close();
    } catch (err) {
      console.error("Save error:", err);
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <s-admin-action>
      <s-button slot="primary-action" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </s-button>
      <s-button slot="secondary-actions" onClick={() => { close(); }}>
        Cancel
      </s-button>
      <s-stack direction="block" gap="large">
        {error && <s-text tone="critical">{error}</s-text>}
        <s-text-field
          label="Title"
          placeholder="Subscribe and save"
          value={planName}
          onChange={(event) => setPlanName(event.currentTarget.value)}
        />
        <s-text-field
          label="Internal description"
          value={merchantCode}
          onChange={(event) => setMerchantCode(event.currentTarget.value)}
        />
        <s-box>
          <s-choice-list
            name="discountType"
            values={[discountType]}
            onChange={(e) => setDiscountType(e.currentTarget.values[0])}
          >
            <s-choice value="percentageOff">Percentage off</s-choice>
            <s-choice value="amountOff">Amount off</s-choice>
            <s-choice value="flatRate">Flat rate</s-choice>
          </s-choice-list>
        </s-box>
        <s-box>
          <s-stack gap="base" alignItems="end" alignContent="end">
            <s-number-field
              label="Delivery frequency"
              value={deliveryOptions.frequency}
              onChange={(event) =>
                updateDeliveryOption("frequency", event.currentTarget.value)
              }
            />
            <s-select
              label="Delivery interval"
              value={deliveryOptions.timeType}
              onChange={(event) =>
                updateDeliveryOption("timeType", event.currentTarget.value)
              }
            >
              <s-option value="week">Weeks</s-option>
              <s-option value="month">Months</s-option>
              <s-option value="year">Years</s-option>
            </s-select>
            <s-number-field
              label={getDiscountLabel(discountType)}
              value={deliveryOptions.discount}
              onChange={(event) =>
                updateDeliveryOption("discount", event.currentTarget.value)
              }
            />
          </s-stack>
        </s-box>
      </s-stack>
    </s-admin-action>
  );
}