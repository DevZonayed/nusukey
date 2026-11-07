#!/usr/bin/env bash
# Publish the static site to Cloudflare Pages (https://nusukey.pages.dev). Only the page files go up.
set -euo pipefail
cd "$(dirname "$0")"
OUT=$(mktemp -d)
cp index.html app.js config.js favicon.svg codes.json "$OUT"/
cp -R fonts img "$OUT"/
cat > "$OUT/_headers" <<'H'
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/img/*
  Cache-Control: public, max-age=31536000, immutable
/*.js
  Cache-Control: public, max-age=300, must-revalidate
H
npx wrangler pages deploy "$OUT" --project-name nusukey --branch main --commit-dirty=true
rm -rf "$OUT"
