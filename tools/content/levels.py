# Letter Rain scope & sequence. mode: letter | sound (grapheme tiles + phonics) | name (letter names)
W = lambda s: s.split()
GR_BASE = ['sh', 'ch', 'th', 'ck', 'ng', 'wh', 'll', 'ss', 'ff', 'zz']
V_CVC = ['spell', 'spell', 'missing', 'begin', 'end', 'middle']
V_FAM = ['rhyme', 'spell', 'rhyme', 'missing']
V_SIGHT = ['wordfind', 'spell', 'wordfind', 'spell']
V_PH = ['spell', 'missing', 'spell', 'begin', 'end']
V_NAME = ['spell', 'missing', 'spell', 'wordfind']
V_BIG = ['spell', 'missing2', 'wordfind', 'spell']
L = []
def lv(id, name, icon, mode, variants, words, teams=None, color=None):
    L.append(dict(id=id, name=name, icon=icon, mode=mode, variants=variants, words=words if isinstance(words, list) else W(words), teams=teams or [], color=color))

# ---- letters ----
lv('abc1', 'Letters 1', '🔤', 'letter', ['find', 'case'], W('m s a t p i'), color='#ff8a65')
lv('abc2', 'Letters 2', '🔤', 'letter', ['find', 'case'], W('n o c d g h'), color='#ff8a65')
lv('abc3', 'Letters 3', '🔤', 'letter', ['find', 'case'], W('e u b f l r'), color='#ff8a65')
lv('abc4', 'Letters 4', '🔤', 'letter', ['find', 'case'], W('k j v w y z x q'), color='#ff8a65')
lv('abcU', 'Big & Little', '🅰️', 'letter', ['case'], W('a b c d e f g h i j k l m n o p q r s t u v w x y z'), color='#ff7043')
lv('begin', 'First Sounds', '👂', 'sound', ['begin'], W('cat dog sun pig hat bus bed cup fox hen map bug box rat log web van nut pen jet six ten mop hug red kid lip zip yak wig'), color='#ff7043')
# ---- CVC by vowel ----
lv('cvc-a', 'Short a', '🐱', 'sound', V_CVC, 'cat bat hat mat rat sat pat fan man can pan ran tan van map cap nap tap lap gap bag rag wag tag jam ham ram yam dad pad sad mad bad had cab lab wax yak zap', color='#4fc3f7')
lv('cvc-i', 'Short i', '🐷', 'sound', V_CVC, 'big dig fig pig wig jig bin fin pin tin win dip hip lip rip sip tip zip hit kit pit sit bit fit lit him rim dim kid lid hid rib bib fix mix six', color='#4fc3f7')
lv('cvc-o', 'Short o', '🐶', 'sound', V_CVC, 'dog fog hog jog log cot dot got hot lot not pot box fox ox pop hop mop top cop job rob nod rod on mom', color='#4fc3f7')
lv('cvc-u', 'Short u', '☀️', 'sound', V_CVC, 'bug dug hug jug mug rug tug bun fun run sun bus cut hut nut but cub rub sub tub hum gum yum mud bud cup pup up us', color='#4fc3f7')
lv('cvc-e', 'Short e', '🥚', 'sound', V_CVC, 'bed fed led red wed beg leg peg hen den pen ten men yes jet met net pet set vet wet let get web yet egg', color='#4fc3f7')
lv('cvc-mix', 'All Short Vowels', '🌈', 'sound', V_CVC, 'cat pig dog bug hen map fox sun web bat lip mop cup ten rag kid pot tub jet van zip log mud pen ham fin hot rug leg', color='#29b6f6')
# ---- word families ----
lv('fam-a', 'Families: at an ap ag', '🏠', 'sound', V_FAM, 'cat bat hat mat rat sat fan man can pan ran van map cap nap tap lap bag rag wag tag', color='#26c6da')
lv('fam-i', 'Families: ig in it ip', '🏠', 'sound', V_FAM, 'big dig fig pig wig bin fin pin tin win hit kit pit sit bit dip hip lip rip sip tip zip', color='#26c6da')
lv('fam-o', 'Families: op ot og', '🏠', 'sound', V_FAM, 'hop mop top pop cop cot dot got hot lot not pot dog fog hog jog log', color='#26c6da')
lv('fam-ue', 'Families: ug un en et', '🏠', 'sound', V_FAM, 'bug dug hug jug mug rug tug bun fun run sun hen den pen ten men jet met net pet set vet wet', color='#26c6da')
# ---- sight words ----
lv('sight-1', 'Sight Words 1', '👀', 'name', V_SIGHT, 'the and see to go is it in can me my we you up look here said play', color='#ba68c8')
lv('sight-2', 'Sight Words 2', '👀', 'name', V_SIGHT, 'away big blue come down find for funny help jump little make not one red run three two where yellow', color='#ba68c8')
lv('sight-3', 'Sight Words 3', '👀', 'name', V_SIGHT, 'all am are at ate be black brown but came did do eat four get good have he into like must new', color='#ab47bc')
lv('sight-4', 'Sight Words 4', '👀', 'name', V_SIGHT, 'no now on our out please pretty ran ride saw say she so soon that there they this too under want was well went what white who will with yes', color='#ab47bc')
# ---- digraphs ----
lv('dig-sh', 'sh', '🚢', 'sound', V_PH, 'ship shop shed shell shut shin shot fish dish wish rush cash mash dash hush', GR_BASE, color='#81c784')
lv('dig-ch', 'ch & th', '🐤', 'sound', V_PH, 'chip chop chin chat chick check chug much such rich this that them then thin thick with bath math path moth', GR_BASE, color='#81c784')
lv('dig-ck', 'ck, wh & ng', '🦆', 'sound', V_PH, 'duck back pack sack rock sock lock dock kick lick sick pick neck deck luck when whip which ring sing king wing song long bang hang fang', GR_BASE, color='#81c784')
lv('dig-mix', 'Digraph Mix', '🐟', 'sound', V_PH, 'ship fish chick bath duck ring whip shell chop moth sock king dish thick wing rush much song lock path', GR_BASE, color='#66bb6a')
# ---- blends ----
lv('bl-l', 'Blends: bl cl fl pl sl', '🚩', 'sound', V_PH, 'block clock flag flap flat flip flop glad plan plum plug slam slap slip slot sled slug clap clam clip club', GR_BASE, color='#aed581')
lv('bl-r', 'Blends: br cr dr fr gr tr', '🐸', 'sound', V_PH, 'crab crib drum drip drop frog from grab grin grip trap trip trot brag brick crop dress grass truck', GR_BASE, color='#aed581')
lv('bl-s', 'Blends: sn sp st sw sk sm', '⭐', 'sound', V_PH, 'snap snip snack stop step stem spin spot skip swim swam swing skin skid smog snug stack spill smell', GR_BASE, color='#aed581')
lv('bl-end', 'End Blends: st nd mp nt', '⛺', 'sound', V_PH, 'best nest rest test vest fist list dust must jump bump lump camp lamp hand land sand band pond wind tent hunt mint milk desk mask gift raft soft left', GR_BASE, color='#9ccc65')
lv('dbl', 'Double Letters', '🔔', 'sound', V_PH, 'bell well tell fell hill fill pill will doll dull kiss miss boss moss less mess fuss puff cuff off buzz fizz jazz fuzz', GR_BASE, color='#9ccc65')
lv('sight-5', 'Sight Words 5', '👀', 'name', V_SIGHT, 'after again an any as ask by could every fly from give going had has her him his how just know', color='#9575cd')
lv('sight-6', 'Sight Words 6', '👀', 'name', V_SIGHT, 'let live may of old once open over put round some stop take thank them then think walk were when', color='#9575cd')
# ---- long vowels ----
lv('le-a', 'Magic e: a_e', '🎂', 'name', V_NAME, 'cake bake lake make rake take wake game name same cave gave wave save tape cape gate late plate skate snake grape shape flame plane', color='#ffb74d')
lv('le-i', 'Magic e: i_e', '🚲', 'name', V_NAME, 'bike like hike kite bite time dime lime pine line nine fine mine hide ride side wide five dive hive smile slide prize white shine', color='#ffb74d')
lv('le-ou', 'Magic e: o_e u_e', '🦴', 'name', V_NAME, 'bone cone home rope hope nose rose hose note vote stone stove smoke globe cube cute mule tube tune flute rule huge', color='#ffb74d')
lv('vt-ai', 'ai & ay', '🌧️', 'sound', V_PH, 'rain pain tail mail sail nail snail train paint wait chain play day say way hay may pay tray clay gray stay spray', GR_BASE + ['ai', 'ay'], color='#ffa726')
lv('vt-ee', 'ee & ea', '🐝', 'sound', V_PH, 'bee see tree feet seed week sleep sheep green queen teeth wheel eat sea tea meat seat beach peach team leaf bean dream clean', GR_BASE + ['ee', 'ea'], color='#ffa726')
lv('vt-oa', 'oa', '⛵', 'sound', V_PH, 'boat coat goat road soap toast loaf float coach toad oak foam moat', GR_BASE + ['oa'], color='#ffa726')
lv('vt-igh', 'igh', '🌙', 'sound', V_PH, 'high night light right sight might bright flight tight', GR_BASE + ['igh'], color='#ffa726')
lv('vt-y', 'y says i', '🪰', 'name', V_NAME, 'fly cry dry sky try shy spy my by why', color='#ff9800')
lv('vt-oo', 'oo', '🥄', 'sound', V_PH, 'moon soon spoon food pool tool boot zoo noon room broom roof hoop', GR_BASE + ['oo'], color='#ff9800')
# ---- r-controlled & diphthongs ----
lv('r-ar', 'ar', '🚗', 'sound', V_PH, 'car far jar star bar park dark bark yard card farm arm cart shark sharp smart scarf', GR_BASE + ['ar'], color='#e57373')
lv('r-or', 'or', '🌽', 'sound', V_PH, 'for fork corn horn born torn sort short storm north porch sport', GR_BASE + ['or'], color='#e57373')
lv('r-er', 'er ir ur', '🐦', 'sound', V_PH, 'her fern herd bird girl shirt first third dirt stir fur burn turn hurt surf curl church', GR_BASE + ['er', 'ir', 'ur'], color='#e57373')
lv('di-ou', 'ou & ow', '🐮', 'sound', V_PH, 'out shout cloud loud proud count round sound found ground cow how now wow town down brown crown clown owl howl growl', GR_BASE + ['ou', 'ow'], color='#ef5350')
lv('di-oi', 'oi & oy', '🪙', 'sound', V_PH, 'oil boil coin join point soil boy toy joy enjoy royal cowboy', GR_BASE + ['oi', 'oy', 'ow'], color='#ef5350')
lv('di-aw', 'aw & au', '🐾', 'sound', V_PH, 'saw paw jaw raw draw straw claw yawn lawn crawl hawk haul launch', GR_BASE + ['aw', 'au'], color='#ef5350')
# ---- endings ----
lv('end-s', 'Plurals', '🐶', 'name', V_NAME, 'cats dogs pigs hats bugs foxes boxes buses wishes dishes beds caps cups pens bells kisses benches dresses ducks frogs', color='#f06292')
lv('end-ing', 'ing Words', '🏊', 'name', V_NAME, 'jumping running hopping swimming singing reading playing eating sleeping fishing helping looking going riding baking digging', color='#f06292')
lv('end-ed', 'ed Words', '⚽', 'name', V_NAME, 'jumped played helped looked rested landed wanted kicked fished filled packed rocked hugged hopped smiled baked', color='#f06292')
lv('sight-7', 'Sight Words 7', '👀', 'name', V_SIGHT, 'always around because been before best both buy call cold does fast first five found gave goes green its made many', color='#7e57c2')
lv('sight-8', 'Sight Words 8', '👀', 'name', V_SIGHT, 'off or pull read right sing sit sleep tell their these those upon us use very wash which why wish work would write your', color='#7e57c2')
lv('comp', 'Compound Words', '🌈', 'name', V_NAME, 'sunset cupcake rainbow snowman popcorn bedroom bathtub sailboat starfish football baseball goldfish backpack sandbox teapot butterfly mailbox pancake sunflower firetruck toothbrush raincoat lunchbox ladybug snowflake seashell', color='#4db6ac')
lv('syl2-a', 'Two Beats 1', '🐰', 'name', V_NAME, 'rabbit kitten mitten muffin napkin basket picnic magnet button pencil wagon dragon robot tiger lemon melon seven zipper hammer ladder', color='#4db6ac')
lv('syl2-b', 'Two Beats 2', '🐒', 'name', V_NAME, 'monkey turkey donkey candle apple purple turtle giraffe penguin pumpkin rocket pocket jacket bucket helmet castle garden window spider', color='#26a69a')
# ---- themes ----
lv('th-castle', 'Castles', '🏰', 'name', V_BIG, 'castle knight king queen prince princess crown throne sword shield tower moat bridge flag gate horse banner feast treasure', color='#8d6e63')
lv('th-dragon', 'Dragons & Magic', '🐉', 'name', V_BIG, 'dragon wizard magic wand unicorn fairy giant fire flame cave gold egg roar tail claw wings scales smoke', color='#8d6e63')
lv('th-animal', 'Animals', '🦁', 'name', V_BIG, 'elephant giraffe zebra lion tiger monkey penguin dolphin octopus turtle rabbit squirrel hamster parrot owl eagle shark whale kangaroo koala panda bear', color='#8d6e63')
lv('th-space', 'Space', '🚀', 'name', V_BIG, 'planet rocket moon star comet astronaut alien galaxy orbit sun earth launch telescope meteor satellite', color='#5c6bc0')
lv('th-build', 'Building', '🏗️', 'name', V_BIG, 'hammer nail saw drill brick block crane truck digger bulldozer ladder tool wrench screw build tower bridge house roof toolbox', color='#5c6bc0')
lv('th-food', 'Food', '🍕', 'name', V_BIG, 'apple banana orange grapes pizza pasta cheese bread milk juice cookie muffin pancake carrot pepper sandwich salad soup taco noodles', color='#5c6bc0')
lv('sight-9', 'Sight Words 9', '👀', 'name', V_SIGHT, 'about better bring carry clean done draw drink eight fall far full grow hold keep kind laugh light long much myself never only own pick seven shall show small start today together try warm', color='#673ab7')
lv('sight-10', 'Big Sight Words', '👀', 'name', V_SIGHT, 'different important thought through enough beautiful people friend answer picture earth eyes mountain children family animal world almost above below story began music heard special learn paper letter question morning sometimes', color='#673ab7')
lv('syl3', 'Three Beats', '🐘', 'name', V_BIG, 'elephant dinosaur kangaroo octopus banana tomato potato computer umbrella hamburger strawberry butterfly adventure telescope astronaut volcano skeleton spaghetti avocado', color='#3f51b5')
lv('big', 'Giant Words', '🚁', 'name', V_BIG, 'caterpillar watermelon helicopter alligator motorcycle crocodile basketball pineapple invisible celebration broccoli calendar caravan', color='#303f9f')

TEAMS_ALL = GR_BASE + ['ai', 'ay', 'ee', 'ea', 'oa', 'igh', 'oo', 'ar', 'or', 'er', 'ir', 'ur', 'ou', 'ow', 'oi', 'oy', 'aw', 'au']
def split(word, teams):
    teams = sorted(teams, key=len, reverse=True); out = []; i = 0
    while i < len(word):
        for t in teams:
            if word.startswith(t, i): out.append(t); i += len(t); break
        else: out.append(word[i]); i += 1
    return out
