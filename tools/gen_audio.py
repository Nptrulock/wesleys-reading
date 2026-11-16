#!/usr/bin/env python3
"""Generate every spoken clip for Wesley's Reading Adventure with edge-tts (neural voice),
trim silence with ffmpeg, extract phonics sounds, and write audio/manifest.js.
Re-runnable: skips clips that already exist (pass --force to regenerate)."""
import asyncio, json, os, subprocess, sys, re
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'audio')
ONLY_SND = '--snd' in sys.argv
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

# ---------- merge v3 content (same rules as app.js applyContent) ----------
C = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./content.js')))"], cwd=ROOT))
D['RAIN_LEVELS'] = C['RAIN_LEVELS']; D['STORIES'] = D['STORIES'] + C['STORIES']
D['RACE_NOUNS'] = C['RACE']['NOUNS']; D['RACE_VERBS'] = C['RACE']['VERBS']; D['RACE_ADJS'] = C['RACE']['ADJS']; D['RACE_PLACES'] = C['RACE']['PLACES']; D['RACE_LEVELS'] = C['RACE']['LEVELS']
D['ACTIONS'] = C['ACTIONS']; D['ROOMS'] = C['ROOMS']; D['PHRASES'] = dict(D['PHRASES'], **C['PHRASES'])

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
for v in D['RACE_VERBS']: addw(v['b']); addw(v['s']); addw(v['i'])
for a in D['RACE_ADJS']: addw(a['w'])
for p in D['RACE_PLACES']: addw(p['w'])
for lv in D['RACE_LEVELS']:
    for sl in lv['slots']:
        if sl.startswith('='): addw(sl[1:].lower().strip('!?.'))
for w in ['the', 'can', 'The', 'and', 'then', 'first', 'dragon', 'look', 'is']: addw(w)
for a in D['ACTIONS']: addw(a['w'])
for p in D['ACTION_PHRASES']:
    addw(p['w'])
    for w in p['w'].split(): addw(w)
for r in D['ROOMS']:
    addw(r['name'])
    for it in r['items']: addw(it[0])
# pronunciation fixes for single words read in isolation
FIX = {'read': 'read', 'i': 'I', 'a': 'a', 'the': 'the', 'yo-yo': 'yo-yo', 'lead': 'lead', 'wes': 'Wes', 'sam': 'Sam', 'max': 'Max', 'dot': 'Dot', 'luna': 'Luna', 'ember': 'Ember', 'us': 'us', 'live': 'live', 't-rex': 'T. rex', 'dodo-bird': 'dodo bird', 'zoe': 'Zoe', 'jake': 'Jake', 'mike': 'Mike', 'kay': 'Kay', 'ray': 'Ray', 'gail': 'Gail', 'bart': 'Bart', 'mark': 'Mark', 'ruby': 'Ruby', 'zed': 'Zed', 'pete': 'Pete', 'gus': 'Gus', 'ben': 'Ben', 'sparky': 'Sparky', 'chip': 'Chip', 'sir': 'Sir', 'rex': 'rex'}
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
 'ee':('eel',0,250,0),'ai':('aim',0,260,0),'oa':('oak',0,270,0),'igh':('ice',0,280,0),'ar':('arm',0,300,0),'or':('or',0,330,0),'er':('earn',0,300,0),'ou':('ouch',0,270,0),'oi':('oink',0,300,0),'aw':('awesome',0,260,0),'oo':('ooze',0,260,0),'ll':('luck',0,190,0),'ss':('sun',0,220,0),'ff':('fun',0,210,0),
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
import numpy as np
def pcm(src):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', '24000', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768
def trim(src, dst):
    # Energy-based trim (v2). v1 used ffmpeg silenceremove, which on some clips (e.g. "cats") removed
    # the whole word and left 0.1 s of silence. Here: find the first/last 10 ms frame within 35 dB of
    # the peak, keep 60 ms before and 150 ms after, never cut inside speech.
    a = pcm(src); sr = 24000; win = 240
    fr = np.array([np.sqrt(np.mean(a[i:i + win] ** 2)) for i in range(0, max(1, len(a) - win), win)]) + 1e-9
    db = 20 * np.log10(fr); thr = db.max() - 35
    idx = np.where(db > thr)[0]
    s0 = max(0, idx[0] * win - int(.06 * sr)); s1 = min(len(a), (idx[-1] + 1) * win + int(.15 * sr))
    ff(['-ss', '%.3f' % (s0 / sr), '-t', '%.3f' % ((s1 - s0) / sr), '-i', src, '-af', 'afade=t=out:st=%.3f:d=0.05' % max(0, (s1 - s0) / sr - .05), '-ac', '1', '-ar', '24000', '-b:a', '48k', dst])
    b = pcm(dst)
    if len(b) < .18 * sr or np.abs(b).max() < .1: raise RuntimeError('trim check failed for ' + dst)

FAILED = []
async def make_word(key, text, folder, rate='-5%'):
    try: await _make_word(key, text, folder, rate)
    except Exception as e: FAILED.append((folder, key, str(e))); print('FAIL', folder, key, e, file=sys.stderr)
async def _make_word(key, text, folder, rate='-5%'):
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
    print('FAILED', FAILED)
    print('words', len(words), 'phrases', len(D['PHRASES']), 'pages', len(pages), 'files', n)

asyncio.run(main())
