import { Banner, Button, Card, Page, Icon, Checkbox } from "@shopify/polaris";
import React, { useEffect, useState } from "react";
import { currencySymbol } from "../utils/formatMoney.js";
import {
  useNavigate,
  useParams,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";

function getCardImage(brand) {
  const brandMap = {
    visa: "https://subscriptions-assets.kachingappz.app/payment-method-icons/visa.svg",
    mastercard:
      "https://subscriptions-assets.kachingappz.app/payment-method-icons/mastercard.svg",
    amex: "https://subscriptions-assets.kachingappz.app/payment-method-icons/amex.svg",
    bogus:
      "https://subscriptions-assets.kachingappz.app/payment-method-icons/bogus.svg",
  };
  return brandMap[brand?.toLowerCase()] || brandMap["bogus"];
}

function formateDate(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function SubscriptionDetail() {
  const {
    contract,
    upcomingCycles,
    internalNotes,
    customerNotes,
    preview,
    shop,
  } = useLoaderData();
  console.log("preview", preview, "contract", contract, "cycle");
  const [localLines, setLocalLines] = useState(contract?.lines?.edges || []);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [Internalnotes, setInternalNotes] = useState(internalNotes || "");
  const [showCustomerNotes, setshowCustomerNotes] = useState(false);
  const [CustomerNotes, setCustomerNotes] = useState(customerNotes || "");
  const [editingCycleIndex, setEditingCycleIndex] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [visibleCyclesCount, setVisibleCyclesCount] = useState(5);
  const [discountForm, setDiscountForm] = useState({
    type: "PERCENTAGE",
    value: "",
  });
  const [openLineDiscount, setOpenLineDiscount] = useState(null);
  const [lineDiscountForms, setLineDiscountForms] = useState({});
  const customerId = contract?.customer?.id?.split("/").pop();
  const shopHandle = shop?.replace(".myshopify.com", "");
  const { id } = useParams();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data != null) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data]);
  const isPending = fetcher.state !== "idle";
  const pendingFormData = isPending ? fetcher.formData : null;
  const pendingType = pendingFormData?.get("type") ?? null;
  const isThisActionPending = (type, matchers = {}) => {
    if (!isPending || pendingType !== type) return false;
    return Object.entries(matchers).every(([key, expected]) => {
      const expectedStr = expected == null ? "" : String(expected);
      return (pendingFormData.get(key) ?? "") === expectedStr;
    });
  };

  const lines = localLines;
  const nextUpcomingCycle =
    upcomingCycles?.find((cycle) => !cycle.skipped) ?? null;
  const nextCycleIndex = nextUpcomingCycle?.cycleIndex ?? null;
  const nextCycleDate = nextUpcomingCycle?.billingAttemptExpectedDate ?? null;

  const paymentInstrument = contract?.customerPaymentMethod?.instrument;
  const hasValidPaymentMethod = !!(
    contract?.customerPaymentMethod?.id && paymentInstrument
  );

  let chargeDisabledReason = null;
  if (contract?.status !== "ACTIVE") {
    chargeDisabledReason =
      "Subscription must be active to charge (currently " +
      (contract?.status?.toLowerCase() || "inactive") +
      ").";
  } else if (nextCycleIndex == null) {
    chargeDisabledReason = "No upcoming billing cycle to charge.";
  } else if (nextUpcomingCycle?.skipped) {
    chargeDisabledReason = "The next cycle is skipped — resume it first.";
  } else if (!hasValidPaymentMethod) {
    chargeDisabledReason = "No valid payment method on file for this customer.";
  } else if (nextCycleDate) {
    const msUntilDue = new Date(nextCycleDate).getTime() - Date.now();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    if (msUntilDue > TWENTY_FOUR_HOURS_MS) {
      chargeDisabledReason = `Can only charge within 24 hours of the billing date (${formateDate(
        nextCycleDate,
      )}).`;
    }
  }
  const navigate = useNavigate();
  const handleRemoveAutomationItem = ({
    automationCycleIndex,
    automationActionIndex,
    variantId,
  }) => {
    const confirmed = confirm(
      "Remove this product from the upcoming automation? It won't be applied to the next order.",
    );
    if (!confirmed) return;
    fetcher.submit(
      {
        type: "remove_automation_item",
        automationCycleIndex,
        automationActionIndex,
        variantId: variantId || "",
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };
  const backButton = () => {
    navigate("/app/subscriptions");
  };
  const handleSave = () => {
    fetcher.submit(
      { type: "internal", notes: Internalnotes },
      { method: "post" },
    );
    setShowInternalNotes(false);
    setInternalNotes("");
  };
  const handleSaveCustomer = () => {
    fetcher.submit(
      { type: "customer", notes: CustomerNotes },
      { method: "post" },
    );
    setshowCustomerNotes(false);
    setCustomerNotes("");
  };
  const totalLineItemsCount = preview?.nextOrder?.lineItems?.length || 0;

  const handlePause = () => {
    fetcher.submit({ type: "pause" }, { method: "post" });
  };
  const handleResume = () => {
    fetcher.submit({ type: "resume" }, { method: "post" });
  };
  const handleCancelSubscription = () => {
    let confirmed = confirm(
      "Are you sure you want to cancel this subscription? This action cannot be undone.",
    );
    if (!confirmed) return;
    fetcher.submit({ type: "cancel" }, { method: "post" });
  };

  const handleReschedule = (cycle) => {
    if (!editDate) {
      return;
    }
    fetcher.submit(
      {
        type: "reschedule",
        cycleIndex: cycle.cycleIndex,
        newDate: editDate,
        originalDate: cycle.billingAttemptExpectedDate,
      },
      { method: "post" },
    );
    setEditingCycleIndex(null);
    setEditDate("");
  };
  const handleRemoveBaseLine = ({ productId, variantId }) => {
    const confirmed = confirm(
      "Remove this product from the upcoming order? It won't be applied to the next order.",
    );
    if (!confirmed) return;
    fetcher.submit(
      {
        type: "remove_base_line",
        cycleIndex: preview?.nextOrder?.cycleIndex ?? 0,
        productId: productId || "",
        variantId: variantId || "",
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };
  const hasAnyDiscount = preview?.nextOrder?.lineItems?.some(
    (li) => li.discountLabel,
  );

  const handleRemoveAllDiscounts = () => {
    const confirmed = confirm(
      "Remove all discounts from the upcoming order? This will apply to future orders too.",
    );
    if (!confirmed) return;
    fetcher.submit(
      {
        type: "remove_all_discounts",
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };

  const handleRemoveLineDiscount = (li) => {
    const confirmed = confirm("Remove the discount from this product?");
    if (!confirmed) return;
    fetcher.submit(
      {
        type: "remove_line_discount",
        isBaseLine: li.isBaseLine ? "true" : "false",
        discountPhase: li.discountPhase || "",
        automationCycleIndex:
          li.automationCycleIndex != null
            ? String(li.automationCycleIndex)
            : "",
        automationActionIndex:
          li.automationActionIndex != null
            ? String(li.automationActionIndex)
            : "",
        productId: li.productId || "",
        variantId: li.variantId || "",
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };
  const getLineDiscountForm = (idx) =>
    lineDiscountForms[idx] || { type: "PERCENTAGE", value: "" };

  const setLineDiscountForm = (idx, patch) => {
    setLineDiscountForms((prev) => ({
      ...prev,
      [idx]: { ...getLineDiscountForm(idx), ...patch },
    }));
  };

  const handleApplyAllDiscounts = () => {
    if (!discountForm.value) return;
    fetcher.submit(
      {
        type: "apply_all_discounts",
        discountType: discountForm.type,
        discountValue: discountForm.value,
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };

  const handleApplyLineDiscount = (li, idx) => {
    const form = getLineDiscountForm(idx);
    if (!form.value) return;
    fetcher.submit(
      {
        type: "apply_line_discount",
        isBaseLine: li.isBaseLine ? "true" : "false",
        automationCycleIndex:
          li.automationCycleIndex != null
            ? String(li.automationCycleIndex)
            : "",
        automationActionIndex:
          li.automationActionIndex != null
            ? String(li.automationActionIndex)
            : "",
        discountType: form.type,
        discountValue: form.value,
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
    setOpenLineDiscount(null);
  };

  useEffect(() => {
    setLocalLines(contract?.lines?.edges || []);
    setVisibleCyclesCount(5);
  }, [contract]);
  useEffect(() => {
    setInternalNotes(internalNotes || "");
    setCustomerNotes(customerNotes || "");
  }, [internalNotes, customerNotes]);

  return (
    <>
      <Page backAction={{ onAction: backButton }} title={`${id}`}>
        {contract?.status === "CANCELLED" && (
          <Banner
            title="This subscription has been cancelled."
            tone="critical"
          ></Banner>
        )}
        <div>
          <b>{preview?.status}</b>, <b>{formateDate(contract?.createdAt)}</b> ,{" "}
          <b>{contract?.originOrder?.name}</b>
        </div>

        {contract?.status === "ACTIVE" ? (
          <>
            <Button
              onClick={handlePause}
              loading={isThisActionPending("pause")}
              disabled={isThisActionPending("pause")}
            >
              Pause
            </Button>
          </>
        ) : (
          <>
            {contract?.status !== "CANCELLED" && (
              <Button
                onClick={handleResume}
                loading={isThisActionPending("resume")}
                disabled={isThisActionPending("resume")}
              >
                Resume
              </Button>
            )}
          </>
        )}
        {contract?.status !== "CANCELLED" ? (
          <Button
            onClick={() => {
              fetcher.submit(
                { type: "charge_now", cycleIndex: nextCycleIndex },
                { method: "post" },
              );
            }}
            disabled={
              !!chargeDisabledReason || isThisActionPending("charge_now")
            }
            loading={isThisActionPending("charge_now")}
          >
            Charge Now
          </Button>
        ) : (
          ""
        )}
        {contract?.status !== "CANCELLED" ? (
          <Button
            onClick={handleCancelSubscription}
            loading={isThisActionPending("cancel")}
            disabled={isThisActionPending("cancel")}
          >
            Cancel Subscription
          </Button>
        ) : (
          ""
        )}
        {contract?.status !== "CANCELLED" && (
          <div>
            <b>Next Order</b>
            <p>
              {nextCycleDate
                ? formateDate(nextCycleDate)
                : "No upcoming billing cycle"}
            </p>
            <br />

            {(contract?.billingPolicy?.minCycles != null ||
              contract?.billingPolicy?.maxCycles != null) && (
              <>
                <b>Order limits</b>
                {contract?.billingPolicy?.minCycles != null && (
                  <p>Minimum cycles: {contract.billingPolicy.minCycles}</p>
                )}
                {contract?.billingPolicy?.maxCycles != null && (
                  <p>Maximum cycles: {contract.billingPolicy.maxCycles}</p>
                )}
              </>
            )}
          </div>
        )}
        <div>
          <b>Billing Cycle</b>
          <p>{preview?.nextOrder?.cycleIndex}</p>
        </div>
        <div>
          <b>Customer</b>
          <a
            href={`https://admin.shopify.com/store/${shopHandle}/customers/${customerId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Customers Page
          </a>
          <p>
            <span>
              {contract?.customer?.firstName} {contract?.customer?.lastName}
            </span>
          </p>
          <span>{contract?.customer?.defaultEmailAddress?.emailAddress}</span>

          <div>
            <b>Shipping address</b> <br />
            <span>
              {contract?.deliveryMethod?.address?.firstName}{" "}
              {contract?.deliveryMethod?.address?.lastName}
            </span>{" "}
            <br />
            <span>
              {contract?.deliveryMethod?.address?.address1}{" "}
              {contract?.deliveryMethod?.address?.address2}
            </span>{" "}
            <br />
            <span>{contract?.deliveryMethod?.address?.zip}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.city}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.province}</span>{" "}
            <span>{contract?.deliveryMethod?.address?.country}</span>
          </div>

          <div>
            <b>Payment Method</b> <br />
            <img
              src={getCardImage(
                contract?.customerPaymentMethod?.instrument?.brand,
              )}
              alt={`${contract?.customerPaymentMethod?.instrument?.brand}`}
            />
            <span>
              ●●●●●●●●●●●
              {contract?.customerPaymentMethod?.instrument?.lastDigits}
            </span>
            <br />
            <span>
              Expires:{" "}
              {contract?.customerPaymentMethod?.instrument?.expiryMonth}
            </span>
            /
            <span>
              {contract?.customerPaymentMethod?.instrument?.expiryYear}
            </span>
          </div>
        </div>
        {preview?.nextOrder?.lineItems?.length > 0 && (
          <Card>
            <p>
              <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
              <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <b>Next Order (Cycle #{preview?.nextOrder?.cycleIndex})</b>
              {contract?.status !== "CANCELLED" && hasAnyDiscount && (
                <>
                  <Button
                    onClick={handleRemoveAllDiscounts}
                    loading={isThisActionPending("remove_all_discounts")}
                    disabled={isThisActionPending("remove_all_discounts")}
                  >
                    Remove All discount
                  </Button>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={discountForm.type}
                      onChange={(e) =>
                        setDiscountForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      <option value="PERCENTAGE">% off</option>
                      <option value="FIXED_AMOUNT">Fixed price</option>
                      <option value="AMOUNT">Amount off</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Value"
                      value={discountForm.value}
                      onChange={(e) =>
                        setDiscountForm((f) => ({
                          ...f,
                          value: e.target.value,
                        }))
                      }
                      style={{ width: "80px" }}
                    />
                    <Button
                      onClick={handleApplyAllDiscounts}
                      loading={isThisActionPending("apply_all_discounts")}
                    >
                      Apply to all
                    </Button>
                  </div>
                </>
              )}
            </div>
            {preview.nextOrder.lineItems.map((li, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: "5px",
                  marginBottom: "5px",
                  padding: "10px",
                  border: "2px solid gray",
                  borderRadius: "20px",
                }}
              >
                {li.imageUrl && (
                  <img
                    src={li.imageUrl}
                    alt={li.imageAlt}
                    width={60}
                    height={60}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <p>{li.title}</p>

                  {li.productId && <p>Product ID: {li.productId}</p>}
                  {li.variantId && <p>Variant ID: {li.variantId}</p>}

                  <p>
                    Qty: {li.quantity} • {li.pricePerUnit?.amount}{" "}
                    {li.pricePerUnit?.currencyCode} × {li.quantity} ={" "}
                    {li.itemTotal?.amount} {li.itemTotal?.currencyCode}
                  </p>

                  {contract?.status !== "CANCELLED" && li.discountLabel && (
                    <p>
                      {li.discountLabel}{" "}
                      <Button
                        plain
                        onClick={() => handleRemoveLineDiscount(li)}
                        loading={isThisActionPending("remove_line_discount", {
                          isBaseLine: li.isBaseLine ? "true" : "false",
                          discountPhase: li.discountPhase || "",
                          automationCycleIndex:
                            li.automationCycleIndex != null
                              ? String(li.automationCycleIndex)
                              : "",
                          automationActionIndex:
                            li.automationActionIndex != null
                              ? String(li.automationActionIndex)
                              : "",
                          productId: li.productId || "",
                          variantId: li.variantId || "",
                        })}
                        disabled={isThisActionPending("remove_line_discount", {
                          isBaseLine: li.isBaseLine ? "true" : "false",
                          discountPhase: li.discountPhase || "",
                          automationCycleIndex:
                            li.automationCycleIndex != null
                              ? String(li.automationCycleIndex)
                              : "",
                          automationActionIndex:
                            li.automationActionIndex != null
                              ? String(li.automationActionIndex)
                              : "",
                          productId: li.productId || "",
                          variantId: li.variantId || "",
                        })}
                      >
                        Remove discount
                      </Button>
                    </p>
                  )}
                  {!li.discountLabel && (
                    <div style={{ marginTop: "6px" }}>
                      {openLineDiscount === idx ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <select
                            value={getLineDiscountForm(idx).type}
                            onChange={(e) =>
                              setLineDiscountForm(idx, { type: e.target.value })
                            }
                          >
                            <option value="PERCENTAGE">% off</option>
                            <option value="FIXED_AMOUNT">Fixed price</option>
                            <option value="AMOUNT">Amount off</option>
                          </select>
                          <input
                            type="number"
                            placeholder="Value"
                            value={getLineDiscountForm(idx).value}
                            onChange={(e) =>
                              setLineDiscountForm(idx, {
                                value: e.target.value,
                              })
                            }
                            style={{ width: "80px" }}
                          />
                          <Button
                            onClick={() => handleApplyLineDiscount(li, idx)}
                            loading={isThisActionPending(
                              "apply_line_discount",
                              {
                                isBaseLine: li.isBaseLine ? "true" : "false",
                                automationCycleIndex:
                                  li.automationCycleIndex != null
                                    ? String(li.automationCycleIndex)
                                    : "",
                                automationActionIndex:
                                  li.automationActionIndex != null
                                    ? String(li.automationActionIndex)
                                    : "",
                              },
                            )}
                          >
                            Apply
                          </Button>
                          <Button
                            plain
                            onClick={() => setOpenLineDiscount(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button plain onClick={() => setOpenLineDiscount(idx)}>
                          Add discount
                        </Button>
                      )}
                    </div>
                  )}
                  {li.automationCycleIndex != null &&
                  li.automationActionIndex != null &&
                  totalLineItemsCount > 1 ? (
                    <Button
                      onClick={() =>
                        handleRemoveAutomationItem({
                          automationCycleIndex: li.automationCycleIndex,
                          automationActionIndex: li.automationActionIndex,
                          variantId: li.variantId,
                        })
                      }
                      loading={isThisActionPending("remove_automation_item", {
                        automationCycleIndex: li.automationCycleIndex,
                        automationActionIndex: li.automationActionIndex,
                        variantId: li.variantId || "",
                      })}
                      disabled={isThisActionPending("remove_automation_item", {
                        automationCycleIndex: li.automationCycleIndex,
                        automationActionIndex: li.automationActionIndex,
                        variantId: li.variantId || "",
                      })}
                    >
                      Remove
                    </Button>
                  ) : (
                    li.isBaseLine &&
                    totalLineItemsCount > 1 && (
                      <Button
                        onClick={() =>
                          handleRemoveBaseLine({
                            productId: li.productId,
                            variantId: li.variantId,
                          })
                        }
                        loading={isThisActionPending("remove_base_line", {
                          productId: li.productId || "",
                          variantId: li.variantId || "",
                        })}
                        disabled={isThisActionPending("remove_base_line", {
                          productId: li.productId || "",
                          variantId: li.variantId || "",
                        })}
                      >
                        Remove
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
        <Card>
          <b>Payment Summary</b>

          <p>
            Subtotal:-
            {currencySymbol(
              preview?.nextOrder?.calculatedOrderTotal?.currencyCode,
            )}{" "}
            {preview?.nextOrder?.calculatedOrderTotal?.amount}
          </p>

          {preview?.nextOrder?.shipping && (
            <p>
              Shipping:-{" "}
              {preview.nextOrder.shipping.calculatedPrice?.amount !==
                preview.nextOrder.shipping.originalPrice?.amount && (
                <span>
                  {currencySymbol(
                    preview.nextOrder.shipping.originalPrice?.currencyCode,
                  )}{" "}
                  {preview.nextOrder.shipping.originalPrice?.amount}{" "}
                </span>
              )}{" "}
              =
              {currencySymbol(
                preview.nextOrder.shipping.calculatedPrice?.currencyCode,
              )}{" "}
              {preview.nextOrder.shipping.calculatedPrice?.amount}
              {preview.nextOrder.shipping.discountLabel && (
                <span style={{ marginLeft: "6px" }}>
                  ({preview.nextOrder.shipping.discountLabel})
                </span>
              )}
            </p>
          )}

          <p>
            <b>
              Total:-{" "}
              {currencySymbol(
                preview?.nextOrder?.calculatedOrderTotal?.currencyCode,
              )}{" "}
              {(
                Number(preview?.nextOrder?.calculatedOrderTotal?.amount || 0) +
                Number(
                  preview?.nextOrder?.shipping?.calculatedPrice?.amount || 0,
                )
              ).toFixed(2)}
            </b>
          </p>
        </Card>
        {contract?.status !== "CANCELLED" && (
          <Card>
            <b>Upcoming orders</b>
            {upcomingCycles
              ?.slice(0, visibleCyclesCount)
              .map((cycle, index) => (
                <div
                  key={cycle.cycleIndex ?? index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <p>
                    {formateDate(cycle.billingAttemptExpectedDate)}{" "}
                    {cycle.skipped && <span>(Skipped)</span>}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "center",
                    }}
                  >
                    {!cycle.skipped &&
                      (editingCycleIndex === cycle.cycleIndex ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <input
                            type="date"
                            value={editDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                          <Button
                            onClick={() => handleReschedule(cycle)}
                            loading={isThisActionPending("reschedule", {
                              cycleIndex: cycle.cycleIndex,
                            })}
                            disabled={isThisActionPending("reschedule", {
                              cycleIndex: cycle.cycleIndex,
                            })}
                          >
                            {isThisActionPending("reschedule", {
                              cycleIndex: cycle.cycleIndex,
                            })
                              ? "Saving…"
                              : "Save"}
                          </Button>
                          <Button
                            plain
                            disabled={isThisActionPending("reschedule", {
                              cycleIndex: cycle.cycleIndex,
                            })}
                            onClick={() => {
                              setEditingCycleIndex(null);
                              setEditDate("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setEditingCycleIndex(cycle.cycleIndex);
                            setEditDate("");
                          }}
                        >
                          Edit
                        </Button>
                      ))}

                    {contract?.status === "ACTIVE" && !cycle.skipped && (
                      <Button
                        plain
                        loading={isThisActionPending("skip", {
                          cycleIndex: cycle.cycleIndex,
                        })}
                        disabled={isThisActionPending("skip", {
                          cycleIndex: cycle.cycleIndex,
                        })}
                        onClick={() => {
                          fetcher.submit(
                            {
                              type: "skip",
                              cycleIndex: cycle.cycleIndex,
                            },
                            { method: "post" },
                          );
                        }}
                      >
                        Skip
                      </Button>
                    )}
                    {contract?.status === "ACTIVE" && cycle.skipped && (
                      <Button
                        plain
                        loading={isThisActionPending("unskip", {
                          cycleIndex: cycle.cycleIndex,
                        })}
                        disabled={isThisActionPending("unskip", {
                          cycleIndex: cycle.cycleIndex,
                        })}
                        onClick={() => {
                          fetcher.submit(
                            {
                              type: "unskip",
                              cycleIndex: cycle.cycleIndex,
                            },
                            { method: "post" },
                          );
                        }}
                      >
                        Resume
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            {upcomingCycles?.length > visibleCyclesCount && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "12px",
                }}
              >
                <Button
                  onClick={() => setVisibleCyclesCount((count) => count + 5)}
                  plain
                >
                  View more
                </Button>
              </div>
            )}
          </Card>
        )}
        <div>
          <b>Internal Notes</b>
          <br />
          <Button onClick={() => setShowInternalNotes(true)}>Click</Button>
          <br />
          {showInternalNotes && (
            <>
              <textarea
                value={Internalnotes}
                onChange={(e) => setInternalNotes(e.target.value)}
              ></textarea>
              <Button
                onClick={() => {
                  setShowInternalNotes(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                loading={isThisActionPending("internal")}
                disabled={isThisActionPending("internal")}
              >
                Save
              </Button>
            </>
          )}
        </div>
        <div>
          <b>Customer Notes</b>
          <br />
          <Button onClick={() => setshowCustomerNotes(true)}>Click</Button>
          <br />
          {showCustomerNotes && (
            <>
              <textarea
                value={CustomerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
              ></textarea>
              <Button
                onClick={() => {
                  setshowCustomerNotes(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustomer}
                loading={isThisActionPending("customer")}
                disabled={isThisActionPending("customer")}
              >
                Save
              </Button>
            </>
          )}
        </div>

        <Card>
          <h2>Past Orders</h2>
        </Card>
      </Page>
    </>
  );
}
