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
import {
  clearStoredImageSearch,
  readStoredImageSearch,
  writeStoredImageSearch,
} from "@/lib/image-search-storage";
import { compressImageFile } from "@/lib/compress-image";
import { detectChannelFromUrl, imageSearchChannelForUrl } from "@/lib/channel-url";
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
  imageSearchKey = "",
}: {
  initialKeyword?: string;
  initialChannel?: ProductChannel;
  initialMode?: ComposerMode;
  imageSearchKey?: string;
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
  const [storedPreview, setStoredPreview] = useState<{
    name: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    const nextChannel =
      initialChannel === "weidian" ? "1688" : initialChannel;
    setKeyword(initialKeyword);
    setChannel(nextChannel);
    if (initialMode === "image") {
      setMode("image");
      const stored = readStoredImageSearch();
      if (stored?.keyword && !initialKeyword) {
        setKeyword(stored.keyword);
      }
    } else if (initialKeyword.trim()) {
      setMode(inferComposerMode(initialKeyword));
    } else {
      setMode(initialMode);
    }
    if (initialMode !== "image") {
      setFiles([]);
    }
  }, [initialMode, initialKeyword, initialChannel]);

  // sessionStorage is client-only — load after mount to avoid hydration mismatch
  useEffect(() => {
    if (files.length > 0 || initialMode !== "image") {
      setStoredPreview(null);
      return;
    }
    const stored = readStoredImageSearch();
    if (!stored?.image_base64) {
      setStoredPreview(null);
      return;
    }
    const url = stored.image_base64.startsWith("data:")
      ? stored.image_base64
      : `data:image/jpeg;base64,${stored.image_base64}`;
    setStoredPreview({ name: stored.name || "image", url });
  }, [files, initialMode, imageSearchKey]);

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
      return;
    }
    const pastedText = e.clipboardData?.getData("text")?.trim();
    if (pastedText && !files.length) {
      const inferred = inferComposerMode(pastedText);
      if (inferred !== "text") {
        setMode(inferred);
      }
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

  function removeStoredPreview() {
    clearStoredImageSearch();
    setStoredPreview(null);
    setMode("text");
    router.push(`/search?channel=${channel}`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const query = keyword.trim();
    const imageUrl = looksLikeImageUrl(query);
    const marketplaceUrl = looksLikeMarketplaceProductUrl(query);

    if (mode === "product-url" || marketplaceUrl) {
      openProduct(query);
      return;
    }

    if (files.length) {
      await openImageSearch(files[0], query);
      return;
    }

    if (mode === "image") {
      const stored = readStoredImageSearch();
      if (stored) {
        writeStoredImageSearch({
          ...stored,
          channel,
          keyword: query || undefined,
        });
        const qs = query ? `&q=${encodeURIComponent(query)}` : "";
        router.push(
          `/search?channel=${channel}&mode=image${qs}&t=${Date.now()}`,
        );
        return;
      }
      setError("Drop or choose an image first.");
      return;
    }

    if (mode === "image-url" || (mode === "text" && imageUrl)) {
      if (!query) {
        setError("Paste an image URL first.");
        return;
      }
      const imgChannel = imageSearchChannelForUrl(query, channel);
      router.push(
        `/search?channel=${imgChannel}&mode=image-url&q=${encodeURIComponent(query)}`,
      );
      return;
    }

    if (!query) {
      setError("Enter a keyword, image, or product URL.");
      return;
    }

    if (looksLikeHttpUrl(query)) {
      openProduct(query);
      return;
    }

    router.push(`/search?channel=${channel}&q=${encodeURIComponent(query)}`);
  }

  async function openImageSearch(file: File, extraKeyword: string) {
    setLoading(true);
    try {
      const prepared = await compressImageFile(file);
      const base64 = await fileToBase64(prepared);
      writeStoredImageSearch({
        channel,
        image_base64: base64,
        name: file.name,
        keyword: extraKeyword || undefined,
      });
      setFiles([]);
      const qs = extraKeyword
        ? `&q=${encodeURIComponent(extraKeyword)}`
        : "";
      router.push(
        `/search?channel=${channel}&mode=image${qs}&t=${Date.now()}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image");
    } finally {
      setLoading(false);
    }
  }

  function openProduct(raw: string) {
    const url = raw.trim();
    if (!url) {
      setError("Paste a product URL first.");
      return;
    }
    const detected = detectChannelFromUrl(url) ?? channel;
    router.push(
      `/product/${detected}/by-url?url=${encodeURIComponent(url)}`,
    );
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
          onChange={(e) => {
            const value = e.target.value;
            setKeyword(value);
            if (!files.length) {
              setMode(inferComposerMode(value));
            }
          }}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          placeholder={PLACEHOLDERS[mode]}
          rows={3}
          aria-label="Search"
        />

        {previews.length || storedPreview ? (
          <div className="search-attachments">
            {storedPreview ? (
              <div className="search-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={storedPreview.url} alt={storedPreview.name} />
                <button
                  type="button"
                  className="search-thumb-remove"
                  aria-label={`Remove ${storedPreview.name}`}
                  onClick={removeStoredPreview}
                >
                  ×
                </button>
              </div>
            ) : null}
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

function inferComposerMode(input: string): ComposerMode {
  const text = input.trim();
  if (!text) return "text";
  if (looksLikeMarketplaceProductUrl(text)) return "product-url";
  if (looksLikeImageUrl(text)) return "image-url";
  if (looksLikeHttpUrl(text)) return "product-url";
  return "text";
}

function looksLikeMarketplaceProductUrl(input: string): boolean {
  const text = input.trim();
  if (!looksLikeHttpUrl(text)) return false;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    if (/1688\.com$/i.test(host) || /weidian\.com$/i.test(host)) return true;
    if (/(?:^|\.)(?:taobao|tmall)\.com$/i.test(host) || /tmall\.hk$/i.test(host)) {
      return Boolean(
        url.searchParams.get("id") ||
          url.searchParams.get("item_id") ||
          url.searchParams.get("mi_id") ||
          /\/item\.htm/i.test(url.pathname),
      );
    }
  } catch {
    return false;
  }
  return false;
}

function looksLikeHttpUrl(input: string): boolean {
  return /^https?:\/\/\S+$/i.test(input.trim());
}

function looksLikeImageUrl(input: string): boolean {
  const text = input.trim();
  if (!looksLikeHttpUrl(text)) return false;
  if (/\.(avif|bmp|gif|jpe?g|png|webp)(\?|#|$)/i.test(text)) return true;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".alicdn.com") || host.endsWith(".tbcdn.cn")) {
      return /\/(bao\/uploaded|imgextra)\//i.test(url.pathname);
    }
  } catch {
    return false;
  }
  return false;
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
