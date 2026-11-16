# v4 content: Vanishing, Picture Match, the restructured Action Words ladder, and their dialog.

# ---------------- VANISHING ----------------
# word bank by phonics band; category N (noun), V (verb), A (adjective); every word has a picture
BANK = {
 1: dict(N="cat:🐱 bat:🦇 hat:🎩 rat:🐀 van:🚐 map:🗺️ cap:🧢 bag:👜 jam:🍓 pig:🐷 wig:💇 pin:📌 fin:🦈 bin:🗑️ lid:🫕 dog:🐶 log:🪵 pot:🍯 box:📦 fox:🦊 mop:🧹 cup:☕ bug:🐛 bus:🚌 sun:☀️ mug:🍵 nut:🥜 rug:🟫 bed:🛏️ hen:🐔 pen:🖊️ net:🥅 web:🕸️ jet:🛩️ ten:🔟 egg:🥚",
        V="sit:🪑 run:🏃 hop:🐇 dig:⛏️ nap:😴 hug:🤗 tap:👆 hum:🎶 zip:🤐 wag:🐕 jog:🏃 sip:🥤 mix:🥣",
        A="big:🐘 red:🔴 hot:🔥 wet:💧 sad:😢 mad:😠 tan:🟤"),
 2: dict(N="fish:🐟 ship:🚢 shell:🐚 duck:🦆 chick:🐤 moth:🦋 bath:🛁 frog:🐸 crab:🦀 drum:🥁 flag:🚩 clock:⏰ sled:🛷 truck:🚚 sock:🧦 brush:🖌️ chip:🍟 dress:👗 plum:🍑 nest:🪺",
        V="chop:🪓 wish:🌠 kick:⚽ lick:👅 swim:🏊 spin:🌀 jump:🦘 clap:👏 skip:💃 grab:✊ drip:💧 flap:🦅 sing:🎤 swing:🎠",
        A="thick:📚 thin:📏 fast:💨 soft:🧸 glad:😊 black:⚫ pink:🩷 fresh:🌿"),
 3: dict(N="cake:🎂 bike:🚲 kite:🪁 bone:🦴 rope:🪢 snake:🐍 tree:🌳 boat:⛵ moon:🌙 goat:🐐 leaf:🍃 coat:🧥 train:🚂 bee:🐝 queen:👸 cheese:🧀 robot:🤖 star:⭐ shark:🦈 horse:🐴 owl:🦉 cloud:☁️ cow:🐮 coin:🪙",
        V="bake:👩‍🍳 ride:🚴 hide:🙈 sleep:😴 read:📖 eat:🍽️ skate:⛸️ float:🎈 wave:👋 smile:😊 cook:🍳 paint:🎨 play:🎮 fly:🦅 dream:💭",
        A="green:🟢 cute:🥰 cold:🥶 sleepy:😪 shiny:✨ happy:😄 silly:🤪 brave:🦸 tiny:🐜 loud:📢"),
}
# replace emoji newer than 13.0 (nest 🪺 is 15, pink 🩷 is 15)
BANK[2]['N'] = BANK[2]['N'].replace('nest:🪺', 'nest:🐣'); BANK[2]['A'] = BANK[2]['A'].replace('pink:🩷', 'pink:🌸')
# levels: (id, name, icon, color, bands, templates, choices). In a template, N/V/A are word slots
# (all are targets); lowercase words are read normally. Capital first letter is added by the app.
VAN = [
 ('v1', 'A Cat', '🐱', '#8e24aa', [1], ['a N'], 2),
 ('v2', 'Dogs Run', '🐶', '#7b1fa2', [1], ['the N', 'I V'], 2),
 ('v3', 'Red Hat', '🎩', '#6a1b9a', [1], ['a A N'], 2),
 ('v4', 'I Hop', '🐇', '#5e35b1', [1], ['I V', 'I can V'], 3),
 ('v5', 'Big Red', '🔴', '#512da8', [1], ['A N', 'a A N'], 3),
 ('v6', 'I See', '👀', '#4527a0', [1], ['I see a N', 'I can V'], 3),
 ('v7', 'It Can', '🐉', '#3949ab', [1], ['the N can V', 'a N can V'], 3),
 ('v8', 'I See Big', '🔭', '#303f9f', [1], ['I see a A N', 'look at the A N'], 3),
 ('v9', 'Big Dog Can', '🐕', '#283593', [1], ['the A N can V'], 3),
 ('v10', 'Fish & Ship', '🐟', '#1e88e5', [2], ['a N can V', 'the A N'], 3),
 ('v11', 'I Can Swim', '🏊', '#1976d2', [2], ['I can V', 'the N can V'], 3),
 ('v12', 'I See Fish', '🦆', '#1565c0', [1, 2], ['I see a A N', 'look at the N'], 3),
 ('v13', 'It Is', '🐸', '#0d47a1', [2], ['the N is A', 'my N is A'], 3),
 ('v14', 'And', '➕', '#00838f', [1, 2], ['the N can V and V'], 3),
 ('v15', 'Look!', '🔍', '#00695c', [1, 2], ['look at the A N', 'the A N can V'], 4),
 ('v16', 'Cake & Kite', '🎂', '#2e7d32', [3], ['a N can V', 'the A N'], 3),
 ('v17', 'I Can Ride', '🚲', '#388e3c', [3], ['I can V', 'the N can V'], 4),
 ('v18', 'Shiny Star', '⭐', '#558b2f', [3], ['I see a A N', 'the N is A'], 4),
 ('v19', 'On The', '🛏️', '#9e9d24', [1, 3], ['the N is on the N', 'the N is in the N'], 4),
 ('v20', 'Long Ones', '🚂', '#f9a825', [1, 2, 3], ['the A N can V on the N'], 4),
 ('v21', 'Two Friends', '👫', '#ef6c00', [1, 2, 3], ['the N and the N can V'], 4),
 ('v22', 'Two Big', '🐘', '#d84315', [1, 2, 3], ['I see a A N and a A N'], 4),
 ('v23', 'Three Moves', '3️⃣', '#c62828', [1, 2, 3], ['the A N can V, V and V'], 4),
 ('v24', 'Super Reader', '🏆', '#ad1457', [1, 2, 3], ['look! the A N and the A N can V', 'the A N is on the N and can V'], 4),
]

