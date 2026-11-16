/* Wesley's Reading Adventure — all content. Shared by the app (window.DATA) and tools (module.exports). */
(function (root) {
  // ---------- Letters & phonics ----------
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const LETTER_NAME_TEXT = {a:'ay',b:'bee',c:'see',d:'dee',e:'ee',f:'eff',g:'jee',h:'aitch',i:'eye',j:'jay',k:'kay',l:'ell',m:'em',n:'en',o:'oh',p:'pee',q:'cue',r:'are',s:'ess',t:'tee',u:'you',v:'vee',w:'double you',x:'ex',y:'why',z:'zee'};
  // keyword picture for each letter (shown in Letter level)
  const LETTER_KEY = {a:['apple','🍎'],b:['ball','⚽'],c:['cat','🐱'],d:['dog','🐶'],e:['egg','🥚'],f:['fish','🐟'],g:['goat','🐐'],h:['hat','🎩'],i:['igloo','🧊'],j:['jet','🛩️'],k:['kite','🪁'],l:['lion','🦁'],m:['moon','🌙'],n:['nest','🐦'],o:['octopus','🐙'],p:['pig','🐷'],q:['queen','👸'],r:['robot','🤖'],s:['sun','☀️'],t:['tiger','🐯'],u:['up','⬆️'],v:['van','🚐'],w:['whale','🐳'],x:['fox','🦊'],y:['yo-yo','🪀'],z:['zebra','🦓']};
  // graphemes beyond single letters that get their own sound tiles
  const DIGRAPHS = ['sh','ch','th','ck','ng','ee','oo','ll','ss','ff'];

  // ---------- Letter Rain levels ----------
  // word: text, pic: emoji, g: optional grapheme split ("sh-i-p"), sight: sight word (spelled with letter names)
  const RAIN_LEVELS = [
    { id:'abc', name:'Letters', icon:'🔤', mode:'letter', color:'#ff8a65',
      words: 'm s a t p i n o c d g h e u b f l r k j v w y z x q'.split(' ').map(w => ({ word:w, pic:LETTER_KEY[w][1] })) },
    { id:'cvc', name:'First Words', icon:'🐱', mode:'sound', color:'#4fc3f7', words: [
      ['cat','🐱'],['dog','🐶'],['sun','☀️'],['pig','🐷'],['hat','🎩'],['bat','🦇'],['bus','🚌'],['bed','🛏️'],['cup','☕'],['fox','🦊'],
      ['hen','🐔'],['map','🗺️'],['bug','🐛'],['box','📦'],['rat','🐀'],['log','🪵'],['web','🕸️'],['van','🚐'],['nut','🥜'],['pen','🖊️'],
      ['jet','🛩️'],['six','6️⃣'],['ten','🔟'],['cab','🚕'],['pot','🍲'],['zip','🤐'],['wig','💇'],['mop','🧹'],['red','🔴'],['hug','🤗']
    ].map(([w,p]) => ({ word:w, pic:p })) },
    { id:'sight', name:'Sight Words', icon:'👀', mode:'name', color:'#ba68c8', words: [
      ['the','👉'],['and','➕'],['is','🟰'],['it','👆'],['can','💪'],['see','👀'],['we','👫'],['me','🙋'],['go','🟢'],['my','🫵'],
      ['to','➡️'],['like','👍'],['you','🫵'],['he','👦'],['up','⬆️'],['in','📥'],['on','🔛'],['no','🚫'],['at','📍'],['am','🙋'],['look','🔍'],['big','🐘']
    ].map(([w,p]) => ({ word:w, pic:p, sight:true })) },
    { id:'blend', name:'Blends', icon:'🐸', mode:'sound', color:'#81c784', words: [
      ['ship','🚢','sh-i-p'],['fish','🐟','f-i-sh'],['frog','🐸'],['duck','🦆','d-u-ck'],['crab','🦀'],['drum','🥁'],['flag','🚩'],['sled','🛷'],
      ['chick','🐤','ch-i-ck'],['shell','🐚','sh-e-ll'],['tree','🌳','t-r-ee'],['moon','🌙','m-oo-n'],['bath','🛁','b-a-th'],['clock','🕰️','c-l-o-ck'],
      ['swim','🏊'],['sock','🧦','s-o-ck'],['ring','💍','r-i-ng'],['king','🤴','k-i-ng'],['truck','🚚','t-r-u-ck'],['brick','🧱','b-r-i-ck'],
      ['bee','🐝','b-ee'],['sheep','🐑','sh-ee-p'],['teeth','🦷','t-ee-th'],['bell','🔔','b-e-ll'],['chop','🪓','ch-o-p'],['spoon','🥄','s-p-oo-n']
    ].map(([w,p,g]) => ({ word:w, pic:p, g: g || w.split('').join('-') })) },
    { id:'g1', name:'Grade 1', icon:'🚀', mode:'name', color:'#ffb74d', words: [
      ['cake','🎂'],['kite','🪁'],['bike','🚲'],['rain','🌧️'],['boat','⛵'],['train','🚆'],['snake','🐍'],['house','🏠'],['horse','🐴'],['apple','🍎'],
      ['tiger','🐯'],['mouse','🐭'],['robot','🤖'],['pizza','🍕'],['rocket','🚀'],['crown','👑'],['cloud','☁️'],['queen','👸'],['smile','😊'],['juice','🧃'],
      ['have','🤲',1],['they','👨‍👩‍👦',1],['said','💬',1],['come','👋',1],['play','🎮',1],['where','❓',1],['there','👉',1],['what','🤔',1]
    ].map(([w,p,s]) => ({ word:w, pic:p, sight:!!s })) },
    { id:'g2', name:'Grade 2', icon:'🏰', mode:'name', color:'#e57373', words: [
      ['castle','🏰'],['dragon','🐉'],['knight','🛡️'],['rainbow','🌈'],['pirate','🏴‍☠️'],['monster','👾'],['turtle','🐢'],['rabbit','🐰'],['pencil','✏️'],
      ['window','🪟'],['garden','🌻'],['planet','🪐'],['spider','🕷️'],['popcorn','🍿'],['cupcake','🧁'],['unicorn','🦄'],['penguin','🐧'],['candle','🕯️'],
      ['because','💡',1],['friend','🧑‍🤝‍🧑',1],['people','👪',1],['again','🔁',1],['always','♾️',1],['before','⏮️',1]
    ].map(([w,p,s]) => ({ word:w, pic:p, sight:!!s })) },
    { id:'g3', name:'Grade 3', icon:'🐘', mode:'name', color:'#7986cb', words: [
      ['treasure','💰'],['elephant','🐘'],['dolphin','🐬'],['volcano','🌋'],['butterfly','🦋'],['kangaroo','🦘'],['telescope','🔭'],['umbrella','☂️'],
      ['octopus','🐙'],['skeleton','💀'],['lightning','⚡'],['dinosaur','🦕'],['adventure','🗺️'],['astronaut','🧑‍🚀'],['hamburger','🍔'],['strawberry','🍓'],
      ['together','🤝',1],['different','🔀',1],['important','⭐',1],['thought','💭',1],['through','🚪',1],['enough','✋',1],['beautiful','🌸',1]
    ].map(([w,p,s]) => ({ word:w, pic:p, sight:!!s })) }
  ];

  // ---------- Storybook ----------
  // Each page: text + scene. Scene: bg (css class) + sprites [emoji, x%, y%, size(vmin), anim]
  const STORIES = [
    { id:'sam', title:'Sam the Cat', level:1, cover:'🐱', color:'#ffcc80', pages: [
      { t:'Sam is a cat.', bg:'room', s:[['🐱',50,60,26,'bob']] },
      { t:'Sam sat on a mat.', bg:'room', s:[['🟫',50,78,30,''],['🐱',50,58,22,'bob']] },
      { t:'Sam had a nap.', bg:'night', s:[['🐱',45,62,22,'sleep'],['💤',62,40,10,'float']] },
      { t:'A big rat ran in!', bg:'room', s:[['🐀',20,70,18,'zoom'],['🐱',70,60,20,'shake']] },
      { t:'Sam ran. The rat ran.', bg:'grass', s:[['🐀',30,70,16,'zoom'],['🐱',65,64,20,'zoom']] },
      { t:'Sam and the rat sat in the sun.', bg:'sunny', s:[['☀️',80,18,16,'spin'],['🐀',35,68,16,'bob'],['🐱',60,64,20,'bob']] }
    ]},
    { id:'bug', title:'The Red Bug', level:1, cover:'🐞', color:'#ef9a9a', pages: [
      { t:'A red bug sat on a log.', bg:'grass', s:[['🪵',50,74,30,''],['🐞',50,56,14,'bob']] },
      { t:'The bug can hop.', bg:'grass', s:[['🐞',50,60,16,'jump']] },
      { t:'Hop, bug, hop!', bg:'grass', s:[['🐞',30,62,14,'jump'],['🐞',55,58,14,'jump2'],['🐞',78,62,14,'jump']] },
      { t:'The bug hops up a big pot.', bg:'grass', s:[['🍲',50,70,30,''],['🐞',50,40,12,'jump']] },
      { t:'Up, up, up! The bug is on top.', bg:'sunny', s:[['🍲',50,72,26,''],['🐞',50,42,14,'wiggle'],['⭐',75,25,10,'spin']] },
      { t:'The bug had fun. The end.', bg:'sunny', s:[['🐞',50,56,20,'dance'],['🎉',25,30,12,'float'],['🎉',75,30,12,'float']] }
    ]},
    { id:'ship', title:'The Big Ship', level:2, cover:'🚢', color:'#81d4fa', pages: [
      { t:'Dad has a big ship.', bg:'sea', s:[['🚢',50,58,34,'rock'],['👨',38,40,10,'bob']] },
      { t:'The ship has a red flag.', bg:'sea', s:[['🚢',50,62,30,'rock'],['🚩',56,26,14,'wiggle']] },
      { t:'A crab sat on the deck.', bg:'sea', s:[['🚢',50,62,32,'rock'],['🦀',50,44,12,'wiggle']] },
      { t:'Splash! A fish swam up.', bg:'sea', s:[['🐟',40,58,16,'jump'],['💦',58,46,12,'float'],['🚢',78,64,20,'rock']] },
      { t:'The crab and the fish had fun.', bg:'sea', s:[['🦀',36,64,16,'dance'],['🐟',64,60,16,'swim']] },
      { t:'Then the ship went back to land.', bg:'sunset', s:[['🚢',60,62,26,'rock'],['🏝️',22,64,22,''],['🌅',80,22,14,'']] }
    ]},
    { id:'frog', title:'Frog and Duck', level:2, cover:'🐸', color:'#a5d6a7', pages: [
      { t:'Frog sat on a rock in the pond.', bg:'pond', s:[['🪨',50,72,26,''],['🐸',50,54,18,'bob']] },
      { t:'Frog can swim and jump.', bg:'pond', s:[['🐸',40,60,18,'jump'],['💧',60,70,10,'float']] },
      { t:'Then Frog met a duck.', bg:'pond', s:[['🐸',35,62,16,'bob'],['🦆',65,60,18,'swim']] },
      { t:'Duck said, "Let us play!"', bg:'pond', s:[['🦆',60,58,20,'wiggle'],['💬',74,30,12,'float'],['🐸',30,64,14,'bob']] },
      { t:'They swam and swam and swam.', bg:'pond', s:[['🐸',35,64,14,'swim'],['🦆',62,62,16,'swim']] },
      { t:'Then they had a snack on the grass.', bg:'grass', s:[['🐸',35,64,14,'bob'],['🦆',62,62,16,'bob'],['🍉',50,76,12,'']] }
    ]},
    { id:'build', title:'Wes Builds a Castle', level:3, cover:'🧱', color:'#ffe082', pages: [
      { t:'Wes has a big box of blocks.', bg:'room', s:[['👦',30,58,20,'bob'],['📦',62,68,22,''],['🧱',62,48,10,'jump']] },
      { t:'He builds a tall tower, block by block.', bg:'room', s:[['🧱',55,78,12,''],['🧱',55,66,12,''],['🧱',55,54,12,''],['🧱',55,42,12,'wiggle'],['👦',28,62,18,'bob']] },
      { t:'He adds a gate and a flag on top.', bg:'room', s:[['🏰',55,58,32,'bob'],['🚩',62,24,10,'wiggle'],['👦',22,64,16,'bob']] },
      { t:'Oh no! The tower falls down.', bg:'room', s:[['🧱',40,74,10,'fall'],['🧱',55,76,10,'fall'],['🧱',68,72,10,'fall'],['😮',25,52,16,'shake']] },
      { t:'Wes does not give up. He builds it again.', bg:'room', s:[['👦',30,60,18,'bob'],['💪',48,42,12,'jump'],['🧱',68,66,12,'jump']] },
      { t:'Now his castle is the best one yet!', bg:'sunny', s:[['🏰',55,56,38,'grow'],['🎉',22,26,12,'float'],['👦',18,66,14,'jump']] }
    ]},
    { id:'dot', title:'The Little Dragon', level:4, cover:'🐉', color:'#ce93d8', pages: [
      { t:'Dot was a little dragon who lived on a hill.', bg:'hill', s:[['🐉',50,58,22,'bob'],['⛰️',20,64,22,'']] },
      { t:'She wanted to fly, but her wings were small.', bg:'hill', s:[['🐉',45,62,18,'wiggle'],['☁️',75,22,14,'float']] },
      { t:'She flapped and flapped. Puff! Just smoke.', bg:'hill', s:[['🐉',45,60,20,'shake'],['💨',66,48,14,'float']] },
      { t:'Her friend Max the knight said, "Try again!"', bg:'hill', s:[['🛡️',30,62,16,'bob'],['🐉',66,60,18,'bob'],['💬',40,32,10,'float']] },
      { t:'Dot ran fast, jumped high, and flapped hard.', bg:'hill', s:[['🐉',50,56,20,'zoom']] },
      { t:'Whoosh! Dot could fly! She did a loop in the sky.', bg:'sky', s:[['🐉',50,44,22,'loop'],['☁️',20,70,14,'float'],['⭐',80,20,10,'spin']] }
    ]},
    { id:'moon', title:'The Moon Picnic', level:5, cover:'🌙', color:'#9fa8da', pages: [
      { t:'Luna the rabbit packed a basket for a picnic.', bg:'grass', s:[['🐰',40,58,22,'bob'],['🧺',64,68,16,'']] },
      { t:'She brought carrots, cheese, and a juicy apple.', bg:'grass', s:[['🥕',30,62,14,'jump'],['🧀',50,62,14,'jump2'],['🍎',70,62,14,'jump']] },
      { t:'Then she rode a rocket all the way to the moon.', bg:'space', s:[['🚀',40,60,22,'fly'],['🌕',78,24,20,'spin'],['🐰',36,46,8,'bob']] },
      { t:'The moon was dusty, quiet, and very bright.', bg:'space', s:[['🌕',50,70,40,''],['✨',30,30,10,'twinkle'],['✨',70,22,10,'twinkle']] },
      { t:'Luna shared her lunch with a friendly robot.', bg:'space', s:[['🐰',34,60,18,'bob'],['🤖',66,58,18,'wiggle'],['🥕',50,72,10,'']] },
      { t:'Together they watched the Earth glow like a blue marble.', bg:'space', s:[['🌍',50,32,22,'spin'],['🐰',36,68,14,'bob'],['🤖',64,68,14,'bob']] }
    ]},
    { id:'ember', title:'Ember and the Dark', level:6, cover:'🔥', color:'#ffab91', pages: [
      { t:'In a mountain cave lived a dragon named Ember.', bg:'cave', s:[['🐲',50,60,26,'bob']] },
      { t:'Ember could breathe fire, but he was afraid of the dark.', bg:'cave', s:[['🐲',40,60,22,'shake'],['🔥',66,56,14,'flicker']] },
      { t:'Every night, he lit a tiny flame to feel brave.', bg:'cavedark', s:[['🐲',42,62,20,'bob'],['🕯️',64,66,12,'flicker']] },
      { t:'One evening, a group of fireflies floated into his cave.', bg:'cavedark', s:[['🐲',35,62,20,'bob'],['✨',60,40,8,'twinkle'],['✨',72,52,8,'twinkle'],['✨',66,30,8,'twinkle']] },
      { t:'"We can be your night lights," they whispered.', bg:'cavedark', s:[['✨',40,34,10,'twinkle'],['✨',55,28,10,'twinkle'],['✨',70,38,10,'twinkle'],['🐲',50,66,20,'bob']] },
      { t:'Ember discovered that the dark was full of glowing friends.', bg:'cavedark', s:[['🐲',50,60,24,'dance'],['✨',25,30,8,'twinkle'],['✨',75,30,8,'twinkle'],['✨',50,20,8,'twinkle']] },
      { t:'From then on, he was never afraid again. The end.', bg:'sunset', s:[['🐲',50,58,26,'grow'],['❤️',72,30,10,'float']] }
    ]}
  ];

  // ---------- Word Race ----------
  const RACE_NOUNS = [
    ['pig','pigs','🐷'],['cat','cats','🐱'],['dog','dogs','🐶'],['frog','frogs','🐸'],['duck','ducks','🦆'],['bear','bears','🐻'],
    ['fish','fish','🐟'],['bug','bugs','🐞'],['cow','cows','🐮'],['dragon','dragons','🐉'],['robot','robots','🤖'],['king','kings','🤴']
  ].map(([s,p,e]) => ({ s, p, e }));
  // base, 3rd person, animation
  const RACE_VERBS = [
    ['jump','jumps','jump'],['run','runs','zoom'],['hop','hops','jump2'],['spin','spins','spin'],['swim','swims','swim'],['dance','dances','dance'],
    ['sleep','sleeps','sleep'],['sing','sings','sing'],['fly','flies','fly'],['dig','digs','shake'],['nap','naps','sleep'],['wiggle','wiggles','wiggle']
  ].map(([b,s,a]) => ({ b, s, a }));
  const RACE_ADJS = [ ['big','big'],['little','little'],['silly','silly'],['happy','happy'],['red','red'],['pink','pink'],['sleepy','sleepy'],['fast','fast'] ].map(([w,a]) => ({ w, a }));
  const RACE_PLACES = [ ['on the moon','space','🌙'],['in the mud','mud','🟤'],['on a bus','road','🚌'],['in the sea','sea','🌊'],['on a log','grass','🪵'],['in a box','room','📦'],['up a tree','grass','🌳'],['in the tub','room','🛁'] ].map(([w,bg,e]) => ({ w, bg, e }));
  const RACE_LEVELS = [
    { id:'r1', name:'2 Words', slots:['nounP','verbB'], example:'Pigs jump.' },
    { id:'r2', name:'3 Words', slots:['The','noun','verbS'], example:'The pig jumps.' },
    { id:'r3', name:'4 Words', slots:['The','noun','can','verbB'], example:'The pig can jump.' },
    { id:'r4', name:'5 Words', slots:['The','adj','noun','can','verbB'], example:'The big pig can jump.' },
    { id:'r5', name:'Long', slots:['The','adj','noun','verbS','place'], example:'The silly pig dances on the moon.' }
  ];

  // ---------- Action Words ----------
  const ACTIONS = [
    ['jump','jump'],['spin','spin'],['big','grow'],['small','shrink'],['hide','hide'],['run','zoom'],['sleep','sleep'],['shake','shake'],
    ['fly','fly'],['swim','swim'],['dance','dance'],['hop','jump2'],['roll','roll'],['fall','fall'],['flip','flip'],['wiggle','wiggle'],['sing','sing'],['wave','wave']
  ].map(([w,a]) => ({ w, a }));
  const ACTION_PHRASES = [
    // level 1: two-word phrases
    ['big jump',['grow','jump']],['spin spin',['spin','spin']],['hop and hide',['jump2','hide']],['run and jump',['zoom','jump']],['fly up',['fly']],['sleep now',['sleep']],
    // level 2: short sentences
    ['the dragon can fly',['fly']],['the dragon can swim',['swim']],['I can spin',['spin']],['jump and spin',['jump','spin']],['wiggle and wave',['wiggle','wave']],['go to sleep',['sleep']],
    ['dance and sing',['dance','sing']],['shake and roll',['shake','roll']],['get big then small',['grow','shrink']],['flip and fall',['flip','fall']]
  ].map(([w,a]) => ({ w, a }));

  // ---------- Gallery ----------
  // item: [name, emoji, price, x%, y%, size(vmin)]
  const ROOMS = [
    { id:'bedroom', name:'My Room', icon:'🛏️', bg:'bedroom', need:0, items:[
      ['bed','🛏️',2,22,72,24],['teddy bear','🧸',2,44,74,13],['books','📚',2,82,44,11],['ball','⚽',2,62,82,10],['robot','🤖',3,72,72,14],
      ['rocket','🚀',3,86,70,12],['plant','🪴',2,8,58,12],['clock','⏰',2,50,22,10],['blocks','🧱',3,34,86,10],['toy car','🚗',3,78,86,10],['guitar','🎸',4,10,82,13],['star light','🌟',4,30,20,10]
    ]},
    { id:'castle', name:'Castle', icon:'🏰', bg:'castle', need:5, items:[
      ['throne','🪑',3,50,66,16],['crown','👑',3,50,46,10],['king','🤴',4,38,66,14],['queen','👸',4,62,66,14],['shield','🛡️',3,14,40,12],['sword','⚔️',3,86,40,12],
      ['flag','🚩',2,30,16,10],['horse','🐴',4,16,76,16],['torch','🔥',2,30,44,9],['treasure','💰',3,84,80,12],['gem','💎',4,70,44,9],['knight','🏇',5,70,82,14]
    ]},
    { id:'dragon', name:'Dragon Cave', icon:'🐉', bg:'cave', need:5, items:[
      ['dragon','🐉',5,50,58,30],['baby dragon','🐲',4,78,70,14],['dragon egg','🥚',2,24,82,9],['gold coins','🪙',3,40,86,9],['crystal','💎',3,86,30,10],['fire','🔥',2,62,84,10],
      ['bat','🦇',2,20,22,10],['volcano','🌋',4,14,56,16],['bones','🦴',2,74,88,8],['dinosaur','🦖',4,30,64,16],['treasure chest','🧰',3,58,84,10],['wizard','🧙',5,88,62,14]
    ]},
    { id:'workshop', name:'Build Shop', icon:'🏗️', bg:'workshop', need:5, items:[
      ['crane','🏗️',5,80,42,28],['bricks','🧱',2,20,82,12],['hammer','🔨',2,36,48,9],['wrench','🔧',2,48,48,9],['truck','🚚',4,50,80,16],['tractor','🚜',4,76,82,15],
      ['gear','⚙️',2,14,28,11],['ladder','🪜',3,8,62,16],['house','🏠',4,30,66,16],['toolbox','🧰',3,62,58,11],['magnet','🧲',2,60,30,9],['robot arm','🦾',5,90,70,13]
    ]},
    { id:'jungle', name:'Jungle', icon:'🌴', bg:'jungle', need:5, items:[
      ['palm tree','🌴',2,10,58,24],['monkey','🐒',3,30,30,13],['lion','🦁',4,30,74,16],['tiger','🐯',4,56,76,15],['parrot','🦜',3,74,24,11],['snake','🐍',3,84,82,12],
      ['elephant','🐘',5,76,62,20],['banana','🍌',2,46,20,9],['giraffe','🦒',5,92,48,20],['frog','🐸',2,46,88,9],['butterfly','🦋',2,58,40,9],['flower','🌺',2,14,88,9]
    ]},
    { id:'ocean', name:'Ocean', icon:'🌊', bg:'ocean', need:5, items:[
      ['fish','🐠',2,24,40,11],['whale','🐳',5,64,30,24],['octopus','🐙',4,22,74,15],['crab','🦀',2,46,88,10],['shark','🦈',4,80,58,17],['turtle','🐢',3,50,56,13],
      ['shell','🐚',2,70,88,9],['dolphin','🐬',4,36,22,14],['boat','⛵',3,86,8,12],['seaweed','🌿',2,8,82,14],['puffer fish','🐡',3,60,72,11],['treasure','💰',4,88,86,11]
    ]},
    { id:'space', name:'Space', icon:'🚀', bg:'space', need:5, items:[
      ['rocket','🚀',4,20,60,20],['planet','🪐',4,74,24,20],['moon','🌙',3,14,16,13],['star','🌟',2,44,14,9],['alien','👽',3,52,62,13],['astronaut','🧑‍🚀',5,40,40,15],
      ['flying saucer','🛸',4,82,58,16],['comet','☄️',3,60,30,11],['sun','☀️',4,90,12,13],['earth','🌍',4,62,82,15],['satellite','🛰️',3,32,82,11],['telescope','🔭',3,86,86,12]
    ]}
  ];

  // ---------- Spoken lines (instructions, praise) ----------
  const PHRASES = {
    welcome:"Hi Wesley! Let's read and play!",
    home:"What do you want to play? Tap a picture!",
    m_rain:'Letter Rain!', m_story:'Story Time!', m_race:'Word Race!', m_action:'Action Words!', m_gallery:'Star Gallery!',
    rain_intro_letter:'Catch the falling letter that makes this sound.',
    rain_intro:'Catch the falling letters to spell the word!',
    rain_find:'Find this letter:',
    rain_spell:"Let's spell",
    rain_next:'What comes next? Look for this one:',
    you_spelled:'You spelled',
    story_pick:'Pick a story!',
    story_tap:'Tap any word to hear it. Tap the big speaker and I will read it to you.',
    the_end:'The end! Great reading!',
    next_page:'Next page', back_page:'Go back',
    race_intro:'Drive a word car onto the road to make a sentence!',
    race_pick:'Pick a word car. Tap it to hear it.',
    race_go:'Ready, set, go!',
    race_read:'Here is your sentence!',
    action_intro:'Tap a word and watch it move!',
    action_match:'What is the dragon doing? Find the word!',
    action_phrase:'Read the words, then tap go!',
    action_explore:'Play', action_match_btn:'Match', action_phrase_btn:'Read and do',
    that_says:'That word says',
    gallery_intro:'Spend your stars to fill your rooms!',
    need_stars:'You need more stars. Play a game to earn some!',
    new_room:'Wow! A new room is open!',
    room_locked:'Fill this room more to open the next one!',
    star:'You earned a star!',
    new_level:'Wow! You are ready for a new level!',
    round_done:'You did it! Super reading! Play more, or go home?',
    play_more:'Play more!', go_home:'Home',
    pick_level:'Pick a level!',
    parent:'Grown ups only!',
    p1:'Great job!', p2:'You did it!', p3:'Awesome reading!', p4:'Super!', p5:'Way to go!', p6:"You're a reading star!", p7:'High five!', p8:'Wow! Nice work!', p9:'Hooray!', p10:'Amazing!',
    t1:'Oops! Try again.', t2:'Almost! Try another one.', t3:'Nice try! Look again.', t4:"That's okay! Keep looking.",
    letter_name:'Its name is', letter_sound:'It says'
  };

  const DATA = { LETTERS, LETTER_NAME_TEXT, LETTER_KEY, DIGRAPHS, RAIN_LEVELS, STORIES, RACE_NOUNS, RACE_VERBS, RACE_ADJS, RACE_PLACES, RACE_LEVELS, ACTIONS, ACTION_PHRASES, ROOMS, PHRASES };
  // story token helper (shared)
  DATA.tokens = function (text) { return text.split(/\s+/).filter(Boolean).map(raw => ({ raw, w: raw.toLowerCase().replace(/[^a-z'-]/g, '').replace(/^'+|'+$/g, '') })); };
  DATA.slug = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
  if (typeof module !== 'undefined') module.exports = DATA; else root.DATA = DATA;
})(this);
