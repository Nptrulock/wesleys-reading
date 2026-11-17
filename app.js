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
  D.WG = C.WG; D.VANISH = C.VANISH; D.PMATCH = C.PMATCH; D.ACT_MIX_AT = C.ACT_MIX_AT; D.AUDIO_WORDS = C.AUDIO_WORDS || [];
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
const DEF = { v: 5, medals: [0, 0, 0], wg: { got: [], font: '', seen: 0 }, van: { lv: 0, unlocked: 0, prog: {}, step: {}, seen: {}, best: {} }, pm: { lv: 0, unlocked: 0, prog: {}, recent: [] }, stars: 0, points: 0, totalStars: 0, rain: { lv: 6, good: {}, done: 0, unlocked: 6, prog: {}, vi: {} }, story: { read: {}, pages: {}, shelves: 1 },
  race: { lv: 0, good: {}, done: 0, unlocked: 0, prog: {} }, act: { lv: 0, good: 0, done: 0, seen: {}, unlocked: 0, prog: {} }, owned: {}, decor: {}, inter: {}, upper: false, letterSounds: 'auto',
  log: { words: 0, sentences: 0, matches: 0, stories: 0, minutes: 0, firstPlay: 0, lastPlay: 0, misses: 0 }, hard: {} };
let S;
function load() {
  try { S = Object.assign(JSON.parse(JSON.stringify(DEF)), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = JSON.parse(JSON.stringify(DEF)); }
  for (const k of ['rain', 'story', 'race', 'act', 'log', 'van', 'pm']) S[k] = Object.assign(JSON.parse(JSON.stringify(DEF[k])), S[k] || {});
  if (!localStorage.getItem(KEY)) S.v = 5;
  if (!S.wg || !S.wg.got) S.wg = { got: [], font: '', seen: 0 }; if (!S.medals) S.medals = [0, 0, 0];
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
// v4: Action Words became a 20-level ladder of clear sub-modes; old levels (a1..a8) map onto it
(function migrate4() {
  if ((S.v || 1) >= 4) return;
  const AM = [0, 3, 6, 9, 11, 13, 16, 17], m = (k) => AM[Math.max(0, Math.min(7, k | 0))];
  S.act.lv = m(S.act.lv); S.act.unlocked = Math.max(S.act.lv, m(S.act.unlocked));
  S.migratedFrom4 = S.v; S.v = 4; save();
})();
// v5: no more practice-day gates. Every level has 10 bronze stars (open the next level), 10 silver, 10 gold.
// Old progress becomes bronze stars (a level that was passed, or whose points goal was met = 10 bronze).
(function migrate5() {
  if ((S.v || 1) >= 5) return;
  const MODES = { rain: [D.RAIN_LEVELS, (i) => D.RAIN_LEVELS[i].need], race: [D.RACE_LEVELS, (i) => raceNeed(i).need], act: [D.ACT_LEVELS, (i) => D.ACT_LEVELS[i].need],
    van: [D.VANISH.LEVELS, (i) => D.VANISH.LEVELS[i].need], pm: [D.PMATCH.LEVELS, (i) => D.PMATCH.LEVELS[i].need] };
  let bronze = 0;
  Object.entries(MODES).forEach(([key, [levels, need]]) => {
    const st = S[key]; if (!st) return; st.prog = st.prog || {};
    levels.forEach((L, i) => {
      const p = st.prog[L.id]; let ls = 0;
      if (p) ls = p.pts >= need(i) ? 10 : Math.min(9, Math.round((p.pts || 0) / need(i) * 10));
      if (i < (st.unlocked | 0) && (p || key !== 'rain' || i >= 6)) ls = Math.max(ls, 10);
      if (ls) { const q = progOf(st.prog, L.id); q.ls = Math.max(q.ls || 0, ls); if (q.ls >= 10) bronze++; }
    });
    while ((st.unlocked | 0) < levels.length - 1 && ((st.prog[levels[st.unlocked | 0].id] || {}).ls || 0) >= 10) st.unlocked = (st.unlocked | 0) + 1;
  });
  S.medals[0] += bronze; for (let k = 0; k < bronze; k++) grantReward();
  S.migratedFrom5 = S.v; S.v = 5; save();
})();
['rain', 'race', 'act', 'van', 'pm'].forEach(k => { const n = ({ rain: D.RAIN_LEVELS, race: D.RACE_LEVELS, act: D.ACT_LEVELS, van: D.VANISH.LEVELS, pm: D.PMATCH.LEVELS })[k].length - 1; S[k].lv = Math.max(0, Math.min(n, S[k].lv | 0)); S[k].unlocked = Math.min(n, Math.max(S[k].unlocked | 0, S[k].lv)); });

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
  D.AUDIO_WORDS.forEach(w); D.PMATCH.RIDDLES.forEach(r => w(r.w)); D.WG.SECRET.concat(D.WG.STICKERS).forEach(x => w(x.w));
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
  ({ home, rain: rainMap, story: shelf, race: raceMap, action: actMap, vanish: vanMap, match: pmMap, words: () => wordGalleries(), gallery }[where] || home)();
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
    <button class="tile vanish" data-mode="vanish"><span class="big emoji">🪄</span><span>Vanishing</span></button>
    <button class="tile match" data-mode="match"><span class="big emoji">🔍</span><span>Picture Match</span></button>
    <button class="tile words" data-mode="words"><span class="big emoji">🎖️</span><span>Word Galleries</span>${S.wg.got.length > (S.wg.seen || 0) ? `<span class="badge">${E('✨')} ${S.wg.got.length - (S.wg.seen || 0)}</span>` : ''}</button>
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
  <h3>Levels</h3><div class="note">Choosing a level here also unlocks it and every level before it. Each round earns 1–3 stars for that level (3 = mostly first tries). 10 stars = bronze medal and the next level opens right away; 20 = silver, 30 = gold. Every medal unlocks a Word Galleries reward (secret words, stickers, fancy letters). No waiting days.</div>
  <label>Letter Rain ${sel('pRain', D.RAIN_LEVELS.map((l, i) => `${i + 1}. ${l.name} ${rainStars(i) ? ' ' + rainStars(i) + '/30★' : ''}${i > S.rain.unlocked ? ' 🔒' : ''}`), S.rain.lv)}</label>
  <label>Word Race ${sel('pRace', D.RACE_LEVELS.map((l, i) => `${i + 1}. ${l.name} — ${l.example} ${raceStars(i) ? ' ' + raceStars(i) + '/30★' : ''}${i > S.race.unlocked ? ' 🔒' : ''}`), S.race.lv)}</label>
  <label>Action Words ${sel('pAct', D.ACT_LEVELS.map((l, i) => `${i + 1}. ${l.name} ${actStars(i) ? ' ' + actStars(i) + '/30★' : ''}${i > S.act.unlocked ? ' 🔒' : ''}`), S.act.lv)}</label>
  <label>Vanishing ${sel('pVan', D.VANISH.LEVELS.map((l, i) => `${i + 1}. ${l.name} — ${l.tpl[0]} ${ladStars('van', i) ? ' ' + ladStars('van', i) + '/30★' : ''}${i > S.van.unlocked ? ' 🔒' : ''} (help step ${(S.van.step[l.id] || 0) + 1}/5)`), S.van.lv)}</label>
  <label>Picture Match ${sel('pPm', D.PMATCH.LEVELS.map((l, i) => `${i + 1}. ${l.name} ${ladStars('pm', i) ? ' ' + ladStars('pm', i) + '/30★' : ''}${i > S.pm.unlocked ? ' 🔒' : ''}`), S.pm.lv)}</label>
  <label><input type="checkbox" id="pUpper" ${S.upper ? 'checked' : ''}> Show CAPITAL letters (lowercase is the default)</label>
  <label>Letter Rain says ${sel('pSnd', ['letter sounds for decodable words, names for others (default)', 'always letter sounds', 'always letter names'], ['auto', 'sounds', 'names'].indexOf(S.letterSounds))}</label>
  <label>Voice player ${sel('pEng', ['Web Audio — smooth, gapless (default)', 'HTML audio — use if the iPad is on silent and you hear nothing'], S.engine === 'html' ? 1 : 0)}</label>
  <h3>Sound check</h3><button class="pbtn" id="pTest">▶ Play a test word</button> <span id="pTestRes" class="note"></span>
  <h3>Offline</h3><div class="note">Sounds are saved for offline use as Wesley plays each level, story and room. To save all ${speakable().length} sounds now (about 21 MB), tap below on Wi-Fi.</div><button class="pbtn" id="pDl">⬇ Save all sounds for offline</button> <span id="pDlRes" class="note"></span>
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
    S.act.lv = +$('#pAct', o).value; S.act.unlocked = Math.max(S.act.unlocked, S.act.lv);
    S.van.lv = +$('#pVan', o).value; S.van.unlocked = Math.max(S.van.unlocked, S.van.lv); S.pm.lv = +$('#pPm', o).value; S.pm.unlocked = Math.max(S.pm.unlocked, S.pm.lv); S.upper = $('#pUpper', o).checked; S.letterSounds = ['auto', 'sounds', 'names'][+$('#pSnd', o).value]; S.engine = +$('#pEng', o).value ? 'html' : 'webaudio';
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
// ================= medals: 10 bronze stars open the next level, then 10 silver, then 10 gold =================
const TIER = ['bronze', 'silver', 'gold'], MEDAL = ['🥉', '🥈', '🥇'];
function medalBars(ls, big) { return `<span class="medals ${big ? 'big' : ''}">${[0, 1, 2].map(t => `<i class="m${t}"><b style="width:${Math.max(0, Math.min(10, ls - t * 10)) * 10}%"></b></i>`).join('')}</span>`; }
function tierText(ls) { if (ls >= 30) return `${MEDAL[2]} ${MEDAL[1]} ${MEDAL[0]}`; const t = Math.floor(ls / 10); return `${ls - t * 10} of 10 ${MEDAL[t]}`; }
function grantReward() { const T = D.WG.TRACK, k = S.wg.got.length; if (k >= T.length) return null; const r = T[k]; S.wg.got.push(r[0] + ':' + r[1]); return r; }
function rewardInfo(r) { const [type, id] = r; const list = type === 'font' ? D.WG.FONTS : type === 'sticker' ? D.WG.STICKERS : D.WG.SECRET; const x = list.find(v => (v.w || v.id) === id); return Object.assign({ type }, x); }
// one round finished: 1-3 stars toward this level's medals (3 = mostly first tries); no gates, no losing
function medalAward(key, levels, i, rate) {
  const L = levels[i], p = progOf(S[key].prog, L.id), before = p.ls || 0;
  const gain = rate >= .8 ? 3 : rate >= .5 ? 2 : 1;
  p.ls = Math.min(30, before + gain); p.rounds = (p.rounds || 0) + 1;
  const crossed = [10, 20, 30].filter(t => before < t && p.ls >= t).map(t => t / 10 - 1);
  let levelUp = false;
  if (p.ls >= 10 && S[key].unlocked <= i && i < levels.length - 1) { S[key].unlocked = i + 1; levelUp = true; }
  const rewards = [];
  crossed.forEach(t => { S.medals[t]++; for (let k = 0; k < (t === 2 ? 2 : 1); k++) { const r = grantReward(); if (r) rewards.push(r); } });
  save();
  return { before, after: p.ls, gain, crossed, levelUp, rewards,
    nextLevel: (play) => i + 1 < levels.length && i + 1 <= S[key].unlocked ? () => { S[key].lv = i + 1; save(); play(); } : null };
}
function roundDone(again, extra) {
  extra = extra || {}; const m = extra.medal;
  SFX.tada();
  const hasNext = !!extra.nextLevel, top = m && m.crossed.length ? m.crossed[m.crossed.length - 1] : -1;
  const mid = m ? `<div class="lvStars">${Array.from({ length: m.gain }, () => '<span class="emoji new">⭐</span>').join('')}</div>${medalBars(m.before, true)}<div class="tierTxt">${tierText(m.before)}</div><div class="medalFx"></div>` : '';
  const o = overlay(`<div class="huge emoji">${top >= 0 ? MEDAL[top] : extra.levelUp ? '🏆' : '🌟'}</div><h2>${top >= 0 ? TIER[top][0].toUpperCase() + TIER[top].slice(1) + ' medal!' : 'You did it!'}</h2>${mid}
  <div class="row"><button class="navBtn go" data-a="more" aria-label="Play more">${E('🔁')}</button>${hasNext ? `<button class="navBtn next" data-a="next" aria-label="Next level">${E('⏭️')}</button>` : ''}<button class="navBtn" data-a="home" aria-label="Home">${E('🏠')}</button></div>`, 'doneCard');
  burst($('.huge', o));
  const items = [praise(), line('round') || ['p', 'round_done']];
  if (m) {
    if (m.crossed.length) {
      m.crossed.forEach(t => items.push(line('medal_' + TIER[t])));
      m.rewards.forEach(r => { items.push(line('reward_' + r[0])); if (r[0] !== 'font') items.push(['w', r[1]]); });
    } else if (m.after >= 30) items.push(['p', 'all_gold']);
    else { const t = Math.floor(m.after / 10), rem = 10 - (m.after - t * 10); items.push(['p', `more_${'bsg'[t]}_${rem}`]); }
  }
  if (extra.sayAfter) items.push(extra.sayAfter);
  lastPrompt = items; say(items);
  $$('.lvStars .new', o).forEach((s, k) => setTimeout(() => { s.classList.add('pop'); SFX.star(); }, 400 + k * 300));
  if (m) setTimeout(() => {
    $$('.medals.big b', o).forEach((b, t) => { b.style.width = Math.max(0, Math.min(10, m.after - t * 10)) * 10 + '%'; });
    const tt = $('.tierTxt', o); if (tt) tt.textContent = tierText(m.after);
  }, 400 + m.gain * 300);
  if (top >= 0) setTimeout(() => medalShow(o, m), 900 + m.gain * 300);
  o.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; SFX.tap(); o.remove();
    if (b.dataset.a === 'more') again(); else if (b.dataset.a === 'next') { extra.nextLevel(); say(['p', 'next_level']); } else home();
  });
}
// the medal spins in with a boom, confetti flies, and each reward pops out and does its action
function medalShow(o, m) {
  const fx = $('.medalFx', o); if (!fx || !o.isConnected) return;
  const t = m.crossed[m.crossed.length - 1];
  fx.innerHTML = `<span class="medalBig emoji">${MEDAL[t]}</span>` + m.rewards.map(r => { const x = rewardInfo(r); return `<span class="rewardChip ${x.type}"><span class="emoji">${x.e}</span><b>${esc(x.w || x.name)}</b></span>`; }).join('');
  const mb = $('.medalBig', fx);
  if (mb.animate) mb.animate([{ transform: 'scale(0) rotate(-540deg)' }, { transform: 'scale(1.6) rotate(20deg)', offset: .6 }, { transform: 'scale(1) rotate(0)' }], { duration: 1000, easing: 'ease-out' });
  SFX.boom(); setTimeout(() => { burst(mb, ['🎉', '🎊', '⭐', MEDAL[t]]); burst(mb, ['✨', '🌟', '💥']); cheerPal(); }, 600);
  $$('.rewardChip', fx).forEach((c, k) => { c.style.opacity = 0; setTimeout(() => { c.style.opacity = 1; payoff(c, { cheer: false, kind: 'zing' }); const r = rewardInfo(m.rewards[k]); anim(c.firstElementChild, r.a || 'jump'); }, 1400 + k * 700); });
}
function levelMap(id, title, levels, cur, unlocked, onPick, bg) {
  show(id, topBar(title) + `<div class="levelMap">${levels.map((l, i) => `<button class="lvBtn ${i > unlocked ? 'locked' : ''} ${i === cur ? 'cur' : ''}" data-i="${i}" style="background:${l.color || bg}">
    <span class="num">${i + 1}</span><span class="big emoji">${i > unlocked ? '🔒' : l.icon}</span><span class="nm">${esc(l.name)}</span>${i <= unlocked && l.stars != null ? medalBars(l.stars) : ''}</button>`).join('')}</div>`, (el) => {
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
function levelStars(p) { return p ? Math.min(30, p.ls || 0) : 0; }   // v5: medal stars 0-30 (10 bronze, 10 silver, 10 gold)
function rainStars(i) { return levelStars(S.rain.prog[D.RAIN_LEVELS[i].id]); }
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
  const el = show('rain', topBar(`${E(lv.icon)} ${esc(lv.name)}`, { back: 'rain', backIcon: '⬅️' }) + `<div class="rainHead"><div class="rainPic emoji"></div><div class="slots"></div><div class="rainProg">${medalBars(rainStars(lvIdx))}</div></div><div class="field"></div>`);
  const field = $('.field', el), slotsEl = $('.slots', el), picEl = $('.rainPic', el), progBar = null;
  const showProg = () => {};
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
    slotsEl.classList.toggle('long', gs.join('').length > 6); slotsEl.classList.toggle('xlong', gs.length > 8 && !isWordV()); slotsEl.classList.toggle('words', isWordV());
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
    const m = medalAward('rain', D.RAIN_LEVELS, lvIdx, earned / Math.max(1, wi || N));
    addPoints(3, $('.rainHead'));
    roundDone(rainPlay, { medal: m, levelUp: m.levelUp, nextLevel: m.nextLevel(rainPlay) });
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
function raceStars(i) { return levelStars(S.race.prog[D.RACE_LEVELS[i].id]); }
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
      const m = medalAward('race', D.RACE_LEVELS, lvIdx, 1);
      roundDone(racePlay, { medal: m, levelUp: m.levelUp, nextLevel: m.nextLevel(racePlay) });
    } else newSentence();
  }
  nextBtn(el, () => { if (!alive) return; hush(); round = Math.min(round, 3); newSentence(); }, 'Next sentence');
  newSentence();
  window.__race = { place: () => { const c = garage.firstChild; if (c) place(c); }, si: () => si, refresh: () => refresh.click(), L };
}

