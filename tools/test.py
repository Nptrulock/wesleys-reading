#!/usr/bin/env python3
"""Headless Chrome check: every mode at iPad landscape/portrait + phone, zero console errors,
all audio clips reachable, and real play() promises resolving after the Tap-to-start gesture."""
import json, sys, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8781/'
SHOTS = '/workspace/personal-ops/wesley-reading/shots/'
SIZES = [('ipad-land', 1024, 768, False), ('ipad-port', 820, 1180, False), ('phone', 390, 844, True)]
res = []; errs = []; bad = []
def rec(n, ok, info=''): res.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (' ' + str(info) if info else ''), flush=True)
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
        pg.click(force=True, selector='#startBtn'); pg.wait_for_timeout(2500)
        log = pg.evaluate("__AU.log.map(l=>[l.src,l.ok])")
        rec(f'{tag} greeting MP3 played after Tap to start', any(s.endswith('p/welcome.mp3') and ok for s, ok in log), log[:3])
        pg.screenshot(path=SHOTS + f'{tag}-home.png')
        # --- Letter Rain ---
        pg.click(force=True, selector='.tile.rain'); pg.wait_for_timeout(500); pg.screenshot(path=SHOTS + f'{tag}-rain-levels.png')
        pg.evaluate("__app.S().rain.lv=1;__app.S().rain.unlocked=3"); pg.evaluate("__app.rainPlay()"); pg.wait_for_timeout(4200)
        n0 = pg.evaluate("__AU.log.length")
        for k in range(3):
            pg.wait_for_function("()=>__rain.tiles().some(t=>t.g===__rain.need()&&!t.gone&&t.y>0)", timeout=15000)
            box = pg.evaluate("(()=>{const t=__rain.tiles().find(t=>t.g===__rain.need()&&!t.gone&&t.y>0);const r=t.el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
            if k == 1: pg.screenshot(path=SHOTS + f'{tag}-rain.png')
            pg.touchscreen.tap(box[0], box[1]); pg.wait_for_timeout(700)
        pg.wait_for_timeout(5000)
        srcs = pg.evaluate("__AU.log.slice(%d).map(l=>[l.src,l.ok])" % n0)
        rec(f'{tag} rain: letter-sound clips played', sum(1 for s, ok in srcs if '/ls/' in s and ok) >= 3, [s for s, _ in srcs][:8])
        rec(f'{tag} rain: word spelled + blended', pg.evaluate("__app.S().log.words") >= 1)
        pg.screenshot(path=SHOTS + f'{tag}-rain-done.png')
        # --- Story ---
        pg.evaluate("__app.go('story')"); pg.wait_for_timeout(500); pg.screenshot(path=SHOTS + f'{tag}-story-shelf.png')
        pg.click(force=True, selector='.book[data-i="4"]'); pg.wait_for_timeout(700)
        n0 = pg.evaluate("__AU.log.length")
        pg.locator('.word').nth(1).dispatch_event('pointerdown'); pg.wait_for_timeout(900)
        rec(f'{tag} story: tapping a word plays its clip', pg.evaluate("__AU.log.slice(%d).some(l=>l.src.includes('/w/has')&&l.ok)" % n0))
        pg.click(force=True, selector='[data-n="1"]'); pg.wait_for_timeout(300); pg.click(force=True, selector='[data-read]'); pg.wait_for_timeout(1400)
        rec(f'{tag} story: read-to-me highlights words', pg.evaluate("document.querySelectorAll('.word.hl').length") >= 1)
        pg.screenshot(path=SHOTS + f'{tag}-story.png')
        rec(f'{tag} story: page clip played', pg.evaluate("__AU.log.some(l=>l.src.includes('/s/build-1')&&l.ok)"))
        # --- Word Race ---
        pg.evaluate("__app.S().race.lv=4;__app.S().race.unlocked=4;__app.racePlay()"); pg.wait_for_timeout(800)
        pg.screenshot(path=SHOTS + f'{tag}-race-pick.png')
        # real drag for first car
        c = pg.locator('.garage .car').first.bounding_box(); t = pg.locator('.track').bounding_box()
        pg.mouse.move(c['x'] + c['width'] / 2, c['y'] + c['height'] / 2); pg.mouse.down(); pg.mouse.move(c['x'] + 20, c['y'] - 40, steps=4); pg.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2, steps=8); pg.mouse.up()
        pg.wait_for_timeout(500)
        rec(f'{tag} race: dragged car parked on the track', pg.evaluate("__race.si()") == 1)
        for i in range(4): pg.evaluate("__race.place()"); pg.wait_for_timeout(350)
        pg.screenshot(path=SHOTS + f'{tag}-race-track.png')
        pg.wait_for_selector('.showtime', timeout=20000); pg.wait_for_timeout(2600)
        pg.screenshot(path=SHOTS + f'{tag}-race-show.png')
        # --- Action words ---
        pg.evaluate("__app.go('action')"); pg.wait_for_timeout(500)
        pg.click(force=True, selector='.aw[data-w="jump"]'); pg.wait_for_timeout(500); pg.screenshot(path=SHOTS + f'{tag}-action.png')
        pg.click(force=True, selector='.modeBtn[data-m="match"]'); pg.wait_for_timeout(1200); pg.screenshot(path=SHOTS + f'{tag}-action-match.png')
        pg.click(force=True, selector='.modeBtn[data-m="phrase"]'); pg.wait_for_timeout(600); pg.click(force=True, selector='.goBtn'); pg.wait_for_timeout(2600); pg.screenshot(path=SHOTS + f'{tag}-action-phrase.png')
        # --- Gallery ---
        pg.evaluate("(()=>{const S=__app.S();S.stars=60;S.owned={bedroom:[0,1,2,3,4,5,9],castle:[0,1,2,3,4,5,6,7]};__app.save()})()")
        pg.evaluate("__app.gallery(1)"); pg.wait_for_timeout(600)
        pg.locator('.shopItem').first.click(force=True); pg.wait_for_timeout(1000)
        rec(f'{tag} gallery: buying places an item', pg.evaluate("__app.S().owned.castle.length") == 9)
        pg.screenshot(path=SHOTS + f'{tag}-gallery.png')
        pg.evaluate("__app.gallery(0)"); pg.wait_for_timeout(600); pg.screenshot(path=SHOTS + f'{tag}-gallery-bedroom.png')
        # --- Parent gate ---
        pg.evaluate("__app.go('home')"); pg.wait_for_timeout(400)
        k = pg.locator('.parentKey').bounding_box(); pg.mouse.move(k['x'] + 10, k['y'] + 10); pg.mouse.down(); pg.wait_for_timeout(1900); pg.mouse.up(); pg.wait_for_timeout(300)
        q = pg.locator('.gate').inner_text(); import re; a, bb = map(int, re.search(r'(\d+) × (\d+)', q).groups())
        for ch in str(a * bb): pg.click(force=True, selector=f'.gate [data-k="{ch}"]')
        pg.click(force=True, selector='.gate [data-k="✔"]'); pg.wait_for_timeout(400)
        rec(f'{tag} parent area opens after long-press + math gate', pg.locator('.parent').count() == 1)
        pg.screenshot(path=SHOTS + f'{tag}-parent.png')
        # no page scroll
        rec(f'{tag} no document scroll', pg.evaluate("document.scrollingElement.scrollHeight<=innerHeight+1 && document.scrollingElement.scrollWidth<=innerWidth+1"))
        if tag == 'ipad-land':
            # every clip referenced by the manifest is reachable
            r = pg.evaluate("""async()=>{const M=window.AUDIO_MANIFEST;const u=[];M.w.forEach(k=>u.push('audio/w/'+k+'.mp3'));M.p.forEach(k=>u.push('audio/p/'+k+'.mp3'));M.ln.forEach(k=>u.push('audio/ln/'+k+'.mp3'));M.ls.forEach(k=>u.push('audio/ls/'+k+'.mp3'));Object.keys(M.pages).forEach(k=>u.push('audio/s/'+k+'.mp3'));
              let ok=0,badl=[];for(let i=0;i<u.length;i+=30){const rs=await Promise.all(u.slice(i,i+30).map(x=>fetch(x).then(r=>r.ok&&r.headers.get('content-type')&&r.headers.get('content-type').includes('audio')).catch(()=>false)));rs.forEach((v,j)=>v?ok++:badl.push(u[i+j]));}return [ok,u.length,badl.slice(0,5)]}""")
            rec(f'all audio clips reachable as audio/*', r[0] == r[1], r)
            r = pg.evaluate("""async()=>{const M=window.AUDIO_MANIFEST;const sample=[].concat(M.ls.map(k=>'audio/ls/'+k+'.mp3'),M.ln.map(k=>'audio/ln/'+k+'.mp3'),M.p.slice(0,20).map(k=>'audio/p/'+k+'.mp3'),M.w.filter((_,i)=>i%8==0).map(k=>'audio/w/'+k+'.mp3'),Object.keys(M.pages).slice(0,10).map(k=>'audio/s/'+k+'.mp3'));
              let ok=0,fail=[];for(const s of sample){const a=new Audio();a.src=s;try{await a.play();await new Promise(r=>setTimeout(r,30));if(a.duration>0)ok++;else fail.push(s+' no duration');a.pause();}catch(e){fail.push(s+' '+e.name)}}return [ok,sample.length,fail.slice(0,5)]}""")
            rec(f'sampled clips decode and play() resolves', r[0] == r[1], r)
            # offline: service worker caches everything
            pg.wait_for_function("navigator.serviceWorker && navigator.serviceWorker.controller !== null || true")
            pg.reload(wait_until='networkidle'); pg.wait_for_timeout(4000)
            cached = pg.evaluate("(async()=>{const ks=await caches.keys();let n=0;for(const k of ks){n+=(await (await caches.open(k)).keys()).length}return n})()")
            rec('service worker cached the app + audio', cached > 550, cached)
            ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
            pg.click(force=True, selector='#startBtn'); pg.wait_for_timeout(1800)
            rec('works offline (reload + greeting clip plays)', pg.evaluate("__AU.log.some(l=>l.ok&&l.src.includes('welcome'))"))
            ctx.set_offline(False)
        ctx.close()
    b.close()
print('\nSUMMARY', sum(res), '/', len(res))
print('ERRORS', json.dumps(errs)); print('BAD REQUESTS', json.dumps(bad[:20]))
