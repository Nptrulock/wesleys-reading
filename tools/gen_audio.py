#!/usr/bin/env python3
"""Generate every spoken clip for Wesley's Reading Adventure with edge-tts (neural voice),
trim silence with ffmpeg, extract phonics sounds, and write audio/manifest.js.
Re-runnable: skips clips that already exist (pass --force to regenerate)."""
import asyncio, json, os, subprocess, sys, re
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'audio')
VOICE = 'en-US-AvaNeural'
FORCE = '--force' in sys.argv
D = json.loads(subprocess.check_output(['node', '-e', "const D=require('./data.js');console.log(JSON.stringify(D))"], cwd=ROOT))
def slug(s): return re.sub(r'^-+|-+$', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))
def tokens(t): 
    out=[]
    for raw in t.split():
        w = re.sub(r"[^a-z'-]", '', raw.lower()).strip("'")
        out.append(w)
    return out

# ---------- collect words ----------
words = {}
def addw(text, say=None):
    if not text: return
    words.setdefault(slug(text), say or text)
for lv in D['RAIN_LEVELS']:
    for w in lv['words']:
        if lv['mode'] != 'letter': addw(w['word'])
for l, (kw, _) in D['LETTER_KEY'].items(): addw(kw)
for st in D['STORIES']:
    addw(st['title'])
    for p in st['pages']:
        for w in tokens(p['t']): addw(w)
for n in D['RACE_NOUNS']: addw(n['s']); addw(n['p'])
for v in D['RACE_VERBS']: addw(v['b']); addw(v['s'])
for a in D['RACE_ADJS']: addw(a['w'])
for p in D['RACE_PLACES']: addw(p['w'])
for w in ['the', 'can', 'The']: addw(w)
for a in D['ACTIONS']: addw(a['w'])
for p in D['ACTION_PHRASES']:
    addw(p['w'])
    for w in p['w'].split(): addw(w)
for r in D['ROOMS']:
    addw(r['name'])
    for it in r['items']: addw(it[0])
# pronunciation fixes for single words read in isolation
FIX = {'read': 'read', 'i': 'I', 'a': 'a', 'the': 'the', 'yo-yo': 'yo-yo', 'lead': 'lead', 'wes': 'Wes', 'sam': 'Sam', 'max': 'Max', 'dot': 'Dot', 'luna': 'Luna', 'ember': 'Ember', 'us': 'us', 'live': 'live'}
for k, v in FIX.items():
    if k in words: words[k] = v

# ---------- phonics sources: (keyword, start_ms, dur_ms, from_end) ----------
SND = {
 'a':('at',0,210,0),'e':('egg',0,210,0),'i':('it',0,180,0),'o':('ox',0,220,0),'u':('up',0,190,0),
 'b':('bus',0,150,0),'c':('cup',0,150,0),'k':('cup',0,150,0),'d':('duck',0,150,0),'g':('gum',0,150,0),'h':('hut',0,170,0),
 'j':('jug',0,180,0),'p':('pup',0,150,0),'t':('tub',0,150,0),'f':('fun',0,210,0),'l':('luck',0,190,0),'m':('mud',0,200,0),
 'n':('nut',0,190,0),'r':('rug',0,190,0),'s':('sun',0,220,0),'v':('van',0,190,0),'w':('won',0,190,0),'y':('yum',0,180,0),
 'z':('zap',0,210,0),'q':('quack',0,240,0),'x':('box',0,260,1),
 'sh':('shush',0,240,0),'ch':('chug',0,190,0),'th':('thumb',0,210,0),'ck':('cup',0,150,0),'ng':('sing',0,230,1),
 'ee':('eel',0,250,0),'oo':('ooze',0,260,0),'ll':('luck',0,190,0),'ss':('sun',0,220,0),'ff':('fun',0,210,0),
}

SEM = asyncio.Semaphore(8)
async def tts(text, out, rate='-5%', bounds=False):
    for attempt in range(5):
        try:
            async with SEM:
                c = edge_tts.Communicate(text, VOICE, rate=rate, boundary='WordBoundary' if bounds else 'SentenceBoundary')
                audio = bytearray(); marks = []
                async for ch in c.stream():
                    if ch['type'] == 'audio': audio += ch['data']
                    elif ch['type'] == 'WordBoundary': marks.append([round(ch['offset']/10000), round((ch['offset']+ch['duration'])/10000), ch['text']])
            if not audio: raise RuntimeError('empty audio')
            with open(out, 'wb') as f: f.write(audio)
            return marks
        except Exception as e:
            print('retry', text, e, file=sys.stderr); await asyncio.sleep(1.5*(attempt+1))
    raise RuntimeError('failed ' + text)

TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse'
def ff(args): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error'] + args, check=True)
def trim(src, dst):
    ff(['-i', src, '-af', TRIM + ',apad=pad_dur=0.04', '-ac', '1', '-ar', '24000', '-b:a', '48k', dst])

async def make_word(key, text, folder, rate='-5%'):
    dst = os.path.join(A, folder, key + '.mp3')
    if os.path.exists(dst) and not FORCE: return
    tmp = dst + '.raw.mp3'
    await tts(text, tmp, rate)
    trim(tmp, dst); os.remove(tmp)

async def make_sound(g, spec):
    kw, st, dur, from_end = spec
    dst = os.path.join(A, 'ls', g + '.mp3')
    if os.path.exists(dst) and not FORCE: return
    raw = os.path.join(A, 'ls', g + '.src.mp3'); await tts(kw, raw, '-20%')
    wav = raw + '.wav'
    ff(['-i', raw, '-af', TRIM, '-ac', '1', '-ar', '24000', wav])
    if from_end:
        dur_all = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).decode())
        st = max(0, dur_all*1000 - dur)
    # cut, fade, repeat twice with a short gap ("sss ... sss") is NOT wanted: single clean sound
    ff(['-ss', str(st/1000), '-t', str(dur/1000), '-i', wav, '-af', f'afade=t=in:d=0.01,afade=t=out:st={max(0,(dur-60)/1000)}:d=0.06,apad=pad_dur=0.05,volume=1.3', '-ar', '24000', '-b:a', '48k', dst])
    os.remove(raw); os.remove(wav)

async def make_page(sid, i, text):
    dst = os.path.join(A, 's', f'{sid}-{i}.mp3'); jf = dst + '.json'
    if os.path.exists(dst) and os.path.exists(jf) and not FORCE: return json.load(open(jf))
    marks = await tts(text, dst, '-12%', bounds=True)
    json.dump(marks, open(jf, 'w')); return marks

async def main():
    for d in ['w', 'p', 'ln', 'ls', 's']: os.makedirs(os.path.join(A, d), exist_ok=True)
    jobs = []
    for k, t in words.items(): jobs.append(make_word(k, t, 'w'))
    for k, t in D['PHRASES'].items(): jobs.append(make_word(k, t, 'p', '+0%'))
    for l, t in D['LETTER_NAME_TEXT'].items(): jobs.append(make_word(l, t, 'ln', '-10%'))
    for g, spec in SND.items(): jobs.append(make_sound(g, spec))
    await asyncio.gather(*jobs)
    pages = {}
    res = await asyncio.gather(*[make_page(st['id'], i, p['t']) for st in D['STORIES'] for i, p in enumerate(st['pages'])])
    k = 0
    for st in D['STORIES']:
        for i, p in enumerate(st['pages']):
            marks = res[k]; k += 1
            toks = tokens(p['t']); tim = []; mi = 0
            for w in toks:  # align boundaries to tokens by order (skip punctuation-only marks)
                while mi < len(marks) and not re.sub(r"[^a-z]", '', marks[mi][2].lower()): mi += 1
                if mi < len(marks): tim.append(marks[mi][:2]); mi += 1
                else: tim.append(tim[-1] if tim else [0, 0])
            pages[f"{st['id']}-{i}"] = tim
    man = {'voice': VOICE, 'w': sorted(words), 'p': sorted(D['PHRASES']), 'ln': D['LETTERS'], 'ls': sorted(SND), 'pages': pages}
    with open(os.path.join(A, 'manifest.js'), 'w') as f: f.write('window.AUDIO_MANIFEST=' + json.dumps(man, separators=(',', ':')) + ';\n')
    n = sum(len(fs) for _, _, fs in os.walk(A))
    print('words', len(words), 'phrases', len(D['PHRASES']), 'pages', len(pages), 'files', n)

asyncio.run(main())
