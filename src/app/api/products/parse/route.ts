import { NextResponse } from "next/server";
import { parseProduct } from "@/lib/hiobuy";
import { jsonError } from "@/lib/api-response";
import type { ProductChannel } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      channel?: ProductChannel;
    };

    if (!body.url?.trim()) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "url is required" } },
        { status: 400 },
      );
    }

    const data = await parseProduct({
      url: body.url.trim(),
      channel: body.channel,
    });

    return NextResponse.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
