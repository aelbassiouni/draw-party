import type { Difficulty, Language } from './setup';

type WordDifficulty = Exclude<Difficulty, 'mixed'>;
export type Word = Readonly<{
  id: string;
  conceptId: string;
  language: Language;
  difficulty: WordDifficulty;
  text: string;
}>;

// Incomplete bilingual prompts for development and deterministic game tests.
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

export const developmentWords: readonly Word[] = samples.flatMap(
  ([conceptId, difficulty, en, ar]) =>
    (['en', 'ar'] as const).map((language) => ({
      id: `${language}-${conceptId}`,
      conceptId,
      difficulty,
      language,
      text: language === 'en' ? en : ar,
    })),
);

export function selectWord(
  bank: readonly Word[],
  language: Language,
  difficulty: Difficulty,
  used: readonly Word[],
  random: () => number,
): { word: Word } | { exhausted: true } {
  const usedConcepts = new Set(used.map(({ conceptId }) => conceptId));
  const eligible = bank.filter(
    (word) =>
      word.language === language &&
      (difficulty === 'mixed' || difficulty === word.difficulty) &&
      !usedConcepts.has(word.conceptId),
  );
  if (!eligible.length) return { exhausted: true };

  const easyCount = used.filter((word) => word.difficulty === 'easy').length;
  const mediumCount = used.length - easyCount;
  const preferred =
    difficulty === 'mixed' && easyCount !== mediumCount
      ? eligible.filter(
          (word) =>
            word.difficulty === (easyCount < mediumCount ? 'easy' : 'medium'),
        )
      : eligible;
  const pool = preferred.length ? preferred : eligible;
  return { word: pool[Math.floor(random() * pool.length)] };
}
