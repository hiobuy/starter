import { ProductDetailClient } from "@/components/product-detail-client";
import type { ProductChannel } from "@/lib/types";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string; id: string }>;
  searchParams: Promise<{ url?: string }>;
}) {
  const { channel: rawChannel, id: rawId } = await params;
  const { url: rawUrl } = await searchParams;
  const channel = (
    rawChannel === "taobao" || rawChannel === "weidian" ? rawChannel : "1688"
  ) as ProductChannel;

  const url = rawUrl ? decodeURIComponent(rawUrl) : undefined;
  const id =
    url || rawId === "by-url" ? undefined : decodeURIComponent(rawId);

  return (
    <ProductDetailClient channel={channel} id={id} url={url} />
  );
}
