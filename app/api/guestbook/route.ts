import { NextResponse } from "next/server";
import { STORAGE_HELP, formatStorageError } from "@/lib/persist";
import { appendGuestbook, listGuestbook } from "@/lib/guestbook-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseCoord(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET() {
  try {
    const entries = await listGuestbook();
    return NextResponse.json({ entries });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Không đọc được sổ lưu bút" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      emoji?: string;
      message?: string;
      lat?: number;
      lng?: number;
      place?: string;
    };
    const entry = await appendGuestbook({
      name: body.name ?? "",
      emoji: body.emoji ?? "💖",
      message: body.message ?? "",
      lat: parseCoord(body.lat),
      lng: parseCoord(body.lng),
      place: body.place ?? "",
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = formatStorageError(e, "Lỗi lưu lời chúc");
    const status = msg.includes("Thiếu")
      ? 400
      : msg === STORAGE_HELP || msg.includes("Vercel")
        ? 503
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
