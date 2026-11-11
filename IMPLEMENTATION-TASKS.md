# Draw Party implementation tasks

Prepared: 2026-11-11

## How to use this backlog

T01–T07 are complete; next is T08 SQLite persistence. 42 of 49 tasks remain. T40 remains blocked by unavailable physical Fold access. Work in the order below unless their dependencies allow another order. Each task is a bounded change or validation session with a concrete completion check. Mark a task done only when its completion check passes; if hardware or access is unavailable, record the blocker and continue only with independent tasks.

Android is the current delivery target. The primary phone is the user's Samsung Galaxy S23 Ultra running Android 17. iPhone implementation is deferred. The product specification remains authoritative; IMPLEMENTATION-PLAN.md explains the proposed technical approach.

Next task: T08. First checkpoint: T04, when a native development build runs on the S23 Ultra. First complete playable game: T22. A task being written here does not mean it has been implemented or tested. Pure rules and content work may proceed once its dependencies are ready without waiting for T09; native UI integration still requires feasibility checks.

## M0 — Prove the Android foundation

### T01 — Check the development environment

Status: Done; environment and native build route verified. See T01-ENVIRONMENT.md and T04-NATIVE-CHECKPOINT.md. Depends on: none.

- Scope: inspect Node, package manager, network/package access, Android SDK/JDK locations, emulator support, and available device connection options. Recheck stable Expo compatibility before choosing versions. Decide local Android build versus hosted build based on actual tooling.
- Done when: record exact available versions, missing prerequisites, selected build route, and commands for reaching the phone. Separate tasks requiring the user's physical device interaction from work that can run locally.

### T02 — Scaffold the mobile app

Status: Done; starter-load verified on emulator. See T02-SCAFFOLD.md and T04-NATIVE-CHECKPOINT.md. Depends on: T01.

- Scope: create the Expo/React Native TypeScript app at the repository root, preserving project documents and prototypes. Pin compatible dependencies, save a lockfile, configure the proposed Android 8 minimum, and use a development application identifier.
- Done when: dependencies install reproducibly, the starter app loads, and existing documents are intact. Record the chosen framework and exact versions in the project documentation.

### T03 — Add repeatable project checks

Status: Implemented and locally verified; remote CI run pending push. See T03-CHECKS.md. Depends on: T02.

- Scope: configure formatting, lint, type checking, an Expo-compatible test runner, and GitHub CI. Add a small behavioral test when an actual behavior exists; avoid placeholder tests that prove nothing.
- Done when: documented commands and CI validate the starter project from the lockfile, and an intentional type error is caught during setup verification.

### T04 — Run a native build on the S23 Ultra

Status: Done; emulator and physical S23 build/launch/reconnection verified. See T04-NATIVE-CHECKPOINT.md. Depends on: T02.

- Scope: make and install an Android development build using the route selected in T01. Record physical steps the user must perform on the phone.
- Done when: the native app launches on the Galaxy S23 Ultra and reconnects to the development server. Record actual device/OS details and build command; a browser preview does not satisfy this task.

### T05 — Check Arabic layout feasibility

Status: Done; emulator and physical S23 language matrix verified. Native-dialog limitation and T17 remedy recorded in T05-LANGUAGE-CHECK.md. Depends on: T04.

- Scope: build a small validation screen with English/Egyptian Arabic switching, RTL controls, English and Arabic secret words, mixed-script names, a native dialog, and navigation.
- Done when: both interface directions work on the phone with either word language, without lost state or incorrect name rendering. Record any restart or native-dialog limitation and its remedy.

### T06 — Check sound, vibration, and screen wake

Status: Done; emulator and physical S23 feedback matrix, wake checks and APK permission/service inspection passed. See T06-FEEDBACK-CHECK.md. Depends on: T04.

- Scope: validate bundled buzzer playback, independent feedback switches, and wake control. Set recordAudioAndroid, enableBackgroundRecording, and enableBackgroundPlayback to false, and playsInSilentMode to false. Inspect the merged manifest and built APK for absence of RECORD_AUDIO and unnecessary audio foreground-service declarations; do not request microphone permission.
- Done when: document behavior with normal/silent/vibrate ringer modes, volume zero, sound off, vibration off, and pause/background. The timer keeps the screen awake only while running. Record a concrete native-adapter fix if a library cannot meet the sound rule.

