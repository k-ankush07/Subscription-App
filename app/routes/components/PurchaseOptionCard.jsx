// import React from "react";
// import { Select, Button } from "@shopify/polaris";
// import { cardStyles as styles, getSubscriptionDetails } from "../utils/purchaseCardHelpers";

// function RadioDot({ checked }) {
//   return (
//     <span style={styles.radioOuter(checked)}>
//       {checked && <span style={styles.radioInner} />}
//     </span>
//   );
// }

// function SubscriptionDetailsBlock({ activePlan }) {
//   if (!activePlan?.raw) return null;

//   return (
//     <div
//       style={{
//         ...styles.infoRow,
//         display: "block",
//         lineHeight: 1.6,
//         marginBottom: 12,
//       }}
//     >
//       <strong>Subscription details</strong>
//       <div style={{ marginTop: 6 }}>{getSubscriptionDetails(activePlan.raw)}</div>
//     </div>
//   );
// }

// function ChooseButton({ onChoose }) {
//   if (!onChoose) return null;

//   return (
//     <Button variant="primary" fullWidth onClick={onChoose}>
//       Choose
//     </Button>
//   );
// }

// function SimpleCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
//   return (
//     <div style={styles.card}>
//       {data.headerLabel && (
//         <div style={styles.headerWithLines}>
//           <span style={styles.headerLine} />
//           <span style={styles.headerText}>{data.headerLabel}</span>
//           <span style={styles.headerLine} />
//         </div>
//       )}

//       <div
//         style={selected === "onetime" ? styles.optionBoxSelected : styles.optionBoxUnselected}
//         onClick={() => onSelect("onetime")}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <RadioDot checked={selected === "onetime"} />
//             <span style={{ fontWeight: 700, fontSize: 16 }}>One time purchase</span>
//           </div>
//           <span style={{ fontWeight: 600 }}>{data.onetimePrice}</span>
//         </div>
//       </div>

//       <div
//         style={selected === "subscribe" ? styles.optionBoxSelected : styles.optionBoxUnselected}
//         onClick={() => onSelect("subscribe")}
//       >
//         <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Subscribe & save</div>

//         {data.plans.map((plan) => {
//           const planChecked = selected === "subscribe" && activePlan?.id === plan.id;

//           return (
//             <div
//               key={plan.id}
//               style={{
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//                 paddingLeft: 4,
//                 marginBottom: 10,
//               }}
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onSelect("subscribe");
//                 onSelectPlan(plan.id);
//               }}
//             >
//               <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//                 <RadioDot checked={planChecked} />
//                 <span>{plan.label}</span>
//                 {plan.discountLabel && <span style={styles.badge}>{plan.discountLabel}</span>}
//               </div>
//               <span style={{ fontWeight: 700 }}>{plan.price}</span>
//             </div>
//           );
//         })}
//       </div>

//       {selected === "subscribe" && <SubscriptionDetailsBlock activePlan={activePlan} />}

//       <ChooseButton onChoose={onChoose} />
//     </div>
//   );
// }

// function DetailedCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
//   const bannerLabel = activePlan?.discountLabel
//     ? `Save ${activePlan.discountLabel.replace(" off", "")} on every delivery`
//     : "Subscribe & save on every delivery";

//   const firstBenefit = activePlan?.discountLabel
//     ? `${activePlan.discountLabel} of all recurring orders`
//     : "Discount on all recurring orders";

//   const benefits = [firstBenefit, ...(data.benefitsTemplate || [])];

//   return (
//     <div style={styles.card}>
//       <div
//         style={selected === "onetime" ? styles.optionBoxSelected : styles.optionBoxUnselected}
//         onClick={() => onSelect("onetime")}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <RadioDot checked={selected === "onetime"} />
//             <span style={{ fontWeight: 700, fontSize: 16 }}>One time purchase</span>
//           </div>
//           <span style={{ fontWeight: 600 }}>{data.onetimePrice}</span>
//         </div>
//       </div>

//       <div
//         style={{
//           background: "#e8e8e8",
//           textAlign: "center",
//           fontWeight: 600,
//           fontSize: 13,
//           padding: "8px 0",
//           borderRadius: "8px 8px 0 0",
//         }}
//       >
//         {bannerLabel}
//       </div>

//       <div
//         style={{
//           border: `2px solid ${selected === "subscribe" ? "#111" : "#d0d0d0"}`,
//           borderRadius: "0 0 8px 8px",
//           padding: 16,
//           marginBottom: 12,
//           cursor: "pointer",
//         }}
//         onClick={() => onSelect("subscribe")}
//       >
//         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <RadioDot checked={selected === "subscribe"} />
//             <span style={{ fontWeight: 700, fontSize: 16 }}>Subscribe & save</span>
//           </div>

