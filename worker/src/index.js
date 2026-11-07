// NusukKey API: Cloudflare Worker + D1, no dependencies.
//
// Budget design (free plan): the page-0 list is held in each isolate's memory and rebuilt only when the
// pool "version" changes (a new code, a hidden code, a pin), so most requests cost one 1-row D1 read or none.
// All writes are text/plain POSTs (no CORS preflight) and the browser batches its events.
const CODE_G = /\bNG-[A-Za-z0-9]{8}\b/g;
const SHORT = /^[A-Za-z0-9]{8}$/;
const PAGE = 100;
const P0_TTL = 5e3; // page 0 re-checked at most every 5 s per isolate
const STATS_TTL = 30e3;
const PAGE_TTL = 10 * 60e3;
const MAX_BODY = 6000;
const MAX_ADDS_PER_IP_DAY = 300; // generous: many mobile users in Bangladesh share one carrier IP
const MAX_EVENTS = 30;
const HIDE = 3; // reports from 3 different people hide a code (pinned codes never hide)

const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

const now = () => Date.now();
const day = (t = now()) => new Date(t).toISOString().slice(0, 10);
const mem = { ver: -1, list: null, p0: null, p0At: 0, stats: null, statsAt: 0, pages: new Map() };

function json(data, status = 200, extra = {}) {
  return new Response(typeof data === 'string' ? data : JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC, ...extra },
  });
}

function cors(req, env) {
  const origin = req.headers.get('Origin');
  if (!origin) return { ok: true, h: {} };
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return { ok: false, h: {} };
  return { ok: true, h: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } };
}

let hk; let hkFor;
async function hmac(env, value) {
  if (!env.KEY_PEPPER) throw new Error('KEY_PEPPER secret missing');
  if (!hk || hkFor !== env.KEY_PEPPER) {
    hk = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.KEY_PEPPER), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    hkFor = env.KEY_PEPPER;
  }
  const sig = await crypto.subtle.sign('HMAC', hk, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function limited(env, id) {
  if (!env.RL) return false;
  try { const { success } = await env.RL.limit({ key: id }); return !success; } catch { return false; }
}

async function readBody(req) {
  if (Number(req.headers.get('Content-Length') || 0) > MAX_BODY) return null;
  const text = await req.text();
  if (text.length > MAX_BODY) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; }
}

const bumpDay = (env, metric, n = 1) =>
  env.DB.prepare('INSERT INTO daily (day, metric, n) VALUES (?1, ?2, ?3) ON CONFLICT(day, metric) DO UPDATE SET n = n + ?3').bind(day(), metric, n);
const bumpAll = (env, metric, n = 1) =>
  env.DB.prepare("INSERT INTO daily (day, metric, n) VALUES ('all', ?1, ?2) ON CONFLICT(day, metric) DO UPDATE SET n = n + ?2").bind(metric, n);
const invalidate = () => { mem.ver = -1; mem.p0At = 0; mem.pages.clear(); };
const row = (r) => [r.sn, r.code.slice(3), r.a];
const insertCode = (env, code, t, owner) =>
  env.DB.prepare('INSERT OR IGNORE INTO codes (code, sn, added_at, owner_hash) VALUES (?1, (SELECT COALESCE(MAX(sn), 0) + 1 FROM codes), ?2, ?3) RETURNING sn, code').bind(code, t, owner);

function ranges(nums) {
  const out = []; let a = null; let b = null;
  for (const n of nums) {
    if (a === null) { a = b = n; continue; }
    if (n === b + 1) { b = n; continue; }
    if (n === b) continue;
    out.push(a === b ? String(a) : a + '-' + b); a = b = n;
  }
  if (a !== null) out.push(a === b ? String(a) : a + '-' + b);
  return out.join(',');
}

