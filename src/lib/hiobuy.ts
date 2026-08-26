import type {
  ProductChannel,
  StandardProductDetail,
  StandardProductList,
} from "./types";

export class HiobuyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public requestId?: string,
  ) {
    super(message);
    this.name = "HiobuyApiError";
  }
}

function requireApiKey(): string {
  const key = process.env.HIOBUY_API_KEY?.trim();
  if (!key || key.includes("xxxxxxxx")) {
    throw new HiobuyApiError(
      "Missing HIOBUY_API_KEY. Copy .env.example to .env.local and paste your Developer Portal API key.",
      500,
      "MISSING_API_KEY",
    );
  }
  return key;
}

/** Upstream HIOBuy API host. Browser traffic must go through `/api/products/*`. */
function apiBase(): string {
  return (process.env.HIOBUY_API_BASE_URL || "https://api.hiobuy.com").replace(
    /\/$/,
    "",
  );
}

function defaultLanguage(): string {
  return process.env.HIOBUY_DEFAULT_LANGUAGE?.trim() || "en";
}

async function hiobuyFetch<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const apiKey = requireApiKey();
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      language: defaultLanguage(),
      response_format: "standard",
      ...body,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string; request_id?: string };
    request_id?: string;
  };

  if (!res.ok) {
    throw new HiobuyApiError(
      data.error?.message || `HIOBuy API error (${res.status})`,
      res.status,
      data.error?.code,
      data.error?.request_id || data.request_id,
    );
  }

  return data as T;
}

export type ProductSearchSortField = "price" | "sales" | "credit";
export type ProductSearchSortOrder = "asc" | "desc";

export type ProductSearchFilters = {
  page?: number;
  page_size?: number;
  price_start?: number | string;
  price_end?: number | string;
  sort_field?: ProductSearchSortField;
  sort_order?: ProductSearchSortOrder;
};

function searchFilterBody(input: ProductSearchFilters): Record<string, unknown> {
  const body: Record<string, unknown> = {
    page: input.page ?? 1,
    page_size: input.page_size ?? 20,
  };

  const priceStart =
    input.price_start === undefined || input.price_start === ""
      ? undefined
      : Number(input.price_start);
  const priceEnd =
    input.price_end === undefined || input.price_end === ""
      ? undefined
      : Number(input.price_end);

  if (priceStart != null && Number.isFinite(priceStart) && priceStart >= 0) {
    body.price_start = priceStart;
  }
  if (priceEnd != null && Number.isFinite(priceEnd) && priceEnd >= 0) {
    body.price_end = priceEnd;
  }
  if (input.sort_field) {
    body.sort_field = input.sort_field;
    body.sort_order = input.sort_order ?? "asc";
  }

  return body;
}

export async function searchProducts(input: {
  channel: ProductChannel;
  keyword: string;
} & ProductSearchFilters): Promise<StandardProductList> {
  return hiobuyFetch<StandardProductList>("/v1/products/search", {
    channel: input.channel,
    keyword: input.keyword,
    ...searchFilterBody(input),
  });
}

export async function searchProductsByImage(input: {
  channel: ProductChannel;
  image_base64?: string;
  image_url?: string;
  keyword?: string;
} & ProductSearchFilters): Promise<StandardProductList> {
  return hiobuyFetch<StandardProductList>("/v1/products/search-by-image", {
    channel: input.channel,
    ...(input.image_base64 ? { image_base64: input.image_base64 } : {}),
    ...(input.image_url ? { image_url: input.image_url } : {}),
    ...(input.keyword ? { keyword: input.keyword } : {}),
    ...searchFilterBody(input),
  });
}

export async function parseProduct(input: {
  url: string;
  channel?: ProductChannel;
}): Promise<{ product: StandardProductDetail; request_id?: string }> {
  return hiobuyFetch<{ product: StandardProductDetail; request_id?: string }>(
    "/v1/products/parse",
    {
      url: input.url,
      ...(input.channel ? { channel: input.channel } : {}),
    },
  );
}

export async function getProductDetail(input: {
  channel: ProductChannel;
  id: string;
}): Promise<{ product: StandardProductDetail; request_id?: string }> {
  return hiobuyFetch<{ product: StandardProductDetail; request_id?: string }>(
    "/v1/products/detail",
    {
      channel: input.channel,
      id: input.id,
    },
  );
}
