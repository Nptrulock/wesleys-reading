/* Wesley's Reading Adventure — app logic. */
(function () {
'use strict';
const D = window.DATA, M = window.AUDIO_MANIFEST || { w: [], p: [], ln: [], ls: [], pages: {} };
// v3: merge the generated expansion content (content.js) over the hand-written base data
(function applyContent(C) {
  if (!C) return;
  D.RAIN_LEVELS = C.RAIN_LEVELS; D.STORIES = D.STORIES.concat(C.STORIES);
  D.RACE_NOUNS = C.RACE.NOUNS; D.RACE_VERBS = C.RACE.VERBS; D.RACE_ADJS = C.RACE.ADJS; D.RACE_PLACES = C.RACE.PLACES; D.RACE_LEVELS = C.RACE.LEVELS;
  D.ACTIONS = C.ACTIONS; D.ACT_LEVELS = C.ACT_LEVELS; D.ROOMS = C.ROOMS; D.INTER = C.INTER; D.ACTS = C.ACTS; D.DECOR = C.DECOR; D.DIALOG = C.DIALOG;
  D.SOUND_ALIAS = C.SOUND_ALIAS; Object.assign(D.PHRASES, C.PHRASES);
})(window.CONTENT);
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const E = (e) => `<span class="emoji">${e}</span>`;
if (/[?&]simsafe/.test(location.search)) document.documentElement.classList.add('simsafe');

// ================= state =================
const KEY = 'wesReading.v1';
const DEF = { v: 3, stars: 0, points: 0, totalStars: 0, rain: { lv: 6, good: {}, done: 0, unlocked: 6, prog: {}, vi: {} }, story: { read: {}, pages: {}, shelves: 1 },
  race: { lv: 0, good: {}, done: 0, unlocked: 0, prog: {} }, act: { lv: 0, good: 0, done: 0, seen: {}, unlocked: 0, prog: {} }, owned: {}, decor: {}, inter: {}, upper: false, letterSounds: 'auto',
  log: { words: 0, sentences: 0, matches: 0, stories: 0, minutes: 0, firstPlay: 0, lastPlay: 0, misses: 0 }, hard: {} };
let S;
function load() {
  try { S = Object.assign(JSON.parse(JSON.stringify(DEF)), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = JSON.parse(JSON.stringify(DEF)); }
  for (const k of ['rain', 'story', 'race', 'act', 'log']) S[k] = Object.assign(JSON.parse(JSON.stringify(DEF[k])), S[k] || {});
  if (!localStorage.getItem(KEY)) S.v = 3;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
load();
// v3 save migration: stars, gallery items (same room ids + item order) and stories carry over unchanged;
// old level numbers map onto the new, longer level ladders.
function migrate() {
  if ((S.v || 1) >= 3) return;
  const OLD = ['abc', 'cvc', 'sight', 'blend', 'g1', 'g2', 'g3'], MAP = { abc: 'abc1', cvc: 'cvc-a', sight: 'sight-1', blend: 'bl-l', g1: 'sight-5', g2: 'le-a', g3: 'vt-ai' };
  const idx = (k) => Math.max(0, D.RAIN_LEVELS.findIndex(l => l.id === MAP[OLD[Math.max(0, Math.min(6, k | 0))]]));
  S.rain.lv = idx(S.rain.lv); S.rain.unlocked = Math.max(S.rain.lv, idx(S.rain.unlocked), D.RAIN_LEVELS.findIndex(l => l.id === 'cvc-a')); S.rain.good = {}; S.rain.recent = [];
  const RM = [0, 1, 3, 4, 7]; S.race.lv = RM[Math.min(4, S.race.lv | 0)]; S.race.unlocked = Math.max(S.race.lv, RM[Math.min(4, S.race.unlocked | 0)]); S.race.good = {};
  const AM = [0, 2, 3, 4]; S.act.lv = AM[Math.min(3, S.act.lv | 0)]; S.act.unlocked = S.act.lv;
  S.migratedFrom = S.v || 1; S.v = 3; save();
}
migrate();
['rain', 'race', 'act'].forEach(k => { const n = (k === 'rain' ? D.RAIN_LEVELS : k === 'race' ? D.RACE_LEVELS : D.ACT_LEVELS).length - 1; S[k].lv = Math.max(0, Math.min(n, S[k].lv | 0)); S[k].unlocked = Math.min(n, Math.max(S[k].unlocked | 0, S[k].lv)); });

// ================= audio =================
// v2 engine: clips are fetched + decoded once into Web Audio buffers and scheduled back-to-back
// (gapless, no per-clip media-element latency, no Range-request issues). If Web Audio isn't running
// or a clip won't decode, it falls back to one shared <audio> element, then to speechSynthesis.
const SET = { w: new Set(M.w), p: new Set(M.p), ln: new Set(M.ln), ls: new Set(M.ls) };
const AU = window.__AU = { log: [], errors: [], fallbacks: 0, unlocked: false, engine: 'webaudio' };
let voiceEl = null, ctx = null, seqId = 0, voiceGain = null, active = null;
const SOUND_TEXT = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'aw', p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz', sh: 'shh', ch: 'chuh', th: 'th', ck: 'kuh', ng: 'ng', ee: 'ee', oo: 'oo', ll: 'lll', ss: 'sss', ff: 'fff', ai: 'ay', oa: 'oh', igh: 'eye', ar: 'ar', or: 'or', er: 'er', ou: 'ow', oi: 'oy', aw: 'aw' };
function clip(kind, id) {
  if (kind === 'w') { const k = D.slug(id); return { src: SET.w.has(k) ? 'audio/w/' + k + '.mp3' : null, text: id }; }
  if (kind === 'p') return { src: SET.p.has(id) ? 'audio/p/' + id + '.mp3' : null, text: D.PHRASES[id] || id };
  if (kind === 'ln') return { src: SET.ln.has(id) ? 'audio/ln/' + id + '.mp3' : null, text: D.LETTER_NAME_TEXT[id] || id };
  if (kind === 'ls') { const a = (D.SOUND_ALIAS && D.SOUND_ALIAS[id]) || id; return { src: SET.ls.has(a) ? 'audio/ls/' + a + '.mp3' : null, text: SOUND_TEXT[a] || id }; }
  if (kind === 's') return { src: M.pages[id] ? 'audio/s/' + id + '.mp3' : null, text: id };
  return { src: null, text: String(id) };
}
function ensureVoice() {
  if (!voiceEl) { voiceEl = new Audio(); voiceEl.preload = 'auto'; voiceEl.setAttribute('playsinline', ''); voiceEl.setAttribute('webkit-playsinline', ''); voiceEl.playsInline = true; }
  return voiceEl;
}
function audioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); voiceGain = ctx.createGain(); voiceGain.gain.value = 1; voiceGain.connect(ctx.destination); } catch (e) { return null; } }
  if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  return ctx;
}
// tiny silent WAV used to unlock the <audio> element inside the first tap
const SILENT = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';
function unlockAudio() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  audioCtx();
  try { const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch (e) {}
  try { const a = ensureVoice(); a.src = SILENT; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  AU.unlocked = true;
}
// keep Web Audio alive on iOS (it can be suspended after backgrounding / interruptions)
['pointerdown', 'touchend'].forEach(ev => document.addEventListener(ev, () => { if (AU.unlocked) audioCtx(); }, { passive: true, capture: true }));
const BUF = new Map();
function decode(ab) {
  return new Promise((res, rej) => { try { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } });
}
function loadBuf(src) {
  if (!BUF.has(src)) {
    const c = audioCtx();
    BUF.set(src, !c ? Promise.resolve(null) : fetch(src).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(decode).catch(e => { AU.errors.push('decode ' + src + ' ' + e); BUF.delete(src); return null; }));
  }
  return BUF.get(src);
}
function preload(items) { if (!audioCtx()) return; norm(items).forEach(it => { const c = clip(it.k, it.id); if (c.src) loadBuf(c.src); }); }
const timeout = (p, ms) => Promise.race([p, wait(ms).then(() => null)]);
function norm(items) {
  if (!Array.isArray(items[0]) && !(items[0] && items[0].k)) items = [items];
  return items.map(it => Array.isArray(it) ? { k: it[0], id: it[1], on: it[2] } : it);
}
function useWA() { return S.engine !== 'html' && ctx && ctx.state === 'running'; }
function speakFallback(text) {
  return new Promise(res => {
    AU.fallbacks++;
    if (!window.speechSynthesis || !text) return res();
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = .85; u.onend = u.onerror = () => res(); speechSynthesis.speak(u); setTimeout(res, 600 + text.length * 90); } catch (e) { res(); }
  });
}
function playSrc(src, my, onTime) {
  return new Promise(res => {
    const a = ensureVoice(); let done = false, raf = 0;
    const fin = (ok) => { if (done) return; done = true; cancelAnimationFrame(raf); a.onended = a.onerror = null; res(ok); };
    a.onended = () => fin(true); a.onerror = () => { AU.errors.push(src); fin(false); };
    try {
      a.src = src;
      const rec = { src, t: Date.now(), ok: null, html: true }; AU.log.push(rec); if (AU.log.length > 400) AU.log.shift();
      const p = a.play();
      if (p && p.then) p.then(() => { rec.ok = true; }).catch(err => { rec.ok = false; rec.err = String(err && err.name); AU.errors.push(src + ' ' + rec.err); fin(false); });
      else rec.ok = true;
      if (onTime) { const tick = () => { if (done || my !== seqId) return; onTime(a.currentTime * 1000); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); }
      // never stall: if playback hasn't started in 2.5 s give up on this clip; hard cap 12 s
      setTimeout(() => { if (!a.currentTime) fin(false); }, 2500);
      setTimeout(() => fin(true), 12000);
    } catch (e) { AU.errors.push(src + ' ' + e); fin(false); }
  });
}
function stopAll() {
  if (active) { const a = active; active = null; a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); a.timers.forEach(clearTimeout); cancelAnimationFrame(a.raf); a.resolve(false); }
  if (voiceEl) { try { voiceEl.pause(); } catch (e) {} }
  if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {}
}
function playBuffers(list, bufs, my, opt) {
  return new Promise(resolve => {
    const c = ctx, gap = (opt.gap || 0) / 1000; let t = c.currentTime + 0.02;
    const A = { nodes: [], timers: [], raf: 0, resolve }; active = A;
    const timed = [];
    bufs.forEach((b, i) => {
      const it = list[i], s = c.createBufferSource(); s.buffer = b; s.connect(voiceGain); s.start(t); A.nodes.push(s);
      const at = t, src = clip(it.k, it.id).src;
      A.timers.push(setTimeout(() => { if (active !== A) return; AU.log.push({ src, t: Date.now(), ok: true, wa: true }); if (AU.log.length > 400) AU.log.shift(); if (it.on) try { it.on(); } catch (e) {} }, Math.max(0, (at - c.currentTime) * 1000)));
      if (it.time) timed.push([at, b.duration, it.time]);
      t += b.duration + (i < bufs.length - 1 ? gap : 0);
    });
    if (timed.length) { const tick = () => { if (active !== A) return; const now = c.currentTime; timed.forEach(([at, d, fn]) => { if (now >= at && now <= at + d + .3) fn((now - at) * 1000); }); A.raf = requestAnimationFrame(tick); }; A.raf = requestAnimationFrame(tick); }
    A.timers.push(setTimeout(() => { if (active === A) { active = null; resolve(true); } }, (t - c.currentTime) * 1000 + 30));
  });
}
// say([['p','home'], ['w','cat'], {k:'ls',id:'c', on: fn, time: fn(ms)}], {gap}) -> Promise<bool finished>
async function say(items, opt) {
  opt = opt || {};
  const my = ++seqId; stopAll();
  const list = norm(items);
  if (useWA()) {
    const bufs = await timeout(Promise.all(list.map(it => { const c = clip(it.k, it.id); return c.src ? loadBuf(c.src) : null; })), 4000);
    if (my !== seqId) return false;
    if (bufs && bufs.every(Boolean)) { const ok = await playBuffers(list, bufs, my, opt); if (ok && opt.after && my === seqId) try { opt.after(); } catch (e) {} return ok && my === seqId; }
  }
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (my !== seqId) return false;
    if (it.on) try { it.on(); } catch (e) {}
    const c = clip(it.k, it.id);
    let ok = false;
    if (c.src) ok = await playSrc(c.src, my, it.time);
    if (!ok && my === seqId) await speakFallback(c.text);
    if (opt.gap && my === seqId && i < list.length - 1) await wait(opt.gap);
  }
  if (opt.after && my === seqId) try { opt.after(); } catch (e) {}
  return my === seqId;
}
function hush() { seqId++; stopAll(); }
let lastPrompt = null;
function prompt(items) { lastPrompt = items; return say(items); }
// varied recorded dialog: never the same line twice in a row
const lastLine = {};
function line(cat) { const n = (D.DIALOG && D.DIALOG[cat]) || 0; if (!n) return null; let i, k = 0; do { i = rnd(n); } while (i === lastLine[cat] && n > 1 && k++ < 5); lastLine[cat] = i; return ['p', cat + '_' + i]; }
const praise = () => line('praise') || ['p', 'p' + (1 + rnd(10))];
const oops = () => line('encourage') || ['p', 't' + (1 + rnd(4))];
// fetch clips into the offline audio cache (service worker) without decoding them
const WARMED = new Set();
function warm(items) {
  const srcs = norm(items).map(it => clip(it.k, it.id).src).filter(s => s && !WARMED.has(s));
  let i = 0; const step = () => { const b = srcs.slice(i, i + 6); i += 6; if (!b.length) return; b.forEach(s => WARMED.add(s)); Promise.all(b.map(s => fetch(s).catch(() => {}))).then(() => setTimeout(step, 50)); };
  setTimeout(step, 1500);
}
// every [kind, id] the app can speak (used by the audio audit test)
function speakable() {
  const out = [], w = (x) => out.push(['w', x]);
  D.RAIN_LEVELS.forEach(l => l.words.forEach(x => l.mode === 'letter' ? null : w(x.word)));
  D.RACE_LEVELS.forEach(l => l.slots.forEach(s => s[0] === '=' && w(s.slice(1).toLowerCase().replace(/[!?.]/g, ''))));
  D.RACE_VERBS.forEach(v => v.i && w(v.i)); ['and', 'then', 'first', 'dragon'].forEach(w);
  Object.values(D.LETTER_KEY).forEach(([k]) => w(k));
  D.STORIES.forEach(s => { w(s.title); s.pages.forEach((p, i) => { out.push(['s', s.id + '-' + i]); D.tokens(p.t).forEach(t => t.w && w(t.w)); }); });
  D.RACE_NOUNS.forEach(n => { w(n.s); w(n.p); }); D.RACE_VERBS.forEach(v => { w(v.b); w(v.s); }); D.RACE_ADJS.forEach(a => w(a.w)); D.RACE_PLACES.forEach(p => w(p.w));
  ['the', 'The', 'can'].forEach(w);
  D.ACTIONS.forEach(a => w(a.w)); D.ACTION_PHRASES.forEach(p => p.w.split(' ').forEach(w));
  D.ROOMS.forEach(r => { w(r.name); r.items.forEach(it => w(it[0])); });
  Object.keys(D.PHRASES).forEach(k => out.push(['p', k]));
  D.LETTERS.forEach(l => out.push(['ln', l])); D.LETTERS.concat(D.DIGRAPHS, ['ai', 'ay', 'ee', 'ea', 'oa', 'igh', 'oo', 'ar', 'or', 'er', 'ir', 'ur', 'ou', 'ow', 'oi', 'oy', 'aw', 'au', 'wh', 'zz']).forEach(g => out.push(['ls', g]));
  return out;
}