# ---------------- PICTURE MATCH ----------------
# riddles: noun -> (emoji, group, [facts]) ; groups give close distractors
RIDDLES = [
 ('dragon', '🐉', 'wild', ['It is big and green.', 'It has wings.', 'It can breathe fire.']),
 ('cat', '🐱', 'pet', ['It says meow.', 'It has soft fur and whiskers.', 'It likes to chase mice.']),
 ('dog', '🐶', 'pet', ['It says woof.', 'It wags its tail.', 'It likes to fetch a ball.']),
 ('fish', '🐟', 'pond', ['It lives in the water.', 'It has fins.', 'It can swim but it cannot walk.']),
 ('cow', '🐮', 'farm', ['It says moo.', 'It lives on a farm.', 'It gives us milk.']),
 ('pig', '🐷', 'farm', ['It says oink.', 'It is pink.', 'It likes to roll in the mud.']),
 ('duck', '🦆', 'farm', ['It says quack.', 'It swims on the pond.', 'It has a flat bill.']),
 ('sheep', '🐑', 'farm', ['It says baa.', 'It has fluffy wool.', 'It lives on a farm.']),
 ('horse', '🐴', 'farm', ['It says neigh.', 'You can ride it.', 'It runs very fast.']),
 ('hen', '🐔', 'farm', ['It says cluck.', 'It lays eggs.', 'It lives on a farm.']),
 ('frog', '🐸', 'pond', ['It is green.', 'It says ribbit.', 'It can hop and swim.']),
 ('bee', '🐝', 'bug', ['It is yellow and black.', 'It says buzz.', 'It makes honey.']),
 ('spider', '🕷️', 'bug', ['It has eight legs.', 'It makes a web.', 'It is very small.']),
 ('snail', '🐌', 'bug', ['It is very slow.', 'It has a shell on its back.', 'It likes wet leaves.']),
 ('butterfly', '🦋', 'bug', ['It has pretty wings.', 'It was a caterpillar.', 'It likes flowers.']),
 ('lion', '🦁', 'wild', ['It says roar.', 'It has a big mane.', 'It is the king of the animals.']),
 ('elephant', '🐘', 'wild', ['It is very big and gray.', 'It has a long trunk.', 'It has big ears.']),
 ('monkey', '🐒', 'wild', ['It can climb trees.', 'It has a long tail.', 'It likes bananas.']),
 ('giraffe', '🦒', 'wild', ['It has a very long neck.', 'It has spots.', 'It eats leaves from tall trees.']),
 ('snake', '🐍', 'wild', ['It is long.', 'It has no legs.', 'It says hiss.']),
 ('owl', '🦉', 'bird', ['It says hoot.', 'It is awake at night.', 'It has big eyes.']),
 ('penguin', '🐧', 'bird', ['It is black and white.', 'It cannot fly but it can swim.', 'It lives where it is cold.']),
 ('whale', '🐳', 'sea', ['It is very, very big.', 'It lives in the sea.', 'It sprays water from its head.']),
 ('shark', '🦈', 'sea', ['It lives in the sea.', 'It has lots of sharp teeth.', 'It has a fin on its back.']),
 ('octopus', '🐙', 'sea', ['It has eight arms.', 'It lives in the sea.', 'It can squirt ink.']),
 ('crab', '🦀', 'sea', ['It walks sideways.', 'It has two big claws.', 'It lives on the beach.']),
 ('turtle', '🐢', 'sea', ['It has a hard shell.', 'It is slow.', 'It can hide its head.']),
 ('rocket', '🚀', 'go', ['It goes up to space.', 'It has fire at the bottom.', 'It goes whoosh!']),
 ('bus', '🚌', 'go', ['It is big and yellow.', 'It takes kids to school.', 'It has lots of seats.']),
 ('train', '🚂', 'go', ['It goes on a track.', 'It says choo choo.', 'It pulls lots of cars.']),
 ('boat', '⛵', 'go', ['It floats on the water.', 'It has a sail.', 'The wind pushes it.']),
 ('plane', '✈️', 'go', ['It flies in the sky.', 'It has two big wings.', 'It goes to the airport.']),
 ('firetruck', '🚒', 'go', ['It is red.', 'It has a long ladder.', 'It helps put out fires.']),
 ('bike', '🚲', 'go', ['It has two wheels.', 'You push the pedals.', 'You wear a helmet to ride it.']),
 ('apple', '🍎', 'food', ['It is red and round.', 'It grows on a tree.', 'It is crunchy to eat.']),
 ('banana', '🍌', 'food', ['It is long and yellow.', 'You peel it to eat it.', 'Monkeys love it.']),
 ('pizza', '🍕', 'food', ['It is round and cheesy.', 'You cut it into slices.', 'It is hot from the oven.']),
 ('cake', '🎂', 'food', ['It is sweet.', 'It has candles on top.', 'You eat it at a birthday party.']),
 ('ice cream', '🍦', 'food', ['It is cold and sweet.', 'It can melt.', 'It comes in a cone.']),
 ('carrot', '🥕', 'food', ['It is orange.', 'It grows under the ground.', 'Rabbits love it.']),
 ('moon', '🌙', 'sky', ['You see it at night.', 'It shines in the dark sky.', 'Astronauts went there.']),
 ('sun', '☀️', 'sky', ['It is very hot.', 'It shines in the day.', 'It is a big star.']),
 ('star', '⭐', 'sky', ['It twinkles at night.', 'It is very far away.', 'It has five points.']),
 ('rainbow', '🌈', 'sky', ['It has lots of colors.', 'You see it after the rain.', 'It is shaped like an arch.']),
 ('snowman', '⛄', 'sky', ['It is made of snow.', 'It has a carrot nose.', 'It melts when it is warm.']),
 ('clock', '⏰', 'home', ['It tells the time.', 'It goes tick tock.', 'It has two hands.']),
 ('bed', '🛏️', 'home', ['You sleep in it.', 'It has a soft pillow.', 'It is in your bedroom.']),
 ('umbrella', '☂️', 'home', ['It keeps you dry.', 'You open it in the rain.', 'You hold it over your head.']),
 ('crown', '👑', 'home', ['It is gold.', 'A king wears it.', 'You put it on your head.']),
 ('robot', '🤖', 'home', ['It is made of metal.', 'It goes beep boop.', 'It can walk and talk.']),
 ('ghost', '👻', 'home', ['It says boo.', 'It is white.', 'It can float.']),
]
# attribute composites: nouns that colorize well; colors; sizes; numbers; actions; places
PM_NOUNS = ['fish', 'cat', 'dog', 'pig', 'frog', 'duck', 'bear', 'cow', 'hen', 'bug', 'dragon', 'robot', 'whale', 'snake', 'owl', 'turtle', 'monkey', 'rabbit', 'crab', 'bee']
PM_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'orange']
PM_SIZES = ['big', 'little']
PM_ACTS = [('sleeping', 'sleep'), ('jumping', 'jump'), ('spinning', 'spin'), ('dancing', 'dance'), ('swimming', 'swim'), ('flying', 'fly')]
PM_PLACES = [('on the moon', '🌙'), ('in the sea', '🌊'), ('up a tree', '🌳'), ('in a box', '📦'), ('in the snow', '❄️'), ('on a log', '🪵'), ('in bed', '🛏️'), ('on the farm', '🚜')]
# levels: (id, name, icon, color, kind, attrs, choices, audio) kind: riddle | attr ; riddle attrs = number of facts
# audio: 'full' = clue spoken (and shown), 'read' = clue shown as text only (tap 🔊 for a gentle hint)
PM = [
 ('m1', 'Guess It!', '🎁', '#00897b', 'riddle', 3, 2, 'full', 'far'),
 ('m2', 'Riddle Time', '❓', '#00796b', 'riddle', 3, 3, 'full', 'far'),
 ('m3', 'Colors', '🎨', '#43a047', 'attr', ['color'], 2, 'full', ''),
 ('m4', 'Big & Little', '🐘', '#388e3c', 'attr', ['size'], 2, 'full', ''),
 ('m5', 'Fewer Clues', '🕵️', '#2e7d32', 'riddle', 2, 3, 'full', 'near'),
 ('m6', 'How Many?', '🔢', '#7cb342', 'attr', ['num'], 3, 'full', ''),
 ('m7', 'What Is It Doing?', '🤸', '#689f38', 'attr', ['act'], 3, 'full', ''),
 ('m8', 'Where Is It?', '📍', '#9e9d24', 'attr', ['place'], 3, 'full', ''),
 ('m9', 'One Clue', '🔎', '#f9a825', 'riddle', 1, 3, 'full', 'near'),
 ('m10', 'Mix It Up', '🔀', '#f57f17', 'attr', ['any1'], 4, 'full', ''),
 ('m11', 'Read The Riddle', '📜', '#ef6c00', 'riddle', 2, 3, 'read', 'near'),
 ('m12', 'Read & Find', '📖', '#e65100', 'attr', ['act'], 3, 'read', ''),
 ('m13', 'Two Clues', '✌️', '#d84315', 'attr', ['color', 'act'], 4, 'full', ''),
 ('m14', 'Tricky Riddles', '🧩', '#bf360c', 'riddle', 1, 4, 'full', 'near'),
 ('m15', 'Read Two Clues', '📗', '#6d4c41', 'attr', ['size', 'color'], 4, 'read', ''),
 ('m16', 'Three Clues', '3️⃣', '#5d4037', 'attr', ['num', 'color', 'act'], 4, 'full', ''),
 ('m17', 'Read Tricky Riddles', '🗝️', '#4e342e', 'riddle', 1, 4, 'read', 'near'),
 ('m18', 'Read Three Clues', '📚', '#546e7a', 'attr', ['size', 'color', 'act'], 4, 'read', ''),
 ('m19', 'Super Listener', '👂', '#455a64', 'attr', ['num', 'act', 'place'], 4, 'full', ''),
 ('m20', 'Super Detective', '🏆', '#37474f', 'attr', ['size', 'color', 'act', 'place'], 4, 'read', ''),
]

