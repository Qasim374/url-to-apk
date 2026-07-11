"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "starting" | "building" | "ready" | "error";

const POLL_MS = 5000;
const MAX_POLL_MINUTES = 15;

export default function Home() {
  const [url, setUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [buildId, setBuildId] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef<number>(0);

  function stopPolling() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  useEffect(() => stopPolling, []);

  async function poll(id: string) {
    // Give up after MAX_POLL_MINUTES so we don't spin forever.
    if (Date.now() - startedAt.current > MAX_POLL_MINUTES * 60_000) {
      stopPolling();
      setPhase("error");
      setMessage(
        "Build is taking longer than expected. Check the Actions tab of your GitHub repo for details."
      );
      return;
    }

    try {
      const res = await fetch(`/api/status?buildId=${id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ready") {
        stopPolling();
        setDownloadUrl(data.downloadUrl);
        setFileName(data.fileName || "app.apk");
        setPhase("ready");
      } else if (data.status === "error") {
        stopPolling();
        setPhase("error");
        setMessage(data.error || "Something went wrong while checking status.");
      }
      // "building" → keep polling
    } catch {
      // transient network error — keep polling
    }
  }

  async function startBuild(e: React.FormEvent) {
    e.preventDefault();
    stopPolling();
    setPhase("starting");
    setMessage("");
    setDownloadUrl("");

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, appName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPhase("error");
        setMessage(data.error || "Failed to start the build.");
        return;
      }

      setBuildId(data.buildId);
      setPhase("building");
      startedAt.current = Date.now();
      timer.current = setInterval(() => poll(data.buildId), POLL_MS);
    } catch {
      setPhase("error");
      setMessage("Could not reach the server. Try again.");
    }
  }

  const busy = phase === "starting" || phase === "building";

  return (
    <main className="wrap">
      <div className="header">
        <div className="badge">Website → Android APK</div>
        <h1>URL to APK</h1>
        <p>
          Paste any website URL. We wrap it in a native Android WebView app,
          compile it, and give you an installable <strong>.apk</strong>.
        </p>
      </div>

      <div className="card">
        <form onSubmit={startBuild}>
          <div className="row">
            <label htmlFor="url">Website URL</label>
            <input
              id="url"
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </div>

          <div className="row">
            <label htmlFor="appName">App name (optional)</label>
            <input
              id="appName"
              type="text"
              placeholder="My App"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              disabled={busy}
              autoComplete="off"
            />
          </div>

          <button className="primary" type="submit" disabled={busy || !url}>
            {busy ? "Building…" : "Build APK"}
          </button>
        </form>

        {phase !== "idle" && (
          <div className="status">
            {phase === "starting" && (
              <p className="msg">
                <span className="spinner" />
                Starting the build…
              </p>
            )}

            {phase === "building" && (
              <>
                <p className="msg">
                  <span className="spinner" />
                  Compiling your APK on GitHub Actions. This usually takes
                  2–5 minutes.
                </p>
                <p className="hint">Build ID: {buildId}</p>
              </>
            )}

            {phase === "error" && <p className="err">{message}</p>}

            {phase === "ready" && (
              <>
                <p className="msg" style={{ marginBottom: 10 }}>
                  ✅ Your APK is ready.
                </p>
                <a className="download" href={downloadUrl} download>
                  ⬇ Download {fileName}
                </a>
                <p className="hint">
                  On your Android phone: open the file and allow{" "}
                  <em>“Install from unknown sources”</em> when prompted. This is a
                  debug-signed build meant for direct install (sideloading), not
                  the Play Store.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <p className="footer">
        Free build pipeline · Next.js on Vercel + Capacitor on GitHub Actions
      </p>
    </main>
  );
}
