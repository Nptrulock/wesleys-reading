#!/usr/bin/env python3
"""Build content.js (v3 expansion content) from the python content tables in this folder."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emoji, levels, rooms, words2, dialog
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
E = emoji.EMOJI
def slug(s): return re.sub(r'^-+|-+$', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))
def pic(w):
    if w in E: return E[w]
    for suf, rep in (('es', ''), ('s', ''), ('ing', ''), ('ing', 'e'), ('ed', ''), ('ed', 'e'), ('d', '')):
        if w.endswith(suf):
            b = w[:-len(suf)] + rep
            if b in E: return E[b]
            if len(b) > 2 and b[-1] == b[-2] and b[:-1] in E: return E[b[:-1]]
    return '🔊'
VOW = 'aeiou'
def rime(w):
    m = re.search(r'[aeiouy][a-z]*$', w)
    return m.group(0) if m else w

# ---------- Letter Rain ----------
RAIN = []
for i, l in enumerate(levels.L):
    ws = []
    for w in l['words']:
        o = {'word': w, 'pic': pic(w) if l['mode'] != 'letter' else ''}
        if l['mode'] == 'sound':
            g = levels.split(w, l['teams'])
            if len(g) != len(w): o['g'] = '-'.join(g)
        if l['mode'] != 'letter': o['r'] = rime(w)
        ws.append(o)
    variants = list(l['variants'])
    # rhyme rounds need at least two words sharing a rime
    if 'rhyme' in variants:
        from collections import Counter
        c = Counter(o['r'] for o in ws)
        if max(c.values()) < 2: variants = [v for v in variants if v != 'rhyme']
    need = min(30, 8 + int(i * 0.4))
    days = 1 if i < 8 else (2 if i < 36 else 3)
    RAIN.append(dict(id=l['id'], name=l['name'], icon=l['icon'], color=l['color'], mode=l['mode'], variants=variants, words=ws, need=need, days=days))

# ---------- stories ----------
STORIES = []; cur = None
for line in open(os.path.join(os.path.dirname(__file__), 'stories.txt'), encoding='utf-8'):
    line = line.rstrip('\n')
    if not line.strip() or line.startswith('#'): continue
    if line.startswith('@'):
        i, t, c, col, lv = line[1:].split('|'); cur = dict(id=i, title=t, cover=c, color=col, level=int(lv), pages=[]); STORIES.append(cur)
    else:
        bg, t, sc = line.split('|'); spr = []
        for part in sc.split(','):
            f = part.split()
            if not f: continue
            spr.append([f[0], float(f[1]), float(f[2]), float(f[3]), f[4] if len(f) > 4 else ''])
        cur['pages'].append(dict(t=t, bg=bg, s=spr))

# ---------- race & actions ----------
RACE = dict(
    NOUNS=[dict(s=s, p=p, e=e) for s, p, e in words2.NOUNS],
    VERBS=[dict(b=b, s=s, i=ii, a=a) for b, s, ii, a in words2.VERBS],
    ADJS=[dict(w=w, a=a) for w, a in words2.ADJS],
    PLACES=[dict(w=w, bg=bg, e=e) for w, bg, e in words2.PLACES],
    LEVELS=[dict(id=a, name=b, icon=c, color=d, slots=e, example=f) for a, b, c, d, e, f in words2.RACE_LEVELS])
ACTIONS = [dict(w=w, a=a) for w, a in words2.ACTIONS]
ACT_LEVELS = [dict(id=a, name=b, icon=c, color=d, n=e, tpl=f) for a, b, c, d, e, f in words2.ACT_LEVELS]

# ---------- gallery ----------
data_rooms = json.loads(os.popen(f"cd {ROOT} && node -e \"console.log(JSON.stringify(require('./data.js').ROOMS))\"").read())
SLOTS = [(x, y) for y in (24, 40, 56, 72, 86) for x in (8, 20, 32, 44, 56, 68, 80, 92)]
def layout(existing, n):
    out = []; pts = [(e[0], e[1]) for e in existing]
    for _ in range(n):
        best = max(SLOTS, key=lambda s: min([((s[0] - p[0]) ** 2 + ((s[1] - p[1]) * 1.3) ** 2) for p in pts] or [1e9]))
        out.append(best); pts.append(best)
    return out
PHR = {}
ROOMS = []
for ri, r in enumerate(data_rooms):
    acts = rooms.ACT_EXIST[r['id']].split()
    items = [it + [acts[k]] for k, it in enumerate(r['items'])]
    extra = rooms.EXTRA.get(r['id'], [])
    pos = layout([(it[3], it[4]) for it in items], len(extra))
    for k, (n, e, a) in enumerate(extra):
        items.append([n, e, 3 + ri // 2 + (k % 4), pos[k][0], pos[k][1], 11 + (k % 3) * 2, a])
    ROOMS.append(dict(id=r['id'], name=r['name'], icon=r['icon'], bg=r['bg'], need=r['need'], items=items))
for k, (rid, name, icon, bg, its) in enumerate(rooms.NEW):
    ri = len(ROOMS); pos = layout([], len(its))
    items = [[n, e, 3 + ri // 2 + (j % 5), pos[j][0], pos[j][1], 12 + (j % 4) * 2, a] for j, (n, e, a) in enumerate(its)]
    ROOMS.append(dict(id=rid, name=name, icon=icon, bg=rid, need=8, items=items))
for r in ROOMS:
    PHR['rw-' + r['id']] = f"Welcome to the {r['name']}!" if not r['name'].startswith('My') else 'Welcome to your room!'
    for j, it in enumerate(r['items']):
        PHR[f"il-{r['id']}-{j}"] = rooms.ACTS[it[6]][2].format(n=it[0])
INTER = []
for n, (rid, a, b, typ, line) in enumerate(rooms.INTER):
    room = next(x for x in ROOMS if x['id'] == rid)
    names = [it[0] for it in room['items']]
    if not (a in names and b in names): print("BAD", rid, a, b); continue
    INTER.append(dict(room=rid, a=names.index(a), b=names.index(b), t=typ, k='ix-%d' % n)); PHR['ix-%d' % n] = line
ACTS = {k: dict(a=v[0], d=v[1]) for k, v in rooms.ACTS.items()}
DECOR = [dict(id=a, e=b, name=c, price=d) for a, b, c, d in rooms.DECOR]
for d in DECOR: PHR['decor-' + d['id']] = d['name'] + '!'

# ---------- dialog ----------
lines = dialog.all_lines(); PHR.update(lines)
DIALOG = {cat: len(v) for cat, v in dialog.D.items()}

C = dict(RAIN_LEVELS=RAIN, STORIES=STORIES, RACE=RACE, ACTIONS=ACTIONS, ACT_LEVELS=ACT_LEVELS, ROOMS=ROOMS, INTER=INTER, ACTS=ACTS, DECOR=DECOR, DIALOG=DIALOG, PHRASES=PHR,
         SOUND_ALIAS=dict(wh='w', ea='ee', ay='ai', ir='er', ur='er', oy='oi', au='aw', zz='z', ow='ou'))
js = '/* generated by tools/content/build.py - do not edit by hand */\n(function (root) {\nconst C = ' + json.dumps(C, ensure_ascii=False, separators=(',', ':')) + ';\nif (typeof module !== "undefined") module.exports = C; else root.CONTENT = C;\n})(this);\n'
open(os.path.join(ROOT, 'content.js'), 'w', encoding='utf-8').write(js)
allw = set()
for l in RAIN:
    for w in l['words']:
        if l['mode'] != 'letter': allw.add(w['word'])
print('rain levels', len(RAIN), 'rain words', len(allw), 'stories', len(STORIES), 'rooms', len(ROOMS), 'items', sum(len(r['items']) for r in ROOMS), 'inter', len(INTER), 'phrases', len(PHR), 'bytes', len(js.encode()))
