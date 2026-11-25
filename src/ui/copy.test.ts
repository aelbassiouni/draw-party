import { expect, test } from '@jest/globals';
import { copy, teamName, translator } from './copy';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test.each(Object.entries(copy))(
  '%s has both translations with matching placeholders',
  (_key, [en, ar]) => {
    expect(en.trim()).toMatch(_key === 'ar' ? /\p{Script=Arabic}/u : /[a-z]/i);
    if (['settingValue', 'points', 'orderEntry'].includes(_key)) {
      expect(ar).toBe(en);
    } else {
      expect(ar.trim()).toMatch(/\p{Script=Arabic}/u);
    }
    expect(placeholders(ar)).toEqual(placeholders(en));
  },
);

test('mixed-script names stay intact when inserted into directional messages', () => {
  expect(translator('ar')('pass', { name: 'Mona (منى)' })).toContain(
    '\u2068Mona (منى)\u2069',
  );
  expect(translator('en')('winner', { name: 'منى · 2' })).toContain(
    '\u2068منى · 2\u2069',
  );
});

test('auto-generated names of saved teams follow the setup language', () => {
  expect(teamName(translator('ar'), 1, 'Team 1')).toBe('فريق 1');
  expect(teamName(translator('en'), 2, 'فريق 2')).toBe('Team 2');
  expect(teamName(translator('ar'), 1, 'Red')).toBe('Red');
});
