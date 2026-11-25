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
