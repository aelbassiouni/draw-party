const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmdirSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { setTimeout: wait } = require('node:timers/promises');

const adb = process.env.ADB || 'adb';
const serial = process.env.ANDROID_SERIAL || 'emulator-5554';
const app = 'com.drawparty.dev';
const hierarchy = `/data/local/tmp/draw-party-smoke-${process.pid}.xml`;
const scenario = process.argv[2] || 'free-for-all';
let step = 'launch';
const screenLabels = [
  'Draw Party',
  'Before your first game',
  'Paused',
  'Saving game…',
  'The game could not be saved.',
  'Time’s up · No points',
  'Confirm the guess',
  'Game complete',
  'Seconds per turn',
  'Rounds',
];
let lastScreen = [];

function run(...args) {
  return execFileSync(adb, ['-s', serial, ...args.map(String)], {
    encoding: 'utf8',
    timeout: 20000,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const shell = (...args) => run('shell', ...args);

function savedSession() {
  step = 'read SQLite checkpoint';
  const directory = mkdtempSync(join(tmpdir(), 'draw-party-smoke-'));
  const file = join(directory, 'active.sqlite');
  try {
    const bytes = execFileSync(
      adb,
      [
        '-s',
        serial,
        'exec-out',
        'run-as',
        app,
        'cat',
        'files/SQLite/draw-party-feasibility.db',
      ],
      { timeout: 20000 },
    );
    writeFileSync(file, bytes);
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const row = db
        .prepare('SELECT captured_at, payload FROM active_session')
        .get();
      assert(row);
      return { capturedAt: row.captured_at, game: JSON.parse(row.payload) };
    } finally {
      db.close();
    }
  } finally {
    rmSync(file, { force: true });
    rmdirSync(directory);
  }
}

function savedPause() {
  const { capturedAt, game } = savedSession();
  assert.equal(game.turn.phase.kind, 'paused');
  return { capturedAt, remainingMs: game.turn.phase.remainingMs };
}

async function launch() {
  shell(
    'am',
    'start',
    '-a',
    'android.intent.action.VIEW',
    '-d',
    'exp+draw-party://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081',
    app,
  );
  await wait(4500);
}

async function reopen(label) {
  const saved = savedSession();
  shell('am', 'force-stop', app);
  await launch();
  tap('resume-game');
  locate(label);
  assert.deepEqual(savedSession().game, saved.game);
  console.log(`PASS force-stop and relaunch at ${label}`);
}

function find(value) {
  try {
    if (!shell('uiautomator', 'dump', hierarchy).includes('dumped')) return;
    const nodes = [...shell('cat', hierarchy).matchAll(/<node\b([^>]+)>/g)].map(
      ([, attrs]) =>
        Object.fromEntries(
          [...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, text]) => [
            name,
            text,
          ]),
        ),
    );
    lastScreen = screenLabels.filter((label) =>
      nodes.some((node) => node.text === label),
    );
    return nodes.find(
      (node) =>
        (node['resource-id'] === value ||
          node.text === value ||
          node['content-desc'] === value) &&
        node.enabled === 'true',
    );
  } catch {
    // Android can briefly reject a new automation connection after a transition.
    return undefined;
  } finally {
    shell('rm', '-f', hierarchy);
  }
}

function locate(value, scroll) {
  step = value;
  const attempts = scroll || value === 'open-setup' ? 15 : 5;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const node = find(value);
    if (node) return node;
    if (scroll) {
      const [, width, height] = shell('wm', 'size')
        .trim()
        .match(/(\d+)x(\d+)$/);
      shell(
        'input',
        'swipe',
        Math.floor(width / 2),
        Math.floor(height * 0.74),
        Math.floor(width / 2),
        Math.floor(height * 0.44),
        650,
      );
    }
  }
  throw new Error('Expected control or text is missing');
}

function tap(value, scroll = false) {
  const [left, top, right, bottom] = locate(value, scroll)
    .bounds.match(/\d+/g)
    .map(Number);
  shell('input', 'tap', (left + right) >> 1, (top + bottom) >> 1);
}

function finishTurn() {
  tap('show-scoreboard', true);
  tap('next-turn', true);
}

