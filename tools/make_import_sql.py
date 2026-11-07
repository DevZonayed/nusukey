"""Build one D1 import file from code lists. Strictly validated (NG- + 8 alnum), deduped, flagged imported=1."""
import re, sys, time
out, files = sys.argv[1], sys.argv[2:]
CODE = re.compile(r'^NG-[A-Za-z0-9]{8}$')
seen, codes = set(), []
for f in files:
    for line in open(f):
        c = line.strip()
        if CODE.match(c) and c not in seen:
            seen.add(c); codes.append(c)
now = int(time.time() * 1000)
with open(out, 'w') as w:
    for c in codes:  # c is validated alnum: safe to inline
        w.write(f"INSERT OR IGNORE INTO codes (code, sn, added_at, imported) VALUES ('{c}', (SELECT COALESCE(MAX(sn), 0) + 1 FROM codes), {now}, 1);\n")
    w.write("INSERT INTO daily (day, metric, n) VALUES ('all', 'codes_total', (SELECT COUNT(*) FROM codes WHERE reports < 3)) ON CONFLICT(day, metric) DO UPDATE SET n = excluded.n;\n")
    w.write("INSERT INTO daily (day, metric, n) VALUES ('all', 'ver', 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1;\n")
print('codes', len(codes))
