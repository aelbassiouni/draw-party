# Draw Party

An offline, in-person drawing and guessing game launching on Android, with iPhone implementation deferred. Share one phone, draw on paper or a whiteboard, and guess aloud.

## Project status

The Android development app uses Expo, React Native, and TypeScript. The Notebook interface supports setup, play, turn results, and between-turn scores in both modes. T21 covers the final winner screen and replay.

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

The development bank has 16 distinct concepts per language (eight per difficulty). Setup checks that the selected pool can cover the regular rounds before enabling Start game. Active sessions are stored in memory. Full word banks, saved groups, and session recovery are later tasks.

T09 resizable-emulator checks preserved a running countdown through compact and wide portrait and wide landscape changes; Home paused it. See [T09 evidence](T09-RESIZING-CHECK.md). Physical Fold verification remains open.