# ---------------- ACTION WORDS (v4: clear, linear sub-modes) ----------------
# kinds: watch (watch Sparky + say the word), tap (hear it, tap the dragon doing it), read (read it, tap the
# dragon doing it), do2 / do3 / do4 (read a 2/3/4-move phrase, tap the moves in order), sent (read a sentence,
# pick the matching picture, then watch it). (lo, hi) = slice of the ACTIONS list in play.
ACT4 = [
 ('w1', 'Watch & Say', '👀', '#ef5350', 'watch', 0, 6),
 ('t1', 'Tap the Action', '👂', '#e53935', 'tap', 0, 6),
 ('r1', 'Read It', '📖', '#c62828', 'read', 0, 6),
 ('w2', 'Watch & Say 2', '👀', '#42a5f5', 'watch', 6, 12),
 ('t2', 'Tap the Action 2', '👂', '#1e88e5', 'tap', 0, 12),
 ('r2', 'Read It 2', '📖', '#1565c0', 'read', 0, 12),
 ('d1', 'Read & Do: Two', '✌️', '#66bb6a', 'do2', 0, 12),
 ('w3', 'Watch & Say 3', '👀', '#43a047', 'watch', 12, 20),
 ('t3', 'Tap the Action 3', '👂', '#388e3c', 'tap', 0, 20),
 ('r3', 'Read It 3', '📖', '#2e7d32', 'read', 0, 20),
 ('d2', 'Read & Do: Two', '✌️', '#ab47bc', 'do2', 0, 20),
 ('d3', 'Read & Do: Three', '3️⃣', '#8e24aa', 'do3', 0, 20),
 ('s1', 'Read the Sentence', '📜', '#ffa726', 'sent', 0, 20),
 ('w4', 'Watch & Say 4', '👀', '#fb8c00', 'watch', 20, 38),
 ('t4', 'Tap the Action 4', '👂', '#f57c00', 'tap', 0, 38),
 ('r4', 'Read It 4', '📖', '#ef6c00', 'read', 0, 38),
 ('d4', 'Read & Do: Two', '✌️', '#26a69a', 'do2', 0, 38),
 ('d5', 'Read & Do: Three', '3️⃣', '#00897b', 'do3', 0, 38),
 ('s2', 'Longer Sentences', '📚', '#8d6e63', 'sent2', 0, 38),
 ('d6', 'Super Combo: Four', '🏆', '#d81b60', 'do4', 0, 38),
]
ACT_MIX_AT = 6   # Mix free play unlocks once level 7 (Read & Do: Two) is open

