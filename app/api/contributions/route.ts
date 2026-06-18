import { NextResponse } from "next/server";
import { STORAGE_HELP, formatStorageError } from "@/lib/persist";
import {
  appendContribution,
  listContributions,
} from "@/lib/contribution-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDataUrl(
  d?: string
): { buf: Buffer; ext: "png" | "jpg" } | null {
  if (!d) return null;
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(d);
  if (!m) return null;
  const ext = m[1].toLowerCase().startsWith("jp") ? "jpg" : "png";
  return { buf: Buffer.from(m[2], "base64"), ext };
}

export async function GET() {
  try {
    const entries = await listContributions();
    return NextResponse.json({ entries });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Không tải được cuốn lưu bút" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      photoDataUrl?: string;
      sigDataUrl?: string;
    };
    const photo = parseDataUrl(body.photoDataUrl);
    const sig = parseDataUrl(body.sigDataUrl);
    if (!photo && !sig) {
      return NextResponse.json(
        { error: "Hãy thêm một bức ảnh hoặc ký tên nhé" },
        { status: 400 }
      );
    }
    const entry = await appendContribution({
      photo: photo?.buf,
      photoExt: photo?.ext,
      sig: sig?.buf,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = formatStorageError(e, "Lỗi lưu vào lưu bút");
    const status =
      msg.includes("Hãy thêm") || msg.includes("quá")
        ? 400
        : msg === STORAGE_HELP || msg.includes("Vercel")
          ? 503
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