async function guessWhileDrawing() {
  // The countdown can prevent UI Automator from declaring the screen idle.
  // This tap uses the compact portrait emulator layout from the smoke fixture.
  const [, width, height] = shell('wm', 'size')
    .trim()
    .match(/(\d+)x(\d+)$/);
  await wait(400);
  shell('input', 'tap', Math.floor(width / 2), Math.floor(height * 0.285));
  locate('Confirm the guess');
}

async function checkDrawingResize() {
  const originalSize = shell('wm', 'size').match(
    /Override size: (\d+x\d+)/,
  )?.[1];
  const density = Number(
    shell('wm', 'density')
      .trim()
      .match(/(\d+)$/)[1],
  );
  const pixels = (dp) => Math.round((dp * density) / 160);
  const before = savedSession().game;
  let previous = savedPause();
  try {
    for (const [width, height] of [
      [690, 840],
      [920, 440],
      [410, 910],
    ]) {
      shell('wm', 'size', `${pixels(width)}x${pixels(height)}`);
      let checkpoint;
      for (let attempt = 0; attempt < 6; attempt++) {
        await wait(1300);
        checkpoint = savedSession();
        if (checkpoint.game.turn.phase.remainingMs < previous.remainingMs)
          break;
      }
      const { game, capturedAt } = checkpoint;
      assert.equal(game.turn.phase.kind, 'paused');
      const current = { capturedAt, remainingMs: game.turn.phase.remainingMs };
      assert.equal(game.turn.id, before.turn.id);
      assert.deepEqual(game.turn.slot, before.turn.slot);
      assert(
        JSON.stringify(game.turn.word) === JSON.stringify(before.turn.word),
        'Word changed on resize',
      );
      assert.deepEqual(game.results, before.results);
      assert(
        current.remainingMs < previous.remainingMs,
        'Timer stopped on visible resize',
      );
      previous = current;
      console.log(
        `PASS running turn persisted across ${width}×${height} dp resize`,
      );
    }
    shell('input', 'keyevent', 'KEYCODE_HOME');
    await wait(1200);
    const hidden = savedPause();
    await wait(1600);
    shell('am', 'start', '-n', `${app}/.MainActivity`);
    locate('Paused');
    assert.equal(savedPause().remainingMs, hidden.remainingMs);
    console.log('PASS Home paused the resized turn');
  } finally {
    shell('wm', 'size', originalSize ?? 'reset');
  }
}