// ================= v4 shared: level ladders + action payoffs =================
// one helper for the Vanishing / Picture Match / Action Words ladders: stars from points + practice days
function ladStars(key, i) {
  return levelStars(S[key].prog[LADDER[key]()[i].id]);
}
const LADDER = { van: () => D.VANISH.LEVELS, pm: () => D.PMATCH.LEVELS, act: () => D.ACT_LEVELS };
let RR = { n: 0, ok: 0 };   // this round's answers (for 1-3 medal stars)
function ladCredit(key, n, clean) { const L = LADDER[key]()[S[key].lv], p = progOf(S[key].prog, L.id); p.pts = Math.round((p.pts + n) * 10) / 10; RR.n++; if (clean) RR.ok++; save(); }
function ladEnd(key, again, extra) {
  extra = extra || {};
  const i = S[key].lv, levels = LADDER[key]();
  if (extra.pre) extra.pre();
  const m = medalAward(key, levels, i, RR.n ? RR.ok / RR.n : 1); RR = { n: 0, ok: 0 };
  roundDone(again, Object.assign({}, extra, { medal: m, levelUp: m.levelUp, nextLevel: m.nextLevel(again) }));
}
function ladMap(key, id, title, play, extraHtml) {
  levelMap(id, title, LADDER[key]().map((l, i) => Object.assign({}, l, { stars: ladStars(key, i) })), S[key].lv, S[key].unlocked, (i) => { S[key].lv = i; save(); play(); });
  if (extraHtml) { const el = $('#' + id); el.insertAdjacentHTML('beforeend', extraHtml); }
}
// extra synth sound effects for the action payoffs
let NOISE = null;
function noise(t0, dur, vol, f) {
  const c = audioCtx(); if (!c) return;
  if (!NOISE) { NOISE = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = c.createBufferSource(), g = c.createGain(), bq = c.createBiquadFilter(); s.buffer = NOISE; bq.type = 'lowpass'; bq.frequency.value = f || 1200;
  const t = c.currentTime + (t0 || 0); g.gain.setValueAtTime(vol || .25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(bq); bq.connect(g); g.connect(c.destination); s.start(t); s.stop(t + dur + .05);
}
SFX.zing = () => { tone(400, 0, .25, 'triangle', .14, 1600); tone(800, .1, .25, 'sine', .1, 2400); };
SFX.crash = () => { noise(0, .45, .3, 900); tone(120, 0, .3, 'square', .08, 50); };
SFX.boom = () => { noise(0, .7, .35, 500); tone(90, 0, .5, 'sine', .25, 40); [784, 988, 1319].forEach((f, i) => tone(f, .25 + i * .07, .25, 'triangle', .1)); };
SFX.poof = () => { noise(0, .35, .18, 3000); tone(1200, 0, .3, 'sine', .08, 300); };
SFX.magic = () => { [1047, 1319, 1568, 2093, 1568, 2093].forEach((f, i) => tone(f, i * .06, .2, 'sine', .08)); };
// a big, quick celebration on any element: star explosion, shake-pop, and Sparky pops up to cheer
function payoff(el, opt) {
  opt = opt || {};
  if (!el) return;
  const k = opt.kind || pick(['boom', 'zing', 'crash']);
  SFX[k](); burst(el, opt.chars || ['⭐', '🌟', '✨', '💥']); setTimeout(() => burst(el, ['⭐', '🎉', '✨']), 180);
  if (el.animate) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-4deg)' }, { transform: 'scale(.95) rotate(3deg)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-out' });
  if (opt.cheer !== false) cheerPal();
}
function cheerPal() {
  const fx = $('#fx'); const s = document.createElement('div'); s.className = 'cheerPal';
  s.innerHTML = `<span class="emoji">${pick(['🐉', '🐉', '🦖', '🤖', '🦄'])}</span><span class="emoji pom">${pick(['🎉', '🙌', '⭐', '💥'])}</span>`;
  s.style.left = (8 + rnd(70)) + '%'; fx.appendChild(s);
  const a = s.animate ? s.animate([{ transform: 'translateY(110%)' }, { transform: 'translateY(-8%)', offset: .25 }, { transform: 'translateY(0) rotate(-8deg)', offset: .4 }, { transform: 'translateY(-14%) rotate(8deg)', offset: .55 }, { transform: 'translateY(0)', offset: .75 }, { transform: 'translateY(110%)' }], { duration: 1500, easing: 'ease-in-out' }) : null;
  setTimeout(() => s.remove(), 1550);
}
// keep an emoji moving forever (cards show an action, idle characters bob)
function loopAnim(el, a, delay) {
  if (!el || !ANIM[a] || !el.animate) return;
  const inner = el.firstElementChild && el.firstElementChild.tagName === 'SPAN' ? el.firstElementChild : el; inner.style.display = 'inline-block';
  const [k, d] = ANIM[a]; return inner.animate(k, { duration: d, iterations: Infinity, delay: delay || 0, easing: 'ease-in-out' });
}
const ACT_TAG = { sleep: '💤', sing: '🎵', swim: '🌊', fly: '☁️', hide: '🌳', dance: '🎶', wave: '👋', zoom: '💨', fall: '💥', roll: '⚽' };
const capFirst = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
const bare = (t) => t.replace(/[^a-z']/gi, '').toLowerCase();

// ================= VANISHING =================
// A phrase with word spaces. He picks the right word tile for each space. Supports for the target word
// fade out step by step (🔊 its sound, 🖼️ its picture, 🔤 its letters: full → first letter → none). A
// clean round takes one more support away (with a magic "poof"); a miss brings one back for that word.
const VSTEP = [{ au: 1, pic: 1, let: 2 }, { au: 0, pic: 1, let: 2 }, { au: 0, pic: 0, let: 2 }, { au: 0, pic: 0, let: 1 }, { au: 0, pic: 0, let: 0 }];
const VWEIGHT = [.4, .6, .8, 1, 1.2];
function vanMap() {
  ladMap('van', 'vanMap', 'Vanishing', vanPlay);
  prompt([line('van_intro') || ['p', 'pick_level']]);
}
function vanPhrase(L, last) {
  const bank = D.VANISH.BANK.filter(b => L.bands.includes(b.b)), used = new Set();
  const take = (c) => { const pool = bank.filter(b => b.c === c && !used.has(b.w)); const w = pick(pool.length ? pool : bank.filter(b => b.c === c)); used.add(w.w); return w; };
  let tpl, k = 0; do { tpl = pick(L.tpl); } while (tpl === last && L.tpl.length > 1 && k++ < 4);
  const toks = tpl.split(' ').map(t => { const core = t.replace(/[,!]/g, ''), p = t.slice(core.length);
    return 'NVA'.includes(core) ? { slot: true, b: take(core), p } : { t: core, p }; });
  const maxB = Math.max.apply(null, L.bands), all = D.VANISH.BANK.filter(b => b.b <= maxB);
  toks.filter(t => t.slot).forEach(t => {
    const w = t.b.w, sim = (x) => (x.w[0] === w[0] ? 3 : 0) + (x.w.length === w.length ? 2 : 0) + (x.w.slice(-1) === w.slice(-1) ? 2 : 0) + [...new Set(x.w)].filter(ch => w.includes(ch)).length + Math.random() * 2;
    const cand = all.filter(x => x.c !== t.b.c && x.w !== w).sort((a, b) => sim(b) - sim(a)).slice(0, 6);
    t.opts = shuffle([t.b].concat(shuffle(cand).slice(0, L.ch - 1)));
  });
  return { tpl, toks };
}
function vanPlay() {
  RR = { n: 0, ok: 0 };
  const lvIdx = S.van.lv, L = D.VANISH.LEVELS[lvIdx];
  const step = S.van.step[L.id] || 0, seenStep = S.van.seen[L.id] == null ? 0 : S.van.seen[L.id];
  const N = 3; let n = 0, alive = true, pid = 0, lastTpl = null, firstTries = 0, slotsTotal = 0;
  const el = show('vanish', topBar(`${E(L.icon)} ${esc(L.name)}`, { back: 'vanish', backIcon: '⬅️' }) + `<div class="vanTop"><div class="supports"></div><div class="vanProg"><i></i></div></div>
    <div class="vanStage"><div class="vanPhrase lt"></div><div class="vanPal"><span class="emoji">🐉</span></div></div><div class="vanTiles"></div>`);
  const phEl = $('.vanPhrase', el), tilesEl = $('.vanTiles', el), supEl = $('.supports', el), pal = $('.vanPal', el), bar = $('.vanProg i', el);
  cleanup = () => { alive = false; };
  loopAnim(pal, 'bob1');
  function drawSup(s) {
    supEl.innerHTML = [['au', '🔊'], ['pic', '🖼️'], ['let', '🔤']].map(([k, ic]) => `<span class="sup ${s[k] ? 'on' : 'off'} ${k === 'let' && s.let === 1 ? 'half' : ''}" data-s="${k}">${E(ic)}</span>`).join('');
  }
  async function phrase() {
    if (!alive) return;
    if (n >= N) return finish();
    n++; bar.style.width = ((n - 1) / N * 100) + '%';
    const my = ++pid, still = () => alive && my === pid;
    const ph = vanPhrase(L, lastTpl); lastTpl = ph.tpl;
    const magic = n === 1 && step > seenStep;   // a support vanishes this round: show it first, then poof
    const showStep = magic ? Math.min(seenStep, step) : step;
    ph.toks.forEach(t => { if (t.slot) t.s = Object.assign({}, VSTEP[showStep]); });
    drawSup(VSTEP[showStep]);
    let si = ph.toks.findIndex(t => t.slot);
    phEl.innerHTML = ph.toks.map((t, i) => {
      const disp = i === 0 ? capFirst(t.t || '') : (t.t || '');
      if (!t.slot) return `<button class="vw" data-i="${i}">${esc(disp)}${esc(t.p)}</button>`;
      return `<div class="vslot" data-i="${i}"><span class="vpic emoji">${t.b.e}</span><span class="vlet"></span><span class="vfill"></span></div>${t.p ? `<span class="vp">${esc(t.p)}</span>` : ''}`;
    }).join(' ');
    phEl.classList.toggle('long', ph.toks.length > 5);
    const slotEl = (i) => $(`.vslot[data-i="${i}"]`, phEl);
    const drawSlot = (i) => { const t = ph.toks[i], e = slotEl(i); if (!e) return; const w = i === 0 ? capFirst(t.b.w) : t.b.w;
      e.classList.toggle('noPic', !t.s.pic); $('.vlet', e).innerHTML = t.s.let === 2 ? esc(w) : t.s.let === 1 ? `<b>${esc(w[0])}</b>${'<i>_</i>'.repeat(w.length - 1)}` : `<i class="q">?</i>`; };
    ph.toks.forEach((t, i) => t.slot && drawSlot(i));
    preload(ph.toks.map(t => ['w', t.slot ? t.b.w : t.t]));
    $$('.vw', phEl).forEach(b => b.addEventListener('click', () => { const t = ph.toks[+b.dataset.i]; anim(b, 'jump2'); if (step < 4) say(['w', t.t]); }));
    // read the phrase: fixed words aloud (until the no-help step); a target word only if its 🔊 is on
    const hlTok = (i) => $$('.vw, .vslot', phEl).forEach(x => x.classList.toggle('hl', +x.dataset.i === i));
    const readIt = async (all) => {
      let run = [];
      const flush = async () => { if (run.length) { const r = run; run = []; await say(r, { gap: 90 }); } };
      for (let i = 0; i < ph.toks.length; i++) {
        if (!still()) return; const t = ph.toks[i];
        if (t.slot && !(t.s.au || all)) { await flush(); if (!still()) return; hlTok(i); tone(660, 0, .12, 'sine', .1); tone(990, .12, .14, 'sine', .08); await wait(520); continue; }
        run.push({ k: 'w', id: t.slot ? t.b.w : t.t, on: () => hlTok(i) });
      }
      await flush();
    };
    const intro = n === 1 && !magic ? [line('van_intro')] : [];
    if (intro.length) { await say(intro); if (!still()) return; }
    if (magic) {
      // show the old supports, then make one (or more) vanish with a wand + sparkle poof
      await wait(700); if (!still()) return;
      const was = VSTEP[seenStep], now = VSTEP[step];
      const wand = document.createElement('div'); wand.className = 'wand emoji'; wand.textContent = '🪄'; el.appendChild(wand);
      const slots = $$('.vslot', phEl);
      if (wand.animate && slots.length) { const r0 = slots[0].getBoundingClientRect(), r1 = slots[slots.length - 1].getBoundingClientRect(), h = el.getBoundingClientRect();
        wand.animate([{ transform: `translate(${r0.left - h.left - 40}px, ${r0.top - h.top - 60}px) rotate(-20deg)` }, { transform: `translate(${r1.right - h.left}px, ${r1.top - h.top - 60}px) rotate(20deg)` }], { duration: 1200, easing: 'ease-in-out', fill: 'forwards' }); }
      SFX.magic(); await wait(900);
      slots.forEach(s => { burst(s, ['✨', '🌟', '💫']); s.classList.add('poofing'); });
      SFX.poof();
      ph.toks.forEach((t, i) => { if (t.slot) { t.s = Object.assign({}, now); setTimeout(() => drawSlot(i), 350); } });
      setTimeout(() => { drawSup(now); $$('.sup.off', supEl).forEach(x => { burst(x, ['💨', '✨']); }); }, 350);
      setTimeout(() => { slots.forEach(s => s.classList.remove('poofing')); wand.remove(); }, 900);
      const cat = now.let === 0 ? 'van_poof_all' : now.let < was.let ? 'van_poof_letters' : now.pic < was.pic ? 'van_poof_pic' : 'van_poof_audio';
      S.van.seen[L.id] = step; save();
      await say([line(cat)]); if (!still()) return;
    } else if (n === 1) { S.van.seen[L.id] = step; save(); }
    if (step < 4) { await readIt(false); if (!still()) return; }
    $$('.hl', phEl).forEach(x => x.classList.remove('hl'));
    nextSlot();
    function nextSlot() {
      if (!still()) return;
      $$('.vslot', phEl).forEach(x => x.classList.remove('cur'));
      if (si < 0) return phraseDone();
      const t = ph.toks[si], e = slotEl(si); e.classList.add('cur'); e._w = t.b.w;
      let miss = 0;
      tilesEl.innerHTML = t.opts.map(o => `<button class="vtile lt" data-w="${esc(o.w)}">${esc(si === 0 ? capFirst(o.w) : o.w)}</button>`).join('');
      tilesEl.classList.toggle('four', t.opts.length > 3);
      $$('.vtile', tilesEl).forEach(b => b.addEventListener('click', async () => {
        if (!still() || b.disabled) return;
        if (b.dataset.w === t.b.w) {
          $$('.vtile', tilesEl).forEach(x => x.disabled = true);
          slotsTotal++; if (!miss) firstTries++;
          b.classList.add('right'); flyInto(b, e, t);
          ladCredit('van', itemScore(miss) * VWEIGHT[step], !miss); addPoints(miss ? 1 : 3, e); S.log.words++;
          await say([['w', t.b.w], line('cheer') || praise()]); if (!still()) return;
          si = ph.toks.findIndex((x, j) => j > si && x.slot); nextSlot();
        } else {
          miss++; S.hard[t.b.w] = (S.hard[t.b.w] || 0) + 1; SFX.boing(); anim(b, 'shake'); b.classList.add('wrongish'); b.disabled = true;
          // gentle: bring one support back for this word
          const s = t.s; let back = false;
          if (s.let < 2) { s.let++; back = true; } else if (!s.pic) { s.pic = 1; back = true; } else if (!s.au) { s.au = 1; back = true; }
          drawSlot(si); if (back) { burst(e, ['✨', '💡']); SFX.magic(); }
          const items = [['p', 'that_says'], ['w', b.dataset.w]]; if (back) items.push(line('van_help')); else items.push(oops());
          if (t.s.au) items.push(['w', t.b.w]);
          say(items);
        }
      }));
      if (si === ph.toks.findIndex(x => x.slot) && n === 1) say([line('van_pick')]);
    }
    function flyInto(b, e, t) {
      // the word zooms into its space, the picture pops out and acts, stars explode
      const f = $('.vfill', e); f.textContent = si === 0 ? capFirst(t.b.w) : t.b.w; e.classList.add('done');
      const br = b.getBoundingClientRect(), er = e.getBoundingClientRect();
      if (f.animate) f.animate([{ transform: `translate(${br.left - er.left}px, ${br.top - er.top}px) scale(1.2)` }, { transform: 'translate(0,0) scale(1.3)', offset: .7 }, { transform: 'translate(0,0) scale(1)' }], { duration: 450, easing: 'ease-out' });
      setTimeout(() => { payoff(e, { cheer: false }); const pic = $('.vpic', e); pic.classList.add('show'); const a = t.b.c === 'V' ? (ACT_OF[t.b.w] || 'jump') : pick(['jump', 'spin', 'bob1', 'dance']); anim(pic, a); anim(pal, t.b.c === 'V' ? (ACT_OF[t.b.w] || 'jump') : 'jump'); }, 380);
    }
    async function phraseDone() {
      tilesEl.innerHTML = '';
      // whole phrase read back with every word lit, then a big cheer
      await wait(300); if (!still()) return;
      ph.toks.forEach(t => { if (t.slot) t.s.au = 1; });
      await readIt(true); if (!still()) return;
      $$('.hl', phEl).forEach(x => x.classList.remove('hl'));
      payoff(phEl, { kind: 'boom' }); const vs = ph.toks.find(t => t.slot && t.b.c === 'V'); anim(pal, vs ? (ACT_OF[vs.b.w] || 'flip') : 'flip');
      await wait(900); if (!still()) return;
      phrase();
    }
  }
  function finish() {
    bar.style.width = '100%';
    const rate = slotsTotal ? firstTries / slotsTotal : 0; let dir = 0;
    const extra = {}; extra.pre = () => {
      if (rate >= .75) { if (step >= 4) S.van.best[L.id] = 4; if (step < 4) { S.van.step[L.id] = step + 1; dir = 1; } }
      else if (rate < .4 && step > 0) { S.van.step[L.id] = step - 1; S.van.seen[L.id] = step - 1; dir = -1; }
      if (dir) extra.sayAfter = line(dir > 0 ? 'van_step_up' : 'van_step_down');
    };
    ladEnd('van', vanPlay, extra);
  }
  nextBtn(el, () => { if (alive) { hush(); phrase(); } }, 'Next phrase');
  phrase();
  window.__van = { L, step: () => step, cur: () => { const c = $('.vslot.cur', phEl); return c ? c.dataset.i : null; },
    answer: (right) => { const c = $('.vslot.cur', phEl); if (!c) return false; const tiles = $$('.vtile:not([disabled])', tilesEl); const want = ph_target(); const b = tiles.find(x => (x.dataset.w === want) === right); if (b) b.click(); return !!b; }, n: () => n };
  function ph_target() { const c = $('.vslot.cur', phEl); return c ? c._w : null; }
}

// ================= PICTURE MATCH =================
// He hears (or reads) a clue and taps the matching picture. Riddles ("It says moo...") give fewer clues as
// levels rise; attribute pictures (color, size, how many, what it's doing, where) differ by one detail.
function pmMap() {
  ladMap('pm', 'pmMap', 'Picture Match', pmPlay);
  prompt([line('pm_intro') || ['p', 'pick_level']]);
}
const PM_ATTRS = ['color', 'size', 'num', 'act', 'place'];
function pmDefault() { return { color: null, size: null, num: 1, act: null, place: null }; }
function pmVary(o, attr) {
  const P = D.PMATCH, c = Object.assign({}, o);
  if (attr === 'color') c.color = pick(P.COLORS.filter(x => x !== o.color));
  if (attr === 'size') c.size = o.size === 'big' ? 'little' : 'big';
  if (attr === 'num') c.num = pick([1, 2, 3].filter(x => x !== o.num));
  if (attr === 'act') c.act = pick(P.ACTS.filter(x => !o.act || x.w !== o.act.w));
  if (attr === 'place') c.place = pick(P.PLACES.filter(x => !o.place || x.w !== o.place.w));
  if (attr === 'noun') c.noun = pick(P.NOUNS.filter(x => x.s !== o.noun.s));
  return c;
}
const pmKey = (o) => [o.noun.s, o.color, o.size, o.num, o.act && o.act.w, o.place && o.place.w].join('|');
function pmWords(o) {
  const w = [];
  const art = o.num === 1 ? 'a' : o.num === 2 ? 'two' : 'three';
  const next = o.size || o.color || o.noun.s; w.push(art === 'a' && /^[aeiou]/.test(next) ? 'an' : art);
  if (o.size) w.push(o.size); if (o.color) w.push(o.color); w.push(o.num > 1 ? o.noun.p : o.noun.s);
  if (o.act) { w.push(o.num > 1 ? 'are' : 'is'); w.push(o.act.w); }
  if (o.place) w.push(o.place.w);
  return w;
}
function pmCard(o) {
  const copies = Array.from({ length: o.num }, (_, k) => `<span class="pmA ${o.color ? 'c-' + o.color : ''} ${o.size ? 's-' + o.size : ''}"><span class="emoji">${o.noun.e}</span>${o.act && ACT_TAG[o.act.a] ? `<i class="emoji tag">${ACT_TAG[o.act.a]}</i>` : ''}</span>`).join('');
  return `${o.place ? `<span class="pmPlace emoji">${o.place.e}</span>` : ''}<span class="pmRow n${o.num}">${copies}</span>`;
}
function pmPlay() {
  RR = { n: 0, ok: 0 };
  const lvIdx = S.pm.lv, L = D.PMATCH.LEVELS[lvIdx], P = D.PMATCH;
  const N = 4; let n = 0, alive = true, qid = 0; const recent = S.pm.recent || (S.pm.recent = []);
  const el = show('match', topBar(`${E(L.icon)} ${esc(L.name)}`, { back: 'match', backIcon: '⬅️' }) + `<div class="vanTop"><div class="pmMode">${E(L.au === 'read' ? '📖' : '👂')}</div><div class="vanProg"><i></i></div></div>
    <div class="pmClue lt"></div><div class="pmCards"></div>`);
  const clueEl = $('.pmClue', el), cards = $('.pmCards', el), bar = $('.vanProg i', el);
  cleanup = () => { alive = false; };
  function question() {
    if (!alive) return;
    if (n >= N) return ladEnd('pm', pmPlay);
    n++; bar.style.width = ((n - 1) / N * 100) + '%';
    const my = ++qid, still = () => alive && my === qid;
    let opts, target, clueItems, clueHtml, sayOf;
    if (L.kind === 'riddle') {
      const pool = P.RIDDLES.filter(r => !recent.includes(r.w)); target = pick(pool.length ? pool : P.RIDDLES);
      recent.push(target.w); if (recent.length > 20) recent.shift();
      const near = shuffle(P.RIDDLES.filter(r => r.g === target.g && r.w !== target.w)), far = shuffle(P.RIDDLES.filter(r => r.g !== target.g));
      const dist = (L.dist === 'near' ? near.concat(far) : far).slice(0, L.ch - 1);
      opts = shuffle([target].concat(dist));
      let fi = [0, 1, 2]; if (L.attrs === 1) fi = [target.key]; else if (L.attrs === 2) fi = [target.key, shuffle([0, 1, 2].filter(x => x !== target.key))[0]].sort();
      clueItems = fi.map(j => ['p', `pm-${target.k}-${j}`]);
      clueHtml = fi.map(j => `<div class="fact" data-j="${j}">${esc(target.f[j])}</div>`).join('');
      cards.innerHTML = opts.map((o, i) => `<button class="pmCard" data-i="${i}"><span class="pmRow n1"><span class="pmA"><span class="emoji">${o.e}</span></span></span></button>`).join('');
      sayOf = (o) => [['w', o.w]];
    } else {
      let attrs = L.attrs.includes('any1') ? [pick(PM_ATTRS)] : L.attrs.slice();
      target = pmDefault(); target.noun = pick(P.NOUNS);
      attrs.forEach(a => { if (a === 'color') target.color = pick(P.COLORS); if (a === 'size') target.size = pick(P.SIZES); if (a === 'num') target.num = pick([1, 2, 3]); if (a === 'act') target.act = pick(P.ACTS); if (a === 'place') target.place = pick(P.PLACES); });
      opts = [target]; const seen = new Set([pmKey(target)]); let k = 0;
      const cyc = attrs.concat(L.ch > attrs.length + 1 ? ['noun'] : []);
      while (opts.length < L.ch && k++ < 60) { const v = pmVary(target, cyc[(opts.length - 1 + k) % cyc.length]); if (!seen.has(pmKey(v))) { seen.add(pmKey(v)); opts.push(v); } }
      opts = shuffle(opts);
      const ws = pmWords(target); clueItems = ws.map(w => ['w', w]);
      clueHtml = `<div class="fact">${ws.map((w, i) => `<span class="cw" data-i="${i}">${esc(i === 0 ? capFirst(w) : w)}</span>`).join(' ')}</div>`;
      cards.innerHTML = opts.map((o, i) => `<button class="pmCard" data-i="${i}">${pmCard(o)}</button>`).join('');
      // everything on the cards moves: the action if it is part of the clue, otherwise a happy bob
      $$('.pmCard', cards).forEach((c, i) => { const o = opts[i]; $$('.pmA', c).forEach((a, j) => loopAnim(a, o.act ? o.act.a : 'bob1', j * 160 + rnd(200))); });
      sayOf = (o) => pmWords(o).map(w => ['w', w]);
    }
    cards.classList.toggle('four', opts.length > 3); cards.classList.toggle('three', opts.length === 3);
    clueEl.innerHTML = clueHtml; clueEl.classList.toggle('readOnly', L.au === 'read');
    preload(clueItems.concat(opts.flatMap(sayOf)));
    let miss = 0, hinted = false, locked = false;
    const speakClue = () => say(clueItems.map((it, i) => ({ k: it[0], id: it[1], on: () => { $$('.fact, .cw', clueEl).forEach(x => x.classList.remove('hl')); const x = L.kind === 'riddle' ? $$('.fact', clueEl)[i] : $$('.cw', clueEl)[i]; if (x) x.classList.add('hl'); } })), { gap: L.kind === 'riddle' ? 350 : 80 })
      .then(() => $$('.hl', clueEl).forEach(x => x.classList.remove('hl')));
    clueEl.onclick = () => { if (L.au === 'read') hinted = true; SFX.tap(); speakClue(); };
    const intro = [];
    if (n === 1) intro.push(line(L.au === 'read' ? 'pm_read' : L.kind === 'riddle' ? 'pm_riddle' : 'pm_listen'));
    lastPrompt = L.au === 'read' ? [line('pm_read')] : clueItems;
    (async () => { if (intro.length) await say(intro); if (!still()) return; if (L.au !== 'read') speakClue(); })();
    $$('.pmCard', cards).forEach(c => c.addEventListener('click', async () => {
      if (!still() || locked || c.disabled) return;
      const o = opts[+c.dataset.i];
      if (o === target) {
        locked = true; $$('.pmCard', cards).forEach(x => { if (x !== c) x.classList.add('fade'); });
        c.classList.add('right'); payoff(c, { kind: pick(['boom', 'zing']) });
        // the picture comes alive: every character jumps / does its action in a burst
        $$('.pmA', c).forEach((a, j) => setTimeout(() => anim(a, o.act ? o.act.a : pick(['flip', 'spin', 'jump']), c), j * 120));
        const sc = (hinted ? .6 : 1) * itemScore(miss); ladCredit('pm', sc, !miss && !hinted); addPoints(miss ? 1 : 3, c); S.log.matches++;
        await say([line('pm_yes')].concat(sayOf(o)), { gap: 60 }); if (!still()) return;
        await wait(500); question();
      } else {
        miss++; SFX.boing(); anim(c, 'shake'); c.classList.add('wrongish'); c.disabled = true;
        say([line('pm_that')].concat(sayOf(o), [line('pm_close')]), { gap: 60 });
      }
    }));
    window.__pm = { L, target, opts, pick: (right) => { const cs = $$('.pmCard', cards); const c = cs.find((x, i) => !x.disabled && (opts[i] === target) === right); if (c) c.click(); return !!c; }, n: () => n };
  }
  nextBtn(el, () => { if (alive) { hush(); question(); } }, 'Next one');
  question();
}

// ================= ACTION WORDS (v4: a clear, linear ladder) =================
// Watch & Say → Tap the Action (hear it) → Read It (no sound) → Read & Do (2, 3, then 4 moves in order)
// → Read the Sentence (pick the matching picture, then watch it). Mix (free play) unlocks as a reward.
const ACT_OF = {}; D.ACTIONS.forEach(a => { ACT_OF[a.w] = a.a; });
const actStars = (i) => ladStars('act', i);
function actMap() {
  const open = S.act.unlocked >= D.ACT_MIX_AT;
  ladMap('act', 'actMap', 'Action Words', actPlay, `<button class="mixKey ${open ? '' : 'locked'}" aria-label="Mix">${E(open ? '🔀' : '🔒')}<span>Mix</span></button>`);
  const mk = $('#actMap .mixKey');
  mk.addEventListener('click', () => { if (!open) { SFX.boing(); anim(mk, 'shake'); return say(['p', 'level_locked']); } SFX.pop(); actMix(); });
  prompt([line('act_map') || ['p', 'm_action']]);
}
function actionHome() { actMap(); }
function actPlay() {
  RR = { n: 0, ok: 0 };
  const i = S.act.lv, L = D.ACT_LEVELS[i];
  const pool = D.ACTIONS.slice(L.lo, L.hi), all = D.ACTIONS.slice(0, L.hi).filter(a => a.w !== 'big' && a.w !== 'small');
  const N = { watch: 6, tap: 6, read: 6, do2: 4, do3: 3, do4: 3, sent: 4, sent2: 4 }[L.kind] || 5;
  const nCards = i < 3 ? 3 : 4;
  let n = 0, alive = true, qid = 0, deck = [];
  const el = show('action', topBar(`${E(L.icon)} ${esc(L.name)}`, { back: 'action', backIcon: '⬅️' }) + `<div class="vanTop"><div class="pmMode">${E({ watch: '👀', tap: '👂', read: '📖' }[L.kind] || '🎬')}</div><div class="vanProg"><i></i></div></div>
    <div class="actStage"><div class="buddy"><span class="emoji">🐉</span></div></div><div class="actWords"></div>`);
  const stage = $('.actStage', el), buddy = $('.buddy', el), words = $('.actWords', el), bar = $('.vanProg i', el);
  cleanup = () => { alive = false; };
  loopAnim(buddy, 'bob1');
  buddy.addEventListener('click', () => { SFX.boing(); anim(buddy, 'jump', stage); });
  const draw = () => { if (!deck.length) deck = shuffle(pool); return deck.pop(); };
  const ak = (a) => a === 'jump2' ? 'jump' : a;
  const distinct = (list, n0, notA) => { const out = [], seenA = new Set((notA || []).map(ak)); shuffle(list).forEach(a => { if (out.length < n0 && !seenA.has(ak(a.a))) { seenA.add(ak(a.a)); out.push(a); } }); return out; };
  const cardHtml = (a) => `<button class="aCard" data-w="${a.w}" data-a="${a.a}"><span class="mini"><span class="emoji">🐉</span></span>${ACT_TAG[a.a] ? `<i class="emoji tag">${ACT_TAG[a.a]}</i>` : ''}</button>`;
  const startLoops = () => $$('.aCard', words).forEach((c, k) => loopAnim($('.mini', c), c.dataset.a, k * 200));
  async function act(a, host) { const p = anim(buddy, a, stage); setTimeout(() => burst(buddy, ['💥', '⭐', '✨']), 300); return p; }
  function next() {
    if (!alive) return;
    if (n >= N) return ladEnd('act', actPlay);
    n++; bar.style.width = ((n - 1) / N * 100) + '%';
    const my = ++qid, still = () => alive && my === qid;
    const first = n === 1;
    if (L.kind === 'watch') {
      const t = draw();
      words.innerHTML = `<button class="bigWord lt" data-w="${t.w}">${esc(t.w)}</button>`;
      const b = $('.bigWord', words); preload([['w', t.w]]);
      (async () => { if (first) await say([line('act_watch')]); if (!still()) return; act(t.a); await say(['w', t.w]); if (still()) { b.classList.add('pulse'); } })();
      lastPrompt = ['w', t.w];
      b.addEventListener('click', async () => {
        if (!still() || b.disabled) return; b.disabled = true; b.classList.remove('pulse');
        anim(b, t.a === 'grow' || t.a === 'shrink' ? 'jump' : t.a); payoff(b, { cheer: false }); ladCredit('act', 1, true); addPoints(2, b); S.act.done++;
        say(['w', t.w]); await act(t.a); if (!still()) return; await say([line('cheer') || praise()]); if (still()) next();
      });
    } else if (L.kind === 'tap' || L.kind === 'read') {
      const t = draw(); const opts = shuffle([t].concat(distinct(all.filter(a => a.w !== t.w), nCards - 1, [t.a]))); window.__act.cur = { t };
      const reading = L.kind === 'read';
      words.innerHTML = `${reading ? `<button class="bigWord small lt" data-w="${t.w}">${esc(t.w)}</button>` : `<button class="bigWord small ear" aria-label="Hear it">${E('👂')}</button>`}<div class="aCards">${opts.map(cardHtml).join('')}</div>`;
      startLoops(); preload(opts.map(a => ['w', a.w]));
      let miss = 0, hinted = false;
      $('.bigWord', words).addEventListener('click', () => { SFX.tap(); if (reading) hinted = true; say(['w', t.w]); });
      lastPrompt = reading ? [line('act_read')] : ['w', t.w];
      (async () => { if (first) await say([line(reading ? 'act_read' : 'act_tap')]); if (!still()) return; if (!reading) say(['w', t.w]); })();
      $$('.aCard', words).forEach(c => c.addEventListener('click', async () => {
        if (!still() || c.disabled) return;
        if (ak(c.dataset.a) === ak(t.a)) {
          $$('.aCard', words).forEach(x => x.disabled = true); c.classList.add('right'); payoff(c);
          ladCredit('act', itemScore(miss) * (hinted ? .6 : 1), !miss && !hinted); addPoints(miss ? 1 : 3, c); S.log.matches++; S.act.done++;
          if (reading) $('.bigWord', words).classList.add('right'); else $('.bigWord', words).innerHTML = esc(t.w);
          say(['w', t.w]); await act(t.a); if (!still()) return; await say([line('cheer') || praise()]); if (still()) next();
        } else {
          miss++; c.disabled = true; c.classList.add('wrongish'); SFX.boing(); anim(c, 'shake');
          say([['p', 'that_says'], ['w', c.dataset.w], oops()].concat(reading ? [] : [['w', t.w]]));
        }
      }));
    } else if (L.kind.startsWith('do')) {
      const k = +L.kind.slice(2), tpls = { 2: ['W and W', 'W then W', 'first W, then W'], 3: ['W, W, then W', 'W and W, then W'], 4: ['W, W, W, then W'] }[k];
      const seq = distinct(all, k), tpl = pick(tpls); let q = 0;
      const text = tpl.replace(/W/g, () => seq[q++].w); const raw = text.split(' '); window.__act.cur = { seq };
      const palette = shuffle(seq.concat(distinct(all.filter(a => !seq.some(s => s.a === a.a)), Math.max(2, (k === 2 ? 4 : 5) - k))));
      words.innerHTML = `<div class="phrase">${raw.map((w, j) => `<button class="aw lt" data-w="${bare(w)}">${esc(j === 0 ? capFirst(w) : w)}</button>`).join('')}</div><div class="aCards wide">${palette.map(cardHtml).join('')}</div>`;
      startLoops(); preload(raw.map(w => ['w', bare(w)]));
      const wordBtns = $$('.phrase .aw', words), moveBtns = wordBtns.filter(b => ACT_OF[b.dataset.w] && seq.some(s => s.w === b.dataset.w));
      wordBtns.forEach(b => b.addEventListener('click', () => { SFX.tap(); say(['w', b.dataset.w]); anim(b, 'jump2'); }));
      let at = 0, miss = 0, misses = 0;
      const mark = () => moveBtns.forEach((b, j) => b.classList.toggle('hl', j === at));
      mark(); lastPrompt = [line('act_do')];
      if (first) say([line('act_do')]);
      $$('.aCard', words).forEach(c => c.addEventListener('click', async () => {
        if (!still() || at >= seq.length) return;
        if (ak(c.dataset.a) === ak(seq[at].a)) {
          const w = seq[at].w; moveBtns[at].classList.add('right'); c.classList.add('pop'); setTimeout(() => c.classList.remove('pop'), 400);
          SFX.zing(); burst(c, ['⭐', '✨']); say(['w', w]); at++; mark(); misses += miss ? 1 : 0; miss = 0;
          await act(seq[at - 1].a); if (!still()) return;
          if (at >= seq.length) {
            // the whole combo: read it, Sparky does every move in a row, then a big boom
            hush(); await say(raw.map((w, j) => ({ k: 'w', id: bare(w), on: () => wordBtns.forEach((b, x) => b.classList.toggle('hl', x === j)) })), { gap: 80 }); if (!still()) return;
            for (const s of seq) { if (!still()) return; await act(s.a); }
            wordBtns.forEach(b => b.classList.remove('hl')); payoff(buddy, { kind: 'boom' });
            ladCredit('act', misses ? .6 : 1.2, !misses); addPoints(misses ? 2 : 4, buddy); S.log.matches++; S.act.done++;
            await say([praise()]); if (still()) next();
          } else if (at > 0) say([line('act_next_move')]);
        } else {
          miss++; SFX.boing(); anim(c, 'shake');
          say(miss >= 2 ? [['p', 'that_says'], ['w', c.dataset.w], ['w', seq[at].w]] : [['p', 'that_says'], ['w', c.dataset.w], oops()]);
        }
      }));
    } else {
      // Read the Sentence: read it (no sound unless he taps a word), pick the matching picture, then it acts out
      const long = L.kind === 'sent2', R = D;
      const mk = () => ({ noun: pick(R.RACE_NOUNS), verb: pick(R.RACE_VERBS.filter(v => v.a !== 'grow')), adj: long ? pick(R.RACE_ADJS.filter(a => ['big', 'little', 'red', 'blue', 'green', 'pink', 'purple', 'yellow', 'orange'].includes(a.w))) : null, place: long ? pick(R.RACE_PLACES) : null });
      const t = mk(), vary = (o, f) => { const c = Object.assign({}, o); if (f === 'noun') c.noun = pick(R.RACE_NOUNS.filter(x => x !== o.noun)); if (f === 'verb') c.verb = pick(R.RACE_VERBS.filter(v => v.a !== o.verb.a && v.a !== 'grow')); if (f === 'adj') c.adj = pick(R.RACE_ADJS.filter(a => a.a !== o.adj.a && ['big', 'little', 'red', 'blue', 'green', 'pink', 'purple', 'yellow', 'orange'].includes(a.w))); if (f === 'place') c.place = pick(R.RACE_PLACES.filter(p => p.e !== o.place.e)); return c; };
      const fields = long ? ['verb', 'noun', 'adj', 'place'] : ['verb', 'noun', 'verb'];
      const keyO = (o) => [o.noun.s, o.verb.a, o.adj && o.adj.a, o.place && o.place.e].join('|'), seenO = new Set([keyO(t)]), dist = [];
      for (let k = 0; dist.length < nCards - 1 && k < 40; k++) { const v = vary(t, fields[k % fields.length]); if (!seenO.has(keyO(v))) { seenO.add(keyO(v)); dist.push(v); } }
      const opts = shuffle([t].concat(dist)); window.__act.cur = { ti: opts.indexOf(t) };
      const ws = ['the'].concat(t.adj ? [t.adj.w] : [], [t.noun.s, t.verb.s], t.place ? [t.place.w] : []);
      const text = capFirst(ws.join(' ')) + '.';
      const scard = (o) => `<button class="pmCard sCard">${o.place ? `<span class="pmPlace emoji">${o.place.e}</span>` : ''}<span class="pmRow n1"><span class="pmA ${o.adj ? 'c-' + o.adj.a + ' s-' + o.adj.a : ''}"><span class="emoji">${o.noun.e}</span>${ACT_TAG[o.verb.a] ? `<i class="emoji tag">${ACT_TAG[o.verb.a]}</i>` : ''}</span></span></button>`;
      words.innerHTML = `<div class="phrase">${ws.map((w, j) => `<button class="aw lt" data-w="${w}">${esc(j === 0 ? capFirst(w) : w)}${j === ws.length - 1 ? '.' : ''}</button>`).join('')}</div><div class="pmCards sc ${opts.length > 3 ? 'four' : 'three'}">${opts.map(scard).join('')}</div>`;
      $$('.sCard', words).forEach((c, j) => loopAnim($('.pmA', c), opts[j].verb.a, j * 150));
      $$('.phrase .aw', words).forEach(b => b.addEventListener('click', () => { SFX.tap(); say(['w', b.dataset.w]); anim(b, 'jump2'); }));
      preload(ws.map(w => ['w', w])); lastPrompt = [line('act_sent')]; if (first) say([line('act_sent')]);
      let miss = 0;
      $$('.sCard', words).forEach((c, j) => c.addEventListener('click', async () => {
        if (!still() || c.disabled) return; const o = opts[j];
        if (o === t) {
          $$('.sCard', words).forEach(x => x.disabled = true); payoff(c); ladCredit('act', itemScore(miss) * 1.2, !miss); addPoints(miss ? 1 : 3, c); S.log.sentences++;
          await wait(500); if (!still()) return;
          const sc = buildScene(el, { noun: t.noun, adj: t.adj, verb: t.verb, place: t.place, text, bg: pick(['grass', 'sunny', 'road']) });
          const acting = sc.act(); await say(ws.map((w, k) => ({ k: 'w', id: w, on: () => sc.hl(k) })), { gap: 70 }); await acting; if (!still()) return;
          sc.hl(-1); payoff(sc, { kind: 'boom' }); await say([line('cheer') || praise()]); await wait(400); sc.remove(); if (still()) next();
        } else {
          miss++; c.disabled = true; c.classList.add('wrongish'); SFX.boing(); anim(c, 'shake');
          const ow = ['the'].concat(o.adj ? [o.adj.w] : [], [o.noun.s, o.verb.s], o.place ? [o.place.w] : []);
          say([line('pm_that')].concat(ow.map(w => ['w', w]), [oops()]), { gap: 60 });
        }
      }));
    }
  }
  window.__act = { L, n: () => n, cur: null };
  nextBtn(el, () => { if (alive) { hush(); next(); } }, 'Next');
  next();
}
// Mix: free play reward (build a silly combo; refresh any word type, or shuffle them all)
function actMix() {
  const el = show('action', topBar('Mix', { back: 'action', backIcon: '⬅️' }) + `<div class="actStage"></div><div class="actWords"></div>`);
  const stage = $('.actStage', el), words = $('.actWords', el);
  let alive = true; cleanup = () => { alive = false; };
  if (!S.act.mixSeen) { S.act.mixSeen = 1; save(); }
  const pickNoun = () => pick(D.RACE_NOUNS), pickAdj = () => pick(D.RACE_ADJS), pickVerb = () => pick(D.RACE_VERBS), pickPlace = () => pick(D.RACE_PLACES);
  const c = { adj: pickAdj(), noun: pickNoun(), verb: pickVerb(), place: pickPlace() };
  const TYPES = [['adj', '🎨', pickAdj, x => x.w], ['noun', '🐾', pickNoun, x => x.s], ['verb', '🏃', pickVerb, x => x.s], ['place', '📍', pickPlace, x => x.w]];
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
    $$('[data-r]', words).forEach(b => b.addEventListener('click', () => { SFX.whoosh(); const t = TYPES.find(x => x[0] === b.dataset.r); let v; do { v = t[2](); } while (v === c[t[0]]); c[t[0]] = v; const sc2 = draw(); say(['w', t[3](v)]); setTimeout(() => sc2.act(), 300); }));
    $('[data-all]', words).addEventListener('click', shuffleAll);
    $('.goBtn', words).addEventListener('click', () => goPlay(sc));
    return sc;
  }
  async function goPlay(sc) {
    const my = ++playing; SFX.whoosh();
    const acting = sc.act();
    await say(words4().map((w, i) => ({ k: 'w', id: w, on: () => sc.hl(i) })), { gap: 70 });
    await acting; if (my !== playing || !alive) return;
    sc.hl(-1); payoff(sc, { cheer: false }); addPoints(1, sc); say([line('cheer') || praise()]);
  }
  function shuffleAll() { SFX.whoosh(); c.adj = pickAdj(); c.noun = pickNoun(); c.verb = pickVerb(); c.place = pickPlace(); const sc = draw(); say(['p', 'shuffle']); setTimeout(() => goPlay(sc), 700); }
  draw();
  nextBtn(el, shuffleAll, 'Shuffle all');
  prompt([['p', 'action_mix']]);
}


// ================= WORD GALLERIES (medal rewards) =================
// Every medal (bronze, silver, gold on any level) unlocks the next reward: secret words (rare, fun words that
// say themselves and act), word stickers, and fancy letters that restyle the words all over the game.
function wgHas(type, id) { return S.wg.got.includes(type + ':' + id); }
function applyFont() { const h = document.documentElement; D.WG.FONTS.forEach(f => h.classList.remove('font-' + f.id)); if (S.wg.font) h.classList.add('font-' + S.wg.font); }
function wordGalleries(tab) {
  tab = tab || S.wg.tab || 'secret'; S.wg.tab = tab; const fresh = S.wg.got.length - (S.wg.seen || 0); S.wg.seen = S.wg.got.length; save();
  const medals = `<div class="wgMedals">${MEDAL.map((m, t) => `<span class="emoji">${m}</span><b>${S.medals[t]}</b>`).join('')}</div>`;
  const tabs = [['secret', '🗝️', 'Secret Words'], ['sticker', '🏷️', 'Stickers'], ['font', '🔠', 'Fancy Letters']];
  const el = show('wg', topBar('Word Galleries') + `<div class="wgHead">${medals}<div class="wgTabs">${tabs.map(([k, ic, nm]) => `<button class="wgTab ${k === tab ? 'on' : ''}" data-t="${k}">${E(ic)}<span>${nm}</span></button>`).join('')}</div></div><div class="wgGrid ${tab}"></div>`);
  const grid = $('.wgGrid', el);
  $$('.wgTab', el).forEach(b => b.addEventListener('click', () => { SFX.pop(); wordGalleries(b.dataset.t); }));
  const order = D.WG.TRACK.filter(r => r[0] === tab).map(r => r[1]);
  const medalNo = (id) => D.WG.TRACK.findIndex(r => r[0] === tab && r[1] === id) + 1;
  if (tab === 'font') {
    grid.innerHTML = `<button class="wgFont ${!S.wg.font ? 'on' : ''}" data-f=""><span class="sample">Abc</span><span class="nm">Regular</span></button>` + D.WG.FONTS.map(f => wgHas('font', f.id)
      ? `<button class="wgFont f-${f.id} ${S.wg.font === f.id ? 'on' : ''}" data-f="${f.id}"><span class="sample font-${f.id}-s">Abc</span><span class="nm">${E(f.e)} ${esc(f.name)}</span></button>`
      : `<button class="wgFont locked" data-lock="${medalNo(f.id)}"><span class="sample">🔒</span><span class="nm">${E('🏅')} ${medalNo(f.id)}</span></button>`).join('');
  } else {
    const list = tab === 'secret' ? D.WG.SECRET : D.WG.STICKERS;
    grid.innerHTML = order.map(id => { const x = list.find(v => v.w === id); return wgHas(tab, id)
      ? `<button class="wgItem ${tab}" data-w="${esc(x.w)}" data-a="${x.a}"><span class="emoji">${x.e}</span><b class="lt">${esc(x.w)}</b></button>`
      : `<button class="wgItem locked" data-lock="${medalNo(id)}"><span class="emoji">❔</span><b>${E('🏅')} ${medalNo(id)}</b></button>`; }).join('');
  }
  $$('[data-lock]', grid).forEach(b => b.addEventListener('click', () => { SFX.boing(); anim(b, 'shake'); say([line('wg_locked'), ['p', 'medal_count']].slice(0, 1)); }));
  $$('.wgItem[data-w]', grid).forEach(b => b.addEventListener('click', () => {
    const w = b.dataset.w, a = b.dataset.a; payoff(b, { kind: pick(['boom', 'zing', 'crash']) }); anim(b.firstElementChild, a || 'jump');
    if (a === 'launch' || a === 'roar') fxAt(b, pick(['💥', '🔥', '✨']), 0, -80, 900);
    say(tab === 'secret' && rnd(3) === 0 ? [line('wg_secret'), ['w', w]] : [['w', w]]);
  }));
  $$('.wgFont[data-f]', grid).forEach(b => b.addEventListener('click', () => {
    S.wg.font = b.dataset.f; save(); applyFont(); $$('.wgFont', grid).forEach(x => x.classList.toggle('on', x === b));
    payoff(b, { kind: 'zing', cheer: !!b.dataset.f }); say(b.dataset.f ? [line('wg_font_on')] : [['p', 'font_off']]);
  }));
  prompt(fresh > 0 ? [line('reward_' + tab) || line('wg_intro')] : [line('wg_intro')]);
  window.__wg = { tab, count: () => $$('.wgItem:not(.locked), .wgFont:not(.locked)', grid).length };
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
    // v4: the 11 newer rooms get a measured grid (no overlaps at any screen size); the first 7 keep their hand layout
    const W = roomEl.clientWidth, H = roomEl.clientHeight; let grid = null;
    if (ri >= 7 && W > 50 && H > 50) {
      const n = room.items.length, top = Math.max(40, H * .12), H2 = H - top - 4; let best = null;
      for (let c = 3; c <= 10; c++) { const r = Math.ceil(n / c), cell = Math.min(W / c, H2 / r); if (!best || cell > best.cell) best = { c, r, cell }; }
      grid = room.items.map((it, i) => { const row = Math.floor(i / best.c), col = i % best.c, inRow = Math.min(best.c, n - row * best.c), cw = W / best.c, x0 = (W - inRow * cw) / 2;
        return { x: (x0 + (col + .5) * cw) / W * 100, y: (top + (row + .5) * H2 / best.r) / H * 100, f: Math.min(cw, H2 / best.r) * .56 * (.88 + Math.max(0, Math.min(1, (it[5] - 12) / 6)) * .12) }; });
    }
    const pos = (it, i) => grid ? `left:${grid[i].x.toFixed(2)}%;top:${grid[i].y.toFixed(2)}%;font-size:${grid[i].f.toFixed(0)}px` : `left:${it[3]}%;top:${it[4]}%;font-size:${(it[5] * k).toFixed(1)}vmin`;
    roomEl.innerHTML = amb + dec + `<div class="fillBar">${E(room.icon)} ${own.length}/${room.items.length}<span class="bar"><i style="width:${own.length / room.items.length * 100}%"></i></span><span class="rLv">${'⭐'.repeat(lvl)}${'☆'.repeat(Math.max(0, 4 - lvl))}</span></div>` +
      room.items.map((it, i) => own.includes(i) ? `<div class="item ${i === newIdx ? 'new' : ''} ${it[6] === 'glow' ? 'glowable' : ''}" data-i="${i}" style="${pos(it, i)}"><span class="emoji">${it[1]}</span></div>`
        : `<div class="ghost emoji" style="${pos(it, i)}">${it[1]}</div>`).join('') +
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
let rsT = 0; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if ($('#gallery.show') && window.__gallery) window.__gallery.renderRoom(); }, 250); });
window.__app = { S: () => S, save, go, addPoints, say, AU, D, reader, gallery, actionHome, actPlay, actMix, vanPlay, pmPlay, rainPlay, racePlay, wordGalleries, medalAward, roundDone, speakable, clip, loadBuf, anim, ladStars, dbg: () => ({ seq: seqId, act: !!active, st: ctx && ctx.state, buf: BUF.size, eng: S.engine }) };
applyFont();
start();
})();
