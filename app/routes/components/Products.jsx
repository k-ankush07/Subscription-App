import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
    Text,
    Thumbnail,
    Checkbox,
    BlockStack,
    InlineStack,
    TextField,
    Badge,
    Spinner,
    Icon,
    Button,
    Card
} from "@shopify/polaris";

import {
    ChevronDownIcon,
    ChevronUpIcon,
} from "@shopify/polaris-icons";
// import { useAuthenticatedFetch } from '../utils/useAuthenticatedFetch'

const Products = forwardRef(function Products({ onSelect, selectedItems = [], onPaginationChange }, ref) {

    const authenticatedFetch = useAuthenticatedFetch();

    const [products, setProducts] = useState([]);
    const [cursor, setCursor] = useState([]);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [openProducts, setOpenProducts] = useState({});
    const [cursorStack, setCursorStack] = useState([]);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState(selectedItems);
    const [showSelected, setShowSelected] = useState(false);
    const searchDebounceRef = useRef(null);
    const currentSearchRef = useRef("");
    const [currency, setCurrency] = useState("");
    const cursorRef = useRef(null);
    const cursorStackRef = useRef([]);

    useEffect(() => {
        setSelected(selectedItems);
    }, [selectedItems]);

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
            const res = await authenticatedFetch(`/api/products?cursor=${cursorValue || ""}&query=${encodeURIComponent(q)}`);
            const data = await res.json();
            const currency = data?.data?.shop?.currencyCode;
            setCurrency(currency);

            const edges = data?.data?.products?.edges || [];

            if (edges.length === 0) {
                console.log("No products found");
                return;
            }

            const newProducts = edges.map((p) => ({
                id: p.node.id,
                title: p.node.title,
                handle: p.node.handle,
                status: p.node.status,
                image: p.node.images.edges[0]?.node?.url,
                price: p.node.variants.edges[0]?.node?.price || "0",
                variants: p.node.variants.edges.map((v) => ({
                    id: v.node.id,
                    title: v.node.title,
                    price: v.node.price,
                    available: v.node.availableForSale,
                    image: v.node.image?.url || null,
                    handle: p.node.handle,
                }))
            }));

            setProducts(newProducts);
            console.log(newProducts)

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
        const prevCursor =
            stack.length > 0 ? stack[stack.length - 1] : null;
        setCursorStack(stack);
        await loadMore(prevCursor, currentSearchRef.current);
    };

    const toggleProduct = (product) => {
        const allVariantIds = product.variants.map(v => v.id);

        const isFullySelected = allVariantIds.every(id =>
            selected.some(s => s.id === id)
        );

        let updated;

        if (isFullySelected) {
            // remove all variants of this product
            updated = selected.filter(
                v => !allVariantIds.includes(v.id)
            );
        } else {
            // add all variants (avoid duplicates)
            const newVariants = product.variants.map(v => ({
                ...v,
                productTitle: product.title,
                productImage: product.image,
                handle: product.handle,
            }));

            const merged = [...selected, ...newVariants];

            // remove duplicates
            updated = merged.filter(
                (item, index, arr) =>
                    arr.findIndex(v => v.id === item.id) === index
            );
        }

        setSelected(updated);
        onSelect(updated);
    };
    const toggleSelect = (variant, product) => {
        const exists = selected.some(v => v.id === variant.id);

        let updated;

        if (exists) {
            // remove only this variant
            updated = selected.filter(v => v.id !== variant.id);
        } else {
            // add variant
            updated = [
                ...selected,
                {
                    ...variant,
                    productTitle: product.title,
                    productImage: product.image,
                    handle: product.handle,
                }
            ];
        }

        setSelected(updated);
        onSelect(updated);
    };
    const getProductState = (product) => {
        const variantIds = product.variants.map(v => v.id);

        const selectedCount = selected.filter(v =>
            variantIds.includes(v.id)
        ).length;

        if (selectedCount === 0) return "none";
        if (selectedCount === variantIds.length) return "all";
        return "partial";
    };

    const isSelected = (id) => selected.some((v) => v.id === id);




    const toggleVariants = (productId) => {
        setOpenProducts((prev) => ({
            ...prev,
            [productId]: !prev[productId],
        }));
    };

    const visibleProducts = products.filter((product) => {
        if (!showSelected) return true;
        return product.variants.some((v) =>
            selected.some((s) => s.id === v.id)
        );
    });

    return (
        <Card title='Products'>
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


                <div style={{ borderTop: "1px solid #e1e3e5", position: "relative", minHeight: "200px" }}>
                    {loading && (
                        <>
                            <div
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: "rgba(255,255,255,0.7)",
                                    zIndex: 10,
                                }}
                            />
                            <div
                                style={{
                                    position: "fixed",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    zIndex: 11,
                                }}
                            >
                                <Spinner accessibilityLabel="Loading products" size="large" />
                            </div>
                        </>
                    )}
                    {visibleProducts.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center" }}>
                            <Text tone="subdued">No items to display</Text>
                        </div>
                    ) : (visibleProducts.map((product, index) => (
                        <div key={product.id}>
                            <div
                                style={{
                                    padding: "10px 0",
                                    borderBottom:
                                        index !== products.length - 1
                                            ? "1px solid #e1e3e5"
                                            : "none",
                                }}
                            >
                                <InlineStack align="space-between" wrap={false} gap="500">

                                    {/* LEFT SIDE */}
                                    <div style={{ flex: 1 }}>
                                        <InlineStack gap="200" align="start" blockAlign="start" wrap={false}>
                                            <Checkbox
                                                checked={getProductState(product) === "all"}
                                                onChange={() => toggleProduct(product)}

                                            />

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

                                    {/* RIGHT SIDE */}
                                    <div style={{
                                        display: "flex", gap: "8px", justifyContent: "flex-end", minWidth: product.variants.every((v) => !v.available)
                                            ? "165px"
                                            : "90px",
                                    }}>
                                        <div
                                            style={{
                                                lineHeight: 1,
                                                display: "flex",
                                                alignItems: "center",
                                                height: "25px",
                                                gap: "8px"
                                            }}
                                        >
                                            {product.status !== "ACTIVE" && (
                                                <Badge tone={product.status === "DRAFT" ? "info" : "warning"}>
                                                    {product.status === "DRAFT" ? "Draft" : "Archived"}
                                                </Badge>
                                            )}
                                            {product.variants.every((v) => !v.available) && (
                                                <Badge tone="warning">Out of stock</Badge>
                                            )}
                                        </div>
                                        <Text alignment="end">{product.price} {currency}</Text>
                                    </div>

                                </InlineStack>
                            </div>

                            {product.variants.length > 1 &&
                                openProducts[product.id] &&
                                product.variants.map((v) => {
                                    if (showSelected && !isSelected(v.id)) return null;

                                    return (
                                        <div
                                            key={v.id}
                                            style={{
                                                padding: "8px 0 8px 40px",
                                                borderBottom: "1px solid #f1f2f3",
                                            }}
                                        >
                                            <InlineStack align="space-between">

                                                <InlineStack gap="200" align="center">
                                                    <Checkbox
                                                        checked={isSelected(v.id)}
                                                        onChange={() => toggleSelect(v, product)}
                                                    />

                                                    <Thumbnail
                                                        source={v.image || product.image}
                                                        size="extraSmall"
                                                    />

                                                    <Text>{v.title}</Text>
                                                </InlineStack>

                                                <InlineStack gap="200">
                                                    {!v.available && (
                                                        <Badge tone="warning">Out of stock</Badge>
                                                    )}
                                                    <Text>{v.price} {currency}</Text>
                                                </InlineStack>
                                            </InlineStack>
                                        </div>
                                    );
                                })}
                        </div>
                    ))
                    )}
                </div>
            </BlockStack>
        </Card>
    );
});

export default Products;