### T07 — Check interruptions and private-word gestures

Status: Done; core device checks and agent-run active TalkBack hold/release/cancel verification passed. Production private nonvisual word access remains a T17 design requirement. See T07-INTERRUPTION-CHECK.md. Depends on: T04.

- Scope: validate monotonic elapsed time, app background/inactive/Android blur events, lock/unlock, and hold-to-show-word with cancellation and TalkBack.
- Done when: interruptions freeze the countdown and hide the word; resuming needs an explicit action. Releasing, cancelling, or leaving the hold control hides its word. Record any assistive-technology interaction that needs design resolution before building the final control.

### T08 — Check SQLite persistence

Status: Not started. Depends on: T04.

- Scope: save and restore a small versioned sample snapshot through SQLite; verify transactions and error handling on the device.
- Done when: data survives app termination/relaunch, a failed transaction leaves the prior valid state intact, and the storage API can be wrapped without exposing SQL to screens.

### T09 — Check resizing and close the feasibility milestone

Status: Not started. Depends on: T05, T06, T07, T08.

- Scope: exercise a foldable/resizable Android emulator, compact/wide layouts, orientation, and a running sample countdown. Summarize M0 findings and unresolved device risks.
- Done when: visible resizing preserves the timer/session; hidden transitions pause. Document proposed orientation detection and any need for native fold information. Every M0 issue has evidence of resolution or a tracked remedy. Physical Fold verification remains T40.

## M1 — Build the first complete playable game

### T10 — Validate setup data

Status: Not started. Depends on: T03.

- Scope: define stable player/team IDs, immutable game settings, player/team limits, name validation, timer/difficulty/round options, and setup-to-session validation.
- Done when: tests accept all supported boundaries and reject invalid rosters/settings without creating a game. Keep display names separate from identity.

### T11 — Implement turn rotation and round counting

Status: Not started. Depends on: T10.

- Scope: selected player order, team order, drawer order within teams, fixed advancement, and regular-game completion.
- Done when: tests prove one free-for-all turn per player per round and one team turn per team per round, including unequal teams and the final turn of round five.

### T12 — Add a small development word bank and selector

Status: Not started. Depends on: T10.

- Scope: stable word/concept IDs, language and difficulty fields, bundled sample prompts, deterministic shuffling, balanced Mixed draws, and current-game exclusion. Label sample content as incomplete.
- Done when: tests show no within-game repeats and predictable selections with a seeded random source; exhaustion is reported explicitly. Full banks are T32–T34.

### T13 — Implement turn phases and legal commands

Status: Not started. Depends on: T10, T11, T12.

- Scope: handoff, private reveal, drawing, pause, pending guess, result, between turns, and completion. Add unique turn IDs and reject illegal/stale commands.
- Done when: tests cover legal transitions, hidden-word phases, same-word resume, and repeated commands without unintended advancement. Keep React and native APIs outside the engine.

### T14 — Implement countdown logic with a fake clock

Status: Not started. Depends on: T13.

- Scope: monotonic elapsed time, remaining milliseconds, pause/resume, zero clamping, and expiry commands. Do not count UI interval ticks as elapsed time.
- Done when: tests cover delayed ticks, repeated expiry, expiry versus Guessed races, all four configured durations, and action-time capture before queued storage work. Pause/Guessed freeze immediately; late callbacks cannot alter captured remaining time or duplicate a result.

### T15 — Implement scoring and result confirmation

Status: Not started. Depends on: T13, T14.

- Scope: team scoring; eligible free-for-all guessers, including simultaneous first guessers; drawer points; pending confirmation/resume; timeout and last-second correction; violation/no-points results.
- Done when: tests reject ineligible guessers and award each outcome exactly once. Pending guesses keep the word hidden until confirmation.

### T16 — Implement complete tiebreaker rounds

Status: Not started. Depends on: T11, T12, T15.

