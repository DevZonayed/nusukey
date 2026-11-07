import json,sys
L={
 'bn':dict(dir='ltr',lang='bn',eyebrow='নুসুক উমরাহ চ্যালেঞ্জ',title='উমরাহ আপনার অপেক্ষায়',
   lines=['উমরাহ করার ইচ্ছাটা আমাদের অনেকের মনেই বহু বছর ধরে আছে।','নুসুক উমরাহ চ্যালেঞ্জে দুইজনের জন্য ১০০টা ফ্রি উমরাহ জেতার সুযোগ।','এক ট্যাপে রেফারেল কোড নিন, নিজের কোডটাও দিন। সাইন-আপ লাগে না।'],
   last='কে জানে, হয়তো এবার আল্লাহর ঘরের ডাক আপনারই আসবে।',foot='ফ্রি রেফারেল কোড · মোবাইলে এক ট্যাপে রিডিম'),
 'en':dict(dir='ltr',lang='en',eyebrow='Nusuk Umrah challenge',title='Umrah is waiting for you',
   lines=['So many of us have wanted to perform Umrah for years.',"The Nusuk Umrah challenge is giving away 100 free Umrah trips for two.","Grab a referral code in one tap and share yours. No sign&#8209;up."],
   last="Who knows, maybe this time the call to Allah's House is yours.",foot='Free referral codes · one tap on your phone'),
 'ar':dict(dir='rtl',lang='ar',eyebrow='تحدي العمرة في نسك',title='العمرة بانتظارك',
   lines=['العمرة أمنية يحملها كثير منا منذ سنين.','تحدي العمرة في نسك يقدّم 100 عمرة مجانية لشخصين.','خذ رمز إحالة بضغطة وشارك رمزك. بلا تسجيل.'],
   last='من يدري، لعل الدعوة إلى بيت الله تكون لك هذه المرة.',foot='رموز إحالة مجانية · بضغطة من جوالك'),
}
door='''<svg width="215" height="285" viewBox="0 0 60 80"><path d="M8 80V30a22 22 0 0 1 44 0v50z" fill="#00663A"/><path d="M30 8v72" stroke="rgba(255,255,255,.55)" stroke-width="1"/><circle cx="26.5" cy="46" r="1.6" fill="#fff"/><circle cx="33.5" cy="46" r="1.6" fill="#fff"/><g transform="translate(20 54) scale(.8333)"><path d="M3 7.5 12 3l9 4.5-9 4.5z" fill="#3a3a3a"/><path d="M3 7.5l9 4.5V22l-9-4.5z" fill="#111"/><path d="M21 7.5 12 12V22l9-4.5z" fill="#222"/><path d="M3 10.2l9 4.5 9-4.5v1.9l-9 4.5-9-4.5z" fill="#D4A63A"/></g></svg>'''
for k,v in L.items():
    lines=''.join(f'<p>{x}</p>' for x in v['lines'])
    html=f'''<!doctype html><html lang="{v['lang']}" dir="{v['dir']}"><head><meta charset="utf-8"><style>
@font-face{{font-family:Purno;font-weight:700;src:url(fonts/purno-bold.woff2);unicode-range:U+0964-0965,U+0980-09FF,U+200C-200D,U+25CC}}
@font-face{{font-family:Purno;font-weight:400;src:url(fonts/purno-regular.woff2);unicode-range:U+0964-0965,U+0980-09FF,U+200C-200D,U+25CC}}
@font-face{{font-family:Inter;font-weight:100 900;src:url(fonts/inter.woff2)}}
@font-face{{font-family:Ruqaa;font-weight:700;src:url(fonts/ruqaa-inshallah.woff2)}}
*{{box-sizing:border-box}}html,body{{margin:0}}
body{{width:1080px;height:1350px;overflow:hidden;font-family:Purno,Inter,"Geeza Pro","Noto Naskh Arabic",sans-serif;color:#1E2320;background:radial-gradient(110% 70% at 50% -5%,#FCE3B4 0%,#FFF4E1 45%,#F7F6F3 78%)}}
.w{{height:100%;display:flex;flex-direction:column;align-items:center;text-align:center;padding:70px 80px 64px}}
.brand{{display:flex;align-items:center;gap:14px;font:700 38px Inter;direction:ltr}}
.brand svg{{width:60px;height:60px}}
.eyebrow{{margin-top:40px;font-size:34px;color:#3D423E}}
h1{{margin:6px 0 0;font-size:84px;line-height:1.12;font-weight:700}}
.dua{{font:700 92px/1.25 Ruqaa;direction:rtl;background:linear-gradient(100deg,#9A6A12,#D4A63A 40%,#F4D27E 55%,#B8861F);-webkit-background-clip:text;background-clip:text;color:transparent}}
.door{{margin:22px 0 8px;filter:drop-shadow(0 16px 26px rgba(0,102,58,.2))}}
.msg{{background:#fff;border-radius:40px;padding:34px 44px;box-shadow:0 12px 34px rgba(30,35,32,.08);width:100%}}
.msg p{{margin:0 0 14px;font-size:35px;line-height:1.5;color:#3D423E}}
.msg .last{{margin:6px 0 0;font-size:38px;font-weight:700;color:#00663A}}
.foot{{margin-top:auto;font-size:30px;color:#3D423E}}
:lang(en) h1{{font-size:68px}} :lang(en) .msg p{{font-size:30px}} :lang(en) .msg .last{{font-size:32px}} :lang(en) .dua{{font-size:80px}}
.url{{margin-top:14px;padding:14px 34px;border-radius:999px;background:#00663A;color:#fff;font:700 36px Inter;direction:ltr}}
</style></head><body><div class="w">
<div class="brand"><svg viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#00663A"/><path d="M9.5 26V13.5a6.5 6.5 0 0 1 13 0V26z" fill="#fff"/><path d="M16 9v17" stroke="#00663A" stroke-width="1"/></svg>NusukKey</div>
<div class="eyebrow">{v['eyebrow']}</div><h1>{v['title']}</h1><div class="dua">إن شاء الله</div>
<div class="door">{door}</div>
<div class="msg">{lines}<p class="last">{v['last']}</p></div>
<div class="foot">{v['foot']}</div><div class="url">nusukey.pages.dev</div>
</div></body></html>'''
    open(f'{sys.argv[1]}/pic-{k}.html','w').write(html)
print('ok')
