import { SearchPageClient } from "@/components/search-page-client";
import type { ProductChannel } from "@/lib/types";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    channel?: string;
    mode?: string;
    t?: string;
  }>;
}) {
  const params = await searchParams;
  const channel = (params.channel === "taobao" ? "taobao" : "1688") as ProductChannel;
  const keyword = params.q?.trim() || "";
  const mode =
    params.mode === "image-url"
      ? "image-url"
      : params.mode === "image"
        ? "image"
        : "text";

  return (
    <SearchPageClient
      channel={channel}
      keyword={keyword}
      mode={mode}
      imageSearchKey={params.t?.trim() || ""}
    />
  );
}
