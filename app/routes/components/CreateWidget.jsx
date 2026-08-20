import React, { useState } from "react";

function Field({ label, hint, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-medium text-gray-900 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
    />
  );
}

function Select({ value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[18px] w-[18px] accent-gray-900"
      />
      <span className="text-[13px] text-gray-800">{label}</span>
    </label>
  );
}

function Slider({ value, min, max, onChange, unit }) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-gray-900 cursor-pointer"
      />
      <div className="w-14 shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 text-center">
        {value}
        {unit}
      </div>
    </div>
  );
}

function ColorSwatch({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 shrink-0 rounded-md border border-gray-300 cursor-pointer p-0"
      />
      <span className="text-[13px] text-gray-800">{label}</span>
    </label>
  );
}

function CollapsibleRow({ label, right }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
      <span className="text-sm font-medium text-gray-900">{label} ▾</span>
      {right}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-gray-900" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[15px] font-semibold text-gray-900">{children}</h3>
      {action}
    </div>
  );
}

function WidgetCreate() {
  const [widgetName, setWidgetName] = useState("Widget #3");
  const [template, setTemplate] = useState("Radio buttons");

  const [blockTitle, setBlockTitle] = useState("");
  const [oneTimeTitle, setOneTimeTitle] = useState("One time purchase");
  const [subTitle, setSubTitle] = useState("Subscribe & save");

  const [preselectSub, setPreselectSub] = useState(true);
  const [showCompareAt, setShowCompareAt] = useState(false);
  const [showPlanName, setShowPlanName] = useState(false);
  const [customCurrency, setCustomCurrency] = useState(false);
  const [customLabel, setCustomLabel] = useState(false);

  const [cornerRadius, setCornerRadius] = useState(10);
  const [spacing, setSpacing] = useState(10);

  const defaultColors = {
    card: "#ffffff",
    selectedCard: "#ffffff",
    border: "#111111",
    blockTitle: "#111111",
    title: "#111111",
    price: "#111111",
    labelBg: "#e6e6e6",
    labelText: "#111111",
    badgeBg: "#111111",
    badgeText: "#ffffff",
  };
  const [colors, setColors] = useState(defaultColors);
  const setColor = (key) => (val) => setColors((c) => ({ ...c, [key]: val }));

  const [stickyAddToCart, setStickyAddToCart] = useState(false);
  const [cardBadge, setCardBadge] = useState(false);

  const onePrice = "Rs. 595.00";
  const subPrice = "Rs. 535.50";
  const discount = "10% off";

  return (
    <div className="min-h-screen bg-[#f6f6f7] p-6">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        {/* -------- Left: Widget editor -------- */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Widget editor
          </h2>

          <Field label="Widget name (internal)" hint="For your reference only">
            <TextInput value={widgetName} onChange={setWidgetName} />
          </Field>

          <Field label="Widget template">
            <Select
              value={template}
              onChange={setTemplate}
              options={["Radio buttons", "Dropdown", "Toggle switch"]}
            />
          </Field>

          <Field label="Plans assigned">
            <Select
              value="Plans selected (0)"
              onChange={() => {}}
              options={["Plans selected (0)"]}
            />
          </Field>

          <div className="mt-2 rounded-2xl border border-gray-200 p-4">
            <SectionTitle>Customize</SectionTitle>

            <Field label="Block title">
              <TextInput
                value={blockTitle}
                onChange={setBlockTitle}
                placeholder="e.g. Purchase options"
              />
            </Field>

            <Field label="One-time purchase option title">
              <TextInput value={oneTimeTitle} onChange={setOneTimeTitle} />
            </Field>

            <Field label="Subscription option title">
              <TextInput value={subTitle} onChange={setSubTitle} />
            </Field>

            <div className="border-t border-gray-100 pt-2 mt-1">
              <Checkbox
                label="Preselect subscription option"
                checked={preselectSub}
                onChange={setPreselectSub}
              />
              <Checkbox
                label="Display compare-at price"
                checked={showCompareAt}
                onChange={setShowCompareAt}
              />
              <Checkbox
                label="Display selling plan name"
                checked={showPlanName}
                onChange={setShowPlanName}
              />
              <Checkbox
                label="Custom currency format"
                checked={customCurrency}
                onChange={setCustomCurrency}
              />
              <Checkbox
                label="Custom label"
                checked={customLabel}
                onChange={setCustomLabel}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 p-4">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-4">
              Style
            </h3>

            <div className="grid grid-cols-2 gap-5 mb-5">
              <div>
                <p className="text-[13px] font-medium text-gray-900 mb-2">
                  Corner radius
                </p>
                <Slider
                  value={cornerRadius}
                  min={0}
                  max={30}
                  unit="px"
                  onChange={setCornerRadius}
                />
              </div>
              <div>
                <p className="text-[13px] font-medium text-gray-900 mb-2">
                  Spacing
                </p>
                <Slider
                  value={spacing}
                  min={0}
                  max={30}
                  unit=""
                  onChange={setSpacing}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-semibold text-gray-900">
                Colors
              </p>
              <button
                title="Reset colors"
                onClick={() => setColors(defaultColors)}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <ColorSwatch label="Card" value={colors.card} onChange={setColor("card")} />
              <ColorSwatch label="Selected card" value={colors.selectedCard} onChange={setColor("selectedCard")} />
              <ColorSwatch label="Border color" value={colors.border} onChange={setColor("border")} />
              <ColorSwatch label="Block title" value={colors.blockTitle} onChange={setColor("blockTitle")} />
              <ColorSwatch label="Title" value={colors.title} onChange={setColor("title")} />
              <ColorSwatch label="Price" value={colors.price} onChange={setColor("price")} />
              <ColorSwatch label="Label background" value={colors.labelBg} onChange={setColor("labelBg")} />
              <ColorSwatch label="Label text" value={colors.labelText} onChange={setColor("labelText")} />
              <ColorSwatch label="Badge background" value={colors.badgeBg} onChange={setColor("badgeBg")} />
              <ColorSwatch label="Badge text" value={colors.badgeText} onChange={setColor("badgeText")} />
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            <CollapsibleRow
              label="Sticky add to cart"
              right={<Toggle checked={stickyAddToCart} onChange={setStickyAddToCart} />}
            />
            <CollapsibleRow
              label="Card badge"
              right={<Toggle checked={cardBadge} onChange={setCardBadge} />}
            />
          </div>
        </div>

        {/* -------- Right: Preview -------- */}
        <div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
              <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50">
                Change widget template
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1.5">Plan</p>
                <Select value="Plan #1ggg" onChange={() => {}} options={["Plan #1ggg"]} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1.5">Product</p>
                <Select
                  value="Abstract Angel Paintings | Jacks..."
                  onChange={() => {}}
                  options={["Abstract Angel Paintings | Jacks..."]}
                />
              </div>
            </div>

            {/* Live widget preview */}
            <div
              className="rounded-2xl bg-[#fafafa] p-6"
              style={{ display: "flex", flexDirection: "column", gap: spacing }}
            >
              {blockTitle && (
                <p className="text-sm font-semibold" style={{ color: colors.blockTitle }}>
                  {blockTitle}
                </p>
              )}

              {/* One time option */}
              <div
                onClick={() => setPreselectSub(false)}
                className="cursor-pointer px-5 py-4"
                style={{
                  backgroundColor: preselectSub ? colors.card : colors.selectedCard,
                  border: `1.5px solid ${preselectSub ? "#d5d5d5" : colors.border}`,
                  borderRadius: cornerRadius,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: preselectSub ? "#c7c7c7" : colors.border }}
                    >
                      {!preselectSub && (
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.border }} />
                      )}
                    </span>
                    <span className="font-semibold text-[15px]" style={{ color: colors.title }}>
                      {oneTimeTitle}
                    </span>
                    {showPlanName && (
                      <span className="text-xs text-gray-400">(One-time plan)</span>
                    )}
                  </div>
                  <div className="text-right">
                    {showCompareAt && (
                      <span className="text-xs text-gray-400 line-through mr-2">
                        Rs. 650.00
                      </span>
                    )}
                    <span className="font-semibold text-[15px]" style={{ color: colors.price }}>
                      {onePrice}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscription option */}
              <div
                onClick={() => setPreselectSub(true)}
                className="cursor-pointer px-5 py-4"
                style={{
                  backgroundColor: preselectSub ? colors.selectedCard : colors.card,
                  border: `1.5px solid ${preselectSub ? colors.border : "#d5d5d5"}`,
                  borderRadius: cornerRadius,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                      style={{ borderColor: preselectSub ? colors.border : "#c7c7c7" }}
                    >
                      {preselectSub && (
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.border }} />
                      )}
                    </span>
                    <span className="font-semibold text-[15px]" style={{ color: colors.title }}>
                      {subTitle}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.labelBg, color: colors.labelText }}
                    >
                      {customLabel ? "Custom label" : discount}
                    </span>
                  </div>
                  <div className="text-right">
                    {showCompareAt && (
                      <span className="text-xs text-gray-400 line-through mr-2">
                        Rs. 650.00
                      </span>
                    )}
                    <span className="font-semibold text-[15px]" style={{ color: colors.price }}>
                      {customCurrency ? `INR ${subPrice.replace("Rs. ", "")}` : subPrice}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1.5 pl-8">
                  <span className="text-sm" style={{ color: colors.title }}>
                    Deliver every week
                  </span>
                  {cardBadge && (
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
                    >
                      Best value
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-600 pt-1">
                <span>ⓘ</span>
                <span>Subscription details</span>
              </div>
            </div>

            {stickyAddToCart && (
              <div className="mt-4 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-xs text-gray-500 text-center">
                Sticky add-to-cart bar enabled — shown at the bottom of the product page
              </div>
            )}
          </div>

          <button className="mt-4 w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white hover:bg-gray-800">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default WidgetCreate;