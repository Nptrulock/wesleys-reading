#!/usr/bin/env python3
"""Audit every clip in audio/manifest.js: decodes, duration, peak, RMS, and an over-trim heuristic
(spoken duration vs text length). Exit code 1 if anything is suspicious."""
import json, os, re, subprocess, sys
import numpy as np
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.loads(re.sub(r'^window.AUDIO_MANIFEST=|;\s*$', '', open(os.path.join(ROOT, 'audio/manifest.js')).read()))
D = json.loads(subprocess.check_output(['node', '-e', "const D=require('./data.js');const C=require('./content.js');Object.assign(D.PHRASES,C.PHRASES);console.log(JSON.stringify(D.PHRASES))"], cwd=ROOT))
jobs = [('w', k, k.replace('-', ' ')) for k in man['w']] + [('p', k, D.get(k, k)) for k in man['p']] + [('ln', k, k) for k in man['ln']] + [('ls', k, k) for k in man['ls']] + [('s', k, '') for k in man['pages']]
def check(j):
    kind, k, text = j
    f = os.path.join(ROOT, 'audio', kind, k + '.mp3')
    if not os.path.exists(f): return (j, 'missing', 0, 0, 0)
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', f, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True)
    a = np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768
    if r.returncode or len(a) == 0: return (j, 'decode', 0, 0, 0)
    dur = len(a) / 16000; peak = float(np.abs(a).max()); rms = float(np.sqrt(np.mean(a ** 2)))
    bad = []
    mind = {'ls': .12, 'ln': .25, 'w': .25, 'p': .5, 's': .8}[kind]
    if dur < mind: bad.append('short')
    if peak < .1: bad.append('quiet-peak')
    if rms < .015: bad.append('low-rms')
    if kind in ('w', 'p') and text:
        letters = len(re.sub(r'[^a-z]', '', text.lower()))
        if dur < .045 * letters and dur < 1.0: bad.append('overtrim?')
    return (j, ','.join(bad), dur, peak, rms)
with ThreadPoolExecutor(16) as ex: res = list(ex.map(check, jobs))
bad = [r for r in res if r[1]]
tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(os.path.join(ROOT, 'audio')) for f in fs)
print('clips', len(res), 'bad', len(bad), 'total MB %.1f' % (tot / 1e6), 'min dur %.2f' % min(r[2] for r in res))
for r in bad: print('BAD', r[0][0], r[0][1], r[1], 'dur %.2f peak %.2f rms %.3f' % r[2:])
sys.exit(1 if bad else 0)
