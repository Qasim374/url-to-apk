# URL → APK

Paste a website URL, get an installable Android **.apk**. A Next.js site (hosted
free on Vercel) collects the URL and triggers a **GitHub Actions** workflow that
wraps the site in a [Capacitor](https://capacitorjs.com/) WebView app, compiles a
debug APK, and publishes it as a GitHub Release for direct download.

```
┌─────────────┐   POST /api/build     ┌──────────────────────┐
│  Next.js UI │ ───────────────────▶  │  /api/build route     │
│  (Vercel)   │                       │  fires repository_    │
│             │ ◀───────────────────  │  dispatch to GitHub   │
└─────────────┘   poll /api/status    └──────────┬───────────┘
       ▲                                          │
       │ download link                            ▼
       │                              ┌──────────────────────┐
       └──────────────────────────────│  GitHub Actions       │
              GitHub Release          │  Capacitor + Gradle → │
              (public .apk asset)     │  app-debug.apk        │
                                      └──────────────────────┘
```

## Why two parts?

Vercel is serverless and has **no Android SDK**, so it can't compile APKs.
GitHub Actions gives you a full Android toolchain for free (2,000 min/month),
which is where the real build happens.

## Setup

### 1. Create the GitHub repo
Push this folder to a new **public** GitHub repo (public so the release `.apk`
is downloadable without auth). The `.github/workflows/build-apk.yml` workflow
comes along with it.

### 2. Create a Personal Access Token
GitHub → Settings → Developer settings → **Fine-grained token** for this repo with:
- **Contents:** Read and write
- **Actions:** Read and write

Copy the token (starts with `github_pat_...` or `ghp_...`).

### 3. Deploy to Vercel
Import the repo at [vercel.com/new](https://vercel.com/new). Add these
**Environment Variables**:

| Name           | Value                         |
| -------------- | ----------------------------- |
| `GITHUB_TOKEN` | the token from step 2         |
| `GITHUB_OWNER` | your GitHub username / org    |
| `GITHUB_REPO`  | this repo's name              |

Deploy. Done.

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in the three vars
npm run dev
```

Open http://localhost:3000. (Builds still run on GitHub — local dev only serves
the UI + API.)

## Notes & limits

- The app is a **WebView wrapper**: it loads the live site. It needs internet and
  reflects the site as-is. It is not a native rewrite.
- APKs are **debug-signed** → sideload only (enable "Install unknown apps" on the
  phone). For Play Store upload you'd add a release keystore + signing step.
- Sites that block being framed / have strict CSP mostly still work here because
  it's a full WebView (not an iframe), but some login/OAuth flows can be finicky.
- Only build sites you have the right to package.
