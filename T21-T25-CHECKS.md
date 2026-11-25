# M1 gameplay and SQLite verification

November 25, 2026. Development target is the Android 17 emulator. Physical Galaxy S23 Ultra runs remain deferred to final acceptance.

## Complete game

- The Notebook final screen shows winners and a score breakdown for regular play, tiebreaker play, and the total. The final-turn correction can reopen play in a tiebreaker. Replay starts with the same roster, rotation, and settings and zero points. New game opens editable setup.
- The native runner exercises deterministic outcomes through Android UI Automator via ADB. It uses stable control IDs and omits private words from diagnostic output. It taps the Guessed button at the compact portrait fixture's coordinates because the live countdown can keep UI Automator waiting for an idle screen.
- Teams passed on the emulator. The game progressed through both drawers, a confirmed guess and a timeout to the expected winner and score breakdown. Editing the final turn tied the teams and reopened play.
- Free-for-all passed on the emulator. A last-second correction counted toward regular play, the tied leaders completed their tiebreaker, and the final scoreboard showed the expected winner. Editing the final turn reopened a second tiebreaker.
- The development bank supplies 16 distinct concepts per language. The app rejects regular schedules that need more than the selected pool provides. Earlier checkpoints used an in-memory controller. The current app uses SQLite and leaves the saved state on disk after an Android process restart. The home-screen entry point and overwrite confirmation are T26.

## Storage and timers

- Integration tests run the production migration and statements against SQLite. They cover migration from the T08 probe schema, settings and groups, same-word restoration, a transaction failure after writing the reveal snapshot, idempotent retry, stale-write rejection, malformed payload rejection, and completed-result retention until explicit departure.
- Controller tests hold or fail writes while advancing an injected clock. They verify that Pause and Guessed use the captured action time, repeated actions cannot duplicate points or replace a word, and input stays suspended while a checkpoint is overdue or awaiting retry. Wake protection is attached only to the ready, foreground drawing view.
- Drawing snapshots serialize a paused phase with the captured remaining milliseconds. The persisted checkpoint capture time makes its age measurable. Recovery error is the time that ran but had not committed when play stopped.
- The Android emulator paused and saved when the notification shade opened, the app went to Home, and the display slept. Each event produced a newer durable pause after an explicit resume. A checkpoint from a resumed drawing turn was still readable in SQLite after force-stop.
- The 35 tests in `npm run check` and the Android Hermes export passed.

| Controlled scenario | Last durable capture | Observation time | Checkpoint age | Unsaved play at observation |
| --- | ---: | ---: | ---: | ---: |
| Normal checkpoint | 1,000 ms | 1,650 ms | 650 ms | 650 ms |
| Delayed checkpoint, overdue after a stalled tick | 0 ms | 2,500 ms | 2,500 ms | 2,500 ms |
| Failed second checkpoint | 1,000 ms | 2,450 ms | 1,450 ms | 1,450 ms |
| Termination simulated during a pending write | 1,000 ms | 3,350 ms | 2,350 ms | 2,350 ms |

Times are relative to the start of drawing and come from deterministic clock tests. Event-loop stalls, pending writes, and failures can extend recovery error beyond the nominal one-second checkpoint interval.
