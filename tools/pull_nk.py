"""Page through nusukkeys.pages.dev /api/list politely (1 req/s) with one guest key; write codes.txt."""
import json, sys, time, urllib.request, re
base, keyfile, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
key = open(keyfile).read().strip()
CODE = re.compile(r'^NG-[A-Za-z0-9]{8}$')
codes, after, pages, fails = [], 0, 0, 0
while True:
    body = json.dumps({"key": key, "fp": "", "filter": "all", "q": "", "after": after}).encode()
    req = urllib.request.Request(base + '/api/list', data=body, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; NusukKey-import/1.0)'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.load(r)
    except Exception as e:
        fails += 1
        print('fail', after, e, flush=True)
        if fails > 5: break
        time.sleep(5); continue
    if not d.get('ok'): print('not ok', d, flush=True); break
    for c in d.get('codes', []):
        if CODE.match(c.get('code', '')): codes.append(c['code'])
    pages += 1
    if pages % 20 == 0: print('pages', pages, 'codes', len(codes), flush=True)
    if not d.get('hasMore'): break
    after = d.get('next'); time.sleep(1.0)
uniq = list(dict.fromkeys(codes))
open(outdir + '/codes.txt', 'w').write('\n'.join(uniq) + '\n')
print('done pages', pages, 'raw', len(codes), 'unique', len(uniq), flush=True)
