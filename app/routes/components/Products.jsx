

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
    Checkbox
} from "@shopify/polaris";

import {
    ChevronDownIcon,
    ChevronUpIcon,
} from "@shopify/polaris-icons";

import { useAuthenticatedFetch } from "../utils/useAuthenticatedFetch";

const Products = forwardRef(function Products(
    { onPaginationChange, selectedItems = [], onSelect, pickVariant, singleSelect = false, ...rest },
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

    useEffect(() => {
        loadMore(null, "");
    }, []);

    useImperativeHandle(ref, () => ({
        hasPrevious: cursorStack.length > 0,
        hasNext: hasNextPage,
        handlePrev,
        handleNext,
    }));

    useEffect(() => {
        onPaginationChange?.({
            hasPrevious: cursorStack.length > 0,
            hasNext: hasNextPage,
            handlePrev,
            handleNext,
        });
    }, [cursorStack, hasNextPage]);

    useEffect(() => {
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
            const q = searchQuery !== undefined ? searchQuery : currentSearchRef.current;
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

    useEffect(() => { cursorRef.current = cursor; }, [cursor]);
    useEffect(() => { cursorStackRef.current = cursorStack; }, [cursorStack]);

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

    const toggleVariants = (productId) => {
        setOpenProducts((prev) => ({
            ...prev,
            [productId]: !prev[productId],
        }));
    };

    const isProductSelected = (product) => {
        const selectedProduct = selectedItems.find(
            (p) => p.productId === product.id
        );

        if (!selectedProduct) return false;

        // Product tabhi checked hoga jab sab variants selected ho
        return (
            selectedProduct.variantIds.length === product.variants.length
        );
    };
    const isVariantSelected = (productId, variantId) => {
        const p = selectedItems.find((p) => p.productId === productId);
        return p ? p.variantIds.includes(variantId) : false;
    };

    const isProductIndeterminate = (product) => {
        const p = selectedItems.find((p) => p.productId === product.id);
        if (!p) return false;
        return p.variantIds.length > 0 && p.variantIds.length < product.variants.length;
    };



    const toggleProduct = (product) => {
        const item = {
            productId: product.id,
            productTitle: product.title,
            productImage: product.image,
            variantIds: product.variants.map((v) => v.id),
            variantTitles: product.variants.map(v => v.title),
            variantImages: product.variants.map(
                v => v.image || product.image
            ),
        };

        const exists = selectedItems.find(
            (p) => p.productId === product.id
        );

        //  SINGLE SELECT
        if (singleSelect) {
            if (exists) {
                onSelect([]);
            } else {
                onSelect([item]); // old remove, new add
            }
            return;
        }

        //  MULTI SELECT
        if (exists) {
            onSelect(
                selectedItems.filter(
                    (p) => p.productId !== product.id
                )
            );
        } else {
            onSelect([...selectedItems, item]);
        }
    };

    const toggleVariant = (product, variantId) => {
        const variant = product.variants.find((v) => v.id === variantId);

        const existingProduct = selectedItems.find(
            (p) => p.productId === product.id
        );

        if (existingProduct) {
            const hasVariant =
                existingProduct.variantIds.includes(variantId);

            if (hasVariant) {
                const newVariantIds =
                    existingProduct.variantIds.filter(
                        (id) => id !== variantId
                    );

                const newVariantTitles =
                    (existingProduct.variantTitles || []).filter(
                        (_, index) =>
                            existingProduct.variantIds[index] !== variantId
                    );
                const newVariantImages =
                    (existingProduct.variantImages || []).filter(
                        (_, index) =>
                            existingProduct.variantIds[index] !== variantId
                    );

                if (newVariantIds.length === 0) {
                    onSelect(
                        selectedItems.filter(
                            (p) => p.productId !== product.id
                        )
                    );
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
                                variantIds: [
                                    ...(p.variantIds || []),
                                    variantId,
                                ],
                                variantTitles: [
                                    ...(p.variantTitles || []),
                                    variant.title,
                                ],
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
                    variantImages: [variant.image || product.image]

                },
            ]);
        }
    };
    return (
        <Card title="Products">
            <BlockStack gap="300">
                {/* Search */}
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

                {/* Selected count */}
                {selectedItems.length > 0 && (
                    <Text tone="subdued" variant="bodySm">
                        {selectedItems.length} product{selectedItems.length !== 1 ? "s" : ""} selected
                    </Text>
                )}

                {/* Product List */}
                <div
                    style={{
                        borderTop: "1px solid #e1e3e5",
                        position: "relative",
                        minHeight: "200px",
                    }}
                >
                    {loading && (
                        <>
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", zIndex: 10 }} />
                            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 11 }}>
                                <Spinner accessibilityLabel="Loading products" size="large" />
                            </div>
                        </>
                    )}

                    {products.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center" }}>
                            <Text tone="subdued">No items to display</Text>
                        </div>
                    ) : (
                        products.map((product, index) => (
                            <div key={product.id}>
                                {/* Product Row */}
                                <div
                                    style={{
                                        padding: "10px 0",
                                        borderBottom: index !== products.length - 1 ? "1px solid #e1e3e5" : "none",
                                    }}
                                >
                                    <InlineStack align="space-between" wrap={false} gap="500">
                                        {/* LEFT */}
                                        <div style={{ flex: 1 }}>
                                            <InlineStack gap="200" align="start" blockAlign="start" wrap={false}>

                                                {/* ← Product checkbox */}
                                                <div style={{ paddingTop: "2px" }}>
                                                    <Checkbox
                                                        label=""
                                                        checked={isProductSelected(product)}
                                                        indeterminate={isProductIndeterminate(product)}
                                                        onChange={() => toggleProduct(product)}
                                                    />
                                                </div>

                                                <div style={{ minWidth: "40px" }}>
                                                    <Thumbnail source={product.image} size="small" />
                                                </div>

                                                <div
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => toggleVariants(product.id)}
                                                >
                                                    <BlockStack>
                                                        <Text fontWeight="medium">{product.title}</Text>
                                                        {product.variants.length > 0 && (
                                                            <InlineStack gap="50" align="left">
                                                                <div style={{ display: "inline-flex", alignItems: "center" }}>
                                                                    <Text tone="subdued" variant="bodySm">
                                                                        {product.variants.length} variants
                                                                    </Text>
                                                                    {product.variants.length > 1 && (
                                                                        <Icon source={openProducts[product.id] ? ChevronUpIcon : ChevronDownIcon} />
                                                                    )}
                                                                </div>
                                                            </InlineStack>
                                                        )}
                                                    </BlockStack>
                                                </div>

                                            </InlineStack>
                                        </div>

                                        {/* RIGHT */}
                                        <div style={{ minWidth: "100px", textAlign: "right" }}>
                                            <Text alignment="end">{product.price} {currency}</Text>
                                        </div>
                                    </InlineStack>
                                </div>

                                {/* Variants */}
                                {product.variants.length > 1 &&
                                    openProducts[product.id] &&
                                    product.variants.map((v) => (
                                        <div
                                            key={v.id}
                                            style={{ padding: "8px 0 8px 40px", borderBottom: "1px solid #f1f2f3" }}
                                        >
                                            <InlineStack align="space-between" wrap={false}>
                                                {/* LEFT */}
                                                <InlineStack gap="200" align="center">

                                                    {/* ← Variant checkbox */}
                                                    <Checkbox
                                                        label=""
                                                        checked={isVariantSelected(product.id, v.id)}
                                                        onChange={() => toggleVariant(product, v.id)}
                                                    />

                                                    <Thumbnail source={v.image || product.image} size="extraSmall" />
                                                    <Text>{v.title}</Text>
                                                </InlineStack>

                                                {/* RIGHT */}
                                                <div style={{ minWidth: "100px", textAlign: "right" }}>
                                                    <Text>{v.price} {currency}</Text>
                                                </div>
                                            </InlineStack>
                                        </div>
                                    ))}
                            </div>
                        ))
                    )}
                </div>
            </BlockStack>
        </Card>
    );
});

export default Products;