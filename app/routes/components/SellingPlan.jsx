import { Card, FormLayout, TextField, Select } from "@shopify/polaris";

function SellingPlan({
  sellingPlan,
  setSellingPlan,
}) {
  return (
    <Card>
      <FormLayout>
        <TextField
          label="Name"
          value={sellingPlan.name}
          onChange={(value) =>
            setSellingPlan({
              ...sellingPlan,
              name: value,
            })
          }
        />

        <Select
          label="Billing type"
          options={[
            {
              label: "Pay as you go",
              value: "PAY_AS_YOU_GO",
            },
            {
              label: "Prepaid",
              value: "PREPAID",
            },
          ]}
          value={sellingPlan.billingType}
          onChange={(value) =>
            setSellingPlan({
              ...sellingPlan,
              billingType: value,
            })
          }
        />

        <TextField
          label="Delivery frequency"
          type="number"
          value={String(sellingPlan.intervalCount)}
          onChange={(value) =>
            setSellingPlan({
              ...sellingPlan,
              intervalCount: Number(value),
            })
          }
        />

        <Select
          label="Delivery interval"
          options={[
            { label: "Days", value: "DAY" },
            { label: "Weeks", value: "WEEK" },
            { label: "Months", value: "MONTH" },
            { label: "Years", value: "YEAR" },
          ]}
          value={sellingPlan.interval}
          onChange={(value) =>
            setSellingPlan({
              ...sellingPlan,
              interval: value,
            })
          }
        />
      </FormLayout>
    </Card>
  );
}

export default SellingPlan;