import React, { useState } from 'react'
import { useNavigate, useFetcher } from 'react-router'
import { Card, Page, TextField, Button, Banner, Checkbox, Select } from '@shopify/polaris';

// ---- Time options generate karne ka function (12:00 AM - 11:30 PM, 30 min gap) ----
function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of [0, 30]) {
      const period = hour < 12 ? 'AM' : 'PM';
      let displayHour = hour % 12;
      if (displayHour === 0) displayHour = 12;
      const displayMin = min === 0 ? '00' : '30';
      const label = `${displayHour}:${displayMin} ${period}`;
      const value = `${String(hour).padStart(2, '0')}:${displayMin}`;
      times.push({ label, value });
    }
  }
  return times;
}

// ---- Shopify SellingPlanPricingPolicyAdjustmentType ke matching options ----
const discountTypeOptions = [
  { label: 'Percentage off', value: 'PERCENTAGE' },
  { label: 'Amount off', value: 'FIXED_AMOUNT' },
  { label: 'Flat price', value: 'PRICE' },
];

function CreateSubscription({ currencyCode }) {
  const navigate = useNavigate();
  const fetcher = useFetcher();

  const timeOptions = generateTimeOptions();

  // ---- Kal ki date calculate karna (min attribute ke liye) ----
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  // ---- Form state ----
  const [nextOrderDate, setNextOrderDate] = useState(minDate);
  const [nextOrderTime, setNextOrderTime] = useState(timeOptions[0].value);
  const [sellingPlanType, setSellingPlanType] = useState('pay_as_you_go');
  const [deliveryFrequency, setDeliveryFrequency] = useState('1');
  const [frequencyUnit, setFrequencyUnit] = useState('weeks');
  const [minOrders, setMinOrders] = useState('');
  const [maxOrders, setMaxOrders] = useState('');

  // ---- Selling Plan Discount state ----
  const [giveDiscount, setGiveDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [discountType, setDiscountType] = useState('PERCENTAGE');

  const [changeDiscountAfterOrders, setChangeDiscountAfterOrders] = useState(false);
  const [afterOrders, setAfterOrders] = useState('1');
  const [discountAmount2, setDiscountAmount2] = useState('0');
  const [discountType2, setDiscountType2] = useState('PERCENTAGE');

  // ---- Discount amount change handler (% ho to 100 se jyada na ho) ----
  const handleDiscountAmountChange = (value, type, setter) => {
    if (type === 'PERCENTAGE') {
      if (value === '') {
        setter('');
        return;
      }
      let num = Number(value);
      if (num > 100) num = 100;
      if (num < 0) num = 0;
      setter(String(num));
    } else {
      setter(value);
    }
  };

  // ---- Discount type change hone par agar amount 100 se zyada tha to reset karna (PERCENTAGE select karte waqt) ----
  const handleDiscountTypeChange = (value, currentAmount, amountSetter, typeSetter) => {
    typeSetter(value);
    if (value === 'PERCENTAGE' && Number(currentAmount) > 100) {
      amountSetter('100');
    }
  };

  const suffixFor = (type) => (type === 'PERCENTAGE' ? '%' : currencyCode);

  const handelBack = () => {
    navigate("/app/subscriptions")
  }

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("nextOrderDate", nextOrderDate);
    formData.append("nextOrderTime", nextOrderTime);
    formData.append("currencyCode", currencyCode);
    formData.append("sellingPlanType", sellingPlanType);
    formData.append("deliveryFrequency", deliveryFrequency);
    formData.append("frequencyUnit", frequencyUnit);
    formData.append("minOrders", minOrders);
    formData.append("maxOrders", maxOrders);

    formData.append("giveDiscount", giveDiscount);
    formData.append("discountAmount", discountAmount);
    formData.append("discountType", discountType);

    formData.append("changeDiscountAfterOrders", changeDiscountAfterOrders);
    formData.append("afterOrders", afterOrders);
    formData.append("discountAmount2", discountAmount2);
    formData.append("discountType2", discountType2);

    fetcher.submit(formData, { method: "post" });
  }

  const isSubmitting = fetcher.state === "submitting";

  return (
    <Page
      title='Create subscription'
      backAction={{
        content: 'Subscription',
        onAction: handelBack,
      }}
    >
      <Card>
        {fetcher.data?.errors && (
          <Banner tone="critical">
            {fetcher.data.errors.map((err, i) => (
              <p key={i}>{err.message}</p>
            ))}
          </Banner>
        )}
        {fetcher.data?.success && (
          <Banner tone="success">Subscription contract created successfully.</Banner>
        )}

        <h2>Contract details</h2>
        <div>
          <h2>Status</h2>
          <input type='text' value="pause" disabled />
          <h2>You will be able to activate the contract after it is created.</h2>
        </div>

        <div>
          <h2>Next order date</h2>
          <input
            type='date'
            min={minDate}
            value={nextOrderDate}
            onChange={(e) => setNextOrderDate(e.target.value)}
          />
        </div>

        <div>
          <h2>Next order time</h2>
          <select
            value={nextOrderTime}
            onChange={(e) => setNextOrderTime(e.target.value)}
          >
            {timeOptions.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2>Currency</h2>
          <select>
            <option value={currencyCode}>{currencyCode}</option>
          </select>
        </div>

        <div>
          <h2>Selling plan type</h2>
          <select
            value={sellingPlanType}
            onChange={(e) => setSellingPlanType(e.target.value)}
          >
            <option value="pay_as_you_go">Pay as you go</option>
          </select>
        </div>

        <div>
          <TextField
            label="Delivery frequency"
            type="number"
            min={1}
            value={deliveryFrequency}
            onChange={(value) => setDeliveryFrequency(value)}
          />
          <select
            value={frequencyUnit}
            onChange={(e) => setFrequencyUnit(e.target.value)}
          >
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
            <option value="years">Years</option>
          </select>
        </div>

        <div>
          <h2>Subscription orders</h2>
          <TextField
            label="minimum number of order"
            type="number"
            value={minOrders}
            onChange={(value) => setMinOrders(value)}
          />
          <TextField
            label="maximum number of order"
            type="number"
            value={maxOrders}
            onChange={(value) => setMaxOrders(value)}
          />
        </div>

        {/* ---- Selling Plan Discount ---- */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e1e1e1' }}>
          <h2 style={{ fontWeight: 'bold' }}>Selling Plan Discount</h2>

          <Checkbox
            label="Give discount"
            checked={giveDiscount}
            onChange={(checked) => setGiveDiscount(checked)}
          />

          {giveDiscount && (
            <>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Discount amount"
                    type="number"
                    min={0}
                    max={discountType === 'PERCENTAGE' ? 100 : undefined}
                    value={discountAmount}
                    onChange={(value) =>
                      handleDiscountAmountChange(value, discountType, setDiscountAmount)
                    }
                    suffix={suffixFor(discountType)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="Discount type"
                    options={discountTypeOptions}
                    value={discountType}
                    onChange={(value) =>
                      handleDiscountTypeChange(value, discountAmount, setDiscountAmount, setDiscountType)
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <Checkbox
                  label="Change discount after specific number of orders"
                  checked={changeDiscountAfterOrders}
                  onChange={(checked) => setChangeDiscountAfterOrders(checked)}
                />
              </div>

              {changeDiscountAfterOrders && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Discount amount"
                      type="number"
                      min={0}
                      max={discountType2 === 'PERCENTAGE' ? 100 : undefined}
                      value={discountAmount2}
                      onChange={(value) =>
                        handleDiscountAmountChange(value, discountType2, setDiscountAmount2)
                      }
                      suffix={suffixFor(discountType2)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="After # of orders"
                      type="number"
                      min={1}
                      value={afterOrders}
                      onChange={(value) => setAfterOrders(value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Discount type"
                      options={discountTypeOptions}
                      value={discountType2}
                      onChange={(value) =>
                        handleDiscountTypeChange(value, discountAmount2, setDiscountAmount2, setDiscountType2)
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>dsddwdewdew
{/* fdferfedwsdsdsdswwdwdwsddesdsafsdewdedeefwdwddsddsdefeffdecdewedwdddwdwede fcdfdsfddxsdsadsadsaewdsdseddesdcsefdef*/}
      </Card>
    </Page>
  )
}

export default CreateSubscription