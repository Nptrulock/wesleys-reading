# word -> picture (emoji). Words without a picture show a 🔊 "listen" card instead.
EMOJI = dict(x.split(':', 1) for x in """
cat:🐱 bat:🦇 hat:🎩 mat:🟫 rat:🐀 fan:🌬️ man:👨 can:🥫 pan:🍳 van:🚐 map:🗺️ cap:🧢 nap:😴 bag:👜 jam:🍓 ham:🍖 ram:🐏 yam:🍠 dad:👨 sad:😢 cab:🚕 tag:🏷️ wax:🕯️ yak:🐂 ax:🪓 lab:🧪 zap:⚡
pig:🐷 wig:💇 fig:🫐 dig:⛏️ pin:📌 fin:🦈 bin:🗑️ tin:🥫 win:🏆 lip:👄 zip:🤐 kit:🧰 sit:🪑 six:6️⃣ mix:🥣 kid:🧒 lid:🫕 bib:👶 rib:🍖 hip:💃
dog:🐶 fog:🌫️ hog:🐗 log:🪵 jog:🏃 dot:⚫ pot:🍲 hot:🔥 box:📦 fox:🦊 ox:🐂 mop:🧹 top:🔝 hop:🐇 pop:🎈 cop:👮 rod:🎣 cot:🛏️ job:💼
bug:🐛 hug:🤗 jug:🏺 mug:☕ rug:🟥 tug:🚢 bun:🍞 sun:☀️ run:🏃 fun:🎉 bus:🚌 cut:✂️ hut:🛖 nut:🥜 cub:🐻 tub:🛁 gum:🍬 mud:🟤 cup:☕ pup:🐶 up:⬆️ sub:🥪 bud:🌱
bed:🛏️ red:🔴 leg:🦵 peg:📍 hen:🐔 den:🏠 pen:🖊️ ten:🔟 jet:🛩️ net:🥅 pet:🐾 vet:🩺 wet:💧 web:🕸️ egg:🥚 yes:✅ men:👬 bell:🔔
ship:🚢 shop:🏪 shed:🛖 shell:🐚 fish:🐟 dish:🍽️ wish:🌠 cash:💵 brush:🖌️ chip:🍟 chop:🪓 chin:🧔 chick:🐤 chest:🧰 lunch:🥪 bench:🪑 rich:💰 inch:📏
bath:🛁 moth:🦋 math:➕ path:🛤️ thumb:👍 duck:🦆 sock:🧦 rock:🪨 lock:🔒 clock:🕰️ neck:🦒 truck:🚚 kick:🦶 deck:🃏 back:🔙 pack:🎒 ring:💍 king:🤴 wing:🕊️ sing:🎤 song:🎵 fang:🦷 whip:🍦 whale:🐳 wheel:☸️
flag:🚩 frog:🐸 crab:🦀 drum:🥁 sled:🛷 plum:🫐 plug:🔌 clap:👏 clam:🦪 clip:📎 block:🧱 slug:🐌 flip:🤸 club:♣️ crib:👶 drip:💧 drop:💧 grin:😁 trap:🪤 trip:🧳 brick:🧱 snap:👌 snack:🍿 stop:🛑 step:🪜 spin:🌀 spot:🔴 swim:🏊 skin:🖐️ star:⭐ stack:📚
nest:🐣 vest:🦺 jump:🦘 lamp:💡 camp:🏕️ hand:✋ sand:🏖️ band:🎸 pond:🏞️ wind:🌬️ tent:⛺ mint:🌿 milk:🥛 desk:🖥️ mask:🎭 gift:🎁 raft:🛶 list:📝 dust:🌪️ bump:🤕
hill:⛰️ doll:🪆 kiss:😘 puff:💨 buzz:🐝 cake:🎂 lake:🏞️ rake:🧹 game:🎮 cave:🕳️ wave:🌊 tape:📼 cape:🦸 gate:🚪 plate:🍽️ skate:⛸️ snake:🐍 grape:🍇 flame:🔥 plane:✈️ bake:🧁
bike:🚲 kite:🪁 time:⏰ lime:🍋 pine:🌲 nine:9️⃣ five:5️⃣ dive:🤿 hive:🐝 smile:😊 slide:🎢 prize:🏆 ride:🎢 hide:🙈 bone:🦴 cone:🍦 home:🏠 rope:🪢 nose:👃 rose:🌹 note:🎵 stone:🪨 smoke:💨 globe:🌍 cube:🧊 tube:🧪 mule:🐴 flute:🎶 huge:🐘
rain:🌧️ tail:🐒 mail:📬 sail:⛵ nail:💅 snail:🐌 train:🚆 paint:🎨 chain:⛓️ play:🎮 day:🌞 hay:🌾 tray:🍱 clay:🏺 spray:💦
bee:🐝 tree:🌳 feet:🦶 seed:🌱 sleep:😴 sheep:🐑 green:🟢 queen:👸 teeth:🦷 cheese:🧀 eat:🍽️ sea:🌊 tea:🍵 meat:🥩 beach:🏖️ peach:🍑 team:👥 leaf:🍃 bean:🥫 dream:💭
boat:⛵ coat:🧥 goat:🐐 road:🛣️ soap:🧼 toast:🍞 loaf:🍞 toad:🐸 oak:🌳 float:🎈 night:🌙 light:💡 high:⬆️ fly:🪰 cry:😢 sky:🌌 spy:🕵️
moon:🌙 spoon:🥄 food:🍲 pool:🏊 tool:🔧 boot:👢 zoo:🦁 room:🛋️ broom:🧹 roof:🏠 hoop:⭕
car:🚗 jar:🍯 bar:🍫 park:🏞️ dark:🌑 bark:🐕 yard:🏡 card:🃏 farm:🚜 arm:💪 cart:🛒 shark:🦈 scarf:🧣 fork:🍴 corn:🌽 horn:📯 storm:⛈️ north:🧭 horse:🐴 sport:⚽
bird:🐦 girl:👧 shirt:👕 dirt:🟤 fur:🐻 turn:↩️ surf:🏄 curl:➰ nurse:🧑‍⚕️ church:⛪ fern:🌿
out:🚪 shout:📣 cloud:☁️ house:🏠 mouse:🐭 count:🔢 round:⚪ ground:🟫 cow:🐮 town:🏘️ crown:👑 clown:🤡 owl:🦉 flower:🌸 towel:🧺 brown:🟤
oil:🛢️ coin:🪙 point:👉 boy:👦 toy:🧸 joy:😄 cowboy:🤠 oyster:🦪 saw:🪚 paw:🐾 straw:🥤 claw:🦀 yawn:🥱 lawn:🌱 hawk:🦅 sauce:🥫 draw:✏️
cats:🐱 dogs:🐶 pigs:🐷 foxes:🦊 boxes:📦 buses:🚌 ducks:🦆 frogs:🐸 cups:☕ bells:🔔 dishes:🍽️
jumping:🦘 running:🏃 swimming:🏊 singing:🎤 reading:📖 eating:🍽️ sleeping:😴 fishing:🎣 riding:🚲 baking:🧁 kicked:⚽
sunset:🌅 cupcake:🧁 rainbow:🌈 snowman:⛄ popcorn:🍿 bathtub:🛁 sailboat:⛵ starfish:⭐ football:🏈 baseball:⚾ goldfish:🐠 backpack:🎒 sandbox:🏖️ teapot:🫖 butterfly:🦋 mailbox:📬 pancake:🥞 sunflower:🌻 firetruck:🚒 toothbrush:🪥 raincoat:🧥 ladybug:🐞 snowflake:❄️ doghouse:🏠 seashell:🐚 lunchbox:🍱
rabbit:🐰 kitten:🐱 mitten:🧤 muffin:🧁 napkin:🧻 basket:🧺 picnic:🧺 magnet:🧲 button:🔘 pencil:✏️ wagon:🛒 dragon:🐉 robot:🤖 tiger:🐯 lemon:🍋 melon:🍈 seven:7️⃣ zipper:🤐 hammer:🔨 ladder:🪜
monkey:🐒 turkey:🦃 donkey:🐴 candle:🕯️ apple:🍎 purple:🟣 turtle:🐢 giraffe:🦒 penguin:🐧 pumpkin:🎃 rocket:🚀 pocket:👖 jacket:🧥 bucket:🪣 helmet:⛑️ castle:🏰 garden:🌻 window:🪟 spider:🕷️
knight:🛡️ queen:👸 prince:🤴 princess:👸 throne:🪑 sword:⚔️ shield:🛡️ tower:🗼 bridge:🌉 banner:🚩 feast:🍗 treasure:💰 wizard:🧙 magic:✨ wand:🪄 unicorn:🦄 fairy:🧚 giant:👣 fire:🔥 wings:🕊️ gold:🥇 roar:🦁
elephant:🐘 zebra:🦓 lion:🦁 dolphin:🐬 octopus:🐙 squirrel:🐿️ hamster:🐹 parrot:🦜 eagle:🦅 whale:🐳 kangaroo:🦘 koala:🐨 panda:🐼 bear:🐻
planet:🪐 comet:☄️ astronaut:🧑‍🚀 alien:👽 galaxy:🌌 earth:🌍 telescope:🔭 meteor:☄️ satellite:🛰️
drill:🪛 crane:🏗️ digger:🚜 bulldozer:🚜 wrench:🔧 screw:🔩 toolbox:🧰 hammer:🔨
banana:🍌 orange:🍊 grapes:🍇 pizza:🍕 pasta:🍝 bread:🍞 juice:🧃 cookie:🍪 carrot:🥕 pepper:🫑 sandwich:🥪 salad:🥗 soup:🍲 taco:🌮 noodles:🍜 tomato:🍅 potato:🥔 strawberry:🍓 watermelon:🍉 hamburger:🍔 spaghetti:🍝 broccoli:🥦
dinosaur:🦕 umbrella:☂️ computer:💻 volcano:🌋 skeleton:💀 adventure:🗺️ caterpillar:🐛 helicopter:🚁 alligator:🐊 motorcycle:🏍️ crocodile:🐊 basketball:🏀 avocado:🥑 pineapple:🍍 kangaroos:🦘
snow:❄️ eye:👁️ eyes:👀 music:🎵 mountain:⛰️ family:👪 children:🧒 animal:🐾 picture:🖼️ paper:📄 letter:✉️ morning:🌅 world:🌍 heart:❤️
""".split())
