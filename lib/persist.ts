import { promises as fs } from "fs";
import path from "path";
import {
  githubReadBinary,
  githubReadText,
  githubWriteBinary,
  githubWriteText,
} from "./github-contents";

import {
  getGitHubConfigDiagnostic,
  githubPersistenceEnabled,
} from "./github-config";

export { githubPersistenceEnabled, getGitHubConfigDiagnostic };

export function isVercelDeploy(): boolean {
  return (
    process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV?.trim())
  );
}

/** Vercel/Lambda: chỉ đọc được bundle tại /var/task — không ghi file data/. */
export function isReadOnlyServerFilesystem(): boolean {
  if (isVercelDeploy()) return true;
  try {
    return process.cwd().startsWith("/var/task");
  } catch {
    return false;
  }
}

export const STORAGE_HELP =
  "Server chưa thấy GITHUB_TOKEN / GITHUB_REPO. Trên Vercel: Settings → Environment Variables → tick Production → Redeploy (không dùng .env.local). Mở /api/health/storage để xem thiếu biến nào.";

export function storageHelpFromDiagnostic(): string {
  const d = getGitHubConfigDiagnostic();
  if (d.ok) return STORAGE_HELP;
  if (d.missing.length) {
    return `Thiếu hoặc sai: ${d.missing.join(", ")}. ${STORAGE_HELP}`;
  }
  return STORAGE_HELP;
}

export function formatStorageError(e: unknown, fallback: string): string {
  const raw = e instanceof Error ? e.message : fallback;
  if (raw.includes("EROFS") || raw.includes("read-only file system")) {
    return STORAGE_HELP;
  }
  if (raw.includes("Chưa lưu được") || raw.includes("GITHUB_TOKEN")) {
    return raw;
  }
  return raw || fallback;
}

export function assertCanWriteToDisk(): void {
  if (isReadOnlyServerFilesystem() && !githubPersistenceEnabled()) {
    throw new Error(storageHelpFromDiagnostic());
  }
}

export function dataFilePath(...parts: string[]) {
  return path.join(process.cwd(), "data", ...parts);
}

export async function readDataText(repoRelativePath: string): Promise<string> {
  const ghPath = repoRelativePath.startsWith("data/")
    ? repoRelativePath
    : `data/${repoRelativePath}`;
  if (githubPersistenceEnabled()) {
    const t = await githubReadText(ghPath);
    return t ?? "";
  }
  return fs.readFile(dataFilePath(repoRelativePath.replace(/^data\//, "")), "utf8");
}

export async function writeDataText(
  repoRelativePath: string,
  content: string,
  commitMessage: string
): Promise<void> {
  const ghPath = repoRelativePath.startsWith("data/")
    ? repoRelativePath
    : `data/${repoRelativePath}`;
  if (githubPersistenceEnabled()) {
    await githubWriteText(ghPath, content, commitMessage);
    return;
  }
  assertCanWriteToDisk();
  const local = repoRelativePath.replace(/^data\//, "");
  const target = dataFilePath(local);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

export async function readDataBinary(repoRelativePath: string): Promise<Buffer> {
  const ghPath = repoRelativePath.startsWith("data/")
    ? repoRelativePath
    : `data/${repoRelativePath}`;
  if (githubPersistenceEnabled()) {
    const buf = await githubReadBinary(ghPath);
    if (!buf) throw new Error("Không tìm thấy file");
    return buf;
  }
  return fs.readFile(
    dataFilePath(repoRelativePath.replace(/^data\//, ""))
  );
}

export async function writeDataBinary(
  repoRelativePath: string,
  data: Buffer,
  commitMessage: string
): Promise<void> {
  const ghPath = repoRelativePath.startsWith("data/")
    ? repoRelativePath
    : `data/${repoRelativePath}`;
  if (githubPersistenceEnabled()) {
    await githubWriteBinary(ghPath, data, commitMessage);
    return;
  }
  assertCanWriteToDisk();
  const local = repoRelativePath.replace(/^data\//, "");
  const target = dataFilePath(local);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
}

async function readBundledText(
  repoRelativePath: string,
  defaultContent: string
): Promise<string> {
  const local = repoRelativePath.replace(/^data\//, "");
  try {
    return await fs.readFile(dataFilePath(local), "utf8");
  } catch {
    return defaultContent;
  }
}

/** GitHub khi cấu hình; nếu lỗi / file trống → file trong bundle deploy. */
export async function readDataTextOrDefault(
  repoRelativePath: string,
  defaultContent: string
): Promise<string> {
  if (!githubPersistenceEnabled()) {
    return readBundledText(repoRelativePath, defaultContent);
  }
  const ghPath = repoRelativePath.startsWith("data/")
    ? repoRelativePath
    : `data/${repoRelativePath}`;
  try {
    const t = await githubReadText(ghPath);
    if (t && t.trim().includes("\n")) return t;
  } catch (e) {
    console.error("[persist] GitHub read failed, using bundle:", ghPath, e);
  }
  return readBundledText(repoRelativePath, defaultContent);
}
