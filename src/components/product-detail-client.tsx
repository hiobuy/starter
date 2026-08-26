"use client";

import { useEffect, useMemo, useState } from "react";
import {
  displayPrice,
  displayTitle,
  type ProductChannel,
  type ProductVariant,
  type StandardProductDetail,
} from "@/lib/types";

export function ProductDetailClient({
  channel,
  id,
}: {
  channel: ProductChannel;
  id: string;
}) {
  const [product, setProduct] = useState<StandardProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/products/detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, id }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || "Failed to load product");
        }
        if (!cancelled) {
          const next = data.product as StandardProductDetail;
          setProduct(next);
          setActiveImage(next?.images?.[0]?.url ?? next?.variants?.[0]?.image ?? null);
          setSelected(variantKey(next?.variants?.[0]));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load product");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [channel, id]);

  const images = useMemo(() => {
    const urls = [
      ...(product?.images || []).map((img) => img.url),
      ...(product?.variants || []).map((v) => v.image),
    ].filter((url): url is string => Boolean(url));
    return [...new Set(urls)];
  }, [product]);

  const optionGroups = useMemo(
    () => groupVariantOptions(product?.variants || []),
    [product],
  );

  const selectedVariant = useMemo(
    () => findVariant(product?.variants || [], selected),
    [product, selected],
  );

  useEffect(() => {
    if (selectedVariant?.image) setActiveImage(selectedVariant.image);
  }, [selectedVariant]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") stepImage(1);
      if (e.key === "ArrowLeft") stepImage(-1);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, activeImage, images]);

  function stepImage(delta: number) {
    if (!images.length) return;
    const current = Math.max(0, images.indexOf(activeImage || images[0]));
    const next = (current + delta + images.length) % images.length;
    setActiveImage(images[next]);
  }

  if (loading) {
    return (
      <div className="shell pdp">
        <div className="pdp-hero">
          <div className="skeleton" style={{ minHeight: 480 }} />
          <div className="skeleton" style={{ minHeight: 320 }} />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="shell section">
        <div className="error-banner">{error || "Product not found"}</div>
      </div>
    );
  }

  const title = displayTitle(product.title);
  const rawDescription =
    typeof product.description === "string"
      ? product.description
      : product.description?.translated || product.description?.original || "";
  const displayAmount = displayPrice(selectedVariant?.price ?? product.price) ?? "—";
  const stock = selectedVariant?.stock;
  const inStock = stock == null || stock > 0;
  const specRows = groupSpecs(product.attributes || [], optionGroups);

  function selectOption(name: string, value: string) {
    const variants = product?.variants || [];
    const next = { ...selected, [name]: value };
    const exact = findVariant(variants, next);
    if (exact) {
      setSelected(next);
      return;
    }
    const match = variants.find((v) =>
      (v.attributes || []).some((a) => a.name === name && a.value === value),
    );
    setSelected(match ? variantKey(match) : next);
  }

  return (
    <div className="shell pdp">
      <section className="pdp-hero">
        <div className="pdp-gallery">
          <button
            type="button"
            className="gallery-stage"
            onClick={() => activeImage && setLightboxOpen(true)}
            disabled={!activeImage}
            aria-label="Zoom product image"
          >
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeImage} alt={title} />
            ) : (
              <div className="skeleton" style={{ minHeight: "100%", width: "100%" }} />
            )}
          </button>
          {images.length > 1 ? (
            <div className="gallery-thumbs">
              {images.map((url) => (
                <button
                  key={url}
                  type="button"
                  className={url === activeImage ? "active" : ""}
                  onClick={() => setActiveImage(url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pdp-info">
          <div className={`stock-badge ${inStock ? "in" : "out"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </div>
          <h1>{title}</h1>
          <p className="pdp-price">{displayAmount}</p>

          {optionGroups.map((group) => (
            <div className="option-group" key={group.name}>
              <span className="option-label">{group.name}</span>
              <div className="option-chips">
                {group.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`option-chip ${selected[group.name] === value ? "active" : ""}`}
                    onClick={() => selectOption(group.name, value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pdp-facts">
            <span className="pill">{product.channel}</span>
            {product.min_order_quantity ? (
              <span className="pill">MOQ {product.min_order_quantity}</span>
            ) : null}
            {product.seller_name ? (
              <span className="pill">{product.seller_name}</span>
            ) : null}
            {selectedVariant?.sku_id ? (
              <span className="pill">SKU {selectedVariant.sku_id}</span>
            ) : null}
          </div>

          {product.source_url ? (
            <a
              className="pdp-cta"
              href={product.source_url}
              target="_blank"
              rel="noreferrer"
            >
              <span>Add to Cart</span>
              <BagIcon />
            </a>
          ) : (
            <button className="pdp-cta" type="button" disabled>
              <span>Add to Cart</span>
              <BagIcon />
            </button>
          )}
        </div>
      </section>

      <section className="pdp-features">
        <h2>Key Features</h2>
        <div className="pdp-feature-grid">
          <FeatureCard
            title={String(product.channel).toUpperCase()}
            body="Sourced through the HIOBuy Product API with a live channel listing."
          />
          <FeatureCard
            title={product.seller_name || "Verified seller"}
            body={
              product.seller_name
                ? `Listed by ${product.seller_name} on the origin marketplace.`
                : "Seller details follow the origin marketplace record."
            }
          />
          <FeatureCard
            title={
              product.min_order_quantity
                ? `MOQ ${product.min_order_quantity}`
                : `${product.variants?.length || 0} variants`
            }
            body={
              product.min_order_quantity
                ? "Minimum order quantity from the supplier."
                : "SKU options are mapped from the origin variant matrix."
            }
          />
        </div>
      </section>

      {specRows.length ? (
        <section className="pdp-specs">
          <h2>Technical Specifications</h2>
          <div className="spec-list">
            {specRows.map((row) => (
              <div className="spec-row" key={row.name}>
                <span>{row.name}</span>
                <strong>{row.values.join(", ")}</strong>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {rawDescription && /<[a-z][\s\S]*>/i.test(rawDescription) ? (
        <section className="pdp-specs">
          <h2>Description</h2>
          <div
            className="pdp-html"
            dangerouslySetInnerHTML={{ __html: rawDescription }}
          />
        </section>
      ) : null}

      {lightboxOpen && activeImage ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed product image"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Close"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>
          {images.length > 1 ? (
            <button
              type="button"
              className="lightbox-nav prev"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                stepImage(-1);
              }}
            >
              ‹
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={title}
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 ? (
            <button
              type="button"
              className="lightbox-nav next"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                stepImage(1);
              }}
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="pdp-feature">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 7V6a6 6 0 1 1 12 0v1h2a1 1 0 0 1 1 1v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1zm2 0h8V6a4 4 0 1 0-8 0z" />
    </svg>
  );
}

function variantKey(variant?: ProductVariant | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of variant?.attributes || []) {
    if (attr.name && attr.value) out[attr.name] = attr.value;
  }
  return out;
}

function findVariant(
  variants: ProductVariant[],
  selected: Record<string, string>,
): ProductVariant | null {
  const entries = Object.entries(selected);
  if (!entries.length) return variants[0] ?? null;
  return (
    variants.find((variant) => {
      const keys = variantKey(variant);
      return entries.every(([name, value]) => keys[name] === value);
    }) ?? null
  );
}

function groupSpecs(
  attributes: Array<{ name: string; value: string }>,
  variantGroups: Array<{ name: string; values: string[] }>,
) {
  const map = new Map<string, { name: string; values: string[] }>();

  function add(name: string, rawValue: string) {
    const key = name.trim();
    if (!key) return;
    const pieces = rawValue
      .split(/[,;|/]+/)
      .map((part) => part.trim().replace(/^\[|\]$/g, "").trim())
      .filter(Boolean);
    const bucket = map.get(key.toLowerCase());
    if (!bucket) {
      map.set(key.toLowerCase(), { name: key, values: [...new Set(pieces)] });
      return;
    }
    for (const piece of pieces) {
      if (!bucket.values.some((value) => value.toLowerCase() === piece.toLowerCase())) {
        bucket.values.push(piece);
      }
    }
  }

  for (const attr of attributes) add(attr.name, attr.value);
  for (const group of variantGroups) {
    for (const value of group.values) add(group.name, value);
  }

  return [...map.values()];
}

function groupVariantOptions(variants: ProductVariant[]) {
  const names: string[] = [];
  const valuesByName = new Map<string, string[]>();
  for (const variant of variants) {
    for (const attr of variant.attributes || []) {
      if (!attr.name || !attr.value) continue;
      if (!valuesByName.has(attr.name)) {
        names.push(attr.name);
        valuesByName.set(attr.name, []);
      }
      const values = valuesByName.get(attr.name)!;
      if (!values.includes(attr.value)) values.push(attr.value);
    }
  }
  return names.map((name) => ({ name, values: valuesByName.get(name) || [] }));
}
