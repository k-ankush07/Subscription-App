import { Banner, Button, Card, Page, Icon, Checkbox } from "@shopify/polaris";
import React, { useEffect, useState } from "react";
import { currencySymbol } from "../utils/formatMoney.js";
import {
  Link,
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
  return new Date(date).toLocaleDateString("en-US", {
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

  const lines = localLines;
  const currencyCode = lines?.[0]?.node?.currentPrice?.currencyCode;
  const nextUpcomingCycle =
    upcomingCycles?.find((cycle) => !cycle.skipped) ?? null;
  const nextCycleIndex = nextUpcomingCycle?.cycleIndex ?? null;
  const nextCycleDate = nextUpcomingCycle?.billingAttemptExpectedDate ?? null;
  const willApplyChanges = Array.isArray(preview?.nextOrder?.willApply)
    ? preview.nextOrder.willApply
    : [];

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
  const canChargeNow = !chargeDisabledReason;

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
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
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
            <Button onClick={handlePause}>Pause</Button>
          </>
        ) : (
          <>
            {contract?.status !== "CANCELLED" && (
              <Button onClick={handleResume}>Resume</Button>
            )}
          </>
        )}
        {contract?.status !== "CANCELLED" && (
          <span title={!canChargeNow ? chargeDisabledReason : undefined}>
            <Button
              onClick={() => {
                if (!canChargeNow || nextCycleIndex == null) return;
                const confirmed = confirm(
                  `Charge this customer now for cycle #${nextCycleIndex}? This will place an order immediately.`,
                );
                if (!confirmed) return;
                fetcher.submit(
                  { type: "charge_now", cycleIndex: nextCycleIndex },
                  { method: "post" },
                );
              }}
              loading={fetcher.state !== "idle"}
              disabled={fetcher.state !== "idle" || !canChargeNow}
              tone="success"
            >
              Charge Now
            </Button>
            {!canChargeNow && (
              <div style={{ fontSize: "12px", color: "#8a8a8a" }}>
                {chargeDisabledReason}
              </div>
            )}
          </span>
        )}

        {contract?.status !== "CANCELLED" ? (
          <Button onClick={handleCancelSubscription}>
            Cancel Subscription
          </Button>
        ) : (
          ""
        )}
        {contract?.status !== "CANCELLED" && (
          <div>
            <b>Next Order</b>
            <p>{formateDate(nextCycleDate)}</p>
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
              {hasAnyDiscount && (
                <Button
                  onClick={handleRemoveAllDiscounts}
                  loading={fetcher.state !== "idle"}
                  disabled={fetcher.state !== "idle"}
                >
                  Remove All discount
                </Button>
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

                  {li.discountLabel && (
                    <p>
                      {li.discountLabel}{" "}
                      <Button
                        plain
                        onClick={() => handleRemoveLineDiscount(li)}
                        loading={fetcher.state !== "idle"}
                        disabled={fetcher.state !== "idle"}
                      >
                        Remove discount
                      </Button>
                    </p>
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
                      loading={fetcher.state !== "idle"}
                      disabled={fetcher.state !== "idle"}
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
                        loading={fetcher.state !== "idle"}
                        disabled={fetcher.state !== "idle"}
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
                            loading={fetcher.state !== "idle"}
                            disabled={fetcher.state !== "idle"}
                          >
                            {fetcher.state !== "idle" ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            plain
                            disabled={fetcher.state !== "idle"}
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
              <Button onClick={handleSave}>Save</Button>
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
              <Button onClick={handleSaveCustomer}>Save</Button>
            </>
          )}
        </div>
      </Page>
    </>
  );
}
