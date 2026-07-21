import { Banner, Button, Card, Page, Icon, Checkbox } from "@shopify/polaris";
import React, { useEffect, useState } from "react";
import { currencySymbol } from "../utils/formatMoney.js";
import {
  Link,
  useNavigate,
  useParams,
  useFetcher,
  useLoaderData,
} from "react-router";

function getCurrentComputedPrice(item, currentCycleIndex) {
  const discounts = item?.node?.pricingPolicy?.cycleDiscounts || [];
  if (discounts.length === 0) {
    return parseFloat(item?.node?.currentPrice?.amount || 0);
  }
  const applicable = discounts
    .filter((d) => d.afterCycle <= currentCycleIndex)
    .sort((a, b) => b.afterCycle - a.afterCycle)[0];

  if (!applicable) {
    return parseFloat(item?.node?.currentPrice?.amount || 0);
  }

  return parseFloat(
    applicable.computedPrice?.amount ?? item?.node?.currentPrice?.amount ?? 0,
  );
}

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
  const { contract, upcomingCycles, internalNotes, customerNotes, preview } =
    useLoaderData();
  console.log(
    "contract",
    contract,
    "upcoming orders",
    upcomingCycles,
    "preview",
    preview,
  );
  const [localLines, setLocalLines] = useState(contract?.lines?.edges || []);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [Internalnotes, setInternalNotes] = useState(internalNotes || "");
  const [showCustomerNotes, setshowCustomerNotes] = useState(false);
  const [CustomerNotes, setCustomerNotes] = useState(customerNotes || "");
  const [editingCycleIndex, setEditingCycleIndex] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [visibleCyclesCount, setVisibleCyclesCount] = useState(5);
  const { id } = useParams();
  const fetcher = useFetcher();

  const lines = localLines;
  const currencyCode = lines?.[0]?.node?.currentPrice?.currencyCode;
  const nextUpcomingCycle =
    upcomingCycles?.find((cycle) => !cycle.skipped) ?? null;
  const nextCycleIndex = nextUpcomingCycle?.cycleIndex ?? null;
  const nextCycleDate = nextUpcomingCycle?.billingAttemptExpectedDate ?? null;
  const orderEdges = contract?.orders?.edges || [];
  const latestOrder =
    orderEdges.length > 0 ? orderEdges[orderEdges.length - 1].node : null;
  const shipingChargesAmount =
    latestOrder?.totalShippingPriceSet?.shopMoney?.amount || 0;
  const shippingTitle = latestOrder?.shippingLine?.title || "";

  useEffect(() => {
    setInternalNotes(internalNotes || "");
    setCustomerNotes(customerNotes || "");
  }, [internalNotes, customerNotes]);
  useEffect(() => {
    setLocalLines(contract?.lines?.edges || []);
  }, [contract]);

  const navigate = useNavigate();
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

  const grandTotal = lines?.reduce((sum, item) => {
    const price = getCurrentComputedPrice(item, nextCycleIndex ?? 0);
    const quantity = item?.node?.quantity || 0;
    return sum + price * quantity;
  }, 0);

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

  useEffect(() => {
    setLocalLines(contract?.lines?.edges || []);
    setVisibleCyclesCount(5); // naya contract load hone par wapas 5 pe reset
  }, [contract]);
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
        {nextCycleIndex != null && (
          <Button
            onClick={() => {
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
            disabled={fetcher.state !== "idle"}
            tone="success"
          >
            Charge Now
          </Button>
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
            {/* <p> {formateDate(preview?.nextOrder?.expectedDate)}</p> */}
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

        {/* {contract?.status !== "CANCELLED" &&
          preview?.nextOrder?.willApply?.length > 0 && (
            <Card>
              <p>
                <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
                <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
              </p>
              <b>
                Changes coming in next order (Cycle #
                {preview?.nextOrder?.cycleIndex})
              </b>
              <div
              >
                {preview.nextOrder.willApply.map((change, idx) => {
                  if (change.type === "DISCOUNT_CHANGE") {
                    return (
                      <div
                        key={idx}
                      >
                        <b>Discount change</b>
                        <p>
                          After order #{change.after}, a{" "}
                          {change.adjustmentValue}%{" "}
                          {change.adjustmentType?.toLowerCase()} discount will
                          apply.
                        </p>
                      </div>
                    );
                  }

                  if (change.type === "VARIANT_SWAP") {
                    return (
                      <div
                        key={idx}
                      >
                        <b>Product</b>
                        <div
                        >
                          <div >
                            <img
                              src={change.imageUrl}
                              alt={change.sourceProductName}
                              width={60}
                              height={60}
                             
                            />
                            <p >
                              {change.sourceProductName}
                            </p>
                          </div>
                         <p>↓</p>
                          {change.dests?.map((dest) => (
                            <div key={dest.id} >
                              <img
                                src={dest.imageUrl}
                                alt={dest.name}
                                width={60}
                                height={60}
                               
                              />
                              <p
                              >
                                {dest.name}
                              </p>
                              {dest.variantNames?.map((vName, vIdx) => (
                                <p
                                  key={dest.variantIds?.[vIdx]}
                                  
                                >
                                  {vName}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                        <p>
                          Applies after order #{change.after}
                        </p>
                      </div>
                    );
                  }

                  if (change.type === "ADD_PRODUCT" && change.productName) {
                    return (
                      <div
                        key={idx}
                      >
                        <b>Product will be added</b>
                        <div
                          
                        >
                          <img
                            src={change.imageUrl}
                            alt={change.productName}
                            width={60}
                            height={60}
                            
                          />
                          <div>
                            <p>{change.productName}</p>
                            {change.variantName && (
                              <p >
                                {change.variantName}
                              </p>
                            )}
                            <p >
                              Qty: {change.quantity}
                            </p>
                            {change.discountEnabled && (
                              <p >
                                {change.discountValue}% {change.discountType}{" "}
                                off
                              </p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: "12px", color: "#666" }}>
                          Applies after order #{change.after}
                        </p>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </Card>
          )} */}
        {contract?.status !== "CANCELLED" &&
          preview?.nextOrder?.willApply?.length > 0 && (
            <Card>
              <p>
                <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
                <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
              </p>
              <b>
                Changes coming in next order (Cycle #
                {preview?.nextOrder?.cycleIndex})
              </b>
              <div>
                {preview.nextOrder.willApply.map((change, idx) => {
                  if (change.type === "DISCOUNT_CHANGE") {
                    return (
                      <div key={idx}>
                        <b>Discount change</b>
                        <p>
                          After order #{change.after}, a{" "}
                          {change.adjustmentValue}%{" "}
                          {change.adjustmentType?.toLowerCase()} discount will
                          apply.
                        </p>
                      </div>
                    );
                  }

                  if (change.type === "VARIANT_SWAP") {
                    return (
                      <div key={idx} style={{ marginTop: "12px" }}>
                        <b>Product</b>
                        <div>
                          <div>
                            <img
                              src={change.imageUrl}
                              alt={change.sourceProductName}
                              width={60}
                              height={60}
                            />
                            <p>{change.sourceProductName}</p>
                          </div>
                          <p>↓</p>

                          {change.dests?.map((dest) => (
                            <div key={dest.id} style={{ marginBottom: "12px" }}>
                              <img
                                src={dest.imageUrl}
                                alt={dest.name}
                                width={60}
                                height={60}
                              />
                              <p>
                                <b>{dest.name}</b>
                              </p>

                              {dest.variantNames?.map((vName, vIdx) => {
                                const variantId = dest.variantIds?.[vIdx];
                                const variantImage = dest.variantImages?.[vIdx];
                                const matchedLineItem =
                                  preview?.nextOrder?.lineItems?.find(
                                    (li) => li.variantId === variantId,
                                  );

                                return (
                                  <div
                                    key={variantId}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      marginTop: "6px",
                                      borderTop: "1px solid #eee",
                                      paddingTop: "6px",
                                    }}
                                  >
                                    <img
                                      src={variantImage}
                                      alt={vName}
                                      width={40}
                                      height={40}
                                    />
                                    <div>
                                      <p style={{ fontWeight: 500, margin: 0 }}>
                                        {vName}
                                      </p>
                                      {matchedLineItem && (
                                        <p
                                          style={{
                                            fontSize: "12px",
                                            color: "#666",
                                            margin: 0,
                                          }}
                                        >
                                          Qty: {matchedLineItem.quantity} •{" "}
                                          {matchedLineItem.pricePerUnit?.amount}{" "}
                                          {
                                            matchedLineItem.pricePerUnit
                                              ?.currencyCode
                                          }
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        <p>Applies after order #{change.after}</p>
                      </div>
                    );
                  }

                  if (change.type === "ADD_PRODUCT" && change.productName) {
                    const matchedLineItem = preview?.nextOrder?.lineItems?.find(
                      (li) => {
                        const wantedVariantId =
                          change.variantId ?? change.variantIds?.[0];
                        if (wantedVariantId)
                          return li.variantId === wantedVariantId;
                        return li.productId === change.productId;
                      },
                    );

                    return (
                      <div key={idx} style={{ marginTop: "12px" }}>
                        <b>Product will be added</b>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <img
                            src={change.imageUrl}
                            alt={change.productName}
                            width={60}
                            height={60}
                          />
                          <div>
                            <p>{change.productName}</p>
                            {change.variantName && <p>{change.variantName}</p>}
                            <p>
                              Qty:{" "}
                              {matchedLineItem?.quantity ?? change.quantity}
                            </p>
                            {matchedLineItem && (
                              <p style={{ fontSize: "12px", color: "#666" }}>
                                Price: {matchedLineItem.pricePerUnit?.amount}{" "}
                                {matchedLineItem.pricePerUnit?.currencyCode} ×{" "}
                                {matchedLineItem.quantity} ={" "}
                                {matchedLineItem.itemTotal?.amount}{" "}
                                {matchedLineItem.itemTotal?.currencyCode}
                              </p>
                            )}
                            {change.discountEnabled && (
                              <p>
                                {change.discountValue}% {change.discountType}{" "}
                                off
                              </p>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: "12px", color: "#666" }}>
                          Applies after order #{change.after}
                        </p>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
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
          {/* <p>
            Shipping {shippingTitle}:- {currencySymbol(currencyCode)}{" "}
            {parseFloat(shipingChargesAmount)}
          </p> */}
          {/* <p>
            Total :- {currencySymbol(currencyCode)}{" "}
            {grandTotal + parseFloat(shipingChargesAmount)}{" "}
          </p> */}
          {/* <p>
            Total :- {currencySymbol(currencyCode)}{" "}
            {(
              parseFloat(
                preview?.nextOrder?.calculatedOrderTotal?.amount || 0,
              ) + parseFloat(shipingChargesAmount || 0)
            ).toFixed(2)}{" "}
          </p> */}
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
