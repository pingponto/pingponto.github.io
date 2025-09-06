# pingponto
A minimal **Progressive Web App (PWA)** for time punches on **old/low-end devices**. The goal is to reuse obsolete smartphones or tablets as a dedicated time clock.

## Features (MVP)
- **Employee**: punch `IN`, `LUNCH_OUT`, `LUNCH_IN`, `OUT`.
- **Manager**: view time records (by employee and date range) and **export CSV**.
- **Local-only**: runs offline; data stored in **IndexedDB**. No backend required.
- **Simple auth**: local PIN for employees and manager.
- **PWA basics**: manifest + service worker (static cache + offline fallback).

## Tech choices
- **No heavy frameworks**: plain HTML + CSS + vanilla JS for maximum compatibility.
- **Storage**: IndexedDB (data) and localStorage (small preferences).
- **Build**: none; deploy as static files on GitHub Pages.

## Run locally
```bash
# Python
python3 -m http.server 8080

# Node
npx http-server -p 8080
```
Open `http://localhost:8080` on your device and "Install" it as an app (PWA).

## Deploy on GitHub Pages (via Actions)
1. Push the repo with the following structure (root-level static files):
   - `index.html`, `report.html`, `styles.css`, `app.js`, `db.js`, `sw.js`, `manifest.webmanifest`
   - `icons/icon-192.png`, `icons/icon-512.png`
2. Create `.github/workflows/pages.yml` with the workflow below.
3. In **Settings → Pages**, set **Build and deployment** to **GitHub Actions**.

## Compatibility
- Designed for older Android devices (Android 6+ tends to work; older may vary).
- Avoids cutting-edge APIs to keep JS simple and portable.

## Security notes
- PINs are hashed with a simple local hash for demo purposes only.
- For production: use a backend, strong hashing, rate limiting, and device hardening.

## Roadmap (optional)
- Sync endpoint (export/import JSON).
- Locked reports (ask for manager PIN to open).
- Work-shift rules and daily totals.
- QR/NFC employee quick select.
