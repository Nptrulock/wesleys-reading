#!/usr/bin/env python3
"""v3 expansion checks (headless Chrome, touch emulation) at iPad landscape / iPad portrait / phone:
level map + stars, every Letter Rain variant, slow mastery + multi-day rule, story shelves, long race
levels with two nouns, Action Words levels, gallery item actions + labels + interactions + decor,
save migration from v2, zero console errors; on iPad-landscape also a full in-browser decode of every
speakable clip, the lazy audio cache, Range 206 and offline play."""
import json, sys, re
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8781/'
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
SHOTS = '/workspace/personal-ops/wesley-reading/shots/'
SIZES = [('ipad-land', 1024, 768, False), ('ipad-port', 820, 1180, False), ('phone', 390, 844, True)]
res = []; errs = []; bad = []
def rec(n, ok, info=''): res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' ' + str(info)[:400] if info else ''), flush=True)
def tap(pg, sel, i=0):
    bb = pg.locator(sel).nth(i).bounding_box(); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
SOLVE = """async (n) => { // catch the needed tiles for n items
  const W = (ms) => new Promise(r => setTimeout(r, ms)); let done = 0, guard = 0;
  while (done < n && guard++ < 3000) {
    const wi = __rain.wi();
    const t = __rain.tiles().find(t => !t.gone && t.y > 0 && __rain.isNeed(t.g));
    if (t) { __rain.hit(t); await W(80); }
    else await W(150);
    if (__rain.wi() !== wi || document.querySelector('.overlay')) done++;
    if (document.querySelector('.overlay')) break;
  }
  return done; }"""
V4_SAVE = {"v": 4, "stars": 5, "points": 0, "totalStars": 50, "rain": {"lv": 20, "unlocked": 20, "prog": {"dig-sh": {"pts": 40, "rounds": 5, "days": ["2026-11-15"]}, "dig-ch": {"pts": 8, "rounds": 1, "days": ["2026-11-15"]}}, "vi": {}, "good": {}, "done": 0}, "story": {"read": {}, "pages": {}, "shelves": 1},
            "race": {"lv": 2, "unlocked": 2, "prog": {"r3": {"pts": 99, "rounds": 3, "days": ["x"]}}, "good": {}, "done": 0}, "act": {"lv": 0, "unlocked": 0, "prog": {}, "good": 0, "done": 0, "seen": {}}, "owned": {}, "log": {"words": 3}}