# ---------------- dialog ----------------
D = {}
D['van_intro'] = """Let's play Vanishing! Pick the word that goes in each space.|Read the words, then find the missing one!|Magic word time! Fill in each space.|Can you finish the sentence? Pick the right word!|Let's read and fill in the spaces!""".split('|')
D['van_pick'] = """Which word goes here?|Find the word for this space.|What word fits here?|Pick the right word!|Read the words. Which one goes here?|Look carefully. Which word is it?""".split('|')
D['van_poof_audio'] = """Poof! The sound vanished! Can you still find the word?|Abracadabra! No more sound for that word!|The sound went away! Use the picture and the letters.""".split('|')
D['van_poof_pic'] = """Poof! The pictures disappeared! Read the letters.|Whoosh! The pictures vanished!|No more pictures! You can read the letters.""".split('|')
D['van_poof_letters'] = """Some letters are fading away! Look at the first letter.|Sparkle sparkle! Only the first letter is left!|The letters are hiding! Look at how the word starts.""".split('|')
D['van_poof_all'] = """No help this time! Read it all by yourself!|All the magic clues are gone! You can do it, reader!|Now you are a super reader! No clues!""".split('|')
D['van_help'] = """Here's a little help!|Let me bring back a clue.|The magic clue came back!|Here's a hint for this one.""".split('|')
D['van_step_up'] = """You need less help now! Get ready for some magic!|Your reading is getting stronger! A clue will vanish next time!|Wow! Next time, some help disappears!""".split('|')
D['van_step_down'] = """Let's bring back some help. That's okay!|We'll practice with a little more help.""".split('|')
D['van_read'] = """Now let's read the whole thing!|Listen to the whole sentence!|You made the whole sentence!""".split('|')
D['pm_intro'] = """Let's play Picture Match! Listen to the clues and find the picture.|Detective time! Which picture is it?|Can you find the right picture?|Let's be picture detectives!""".split('|')
D['pm_listen'] = """Listen carefully, then find the picture.|Which picture is it?|Tap the picture that matches!|Find the one I'm talking about!""".split('|')
D['pm_read'] = """No sound this time. Read the clue yourself!|Read the words and find the picture!|You're the reader now! Read the clue.""".split('|')
D['pm_riddle'] = """Riddle time! Guess what it is.|Listen to the riddle!|What am I thinking of?""".split('|')
D['pm_that'] = """That one is|Hmm, that's|Look, that picture is""".split('|')
D['pm_close'] = """So close! Look at the pictures again.|Almost! Check every clue.|Try again! Look at the color, the size and how many.""".split('|')
D['pm_yes'] = """Yes! That's the one!|You found it, detective!|Right picture! Great listening!|You matched it!""".split('|')
D['act_watch'] = """Watch Sparky, then say the word!|Your turn! Tap the word and say it with me!|Look what Sparky can do!""".split('|')
D['act_tap'] = """Listen, then tap the dragon doing it!|Which dragon is doing it? Tap it!|Find the dragon that matches the word!""".split('|')
D['act_read'] = """Read the word, then tap the dragon doing it!|No sound this time. Read it, then find it!|Read it yourself, then tap the right dragon!""".split('|')
D['act_do'] = """Read the moves, then tap them in order!|First one, then the next! Tap the moves in order.|Read it, then make Sparky do it!""".split('|')
D['act_sent'] = """Read the sentence, then pick the picture!|Which picture matches the sentence?|Read it, then watch it happen!""".split('|')
D['act_next_move'] = """Now the next move!|What comes next?|And then?""".split('|')
D['act_mix_open'] = ['You unlocked Mix! Make silly pictures any time!']
D['act_map'] = """Pick an Action Words level!|Each level is a new game. Let's go!""".split('|')
D['cheer'] = ['Woo hoo!', 'Yay!', 'Boom!', 'Kapow!', 'Zoom!', 'Whee!']
D['car_hint'] = ['Tap a word car!']

