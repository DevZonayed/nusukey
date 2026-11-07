# NusukKey — build brief (master → Codex)

You are the implementation worker. Work on branch `feat/initial` in this repo (`~/orca/projects/nusukey`), commit when done, and write `RESULT.md` (what you built, how to run, anything unfinished). Do not push and do not deploy; the master reviews and deploys.

## What it is
A fast community page where people **share** their Nusuk "Free Umrah challenge" referral code and **take** other people's codes. Reference look: dark green + warm gold, Islamic geometric pattern header, lantern accents, one big "Your next code" card, a 3-step strip, a searchable code grid with tabs. Make it look premium and calm, but build it from scratch: no copied art.

**Branding:** name "NusukKey". Make an **original** SVG logo mark (e.g. a key whose bow is an 8-point star, gold on deep green), used inline in the header and as `favicon.svg`. Do NOT use or imitate the official Nusuk logo. The footer must say: "Unofficial community tool. Not affiliated with Nusuk or the Ministry of Hajj and Umrah."

## Hard requirements
1. **Speed:** a static `index.html` with inline critical CSS + one deferred `app.js` (vanilla JS, no framework, no build step, no web fonts or 1 preloaded font max — prefer system font stack + a monospace stack). The page should load in under 50 KB gzipped. Don't load any third-party scripts. The code list renders with a DocumentFragment and is capped (render 60, "show more" button) so 50k codes stay smooth. Search is debounced.
2. **Easy giving (main flow).** A big "Share your code" box at the top, beside or under the hero:
   - A textarea, "Paste the message from the Nusuk app here", plus a **Paste** button (`navigator.clipboard.readText`, falling back to focusing the textarea).
   - Extract codes from anything pasted: the full share message, the link `https://services.nusuk.sa/app?p=27&id=NG-vW7So71R`, or just `NG-vW7So71R`. Regex: `/\bNG-[A-Za-z0-9]{8}\b/g` (case-sensitive codes; keep the exact case). Remove duplicates. Show the found codes as chips live while typing, with a "Add N codes" button. Invalid input shows a short helpful message.
   - Short collapsible "How to get your code" steps: Nusuk app → Challenge → Share button → Copy message → paste here.
   - The codes the user adds are remembered as "mine" and never shown to them as a code to take.
3. **Easy taking.** "Your next code" card: big code, **Copy & show next** (Space key shortcut), **Skip**, and **"Didn't work"** (report). Copy uses `navigator.clipboard.writeText` with a textarea fallback, then a toast "Copied — paste it in Nusuk". Any grid item copies on tap.
4. **Never show a code twice to the same user.** Once a user copies (or skips + reports) a code, it is hidden from them for good: in the next-code card, and in the Remaining tab. Tabs: Remaining / Newly added (last 24 h) / Used by me / Mine (codes I shared) / All. Counters: "You copied X · Remaining Y".
5. **Fair spreading:** the next code is picked from the codes the user hasn't seen, ordered by lowest global copy count first, then newest; pick at random among the 20 least-copied so two people don't get the same one at the same moment. Codes with 3+ "didn't work" reports are hidden for everyone.
6. **User key (sync across devices):** on first visit generate a random key in the browser (`crypto.getRandomValues`, 16 bytes, shown as `NK-xxxx-xxxx-xxxx-xxxx` base32). Stored in localStorage. The header pill shows "Your key" — click opens a small dialog: show/copy key, "Use a key from another device" input. The top banner from the reference ("Save your key so your used codes stay saved across devices") shows until the user dismisses it or copies their key.
7. **Languages:** EN / বাংলা / عربي switch (Arabic sets `dir="rtl"`). All strings in one object in `app.js`. Bangla should be natural everyday Bangladeshi Bangla, not stiff. Remember the choice.
8. **Stats bar:** people active now, copies today, codes added today (from the API).
9. **Accessibility/responsive:** works at 360 px width with no horizontal scroll; buttons ≥ 44 px; visible focus; `prefers-reduced-motion` respected; light theme only is fine.
10. **Security in the page:** render every code and every string with `textContent` (never `innerHTML` with data). Add a strict CSP meta tag (`default-src 'self'; connect-src 'self' <API origin>; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`). No inline scripts.

## Backend: Cloudflare Worker + D1 (`worker/`)
`worker/wrangler.toml`, `worker/src/index.js` (plain JS module, no deps), `worker/schema.sql`, `worker/README.md` (deploy steps).

Tables:
- `codes(code TEXT PRIMARY KEY, added_at INTEGER, owner_hash TEXT, copies INTEGER DEFAULT 0, reports INTEGER DEFAULT 0, last_copied_at INTEGER)`; index on `(reports, copies, added_at)`.
- `events(key_hash TEXT, code TEXT, kind TEXT CHECK(kind IN ('copy','skip','report')), at INTEGER, PRIMARY KEY(key_hash, code, kind))`.
- `daily(day TEXT, metric TEXT, n INTEGER, PRIMARY KEY(day, metric))` for stats.
- `presence(key_hash TEXT PRIMARY KEY, seen_at INTEGER)` (active now = seen in last 5 min).

Key handling: the client sends its key in an `X-NK-Key` header. The worker **never stores the raw key**: it stores `HMAC-SHA256(KEY_PEPPER, key)` (`KEY_PEPPER` is a Worker secret). Reject keys that don't match the format.

Endpoints (JSON, CORS allowlist from env `ALLOWED_ORIGINS`, comma-separated; reply 403 to other origins):
- `GET /api/pool` → `{codes:[{c, a(added_at), n(copies)}], stats:{active, copiesToday, addedToday, total}}` — all live codes (reports < 3), **edge-cached 20 s** via the Cache API (no key involved, so it caches for everyone). This is the main fast path.
- `GET /api/me` (key) → `{seen:[codes copied/skipped/reported], mine:[codes added]}`; also updates presence.
- `POST /api/codes` (key) body `{text}` → the server re-runs the regex on `text` itself (max 5 KB, max 20 codes per request), `INSERT OR IGNORE`, returns `{added:[...], existing:[...]}`.
- `POST /api/event` (key) body `{code, kind}` → insert event (ignore duplicates); on first `copy` increment `codes.copies`; on first `report` increment `codes.reports`.
- Rate limit per IP + per key hash (e.g. 30 writes/min) using the Workers Rate Limiting binding if available, else a simple D1/in-memory counter; return 429 with a friendly JSON error.
- Security headers on every response; body size limit; all SQL parameterised.

## Frontend ↔ backend
`config.js` holds `window.NK_API = ""`. When empty or the API fails, the app runs in **local mode**: data lives in localStorage only (and loads an optional `codes.json` seed shipped next to the page), and a small notice says "Shared pool offline — codes you add are saved on this device only". When set, the client:
- loads `/api/pool` + `/api/me` in parallel on start, keeps local `seen` set in localStorage too (so hiding works instantly even offline), merges with server `seen`.
- writes events optimistically (UI updates first; failed writes retry from a small localStorage queue).
- refreshes the pool every 30 s while the tab is visible.

## Done means
- `index.html`, `app.js`, `config.js`, `favicon.svg`, `codes.json` (empty array), `.nojekyll` at repo root (GitHub Pages serves the root).
- `worker/` as above; `npx wrangler dev` runs it locally (document how).
- A quick self-check: `node --check app.js worker/src/index.js`; serve the root with `python3 -m http.server` and confirm the page loads with no console errors in local mode.
- `RESULT.md` written, everything committed on `feat/initial`.