/* ---------- reads ---------- */
async function page0(env) {
  const t = now();
  if (mem.p0 && t - mem.p0At < P0_TTL) return mem.p0;
  const ver = (await env.DB.prepare("SELECT n FROM daily WHERE day = 'all' AND metric = 'ver'").first('n')) || 0;
  if (ver !== mem.ver || !mem.list) {
    const [pins, latest] = await env.DB.batch([
      env.DB.prepare('SELECT sn, code, added_at / 1000 AS a FROM codes WHERE pinned > 0 ORDER BY pinned DESC LIMIT 50'),
      env.DB.prepare(`SELECT sn, code, added_at / 1000 AS a FROM codes WHERE reports < ${HIDE} AND pinned = 0 ORDER BY sn DESC LIMIT ${PAGE}`),
    ]);
    mem.list = { pins: pins.results.map(row), c: latest.results.map(row) };
    mem.pages.clear();
    mem.ver = ver;
  }
  if (!mem.stats || t - mem.statsAt > STATS_TTL) {
    const [st, act] = await env.DB.batch([
      env.DB.prepare("SELECT metric, n FROM daily WHERE day = ?1 OR day = 'all'").bind(day(t)),
      env.DB.prepare('SELECT COUNT(DISTINCT key_hash) AS n FROM events WHERE at > ?1').bind(t - 5 * 60e3),
    ]);
    const m = {};
    for (const r of st.results) m[r.metric] = (m[r.metric] || 0) + r.n;
    mem.stats = { active: act.results[0].n, copiesToday: m.copies || 0, addedToday: m.added || 0, copiesTotal: m.copies_total || 0, total: m.codes_total || 0 };
    mem.statsAt = t;
  }
  mem.p0 = JSON.stringify({ v: 2, t: Math.floor(t / 1000), pins: mem.list.pins, c: mem.list.c, more: mem.list.c.length === PAGE, s: mem.stats });
  mem.p0At = t;
  return mem.p0;
}

async function pageBefore(env, before) {
  const t = now();
  const hit = mem.pages.get(before);
  if (hit && t - hit.at < PAGE_TTL) return hit.body;
  const r = await env.DB.prepare(`SELECT sn, code, added_at / 1000 AS a FROM codes WHERE sn < ?1 AND reports < ${HIDE} AND pinned = 0 ORDER BY sn DESC LIMIT ${PAGE}`).bind(before).all();
  const body = JSON.stringify({ c: r.results.map(row), more: r.results.length === PAGE });
  if (mem.pages.size > 300) mem.pages.clear();
  mem.pages.set(before, { body, at: t });
  return body;
}

/* ---------- writes ---------- */
async function addCodes(env, kh, body) {
  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_BODY) : '';
  const codes = [...new Set(text.match(CODE_G) || [])].slice(0, 20);
  if (!codes.length) return json({ error: 'no_code' }, 400);
  const t = now();
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM codes WHERE owner_hash = ?1 AND added_at > ?2').bind(kh, t - 864e5).first('n');
  if (recent + codes.length > MAX_ADDS_PER_IP_DAY) return json({ error: 'too_many_today' }, 429);

  const res = await env.DB.batch(codes.map((c) => insertCode(env, c, t, kh)));
  const added = []; const rest = [];
  res.forEach((r, i) => (r.results.length ? added.push([r.results[0].sn, codes[i].slice(3)]) : rest.push(codes[i])));
  let existing = [];
  if (rest.length) {
    const ex = await env.DB.prepare(`SELECT sn, code FROM codes WHERE code IN (${rest.map((_, i) => '?' + (i + 1)).join(',')})`).bind(...rest).all();
    existing = ex.results.map((r) => [r.sn, r.code.slice(3)]);
  }
  if (added.length) {
    await env.DB.batch([bumpDay(env, 'added', added.length), bumpAll(env, 'codes_total', added.length), bumpAll(env, 'ver')]);
    invalidate();
  }
  return json({ added, existing });
}

async function events(env, kh, body) {
  const list = Array.isArray(body.e) ? body.e.slice(0, MAX_EVENTS) : [];
  const ev = [];
  const dedupe = new Set();
  for (const x of list) {
    if (!Array.isArray(x) || !SHORT.test(x[0] || '') || !['c', 'r'].includes(x[1])) continue;
    if (dedupe.has(x[0] + x[1])) continue;
    dedupe.add(x[0] + x[1]);
    ev.push({ code: 'NG-' + x[0], kind: x[1] === 'c' ? 'copy' : 'report' });
  }
  if (!ev.length) return json({ ok: true, n: 0 });
  const t = now();
  const ins = await env.DB.batch(ev.map((e) =>
    env.DB.prepare('INSERT OR IGNORE INTO events (key_hash, code, kind, at) VALUES (?1, ?2, ?3, ?4) RETURNING code, kind').bind(kh, e.code, e.kind, t)));
  const fresh = ins.filter((r) => r.results.length).map((r) => r.results[0]);
  const copies = fresh.filter((r) => r.kind === 'copy');
  const reports = fresh.filter((r) => r.kind === 'report');
  const writes = copies.map((r) => env.DB.prepare('UPDATE codes SET copies = copies + 1, last_copied_at = ?2 WHERE code = ?1').bind(r.code, t));
  if (copies.length) writes.push(bumpDay(env, 'copies', copies.length), bumpAll(env, 'copies_total', copies.length));
  for (const r of reports) {
    // the network that added a code can't report it; pinned codes never hide
    writes.push(env.DB.prepare('UPDATE codes SET reports = reports + 1 WHERE code = ?1 AND pinned = 0 AND (owner_hash IS NULL OR owner_hash != ?2) RETURNING reports').bind(r.code, kh));
  }
  if (writes.length) {
    const out = await env.DB.batch(writes);
    const hidden = out.filter((r) => r.results && r.results[0] && r.results[0].reports === HIDE).length;
    if (hidden) { await env.DB.batch([bumpAll(env, 'codes_total', -hidden), bumpAll(env, 'ver')]); invalidate(); }
  }
  return json({ ok: true, n: fresh.length });
}

