"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { SearchHero } from "@/components/search-hero";
import { readStoredImageSearch } from "@/lib/image-search-storage";
import type { ProductChannel, ProductListItem } from "@/lib/types";

type SearchMode = "text" | "image" | "image-url";
type PriceSort = "" | "price_asc" | "price_desc";

const PAGE_SIZE = 20;

const SORT_OPTIONS: Array<{ value: PriceSort; label: string }> = [
  { value: "", label: "Default" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

function parsePrice(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function filterBody(priceMin: string, priceMax: string, sort: PriceSort) {
  const price_start = parsePrice(priceMin);
  const price_end = parsePrice(priceMax);
  return {
    ...(price_start != null ? { price_start } : {}),
    ...(price_end != null ? { price_end } : {}),
    ...(sort === "price_asc"
      ? { sort_field: "price" as const, sort_order: "asc" as const }
      : sort === "price_desc"
        ? { sort_field: "price" as const, sort_order: "desc" as const }
        : {}),
  };
}

export function SearchPageClient({
  channel,
  keyword,
  mode,
  imageSearchKey = "",
}: {
  channel: ProductChannel;
  keyword: string;
  mode: SearchMode;
  /** Bumps when a new image search is submitted (URL `t` param). */
  imageSearchKey?: string;
}) {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [appliedPriceMin, setAppliedPriceMin] = useState("");
  const [appliedPriceMax, setAppliedPriceMax] = useState("");
  const [sort, setSort] = useState<PriceSort>("");

  async function requestPage(pageNum: number) {
    const filters = filterBody(appliedPriceMin, appliedPriceMax, sort);
    const common = {
      channel,
      page: pageNum,
      page_size: PAGE_SIZE,
      ...filters,
    };

    if (mode === "image") {
      const payload = readStoredImageSearch();
      if (!payload) {
        throw new Error(
          "No uploaded image found. Go back and choose an image again.",
        );
      }
      const res = await fetch("/api/products/search-by-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...common,
          channel,
          image_base64: payload.image_base64.replace(
            /^data:image\/[a-zA-Z+]+;base64,/,
            "",
          ),
          ...(payload.keyword || keyword
            ? { keyword: payload.keyword || keyword }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Image search failed");
      }
      return data;
    }

    if (mode === "image-url") {
      if (!keyword.trim()) return null;
      const res = await fetch("/api/products/search-by-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...common,
          image_url: keyword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Image URL search failed");
      }
      return data;
    }

    if (!keyword.trim()) return null;
    const res = await fetch("/api/products/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...common,
        keyword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || "Search failed");
    }
    return data;
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError("");
      setItems([]);
      setTotal(null);
      setRequestId(null);
      setPage(1);
      setHasMore(false);

      try {
        const data = await requestPage(1);
        if (cancelled) return;
        if (!data) {
          setLoading(false);
          return;
        }
        const nextItems = (data.items || []) as ProductListItem[];
        const nextTotal = typeof data.total === "number" ? data.total : null;
        setItems(nextItems);
        setTotal(nextTotal);
        setRequestId(data.request_id || null);
        setHasMore(
          nextItems.length >= PAGE_SIZE &&
            (nextTotal == null || nextItems.length < nextTotal),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // requestPage reads current filter/sort/search inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, keyword, mode, appliedPriceMin, appliedPriceMax, sort, imageSearchKey]);

  function applyPriceRange() {
    setAppliedPriceMin(priceMin.trim());
    setAppliedPriceMax(priceMax.trim());
  }

  async function loadMore() {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    const nextPage = page + 1;
    try {
      const data = await requestPage(nextPage);
      if (!data) return;
      const nextItems = (data.items || []) as ProductListItem[];
      const nextTotal = typeof data.total === "number" ? data.total : total;
      setItems((prev) => {
        const merged = [...prev, ...nextItems];
        setHasMore(
          nextItems.length >= PAGE_SIZE &&
            (nextTotal == null || merged.length < nextTotal),
        );
        return merged;
      });
      setTotal(nextTotal);
      setPage(nextPage);
      setRequestId(data.request_id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  const heading =
    mode === "image" || mode === "image-url"
      ? "Image search results"
      : "Search results";
  const summary =
    mode === "image"
      ? `Similar products on ${channel}`
      : mode === "image-url"
        ? `Similar products for this image URL on ${channel}`
        : keyword
          ? `“${keyword}” on ${channel}`
          : "Enter a keyword, image, or product URL above";
  const canSearch = mode === "image" || Boolean(keyword);

  return (
    <div className="shell section">
      <div className="section-head">
        <div>
          <h2>{heading}</h2>
          <p>
            {summary}
            {total != null ? ` · ${total} matches` : ""}
            {requestId ? ` · request_id ${requestId}` : ""}
          </p>
        </div>
      </div>

      <SearchHero
        initialChannel={channel}
        initialKeyword={keyword}
        initialMode={mode}
        imageSearchKey={imageSearchKey}
      />

      <div style={{ height: "1.25rem" }} />

      {canSearch ? (
        <div className="search-filters">
          <form
            className="search-price"
            onSubmit={(e) => {
              e.preventDefault();
              applyPriceRange();
            }}
          >
            <span className="search-filter-label">Price</span>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Min ¥"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              aria-label="Minimum price"
            />
            <span className="search-price-sep">–</span>
            <input
              className="field"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="Max ¥"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              aria-label="Maximum price"
            />
            <button className="btn btn-ghost" type="submit">
              Apply
            </button>
          </form>

          <div className="search-sort" role="group" aria-label="Sort by price">
            <span className="search-filter-label">Sort</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value || "default"}
                type="button"
                className={`chip${sort === option.value ? " active" : ""}`}
                onClick={() => {
                  applyPriceRange();
                  setSort(option.value);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}

      {loading ? (
        <div className="product-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 && canSearch ? (
        <div className="empty-state">
          {mode === "image" || mode === "image-url"
            ? `No similar products on ${channel}. Try a clearer photo, another image, or paste a product image URL (Taobao/Tmall CDN links work well for ${channel}).`
            : "No products returned. Try another keyword."}
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <div className="product-grid">
            {items.map((item, index) => (
              <ProductCard
                key={`${item.channel}-${item.id}-${index}`}
                item={item}
              />
            ))}
          </div>
          {hasMore ? (
            <div className="load-more">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
