import React, { useState } from "react";
import { useNavigate, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { COUNTRIES } from "../utils/countries";
import {
  Card,
  Page,
  TextField,
  Button,
  Banner,
  Checkbox,
  Select,
} from "@shopify/polaris";
import Product from "./Product";

function generateTimeOptions() {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of [0, 30]) {
      const period = hour < 12 ? "AM" : "PM";
      let displayHour = hour % 12;
      if (displayHour === 0) displayHour = 12;
      const displayMin = min === 0 ? "00" : "30";
      const label = `${displayHour}:${displayMin} ${period}`;
      const value = `${String(hour).padStart(2, "0")}:${displayMin}`;
      times.push({ label, value });
    }
  }
  return times;
}

const discountTypeOptions = [
  { label: "Percentage off", value: "PERCENTAGE" },
  { label: "Amount off", value: "FIXED_AMOUNT" },
  { label: "Fixed price", value: "PRICE" },
];

// COUNTRIES ko Select ke liye {label, value} shape me normalize karo
// (handles: array of strings, or array of objects with name/code or label/value)
const countryOptions = [
  { label: "Select country", value: "" },
  ...COUNTRIES.map((c) => {
    if (typeof c === "string") {
      return { label: c, value: c };
    }
    return {
      label: c.label || c.name || c.value || c.code || "",
      value: c.value || c.name || c.code || c.label || "",
    };
  }),
];

