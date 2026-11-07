// NusukKey API — Cloudflare Worker + D1. No dependencies.
const CODE_G = /\bNG-[A-Za-z0-9]{8}\b/g;
const CODE_ONE = /^NG-[A-Za-z0-9]{8}$/;
const KEY_RE = /^NK-[A-Z2-7]{5}(?:-[A-Z2-7]{5}){3}$/;
const MAX_BODY = 6000;
const POOL_LIMIT = 4000;
const POOL_TTL = 20; // seconds at the edge
const MAX_ADDS_PER_KEY_DAY = 40;
const HIDE_AFTER_REPORTS = 3;

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const now = () => Date.now();
const day = (t = now()) => new Date(t).toISOString().slice(0, 10);

function corsFor(req, env) {
  const origin = req.headers.get('Origin');
  if (!origin) return { ok: true, headers: {} };
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return { ok: false, headers: {} };
  return {
    ok: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-NK-Key',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...extra },
  });
}

let hmacKey; let hmacPepper;
async function hashKey(env, key) {
  if (!env.KEY_PEPPER) throw new Error('KEY_PEPPER secret missing');
  if (!hmacKey || hmacPepper !== env.KEY_PEPPER) {
    hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.KEY_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    hmacPepper = env.KEY_PEPPER;
  }
  const sig = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(key));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function keyHashOf(req, env) {
  const key = (req.headers.get('X-NK-Key') || '').trim();
  if (!KEY_RE.test(key)) return null;
  return hashKey(env, key);
}

async function limited(env, id) {
  if (!env.RL) return false;
  try { const { success } = await env.RL.limit({ key: id }); return !success; } catch { return false; }
}

async function readBody(req) {
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > MAX_BODY) return null;
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; }
}

const bump = (env, metric, n = 1) =>
  env.DB.prepare('INSERT INTO daily (day, metric, n) VALUES (?1, ?2, ?3) ON CONFLICT(day, metric) DO UPDATE SET n = n + ?3').bind(day(), metric, n);

async function pool(env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request('https://nusukey.internal/pool/v1');
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const since = now() - 5 * 60e3;
  const [codes, stats, active, total] = await env.DB.batch([
    env.DB.prepare(`SELECT code AS c, added_at / 1000 AS a, copies AS n FROM codes WHERE reports < ${HIDE_AFTER_REPORTS} ORDER BY copies ASC, added_at DESC LIMIT ${POOL_LIMIT}`),
    env.DB.prepare("SELECT metric, n FROM daily WHERE day = ?1 OR metric = 'copies_total'").bind(day()),
    env.DB.prepare('SELECT COUNT(*) AS n FROM presence WHERE seen_at > ?1').bind(since),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM codes WHERE reports < ${HIDE_AFTER_REPORTS}`),
  ]);
  const m = {};
  for (const r of stats.results) m[r.metric] = (m[r.metric] || 0) + r.n;
  const body = {
    codes: codes.results.map((r) => ({ c: r.c, a: Math.floor(r.a), n: r.n })),
    stats: {
      active: active.results[0].n,
      copiesToday: m.copies || 0,
      addedToday: m.added || 0,
      copiesTotal: m.copies_total || 0,
      total: total.results[0].n,
    },
  };
  const res = new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${POOL_TTL}`, ...SEC_HEADERS },
  });
  ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

async function me(env, kh) {
  const [seen, mine] = await env.DB.batch([
    env.DB.prepare('SELECT DISTINCT code FROM events WHERE key_hash = ?1').bind(kh),
    env.DB.prepare('SELECT code FROM codes WHERE owner_hash = ?1 ORDER BY added_at').bind(kh),
    env.DB.prepare('INSERT INTO presence (key_hash, seen_at) VALUES (?1, ?2) ON CONFLICT(key_hash) DO UPDATE SET seen_at = ?2').bind(kh, now()),
  ]);
  return json({ seen: seen.results.map((r) => r.code), mine: mine.results.map((r) => r.code) });
}

