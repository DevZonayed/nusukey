/* NusukKey pin admin. The token lives only in this tab's sessionStorage. */
(() => {
  'use strict';
  const API = String(window.NK_API || '').replace(/\/+$/, '');
  const $ = (id) => document.getElementById(id);
  try { $('tok').value = sessionStorage.getItem('nk.admin') || ''; } catch { /* ignore */ }

  const msg = (s, bad) => { $('msg').textContent = s; $('msg').className = 'msg' + (bad ? ' bad' : ''); };
  async function call(a, text) {
    const t = $('tok').value.trim();
    if (!t) { msg('আগে টোকেন দিন।', true); return; }
    try { sessionStorage.setItem('nk.admin', t); } catch { /* ignore */ }
    const r = await fetch(API + '/api/admin', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ t, a, text }) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 403) { msg('টোকেন মেলেনি।', true); return; }
    if (!r.ok) { msg(d.error === 'no_code' ? 'কোনো কোড পাওয়া যায়নি।' : 'কাজটা হয়নি, আবার চেষ্টা করুন।', true); return; }
    render(d.pins || []);
    if (a !== 'list') { msg(a === 'pin' ? 'পিন হয়েছে। কয়েক সেকেন্ডের মধ্যে সবাই দেখবে।' : 'আনপিন হয়েছে।'); $('txt').value = ''; }
  }
  function render(pins) {
    const ul = $('list'); ul.textContent = '';
    if (!pins.length) { const li = document.createElement('li'); li.textContent = 'এখন কোনো কোড পিন করা নেই।'; ul.appendChild(li); return; }
    for (const p of pins) {
      const li = document.createElement('li');
      const c = document.createElement('code'); c.textContent = p.code;
      const s = document.createElement('small'); s.textContent = p.copies + ' বার কপি';
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'আনপিন';
      b.addEventListener('click', () => call('unpin', p.code));
      li.append(c, s, b); ul.appendChild(li);
    }
  }
  $('load').addEventListener('click', () => call('list'));
  $('pin').addEventListener('click', () => call('pin', $('txt').value));
  $('unpin').addEventListener('click', () => call('unpin', $('txt').value));
})();
