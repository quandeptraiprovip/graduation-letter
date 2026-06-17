import { NextResponse } from "next/server";
import {
  STORAGE_HELP,
  githubPersistenceEnabled,
  isReadOnlyServerFilesystem,
  isVercelDeploy,
} from "@/lib/persist";
import { getGitHubConfigDiagnostic } from "@/lib/github-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Kiểm tra cấu hình lưu trữ trên server (không lộ token). */
export async function GET() {
  const gh = getGitHubConfigDiagnostic();
  const github = githubPersistenceEnabled();
  const readOnly = isReadOnlyServerFilesystem();
  const ok = !readOnly || github;

  return NextResponse.json({
    ok,
    vercel: isVercelDeploy(),
    vercelEnv: process.env.VERCEL_ENV ?? null,
    readOnlyFs: readOnly,
    persistence: github ? "github" : readOnly ? "none" : "local-files",
    github: gh,
    hint: ok ? null : gh.missing.length ? `Thiếu: ${gh.missing.join(", ")}` : STORAGE_HELP,
  });
}