async function admin(env, body) {
  if (!env.ADMIN_TOKEN || typeof body.t !== 'string') return json({ error: 'forbidden' }, 403);
  if ((await hmac(env, 'admin:' + body.t)) !== (await hmac(env, 'admin:' + env.ADMIN_TOKEN))) return json({ error: 'forbidden' }, 403);
  const list = async () => {
    const r = await env.DB.prepare('SELECT sn, code, pinned, copies FROM codes WHERE pinned > 0 ORDER BY pinned DESC').all();
    return r.results.map((x) => ({ sn: x.sn, code: x.code, pinnedAt: x.pinned, copies: x.copies }));
  };
  if (body.a === 'list') return json({ pins: await list() });
  const codes = [...new Set(String(body.text || '').slice(0, MAX_BODY).match(CODE_G) || [])].slice(0, 50);
  if (!codes.length) return json({ error: 'no_code' }, 400);
  const t = now();
  if (body.a === 'pin') {
    const ins = await env.DB.batch(codes.map((c) => insertCode(env, c, t, null)));
    const created = ins.filter((r) => r.results.length).length;
    const ups = codes.map((c, i) => env.DB.prepare('UPDATE codes SET pinned = ?2, reports = 0 WHERE code = ?1').bind(c, t + i));
    ups.push(bumpAll(env, 'ver'));
    if (created) ups.push(bumpAll(env, 'codes_total', created), bumpDay(env, 'added', created));
    await env.DB.batch(ups);
  } else if (body.a === 'unpin') {
    await env.DB.batch([...codes.map((c) => env.DB.prepare('UPDATE codes SET pinned = 0 WHERE code = ?1').bind(c)), bumpAll(env, 'ver')]);
  } else return json({ error: 'bad_action' }, 400);
  invalidate();
  return json({ pins: await list() });
}

/* ---------- router ---------- */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const c = cors(req, env);
    if (!c.ok) return json({ error: 'origin_not_allowed' }, 403);
    const out = (res) => { for (const [k, v] of Object.entries(c.h)) res.headers.set(k, v); return res; };
    if (req.method === 'OPTIONS') return out(new Response(null, { status: 204, headers: SEC }));

    try {
      if (req.method === 'GET') {
        if (url.pathname === '/api/pool') {
          const b = url.searchParams.get('b');
          if (b === null) return out(json(await page0(env), 200, { 'Cache-Control': 'public, max-age=5' }));
          const before = Number(b);
          if (!Number.isInteger(before) || before < 1) return out(json({ error: 'bad_cursor' }, 400));
          return out(json(await pageBefore(env, before), 200, { 'Cache-Control': 'public, max-age=600' }));
        }
        if (url.pathname === '/' || url.pathname === '/healthz') return out(json({ ok: true }));
        return out(json({ error: 'not_found' }, 404));
      }

      if (req.method !== 'POST' || !['/api/codes', '/api/events', '/api/admin'].includes(url.pathname)) return out(json({ error: 'not_found' }, 404));
      if (!req.headers.get('Origin')) return out(json({ error: 'origin_required' }, 403));
      const ip = req.headers.get('CF-Connecting-IP') || 'na';
      if (await limited(env, 'ip:' + ip)) return out(json({ error: 'slow_down' }, 429, { 'Retry-After': '60' }));
      const body = await readBody(req);
      if (!body) return out(json({ error: 'bad_body' }, 400));
      if (url.pathname === '/api/admin') return out(await admin(env, body));

      // No user IDs: the only identity is a keyed hash of the network address, used for spam limits
      // and so one network can't report the same code three times.
      const kh = await hmac(env, 'ip:' + ip);
      if (url.pathname === '/api/codes') return out(await addCodes(env, kh, body));
      return out(await events(env, kh, body));
    } catch (e) {
      console.error((e && e.stack) || e);
      return out(json({ error: 'server_error' }, 500));
    }
  },

  // hourly: trim daily rows older than 90 days
  async scheduled(_evt, env) {
    await env.DB.prepare("DELETE FROM daily WHERE day != 'all' AND day < ?1").bind(day(now() - 90 * 864e5)).run();
  },
};
