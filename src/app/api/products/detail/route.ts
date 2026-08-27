import { NextResponse } from "next/server";
import { getProductDetail } from "@/lib/hiobuy";
import { jsonError } from "@/lib/api-response";
import type { ProductChannel } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: ProductChannel;
      id?: string;
      url?: string;
    };

    if (!body.channel || !["1688", "taobao", "weidian"].includes(body.channel)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "channel must be 1688, taobao, or weidian",
          },
        },
        { status: 400 },
      );
    }
    const id = body.id?.trim();
    const url = body.url?.trim();
    if (!id && !url) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "id or url is required",
          },
        },
        { status: 400 },
      );
    }

    const data = await getProductDetail({
      channel: body.channel,
      ...(id ? { id } : {}),
      ...(url ? { url } : {}),
    });

    return NextResponse.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
