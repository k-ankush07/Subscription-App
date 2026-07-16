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
// sbsdbghgchnfcjygyjgfjhgjhtg
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
    extraSettingsBySellingPlanId,
  } = useLoaderData();
  console.log("contract", contract,extraSettingsBySellingPlanId);
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
          <b>{contract.status}</b>, <b>{formateDate(contract?.createdAt)}</b> ,{" "}
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

        {contract?.status !== "CANCELLED" ? (
          <Button onClick={handleCancelSubscription}>
            Cancel Subscription
          </Button>
        ) : (
          ""
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
          <p>{nextCycleIndex}</p>
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

        <div>
          <b> Subscription details</b>
          {/* <Link to="">Edit</Link> */}
          <div>
            {lines.map((item, index) => {
              const price = getCurrentComputedPrice(item, nextCycleIndex ?? 0);
              const quantity = item?.node?.quantity;
              const Total = parseFloat(price * quantity);
              const cycleDiscounts =
                item?.node?.pricingPolicy?.cycleDiscounts || [];

              return (
                <Card key={index}>
                  <img
                    src={item?.node?.variantImage?.url}
                    alt="prodcut image"
                    width={50}
                    height={50}
                  />
                  <p>
                    {item?.node?.title} {item?.node?.variantTitle}
                  </p>
                  <p>
                    <span>
                      ProdcutId: {item?.node?.productId.split("/").pop()}
                    </span>{" "}
                    <span>
                      VariantId: {item?.node?.variantId.split("/").pop()}
                    </span>
                  </p>
                  <p>
                    {" "}
                    {/* {`${currencySymbol(currencyCode)} ${price} X ${quantity} = ${currencySymbol(currencyCode)} ${Total}`} */}
                  </p>
                  {/* {cycleDiscounts.length > 0 && (
                    <p>
                      <span>
                        {cycleDiscounts.length === 1
                          ? `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}% for all orders ` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount} for  all orders`}`
                          : `${cycleDiscounts[0]?.adjustmentValue?.percentage ? `${cycleDiscounts[0]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[0]?.adjustmentValue?.amount}`} off for the first ${cycleDiscounts[1]?.afterCycle || 1} order, then ${cycleDiscounts[1]?.adjustmentValue?.percentage ? `${cycleDiscounts[1]?.adjustmentValue?.percentage}%` : `₹${cycleDiscounts[1]?.adjustmentValue?.amount}`} off`}
                      </span>
                    </p>
                  )} */}
                  <p>
                    <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
                    <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
        <Card>
          <b>Payment Summary</b>

          <p>
            Subtotal:- {currencySymbol(currencyCode)} {grandTotal}
          </p>
          <p>
            Shipping {shippingTitle}:- {currencySymbol(currencyCode)}{" "}
            {parseFloat(shipingChargesAmount)}
          </p>
          <p>
            Total :- {currencySymbol(currencyCode)}{" "}
            {grandTotal + parseFloat(shipingChargesAmount)}{" "}
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
