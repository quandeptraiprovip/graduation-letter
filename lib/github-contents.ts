const BRANCH = () => process.env.GITHUB_BRANCH || "main";

function repoParts() {
  const raw = process.env.GITHUB_REPO?.trim();
  if (!raw) throw new Error("GITHUB_REPO not set");
  const [owner, repo] = raw.split("/");
  if (!owner || !repo) throw new Error("GITHUB_REPO invalid");
  return { owner, repo };
}

function headers() {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function decodeBase64Content(content: string): Buffer {
  return Buffer.from(content.replace(/\s/g, ""), "base64");
}

/** @deprecated use githubPersistenceEnabled from ./persist */
export function isGitHubStorageEnabled(): boolean {
  return Boolean(
    process.env.GITHUB_TOKEN?.trim() && process.env.GITHUB_REPO?.trim()
  );
}

export async function githubReadText(repoPath: string): Promise<string | null> {
  const { owner, repo } = repoParts();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${BRANCH()}`,
    { headers: headers(), cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub read ${repoPath}: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { content: string };
  return decodeBase64Content(json.content).toString("utf8");
}

export async function githubReadBinary(repoPath: string): Promise<Buffer | null> {
  const { owner, repo } = repoParts();
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${BRANCH()}`,
    { headers: headers(), cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read ${repoPath}: ${res.status}`);
  const json = (await res.json()) as { content: string };
  return decodeBase64Content(json.content);
}

export async function githubWriteBinary(
  repoPath: string,
  data: Buffer,
  message: string
): Promise<void> {
  const { owner, repo } = repoParts();
  const head = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${BRANCH()}`,
    { headers: headers(), cache: "no-store" }
  );
  let sha: string | undefined;
  if (head.ok) {
    const j = (await head.json()) as { sha: string };
    sha = j.sha;
  }
  const put = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}`,
    {
      method: "PUT",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        content: data.toString("base64"),
        branch: BRANCH(),
        ...(sha ? { sha } : {}),
      }),
    }
  );
  if (!put.ok) {
    const err = await put.text();
    throw new Error(`GitHub write ${repoPath}: ${put.status} ${err}`);
  }
}

export async function githubWriteText(
  repoPath: string,
  text: string,
  message: string
): Promise<void> {
  await githubWriteBinary(repoPath, Buffer.from(text, "utf8"), message);
}