async function main() {
  assert(
    ['free-for-all', 'teams', 'lifecycle', 'recovery', 'resize'].includes(
      scenario,
    ),
  );
  const teams = scenario === 'teams';
  const recovery = scenario === 'recovery';
  const resize = scenario === 'resize';
  shell('am', 'force-stop', app);
  run('reverse', 'tcp:8081', 'tcp:8081');
  await launch();
  tap('open-setup');
  if (teams) {
    tap('Teams');
    tap('Add player', true);
    const [, width, height] = shell('wm', 'size')
      .trim()
      .match(/(\d+)x(\d+)$/);
    shell(
      'input',
      'swipe',
      Math.floor(width / 2),
      Math.floor(height * 0.28),
      Math.floor(width / 2),
      Math.floor(height * 0.88),
      100,
    );
  }
  const names = teams ? ['Ada', 'Ben', 'Cleo', 'Dax'] : ['Ada', 'Ben', 'Cleo'];
  for (const [index, name] of names.entries()) {
    tap(`name-p${index + 1}`, true);
    shell('input', 'text', name);
    shell('input', 'keyevent', 4);
  }
  tap('rounds-1', true);
  tap(resize ? 'timer-120' : 'timer-30', true);
  tap('review-order', true);
  tap('start-game', true);
  for (let attempt = 0; attempt < 5; attempt++) {
    if (find('Before your first game')) {
      tap('guide-skip', true);
      break;
    }
    if (find('reveal-word')) break;
  }
  const drawers = teams ? ['Ada', 'Ben'] : names;
  for (const [index, drawer] of drawers.entries()) {
    if (!resize) locate(`Pass to ${drawer}`);
    if (recovery && index === 0) await reopen(`Pass to ${drawer}`);
    tap('reveal-word');
    if (recovery && index === 0) await reopen('start-drawing');
    tap('start-drawing');
    if (resize) {
      await wait(1500);
      await checkDrawingResize();
      return;
    }
    if (scenario === 'lifecycle') {
      shell('cmd', 'statusbar', 'expand-notifications');
      await wait(1000);
      shell('cmd', 'statusbar', 'collapse');
      locate('Paused');
      const shade = savedPause();
      console.log('PASS notification shade pause');
      await wait(500);
      tap('resume');
      await wait(800);
      shell('input', 'keyevent', 'KEYCODE_HOME');
      await wait(1000);
      shell('am', 'start', '-n', `${app}/.MainActivity`);
      locate('Paused');
      const home = savedPause();
      assert(
        home.capturedAt > shade.capturedAt &&
          home.remainingMs < shade.remainingMs,
      );
      console.log('PASS Home/app switch pause');
      await wait(500);
      tap('resume');
      await wait(800);
      shell('input', 'keyevent', 'KEYCODE_SLEEP');
      await wait(1000);
      shell('input', 'keyevent', 'KEYCODE_WAKEUP');
      shell('wm', 'dismiss-keyguard');
      locate('Paused');
      const lock = savedPause();
      assert(
        lock.capturedAt > home.capturedAt &&
          lock.remainingMs < home.remainingMs,
      );
      tap('resume');
      await wait(1850);
      shell('am', 'force-stop', app);
      const afterStop = savedPause();
      assert(
        afterStop.capturedAt > lock.capturedAt &&
          afterStop.remainingMs < lock.remainingMs,
      );
      console.log(
        'PASS screen sleep saves a pause and an active checkpoint survives process termination',
      );
      return;
    }
    if (index === 0) {
      if (recovery) {
        await wait(1850);
        const before = Number(shell('date', '+%s%3N').trim());
        shell('am', 'force-stop', app);
        const after = Number(shell('date', '+%s%3N').trim());
        const checkpoint = savedPause();
        assert(checkpoint.remainingMs < 30000);
        assert(Number.isFinite(before) && before > 0);
        assert(
          Number.isFinite(after) &&
            after >= Math.max(before, checkpoint.capturedAt),
        );
        console.log(
          `Abrupt stop checkpoint age: ${Math.max(0, before - checkpoint.capturedAt)}–${after - checkpoint.capturedAt} ms`,
        );
        await launch();
        tap('resume-game');
        locate('Paused');
        assert.deepEqual(savedPause(), checkpoint);
        tap('resume');
      }
      await guessWhileDrawing();
      if (recovery) await reopen('Confirm the guess');
      if (!teams) tap('guesser-p2');
      tap('confirm-guess');
      if (recovery) {
        await reopen('Correct guess');
        tap('show-scoreboard', true);
        await reopen('Scoreboard');
        tap('next-turn', true);
        continue;
      }
    } else {
      await wait(30500);
      if (!teams && index === 1) {
        tap('guesser-p1');
        tap('last-second', true);
        locate('Correct guess');
      }
    }
    finishTurn();
  }
  if (!teams) {
    for (const [index, drawer] of ['Ada', 'Ben'].entries()) {
      locate(`Pass to ${drawer}`);
      locate('Tiebreaker round 1');
      if (recovery && index === 0) await reopen('Tiebreaker round 1');
      tap('reveal-word');
      tap('start-drawing');
      if (index === 0) {
        await guessWhileDrawing();
        tap('guesser-p2');
        tap('confirm-guess');
      } else {
        await wait(30500);
      }
      finishTurn();
    }
  }
  locate('final-results');
  if (recovery) await reopen('final-results');
  locate(teams ? 'Winner · Team 1' : 'Winner · Ben');
  locate(
    teams
      ? 'Regular 1 · Tiebreaker 0 · Total 1'
      : 'Regular 2 · Tiebreaker 1 · Total 3',
  );
  tap('correct-final', true);
  if (!teams) tap('final-guesser-p1');
  tap('save-final-correction');
  locate('Tiebreaker round ' + (teams ? 1 : 2));
  console.log(
    `PASS ${scenario} complete game, winner, score breakdown, and final correction reopening a tie`,
  );
}

main().catch((error) => {
  console.error(
    `FAIL ${scenario} at ${step}. Screen labels: ${lastScreen.join(', ') || 'unavailable'}.`,
  );
  console.error(error.message);
  process.exitCode = 1;
});
