import type { Language } from '../game/setup';

export const copy = {
  title: ['Draw Party', 'حفلة الرسم'],
  home: ['Home', 'الرئيسية'],
  setup: ['Set up a game', 'جهّز لعبة'],
  groups: ['Saved groups', 'المجموعات المحفوظة'],
  resumeGame: ['Resume game', 'كمّل اللعبة'],
  resumeResults: ['View results', 'شوف النتيجة'],
  unreadable: [
    'The saved game could not be read. You can retry or replace it with a new game.',
    'ما قدرناش نقرأ اللعبة المحفوظة. تقدر تحاول تاني أو تستبدلها بلعبة جديدة.',
  ],
  loadFailed: [
    'Could not open local storage.',
    'ما قدرناش نفتح التخزين المحلي.',
  ],
  replace: ['Replace saved game', 'استبدل اللعبة المحفوظة'],
  replacePrompt: [
    'Start a new game and replace the saved game?',
    'تبدأ لعبة جديدة وتستبدل اللعبة المحفوظة؟',
  ],
  restart: ['Restart game', 'ابدأ اللعبة من الأول'],
  restartPrompt: [
    'Return to round one with the same setup and reset all scores?',
    'ترجع للجولة الأولى بنفس الإعدادات وتصفّر النقط؟',
  ],
  endGame: ['End game', 'خلّص اللعبة'],
  endGamePrompt: [
    'End this game and clear its progress?',
    'تخلّص اللعبة دي وتمسح اللي لعبتوه؟',
  ],
  saveHome: ['Save and go home', 'احفظ وارجع للرئيسية'],
  undoResult: ['Undo last turn', 'عدّل نتيجة الدور الأخير'],
  editResult: ['Edit result', 'عدّل النتيجة'],
  groupName: ['Group name', 'اسم المجموعة'],
  addGroup: ['New group', 'مجموعة جديدة'],
  saveGroup: ['Save group', 'احفظ المجموعة'],
  editGroup: ['Edit group', 'عدّل المجموعة'],
  loadGroup: ['Use group', 'استخدم المجموعة'],
  deleteGroup: ['Delete group', 'احذف المجموعة'],
  deleteGroupPrompt: ['Delete {name}?', 'تحذف {name}؟'],
  noGroups: ['No saved groups yet.', 'لسه ما فيش مجموعات محفوظة.'],
  groupFailed: [
    'Could not update saved groups.',
    'ما قدرناش نحدّث المجموعات المحفوظة.',
  ],
  mode: ['Game mode', 'نوع اللعب'],
  rules: ['How to play', 'إزاي تلعب'],
  firstGameGuide: ['Before your first game', 'قبل أول لعبة'],
  skipGuide: ['Skip overview', 'عدّي الشرح'],
  ruleDraw: [
    'Draw on paper. Pass the phone to the drawer, who checks the word privately and starts the timer.',
    'ارسم على الورق. ادّي الموبايل للي عليه الدور عشان يشوف الكلمة لوحده ويبدأ العدّاد.',
  ],
  ruleTeams: [
    'Only the drawer’s teammates guess. A correct guess earns their team one point. Teams take turns in order and rotate drawers within each team.',
    'زمايل اللي بيرسم بس هم اللي بيخمّنوا. لو خمّنوا صح، فريقهم ياخد نقطة. الفرق بتلعب بالترتيب، واللاعبين جوّه كل فريق بيتبادلوا أدوار الرسم.',
  ],
  ruleFreeForAll: [
    'Everyone except the drawer guesses. The drawer and each player tied for the first correct guess get one point each. Players take turns drawing in the chosen order.',
    'كل اللاعبين بيخمّنوا ما عدا اللي بيرسم. اللي بيرسم وأول واحد خمّن صح ياخدوا نقطة لكل واحد. لو أكتر من واحد قال الإجابة الصح في نفس اللحظة، كل واحد فيهم ياخد نقطة. كل لاعب بيرسم حسب الدور بالترتيب اللي اخترتوه.',
  ],
  ruleRestrictions: [
    'Draw without speaking, gesturing, or writing letters or numbers. Use one word per turn. During the timer, shield the screen and hold Show word to check the same word privately.',
    'ارسم من غير كلام أو إشارات ومن غير ما تكتب حروف أو أرقام. لكل دور كلمة واحدة. والعدّاد شغّال، خبّي الشاشة واضغط مطوّل على زر إظهار الكلمة عشان تشوف نفس الكلمة لوحدك.',
  ],
  ruleJudging: [
    'Agree before playing on which answers count. Synonyms and equivalent dialect terms are a good default. The group decides whether a guess is correct or a rule was broken.',
    'اتفقوا قبل اللعب على الإجابات اللي تتحسب. ممكن تقبلوا المرادفات والكلمات اللي ليها نفس المعنى بلهجات تانية. المجموعة هي اللي بتقرّر إذا كان التخمين صح أو حد خالف القواعد.',
  ],
  ruleResults: [
    'Tap Guessed! to stop the clock and confirm the guess together. If the timer runs out, no points are awarded unless the group confirms a last-second guess. For a violation, pause and choose End turn without points. The usual turn order continues.',
    'دوس على «خمّنوا صح!» عشان توقّف العدّاد وتأكّدوا التخمين مع بعض. لو الوقت خلص، مفيش نقط إلا لو المجموعة أكّدت تخمين آخر ثانية. لو حد خالف القواعد، وقّف العدّاد واختار «خلّص الدور من غير نقط». الأدوار بتكمّل بنفس الترتيب.',
  ],
  ruleTie: [
    'Only tied leaders draw and guess in extra rounds. Team scoring stays the same. In free-for-all, only the first correct guessers score. If there are too few words left for another full round, the leaders share the win.',
    'في الجولات الزيادة، اللي متعادلين في المركز الأول بس هم اللي بيرسموا ويخمّنوا. النقط في لعب الفرق زي ما هي. في اللعب الفردي، اللي خمّنوا صح الأول بس هم اللي بياخدوا نقط. لو الكلمات ما تكفيش جولة كاملة كمان، المتعادلين بيكسبوا مع بعض.',
  ],
  language: ['Interface language', 'لغة الواجهة'],
  preferenceFailed: [
    'Could not save your preference. Try again.',
    'ما قدرناش نحفظ اختيارك. جرّب تاني.',
  ],
  wordLanguage: ['Word language', 'لغة الكلمات'],
  en: ['English', 'الإنجليزية'],
  ar: ['العربية', 'العربية'],
  players: ['Players', 'اللاعبين'],
  teams: ['Teams', 'الفرق'],
  freeForAll: ['Free-for-all', 'لعب فردي'],
  team: ['Team {number}', 'فريق {number}'],
  player: ['Player {number}', 'لاعب {number}'],
  add: ['Add player', 'أضف لاعب'],
  remove: ['Remove player {number}', 'احذف اللاعب {number}'],
  assignment: ['Team for {name}', 'فريق {name}'],
  shuffle: ['Randomize balanced teams', 'وزّع اللاعبين عشوائي على فرق متوازنة'],
  order: ['Turn order', 'ترتيب الأدوار'],
  drawerOrder: ['Drawer order for {name}', 'ترتيب الرسامين في {name}'],
  earlier: ['Move {name} earlier', 'قدّم {name} في الترتيب'],
  first: ['{name} starts', '{name} يبدأ'],
  orderEntry: ['{number}. {name}', '{number}. {name}'],
  rounds: ['Rounds', 'الجولات'],
  timer: ['Seconds per turn', 'ثواني لكل دور'],
  difficulty: ['Difficulty', 'الصعوبة'],
  easy: ['Easy', 'سهل'],
  medium: ['Medium', 'متوسط'],
  mixed: ['Mixed', 'متنوع'],
  sound: ['Timeout sound', 'صوت انتهاء الوقت'],
  vibration: ['Timeout vibration', 'اهتزاز انتهاء الوقت'],
  on: ['On', 'تشغيل'],
  off: ['Off', 'إيقاف'],
  settingValue: ['{name} · {value}', '{name} · {value}'],
  review: ['Review order', 'راجع الترتيب'],
  play: ['Start game', 'ابدأ اللعبة'],
  back: ['Back', 'رجوع'],
  capacity: [
    'This game needs {needed} distinct words. The selected pool has {available}.',
    'اللعبة محتاجة {needed} كلمة مختلفة. الاختيار ده فيه {available} كلمة.',
  ],
  rosterError: [
    'Enter a name for every player (1–40 characters). Free-for-all needs 3–12 players. Each team needs 2–6 players.',
    'اكتب اسم لكل لاعب من حرف لـ٤٠ حرف. اللعب الفردي محتاج من ٣ لـ١٢ لاعب، وكل فريق محتاج من ٢ لـ٦ لاعبين.',
  ],
  settingsError: [
    'Check the roster, order and settings.',
    'راجع الأسماء والترتيب والإعدادات.',
  ],
  pass: ['Pass to {name}', 'ادّي الموبايل لـ {name}'],
  round: ['Round {number}', 'جولة {number}'],
  extra: ['Tiebreaker round {number}', 'جولة كسر التعادل {number}'],
  reveal: ['Reveal word privately', 'اكشف الكلمة لنفسك'],
  shield: [
    'Shield the screen from other players.',
    'خبّي الشاشة عن باقي اللاعبين.',
  ],
  readerWord: [
    'Enable screen reader access to the word',
    'اسمح لقارئ الشاشة بقراءة الكلمة',
  ],
  readerPrompt: [
    'Use headphones or a Braille display. Your screen reader may speak the word aloud if its audio is public.',
    'استخدم سماعات أو شاشة برايل. لو الصوت طالع من سماعة الموبايل، ممكن أي حد يسمع قارئ الشاشة وهو بيقول الكلمة.',
  ],
  start: ['Start drawing', 'ابدأ الرسم'],
  hold: ['Hold to show word', 'خلّي صباعك ضاغط عشان تشوف الكلمة'],
  holdHint: [
    'With TalkBack, double-tap and hold. Release or move away to hide the word.',
    'مع TalkBack، دوس مرتين وخلّي صباعك ضاغط في المرة التانية. ارفع صباعك أو حرّكه برّه الزرار عشان تخبّي الكلمة.',
  ],
  seconds: [
    'Seconds remaining ({number})',
    'الوقت اللي فاضل بالثواني ({number})',
  ],
  guessed: ['Guessed!', 'خمّنوا صح!'],
  pause: ['Pause', 'وقّف العدّاد'],
  paused: ['Paused', 'وقّفنا العدّاد'],
  resume: ['Resume drawing', 'كمّل الرسم'],
  noPoints: ['End turn without points', 'خلّص الدور من غير نقط'],
  noPointsPrompt: [
    'End this turn without awarding points?',
    'تخلّص الدور من غير ما تحسب نقط؟',
  ],
  exitPrompt: [
    'Save your place and return home?',
    'تحفظ مكانك وترجع للرئيسية؟',
  ],
  cancel: ['Cancel', 'إلغاء'],
  pending: ['Confirm the guess', 'أكّد التخمين'],
  pick: [
    'Select everyone who guessed correctly at the same time first.',
    'اختار كل اللي خمّنوا صح أول مرة في نفس اللحظة.',
  ],
  teamGuess: ['Did {name} guess correctly?', '{name} خمّن صح؟'],
  confirm: ['Confirm correct guess', 'أكّد الإجابة الصحيحة'],
  corrected: ['Count last-second guess', 'احسب تخمين آخر ثانية'],
  timeout: ['Time’s up · No points', 'الوقت خلص · من غير نقط'],
  violation: ['Turn ended · No points', 'الدور خلص · من غير نقط'],
  correct: ['Correct guess', 'تخمين صحيح'],
  awarded: ['{name} gets one point', 'نقطة لـ {name}'],
  continue: ['Show scoreboard', 'اعرض النتيجة'],
  scoreboard: ['Scoreboard', 'النتيجة'],
  points: ['{name} · {number}', '{name} · {number}'],
  next: ['Next turn', 'الدور اللي بعده'],
  complete: ['Game complete', 'اللعبة خلصت'],
  exhausted: ['The game ran out of words.', 'الكلمات خلصت.'],
  winner: ['Winner · {name}', 'الفائز · {name}'],
  sharedWinners: ['Shared winners', 'كسبوا بالتعادل'],
  breakdown: [
    'Regular {regular} · Tiebreaker {tiebreaker} · Total {total}',
    'أساسي {regular} · كسر التعادل {tiebreaker} · الإجمالي {total}',
  ],
  playAgain: ['Play again', 'العب تاني'],
  newGame: ['New game', 'لعبة جديدة'],
  correctFinal: ['Correct final turn', 'صحّح الدور الأخير'],
  saveNoPoints: ['Save with no points', 'احفظ من غير نقط'],
  saving: ['Saving game…', 'بنحفظ اللعبة…'],
  saveFailed: ['The game could not be saved.', 'ما قدرناش نحفظ اللعبة.'],
  retrySave: ['Retry save', 'جرّب الحفظ تاني'],
  retry: ['Try again', 'جرّب تاني'],
} as const satisfies Record<string, readonly [string, string]>;

export type Key = keyof typeof copy;
export type Translate = (
  key: Key,
  values?: Record<string, string | number>,
) => string;

const arabicScript = /\p{Script=Arabic}/u;
const latinScript = /\p{Script=Latin}/u;

export function directionalName(value: string, language: Language): string {
  const oppositeScript = language === 'ar' ? latinScript : arabicScript;
  return oppositeScript.test(value) ? `\u2068${value}\u2069` : value;
}

export function teamName(t: Translate, number: number, saved?: string): string {
  const values = { number };
  const generated = (['en', 'ar'] as const).some(
    (language) => translator(language)('team', values) === saved,
  );
  return !saved || generated ? t('team', values) : saved;
}

export function translator(language: Language): Translate {
  return (key, values) =>
    copy[key][language === 'ar' ? 1 : 0].replace(
      /\{(\w+)\}/g,
      (match, name: string) =>
        directionalName(String(values?.[name] ?? match), language),
    );
}
