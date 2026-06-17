import { NextResponse } from "next/server";
import { getSheetsDiagnostic } from "@/lib/google-sheets";
import { blobStorageConfigured } from "@/lib/signature-storage";
import { isReadOnlyServerFilesystem, isVercelDeploy } from "@/lib/persist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sheets = getSheetsDiagnostic();
  const readOnly = isReadOnlyServerFilesystem();
  const blob = blobStorageConfigured();
  const dataOk = !readOnly || sheets.ok;
  const signatureOk = !readOnly || blob;

  return NextResponse.json({
    ok: dataOk && signatureOk,
    vercel: isVercelDeploy(),
    persistence: sheets.ok ? "google-sheets" : readOnly ? "none" : "local-csv",
    signatures: blob
      ? "vercel-blob"
      : readOnly
        ? "none"
        : "local-files",
    sheets,
    blobConfigured: blob,
    hint: !dataOk
      ? "Cấu hình Google Sheets (xem README)."
      : !signatureOk
        ? "Trên Vercel: bật Vercel Blob và thêm BLOB_READ_WRITE_TOKEN."
        : null,
  });
}
