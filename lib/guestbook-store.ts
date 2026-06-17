import { promises as fs } from "fs";
import path from "path";
import { parseCsv, rowToCsvLine } from "./csv";

export type GuestEntry = {
  timestamp: string;
  name: string;
  emoji: string;
  message: string;
};

const FILE = "guestbook.csv";
const HEADERS = ["timestamp", "name", "emoji", "message"];

function dataPath(filename: string) {
  return path.join(process.cwd(), "data", filename);
}

function isGitHubStorageEnabled(): boolean {
  return Boolean(
    process.env.GITHUB_TOKEN &&
      process.env.GITHUB_REPO &&
      process.env.VERCEL === "1"
  );
}

async function readFileContent(): Promise<string> {
  if (isGitHubStorageEnabled()) {
    const [owner, repo] = process.env.GITHUB_REPO!.split("/");
    const branch = process.env.GITHUB_BRANCH || "main";
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/${FILE}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 0 },
      }
    );
    if (!res.ok) {
      if (res.status === 404) {
        return `${HEADERS.join(",")}\n`;
      }
      throw new Error(`GitHub read failed: ${res.status}`);
    }
    const json = (await res.json()) as { content: string; sha: string };
    (globalThis as { __guestbookSha?: string }).__guestbookSha = json.sha;
    return Buffer.from(json.content, "base64").toString("utf8");
  }
  return fs.readFile(dataPath(FILE), "utf8");
}

async function writeFileContent(content: string): Promise<void> {
  if (isGitHubStorageEnabled()) {
    const [owner, repo] = process.env.GITHUB_REPO!.split("/");
    const branch = process.env.GITHUB_BRANCH || "main";
    let sha: string | undefined = (globalThis as { __guestbookSha?: string })
      .__guestbookSha;
    if (!sha) {
      const head = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/data/${FILE}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      if (head.ok) {
        const j = (await head.json()) as { sha: string };
        sha = j.sha;
      }
    }
    const body = {
      message: "guestbook: new wish",
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    };
    const put = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/${FILE}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify(body),
      }
    );
    if (!put.ok) {
      const err = await put.text();
      throw new Error(`GitHub write failed: ${put.status} ${err}`);
    }
    return;
  }
  await fs.writeFile(dataPath(FILE), content, "utf8");
}

export async function listGuestbook(): Promise<GuestEntry[]> {
  const text = await readFileContent();
  const rows = parseCsv(text);
  return rows
    .map((r) => ({
      timestamp: r.timestamp,
      name: r.name,
      emoji: r.emoji,
      message: r.message,
    }))
    .filter((r) => r.name && r.message)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

export async function appendGuestbook(
  entry: Omit<GuestEntry, "timestamp"> & { timestamp?: string }
): Promise<GuestEntry> {
  const full: GuestEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    name: entry.name.trim(),
    emoji: entry.emoji || "💖",
    message: entry.message.trim(),
  };
  if (!full.name || !full.message) {
    throw new Error("Thiếu tên hoặc lời chúc");
  }
  const text = await readFileContent();
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, full);
  const next = trimmed ? `${trimmed}\n${line}\n` : `${HEADERS.join(",")}\n${line}\n`;
  await writeFileContent(next);
  return full;
}
