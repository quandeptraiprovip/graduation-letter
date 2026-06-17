export type GitHubConfig = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

export type GitHubConfigDiagnostic = {
  ok: boolean;
  hasToken: boolean;
  tokenLength: number;
  repoRaw: string | null;
  repoNormalized: string | null;
  branch: string;
  missing: string[];
};

function cleanEnv(value: string | undefined): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^['"]|['"]$/g, "");
}

/** PAT / fine-grained token (chỉ dùng server-side). */
export function getGitHubToken(): string | undefined {
  const v =
    cleanEnv(process.env.GITHUB_TOKEN) ||
    cleanEnv(process.env.GH_TOKEN) ||
    cleanEnv(process.env.GITHUB_PAT);
  return v || undefined;
}

export function normalizeGitHubRepo(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;

  const fromUrl = t.match(/github\.com[/:]([\w.-]+)\/([\w.-]+)/i);
  if (fromUrl) {
    const repo = fromUrl[2].replace(/\.git$/i, "");
    return `${fromUrl[1]}/${repo}`;
  }

  const parts = t.split("/").filter(Boolean);
  if (parts.length >= 2) {
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1].replace(/\.git$/i, "");
    if (owner && repo && !owner.includes("github.com")) {
      return `${owner}/${repo}`;
    }
  }

  return null;
}

export function getGitHubRepoRaw(): string | undefined {
  const v =
    cleanEnv(process.env.GITHUB_REPO) ||
    cleanEnv(process.env.GITHUB_REPOSITORY);
  return v || undefined;
}

export function getGitHubRepoSlug(): string | undefined {
  const raw = getGitHubRepoRaw();
  if (!raw) return undefined;
  return normalizeGitHubRepo(raw) ?? undefined;
}

export function getGitHubBranch(): string {
  return (
    cleanEnv(process.env.GITHUB_BRANCH) ||
    cleanEnv(process.env.VERCEL_GIT_COMMIT_REF) ||
    "main"
  );
}

export function githubPersistenceEnabled(): boolean {
  return Boolean(getGitHubToken() && getGitHubRepoSlug());
}

export function getGitHubConfig(): GitHubConfig | null {
  const token = getGitHubToken();
  const slug = getGitHubRepoSlug();
  if (!token || !slug) return null;
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) return null;
  return { token, owner, repo, branch: getGitHubBranch() };
}

export function getGitHubConfigDiagnostic(): GitHubConfigDiagnostic {
  const token = getGitHubToken();
  const repoRaw = getGitHubRepoRaw() ?? null;
  const repoNormalized = getGitHubRepoSlug() ?? null;
  const missing: string[] = [];
  if (!token) missing.push("GITHUB_TOKEN");
  if (!repoRaw) missing.push("GITHUB_REPO");
  else if (!repoNormalized) missing.push("GITHUB_REPO (định dạng sai — dùng owner/repo)");

  return {
    ok: Boolean(token && repoNormalized),
    hasToken: Boolean(token),
    tokenLength: token?.length ?? 0,
    repoRaw,
    repoNormalized,
    branch: getGitHubBranch(),
    missing,
  };
}
