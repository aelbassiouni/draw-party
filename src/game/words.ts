import type { Difficulty, Language } from './setup';
import { easy } from './content/easy';
import { medium } from './content/medium';

type WordDifficulty = Exclude<Difficulty, 'mixed'>;
export type Word = Readonly<{
  id: string;
  conceptId: string;
  language: Language;
  difficulty: WordDifficulty;
  text: string;
}>;

// Preserve existing concept IDs for saved turns and recent-word history.
const samples = [
  ['apple', 'easy', 'Apple', 'تفاحة'],
  ['boat', 'easy', 'Boat', 'مركب'],
  ['cat', 'easy', 'Cat', 'قطة'],
  ['chair', 'easy', 'Chair', 'كرسي'],
  ['kite', 'easy', 'Kite', 'طيارة ورق'],
  ['moon', 'easy', 'Moon', 'قمر'],
  ['shoe', 'easy', 'Shoe', 'جزمة'],
  ['train', 'easy', 'Train', 'قطر'],
  ['climb', 'medium', 'Climbing a tree', 'بيتسلق شجرة'],
  ['bake', 'medium', 'Baking a cake', 'بيعمل كيكة'],
  ['fish', 'medium', 'Catching a fish', 'بيصطاد سمكة'],
  ['pack', 'medium', 'Packing a suitcase', 'بيجهز شنطة سفر'],
  ['water', 'medium', 'Watering plants', 'بيسقي الزرع'],
  ['jump', 'medium', 'Jumping rope', 'بينط الحبل'],
  ['paint', 'medium', 'Painting a wall', 'بيدهن حيطة'],
  ['read', 'medium', 'Reading a map', 'بيقرا خريطة'],
] as const;

const concepts = [
  ...samples,
  ...easy.map(([id, en, ar]) => [id, 'easy', en, ar] as const),
  ...medium.map(([id, en, ar]) => [id, 'medium', en, ar] as const),
] as const;

function bilingualWords(
  entries: readonly (readonly [string, WordDifficulty, string, string])[],
): readonly Word[] {
  return entries.flatMap(([conceptId, difficulty, en, ar]) =>
    (['en', 'ar'] as const).map((language) => ({
      id: `${language}-${conceptId}`,
      conceptId,
      difficulty,
      language,
      text: language === 'en' ? en : ar,
    })),
  );
}

export const wordBank = bilingualWords(concepts);
export const developmentWords = bilingualWords(samples);

export function unusedWords(
  bank: readonly Word[],
  language: Language,
  difficulty: Difficulty,
  used: readonly Word[],
): readonly Word[] {
  const seen = new Set(used.map(({ conceptId }) => conceptId));
  return bank.filter((word) => {
    if (
      word.language !== language ||
      (difficulty !== 'mixed' && difficulty !== word.difficulty) ||
      seen.has(word.conceptId)
    )
      return false;
    seen.add(word.conceptId);
    return true;
  });
}

export function selectWord(
  bank: readonly Word[],
  language: Language,
  difficulty: Difficulty,
  used: readonly Word[],
  random: () => number,
  recent: readonly string[] = [],
): { word: Word } | { exhausted: true } {
  const unused = unusedWords(bank, language, difficulty, used);
  const fresh = unused.filter(({ conceptId }) => !recent.includes(conceptId));
  if (!unused.length) return { exhausted: true };
  if (!fresh.length) {
    // History is ordered oldest first. Keep current-game exclusions in force.
    return {
      word: unused.reduce((oldest, word) =>
        recent.lastIndexOf(word.conceptId) <
        recent.lastIndexOf(oldest.conceptId)
          ? word
          : oldest,
      ),
    };
  }

  const easyCount = used.filter((word) => word.difficulty === 'easy').length;
  const mediumCount = used.length - easyCount;
  const preferred =
    difficulty === 'mixed' && easyCount !== mediumCount
      ? fresh.filter(
          (word) =>
            word.difficulty === (easyCount < mediumCount ? 'easy' : 'medium'),
        )
      : fresh;
  const pool = preferred.length ? preferred : fresh;
  return { word: pool[Math.floor(random() * pool.length)] };
}