// ---- sound effects (Web Audio synth) ----
function tone(f, t0, dur, type, vol, f2) {
  const c = audioCtx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine';
  const t = c.currentTime + (t0 || 0); o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || .18, t + .015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .05);
}
const SFX = {
  pop() { tone(520, 0, .12, 'sine', .2, 900); },
  tap() { tone(700, 0, .07, 'triangle', .12); },
  boing() { tone(300, 0, .35, 'sine', .16, 140); tone(320, .05, .3, 'triangle', .06, 160); },
  ding() { tone(880, 0, .3, 'sine', .18); tone(1320, .08, .35, 'sine', .1); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .09, .35, 'triangle', .14)); },
  star() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * .07, .3, 'sine', .14)); },
  tada() { [523, 659, 784].forEach((f, i) => tone(f, i * .1, .25, 'square', .07)); tone(1047, .32, .7, 'square', .08); },
  whoosh() { tone(200, 0, .5, 'sawtooth', .05, 1200); },
  vroom() { tone(90, 0, 1.2, 'sawtooth', .09, 260); tone(95, .1, 1.1, 'square', .04, 300); },
  buy() { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * .06, .25, 'triangle', .14)); }
};

// ================= stars & points =================
function addPoints(n, from) {
  S.points += n; let got = 0;
  while (S.points >= 10) { S.points -= 10; S.stars++; S.totalStars++; got++; }
  save(); renderStars();
  if (got) { for (let i = 0; i < got; i++) setTimeout(() => flyStar(from), i * 350); SFX.star(); }
  return got;
}
function renderStars() {
  $$('.starBox').forEach(b => { b.querySelector('.n').textContent = S.stars; const j = b.querySelector('.jar i'); if (j) j.style.width = (S.points * 10) + '%'; });
}
function flyStar(from) {
  const fx = $('#fx'); const s = document.createElement('div'); s.className = 'flyStar emoji'; s.textContent = '⭐';
  const r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const box = $('.screen.show .starBox'); const t = box ? box.getBoundingClientRect() : { left: innerWidth - 80, top: 20, width: 0, height: 0 };
  const x = r.left + r.width / 2 - 30, y = r.top + r.height / 2 - 30;
  s.style.left = x + 'px'; s.style.top = y + 'px';
  s.style.setProperty('--dx', (t.left + 10 - x) + 'px'); s.style.setProperty('--dy', (t.top - y) + 'px');
  fx.appendChild(s); setTimeout(() => { s.remove(); $$('.starBox').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); }, 1100);
}
function burst(el, chars) {
  const r = el.getBoundingClientRect(), fx = $('#fx');
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div'); s.className = 'spark emoji'; s.textContent = pick(chars || ['✨', '⭐', '🌟', '💛']);
    const a = (i / 10) * Math.PI * 2, d = 60 + rnd(60);
    s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px';
    s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
    fx.appendChild(s); setTimeout(() => s.remove(), 950);
  }
}
// ---- actions: Web Animations API (restarts reliably on iOS Safari, works on any element, and
// returns a promise so actions can run one after another) ----
const T = (s) => ({ transform: s });
const TO = (s, o) => ({ transform: s, opacity: o });
const JUMP = [T('translateY(0) scaleY(1)'), { transform: 'translateY(0) scaleY(.8)', offset: .15 }, { transform: 'translateY(-60%) scaleY(1.05)', offset: .5 }, { transform: 'translateY(0) scaleY(.9)', offset: .85 }, T('translateY(0) scaleY(1)')];
const ANIM = {
  jump: [JUMP, 800, 2], jump2: [JUMP, 500, 3],
  spin: [[T('rotate(0deg)'), T('rotate(360deg)')], 1000, 2],
  grow: [[T('scale(1)'), { transform: 'scale(1.9)', offset: .35 }, { transform: 'scale(1.9)', offset: .75 }, T('scale(1)')], 1900, 1],
  shrink: [[T('scale(1)'), { transform: 'scale(.35)', offset: .35 }, { transform: 'scale(.35)', offset: .75 }, T('scale(1)')], 1900, 1],
  hide: [[TO('translateY(0)', 1), { transform: 'translateY(45%)', opacity: 0, offset: .25 }, { transform: 'translateY(45%)', opacity: 0, offset: .75 }, TO('translateY(0)', 1)], 2200, 1],
  zoom: [[TO('translateX(0)', 1), { transform: 'translateX(160%) skewX(-12deg)', opacity: 1, offset: .3 }, { transform: 'translateX(170%)', opacity: 0, offset: .31 }, { transform: 'translateX(-170%)', opacity: 0, offset: .33 }, { transform: 'translateX(-150%) skewX(10deg)', opacity: 1, offset: .36 }, TO('translateX(0)', 1)], 1800, 1],
  sleep: [[T('rotate(0deg) scale(1)'), { transform: 'rotate(-80deg) scale(1)', offset: .2 }, { transform: 'rotate(-80deg) scale(1.07)', offset: .4 }, { transform: 'rotate(-80deg) scale(.97)', offset: .6 }, { transform: 'rotate(-80deg) scale(1)', offset: .8 }, T('rotate(0deg) scale(1)')], 2600, 1],
  shake: [[T('translateX(0)'), T('translateX(-9%)'), T('translateX(9%)'), T('translateX(0)')], 450, 3],
  fly: [[T('translate(0,0) rotate(0deg)'), { transform: 'translate(-35%,-75%) rotate(-10deg)', offset: .3 }, { transform: 'translate(35%,-95%) rotate(10deg)', offset: .65 }, T('translate(0,0) rotate(0deg)')], 2200, 1],
  swim: [[T('translate(0,0) rotate(0deg)'), { transform: 'translate(-40%,10%) rotate(-8deg)', offset: .25 }, { transform: 'translate(0,-5%) rotate(0deg)', offset: .5 }, { transform: 'translate(40%,10%) rotate(8deg)', offset: .75 }, T('translate(0,0) rotate(0deg)')], 2000, 1],
  dance: [[T('rotate(0deg) translateY(0)'), T('rotate(-18deg) translateY(-12%)'), T('rotate(0deg) translateY(0)'), T('rotate(18deg) translateY(-12%)'), T('rotate(0deg) translateY(0)')], 900, 2],
  roll: [[T('translateX(0) rotate(0deg)'), { transform: 'translateX(70%) rotate(360deg)', offset: .5 }, T('translateX(0) rotate(0deg)')], 1900, 1],
  fall: [[TO('translateY(-120%) rotate(0deg)', 0), { transform: 'translateY(-100%) rotate(0deg)', opacity: 1, offset: .1 }, { transform: 'translateY(0) rotate(30deg)', opacity: 1, offset: .7 }, { transform: 'translateY(-12%) rotate(20deg)', opacity: 1, offset: .8 }, TO('translateY(0) rotate(0deg)', 1)], 1600, 1],
  flip: [[T('translateY(0) rotate(0deg)'), T('translateY(-50%) rotate(180deg)'), T('translateY(0) rotate(360deg)')], 1100, 2],
  wiggle: [[T('rotate(0deg)'), T('rotate(-12deg)'), T('rotate(12deg)'), T('rotate(0deg)')], 400, 4],
  sing: [[T('scale(1) rotate(0deg)'), T('scale(1.12) rotate(-6deg)'), T('scale(1) rotate(0deg)')], 600, 3],
  wave: [[T('rotate(0deg)'), T('rotate(-25deg)'), T('rotate(0deg)')], 500, 4],
  // v3 gallery actions
  launch: [[TO('translateY(0) rotate(0deg)', 1), { transform: 'translateY(4%) rotate(-3deg)', opacity: 1, offset: .12 }, { transform: 'translateY(-4%) rotate(3deg)', opacity: 1, offset: .22 }, { transform: 'translateY(-420%) rotate(0deg)', opacity: 1, offset: .5 }, { transform: 'translateY(-440%)', opacity: 0, offset: .52 }, { transform: 'translateY(160%)', opacity: 0, offset: .6 }, { transform: 'translateY(0)', opacity: 1, offset: .85 }, TO('translateY(0) rotate(0deg)', 1)], 2600, 1],
  roll2: [[T('translateX(0) scaleX(1)'), { transform: 'translateX(90%) scaleX(1)', offset: .3 }, { transform: 'translateX(90%) scaleX(-1)', offset: .35 }, { transform: 'translateX(-90%) scaleX(-1)', offset: .7 }, { transform: 'translateX(-90%) scaleX(1)', offset: .75 }, T('translateX(0) scaleX(1)')], 2200, 1],
  glow: [[{ transform: 'scale(1)', filter: 'brightness(1) drop-shadow(0 0 0 rgba(255,235,59,0))' }, { transform: 'scale(1.15)', filter: 'brightness(1.5) drop-shadow(0 0 3vmin rgba(255,235,59,1))', offset: .3 }, { transform: 'scale(1.1)', filter: 'brightness(1.4) drop-shadow(0 0 4vmin rgba(255,235,59,.9))', offset: .7 }, { transform: 'scale(1)', filter: 'brightness(1) drop-shadow(0 0 0 rgba(255,235,59,0))' }], 1800, 1],
  twinkleA: [[{ transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' }, { transform: 'scale(1.25) rotate(-10deg)', filter: 'brightness(1.6)' }, { transform: 'scale(1) rotate(10deg)', filter: 'brightness(1.1)' }, { transform: 'scale(1.2) rotate(0deg)', filter: 'brightness(1.6)' }, { transform: 'scale(1) rotate(0deg)', filter: 'brightness(1)' }], 1600, 1],
  roar: [[T('scale(1) translateX(0)'), { transform: 'scale(1.35) translateX(0)', offset: .25 }, { transform: 'scale(1.35) translateX(-5%)', offset: .4 }, { transform: 'scale(1.35) translateX(5%)', offset: .55 }, { transform: 'scale(1.35) translateX(-5%)', offset: .7 }, T('scale(1) translateX(0)')], 1500, 1],
  bob1: [[T('translateY(0)'), T('translateY(-18%)'), T('translateY(0)'), T('translateY(-12%)'), T('translateY(0)')], 1100, 1]
};
const DECO = { roar: ['💥'], launch: ['🔥', '💨'], sleep: ['💤', '💤'], sing: ['🎵', '🎶'], dance: ['🎶'], fly: ['💨'], swim: ['💧'], zoom: ['💨'], grow: ['✨'], jump: ['⭐'], fall: ['💥'], spin: ['🌀'], wave: ['👋'] };
window.__animLog = [];
function anim(el, a, decoHost) {
  if (!el || !ANIM[a]) return Promise.resolve();
  let inner = el.firstElementChild && el.firstElementChild.tagName === 'SPAN' ? el.firstElementChild : el;
  // transforms are ignored on display:inline elements (emoji spans) - force inline-block
  if (getComputedStyle(inner).display === 'inline') inner.style.display = 'inline-block';
  const [k, d, n] = ANIM[a];
  if (inner._anim) { try { inner._anim.cancel(); } catch (e) {} }
  const rec = { a, start: performance.now(), end: 0 }; window.__animLog.push(rec);
  const host = decoHost || el.parentElement;
  if (DECO[a] && host) DECO[a].forEach((dch, i) => setTimeout(() => {
    const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
    const s = document.createElement('div'); s.className = 'deco emoji'; s.textContent = dch;
    s.style.left = (r.left - h.left + r.width * .7) + 'px'; s.style.top = (r.top - h.top) + 'px'; host.appendChild(s); setTimeout(() => s.remove(), 1700);
  }, i * 500));
  if (a === 'hide' && host) { const b = document.createElement('div'); b.className = 'bush emoji'; b.textContent = '🌳'; const r = el.getBoundingClientRect(), h = host.getBoundingClientRect(); b.style.left = (r.left - h.left + r.width / 2) + 'px'; b.style.top = (r.top - h.top + r.height * .6) + 'px'; host.appendChild(b); setTimeout(() => b.remove(), d); }
  if (inner.animate) {
    const an = inner.animate(k, { duration: d, iterations: n, easing: 'ease-in-out' }); inner._anim = an;
    const done = an.finished ? an.finished.catch(() => {}) : wait(d * n);
    return Promise.race([done, wait(d * n + 300)]).then(() => { rec.end = performance.now(); });
  }
  inner.className = inner.className.replace(/\ba-\S+/g, '').trim(); void inner.offsetWidth; inner.classList.add('a-' + a);
  return wait(d * n).then(() => { rec.end = performance.now(); });
}

// ================= screens =================
let cleanup = null;
function show(id, html, after) {
  hush(); if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
  $$('.overlay').forEach(o => o.remove());
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('div'); el.id = id; el.className = 'screen'; $('#app').appendChild(el); }
  if (html != null) el.innerHTML = html;
  $$('.screen').forEach(s => s.classList.toggle('show', s === el));
  document.body.classList.toggle('upper', !!S.upper);
  renderStars(); if (after) after(el); return el;
}
function topBar(title, opts) {
  opts = opts || {};
  return `<div class="top"><button class="iconBtn" data-go="${opts.back || 'home'}" aria-label="Home">${E(opts.backIcon || '🏠')}</button>
  <button class="iconBtn" data-again aria-label="Say it again">${E('🔊')}</button>
  <div class="sp">${title || ''}</div>
  <div class="starBox">${'<span class="st emoji">⭐</span>'}<span class="n">${S.stars}</span><span class="jar"><i></i></span></div></div>`;
}
function overlay(html, cls) {
  const o = document.createElement('div'); o.className = 'overlay'; o.innerHTML = `<div class="card ${cls || ''}">${html}</div>`;
  document.body.appendChild(o); return o;
}
document.addEventListener('click', (ev) => {
  const g = ev.target.closest('[data-go]'); if (g) { SFX.tap(); go(g.dataset.go); return; }
  if (ev.target.closest('[data-again]')) { SFX.tap(); if (lastPrompt) say(lastPrompt); }
});
function go(where) {
  ({ home, rain: rainMap, story: shelf, race: raceMap, action: actionHome, gallery }[where] || home)();
}

// ================= start & home =================
function start() {
  const btn = $('#startBtn');
  const tick = () => { S.log.lastPlay = Date.now(); if (!S.log.firstPlay) S.log.firstPlay = Date.now(); save(); };
  btn.addEventListener('click', () => {
    unlockAudio();
    // play greeting synchronously inside the tap (this is what unlocks the <audio> element on iOS)
    home(true); SFX.chime(); tick();
    lastPrompt = ['p', 'home'];
    say([line('welcome') || ['p', 'welcome'], ['p', 'home']]);
  });
  setInterval(() => { if (document.visibilityState === 'visible' && AU.unlocked) { S.log.minutes++; save(); } }, 60000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    // a new build took over: reload right away if he hasn't started yet, otherwise offer a tap-to-update banner
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      if ($('#start.show')) { reloading = true; location.reload(); return; }
      if ($('.updBanner')) return;
      const b = document.createElement('button'); b.className = 'updBanner'; b.innerHTML = '✨ New version — tap to update';
      b.onclick = () => { reloading = true; location.reload(); }; document.body.appendChild(b);
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      $('#loadNote').textContent = 'Works offline once loaded · build ' + (window.APP_BUILD || '?');
      const check = () => { try { reg.update(); } catch (e) {} };
      check(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      setInterval(check, 30 * 60000);
    }).catch(() => {});
  }
}
function home(fromStart) {
  show('home', topBar('') + `
  <div class="tiles">
    <button class="tile rain" data-mode="rain">${'<span class="big emoji">🔤</span>'}<span>Letter Rain</span><span class="badge">${D.RAIN_LEVELS[S.rain.lv].icon}</span></button>
    <button class="tile story" data-mode="story"><span class="big emoji">📖</span><span>Story Time</span></button>
    <button class="tile race" data-mode="race"><span class="big emoji">🏎️</span><span>Word Race</span></button>
    <button class="tile action" data-mode="action"><span class="big emoji">🤸</span><span>Action Words</span></button>
    <button class="tile gallery" data-mode="gallery"><span class="big emoji">🏰</span><span>Star Gallery</span><span class="badge">⭐ ${S.stars}</span></button>
  </div>
  <button class="parentKey" aria-label="Grown-ups: press and hold"><span class="ring"></span>⚙️</button>`, (el) => {
    $('.top [data-go]', el).style.visibility = 'hidden';
    $$('.tile', el).forEach(t => t.addEventListener('click', () => {
      SFX.pop(); const m = t.dataset.mode; go(m);
    }));
    parentKey($('.parentKey', el));
  });
  if (!fromStart) prompt(['p', 'home']);
}

// ================= parent area =================
function parentKey(btn) {
  let tm = null;
  const down = (e) => { e.preventDefault(); btn.classList.add('hold'); tm = setTimeout(() => { btn.classList.remove('hold'); mathGate(); }, 1600); };
  const up = () => { btn.classList.remove('hold'); clearTimeout(tm); };
  btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointerleave', up); btn.addEventListener('pointercancel', up);
}
function mathGate() {
  hush(); const a = 3 + rnd(7), b = 4 + rnd(6), ans = String(a * b); let typed = '';
  const o = overlay(`<div class="gate"><h2>Grown-ups only</h2><div>What is ${a} × ${b}?</div><div class="ans">&nbsp;</div>
    <div class="keys">${[1,2,3,4,5,6,7,8,9,'✖',0,'✔'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div></div>`);
  o.addEventListener('click', (e) => {
    if (e.target === o) return o.remove();
    const k = e.target.closest('[data-k]'); if (!k) return; const v = k.dataset.k;
    if (v === '✖') { o.remove(); return; }
    if (v === '✔') { if (typed === ans) { o.remove(); parentPanel(); } else { typed = ''; $('.ans', o).textContent = 'Try again'; } return; }
    typed = (typed + v).slice(0, 3); $('.ans', o).textContent = typed;
  });
}
function parentPanel() {
  const L = S.log, st = (n, l) => `<div class="stat"><b>${n}</b>${l}</div>`;
  const owned = Object.values(S.owned).reduce((a, b) => a + b.length, 0);
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map((o, i) => `<option value="${i}" ${i === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const hard = Object.entries(S.hard).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, n]) => `${esc(w)} (${n})`).join(', ') || 'none yet';
  const o = overlay(`<h2>Parent area</h2>
  <div class="grid">${st(S.stars, 'stars to spend')}${st(S.totalStars, 'stars earned in total')}${st(L.words, 'words spelled')}${st(L.sentences, 'sentences built')}
  ${st(Object.keys(S.story.read).length + ' / ' + D.STORIES.length, 'stories finished')}${st(L.matches, 'action words matched')}${st(owned, 'gallery items')}${st(L.minutes, 'minutes played')}</div>
  <h3>Trickiest words</h3><div class="note">${hard}</div>
  <h3>Levels</h3>
  <h3>Levels</h3><div class="note">Choosing a level here also unlocks it and every level before it. Stars: ★ = a third of the level's practice goal; ★★★ = mastered (from level 9 this also needs practice on 2–3 different days).</div>
  <label>Letter Rain ${sel('pRain', D.RAIN_LEVELS.map((l, i) => `${i + 1}. ${l.name} ${'★'.repeat(rainStars(i))}${i > S.rain.unlocked ? ' 🔒' : ''}`), S.rain.lv)}</label>
  <label>Word Race ${sel('pRace', D.RACE_LEVELS.map((l, i) => `${i + 1}. ${l.name} — ${l.example} ${'★'.repeat(raceStars(i))}${i > S.race.unlocked ? ' 🔒' : ''}`), S.race.lv)}</label>
  <label>Action Words ${sel('pAct', D.ACT_LEVELS.map((l, i) => `${i + 1}. ${l.name} ${'★'.repeat(actStars(i))}${i > S.act.unlocked ? ' 🔒' : ''}`), S.act.lv)}</label>
  <label><input type="checkbox" id="pUpper" ${S.upper ? 'checked' : ''}> Show CAPITAL letters (lowercase is the default)</label>
  <label>Letter Rain says ${sel('pSnd', ['letter sounds for decodable words, names for others (default)', 'always letter sounds', 'always letter names'], ['auto', 'sounds', 'names'].indexOf(S.letterSounds))}</label>
  <label>Voice player ${sel('pEng', ['Web Audio — smooth, gapless (default)', 'HTML audio — use if the iPad is on silent and you hear nothing'], S.engine === 'html' ? 1 : 0)}</label>
  <h3>Sound check</h3><button class="pbtn" id="pTest">▶ Play a test word</button> <span id="pTestRes" class="note"></span>
  <h3>Offline</h3><div class="note">Sounds are saved for offline use as Wesley plays each level, story and room. To save all ${speakable().length} sounds now (about 25 MB), tap below on Wi-Fi.</div><button class="pbtn" id="pDl">⬇ Save all sounds for offline</button> <span id="pDlRes" class="note"></span>
  <div class="note">App build ${window.APP_BUILD || '?'}. Audio engine now: ${useWA() ? 'Web Audio' : 'HTML audio'} (context ${ctx ? ctx.state : 'none'}). Voice clips are recorded MP3s (${M.voice || 'neural voice'}). Played: ${AU.log.length}, failed: ${AU.errors.length}, robot-voice fallback used: ${AU.fallbacks}. If you hear nothing, check the iPad volume and that the side switch is not on silent.</div>
  <h3>Stars & reset</h3>
  <button class="pbtn" id="pGift">+10 stars</button> <button class="pbtn danger" id="pReset">Reset all progress</button>
  <div class="row"><button class="pbtn" id="pClose">Done</button></div>`, 'parent');
  $('#pTest', o).onclick = () => { const n0 = AU.errors.length; say(['w', 'dragon']).then(() => { const last = AU.log[AU.log.length - 1]; $('#pTestRes', o).textContent = (AU.errors.length === n0 && last && last.ok) ? 'MP3 played OK' : 'Clip failed: ' + (AU.errors.slice(-1)[0] || '?'); }); };
  $('#pDl', o).onclick = async () => {
    const b = $('#pDl', o), r = $('#pDlRes', o); b.disabled = true;
    const srcs = [...new Set(speakable().map(([k, id]) => clip(k, id).src).filter(Boolean))]; let done = 0, bad = 0;
    for (let i = 0; i < srcs.length; i += 12) {
      await Promise.all(srcs.slice(i, i + 12).map(src => fetch(src).then(x => { if (!x.ok) bad++; }).catch(() => { bad++; })));
      done = Math.min(srcs.length, i + 12); r.textContent = `${done} / ${srcs.length}` + (bad ? ` (${bad} failed)` : '');
    }
    r.textContent = bad ? `Saved ${srcs.length - bad} of ${srcs.length}. Try again on Wi-Fi.` : `All ${srcs.length} sounds saved ✓`; b.disabled = false;
  };
  $('#pGift', o).onclick = () => { S.stars += 10; S.totalStars += 10; save(); renderStars(); $('#pGift', o).textContent = '+10 stars ✓'; };
  $('#pReset', o).onclick = () => { if (confirm('Erase all of Wesley\'s stars, rooms and levels?')) { localStorage.removeItem(KEY); load(); save(); o.remove(); home(); } };
  $('#pClose', o).onclick = () => {
    S.rain.lv = +$('#pRain', o).value; S.rain.unlocked = Math.max(S.rain.unlocked, S.rain.lv);
    S.race.lv = +$('#pRace', o).value; S.race.unlocked = Math.max(S.race.unlocked, S.race.lv);
    S.act.lv = +$('#pAct', o).value; S.act.unlocked = Math.max(S.act.unlocked, S.act.lv); S.upper = $('#pUpper', o).checked; S.letterSounds = ['auto', 'sounds', 'names'][+$('#pSnd', o).value]; S.engine = +$('#pEng', o).value ? 'html' : 'webaudio';
    save(); o.remove(); home();
  };
}

// ================= round done / level up / next =================
function nextBtn(el, fn, label) {
  const b = document.createElement('button'); b.className = 'nextBtn'; b.setAttribute('aria-label', label || 'Next');
  b.innerHTML = `${E('⏭️')}<span>Next</span>`; el.appendChild(b);
  b.addEventListener('click', () => { SFX.whoosh(); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); fn(); say(['p', 'next']); });
  return b;
}
function roundDone(again, extra) {
  extra = extra || {};
  SFX.tada();
  const hasNext = !!extra.nextLevel, hasStars = extra.stars != null;
  const starsRow = hasStars ? `<div class="lvStars">${[0, 1, 2].map(k => `<span class="emoji ${k < extra.stars ? 'on' : ''} ${k >= (extra.starsBefore || 0) && k < extra.stars ? 'new' : ''}">⭐</span>`).join('')}</div>
    <div class="lvBar"><i style="width:${Math.round((extra.pct || 0) * 100)}%"></i></div>${extra.waitDays ? `<div class="lvNote">${E('🌙')} ${E('➡️')} ${E('☀️')}</div>` : ''}` : '';
  const o = overlay(`<div class="huge emoji">${extra.levelUp ? '🏆' : '🌟'}</div><h2>${extra.levelUp ? 'New level!' : 'You did it!'}</h2>${starsRow}
  <div class="row"><button class="navBtn go" data-a="more" aria-label="Play more">${E('🔁')}</button>${hasNext ? `<button class="navBtn next" data-a="next" aria-label="Next level">${E('⏭️')}</button>` : ''}<button class="navBtn" data-a="home" aria-label="Home">${E('🏠')}</button></div>`);
  burst($('.huge', o));
  const items = extra.levelUp ? [line('levelup') || ['p', 'new_level']] : [praise(), line('round') || ['p', 'round_done']];
  if (!extra.levelUp && hasStars && extra.stars > (extra.starsBefore || 0)) items.push(['p', 'stars_level']);
  if (extra.waitDays) items.push(['p', 'more_days']);
  else if (!extra.levelUp && hasStars && extra.stars < 3) { const p = extra.pct || 0; items.push(['p', 'progress_' + (p >= .8 ? 6 : p >= .4 && p < .6 ? 5 : pick([0, 1, 4, 7]))]); }
  lastPrompt = items; say(items);
  $$('.lvStars .new', o).forEach((s, k) => setTimeout(() => { s.classList.add('pop'); SFX.star(); }, 500 + k * 400));
  o.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; SFX.tap(); o.remove();
    if (b.dataset.a === 'more') again(); else if (b.dataset.a === 'next') { extra.nextLevel(); say(['p', 'next_level']); } else home();
  });
}
function levelMap(id, title, levels, cur, unlocked, onPick, bg) {
  show(id, topBar(title) + `<div class="levelMap">${levels.map((l, i) => `<button class="lvBtn ${i > unlocked ? 'locked' : ''} ${i === cur ? 'cur' : ''}" data-i="${i}" style="background:${l.color || bg}">
    <span class="num">${i + 1}</span><span class="big emoji">${i > unlocked ? '🔒' : l.icon}</span><span class="nm">${esc(l.name)}</span>${i <= unlocked && l.stars != null ? `<span class="stars">${[0, 1, 2].map(k => `<i class="${k < l.stars ? 'on' : ''}">★</i>`).join('')}</span>` : ''}</button>`).join('')}</div>`, (el) => {
    $$('.lvBtn', el).forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i; if (i > unlocked) { SFX.boing(); anim(b, 'shake'); say(['p', 'level_locked']); return; }
      SFX.pop(); onPick(i);
    }));
    const c = $('.lvBtn.cur', el); if (c && c.scrollIntoView) try { c.scrollIntoView({ block: 'center' }); } catch (e) {}
  });
}

// ================= LETTER RAIN =================
// v3: 64 levels in a phonics scope & sequence. Each round is one "try" (variant): spell, missing letter,
// first/last/middle sound, rhyme, word hunt, find the letter, big & little letters. Mastery is slow on
// purpose: points per clean answer, a per-level goal, and (from level 9) practice on 2-3 different days.
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function progOf(bucket, id) { const p = bucket[id] || (bucket[id] = { pts: 0, rounds: 0, days: [] }); return p; }
function levelStars(p, need, days) { if (!p) return 0; if (p.pts >= need && p.days.length >= days) return 3; if (p.pts >= need * 2 / 3) return 2; if (p.pts >= need / 3) return 1; return 0; }
function rainStars(i) { const l = D.RAIN_LEVELS[i]; return levelStars(S.rain.prog[l.id], l.need, l.days); }
function rainMap() {
  levelMap('rainMap', 'Letter Rain', D.RAIN_LEVELS.map((l, i) => Object.assign({}, l, { stars: rainStars(i) })), S.rain.lv, S.rain.unlocked, (i) => { S.rain.lv = i; save(); rainPlay(); });
  prompt([['p', 'm_rain'], ['p', 'pick_level']]);
}
function graphemes(w, lv) { return lv.mode === 'sound' && w.g ? w.g.split('-') : w.word.split(''); }
function rainVoiceMode(lv, w) {
  if (S.letterSounds === 'sounds') return 'sound'; if (S.letterSounds === 'names') return 'name';
  if (lv.mode === 'letter') return 'sound';
  return lv.mode === 'sound' && !w.sight ? 'sound' : 'name';
}
// look-alike / sound-alike letters used as tricky distractors
const CONFUSE = { b: 'dpq', d: 'bpq', p: 'qbd', q: 'pgd', m: 'nw', n: 'mhu', u: 'nvw', i: 'lj', l: 'it', t: 'fl', f: 'tv', e: 'ao', a: 'eo', o: 'ac', c: 'oe', s: 'zc', z: 's', v: 'fw', w: 'vm', g: 'qj', j: 'gi', h: 'nb', k: 'cx', r: 'n', x: 'k', y: 'v',
  sh: ['ch', 'th', 's'], ch: ['sh', 'th'], th: ['sh', 'ch', 'f'], ck: ['c', 'k'], ng: ['n', 'g'], wh: ['w', 'th'], ee: ['ea', 'oo', 'e'], ea: ['ee', 'e'], oo: ['ee', 'o'], ll: ['l'], ss: ['s'], ff: ['f'], zz: ['z'],
  ai: ['ay', 'a'], ay: ['ai', 'a'], oa: ['ow', 'o'], igh: ['i', 'ee'], ar: ['or', 'a'], or: ['ar', 'o'], er: ['ir', 'ur'], ir: ['er', 'ur'], ur: ['er', 'ir'], ou: ['ow', 'oo'], ow: ['ou', 'oa'], oi: ['oy', 'o'], oy: ['oi', 'y'], aw: ['au', 'a'], au: ['aw', 'a'] };
const VAR_TRY = { missing: 0, missing2: 0, rhyme: 1, wordfind: 2, spell: 3, begin: 4, end: 4, middle: 4, find: 4, case: 5 };
// difficulty rises smoothly with the level number
function rainCfg(i) {
  const d = i / Math.max(1, D.RAIN_LEVELS.length - 1);
  return { maxT: 6 + Math.round(d * 4), every: 3 + Math.round(d * 4), conf: .3 + .3 * d, wordP: .3, fall: 10000 - 3600 * d, spawn: 1300 - 420 * d };
}
function itemScore(m) { return m === 0 ? 1 : m === 1 ? .6 : .3; }
function rainPlay() {
  const lvIdx = S.rain.lv, lv = D.RAIN_LEVELS[lvIdx], cfg = rainCfg(lvIdx), prog = progOf(S.rain.prog, lv.id);
  const vi = S.rain.vi[lv.id] = (S.rain.vi[lv.id] || 0); S.rain.vi[lv.id] = vi + 1;
  const variant = lv.variants[vi % lv.variants.length];
  const N = 6;
  const recent = S.rain.recent || [];
  const pool = shuffle(lv.words.filter(w => !recent.includes(w.word)));
  const fit = (w) => variant !== 'middle' || graphemes(w, lv).length >= 3;
  let picks = (pool.filter(fit).length >= N ? pool.filter(fit) : shuffle(lv.words.filter(fit).length >= N ? lv.words.filter(fit) : lv.words)).slice(0, N);
  const tricky = lv.words.filter(w => (S.hard[w.word] || 0) > 0 && !picks.includes(w));
  if (tricky.length) picks[N - 2] = pick(tricky);
  S.rain.recent = recent.concat(picks.map(w => w.word)).slice(-Math.min(18, Math.max(0, lv.words.length - N))); save();
  let items = picks.map(w => ({ w, lv, v: variant }));
  // spaced review: one item from an earlier level (spelled, in that level's own mode)
  if (lvIdx > 1 && lv.mode !== 'letter') {
    const prev = D.RAIN_LEVELS.slice(0, lvIdx).filter(l => l.mode !== 'letter');
    if (prev.length) { const pl = pick(prev); items[N - 1] = { w: pick(pl.words), lv: pl, v: 'spell', review: true }; }
  }
  let wi = 0, it, cur, gs, need = [], ni = 0, misses = 0, tiles = [], raf = 0, last = 0, spawnT = 0, idleT = 0, alive = true, busy = false;
  let spawnN = 0, needAt = 0, earned = 0;
  const el = show('rain', topBar(`${E(lv.icon)} ${esc(lv.name)}`, { back: 'rain', backIcon: '⬅️' }) + `<div class="rainHead"><div class="rainPic emoji"></div><div class="slots"></div><div class="rainProg"><span class="emoji">${'⭐'.repeat(rainStars(lvIdx)) || '☆'}</span><span class="bar"><i></i></span></div></div><div class="field"></div>`);
  const field = $('.field', el), slotsEl = $('.slots', el), picEl = $('.rainPic', el), progBar = $('.rainProg i', el);
  const showProg = () => { progBar.style.width = Math.min(100, prog.pts / lv.need * 100) + '%'; };
  showProg();
  warm(lv.words.filter(() => lv.mode !== 'letter').map(w => ['w', w.word]).concat(lv.mode === 'letter' ? lv.words.flatMap(w => [['ls', w.word], ['ln', w.word]]) : []));
  cleanup = () => { alive = false; cancelAnimationFrame(raf); };
  const ts = () => Math.max(60, Math.min(field.clientWidth / 6.5, field.clientHeight / 4.4, 116));
  const isWordV = () => it.v === 'rhyme' || it.v === 'wordfind';
  function gItems(g, mode) {
    if (isWordV()) return [['w', g]];
    if (it.lv.mode === 'letter') return [['ls', g]];
    return mode === 'sound' ? [['ls', g]] : g.split('').map(c => ['ln', c]);
  }
  const mode = () => rainVoiceMode(it.lv, cur);
  function scheduleNeed() { needAt = spawnN + 2 + rnd(Math.max(1, cfg.every - 1)); } // never the very next tile
  function rhymes(a, b) { return a.word !== b && lv.words.some(x => x.word === b && x.r === a.r); }
  function isNeed(g) { if (it.v === 'rhyme') return rhymes(cur, g); return g === need[ni]; }
  function nextWord() {
    if (!alive) return;
    if (wi >= items.length) return finish();
    it = items[wi++]; cur = it.w; misses = 0; idleT = 0; busy = false; ni = 0;
    tiles.forEach(t => t.el.remove()); tiles = [];
    const v = it.v, lm = it.lv.mode;
    picEl.classList.remove('caseBig', 'listen');
    let filled = [];
    if (lm === 'letter') {
      gs = [cur.word]; need = [cur.word];
      if (v === 'case') { picEl.textContent = cur.word.toUpperCase(); picEl.classList.add('caseBig'); }
      else picEl.textContent = (D.LETTER_KEY[cur.word] || ['', '🔤'])[1];
    } else if (v === 'rhyme') {
      gs = [cur.word, '?']; need = ['*']; filled = [0]; picEl.textContent = cur.pic;
      if (!lv.words.some(x => x !== cur && x.r === cur.r)) { it.v = 'spell'; return nextWordSame(); }
    } else if (v === 'wordfind') {
      gs = [cur.word]; need = [cur.word]; picEl.textContent = '🔊'; picEl.classList.add('listen');
    } else {
      gs = graphemes(cur, it.lv); picEl.textContent = cur.pic;
      let blanks = gs.map((_, i) => i);
      if (v === 'missing') blanks = [rnd(gs.length)];
      else if (v === 'missing2') { const a = shuffle(blanks).slice(0, Math.min(2, gs.length - 1)).sort((x, y) => x - y); blanks = a.length ? a : [0]; }
      else if (v === 'begin') blanks = [0];
      else if (v === 'end') blanks = [gs.length - 1];
      else if (v === 'middle') blanks = [gs.length >= 3 ? Math.floor(gs.length / 2) : 0];
      filled = gs.map((_, i) => i).filter(i => !blanks.includes(i));
      need = blanks.map(i => gs[i]); it.blanks = blanks;
    }
    if (picEl.textContent === '🔊') picEl.classList.add('listen');
    slotsEl.classList.toggle('long', gs.join('').length > 6); slotsEl.classList.toggle('words', isWordV());
    const hideGuide = v !== 'spell' || lvIdx >= 28 || it.review;
    slotsEl.innerHTML = gs.map((g, i) => `<div class="slot lt ${filled.includes(i) ? 'on pre' : hideGuide ? 'blank' : ''}">${g === '?' ? '' : esc(S.upper && !isWordV() ? g.toUpperCase() : g)}</div>`).join('');
    markNext();
    spawnN = 0; scheduleNeed(); spawnT = cfg.spawn - 300;
    const intro = wi === 1 ? [['p', 'tries_' + (VAR_TRY[v] || 0)]] : [];
    let seq;
    if (lm === 'letter') seq = v === 'case' ? [['p', 'v_case_0'], ['ln', cur.word]] : [['p', 'v_find_' + rnd(2)], ['ls', cur.word], ['ln', cur.word], ['w', D.LETTER_KEY[cur.word][0]]];
    else if (it.review) seq = [['p', 'review'], ['p', 'v_spell_0'], ['w', cur.word]];
    else seq = [['p', 'v_' + (v === 'missing2' ? 'missing' : v) + '_' + rnd(2)], ['w', cur.word]];
    prompt(intro.concat(seq));
    preload(need.filter(g => g !== '*').flatMap(g => gItems(g, mode())).concat([['w', cur.word], ['p', 'you_spelled']]));
  }
  function nextWordSame() { wi--; items[wi].v = 'spell'; nextWord(); }
  function slotIndex() { return isWordV() ? (it.v === 'rhyme' ? 1 : 0) : (it.blanks ? it.blanks[ni] : ni); }
  function markNext() { $$('.slot', slotsEl).forEach((s, i) => s.classList.toggle('next', i === slotIndex() && ni < need.length)); }
  picEl.addEventListener('click', () => { if (busy) return; SFX.tap(); it.lv.mode === 'letter' ? say([['ls', cur.word], ['w', D.LETTER_KEY[cur.word][0]]]) : say(['w', cur.word]); });
  function distractor() {
    const r = Math.random();
    if (isWordV()) {
      const opts = it.v === 'rhyme' ? lv.words.filter(x => x.r !== cur.r).map(x => x.word) : lv.words.map(x => x.word).filter(x => x !== cur.word);
      // look-alike words (same first letter or same length) make the hunt trickier
      const close = opts.filter(x => x[0] === cur.word[0] || x.length === cur.word.length);
      return close.length && r < cfg.conf ? pick(close) : pick(opts.length ? opts : ['the']);
    }
    const nd = need[ni], conf = CONFUSE[nd];
    let g = null;
    if (conf && r < cfg.conf) g = pick(Array.isArray(conf) ? conf : conf.split(''));
    else if (r < cfg.conf + cfg.wordP) { const others = gs.filter(x => x !== nd); if (others.length) g = pick(others); }
    if (!g) {
      const multi = it.lv.mode === 'sound' && gs.some(x => x.length > 1);
      const opts = multi ? D.LETTERS.concat(['sh', 'ch', 'th', 'ck', 'ng']) : D.LETTERS;
      do { g = pick(opts); } while (g === nd);
    }
    return g === nd ? pick(D.LETTERS.filter(x => x !== nd)) : g;
  }
  function needTile() { if (it.v === 'rhyme') return pick(lv.words.filter(x => x !== cur && x.r === cur.r)).word; return need[ni]; }
  function spawn() {
    const T = ts();
    const neededOnScreen = tiles.some(t => isNeed(t.g) && !t.gone && t.y < field.clientHeight * .75);
    spawnN++;
    let g;
    if (spawnN >= needAt || (!neededOnScreen && spawnN - needAt >= 0)) { g = needTile(); scheduleNeed(); }
    else if (!neededOnScreen && spawnN > cfg.every + 1) { g = needTile(); scheduleNeed(); }
    else g = distractor();
    const wordT = isWordV();
    const TW = wordT ? Math.min(field.clientWidth * .42, Math.max(T * 1.3, g.length * T * .42 + T * .4)) : T;
    const W = field.clientWidth; const lanes = Math.max(2, Math.floor(W / (TW * 1.15)));
    const used = tiles.filter(t => !t.gone && t.y < T * 1.6).map(t => t.lane); let lane = rnd(lanes), tries = 0;
    while (used.includes(lane) && tries++ < 10) lane = rnd(lanes);
    const x = (lane + .5) * (W / lanes) - TW / 2 + (rnd(16) - 8);
    const d = document.createElement('button'); d.className = 'tileL lt c' + rnd(5) + (wordT ? ' wordT' : ''); d.style.setProperty('--ts', T + 'px'); if (wordT) d.style.width = TW + 'px';
    const shown = it.v === 'case' || wordT || !S.upper ? g : g.toUpperCase();
    d.innerHTML = `<span>${esc(shown)}</span>`; field.appendChild(d);
    const t = { el: d, g, x: Math.max(4, Math.min(W - TW - 4, x)), y: -T, lane, gone: false, speed: (field.clientHeight + T) / cfg.fall * (0.85 + Math.random() * .3) };
    d.style.transform = `translate(${t.x}px, ${t.y}px)`;
    d.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(t); });
    tiles.push(t);
  }
  function hit(t) {
    if (t.gone || busy) return; idleT = 0;
    const m = mode();
    if (isNeed(t.g)) {
      t.gone = true; SFX.pop();
      const slot = slotsEl.children[slotIndex()]; const r = slot.getBoundingClientRect(), f = field.getBoundingClientRect();
      t.el.classList.add('got'); t.el.style.transform = `translate(${r.left - f.left}px, ${r.top - f.top}px) scale(.4)`;
      setTimeout(() => t.el.remove(), 500);
      if (it.v === 'rhyme') { slot.textContent = t.g; it.got = t.g; }
      slot.classList.add('on'); slot.classList.remove('next');
      ni++; markNext();
      tiles.forEach(o => o.el.classList.remove('glow'));
      if (ni >= need.length) wordDone(); else { scheduleNeed(); say(it.lv.mode === 'letter' ? [['ls', t.g], ['ln', t.g]] : gItems(t.g, m)); }
    } else {
      SFX.boing(); misses++; S.log.misses++;
      t.el.classList.remove('bounce'); void t.el.offsetWidth; t.el.classList.add('bounce');
      if (misses % 3 === 0) { glowNeeded(); say([oops(), hintFor()].concat(it.v === 'rhyme' ? [['w', cur.word]] : gItems(need[ni], m))); }
      else say(gItems(t.g, m));
    }
  }
  function hintFor() { return ['p', 'hint_' + ({ rhyme: 9, missing: 10, missing2: 10, begin: 11, end: 12, middle: 13, case: 14, wordfind: 15 }[it.v] || [0, 1, 4][rnd(3)])]; }
  function glowNeeded() { tiles.forEach(o => { if (isNeed(o.g) && !o.gone) o.el.classList.add('glow'); }); }
  async function wordDone() {
    busy = true; SFX.chime();
    const w = cur, m = mode();
    const sc = itemScore(misses); earned += sc;
    if (!it.review) { prog.pts = Math.round((prog.pts + sc) * 10) / 10; showProg(); }
    if (misses >= 3) S.hard[w.word] = (S.hard[w.word] || 0) + 1;
    else if (misses === 0 && S.hard[w.word]) S.hard[w.word]--;
    S.log.words++; S.rain.done++; save();
    tiles.forEach(t => { t.gone = true; t.el.classList.add('fade'); });
    const slots = $$('.slot', slotsEl);
    const seq = [];
    if (it.lv.mode === 'letter') seq.push(['ls', w.word], ['w', D.LETTER_KEY[w.word][0]]);
    else if (it.v === 'rhyme') seq.push(['w', w.word], ['w', it.got], ['p', 'rhyme_yes_' + rnd(3)]);
    else if (it.v === 'wordfind') { picEl.textContent = w.pic; picEl.classList.remove('listen'); seq.push({ k: 'w', id: w.word, on: () => slots.forEach(s => s.classList.add('hl')) }); }
    else {
      gs.forEach((g, i) => gItems(g, m).forEach(x => seq.push({ k: x[0], id: x[1], on: () => { slots.forEach(s => s.classList.remove('hl')); slots[i].classList.add('hl'); } })));
      seq.push({ k: 'w', id: w.word, on: () => slots.forEach(s => s.classList.add('hl')) });
      seq.push(['p', 'you_spelled'], ['w', w.word]);
    }
    seq.push(praise());
    burst(picEl); addPoints(it.lv.mode === 'letter' ? 3 : 5, picEl);
    const myWord = wi;
    await say(seq, { gap: m === 'sound' && !isWordV() ? 120 : 60 });
    if (!alive || wi !== myWord) return;
    slots.forEach(s => s.classList.remove('hl'));
    await wait(250); if (alive && wi === myWord) nextWord();
  }
  function finish() {
    alive = false; cancelAnimationFrame(raf);
    const before = rainStars(lvIdx);
    prog.rounds++; if (!prog.days.includes(today())) prog.days.push(today());
    if (prog.days.length > 5) prog.days = prog.days.slice(-5);
    const after = rainStars(lvIdx);
    let levelUp = false;
    if (after === 3 && S.rain.unlocked <= lvIdx && lvIdx < D.RAIN_LEVELS.length - 1) { S.rain.unlocked = lvIdx + 1; levelUp = true; }
    save(); addPoints(3, $('.rainHead'));
    const waitDays = prog.pts >= lv.need && prog.days.length < lv.days;
    const nl = lvIdx + 1;
    roundDone(rainPlay, { levelUp, starsBefore: before, stars: after, waitDays, pct: Math.min(1, prog.pts / lv.need),
      nextLevel: nl < D.RAIN_LEVELS.length && nl <= S.rain.unlocked ? () => { S.rain.lv = nl; save(); rainPlay(); } : null });
  }
  function loop(ts0) {
    if (!alive) return;
    const dt = last ? Math.min(60, ts0 - last) : 16; last = ts0;
    if (!busy) {
      spawnT += dt; idleT += dt;
      const live = tiles.filter(t => !t.gone).length;
      const every = live < 3 ? cfg.spawn * .55 : cfg.spawn;
      if (spawnT > every && live < cfg.maxT) { spawnT = 0; spawn(); }
      if (idleT > 12000) { idleT = 0; glowNeeded(); say([hintFor()].concat(it.v === 'rhyme' || it.v === 'wordfind' ? [['w', cur.word]] : it.lv.mode === 'letter' ? [['ls', need[ni]]] : gItems(need[ni], mode()))); }
    }
    const H = field.clientHeight;
    tiles = tiles.filter(t => {
      if (t.gone) return !!t.el.parentNode;
      t.y += t.speed * dt; t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
      if (t.y > H) { t.el.remove(); return false; }
      return true;
    });
    raf = requestAnimationFrame(loop);
  }
  nextBtn(el, () => { if (!alive) return; hush(); busy = false; nextWord(); }, 'Next word');
  nextWord(); raf = requestAnimationFrame(loop);
  window.__rain = { cur: () => cur, need: () => need[ni], it: () => it, isNeed: (g) => isNeed(g), tiles: () => tiles, hit, wi: () => wi, cfg, variant, lv };
}

// ================= STORYBOOK =================
function shelfOpen(n) {
  if (n <= 1) return true;
  const prev = D.STORIES.filter(s => s.level === n - 1);
  return shelfOpen(n - 1) && prev.filter(s => S.story.read[s.id]).length >= Math.min(3, prev.length);
}
function shelf() {
  const levels = [...new Set(D.STORIES.map(s => s.level))].sort((a, b) => a - b);
  const open = levels.filter(shelfOpen).length, isNew = open > (S.story.shelves || 1);
  if (isNew) { S.story.shelves = open; save(); }
  show('shelf', topBar('Story Time') + `<div class="shelves">${levels.map(n => {
    const ok = shelfOpen(n), list = D.STORIES.map((s, i) => [s, i]).filter(([s]) => s.level === n);
    return `<div class="shelfRow ${ok ? '' : 'locked'}"><div class="shelfHead">${E(ok ? '📚' : '🔒')} ${'⭐'.repeat(n)}</div><div class="books">${list.map(([s, i]) => `<button class="book" data-i="${i}" data-ok="${ok ? 1 : 0}" style="background:${s.color}">
    ${S.story.read[s.id] ? '<span class="done emoji">✅</span>' : ''}<span class="big emoji">${ok ? s.cover : '🔒'}</span><b>${esc(s.title)}</b></button>`).join('')}</div></div>`; }).join('')}</div>`, (el) => {
    $$('.book', el).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.ok !== '1') { SFX.boing(); anim(b, 'shake'); say(['p', 'shelf_locked']); return; }
      SFX.pop(); reader(+b.dataset.i, 0);
    }));
    if (isNew) { const rows = $$('.shelfRow:not(.locked)', el), r = rows[rows.length - 1]; if (r) { r.scrollIntoView && r.scrollIntoView({ block: 'center' }); burst(r); } }
  });
  prompt(isNew ? [['p', 'new_shelf']] : [['p', 'm_story'], line('story') || ['p', 'story_pick']]);
}
function reader(si, pi) {
  const st = D.STORIES[si];
  const el = show('reader', topBar(esc(st.title), { back: 'story', backIcon: '📚' }) + `<div class="scene"></div><div class="storyText"></div>
  <div class="readerNav"><button class="navBtn" data-n="-1" aria-label="Back">${E('⬅️')}</button><div class="dots"></div>
  <button class="navBtn read" data-read aria-label="Read to me">${E('🔊')}</button><button class="navBtn go big" data-n="1" aria-label="Next">${E('⏭️')}<span>Next</span></button></div>`);
  const scene = $('.scene', el), text = $('.storyText', el);
  function render() {
    const p = st.pages[pi];
    scene.className = 'scene bg-' + p.bg;
    scene.innerHTML = p.s.map(([e, x, y, sz, a]) => `<div class="sprite" style="left:${x}%;top:${y}%;font-size:${sz}vmin"><span class="emoji ${a ? 'l-' + a : ''}">${e}</span></div>`).join('');
    const toks = D.tokens(p.t);
    text.className = 'storyText' + (p.t.length > 46 ? ' smaller' : p.t.length > 28 ? ' small' : '');
    text.innerHTML = toks.map((t, i) => `<span class="word lt" data-i="${i}" data-w="${esc(t.w)}">${esc(t.raw)}</span>`).join('');
    $('.dots', el).innerHTML = st.pages.map((_, i) => `<i class="${i === pi ? 'on' : ''}"></i>`).join('');
    $('[data-n="-1"]', el).disabled = pi === 0;
    $('[data-n="1"]', el).innerHTML = pi === st.pages.length - 1 ? E('🏁') + '<span>End</span>' : E('⏭️') + '<span>Next</span>';
    const key = st.id + '-' + pi;
    if (!S.story.pages[key]) { S.story.pages[key] = 1; save(); addPoints(1, text); }
    lastPrompt = [{ k: 's', id: key }];
    preload([['s', key]].concat(toks.map(t => ['w', t.w])));
    if (pi === 0 && Object.keys(S.story.read).length === 0) prompt([['w', st.title], ['p', 'story_tap']]);
    else if (pi === 0) say(['w', st.title]);
  }
  text.addEventListener('pointerdown', (e) => {
    const w = e.target.closest('.word'); if (!w || !w.dataset.w) return;
    SFX.tap(); $$('.word', text).forEach(x => x.classList.remove('hl'));
    w.classList.add('tap'); setTimeout(() => w.classList.remove('tap'), 600);
    say(['w', w.dataset.w]);
  });
  scene.addEventListener('pointerdown', (e) => { const s = e.target.closest('.sprite'); if (s) { SFX.boing(); anim(s, 'jump'); } });
  $('[data-read]', el).addEventListener('click', () => readToMe());
  function readToMe() {
    SFX.tap(); const key = st.id + '-' + pi, tim = M.pages[key] || []; const words = $$('.word', text);
    say([{ k: 's', id: key, time: (ms) => { words.forEach((w, i) => w.classList.toggle('hl', !!tim[i] && ms >= tim[i][0] - 40 && (ms < (tim[i + 1] ? tim[i + 1][0] - 40 : tim[i][1] + 300)))); } }])
      .then(() => { words.forEach(w => w.classList.remove('hl')); });
  }
  $$('[data-n]', el).forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.n; SFX.whoosh();
    if (n > 0 && pi === st.pages.length - 1) return storyEnd();
    pi = Math.max(0, Math.min(st.pages.length - 1, pi + n)); hush(); render();
    if (n > 0 && pi > 0) say(['p', 'next']);
  }));
  function storyEnd() {
    const first = !S.story.read[st.id]; S.story.read[st.id] = (S.story.read[st.id] || 0) + 1; S.log.stories++; save();
    addPoints(first ? 10 : 4, $('.scene'));
    SFX.tada();
    let nxt = (si + 1) % D.STORIES.length; for (let k = 0; k < D.STORIES.length && !shelfOpen(D.STORIES[nxt].level); k++) nxt = (nxt + 1) % D.STORIES.length;
    const o = overlay(`<div class="huge emoji">${st.cover}</div><h2>The End!</h2><div class="row"><button class="navBtn go" data-a="again" aria-label="Read again">${E('🔁')}</button><button class="navBtn next" data-a="next" aria-label="Next story">${E('⏭️')}</button><button class="navBtn" data-a="shelf" aria-label="More stories">${E('📚')}</button><button class="navBtn" data-a="home" aria-label="Home">${E('🏠')}</button></div>`);
    burst($('.huge', o)); lastPrompt = ['p', 'the_end']; say(['p', 'the_end']);
    o.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; SFX.tap(); o.remove(); ({ again: () => reader(si, 0), next: () => reader(nxt, 0), shelf, home })[b.dataset.a](); });
  }
  render();
  window.__reader = { readToMe, page: () => pi };
}

// ================= shared: silly combo scene =================
const ADJ_TAG = { happy: '😄', sleepy: '💤', fast: '💨', shiny: '✨', magic: '🪄', brave: '🛡️', hungry: '🍕', cold: '❄️', hot: '🔥', wet: '💧', noisy: '📢' };
function buildScene(host, c) {
  const group = (noun, adj, plural, xs) => xs.map(x => { const tag = adj && ADJ_TAG[adj.a];
    return `<div class="actor ${adj ? 'mod-' + adj.a : ''}" style="left:${x}%"><span><span class="emoji">${noun.e}</span></span>${tag ? `<span class="tag emoji" style="${adj.a === 'fast' ? 'top:30%;left:-30%' : 'top:-10%;right:-10%'}">${tag}</span>` : ''}</div>`; }).join('');
  const two = !!c.noun2, n = c.plural ? (two ? 2 : 3) : 1;
  const xs1 = two ? (n > 1 ? [18, 34] : [30]) : (n > 1 ? [25, 50, 75] : [50]);
  const sc = document.createElement('div'); sc.className = 'showtime bg-' + (c.place ? c.place.bg : (c.bg || 'grass'));
  sc.innerHTML = `<div class="stage">${c.place ? `<div class="placeE emoji" style="left:8%;top:12%">${c.place.e}</div>` : ''}
    ${group(c.noun, c.adj, c.plural, xs1)}${two ? group(c.noun2, c.adj2, false, [70]) : ''}</div>
    <div class="sentence lt">${c.text.split(' ').map((w, i) => `<span class="sw" data-i="${i}">${esc(w)}</span>`).join(' ')}</div>`;
  host.appendChild(sc);
  const actors = $$('.actor', sc), stage = $('.stage', sc), v1 = (c.verb || { a: 'wave' }).a;
  sc.act = async () => {
    await Promise.all(actors.map((a, i) => wait(i * 150).then(() => anim(a.firstElementChild, v1, stage))));
    if (c.verb2) await Promise.all(actors.map((a, i) => wait(i * 150).then(() => anim(a.firstElementChild, c.verb2.a, stage))));
  };
  sc.hl = (i) => $$('.sw', sc).forEach((s, j) => s.classList.toggle('hl', j === i));
  return sc;
}

// ================= WORD RACE =================
function raceNeed(i) { return { need: 6 + i * 2, days: i >= 8 ? 3 : i >= 4 ? 2 : 1 }; }
function raceStars(i) { const L = D.RACE_LEVELS[i], r = raceNeed(i); return levelStars(S.race.prog[L.id], r.need, r.days); }
function raceMap() {
  levelMap('raceMap', 'Word Race', D.RACE_LEVELS.map((l, i) => Object.assign({}, l, { stars: raceStars(i) })), S.race.lv, S.race.unlocked, (i) => { S.race.lv = i; save(); racePlay(); });
  prompt([['p', 'm_race'], ['p', 'pick_level']]);
}
const CAR_COLORS = ['cBlue', 'cRed', 'cGreen', 'cPurple', 'cOrange', 'cTeal'];
function raceOptions(slot, n, chosen) {
  n = n || 3; chosen = chosen || [];
  if (slot[0] === '=') { const w = slot.slice(1); return [{ w, say: w.toLowerCase().replace(/[!?.]/g, ''), fixed: true }]; }
  const q = slot.endsWith('?'), base = q ? slot.slice(0, -1) : slot;
  const usedN = chosen.filter(o => o.noun).map(o => o.noun.s), usedV = chosen.filter(o => o.verb).map(o => o.verb.b), usedA = chosen.filter(o => o.adj).map(o => o.adj.w);
  const tag = (o) => Object.assign(o, { slot: base, q });
  if (base === 'noun' || base === 'noun2') return shuffle(D.RACE_NOUNS.filter(x => !usedN.includes(x.s))).slice(0, n).map(x => tag({ w: x.s, say: x.s, noun: x }));
  if (base === 'nounP') return shuffle(D.RACE_NOUNS.filter(x => x.p !== x.s)).slice(0, n).map(x => tag({ w: x.p, say: x.p, noun: x, plural: true }));
  if (base === 'verbB') return shuffle(D.RACE_VERBS).slice(0, n).map(v => tag({ w: v.b, say: v.b, verb: v }));
  if (base === 'verbS' || base === 'verbS2') return shuffle(D.RACE_VERBS.filter(v => !usedV.includes(v.b))).slice(0, n).map(v => tag({ w: v.s, say: v.s, verb: v }));
  if (base === 'verbI') return shuffle(D.RACE_VERBS).slice(0, n).map(v => tag({ w: v.i, say: v.i, verb: v }));
  if (base === 'adj' || base === 'adj2') return shuffle(D.RACE_ADJS.filter(a => !usedA.includes(a.w))).slice(0, n).map(a => tag({ w: a.w, say: a.w, adj: a }));
  if (base === 'place') return shuffle(D.RACE_PLACES).slice(0, n).map(p => tag({ w: p.w, say: p.w, place: p }));
  return [];
}
function racePlay() {
  const lvIdx = S.race.lv, L = D.RACE_LEVELS[lvIdx], prog = progOf(S.race.prog, L.id), RN = raceNeed(lvIdx);
  let round = 0, chosen = [], si = 0, alive = true, finishing = false, sentenceId = 0;
  const el = show('race', topBar(`${E(L.icon || '🏎️')} ${esc(L.name)}`, { back: 'race', backIcon: '⬅️' }) + `<div class="raceStage"><div class="track"></div></div><div class="garageWrap"><div class="garage"></div><button class="refreshBtn" aria-label="New words">${E('🔄')}</button></div>`);
  const track = $('.track', el), garage = $('.garage', el), refresh = $('.refreshBtn', el);
  track.classList.toggle('long', L.slots.length > 6);
  cleanup = () => { alive = false; };
  const disp = (o, i) => { let w = o.w; if (i === 0) w = w[0].toUpperCase() + w.slice(1); return w + (o.q ? '?' : ''); };
  function newSentence() {
    $$('.showtime', el).forEach(s => s.remove());
    chosen = []; si = 0; finishing = false; sentenceId++;
    track.innerHTML = L.slots.map((_, i) => `<div class="spot ${i === 0 ? 'cur' : ''}" data-i="${i}"></div>`).join('');
    showChoices();
    prompt(round === 0 ? [['p', 'race_intro'], ['p', 'race_pick']] : [['p', 'race_' + rnd(4)]]);
  }
  function showChoices() {
    $$('.hand', el).forEach(h => h.remove());
    const opts = raceOptions(L.slots[si], lvIdx >= 6 ? 4 : 3, chosen);
    refresh.style.visibility = opts.length > 1 ? 'visible' : 'hidden';
    garage.innerHTML = '';
    opts.forEach((o, i) => {
      const c = document.createElement('div'); c.className = 'car lt ' + CAR_COLORS[(si * 2 + i + rnd(3)) % CAR_COLORS.length];
      c.innerHTML = `<span class="win"></span>${esc(disp(o, si))}`; c._o = o; garage.appendChild(c); dragCar(c);
    });
    preload(opts.map(o => ['w', o.say]));
    if (round === 0 && si === 0) { const h = document.createElement('div'); h.className = 'hand emoji'; h.textContent = '👆'; const r = garage.firstChild.getBoundingClientRect(), s = el.getBoundingClientRect(); h.style.left = (r.left - s.left + r.width / 2) + 'px'; h.style.top = (r.bottom - s.top) + 'px'; el.appendChild(h); }
  }
  refresh.addEventListener('click', () => { if (finishing) return; SFX.whoosh(); anim(refresh, 'spin'); showChoices(); say(['p', 'new_words']); });
  function dragCar(c) {
    let sx, sy, ox, oy, moved = false, down = false;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault(); down = true; moved = false; sx = e.clientX; sy = e.clientY;
      const r = c.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
      try { c.setPointerCapture(e.pointerId); } catch (er) {}
    });
    c.addEventListener('pointermove', (e) => {
      if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 12) { moved = true; c.classList.add('dragging'); c.style.position = 'fixed'; c.style.margin = 0; say(['w', c._o.say]); }
      if (moved) { c.style.left = (e.clientX - ox) + 'px'; c.style.top = (e.clientY - oy) + 'px'; const tr = track.getBoundingClientRect(); track.classList.toggle('drop', e.clientY < tr.bottom + 40); }
    });
    const up = (e) => {
      if (!down) return; down = false; track.classList.remove('drop');
      if (moved) {
        const tr = track.getBoundingClientRect();
        c.classList.remove('dragging'); c.style.position = ''; c.style.left = ''; c.style.top = '';
        if (e.clientY < tr.bottom + 40) place(c); else SFX.boing();
      } else place(c); // one tap = drive onto the road (the word is read as it parks)
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', (e) => { if (down && moved) up(e); down = false; });
  }
  function place(c) {
    if (!alive || finishing || !c.parentNode || c.parentNode !== garage) return;
    const o = c._o; chosen.push(o);
    $$('.hand', el).forEach(h => h.remove());
    const spot = track.children[si]; spot.classList.remove('cur'); spot.classList.add('filled');
    c.classList.remove('sel'); spot.appendChild(c); SFX.vroom(); anim(c, 'jump2');
    garage.innerHTML = ''; si++;
    if (si < L.slots.length) { say(['w', o.say]); track.children[si].classList.add('cur'); showChoices(); }
    else finishSentence();
  }
  async function finishSentence() {
    finishing = true; refresh.style.visibility = 'hidden';
    const my = sentenceId, cars = $$('.car', track), words = chosen.map(o => o.say);
    const still = () => alive && my === sentenceId;
    // 1) read the finished sentence right away, gapless, each car hopping on its word
    await say(words.map((w, i) => ({ k: 'w', id: w, on: () => { cars.forEach(x => x.classList.remove('reading')); void cars[i].offsetWidth; cars[i].classList.add('reading'); } })), { gap: 70 });
    if (!still()) return;
    SFX.vroom(); cars.forEach((c, i) => setTimeout(() => c.classList.add('vroom'), i * 60));
    await wait(650); if (!still()) return;
    // 2) the silly combo picture acts it out while the sentence is read again
    const by = (s) => chosen.find(o => o.slot === s);
    const nounO = by('noun') || by('nounP'), noun2O = by('noun2'), verbO = chosen.find(o => o.verb && o.slot !== 'verbS2'), verb2O = by('verbS2');
    const adjO = by('adj'), adj2O = by('adj2'), placeO = by('place');
    const lastQ = chosen[chosen.length - 1].q;
    const text = chosen.map((o, i) => disp(o, i)).join(' ') + (lastQ ? '' : chosen.length > 2 ? '.' : '!');
    const sc = buildScene(el, { noun: nounO.noun, plural: nounO.plural, noun2: noun2O && noun2O.noun, adj: adjO && adjO.adj, adj2: adj2O && adj2O.adj, verb: verbO && verbO.verb, verb2: verb2O && verb2O.verb, place: placeO && placeO.place, bg: pick(['grass', 'sunny', 'road']), text });
    const acting = sc.act();
    await say(words.map((w, i) => ({ k: 'w', id: w, on: () => sc.hl(i) })), { gap: 70 });
    await acting; if (!still()) return;
    sc.hl(-1);
    S.log.sentences++; S.race.done++; prog.pts++; save();
    addPoints(5, sc); await say([praise()]); await wait(500);
    if (!still()) return;
    round++;
    if (round >= 4) {
      const before = raceStars(lvIdx);
      prog.rounds++; if (!prog.days.includes(today())) prog.days.push(today()); if (prog.days.length > 5) prog.days = prog.days.slice(-5);
      const after = raceStars(lvIdx);
      let levelUp = false;
      if (after === 3 && lvIdx < D.RACE_LEVELS.length - 1 && S.race.unlocked <= lvIdx) { S.race.unlocked = lvIdx + 1; levelUp = true; }
      save();
      const nl = lvIdx + 1;
      roundDone(racePlay, { levelUp, starsBefore: before, stars: after, pct: Math.min(1, prog.pts / RN.need), waitDays: prog.pts >= RN.need && prog.days.length < RN.days,
        nextLevel: nl < D.RACE_LEVELS.length && nl <= S.race.unlocked ? () => { S.race.lv = nl; save(); racePlay(); } : null });
    } else newSentence();
  }
  nextBtn(el, () => { if (!alive) return; hush(); round = Math.min(round, 3); newSentence(); }, 'Next sentence');
  newSentence();
  window.__race = { place: () => { const c = garage.firstChild; if (c) place(c); }, si: () => si, refresh: () => refresh.click(), L };
}

// ================= ACTION WORDS =================
const ACT_OF = {}; D.ACTIONS.forEach(a => { ACT_OF[a.w] = a.a; });
function actNeed(i) { return { need: 10 + i * 3, days: i >= 5 ? 3 : i >= 2 ? 2 : 1 }; }
function actStars(i) { const L = D.ACT_LEVELS[i], r = actNeed(i); return levelStars(S.act.prog[L.id], r.need, r.days); }
function actPool() { return D.ACTIONS.slice(0, D.ACT_LEVELS[S.act.lv].n); }
// phrases are generated from the level's templates, so there are thousands of combos
function makePhrase() {
  const L = D.ACT_LEVELS[S.act.lv], pool = actPool().filter(a => a.w !== 'big' && a.w !== 'small'), used = new Set();
  const nw = () => { let a, k = 0; do { a = pick(pool); } while ((used.has(a.a) || used.has(a.w)) && k++ < 40); used.add(a.a); used.add(a.w); return a.w; };
  return pick(L.tpl).replace(/W/g, nw);
}
// a correct answer / finished phrase adds mastery; round end checks stars & unlocks
function actCredit(n) { const p = progOf(S.act.prog, D.ACT_LEVELS[S.act.lv].id); p.pts = Math.round((p.pts + n) * 10) / 10; save(); }
function actRoundDone(again) {
  const i = S.act.lv, L = D.ACT_LEVELS[i], p = progOf(S.act.prog, L.id), r = actNeed(i);
  const before = actStars(i); p.rounds++; if (!p.days.includes(today())) p.days.push(today()); if (p.days.length > 5) p.days = p.days.slice(-5);
  const after = actStars(i); let levelUp = false;
  if (after === 3 && i < D.ACT_LEVELS.length - 1 && S.act.unlocked <= i) { S.act.unlocked = i + 1; levelUp = true; }
  save();
  roundDone(again, { levelUp, starsBefore: before, stars: after, pct: Math.min(1, p.pts / r.need), waitDays: p.pts >= r.need && p.days.length < r.days,
    nextLevel: i + 1 < D.ACT_LEVELS.length && i + 1 <= S.act.unlocked ? () => { S.act.lv = i + 1; save(); again(); } : null });
}
function actMap(mode) {
  levelMap('actMap', 'Action Words', D.ACT_LEVELS.map((l, i) => Object.assign({}, l, { stars: actStars(i) })), S.act.lv, S.act.unlocked, (i) => { S.act.lv = i; save(); actionHome(mode); });
  prompt([['p', 'm_action'], ['p', 'pick_level']]);
}
function actionHome(mode) {
  mode = mode || 'explore';
  const L = D.ACT_LEVELS[S.act.lv];
  const el = show('action', topBar('Action Words') + `<div class="actModes">
    <button class="modeBtn lvChip" data-lv style="background:${L.color}">${E(L.icon)}<span>${'⭐'.repeat(actStars(S.act.lv)) || esc(L.name)}</span></button>
    <button class="modeBtn ${mode === 'explore' ? 'on' : ''}" data-m="explore">${E('🎈')}<span>Play</span></button>
    <button class="modeBtn ${mode === 'match' ? 'on' : ''}" data-m="match">${E('🎯')}<span>Match</span></button>
    <button class="modeBtn ${mode === 'phrase' ? 'on' : ''}" data-m="phrase">${E('📜')}<span>Read & Do</span></button>
    <button class="modeBtn ${mode === 'mix' ? 'on' : ''}" data-m="mix">${E('🔀')}<span>Mix</span></button></div>
    <div class="actStage"><div class="buddy"><span class="emoji">🐉</span></div></div><div class="actWords"></div>`);
  $$('[data-m]', el).forEach(b => b.addEventListener('click', () => { SFX.pop(); actionHome(b.dataset.m); }));
  $('[data-lv]', el).addEventListener('click', () => { SFX.pop(); actMap(mode); });
  const stage = $('.actStage', el), buddy = $('.buddy', el), words = $('.actWords', el);
  let alive = true; cleanup = () => { alive = false; clearInterval(stage._iv); };
  buddy.addEventListener('click', () => { SFX.boing(); anim(buddy, 'jump', stage); say(['p', 'sparky_' + rnd(12)]); });
  if (mode === 'explore') {
    const all = actPool();
    const deal = () => {
      const list = shuffle(all).slice(0, 8);
      words.innerHTML = list.map(a => `<button class="aw lt" data-w="${a.w}" data-a="${a.a}"><span>${a.w}</span></button>`).join('');
      preload(list.map(a => ['w', a.w]));
      $$('.aw', words).forEach(b => b.addEventListener('click', () => {
        SFX.pop(); say(['w', b.dataset.w]); anim(b, b.dataset.a, words); setTimeout(() => anim(buddy, b.dataset.a, stage), 250);
        if (!S.act.seen[b.dataset.w]) { S.act.seen[b.dataset.w] = 1; save(); addPoints(1, b); }
      }));
    };
    deal();
    nextBtn(el, deal, 'New words');
    prompt([['p', 'm_action'], ['p', 'action_intro']]);
  } else if (mode === 'match') {
    let n = 0, firstTry = true, target, qid = 0;
    const nChoices = [2, 3, 3, 4, 4, 4, 5, 5][S.act.lv] || 4;
    const next = () => {
      if (!alive) return;
      clearInterval(stage._iv);
      if (n >= 6) return actRoundDone(() => actionHome('match'));
      n++; firstTry = true; const my = ++qid;
      const pool = actPool();
      target = pick(pool); const opts = shuffle([target].concat(shuffle(pool.filter(a => a.w !== target.w && a.a !== target.a)).slice(0, nChoices - 1)));
      words.innerHTML = opts.map(a => `<button class="aw big3 lt" data-w="${a.w}" data-a="${a.a}"><span>${a.w}</span></button>`).join('');
      preload(opts.map(a => ['w', a.w]));
      anim(buddy, target.a, stage); stage._iv = setInterval(() => alive && target && anim(buddy, target.a, stage), 3400);
      prompt([['p', 'action_match']]);
      $$('.aw', words).forEach(b => b.addEventListener('click', async () => {
        if (!target || my !== qid) return;
        if (b.dataset.w === target.w || (b.dataset.a === target.a && b.dataset.w !== target.w)) {
          clearInterval(stage._iv); SFX.chime(); b.classList.add('right'); anim(b, b.dataset.a, words); burst(b);
          S.log.matches++; S.act.done++; actCredit(firstTry ? 1 : .4); addPoints(firstTry ? 3 : 1, b);
          const tg = b.dataset.w; target = null; await say([['w', tg], praise()]); if (alive && my === qid) setTimeout(() => { if (my === qid) next(); }, 400);
        } else {
          SFX.boing(); firstTry = false; b.classList.add('wrongish'); anim(b, b.dataset.a, words);
          say([['p', 'that_says'], ['w', b.dataset.w], oops()]);
        }
      }));
    };
    nextBtn(el, () => { target = null; next(); }, 'Next one');
    next();
  } else if (mode === 'phrase') {
    let n = 0, pid = 0, lastPh = null;
    const next = () => {
      if (!alive) return;
      if (n >= 5) return actRoundDone(() => actionHome('phrase'));
      n++; const my = ++pid;
      let ph, k = 0; do { ph = makePhrase(); } while (ph === lastPh && k++ < 5); lastPh = ph;
      const raw = ph.split(' '), ws = raw.map(w => w.replace(/[^a-z]/gi, '').toLowerCase());
      words.innerHTML = `<div class="phrase">${raw.map((w, i) => `<button class="aw big3 lt" data-w="${ws[i]}"><span>${esc(w)}</span></button>`).join('')}<button class="goBtn" aria-label="Go">${E('▶️')}</button></div>`;
      words.classList.toggle('longPh', raw.length > 4);
      preload(ws.map(w => ['w', w]));
      const bs = $$('.aw', words), hl = (i) => bs.forEach((b, j) => b.classList.toggle('hl', j === i));
      bs.forEach(b => b.addEventListener('click', () => { SFX.tap(); say(['w', b.dataset.w]); anim(b, 'jump2', words); }));
      let did = false, running = false;
      $('.goBtn', words).addEventListener('click', async () => {
        if (running) return; running = true; SFX.whoosh();
        const still = () => alive && my === pid;
        // 1) read the whole phrase (gapless), lighting each word
        await say(ws.map((w, i) => ({ k: 'w', id: w, on: () => hl(i) })), { gap: 80 });
        if (!still()) return;
        // 2) then do each action word fully, one after the other: light it, say it, act it
        for (let i = 0; i < ws.length; i++) {
          const a = ACT_OF[ws[i]]; if (!a) continue;
          if (!still()) return;
          hl(i); say(['w', ws[i]]);
          await anim(buddy, a, stage);
          await wait(300);
        }
        hl(-1); running = false;
        if (!still()) return;
        if (!did) { did = true; addPoints(2, buddy); actCredit(1); S.log.matches++; save(); await say([praise()]); if (still()) setTimeout(() => { if (my === pid) next(); }, 400); }
      });
      prompt([['p', 'action_phrase']]);
    };
    nextBtn(el, next, 'Next phrase');
    next();
  } else {
    // ---- Mix: build a silly combo, refresh any word type, or shuffle them all ----
    const pickNoun = () => pick(D.RACE_NOUNS), pickAdj = () => pick(D.RACE_ADJS), pickVerb = () => pick(D.RACE_VERBS), pickPlace = () => pick(D.RACE_PLACES);
    const c = { adj: pickAdj(), noun: pickNoun(), verb: pickVerb(), place: pickPlace() };
    const TYPES = [['adj', '🎨', pickAdj, x => x.w], ['noun', '🐾', pickNoun, x => x.s], ['verb', '🏃', pickVerb, x => x.s], ['place', '📍', pickPlace, x => x.w]];
    stage.innerHTML = '';
    let playing = 0;
    const words4 = () => ['the', c.adj.w, c.noun.s, c.verb.s, c.place.w];
    const text = () => 'The ' + c.adj.w + ' ' + c.noun.s + ' ' + c.verb.s + ' ' + c.place.w + '.';
    function draw() {
      stage.innerHTML = '';
      const sc = buildScene(stage, { noun: c.noun, adj: c.adj, verb: c.verb, place: c.place, text: text() }); sc.classList.add('inStage');
      words.innerHTML = `<div class="mixRow">${TYPES.map(([k, icon, , txt]) => `<div class="mixCol"><button class="aw lt" data-k="${k}"><span>${esc(txt(c[k]))}</span></button><button class="refreshBtn small" data-r="${k}" aria-label="New ${k}">${E('🔄')}</button></div>`).join('')}
        <div class="mixCol"><button class="goBtn" aria-label="Go">${E('▶️')}</button><button class="refreshBtn small all" data-all aria-label="Shuffle all">${E('🔀')}</button></div></div>`;
      preload(words4().map(w => ['w', w]));
      $$('[data-k]', words).forEach(b => b.addEventListener('click', () => { SFX.tap(); say(['w', b.textContent]); anim(b, 'jump2', words); }));
      $$('[data-r]', words).forEach(b => b.addEventListener('click', () => { SFX.whoosh(); const t = TYPES.find(x => x[0] === b.dataset.r); let v; do { v = t[2](); } while (v === c[t[0]]); c[t[0]] = v; draw(); say(['w', t[3](v)]); }));
      $('[data-all]', words).addEventListener('click', shuffleAll);
      $('.goBtn', words).addEventListener('click', () => go(sc));
      return sc;
    }
    async function go(sc) {
      const my = ++playing; SFX.whoosh();
      const acting = sc.act();
      await say(words4().map((w, i) => ({ k: 'w', id: w, on: () => sc.hl(i) })), { gap: 70 });
      await acting; if (my !== playing || !alive) return;
      sc.hl(-1); addPoints(2, sc); say([praise()]);
    }
    function shuffleAll() { SFX.whoosh(); c.adj = pickAdj(); c.noun = pickNoun(); c.verb = pickVerb(); c.place = pickPlace(); const sc = draw(); say(['p', 'shuffle']); setTimeout(() => go(sc), 700); }
    draw();
    nextBtn(el, shuffleAll, 'Shuffle all');
    prompt([['p', 'action_mix']]);
  }
}

// ================= GALLERY =================
// v3: 18 rooms, ~20 items each. Tapping an item says its name, shows the word and acts (fire, swim,
// launch, glow...). Items with a friend in the room interact. Room levels every 5 items, decorations
// to buy, and a "next goal" chip so there is always something to save up for.
function roomUnlocked(i) { if (i === 0) return true; const prev = D.ROOMS[i - 1]; return (S.owned[prev.id] || []).length >= D.ROOMS[i].need; }
const roomLevel = (room) => Math.floor((S.owned[room.id] || []).length / 5);
const decorPrice = (d, ri) => d.price + Math.floor(ri / 2);
function mv(el, frames, dur, opt) {
  if (!el || !el.animate) return wait(dur);
  const a = el.animate(frames, Object.assign({ duration: dur, easing: 'ease-in-out' }, opt || {}));
  return Promise.race([a.finished ? a.finished.catch(() => {}) : wait(dur), wait(dur + 300)]);
}
function fxAt(el, ch, dx, dy, dur) {
  const fx = $('#fx'), r = el.getBoundingClientRect(), s = document.createElement('div');
  s.className = 'fxp emoji'; s.textContent = ch; s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top + r.height / 2) + 'px'; fx.appendChild(s);
  mv(s, [{ transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.3)`, opacity: .9, offset: .8 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.6)`, opacity: 0 }], dur || 900).then(() => s.remove());
}
function fireAt(from, to) {
  const r = from.getBoundingClientRect(); let dx = r.width * 1.6, dy = 0;
  if (to) { const t = to.getBoundingClientRect(); dx = t.left + t.width / 2 - (r.left + r.width / 2); dy = t.top + t.height / 2 - (r.top + r.height / 2); }
  for (let i = 0; i < 7; i++) setTimeout(() => fxAt(from, pick(['🔥', '🔥', '💥', '✨']), dx * (.7 + Math.random() * .4), dy + (rnd(40) - 20), 800), i * 90);
}
function gallery(ri) {
  if (ri == null) ri = S.lastRoom || 0;
  if (ri >= D.ROOMS.length) ri = 0;
  const entering = S.lastRoom !== ri || !$('#gallery.show');
  S.lastRoom = ri; save();
  const room = D.ROOMS[ri], own = S.owned[room.id] || (S.owned[room.id] = []), unlocked = roomUnlocked(ri);
  const decor = S.decor[room.id] || (S.decor[room.id] = []);
  const el = show('gallery', topBar('Star Gallery') + `<div class="roomTabs">${D.ROOMS.map((r, i) => `<button class="rTab ${i === ri ? 'on' : ''} ${roomUnlocked(i) ? '' : 'locked'}" data-r="${i}">${E(roomUnlocked(i) ? r.icon : '🔒')}<span>${esc(r.name)}</span></button>`).join('')}</div>
    <div class="room rbg-${room.bg}"></div><div class="goalChip"></div><div class="shop"></div>`);
  const roomEl = $('.room', el), shop = $('.shop', el), chip = $('.goalChip', el);
  const tab = $$('.rTab', el)[ri]; if (tab && tab.scrollIntoView) try { tab.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {}
  $$('.rTab', el).forEach(b => b.addEventListener('click', () => { SFX.pop(); const i = +b.dataset.r; gallery(i); }));
  const taps = {};
  function renderRoom(newIdx) {
    const amb = { castle: '<div class="crenel"></div><div class="amb emoji l-flicker" style="left:8%;top:30%;font-size:5vmin">🔥</div><div class="amb emoji l-flicker" style="right:8%;top:30%;font-size:5vmin">🔥</div>',
      ocean: '<div class="amb emoji l-float" style="left:40%;top:50%;font-size:4vmin">💧</div><div class="amb emoji l-float" style="left:70%;top:40%;font-size:3vmin">💧</div>',
      space: '<div class="amb emoji l-twinkle" style="left:22%;top:30%;font-size:3vmin">✨</div><div class="amb emoji l-twinkle" style="left:70%;top:70%;font-size:3vmin">✨</div>',
      cave: '<div class="amb emoji l-twinkle" style="left:50%;top:10%;font-size:3vmin">✨</div>', jungle: '<div class="amb emoji l-wiggle" style="left:50%;top:6%;font-size:6vmin">🍃</div>',
      snow: '<div class="amb emoji l-fall" style="left:20%;top:8%;font-size:3vmin">❄️</div><div class="amb emoji l-fall" style="left:60%;top:4%;font-size:3vmin">❄️</div><div class="amb emoji l-fall" style="left:84%;top:10%;font-size:3vmin">❄️</div>',
      garden: '<div class="amb emoji l-fly" style="left:30%;top:14%;font-size:3.4vmin">🦋</div>', mountain: '<div class="amb emoji l-float" style="left:70%;top:8%;font-size:6vmin">☁️</div>',
      wizard: '<div class="amb emoji l-twinkle" style="left:16%;top:12%;font-size:3vmin">✨</div><div class="amb emoji l-twinkle" style="left:80%;top:20%;font-size:3vmin">🌟</div>',
      vault: '<div class="amb emoji l-twinkle" style="left:40%;top:8%;font-size:3vmin">✨</div>', pirate: '<div class="amb emoji l-float" style="left:84%;top:8%;font-size:5vmin">☁️</div>' }[room.bg] || '';
    const dec = decor.map(id => ({
      lights: '<div class="dec dec-lights">' + '✨'.repeat(9).split('').filter(Boolean).map((s, k) => `<span class="emoji l-twinkle" style="animation-delay:${k * .2}s">✨</span>`).join('') + '</div>',
      balloons: '<div class="dec emoji l-float" style="left:4%;bottom:6%;font-size:8vmin">🎈</div><div class="dec emoji l-float" style="right:4%;bottom:10%;font-size:7vmin;animation-delay:.6s">🎈</div>',
      rainbow: '<div class="dec dec-rainbow emoji">🌈</div>',
      stars: '<div class="dec dec-night"></div><div class="dec emoji l-twinkle" style="left:30%;top:10%;font-size:3vmin">🌟</div><div class="dec emoji l-twinkle" style="left:62%;top:16%;font-size:3vmin">⭐</div>',
      confetti: '<div class="dec emoji l-spin" style="left:10%;top:16%;font-size:5vmin">🎉</div><div class="dec emoji l-spin" style="right:10%;top:16%;font-size:5vmin">🎊</div>'
    }[id] || '')).join('');
    const lvl = roomLevel(room), k = room.items.length > 12 ? .74 : 1;
    roomEl.innerHTML = amb + dec + `<div class="fillBar">${E(room.icon)} ${own.length}/${room.items.length}<span class="bar"><i style="width:${own.length / room.items.length * 100}%"></i></span><span class="rLv">${'⭐'.repeat(lvl)}${'☆'.repeat(Math.max(0, 4 - lvl))}</span></div>` +
      room.items.map((it, i) => own.includes(i) ? `<div class="item ${i === newIdx ? 'new' : ''} ${it[6] === 'glow' ? 'glowable' : ''}" data-i="${i}" style="left:${it[3]}%;top:${it[4]}%;font-size:${(it[5] * k).toFixed(1)}vmin"><span class="emoji">${it[1]}</span></div>`
        : `<div class="ghost emoji" style="left:${it[3]}%;top:${it[4]}%;font-size:${(it[5] * k).toFixed(1)}vmin">${it[1]}</div>`).join('') +
      (unlocked ? '' : `<div class="lockCover"><span class="emoji">🔒</span><span>${esc(D.ROOMS[ri - 1].name)} ${E(D.ROOMS[ri - 1].icon)} ${(S.owned[D.ROOMS[ri - 1].id] || []).length}/${room.need}</span></div>`);
    $$('.item', roomEl).forEach(d => d.addEventListener('click', () => tapItem(+d.dataset.i, d)));
  }
  function label(d, text) {
    $$('.itemLabel', roomEl).forEach(x => { if (x._for === d) x.remove(); });
    const r = d.getBoundingClientRect(), h = roomEl.getBoundingClientRect();
    const l = document.createElement('div'); l.className = 'itemLabel lt'; l.textContent = text; l._for = d;
    const lw = Math.max(60, text.length * 14); let top = r.bottom - h.top + 2; if (top + 44 > h.height) top = Math.max(2, r.top - h.top - 44);
    l.style.left = Math.max(lw / 2, Math.min(h.width - lw / 2, r.left - h.left + r.width / 2)) + 'px'; l.style.top = top + 'px';
    roomEl.appendChild(l); setTimeout(() => l.remove(), 2600);
  }
  function doAct(d, it) {
    const act = D.ACTS[it[6]] || { a: 'jump', d: [] };
    if (it[6] === 'glow') d.classList.toggle('lit');
    if (it[6] === 'fire') fireAt(d);
    if (!DECO[act.a]) act.d.forEach((ch, k) => setTimeout(() => fxAt(d, ch, (rnd(2) ? 1 : -1) * (30 + rnd(40)), -50 - rnd(40), 1000), k * 260));
    return anim(d, act.a, roomEl);
  }
  function friendsOf(i) { return D.INTER.filter(x => x.room === room.id && (x.a === i || x.b === i) && own.includes(x.a) && own.includes(x.b)); }
  function tapItem(i, d) {
    const it = room.items[i]; const n = (taps[i] = (taps[i] || 0) + 1);
    label(d, it[0]);
    const fr = friendsOf(i);
    if (fr.length && n % 3 === 0) return interact(pick(fr));
    SFX.boing(); doAct(d, it);
    if (n % 3 === 2) say([['w', it[0]], ['p', `il-${room.id}-${i}`]].concat(fr.length ? [['p', 'inter_hint_0']] : []));
    else say(['w', it[0]]);
  }
  async function interact(x) {
    const A = $(`.item[data-i="${x.a}"]`, roomEl), B = $(`.item[data-i="${x.b}"]`, roomEl); if (!A || !B) return;
    const ia = room.items[x.a], ib = room.items[x.b];
    label(A, ia[0]); label(B, ib[0]); SFX.whoosh();
    say([['w', ia[0]], ['p', x.k]], { gap: 150 });
    await interAnim(x.t, A, B);
    if (!S.inter[x.k]) { S.inter[x.k] = 1; save(); addPoints(2, B); }
  }
  function interAnim(t, A, B) {
    const a = A.firstElementChild, b = B.firstElementChild;
    const ra = A.getBoundingClientRect(), rb = B.getBoundingClientRect();
    const dx = rb.left + rb.width / 2 - (ra.left + ra.width / 2), dy = rb.top + rb.height / 2 - (ra.top + ra.height / 2);
    a.style.display = b.style.display = 'inline-block';
    const tr = (x, y, s) => ({ transform: `translate(${x}px, ${y}px) scale(${s == null ? 1 : s})` });
    const go = (f, s) => [tr(0, 0), Object.assign(tr(dx * f, dy * f, s), { offset: .3 }), Object.assign(tr(dx * f, dy * f, s), { offset: .7 }), tr(0, 0)];
    A.style.zIndex = 5;
    const done = () => { A.style.zIndex = ''; };
    if (t === 'chase') return Promise.all([mv(a, [tr(0, 0), Object.assign(tr(dx * .85, dy * .85), { offset: .4 }), Object.assign(tr(dx * 1.2 + 60, dy), { offset: .6 }), tr(0, 0)], 2400), wait(700).then(() => mv(b, [tr(0, 0), tr(80, -20), tr(140, 10), tr(-60, 0), tr(0, 0)], 1800))]).then(done);
    if (t === 'ride') return Promise.all([mv(a, [tr(0, 0), Object.assign(tr(dx, dy - rb.height * .45, .8), { offset: .3 }), Object.assign(tr(dx, dy - rb.height * .55, .8), { offset: .5 }), Object.assign(tr(dx, dy - rb.height * .45, .8), { offset: .7 }), tr(0, 0)], 2800), wait(800).then(() => anim(B, 'bob1', roomEl))]).then(done);
    if (t === 'eat') return Promise.all([mv(a, go(.75), 2400), wait(700).then(() => { fxAt(B, '😋', 0, -60, 900); return mv(b, [tr(0, 0, 1), tr(0, 0, .25), tr(0, 0, .25), tr(0, 0, 1)], 1600); })]).then(done);
    if (t === 'fire') { anim(A, 'shake', roomEl); fireAt(A, B); return wait(600).then(() => anim(B, 'shake', roomEl)).then(done); }
    if (t === 'hatch') return anim(B, 'shake', roomEl).then(() => { burst(B); return mv(a, [tr(dx, dy, 0), Object.assign(tr(dx, dy - 30, 1.1), { offset: .3 }), Object.assign(tr(dx, dy, 1), { offset: .6 }), tr(0, 0)], 2200); }).then(done);
    if (t === 'orbit') { const R = Math.max(rb.width, rb.height) * .8, fr = []; for (let k = 0; k <= 12; k++) { const th = k / 12 * Math.PI * 2; fr.push(tr(dx + Math.cos(th + Math.PI) * R, dy + Math.sin(th + Math.PI) * R * .6, .8)); } return mv(a, [tr(0, 0)].concat(fr, [tr(0, 0)]), 3400).then(done); }
    if (t === 'friends') return Promise.all([mv(a, go(.5), 2600), wait(800).then(() => { anim(B, 'dance', roomEl); anim(A, 'dance', roomEl); ['💖', '💛', '💜'].forEach((h, k) => setTimeout(() => fxAt(B, h, -dx / 4 + rnd(40) - 20, -70, 1100), k * 250)); })]).then(done);
    if (t === 'lift') { anim(A, 'wiggle', roomEl); return mv(b, [tr(0, 0), tr(0, -rb.height * .9), tr(0, -rb.height * .9, 1.05), tr(0, 0)], 2200).then(done); }
    if (t === 'magic') { anim(A, 'grow', roomEl); for (let k = 0; k < 5; k++) setTimeout(() => fxAt(A, '✨', dx * (k + 1) / 5, dy * (k + 1) / 5 - 20, 700), k * 120); return wait(700).then(() => { burst(B); B.classList.add('lit'); setTimeout(() => B.classList.remove('lit'), 2500); return anim(B, 'spin', roomEl); }).then(done); }
    if (t === 'build') return Promise.all([mv(a, go(.7), 2400), wait(700).then(() => { anim(B, 'shake', roomEl); fxAt(B, '🔨', 0, -60, 900); fxAt(B, '✨', 30, -40, 900); })]).then(done);
    if (t === 'pop') return Promise.all([mv(a, go(.7), 2400), wait(800).then(() => { burst(B, ['🎉', '✨', '⭐', '🪙']); return anim(B, 'grow', roomEl); })]).then(done);
    if (t === 'music') { anim(A, 'sing', roomEl); ['🎵', '🎶', '🎵'].forEach((h, k) => setTimeout(() => fxAt(A, h, dx * .6, dy * .6 - 40, 900), k * 250)); return wait(500).then(() => anim(B, 'dance', roomEl)).then(done); }
    return anim(A, 'jump', roomEl).then(done);
  }
  function renderGoal() {
    if (!unlocked) { chip.innerHTML = `${E('🔒')} ${esc(D.ROOMS[ri - 1].name)} ${(S.owned[D.ROOMS[ri - 1].id] || []).length}/${room.need}`; return; }
    const left = room.items.map((it, i) => [it, i]).filter(([, i]) => !own.includes(i)).sort((a, b) => a[0][2] - b[0][2]);
    const parts = [];
    if (left.length) { const [it] = left[0]; parts.push(`${E('🎯')} ${E(it[1])} ⭐${it[2]}`); }
    else { const d = D.DECOR.find(x => !decor.includes(x.id)); if (d) parts.push(`${E('🎯')} ${E(d.e)} ⭐${decorPrice(d, ri)}`); else parts.push(`${E('🏆')} ${E(room.icon)}`); }
    const nr = D.ROOMS[ri + 1];
    if (nr && !roomUnlocked(ri + 1)) parts.push(`${E('🚪')}${E(nr.icon)} ${own.length}/${nr.need}`);
    chip.innerHTML = parts.join('<span class="sep"></span>');
  }
  chip.addEventListener('click', () => { SFX.tap(); say([['p', 'next_goal'], ['p', 'gallery_' + pick([5, 6, 9])]]); });
  function renderShop() {
    if (!unlocked) { shop.innerHTML = ''; return; }
    const items = room.items.map((it, i) => own.includes(i) ? '' : `<button class="shopItem ${S.stars >= it[2] ? 'can' : 'cant'}" data-i="${i}">${E(it[1])}<span class="pr">⭐ ${it[2]}</span></button>`).join('');
    const decs = roomLevel(room) >= 1 ? D.DECOR.filter(d => !decor.includes(d.id)).map(d => `<button class="shopItem decor ${S.stars >= decorPrice(d, ri) ? 'can' : 'cant'}" data-d="${d.id}">${E(d.e)}<span class="pr">⭐ ${decorPrice(d, ri)}</span></button>`).join('') : '';
    shop.innerHTML = items + decs;
    $$('.shopItem[data-i]', shop).forEach(b => b.addEventListener('click', () => buy(+b.dataset.i, b)));
    $$('.shopItem[data-d]', shop).forEach(b => b.addEventListener('click', () => buyDecor(b.dataset.d, b)));
    renderGoal();
  }
  function buy(i, b) {
    const it = room.items[i];
    if (S.stars < it[2]) { SFX.boing(); anim(b, 'shake'); return say([['w', it[0]], ['p', 'need_stars']]); }
    const lvBefore = roomLevel(room);
    S.stars -= it[2]; own.push(i); save(); renderStars(); SFX.buy();
    const wasLocked = ri + 1 < D.ROOMS.length && own.length === D.ROOMS[ri + 1].need;
    renderRoom(i); renderShop();
    const d = $(`.item[data-i="${i}"]`, roomEl); if (d) { burst(d); label(d, it[0]); setTimeout(() => doAct(d, it), 700); }
    const seq = [['w', it[0]], ['p', `il-${room.id}-${i}`]];
    if (roomLevel(room) > lvBefore) { seq.push(['p', 'room_level']); if (lvBefore === 0) seq.push(['p', 'gallery_8']); setTimeout(() => { const f = $('.rLv', roomEl); if (f) { anim(f, 'grow'); burst(f, ['⭐', '🌟']); } }, 900); }
    if (wasLocked) { seq.push(['p', 'new_room']); setTimeout(() => { const t = $$('.rTab', el)[ri + 1]; if (t) { t.classList.remove('locked'); t.innerHTML = E(D.ROOMS[ri + 1].icon) + `<span>${esc(D.ROOMS[ri + 1].name)}</span>`; anim(t, 'jump'); } }, 600); }
    if (own.length === room.items.length) seq.push(['p', 'p6']);
    say(seq, { gap: 120 });
  }
  function buyDecor(id, b) {
    const d = D.DECOR.find(x => x.id === id), price = decorPrice(d, ri);
    if (S.stars < price) { SFX.boing(); anim(b, 'shake'); return say([['p', 'decor-' + id], ['p', 'need_stars']]); }
    S.stars -= price; decor.push(id); save(); renderStars(); SFX.buy();
    renderRoom(); renderShop(); burst(roomEl, ['✨', '🌟', '🎉']);
    say([['p', 'decor-' + id], ['p', 'decor_bought']]);
  }
  renderRoom(); renderShop();
  const intro = [];
  if (!unlocked) intro.push(['w', room.name], ['p', 'room_locked']);
  else { intro.push(['p', 'rw-' + room.id]); if (!S.galSeen) { S.galSeen = 1; save(); intro.push(['p', 'gallery_intro'], ['p', 'gallery_1']); } else if (entering && rnd(3) === 0) intro.push(['p', 'gallery_' + pick([1, 2, 3, 4, 7])]); }
  prompt(intro);
  // warm this room's clips so they work offline next time
  warm(room.items.flatMap((it, i) => [['w', it[0]], ['p', `il-${room.id}-${i}`]]).concat(D.INTER.filter(x => x.room === room.id).map(x => ['p', x.k])));
  window.__gallery = { room, tapItem: (i) => { const d = $(`.item[data-i="${i}"]`, roomEl); if (d) tapItem(i, d); }, interact: (k) => { const x = D.INTER[k]; if (x) interact(x); }, friendsOf, renderRoom, renderShop };
}

// ================= boot =================
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (!e.target.closest('.shop, .roomTabs, .card, .levelMap, .shelves')) e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hush(); });
window.__app = { S: () => S, save, go, addPoints, say, AU, D, reader, gallery, actionHome, rainPlay, racePlay, speakable, clip, loadBuf, anim };
start();
})();