- Scope: tied-leader participant sets, complete extra rounds, narrowing tied leaders, no free-for-all drawer points, team rotation, score breakdown, and shared winners when too few unused words remain to complete the next extra round.
- Done when: tests cover ties that persist, ties that narrow, a unique winner after a complete extra round, and capacity checks with zero words, one fewer word than participants, exactly enough words, and insufficient capacity before a later extra round. Capacity uses distinct unused eligible words after recent-history recycling; no partial round starts.

### T17 — Build the Notebook components and home screen

Status: Not started. Depends on: T02, T05, T09.

- Scope: shared colors, spacing, typography, paper surfaces, accessible buttons, app navigation, and a home screen linking to setup, groups, and rules. Introduce translation keys/catalogs for all user-facing strings, errors, and accessibility labels from this first production screen; extend them as each later screen is built. Keep unfinished destinations visibly unavailable until implemented.
- Done when: home runs on the phone with usable touch targets and text scaling. Production components are newly implemented rather than copied from the throwaway HTML prototype.

### T18 — Build setup and order selection

Status: Not started. Depends on: T10, T17.

- Scope: player entry, both modes, balanced random team assignment, manual team changes, explicit order selection, rules summary, and game settings. Support all roster limits and independent language fields in the model.
- Done when: users can form valid unequal teams or a free-for-all roster, choose who starts, and create the exact validated immutable session shown in setup.

### T19 — Build private reveal and active drawing screens

Status: Not started. Depends on: T07, T13, T14, T17, T18.

- Scope: Pass to player, private reveal, Start drawing, dominant countdown, hold-to-show-word, Guessed, and Pause. Connect through a session controller with an in-memory storage adapter until T24.
- Done when: the same word survives pause/resume and UI rerenders; hidden screens contain no secret text in their rendered or accessibility trees. Lifecycle hiding uses the verified M0 behavior.

### T20 — Build guess confirmation and turn results

Status: Not started. Depends on: T15, T19.

- Scope: eligible guesser selection, simultaneous first guessers, confirm/resume, timeout no-points default, last-second correction, no-points outcome, and between-turn scoreboard.
- Done when: all result paths update scores once, preserve the pending word's privacy, and advance only through the intended action.

### T21 — Build final results and replay setup

Status: Not started. Depends on: T16, T20.

- Scope: regular/tiebreaker/total scoreboard, winner/shared winners, tiebreaker labels, Play again, and New game. Keep results visible until the user leaves.
- Done when: complete regular and tiebreaker games reach correct final results; replay resets scores and reuses settings, while new-game setup permits changes. Design completion to allow final-turn correction until explicit departure from results; correction may reopen a tiebreaker. Full persisted undo follows in T28 and word-history persistence in T27.

### T22 — Verify the first complete playable game

Status: Not started. Depends on: T18, T19, T20, T21.

- Scope: play one complete game in each mode on the phone, plus a deterministic tiebreaker scenario and timeout/last-second scenario. Choose a compatible native runner and automate one deterministic setup-to-final-results flow against the development build using stable test IDs. Document development-bank and in-memory-save limitations. Release signing is not a prerequisite.
- Done when: game flow, rotation, scoring, and results agree with the approved specification all rule tests pass, and the initial native smoke flow passes with useful diagnostics that omit secret words. Save an M1 checkpoint with actual evidence and remaining tasks.

## M2 — Make sessions reliable and recoverable

### T23 — Add the production SQLite schema and storage boundary

Status: Not started. Depends on: T08, T13.

- Scope: versioned settings, groups, one active-session snapshot, prior-result undo data, completed-result retention until explicit departure, and recent-word records. Add transactions, migrations, and validated deserialization.
- Done when: integration tests save/load realistic snapshots and migrate the previous test schema; screens have no direct SQL access.

### T24 — Persist serialized game commands atomically

Status: Not started. Depends on: T15, T19, T23.

- Scope: replace in-memory persistence with SQLite, serialize commands/checkpoints, and commit score changes, advancement, and associated word use together. Reserve words durably before reveal. Capture Pause/Guessed/interruption timestamps before queued writes, freeze the UI immediately, and retain pending command IDs for idempotent retry without publishing uncommitted scores.
- Done when: repeated taps and injected transaction failures cannot double-score, lose a confirmed transition, or reveal a replacement word. On stalled or failed saves, keep play suspended with saving/retry status and the original captured time. Resume requires a successful save and explicit user action; a failed save must not restart the old running state.

