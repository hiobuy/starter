import { NextResponse } from "next/server";
import { getProductDetail } from "@/lib/hiobuy";
import { jsonError } from "@/lib/api-response";
import type { ProductChannel } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: ProductChannel;
      id?: string;
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
    if (!body.id?.trim()) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "id is required" } },
        { status: 400 },
      );
    }

    const data = await getProductDetail({
      channel: body.channel,
      id: body.id.trim(),
    });

    return NextResponse.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
