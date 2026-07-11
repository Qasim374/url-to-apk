// Server-only helpers for talking to the GitHub REST API.
// The token never leaves the server (used only inside API route handlers).

export function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error(
      "Missing env vars. Set GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO."
    );
  }
  return { token, owner, repo };
}

export function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "url-to-apk",
  };
}