async function addCodes(env, kh, body) {
  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_BODY) : '';
  const codes = [...new Set(text.match(CODE_G) || [])].slice(0, 20);
  if (!codes.length) return json({ error: 'no_code' }, 400);

  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM codes WHERE owner_hash = ?1 AND added_at > ?2').bind(kh, now() - 864e5).first('n');
  if (recent + codes.length > MAX_ADDS_PER_KEY_DAY) return json({ error: 'too_many_today' }, 429);

  const t = now();
  const res = await env.DB.batch(codes.map((c) =>
    env.DB.prepare('INSERT OR IGNORE INTO codes (code, added_at, owner_hash) VALUES (?1, ?2, ?3) RETURNING code').bind(c, t, kh)));
  const added = []; const existing = [];
  res.forEach((r, i) => (r.results.length ? added : existing).push(codes[i]));
  const writes = [env.DB.prepare('INSERT INTO presence (key_hash, seen_at) VALUES (?1, ?2) ON CONFLICT(key_hash) DO UPDATE SET seen_at = ?2').bind(kh, t)];
  if (added.length) writes.push(bump(env, 'added', added.length));
  await env.DB.batch(writes);
  return json({ added, existing });
}

async function event(env, kh, body) {
  const code = typeof body.code === 'string' ? body.code : '';
  const kind = body.kind;
  if (!CODE_ONE.test(code) || !['copy', 'skip', 'report'].includes(kind)) return json({ error: 'bad_event' }, 400);
  const t = now();
  const ins = await env.DB.prepare('INSERT OR IGNORE INTO events (key_hash, code, kind, at) VALUES (?1, ?2, ?3, ?4) RETURNING kind').bind(kh, code, kind, t).first();
  if (ins) {
    if (kind === 'copy') {
      await env.DB.batch([
        env.DB.prepare('UPDATE codes SET copies = copies + 1, last_copied_at = ?2 WHERE code = ?1').bind(code, t),
        bump(env, 'copies'),
        env.DB.prepare("INSERT INTO daily (day, metric, n) VALUES ('all', 'copies_total', 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1"),
      ]);
    } else if (kind === 'report') {
      // a code's owner can't report it; reports from many keys hide it for everyone
      await env.DB.prepare('UPDATE codes SET reports = reports + 1 WHERE code = ?1 AND (owner_hash IS NULL OR owner_hash != ?2)').bind(code, kh).run();
    }
  }
  return json({ ok: true });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const cors = corsFor(req, env);
    if (!cors.ok) return json({ error: 'origin_not_allowed' }, 403);
    const withCors = (res) => { for (const [k, v] of Object.entries(cors.headers)) res.headers.set(k, v); return res; };

    if (req.method === 'OPTIONS') return withCors(new Response(null, { status: 204, headers: SEC_HEADERS }));

    try {
      if (url.pathname === '/api/pool' && req.method === 'GET') {
        const res = await pool(env, ctx);
        return withCors(new Response(res.body, res));
      }
      if (url.pathname === '/' || url.pathname === '/healthz') return withCors(json({ ok: true }));

      const kh = await keyHashOf(req, env);
      if (!kh) return withCors(json({ error: 'bad_key' }, 401));

      if (url.pathname === '/api/me' && req.method === 'GET') return withCors(await me(env, kh));

      if (req.method === 'POST' && (url.pathname === '/api/codes' || url.pathname === '/api/event')) {
        // writes need a browser origin we trust
        if (!req.headers.get('Origin')) return withCors(json({ error: 'origin_required' }, 403));
        const ip = req.headers.get('CF-Connecting-IP') || 'na';
        if (await limited(env, 'ip:' + ip) || await limited(env, 'k:' + kh)) return withCors(json({ error: 'slow_down' }, 429, { 'Retry-After': '60' }));
        const body = await readBody(req);
        if (!body) return withCors(json({ error: 'bad_body' }, 400));
        return withCors(url.pathname === '/api/codes' ? await addCodes(env, kh, body) : await event(env, kh, body));
      }
      return withCors(json({ error: 'not_found' }, 404));
    } catch (e) {
      console.error(e && e.stack || e);
      return withCors(json({ error: 'server_error' }, 500));
    }
  },

  // hourly cleanup: drop stale presence rows and very old daily rows
  async scheduled(_evt, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM presence WHERE seen_at < ?1').bind(now() - 864e5),
      env.DB.prepare("DELETE FROM daily WHERE day != 'all' AND day < ?1").bind(day(now() - 90 * 864e5)),
    ]);
  },
};