### T25 — Add timer checkpoints and lifecycle saves

Status: Not started. Depends on: T07, T14, T24.

- Scope: attempt timer checkpoints once per second and at lifecycle transitions; coalesce obsolete checkpoints and prevent stale writes. Suspend play if a checkpoint fails or remains pending at the next scheduled checkpoint, and retain the captured pause time while retrying. Release wake protection on immediate suspension even before persistence completes.
- Done when: tests demonstrate write ordering, immediate action-time freezing under delayed writes, suspension/retry on failed or overdue checkpoints, and recovery from the last successful checkpoint. Measure checkpoint age and unsaved-time recovery under normal, delayed, failed, and terminated writes without claiming a fixed one-second bound. The phone pauses and saves correctly on shade, app switch, and lock.

### T26 — Add home-screen resume and recovery

Status: Not started. Depends on: T25.

- Scope: restore every saved phase, reopen interrupted drawing paused with the same word, offer Resume game, confirm before replacement, and handle unreadable save data without silent deletion.
- Done when: termination/relaunch from reveal, drawing, pending guess, and between-turn phases restores the correct roster, scores, word, and committed remaining time; time absent is not deducted.

### T27 — Persist recent-word selection across games

Status: Not started. Depends on: T12, T24.

- Scope: shared history for overlapping difficulty pools within each language, oldest-eligible recycling after pool exhaustion, and permanent current-game exclusion. Preserve history through replay/restart/end/new game.
- Done when: deterministic tests prove history exhaustion never reintroduces a current-game word and language/difficulty changes respect the selected eligible pool.

### T28 — Add result editing and undo

Status: Not started. Depends on: T20, T24, T27.

- Scope: correct outcome/guessers on results, retain one prior result until the next reveal or explicit departure from final results, roll back advancement and points, and reapply once. Correction flow navigation itself does not expire undo. Recompute completion, winners, tiebreaker eligibility, and word capacity; reopen completed play if needed. Preserve seen-word history, never replay a known word, and retain final results/undo across interruption or relaunch until explicit departure.
- Done when: tests cover edits after Continue, invalidation on next reveal and final-results departure, restored undo availability, and round/tiebreaker boundary corrections. Cover a final winner becoming a tie, a tie becoming a winner, changed tied participants, insufficient next-round word capacity, and cancel/retry/relaunch without duplicate scoring.

### T29 — Complete pause, restart, end, and new-game actions

Status: Not started. Depends on: T21, T26, T27.

- Scope: Restart game, End game, End turn without points, resume, and unfinished-game replacement confirmations; retain groups/history and clear or reset only the appropriate session fields.
- Done when: cancel paths leave state intact, confirmed commands implement their distinct effects, and restart preserves setup/order but returns to round one with zero scores.

### T30 — Add saved-group management

Status: Not started. Depends on: T18, T23.

- Scope: name/save groups, list/load/edit player names and last team assignments, rename, and confirm deletion. Snapshot loaded setup into active games.
- Done when: saved groups survive relaunch and editing/renaming/deleting one cannot mutate an unfinished game's original roster.

### T31 — Verify interrupted writes and recovery end to end

Status: Not started. Depends on: T26, T27, T28, T29, T30.

- Scope: inject save failures, delayed timer writes, and repeated commands; terminate/relaunch at each meaningful phase. Test recovery of a tiebreaker and a group edited during a saved game.
- Done when: storage integration tests and device checks show no duplicated points, unexplained word changes, or lost committed results. Record the measured abrupt-termination timing tolerance.

## M3 — Complete bilingual content and rules

### T32 — Produce and validate the English word banks

Status: Not started. Depends on: T12.

- Scope: at least 200 Easy and 200 Medium English prompts, stable IDs, normalized duplicate checks, difficulty labels, and family-friendly wording. Store content in reviewable files.
- Done when: automated content checks pass and a content review records suitability for drawing and the intended age range.

### T33 — Produce the Egyptian Arabic word banks

Status: Not started. Depends on: T12.

