#!/usr/bin/env python3
"""Headless Chrome (touch-emulated) check of every mode at iPad landscape/portrait + phone:
zero console errors, every speakable clip resolves + decodes, gapless Web Audio playback, Read & Do
sequencing, Letter Rain distractors, Next/refresh buttons, offline + Range requests via the SW."""
import json, sys, re
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8781/'
SHOTS = '/workspace/personal-ops/wesley-reading/shots/'
SIZES = [('ipad-land', 1024, 768, False), ('ipad-port', 820, 1180, False), ('phone', 390, 844, True)]
res = []; errs = []; bad = []
def rec(n, ok, info=''): res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' ' + str(info) if info else ''), flush=True)
def tap(pg, sel, i=0):
    bb = pg.locator(sel).nth(i).bounding_box(); pg.touchscreen.tap(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for tag, W, H, mob in SIZES:
        ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=True)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e, t=tag: errs.append(t + ' pageerror ' + str(e)))
        pg.on('console', lambda m, t=tag: m.type == 'error' and errs.append(t + ' console ' + m.text))
        pg.on('requestfailed', lambda r, t=tag: bad.append(t + ' failed ' + r.url))
        pg.on('response', lambda r, t=tag: r.status >= 400 and bad.append(t + f' {r.status} ' + r.url))
        pg.goto(BASE + ('?simsafe' if mob else ''), wait_until='networkidle'); pg.wait_for_timeout(600)
        pg.evaluate("localStorage.clear()"); pg.reload(wait_until='networkidle'); pg.wait_for_timeout(500)
        pg.screenshot(path=SHOTS + f'{tag}-start.png')
        tap(pg, '#startBtn'); pg.wait_for_timeout(2500)
        log = pg.evaluate("__AU.log.map(l=>[l.src,l.ok,!!l.wa])")
        rec(f'{tag} greeting played after Tap to start (Web Audio running)', any(s.endswith('p/welcome.mp3') and ok for s, ok, _ in log) and pg.evaluate("__AU.engine") and pg.evaluate("(()=>{try{return __app.S().engine!=='html'}catch(e){return false}})()"), log[:2])
        rec(f'{tag} new player starts at First Words', pg.evaluate("__app.S().rain.lv") == 1)
        pg.screenshot(path=SHOTS + f'{tag}-home.png')
        # --- Letter Rain ---
        tap(pg, '.tile.rain'); pg.wait_for_timeout(500); pg.screenshot(path=SHOTS + f'{tag}-rain-levels.png')
        pg.evaluate("__app.S().rain.lv=3;__app.S().rain.unlocked=3"); pg.evaluate("__app.rainPlay()")
        pg.wait_for_timeout(5500)
        st = pg.evaluate("(()=>{const t=__rain.tiles().filter(t=>!t.gone);return {live:t.length,wrong:t.filter(x=>x.g!==__rain.need()).length,first:__rain.tiles()[0]&&__rain.tiles()[0].need}})()")
        rec(f'{tag} rain: several wrong letters on screen', st['wrong'] >= 3, st)
        pg.screenshot(path=SHOTS + f'{tag}-rain-distractors.png')
        firsts = []
        for k in range(6):
            pg.evaluate("document.querySelector('#rain .nextBtn').click()"); pg.wait_for_timeout(1700)
            firsts.append(pg.evaluate("(()=>{const t=__rain.tiles();return t.length?t[0].need:null})()"))
        rec(f'{tag} rain: first tile to fall is not the answer', firsts.count(True) == 0, firsts)
        wi0 = pg.evaluate("__rain.wi()"); tap(pg, '#rain .nextBtn'); pg.wait_for_timeout(600)
        rec(f'{tag} rain: Next button advances to the next word', pg.evaluate("__rain.wi()") == wi0 + 1 or pg.locator('.overlay').count() == 1)
        if pg.locator('.overlay').count(): pg.evaluate("document.querySelector('.overlay').remove()")
        pg.evaluate("__app.S().rain.lv=1;__app.rainPlay()"); pg.wait_for_timeout(3500)
        n0 = pg.evaluate("__AU.log.length")
        for k in range(3):
            pg.wait_for_function("()=>__rain.tiles().some(t=>t.g===__rain.need()&&!t.gone&&t.y>0)", timeout=20000)
            box = pg.evaluate("(()=>{const t=__rain.tiles().find(t=>t.g===__rain.need()&&!t.gone&&t.y>0);const r=t.el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
            pg.touchscreen.tap(box[0], box[1]); pg.wait_for_timeout(600)
        pg.wait_for_timeout(4000)
        srcs = pg.evaluate("__AU.log.slice(%d).map(l=>[l.src,l.ok])" % n0)
        rec(f'{tag} rain: letter sounds + blended word played', sum(1 for s, ok in srcs if '/ls/' in s and ok) >= 3 and pg.evaluate("__app.S().log.words") >= 1, [s for s, _ in srcs][:9])
        pg.screenshot(path=SHOTS + f'{tag}-rain-next-button.png')
        # --- Story ---
        pg.evaluate("__app.go('story')"); pg.wait_for_timeout(500); pg.screenshot(path=SHOTS + f'{tag}-story-shelf.png')
        tap(pg, '.book', 4); pg.wait_for_timeout(700)
        n0 = pg.evaluate("__AU.log.length")
        pg.locator('.word').nth(1).dispatch_event('pointerdown'); pg.wait_for_timeout(900)
        rec(f'{tag} story: tapping a word plays its clip', pg.evaluate("__AU.log.slice(%d).some(l=>l.src.includes('/w/has')&&l.ok)" % n0))
        tap(pg, '[data-n="1"]'); pg.wait_for_timeout(300)
        rec(f'{tag} story: Next button turns the page', pg.evaluate("__reader.page()") == 1)
        tap(pg, '[data-read]'); pg.wait_for_timeout(1500)
        rec(f'{tag} story: read-to-me highlights words', pg.evaluate("document.querySelectorAll('.word.hl').length") >= 1)
        pg.screenshot(path=SHOTS + f'{tag}-story.png')
        # --- Word Race ---
        pg.evaluate("__app.S().race.lv=0;__app.S().race.unlocked=4;__app.racePlay()"); pg.wait_for_timeout(900)
        before = pg.evaluate("[...document.querySelectorAll('.garage .car')].map(c=>c.textContent).join(',')")
        tap(pg, '.refreshBtn'); pg.wait_for_timeout(400)
        after = pg.evaluate("[...document.querySelectorAll('.garage .car')].map(c=>c.textContent).join(',')")
        rec(f'{tag} race: refresh button deals new word cars', before != after and after.count(',') == 2, before + ' -> ' + after)
        pg.screenshot(path=SHOTS + f'{tag}-race-refresh.png')
        c = pg.locator('.garage .car').first.bounding_box(); t = pg.locator('.track').bounding_box()
        pg.mouse.move(c['x'] + c['width'] / 2, c['y'] + c['height'] / 2); pg.mouse.down(); pg.mouse.move(c['x'] + 20, c['y'] - 40, steps=4); pg.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2, steps=8); pg.mouse.up()
        pg.wait_for_timeout(500)
        rec(f'{tag} race: dragged car parked on the track', pg.evaluate("__race.si()") == 1)
        n0 = pg.evaluate("__AU.log.length"); t0 = pg.evaluate("Date.now()")
        tap(pg, '.garage .car'); pg.wait_for_timeout(1600)
        lg = pg.evaluate("__AU.log.slice(%d).map(l=>[l.src,l.t-%d,!!l.wa])" % (n0, t0))
        rec(f'{tag} race: sentence reads immediately + gapless (Web Audio)', len(lg) >= 2 and lg[0][1] < 600 and all(x[2] for x in lg[:2]), lg[:3])
        pg.wait_for_selector('#race .showtime', timeout=8000); pg.wait_for_timeout(1300)
        pg.screenshot(path=SHOTS + f'{tag}-race-show.png')
        # --- Action words: Read & Do ---
        pg.evaluate("__app.S().act.lv=2;__app.actionHome('phrase')"); pg.wait_for_timeout(600)
        for k in range(30):
            ws = pg.evaluate("[...document.querySelectorAll('.phrase .aw')].map(b=>b.dataset.w)")
            acts = [w for w in ws if w in ('jump','spin','big','small','hide','run','sleep','shake','fly','swim','dance','hop','roll','fall','flip','wiggle','sing','wave')]
            if len(acts) >= 2: break
            pg.evaluate("document.querySelector('#action .nextBtn').click()"); pg.wait_for_timeout(250)
        pg.evaluate("window.__animLog.length=0")
        tap(pg, '.goBtn'); pg.wait_for_function("__animLog.some(r=>!r.end)", timeout=10000); pg.wait_for_timeout(450)
        pg.screenshot(path=SHOTS + f'{tag}-readdo-action1.png')
        mid = pg.evaluate("(()=>{const s=document.querySelector('.buddy > span');const a=s.getAnimations?s.getAnimations():[];return {running:a.filter(x=>x.playState==='running').length,tf:getComputedStyle(s).transform,disp:getComputedStyle(s).display,hl:[...document.querySelectorAll('.phrase .aw.hl')].map(b=>b.dataset.w)}})()")
        rec(f'{tag} read&do: buddy is mid-action with the action word lit', mid['running'] >= 1 and mid['tf'] != 'none' and mid['disp'] == 'inline-block' and len(mid['hl']) == 1, [ws, mid])
        pg.wait_for_timeout(2300); pg.screenshot(path=SHOTS + f'{tag}-readdo-action2.png')
        pg.wait_for_timeout(5000)
        al = pg.evaluate("__animLog.filter(r=>r.end).map(r=>[r.a,Math.round(r.start),Math.round(r.end)])")
        big = [r for r in al if r[0] not in ('jump2',)] or al
        seq_ok = len(al) >= 2 and all(al[i + 1][1] >= al[i][2] - 30 for i in range(len(al) - 1))
        rec(f'{tag} read&do: {len(acts)} actions played fully, one after the other', len(al) >= len(acts) and seq_ok, [ws, al])
        # --- Action words: Mix (refresh per word type + shuffle all) ---
        pg.evaluate("__app.actionHome('mix')"); pg.wait_for_timeout(700)
        n1 = pg.evaluate("document.querySelector('[data-k=noun]').textContent")
        tap(pg, '[data-r=noun]'); pg.wait_for_timeout(500)
        n2 = pg.evaluate("document.querySelector('[data-k=noun]').textContent")
        a1 = pg.evaluate("[...document.querySelectorAll('[data-k]')].map(b=>b.textContent).join('|')")
        tap(pg, '[data-all]'); pg.wait_for_timeout(500)
        a2 = pg.evaluate("[...document.querySelectorAll('[data-k]')].map(b=>b.textContent).join('|')")
        rec(f'{tag} mix: per-type refresh + shuffle-all change the combo', n1 != n2 and a1 != a2, f'{n1}->{n2}; {a1} -> {a2}')
        pg.wait_for_timeout(1500); pg.screenshot(path=SHOTS + f'{tag}-mix-refresh.png')
        pg.evaluate("__app.actionHome('match')"); pg.wait_for_timeout(900); pg.screenshot(path=SHOTS + f'{tag}-action-match.png')
        # --- Gallery ---
        pg.evaluate("(()=>{const S=__app.S();S.stars=60;S.owned={bedroom:[0,1,2,3,4,5,9],castle:[0,1,2,3,4,5,6,7]};__app.save()})()")
        pg.evaluate("__app.gallery(1)"); pg.wait_for_timeout(600)
        tap(pg, '.shopItem'); pg.wait_for_timeout(1000)
        rec(f'{tag} gallery: buying places an item', pg.evaluate("__app.S().owned.castle.length") == 9)
        pg.screenshot(path=SHOTS + f'{tag}-gallery.png')
        # --- Parent gate ---
        pg.evaluate("__app.go('home')"); pg.wait_for_timeout(400)
        k = pg.locator('.parentKey').bounding_box(); pg.mouse.move(k['x'] + 10, k['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(1900); pg.mouse.up(); pg.wait_for_timeout(300)
        q = pg.locator('.gate').inner_text(); a, bb = map(int, re.search(r'(\d+) × (\d+)', q).groups())
        for ch in str(a * bb): pg.click(f'.gate [data-k="{ch}"]', force=True)
        pg.click('.gate [data-k="✔"]', force=True); pg.wait_for_timeout(400)
        rec(f'{tag} parent area opens after long-press + math gate', pg.locator('.parent').count() == 1)
        pg.screenshot(path=SHOTS + f'{tag}-parent.png')
        rec(f'{tag} no document scroll', pg.evaluate("document.scrollingElement.scrollHeight<=innerHeight+1 && document.scrollingElement.scrollWidth<=innerWidth+1"))
        if tag == 'ipad-land':
            r = pg.evaluate("""async()=>{const L=__app.speakable();const seen=new Set();let n=0,miss=[],dec=[];
              for(const [k,id] of L){const c=__app.clip(k,id);if(!c.src){miss.push(k+':'+id);continue}if(seen.has(c.src))continue;seen.add(c.src);n++;}
              const srcs=[...seen];for(let i=0;i<srcs.length;i+=25){const bs=await Promise.all(srcs.slice(i,i+25).map(s=>__app.loadBuf(s)));bs.forEach((b,j)=>{if(!b||b.duration<0.15)dec.push(srcs[i+j]+' '+(b&&b.duration))})}
              return {speakable:L.length,clips:n,missing:miss,badDecode:dec}}""")
            rec('audio audit: every speakable item has a clip that decodes (≥0.15 s)', not r['missing'] and not r['badDecode'], {'speakable': r['speakable'], 'clips': r['clips'], 'missing': r['missing'][:8], 'bad': r['badDecode'][:8]})
            pg.reload(wait_until='networkidle'); pg.wait_for_timeout(5000)
            cached = pg.evaluate("(async()=>{const ks=await caches.keys();let n=0;for(const k of ks){n+=(await (await caches.open(k)).keys()).length}return [ks,n]})()")
            rec('service worker cached the app + audio (new version key)', cached[1] > 590, cached)
            rr = pg.evaluate("(async()=>{const r=await fetch('audio/w/cat.mp3',{headers:{Range:'bytes=0-99'}});const b=await r.arrayBuffer();return [!!navigator.serviceWorker.controller,r.status,r.headers.get('content-range'),b.byteLength]})()")
            rec('SW answers Safari-style Range requests with 206 partial content', rr[0] and rr[1] == 206 and rr[3] == 100, rr)
            ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
            tap(pg, '#startBtn'); pg.wait_for_timeout(2000)
            rec('works offline (reload + greeting clip plays)', pg.evaluate("__AU.log.some(l=>l.ok&&l.src.includes('welcome'))"))
            ctx.set_offline(False)
        ctx.close()
    b.close()
print('\nSUMMARY', sum(res), '/', len(res))
print('ERRORS', json.dumps(errs)); print('BAD REQUESTS', json.dumps(bad[:20]))
