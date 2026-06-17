import { NextResponse } from "next/server";
import { STORAGE_HELP, formatStorageError } from "@/lib/persist";
import { appendRsvp } from "@/lib/rsvp-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      attend?: string;
      message?: string;
    };
    if (body.attend !== "yes" && body.attend !== "no") {
      return NextResponse.json(
        { error: "Vui lòng chọn có/không tham dự" },
        { status: 400 }
      );
    }
    const entry = await appendRsvp({
      name: body.name ?? "",
      attend: body.attend,
      message: body.message ?? "",
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = formatStorageError(e, "Lỗi lưu RSVP");
    const status = msg.includes("Thiếu")
      ? 400
      : msg === STORAGE_HELP
        ? 503
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
