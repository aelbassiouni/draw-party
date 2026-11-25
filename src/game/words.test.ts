import { expect, test } from '@jest/globals';
import { developmentWords, selectWord, type Word } from './words';

function sequence() {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const used: Word[] = [];
  for (;;) {
    const result = selectWord(developmentWords, 'ar', 'mixed', used, random);
    if ('exhausted' in result) return used;
    used.push(result.word);
  }
}

test('mixed draws are repeatable, balanced, and exhaust unique concepts', () => {
  const used = sequence();
  expect(used).toEqual(sequence());
  expect(used).toHaveLength(16);
  expect(new Set(used.map(({ conceptId }) => conceptId)).size).toBe(16);
  expect(used.every(({ language }) => language === 'ar')).toBe(true);
  let difference = 0;
  for (const word of used) {
    difference += word.difficulty === 'easy' ? 1 : -1;
    expect(Math.abs(difference)).toBeLessThanOrEqual(1);
  }
  expect(selectWord(developmentWords, 'en', 'easy', used, () => 0)).toEqual({
    exhausted: true,
  });
});

test('shared difficulty history recycles the oldest eligible word without repeating a current-game concept', () => {
  const easy = developmentWords.filter(
    (word) => word.language === 'en' && word.difficulty === 'easy',
  );
  const medium = developmentWords.filter(
    (word) => word.language === 'en' && word.difficulty === 'medium',
  );
  const recent = [medium[0], ...easy, ...medium.slice(1)].map(
    (word) => word.conceptId,
  );
  const used = [easy[0]];
  expect(
    selectWord(developmentWords, 'en', 'easy', used, () => 0, recent),
  ).toEqual({ word: easy[1] });
  expect(
    selectWord(developmentWords, 'en', 'mixed', used, () => 0, recent),
  ).toEqual({ word: medium[0] });
  expect(
    selectWord(developmentWords, 'en', 'easy', easy, () => 0, recent),
  ).toEqual({ exhausted: true });
  expect(
    selectWord(developmentWords, 'ar', 'easy', [], () => 0, []),
  ).toMatchObject({ word: { language: 'ar', difficulty: 'easy' } });
});
