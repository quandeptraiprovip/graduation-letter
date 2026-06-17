import { promises as fs } from "fs";
import path from "path";
import {
  githubReadBinary,
  githubReadText,
  githubWriteBinary,
  githubWriteText,
} from "./github-contents";

/** Lưu qua GitHub Contents API (bắt buộc để ghi khi deploy Vercel). */
export function githubPersistenceEnabled(): boolean {
  return Boolean(
    process.env.GITHUB_TOKEN?.trim() && process.env.GITHUB_REPO?.trim()
  );
}

export function isVercelDeploy(): boolean {
  return process.env.VERCEL === "1";
}

const STORAGE_HELP =
  "Trên Vercel cần thêm biến môi trường GITHUB_TOKEN (PAT có quyền ghi repo) và GITHUB_REPO (vd: quandeptraiprovip/graduation-letter) rồi redeploy.";

export function assertCanWriteToDisk(): void {
  if (isVercelDeploy() && !githubPersistenceEnabled()) {
    throw new Error(STORAGE_HELP);
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
  await fs.mkdir(path.dirname(dataFilePath(local)), { recursive: true });
  await fs.writeFile(dataFilePath(local), content, "utf8");
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
  await fs.mkdir(path.dirname(dataFilePath(local)), { recursive: true });
  await fs.writeFile(dataFilePath(local), data);
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
