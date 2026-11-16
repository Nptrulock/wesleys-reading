# 📖 Wesley's Reading Adventure

A learn-to-read app for a 5-year-old, made for iPad (landscape or portrait) and phones. It's plain HTML/CSS/JS with no build step, and it works offline once loaded.

**Play:** https://nptrulock.github.io/wesleys-reading/ (on iPad: Share → Add to Home Screen)

## Modes
- **🔤 Letter Rain:** letters fall slowly and he taps them in order to spell the pictured, spoken word. Wrong taps just bounce, and after a while the right letter glows. Seven levels: Letters (single letter sounds) → First Words (CVC) → Sight Words → Blends & digraphs (sh, ch, th, ck, ng, ee, oo as single tiles) → Grade 1 → Grade 2 → Grade 3. Decodable levels speak each letter *sound* and then blend ("c-a-t… cat"). Sight-word and grade levels spell with letter *names*.
- **📖 Story Time:** 8 original illustrated stories, leveled from decodable CVC to about grade 3. Tap any word to hear it. The 🔊 button reads the page aloud and highlights each word as it's read.
- **🏎️ Word Race:** drag (or tap twice) word cars onto the road to build a silly sentence. The cars hop as each word is read, then zoom off, and the sentence is acted out. Levels go from 2 words to "The silly pig dances on the moon."
- **🤸 Action Words:** 18 words that do what they mean. Play (tap to see), Match (what is the dragon doing?), Read & Do (reads the phrase, then performs each action word in turn: "jump and spin" = a full jump, then a full spin) and Mix (build "The silly pig dances on the moon", with a 🔄 per word type and 🔀 to shuffle all).
- **⏭️ Next** is always visible in every mode (next word, page, sentence or phrase). The end-of-round card has a Next-level button.
- **🏰 Star Gallery:** every 10 points becomes a ⭐. Stars buy items that pop into 7 rooms (My Room, Castle, Dragon Cave, Build Shop, Jungle, Ocean, Space). Each room opens once 5 items are in the room before it.

## Audio (v2)
Every word, letter name, letter sound, instruction, praise line and story page is a pre-recorded MP3 (`audio/`, edge-tts `en-US-AvaNeural`, made by `tools/gen_audio.py`).
- **Playback:** "Tap to start" resumes Web Audio (and sets `navigator.audioSession.type='playback'`). Clips are fetched and decoded into buffers once, preloaded for what's on screen, and scheduled back-to-back, so sentences play with no gaps. If Web Audio isn't running, or the parent area's "Voice player" is set to HTML audio, it uses a shared `<audio>` element instead. That path never waits more than 2.5 s for a clip that won't start. `speechSynthesis` is the last resort.
- **Service worker:** answers Safari's byte-`Range` requests with 206 partial responses. v1 returned the full cached file, which makes iOS media playback fail or stall. The install step fetches with `cache: 'reload'` so an update never re-caches stale files. A new build reloads the start screen automatically, or shows "New version — tap to update" if he's mid-game.
- **Trim:** v2 uses an energy-based trim. v1's ffmpeg `silenceremove` turned `cats.mp3` into 0.1 s of silence. `tools/test.py` decodes every clip the app can say.

## Grown-ups
Press and hold the faint ⚙️ (bottom right of home) for about 2 seconds, then answer a times-table question. From there you can see progress and the trickiest words, set levels, switch to capital letters, run a sound check, give stars, or reset.

## Dev
- `python3 tools/gen_audio.py`: generates missing clips and `audio/manifest.js`. Edit content in `data.js` first.
- `python3 tools/build_sw.py`: rebuilds the `sw.js` precache list and version. Run it after any change.
- `python3 tools/test.py [url]`: headless Chrome test at 1024×768, 820×1180 and 390×844. It covers every mode, console errors, that all clips are reachable, play() resolving, and offline mode.
