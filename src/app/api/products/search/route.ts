import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/hiobuy";
import { jsonError } from "@/lib/api-response";
import type { ProductChannel } from "@/lib/types";
import type { ProductSearchSortField, ProductSearchSortOrder } from "@/lib/hiobuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: ProductChannel;
      keyword?: string;
      page?: number;
      page_size?: number;
      price_start?: number | string;
      price_end?: number | string;
      sort_field?: ProductSearchSortField;
      sort_order?: ProductSearchSortOrder;
    };

    if (!body.channel || !["1688", "taobao"].includes(body.channel)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "channel must be 1688 or taobao" } },
        { status: 400 },
      );
    }
    if (!body.keyword?.trim()) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "keyword is required" } },
        { status: 400 },
      );
    }

    const data = await searchProducts({
      channel: body.channel,
      keyword: body.keyword.trim(),
      page: body.page,
      page_size: body.page_size,
      price_start: body.price_start,
      price_end: body.price_end,
      sort_field: body.sort_field,
      sort_order: body.sort_order,
    });

    return NextResponse.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
