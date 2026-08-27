import type { ProductChannel } from "./types";

export const IMAGE_SEARCH_STORAGE_KEY = "hiobuy_demo_image_search";

export type StoredImageSearch = {
  channel: ProductChannel;
  image_base64: string;
  name?: string;
  keyword?: string;
};

export function readStoredImageSearch(): StoredImageSearch | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(IMAGE_SEARCH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as StoredImageSearch;
    if (!payload.image_base64?.trim()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function writeStoredImageSearch(payload: StoredImageSearch): void {
  sessionStorage.setItem(IMAGE_SEARCH_STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredImageSearch(): void {
  sessionStorage.removeItem(IMAGE_SEARCH_STORAGE_KEY);
}
