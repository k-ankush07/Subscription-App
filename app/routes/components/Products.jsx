import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";

import {
  Text,
  Thumbnail,
  BlockStack,
  InlineStack,
  TextField,
  Spinner,
  Icon,
  Card,
  Checkbox,
} from "@shopify/polaris";

import { ChevronDownIcon, ChevronUpIcon } from "@shopify/polaris-icons";

import { useAuthenticatedFetch } from "../utils/useAuthenticatedFetch";

const Products = forwardRef(function Products(
  {
    onPaginationChange,
    selectedItems = [],
    onSelect,
    singleSelect = false,
    singleProductVariant = false,
    hideVariants = false,
    preFilteredProducts = null, //  if passed, skip API and show only these
  },
  ref
) {
  const authenticatedFetch = useAuthenticatedFetch();

  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openProducts, setOpenProducts] = useState({});
  const [cursorStack, setCursorStack] = useState([]);
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("");

  const searchDebounceRef = useRef(null);
  const currentSearchRef = useRef("");
  const cursorRef = useRef(null);
  const cursorStackRef = useRef([]);

  // If preFilteredProducts is provided, convert and use directly — no API call
  const isFiltered = Array.isArray(preFilteredProducts) && preFilteredProducts.length > 0;

  useEffect(() => {
    if (isFiltered) {
        const firstCurrency = preFilteredProducts[0]?.currency || "";
        setCurrency(firstCurrency);
      // Convert selectedProducts shape  products shape
      const mapped = preFilteredProducts.map((p) => ({
        id: p.productId,
        title: p.productTitle,
        image: p.productImage,
        price: p.price,
        variants: (p.variantIds || []).map((vId, i) => ({
          id: vId,
          title: p.variantTitles?.[i] || `Variant ${i + 1}`,
          price: p.variantPrices?.[i] || p.price || "",
          image: p.variantImages?.[i] || p.productImage || null,
        })),
      }));
      setProducts(mapped);
      // No pagination needed
      onPaginationChange?.({
        hasPrevious: false,
        hasNext: false,
        handlePrev: () => {},
        handleNext: () => {},
      });
    } else {
      loadMore(null, "");
    }
  }, []);

  // Search filtering for preFilteredProducts mode
  const displayProducts = isFiltered
    ? products.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  useImperativeHandle(ref, () => ({
    hasPrevious: cursorStack.length > 0,
    hasNext: hasNextPage,
    handlePrev,
    handleNext,
  }));

  useEffect(() => {
    if (isFiltered) return; // skip API pagination updates
    onPaginationChange?.({
      hasPrevious: cursorStack.length > 0,
      hasNext: hasNextPage,
      handlePrev,
      handleNext,
    });
  }, [cursorStack, hasNextPage]);

  useEffect(() => {
    if (isFiltered) return; // search handled locally via displayProducts
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      currentSearchRef.current = search;
      setCursorStack([]);
      loadMore(null, search);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [search]);

  const loadMore = async (cursorValue, searchQuery) => {
    setLoading(true);
    try {
      const q =
        searchQuery !== undefined ? searchQuery : currentSearchRef.current;
      const res = await authenticatedFetch(
        `/api/products?cursor=${cursorValue || ""}&query=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      const currencyCode = data?.data?.shop?.currencyCode || "";
      setCurrency(currencyCode);
      const edges = data?.data?.products?.edges || [];
      const newProducts = edges.map((p) => ({
        id: p.node.id,
        title: p.node.title,
        image: p.node.images.edges[0]?.node?.url,
        price: p.node.variants.edges[0]?.node?.price || "0",
        variants: p.node.variants.edges.map((v) => ({
          id: v.node.id,
          title: v.node.title,
          price: v.node.price,
          image: v.node.image?.url || null,
        })),
      }));
      setProducts(newProducts);
      const lastCursor = edges[edges.length - 1]?.cursor;
      setCursor(lastCursor);
      setHasNextPage(data?.data?.products?.pageInfo?.hasNextPage);
    } catch (err) {
      console.error("ERROR:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);
  useEffect(() => {
    cursorStackRef.current = cursorStack;
  }, [cursorStack]);

  const handleNext = async () => {
    if (!hasNextPage) return;
    setCursorStack((prev) => [...prev, cursorRef.current]);
    await loadMore(cursorRef.current, currentSearchRef.current);
  };

  const handlePrev = async () => {
    const stack = [...cursorStackRef.current];
    if (stack.length === 0) return;
    stack.pop();
    const prevCursor = stack.length > 0 ? stack[stack.length - 1] : null;
    setCursorStack(stack);
    await loadMore(prevCursor, currentSearchRef.current);
  };

  // product expand 
  const toggleVariants = (productId) => {
    if (hideVariants) return;
    setOpenProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // check if whole product is selected
  const isProductSelected = (product) => {
    const selectedProduct = selectedItems.find(
      (p) => p.productId === product.id
    );

    if (!selectedProduct) return false;
    return selectedProduct.variantIds.length === product.variants.length;
  };



  // check if specific variant is selected give true and false
   const isVariantSelected = (productId, variantId) => {
    const p = selectedItems.find((p) => p.productId === productId);
    return p ? p.variantIds.includes(variantId) : false;
  };


  //whole product select and deselect 
  const toggleProduct = (product) => {
    const item = {
      productId: product.id,
      productTitle: product.title,
      productImage: product.image,
      price : product.price,
      currency: currency,
      variantIds: product.variants.map((v) => v.id),
      variantTitles: product.variants.map((v) => v.title),
      variantImages: product.variants.map((v) => v.image || product.image),
      variantPrices: product.variants.map((v) => v.price),
      totalVariants: product.variants.length,
    };
    const exists = selectedItems.find((p) => p.productId === product.id);

    if (singleSelect) {
      if (exists) {
        onSelect([]);
      } else {
        onSelect([item]);
      }
      return;
    }

    if (exists) {
      onSelect(selectedItems.filter((p) => p.productId !== product.id));
    } else {
      onSelect([...selectedItems, item]);
    }
  };


  // select specific single varient of a product
  const toggleVariant = (product, variantId) => {
    const variant = product.variants.find((v) => v.id === variantId);

    if (singleProductVariant && selectedItems.length > 0) {
      const currentProductId = selectedItems[0].productId;
      if (currentProductId !== product.id) {
        onSelect([
          {
            productId: product.id,
            productTitle: product.title,
            productImage: product.image,
            variantIds: [variantId],
            variantTitles: [variant.title],
            variantImages: [variant.image || product.image],
            totalVariants: product.variants.length,
          },
        ]);
        return;
      }
    }

    const existingProduct = selectedItems.find(
      (p) => p.productId === product.id
    );

    if (existingProduct) {
      const hasVariant = existingProduct.variantIds.includes(variantId);

      if (hasVariant) {
        const newVariantIds = existingProduct.variantIds.filter(
          (id) => id !== variantId
        );
        const newVariantTitles = (existingProduct.variantTitles || []).filter(
          (_, index) => existingProduct.variantIds[index] !== variantId
        );
        const newVariantImages = (existingProduct.variantImages || []).filter(
          (_, index) => existingProduct.variantIds[index] !== variantId
        );

        if (newVariantIds.length === 0) {
          onSelect(selectedItems.filter((p) => p.productId !== product.id));
        } else {
          onSelect(
            selectedItems.map((p) =>
              p.productId === product.id
                ? {
                    ...p,
                    variantIds: newVariantIds,
                    variantTitles: newVariantTitles,
                    variantImages: newVariantImages,
                  }
                : p
            )
          );
        }
      } else {
        onSelect(
          selectedItems.map((p) =>
            p.productId === product.id
              ? {
                  ...p,
                  variantIds: [...(p.variantIds || []), variantId],
                  variantTitles: [...(p.variantTitles || []), variant.title],
                  variantImages: [
                    ...(p.variantImages || []),
                    variant.image || product.image,
                  ],
                }
              : p
          )
        );
      }
    } else {
      onSelect([
        ...selectedItems,
        {
          productId: product.id,
          productTitle: product.title,
          productImage: product.image,
          variantIds: [variantId],
          variantTitles: [variant.title],
          variantImages: [variant.image || product.image],
        },
      ]);
    }
  };

  return (
    <Card title="Products">
      <BlockStack gap="300">
        <InlineStack gap="200">
          <div style={{ flex: 1 }}>
            <TextField
              placeholder="Search products"
              value={search}
              onChange={setSearch}
              autoComplete="off"
            />
          </div>
        </InlineStack>

        {selectedItems.length > 0 && (
          <Text tone="subdued" variant="bodySm">
            {selectedItems.length} product
            {selectedItems.length !== 1 ? "s" : ""} selected
          </Text>
        )}

        <div
          style={{
            borderTop: "1px solid #e1e3e5",
            position: "relative",
            minHeight: "200px",
          }}
        >
          {loading && (
            <>
              <div
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: "rgba(255,255,255,0.7)",
                  zIndex: 10,
                }}
              />
              <div
                style={{
                  position: "fixed",
                  top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 11,
                }}
              >
                <Spinner accessibilityLabel="Loading products" size="large" />
              </div>
            </>
          )}

          {displayProducts.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <Text tone="subdued">No items to display</Text>
            </div>
          ) : (
            displayProducts.map((product, index) => {
              const isLocked =
                singleProductVariant &&
                selectedItems.length > 0 &&
                !selectedItems.find((p) => p.productId === product.id);

              return (
                <div
                  key={product.id}
                  style={{
                    opacity: isLocked ? 0.4 : 1,
                    pointerEvents: isLocked ? "none" : "auto",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 0",
                      borderBottom:
                        index !== displayProducts.length - 1
                          ? "1px solid #e1e3e5"
                          : "none",
                    }}
                  >
                    <InlineStack align="space-between" wrap={false} gap="500">
                      <div style={{ flex: 1 }}>
                        <InlineStack gap="200" align="start" blockAlign="start" wrap={false}>
                          <div style={{ paddingTop: "2px" }}>
                            <Checkbox
                              label=""
                              checked={isProductSelected(product)}
                              onChange={() => toggleProduct(product)}
                            />
                          </div>

                          <div style={{ minWidth: "40px" }}>
                            <Thumbnail source={product.image} size="small" />
                          </div>

                          <div
                            style={{ cursor: hideVariants ? "default" : "pointer" }}
                            onClick={() => !hideVariants && toggleVariants(product.id)}
                          >
                            <BlockStack>
                              <Text fontWeight="medium">{product.title}</Text>
                              {!hideVariants && product.variants.length > 0 && (
                                <InlineStack gap="50" align="left">
                                  <div style={{ display: "inline-flex", alignItems: "center" }}>
                                    <Text tone="subdued" variant="bodySm">
                                      {product.variants.length} variants
                                    </Text>
                                    {product.variants.length > 1 && (
                                      <Icon
                                        source={
                                          openProducts[product.id]
                                            ? ChevronUpIcon
                                            : ChevronDownIcon
                                        }
                                      />
                                    )}
                                  </div>
                                </InlineStack>
                              )}
                            </BlockStack>
                          </div>
                        </InlineStack>
                      </div>

                      <div style={{ minWidth: "100px", textAlign: "right" }}>
                        <Text alignment="end">
                          {product.price} {currency}
                        </Text>
                      </div>
                    </InlineStack>
                  </div>

                  {!hideVariants &&
                    product.variants.length > 1 &&
                    openProducts[product.id] &&
                    product.variants.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          padding: "8px 0 8px 40px",
                          borderBottom: "1px solid #f1f2f3",
                        }}
                      >
                        <InlineStack align="space-between" wrap={false}>
                          <InlineStack gap="200" align="center">
                            <Checkbox
                              label=""
                              checked={isVariantSelected(product.id, v.id)}
                              onChange={() => toggleVariant(product, v.id)}
                            />
                            <Thumbnail source={v.image || product.image} size="extraSmall" />
                            <Text>{v.title}</Text>
                          </InlineStack>

                          <div style={{ minWidth: "100px", textAlign: "right" }}>
                            <Text>
                              {v.price} {currency }
                            </Text>
                          </div>
                        </InlineStack>
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>
      </BlockStack>
    </Card>
  );
});

export default Products;