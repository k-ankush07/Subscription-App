import {
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
} from "@shopify/polaris";

function SellingPlan({ sellingPlan, setSellingPlan }) {
  return (
    <Card>
      <FormLayout>
        {/* NAME */}
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

        {/* BILLING TYPE */}
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

        {/* DELIVERY FREQUENCY */}
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

        {/* DELIVERY INTERVAL */}
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
              billingInterval: value,
            })
          }
        />

        {/* PREPAID ONLY FIELD */}
        {sellingPlan.billingType === "PREPAID" && (
          <>
            <TextField
              label="Billing frequency"
              type="number"
              value={String(sellingPlan.billingFrequency)}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  billingFrequency: Number(value),
                })
              }
            />
            <TextField
              label="Billing interval"
              value={sellingPlan.interval}
              readOnly
            />
          </>
        )}

        <Select
          label="Minimum number of orders"
          options={[
            { label: "Disabled", value: "0" },
            ...Array.from({ length: 250 }, (_, i) => ({
              label: String(i + 1),
              value: String(i + 1),
            })),
          ]}
          value={String(sellingPlan.minCycles ?? "0")}
          onChange={(value) =>
            setSellingPlan({
              ...sellingPlan,
              minCycles: value === "0" ? "disabled" : Number(value),
            })
          }
        />

        <Select
          label="Maximum number of orders"
          options={[
            { label: "Unlimited", value: "0" },
            ...Array.from({ length: 250 }, (_, i) => ({
              label: String(i + 1),
              value: String(i + 1),
            })),
          ]}
          value={String(sellingPlan.maxCycles ?? "0")}
          onChange={(value) =>
  setSellingPlan({
    ...sellingPlan,
    maxCycles: value === "0" ? "unlimited" : Number(value),
  })
}
        />

        {/* SUBSCRIPTION DISCOUNT */}
        {/* <Checkbox
          label="Give subscription discount"
          checked={sellingPlan.giveSubscriptionDiscount}
          onChange={(newChecked) =>
            setSellingPlan((prev) => ({
              ...prev,
              giveSubscriptionDiscount: newChecked,
            }))
          }
        />

        {sellingPlan.giveSubscriptionDiscount && (
          <>
            <TextField
              label="Discount amount"
              type="number"
              value={String(sellingPlan.discountValue)}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  discountValue: Number(value),
                })
              }
            />

            <Select
              label="Discount type"
              options={[
                {
                  label: "Percentage off",
                  value: "PERCENTAGE",
                },
                {
                  label: "Amount off",
                  value: "AMOUNT",
                },
                {
                  label: "Fixed price",
                  value: "FIXED_PRICE",
                },
              ]}
              value={sellingPlan.discountType}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  discountType: value,
                })
              }
            />
          </>
        )} */}

        {/* SUBSCRIPTION DISCOUNT */}
<Checkbox
  label="Give subscription discount"
  checked={sellingPlan.giveSubscriptionDiscount}
  onChange={(newChecked) =>
    setSellingPlan((prev) => ({
      ...prev,
      giveSubscriptionDiscount: newChecked,
    }))
  }
/>

{sellingPlan.giveSubscriptionDiscount && (
  <>
    <TextField
      label="Discount amount"
      type="number"
      value={String(sellingPlan.discountValue)}
      onChange={(value) =>
        setSellingPlan({ ...sellingPlan, discountValue: Number(value) })
      }
    />

    <Select
      label="Discount type"
      options={[
        { label: "Percentage off", value: "PERCENTAGE" },
        { label: "Amount off", value: "AMOUNT" },
        { label: "Fixed price", value: "FIXED_PRICE" },
      ]}
      value={sellingPlan.discountType}
      onChange={(value) =>
        setSellingPlan({ ...sellingPlan, discountType: value })
      }
    />

    {/* CHANGE DISCOUNT AFTER SPECIFIC ORDERS */}
    <Checkbox
      label="Change discount after specific number of orders"
      checked={sellingPlan.changeDiscountAfterOrders}
      onChange={(newChecked) =>
        setSellingPlan((prev) => ({
          ...prev,
          changeDiscountAfterOrders: newChecked,
        }))
      }
    />

    {sellingPlan.changeDiscountAfterOrders && (
      <>
        <TextField
          label="Discount amount"
          type="number"
          value={String(sellingPlan.afterDiscountValue ?? 0)}
          onChange={(value) =>
            setSellingPlan({ ...sellingPlan, afterDiscountValue: Number(value) })
          }
        />

        <TextField
          label="After # of orders"
          type="number"
          value={String(sellingPlan.afterOrders ?? 1)}
          onChange={(value) =>
            setSellingPlan({ ...sellingPlan, afterOrders: Number(value) })
          }
        />

        <Select
          label="Discount type"
          options={[
            { label: "Percentage off", value: "PERCENTAGE" },
            { label: "Amount off", value: "AMOUNT" },
            { label: "Fixed price", value: "FIXED_PRICE" },
          ]}
          value={sellingPlan.afterDiscountType ?? "PERCENTAGE"}
          onChange={(value) =>
            setSellingPlan({ ...sellingPlan, afterDiscountType: value })
          }
        />
      </>
    )}
  </>
)}
      </FormLayout>
    </Card>
  );
}

export default SellingPlan;
