import { NextResponse } from "next/server";
import { readLocalContribImage } from "@/lib/contribution-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const decoded = decodeURIComponent(name);
    const { buf, contentType } = await readLocalContribImage(decoded);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