OLD_SAVE = {"v": 1, "stars": 17, "points": 4, "totalStars": 40, "rain": {"lv": 3, "good": {"3": 2}, "done": 30, "unlocked": 4}, "story": {"read": {"sam": 1, "bug": 2}, "pages": {}},
            "race": {"lv": 2, "good": {}, "done": 5, "unlocked": 2}, "act": {"lv": 1, "good": 3, "done": 4, "seen": {}}, "owned": {"bedroom": [0, 1, 2, 3, 4, 5], "castle": [0, 2]}, "log": {"words": 30}}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
    for tag, W, H, mob in SIZES:
        if ONLY and tag not in ONLY: continue
        ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=True)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e, t=tag: errs.append(t + ' pageerror ' + str(e)))
        pg.on('console', lambda m, t=tag: m.type == 'error' and errs.append(t + ' console ' + m.text))
        pg.on('response', lambda r, t=tag: r.status >= 400 and bad.append(t + f' {r.status} ' + r.url))
        pg.goto(BASE + ('?simsafe' if mob else ''), wait_until='networkidle'); pg.wait_for_timeout(500)
        # ---------- migration from a v2 save ----------
        pg.evaluate("s => { localStorage.clear(); localStorage.setItem('wesReading.v1', JSON.stringify(s)); }", OLD_SAVE)
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400)
        tap(pg, '#startBtn'); pg.wait_for_timeout(2200)
        m = pg.evaluate("(()=>{const S=__app.S(),D=__app.D;return {v:S.v,stars:S.stars,owned:S.owned,read:Object.keys(S.story.read),rain:D.RAIN_LEVELS[S.rain.lv].id,unl:D.RAIN_LEVELS[S.rain.unlocked].id,race:D.RACE_LEVELS[S.race.lv].id,act:D.ACT_LEVELS[S.act.lv].id,blL:(S.rain.prog['bl-l']||{}).ls,bronze:S.medals[0],got:S.wg.got.length}})()")
        rec(f'{tag} migration: v2 save keeps stars/items/stories, maps levels (v5: passed levels = bronze, rewards granted)', m['v'] == 5 and m['stars'] == 17 and m['owned']['bedroom'] == [0, 1, 2, 3, 4, 5] and m['read'] == ['sam', 'bug'] and m['rain'] == 'bl-l' and m['unl'] == 'sight-5' and m['race'] == 'r4' and m['act'] == 'd1' and m['blL'] == 10 and m['bronze'] > 5 and m['got'] == m['bronze'], m)
        # v4 save: a level blocked only by the old day gate opens, progress becomes bronze stars
        pg.evaluate("s => { localStorage.clear(); localStorage.setItem('wesReading.v1', JSON.stringify(s)); }", V4_SAVE)
        pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400); tap(pg, '#startBtn'); pg.wait_for_timeout(1500)
        m = pg.evaluate("(()=>{const S=__app.S(),D=__app.D;return {v:S.v,unl:D.RAIN_LEVELS[S.rain.unlocked].id,dig:S.rain.prog['dig-sh'].ls,half:S.rain.prog['dig-ch'].ls,raceUnl:S.race.unlocked}})()")
        rec(f'{tag} migration v4->v5: day-gated level (points met) unlocks next; half-way progress = 5 bronze stars', m['v'] == 5 and m['unl'] == 'dig-ch' and m['dig'] == 10 and m['half'] == 5 and m['raceUnl'] == 3, m)
        log = pg.evaluate("__AU.log.map(l=>[l.src,l.ok])")
        rec(f'{tag} greeting (random welcome line) played', any('/p/welcome' in s and ok for s, ok in log), log[:2])
        # fresh player
        pg.evaluate("localStorage.clear()"); pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400); tap(pg, '#startBtn'); pg.wait_for_timeout(1200)
        rec(f'{tag} new player starts at Short a (abc + first sounds open)', pg.evaluate("__app.D.RAIN_LEVELS[__app.S().rain.lv].id") == 'cvc-a')
        # ---------- level map ----------
        pg.evaluate("(()=>{const S=__app.S();S.rain.unlocked=30;S.rain.lv=22;S.rain.prog={'abc1':{pts:99,rounds:3,days:[],ls:30},'cvc-a':{pts:12,rounds:3,days:[],ls:17},'cvc-i':{pts:4,rounds:1,days:[],ls:4}};__app.save()})()")
        pg.evaluate("__app.go('rain')"); pg.wait_for_timeout(900)
        mp = pg.evaluate("(()=>({n:document.querySelectorAll('.lvBtn').length,locked:document.querySelectorAll('.lvBtn.locked').length,on:[...document.querySelectorAll('.lvBtn .medals b')].filter(b=>parseFloat(b.style.width)>0).length,scroll:document.querySelector('.levelMap').scrollHeight>document.querySelector('.levelMap').clientHeight}))()")
        rec(f'{tag} level map: 64 Letter Rain levels, bronze/silver/gold bars shown, scrolls', mp['n'] == 64 and mp['locked'] == 33 and mp['on'] == 6 and mp['scroll'], mp)
        pg.screenshot(path=SHOTS + f'v4-{tag}-medal-levelmap.png')
        # ---------- every Letter Rain variant ----------
        cases = [('abc1', 'find'), ('abcU', 'case'), ('begin', 'begin'), ('cvc-a', 'spell'), ('cvc-i', 'missing'), ('cvc-o', 'end'), ('cvc-u', 'middle'), ('fam-a', 'rhyme'), ('sight-3', 'wordfind'), ('vt-ai', 'spell'), ('di-ou', 'missing'), ('big', 'missing2')]
        for lid, var in cases:
            if mob and lid not in ('abcU', 'fam-a', 'big', 'vt-ai'): continue
            pg.evaluate("([lid,v])=>{const S=__app.S(),D=__app.D,i=D.RAIN_LEVELS.findIndex(l=>l.id===lid),L=D.RAIN_LEVELS[i];S.rain.unlocked=63;S.rain.lv=i;S.rain.vi[lid]=L.variants.indexOf(v);__app.rainPlay()}", [lid, var])
            pg.wait_for_timeout(4200)
            info = pg.evaluate("(()=>({v:__rain.variant,it:__rain.it().v,need:__rain.need(),slots:[...document.querySelectorAll('#rain .slot')].map(s=>s.textContent+(s.classList.contains('pre')?'*':'')),tiles:__rain.tiles().filter(t=>!t.gone).map(t=>t.g)}))()")
            if lid in ('fam-a', 'big', 'sight-3', 'abcU', 'di-ou'): pg.screenshot(path=SHOTS + f'v4-{tag}-rain-{lid}-{var}.png')
            p0 = pg.evaluate("[__app.S().rain.prog[%r]?__app.S().rain.prog[%r].pts:0,(__AU.log.length=0)]" % (lid, lid))
            got = pg.evaluate(SOLVE, 1); pg.wait_for_timeout(300)
            p1 = pg.evaluate("__app.S().rain.prog[%r].pts" % lid)
            srcs = pg.evaluate("__AU.log.slice(%d).filter(l=>l.ok).map(l=>l.src.replace(/^.*audio\\//,''))" % p0[1])
            rec(f'{tag} rain {lid}/{var}: item solved, mastery points added, audio ok', info['v'] == var and got >= 1 and p1 > p0[0] and len(srcs) >= 1, [info, p0[0], p1, srcs[:6]])
        # harder level config grows with level number
        cfgs = pg.evaluate("(()=>{const D=__app.D,S=__app.S();const r=[];for(const id of ['cvc-a','big']){S.rain.lv=D.RAIN_LEVELS.findIndex(l=>l.id===id);__app.rainPlay();r.push(__rain.cfg)}return r})()")
        rec(f'{tag} rain difficulty rises (more tiles, faster fall)', cfgs[1]['maxT'] > cfgs[0]['maxT'] and cfgs[1]['fall'] < cfgs[0]['fall'], cfgs)
        # ---------- medals: 10 stars per tier, no day gates; the next level opens the moment bronze is full ----------
        r = pg.evaluate("""async()=>{const D=__app.D,S=__app.S();
          const i=D.RAIN_LEVELS.findIndex(l=>l.id==='dig-sh');S.rain.unlocked=i;S.rain.lv=i;S.rain.prog['dig-sh']={pts:0,rounds:9,days:[],ls:8};__app.save();__app.rainPlay();return i}""")
        g0 = pg.evaluate("__app.S().wg.got.length")
        pg.evaluate(SOLVE, 7); pg.wait_for_selector('.overlay', timeout=240000); pg.wait_for_timeout(3600)
        st = pg.evaluate("(()=>({unl:__app.S().rain.unlocked,ls:__app.S().rain.prog['dig-sh'].ls,h:document.querySelector('.overlay h2').textContent,next:!!document.querySelector('.overlay [data-a=next]'),bars:document.querySelectorAll('.overlay .medals.big i').length,txt:document.querySelector('.tierTxt').textContent,chip:document.querySelectorAll('.rewardChip').length,got:__app.S().wg.got.length}))()")
        rec(f'{tag} medals: a clean round adds 3 stars; 8 -> 11 = bronze medal, next level opens at once (+Next), reward unlocked', st['unl'] == r + 1 and st['ls'] == 11 and st['h'] == 'Bronze medal!' and st['next'] and st['bars'] == 3 and st['txt'].startswith('1 of 10') and st['chip'] == 1 and st['got'] == g0 + 1, st)
        pg.screenshot(path=SHOTS + f'v4-{tag}-medal-bronze.png')
        n0 = pg.evaluate("(__AU.log.length=0)"); pg.wait_for_timeout(5000)
        rec(f'{tag} medals: spoken medal + reward lines', pg.evaluate("__AU.log.slice(%d).some(l=>/medal_bronze|reward_/.test(l.src)&&l.ok)" % 0), pg.evaluate("__AU.log.slice(-6).map(l=>l.src.replace(/^.*audio\\//,''))"))
        pg.evaluate("document.querySelector('.overlay').remove()")
        # partial round: 'N more stars' line, no lock message
        pg.evaluate("(()=>{const S=__app.S();S.rain.prog['dig-sh'].ls=12;__app.rainPlay()})()"); pg.evaluate(SOLVE, 7); pg.wait_for_selector('.overlay', timeout=240000); pg.wait_for_timeout(4500)
        st = pg.evaluate("(()=>({ls:__app.S().rain.prog['dig-sh'].ls,txt:document.querySelector('.tierTxt').textContent,said:__AU.log.slice(-8).map(l=>l.src.replace(/^.*audio\\//,''))}))()")
        rec(f'{tag} medals: silver progress "5 of 10" + spoken "5 more stars to the silver medal"', st['ls'] == 15 and st['txt'].startswith('5 of 10') and any('more_s_5' in x for x in st['said']), st)
        pg.screenshot(path=SHOTS + f'v4-{tag}-rain-round-done.png')
        pg.evaluate("document.querySelector('.overlay').remove()")
        # ---------- stories ----------
        pg.evaluate("(()=>{const S=__app.S();S.story.read={sam:1,bug:1,pig:1};__app.go('story')})()"); pg.wait_for_timeout(700)
        sh = pg.evaluate("(()=>({books:document.querySelectorAll('.book').length,rows:document.querySelectorAll('.shelfRow').length,locked:document.querySelectorAll('.shelfRow.locked').length}))()")
        rec(f'{tag} story shelves: 33 stories on 8 shelves, later shelves locked', sh['books'] == 33 and sh['rows'] == 8 and sh['locked'] == 6, sh)
        pg.screenshot(path=SHOTS + f'v4-{tag}-shelves.png')
        pg.evaluate("(()=>{const i=__app.D.STORIES.findIndex(s=>s.id==='knight');__app.reader(i,0)})()"); pg.wait_for_timeout(600)
        tap(pg, '[data-n="1"]'); pg.wait_for_timeout(300); tap(pg, '[data-read]'); pg.wait_for_timeout(1600)
        rec(f'{tag} new story (The Brave Knight): read-to-me highlights words', pg.evaluate("document.querySelectorAll('.word.hl').length") >= 1 and pg.evaluate("__AU.log.slice(-3).some(l=>l.src.includes('/s/knight-1')&&l.ok)"))
        pg.screenshot(path=SHOTS + f'v4-{tag}-story-knight.png')
        # ---------- Word Race: two nouns + long ----------
        for lv in (6, 11):
            pg.evaluate(f"(()=>{{const S=__app.S();S.race.unlocked=11;S.race.lv={lv};__app.racePlay()}})()"); pg.wait_for_timeout(700)
            n = pg.evaluate("__race.L.slots.length")
            for k in range(n):
                pg.evaluate("__race.place()"); pg.wait_for_timeout(250)
            pg.wait_for_selector('#race .showtime', timeout=15000); pg.wait_for_timeout(1500)
            sc = pg.evaluate("(()=>({actors:[...document.querySelectorAll('#race .showtime .actor')].map(a=>a.textContent.trim()),text:document.querySelector('#race .sentence').textContent}))()")
            rec(f'{tag} race {pg.evaluate("__race.L.id")}: {n}-word sentence acted out with two different animals', len(set(sc['actors'])) >= 2, sc)
            pg.screenshot(path=SHOTS + f'v4-{tag}-race-{lv + 1}.png')
        # ---------- Action Words v4: 20-level ladder of clear sub-modes + Mix reward ----------
        pg.evaluate("(()=>{const S=__app.S();S.act.unlocked=3;S.act.lv=0;S.act.prog={w1:{pts:6,rounds:3,days:[],ls:14},t1:{pts:3,rounds:1,days:[],ls:6}};__app.save();__app.go('action')})()"); pg.wait_for_timeout(900)
        am = pg.evaluate("(()=>({n:document.querySelectorAll('#actMap .lvBtn').length,locked:document.querySelectorAll('#actMap .lvBtn.locked').length,mix:document.querySelector('#actMap .mixKey').classList.contains('locked'),names:[...document.querySelectorAll('#actMap .lvBtn .nm')].slice(0,7).map(x=>x.textContent)}))()")
        rec(f'{tag} action map: 20 levels in order (Watch & Say, Tap, Read It, ..., Read & Do), Mix locked until level 7', am['n'] == 20 and am['locked'] == 16 and am['mix'] and am['names'][0] == 'Watch & Say' and am['names'][6].startswith('Read & Do'), am)
        pg.screenshot(path=SHOTS + f'v4-{tag}-action-levelmap.png')
        def act_level(i):
            pg.evaluate(f"(()=>{{const S=__app.S();S.act.unlocked=19;S.act.lv={i};__app.actPlay()}})()"); pg.wait_for_timeout(1800)
        act_level(0); pg.evaluate("window.__animLog.length=0")
        tap(pg, '.bigWord'); pg.wait_for_timeout(1500)
        rec(f'{tag} action Watch & Say: tapping the word makes Sparky act + payoff', pg.evaluate("__animLog.length") >= 1 and pg.evaluate("__act.n()") >= 1)
        pg.screenshot(path=SHOTS + f'v4-{tag}-action-watch.png')
        for lv, kind in ((1, 'tap'), (2, 'read')):
            act_level(lv)
            t = pg.evaluate("__act.cur.t")
            cards = pg.evaluate("[...document.querySelectorAll('.aCard')].map(c=>c.dataset.a)")
            wrong = [i for i, a in enumerate(cards) if a != t['a'] and not (a in ('jump', 'jump2') and t['a'] in ('jump', 'jump2'))]
            tap(pg, '.aCard', wrong[0]); pg.wait_for_timeout(700)
            right = [i for i, a in enumerate(cards) if a == t['a'] or (a in ('jump', 'jump2') and t['a'] in ('jump', 'jump2'))][0]
            tap(pg, '.aCard', right); pg.wait_for_timeout(500)
            ok = pg.evaluate("document.querySelector('.aCard.right')!==null && document.querySelectorAll('.aCard.wrongish').length===1")
            shown = pg.evaluate("document.querySelector('.bigWord').textContent.trim()")
            rec(f'{tag} action {kind}: {len(cards)} moving dragons, wrong one gently greyed, right one celebrates, word shown', ok and shown == t['w'] and len(cards) >= 3, [t, cards, shown])
            if kind == 'read': pg.screenshot(path=SHOTS + f'v4-{tag}-action-read.png')
            pg.wait_for_timeout(2500)
        act_level(6); seq = pg.evaluate("__act.cur.seq")
        pg.evaluate("window.__animLog.length=0")
        for sq in seq:
            cards = pg.evaluate("[...document.querySelectorAll('.aCard')].map(c=>c.dataset.a)")
            tap(pg, '.aCard', cards.index(sq['a'])); pg.wait_for_timeout(2800)
        pg.wait_for_timeout(6000)
        al = [r[0] for r in pg.evaluate("__animLog.filter(r=>r.end).map(r=>[r.a])")]
        rec(f'{tag} action Read & Do two: tapped moves in order -> Sparky does each, then the whole combo', all(sq['a'] in al for sq in seq) and len(al) >= len(seq) + 1, [seq, al[:12]])
        act_level(12); ti = pg.evaluate("__act.cur.ti")
        pg.screenshot(path=SHOTS + f'v4-{tag}-action-sentence.png')
        tap(pg, '.sCard', ti); pg.wait_for_timeout(1500)
        rec(f'{tag} action Read the Sentence: right picture -> sentence acted out in a full scene', pg.evaluate("!!document.querySelector('#action .showtime')"))
        pg.wait_for_timeout(6000)
        pg.evaluate("(()=>{const S=__app.S();S.act.unlocked=7;__app.go('action')})()"); pg.wait_for_timeout(600); tap(pg, '.mixKey'); pg.wait_for_timeout(1500)
        rec(f'{tag} action Mix (free play) opens once level 7 is open, refresh buttons there', pg.evaluate("document.querySelectorAll('#action .refreshBtn').length") == 5)
        # ---------- Vanishing ----------
        def van(lid, step, seen=None):
            pg.evaluate("([lid,st,se])=>{const S=__app.S(),D=__app.D,i=D.VANISH.LEVELS.findIndex(l=>l.id===lid);S.van.unlocked=23;S.van.lv=i;S.van.step[lid]=st;S.van.seen[lid]=se;S.van.prog[lid]={pts:0,rounds:0,days:[],ls:0};__app.vanPlay()}", [lid, step, step if seen is None else seen])
        van('v7', 0); pg.wait_for_selector('.vslot.cur', timeout=30000); pg.wait_for_timeout(400)
        v = pg.evaluate("(()=>({sup:[...document.querySelectorAll('.sup')].map(x=>x.className),slots:document.querySelectorAll('.vslot').length,pics:[...document.querySelectorAll('.vslot')].filter(x=>!x.classList.contains('noPic')).length,let:document.querySelector('.vslot .vlet').textContent,tiles:document.querySelectorAll('.vtile').length,said:__AU.log.slice(-6).map(l=>l.src.replace(/^.*audio\\//,''))}))()")
        rec(f'{tag} vanishing full support: 🔊🖼️🔤 on, 2 word spaces with pictures + letters, 3 tiles, phrase read aloud', all('on' in c for c in v['sup']) and v['slots'] == 2 and v['pics'] == 2 and len(v['let']) >= 2 and v['tiles'] == 3 and any(x.startswith('w/') for x in v['said']), v)
        pg.screenshot(path=SHOTS + f'v4-{tag}-vanishing-full.png')
        for k in range(2):
            pg.evaluate("__van.answer(true)"); pg.wait_for_timeout(2600)
        pg.wait_for_timeout(5000)
        rec(f'{tag} vanishing: both spaces filled -> phrase read back + next phrase', pg.evaluate("__van.n()") == 2, pg.evaluate("__van.n()"))
        van('v7', 4); pg.wait_for_selector('.vslot.cur', timeout=30000); pg.wait_for_timeout(300)
        v = pg.evaluate("(()=>({off:document.querySelectorAll('.sup.off').length,pics:[...document.querySelectorAll('.vslot')].filter(x=>!x.classList.contains('noPic')).length,let:document.querySelector('.vslot.cur .vlet').textContent}))()")
        pg.screenshot(path=SHOTS + f'v4-{tag}-vanishing-nohelp.png')
        pg.evaluate("__van.answer(false)"); pg.wait_for_timeout(800)
        v2 = pg.evaluate("(()=>({let:document.querySelector('.vslot.cur .vlet').textContent,w:document.querySelector('.vslot.cur')._w}))()")
        rec(f'{tag} vanishing no help: all 3 supports off, "?" in the space; a miss brings the first letter back', v['off'] == 3 and v['pics'] == 0 and v['let'] == '?' and v2['let'].lower().startswith(v2['w'][0]) and '_' in v2['let'], [v, v2])
        # a clean round makes one support vanish next round, with the magic wand
        van('v1', 0)
        for k in range(3):
            pg.wait_for_selector('.vslot.cur', timeout=30000); pg.wait_for_timeout(200); pg.evaluate("__van.answer(true)"); pg.wait_for_timeout(5500)
        pg.wait_for_selector('.overlay', timeout=30000); st = pg.evaluate("__app.S().van.step.v1")
        pg.evaluate("document.querySelector('.overlay [data-a=more]').click()"); pg.wait_for_timeout(1700)
        wand = pg.evaluate("!!document.querySelector('.wand')"); pg.wait_for_timeout(1200)
        pg.screenshot(path=SHOTS + f'v4-{tag}-vanishing-poof.png'); pg.wait_for_timeout(1500)
        rec(f'{tag} vanishing: clean round -> next round a wand makes the 🔊 vanish (step 1)', st == 1 and wand and pg.evaluate("document.querySelectorAll('.sup.off').length") == 1, [st, wand])
        # ---------- Picture Match ----------
        def pmv(lid):
            pg.evaluate("lid=>{const S=__app.S(),D=__app.D,i=D.PMATCH.LEVELS.findIndex(l=>l.id===lid);S.pm.unlocked=19;S.pm.lv=i;__app.pmPlay()}", lid); pg.wait_for_timeout(3500)
        pmv('m1')
        pm = pg.evaluate("(()=>({cards:document.querySelectorAll('.pmCard').length,facts:document.querySelectorAll('.pmClue .fact').length,said:__AU.log.slice(-4).map(l=>l.src.replace(/^.*audio\\//,''))}))()")
        pg.screenshot(path=SHOTS + f'v4-{tag}-picmatch-easy.png')
        pg.evaluate("__pm.pick(false)"); pg.wait_for_timeout(600); pg.evaluate("__pm.pick(true)"); pg.wait_for_timeout(400)
        rec(f'{tag} picture match easy: riddle with 3 spoken clues, 2 pictures, wrong one greys, right one explodes into stars', pm['cards'] == 2 and pm['facts'] == 3 and any('p/pm-' in x for x in pm['said']) and pg.evaluate("!!document.querySelector('.pmCard.right')"), pm)
        pg.wait_for_timeout(3000)
        pmv('m20'); pg.wait_for_timeout(500)
        pm = pg.evaluate("(()=>({cards:document.querySelectorAll('.pmCard').length,ro:document.querySelector('.pmClue').classList.contains('readOnly'),clue:document.querySelector('.pmClue').textContent,t:__pm.target}))()")
        diffs = pg.evaluate("""(()=>{const t=__pm.target,k=o=>[o.noun.s,o.color,o.size,o.num,o.act&&o.act.w,o.place&&o.place.w];const kt=k(t);return __pm.opts.filter(o=>o!==t).map(o=>k(o).filter((v,i)=>v!==kt[i]).length)})()""")
        pg.screenshot(path=SHOTS + f'v4-{tag}-picmatch-hard.png')
        rec(f'{tag} picture match hard: read-only 4-detail clue, 4 moving pictures each differing by one detail', pm['cards'] == 4 and pm['ro'] and len(pm['clue'].split()) >= 6 and all(d == 1 for d in diffs), [pm['clue'], diffs])
        for k in range(4):
            pg.wait_for_function("k=>__pm.n()===k+1&&!document.querySelector('.pmCard.right')", arg=k, timeout=20000); pg.wait_for_timeout(300); pg.evaluate("__pm.pick(true)")
        pg.wait_for_selector('.overlay', timeout=20000)
        rec(f'{tag} picture match: 4-question round ends with medal stars', pg.evaluate("__app.S().pm.prog.m20.ls") == 3)
        pg.evaluate("document.querySelector('.overlay').remove()")
        # ---------- Word Galleries ----------
        pg.evaluate("(()=>{const S=__app.S();while(S.wg.got.length<16){const r=__app.D.WG.TRACK[S.wg.got.length];S.wg.got.push(r[0]+':'+r[1])}S.medals=[12,3,1];__app.go('words')})()"); pg.wait_for_timeout(900)
        wg = pg.evaluate("(()=>({items:document.querySelectorAll('.wgItem:not(.locked)').length,locked:document.querySelectorAll('.wgItem.locked').length}))()")
        n0 = pg.evaluate("(__AU.log.length=0)"); pg.evaluate("window.__animLog.length=0"); tap(pg, '.wgItem:not(.locked)'); pg.wait_for_timeout(1500)
        rec(f'{tag} word galleries: secret words unlocked by medals say themselves + act; locked ones show the medal number', wg['items'] >= 8 and wg['locked'] > 40 and pg.evaluate("__AU.log.slice(%d).some(l=>l.ok&&l.src.includes('/w/'))" % n0) and pg.evaluate("__animLog.length") >= 1, [wg, pg.evaluate("__AU.log.slice(%d).map(l=>l.src.slice(-26)+':'+l.ok)" % n0), pg.evaluate("__animLog.map(r=>r.a)")])
        pg.screenshot(path=SHOTS + f'v4-{tag}-wordgalleries-secret.png')
        pg.evaluate("__app.wordGalleries('font')"); pg.wait_for_timeout(500)
        tap(pg, '.wgFont[data-f="castle"]'); pg.wait_for_timeout(600)
        rec(f'{tag} word galleries: picking Castle Letters restyles words across the game', pg.evaluate("document.documentElement.classList.contains('font-castle')"))
        pg.screenshot(path=SHOTS + f'v4-{tag}-wordgalleries-fonts.png')
        pg.evaluate("__app.wordGalleries('sticker')"); pg.wait_for_timeout(600); pg.screenshot(path=SHOTS + f'v4-{tag}-wordgalleries-stickers.png')
        pg.evaluate("(()=>{const S=__app.S();S.race.unlocked=11;S.race.lv=4;__app.racePlay()})()"); pg.wait_for_timeout(1200)
        pg.screenshot(path=SHOTS + f'v4-{tag}-race-castle-font.png')
        pg.evaluate("(()=>{__app.S().wg.font='';__app.save();document.documentElement.className=document.documentElement.className.replace(/font-\\w+/g,'')})()")
        # ---------- word cars: text fully above the wheels ----------
        pg.evaluate("(()=>{const S=__app.S();S.race.lv=11;__app.racePlay()})()"); pg.wait_for_timeout(1200)
        for k in range(3): pg.evaluate("__race.place()"); pg.wait_for_timeout(300)
        cc = pg.evaluate("""(()=>[...document.querySelectorAll('.car')].map(c=>{const r=document.createRange();const t=[...c.childNodes].find(n=>n.nodeType===3);if(!t)return null;r.selectNodeContents(t);const tb=r.getBoundingClientRect(),cb=c.getBoundingClientRect(),w=getComputedStyle(c,'::before');const wheelTop=cb.bottom-(parseFloat(w.height)+parseFloat(w.bottom))-0;return {txt:t.textContent,textBottom:Math.round(tb.bottom),wheelTop:Math.round(cb.bottom+(-parseFloat(w.bottom))-parseFloat(w.height)),clear:tb.bottom<=cb.bottom+(-parseFloat(w.bottom))-parseFloat(w.height)+1}}).filter(Boolean))()""")
        rec(f'{tag} word cars: every word sits fully above its wheels (garage + road, long words too)', len(cc) >= 4 and all(x['clear'] for x in cc), cc[:6])
        pg.screenshot(path=SHOTS + f'v4-{tag}-word-cars.png')
        # ---------- Gallery ----------
        pg.evaluate("""(()=>{const S=__app.S(),D=__app.D;S.stars=400;D.ROOMS.slice(0,8).forEach(r=>{S.owned[r.id]=r.items.map((_,i)=>i).filter(i=>i<r.items.length-2)});__app.save()})()""")
        ri = pg.evaluate("__app.D.ROOMS.findIndex(r=>r.id==='dragon')")
        pg.evaluate(f"__app.gallery({ri})"); pg.wait_for_timeout(900)
        gi = pg.evaluate("(()=>({tabs:document.querySelectorAll('.rTab').length,items:__gallery.room.items.length,owned:document.querySelectorAll('.room .item').length,chip:document.querySelector('.goalChip').textContent}))()")
        rec(f'{tag} gallery: 18 rooms, dragon cave has 20 items, next-goal chip', gi['tabs'] == 18 and gi['items'] == 20 and gi['owned'] == 18 and len(gi['chip']) > 2, gi)
        n0 = pg.evaluate("(__AU.log.length=0)"); pg.evaluate("window.__animLog.length=0")
        tap(pg, '.room .item[data-i="0"]'); pg.wait_for_timeout(500)
        lab = pg.evaluate("(()=>{const l=document.querySelector('.itemLabel');return l&&l.textContent})()")
        fx = pg.evaluate("document.querySelectorAll('#fx .fxp').length")
        pg.screenshot(path=SHOTS + f'v4-{tag}-gallery-dragon-fire.png')
        pg.wait_for_timeout(1200)
        rec(f'{tag} gallery: tapping the dragon says "dragon", shows the word, breathes fire', lab == 'dragon' and fx >= 2 and pg.evaluate("__AU.log.slice(%d).some(l=>l.src.endsWith('/w/dragon.mp3')&&l.ok)" % n0) and pg.evaluate("__animLog.some(r=>r.a==='shake')"), [lab, fx, pg.evaluate("__AU.log.slice(%d).map(l=>l.src.slice(-26)+':'+l.ok)" % n0), pg.evaluate("__animLog.map(r=>r.a)")])
        tap(pg, '.room .item[data-i="0"]'); pg.wait_for_timeout(2600)
        rec(f'{tag} gallery: second tap plays the item\'s fun line', pg.evaluate("__AU.log.slice(%d).some(l=>l.src.includes('/p/il-dragon-0')&&l.ok)" % n0))
        n0 = pg.evaluate("(__AU.log.length=0)")
        tap(pg, '.room .item[data-i="0"]'); pg.wait_for_timeout(900)
        pg.screenshot(path=SHOTS + f'v4-{tag}-gallery-interaction.png'); pg.wait_for_timeout(2500)
        rec(f'{tag} gallery: third tap = dragon + treasure interaction line', pg.evaluate("__AU.log.slice(%d).some(l=>/\\/p\\/ix-\\d+/.test(l.src)&&l.ok)" % n0), pg.evaluate("__AU.log.slice(%d).map(l=>l.src)" % n0))
        # rocket launch + lamp glow in the bedroom; cat chases mouse
        pg.evaluate("__app.gallery(0)"); pg.wait_for_timeout(700)
        pg.evaluate("window.__animLog.length=0"); pg.evaluate("__gallery.tapItem(5)"); pg.wait_for_timeout(700)
        rec(f'{tag} gallery: rocket launches', pg.evaluate("__animLog.some(r=>r.a==='launch')"))
        pg.screenshot(path=SHOTS + f'v4-{tag}-gallery-rocket.png')
        farm = pg.evaluate("__app.D.ROOMS.findIndex(r=>r.id==='farm')")
        pg.evaluate(f"(()=>{{const S=__app.S();S.owned.farm=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];S.decor.farm=['lights','balloons'];__app.gallery({farm})}})()"); pg.wait_for_timeout(900)
        k = pg.evaluate("__app.D.INTER.findIndex(x=>x.room==='farm'&&x.t==='chase')")
        pg.evaluate(f"__gallery.interact({k})"); pg.wait_for_timeout(1000)
        pg.screenshot(path=SHOTS + f'v4-{tag}-gallery-farm-chase.png'); pg.wait_for_timeout(2000)
        rec(f'{tag} gallery: new Farm room renders with decor; cat chases mouse', pg.evaluate("document.querySelectorAll('.room .dec').length") >= 2 and pg.evaluate("document.querySelectorAll('.room .item').length") == 17)
        b0 = pg.evaluate("__app.S().decor.farm.length"); s0 = pg.evaluate("__app.S().stars")
        tap(pg, '.shopItem.decor'); pg.wait_for_timeout(600)
        rec(f'{tag} gallery: buying a decoration', pg.evaluate("__app.S().decor.farm.length") == b0 + 1 and pg.evaluate("__app.S().stars") < s0)
        pg.screenshot(path=SHOTS + f'v4-{tag}-gallery-farm.png')
        # ---------- new rooms: measured grid, no overlapping items ----------
        ov = pg.evaluate("""(()=>{const D=__app.D,S=__app.S();const out=[];for(let ri=7;ri<D.ROOMS.length;ri++){const r=D.ROOMS[ri];S.owned[r.id]=r.items.map((_,i)=>i);}
          __app.save();for(const ri of [7,12,17]){__app.gallery(ri);const bs=[...document.querySelectorAll('.room .item > span')].map(e=>e.getBoundingClientRect());let n=0;
          for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i],b=bs[j];const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>4&&oy>4)n++}
          const room=document.querySelector('.room').getBoundingClientRect();const outside=bs.filter(b=>b.left<room.left-2||b.right>room.right+2||b.bottom>room.bottom+2).length;out.push([D.ROOMS[ri].id,bs.length,n,outside])}return out})()""")
        rec(f'{tag} gallery: the 11 newer rooms use a measured grid - no overlapping items, nothing off the edge', all(x[2] == 0 and x[3] == 0 and x[1] == 20 for x in ov), ov)
        pg.screenshot(path=SHOTS + f'v4-{tag}-gallery-newroom-grid.png')
        rec(f'{tag} no document scroll', pg.evaluate("document.scrollingElement.scrollHeight<=innerHeight+1 && document.scrollingElement.scrollWidth<=innerWidth+1"))
        if tag == 'ipad-land':
            r = pg.evaluate("""async()=>{const L=__app.speakable();const seen=new Set();let miss=[],dec=[];
              for(const [k,id] of L){const c=__app.clip(k,id);if(!c.src){miss.push(k+':'+id);continue}seen.add(c.src)}
              const srcs=[...seen];for(let i=0;i<srcs.length;i+=40){const bs=await Promise.all(srcs.slice(i,i+40).map(s=>__app.loadBuf(s)));bs.forEach((b,j)=>{if(!b||b.duration<0.15)dec.push(srcs[i+j]+' '+(b&&b.duration))})}
              return {speakable:L.length,clips:srcs.length,missing:miss,badDecode:dec}}""")
            rec('audio audit (browser): every speakable item has a clip that decodes (>=0.15 s)', not r['missing'] and not r['badDecode'], {'speakable': r['speakable'], 'clips': r['clips'], 'missing': r['missing'][:8], 'bad': r['badDecode'][:8]})
            cached = pg.evaluate("(async()=>{const o={};for(const k of await caches.keys()){o[k]=(await (await caches.open(k)).keys()).length}return o})()")
            rec('SW: small core precache + separate audio cache filled while playing', any(k.startswith('wes-reading-') and 10 <= v <= 20 for k, v in cached.items()) and cached.get('wes-audio-1', 0) > 100, cached)
            rr = pg.evaluate("(async()=>{const r=await fetch('audio/w/cat.mp3',{headers:{Range:'bytes=0-99'}});const b=await r.arrayBuffer();return [!!navigator.serviceWorker.controller,r.status,r.headers.get('content-range'),b.byteLength]})()")
            rec('SW answers Range requests with 206', rr[0] and rr[1] == 206 and rr[3] == 100, rr)
            ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
            tap(pg, '#startBtn'); pg.wait_for_timeout(2500)
            pg.evaluate("__app.gallery(0)"); pg.wait_for_timeout(500); pg.evaluate("__gallery.tapItem(0)"); pg.wait_for_timeout(1200)
            rec('offline: app reloads, greeting + gallery item clips play from cache', pg.evaluate("__AU.log.some(l=>l.ok&&l.src.includes('welcome'))") and pg.evaluate("__AU.log.some(l=>l.ok&&l.src.endsWith('/w/bed.mp3'))"), pg.evaluate("__AU.log.slice(-3).map(l=>[l.src,l.ok])"))
            ctx.set_offline(False)
        ctx.close()
    b.close()
print('\nSUMMARY', sum(res), '/', len(res))
print('ERRORS', json.dumps(errs[:30])); print('BAD REQUESTS', json.dumps(bad[:20]))