# the one clue that alone tells this riddle apart from the others in its group (index into its facts)
KEYF = dict(dragon=2, cat=0, dog=0, fish=2, cow=0, pig=0, duck=0, sheep=0, horse=0, hen=0, frog=1, bee=1, spider=0, snail=1, butterfly=0, lion=0, elephant=1,
            monkey=2, giraffe=0, snake=1, owl=0, penguin=1, whale=2, shark=1, octopus=0, crab=0, turtle=2, rocket=0, bus=1, train=1, boat=1, plane=0, firetruck=2,
            bike=0, apple=0, banana=0, pizza=0, cake=1, carrot=2, moon=2, sun=0, star=2, rainbow=0, snowman=1, clock=1, bed=0, umbrella=1, crown=1, robot=1, ghost=0)
KEYF['ice cream'] = 2

# ---------------- MEDALS + WORD GALLERIES ----------------
# every level: 10 bronze stars (opens the next level), then 10 silver, then 10 gold. Each medal earned
# unlocks the next reward on this track: secret words, word stickers and fancy fonts.
SECRET = [  # (word, emoji, action)
 ('kaboom', '💥', 'roar'), ('zigzag', '⚡', 'zoom'), ('tornado', '🌪️', 'spin'), ('volcano', '🌋', 'shake'), ('galaxy', '🌌', 'twinkleA'), ('abracadabra', '🪄', 'twinkleA'),
 ('tyrannosaurus', '🦖', 'roar'), ('flamingo', '🦩', 'dance'), ('hippopotamus', '🦛', 'jump'), ('rhinoceros', '🦏', 'zoom'), ('chameleon', '🦎', 'hide'), ('porcupine', '🦔', 'roll'),
 ('gorilla', '🦍', 'roar'), ('cheetah', '🐆', 'zoom'), ('peacock', '🦚', 'grow'), ('sloth', '🦥', 'sleep'), ('lobster', '🦞', 'wiggle'), ('squid', '🦑', 'swim'),
 ('astronaut', '🧑‍🚀', 'fly'), ('spaceship', '🛸', 'fly'), ('telescope', '🔭', 'glow'), ('satellite', '🛰️', 'spin'), ('helicopter', '🚁', 'fly'), ('skateboard', '🛹', 'zoom'),
 ('parachute', '🪂', 'fall'), ('boomerang', '🪃', 'roll2'), ('trampoline', '🤸', 'jump'), ('saxophone', '🎷', 'sing'), ('accordion', '🪗', 'sing'), ('banjo', '🪕', 'sing'),
 ('fireworks', '🎆', 'launch'), ('lollipop', '🍭', 'spin'), ('pretzel', '🥨', 'flip'), ('waffle', '🧇', 'bob1'), ('burrito', '🌯', 'roll'), ('dumpling', '🥟', 'jump2'),
 ('cupcake', '🧁', 'grow'), ('doughnut', '🍩', 'roll'), ('pancakes', '🥞', 'flip'), ('mermaid', '🧜', 'swim'), ('genie', '🧞', 'twinkleA'), ('superhero', '🦸', 'fly'),
 ('ninja', '🥷', 'flip'), ('pirate', '🏴‍☠️', 'wave'), ('pinata', '🪅', 'shake'), ('magnet', '🧲', 'wiggle'), ('microscope', '🔬', 'glow'), ('thunderstorm', '⛈️', 'shake'),
 ('hullabaloo', '📯', 'dance'), ('bamboozle', '🤪', 'wiggle'), ('gobbledygook', '🦃', 'dance'), ('flabbergasted', '😲', 'grow'), ('snickerdoodle', '🍪', 'spin'), ('whatchamacallit', '❓', 'flip'),
 ('kangaroo', '🦘', 'jump'), ('crocodile', '🐊', 'roar'), ('caterpillar', '🐛', 'wiggle'), ('mammoth', '🦣', 'roar'), ('treasure', '💎', 'glow'), ('crystal', '🔮', 'twinkleA'),
]
STICKERS = [  # (word, emoji, action)
 ('kapow', '💥', 'roar'), ('zoom', '💨', 'zoom'), ('wow', '🤩', 'grow'), ('yay', '🎉', 'jump'), ('pop', '🎈', 'grow'), ('splash', '💦', 'shake'), ('roar', '🦁', 'roar'),
 ('vroom', '🏎️', 'zoom'), ('zap', '⚡', 'shake'), ('bam', '👊', 'roar'), ('whoosh', '🌬️', 'zoom'), ('beep', '🤖', 'wiggle'), ('honk', '📯', 'shake'), ('buzz', '🐝', 'fly'),
 ('oink', '🐷', 'jump'), ('moo', '🐮', 'wiggle'), ('crunch', '🥕', 'shake'), ('yum', '😋', 'jump'), ('brr', '🥶', 'shake'), ('hooray', '🥳', 'dance'), ('whee', '🎢', 'roll2'),
 ('splat', '🍅', 'fall'), ('ding', '🔔', 'wiggle'), ('chomp', '🦖', 'roar'), ('snap', '📸', 'grow'), ('swish', '🏀', 'flip'), ('peekaboo', '🙈', 'hide'), ('high five', '🙌', 'jump'),
 ('rawr', '🐉', 'roar'), ('ta-da', '🎩', 'flip'),
]
FONTS = [  # (id, name, emoji)
 ('bubble', 'Bubble Letters', '🫧'), ('chalk', 'Chalkboard', '🖍️'), ('castle', 'Castle Letters', '🏰'), ('fire', 'Dragon Fire', '🔥'), ('robot', 'Robot Letters', '🤖'), ('space', 'Space Letters', '🚀'),
]
FONTS[0] = ('bubble', 'Bubble Letters', '🎈')   # 🫧 is emoji 14
# reward track: a font at medals 2, 6, 11, 17, 24, 32; a sticker every 3rd medal; secret words otherwise
def reward_track():
    fonts, st, sw = [f[0] for f in FONTS], [s[0] for s in STICKERS], [s[0] for s in SECRET]
    out = []; fi = si = wi = 0; n = 1
    font_at = {2, 6, 11, 17, 24, 32}
    while fi < len(fonts) or si < len(st) or wi < len(sw):
        if n in font_at and fi < len(fonts): out.append(['font', fonts[fi]]); fi += 1
        elif n % 3 == 0 and si < len(st): out.append(['sticker', st[si]]); si += 1
        elif wi < len(sw): out.append(['secret', sw[wi]]); wi += 1
        elif si < len(st): out.append(['sticker', st[si]]); si += 1
        else: out.append(['font', fonts[fi]]); fi += 1
        n += 1
    return out
