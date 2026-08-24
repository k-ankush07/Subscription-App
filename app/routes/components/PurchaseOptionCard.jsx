import React from "react";
import { Select, Button } from "@shopify/polaris";
import { cardStyles as styles, getSubscriptionDetails } from "../utils/purchaseCardHelpers";

function RadioDot({ checked, color = "#111" }) {
  return (
    <span style={{ ...styles.radioOuter(checked), borderColor: checked ? color : undefined }}>
      {checked && <span style={{ ...styles.radioInner, background: color }} />}
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

function useCardCustomization(customize) {
  const cornerRadius = Number(customize?.cornerRadius ?? 8);
  const spacing = Number(customize?.spacing ?? 14);
  const oneTimeLabel = customize?.oneTimePurchaseTitle?.trim() || "One time purchase";
  const subscribeLabel = customize?.subscriptionTitle?.trim() || "Subscribe & save";

  const cardColor = customize?.cardColor || "#fff";
  const selectedCardColor = customize?.selectedCardColor || cardColor;
  const borderColor = customize?.borderColor || "#111";
  const blockTitleColor = customize?.blockTitleColor || "#100e0e";
  const titleColor = customize?.titleColor || "#111";
  const priceColor = customize?.priceColor || "#000000";
  const labelBackgroundColor = customize?.labelBackgroundColor || "#e8e8e8";
  const labelTextColor = customize?.labelTextColor || "#111";

  return {
    cornerRadius,
    spacing,
    cardStyle: styles.card,
    boxSelected: {
      ...styles.optionBoxSelected,
      borderRadius: cornerRadius,
      padding: spacing,
      background: selectedCardColor,
      borderColor,
    },
    boxUnselected: {
      ...styles.optionBoxUnselected,
      borderRadius: cornerRadius,
      padding: spacing,
      background: cardColor,
    },
    oneTimeLabel,
    subscribeLabel,
    titleColor,
    priceColor,
    blockTitleColor,
    labelBackgroundColor,
    labelTextColor,
    badgeStyle: { ...styles.badge, background: labelBackgroundColor, color: labelTextColor },
    selectWrapStyle: {
      border: "none",
      borderRadius: Math.min(cornerRadius, 8),
      overflow: "hidden",
    },
    headerLineStyle: { ...styles.headerLine, background: borderColor, flexShrink: 0 },
    radioColor: borderColor,
  };
}

function SimpleCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose, customize }) {
  const {
    cardStyle,
    boxSelected,
    boxUnselected,
    oneTimeLabel,
    subscribeLabel,
    titleColor,
    priceColor,
    blockTitleColor,
    badgeStyle,
    headerLineStyle,
    radioColor,
  } = useCardCustomization(customize);
  const showBlockTitle = customize?.blockTitle?.trim();

  return (
    <div style={cardStyle}>
      {showBlockTitle && (
        <div style={{ ...styles.headerWithLines, minWidth: 0 }}>
          <span style={headerLineStyle} />
          <span
            style={{
              ...styles.headerText,
              color: blockTitleColor,
              wordBreak: "break-word",
              overflowWrap: "break-word",
              minWidth: 0,
              flex: "0 1 auto",
            }}
          >
            {customize.blockTitle}
          </span>
          <span style={headerLineStyle} />
        </div>
      )}

      <div
        style={selected === "onetime" ? boxSelected : boxUnselected}
        onClick={() => onSelect("onetime")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <RadioDot checked={selected === "onetime"} color={radioColor} />
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: titleColor,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                minWidth: 0,
              }}
            >
              {oneTimeLabel}
            </span>
          </div>
          <span style={{ fontWeight: 600, color: priceColor, whiteSpace: "nowrap", flexShrink: 0 }}>
            {data.onetimePrice}
          </span>
        </div>
      </div>

      <div
        style={selected === "subscribe" ? boxSelected : boxUnselected}
        onClick={() => onSelect("subscribe")}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: titleColor,
            marginBottom: 12,
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          {subscribeLabel}
        </div>

        {data.plans.map((plan) => {
          const planChecked = selected === "subscribe" && activePlan?.id === plan.id;
          const badgeText = customize?.customLabel
            ? customize?.customLabelText?.trim()
            : plan.discountLabel;
          const displayText = customize?.displaySellingPlanName
            ? plan.name || plan.label
            : plan.label;

          return (
            <div
              key={plan.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingLeft: 4,
                marginBottom: 10,
                gap: 12,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect("subscribe");
                onSelectPlan(plan.id);
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <RadioDot checked={planChecked} color={radioColor} />
                  <span style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                    {displayText}
                  </span>
                  {badgeText && <span style={badgeStyle}>{badgeText}</span>}
                </div>
              </div>

              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontWeight: 700, color: priceColor }}>{plan.price}</span>
                {customize?.displayCompareAtPrice && plan.comparePrice && (
                  <div style={{ color: "#000", textDecoration: "line-through", fontSize: 12 }}>
                    {plan.comparePrice}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected === "subscribe" && <SubscriptionDetailsBlock activePlan={activePlan} />}

      <ChooseButton onChoose={onChoose} />
    </div>
  );
}

function DetailedCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose, customize }) {
  const {
    cardStyle,
    boxSelected,
    boxUnselected,
    cornerRadius,
    spacing,
    oneTimeLabel,
    subscribeLabel,
    titleColor,
    priceColor,
    labelBackgroundColor,
    labelTextColor,
    badgeStyle,
    selectWrapStyle,
    radioColor,
  } = useCardCustomization(customize);

  const customBadge = customize?.customLabel ? customize?.customLabelText?.trim() : null;

  const bannerLabel =
    customBadge ||
    (activePlan?.discountLabel
      ? `Save ${activePlan.discountLabel.replace(" off", "")} on every delivery`
      : "Subscribe & save on every delivery");

  const firstBenefit = activePlan?.discountLabel
    ? `${activePlan.discountLabel} of all recurring orders`
    : "Discount on all recurring orders";

  const benefits = [firstBenefit, ...(data.benefitsTemplate || [])];

  return (
    <div style={cardStyle}>
      <div
        style={selected === "onetime" ? boxSelected : boxUnselected}
        onClick={() => onSelect("onetime")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <RadioDot checked={selected === "onetime"} color={radioColor} />
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: titleColor,
                wordBreak: "break-word",
                overflowWrap: "break-word",
                minWidth: 0,
              }}
            >
              {oneTimeLabel}
            </span>
          </div>
          <span style={{ fontWeight: 600, color: priceColor, whiteSpace: "nowrap", flexShrink: 0 }}>
            {data.onetimePrice}
          </span>
        </div>
      </div>
      <div
        style={{
          background: labelBackgroundColor,
          color: labelTextColor,
          textAlign: "center",
          fontWeight: 600,
          fontSize: 13,
          padding: "8px 0",
          borderRadius: `${cornerRadius}px ${cornerRadius}px 0 0`,
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
        {bannerLabel}
      </div>

      <div
        style={{
          ...(selected === "subscribe" ? boxSelected : boxUnselected),
          borderRadius: `0 0 ${cornerRadius}px ${cornerRadius}px`,
          marginBottom: 12,
        }}
        onClick={() => onSelect("subscribe")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <RadioDot checked={selected === "subscribe"} color={radioColor} />
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: titleColor,
                wordBreak: "break-word",
                overflowWrap: "break-word",
              }}
            >
              {subscribeLabel}
            </span>
          </div>

          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ background: "#eee", fontWeight: 700, color: priceColor, padding: "4px 10px", borderRadius: 4 }}>
              {activePlan?.price}
            </div>
            {customize?.displayCompareAtPrice && activePlan?.comparePrice && (
              <div style={{ color: "#000", textDecoration: "line-through", fontSize: 13, marginTop: 2 }}>
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
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: isLast ? "0 1 auto" : 1 }}>
                <span style={styles.checkCircle}>✓</span>
                <span style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>{benefit}</span>
              </div>

              {isLast && (
                <div style={{ width: 150, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>Deliver every:</div>
                  <div style={selectWrapStyle}>
                    <Select
                      label=""
                      labelHidden
                      options={data.plans.map((p) => ({
                        label: customize?.displaySellingPlanName ? p.name || p.label : p.label,
                        value: p.id,
                      }))}
                      value={selectedPlanId}
                      onChange={(value) => {
                        onSelect("subscribe");
                        onSelectPlan(value);
                      }}
                    />
                  </div>
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

function CompactCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose, customize }) {
  const checked = selected === "subscribe";
  const { cardStyle, cornerRadius, spacing, titleColor, priceColor, badgeStyle, radioColor , boxSelected,
    boxUnselected,} =
    useCardCustomization(customize);
  const customBadge = customize?.customLabel ? customize?.customLabelText?.trim() : null;

  return (
    <div style={{ ...cardStyle, width: 300 }}>
     <div
        style={{
          border: `2px dashed ${radioColor}`,
          borderRadius: cornerRadius,
          padding: spacing,
          marginBottom: 12,
          cursor: "pointer",
          background: checked ? boxSelected.background : boxUnselected.background,
        }}
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: titleColor,
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  minWidth: 0,
                }}
              >
                {customize?.subscriptionTitle?.trim() || "Subscribe & save"}
                {customize?.displayCompareAtPrice && activePlan?.comparePrice && (
                  <span style={{ color: "#000", textDecoration: "line-through", fontWeight: 400, fontSize: 14 }}>
                    {" "}
                    {activePlan.comparePrice}
                  </span>
                )}
                {customBadge && <span style={badgeStyle}>{customBadge}</span>}
              </span>

              <span style={{ fontWeight: 700, color: priceColor, whiteSpace: "nowrap", flexShrink: 0 }}>
                {activePlan?.price}
              </span>
            </div>

            <div
              style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ color: "#555" }}>Deliver every:</span>
              <div style={{ minWidth: 130, flexShrink: 0 }}>
                <Select
                  label=""
                  labelHidden
                  options={data.plans.map((p) => ({
                    label: customize?.displaySellingPlanName ? p.name || p.label : p.label,
                    value: p.id,
                  }))}
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

function PurchaseOptionCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose, customize }) {
  if (!data) return null;

  const props = { data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose, customize };

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