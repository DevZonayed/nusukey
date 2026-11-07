# NusukKey

Community page to share and take Nusuk Umrah-challenge referral codes. Unofficial; not affiliated with Nusuk.

- `index.html`, `app.js`, `config.js`, `favicon.svg`, `fonts/`, `img/`: static site, no build step. Live at https://nusukey.pages.dev (deploy: `./deploy-pages.sh`), mirror on GitHub Pages.
- `assets/pixabay/`: original stock photo + licence sidecar (Pixabay Content Licence, no credit required).
- `worker/`: Cloudflare Worker + D1 API (shared pool, per-key history, stats). See `worker/README.md`.

With `NK_API` empty, the page runs in local mode (this device only).
