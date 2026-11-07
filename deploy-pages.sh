#!/usr/bin/env bash
# Publish the static site to Cloudflare Pages (https://nusukey.pages.dev). Only the page files go up.
set -euo pipefail
cd "$(dirname "$0")"
OUT=$(mktemp -d)
cp index.html app.js config.js sw.js manifest.webmanifest favicon.svg admin.html admin.js "$OUT"/
cp -R fonts "$OUT"/
cat > "$OUT/_headers" <<'H'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/sw.js
  Cache-Control: no-cache
/admin.html
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
H
npx wrangler pages deploy "$OUT" --project-name nusukey --branch main --commit-dirty=true
/bin/rm -rf "$OUT"
