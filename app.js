/* NusukKey: vanilla JS, no deps, no accounts, no IDs. Everything personal stays in this browser.
   All remote data is rendered with textContent. */
(() => {
  'use strict';

  const API = String(window.NK_API || '').replace(/\/+$/, '');
  const CODE_G = /\bNG-[A-Za-z0-9]{8}\b/g;
  const LINK = (c) => 'https://services.nusuk.sa/app?p=27&id=NG-' + c;
  const UA = navigator.userAgent || '';
  const MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA));
  const OS = /Android/i.test(UA) ? 'android' : (/iPhone|iPad|iPod/i.test(UA) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(UA))) ? 'ios' : 'desktop';
  const DOOR_COLORS = ['#00663A', '#2A5070', '#B08255', '#7A4F0A'];
  const $ = (id) => document.getElementById(id);

  /* ---------- tiny storage (a few KB at most) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('nk.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('nk.' + k, JSON.stringify(v)); } catch { /* full or blocked: keep going in memory */ } },
  };
  if (store.get('v', 0) !== 3) { // drop the old ID-based data once
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('nk.') && k !== 'nk.lang') localStorage.removeItem(k); } catch { /* ignore */ }
    store.set('v', 3);
  }

  /* Seen codes are kept as serial-number ranges ("1-40,45,47-60"): thousands of codes fit in a few bytes. */
  class Ranges {
    constructor(str) { this.r = []; for (const p of String(str || '').split(',')) { const m = p.match(/^(\d+)(?:-(\d+))?$/); if (m) this.r.push([+m[1], +(m[2] || m[1])]); } this.r.sort((a, b) => a[0] - b[0]); }
    has(n) { let lo = 0; let hi = this.r.length - 1; while (lo <= hi) { const mid = (lo + hi) >> 1; const [a, b] = this.r[mid]; if (n < a) hi = mid - 1; else if (n > b) lo = mid + 1; else return true; } return false; }
    add(n) {
      if (!n || this.has(n)) return;
      this.r.push([n, n]); this.r.sort((a, b) => a[0] - b[0]);
      const out = [];
      for (const x of this.r) { const l = out[out.length - 1]; if (l && x[0] <= l[1] + 1) l[1] = Math.max(l[1], x[1]); else out.push([x[0], x[1]]); }
      this.r = out;
    }
    get size() { let n = 0; for (const [a, b] of this.r) n += b - a + 1; return n; }
    toString() { return this.r.map(([a, b]) => (a === b ? a : a + '-' + b)).join(','); }
  }

  /* ---------- strings ---------- */
  const T = {
    bn: {
      eyebrow: 'নুসুক উমরাহ চ্যালেঞ্জ', title: 'উমরাহ আপনার অপেক্ষায়',
      redeem: 'রিডিম করুন', copyMain: 'কপি করুন', copyOnly: 'শুধু কপি', skip: 'অন্যটা দেখুন', report: 'কাজ করেনি?',
      hintMobile: 'চাপ দিলে নুসুক অ্যাপ খুলবে, কোডটাও সাথে যাবে। কোড না বসলে কপি করা কোডটা পেস্ট করুন।',
      hintDesktop: 'মোবাইল দিয়ে এই সাইটে এলে আরও সহজ। এক ট্যাপেই কোডটা নুসুক অ্যাপে খুলে যাবে।',
      justNow: 'এইমাত্র যোগ হয়েছে', minsAgo: '{n} মিনিট আগে যোগ হয়েছে', hoursAgo: '{n} ঘণ্টা আগে যোগ হয়েছে', daysAgo: '{n} দিন আগে যোগ হয়েছে',
      pinned: 'পিন করা', fresh: 'নতুন',
      emptyNext: 'এখনকার সব কোড আপনি নিয়ে ফেলেছেন। সারাদিনই নতুন কোড আসে, একটু পরে আবার দেখুন।',
      emptyPool: 'এখনো কেউ কোড দেয়নি। প্রথম কোডটা আপনিই দিন।', loadingFirst: 'কোড আনা হচ্ছে…',
      stCopies: 'আজ কপি', stActive: 'এখন সক্রিয়',
      moreTitle: 'আরও কোড', totalCodes: 'মোট {n}টা কোড', loading: 'আরও কোড আনা হচ্ছে…', endList: 'এখন পর্যন্ত এই কয়টাই। নতুন কোড এলে এখানেই দেখাবে।',
      tapRedeem: 'রিডিম', tapCopy: 'কপি',
      navTake: 'কোড নিন', navGive: 'কোড দিন', navMine: 'আমার', navHelp: 'সাহায্য',
      eyebrowGive: 'অন্যকে সাপোর্ট করুন', giveTitle: 'আপনার কোড দিন',
      ctaTitle: 'আপনার কোডটাও দিন', ctaSub: 'অন্যরা আপনার কোড ব্যবহার করলে আপনার কী বাড়তে থাকবে',
      sheetTitle: 'আপনার কোডটাও দিন', sheetMsg: 'যত বেশি মানুষ কোডটা ব্যবহার করবে, নুসুকে আপনার কী তত বাড়তে থাকবে। শুধু অ্যাপের শেয়ার মেসেজটা এখানে পেস্ট করুন।',
      later: 'পরে দেব', plusOne: '+১', close: 'বন্ধ করুন',
      navShare: 'শেয়ার', shareTitle: 'সুযোগটা প্রিয়জনদেরও দিন', shareSub: 'আপনার একটা শেয়ারে হয়তো কারও উমরাহর পথ খুলে যাবে। ভালো কাজের পথ দেখানোও সওয়াবের কাজ।',
      shareNow: 'শেয়ার করুন', copyMsg: 'মেসেজ কপি করুন', igHint: 'ফেসবুক আর ইনস্টাগ্রামে লেখা নিজে থেকে বসে না। তাই চাপ দিলেই মেসেজটা কপি হয়ে যাবে, পোস্টের ঘরে শুধু পেস্ট করুন।', pasteInFb: 'মেসেজ কপি হয়েছে। ফেসবুকে পোস্টের ঘরে চেপে ধরে পেস্ট করুন।', fbCopied: 'মেসেজ কপি হয়েছে', fbHow: 'ফেসবুক নিজে থেকে লেখা বসাতে দেয় না। ফেসবুক খুলে লেখার ঘরে চেপে ধরে পেস্ট করুন। কম্পিউটারে Ctrl+V চাপুন।', fbOpen: 'ফেসবুক খুলুন', msOpen: 'মেসেঞ্জার খুলুন',
      redQ: 'কোড লাল দেখাচ্ছে?', redWhyT: 'কেন এমন হয়', redWhy: 'রেফারেল লিংকে ঢোকার পর কোনো কোড একবার লাল (Invalid) দেখালে নুসুক অ্যাপ সেই কোডটা মনে রেখে দেয়। তাই পরে নতুন লিংকে ঢুকলেও পুরোনো লাল কোডটাই বসে থাকে, আর কোনো কোডই কাজ করে না।',
      redFixT: 'যেভাবে ঠিক করবেন', red1: 'এখান থেকে একটা নতুন কোড কপি করুন', red1d: 'নিচের বাটনে চাপ দিলেই নতুন কোড কপি হয়ে যাবে।', red2: 'পুরোনো লাল কোডটা মুছে ফেলুন', red2d: 'নুসুক অ্যাপে কোডের ঘরে গিয়ে ব্যাকস্পেস চেপে পুরো কোডটা মুছুন।', red3: 'নতুন কোডটা পেস্ট করুন', red3d: 'নিজে হাতে পেস্ট করলে অ্যাপ কোডটা সাথে সাথে নিয়ে নেয়।',
      redTip: 'তারপরও না হলে নুসুক অ্যাপটা পুরো বন্ধ করুন, মানে রিসেন্ট অ্যাপের তালিকা থেকে সরিয়ে দিন, তারপর আবার খুলুন।', redCopy: 'নতুন কোড কপি করুন', gotIt: 'বুঝেছি', redCopied: 'নতুন কোড কপি হয়েছে। নুসুকে পুরোনো কোড মুছে এটা পেস্ট করুন।',
      redHelpShort: 'নুসুক অ্যাপ আগের লাল কোডটা মনে রেখে দেয়। পুরোনো কোড মুছে নতুন কোড নিজে হাতে পেস্ট করলেই ঠিক হয়ে যায়।', redHelpOpen: 'কী করবেন দেখুন',
      noApp: 'নুসুক অ্যাপ নেই?', getPlay: 'Google Play থেকে নিন', getIos: 'App Store থেকে নিন', iosNote: 'বাংলাদেশের অ্যাপ স্টোরে নুসুক এখনো পাওয়া যায় না। লিংকটা না খুললে অন্য দেশের অ্যাপল আইডি দিয়ে নিতে হবে।', appTitle: 'নুসুক অ্যাপ ডাউনলোড করুন', appWhy: 'কোড রিডিম করতে ফোনে নুসুক অ্যাপ থাকতে হবে। এটা হজ ও উমরাহ মন্ত্রণালয়ের অফিসিয়াল অ্যাপ।',
      tkBrand: 'প্রতিভান', ticker: ['<b>আপনি কি একজন শিক্ষক?</b> প্রতিভানে ১ মিনিটেই প্রশ্নপত্র বানান', 'ক্লাস, বিষয় আর অধ্যায় বেছে নিন, সেট কোড আর আপনার লোগোসহ পেপার রেডি', 'ফোনের ক্যামেরা দিয়েই OMR খাতা দেখুন, একদম ফ্রি', 'NCTB সিলেবাসের প্রশ্নব্যাংক, প্রতিটা প্রশ্নের সহজ বাংলা সমাধানসহ', 'প্রতিটা কপিতে আপনার নাম থাকে, তাই প্রশ্ন নকল করা কঠিন', '৬৪ জেলার শিক্ষকরা প্রতিভান ব্যবহার করছেন', '<b>ক্রেডিট কার্ড ছাড়াই ফ্রি শুরু করুন:</b> protibhan.com'],
      freshNote: 'প্রতিবার রিডিম বা কপি করলে নতুন কোড পাবেন। আগের কোড আর কখনো আপনার কাছে আসবে না।',
      sharePic: 'ছবি হিসেবে শেয়ার করুন', picHint: 'মেসেজটা ছবির মধ্যেই লেখা থাকে, তাই ফেসবুক আর ইনস্টাগ্রামেও পুরোটা দেখা যাবে।', picSaved: 'ছবিটা ডাউনলোড হয়েছে। ফেসবুক বা ইনস্টাগ্রামে ছবি হিসেবে পোস্ট করুন।', msgCopied: 'মেসেজ কপি হয়েছে। এখন যেকোনো জায়গায় পেস্ট করুন।',
      shareMsg: 'উমরাহ করার ইচ্ছাটা আমাদের অনেকের মনেই বহু বছর ধরে আছে। নুসুক অ্যাপের উমরাহ চ্যালেঞ্জে এখন দুইজনের জন্য ১০০টা ফ্রি উমরাহ জেতার সুযোগ আছে। 🕋\n\nএই সাইটে এক ট্যাপেই অন্যদের রেফারেল কোড পাবেন। নিজের কোডটা দিলে অন্যরাও আপনাকে সাপোর্ট করতে পারবে। সাইন-আপ লাগে না, পুরোপুরি ফ্রি।\n\nকে জানে, হয়তো এবার আল্লাহর ঘরের ডাক আপনারই আসবে। ইনশাআল্লাহ।',
      shareShort: 'নুসুক উমরাহ চ্যালেঞ্জে দুইজনের জন্য ১০০টা ফ্রি উমরাহ জেতার সুযোগ। এক ট্যাপে রেফারেল কোড নিন, নিজেরটাও দিন। 🕋 ইনশাআল্লাহ।',
      giveSub: 'নুসুক অ্যাপ থেকে কপি করা পুরো মেসেজটাই এখানে পেস্ট করুন। কোডটা আমরা নিজেরাই খুঁজে নেব।',
      givePh: 'নুসুকের মেসেজটা এখানে পেস্ট করুন…', paste: 'পেস্ট করুন', addNone: 'কোড যোগ করুন', addN: '{n}টা কোড যোগ করুন',
      found: '{n}টা কোড পাওয়া গেছে', notFound: 'এখানে কোনো কোড পাইনি। নুসুকের কোড দেখতে এমন: NG-vW7So71R',
      listed: 'ধন্যবাদ! আপনার কোডটা লিস্টে আছে, এখন সবাই দেখতে পাবে।', archived: 'কমিউনিটি আর্কাইভ থেকে',
      pasteFail: 'ব্রাউজার নিজে থেকে পেস্ট করতে দিচ্ছে না। বক্সে আঙুল চেপে ধরে Paste চাপুন।', sending: 'যোগ হচ্ছে…',
      addFail: 'এই মুহূর্তে যোগ করা গেল না। এক মিনিট পরে আবার চেষ্টা করুন।', tooMany: 'আজ এই নেটওয়ার্ক থেকে অনেক কোড এসেছে। কাল আবার দিন।',
      howTitle: 'নিজের কোড কোথায় পাবেন', how1: 'নুসুক অ্যাপ খুলুন', how1d: 'নিচের Play থেকে উমরাহ চ্যালেঞ্জে যান।',
      how2: 'Share বাটনে চাপুন', how2d: 'অ্যাপের নিচের মেনুতেই Share আছে।', how3: 'মেসেজটা কপি করুন', how3d: 'তারপর এখানে এসে উপরের বক্সে পেস্ট করুন।',
      eyebrowMine: 'এই ফোনে সেভ আছে', mineTitle: 'আমার কোড', segUsed: 'নেওয়া কোড', segMine: 'আমার দেওয়া',
      usedEmpty: 'এখনো কোনো কোড নেননি।', mineEmpty: 'এখনো নিজের কোড দেননি।', shareLink: 'লিংক কপি', again: 'আবার খুলুন',
      storageNote: 'এই তালিকা শুধু আপনার এই ব্রাউজারেই থাকে। কোনো অ্যাকাউন্ট বা আইডি লাগে না।',
      eyebrowHelp: 'সাহায্য', helpTitle: 'কীভাবে কাজ করে',
      h1: 'কোড নিন', h1d: 'মোবাইলে “রিডিম করুন” চাপলেই নুসুক অ্যাপ খুলবে। কম্পিউটারে কোড কপি করে অ্যাপে পেস্ট করুন। একবার নেওয়া কোড আপনাকে আর দেখাব না।',
      h2: 'কোড দিন', h2d: 'নুসুক অ্যাপের শেয়ার মেসেজ পেস্ট করুন। অন্যরা আপনার কোড দিয়ে আপনাকে সাপোর্ট করতে পারবে।',
      h3: 'কাজ না করলে জানান', h3d: '“কাজ করেনি?” চাপলে কোডটা আপনাকে আর দেখাব না। আলাদা ৩টা নেটওয়ার্ক থেকে জানালে সবার জন্য সরিয়ে দেওয়া হয়।',
      langTitle: 'ভাষা',
      foot1: 'এটা কমিউনিটির বানানো একটা ফ্রি টুল। নুসুক অ্যাপ বা হজ ও উমরাহ মন্ত্রণালয়ের সাথে এর কোনো সম্পর্ক নেই।', foot2: 'কোডগুলো ভিজিটররাই শেয়ার করেন। শুধু নিজের রেফারেল কোড দিন।',
      copied: 'কপি হয়েছে। এবার নুসুকে পেস্ট করুন।', copiedLink: 'লিংক কপি হয়েছে। বন্ধুদের পাঠাতে পারেন।', copyFail: 'কপি হয়নি। কোডটার ওপর আঙুল চেপে ধরে কপি করুন।',
      reported: 'জানানোর জন্য ধন্যবাদ। এই কোড আপনাকে আর দেখাব না।', offline: 'ইন্টারনেট নেই। আগে লোড করা কোডগুলো দেখানো হচ্ছে।', langShort: 'বাং',
    },
    en: {
      eyebrow: 'Nusuk Umrah challenge', title: 'Umrah is waiting for you',
      redeem: 'Redeem', copyMain: 'Copy code', copyOnly: 'Copy only', skip: 'Show another', report: "Didn't work?",
      hintMobile: "Tap it and the Nusuk app opens with the code. If the code isn't filled in, paste the copied one.",
      hintDesktop: 'Easier on a phone: open this site there and one tap takes the code straight into the Nusuk app.',
      justNow: 'added just now', minsAgo: 'added {n} min ago', hoursAgo: 'added {n} h ago', daysAgo: 'added {n} days ago',
      pinned: 'pinned', fresh: 'new',
      emptyNext: "You've taken every code for now. New ones come in all day, so check back a bit later.",
      emptyPool: 'No codes yet. Be the first to share yours.', loadingFirst: 'Loading codes…',
      stCopies: 'copied today', stActive: 'active now',
      moreTitle: 'More codes', totalCodes: '{n} codes in total', loading: 'Loading more codes…', endList: "That's all for now. New codes show up here as they come in.",
      tapRedeem: 'Redeem', tapCopy: 'Copy',
      navTake: 'Get code', navGive: 'Give code', navMine: 'Mine', navHelp: 'Help',
      eyebrowGive: 'Support others', giveTitle: 'Share your code',
      ctaTitle: 'Share your code too', ctaSub: 'Every time someone uses it, your keys go up',
      sheetTitle: 'Share your code too', sheetMsg: "The more people use your code, the more keys you collect in Nusuk. Just paste the app's share message here.",
      later: 'Maybe later', plusOne: '+1', close: 'Close',
      navShare: 'Share', shareTitle: 'Pass the chance on to your loved ones', shareSub: 'One share might open the way to Umrah for someone. Showing someone the way to good is a good deed too.',
      shareNow: 'Share', copyMsg: 'Copy message', igHint: "Facebook and Instagram don't let sites fill in your post, so tapping copies the message for you. Just paste it in the post box.", pasteInFb: 'Message copied. Paste it in the Facebook post box.', fbCopied: 'Message copied', fbHow: "Facebook won't let sites fill in your post. Open Facebook, then press and hold the post box and paste (Ctrl+V on a computer).", fbOpen: 'Open Facebook', msOpen: 'Open Messenger',
      redQ: 'Code showing red?', redWhyT: 'Why it happens', redWhy: "Once a code shows red (Invalid) after opening a referral link, the Nusuk app remembers it. So even when you open a new link later, the old red code stays filled in and no code works.",
      redFixT: 'How to fix it', red1: 'Copy a new code from here', red1d: 'Tap the button below and a new code is copied.', red2: 'Delete the old red code', red2d: 'In the Nusuk app, go to the code box and backspace the whole code away.', red3: 'Paste the new code', red3d: 'When you paste it yourself, the app takes it right away.',
      redTip: "Still not working? Close the Nusuk app completely (swipe it away from recent apps) and open it again.", redCopy: 'Copy a new code', gotIt: 'Got it', redCopied: 'New code copied. In Nusuk, delete the old code and paste this one.',
      redHelpShort: 'The Nusuk app remembers an old red code. Delete it and paste a new code yourself, and it works.', redHelpOpen: 'See what to do',
      noApp: "Don't have the Nusuk app?", getPlay: 'Get it on Google Play', getIos: 'Get it on the App Store', iosNote: "Nusuk isn't in the Bangladesh App Store yet. If the link doesn't open, you'll need an Apple ID from another country.", appTitle: 'Download the Nusuk app', appWhy: "You need the Nusuk app on your phone to redeem a code. It's the official app of the Ministry of Hajj and Umrah.",
      tkBrand: 'Protibhan', ticker: ['<b>Are you a teacher?</b> Make an exam paper in 1 minute with Protibhan', 'Pick class, subject and chapter, with set codes and your logo', 'Check OMR sheets with your phone camera, free', 'NCTB syllabus question bank with simple explained answers', 'Every copy carries your name, so papers are hard to leak', 'Teachers in 64 districts use Protibhan', '<b>Start free, no credit card:</b> protibhan.com'],
      freshNote: 'Every redeem or copy gives you a new code. A code you took never comes back to you.',
      sharePic: 'Share as a picture', picHint: 'The message is written inside the picture, so it shows in full on Facebook and Instagram too.', picSaved: 'Picture downloaded. Post it as a photo on Facebook or Instagram.', msgCopied: 'Message copied. Paste it anywhere.',
      shareMsg: "So many of us have wanted to perform Umrah for years. Right now the Nusuk app's Umrah challenge is giving away 100 free Umrah trips for two. 🕋\n\nOn this site you can grab someone's referral code in one tap, and share yours so others can support you. No sign-up, and it's free.\n\nWho knows, maybe this time the call to Allah's House is yours. In sha Allah.",
      shareShort: "The Nusuk Umrah challenge is giving away 100 free Umrah trips for two. Grab a referral code in one tap and share yours. 🕋 In sha Allah.",
      giveSub: "Paste the whole message from the Nusuk app. We'll find the code in it.",
      givePh: 'Paste the Nusuk message here…', paste: 'Paste', addNone: 'Add code', addN: 'Add {n} code(s)',
      found: 'Found {n}', notFound: 'No code found. A Nusuk code looks like NG-vW7So71R.',
      listed: "Thanks! Your code is on the list. Everyone can see it now.", archived: 'from the community archive',
      pasteFail: "Your browser won't paste for us. Press and hold the box, then tap Paste.", sending: 'Adding…',
      addFail: "Couldn't add it right now. Try again in a minute.", tooMany: 'Lots of codes came from this network today. Try again tomorrow.',
      howTitle: 'Where to find your code', how1: 'Open the Nusuk app', how1d: 'Go to the Umrah challenge from Play.',
      how2: 'Tap Share', how2d: "It's in the app's bottom menu.", how3: 'Copy the message', how3d: 'Then come back and paste it in the box above.',
      eyebrowMine: 'Saved on this phone', mineTitle: 'My codes', segUsed: 'Taken', segMine: 'Shared by me',
      usedEmpty: "You haven't taken a code yet.", mineEmpty: "You haven't shared your code yet.", shareLink: 'Copy link', again: 'Open again',
      storageNote: 'This list lives only in this browser. No account or ID needed.',
      eyebrowHelp: 'Help', helpTitle: 'How it works',
      h1: 'Get a code', h1d: 'On a phone, tap "Redeem" and the Nusuk app opens. On a computer, copy the code and paste it in the app. A code you took never shows up for you again.',
      h2: 'Give a code', h2d: 'Paste your Nusuk share message so others can support you with your code.',
      h3: "Tell us if it didn't work", h3d: 'Tap "Didn\'t work?" and you won\'t see that code again. Reports from 3 different networks remove it for everyone.',
      langTitle: 'Language',
      foot1: 'A free community tool. Not connected to the Nusuk app or the Ministry of Hajj and Umrah.', foot2: 'Visitors share these codes. Only share your own referral code.',
      copied: 'Copied. Now paste it in Nusuk.', copiedLink: 'Link copied. Send it to friends.', copyFail: "Couldn't copy. Press and hold the code to copy it.",
      reported: "Thanks for telling us. We won't show you that one again.", offline: "You're offline. Showing the codes loaded earlier.", langShort: 'EN',
    },
    ar: {
      eyebrow: 'تحدي العمرة في نسك', title: 'العمرة بانتظارك',
      redeem: 'استخدم الرمز', copyMain: 'انسخ الرمز', copyOnly: 'نسخ فقط', skip: 'رمز آخر', report: 'لم يعمل؟',
      hintMobile: 'اضغط ليفتح تطبيق نسك مع الرمز. إن لم يظهر الرمز، الصق الرمز المنسوخ.',
      hintDesktop: 'الأسهل من الجوال: افتح الموقع هناك وبضغطة واحدة يصل الرمز إلى تطبيق نسك.',
      justNow: 'أُضيف الآن', minsAgo: 'أُضيف قبل {n} دقيقة', hoursAgo: 'أُضيف قبل {n} ساعة', daysAgo: 'أُضيف قبل {n} يوم',
      pinned: 'مثبّت', fresh: 'جديد',
      emptyNext: 'أخذت كل الرموز المتاحة الآن. تصل رموز جديدة طوال اليوم، فعُد بعد قليل.',
      emptyPool: 'لا توجد رموز بعد. كن أول من يشارك رمزه.', loadingFirst: 'جارٍ تحميل الرموز…',
      stCopies: 'نُسخ اليوم', stActive: 'نشط الآن',
      moreTitle: 'رموز أخرى', totalCodes: 'إجمالي {n} رمز', loading: 'جارٍ تحميل المزيد…', endList: 'هذا كل شيء الآن. تظهر الرموز الجديدة هنا فور وصولها.',
      tapRedeem: 'استخدم', tapCopy: 'نسخ',
      navTake: 'خذ رمزًا', navGive: 'شارك رمزك', navMine: 'رموزي', navHelp: 'مساعدة',
      eyebrowGive: 'ادعم غيرك', giveTitle: 'شارك رمزك',
      ctaTitle: 'شارك رمزك أيضًا', ctaSub: 'كلما استخدمه أحد زادت مفاتيحك',
      sheetTitle: 'شارك رمزك أيضًا', sheetMsg: 'كلما استخدم الناس رمزك زادت مفاتيحك في نسك. فقط الصق رسالة المشاركة من التطبيق هنا.',
      later: 'لاحقًا', plusOne: '+١', close: 'إغلاق',
      navShare: 'مشاركة', shareTitle: 'شارك الفرصة مع أحبابك', shareSub: 'مشاركة واحدة قد تفتح لأحدهم طريق العمرة. والدال على الخير كفاعله.',
      shareNow: 'مشاركة', copyMsg: 'نسخ الرسالة', igHint: 'فيسبوك وإنستغرام لا يسمحان بكتابة المنشور تلقائيًا، لذلك ننسخ الرسالة لك عند الضغط. الصقها في خانة المنشور فقط.', pasteInFb: 'نُسخت الرسالة. الصقها في خانة المنشور على فيسبوك.', fbCopied: 'نُسخت الرسالة', fbHow: 'فيسبوك لا يسمح بكتابة المنشور تلقائيًا. افتح فيسبوك ثم اضغط مطولًا على خانة المنشور والصق (Ctrl+V على الكمبيوتر).', fbOpen: 'افتح فيسبوك', msOpen: 'افتح ماسنجر',
      redQ: 'الرمز يظهر باللون الأحمر؟', redWhyT: 'لماذا يحدث هذا', redWhy: 'إذا ظهر رمز باللون الأحمر (غير صالح) بعد فتح رابط إحالة، يحتفظ تطبيق نسك به. فحتى لو فتحت رابطًا جديدًا لاحقًا يبقى الرمز الأحمر القديم مكتوبًا ولا يعمل أي رمز.',
      redFixT: 'طريقة الحل', red1: 'انسخ رمزًا جديدًا من هنا', red1d: 'اضغط الزر بالأسفل فيُنسخ رمز جديد.', red2: 'احذف الرمز الأحمر القديم', red2d: 'في تطبيق نسك اذهب إلى خانة الرمز واحذفه كاملًا بزر الحذف.', red3: 'الصق الرمز الجديد', red3d: 'عندما تلصقه بنفسك يقبله التطبيق فورًا.',
      redTip: 'إن لم ينجح، أغلق تطبيق نسك تمامًا من قائمة التطبيقات الأخيرة ثم افتحه من جديد.', redCopy: 'انسخ رمزًا جديدًا', gotIt: 'فهمت', redCopied: 'نُسخ رمز جديد. في نسك احذف الرمز القديم والصق هذا.',
      redHelpShort: 'تطبيق نسك يحتفظ بالرمز الأحمر القديم. احذفه والصق رمزًا جديدًا بنفسك فيعمل.', redHelpOpen: 'اعرف ماذا تفعل',
      noApp: 'ليس لديك تطبيق نسك؟', getPlay: 'حمّله من Google Play', getIos: 'حمّله من App Store', iosNote: 'إن لم يفتح الرابط فقد لا يكون التطبيق متاحًا في متجر بلدك.', appTitle: 'حمّل تطبيق نسك', appWhy: 'تحتاج تطبيق نسك على جوالك لاستخدام الرمز. وهو التطبيق الرسمي لوزارة الحج والعمرة.',
      tkBrand: 'Protibhan',
      freshNote: 'مع كل استخدام أو نسخ تحصل على رمز جديد، ولن يعود إليك رمز أخذته أبدًا.',
      sharePic: 'شارك كصورة', picHint: 'الرسالة مكتوبة داخل الصورة، فتظهر كاملة على فيسبوك وإنستغرام أيضًا.', picSaved: 'تم تنزيل الصورة. انشرها كصورة على فيسبوك أو إنستغرام.', msgCopied: 'نُسخت الرسالة. الصقها أينما شئت.',
      shareMsg: 'العمرة أمنية يحملها كثير منا منذ سنين. تحدي العمرة في تطبيق نسك يقدّم الآن 100 عمرة مجانية لشخصين. 🕋\n\nفي هذا الموقع تأخذ رمز إحالة بضغطة واحدة، وتشارك رمزك ليدعمك غيرك. بلا تسجيل ومجانًا.\n\nمن يدري، لعل الدعوة إلى بيت الله تكون لك هذه المرة. إن شاء الله.',
      shareShort: 'تحدي العمرة في نسك يقدّم 100 عمرة مجانية لشخصين. خذ رمز إحالة بضغطة وشارك رمزك. 🕋 إن شاء الله.',
      giveSub: 'الصق رسالة تطبيق نسك كاملة، وسنستخرج الرمز منها.',
      givePh: 'الصق رسالة نسك هنا…', paste: 'لصق', addNone: 'أضف الرمز', addN: 'أضف {n}',
      found: 'وُجد {n}', notFound: 'لم نجد رمزًا. رمز نسك يشبه NG-vW7So71R',
      listed: 'شكرًا! رمزك في القائمة الآن ويراه الجميع.', archived: 'من أرشيف المجتمع',
      pasteFail: 'المتصفح منع اللصق. اضغط مطولًا على المربع واختر لصق.', sending: 'جارٍ الإضافة…',
      addFail: 'تعذّرت الإضافة الآن. حاول بعد دقيقة.', tooMany: 'وصلت رموز كثيرة من هذه الشبكة اليوم. حاول غدًا.',
      howTitle: 'أين تجد رمزك', how1: 'افتح تطبيق نسك', how1d: 'ادخل تحدي العمرة من Play.',
      how2: 'اضغط Share', how2d: 'تجده في القائمة السفلية للتطبيق.', how3: 'انسخ الرسالة', how3d: 'ثم عُد والصقها في المربع أعلاه.',
      eyebrowMine: 'محفوظ على هذا الجهاز', mineTitle: 'رموزي', segUsed: 'أخذتها', segMine: 'شاركتها',
      usedEmpty: 'لم تأخذ أي رمز بعد.', mineEmpty: 'لم تشارك رمزك بعد.', shareLink: 'نسخ الرابط', again: 'افتح مجددًا',
      storageNote: 'هذه القائمة محفوظة في هذا المتصفح فقط. لا حساب ولا معرّف.',
      eyebrowHelp: 'مساعدة', helpTitle: 'كيف يعمل',
      h1: 'خذ رمزًا', h1d: 'على الجوال اضغط «استخدم الرمز» فيفتح تطبيق نسك. على الكمبيوتر انسخ الرمز والصقه في التطبيق. الرمز الذي أخذته لن يظهر لك مجددًا.',
      h2: 'شارك رمزك', h2d: 'الصق رسالة المشاركة من نسك ليدعمك الآخرون برمزك.',
      h3: 'أخبرنا إن لم يعمل', h3d: 'اضغط «لم يعمل؟» ولن ترى الرمز مجددًا. بلاغات من 3 شبكات مختلفة تزيله للجميع.',
      langTitle: 'اللغة',
      foot1: 'أداة مجتمعية مجانية. لا ترتبط بتطبيق نسك ولا بوزارة الحج والعمرة.', foot2: 'الزوار يشاركون هذه الرموز. شارك رمز الإحالة الخاص بك فقط.',
      copied: 'تم النسخ. الصقه الآن في نسك.', copiedLink: 'نُسخ الرابط. أرسله لأصدقائك.', copyFail: 'تعذّر النسخ. اضغط مطولًا على الرمز لنسخه.',
      reported: 'شكرًا لإخبارنا. لن نعرض لك هذا الرمز مجددًا.', offline: 'لا يوجد اتصال. نعرض الرموز المحمّلة سابقًا.', langShort: 'ع',
    },
  };
  const LOCALE = { en: 'en-US', bn: 'bn-BD', ar: 'ar-EG' };
  const LANGS = ['bn', 'en', 'ar'];
  const SAMPLE = 'Your chance to win one of 100 free Umrah for two in the Nusuk challenge 🕋!\n...\nhttps://services.nusuk.sa/app?p=27&id=';

  /* ---------- state ---------- */
  const S = {
    lang: LANGS.includes(store.get('lang')) ? store.get('lang') : 'bn',
    seen: new Ranges(store.get('seen', '')),
    used: store.get('used', []),          // last 300 taken codes (short form), newest first, for the "Mine" tab
    mine: store.get('mine', []),          // [[sn, code]] codes I shared, max 200
    items: new Map(),                     // code -> {sn, c, a, pin}
    minSn: 0, more: false, loading: false,
    stats: null, online: true,
    current: null, last: store.get('last', null), skipped: new Set(),
    queue: store.get('queue', []),
    view: 'take', seg: 'used', limit: 60,
  };
  const mineSet = () => new Set(S.mine.map((x) => x[1]));

  const t = (k, vars) => {
    let s = (T[S.lang] && T[S.lang][k]) || T.bn[k] || k;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  const num = (n) => { try { return new Intl.NumberFormat(LOCALE[S.lang]).format(n); } catch { return String(n); } };
  const extract = (text) => [...new Set(String(text || '').match(CODE_G) || [])];
  const saveSeen = () => store.set('seen', S.seen.toString());
  const saveUsed = () => store.set('used', S.used.slice(0, 300));
  const saveMine = () => store.set('mine', S.mine.slice(0, 200));

  /* ---------- pool (100 per page, newest first, pinned on top) ---------- */
  function merge(list, pin) {
    for (const [sn, c, a] of list || []) {
      const old = S.items.get(c);
      S.items.set(c, { sn, c, a: a * 1000, pin: pin ? (old && old.pin) || pin : 0 });
    }
  }
  function applyPage0(d) {
    for (const x of S.items.values()) x.pin = 0;
    (d.pins || []).forEach((p, i) => merge([p], 1000 - i));
    merge(d.c);
    if (!S.minSn || S.minSn > (d.c.length ? d.c[d.c.length - 1][0] : S.minSn)) {
      S.minSn = d.c.length ? d.c[d.c.length - 1][0] : 0;
      S.more = !!d.more;
    }
    S.stats = d.s || S.stats;
  }
  async function loadPage0() {
    if (!API) return;
    try {
      const r = await fetch(API + '/api/pool');
      if (!r.ok) throw new Error('pool');
      const d = await r.json();
      applyPage0(d); S.online = true;
      store.set('p0', d);
    } catch { S.online = false; }
  }
  async function loadMore() {
    if (!API || S.loading || !S.more || !S.minSn) return;
    S.loading = true; renderMoreState();
    try {
      const r = await fetch(API + '/api/pool?b=' + S.minSn);
      if (!r.ok) throw new Error('page');
      const d = await r.json();
      merge(d.c);
      if (d.c.length) S.minSn = d.c[d.c.length - 1][0];
      S.more = !!d.more;
    } catch { /* try again later */ }
    S.loading = false;
    renderAll(false);
  }
  // always keep one more page (100) of unseen codes ready ahead of the visitor
  function ensureBuffer() {
    if (available().length >= 150 || !S.more) return;
    (window.requestIdleCallback || ((f) => setTimeout(f, 300)))(() => loadMore());
  }

  const isAvailable = (x, mine) => !S.seen.has(x.sn) && !mine.has(x.c);
  function available() {
    const mine = mineSet(); const pins = []; const rest = [];
    for (const x of S.items.values()) if (isAvailable(x, mine)) (x.pin ? pins : rest).push(x);
    pins.sort((a, b) => b.pin - a.pin); rest.sort((a, b) => b.sn - a.sn);
    return pins.concat(rest);
  }
  function remainingCount() {
    const loaded = available().length;
    if (!S.stats) return loaded;
    return Math.max(loaded, (S.stats.total || 0) - S.seen.size - S.mine.length);
  }
  // A random code the visitor hasn't taken (pinned ones first), so every reload and every
  // visitor gets a different one and no single code gets hammered.
  const rand = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
  function pickNext() {
    const all = available();
    let pool = all.filter((x) => x.c !== S.current && !S.skipped.has(x.c));
    if (!pool.length) { S.skipped.clear(); pool = all.filter((x) => x.c !== S.current); }
    if (!pool.length) { S.current = all.length ? all[0].c : null; return; }
    const pins = pool.filter((x) => x.pin);
    S.current = (pins.length ? pins[0] : pool[rand(pool.length)]).c;
  }

  /* ---------- events: batched, no preflight, survive page exit ---------- */
  let flushTimer;
  function queue(c, kind) {
    S.queue.push([c, kind]);
    if (S.queue.length > 200) S.queue.splice(0, S.queue.length - 200);
    store.set('queue', S.queue);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, S.queue.length >= 15 ? 0 : 6000);
  }
  async function flush() {
    if (!API || !S.queue.length) return;
    const batch = S.queue.slice(0, 15);
    try {
      const r = await fetch(API + '/api/events', { method: 'POST', body: JSON.stringify({ e: batch }), headers: { 'Content-Type': 'text/plain' }, keepalive: true });
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429)) { S.queue.splice(0, batch.length); store.set('queue', S.queue); if (S.queue.length) flush(); }
    } catch { /* offline: retried on next visit */ }
  }
  function beacon() {
    if (!API || !S.queue.length || !navigator.sendBeacon) return;
    const batch = S.queue.slice(0, 15);
    if (navigator.sendBeacon(API + '/api/events', new Blob([JSON.stringify({ e: batch })], { type: 'text/plain' }))) {
      S.queue.splice(0, batch.length); store.set('queue', S.queue);
    }
  }

  function markTaken(c) {
    const x = S.items.get(c);
    if (!x || S.seen.has(x.sn)) return false;
    S.seen.add(x.sn); saveSeen();
    S.used = [c].concat(S.used.filter((u) => u !== c)).slice(0, 300); saveUsed();
    S.last = c; store.set('last', c);
    if (S.stats) S.stats.copiesToday = (S.stats.copiesToday || 0) + 1;
    queue(c, 'c');
    return true;
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }

  /* take: mobile = open the app link (and copy as backup); desktop = copy */
  function onRedeem(c, el) {
    copyText('NG-' + c);
    markTaken(c);
    beacon(); // the page is about to hand over to the Nusuk app
    S.askOnReturn = true;
    try { sessionStorage.setItem('nk.askReturn', '1'); } catch { /* ignore */ } // survives the trip to the app
    if (el) el.classList.add('go');
    setTimeout(() => { if (c === S.current) pickNext(); renderAll(false); ensureBuffer(); }, 450);
  }
  async function onCopy(c) {
    if (!(await copyText('NG-' + c))) { toast(t('copyFail')); return; }
    markTaken(c);
    toast(t('copied'));
    if (!S.asked) { S.asked = true; setTimeout(maybeAskGive, 1600); }
    if (c === S.current) pickNext();
    renderAll(false); ensureBuffer();
  }
  function report() {
    const c = S.last; if (!c) return;
    queue(c, 'r'); S.last = null; store.set('last', null);
    toast(t('reported')); renderHero();
  }

  /* ---------- give ---------- */
  let found = [];
  function onGiveInput() {
    const text = $('giveText').value;
    found = extract(text).slice(0, 20);
    const box = $('found'); box.textContent = '';
    for (const c of found) { const s = document.createElement('span'); s.textContent = c; box.appendChild(s); }
    labelAdd();
    setMsg(text.trim() && !found.length ? t('notFound') : (found.length ? t('found', { n: num(found.length) }) : ''), text.trim() && !found.length ? 'bad' : '');
  }
  function labelAdd() { const b = $('addBtn'); b.disabled = !found.length; b.textContent = found.length ? t('addN', { n: num(found.length) }) : t('addNone'); }
  function setMsg(s, cls) { const m = $('giveMsg'); m.textContent = s; m.className = 'msg' + (cls ? ' ' + cls : ''); }
  async function addCodes() {
    if (!found.length || !API) return;
    const btn = $('addBtn'); btn.disabled = true; btn.textContent = t('sending');
    try {
      const r = await fetch(API + '/api/codes', { method: 'POST', body: JSON.stringify({ text: found.join(' ') }), headers: { 'Content-Type': 'text/plain' } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(t(r.status === 429 ? 'tooMany' : 'addFail'), 'bad'); labelAdd(); return; }
      const nowSec = Date.now() / 1000;
      for (const [sn, c] of d.listed || []) {
        if (!S.mine.some((x) => x[1] === c)) S.mine.unshift([sn, c]);
        if (!S.items.has(c)) S.items.set(c, { sn, c, a: nowSec * 1000, pin: 0 });
      }
      saveMine();

      $('giveText').value = ''; found = []; $('found').textContent = ''; labelAdd();
      setMsg(t('listed'), 'ok');
      setTimeout(() => { if (sheet().open) { closeGive(); toast(t('listed')); setMsg(''); } }, 2200);
      if (S.current && mineSet().has(S.current)) pickNext();
      renderAll(false);
    } catch { setMsg(t('addFail'), 'bad'); labelAdd(); }
  }
  async function pasteIn() {
    const ta = $('giveText');
    try { const txt = await navigator.clipboard.readText(); if (!txt) throw new Error('empty'); ta.value = txt; onGiveInput(); if (found.length) $('addBtn').focus(); }
    catch { ta.focus(); setMsg(t('pasteFail')); }
  }

  /* ---------- render ---------- */
  let toastTimer;
  function toast(s) { const el = $('toast'); el.textContent = s; el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2400); }
  function ago(ms) {
    if (!ms) return t('archived');
    const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (m < 2) return t('justNow');
    if (m < 60) return t('minsAgo', { n: num(m) });
    if (m < 1440) return t('hoursAgo', { n: num(Math.round(m / 60)) });
    return t('daysAgo', { n: num(Math.round(m / 1440)) });
  }
  function doorSvg(svg, sn) {
    const use = svg.querySelector('use');
    use.setAttribute('href', '#d' + (sn % 4));
    use.setAttribute('fill', DOOR_COLORS[sn % 4]);
  }

  function renderStatic() {
    document.documentElement.lang = S.lang;
    document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    for (const el of document.querySelectorAll('[data-tp]')) el.placeholder = t(el.dataset.tp);
    for (const el of document.querySelectorAll('[data-ta]')) el.setAttribute('aria-label', t(el.dataset.ta));
    for (const b of document.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang));
    $('langBtn').textContent = t('langShort');
    const sample = $('sample'); sample.textContent = SAMPLE;
    const mk = document.createElement('mark'); mk.textContent = 'NG-vW7So71R'; sample.appendChild(mk);
    $('redeemBtn').hidden = !MOBILE; $('copyBtn').hidden = MOBILE; $('copyOnlyBtn').hidden = !MOBILE;
    $('hint').textContent = MOBILE ? t('hintMobile') : t('hintDesktop');
    renderTicker();
    // the store for this device only (both on a computer); the iPhone note only on iPhone/iPad
    for (const el of document.querySelectorAll('[data-store]')) el.hidden = OS !== 'desktop' ? el.dataset.store !== OS : el.classList.contains('ios-note');
    $('offline').hidden = S.online;
    labelAdd();
  }

  // Protibhan marketing bar. Items are our own fixed strings (bold via <b> only), never remote data.
  function renderTicker() {
    const items = (T[S.lang] && T[S.lang].ticker) || T.en.ticker;
    const belt = $('belt'); belt.textContent = '';
    for (let round = 0; round < 2; round++) {
      for (const it of items) {
        const span = document.createElement('span');
        const m = it.match(/^<b>(.*?)<\/b>\s*(.*)$/);
        if (m) { const b = document.createElement('b'); b.textContent = m[1]; span.append(b, document.createTextNode(' ' + m[2])); }
        else span.textContent = it;
        if (round) span.setAttribute('aria-hidden', 'true');
        belt.appendChild(span);
      }
    }
  }
  function renderHero() {
    const c = S.current; const x = c && S.items.get(c);
    $('heroBody').hidden = !x; $('emptyBox').hidden = !!x;
    if (!x) {
      const noneYet = !S.items.size && !S.seen.size;
      $('emptyText').textContent = S.items.size || S.seen.size ? t('emptyNext') : (API && !S.stats ? t('loadingFirst') : t('emptyPool'));
      $('emptyGive').hidden = !noneYet || (API && !S.stats);
      $('tag').hidden = true;
      return;
    }
    const code = $('code'); code.textContent = '';
    const pre = document.createElement('span'); pre.className = 'pre'; pre.textContent = 'NG-';
    code.append(pre, document.createTextNode(c));
    $('age').textContent = ago(x.a);
    const tag = $('tag'); tag.hidden = !x.pin && (!x.a || Date.now() - x.a > 864e5);
    tag.className = 'tag' + (x.pin ? ' pin' : ''); tag.textContent = x.pin ? t('pinned') : t('fresh');
    const rb = $('redeemBtn'); rb.href = LINK(c); rb.classList.remove('go');
    $('reportBtn').hidden = !S.last;
  }

  function renderStats() {
    const s = S.stats || {};
    $('stCopies').textContent = num(s.copiesToday || 0);
    $('stActive').textContent = num(Math.max(1, s.active || 0));
    $('countNum').textContent = num(remainingCount());
  }

  function renderMoreState() {
    const el = $('moreState');
    el.textContent = S.loading ? t('loading') : (!S.more && S.items.size ? t('endList') : '');
  }

  function renderGrid() {
    const list = available().filter((x) => x.c !== S.current);
    const grid = $('grid'); const frag = document.createDocumentFragment();
    const tpl = $('tplDoor').content.firstElementChild;
    for (const x of list.slice(0, S.limit)) {
      const el = tpl.cloneNode(true);
      el.dataset.c = x.c;
      el.href = MOBILE ? LINK(x.c) : '#take';
      doorSvg(el.querySelector('svg'), x.sn);
      el.querySelector('.r').textContent = x.c;
      const m = el.querySelector('.m');
      if (x.pin) { m.textContent = t('pinned'); m.classList.add('pin'); } else m.textContent = ago(x.a);
      const act = el.querySelector('.act');
      if (MOBILE) { const k = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); k.setAttribute('viewBox', '0 0 24 24'); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#kaaba'); k.appendChild(u); act.appendChild(k); }
      act.append(document.createTextNode(MOBILE ? t('tapRedeem') : t('tapCopy')));
      el.setAttribute('aria-label', 'NG-' + x.c);
      frag.appendChild(el);
    }
    grid.textContent = ''; grid.appendChild(frag);
    $('moreCount').textContent = S.stats && S.stats.total ? t('totalCodes', { n: num(S.stats.total) }) : '';
    document.querySelector('.sec').hidden = !list.length;
    renderMoreState();
  }

  function renderMine() {
    $('segUsed').setAttribute('aria-selected', String(S.seg === 'used'));
    $('segMine').setAttribute('aria-selected', String(S.seg === 'mine'));
    const box = $('mineList'); box.textContent = '';
    const rows = S.seg === 'used' ? S.used.map((c) => [S.items.get(c) ? S.items.get(c).sn : 0, c]) : S.mine;
    if (!rows.length) { const d = document.createElement('div'); d.className = 'blank'; d.textContent = t(S.seg === 'used' ? 'usedEmpty' : 'mineEmpty'); box.appendChild(d); return; }
    const frag = document.createDocumentFragment();
    for (const [sn, c] of rows.slice(0, 300)) {
      const own = S.seg === 'mine';
      const el = document.createElement(own || !MOBILE ? 'button' : 'a');
      el.className = 'li'; el.dataset.c = c; el.dataset.own = own ? '1' : '';
      if (el.tagName === 'A') el.href = LINK(c); else el.type = 'button';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'door'); svg.setAttribute('viewBox', '0 0 60 80');
      const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); svg.appendChild(u); doorSvg(svg, sn || c.charCodeAt(0));
      const code = document.createElement('span'); code.className = 'c'; code.textContent = 'NG-' + c;
      const m = document.createElement('span'); m.className = 'm'; m.textContent = own ? t('shareLink') : (MOBILE ? t('again') : t('tapCopy'));
      el.append(svg, code, m); frag.appendChild(el);
    }
    box.appendChild(frag);
  }

  function renderHero0() { renderHero(); }
  function renderAll(withStatic = true) {
    if (withStatic) renderStatic();
    if (!S.current || !S.items.has(S.current) || !isAvailable(S.items.get(S.current), mineSet())) pickNext();
    renderHero0(); renderStats(); renderGrid(); if (S.view === 'mine') renderMine();
  }

  /* ---------- share: the phone's own share menu, or direct links ---------- */
  const SHARE_URL = 'https://nusukey.pages.dev/';
  function openShare() {
    const msg = t('shareMsg'); const e = encodeURIComponent;
    $('shareMsg').textContent = msg + '\n\n' + SHARE_URL;
    $('chWa').href = 'https://wa.me/?text=' + e(msg + '\n\n' + SHARE_URL);
    $('chFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + e(SHARE_URL);
    $('chX').href = 'https://twitter.com/intent/tweet?text=' + e(t('shareShort')) + '&url=' + e(SHARE_URL);
    $('chTg').href = 'https://t.me/share/url?url=' + e(SHARE_URL) + '&text=' + e(msg);
    $('chMs').href = 'fb-messenger://share/?link=' + e(SHARE_URL); $('chMs').hidden = !MOBILE;
    $('shareNow').hidden = !navigator.share;
    $('fbStep').hidden = true;
    prefetchPic();
    const d = $('shareSheet'); if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  }
  // share as a picture: the message is printed on the image, so it survives Facebook/Instagram
  let picBlob = null; let picLang = '';
  function prefetchPic() {
    if (picBlob && picLang === S.lang) return;
    picLang = S.lang; picBlob = null;
    fetch('share-' + S.lang + '.jpg').then((r) => (r.ok ? r.blob() : null)).then((b) => { if (picLang === S.lang) picBlob = b; }).catch(() => {});
  }
  async function sharePicture() {
    const blob = picBlob || await fetch('share-' + S.lang + '.jpg').then((r) => r.blob()).catch(() => null);
    if (!blob) { toast(t('addFail')); return; }
    const file = new File([blob], 'nusukey-umrah.jpg', { type: 'image/jpeg' });
    copyText(t('shareMsg') + '\n\n' + SHARE_URL); // caption ready for apps that allow one
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text: t('shareMsg') + '\n\n' + SHARE_URL }); closeShare(); return; }
      catch (err) { if (err && err.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nusukey-umrah.jpg';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast(t('picSaved'));
  }
  const redSheet = () => $('redSheet');
  function openRed() { const d = redSheet(); if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); } }
  function closeRed() { const d = redSheet(); if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } }
  async function redCopy() {
    if (!S.current) { closeRed(); return; }
    S.asked = true; // don't stack the "share your code" popup on top of this
    const c = S.current;
    if (!(await copyText('NG-' + c))) { toast(t('copyFail')); return; }
    markTaken(c); pickNext(); renderAll(false); ensureBuffer();
    closeRed(); toast(t('redCopied'));
  }
  function closeShare() { const d = $('shareSheet'); if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); } }
  async function nativeShare() {
    copyText(t('shareMsg') + '\n\n' + SHARE_URL); // Facebook/Instagram drop shared text, so keep it on the clipboard
    try { await navigator.share({ title: 'NusukKey', text: t('shareMsg'), url: SHARE_URL }); closeShare(); }
    catch (err) { if (!err || err.name !== 'AbortError') toast(t('copyFail')); }
  }
  const sheet = () => $('giveSheet');
  function openGive() {
    const d = sheet(); if (d.open) return;
    store.set('askAt', Date.now());
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function closeGive() {
    const d = sheet(); if (d.open) { if (d.close) d.close(); else d.removeAttribute('open'); }
    if (location.hash === '#give') history.replaceState(null, '', '#' + S.view);
  }
  // after someone takes their first code, invite them to share theirs: shown by itself only once, ever
  function maybeAskGive() {
    if (S.mine.length || sheet().open || store.get('askAt', 0)) return;
    openGive();
  }
  function show(view) {
    if (view === 'give') { openGive(); return; }
    if (sheet().open) closeGive();
    if (!['take', 'mine', 'help'].includes(view)) view = 'take';
    S.view = view;
    for (const v of document.querySelectorAll('.view')) v.hidden = v.dataset.view !== view;
    for (const a of document.querySelectorAll('[data-nav]')) { if (a.dataset.nav === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    if (view === 'mine') renderMine();
    window.scrollTo(0, 0);
  }

  /* ---------- wire up ---------- */
  function bind() {
    window.addEventListener('hashchange', () => show(location.hash.slice(1)));
    $('redeemBtn').addEventListener('click', (e) => { if (!S.current) { e.preventDefault(); return; } onRedeem(S.current, e.currentTarget); });
    $('copyBtn').addEventListener('click', () => { if (S.current) onCopy(S.current); });
    $('copyOnlyBtn').addEventListener('click', () => { if (S.current) onCopy(S.current); });
    $('skipBtn').addEventListener('click', () => { if (!S.current) return; S.skipped.add(S.current); pickNext(); renderHero(); renderGrid(); });
    $('reportBtn').addEventListener('click', report);
    $('grid').addEventListener('click', (e) => {
      const el = e.target.closest('.door-card'); if (!el) return;
      const c = el.dataset.c;
      if (MOBILE) { el.classList.add('done'); onRedeem(c); return; } // let the link open the app
      e.preventDefault(); el.classList.add('done'); onCopy(c);
    });
    $('mineList').addEventListener('click', async (e) => {
      const el = e.target.closest('.li'); if (!el) return;
      const c = el.dataset.c;
      if (el.dataset.own) { e.preventDefault(); toast((await copyText(LINK(c))) ? t('copiedLink') : t('copyFail')); return; }
      if (el.tagName === 'A') { copyText('NG-' + c); return; }
      toast((await copyText('NG-' + c)) ? t('copied') : t('copyFail'));
    });
    $('segUsed').addEventListener('click', () => { S.seg = 'used'; renderMine(); });
    $('segMine').addEventListener('click', () => { S.seg = 'mine'; renderMine(); });
    $('giveText').addEventListener('input', onGiveInput);
    $('pasteBtn').addEventListener('click', pasteIn);
    $('addBtn').addEventListener('click', addCodes);
    const setLang = (l) => { S.lang = l; store.set('lang', l); renderAll(); if (S.view === 'mine') renderMine(); };
    $('langBtn').addEventListener('click', () => setLang(LANGS[(LANGS.indexOf(S.lang) + 1) % LANGS.length]));
    for (const b of document.querySelectorAll('[data-lang]')) b.addEventListener('click', () => setLang(b.dataset.lang));
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat || MOBILE || S.view !== 'take') return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'button', 'a', 'select'].includes(tag)) return;
      e.preventDefault(); if (S.current) onCopy(S.current);
    });
    const backFromApp = () => {
      let flag = S.askOnReturn; try { flag = flag || sessionStorage.getItem('nk.askReturn') === '1'; sessionStorage.removeItem('nk.askReturn'); } catch { /* ignore */ }
      if (flag) { S.askOnReturn = false; setTimeout(maybeAskGive, 700); }
    };
    backFromApp(); // the page may have been reloaded on the way back
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') beacon(); else { refresh(); backFromApp(); } });
    window.addEventListener('pagehide', beacon);
    window.addEventListener('pageshow', (e) => { if (e.persisted) { $('redeemBtn').classList.remove('go'); refresh(); backFromApp(); } });
    $('giveCta').addEventListener('click', openGive);
    $('shareBtn').addEventListener('click', openShare);
    $('shareX').addEventListener('click', closeShare);
    $('shareNow').addEventListener('click', nativeShare);
    $('sharePic').addEventListener('click', sharePicture);
    $('redHelpBtn').addEventListener('click', openRed);
    $('redHelpBtn2').addEventListener('click', openRed);
    $('redX').addEventListener('click', closeRed);
    $('redOk').addEventListener('click', closeRed);
    $('redCopy').addEventListener('click', redCopy);
    redSheet().addEventListener('click', (e) => { if (e.target === redSheet()) closeRed(); });
    $('shareSheet').addEventListener('click', (e) => { if (e.target === $('shareSheet')) closeShare(); });
    // Facebook and Messenger only accept a link: copy the message on the same tap, then let the link open
    // Facebook never accepts prefilled post text. Step 1 (this tap): copy the message and say so.
    // Step 2: a clear "Open Facebook" button, so nobody misses that they need to paste.
    for (const id of ['chFb', 'chMs']) $(id).addEventListener('click', (e) => {
      e.preventDefault();
      copyText(t('shareMsg') + '\n\n' + SHARE_URL);
      const go = $('fbGo'); go.href = $(id).href; go.textContent = t(id === 'chFb' ? 'fbOpen' : 'msOpen'); go.className = id === 'chMs' ? 'ms' : '';
      $('fbStep').hidden = false; $('fbStep').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    $('fbGo').addEventListener('click', () => setTimeout(closeShare, 300));
    $('chCopy').addEventListener('click', async () => { toast((await copyText(t('shareMsg') + '\n\n' + SHARE_URL)) ? t('msgCopied') : t('copyFail')); });
    $('sheetX').addEventListener('click', closeGive);
    $('sheetLater').addEventListener('click', closeGive);
    sheet().addEventListener('click', (e) => { if (e.target === sheet()) closeGive(); }); // tap outside
    sheet().addEventListener('close', () => { if (location.hash === '#give') history.replaceState(null, '', '#' + S.view); });
    window.addEventListener('online', () => { flush(); refresh(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { if (en[0].isIntersecting) { if (S.limit < available().length) { S.limit += 60; renderGrid(); } loadMore(); } }, { rootMargin: '600px' }).observe($('sentinel'));
    }
  }

  let lastRefresh = 0;
  async function refresh() {
    if (Date.now() - lastRefresh < 15000) return;
    lastRefresh = Date.now();
    await loadPage0(); renderAll(false); $('offline').hidden = S.online; ensureBuffer();
  }

  async function start() {
    bind();
    const cached = store.get('p0', null);
    if (cached) applyPage0(cached); // instant paint from the last visit
    show(location.hash.slice(1) || 'take');
    renderAll();
    lastRefresh = Date.now();
    await loadPage0();
    renderAll();
    ensureBuffer(); flush();
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 45000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
