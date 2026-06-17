import { NextResponse } from "next/server";
import { STORAGE_HELP, githubPersistenceEnabled, isReadOnlyServerFilesystem, isVercelDeploy } from "@/lib/persist";

export const dynamic = "force-dynamic";

/** Kiểm tra nhanh cấu hình lưu trữ (không lộ token). */
export async function GET() {
  const github = githubPersistenceEnabled();
  const vercel = isVercelDeploy();
  const readOnly = isReadOnlyServerFilesystem();
  const ok = !readOnly || github;
  return NextResponse.json({
    ok,
    vercel,
    readOnlyFs: readOnly,
    hasGitHubToken: Boolean(process.env.GITHUB_TOKEN?.trim()),
    hasGitHubRepo: Boolean(process.env.GITHUB_REPO?.trim()),
    persistence: github ? "github" : readOnly ? "none" : "local-files",
    hint: ok ? null : STORAGE_HELP,
  });
}
