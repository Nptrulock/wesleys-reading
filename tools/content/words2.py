# Word Race + Action Words vocab
NOUNS = [('pig','pigs','🐷'),('cat','cats','🐱'),('dog','dogs','🐶'),('frog','frogs','🐸'),('duck','ducks','🦆'),('bear','bears','🐻'),('fish','fish','🐟'),('bug','bugs','🐞'),('cow','cows','🐮'),('dragon','dragons','🐉'),('robot','robots','🤖'),('king','kings','🤴'),
 ('hen','hens','🐔'),('fox','foxes','🦊'),('bee','bees','🐝'),('owl','owls','🦉'),('goat','goats','🐐'),('crab','crabs','🦀'),('snake','snakes','🐍'),('whale','whales','🐳'),('lion','lions','🦁'),('tiger','tigers','🐯'),('monkey','monkeys','🐒'),('rabbit','rabbits','🐰'),
 ('mouse','mice','🐭'),('sheep','sheep','🐑'),('horse','horses','🐴'),('knight','knights','🤺'),('queen','queens','👸'),('wizard','wizards','🧙'),('alien','aliens','👽'),('unicorn','unicorns','🦄'),('penguin','penguins','🐧'),('shark','sharks','🦈'),('turtle','turtles','🐢'),('dinosaur','dinosaurs','🦖'),
 ('octopus','octopuses','🐙'),('panda','pandas','🐼'),('snowman','snowmen','⛄'),('truck','trucks','🚚'),('rocket','rockets','🚀'),('ghost','ghosts','👻')]
VERBS = [('jump','jumps','jumping','jump'),('run','runs','running','zoom'),('hop','hops','hopping','jump2'),('spin','spins','spinning','spin'),('swim','swims','swimming','swim'),('dance','dances','dancing','dance'),
 ('sleep','sleeps','sleeping','sleep'),('sing','sings','singing','sing'),('fly','flies','flying','fly'),('dig','digs','digging','shake'),('nap','naps','napping','sleep'),('wiggle','wiggles','wiggling','wiggle'),
 ('roll','rolls','rolling','roll'),('flip','flips','flipping','flip'),('wave','waves','waving','wave'),('hide','hides','hiding','hide'),('fall','falls','falling','fall'),('shake','shakes','shaking','shake'),
 ('skip','skips','skipping','jump2'),('twirl','twirls','twirling','spin'),('zoom','zooms','zooming','zoom'),('grow','grows','growing','grow'),('bounce','bounces','bouncing','jump2'),('stomp','stomps','stomping','shake'),
 ('float','floats','floating','fly'),('splash','splashes','splashing','swim'),('race','races','racing','zoom'),('tumble','tumbles','tumbling','roll'),('giggle','giggles','giggling','wiggle'),('play','plays','playing','dance')]
ADJS = [('big','big'),('little','little'),('silly','silly'),('happy','happy'),('red','red'),('pink','pink'),('sleepy','sleepy'),('fast','fast'),('blue','blue'),('green','green'),('purple','purple'),('yellow','yellow'),
 ('tiny','little'),('huge','big'),('giant','big'),('funny','silly'),('wiggly','silly'),('shiny','shiny'),('magic','magic'),('brave','brave'),('hungry','hungry'),('cold','cold'),('hot','hot'),('wet','wet'),('noisy','noisy'),('orange','orange')]
PLACES = [('on the moon','space','🌙'),('in the mud','mud','🟤'),('on a bus','road','🚌'),('in the sea','sea','🌊'),('on a log','grass','🪵'),('in a box','room','📦'),('up a tree','grass','🌳'),('in the tub','room','🛁'),
 ('in the castle','castle','🏰'),('in a cave','cave','🕳️'),('on a ship','sea','🚢'),('in the snow','sky','❄️'),('at the zoo','grass','🦒'),('on the farm','grass','🚜'),('in space','space','🪐'),('on a hill','hill','⛰️'),
 ('in the jungle','jungle','🌴'),('in the pond','pond','💧'),('at the park','grass','🎠'),('in a tent','night','⛺'),('on the roof','sunny','🏠'),('in bed','bedroom','🛏️'),('by the volcano','cave','🌋'),('under the stars','night','✨')]
# slots: noun noun2 nounP verbB verbS verbS2 verbI adj adj2 place ; fixed words start with '='
RACE_LEVELS = [
 ('r1','2 Words','🚗','#ef5350',['nounP','verbB'],'Pigs jump.'),
 ('r2','3 Words','🚙','#42a5f5',['=The','noun','verbS'],'The pig jumps.'),
 ('r3','I See','👀','#26c6da',['=I','=see','=the','noun'],'I see the pig.'),
 ('r4','4 Words','🚌','#66bb6a',['=The','noun','=can','verbB'],'The pig can jump.'),
 ('r5','5 Words','🚓','#ab47bc',['=The','adj','noun','=can','verbB'],'The big pig can jump.'),
 ('r6','Questions','❓','#7e57c2',['=Can','=the','noun','verbB?'],'Can the pig jump?'),
 ('r7','Two Friends','👫','#ec407a',['=The','noun','=and','=the','noun2','verbB'],'The pig and the cat jump.'),
 ('r8','Long','🏎️','#ffa726',['=The','adj','noun','verbS','place'],'The silly pig dances on the moon.'),
 ('r9','Is ...ing','🏁','#8d6e63',['=The','noun','=is','verbI','place'],'The pig is jumping in the mud.'),
 ('r10','Look!','🔭','#5c6bc0',['=Look!','=The','adj','noun','=is','verbI'],'Look! The big pig is jumping.'),
 ('r11','Double Do','🎢','#26a69a',['=The','noun','verbS','=and','verbS2','place'],'The pig hops and spins on a log.'),
 ('r12','Super Long','🚀','#d81b60',['=The','adj','noun','=and','=the','adj2','noun2','verbB','place'],'The big pig and the little cat dance on the moon.'),
]
ACTIONS = [('jump','jump'),('spin','spin'),('big','grow'),('small','shrink'),('hide','hide'),('run','zoom'),('sleep','sleep'),('shake','shake'),('fly','fly'),('swim','swim'),('dance','dance'),('hop','jump2'),('roll','roll'),('fall','fall'),('flip','flip'),('wiggle','wiggle'),('sing','sing'),('wave','wave'),
 ('leap','jump'),('twirl','spin'),('grow','grow'),('shrink','shrink'),('dash','zoom'),('nap','sleep'),('bounce','jump2'),('tumble','roll'),('stomp','shake'),('float','fly'),('dive','fall'),('sneak','hide'),('soar','fly'),('skip','jump2'),('sway','wiggle'),('twist','spin'),('shiver','shake'),('cheer','wave'),('yawn','sleep'),('splash','swim')]
# levels: (id, name, icon, color, word count from ACTIONS, phrase templates)
ACT_LEVELS = [
 ('a1','First Moves','🦘','#ef5350',10,['W']),
 ('a2','More Moves','🌀','#42a5f5',18,['W','W and W']),
 ('a3','New Moves','🌟','#66bb6a',26,['W and W','W W']),
 ('a4','All Moves','💫','#ab47bc',38,['W and W','the dragon can W']),
 ('a5','Then...','➡️','#ffa726',38,['W then W','the dragon can W']),
 ('a6','Dragon Tricks','🐉','#8d6e63',38,['the dragon can W and W','W then W']),
 ('a7','Three in a Row','3️⃣','#26a69a',38,['W, W, then W','the dragon can W and W']),
 ('a8','Super Combo','🏆','#d81b60',38,['W and W, then W','first W, then W','W, W, W, then W']),
]
