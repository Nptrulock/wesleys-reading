# Recorded dialog: categories of lines; app picks randomly. key = cat_N
D = {}
D['praise'] = """Great job!|You did it!|Awesome!|Super reading!|Wow, you are so smart!|That's right!|Way to go, Wesley!|Fantastic!|You got it!|Nice work!|Amazing!|You're a reading star!|Excellent!|Hooray!|Yes! Perfect!|High five!|You're on fire!|Look at you go!|Brilliant!|Woo hoo!|Super duper!|You nailed it!|That was awesome!|You are getting so good at this!|Terrific!|Yes, yes, yes!|Ka-boom! Correct!|Boom! You got it!|Outstanding!|You're a super reader!|Wowee!|Fabulous!|You make it look easy!|I'm so proud of you!|Incredible!|Ding ding ding! Correct!|Yahoo!|That's the one!|Spot on!|Marvelous!|Way cool!|You rock!|Smart thinking!|Super star!|Right on!|Great reading, Wesley!|Bingo!|You're a word wizard!|Correct-a-mundo!|Sparky says great job!|Woo! That was fast!|You're a champion!|Good eye!|Good listening!|Look at those reading muscles!|What a reader!|Cool beans!|Splendid!|Perfect-o!|Yay, Wesley!""".split('|')
D['encourage'] = """Try again!|Almost! Try again.|Oops! Let's try another one.|So close!|Keep going, you can do it!|Hmm, not that one. Try again!|Good try!|Let's look again.|That's okay! Try one more time.|Nice try! Listen again.|You're learning! Try again.|Oops, that's a tricky one!|Keep trying, Wesley!|Take your time.|Mistakes help us learn!|Let's listen one more time.|Look carefully!|Hmm, try a different one.|Almost there!|I believe in you!|Ooh, that was close!|No worries, try again!|Let's give it another go!|You've got this!|Say the sound with me.|Look at the first letter.|Try the next one!|Wiggle your fingers and try again!|Good thinking! Try another.|Let's find it together.""".split('|')
D['hint'] = """Listen to the sound.|Say it slowly.|Look at the picture for a clue.|Tap the speaker to hear it again.|Sound it out, one letter at a time.|Look at the shape of the letter.|Which letter makes that sound?|Find the one that matches.|Look at the end of the word.|Words that rhyme sound the same at the end.|Look for the missing letter.|Listen to the beginning sound.|Listen to the ending sound.|Listen to the middle sound.|Big letter, little letter. Find the match!|Tap the word to hear it.""".split('|')
D['round'] = """Round complete!|You finished the round!|Another round done!|Round over! You were great!|That round was super!|Look at all those stars!|What a round!|Round done! Want to play again?""".split('|')
D['levelup'] = """Level up! You unlocked a new level!|Wow! A brand new level is open!|You beat the level! Time for something harder!|New level unlocked! Let's go!|You are ready for a bigger challenge!|Level complete! You are amazing!""".split('|')
D['progress'] = """Keep practicing to fill your stars!|You are getting closer to the next level!|More practice makes you stronger!|Come back tomorrow to practice more!|Every round helps you grow!|You are halfway there!|Just a little more to go!|Your reading muscles are growing!""".split('|')
D['sparky'] = """Hi! I'm Sparky the dragon!|Rawr! Let's read together!|I love reading with you, Wesley!|Sparky is cheering for you!|Did you know dragons love books?|Let's find some words!|My fire is warm, and you are smart!|Can you read this one for me?|I'm so happy you came to play!|Let's go on an adventure!|Whoosh! Let's play!|You're my best reading buddy!""".split('|')
D['welcome'] = """Hi Wesley! Let's read and play!|Welcome back, Wesley!|Hooray, Wesley is here!|Hello, reader! What should we play?|Wesley! Ready for some fun?|Yay! Let's play and read!""".split('|')
D['v_find'] = ['Find this letter!', 'Catch the letter that makes this sound!']
D['v_case'] = ['Big letter! Catch the little letter that matches!']
D['v_spell'] = ["Let's spell", 'Catch the letters to spell']
D['v_missing'] = ['One letter is missing! Catch the missing letter for', 'Oh no, a letter fell out! Fix the word']
D['v_begin'] = ['What sound does it start with? Catch the first sound for', 'Listen to the beginning sound of']
D['v_end'] = ['What sound is at the end? Catch the last sound of', 'Listen to the ending sound of']
D['v_middle'] = ['What sound is in the middle? Catch the middle sound of', 'Listen to the middle sound of']
D['v_rhyme'] = ['Catch a word that rhymes with', 'Rhyme time! Find a word that sounds like']
D['v_wordfind'] = ['Catch the word', 'Find the falling word']
D['rhyme_yes'] = ['They rhyme!', 'Rhyme time! Great job!', 'Those words rhyme!']
D['tries'] = ['Missing letter round!', 'Rhyme round!', 'Word hunt round!', 'Spelling round!', 'Sound detective round!', 'Big and little round!']
D['story'] = """Pick a story!|Let's read a story!|Story time!|Which book should we read?|Ooh, I love this one!|A new shelf of books is open!|You read so many books!|Read three stories to open the next shelf!""".split('|')
D['race'] = """Ready, set, go!|Vroom vroom! Let's make a sentence!|Build a silly sentence!|Pick a word car!|What a silly sentence!|Let's see what happens!|Ha ha! That's so funny!|Look at them go!""".split('|')
D['action'] = """Read it, then watch it move!|Let's do it!|Watch this!|Can you do that too?|Now you try it!|Ha ha, so silly!""".split('|')
D['gallery'] = """Spend your stars to fill your rooms!|Tap an item to hear its name!|Ooh, what does this one do?|Tap two friends to see them play!|Your room is looking awesome!|Buy something new!|Fill this room to open the next one!|Room level up! It looks amazing!|You can decorate your room!|Save up your stars for something big!""".split('|')
D['inter_hint'] = ['Tap it again to see what happens!', 'This one has a friend in the room!']
EXTRA_PHRASES = dict(
  shelf_locked='Read more stories to open this shelf!',
  level_locked='Keep practicing to open this level!',
  new_shelf='A new shelf of stories is open!',
  room_level='Room level up!',
  decor='Decorate!',
  decor_bought='So pretty!',
  next_goal='Next goal',
  download_all='Downloading all the sounds for offline play.',
  review='Here is one you learned before!',
  more_days='Great practice today! Come back tomorrow to finish this level!',
  rhyme_with='rhymes with',
  stars_level='You earned a level star!',
)
def all_lines():
    out = {}
    for cat, lines in D.items():
        for i, t in enumerate(lines): out[f'{cat}_{i}'] = t
    out.update(EXTRA_PHRASES)
    return out