D['medal_bronze'] = ['Bronze medal! You opened the next level!', 'Hooray! A bronze medal! The next level is open!', 'Ten bronze stars! Next level unlocked!']
D['medal_silver'] = ['Silver medal! Shiny!', 'Wow, a silver medal! Super practice!', 'Silver! You are so good at this level!']
D['medal_gold'] = ['Gold medal! You are a champion!', 'Gold! The best medal of all!', 'Golden stars! Amazing!']
D['reward_secret'] = ['You found a secret word!', 'A secret word is unlocked! Go see it in the Word Galleries!']
D['reward_sticker'] = ['You got a new word sticker!', 'A sticker for your collection!']
D['reward_font'] = ['You unlocked fancy letters! Try them in the Word Galleries!', 'New letters! Make your words look awesome!']
D['wg_intro'] = ['Welcome to the Word Galleries! Win medals to fill it up!', 'Your secret words, stickers and fancy letters live here!']
D['wg_locked'] = ['Win more medals to open this one!', 'Keep earning medals to unlock it!']
D['wg_font_on'] = ['Fancy letters on! Look at your words!', 'Ooh, your words look so cool!']
D['wg_secret'] = ['Secret word!', 'Shh, a secret word!', 'What a fun word!']
EXTRA = {}
for n in range(1, 10):
    EXTRA[f'more_b_{n}'] = f"{'Just one more star' if n == 1 else str(n) + ' more stars'} to the next level!"
    EXTRA[f'more_s_{n}'] = f"{'Just one more star' if n == 1 else str(n) + ' more stars'} to the silver medal!"
    EXTRA[f'more_g_{n}'] = f"{'Just one more star' if n == 1 else str(n) + ' more stars'} to the gold medal!"
EXTRA['all_gold'] = 'All three medals! You are a superstar!'
EXTRA['font_off'] = 'Regular letters.'
