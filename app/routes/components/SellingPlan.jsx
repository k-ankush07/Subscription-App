import {
  Card,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Button,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useState } from "react";
import Automation from "./Automation";
function SellingPlan({ sellingPlan, setSellingPlan, selectedProducts }) {
  const shopify = useAppBridge();
  const [pickerTarget, setPickerTarget] = useState(null);

  const allowedIds = selectedProducts.map((p) => p.id);

  const handleOpenPicker = async (target) => {
    setPickerTarget(target);

    // Current selected ids for pre-selection
    const currentIds =
      target === "quantity"
        ? sellingPlan.quantityProducts || []
        : sellingPlan.freeProducts || [];

    const selected = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      //Pre-select already chosen products
      selectionIds: currentIds.map((id) => ({ id })),
      filter: {
        variants: true,
        query: allowedIds.map((id) => `id:${id.split("/").pop()}`).join(" OR "),
      },
    });

    if (!selected || selected.length === 0) return;

    const pickedIds = selected.map((p) => p.id);

    if (target === "quantity") {
      setSellingPlan((prev) => ({
        ...prev,
        quantityProducts: pickedIds,
      }));
    } else if (target === "freeProduct") {
      setSellingPlan((prev) => ({
        ...prev,
        freeProducts: pickedIds,
      }));
    }
  };

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
            // {
            //   label: "Prepaid",
            //   value: "PREPAID",
            // },
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
                { label: "Amount off", value: "FIXED_AMOUNT" },
                { label: "Fixed price", value: "PRICE" },
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
                    setSellingPlan({
                      ...sellingPlan,
                      afterDiscountValue: Number(value),
                    })
                  }
                />

                <TextField
                  label="After # of orders"
                  type="number"
                  value={String(sellingPlan.afterOrders ?? 1)}
                  onChange={(value) =>
                    setSellingPlan({
                      ...sellingPlan,
                      afterOrders: Number(value),
                    })
                  }
                />

                <Select
                  label="Discount type"
                  options={[
                    { label: "Percentage off", value: "PERCENTAGE" },
                    { label: "Amount off", value: "PRICE" },
                    { label: "Fixed price", value: "FIXED_AMOUNT" },
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

        {/* SHIPPING DISCOUNT */}
        <h2>Shipping discount</h2>
        <Checkbox
          label="Give discount"
          checked={sellingPlan.giveShippingDiscount}
          onChange={(newChecked) =>
            setSellingPlan((prev) => ({
              ...prev,
              giveShippingDiscount: newChecked,
            }))
          }
        />
        {sellingPlan.giveShippingDiscount && (
          <>
            <TextField
              label="Discount"
              type="number"
              value={String(sellingPlan.shippingDiscountValue)}
              helpText="This will be the new delivery price"
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  shippingDiscountValue: Number(value),
                })
              }
            />

            <TextField
              label="After # of orders"
              type="number"
              value={String(sellingPlan.shippingAfterOrders)}
              helpText="After how many orders to change delivery price"
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  shippingAfterOrders: Number(value),
                })
              }
            />

            <Select
              label="Discount type"
              options={[
                { label: "Percentage off", value: "PERCENTAGE" },
                { label: "Fixed price", value: "PRICE" },
                { label: "Amount off", value: "FIXED_AMOUNT" },
              ]}
              value={sellingPlan.shippingDiscountType}
              onChange={(value) =>
                setSellingPlan({ ...sellingPlan, shippingDiscountType: value })
              }
            />
          </>
        )}
        {/* auntomation */}
        <Automation sellingPlan={sellingPlan} setSellingPlan={setSellingPlan} />

        {/* setting */}
        <h2>Settings</h2>
        <Checkbox
          label="Change product quantity after specific number of orders"
          checked={sellingPlan.changeQuantityAfterOrders}
          onChange={(newChecked) =>
            setSellingPlan((prev) => ({
              ...prev,
              changeQuantityAfterOrders: newChecked,
            }))
          }
        />
        {sellingPlan.changeQuantityAfterOrders && (
          <>
            <TextField
              label="Quantity"
              type="number"
              value={String(sellingPlan.quantityAfterOrdersValue ?? 1)}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  quantityAfterOrdersValue: Number(value),
                })
              }
            />
            <TextField
              label="After # of orders"
              type="number"
              value={String(sellingPlan.quantityAfterOrders ?? 1)}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  quantityAfterOrders: Number(value),
                })
              }
            />

            <Button onClick={() => handleOpenPicker("quantity")}>
              {sellingPlan.quantityProducts?.length > 0
                ? `${sellingPlan.quantityProducts.length} Product Selected`
                : "Select Product"}
            </Button>
          </>
        )}
        {/* set remove free prodcut */}
        <Checkbox
          label="Remove free products from subscription after specific number of orders"
          checked={sellingPlan.RemoveFreeProdcut}
          onChange={(newChecked) =>
            setSellingPlan((prev) => ({
              ...prev,
              RemoveFreeProdcut: newChecked,
            }))
          }
        />
        {sellingPlan.RemoveFreeProdcut && (
          <>
            <TextField
              label="After # of orders"
              type="number"
              value={String(sellingPlan.removeFreeProductValue ?? 1)}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  removeFreeProductValue: Number(value),
                })
              }
            />
            <Button onClick={() => handleOpenPicker("freeProduct")}>
              {sellingPlan.freeProducts?.length > 0
                ? `${sellingPlan.freeProducts.length} Product Selected`
                : "Select Product"}
            </Button>
          </>
        )}

        {/* set minimum quantity  */}
        <Checkbox
          label="Set minimum quantity for this plan"
          checked={sellingPlan.MinimumQuanitity}
          onChange={(newChecked) =>
            setSellingPlan((prev) => ({
              ...prev,
              MinimumQuanitity: newChecked,
            }))
          }
        />
        {sellingPlan.MinimumQuanitity && (
          <>
            <TextField
              label="After # of orders"
              type="number"
              value={String(sellingPlan.MinimumQuanitityValue ?? 1)}
              onChange={(value) =>
                setSellingPlan({
                  ...sellingPlan,
                  MinimumQuanitityValue: Number(value),
                })
              }
            />
          </>
        )}
      </FormLayout>
    </Card>
  );
}

export default SellingPlan;
