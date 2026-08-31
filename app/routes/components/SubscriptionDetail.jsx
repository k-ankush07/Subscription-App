import {
  Banner,
  Button,
  Card,
  Page,
  Icon,
  Checkbox,
  Toast,
  Frame,
} from "@shopify/polaris";
import { ClipboardIcon } from "@shopify/polaris-icons";
import { Outlet } from "react-router";
import React, { useEffect, useState, useRef } from "react";
import { currencySymbol } from "../utils/formatMoney.js";
import {
  useNavigate,
  useParams,
  useFetcher,
  useLoaderData,
  useRevalidator,
} from "react-router";

import { formatDate } from "../utils/formatDate.js";

function AddDiscountModal({
  open,
  onClose,
  lineItems,
  onSubmit,
  isSubmitting,
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("PERCENTAGE");
  const [value, setValue] = useState("");
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [targetVariantId, setTargetVariantId] = useState("");
  const [limitCycles, setLimitCycles] = useState(false);
  const [cycleLimit, setCycleLimit] = useState("1");

  const canSubmit = value && (appliesToAll || targetVariantId);
  useEffect(() => {
    if (open) {
      setName("");
      setType("PERCENTAGE");
      setValue("");
      setAppliesToAll(true);
      setTargetVariantId("");
      setLimitCycles(false);
      setCycleLimit("1");
    }
  }, [open]);
  const handleApply = () => {
    onSubmit({
      name,
      adjustmentType: type,
      adjustmentValue: value,
      appliesToAll,
      variantId: appliesToAll ? null : targetVariantId,
      cycleLimit: limitCycles ? cycleLimit : null,
    });
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          width: "480px",
          maxWidth: "90%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <b>Add a discount</b>
          <span onClick={onClose} style={{ cursor: "pointer" }}>
            ✕
          </span>
        </div>
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div>
            <label>Discount name</label>
            <br />
            <input
              style={{ width: "100%" }}
              placeholder="Enter discount name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label>Discount type</label>
            <br />
            <select
              style={{ width: "100%" }}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </select>
          </div>
          <div>
            <label>{type === "PERCENTAGE" ? "Percentage (%)" : "Amount"}</label>
            <br />
            <input
              style={{ width: "100%" }}
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <label>
            <input
              type="checkbox"
              checked={appliesToAll}
              onChange={(e) => setAppliesToAll(e.target.checked)}
            />{" "}
            Applies to all line items
          </label>
          {!appliesToAll && (
            <div>
              <label>Target line item</label>
              <br />
              <select
                style={{ width: "100%" }}
                value={targetVariantId}
                onChange={(e) => setTargetVariantId(e.target.value)}
              >
                <option value="">Select a line item</option>
                {lineItems.map((li) => (
                  <option key={li.variantId} value={li.variantId}>
                    {li.title}
                    {li.variantTitle ? " | " + li.variantTitle : ""} (Qty:{" "}
                    {li.quantity})
                  </option>
                ))}
              </select>
            </div>
          )}
          <label>
            <input
              type="checkbox"
              checked={limitCycles}
              onChange={(e) => setLimitCycles(e.target.checked)}
            />{" "}
            Limit the discount to a certain amount of cycles
          </label>
          {limitCycles && (
            <div>
              <label>Recurring cycle limit (month)</label>
              <br />
              <input
                style={{ width: "100%" }}
                type="number"
                value={cycleLimit}
                onChange={(e) => setCycleLimit(e.target.value)}
              />
              <p style={{ fontSize: "12px", color: "gray" }}>
                Number of billing cycles this discount will apply to
              </p>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            padding: "16px",
            borderTop: "1px solid #eee",
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
          >
            Apply discount
          </Button>
        </div>
      </div>
    </div>
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

// function formateDate(date) {
//   if (!date) return "—";
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return "—";
//   return d.toLocaleDateString("en-US", {
//     month: "long",
//     day: "numeric",
//     year: "numeric",
//   });
// }

export default function SubscriptionDetail() {
  const {
    contract,
    upcomingCycles,
    internalNotes,
    customerNotes,
    preview,
    shop,
    pastSkippedCycles,
    pastOrders,
  } = useLoaderData();
  // console.log(
  //   // "preview",
  //   // preview,
  //   "contract",
  //   contract,
  //   // "cycle",
  //   // pastSkippedCycles,
  // );

  const [localLines, setLocalLines] = useState(contract?.lines?.edges || []);
  const [showInternalNotes, setShowInternalNotes] = useState(false);
  const [Internalnotes, setInternalNotes] = useState(internalNotes || "");
  const [showCustomerNotes, setshowCustomerNotes] = useState(false);
  const [CustomerNotes, setCustomerNotes] = useState(customerNotes || "");
  const [editingCycleIndex, setEditingCycleIndex] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [rescheduleError, setRescheduleError] = useState("");
  const [visibleCyclesCount, setVisibleCyclesCount] = useState(5);
  const [visiblePastCount, setVisiblePastCount] = useState(5);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressMode, setAddressMode] = useState("select");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressError, setAddressError] = useState("");
  const [manualAddress, setManualAddress] = useState({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "",
    phone: "",
  });
  const [toastActive, setToastActive] = useState(false);
  const toggleToast = () => setToastActive((active) => !active);
  const customerId = contract?.customer?.id?.split("/").pop();
  const shopHandle = shop?.replace(".myshopify.com", "");
  const { id } = useParams();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const lastSubmittedTypeRef = useRef(null);
  const [showAddDiscountModal, setShowAddDiscountModal] = useState(false);

  // useEffect(() => {
  //   if (fetcher.state === "idle" && fetcher.data != null) {
  //     revalidator.revalidate();

  //     if (lastSubmittedTypeRef.current === "update_address") {
  //       if (fetcher.data?.success) {
  //         setShowAddressForm(false);
  //         setAddressError("");
  //       } else {
  //         setAddressError(
  //           fetcher.data?.error || "Address update failed, please try again.",
  //         );
  //       }
  //     }
  //     if (lastSubmittedTypeRef.current === "reschedule") {
  //       if (fetcher.data?.success) {
  //         setEditingCycleIndex(null);
  //         setEditDate("");
  //       }
  //     }
  //     if (lastSubmittedTypeRef.current === "add_manual_discount") {
  //     if (fetcher.data?.success) {
  //       setShowAddDiscountModal(false);
  //     }
  //   }

  //     lastSubmittedTypeRef.current = null;
  //   }
  // }, [fetcher.state, fetcher.data]);
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data != null) {
      revalidator.revalidate();

      if (lastSubmittedTypeRef.current === "update_address") {
        if (fetcher.data?.success) {
          setShowAddressForm(false);
          setAddressError("");
        } else {
          setAddressError(
            fetcher.data?.error || "Address update failed, please try again.",
          );
        }
      }
      if (lastSubmittedTypeRef.current === "reschedule") {
        if (fetcher.data?.success) {
          setEditingCycleIndex(null);
          setEditDate("");
          setRescheduleError(""); // 👈 success pe error clear
        } else {
          setRescheduleError(
            // 👈 NAYA — failure pe error set
            fetcher.data?.error || "Reschedule failed, please try again.",
          );
        }
      }
      if (lastSubmittedTypeRef.current === "add_manual_discount") {
        if (fetcher.data?.success) {
          setShowAddDiscountModal(false);
        }
      }

      lastSubmittedTypeRef.current = null;
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
      chargeDisabledReason = `Can only charge within 24 hours of the billing date (${formatDate(
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

    const originalDate = new Date(cycle.billingAttemptExpectedDate);
    const hours = String(originalDate.getHours()).padStart(2, "0");
    const minutes = String(originalDate.getMinutes()).padStart(2, "0");

    const newDateTimeISO = new Date(
      `${editDate}T${hours}:${minutes}:00`,
    ).toISOString();

    lastSubmittedTypeRef.current = "reschedule"; // 👈 track karo
    fetcher.submit(
      {
        type: "reschedule",
        cycleIndex: cycle.cycleIndex,
        newDate: newDateTimeISO,
        originalDate: cycle.billingAttemptExpectedDate,
      },
      { method: "post" },
    );
  };
  // const handleReschedule = (cycle) => {
  //   if (!editDate) {
  //     return;
  //   }

  //   const originalDate = new Date(cycle.billingAttemptExpectedDate);
  //   const hours = String(originalDate.getHours()).padStart(2, "0");
  //   const minutes = String(originalDate.getMinutes()).padStart(2, "0");

  //   // Naya date + purana time combine karke local time se UTC ISO banao
  //   const newDateTimeISO = new Date(
  //     `${editDate}T${hours}:${minutes}:00`,
  //   ).toISOString();

  //   fetcher.submit(
  //     {
  //       type: "reschedule",
  //       cycleIndex: cycle.cycleIndex,
  //       newDate: newDateTimeISO,
  //       originalDate: cycle.billingAttemptExpectedDate,
  //     },
  //     { method: "post" },
  //   );
  //   setEditingCycleIndex(null);
  //   setEditDate("");
  // };
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
  const activeManualDiscountIds = new Set();
  preview?.nextOrder?.lineItems?.forEach((li) => {
    (li.manualDiscounts || []).forEach((d) =>
      activeManualDiscountIds.add(d.id),
    );
  });
  const manualDiscountCount = activeManualDiscountIds.size;
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
  // const handleAddManualDiscount = (payload) => {
  //   fetcher.submit(
  //     {
  //       type: "add_manual_discount",
  //       name: payload.name,
  //       adjustmentType: payload.adjustmentType,
  //       adjustmentValue: payload.adjustmentValue,
  //       appliesToAll: payload.appliesToAll ? "true" : "false",
  //       variantId: payload.variantId || "",
  //       cycleLimit: payload.cycleLimit || "",
  //       cycleIndex: preview?.nextOrder?.cycleIndex ?? 0,
  //       sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
  //     },
  //     { method: "post" },
  //   );
  //   setShowAddDiscountModal(false);
  // };
  const handleAddManualDiscount = (payload) => {
    lastSubmittedTypeRef.current = "add_manual_discount"; // 👈 NAYA
    fetcher.submit(
      {
        type: "add_manual_discount",
        name: payload.name,
        adjustmentType: payload.adjustmentType,
        adjustmentValue: payload.adjustmentValue,
        appliesToAll: payload.appliesToAll ? "true" : "false",
        variantId: payload.variantId || "",
        cycleLimit: payload.cycleLimit || "",
        cycleIndex: preview?.nextOrder?.cycleIndex ?? 0,
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };
  const handleRemoveManualDiscount = (discountId) => {
    const confirmed = confirm("Remove this discount?");
    if (!confirmed) return;
    fetcher.submit(
      {
        type: "remove_manual_discount",
        discountId,
        sellingPlanId: lines?.[0]?.node?.sellingPlanId || "",
      },
      { method: "post" },
    );
  };
  const pastEntries = [
    ...(pastOrders || []).map((order) => ({
      type: "order",
      date: order.processedAt,
      order,
    })),
    ...(pastSkippedCycles || []).map((cycle) => ({
      type: "skipped",
      date: cycle.billingAttemptExpectedDate,
      cycle,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const customerAddresses = contract?.customer?.addresses || [];
  const openAddressForm = () => {
    if (showAddressForm) {
      setShowAddressForm(false);
      setAddressError("");
      return;
    }

    const current = contract?.deliveryMethod?.address;
    if (current) {
      setManualAddress((prev) => ({
        firstName: current.firstName || "",
        lastName: current.lastName || "",
        address1: current.address1 || "",
        address2: current.address2 || "",
        city: current.city || "",
        province: current.province || "",
        zip: current.zip || "",
        country: current.country || "",
        phone: prev.phone || "",
      }));
      setAddressMode("manual");
    }
    setAddressError("");
    setShowAddressForm(true);
  };

  const handleUpdateAddress = () => {
    setAddressError("");
    lastSubmittedTypeRef.current = "update_address";

    if (addressMode === "select") {
      if (!selectedAddressId) {
        lastSubmittedTypeRef.current = null;
        return;
      }
      fetcher.submit(
        {
          type: "update_address",
          mode: "select",
          addressId: selectedAddressId,
        },
        { method: "post" },
      );
    } else {
      fetcher.submit(
        { type: "update_address", mode: "manual", ...manualAddress },
        { method: "post" },
      );
    }
  };

  const handleCopyEmail = () => {
    const email = contract?.customer?.defaultEmailAddress?.emailAddress;
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
      setToastActive(true);
    });
  };
  const handleEmailClick = () => {
    const email = contract?.customer?.defaultEmailAddress?.emailAddress;
    if (!email) return;
    navigate(`/app/subscriptions?q=${encodeURIComponent(email)}`);
  };
  useEffect(() => {
    setLocalLines(contract?.lines?.edges || []);
    setVisibleCyclesCount(5);
    setVisiblePastCount(5);
    setShowAddressForm(false);
    setAddressError("");
  }, [contract]);
  useEffect(() => {
    setInternalNotes(internalNotes || "");
    setCustomerNotes(customerNotes || "");
  }, [internalNotes, customerNotes]);
  return (
    <>
      <Frame>
        <Page backAction={{ onAction: backButton }} title={`${id}`}>
          <Outlet />
          {toastActive && (
            <Toast
              content="Email copied"
              onDismiss={toggleToast}
              duration={1500}
            />
          )}
          {contract?.status === "CANCELLED" && (
            <Banner
              title="This subscription has been cancelled."
              tone="critical"
            ></Banner>
          )}
          <div>
            <b>{preview?.status}</b>, <b>{formatDate(contract?.createdAt)}</b> ,{" "}
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
                  ? formatDate(nextCycleDate)
                  : "No upcoming billing cycle"}
              </p>
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
            <br />
            <a
              href={`https://admin.shopify.com/store/${shopHandle}/customers/${customerId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Customers Page
            </a>
            <br />
            <a
              href={`https://admin.shopify.com/store/${shopHandle}/orders?query=${encodeURIComponent(
                contract?.customer?.defaultEmailAddress?.emailAddress || "",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Customer Orders
            </a>

            <p>
              <span>
                {contract?.customer?.firstName} {contract?.customer?.lastName}
              </span>
            </p>
            {/* <span
            style={{ display: "inline-flex", alignItems: "center"}}
          >
            <span
              onClick={handleCopyEmail}
              style={{ cursor: "pointer", display: "inline-flex" }}
              title="Copy email"
            >
              <Icon source={ClipboardIcon} tone="base" />
            </span>
            {contract?.customer?.defaultEmailAddress?.emailAddress}
          </span> */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span
                onClick={handleCopyEmail}
                style={{ cursor: "pointer", display: "inline-flex" }}
                title="Copy email"
              >
                <Icon source={ClipboardIcon} tone="base" />
              </span>
              <span
                onClick={handleEmailClick}
                style={{ cursor: "pointer", textDecoration: "underline" }}
                title="View all subscriptions for this email"
              >
                {contract?.customer?.defaultEmailAddress?.emailAddress}
              </span>
            </span>
            <div>
              <b>Shipping address</b> <br />
              <a
                href={`https://admin.shopify.com/store/${shopHandle}/customers/${customerId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage Address by customer portal
              </a>
              <br />
              <Button onClick={openAddressForm}>
                {showAddressForm ? "Cancel" : "Change address"}
              </Button>
              <br />
              {showAddressForm && (
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <label>
                    <input
                      type="radio"
                      checked={addressMode === "select"}
                      onChange={() => setAddressMode("select")}
                    />{" "}
                    Customer ke saved address se select karo
                  </label>
                  {addressMode === "select" && (
                    <select
                      value={selectedAddressId}
                      onChange={(e) => setSelectedAddressId(e.target.value)}
                    >
                      <option value="">-- select address --</option>
                      {customerAddresses.map((addr) => (
                        <option key={addr.id} value={addr.id}>
                          {addr.address1}, {addr.city}, {addr.province}{" "}
                          {addr.zip}, {addr.country}
                        </option>
                      ))}
                    </select>
                  )}

                  <label>
                    <input
                      type="radio"
                      checked={addressMode === "manual"}
                      onChange={() => setAddressMode("manual")}
                    />{" "}
                    Manually address enter karo
                  </label>
                  {addressMode === "manual" && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        maxWidth: "320px",
                      }}
                    >
                      <input
                        placeholder="First name"
                        value={manualAddress.firstName}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            firstName: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Last name"
                        value={manualAddress.lastName}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            lastName: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Address line 1"
                        value={manualAddress.address1}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            address1: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Address line 2"
                        value={manualAddress.address2}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            address2: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="City"
                        value={manualAddress.city}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            city: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Province/State"
                        value={manualAddress.province}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            province: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Zip"
                        value={manualAddress.zip}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            zip: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Country"
                        value={manualAddress.country}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            country: e.target.value,
                          })
                        }
                      />
                      <input
                        placeholder="Phone (optional)"
                        value={manualAddress.phone}
                        onChange={(e) =>
                          setManualAddress({
                            ...manualAddress,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleUpdateAddress}
                    loading={isThisActionPending("update_address")}
                    disabled={isThisActionPending("update_address")}
                  >
                    {isThisActionPending("update_address")
                      ? "Updating…"
                      : "Save address"}
                  </Button>
                  {isThisActionPending("update_address") && (
                    <p style={{ color: "gray", fontSize: "12px" }}>
                      Address update please wait…
                    </p>
                  )}
                  {!isPending && addressError && (
                    <p style={{ color: "red", fontSize: "12px" }}>
                      {addressError}
                    </p>
                  )}
                </div>
              )}
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
              <a
                href={`https://admin.shopify.com/store/${shopHandle}/customers/${customerId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Manage Address by customer portal
              </a>
              <br />
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p>
                  <b>{`Delivery: Every ${contract?.deliveryPolicy?.intervalCount} ${contract?.deliveryPolicy?.interval} `}</b>
                  <b>{`Billing: every ${contract?.billingPolicy?.intervalCount} ${contract?.billingPolicy?.interval}`}</b>
                </p>

                <Button
                  onClick={() => navigate(`/app/subscription/${id}/edit`)}
                >
                  Edit
                </Button>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <b>Next Order (Cycle #{preview?.nextOrder?.cycleIndex})</b>
                {contract?.status !== "CANCELLED" && hasAnyDiscount && (
                  <Button
                    onClick={handleRemoveAllDiscounts}
                    loading={isThisActionPending("remove_all_discounts")}
                    disabled={isThisActionPending("remove_all_discounts")}
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
                    {/* <p>{li.title}</p> */}
                    <p>
                      <b>{li.title}</b>
                      {li.variantTitle && (
                        <span style={{ marginLeft: "6px" }}>
                          | {li.variantTitle}
                        </span>
                      )}
                    </p>

                    {li.productId && <p>Product ID: {li.productId}</p>}
                    {li.variantId && <p>Variant ID: {li.variantId}</p>}

                    <p>
                       {/* Qty: {li.quantity} • {currencySymbol(li.pricePerUnit?.currencyCode)}
  {li.pricePerUnit?.amount} × {li.quantity} ={" "}
  {currencySymbol(li.itemTotal?.currencyCode)}
  {li.itemTotal?.amount} */}
  Qty: {li.quantity} • {currencySymbol(li.pricePerUnit?.currencyCode)}
  {li.pricePerUnit?.amount} × {li.quantity} ={" "}
  {currencySymbol(li.itemTotal?.currencyCode)}
  {li.itemTotal?.amount}
                      {/* Qty: {li.quantity} • {li.pricePerUnit?.amount}{" "}
                      {li.pricePerUnit?.currencyCode} × {li.quantity} ={" "}
                      {li.itemTotal?.amount} {li.itemTotal?.currencyCode} */}
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
                          disabled={isThisActionPending(
                            "remove_line_discount",
                            {
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
                            },
                          )}
                        >
                          Remove discount
                        </Button>
                      </p>
                    )}
                    {contract?.status !== "CANCELLED" &&
                      li.manualDiscounts?.map((d) => (
                        <p key={d.id}>
                          {d.name} —{" "}
                          {d.adjustmentType === "PERCENTAGE"
                            ? `${d.adjustmentValue}% off`
                            : d.adjustmentType === "FIXED_PRICE"
                              ? `Fixed price: ${currencySymbol(li.pricePerUnit?.currencyCode)}${d.adjustmentValue}`
                              : `${currencySymbol(li.pricePerUnit?.currencyCode)}${d.adjustmentValue} off`}{" "}
                          <Button
                            plain
                            onClick={() => handleRemoveManualDiscount(d.id)}
                            loading={isThisActionPending(
                              "remove_manual_discount",
                              { discountId: d.id },
                            )}
                            disabled={isThisActionPending(
                              "remove_manual_discount",
                              { discountId: d.id },
                            )}
                          >
                            Remove
                          </Button>
                        </p>
                      ))}
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
                        disabled={isThisActionPending(
                          "remove_automation_item",
                          {
                            automationCycleIndex: li.automationCycleIndex,
                            automationActionIndex: li.automationActionIndex,
                            variantId: li.variantId || "",
                          },
                        )}
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
          {contract?.status !== "CANCELLED" && (
            <Card>
              <b>Discounts</b>
              <br />
              {manualDiscountCount > 0 && (
                <p>
                  {manualDiscountCount} discount
                  {manualDiscountCount > 1 ? "s" : ""} applied
                </p>
              )}
              <Button onClick={() => setShowAddDiscountModal(true)}>
                Add a discount
              </Button>
            </Card>
          )}

          <AddDiscountModal
            open={showAddDiscountModal}
            onClose={() => setShowAddDiscountModal(false)}
            lineItems={preview?.nextOrder?.lineItems || []}
            onSubmit={handleAddManualDiscount}
            isSubmitting={isThisActionPending("add_manual_discount")}
          />

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
                  Number(
                    preview?.nextOrder?.calculatedOrderTotal?.amount || 0,
                  ) +
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
                      {formatDate(cycle.billingAttemptExpectedDate)}{" "}
                      {cycle.skipped && <span>(Skipped)</span>}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center",
                      }}
                    >
                      {contract?.status === "ACTIVE" &&
                        !cycle.skipped &&
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
                              min={
                                cycle.cycleStartAt
                                  ? new Date(cycle.cycleStartAt)
                                      .toISOString()
                                      .split("T")[0]
                                  : new Date().toISOString().split("T")[0]
                              }
                              max={
                                cycle.cycleEndAt
                                  ? new Date(cycle.cycleEndAt)
                                      .toISOString()
                                      .split("T")[0]
                                  : undefined
                              }
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
                                setRescheduleError("");
                              }}
                            >
                              Cancel
                            </Button>
                            {!isPending && rescheduleError && (
                              <p
                                style={{
                                  
                                  fontSize: "12px",
                                  width: "100%",
                                }}
                              >
                                {rescheduleError}
                              </p>
                            )}
                          </div>
                        ) : (
                          // <div
                          //   style={{
                          //     display: "flex",
                          //     gap: "12px",
                          //     alignItems: "center",
                          //     flexWrap: "wrap",
                          //   }}
                          // >
                          //   <input
                          //     type="date"
                          //     value={editDate}
                          //     min={
                          //       cycle.cycleStartAt
                          //         ? new Date(cycle.cycleStartAt)
                          //             .toISOString()
                          //             .split("T")[0]
                          //         : new Date().toISOString().split("T")[0]
                          //     }
                          //     max={
                          //       cycle.cycleEndAt
                          //         ? new Date(cycle.cycleEndAt)
                          //             .toISOString()
                          //             .split("T")[0]
                          //         : undefined
                          //     }
                          //     onChange={(e) => setEditDate(e.target.value)}
                          //   />
                          //   {/* <input
                          //     type="date"
                          //     value={editDate}
                          //     min={new Date().toISOString().split("T")[0]}
                          //     onChange={(e) => setEditDate(e.target.value)}
                          //   /> */}
                          //   <Button
                          //     onClick={() => handleReschedule(cycle)}
                          //     loading={isThisActionPending("reschedule", {
                          //       cycleIndex: cycle.cycleIndex,
                          //     })}
                          //     disabled={isThisActionPending("reschedule", {
                          //       cycleIndex: cycle.cycleIndex,
                          //     })}
                          //   >
                          //     {isThisActionPending("reschedule", {
                          //       cycleIndex: cycle.cycleIndex,
                          //     })
                          //       ? "Saving…"
                          //       : "Save"}
                          //   </Button>
                          //   <Button
                          //     plain
                          //     disabled={isThisActionPending("reschedule", {
                          //       cycleIndex: cycle.cycleIndex,
                          //     })}
                          //     onClick={() => {
                          //       setEditingCycleIndex(null);
                          //       setEditDate("");
                          //       setRescheduleError("");
                          //     }}
                          //   >
                          //     Cancel
                          //   </Button>
                          // </div>
                          <Button
                            onClick={() => {
                              setEditingCycleIndex(cycle.cycleIndex);
                              setEditDate("");
                              setRescheduleError("");
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
          <Card>
            <b>Past orders</b>
            {pastEntries.length > 0 ? (
              <>
                {pastEntries.slice(0, visiblePastCount).map((entry, index) => (
                  <div
                    key={
                      entry.order?.id ??
                      `skipped-${entry.cycle?.cycleIndex ?? index}`
                    }
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {entry.type === "order" ? (
                      <>
                        <p>
                          {entry.order.name} —{" "}
                          {formatDate(entry.order.processedAt)}{" "}
                          {entry.order.cancelledAt && <span>(Cancelled)</span>}
                        </p>

                        <a
                          href={`https://admin.shopify.com/store/${shopHandle}/orders/${entry.order.id
                            ?.split("/")
                            .pop()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </a>
                      </>
                    ) : (
                      <>
                        <p>
                          {formatDate(entry.cycle.billingAttemptExpectedDate)}{" "}
                          <span>(Skipped)</span>
                        </p>
                        <span style={{ color: "gray" }}>—</span>
                      </>
                    )}
                  </div>
                ))}

                {pastEntries.length > visiblePastCount && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "12px",
                    }}
                  >
                    <Button
                      onClick={() => setVisiblePastCount((c) => c + 5)}
                      plain
                    >
                      View more
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p>No past orders yet.</p>
            )}
          </Card>
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
        </Page>
      </Frame>
    </>
  );
}