//           <div style={{ textAlign: "right" }}>
//             <div style={{ background: "#eee", fontWeight: 700, padding: "4px 10px", borderRadius: 4 }}>
//               {activePlan?.price}
//             </div>
//             {activePlan?.comparePrice && (
//               <div style={{ color: "#999", textDecoration: "line-through", fontSize: 13, marginTop: 2 }}>
//                 {activePlan.comparePrice}
//               </div>
//             )}
//           </div>
//         </div>

//         <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 10 }}>How subscriptions work:</div>

//         {benefits.map((benefit, index) => {
//           const isLast = index === benefits.length - 1;

//           return (
//             <div
//               key={index}
//               style={{
//                 display: "flex",
//                 alignItems: "flex-start",
//                 justifyContent: isLast ? "space-between" : "flex-start",
//                 gap: 10,
//                 marginBottom: 10,
//               }}
//             >
//               <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
//                 <span style={styles.checkCircle}>✓</span>
//                 <span>{benefit}</span>
//               </div>

//               {isLast && (
//                 <div style={{ width: 130 }} onClick={(e) => e.stopPropagation()}>
//                   <div style={{ fontSize: 13, color: "#333", marginBottom: 4 }}>Deliver every:</div>
//                   <Select
//                     label=""
//                     labelHidden
//                     options={data.plans.map((p) => ({ label: p.label, value: p.id }))}
//                     value={selectedPlanId}
//                     onChange={(value) => {
//                       onSelect("subscribe");
//                       onSelectPlan(value);
//                     }}
//                   />
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>

//       {selected !== "onetime" && <SubscriptionDetailsBlock activePlan={activePlan} />}

//       <ChooseButton onChoose={onChoose} />
//     </div>
//   );
// }

// function CompactCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
//   const checked = selected === "subscribe";

//   return (
//     <div style={{ ...styles.card, width: 300 }}>
//       <div
//         style={{ border: "2px dashed #bbb", borderRadius: 8, padding: 16, marginBottom: 12, cursor: "pointer" }}
//         onClick={() => onSelect(checked ? "none" : "subscribe")}
//       >
//         <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
//           <span
//             style={{
//               width: 20,
//               height: 20,
//               borderRadius: 4,
//               background: checked ? "#111" : "#fff",
//               border: checked ? "none" : "2px solid #999",
//               color: "#fff",
//               display: "inline-flex",
//               alignItems: "center",
//               justifyContent: "center",
//               fontSize: 13,
//               flexShrink: 0,
//               marginTop: 2,
//             }}
//           >
//             {checked && "✓"}
//           </span>

//           <div style={{ flex: 1 }}>
//             <div style={{ fontWeight: 700, fontSize: 16 }}>
//               Subscribe & save{" "}
//               {activePlan?.comparePrice && (
//                 <span style={{ color: "#999", textDecoration: "line-through", fontWeight: 400, fontSize: 14 }}>
//                   {activePlan.comparePrice}
//                 </span>
//               )}{" "}
//               <span style={{ fontWeight: 700 }}>{activePlan?.price}</span>
//             </div>

//             <div
//               style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
//               onClick={(e) => e.stopPropagation()}
//             >
//               <span style={{ color: "#555" }}>Deliver every:</span>
//               <div style={{ width: 110 }}>
//                 <Select
//                   label=""
//                   labelHidden
//                   options={data.plans.map((p) => ({ label: p.label, value: p.id }))}
//                   value={selectedPlanId}
//                   onChange={(value) => {
//                     onSelect("subscribe");
//                     onSelectPlan(value);
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {checked && <SubscriptionDetailsBlock activePlan={activePlan} />}

//       <ChooseButton onChoose={onChoose} />
//     </div>
//   );
// }


// function PurchaseOptionCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose }) {
//   if (!data) return null;

//   const props = { data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose };

//   switch (data.variant) {
//     case "simple":
//       return <SimpleCard {...props} />;
//     case "detailed":
//       return <DetailedCard {...props} />;
//     case "compact":
//     default:
//       return <CompactCard {...props} />;
//   }
// }

// export default PurchaseOptionCard;


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

// cornerRadius -> sirf border boxes ke radius par
// spacing -> border ke andar ka padding (text se border ki dooriyaan)
function useCardCustomization(customize) {
  const cornerRadius = Number(customize?.cornerRadius ?? 8);
  const spacing = Number(customize?.spacing ?? 14);
  const oneTimeLabel = customize?.oneTimePurchaseTitle?.trim() || "One time purchase";
  const subscribeLabel = customize?.subscriptionTitle?.trim() || "Subscribe & save";

  return {
    cornerRadius,
    spacing,
    // outer white wrapper — cornerRadius YAHAN apply nahi hota
    cardStyle: styles.card,
    // border boxes — yahi cornerRadius + spacing(padding) lete hain
    boxSelected: {
      ...styles.optionBoxSelected,
      borderRadius: cornerRadius,
      padding: spacing,
    },
    boxUnselected: {
      ...styles.optionBoxUnselected,
      borderRadius: cornerRadius,
      padding: spacing,
    },
    oneTimeLabel,
    subscribeLabel,
  };
}

