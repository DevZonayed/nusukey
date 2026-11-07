# NusukKey

Community page to share and take Nusuk Umrah-challenge referral codes. Unofficial; not affiliated with Nusuk.

- Site: https://nusukey.pages.dev (static, no build step; `./deploy-pages.sh`). Mirror on GitHub Pages.
- API: `worker/` (Cloudflare Worker + D1) at https://nusukey-api.jonayed.workers.dev. See `worker/README.md`.
- Pins: open `/admin.html`, paste the admin token (macOS Keychain: `security find-generic-password -s NUSUKEY_ADMIN_TOKEN -w`).
- No accounts or IDs. Each browser keeps the serials of codes it took as ranges (`1-40,45`), the last 300 codes for history, and a copy of the newest page.
- When you change `index.html`/`app.js`, bump `V` in `sw.js` so phones pick up the new version.
