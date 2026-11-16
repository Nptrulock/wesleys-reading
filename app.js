/* Wesley's Reading Adventure — app logic. */
(function () {
'use strict';
const D = window.DATA, M = window.AUDIO_MANIFEST || { w: [], p: [], ln: [], ls: [], pages: {} };
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
const DEF = { v: 1, stars: 0, points: 0, totalStars: 0, rain: { lv: 0, good: {}, done: 0, unlocked: 0 }, story: { read: {}, pages: {} },
  race: { lv: 0, good: {}, done: 0, unlocked: 0 }, act: { lv: 0, good: 0, done: 0, seen: {} }, owned: {}, upper: false, letterSounds: 'auto',
  log: { words: 0, sentences: 0, matches: 0, stories: 0, minutes: 0, firstPlay: 0, lastPlay: 0, misses: 0 }, hard: {} };
let S;
function load() {
  try { S = Object.assign(JSON.parse(JSON.stringify(DEF)), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = JSON.parse(JSON.stringify(DEF)); }
  for (const k of ['rain', 'story', 'race', 'act', 'log']) S[k] = Object.assign(JSON.parse(JSON.stringify(DEF[k])), S[k] || {});
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
load();

// ================= audio =================
const SET = { w: new Set(M.w), p: new Set(M.p), ln: new Set(M.ln), ls: new Set(M.ls) };
const AU = window.__AU = { log: [], errors: [], fallbacks: 0, unlocked: false };
let voiceEl = null, ctx = null, seqId = 0;
const SOUND_TEXT = { a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'aw', p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz', sh: 'shh', ch: 'chuh', th: 'th', ck: 'kuh', ng: 'ng', ee: 'ee', oo: 'oo', ll: 'lll', ss: 'sss', ff: 'fff' };
function clip(kind, id) {
  // returns {src, text}
  if (kind === 'w') { const k = D.slug(id); return { src: SET.w.has(k) ? 'audio/w/' + k + '.mp3' : null, text: id }; }
  if (kind === 'p') return { src: SET.p.has(id) ? 'audio/p/' + id + '.mp3' : null, text: D.PHRASES[id] || id };
  if (kind === 'ln') return { src: SET.ln.has(id) ? 'audio/ln/' + id + '.mp3' : null, text: D.LETTER_NAME_TEXT[id] || id };
  if (kind === 'ls') return { src: SET.ls.has(id) ? 'audio/ls/' + id + '.mp3' : null, text: SOUND_TEXT[id] || id };
  if (kind === 's') return { src: M.pages[id] ? 'audio/s/' + id + '.mp3' : null, text: id };
  return { src: null, text: String(id) };
}
function ensureVoice() {
  if (!voiceEl) { voiceEl = new Audio(); voiceEl.preload = 'auto'; voiceEl.setAttribute('playsinline', ''); voiceEl.setAttribute('webkit-playsinline', ''); voiceEl.playsInline = true; }
  return voiceEl;
}
function audioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function unlockAudio() {
  // Must run inside the first tap. Plays the greeting on the shared <audio> element so iOS Safari
  // allows that element to play later clips without a tap, and resumes Web Audio for sound effects.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
  audioCtx();
  try { const b = ctx && ctx.createBuffer(1, 1, 22050); if (b) { const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } } catch (e) {}
  AU.unlocked = true;
}
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
      const rec = { src, t: Date.now(), ok: null }; AU.log.push(rec); if (AU.log.length > 300) AU.log.shift();
      const p = a.play();
      if (p && p.then) p.then(() => { rec.ok = true; }).catch(err => { rec.ok = false; rec.err = String(err && err.name); AU.errors.push(src + ' ' + rec.err); fin(false); });
      else rec.ok = true;
      if (onTime) { const tick = () => { if (done || my !== seqId) return; onTime(a.currentTime * 1000); raf = requestAnimationFrame(tick); }; raf = requestAnimationFrame(tick); }
      setTimeout(() => fin(true), 15000);
    } catch (e) { AU.errors.push(src + ' ' + e); fin(false); }
  });
}
// say([['p','home'], ['w','cat'], {k:'ls',id:'c', on: fn}], {gap}) -> Promise<bool finished>
async function say(items, opt) {
  opt = opt || {};
  const my = ++seqId; stopVoiceOnly();
  if (!Array.isArray(items[0]) && !(items[0] && items[0].k)) items = [items];
  for (const it of items) {
    if (my !== seqId) return false;
    const k = it.k || it[0], id = it.id || it[1], on = it.on || it[2];
    if (on) try { on(); } catch (e) {}
    const c = clip(k, id);
    let ok = false;
    if (c.src) ok = await playSrc(c.src, my, it.time);
    if (!ok && my === seqId) await speakFallback(c.text);
    if (opt.gap && my === seqId) await wait(opt.gap);
  }
  if (opt.after && my === seqId) try { opt.after(); } catch (e) {}
  return my === seqId;
}
function stopVoiceOnly() { if (voiceEl) { try { voiceEl.pause(); } catch (e) {} } if (window.speechSynthesis) try { speechSynthesis.cancel(); } catch (e) {} }
function hush() { seqId++; stopVoiceOnly(); }
let lastPrompt = null;
function prompt(items) { lastPrompt = items; return say(items); }
const praise = () => ['p', 'p' + (1 + rnd(10))];
const oops = () => ['p', 't' + (1 + rnd(4))];

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
function anim(el, a, decoHost) {
  if (!el) return;
  const inner = el.firstElementChild && el.firstElementChild.tagName === 'SPAN' ? el.firstElementChild : el;
  inner.className = inner.className.replace(/\ba-\S+/g, '').trim(); void inner.offsetWidth; inner.classList.add('a-' + a);
  const host = decoHost || el.parentElement;
  const deco = { sleep: ['💤', '💤'], sing: ['🎵', '🎶'], dance: ['🎶'], hide: null, fly: ['💨'], swim: ['🫧', '💧'], zoom: ['💨'], grow: ['✨'], jump: ['⭐'], fall: ['💥'], spin: ['🌀'], wave: ['👋'] }[a];
  if (deco && host) deco.forEach((d, i) => setTimeout(() => {
    const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
    const s = document.createElement('div'); s.className = 'deco emoji'; s.textContent = d === '🫧' ? '💧' : d;
    s.style.left = (r.left - h.left + r.width * .7) + 'px'; s.style.top = (r.top - h.top) + 'px'; host.appendChild(s); setTimeout(() => s.remove(), 1700);
  }, i * 500));
  if (a === 'hide' && host) { const b = document.createElement('div'); b.className = 'bush emoji'; b.textContent = '🌳'; const r = el.getBoundingClientRect(), h = host.getBoundingClientRect(); b.style.left = (r.left - h.left + r.width / 2) + 'px'; b.style.top = (r.top - h.top + r.height * .6) + 'px'; host.appendChild(b); setTimeout(() => b.remove(), 2200); }
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
    say([['p', 'welcome'], ['p', 'home']]);
  });
  setInterval(() => { if (document.visibilityState === 'visible' && AU.unlocked) { S.log.minutes++; save(); } }, 60000);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(() => { $('#loadNote').textContent = 'Works offline once loaded'; }).catch(() => {});
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
  <label>Letter Rain ${sel('pRain', D.RAIN_LEVELS.map(l => l.name), S.rain.lv)}</label>
  <label>Word Race ${sel('pRace', D.RACE_LEVELS.map(l => l.name + ' — ' + l.example), S.race.lv)}</label>
  <label>Action Words ${sel('pAct', ['1: 2 choices', '2: 3 choices', '3: 4 choices + phrases', '4: harder phrases'], S.act.lv)}</label>
  <label><input type="checkbox" id="pUpper" ${S.upper ? 'checked' : ''}> Show CAPITAL letters (lowercase is the default)</label>
  <label>Letter Rain says ${sel('pSnd', ['letter sounds for decodable words, names for others (default)', 'always letter sounds', 'always letter names'], ['auto', 'sounds', 'names'].indexOf(S.letterSounds))}</label>
  <h3>Sound check</h3><button class="pbtn" id="pTest">▶ Play a test word</button> <span id="pTestRes" class="note"></span>
  <div class="note">Voice clips are recorded MP3s (${M.voice || 'neural voice'}). Played: ${AU.log.length}, failed: ${AU.errors.length}, robot-voice fallback used: ${AU.fallbacks}. If you hear nothing, check the iPad volume and that the side switch is not on silent.</div>
  <h3>Stars & reset</h3>
  <button class="pbtn" id="pGift">+10 stars</button> <button class="pbtn danger" id="pReset">Reset all progress</button>
  <div class="row"><button class="pbtn" id="pClose">Done</button></div>`, 'parent');
  $('#pTest', o).onclick = () => { const n0 = AU.errors.length; say(['w', 'dragon']).then(() => { const last = AU.log[AU.log.length - 1]; $('#pTestRes', o).textContent = (AU.errors.length === n0 && last && last.ok) ? 'MP3 played OK' : 'Clip failed: ' + (AU.errors.slice(-1)[0] || '?'); }); };
  $('#pGift', o).onclick = () => { S.stars += 10; S.totalStars += 10; save(); renderStars(); $('#pGift', o).textContent = '+10 stars ✓'; };
  $('#pReset', o).onclick = () => { if (confirm('Erase all of Wesley\'s stars, rooms and levels?')) { localStorage.removeItem(KEY); load(); save(); o.remove(); home(); } };
  $('#pClose', o).onclick = () => {
    S.rain.lv = +$('#pRain', o).value; S.rain.unlocked = Math.max(S.rain.unlocked, S.rain.lv);
    S.race.lv = +$('#pRace', o).value; S.race.unlocked = Math.max(S.race.unlocked, S.race.lv);
    S.act.lv = +$('#pAct', o).value; S.upper = $('#pUpper', o).checked; S.letterSounds = ['auto', 'sounds', 'names'][+$('#pSnd', o).value];
    save(); o.remove(); home();
  };
}

// ================= round done / level up =================
function roundDone(again, extra) {
  SFX.tada();
  const o = overlay(`<div class="huge emoji">${extra && extra.levelUp ? '🏆' : '🌟'}</div><h2>${extra && extra.levelUp ? 'New level!' : 'You did it!'}</h2>
  <div class="row"><button class="navBtn go" data-a="more" aria-label="Play more">${E('🔁')}</button><button class="navBtn" data-a="home" aria-label="Home">${E('🏠')}</button></div>`);
  burst($('.huge', o));
  const items = extra && extra.levelUp ? [['p', 'new_level'], ['p', 'round_done']] : [praise(), ['p', 'round_done']];
  lastPrompt = items; say(items);
  o.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; SFX.tap(); o.remove(); b.dataset.a === 'more' ? again() : home(); });
}
function levelMap(id, title, levels, cur, unlocked, onPick, bg) {
  show(id, topBar(title) + `<div class="levelMap">${levels.map((l, i) => `<button class="lvBtn ${i > unlocked ? 'locked' : ''} ${i === cur ? 'cur' : ''}" data-i="${i}" style="background:${l.color || bg}">
    <span class="big emoji">${i > unlocked ? '🔒' : l.icon}</span><span>${esc(l.name)}</span></button>`).join('')}</div>`, (el) => {
    $$('.lvBtn', el).forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i; if (i > unlocked) { SFX.boing(); b.classList.remove('bounce'); return; }
      SFX.pop(); onPick(i);
    }));
  });
}

// ================= LETTER RAIN =================
function rainMap() {
  levelMap('rainMap', 'Letter Rain', D.RAIN_LEVELS, S.rain.lv, S.rain.unlocked, (i) => { S.rain.lv = i; save(); rainPlay(); });
  prompt([['p', 'm_rain'], ['p', 'pick_level']]);
}
function graphemes(w, lv) { return lv.mode === 'sound' && w.g ? w.g.split('-') : w.word.split(''); }
function rainVoiceMode(lv, w) {
  if (S.letterSounds === 'sounds') return 'sound'; if (S.letterSounds === 'names') return 'name';
  if (lv.mode === 'letter') return 'sound';
  return lv.mode === 'sound' && !w.sight ? 'sound' : 'name';
}
function rainPlay() {
  const lvIdx = S.rain.lv, lv = D.RAIN_LEVELS[lvIdx];
  const recent = S.rain.recent || [];
  const pool = shuffle(lv.words.filter(w => !recent.includes(w.word)));
  let words = (pool.length >= 5 ? pool : shuffle(lv.words)).slice(0, 5);
  // adaptive: bring back one word he found tricky at this level
  const tricky = lv.words.filter(w => (S.hard[w.word] || 0) > 0 && !words.includes(w));
  if (tricky.length) words[4] = pick(tricky);
  let struggles = 0;
  S.rain.recent = recent.concat(words.map(w => w.word)).slice(-Math.min(15, lv.words.length - 5)); save();
  let wi = 0, cur, gs, gi, misses, tiles = [], raf = 0, last = 0, spawnT = 0, idleT = 0, alive = true, busy = false, sinceNeeded = 0;
  const el = show('rain', topBar(`${E(lv.icon)} ${esc(lv.name)}`, { back: 'rain', backIcon: '⬅️' }) + `<div class="rainHead"><div class="rainPic emoji"></div><div class="slots"></div></div><div class="field"></div>`);
  $('[data-go]', el).dataset.go = 'rain';
  const field = $('.field', el), slotsEl = $('.slots', el), picEl = $('.rainPic', el);
  cleanup = () => { alive = false; cancelAnimationFrame(raf); };
  const ts = () => Math.max(64, Math.min(field.clientWidth / 6, field.clientHeight / 4.2, 120));
  const fallMs = lv.mode === 'letter' || lvIdx <= 2 ? 10000 : 8500;
  function sayG(g, mode) { return mode === 'sound' ? ['ls', g] : ['ln', g.length > 1 ? g[0] : g]; }
  function gItems(g, mode) { return mode === 'sound' ? [['ls', g]] : g.split('').map(c => ['ln', c]); }
  function nextWord() {
    if (wi >= words.length) return finish();
    cur = words[wi++]; gs = lv.mode === 'letter' ? [cur.word] : graphemes(cur, lv); gi = 0; misses = 0; idleT = 0;
    picEl.textContent = cur.pic; slotsEl.classList.toggle('long', gs.join('').length > 6);
    slotsEl.innerHTML = gs.map((g, i) => `<div class="slot lt ${i === 0 ? 'next' : ''}">${g}</div>`).join('');
    tiles.forEach(t => t.el.remove()); tiles = [];
    const mode = rainVoiceMode(lv, cur);
    if (lv.mode === 'letter') prompt([['p', 'rain_find'], ['ls', cur.word], ['ln', cur.word], ['w', D.LETTER_KEY[cur.word][0]]]);
    else prompt(wi === 1 ? [['p', 'rain_intro'], ['p', 'rain_spell'], ['w', cur.word]] : [['p', 'rain_spell'], ['w', cur.word]]);
    void mode;
  }
  picEl.addEventListener('click', () => { if (busy) return; SFX.tap(); lv.mode === 'letter' ? say([['ls', cur.word], ['w', D.LETTER_KEY[cur.word][0]]]) : say(['w', cur.word]); });
  function spawn() {
    const need = gs[gi]; const T = ts();
    const neededOnScreen = tiles.some(t => t.g === need && !t.gone && t.y < field.clientHeight * .7);
    let g;
    if (!neededOnScreen || sinceNeeded >= 2) { g = need; sinceNeeded = 0; }
    else {
      sinceNeeded++;
      const opts = lv.mode === 'sound' && gs.some(x => x.length > 1) ? D.LETTERS.concat(D.DIGRAPHS.slice(0, 7)) : D.LETTERS;
      do { g = pick(opts); } while (g === need);
    }
    const W = field.clientWidth; const lanes = Math.max(3, Math.floor(W / (T * 1.25)));
    const used = tiles.filter(t => t.y < T * 1.5).map(t => t.lane); let lane = rnd(lanes), tries = 0;
    while (used.includes(lane) && tries++ < 8) lane = rnd(lanes);
    const x = (lane + .5) * (W / lanes) - T / 2 + (rnd(20) - 10);
    const d = document.createElement('button'); d.className = 'tileL lt c' + rnd(5); d.style.setProperty('--ts', T + 'px');
    d.innerHTML = `<span>${g}</span>`; field.appendChild(d);
    const t = { el: d, g, x: Math.max(4, Math.min(W - T - 4, x)), y: -T, lane, gone: false, speed: (field.clientHeight + T) / fallMs * (0.85 + Math.random() * .3) };
    d.style.transform = `translate(${t.x}px, ${t.y}px)`;
    d.addEventListener('pointerdown', (e) => { e.preventDefault(); hit(t); });
    tiles.push(t);
  }
  function hit(t) {
    if (t.gone || busy) return; idleT = 0;
    const need = gs[gi], mode = rainVoiceMode(lv, cur);
    if (t.g === need) {
      t.gone = true; SFX.pop();
      const slot = slotsEl.children[gi]; const r = slot.getBoundingClientRect(), f = field.getBoundingClientRect();
      t.el.classList.add('got'); t.el.style.transform = `translate(${r.left - f.left}px, ${r.top - f.top}px) scale(.4)`;
      setTimeout(() => t.el.remove(), 500);
      slot.classList.add('on'); slot.classList.remove('next');
      gi++; if (slotsEl.children[gi]) slotsEl.children[gi].classList.add('next');
      tiles.forEach(o => o.el.classList.remove('glow'));
      if (gi >= gs.length) wordDone(); else say(lv.mode === 'letter' ? [['ls', need], ['ln', need]] : gItems(need, mode));
    } else {
      SFX.boing(); misses++; S.log.misses++;
      t.el.classList.remove('bounce'); void t.el.offsetWidth; t.el.classList.add('bounce');
      if (misses % 2 === 0) { glowNeeded(); say([oops()].concat(gItems(need, mode))); }
      else say(gItems(t.g, mode));
    }
  }
  function glowNeeded() { tiles.forEach(o => { if (o.g === gs[gi] && !o.gone) o.el.classList.add('glow'); }); }
  async function wordDone() {
    busy = true; SFX.chime();
    const mode = rainVoiceMode(lv, cur);
    if (misses <= 1) S.rain.good[lvIdx] = (S.rain.good[lvIdx] || 0) + 1;
    if (misses >= 3) S.hard[cur.word] = (S.hard[cur.word] || 0) + 1;
    else if (misses === 0 && S.hard[cur.word]) S.hard[cur.word]--;
    if (misses >= 4) struggles++;
    S.log.words++; S.rain.done++; save();
    tiles.forEach(t => { t.gone = true; t.el.classList.add('fade'); });
    const slots = $$('.slot', slotsEl);
    const seq = [];
    if (lv.mode === 'letter') seq.push(['ls', cur.word], ['w', D.LETTER_KEY[cur.word][0]]);
    else {
      gs.forEach((g, i) => gItems(g, mode).forEach((it, j) => seq.push({ k: it[0], id: it[1], on: () => { slots.forEach(s => s.classList.remove('hl')); slots[i].classList.add('hl'); } })));
      seq.push({ k: 'w', id: cur.word, on: () => slots.forEach(s => s.classList.add('hl')) });
      seq.push(['p', 'you_spelled'], ['w', cur.word]);
    }
    seq.push(praise());
    burst(picEl); addPoints(lv.mode === 'letter' ? 3 : 5, picEl);
    await say(seq, { gap: mode === 'sound' ? 60 : 30 });
    slots.forEach(s => s.classList.remove('hl'));
    if (!alive) return;
    await wait(300); busy = false; nextWord();
  }
  function finish() {
    alive = false; cancelAnimationFrame(raf);
    let levelUp = false;
    if ((S.rain.good[lvIdx] || 0) >= 6 && lvIdx < D.RAIN_LEVELS.length - 1 && S.rain.unlocked <= lvIdx) { S.rain.unlocked = lvIdx + 1; S.rain.lv = lvIdx + 1; levelUp = true; }
    // adaptive: a hard round quietly steps back one level next time (higher levels stay unlocked)
    if (!levelUp && struggles >= 3 && lvIdx > 0) S.rain.lv = lvIdx - 1;
    save(); addPoints(3, $('.rainHead'));
    roundDone(rainPlay, { levelUp });
  }
  function loop(ts0) {
    if (!alive) return;
    const dt = last ? Math.min(60, ts0 - last) : 16; last = ts0;
    if (!busy) {
      spawnT += dt; idleT += dt;
      const maxT = lv.mode === 'letter' ? 5 : 6;
      if (spawnT > 1500 && tiles.filter(t => !t.gone).length < maxT) { spawnT = 0; spawn(); }
      if (idleT > 9000) { idleT = 0; glowNeeded(); const m = rainVoiceMode(lv, cur); say([['p', 'rain_next']].concat(lv.mode === 'letter' ? [['ls', gs[gi]]] : gItems(gs[gi], m))); }
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
  nextWord(); raf = requestAnimationFrame(loop);
  window.__rain = { cur: () => cur, need: () => gs[gi], tiles: () => tiles, hit };
}

// ================= STORYBOOK =================
function shelf() {
  show('shelf', topBar('Story Time') + `<div class="books">${D.STORIES.map((s, i) => `<button class="book" data-i="${i}" style="background:${s.color}">
    ${S.story.read[s.id] ? '<span class="done emoji">✅</span>' : ''}<span class="big emoji">${s.cover}</span><b>${esc(s.title)}</b><span class="lvl">${'⭐'.repeat(Math.ceil(s.level / 2))}</span></button>`).join('')}</div>`, (el) => {
    $$('.book', el).forEach(b => b.addEventListener('click', () => { SFX.pop(); reader(+b.dataset.i, 0); }));
  });
  prompt([['p', 'm_story'], ['p', 'story_pick']]);
}
function reader(si, pi) {
  const st = D.STORIES[si];
  const el = show('reader', topBar(esc(st.title), { back: 'story', backIcon: '📚' }) + `<div class="scene"></div><div class="storyText"></div>
  <div class="readerNav"><button class="navBtn" data-n="-1" aria-label="Back">${E('⬅️')}</button><div class="dots"></div>
  <button class="navBtn read" data-read aria-label="Read to me">${E('🔊')}</button><div class="dots2"></div><button class="navBtn go" data-n="1" aria-label="Next">${E('➡️')}</button></div>`);
  const scene = $('.scene', el), text = $('.storyText', el);
  let reading = false;
  function render() {
    const p = st.pages[pi];
    scene.className = 'scene bg-' + p.bg;
    scene.innerHTML = p.s.map(([e, x, y, sz, a]) => `<div class="sprite" style="left:${x}%;top:${y}%;font-size:${sz}vmin"><span class="emoji ${a ? 'l-' + a : ''}">${e}</span></div>`).join('');
    const toks = D.tokens(p.t);
    text.className = 'storyText' + (p.t.length > 46 ? ' smaller' : p.t.length > 28 ? ' small' : '');
    text.innerHTML = toks.map((t, i) => `<span class="word lt" data-i="${i}" data-w="${esc(t.w)}">${esc(t.raw)}</span>`).join('');
    $('.dots', el).innerHTML = st.pages.map((_, i) => `<i class="${i === pi ? 'on' : ''}"></i>`).join('');
    $('[data-n="-1"]', el).disabled = pi === 0;
    $('[data-n="1"]', el).innerHTML = pi === st.pages.length - 1 ? E('🏁') : E('➡️');
    const key = st.id + '-' + pi;
    if (!S.story.pages[key]) { S.story.pages[key] = 1; save(); addPoints(1, text); }
    lastPrompt = [{ k: 's', id: key }];
    if (si === 0 && pi === 0 || (pi === 0 && !S.story.read[st.id] && Object.keys(S.story.read).length === 0)) prompt([['p', 'story_tap']]);
    else if (pi === 0) say(['w', st.title]);
  }
  text.addEventListener('pointerdown', (e) => {
    const w = e.target.closest('.word'); if (!w || !w.dataset.w) return;
    reading = false; SFX.tap(); $$('.word', text).forEach(x => x.classList.remove('hl'));
    w.classList.add('tap'); setTimeout(() => w.classList.remove('tap'), 600);
    say(['w', w.dataset.w]);
  });
  scene.addEventListener('pointerdown', (e) => { const s = e.target.closest('.sprite'); if (s) { SFX.boing(); anim(s, 'jump'); } });
  $('[data-read]', el).addEventListener('click', () => readToMe());
  function readToMe() {
    SFX.tap(); const key = st.id + '-' + pi, tim = M.pages[key] || []; const words = $$('.word', text);
    reading = true;
    say([{ k: 's', id: key, time: (ms) => { words.forEach((w, i) => w.classList.toggle('hl', !!tim[i] && ms >= tim[i][0] - 40 && (ms < (tim[i + 1] ? tim[i + 1][0] - 40 : tim[i][1] + 300)))); } }])
      .then(() => { words.forEach(w => w.classList.remove('hl')); reading = false; });
  }
  $$('[data-n]', el).forEach(b => b.addEventListener('click', () => {
    const n = +b.dataset.n; SFX.whoosh();
    if (n > 0 && pi === st.pages.length - 1) return storyEnd();
    pi = Math.max(0, Math.min(st.pages.length - 1, pi + n)); hush(); render();
  }));
  function storyEnd() {
    const first = !S.story.read[st.id]; S.story.read[st.id] = (S.story.read[st.id] || 0) + 1; S.log.stories++; save();
    addPoints(first ? 10 : 4, $('.scene'));
    SFX.tada();
    const o = overlay(`<div class="huge emoji">${st.cover}</div><h2>The End!</h2><div class="row"><button class="navBtn go" data-a="again" aria-label="Read again">${E('🔁')}</button><button class="navBtn" data-a="shelf" aria-label="More stories">${E('📚')}</button><button class="navBtn" data-a="home" aria-label="Home">${E('🏠')}</button></div>`);
    burst($('.huge', o)); lastPrompt = ['p', 'the_end']; say(['p', 'the_end']);
    o.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; SFX.tap(); o.remove(); ({ again: () => reader(si, 0), shelf, home })[b.dataset.a](); });
  }
  render();
  window.__reader = { readToMe, page: () => pi };
}

// ================= WORD RACE =================
function raceMap() {
  const lv = D.RACE_LEVELS.map((l, i) => ({ name: l.name, icon: ['🚗', '🚙', '🚌', '🚓', '🏎️'][i], color: ['#ef5350', '#42a5f5', '#66bb6a', '#ab47bc', '#ffa726'][i] }));
  levelMap('raceMap', 'Word Race', lv, S.race.lv, S.race.unlocked, (i) => { S.race.lv = i; save(); racePlay(); });
  prompt([['p', 'm_race'], ['p', 'pick_level']]);
}
const CAR_COLORS = ['cBlue', 'cRed', 'cGreen', 'cPurple', 'cOrange', 'cTeal'];
function racePlay() {
  const lvIdx = S.race.lv, L = D.RACE_LEVELS[lvIdx];
  let round = 0, chosen = [], si = 0, alive = true, noun = null;
  const el = show('race', topBar(`${E('🏎️')} ${esc(L.name)}`, { back: 'race', backIcon: '⬅️' }) + `<div class="raceStage"><div class="track"></div></div><div class="garage"></div>`);
  const track = $('.track', el), garage = $('.garage', el), stage = $('.raceStage', el);
  cleanup = () => { alive = false; };
  function options(slot) {
    if (slot === 'The') return [{ w: 'The', say: 'the' }];
    if (slot === 'can') return [{ w: 'can', say: 'can' }];
    if (slot === 'noun') return shuffle(D.RACE_NOUNS).slice(0, 3).map(n => ({ w: n.s, say: n.s, noun: n }));
    if (slot === 'nounP') return shuffle(D.RACE_NOUNS.filter(n => n.p !== n.s)).slice(0, 3).map(n => ({ w: n.p, say: n.p, noun: n, plural: true }));
    if (slot === 'verbB') return shuffle(D.RACE_VERBS).slice(0, 3).map(v => ({ w: v.b, say: v.b, verb: v }));
    if (slot === 'verbS') return shuffle(D.RACE_VERBS).slice(0, 3).map(v => ({ w: v.s, say: v.s, verb: v }));
    if (slot === 'adj') return shuffle(D.RACE_ADJS).slice(0, 3).map(a => ({ w: a.w, say: a.w, adj: a }));
    if (slot === 'place') return shuffle(D.RACE_PLACES).slice(0, 3).map(p => ({ w: p.w, say: p.w, place: p }));
    return [];
  }
  const disp = (o, i) => { let w = o.w; if (i === 0) w = w[0].toUpperCase() + w.slice(1); return w; };
  function newSentence() {
    chosen = []; si = 0;
    track.innerHTML = L.slots.map((_, i) => `<div class="spot ${i === 0 ? 'cur' : ''}" data-i="${i}"></div>`).join('');
    showChoices();
    prompt(round === 0 ? [['p', 'race_intro'], ['p', 'race_pick']] : [['p', 'race_pick']]);
  }
  function showChoices() {
    $$('.hand', el).forEach(h => h.remove());
    const opts = options(L.slots[si]);
    garage.innerHTML = '';
    opts.forEach((o, i) => {
      const c = document.createElement('div'); c.className = 'car lt ' + CAR_COLORS[(si * 2 + i) % CAR_COLORS.length];
      c.innerHTML = `<span class="win"></span>${esc(disp(o, si))}`; c._o = o; garage.appendChild(c); dragCar(c);
    });
    if (round === 0 && si === 0) { const h = document.createElement('div'); h.className = 'hand emoji'; h.textContent = '👆'; const r = garage.firstChild.getBoundingClientRect(), s = el.getBoundingClientRect(); h.style.left = (r.left - s.left + r.width / 2) + 'px'; h.style.top = (r.bottom - s.top) + 'px'; el.appendChild(h); }
  }
  function dragCar(c) {
    let sx, sy, ox, oy, moved = false, down = false;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault(); down = true; moved = false; sx = e.clientX; sy = e.clientY;
      const r = c.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
      try { c.setPointerCapture(e.pointerId); } catch (er) {}
      SFX.tap(); say(['w', c._o.say]);
      if (c.classList.contains('sel')) { c._tapSend = true; } else { $$('.car.sel', garage).forEach(x => x.classList.remove('sel')); c.classList.add('sel'); c._tapSend = false; }
    });
    c.addEventListener('pointermove', (e) => {
      if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 12) { moved = true; c.classList.add('dragging'); c.style.position = 'fixed'; c.style.margin = 0; }
      if (moved) { c.style.left = (e.clientX - ox) + 'px'; c.style.top = (e.clientY - oy) + 'px'; const tr = track.getBoundingClientRect(); track.classList.toggle('drop', e.clientY < tr.bottom + 40); }
    });
    const up = (e) => {
      if (!down) return; down = false; track.classList.remove('drop');
      if (moved) {
        const tr = track.getBoundingClientRect();
        c.classList.remove('dragging'); c.style.position = ''; c.style.left = ''; c.style.top = '';
        if (e.clientY < tr.bottom + 40) place(c); else SFX.boing();
      } else if (c._tapSend) place(c);
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  }
  async function place(c) {
    if (!alive) return;
    const o = c._o; chosen.push(o); if (o.noun) noun = o;
    $$('.hand', el).forEach(h => h.remove());
    const spot = track.children[si]; spot.classList.remove('cur'); spot.classList.add('filled');
    c.classList.remove('sel'); spot.appendChild(c); SFX.vroom(); anim(c, 'jump2');
    garage.innerHTML = ''; si++;
    if (si < L.slots.length) { track.children[si].classList.add('cur'); showChoices(); }
    else await finishSentence();
  }
  async function finishSentence() {
    const cars = $$('.car', track);
    await say(['p', 'race_go']); if (!alive) return;
    await say(chosen.map((o, i) => ({ k: 'w', id: o.say, on: () => { cars.forEach(x => x.classList.remove('reading')); void cars[i].offsetWidth; cars[i].classList.add('reading'); } })), { gap: 90 });
    if (!alive) return;
    SFX.vroom(); cars.forEach((c, i) => setTimeout(() => c.classList.add('vroom'), i * 60));
    await wait(900); if (!alive) return;
    // act it out
    const nounO = chosen.find(o => o.noun), verbO = chosen.find(o => o.verb), adjO = chosen.find(o => o.adj), placeO = chosen.find(o => o.place);
    const sentence = chosen.map((o, i) => disp(o, i)).join(' ') + (chosen.length > 2 ? '.' : '!');
    const bg = placeO ? placeO.place.bg : pick(['grass', 'sunny', 'road']);
    const n = nounO.plural ? 3 : 1;
    const show_ = document.createElement('div'); show_.className = 'showtime bg-' + bg;
    show_.innerHTML = `<div class="stage">${placeO ? `<div class="placeE emoji" style="left:8%;top:12%">${placeO.place.e}</div>` : ''}
      ${Array.from({ length: n }, (_, i) => `<div class="actor ${adjO ? 'mod-' + adjO.adj.a : ''}" style="left:${n > 1 ? 25 + i * 25 : 50}%"><span><span class="emoji">${nounO.noun.e}</span></span>${adjO && adjO.adj.a === 'happy' ? '<span class="tag emoji" style="top:-10%;right:-10%">😄</span>' : ''}${adjO && adjO.adj.a === 'sleepy' ? '<span class="tag emoji" style="top:-10%;right:-10%">💤</span>' : ''}${adjO && adjO.adj.a === 'fast' ? '<span class="tag emoji" style="top:30%;left:-30%">💨</span>' : ''}</div>`).join('')}</div>
      <div class="sentence lt">${esc(sentence)}</div>`;
    el.appendChild(show_);
    const actors = $$('.actor', show_);
    const doAct = () => actors.forEach((a, i) => setTimeout(() => anim(a.firstElementChild, verbO.verb.a, $('.stage', show_)), i * 150));
    doAct(); const words = chosen.map(o => o.say);
    await say(words.map((w, i) => ({ k: 'w', id: w, on: i === words.length - 1 ? doAct : null })), { gap: 40 });
    if (!alive) return;
    S.log.sentences++; S.race.done++; S.race.good[lvIdx] = (S.race.good[lvIdx] || 0) + 1; save();
    addPoints(5, show_); await say([praise()]); await wait(700);
    if (!alive) return;
    show_.remove(); round++;
    if (round >= 4) {
      let levelUp = false;
      if (S.race.good[lvIdx] >= 6 && lvIdx < D.RACE_LEVELS.length - 1 && S.race.unlocked <= lvIdx) { S.race.unlocked = lvIdx + 1; S.race.lv = lvIdx + 1; levelUp = true; }
      save(); roundDone(racePlay, { levelUp });
    } else newSentence();
  }
  newSentence();
  window.__race = { place: () => { const c = garage.firstChild; if (c) place(c); }, si: () => si };
}

// ================= ACTION WORDS =================
function actionHome(mode) {
  mode = mode || 'explore';
  const el = show('action', topBar('Action Words') + `<div class="actModes">
    <button class="modeBtn ${mode === 'explore' ? 'on' : ''}" data-m="explore">${E('🎈')}<span>Play</span></button>
    <button class="modeBtn ${mode === 'match' ? 'on' : ''}" data-m="match">${E('🎯')}<span>Match</span></button>
    <button class="modeBtn ${mode === 'phrase' ? 'on' : ''}" data-m="phrase">${E('📜')}<span>Read & Do</span></button></div>
    <div class="actStage"><div class="buddy"><span class="emoji">🐉</span></div></div><div class="actWords"></div>`);
  $$('.modeBtn', el).forEach(b => b.addEventListener('click', () => { SFX.pop(); actionHome(b.dataset.m); say(['p', { explore: 'action_explore', match: 'action_match_btn', phrase: 'action_phrase_btn' }[b.dataset.m]]); }));
  const stage = $('.actStage', el), buddy = $('.buddy', el), words = $('.actWords', el);
  let alive = true; cleanup = () => { alive = false; };
  buddy.addEventListener('click', () => { SFX.boing(); anim(buddy, 'jump', stage); });
  if (mode === 'explore') {
    const list = S.act.lv === 0 ? D.ACTIONS.slice(0, 10) : D.ACTIONS;
    words.innerHTML = list.map(a => `<button class="aw lt" data-w="${a.w}" data-a="${a.a}"><span>${a.w}</span></button>`).join('');
    $$('.aw', words).forEach(b => b.addEventListener('click', () => {
      SFX.pop(); say(['w', b.dataset.w]); anim(b, b.dataset.a, words); setTimeout(() => anim(buddy, b.dataset.a, stage), 250);
      if (!S.act.seen[b.dataset.w]) { S.act.seen[b.dataset.w] = 1; save(); addPoints(1, b); }
    }));
    setTimeout(() => prompt([['p', 'm_action'], ['p', 'action_intro']]), 50);
  } else if (mode === 'match') {
    let n = 0, firstTry = true, target;
    const nChoices = [2, 3, 4, 4][S.act.lv] || 3;
    const next = () => {
      if (!alive) return;
      if (n >= 6) { const levelUp = S.act.good >= 10 && S.act.lv < 3 && (S.act.good = 0, S.act.lv++, true); save(); return roundDone(() => actionHome('match'), { levelUp }); }
      n++; firstTry = true;
      const pool = S.act.lv === 0 ? D.ACTIONS.slice(0, 10) : D.ACTIONS;
      target = pick(pool); const opts = shuffle([target].concat(shuffle(pool.filter(a => a.w !== target.w && a.a !== target.a)).slice(0, nChoices - 1)));
      words.innerHTML = opts.map(a => `<button class="aw big3 lt" data-w="${a.w}" data-a="${a.a}"><span>${a.w}</span></button>`).join('');
      const loopAnim = () => { if (alive && words.contains(document.activeElement) === false) anim(buddy, target.a, stage); };
      anim(buddy, target.a, stage); clearInterval(stage._iv); stage._iv = setInterval(() => alive && target && anim(buddy, target.a, stage), 3200);
      void loopAnim;
      prompt([['p', 'action_match']]);
      $$('.aw', words).forEach(b => b.addEventListener('click', async () => {
        if (b.dataset.w === target.w) {
          clearInterval(stage._iv); SFX.chime(); b.classList.add('right'); anim(b, b.dataset.a, words); burst(b);
          S.log.matches++; if (firstTry) S.act.good++; S.act.done++; save(); addPoints(firstTry ? 3 : 1, b);
          const tg = target; target = null; await say([['w', tg.w], praise()]); if (alive) setTimeout(next, 400);
        } else {
          SFX.boing(); firstTry = false; b.classList.add('wrongish'); anim(b, b.dataset.a, words);
          say([['p', 'that_says'], ['w', b.dataset.w], oops()]);
        }
      }));
    };
    cleanup = () => { alive = false; clearInterval(stage._iv); };
    next();
  } else {
    const list = D.ACTION_PHRASES.slice(0, S.act.lv >= 2 ? D.ACTION_PHRASES.length : 6 + S.act.lv * 3);
    let n = 0;
    const next = () => {
      if (!alive) return;
      if (n >= 5) return roundDone(() => actionHome('phrase'));
      n++; const ph = pick(list);
      words.innerHTML = `<div class="phrase">${ph.w.split(' ').map(w => `<button class="aw big3 lt" data-w="${w}"><span>${w}</span></button>`).join('')}<button class="goBtn" aria-label="Go">${E('▶️')}</button></div>`;
      $$('.aw', words).forEach(b => b.addEventListener('click', () => { SFX.tap(); say(['w', b.dataset.w]); anim(b, 'jump2', words); }));
      let did = false;
      $('.goBtn', words).addEventListener('click', async () => {
        SFX.whoosh(); const bs = $$('.aw', words);
        await say(ph.w.split(' ').map((w, i) => ({ k: 'w', id: w, on: () => anim(bs[i], 'jump2', words) })), { gap: 60 });
        for (const a of ph.a) { if (!alive) return; anim(buddy, a, stage); await wait(1900); }
        if (!did) { did = true; addPoints(2, buddy); S.log.matches++; save(); await say([praise()]); setTimeout(next, 300); }
      });
      prompt([['p', 'action_phrase']]);
    };
    next();
  }
}

// ================= GALLERY =================
function roomUnlocked(i) { if (i === 0) return true; const prev = D.ROOMS[i - 1]; return (S.owned[prev.id] || []).length >= D.ROOMS[i].need; }
function gallery(ri) {
  if (ri == null) ri = S.lastRoom || 0;
  S.lastRoom = ri; save();
  const room = D.ROOMS[ri], own = S.owned[room.id] || (S.owned[room.id] = []), unlocked = roomUnlocked(ri);
  const el = show('gallery', topBar('Star Gallery') + `<div class="roomTabs">${D.ROOMS.map((r, i) => `<button class="rTab ${i === ri ? 'on' : ''} ${roomUnlocked(i) ? '' : 'locked'}" data-r="${i}">${E(roomUnlocked(i) ? r.icon : '🔒')}<span>${esc(r.name)}</span></button>`).join('')}</div>
    <div class="room rbg-${room.bg}"></div><div class="shop"></div>`);
  const roomEl = $('.room', el), shop = $('.shop', el);
  $$('.rTab', el).forEach(b => b.addEventListener('click', () => { SFX.pop(); const i = +b.dataset.r; gallery(i); say(['w', D.ROOMS[i].name]); }));
  function renderRoom(newIdx) {
    const amb = { castle: '<div class="crenel"></div><div class="amb emoji l-flicker" style="left:8%;top:30%;font-size:5vmin">🔥</div><div class="amb emoji l-flicker" style="right:8%;top:30%;font-size:5vmin">🔥</div>',
      ocean: '<div class="amb emoji l-float" style="left:40%;top:50%;font-size:4vmin">🫧</div><div class="amb emoji l-float" style="left:70%;top:40%;font-size:3vmin">🫧</div>',
      space: '<div class="amb emoji l-twinkle" style="left:22%;top:30%;font-size:3vmin">✨</div><div class="amb emoji l-twinkle" style="left:70%;top:70%;font-size:3vmin">✨</div>',
      cave: '<div class="amb emoji l-twinkle" style="left:50%;top:10%;font-size:3vmin">✨</div>', jungle: '<div class="amb emoji l-wiggle" style="left:50%;top:6%;font-size:6vmin">🍃</div>', bedroom: '', workshop: '' }[room.bg] || '';
    roomEl.innerHTML = amb + `<div class="fillBar">${E(room.icon)} ${own.length}/${room.items.length}<span class="bar"><i style="width:${own.length / room.items.length * 100}%"></i></span></div>` +
      room.items.map((it, i) => own.includes(i) ? `<div class="item ${i === newIdx ? 'new' : ''}" data-i="${i}" style="left:${it[3]}%;top:${it[4]}%;font-size:${it[5]}vmin"><span class="emoji">${it[1]}</span></div>`
        : `<div class="ghost emoji" style="left:${it[3]}%;top:${it[4]}%;font-size:${it[5]}vmin">${it[1]}</div>`).join('') +
      (unlocked ? '' : `<div class="lockCover"><span class="emoji">🔒</span><span>${esc(D.ROOMS[ri - 1].name)} ${E(D.ROOMS[ri - 1].icon)} ${(S.owned[D.ROOMS[ri - 1].id] || []).length}/${room.need}</span></div>`);
    $$('.item', roomEl).forEach(d => d.addEventListener('click', () => { SFX.boing(); const it = room.items[+d.dataset.i]; anim(d, pick(['jump', 'wiggle', 'spin', 'dance']), roomEl); say(['w', it[0]]); }));
  }
  function renderShop() {
    shop.innerHTML = unlocked ? room.items.map((it, i) => own.includes(i) ? '' : `<button class="shopItem ${S.stars >= it[2] ? 'can' : 'cant'}" data-i="${i}">${E(it[1])}<span class="pr">⭐ ${it[2]}</span></button>`).join('') : '';
    $$('.shopItem', shop).forEach(b => b.addEventListener('click', () => buy(+b.dataset.i, b)));
  }
  function buy(i, b) {
    const it = room.items[i];
    if (S.stars < it[2]) { SFX.boing(); anim(b, 'shake'); return say([['w', it[0]], ['p', 'need_stars']]); }
    S.stars -= it[2]; own.push(i); save(); renderStars(); SFX.buy();
    const wasLocked = ri + 1 < D.ROOMS.length && own.length === D.ROOMS[ri + 1].need;
    renderRoom(i); renderShop();
    const d = $(`.item[data-i="${i}"]`, roomEl); if (d) burst(d);
    const seq = [['w', it[0]], praise()];
    if (wasLocked) { seq.push(['p', 'new_room']); setTimeout(() => { const t = $$('.rTab', el)[ri + 1]; if (t) { t.classList.remove('locked'); t.innerHTML = E(D.ROOMS[ri + 1].icon) + `<span>${esc(D.ROOMS[ri + 1].name)}</span>`; anim(t, 'jump'); } }, 600); }
    if (own.length === room.items.length) seq.push(['p', 'p6']);
    say(seq);
  }
  renderRoom(); renderShop();
  prompt(unlocked ? [['p', 'm_gallery'], ['p', 'gallery_intro']] : [['w', room.name], ['p', 'room_locked']]);
}

// ================= boot =================
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());
document.addEventListener('touchmove', e => { if (!e.target.closest('.shop, .roomTabs, .card')) e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hush(); });
window.__app = { S: () => S, save, go, addPoints, say, AU, D, reader, gallery, actionHome, rainPlay, racePlay };
start();
})();
