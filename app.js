/* NusukKey: vanilla JS, no deps. All user/remote data is rendered with textContent. */
(() => {
  'use strict';

  const API = String(window.NK_API || '').replace(/\/+$/, '');
  const CODE_G = /\bNG-[A-Za-z0-9]{8}\b/g;
  const KEY_RE = /^NK-[A-Z2-7]{5}(?:-[A-Z2-7]{5}){3}$/;
  const DAY = 864e5;
  const $ = (id) => document.getElementById(id);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('nk.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('nk.' + k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
  };

  /* ---------- strings ---------- */
  const T = {
    bn: {
      bannerText: 'আপনার আইডি সেভ করে রাখুন। তাহলে অন্য ফোনেও আগে নেওয়া কোডগুলো আর আসবে না।', bannerBtn: 'আইডি সেভ করুন', close: 'বন্ধ করুন',
      yourKey: 'আপনার আইডি', keySaved: 'আইডি সেভ আছে',
      badge: 'নুসুক উমরাহ চ্যালেঞ্জ · কমিউনিটি', chk1: 'সাইন-আপ লাগে না', chk2: 'একই কোড দুবার আসে না', chk3: 'পুরোপুরি ফ্রি',
      hero: 'টা কোড রেডি। একটা নিন, নিজেরটাও দিন।', hero1: 'টা কোড রেডি। এটা নিন, নিজেরটাও দিন।',
      sub: 'এক ট্যাপেই কোড কপি হবে, তারপর নুসুক অ্যাপে পেস্ট করুন। কোন কোড নিয়েছেন সেটা আমরা মনে রাখি, তাই একই কোড আপনি দুবার পাবেন না।',
      sVisitors: 'এখন সাইটে আছেন', sVisitorsSub: 'জন অনলাইনে', sCopies: 'আজ কপি হয়েছে', sAdded: 'আজ যোগ হয়েছে', sAddedSub: 'নতুন কোড', sTotal: 'মোট {n} বার',
      offline: 'সার্ভারের সাথে এখন যোগাযোগ হচ্ছে না। আপনার দেওয়া কোড আপাতত শুধু এই ফোনে থাকবে।',
      nextTitle: 'আপনার জন্য পরের কোড', copyNext: 'কপি করুন, পরেরটা দেখুন', skip: 'বাদ দিন', lastCopied: 'শেষ কপি করেছেন:', report: 'কোডটা কাজ করেনি?',
      emptyNext: 'এখনকার সব কোড আপনি নিয়ে ফেলেছেন। সারাদিনই নতুন কোড আসে, একটু পরে আবার দেখুন। চাইলে নিচে নিজের কোডটাও দিয়ে যান।',
      emptyPool: 'এখনো কেউ কোড দেয়নি। প্রথম কোডটা আপনিই দিন, “আপনার কোড দিন” বক্সে নুসুকের মেসেজটা পেস্ট করুন।',
      meta: 'আপনি নিয়েছেন {c}টা · বাকি আছে {r}টা', copiedTimes: '{n} বার কপি হয়েছে', fresh: 'একদম নতুন',
      giveTitle: 'আপনার কোড দিন', giveHint: 'নুসুক অ্যাপ থেকে কপি করা পুরো মেসেজটাই এখানে দিন। কোডটা আমরা নিজেরাই খুঁজে নেব।', giveLabel: 'নুসুকের শেয়ার মেসেজ',
      givePh: 'নুসুকের মেসেজটা এখানে পেস্ট করুন…', paste: 'পেস্ট করুন', addNone: 'কোড যোগ করুন', addN: '{n}টা কোড যোগ করুন', addNs: '{n}টা কোড যোগ করুন',
      found: '{n}টা কোড পাওয়া গেছে', notFound: 'এখানে কোনো কোড পাইনি। নুসুকের কোড দেখতে এমন: NG-vW7So71R',
      added: 'ধন্যবাদ! {n}টা কোড যোগ হয়েছে। এখন অন্যরা এটা দিয়ে আপনাকে সাপোর্ট করতে পারবে।', already: 'এই কোডটা আগেই লিস্টে আছে। ধন্যবাদ!',
      pasteFail: 'ব্রাউজার নিজে থেকে পেস্ট করতে দিচ্ছে না। বক্সে আঙুল চেপে ধরে Paste চাপুন।', sending: 'যোগ হচ্ছে…',
      addFail: 'এই মুহূর্তে যোগ করা গেল না। এক মিনিট পরে আবার চেষ্টা করুন।', tooMany: 'আজ অনেকগুলো কোড দিয়েছেন। কাল আবার দিতে পারবেন।',
      howTitle: 'নিজের কোড কোথায় পাবেন?', how1: 'নুসুক অ্যাপ খুলুন।', how2: 'উমরাহ চ্যালেঞ্জের পেজে যান।', how3: 'শেয়ার বাটনে চাপুন।', how4: 'Copy চাপুন, তারপর এখানে এসে পেস্ট করুন।',
      st1: 'একটা কোড কপি করুন', st1d: 'বড় বাটনে চাপুন, অথবা নিচের লিস্টের যেকোনো কোডে ট্যাপ করুন।',
      st2: 'নুসুকে পেস্ট করুন', st2d: 'উমরাহ চ্যালেঞ্জে গিয়ে কোডের ঘরে পেস্ট করুন।',
      st3: 'নিজের কোডটাও দিন', st3d: 'আপনার মেসেজ পেস্ট করলে অন্যরাও আপনাকে সাপোর্ট করতে পারবে।',
      listTitle: 'সব কোড', searchLabel: 'কোড খুঁজুন', searchPh: 'কোড খুঁজুন…', tRemaining: 'বাকি', tNew: 'নতুন', tUsed: 'নেওয়া হয়েছে', tMine: 'আমার', tAll: 'সব',
      shown: '{t}টার মধ্যে {s}টা দেখানো হচ্ছে', none: 'এখানে এখনো কিছু নেই।', more: 'আরও দেখুন', bNew: 'নতুন', bMine: 'আপনার',
      copied: 'কপি হয়েছে। এবার নুসুকে পেস্ট করুন।', copiedMine: 'আপনার কোড কপি হয়েছে। বন্ধুদের পাঠাতে পারেন।', copyFail: 'কপি হয়নি। কোডটার ওপর আঙুল চেপে ধরে কপি করুন।',
      reported: 'জানানোর জন্য ধন্যবাদ। এই কোড আপনাকে আর দেখাব না।',
      keyTitle: 'আপনার আইডি', keyHelp: 'এই আইডি দিয়ে আমরা মনে রাখি আপনি কোন কোডগুলো নিয়েছেন। কপি করে কোথাও রেখে দিন, যেমন ফোনের নোটে বা নিজের হোয়াটসঅ্যাপে। অন্য ফোনে এই আইডি দিলে আগের হিস্ট্রি সেখানেও চলে আসবে।',
      copyKey: 'আইডি কপি করুন', useKey: 'অন্য ফোনের আইডি আছে?', apply: 'এই আইডি ব্যবহার করুন',
      keyBad: 'আইডিটা মিলছে না। এটা NK- দিয়ে শুরু হয়, তারপর ৫ অক্ষরের ৪টা ভাগ থাকে।', keyOk: 'আইডি বদলানো হয়েছে, আগের হিস্ট্রি আনা হচ্ছে।', keyCopied: 'আইডি কপি হয়েছে। যত্ন করে রেখে দিন।',
      foot1: 'এটা কমিউনিটির বানানো একটা ফ্রি টুল। নুসুক অ্যাপ বা হজ ও উমরাহ মন্ত্রণালয়ের সাথে এর কোনো সম্পর্ক নেই।', foot2: 'কোডগুলো ভিজিটররাই শেয়ার করেন। শুধু নিজের রেফারেল কোড দিন।',
      imgAlt: 'মক্কায় কাবা শরিফ',
    },
    en: {
      bannerText: "Save your key, and the codes you've taken stay hidden on every phone.", bannerBtn: 'Save my key', close: 'Close',
      yourKey: 'Your key', keySaved: 'Key saved',
      badge: 'Nusuk Umrah challenge · community', chk1: 'No sign-up', chk2: 'Never the same code twice', chk3: 'Free',
      hero: ' codes ready to use. Take one, share yours.', hero1: ' code ready to use. Take it, share yours.',
      sub: "Tap once to copy, then paste it in the Nusuk app. We remember what you've taken, so you won't get the same code twice.",
      sVisitors: 'On the site now', sVisitorsSub: 'online', sCopies: 'Copied today', sAdded: 'Added today', sAddedSub: 'new codes', sTotal: '{n} in total',
      offline: "Can't reach the server right now. Codes you add are saved on this phone for now.",
      nextTitle: 'Your next code', copyNext: 'Copy & show next', skip: 'Skip', lastCopied: 'Last copied:', report: "Didn't work?",
      emptyNext: "You've taken every code for now. New ones come in all day, so check back a bit later. And share your own below.",
      emptyPool: 'No codes yet. Be the first and paste your Nusuk message in "Share your code".',
      meta: "You've taken {c} · {r} left", copiedTimes: 'copied {n} times', fresh: 'brand new',
      giveTitle: 'Share your code', giveHint: "Paste the whole message from the Nusuk app. We'll find the code in it.", giveLabel: 'Nusuk share message',
      givePh: 'Paste the Nusuk message here…', paste: 'Paste', addNone: 'Add code', addN: 'Add {n} code', addNs: 'Add {n} codes',
      found: 'Found {n}', notFound: 'No code found. A Nusuk code looks like NG-vW7So71R.', added: 'Thanks! {n} added. Others can use it now.',
      already: "That code's already on the list. Thanks!", pasteFail: "Your browser won't paste for us. Press and hold the box, then tap Paste.", sending: 'Adding…',
      addFail: "Couldn't add it right now. Try again in a minute.", tooMany: "You've added a lot today. You can add more tomorrow.",
      howTitle: 'Where do I find my code?', how1: 'Open the Nusuk app.', how2: 'Go to the Umrah challenge.', how3: 'Tap the Share button.', how4: 'Tap Copy, then come back and paste it here.',
      st1: 'Copy a code', st1d: 'Tap the big button, or any code in the list below.', st2: 'Paste it in Nusuk', st2d: 'Open the Umrah challenge and paste it in the code box.',
      st3: 'Share yours too', st3d: 'Paste your own message so others can support you.',
      listTitle: 'All codes', searchLabel: 'Search codes', searchPh: 'Search codes…', tRemaining: 'Left', tNew: 'New', tUsed: 'Taken', tMine: 'Mine', tAll: 'All',
      shown: 'Showing {s} of {t}', none: 'Nothing here yet.', more: 'Show more', bNew: 'new', bMine: 'yours',
      copied: 'Copied. Now paste it in Nusuk.', copiedMine: 'Your code is copied. Send it to friends.', copyFail: "Couldn't copy. Press and hold the code to copy it.",
      reported: "Thanks for telling us. We won't show you that one again.",
      keyTitle: 'Your key', keyHelp: "Your key remembers which codes you've taken. Copy it and keep it somewhere safe, like your notes or a WhatsApp message to yourself. Enter it on another phone to bring your history along.",
      copyKey: 'Copy my key', useKey: 'Have a key from another phone?', apply: 'Use this key',
      keyBad: "That key doesn't look right. It starts with NK- and has 4 groups of 5.", keyOk: 'Key switched. Loading your history.', keyCopied: 'Key copied. Keep it somewhere safe.',
      foot1: 'A free community tool. Not connected to the Nusuk app or the Ministry of Hajj and Umrah.', foot2: 'Visitors share these codes. Only share your own referral code.',
      imgAlt: 'The Kaaba in Makkah',
    },
    ar: {
      bannerText: 'احفظ مفتاحك، وستبقى الرموز التي أخذتها مخفية على كل أجهزتك.', bannerBtn: 'احفظ مفتاحي', close: 'إغلاق',
      yourKey: 'مفتاحك', keySaved: 'المفتاح محفوظ',
      badge: 'تحدي العمرة في نسك · مجتمعي', chk1: 'بدون تسجيل', chk2: 'لن يتكرر الرمز نفسه', chk3: 'مجاني',
      hero: ' رمزًا متاحًا الآن. خذ واحدًا وشارك رمزك.', hero1: ' رمز متاح الآن. خذه وشارك رمزك.',
      sub: 'اضغط مرة للنسخ ثم الصقه في تطبيق نسك. نتذكر ما أخذته، فلن يصلك الرمز نفسه مرتين.',
      sVisitors: 'في الموقع الآن', sVisitorsSub: 'متصل', sCopies: 'نُسخ اليوم', sAdded: 'أُضيف اليوم', sAddedSub: 'رموز جديدة', sTotal: '{n} إجمالًا',
      offline: 'تعذّر الاتصال بالخادم الآن. الرموز التي تضيفها تُحفظ على هذا الجهاز مؤقتًا.',
      nextTitle: 'رمزك التالي', copyNext: 'انسخ واعرض التالي', skip: 'تخطَّ', lastCopied: 'آخر نسخ:', report: 'لم يعمل؟',
      emptyNext: 'أخذت كل الرموز المتاحة الآن. تصل رموز جديدة طوال اليوم، فعُد بعد قليل وشارك رمزك بالأسفل.',
      emptyPool: 'لا توجد رموز بعد. كن أول من يشارك والصق رسالة نسك في «شارك رمزك».',
      meta: 'أخذت {c} · المتبقي {r}', copiedTimes: 'نُسخ {n} مرة', fresh: 'جديد',
      giveTitle: 'شارك رمزك', giveHint: 'الصق رسالة تطبيق نسك كاملة، وسنستخرج الرمز منها.', giveLabel: 'رسالة المشاركة من نسك',
      givePh: 'الصق رسالة نسك هنا…', paste: 'لصق', addNone: 'أضف الرمز', addN: 'أضف {n} رمز', addNs: 'أضف {n} رموز',
      found: 'وُجد {n}', notFound: 'لم نجد رمزًا. رمز نسك يشبه NG-vW7So71R', added: 'شكرًا! أُضيف {n}، ويمكن للآخرين استخدامه الآن.',
      already: 'هذا الرمز موجود في القائمة. شكرًا!', pasteFail: 'المتصفح منع اللصق. اضغط مطولًا على المربع واختر لصق.', sending: 'جارٍ الإضافة…',
      addFail: 'تعذّرت الإضافة الآن. حاول بعد دقيقة.', tooMany: 'أضفت رموزًا كثيرة اليوم. يمكنك الإضافة غدًا.',
      howTitle: 'أين أجد رمزي؟', how1: 'افتح تطبيق نسك.', how2: 'اذهب إلى تحدي العمرة.', how3: 'اضغط زر المشاركة.', how4: 'اختر نسخ، ثم عُد والصقه هنا.',
      st1: 'انسخ رمزًا', st1d: 'اضغط الزر الكبير أو أي رمز في القائمة.', st2: 'الصقه في نسك', st2d: 'افتح تحدي العمرة والصق الرمز في خانة الرمز.',
      st3: 'شارك رمزك أيضًا', st3d: 'الصق رسالتك ليدعمك الآخرون.',
      listTitle: 'كل الرموز', searchLabel: 'ابحث عن رمز', searchPh: 'ابحث عن رمز…', tRemaining: 'المتبقي', tNew: 'جديد', tUsed: 'أخذته', tMine: 'رموزي', tAll: 'الكل',
      shown: 'عرض {s} من {t}', none: 'لا شيء هنا بعد.', more: 'عرض المزيد', bNew: 'جديد', bMine: 'لك',
      copied: 'تم النسخ. الصقه الآن في نسك.', copiedMine: 'نُسخ رمزك. أرسله لأصدقائك.', copyFail: 'تعذّر النسخ. اضغط مطولًا على الرمز لنسخه.',
      reported: 'شكرًا لإخبارنا. لن نعرض لك هذا الرمز مجددًا.',
      keyTitle: 'مفتاحك', keyHelp: 'هذا المفتاح يتذكر الرموز التي أخذتها. انسخه واحفظه في مكان آمن، ثم أدخله على جهاز آخر لنقل سجلك.',
      copyKey: 'انسخ مفتاحي', useKey: 'لديك مفتاح من جهاز آخر؟', apply: 'استخدم هذا المفتاح',
      keyBad: 'المفتاح غير صحيح. يبدأ بـ NK- ثم 4 مجموعات من 5.', keyOk: 'تم تبديل المفتاح، جارٍ تحميل سجلك.', keyCopied: 'نُسخ المفتاح. احتفظ به في مكان آمن.',
      foot1: 'أداة مجتمعية مجانية. لا ترتبط بتطبيق نسك ولا بوزارة الحج والعمرة.', foot2: 'الزوار يشاركون هذه الرموز. شارك رمز الإحالة الخاص بك فقط.',
      imgAlt: 'الكعبة المشرفة في مكة',
    },
  };
  const LOCALE = { en: 'en-US', bn: 'bn-BD', ar: 'ar-EG' };
  const SAMPLE = 'Your chance to win one of 100 free Umrah for two in the Nusuk challenge 🕋!\n...\nhttps://services.nusuk.sa/app?p=27&id=';

  /* ---------- state ---------- */
  const guessLang = () => 'bn'; // Bangla first; the choice is remembered
  const S = {
    lang: T[store.get('lang')] ? store.get('lang') : guessLang(),
    key: store.get('key', null),
    seen: new Map(store.get('seen', [])), // code -> ts (copied/reported by me)
    mine: new Set(store.get('mine', [])),
    pool: new Map(), // code -> {c, a(ms), n}
    stats: null, online: false,
    tab: 'remaining', q: '', limit: 60,
    current: null, last: store.get('last', null), skipped: new Set(),
    queue: store.get('queue', []),
  };
  if (!KEY_RE.test(S.key || '')) { S.key = newKey(); store.set('key', S.key); }

  function newKey() {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const b = crypto.getRandomValues(new Uint8Array(20));
    let s = ''; for (const x of b) s += A[x & 31];
    return 'NK-' + s.match(/.{5}/g).join('-');
  }
  const t = (k, vars) => {
    let s = (T[S.lang] && T[S.lang][k]) || T.en[k] || k;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  const num = (n) => { try { return new Intl.NumberFormat(LOCALE[S.lang]).format(n); } catch { return String(n); } };
  const saveSeen = () => store.set('seen', [...S.seen].slice(-20000));
  const saveMine = () => store.set('mine', [...S.mine]);
  const extract = (text) => [...new Set(String(text || '').match(CODE_G) || [])];

  /* ---------- network ---------- */
  async function api(path, body) {
    const opt = { headers: { 'X-NK-Key': S.key } };
    if (body) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    const r = await fetch(API + path, opt);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || 'http'); e.status = r.status; throw e; }
    return j;
  }

  function applyPool(d) {
    const m = new Map();
    for (const x of d.codes || []) m.set(x.c, { c: x.c, a: x.a * 1000, n: x.n | 0 });
    // keep my freshly added codes visible even before the edge cache refreshes
    for (const c of S.mine) if (!m.has(c) && S.pool.has(c)) m.set(c, S.pool.get(c));
    S.pool = m; S.stats = d.stats || null;
  }

  async function loadPool() {
    if (!API) return loadLocal();
    try {
      const r = await fetch(API + '/api/pool');
      if (!r.ok) throw new Error('pool');
      const d = await r.json();
      applyPool(d); S.online = true;
      store.set('poolCache', d);
    } catch {
      S.online = false;
      if (!S.pool.size) { const c = store.get('poolCache', null); if (c) applyPool(c); }
    }
  }

  async function loadMe() {
    if (!API) return;
    try {
      const d = await api('/api/me');
      for (const c of d.seen || []) if (!S.seen.has(c)) S.seen.set(c, 1);
      for (const c of d.mine || []) S.mine.add(c);
      saveSeen(); saveMine();
    } catch { /* offline: local history still works */ }
  }

  let flushing = false;
  async function flush() {
    if (flushing || !API) return;
    flushing = true;
    try {
      while (S.queue.length) {
        try { await api('/api/event', S.queue[0]); }
        catch (e) { if (!e.status || e.status >= 500 || e.status === 429) break; } // retry later; 4xx = drop
        S.queue.shift(); store.set('queue', S.queue);
      }
    } finally { flushing = false; }
  }
  function sendEvent(code, kind) {
    if (!API) return;
    S.queue.push({ code, kind }); if (S.queue.length > 500) S.queue.splice(0, S.queue.length - 500);
    store.set('queue', S.queue); flush();
  }

  /* local mode: this device only, optional codes.json seed next to the page */
  async function loadLocal() {
    S.online = false;
    const local = store.get('localPool', []);
    for (const x of local) S.pool.set(x.c, x);
    try {
      const seed = await fetch('codes.json', { cache: 'no-cache' }).then((r) => r.json());
      for (const x of seed) { const c = typeof x === 'string' ? x : x && x.c; if (/^NG-[A-Za-z0-9]{8}$/.test(c || '') && !S.pool.has(c)) S.pool.set(c, { c, a: (x.a || 0) * 1000, n: 0 }); }
    } catch { /* no seed */ }
  }
  const saveLocal = () => { if (!API) store.set('localPool', [...S.pool.values()].slice(-5000)); };

  /* ---------- logic ---------- */
  const available = (x) => !S.seen.has(x.c) && !S.mine.has(x.c);
  function remaining() { const out = []; for (const x of S.pool.values()) if (available(x)) out.push(x); return out; }

  function pickNext() {
    const all = remaining();
    let c = all.filter((x) => x.c !== S.current && !S.skipped.has(x.c));
    if (!c.length) { S.skipped.clear(); c = all.filter((x) => x.c !== S.current); }
    if (!c.length) { S.current = all.length ? S.current : null; return; }
    c.sort((a, b) => a.n - b.n || b.a - a.a);
    const top = c.slice(0, 20);
    S.current = top[(crypto.getRandomValues(new Uint32Array(1))[0]) % top.length].c;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback below */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }

  function markUsed(code, kind) {
    if (S.seen.has(code)) return false;
    S.seen.set(code, Date.now()); saveSeen();
    const p = S.pool.get(code);
    if (p && kind === 'copy') p.n++;
    if (S.stats && kind === 'copy') { S.stats.copiesToday++; S.stats.copiesTotal = (S.stats.copiesTotal || 0) + 1; }
    sendEvent(code, kind); saveLocal();
    return true;
  }

  async function takeCurrent() {
    const code = S.current; if (!code) return;
    const ok = await copyText(code);
    if (!ok) { toast(t('copyFail')); return; }
    markUsed(code, 'copy');
    S.last = code; store.set('last', code);
    toast(t('copied'));
    pickNext(); renderNext(true); renderList(); renderHero(); renderStats();
  }

  function skip() { if (!S.current) return; S.skipped.add(S.current); pickNext(); renderNext(true); }

  function reportLast() {
    const code = S.last; if (!code) return;
    sendEvent(code, 'report');
    if (!API) { S.pool.delete(code); saveLocal(); }
    if (!S.seen.has(code)) { S.seen.set(code, Date.now()); saveSeen(); }
    S.last = null; store.set('last', null);
    toast(t('reported')); renderNext(); renderList(); renderHero();
  }

  /* ---------- give ---------- */
  let found = [];
  function onGiveInput() {
    const text = $('giveText').value;
    found = extract(text);
    const chips = $('chips'); chips.textContent = '';
    for (const c of found.slice(0, 20)) { const s = document.createElement('span'); s.className = 'chip'; s.textContent = c; chips.appendChild(s); }
    labelAdd();
    setMsg(text.trim() && !found.length ? t('notFound') : (found.length ? t('found', { n: num(found.length) }) : ''), text.trim() && !found.length ? 'bad' : '');
  }
  function labelAdd() {
    const btn = $('addBtn');
    btn.disabled = !found.length;
    btn.textContent = found.length ? t(found.length === 1 ? 'addN' : 'addNs', { n: num(Math.min(found.length, 20)) }) : t('addNone');
  }
  function setMsg(s, cls) { const m = $('giveMsg'); m.textContent = s; m.className = 'msg' + (cls ? ' ' + cls : ''); }

  async function addCodes() {
    const codes = found.slice(0, 20); if (!codes.length) return;
    const btn = $('addBtn'); btn.disabled = true; btn.textContent = t('sending');
    let added = codes;
    if (API) {
      try { const r = await api('/api/codes', { text: codes.join(' ') }); added = r.added || []; S.online = true; }
      catch (e) { setMsg(t(e.status === 429 ? 'tooMany' : 'addFail'), 'bad'); labelAdd(); return; }
    }
    const now = Date.now();
    for (const c of codes) { S.mine.add(c); if (!S.pool.has(c)) S.pool.set(c, { c, a: now, n: 0 }); }
    if (S.stats) S.stats.addedToday += added.length;
    saveMine(); saveLocal();
    $('giveText').value = ''; found = []; $('chips').textContent = '';
    btn.textContent = t('addNone');
    setMsg(added.length ? t('added', { n: num(added.length) }) : t('already'), 'ok');
    if (S.current && S.mine.has(S.current)) pickNext();
    renderAll();
  }

  async function pasteIn() {
    const ta = $('giveText');
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt) throw new Error('empty');
      ta.value = txt; onGiveInput();
      if (found.length) $('addBtn').focus();
    } catch { ta.focus(); setMsg(t('pasteFail')); }
  }

  /* ---------- render ---------- */
  let toastTimer;
  function toast(s) { const el = $('toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2200); }

  function renderStatic() {
    document.documentElement.lang = S.lang;
    document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    for (const el of document.querySelectorAll('[data-tp]')) el.placeholder = t(el.dataset.tp);
    for (const el of document.querySelectorAll('[data-ta]')) el.setAttribute('aria-label', t(el.dataset.ta));
    for (const el of document.querySelectorAll('[data-talt]')) el.alt = t(el.dataset.talt);
    for (const el of document.querySelectorAll('[data-num]')) el.textContent = num(+el.dataset.num);
    for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang));
    const sample = $('sample'); sample.textContent = SAMPLE;
    const mk = document.createElement('mark'); mk.textContent = 'NG-vW7So71R'; sample.appendChild(mk);
    $('keyPill').classList.toggle('saved', !!store.get('keySaved'));
    $('keyPill').querySelector('.kt').textContent = store.get('keySaved') ? t('keySaved') : t('yourKey');
    $('banner').hidden = !!store.get('bannerOff');
    $('offline').hidden = !API ? false : S.online;
    labelAdd();
  }

  function renderHero() {
    const r = remaining().length;
    $('heroNum').textContent = num(r);
    $('heroText').textContent = t(r === 1 ? 'hero1' : 'hero');
  }

  function renderStats() {
    let st = S.stats;
    if (!st || !S.online) {
      const today = Date.now() - DAY;
      let copies = 0; for (const ts of S.seen.values()) if (ts > today) copies++;
      let added = 0; for (const x of S.pool.values()) if (x.a > today) added++;
      st = { active: 1, copiesToday: copies, addedToday: added, copiesTotal: S.seen.size };
    }
    $('stActive').textContent = num(Math.max(1, st.active | 0));
    $('stCopies').textContent = num(st.copiesToday | 0);
    $('stAdded').textContent = num(st.addedToday | 0);
    $('stTotal').textContent = st.copiesTotal ? t('sTotal', { n: num(st.copiesTotal) }) : '';
  }

  function renderNext(animate) {
    const big = $('bigCode');
    const code = S.current;
    const paint = () => {
      big.textContent = '';
      if (code) {
        const pre = document.createElement('span'); pre.className = 'pre'; pre.textContent = code.slice(0, 3);
        big.append(pre, document.createTextNode(code.slice(3)));
      }
      big.classList.remove('swap');
    };
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) { big.classList.add('swap'); setTimeout(paint, 120); } else paint();
    $('emptyNext').hidden = !!code; big.hidden = !code;
    if (!code) $('emptyNext').textContent = t(S.seen.size ? 'emptyNext' : 'emptyPool');
    $('copyBtn').disabled = !code; $('skipBtn').disabled = !code;
    const tag = $('nextTag'); const p = code && S.pool.get(code);
    tag.hidden = !p; if (p) tag.textContent = p.n ? t('copiedTimes', { n: num(p.n) }) : t('fresh');
    const rem = remaining().length; const used = S.seen.size;
    $('meta').textContent = '';
    const parts = t('meta', { c: '\u0000', r: '\u0001' }).split(/(\u0000|\u0001)/);
    for (const part of parts) {
      if (part === '\u0000' || part === '\u0001') { const b = document.createElement('b'); b.textContent = num(part === '\u0000' ? used : rem); $('meta').appendChild(b); }
      else $('meta').appendChild(document.createTextNode(part));
    }
    $('prog').style.width = (used + rem ? Math.round((used / (used + rem)) * 100) : 0) + '%';
    $('last').hidden = !S.last; $('lastCode').textContent = S.last || '';
  }

  function listFor(tab) {
    const out = [];
    const since = Date.now() - DAY;
    if (tab === 'used') {
      const arr = [...S.seen.entries()].sort((a, b) => b[1] - a[1]);
      for (const [c] of arr) out.push(S.pool.get(c) || { c, a: 0, n: 0 });
      return out;
    }
    if (tab === 'mine') { for (const c of S.mine) out.push(S.pool.get(c) || { c, a: 0, n: 0 }); return out.reverse(); }
    for (const x of S.pool.values()) {
      if (tab === 'remaining' && !available(x)) continue;
      if (tab === 'new' && (x.a < since || !available(x))) continue;
      out.push(x);
    }
    if (tab === 'all') out.sort((a, b) => b.a - a.a);
    else out.sort((a, b) => a.n - b.n || b.a - a.a);
    return out;
  }

  function renderList() {
    const counts = {};
    for (const b of document.querySelectorAll('#tabs [data-tab]')) {
      const k = b.dataset.tab; counts[k] = listFor(k).length;
      b.setAttribute('aria-selected', String(k === S.tab));
      b.querySelector('small').textContent = num(counts[k]);
    }
    let items = listFor(S.tab);
    const q = S.q.trim().toLowerCase();
    if (q) items = items.filter((x) => x.c.toLowerCase().includes(q));
    const grid = $('grid'); const frag = document.createDocumentFragment();
    const tpl = $('tplItem').content.firstElementChild;
    const since = Date.now() - DAY;
    for (const x of items.slice(0, S.limit)) {
      const el = tpl.cloneNode(true);
      el.dataset.code = x.c;
      el.querySelector('.rest').textContent = x.c.slice(3);
      el.setAttribute('aria-label', x.c);
      const badge = el.querySelector('.b');
      if (S.mine.has(x.c)) { badge.hidden = false; badge.className = 'b mine'; badge.textContent = t('bMine'); }
      else if (x.a > since && !S.seen.has(x.c)) { badge.hidden = false; badge.className = 'b new'; badge.textContent = t('bNew'); }
      if (S.seen.has(x.c)) el.classList.add('used');
      frag.appendChild(el);
    }
    if (!items.length) { const d = document.createElement('div'); d.className = 'none'; d.textContent = t('none'); frag.appendChild(d); }
    grid.textContent = ''; grid.appendChild(frag);
    $('count').textContent = items.length ? t('shown', { s: num(Math.min(S.limit, items.length)), t: num(items.length) }) : '';
    $('moreBtn').hidden = items.length <= S.limit;
  }

  function renderAll() { renderStatic(); renderHero(); renderStats(); renderNext(); renderList(); }

  /* ---------- key dialog ---------- */
  function openKey() { $('keyBox').textContent = S.key; $('keyIn').value = ''; $('keyMsg').textContent = ''; const d = $('keyDlg'); if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function closeKey() { const d = $('keyDlg'); if (d.close) d.close(); else d.removeAttribute('open'); }
  async function copyKey() {
    if (await copyText(S.key)) { store.set('keySaved', true); store.set('bannerOff', true); toast(t('keyCopied')); renderStatic(); }
    else toast(t('copyFail'));
  }
  async function applyKey() {
    const v = $('keyIn').value.trim().toUpperCase().replace(/\s+/g, '');
    const m = $('keyMsg');
    if (!KEY_RE.test(v)) { m.textContent = t('keyBad'); m.className = 'msg bad'; return; }
    S.key = v; store.set('key', v); store.set('keySaved', true); store.set('bannerOff', true);
    m.textContent = t('keyOk'); m.className = 'msg ok';
    await loadMe(); pickNext(); renderAll(); setTimeout(closeKey, 600);
  }

  /* ---------- wire up ---------- */
  function bind() {
    $('copyBtn').addEventListener('click', takeCurrent);
    $('skipBtn').addEventListener('click', skip);
    $('reportBtn').addEventListener('click', reportLast);
    $('pasteBtn').addEventListener('click', pasteIn);
    $('addBtn').addEventListener('click', addCodes);
    $('giveText').addEventListener('input', onGiveInput);
    $('keyPill').addEventListener('click', openKey);
    $('bannerBtn').addEventListener('click', openKey);
    $('bannerX').addEventListener('click', () => { store.set('bannerOff', true); $('banner').hidden = true; });
    $('copyKey').addEventListener('click', copyKey);
    $('keyApply').addEventListener('click', applyKey);
    $('keyClose').addEventListener('click', closeKey);
    $('moreBtn').addEventListener('click', () => { S.limit += 120; renderList(); });
    for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => { S.lang = b.dataset.lang; store.set('lang', S.lang); renderAll(); });
    $('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; S.tab = b.dataset.tab; S.limit = 60; renderList(); });
    let qt; $('search').addEventListener('input', (e) => { clearTimeout(qt); qt = setTimeout(() => { S.q = e.target.value; S.limit = 60; renderList(); }, 120); });
    $('grid').addEventListener('click', async (e) => {
      const el = e.target.closest('.item'); if (!el) return;
      const code = el.dataset.code;
      if (!(await copyText(code))) { toast(t('copyFail')); return; }
      if (S.mine.has(code)) { toast(t('copiedMine')); return; }
      const fresh = markUsed(code, 'copy');
      S.last = code; store.set('last', code);
      toast(t('copied'));
      if (fresh) {
        el.classList.add('done');
        if (code === S.current) pickNext();
        setTimeout(() => { renderList(); renderNext(); renderHero(); renderStats(); }, 350);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'button', 'select', 'summary', 'a'].includes(tag) || e.target.isContentEditable || $('keyDlg').open) return;
      e.preventDefault(); takeCurrent();
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    window.addEventListener('online', () => { flush(); refresh(); });
  }

  async function refresh() {
    await loadPool();
    if (!S.current || !S.pool.has(S.current) || !available(S.pool.get(S.current))) pickNext();
    renderHero(); renderStats(); renderNext(); renderList(); $('offline').hidden = !API ? false : S.online;
  }

  async function start() {
    bind();
    // instant paint from the last pool we saw, then revalidate
    const cached = API && store.get('poolCache', null);
    if (cached) { applyPool(cached); pickNext(); }
    renderAll();
    await Promise.all([loadPool(), loadMe()]);
    if (!S.current || !S.pool.has(S.current) || !available(S.pool.get(S.current))) pickNext();
    renderAll();
    flush();
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 60000);
    setInterval(() => { if (document.visibilityState === 'visible') loadMe(); }, 300000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
