import { NextResponse } from "next/server";
import { searchProductsByImage } from "@/lib/hiobuy";
import { jsonError } from "@/lib/api-response";
import type { ProductChannel } from "@/lib/types";
import type { ProductSearchSortField, ProductSearchSortOrder } from "@/lib/hiobuy";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: ProductChannel;
      image_base64?: string;
      image_url?: string;
      page?: number;
      page_size?: number;
      keyword?: string;
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
    if (!body.image_base64?.trim() && !body.image_url?.trim()) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "image_base64 or image_url is required",
          },
        },
        { status: 400 },
      );
    }

    // Allow data-URL prefix from browser FileReader
    const imageBase64 = body.image_base64
      ?.replace(/^data:image\/[a-zA-Z+]+;base64,/, "")
      .trim();

    const data = await searchProductsByImage({
      channel: body.channel,
      ...(imageBase64 ? { image_base64: imageBase64 } : {}),
      ...(body.image_url?.trim() ? { image_url: body.image_url.trim() } : {}),
      page: body.page,
      page_size: body.page_size,
      keyword: body.keyword,
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
