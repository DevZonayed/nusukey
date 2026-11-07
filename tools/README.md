# Archive import

One-off import of codes from a public archive straight into D1 (bypasses the Worker, whose free plan allows ~50 queries per request).

1. Pull: `python3 -I tools/pull_nk.py https://nusukkeys.pages.dev KEYFILE OUTDIR` (needs a guest key from their `/api/session` with `anon: true` in KEYFILE; 1 request per second).
2. Build SQL: `python3 -I tools/make_import_sql.py import.sql OUTDIR/codes.txt [more lists…]` (strict `NG-` + 8 alnum, dedupe, `imported = 1`, no fake added time).
3. Load: `cd worker && npx wrangler d1 execute nusukey --remote --yes --file ../import.sql` (existing codes are skipped, so re-running only adds new ones).

Each imported code costs ~4 D1 row writes (row + indexes); the free plan has 100,000 writes per day.
