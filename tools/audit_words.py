#!/usr/bin/env python3
"""Audit every word/phrase clip: exists, non-empty, decodes, has speech energy, and Whisper hears the right word."""
import os, subprocess, json, re, sys, numpy as np
from faster_whisper import WhisperModel
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
man = json.loads(open(os.path.join(ROOT, 'audio/manifest.js')).read().split('=', 1)[1].rstrip(';\n'))
m = WhisperModel('base.en', device='cpu', compute_type='int8')
def dec(p):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-af', 'adelay=300,apad=pad_dur=0.6', '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.float32), r.returncode
norm = lambda s: re.sub(r'[^a-z ]', '', s.lower().replace('-', ' ')).strip()
bad = []; out = {}
keys = sys.argv[1:] or man['w']
for k in keys:
    p = os.path.join(ROOT, 'audio/w', k + '.mp3')
    if not os.path.exists(p) or os.path.getsize(p) < 800: bad.append((k, 'missing/empty')); continue
    a, rc = dec(p)
    if rc or len(a) < 16000 * .9: bad.append((k, 'decode')); continue
    peak = float(np.max(np.abs(a)))
    segs, _ = m.transcribe(a, language='en', beam_size=5, vad_filter=False, initial_prompt='Single words read to a child.')
    t = norm(' '.join(s.text for s in segs)); out[k] = t
    want = norm(k.replace('-', ' '))
    ok = t == want or t.replace(' ', '') == want.replace(' ', '') or (t.rstrip('s') == want.rstrip('s') and len(want) > 3)
    if peak < 0.05: bad.append((k, 'quiet %.3f' % peak))
    elif not ok: bad.append((k, 'heard: ' + t))
print(json.dumps(bad, indent=0)); print('checked', len(keys), 'flagged', len(bad))
