import React from "react";
import { Select, Button } from "@shopify/polaris";
import { cardStyles as styles, getSubscriptionDetails } from "../utils/purchaseCardHelpers";

function RadioDot({ checked }) {
  return (
    <span style={styles.radioOuter(checked)}>
      {checked && <span style={styles.radioInner} />}
    </span>
  );
}

function SubscriptionDetailsBlock({ activePlan }) {
  if (!activePlan?.raw) return null;

  return (
    <div
      style={{
        ...styles.infoRow,
        display: "block",
        lineHeight: 1.6,
        marginBottom: 12,
      }}
    >
      <strong>Subscription details</strong>
      <div style={{ marginTop: 6 }}>{getSubscriptionDetails(activePlan.raw)}</div>
    </div>
  );
}

function ChooseButton({ onChoose }) {
  if (!onChoose) return null;

  return (
    <Button variant="primary" fullWidth onClick={onChoose}>
      Choose
    </Button>
  );
}

function SimpleCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
  return (
    <div style={styles.card}>
      {data.headerLabel && (
        <div style={styles.headerWithLines}>
          <span style={styles.headerLine} />
          <span style={styles.headerText}>{data.headerLabel}</span>
          <span style={styles.headerLine} />
        </div>
      )}

      <div
        style={selected === "onetime" ? styles.optionBoxSelected : styles.optionBoxUnselected}
        onClick={() => onSelect("onetime")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RadioDot checked={selected === "onetime"} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>One time purchase</span>
          </div>
          <span style={{ fontWeight: 600 }}>{data.onetimePrice}</span>
        </div>
      </div>

      <div
        style={selected === "subscribe" ? styles.optionBoxSelected : styles.optionBoxUnselected}
        onClick={() => onSelect("subscribe")}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Subscribe & save</div>

        {data.plans.map((plan) => {
          const planChecked = selected === "subscribe" && activePlan?.id === plan.id;

          return (
            <div
              key={plan.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingLeft: 4,
                marginBottom: 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect("subscribe");
                onSelectPlan(plan.id);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <RadioDot checked={planChecked} />
                <span>{plan.label}</span>
                {plan.discountLabel && <span style={styles.badge}>{plan.discountLabel}</span>}
              </div>
              <span style={{ fontWeight: 700 }}>{plan.price}</span>
            </div>
          );
        })}
      </div>

      {selected === "subscribe" && <SubscriptionDetailsBlock activePlan={activePlan} />}

      <ChooseButton onChoose={onChoose} />
    </div>
  );
}

function DetailedCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
  const bannerLabel = activePlan?.discountLabel
    ? `Save ${activePlan.discountLabel.replace(" off", "")} on every delivery`
    : "Subscribe & save on every delivery";

  const firstBenefit = activePlan?.discountLabel
    ? `${activePlan.discountLabel} of all recurring orders`
    : "Discount on all recurring orders";

  const benefits = [firstBenefit, ...(data.benefitsTemplate || [])];

  return (
    <div style={styles.card}>
      <div
        style={selected === "onetime" ? styles.optionBoxSelected : styles.optionBoxUnselected}
        onClick={() => onSelect("onetime")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RadioDot checked={selected === "onetime"} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>One time purchase</span>
          </div>
          <span style={{ fontWeight: 600 }}>{data.onetimePrice}</span>
        </div>
      </div>

      <div
        style={{
          background: "#e8e8e8",
          textAlign: "center",
          fontWeight: 600,
          fontSize: 13,
          padding: "8px 0",
          borderRadius: "8px 8px 0 0",
        }}
      >
        {bannerLabel}
      </div>

      <div
        style={{
          border: `2px solid ${selected === "subscribe" ? "#111" : "#d0d0d0"}`,
          borderRadius: "0 0 8px 8px",
          padding: 16,
          marginBottom: 12,
          cursor: "pointer",
        }}
        onClick={() => onSelect("subscribe")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RadioDot checked={selected === "subscribe"} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Subscribe & save</span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ background: "#eee", fontWeight: 700, padding: "4px 10px", borderRadius: 4 }}>
              {activePlan?.price}
            </div>
            {activePlan?.comparePrice && (
              <div style={{ color: "#999", textDecoration: "line-through", fontSize: 13, marginTop: 2 }}>
                {activePlan.comparePrice}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 10 }}>How subscriptions work:</div>

        {benefits.map((benefit, index) => {
          const isLast = index === benefits.length - 1;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: isLast ? "space-between" : "flex-start",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={styles.checkCircle}>✓</span>
                <span>{benefit}</span>
              </div>

              {isLast && (
                <div style={{ width: 130 }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>Deliver every:</div>
                  <Select
                    label=""
                    labelHidden
                    options={data.plans.map((p) => ({ label: p.label, value: p.id }))}
                    value={selectedPlanId}
                    onChange={(value) => {
                      onSelect("subscribe");
                      onSelectPlan(value);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected !== "onetime" && <SubscriptionDetailsBlock activePlan={activePlan} />}

      <ChooseButton onChoose={onChoose} />
    </div>
  );
}

function CompactCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
  const checked = selected === "subscribe";

  return (
    <div style={{ ...styles.card, width: 300 }}>
      <div
        style={{ border: "2px dashed #bbb", borderRadius: 8, padding: 16, marginBottom: 12, cursor: "pointer" }}
        onClick={() => onSelect(checked ? "none" : "subscribe")}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              background: checked ? "#111" : "#fff",
              border: checked ? "none" : "2px solid #999",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            {checked && "✓"}
          </span>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              Subscribe & save{" "}
              {activePlan?.comparePrice && (
                <span style={{ color: "#999", textDecoration: "line-through", fontWeight: 400, fontSize: 14 }}>
                  {activePlan.comparePrice}
                </span>
              )}{" "}
              <span style={{ fontWeight: 700 }}>{activePlan?.price}</span>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ color: "#555" }}>Deliver every:</span>
              <div style={{ width: 110 }}>
                <Select
                  label=""
                  labelHidden
                  options={data.plans.map((p) => ({ label: p.label, value: p.id }))}
                  value={selectedPlanId}
                  onChange={(value) => {
                    onSelect("subscribe");
                    onSelectPlan(value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {checked && <SubscriptionDetailsBlock activePlan={activePlan} />}

      <ChooseButton onChoose={onChoose} />
    </div>
  );
}


function PurchaseOptionCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
  if (!data) return null;

  const props = { data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose };

  switch (data.variant) {
    case "simple":
      return <SimpleCard {...props} />;
    case "detailed":
      return <DetailedCard {...props} />;
    case "compact":
    default:
      return <CompactCard {...props} />;
  }
}

export default PurchaseOptionCard;