- Scope: at least 200 Easy and 200 Medium Egyptian Arabic prompts in Arabic script, stable concept IDs, normalization, and difficulty labels.
- Done when: count/schema/duplicate checks pass and all prompts are prepared for a native Egyptian Arabic review. This task alone does not establish naturalness.

### T34 — Review and integrate the complete word banks

Status: Not started. Depends on: T27, T32, T33.

- Scope: obtain Egyptian Arabic naturalness/family-suitability review, resolve flagged prompts, integrate all banks, and remove development-bank limitations from production.
- Done when: at least 800 prompts pass validation, reviewer feedback is resolved, all difficulty/language pools work, and a maximum-length regular game has enough unused words. If no reviewer is available, record that blocker explicitly.

### T35 — Translate the complete interface

Status: Not started. Depends on: T05, T21, T29, T30.

- Scope: complete and review English/Egyptian Arabic translations for the keys introduced from T17 onward, including screen text, confirmations, validation errors, accessibility labels, and timer announcements. Audit for remaining hardcoded user-facing strings.
- Done when: every current screen has both translations and a completeness check catches missing keys. Verify natural Egyptian Arabic and mixed-script names on the phone.

### T36 — Finish independent language preferences

Status: Not started. Depends on: T26, T34, T35.

- Scope: persist interface preference, default new setup's word language appropriately, preserve explicit word selection, and keep active-session word language fixed.
- Done when: all four interface/word-language combinations work through setup, play, and restart, without switching banks or losing saved state unexpectedly.

### T37 — Add How to play and first-game guidance

Status: Not started. Depends on: T18, T23, T35.

- Scope: bilingual full rules from home, mode-specific setup summaries, and a short skippable first-game overview. Include drawing restrictions, answer strictness, and group-judged correctness/violations.
- Done when: first-game guidance can be skipped and does not recur after completion, full rules remain accessible, and explanations match actual team/free-for-all behavior.

## M4 — Finish layouts and device acceptance

### T38 — Polish compact Notebook screens

Status: Not started. Depends on: T31, T36, T37.

- Scope: consistent paper-and-marker styling across home/setup/groups/game/results; narrow portrait screens, safe areas, keyboard behavior, and large text. Bundle licensed fonts/assets as needed.
- Done when: no clipped names, inaccessible actions, or horizontal overflow on narrow and S23 Ultra viewports; active drawing emphasizes timer/current turn and between-turn screens show the full scoreboard.

### T39 — Build wide and unfolded layouts

Status: Not started. Depends on: T09, T38.

- Scope: timer beside scores/turn information on wide screens, portrait/landscape composition, and text-scale-aware stacking. Keep private screens private and session state independent of layout.
- Done when: emulator resize/rotation preserves scores, drawer, word, and timer; wide content is deliberately composed and no secret appears in the score panel.

### T40 — Verify real foldable transitions

Status: Blocked (hardware unavailable; user confirmed no current Fold access). Depends on: T25, T39. External requirement: access to a physical Samsung Galaxy Z Fold.

- Scope: identify actual model/OS and test cover portrait, unfolded portrait/landscape, visible fold/unfold during play, and transitions that hide/lock the app. Adjust orientation or lifecycle adapters if required.
- Done when: visible transitions keep time running, hidden transitions pause, and no state resets or secret leaks occur. Emulator-only evidence cannot close this task. If hardware is unavailable, keep physical foldable support unverified rather than marking done.

### T41 — Finish feedback controls and visual alerts

Status: Not started. Depends on: T06, T25, T35, T38.

- Scope: saved independent sound/vibration switches, visual timer warning/expiry, exactly-once timeout feedback, and final Android audio/ringer behavior.
- Done when: physical S23 Ultra checks cover all preference combinations and phone sound modes, including pause/expiry races; verify the final artifact has no RECORD_AUDIO or unnecessary audio foreground-service declarations and requests no microphone permission.

### T42 — Complete TalkBack and large-text acceptance

Status: Not started. Depends on: T35, T38, T39, T41.

- Scope: meaningful focus order, screen/phase announcements, useful timer milestones, hold-to-show-word accessibility, labels, contrast, touch targets, and approximately 200% text size.
- Done when: TalkBack users can set up and finish a game in both interface languages, hidden words are absent from hidden-screen accessibility content, and controls remain reachable at large text sizes.

