import { NextResponse } from "next/server";
import { githubConfig, githubHeaders } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Given a buildId, check whether the release with the APK exists yet.
// The GitHub Actions workflow publishes a release tagged `apk-<buildId>`
// with the compiled .apk attached as an asset.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const buildId = (searchParams.get("buildId") || "").replace(/[^a-z0-9]/gi, "");
  if (!buildId) {
    return NextResponse.json({ error: "buildId is required." }, { status: 400 });
  }

  let cfg;
  try {
    cfg = githubConfig();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const tag = `apk-${buildId}`;
  const res = await fetch(
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/releases/tags/${tag}`,
    { headers: githubHeaders(cfg.token), cache: "no-store" }
  );

  if (res.status === 404) {
    // Release not created yet — still building (or the workflow hasn't started).
    return NextResponse.json({ status: "building" });
  }
  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { status: "error", error: `GitHub API error (${res.status}).`, detail },
      { status: 502 }
    );
  }

  const release = (await res.json()) as {
    assets?: { name: string; browser_download_url: string; size: number }[];
  };
  const apk = release.assets?.find((a) => a.name.endsWith(".apk"));

  if (!apk) {
    // Release exists but the asset isn't uploaded yet — treat as still building.
    return NextResponse.json({ status: "building" });
  }

  return NextResponse.json({
    status: "ready",
    downloadUrl: apk.browser_download_url,
    fileName: apk.name,
    size: apk.size,
  });
}
