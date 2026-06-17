import { promises as fs } from "fs";
import path from "path";
import { parseCsv, rowToCsvLine } from "./csv";

export type RsvpEntry = {
  timestamp: string;
  name: string;
  attend: "yes" | "no";
  message: string;
};

const FILE = "rsvp.csv";
const HEADERS = ["timestamp", "name", "attend", "message"];

function dataPath() {
  return path.join(process.cwd(), "data", FILE);
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
      if (res.status === 404) return `${HEADERS.join(",")}\n`;
      throw new Error(`GitHub read RSVP failed: ${res.status}`);
    }
    const json = (await res.json()) as { content: string; sha: string };
    (globalThis as { __rsvpSha?: string }).__rsvpSha = json.sha;
    return Buffer.from(json.content, "base64").toString("utf8");
  }
  return fs.readFile(dataPath(), "utf8");
}

async function writeFileContent(content: string): Promise<void> {
  if (isGitHubStorageEnabled()) {
    const [owner, repo] = process.env.GITHUB_REPO!.split("/");
    const branch = process.env.GITHUB_BRANCH || "main";
    let sha: string | undefined = (globalThis as { __rsvpSha?: string }).__rsvpSha;
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
        body: JSON.stringify({
          message: "rsvp: new response",
          content: Buffer.from(content, "utf8").toString("base64"),
          branch,
          ...(sha ? { sha } : {}),
        }),
      }
    );
    if (!put.ok) throw new Error(`GitHub write RSVP failed: ${put.status}`);
    return;
  }
  await fs.writeFile(dataPath(), content, "utf8");
}

export async function appendRsvp(
  entry: Omit<RsvpEntry, "timestamp"> & { timestamp?: string }
): Promise<RsvpEntry> {
  const full: RsvpEntry = {
    timestamp: entry.timestamp ?? new Date().toISOString(),
    name: entry.name.trim(),
    attend: entry.attend,
    message: (entry.message ?? "").trim(),
  };
  if (!full.name || !full.attend) throw new Error("Thiếu thông tin RSVP");
  const text = await readFileContent();
  const trimmed = text.trimEnd();
  const line = rowToCsvLine(HEADERS, full as Record<string, string>);
  const next = trimmed ? `${trimmed}\n${line}\n` : `${HEADERS.join(",")}\n${line}\n`;
  await writeFileContent(next);
  return full;
}
