import { NextResponse } from "next/server";
import { appendGuestbook, listGuestbook } from "@/lib/guestbook-store";

export const dynamic = "force-dynamic";

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
    };
    const entry = await appendGuestbook({
      name: body.name ?? "",
      emoji: body.emoji ?? "💖",
      message: body.message ?? "",
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lỗi lưu lời chúc";
    const status = msg.includes("Thiếu") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
