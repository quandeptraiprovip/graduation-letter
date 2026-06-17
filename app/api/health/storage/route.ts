import { NextResponse } from "next/server";
import { githubPersistenceEnabled, isVercelDeploy } from "@/lib/persist";

export const dynamic = "force-dynamic";

/** Kiểm tra nhanh cấu hình lưu trữ (không lộ token). */
export async function GET() {
  const github = githubPersistenceEnabled();
  const vercel = isVercelDeploy();
  const ok = !vercel || github;
  return NextResponse.json({
    ok,
    vercel,
    persistence: github ? "github" : vercel ? "none" : "local-files",
    hint: ok
      ? null
      : "Thêm GITHUB_TOKEN và GITHUB_REPO trên Vercel rồi redeploy.",
  });
}
