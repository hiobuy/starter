import type { ProductChannel } from "./types";

export function detectChannelFromUrl(url: string): ProductChannel | null {
  const lower = url.toLowerCase();
  if (lower.includes("taobao.com") || lower.includes("tmall.com")) return "taobao";
  if (lower.includes("1688.com")) return "1688";
  if (lower.includes("weidian.com")) return "weidian";
  return null;
}

export function isTaobaoCdnImageUrl(input: string): boolean {
  const text = input.trim();
  if (!/^https?:\/\/\S+$/i.test(text)) return false;
  try {
    const host = new URL(text).hostname.toLowerCase();
    return host.endsWith(".alicdn.com") || host.endsWith(".tbcdn.cn");
  } catch {
    return false;
  }
}

export function imageSearchChannelForUrl(
  url: string,
  fallback: ProductChannel,
): ProductChannel {
  if (isTaobaoCdnImageUrl(url)) return "taobao";
  return detectChannelFromUrl(url) ?? fallback;
}
