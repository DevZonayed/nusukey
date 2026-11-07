# NusukKey API (Cloudflare Worker + D1)

One-time setup (about 3 minutes):

```bash
cd worker
npx wrangler login                          # opens the browser once
npx wrangler d1 create nusukey              # copy the database_id into wrangler.toml
npx wrangler d1 execute nusukey --remote --file schema.sql
openssl rand -base64 32 | npx wrangler secret put KEY_PEPPER
npx wrangler deploy                         # prints https://nusukey-api.<you>.workers.dev
```

Then set `window.NK_API` in `../config.js` to that URL, and commit + push. The page switches from local mode to the shared pool.

Local dev: `echo KEY_PEPPER=dev > .dev.vars && npx wrangler d1 execute nusukey --local --file schema.sql && npx wrangler dev --port 8787`.

Never commit `.dev.vars` or the pepper. Back up: `npx wrangler d1 export nusukey --remote --output backup.sql`.
