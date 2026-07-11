import { NextResponse } from "next/server";
import { githubConfig, githubHeaders } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Build a valid Java package segment (must start with a letter, alphanumeric only).
function packageId(buildId: string) {
  return `com.urltoapk.b${buildId.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
}

// Derive a human app name from the URL's hostname.
function appNameFromUrl(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  const base = host.split(".")[0] || "WebApp";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function POST(request: Request) {
  let payload: { url?: string; appName?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = (payload.url || "").trim();
  if (!raw) {
    return NextResponse.json({ error: "A URL is required." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return NextResponse.json({ error: "That is not a valid URL." }, { status: 400 });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http(s) URLs are supported." },
      { status: 400 }
    );
  }

  // Short, collision-resistant id. randomUUID is available in the Node runtime.
  const buildId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const appName = (payload.appName || "").trim() || appNameFromUrl(target);
  const appId = packageId(buildId);

  let cfg;
  try {
    cfg = githubConfig();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/dispatches`,
    {
      method: "POST",
      headers: githubHeaders(cfg.token),
      body: JSON.stringify({
        event_type: "build-apk",
        client_payload: {
          url: target.toString(),
          buildId,
          appName,
          appId,
        },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: `GitHub dispatch failed (${res.status}).`, detail },
      { status: 502 }
    );
  }

  return NextResponse.json({ buildId, appName, tag: `apk-${buildId}` });
}
