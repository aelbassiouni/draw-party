import { expect, test } from '@jest/globals';
import { applyCommand, createGame, type Action } from '../engine';
import { DEFAULT_SETTINGS } from '../setup';
import { developmentWords, wordBank } from '../words';

function normalize(text: string) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[أإآٱ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/[\p{M}\p{P}\p{White_Space}ـ]/gu, '');
}

test('every prompt has a stable ID, parallel concept, correct script, and unique normalized text', () => {
  const ids = new Set(wordBank.map((word) => word.id));
  expect(ids.size).toBe(wordBank.length);
  for (const word of developmentWords) expect(wordBank).toContainEqual(word);
  for (const language of ['en', 'ar'] as const) {
    const words = wordBank.filter((word) => word.language === language);
    expect(new Set(words.map((word) => normalize(word.text))).size).toBe(
      words.length,
    );
    for (const difficulty of ['easy', 'medium'] as const) {
      expect(
        words.filter((word) => word.difficulty === difficulty).length,
      ).toBeGreaterThanOrEqual(200);
    }
    for (const { id, conceptId, difficulty, text } of words) {
      expect(conceptId).toMatch(/^[a-z]+(?:-[a-z]+)*$/u);
      expect(id).toBe(`${language}-${conceptId}`);
      expect(text).toBe(text.trim());
      expect(text).toMatch(
        language === 'en'
          ? /^[\p{Script=Latin} ’-]+$/u
          : /^[\p{Script=Arabic}\p{M} -]+$/u,
      );
      expect(wordBank).toContainEqual(
        expect.objectContaining({
          id: `${language === 'en' ? 'ar' : 'en'}-${conceptId}`,
          difficulty,
        }),
      );
    }
  }
});

const pools = (['en', 'ar'] as const).flatMap((language) =>
  (['easy', 'medium', 'mixed'] as const).map((difficulty) => ({
    language,
    difficulty,
  })),
);

test.each(pools)(
  '$language $difficulty supports all 60 regular turns',
  ({ language, difficulty }) => {
    const players = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      name: `Player ${i + 1}`,
    }));
    let game = createGame(
      'maximum',
      {
        mode: 'freeForAll',
        players,
        playerOrder: players.map(({ id }) => id),
        teams: [],
        teamOrder: [],
        settings: {
          ...DEFAULT_SETTINGS,
          rounds: 5,
          wordLanguage: language,
          difficulty,
        },
      },
      wordBank,
      () => 0,
    );

    function send(action: Action) {
      if (!game.turn) throw new Error('Expected an active turn');
      game = applyCommand(
        game,
        { ...action, turnId: game.turn.id, revision: game.revision },
        wordBank,
        () => 0,
      );
    }

    for (let i = 0; i < 60; i++) {
      expect(game.turn?.slot.index).toBe(i);
      expect(game.turn?.word.language).toBe(language);
      if (difficulty !== 'mixed')
        expect(game.turn?.word.difficulty).toBe(difficulty);
      send({ kind: 'reveal' });
      send({ kind: 'start', at: 0 });
      send({ kind: 'expire', at: 60000 });
      send({ kind: 'continue' });
      send({ kind: 'advance' });
    }
    const regularWords = game.used.slice(0, 60);
    expect(new Set(regularWords.map(({ conceptId }) => conceptId)).size).toBe(
      60,
    );
    expect(game.tiebreaker).toMatchObject({ round: 1, start: 60 });
    if (difficulty === 'mixed') {
      expect(
        regularWords.filter((word) => word.difficulty === 'easy'),
      ).toHaveLength(30);
    }
  },
);
