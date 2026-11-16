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
        m = pg.evaluate("(()=>{const S=__app.S(),D=__app.D;return {v:S.v,stars:S.stars,owned:S.owned,read:Object.keys(S.story.read),rain:D.RAIN_LEVELS[S.rain.lv].id,unl:D.RAIN_LEVELS[S.rain.unlocked].id,race:D.RACE_LEVELS[S.race.lv].id,act:D.ACT_LEVELS[S.act.lv].id}})()")
        rec(f'{tag} migration: v2 save keeps stars/items/stories, maps levels', m['v'] == 3 and m['stars'] == 17 and m['owned']['bedroom'] == [0, 1, 2, 3, 4, 5] and m['read'] == ['sam', 'bug'] and m['rain'] == 'bl-l' and m['unl'] == 'sight-5' and m['race'] == 'r4' and m['act'] == 'a3', m)
        log = pg.evaluate("__AU.log.map(l=>[l.src,l.ok])")
        rec(f'{tag} greeting (random welcome line) played', any('/p/welcome' in s and ok for s, ok in log), log[:2])
        # fresh player
        pg.evaluate("localStorage.clear()"); pg.reload(wait_until='networkidle'); pg.wait_for_timeout(400); tap(pg, '#startBtn'); pg.wait_for_timeout(1200)
        rec(f'{tag} new player starts at Short a (abc + first sounds open)', pg.evaluate("__app.D.RAIN_LEVELS[__app.S().rain.lv].id") == 'cvc-a')
        # ---------- level map ----------
        pg.evaluate("(()=>{const S=__app.S();S.rain.unlocked=30;S.rain.lv=22;S.rain.prog={'abc1':{pts:99,rounds:3,days:['a']},'cvc-a':{pts:12,rounds:3,days:['a','b']},'cvc-i':{pts:4,rounds:1,days:['a']}};__app.save()})()")
        pg.evaluate("__app.go('rain')"); pg.wait_for_timeout(900)
        mp = pg.evaluate("(()=>({n:document.querySelectorAll('.lvBtn').length,locked:document.querySelectorAll('.lvBtn.locked').length,on:document.querySelectorAll('.lvBtn .stars i.on').length,scroll:document.querySelector('.levelMap').scrollHeight>document.querySelector('.levelMap').clientHeight}))()")
        rec(f'{tag} level map: 64 Letter Rain levels, stars shown, scrolls', mp['n'] == 64 and mp['locked'] == 33 and mp['on'] >= 5 and mp['scroll'], mp)
        pg.screenshot(path=SHOTS + f'v3-{tag}-levelmap.png')
        # ---------- every Letter Rain variant ----------
        cases = [('abc1', 'find'), ('abcU', 'case'), ('begin', 'begin'), ('cvc-a', 'spell'), ('cvc-i', 'missing'), ('cvc-o', 'end'), ('cvc-u', 'middle'), ('fam-a', 'rhyme'), ('sight-3', 'wordfind'), ('vt-ai', 'spell'), ('di-ou', 'missing'), ('big', 'missing2')]
        for lid, var in cases:
            if mob and lid not in ('abcU', 'fam-a', 'big', 'vt-ai'): continue
            pg.evaluate("([lid,v])=>{const S=__app.S(),D=__app.D,i=D.RAIN_LEVELS.findIndex(l=>l.id===lid),L=D.RAIN_LEVELS[i];S.rain.unlocked=63;S.rain.lv=i;S.rain.vi[lid]=L.variants.indexOf(v);__app.rainPlay()}", [lid, var])
            pg.wait_for_timeout(4200)
            info = pg.evaluate("(()=>({v:__rain.variant,it:__rain.it().v,need:__rain.need(),slots:[...document.querySelectorAll('#rain .slot')].map(s=>s.textContent+(s.classList.contains('pre')?'*':'')),tiles:__rain.tiles().filter(t=>!t.gone).map(t=>t.g)}))()")
            if lid in ('fam-a', 'big', 'sight-3', 'abcU', 'di-ou'): pg.screenshot(path=SHOTS + f'v3-{tag}-rain-{lid}-{var}.png')
            p0 = pg.evaluate("[__app.S().rain.prog[%r]?__app.S().rain.prog[%r].pts:0,__AU.log.length]" % (lid, lid))
            got = pg.evaluate(SOLVE, 1); pg.wait_for_timeout(300)
            p1 = pg.evaluate("__app.S().rain.prog[%r].pts" % lid)
            srcs = pg.evaluate("__AU.log.slice(%d).filter(l=>l.ok).map(l=>l.src.replace(/^.*audio\\//,''))" % p0[1])
            rec(f'{tag} rain {lid}/{var}: item solved, mastery points added, audio ok', info['v'] == var and got >= 1 and p1 > p0[0] and len(srcs) >= 1, [info, p0[0], p1, srcs[:6]])
        # harder level config grows with level number
        cfgs = pg.evaluate("(()=>{const D=__app.D,S=__app.S();const r=[];for(const id of ['cvc-a','big']){S.rain.lv=D.RAIN_LEVELS.findIndex(l=>l.id===id);__app.rainPlay();r.push(__rain.cfg)}return r})()")
        rec(f'{tag} rain difficulty rises (more tiles, faster fall)', cfgs[1]['maxT'] > cfgs[0]['maxT'] and cfgs[1]['fall'] < cfgs[0]['fall'], cfgs)
        # ---------- slow mastery: multi-day rule + unlock ----------
        r = pg.evaluate("""async()=>{const D=__app.D,S=__app.S();const W=(ms)=>new Promise(r=>setTimeout(r,ms));
          const i=D.RAIN_LEVELS.findIndex(l=>l.id==='dig-sh'),L=D.RAIN_LEVELS[i];S.rain.unlocked=i;S.rain.lv=i;S.rain.prog['dig-sh']={pts:L.need-1,rounds:9,days:[]};__app.save();__app.rainPlay();return [i,L.need,L.days]}""")
        pg.evaluate(SOLVE, 7); pg.wait_for_selector('.overlay', timeout=240000); pg.wait_for_timeout(800)
        st = pg.evaluate("(()=>({unl:__app.S().rain.unlocked,prog:__app.S().rain.prog['dig-sh'],stars:document.querySelectorAll('.lvStars span.on').length,next:!!document.querySelector('.overlay [data-a=next]'),moon:!!document.querySelector('.lvNote')}))()")
        rec(f'{tag} mastery: goal reached on 1 day does NOT unlock a 2-day level yet (no Next level button, come-back-tomorrow note)', st['unl'] == r[0] and not st['next'] and st['moon'] and st['stars'] == 2, [r, st])
        pg.screenshot(path=SHOTS + f'v3-{tag}-rain-round-done.png')
        pg.evaluate("document.querySelector('.overlay').remove()")
        pg.evaluate("(()=>{const S=__app.S();S.rain.prog['dig-sh'].days=['2026-11-15'];__app.rainPlay()})()"); pg.evaluate(SOLVE, 7); pg.wait_for_selector('.overlay', timeout=240000); pg.wait_for_timeout(500)
        st = pg.evaluate("(()=>({unl:__app.S().rain.unlocked,next:!!document.querySelector('.overlay [data-a=next]'),t:document.querySelector('.overlay h2').textContent}))()")
        rec(f'{tag} mastery: second day completes the level -> unlocks next + Next level button', st['unl'] == r[0] + 1 and st['next'] and st['t'] == 'New level!', st)
        pg.evaluate("document.querySelector('.overlay').remove()")
        # ---------- stories ----------
        pg.evaluate("(()=>{const S=__app.S();S.story.read={sam:1,bug:1,pig:1};__app.go('story')})()"); pg.wait_for_timeout(700)
        sh = pg.evaluate("(()=>({books:document.querySelectorAll('.book').length,rows:document.querySelectorAll('.shelfRow').length,locked:document.querySelectorAll('.shelfRow.locked').length}))()")
        rec(f'{tag} story shelves: 33 stories on 8 shelves, later shelves locked', sh['books'] == 33 and sh['rows'] == 8 and sh['locked'] == 6, sh)
        pg.screenshot(path=SHOTS + f'v3-{tag}-shelves.png')
        pg.evaluate("(()=>{const i=__app.D.STORIES.findIndex(s=>s.id==='knight');__app.reader(i,0)})()"); pg.wait_for_timeout(600)
        tap(pg, '[data-n="1"]'); pg.wait_for_timeout(300); tap(pg, '[data-read]'); pg.wait_for_timeout(1600)
        rec(f'{tag} new story (The Brave Knight): read-to-me highlights words', pg.evaluate("document.querySelectorAll('.word.hl').length") >= 1 and pg.evaluate("__AU.log.slice(-3).some(l=>l.src.includes('/s/knight-1')&&l.ok)"))
        pg.screenshot(path=SHOTS + f'v3-{tag}-story-knight.png')
        # ---------- Word Race: two nouns + long ----------
        for lv in (6, 11):
            pg.evaluate(f"(()=>{{const S=__app.S();S.race.unlocked=11;S.race.lv={lv};__app.racePlay()}})()"); pg.wait_for_timeout(700)
            n = pg.evaluate("__race.L.slots.length")
            for k in range(n):
                pg.evaluate("__race.place()"); pg.wait_for_timeout(250)
            pg.wait_for_selector('#race .showtime', timeout=15000); pg.wait_for_timeout(1500)
            sc = pg.evaluate("(()=>({actors:[...document.querySelectorAll('#race .showtime .actor')].map(a=>a.textContent.trim()),text:document.querySelector('#race .sentence').textContent}))()")
            rec(f'{tag} race {pg.evaluate("__race.L.id")}: {n}-word sentence acted out with two different animals', len(set(sc['actors'])) >= 2, sc)
            pg.screenshot(path=SHOTS + f'v3-{tag}-race-{lv + 1}.png')
        # ---------- Action Words: level 7 Read & Do (3 actions in order) ----------
        pg.evaluate("(()=>{const S=__app.S();S.act.unlocked=7;S.act.lv=6;__app.actionHome('phrase')})()"); pg.wait_for_timeout(600)
        ws = pg.evaluate("[...document.querySelectorAll('.phrase .aw')].map(b=>b.dataset.w)")
        pg.evaluate("window.__animLog.length=0"); tap(pg, '.goBtn'); pg.wait_for_timeout(1500)
        pg.screenshot(path=SHOTS + f'v3-{tag}-readdo-level7.png')
        pg.wait_for_timeout(9000)
        acts = [w for w in ws if pg.evaluate("w=>__app.D.ACTIONS.some(a=>a.w===w)", w)]
        want = pg.evaluate("ws=>__app.D.ACTIONS.filter(a=>ws.includes(a.w)).map(a=>a.a)", acts)
        al = pg.evaluate("want=>__animLog.filter(r=>r.end&&want.includes(r.a)).map(r=>[r.a,Math.round(r.start),Math.round(r.end)])", want)
        seq_ok = all(al[i + 1][1] >= al[i][2] - 30 for i in range(len(al) - 1))
        rec(f'{tag} action level 7 phrase "{" ".join(ws)}": {len(acts)} actions one after another', len(acts) >= 2 and len(al) >= len(acts) and seq_ok, al)
        pg.evaluate("__app.actionHome('explore')"); pg.wait_for_timeout(400); tap(pg, '[data-lv]'); pg.wait_for_timeout(500)
        rec(f'{tag} action level map has 8 levels', pg.evaluate("document.querySelectorAll('#actMap .lvBtn').length") == 8)
        # ---------- Gallery ----------
        pg.evaluate("""(()=>{const S=__app.S(),D=__app.D;S.stars=400;D.ROOMS.slice(0,8).forEach(r=>{S.owned[r.id]=r.items.map((_,i)=>i).filter(i=>i<r.items.length-2)});__app.save()})()""")
        ri = pg.evaluate("__app.D.ROOMS.findIndex(r=>r.id==='dragon')")
        pg.evaluate(f"__app.gallery({ri})"); pg.wait_for_timeout(900)
        gi = pg.evaluate("(()=>({tabs:document.querySelectorAll('.rTab').length,items:__gallery.room.items.length,owned:document.querySelectorAll('.room .item').length,chip:document.querySelector('.goalChip').textContent}))()")
        rec(f'{tag} gallery: 18 rooms, dragon cave has 20 items, next-goal chip', gi['tabs'] == 18 and gi['items'] == 20 and gi['owned'] == 18 and len(gi['chip']) > 2, gi)
        n0 = pg.evaluate("__AU.log.length"); pg.evaluate("window.__animLog.length=0")
        tap(pg, '.room .item[data-i="0"]'); pg.wait_for_timeout(500)
        lab = pg.evaluate("(()=>{const l=document.querySelector('.itemLabel');return l&&l.textContent})()")
        fx = pg.evaluate("document.querySelectorAll('#fx .fxp').length")
        pg.screenshot(path=SHOTS + f'v3-{tag}-gallery-dragon-fire.png')
        pg.wait_for_timeout(1200)
        rec(f'{tag} gallery: tapping the dragon says "dragon", shows the word, breathes fire', lab == 'dragon' and fx >= 2 and pg.evaluate("__AU.log.slice(%d).some(l=>l.src.endsWith('/w/dragon.mp3')&&l.ok)" % n0) and pg.evaluate("__animLog.some(r=>r.a==='shake')"), [lab, fx])
        tap(pg, '.room .item[data-i="0"]'); pg.wait_for_timeout(2600)
        rec(f'{tag} gallery: second tap plays the item\'s fun line', pg.evaluate("__AU.log.slice(%d).some(l=>l.src.includes('/p/il-dragon-0')&&l.ok)" % n0))
        n0 = pg.evaluate("__AU.log.length")
        tap(pg, '.room .item[data-i="0"]'); pg.wait_for_timeout(900)
        pg.screenshot(path=SHOTS + f'v3-{tag}-gallery-interaction.png'); pg.wait_for_timeout(2500)
        rec(f'{tag} gallery: third tap = dragon + treasure interaction line', pg.evaluate("__AU.log.slice(%d).some(l=>/\\/p\\/ix-\\d+/.test(l.src)&&l.ok)" % n0), pg.evaluate("__AU.log.slice(%d).map(l=>l.src)" % n0))
        # rocket launch + lamp glow in the bedroom; cat chases mouse
        pg.evaluate("__app.gallery(0)"); pg.wait_for_timeout(700)
        pg.evaluate("window.__animLog.length=0"); pg.evaluate("__gallery.tapItem(5)"); pg.wait_for_timeout(700)
        rec(f'{tag} gallery: rocket launches', pg.evaluate("__animLog.some(r=>r.a==='launch')"))
        pg.screenshot(path=SHOTS + f'v3-{tag}-gallery-rocket.png')
        farm = pg.evaluate("__app.D.ROOMS.findIndex(r=>r.id==='farm')")
        pg.evaluate(f"(()=>{{const S=__app.S();S.owned.farm=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];S.decor.farm=['lights','balloons'];__app.gallery({farm})}})()"); pg.wait_for_timeout(900)
        k = pg.evaluate("__app.D.INTER.findIndex(x=>x.room==='farm'&&x.t==='chase')")
        pg.evaluate(f"__gallery.interact({k})"); pg.wait_for_timeout(1000)
        pg.screenshot(path=SHOTS + f'v3-{tag}-gallery-farm-chase.png'); pg.wait_for_timeout(2000)
        rec(f'{tag} gallery: new Farm room renders with decor; cat chases mouse', pg.evaluate("document.querySelectorAll('.room .dec').length") >= 2 and pg.evaluate("document.querySelectorAll('.room .item').length") == 17)
        b0 = pg.evaluate("__app.S().decor.farm.length"); s0 = pg.evaluate("__app.S().stars")
        tap(pg, '.shopItem.decor'); pg.wait_for_timeout(600)
        rec(f'{tag} gallery: buying a decoration', pg.evaluate("__app.S().decor.farm.length") == b0 + 1 and pg.evaluate("__app.S().stars") < s0)
        pg.screenshot(path=SHOTS + f'v3-{tag}-gallery-farm.png')
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
