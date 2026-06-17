import { NextResponse } from "next/server";
import { STORAGE_HELP, formatStorageError } from "@/lib/persist";
import { appendSignature, listSignatures } from "@/lib/signature-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const entries = await listSignatures();
    return NextResponse.json({ entries });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Không tải được danh sách chữ ký" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      imageDataUrl?: string;
    };
    const name = body.name ?? "";
    const dataUrl = body.imageDataUrl ?? "";
    const m = /^data:image\/png;base64,(.+)$/i.exec(dataUrl);
    if (!m) {
      return NextResponse.json(
        { error: "Chữ ký phải là ảnh PNG" },
        { status: 400 }
      );
    }
    const png = Buffer.from(m[1], "base64");
    const entry = await appendSignature(name, png);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = formatStorageError(e, "Lỗi lưu chữ ký");
    const status =
      msg.includes("Vui lòng") || msg.includes("quá")
        ? 400
        : msg === STORAGE_HELP
          ? 503
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