function CreateSubscription({ currencyCode, shop }) {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const API = import.meta.env.VITE_API_URL;
  const SECRET_KEY = import.meta.env.VITE_API_SECRET_KEY;

  const customerSearchFetcher = useFetcher();

  const timeOptions = generateTimeOptions();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const [nextOrderDate, setNextOrderDate] = useState(minDate);
  const [nextOrderTime, setNextOrderTime] = useState(timeOptions[0].value);
  const [billingType, setBillingType] = useState("PAY_AS_YOU_GO");
  const [intervalCount, setIntervalCount] = useState(1);
  const [interval, setInterval] = useState("MONTH");
  const [minOrders, setMinOrders] = useState("");
  const [maxOrders, setMaxOrders] = useState("");

  const [giveDiscount, setGiveDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [discountType, setDiscountType] = useState("PERCENTAGE");

  const [changeDiscountAfterOrders, setChangeDiscountAfterOrders] =
    useState(false);
  const [afterOrders, setAfterOrders] = useState("1");
  const [discountAmount2, setDiscountAmount2] = useState("0");
  const [discountType2, setDiscountType2] = useState("PERCENTAGE");

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productError, setProductError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("");

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");

  const [isDigitalProduct, setIsDigitalProduct] = useState(false);
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState("0");
  const [deliveryMethodTitle, setDeliveryMethodTitle] = useState("");
  const [deliveryError, setDeliveryError] = useState(null);

  const handleDiscountAmountChange = (value, type, setter) => {
    if (type === "PERCENTAGE") {
      if (value === "") {
        setter("");
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

  const handleDiscountTypeChange = (
    value,
    currentAmount,
    amountSetter,
    typeSetter,
  ) => {
    typeSetter(value);
    if (value === "PERCENTAGE" && Number(currentAmount) > 100) {
      amountSetter("100");
    }
  };

  const suffixFor = (type) => (type === "PERCENTAGE" ? "%" : currencyCode);

  const handelBack = () => {
    navigate("/app/subscriptions");
  };

  const handleOpenCustomerSearch = () => {
    setShowCustomerSearch(true);
    setCustomerSearchTerm("");
  };

  const handleCustomerSearch = () => {
    if (!customerSearchTerm.trim()) return;
    customerSearchFetcher.load(
      `?customerSearch=${encodeURIComponent(customerSearchTerm)}`,
    );
  };

  const handlePickCustomer = (customer) => {
    setCustomerId(customer.id || "");
    setCustomerEmail(customer.email || "");
    setFirstName(customer.firstName || "");
    setLastName(customer.lastName || "");
    setPhoneNumber(customer.phone || "");
    setCompany(customer.defaultAddress?.company || "");

    setAddress1(customer.defaultAddress?.address1 || "");
    setAddress2(customer.defaultAddress?.address2 || "");
    setCity(customer.defaultAddress?.city || "");
    setProvince(customer.defaultAddress?.province || "");
    setZip(customer.defaultAddress?.zip || "");
    setCountry(customer.defaultAddress?.country || "");

    const methods =
      customer.paymentMethods?.edges?.map((edge) => edge.node) || [];

    setPaymentMethods(methods);

    if (methods.length > 0) {
      setSelectedPaymentMethod(methods[0].id);
    }

    setShowCustomerSearch(false);
    setCustomerSearchTerm("");
  };

  const customerSearchResults = customerSearchFetcher.data?.customers || [];
  const customerSearchLoading = customerSearchFetcher.state === "loading";
  const customerSearchError =
    customerSearchFetcher.data && customerSearchFetcher.data.success === false
      ? customerSearchFetcher.data.message
      : null;

  const handleSelectProducts = async () => {
    try {
      const result = await shopify.resourcePicker({
        type: "product",
        multiple: true,
        selectionIds: selectedProducts.map((p) => ({
          id: p.id,
          variants: (p.variants || []).map((v) => ({ id: v.variantsId })),
        })),
      });

      if (result) {
        const mapped = result.map((product) => {
          const rawVariants = product.variants || [];
          const productImageUrl =
            product.images?.[0]?.originalSrc || product.images?.[0]?.src || "";
          const existingProduct = selectedProducts.find(
            (p) => p.id === product.id,
          );

          const variants = rawVariants.map((v) => {
            const existingVariant = existingProduct?.variants?.find(
              (ev) => ev.variantsId === v.id,
            );
            return {
              variantsId: v.id,
              variantsTitle: v.title,
              price: v.price,
              variantImageUrl:
                v.image?.originalSrc || v.image?.url || productImageUrl,
              variantImageAlt: v.image?.altText || v.title || product.title,
              quantity: existingVariant?.quantity ?? "1",
              unitPrice: existingVariant?.unitPrice ?? v.price ?? "0",
              discountMode: existingVariant?.discountMode ?? "SELLING_PLAN",
              discountAmount: existingVariant?.discountAmount ?? "0",
              discountType: existingVariant?.discountType ?? "PERCENTAGE",
              changeDiscountAfterOrders:
                existingVariant?.changeDiscountAfterOrders ?? false,
              discountAmount2: existingVariant?.discountAmount2 ?? "0",
              afterOrders: existingVariant?.afterOrders ?? "1",
              discountType2: existingVariant?.discountType2 ?? "PERCENTAGE",
            };
          });

          return {
            id: product.id,
            title: product.title,
            ProductImage: productImageUrl,
            selectedVariantCount: rawVariants.length,
            totalVariantCount: product.totalVariants ?? rawVariants.length,
            variants,
          };
        });
        setSelectedProducts(mapped);
        setProductError(false);
      }
    } catch (err) {
      console.error("Product picker error:", err);
    }
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setProductError(true);
      return;
    }
    setProductError(false);
    setSaveError(null);
    setDeliveryError(null);

    if (isDigitalProduct) {
      const missing =
        !address1.trim() ||
        !city.trim() ||
        !province.trim() ||
        !zip.trim() ||
        !country.trim();

      if (missing) {
        const firstProductTitle = selectedProducts[0]?.title || "This product";
        setDeliveryError(`"${firstProductTitle}" requires shipping information`);
        return;
      }
    }

    const contractDetails = {
      nextOrderDate,
      nextOrderTime,
      currencyCode,
      billingType,
      intervalCount,
      interval,
      billingFrequency: intervalCount,
      billingInterval: interval,
      minOrders,
      maxOrders,
      giveDiscount,
      discountAmount,
      discountType,
      changeDiscountAfterOrders,
      afterOrders,
      discountAmount2,
      discountType2,
    };

    const selectedCard = paymentMethods.find(
      (pm) => pm.id === selectedPaymentMethod,
    );

    const paymentMethod = selectedCard
      ? {
          id: selectedCard.id,
          name: selectedCard.instrument?.name || "",
          brand: selectedCard.instrument?.brand || "",
          lastDigits: selectedCard.instrument?.lastDigits || "",
          expiryMonth: selectedCard.instrument?.expiryMonth || "",
          expiryYear: selectedCard.instrument?.expiryYear || "",
        }
      : null;

    const customer = {
      customerId,
      customerEmail,
      firstName,
      lastName,
      phoneNumber,
      company,
      paymentMethod,
    };

    const delivery = {
      isDigitalProduct,
      address1: isDigitalProduct ? address1 : "",
      address2: isDigitalProduct ? address2 : "",
      country: isDigitalProduct ? country : "",
      province: isDigitalProduct ? province : "",
      city: isDigitalProduct ? city : "",
      zip: isDigitalProduct ? zip : "",
      deliveryPrice,
      deliveryMethodTitle,
    };

    const payload = {
      shop,
      contractDetails,
      customer,
      delivery,
      products: selectedProducts,
    };

    setIsSaving(true);
    try {
      const response = await fetch(`${API}/specific-subscription/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": SECRET_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        setSaveSuccess(true);
        navigate("/app/subscriptions");
      } else {
        setSaveError(data.message || "Something went wrong while saving.");
      }
    } catch (err) {
      console.error("Save subscription error:", err);
      setSaveError("Could not reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Page
      title="Create subscription"
      backAction={{
        content: "Subscription",
        onAction: handelBack,
      }}
    >
      <Card>
        {saveError && (
          <Banner tone="critical">
            <p>{saveError}</p>
          </Banner>
        )}
        {saveSuccess && (
          <Banner tone="success">
            Subscription contract created successfully.
          </Banner>
        )}

        <h2>Contract details</h2>
        <div>
          <h2>Status</h2>
          <input type="text" value="pause" disabled />
          <h2>You will be able to activate the contract after it is created.</h2>
        </div>

        <div>
          <h2>Next order date</h2>
          <input
            type="date"
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
            value={billingType}
            onChange={(e) => setBillingType(e.target.value)}
          >
            <option value="PAY_AS_YOU_GO">Pay as you go</option>
          </select>
        </div>

        <div>
          <TextField
            label="Delivery frequency"
            type="number"
            min={1}
            value={String(intervalCount)}
            onChange={(value) => setIntervalCount(Number(value))}
          />
        </div>

        <div>
          <h2>Delivery interval</h2>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
          >
            <option value="DAY">Days</option>
            <option value="WEEK">Weeks</option>
            <option value="MONTH">Months</option>
            <option value="YEAR">Years</option>
          </select>
        </div>

        <div>
          <TextField
            label="Billing frequency"
            type="number"
            value={String(intervalCount)}
            disabled
          />
          
        </div>
sssewqdwdwe
        <div>s
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

        <div
          style={{
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid #e1e1e1",
          }}
        >
          <h2 style={{ fontWeight: "bold" }}>Selling Plan Discount</h2>

          <Checkbox
            label="Give discount"
            checked={giveDiscount}
            onChange={(checked) => setGiveDiscount(checked)}
          />

          {giveDiscount && (
            <>
              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Discount amount"
                    type="number"
                    min={0}
                    max={discountType === "PERCENTAGE" ? 100 : undefined}
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
                      handleDiscountTypeChange(
                        value,
                        discountAmount,
                        setDiscountAmount,
                        setDiscountType,
                      )
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <Checkbox
                  label="Change discount after specific number of orders"
                  checked={changeDiscountAfterOrders}
                  onChange={(checked) => setChangeDiscountAfterOrders(checked)}
                />
              </div>

              {changeDiscountAfterOrders && (
                <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label="Discount amount"
                      type="number"
                      min={0}
                      max={discountType2 === "PERCENTAGE" ? 100 : undefined}
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
                        handleDiscountTypeChange(
                          value,
                          discountAmount2,
                          setDiscountAmount2,
                          setDiscountType2,
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <div style={{ marginTop: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "8px",
          }}
        >
          <Button onClick={handleSelectProducts} variant="plain">
            Select products
          </Button>
        </div>
        <Product
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          editPlandData={false}
          shop={shop}
          productError={productError}
          currencyCode={currencyCode}
          showOrderOptions={true}
        />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>Customer</h2>
          <Button onClick={handleOpenCustomerSearch} variant="plain">
            Select customer
          </Button>
        </div>

        {showCustomerSearch && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Search by name, email or phone"
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCustomerSearch();
                }}
              />
              <Button onClick={handleCustomerSearch} loading={customerSearchLoading}>
                Search
              </Button>
              <Button onClick={() => setShowCustomerSearch(false)} variant="plain">
                Cancel
              </Button>
            </div>

            {customerSearchError && (
              <Banner tone="critical">
                <p>{customerSearchError}</p>
              </Banner>
            )}

            {customerSearchResults.length > 0 && (
              <ul>
                {customerSearchResults.map((customer) => (
                  <li key={customer.id}>
                    <button type="button" onClick={() => handlePickCustomer(customer)}>
                      {(customer.firstName || "") + " " + (customer.lastName || "")} -{" "}
                      {customer.email || customer.phone}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!customerSearchLoading &&
              customerSearchFetcher.data &&
              customerSearchTerm &&
              customerSearchResults.length === 0 &&
              !customerSearchError && <p>No customers found.</p>}
          </div>
        )}

        {paymentMethods.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <h2>Payment Method</h2>
            <Select
              options={paymentMethods.map((pm) => ({
                label: `${pm.instrument.name || "Card"} - •••• •••• •••• ${pm.instrument.lastDigits} (${pm.instrument.brand})`,
                value: pm.id,
              }))}
              value={selectedPaymentMethod}
              onChange={setSelectedPaymentMethod}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <h2>Customer ID</h2>
            <input type="text" value={customerId} disabled />
          </div>
          <div style={{ flex: 1 }}>
            <h2>Customer email</h2>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <h2>First name</h2>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h2>Last name</h2>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <h2>Phone number</h2>
            <input
              type="text"
              placeholder="e.g. +1234567890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <h2>Company</h2>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
        </div>

        <h2 style={{ fontWeight: "bold" }}>Delivery</h2>

        <Checkbox
          label="Digital product"
          checked={isDigitalProduct}
          onChange={(checked) => setIsDigitalProduct(checked)}
        />

        {isDigitalProduct && (
          <>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Address 1"
                  value={address1}
                  onChange={(value) => setAddress1(value)}
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Address 2"
                  value={address2}
                  onChange={(value) => setAddress2(value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <div style={{ flex: 1 }}>
                <Select
                  label="Country"
                  options={countryOptions}
                  value={country}
                  onChange={(value) => setCountry(value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Province"
                  value={province}
                  onChange={(value) => setProvince(value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="City"
                  value={city}
                  onChange={(value) => setCity(value)}
                  autoComplete="off"
                />
              </div>
              <div style={{ flex: 1 }}>
                <TextField
                  label="Zip"
                  value={zip}
                  onChange={(value) => setZip(value)}
                  autoComplete="off"
                />
              </div>
            </div>

            {deliveryError && (
              <div style={{ marginTop: "12px" }}>
                <Banner tone="critical">
                  <p>{deliveryError}</p>
                </Banner>
              </div>
            )}

            <div style={{ marginTop: "12px" }}>
              <TextField
                label="Delivery price"
                type="number"
                min={0}
                prefix="₹"
                value={deliveryPrice}
                onChange={(value) => setDeliveryPrice(value)}
                autoComplete="off"
              />
            </div>

            <div style={{ marginTop: "12px" }}>
              <TextField
                label="Delivery method title"
                value={deliveryMethodTitle}
                onChange={(value) => setDeliveryMethodTitle(value)}
                autoComplete="off"
              />
            </div>
          </>
        )}
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Button primary onClick={handleSubmit} loading={isSaving}>
          Save
        </Button>
      </div>
    </Page>
  );
}

export default CreateSubscription;