function SimpleCard({ data, selected, activePlan, selectedPlanId, onSelect, onSelectPlan, onChoose, customize }) {
  const { cardStyle, boxSelected, boxUnselected, oneTimeLabel, subscribeLabel } = useCardCustomization(customize);
  const showBlockTitle = customize?.blockTitle?.trim();

  return (
    <div style={cardStyle}>
      {showBlockTitle && (
        <div style={styles.headerWithLines}>
          <span style={styles.headerLine} />
          <span style={styles.headerText}>{customize.blockTitle}</span>
          <span style={styles.headerLine} />
        </div>
      )}

      <div
        style={selected === "onetime" ? boxSelected : boxUnselected}
        onClick={() => onSelect("onetime")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RadioDot checked={selected === "onetime"} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{oneTimeLabel}</span>
          </div>
          <span style={{ fontWeight: 600 }}>{data.onetimePrice}</span>
        </div>
      </div>

      <div
        style={selected === "subscribe" ? boxSelected : boxUnselected}
        onClick={() => onSelect("subscribe")}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{subscribeLabel}</div>

        {data.plans.map((plan) => {
          const planChecked = selected === "subscribe" && activePlan?.id === plan.id;
          const badgeText = customize?.customLabel
            ? customize?.customLabelText?.trim()
            : plan.discountLabel;

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
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <RadioDot checked={planChecked} />
                  <span>{plan.label}</span>
                  {badgeText && <span style={styles.badge}>{badgeText}</span>}
                </div>

                {customize?.displaySellingPlanName && plan.name && (
                  <div style={{ fontSize: 12, color: "#777", marginLeft: 32, marginTop: 2 }}>
                    {plan.name}
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontWeight: 700 }}>{plan.price}</span>
                {customize?.displayCompareAtPrice && plan.comparePrice && (
                  <div style={{ color: "#999", textDecoration: "line-through", fontSize: 12 }}>
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
  const { cardStyle, boxSelected, boxUnselected, cornerRadius, spacing, oneTimeLabel, subscribeLabel } =
    useCardCustomization(customize);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RadioDot checked={selected === "onetime"} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{oneTimeLabel}</span>
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
          borderRadius: `${cornerRadius}px ${cornerRadius}px 0 0`,
        }}
      >
        {bannerLabel}
      </div>

      <div
        style={{
          border: `2px solid ${selected === "subscribe" ? "#111" : "#d0d0d0"}`,
          borderRadius: `0 0 ${cornerRadius}px ${cornerRadius}px`,
          padding: spacing,
          marginBottom: 12,
          cursor: "pointer",
        }}
        onClick={() => onSelect("subscribe")}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <RadioDot checked={selected === "subscribe"} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{subscribeLabel}</span>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ background: "#eee", fontWeight: 700, padding: "4px 10px", borderRadius: 4 }}>
              {activePlan?.price}
            </div>
            {customize?.displayCompareAtPrice && activePlan?.comparePrice && (
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
                  {customize?.displaySellingPlanName && activePlan?.name && (
                    <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>{activePlan.name}</div>
                  )}
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
  const { cardStyle, cornerRadius, spacing } = useCardCustomization(customize);
  const customBadge = customize?.customLabel ? customize?.customLabelText?.trim() : null;

  return (
    <div style={{ ...cardStyle, width: 300 }}>
      <div
        style={{
          border: "2px dashed #bbb",
          borderRadius: cornerRadius,
          padding: spacing,
          marginBottom: 12,
          cursor: "pointer",
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

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>
              {customize?.subscriptionTitle?.trim() || "Subscribe & save"}{" "}
              {customize?.displayCompareAtPrice && activePlan?.comparePrice && (
                <span style={{ color: "#999", textDecoration: "line-through", fontWeight: 400, fontSize: 14 }}>
                  {activePlan.comparePrice}
                </span>
              )}{" "}
              <span style={{ fontWeight: 700 }}>{activePlan?.price}</span>
              {customBadge && <span style={styles.badge}>{customBadge}</span>}
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

            {customize?.displaySellingPlanName && activePlan?.name && (
              <div style={{ fontSize: 11, color: "#777", marginTop: 4 }}>{activePlan.name}</div>
            )}
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