"use client";

import {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  ClipboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { ProductChannel } from "@/lib/types";

const SUGGESTIONS = [
  "wireless earbuds",
  "phone case",
  "tote bag",
  "desk lamp",
  "skincare set",
];

type ComposerMode = "text" | "image" | "image-url" | "product-url";

const PLACEHOLDERS: Record<ComposerMode, string> = {
  text: "Describe what you want, e.g. matte black hair dryer, durable plastic…",
  image: "Optional keyword to refine the image search…",
  "image-url": "Paste an image URL to find similar products…",
  "product-url": "Paste a 1688, Taobao, or Weidian product URL…",
};

export function SearchHero({
  initialKeyword = "",
  initialChannel = "1688",
  initialMode = "text",
}: {
  initialKeyword?: string;
  initialChannel?: ProductChannel;
  initialMode?: ComposerMode;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ComposerMode>(initialMode);
  const [channel, setChannel] = useState<ProductChannel>(
    initialChannel === "weidian" ? "1688" : initialChannel,
  );
  const [keyword, setKeyword] = useState(initialKeyword);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previews = useMemo(
    () => files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  function addFiles(next: File[]) {
    const images = next.filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    setFiles((prev) => [...prev, ...images].slice(0, 8));
    setMode("image");
    setError("");
  }

  function onDrop(e: DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const images: File[] = [];
    for (const item of Array.from(e.clipboardData?.items || [])) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) images.push(file);
      }
    }
    if (images.length) {
      e.preventDefault();
      addFiles(images);
    }
  }

  function selectMode(next: ComposerMode) {
    if (next === "image") {
      setMode("image");
      fileRef.current?.click();
      return;
    }
    setMode((current) => (current === next ? "text" : next));
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const query = keyword.trim();
    const product = parseProductUrl(query);
    const imageUrl = looksLikeImageUrl(query);

    if (mode === "product-url" || (mode === "text" && product)) {
      await openProduct(query, product);
      return;
    }

    if (files.length) {
      await openImageSearch(files[0], query);
      return;
    }

    if (mode === "image-url" || (mode === "text" && imageUrl)) {
      if (!query) {
        setError("Paste an image URL first.");
        return;
      }
      router.push(
        `/search?channel=${channel}&mode=image-url&q=${encodeURIComponent(query)}`,
      );
      return;
    }

    if (mode === "image") {
      setError("Drop or choose an image first.");
      return;
    }

    if (!query) {
      setError("Enter a keyword, image, or product URL.");
      return;
    }

    if (looksLikeHttpUrl(query)) {
      await openProduct(query, product);
      return;
    }

    router.push(`/search?channel=${channel}&q=${encodeURIComponent(query)}`);
  }

  async function openImageSearch(file: File, extraKeyword: string) {
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      sessionStorage.setItem(
        "hiobuy_demo_image_search",
        JSON.stringify({
          channel,
          image_base64: base64,
          name: file.name,
          keyword: extraKeyword || undefined,
        }),
      );
      const qs = extraKeyword
        ? `&q=${encodeURIComponent(extraKeyword)}`
        : "";
      router.push(`/search?channel=${channel}&mode=image${qs}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image");
    } finally {
      setLoading(false);
    }
  }

  async function openProduct(
    raw: string,
    parsed: { channel: ProductChannel; id: string } | null,
  ) {
    if (!raw.trim()) {
      setError("Paste a product URL first.");
      return;
    }
    if (parsed) {
      router.push(`/product/${parsed.channel}/${encodeURIComponent(parsed.id)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/products/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Could not parse that product URL");
      }
      const id = data?.product?.id as string | undefined;
      const parsedChannel = data?.product?.channel as ProductChannel | undefined;
      if (!id || !parsedChannel) {
        throw new Error("Parse succeeded but no product id was returned");
      }
      router.push(`/product/${parsedChannel}/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open that product URL");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const submitLabel =
    loading
      ? mode === "product-url"
        ? "Opening…"
        : "Preparing…"
      : "Search";

  return (
    <form
      className="search-hero"
      onSubmit={onSubmit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="channel-tabs" role="tablist" aria-label="Marketplace">
        <button
          type="button"
          role="tab"
          aria-selected={channel === "1688"}
          className={`channel-tab ${channel === "1688" ? "active" : ""}`}
          onClick={() => setChannel("1688")}
        >
          1688
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={channel === "taobao"}
          className={`channel-tab ${channel === "taobao" ? "active" : ""}`}
          onClick={() => setChannel("taobao")}
        >
          Taobao
        </button>
      </div>

      <div className={`search-panel ${dragging ? "is-dragover" : ""}`}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files || []));
            e.target.value = "";
          }}
        />

        <textarea
          className="search-textarea"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDERS[mode]}
          rows={3}
          aria-label="Search"
        />

        {previews.length ? (
          <div className="search-attachments">
            {previews.map((preview, index) => (
              <div key={`${preview.name}-${index}`} className="search-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.url} alt={preview.name} />
                <button
                  type="button"
                  className="search-thumb-remove"
                  aria-label={`Remove ${preview.name}`}
                  onClick={() =>
                    setFiles((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="search-toolbar">
          <div className="search-modes">
            <button
              type="button"
              className={`mode-chip ${mode === "image" || files.length ? "active" : ""}`}
              onClick={() => selectMode("image")}
            >
              <ImageIcon />
              Image search
            </button>
            <button
              type="button"
              className={`mode-chip ${mode === "image-url" ? "active" : ""}`}
              onClick={() => selectMode("image-url")}
            >
              <LinkIcon />
              Image URL
            </button>
            <button
              type="button"
              className={`mode-chip ${mode === "product-url" ? "active" : ""}`}
              onClick={() => selectMode("product-url")}
            >
              <BagIcon />
              Product link
            </button>
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {submitLabel}
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip ${keyword === s ? "active" : ""}`}
              onClick={() => setKeyword(s)}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}
    </form>
  );
}

function looksLikeHttpUrl(input: string): boolean {
  return /^https?:\/\/\S+$/i.test(input.trim());
}

function looksLikeImageUrl(input: string): boolean {
  const text = input.trim();
  if (!looksLikeHttpUrl(text)) return false;
  return /\.(avif|bmp|gif|jpe?g|png|webp)(\?|#|$)/i.test(text);
}

function parseProductUrl(
  input: string,
): { channel: ProductChannel; id: string } | null {
  const text = input.trim();
  const offer = text.match(
    /(?:https?:\/\/)?(?:[\w.-]*\.)?1688\.com\/offer\/(\d+)/i,
  );
  if (offer) return { channel: "1688", id: offer[1] };

  const weidian = text.match(/[?&]itemID=(\d+)/i);
  if (weidian && /weidian\.com/i.test(text)) {
    return { channel: "weidian", id: weidian[1] };
  }

  try {
    const url = new URL(text.startsWith("http") ? text : `https://${text}`);
    if (/(?:^|\.)(?:taobao|tmall)\.com$/i.test(url.hostname) || /tmall\.hk$/i.test(url.hostname)) {
      const id = url.searchParams.get("id") || url.searchParams.get("item_id");
      if (id) return { channel: "taobao", id };
    }
  } catch {
    return null;
  }
  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M21 16l-5.5-5.5-8.5 8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10.7 5.23"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11a5 5 0 0 0-7.07 0L4.8 13.12a5 5 0 1 0 7.07 7.07L13.3 18.77"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 7V6a6 6 0 1 1 12 0v1h2a1 1 0 0 1 1 1v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a1 1 0 0 1 1-1zm2 0h8V6a4 4 0 1 0-8 0z" />
    </svg>
  );
}
