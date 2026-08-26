import { ProductDetailClient } from "@/components/product-detail-client";
import type { ProductChannel } from "@/lib/types";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ channel: string; id: string }>;
}) {
  const { channel: rawChannel, id } = await params;
  const channel = (
    rawChannel === "taobao" || rawChannel === "weidian" ? rawChannel : "1688"
  ) as ProductChannel;

  return <ProductDetailClient channel={channel} id={decodeURIComponent(id)} />;
}
