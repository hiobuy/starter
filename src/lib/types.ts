export type ProductChannel = "1688" | "taobao" | "weidian";

export interface LocalizedText {
  original: string;
  translated: string | null;
  language?: string;
}

export interface ProductPrice {
  original_amount?: number | null;
  display_amount?: number | null;
  promotion_amount?: number | null;
  original_currency?: string;
  display_currency?: string;
}

export interface ProductImage {
  url: string;
  type?: "main" | "gallery" | "variant" | string;
}

export interface ProductListItem {
  id: string;
  channel: ProductChannel | string;
  source_product_id?: string;
  source_url?: string | null;
  title?: LocalizedText | string;
  price?: ProductPrice;
  images?: ProductImage[];
  image?: string | null;
  seller_name?: string | null;
  sales_count?: number | null;
}

export interface StandardProductList {
  items: ProductListItem[];
  total?: number;
  page?: number;
  page_size?: number;
  request_id?: string;
  pic_region_info?: unknown;
}

export interface ProductVariant {
  sku_id: string;
  attributes?: Array<{ name: string; value: string }>;
  price?: ProductPrice;
  stock?: number;
  image?: string | null;
}

export interface StandardProductDetail {
  id: string;
  channel: ProductChannel | string;
  source_product_id?: string;
  source_url?: string | null;
  title?: LocalizedText | string;
  description?: LocalizedText | null;
  price?: ProductPrice;
  images?: ProductImage[];
  variants?: ProductVariant[];
  attributes?: Array<{ name: string; value: string }>;
  seller_name?: string | null;
  min_order_quantity?: number | null;
}

export function displayTitle(title?: LocalizedText | string | null): string {
  if (!title) return "Untitled product";
  if (typeof title === "string") return title;
  return title.translated || title.original || "Untitled product";
}

export function displayPrice(price?: ProductPrice | null): string | null {
  if (!price) return null;
  const amount =
    price.promotion_amount ?? price.display_amount ?? price.original_amount;
  if (amount == null || Number.isNaN(Number(amount))) return null;
  return `¥${Number(amount).toFixed(2)}`;
}

export function primaryImage(item: {
  images?: ProductImage[];
  image?: string | null;
}): string | null {
  if (item.image) return item.image;
  const first = item.images?.[0]?.url;
  return first ?? null;
}