### T43 — Run the full Android acceptance matrix

Status: Not started. Depends on: T31, T34, T36, T37, T40, T41, T42.

- Scope: API 26 minimum emulator, a recent Android emulator, S23 Ultra/Android 17, and the actual Fold; both modes, offline play, bilingual combinations, interruption/recovery, and maximum roster/round limits.
- Done when: record results per device/scenario, fix regressions, and leave no scoring, rotation, recovery, privacy, or usability blocker open. Run available-device scenarios independently and record partial evidence, but keep full acceptance open while T40 is blocked. Emulator checks do not close physical Fold coverage; release scope has not been reduced.

## M5 — Prepare the Android release candidate

### T44 — Test upgrades and saved-data migrations

Status: Not started. Depends on: T31, T34, T36.

- Scope: upgrade from a preceding test build with an unfinished game, groups, preferences, and recent words; run migrations and verify every retained field.
- Done when: the upgraded app resumes safely with the same roster/word/scores and preserved history; failed migration has a clear non-destructive recovery path.

### T45 — Finalize Android identity and signing setup

Status: Not started. Depends on: T04. External requirement: owner-selected permanent application ID and signing/build account access.

- Scope: replace the development identifier before distribution, document signing ownership and backup responsibility, and configure development/preview/production build profiles. Keep credentials out of Git.
- Done when: a reproducible signed preview APK can be installed and its signing ownership/recovery procedure is recorded. User-controlled account or credential steps remain explicit handoffs where necessary.

### T46 — Automate native smoke flows

Status: Not started. Depends on: T22, T26, T36, T45.

- Scope: expand the runner and initial smoke flow established in T22 to a full game in each mode, an interrupted-game restore, and bilingual setup/play against the signed preview build. Use stable test IDs and deterministic test fixtures.
- Done when: flows pass against an installed native build and failures provide usable diagnostics without logging secret words. Keep physical audio/fold/TalkBack checks separate.

### T47 — Produce and test the release candidate

Status: Not started. Depends on: T43, T44, T45, T46.

- Scope: build a signed installable APK for testers and an Android App Bundle for store readiness; perform clean-install and offline full-game checks, then collect tester feedback.
- Done when: the exact version/build identifier, artifact locations, checks, and fixed blocking feedback are recorded. A working debug preview is not a release candidate.

### T48 — Prepare Android store materials

Status: Not started. Depends on: T38, T45.

- Scope: final icon, English/Arabic screenshots and description, accurate privacy/data-safety disclosures, asset licenses, and required public policy/support information. Recheck current Google Play requirements at this stage.
- Done when: materials describe the actual free, ad-free, offline application accurately and every required submission item has an owner or ready artifact. Drafts do not imply publication.

### T49 — Review release readiness

Status: Not started. Depends on: T47, T48.

- Scope: compare the release candidate with the approved specification, review all acceptance evidence and unresolved issues, and prepare a concrete submission checklist.
- Done when: Android release readiness is documented with no required task falsely marked complete. Google Play submission is a subsequent release action; iPhone implementation remains deferred.

## Execution and checkpoint rules

- At the start of a work session, select one ready task by ID and read its dependencies and completion check. If its scope expands beyond one reviewable change, split it into suffixed tasks such as T24a and T24b without renumbering existing IDs.
- Record the implementation change, commands/checks run, actual device evidence, and remaining limitations when closing each task. Manual checks cannot be credited without a real observation or the user's test report.
- Keep blocked work visible. T40 is blocked because the user has no current Fold access; T34 requires Egyptian Arabic review; T45 requires release identity/signing decisions. These do not block earlier independent development work.
- Save progress in CHECKPOINT.md with the last completed task, next ready task, and blockers. Update this backlog's status and regenerate its HTML reading copy whenever progress changes.
- A task may be a commit or a small series of commits. Do not claim local changes are committed, pushed, installed, or tested without verifying that action. This backlog itself is saved locally and does not create GitHub issues.
- iOS implementation, signing, builds, VoiceOver testing, and App Store submission are outside this backlog by the user's direction.
