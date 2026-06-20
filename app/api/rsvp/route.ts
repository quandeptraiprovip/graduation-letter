import { NextResponse } from "next/server";
import { STORAGE_HELP, formatStorageError } from "@/lib/persist";
import { appendRsvp, findRsvpByInviteSlug } from "@/lib/rsvp-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const inviteSlug = new URL(request.url).searchParams.get("inviteSlug")?.trim();
  if (!inviteSlug) {
    return NextResponse.json(
      { error: "Thiếu inviteSlug" },
      { status: 400 }
    );
  }
  try {
    const entry = await findRsvpByInviteSlug(inviteSlug);
    return NextResponse.json({ entry });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Không đọc được RSVP" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      attend?: string;
      message?: string;
      inviteSlug?: string;
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
      inviteSlug: body.inviteSlug,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = formatStorageError(e, "Lỗi lưu RSVP");
    const status = msg.includes("Thiếu")
      ? 400
      : msg === STORAGE_HELP || msg.includes("Vercel") || msg.includes("Google")
        ? 503
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
