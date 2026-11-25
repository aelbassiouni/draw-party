# Draw Party

An offline, in-person drawing and guessing game launching on Android, with iPhone implementation deferred. Share one phone, draw on paper or a whiteboard, and guess aloud.

## Project status

The Android development app uses Expo, React Native, and TypeScript. The Notebook interface supports complete games in both modes, including tiebreakers, final results, final-turn correction, and replay.

- Team and free-for-all modes
- English and Egyptian Arabic, with independently selectable interface and word languages
- Local saved groups and unfinished-game recovery
- Adaptive phone and foldable-screen layouts
- Planned free, ad-free first release with no accounts or analytics

## Project files

- [First-release specification](DESIGN-INTERVIEW.md): approved rules, flows, accessibility, and device requirements.
- [Readable HTML specification](DESIGN-INTERVIEW.html): formatted reading and printing copy.
- [Implementation plan](IMPLEMENTATION-PLAN.html): framework recommendation, architecture, delivery milestones, and device acceptance; [Markdown source](IMPLEMENTATION-PLAN.md).
- [Implementation tasks](IMPLEMENTATION-TASKS.html): 49 tasks with dependencies and completion checks; [Markdown source](IMPLEMENTATION-TASKS.md).
- [Interactive visual study](prototypes/draw-party-prototype.html): throwaway prototype exploring three visual styles. Notebook is the selected direction. This is not a complete game implementation.
- [Notebook visual concept](prototypes/notebook-design.png)
- [Visual concept prompt](prototypes/notebook-design-prompt.txt)

## Development and checks

The Expo SDK 58 TypeScript app lives at the repository root. Run `npm ci`, then `npm run check`. Use `npm run android` and `npm start` for native development; the local Windows build route and emulator settings are in [T04](T04-NATIVE-CHECKPOINT.md).

T08 SQLite sample persistence passed on the Android 17 emulator: a failed transaction rolled back, and the committed snapshot survived force-stop/relaunch. See [T08 evidence](T08-SQLITE-CHECK.md). The app opens the Notebook home. The feasibility probes remain under `src/feasibility`.

The bundled bank has 218 Easy and 222 Medium prompts per language. Setup checks that the chosen pool covers the regular rounds. SQLite stores named groups, recent-word history, timer checkpoints, and game results. See [T30–T35 verification](T30-T35-CHECKS.md) for automated recovery checks and pending Egyptian Arabic review.

With the Android development build installed and Metro running on port 8081, run `npm run test:android -- free-for-all`, `npm run test:android -- teams`, `npm run test:android -- lifecycle`, or `npm run test:android -- recovery`. The runner defaults to `emulator-5554` and accepts `ADB` and `ANDROID_SERIAL` environment overrides. Use an empty development save slot.

T09 resizable-emulator checks preserved a running countdown through compact and wide portrait and wide landscape changes; Home paused it. See [T09 evidence](T09-RESIZING-CHECK.md). Physical Fold verification remains open.
