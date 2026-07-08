import {
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import Automation from "./Automation";

function SellingPlan({
  sellingPlans,
  setSellingPlans,
  selectedProducts,
  defaultPlan,
    planErrors,             // add
  validateSellingPlans,
}) {
  const shopify = useAppBridge();
  const allowedIds = selectedProducts.map((p) => p.id);
  const updatePlan = (index, updates) => {
  setSellingPlans((prev) => {
    const updated = prev.map((plan, i) =>
      i === index ? { ...plan, ...updates } : plan
    );
    validateSellingPlans(updated); // add
    return updated;
  });
};

  //  Naya plan add karo
  const handleAddPlan = () => {
    setSellingPlans((prev) => [...prev, { ...defaultPlan }]);
  };

  //  Plan remove karo
  const handleRemovePlan = (index) => {
    setSellingPlans((prev) => prev.filter((_, i) => i !== index));
  };

  // Resource picker — index aware
  const handleOpenPicker = async (target, index) => {
  const currentPlan = sellingPlans[index];
  const currentIds =
    target === "quantity"
      ? currentPlan.quantityProducts || []
      : currentPlan.freeProducts || [];

  const currentProducts =
    target === "quantity"
      ? currentPlan.quantityProductObjects || []
      : currentPlan.freeProductObjects || [];

  // selectionIds mein variant info bhi do
  const selectionIds = currentIds.map((productId) => {
    const productObj = currentProducts.find((p) => p.id === productId);
    return {
      id: productId,
      variants: productObj?.variants?.map((v) => ({ id: v.variantsId })) || [],
    };
  });

  const selected = await shopify.resourcePicker({
    type: "product",
    multiple: true,
    selectionIds,
    filter: {
      variants: true,
      query: allowedIds.map((id) => `id:${id.split("/").pop()}`).join(" OR "),
    },
  });

   console.log("seleted ",selected)
  if (!selected || selected.length === 0) return;

  // Sirf selected variants store karo (IDs ke saath objects)
  const pickedIds = selected.map((p) => p.id);
  const pickedObjects = selected.map((p) => ({
    cnsole.log("jsfjnj",p.variants)
    id: p.id,
    title: p.title,
    variants: (p.variants || []).map((v) => ({
      variantsId: v.id,
      variantsTitle: v.title,
    })),
  }));

  if (target === "quantity") {
    updatePlan(index, {
      quantityProducts: pickedIds,
      quantityProductObjects: pickedObjects, // variant info save karo
    });
  } else {
    updatePlan(index, {
      freeProducts: pickedIds,
      freeProductObjects: pickedObjects, // variant info save karo
    });
  }
};

  const duplicatePlan = (index) => {
    setSellingPlans((prev) => {
      const planToCopy = prev[index];
      const newPlan = structuredClone(planToCopy);
      return [
        ...prev,
        {
          ...newPlan,
          shopifySellingPlanId: null, //duplicate should NOT reuse Shopify ID
          name: `${newPlan.name || "Plan"}`,
        },
      ];
    });
  };

  return (
    <>
      {sellingPlans.map((plan, index) => (
        <Card key={index}>
          <Button onClick={() => duplicatePlan(index)}>Duplicate Plan</Button>
          <FormLayout>
            {/*  Plan header + Remove button */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2>{plan.name || `Selling Plan #${index + 1}`}</h2>
              {sellingPlans.length > 1 && index !== 0 && (
                <Button
                  tone="critical"
                  variant="plain"
                  onClick={() => handleRemovePlan(index)}
                >
                  Remove
                </Button>
              )}
            </div>

            {/* NAME */}
            <TextField
              label="Name"
              value={plan.name}
              onChange={(value) => updatePlan(index, { name: value })}
              error={planErrors[`name_${index}`]} 
            />

            {/* BILLING TYPE */}
            <Select
              label="Billing type"
              options={[{ label: "Pay as you go", value: "PAY_AS_YOU_GO" }]}
              value={plan.billingType}
              onChange={(value) => updatePlan(index, { billingType: value })}
            />

            {/* DELIVERY FREQUENCY */}
            <TextField
              label="Delivery frequency"
              type="number"
              min={1}
              value={String(plan.intervalCount)}
              onChange={(value) =>
                updatePlan(index, { intervalCount: Number(value) })
              }
               error={planErrors[`interval_${index}`]}
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
              value={plan.interval}
              onChange={(value) =>
                updatePlan(index, { interval: value, billingInterval: value })
              }
            />

            {/* PREPAID ONLY */}
            {plan.billingType === "PREPAID" && (
              <>
                <TextField
                  label="Billing frequency"
                  type="number"
                  value={String(plan.billingFrequency)}
                  onChange={(value) =>
                    updatePlan(index, { billingFrequency: Number(value) })
                  }
                />
                <TextField
                  label="Billing interval"
                  value={plan.interval}
                  readOnly
                />
              </>
            )}

            {/* MIN CYCLES */}
            <Select
              label="Minimum number of orders"
              options={[
                { label: "Disabled", value: "0" },
                ...Array.from({ length: 250 }, (_, i) => ({
                  label: String(i + 1),
                  value: String(i + 1),
                })),
              ]}
              value={String(plan.minCycles ?? "0")}
              onChange={(value) =>
                updatePlan(index, {
                  minCycles: value === "0" ? null : Number(value),
                })
              }
            />

            {/* MAX CYCLES */}
            <Select
              label="Maximum number of orders"
              options={[
                { label: "Unlimited", value: "0" },
                ...Array.from({ length: 250 }, (_, i) => ({
                  label: String(i + 1),
                  value: String(i + 1),
                })),
              ]}
              value={String(plan.maxCycles ?? "0")}
              onChange={(value) =>
                updatePlan(index, {
                  maxCycles: value === "0" ? null : Number(value),
                })
              }
            />

            {/* SUBSCRIPTION DISCOUNT */}
            <Checkbox
              label="Give subscription discount"
              checked={plan.giveSubscriptionDiscount}
              onChange={(val) =>
                updatePlan(index, { giveSubscriptionDiscount: val })
              }
            />
            {plan.giveSubscriptionDiscount && (
              <>
                <TextField
                  label="Discount amount"
                  type="number"
                  min={0}
                  value={String(plan.discountValue)}
                  onChange={(val) =>
                    updatePlan(index, { discountValue: Number(val) })
                  }
                />
                <Select
                  label="Discount type"
                  options={[
                    { label: "Percentage off", value: "PERCENTAGE" },
                    { label: "Amount off", value: "FIXED_AMOUNT" },
                    { label: "Fixed price", value: "PRICE" },
                  ]}
                  value={plan.discountType}
                  onChange={(val) => updatePlan(index, { discountType: val })}
                />

                {/* CHANGE DISCOUNT AFTER ORDERS */}
                <Checkbox
                  label="Change discount after specific number of orders"
                  checked={plan.changeDiscountAfterOrders}
                  onChange={(val) =>
                    updatePlan(index, { changeDiscountAfterOrders: val })
                  }
                />
                {plan.changeDiscountAfterOrders && (
                  <>
                    <TextField
                      label="Discount amount"
                      type="number"
                      min={0}
                      value={String(plan.afterDiscountValue ?? 0)}
                      onChange={(val) =>
                        updatePlan(index, { afterDiscountValue: Number(val) })
                      }
                    />
                    <TextField
                      label="After # of orders"
                      type="number"
                      min={1}
                      value={String(plan.afterOrders ?? 1)}
                      onChange={(val) =>
                        updatePlan(index, { afterOrders: Number(val) })
                      }
                    />
                    <Select
                      label="Discount type"
                      options={[
                        { label: "Percentage off", value: "PERCENTAGE" },
                        { label: "Amount off", value: "FIXED_AMOUNT" },
                        { label: "Fixed price", value: "PRICE" },
                      ]}
                      value={plan.afterDiscountType ?? "PERCENTAGE"}
                      onChange={(val) =>
                        updatePlan(index, { afterDiscountType: val })
                      }
                    />
                  </>
                )}
              </>
            )}

            {/* SHIPPING DISCOUNT */}
            <h2>Shipping discount</h2>
            <Checkbox
              label="Give discount"
              checked={plan.giveShippingDiscount}
              onChange={(val) =>
                updatePlan(index, { giveShippingDiscount: val })
              }
            />
            {plan.giveShippingDiscount && (
              <>
                <TextField
                  label="Discount"
                  type="number"
                  min={0}
                  value={String(plan.shippingDiscountValue)}
                  helpText="This will be the new delivery price"
                  onChange={(val) =>
                    updatePlan(index, { shippingDiscountValue: Number(val) })
                  }
                />
                <TextField
                  label="After # of orders"
                  type="number"
                  min={1}
                  value={String(plan.shippingAfterOrders)}
                  helpText="After how many orders to change delivery price"
                  onChange={(val) =>
                    updatePlan(index, { shippingAfterOrders: Number(val) })
                  }
                />
                <Select
                  label="Discount type"
                  options={[
                      { label: "Percentage off", value: "PERCENTAGE" },
                        { label: "Amount off", value: "FIXED_AMOUNT" },
                        { label: "Fixed price", value: "PRICE" },
                  ]}
                  value={plan.shippingDiscountType}
                  onChange={(val) =>
                    updatePlan(index, { shippingDiscountType: val })
                  }
                />
              </>
            )}

            {/* AUTOMATION — setSellingPlan wrapper jo index-aware hai */}
            {/* <Automation
              sellingPlan={plan}
              setSellingPlan={(updater) => {
                if (typeof updater === "function") {
                  setSellingPlans((prev) =>
                    prev.map((p, i) => (i === index ? updater(p) : p)),
                  );
                } else {
                  updatePlan(index, updater);
                }
              }}
            /> */}

            {/* SETTINGS */}
            <h2>Settings</h2>

            {/* Change Quantity After Orders */}
            <Checkbox
              label="Change product quantity after specific number of orders"
              checked={plan.changeQuantityAfterOrders}
              onChange={(val) =>
                updatePlan(index, { changeQuantityAfterOrders: val })
              }
            />
            {plan.changeQuantityAfterOrders && (
              <>
                <TextField
                  label="Quantity"
                  type="number"
                  min={0}
                  value={String(plan.quantityAfterOrdersValue ?? 1)}
                  onChange={(val) =>
                    updatePlan(index, { quantityAfterOrdersValue: Number(val) })
                  }
                />
                <TextField
                  label="After # of orders"
                  type="number"
                  min={1}
                  value={String(plan.quantityAfterOrders ?? 1)}
                  onChange={(val) =>
                    updatePlan(index, { quantityAfterOrders: Number(val) })
                  }
                />
                <Button onClick={() => handleOpenPicker("quantity", index)}>
                  {plan.quantityProducts?.length > 0
                    ? `Selected Products (${plan.quantityProducts.length})`
                    : "Select Product"}
                </Button>
              </>
            )}

            {/* Remove Free Products */}
            <Checkbox
              label="Remove free products from subscription after specific number of orders"
              checked={plan.RemoveFreeProdcut}
              onChange={(val) => updatePlan(index, { RemoveFreeProdcut: val })}
            />
            {plan.RemoveFreeProdcut && (
              <>
                <TextField
                  label="After # of orders"
                  type="number"
                  min={1}
                  value={String(plan.removeFreeProductValue ?? 1)}
                  onChange={(val) =>
                    updatePlan(index, { removeFreeProductValue: Number(val) })
                  }
                />
                <Button onClick={() => handleOpenPicker("freeProduct", index)}>
                  {plan.freeProducts?.length > 0
                    ? `Selected Products (${plan.freeProducts.length})`
                    : "Select Product"}
                </Button>
              </>
            )}

            {/* Minimum Quantity */}
            <Checkbox
              label="Set minimum quantity for this plan"
              checked={plan.MinimumQuanitity}
              onChange={(val) => updatePlan(index, { MinimumQuanitity: val })}
            />
            {plan.MinimumQuanitity && (
              <TextField
                label="Minimum quantity"
                type="number"
                min={0}
                value={String(plan.MinimumQuanitityValue ?? 1)}
                onChange={(val) =>
                  updatePlan(index, { MinimumQuanitityValue: Number(val) })
                }
              />
            )}
          </FormLayout>
        </Card>
      ))}

      {/*  Naya plan add karne ka button */}
      <div style={{ marginTop: "12px" }}>
        <Button onClick={handleAddPlan} variant="secondary">
          + Add Option
        </Button>
      </div>
    </>
  );
}

export default SellingPlan;
