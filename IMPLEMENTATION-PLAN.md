# Draw Party implementation plan

Prepared: 2026-11-11

## Status and recommendation

The first-release product specification is approved. The user subsequently directed Android-first implementation and deferred iPhone implementation. This document applies that delivery change and the subsequently approved review clarifications for timer recovery, complete tiebreaker rounds, and final-turn correction. Production implementation has not started.

Recommend Expo with React Native and TypeScript, using native development builds. Implement and validate Android on the existing Windows computer first. Defer iPhone implementation, native validation, signing, and distribution to a later phase. Preserve shared game logic and platform adapters for that future work. Keep bundled content and local storage; no application server is needed.

Use the current stable Expo SDK 58 baseline, with the React Native and React versions it supports. Pin exact compatible package versions and commit the lockfile during scaffolding. Recheck release status at that time rather than installing beta or canary packages. The official compatibility table currently lists React Native 0.88 and React 19.3 for SDK 58. [1]

The existing Node installation is v24.18.0. Flutter, Dart, Java, and adb were not found on PATH during planning; this is not proof that no Android SDK is installed elsewhere.

## Framework comparison

- Expo / React Native / TypeScript — recommended. Fits this primarily form, timer, and scoreboard application; uses the available JavaScript tooling. Expo offers native modules for storage, audio, and screen wake control, plus hosted Android and iOS builds. Custom Notebook styling will be implemented as native components. This is a project-specific engineering recommendation, not a benchmark claim. [1–5]
- Flutter / Dart — viable alternative. Its custom rendering is suitable for the Notebook direction and it supports both target platforms. It would introduce a new language and SDK here. Local iOS development requires macOS; an external macOS build environment would still be necessary from this Windows workspace. [6]
- Separate Kotlin and Swift applications — would duplicate interface work and require keeping two rule implementations consistent. That extra maintenance is unnecessary for this first release.
- The HTML prototype remains a visual reference. Build the production interface in native components, with game logic independent of the interface.

## Platform and testing baseline

- Proposed initial release minimum: Android 8.0 (API 26). This is a deliberate project support floor above Expo's documented Android 7 minimum; it reduces the initial device matrix and includes the user's reported Android 17 phone. For later iOS work, Expo currently documents iOS 16.4 as its floor; re-evaluate it when that phase starts. [1]
- The minimum OS version is separate from the Android target API and Apple build SDK. Use the selected Expo release's compatible build toolchain, and recheck store submission requirements when preparing release builds.
- Develop on Windows with a physical Android phone and, where available, Android Studio emulators. Use Expo development builds for native acceptance testing. Expo Go may help quick previews, but is not the release acceptance environment. [7]
- Primary physical test device: Samsung Galaxy S23 Ultra running Android 17, as reported by the user. No physical tests have been run yet.
- Future iOS option: Expo's hosted build service can produce signed builds without a local Mac. Physical iOS builds through that route require Apple Developer membership and signing setup. This is deferred; do not set up iOS accounts, credentials, or paid builds now. Installed gameplay remains offline. [2, 8]
- The user confirmed no current access to a physical Fold. T40 is blocked on hardware; continue emulator coverage and independent Android work. Full device acceptance remains open until physical verification or an explicitly approved release-scope change. No iPhone has been confirmed; Mac access is not needed for the current Android phase.
- Android baseline emulator: API 26, narrow portrait viewport. Also test a recent supported Android image with large text and system back navigation.
- Physical Galaxy S23 Ultra / Android 17: verify touch targets, keyboard entry, buzzer, vibration, lock/unlock, interruption behavior, and full offline games. Test minimum-supported Android separately in an emulator; this phone cannot establish Android 8 compatibility.
- Physical Samsung Galaxy Z Fold: model to be supplied or arranged before foldable release sign-off. Cover-screen portrait, unfolded portrait and landscape, fold/unfold mid-turn, and transitions that hide the app. Resizable emulators provide early coverage, but do not establish physical hinge/lifecycle correctness.
- Deferred iPhone phase: define a small/large-screen matrix, validate the then-current minimum OS, and test audio/haptics and lifecycle on physical hardware before claiming iOS support. Local simulator work requires access to macOS.
- Test TalkBack, approximately 200% text sizing, Arabic interface with English words, English interface with Arabic words, and mixed-script player names. VoiceOver acceptance belongs to the deferred iPhone phase.

## Application structure

- Put the mobile app at the repository root; preserve the specification and prototypes. Suggested source directories: src/game, src/storage, src/platform, src/content, src/localization, src/screens, and src/ui. Keep tests close to the behavior they verify.
- Game logic is a pure TypeScript state machine. It accepts explicit commands and returns validated state plus requested effects. It does not import React, SQLite, sound, or device APIs.
- A session controller serializes commands, runs persistence transactions, and publishes committed state to React. React context and subscriptions are sufficient initially; avoid adding a separate global-state library unless a concrete need appears.
- Storage owns all SQLite access and migrations. Screens call the session controller or group/settings operations; they never write scores directly.
- Platform adapters own clock access, lifecycle events, sound, vibration, screen wake control, and orientation. Inject a fake clock and deterministic random source for tests.
- Use ordinary navigation for home, setup, groups, rules, and results. Derive the current turn screen from saved session state so navigation cannot accidentally create a second turn or reset the timer.
- Implement Notebook colors, spacing, typography, paper surfaces, and button styles as shared design tokens and components. Bundle fonts and sound assets with appropriate licenses. Avoid network-loaded fonts.
- Native dependencies planned: expo-sqlite, expo-audio, expo-keep-awake, expo-localization, expo-screen-orientation, and an SDK-compatible vibration/haptics implementation. Validate silent-mode behavior before accepting the audio adapter. Configure expo-audio with recordAudioAndroid: false, enableBackgroundRecording: false, and enableBackgroundPlayback: false; set playsInSilentMode: false at runtime. Inspect the merged manifest and built APK to verify RECORD_AUDIO and unnecessary audio foreground-service declarations are absent. No microphone functionality or recording permission is needed. [3–5]

## Game state and transitions

- Model the session's phase explicitly: handoff, private word reveal, drawing, paused drawing, pending guess confirmation, turn result, between turns, and completed. Setup remains separate until starting a game commits a fixed roster and settings.
- Persist stable player and team IDs, setup snapshot, selected rotation, round/turn counters, current drawer/team, current word ID, remaining milliseconds, result data, regular scores, tiebreaker scores, active tiebreaker participants, and undo availability.
- Use unique turn IDs and serialized, idempotent result commands. Repeated taps, a timeout callback, and a simultaneous Guessed tap must resolve to one authoritative result.
- A round is one turn per player in free-for-all and one turn per team in team mode. Unequal team sizes affect drawer rotation, not the number of team turns per round.
- Guessed freezes the timer and leaves the word hidden. Resume returns to the same word and remaining time; confirmation reveals it and awards points once. Reject the drawer as a free-for-all guesser and reject guessers outside the current eligible set.
- Timeout selects no points and reveals the word. Last-second correction uses the same scoring path as a confirmed guess. An end-turn rule violation produces no points and advances the fixed rotation after confirmation.
- Complete every scheduled regular round before deciding whether tiebreakers are needed. In each tiebreaker, use only tied leaders; finish their full round before comparing totals. Free-for-all drawers receive no tiebreaker point. Before starting each extra round, count distinct eligible words unused in this game against the number of tied players or teams. If there are too few for a complete round, declare those tied leaders joint winners without starting or scoring a partial round.
- Preserve the previous result as an undo record until the next private reveal. Undo reopens that result for correction, rolls back its scoring and advancement, and reapplies the corrected result once; it never offers another drawing attempt. Keep final-turn correction available on final results until the user leaves them, excluding the correction flow itself. Recompute scores, tied participants, round advancement, word-capacity checks, and completion from the corrected result; a completed game can reopen into a tiebreaker. Retain the completed snapshot and undo record across interruption/relaunch until explicit departure from results, then clear them without creating game history.
- Restart, end game, play again, and new game each have distinct commands. Preserve recent-word history across all of them; retain the final scoreboard until the user leaves it.

## Timer, interruption, and private words

- Use an injected monotonic clock for elapsed foreground time. The visual interval refreshes the displayed value; it is not the authority for time remaining. Clamp at zero and resolve expiry through the same serialized command path as manual results.
- Pause on background or inactive events and hide private content immediately. On Android, also handle blur events such as the notification shade, where AppState may not change. Resume always requires the user's action after an interruption. [9]
- On a pure viewport resize or visible fold transition, keep the same session and timer running. Do not recreate the session when changing layouts. If the transition makes the app inactive or hidden, pause it.
- Enable screen wake protection only while drawing is actively running; release it on pause, result, background, and unmount. [5]
- Timestamp Pause, Guessed, and interruption commands with the injected monotonic clock when received, before waiting for storage. Immediately freeze the displayed timer and hide private content through a temporary suspended UI state; publish score changes, word reveals, and authoritative phase transitions only after commit. Serialize commands and checkpoints, coalesce obsolete timer checkpoints, and reject stale writes. Attempt checkpoints once per second while drawing and on lifecycle events. If a checkpoint fails or is still pending when the next checkpoint is due, suspend play and show saving/retry status rather than accumulate writes. A failed phase transition also keeps play suspended. Retry the original command and captured remaining time idempotently; allow explicit Resume only after persistence succeeds.
- After process termination, restore the same word and last successfully committed remaining time in a paused state. Never count time while the process was absent. Recovery error is elapsed unsaved play since that successful checkpoint, not necessarily one second: delayed writes, failures, and event-loop stalls can extend it. Record checkpoint age and measure normal, delayed-write, failed-write, and termination cases; do not promise a fixed upper bound from the checkpoint schedule alone.
- Reserve and record a word when it is first revealed; commit the reservation before showing it. Reopening or restoring the reveal must not draw another word. A persisted turn may reference a secret word, but hidden screens must not include that word in their rendered tree, accessibility labels, or diagnostic output.
- Press-and-hold Show word hides on release, cancellation, loss of focus, interruption, or route change. Validate the hold interaction with screen readers in the early milestone. Private reveal screens must remain shielded even in wide layouts.
- Use a bundled short buzzer with silent-mode-respecting audio settings and a separate vibration preference. Validate Android ringer mode, volume zero, and disabled vibration on real hardware; iPhone silent-mode validation remains deferred. If the selected audio API cannot honor the specification on a platform, use a small native adapter before release. [4]

## Local storage and word selection

- Use SQLite for transactional saved state. Keep a schema version with migration tests, settings, named groups, recent-word records, and one active-session snapshot. Keep one prior result snapshot for undo and retain the completed session until explicit departure from final results; do not implement browsable game history. SQLite persists across app restarts. [3]
- Commit scoring, round advancement, word use, and the active snapshot atomically where they belong to the same transition. On write failure, retain the last committed game state plus the pending command in memory, keep the timer suspended, and offer retry; never silently award points or resume play without a successful save. Process termination can discard the pending command, so recovery uses only committed data.
- Store saved-group data separately from the active session's roster snapshot. Editing or deleting a group cannot mutate an ongoing game.
- Validate restored data before loading it. Preserve an unreadable save for diagnosis/recovery where possible and offer a clear recovery choice; do not silently discard a game.
- Word banks use stable IDs, language, difficulty, and text. Bundle at least 200 Easy and 200 Medium prompts per language: at least 800 prompts in total. Validate counts, unique IDs, duplicate normalized text, missing text, and difficulty labels automatically.
- Prefer canonical concept IDs across difficulty entries so duplicate prompts cannot evade the no-repeat rule. Keep recent-use history scoped to language and shared across difficulty selections where pools overlap.
- Exclude every word used in the current game, including tiebreakers. Prefer eligible words absent from recent history. When recent history covers the eligible pool, recycle the oldest eligible entries while continuing to exclude current-game words.
- Build Mixed from shuffled Easy and Medium pools with balanced draws while both pools contain eligible words. Track selections in saved state so restart/recovery cannot reshuffle a revealed word.
- Validate enough distinct eligible words for the entire regular game before starting; the specified bank sizes exceed the largest regular game of 12 players times 5 rounds. Before every tiebreaker round, require one unused eligible word per tied player or team, counting current-game exclusions and allowing recent-history recycling. If capacity is insufficient, share the win among the leaders from the last complete round. Do not start a partial round. Treat an unexpected mid-round shortage as a state/content error, not permission to declare a winner from incomplete scores.
- Undoing a result does not erase that a word has already been seen. Restart and play again also preserve recent-word history.
- Egyptian Arabic content requires a naturalness and family-suitability review by an Egyptian Arabic speaker; automated checks cannot replace that review.

## Arabic, accessibility, and adaptive layouts

- Keep interface locale and word-bank locale separate throughout setup, session state, and persistence. Default word language from interface language only when creating setup; preserve the user's explicit selection.
- Externalize screen text, confirmations, errors, accessibility labels, timer announcements, and rules into translation keys from the first production screen in T17; add keys whenever a screen is built. T35 completes and reviews English/Egyptian Arabic translations rather than extracting hardcoded strings late. Use Egyptian Arabic in Arabic script, without assuming a device language matches the selected interface.
- Scope layout direction and text direction to the selected interface, with explicit direction for secret words and mixed-script names. Do not rely on forceRTL for live language switching: React Native documents restart limitations. Verify native navigation and dialogs in the technical milestone. [10]
- Choose compact or wide compositions from actual available width and height, safe areas, and text scaling. A starting wide breakpoint of 720 logical pixels is a design hypothesis to validate, not a device-model check.
- Compact drawing shows the current turn and dominant timer. Wide drawing places scores beside timer/turn information, without exposing the secret. Keep controls usable in unfolded landscape and when larger text forces stacking.
- Keep ordinary phones and cover screens portrait; allow portrait and landscape on unfolded layouts. Test orientation policy on actual devices because viewport size alone may not distinguish all form factors. Native fold information may be needed if dimensions and aspect ratio prove insufficient.
- Include at least 48 logical-pixel primary touch targets, readable contrast, visible focus/pressed states, text scaling, and visual timeout cues. Screen readers should receive useful milestone announcements rather than speech every second.

## Delivery milestones and acceptance

- M0 — Android native feasibility and setup. Scaffold the Expo/TypeScript app, record exact versions, configure formatting/type checks/tests, and create an Android development build for the Galaxy S23 Ultra. Verify Arabic direction, silent-mode buzzer behavior, press-and-hold accessibility with TalkBack, lifecycle pause/recovery, SQLite persistence, and visible resize behavior in a small native test screen. Use a foldable emulator for early layout coverage. Exit: Android device assumptions have evidence or a specific remediation plan. iOS builds and validation are deferred.
- M1 — First playable complete game. Implement the tested rule engine and a simple Notebook interface: home, setup, order selection, handoff, reveal, timer, guess confirmation, result, scoreboard, next turn, and final winner. Support both modes, all configured rounds/timers, tied first guessers, full tiebreaker rounds, and word-pool exhaustion. Start with a small clearly marked development bank. Exit: a group can play a full game in each mode, with automatic tests for the rule edge cases and one passing native smoke flow.
- M2 — Reliable local sessions. Add SQLite session storage, resume after interruption/termination, checkpoint timing, result correction/undo, restart/end confirmations, saved-group operations, and recent-word handling. Exit: replayed commands and interrupted writes cannot duplicate points or replace the active word; deleting a group leaves an ongoing roster intact.
- M3 — Complete content and bilingual experience. Ship the full reviewed word banks, Egyptian Arabic interface and rules, independent language settings, first-game overview, and all home/setup/pause flows. Exit: at least 800 reviewed prompts, content validation passes, and both interface/word-language combinations work offline.
- M4 — Notebook polish and device acceptance. Finish compact/wide compositions, fold transitions, large text, screen readers, feedback switches, and final-result detail. Exit: physical device matrix passed, including recovery, hidden-word behavior, and no state reset during visible resizing.
- M5 — Android release candidate. Create a signed Android build, run complete games offline from clean installs, test save migrations from the preceding test build, prepare icons/screenshots/store description/privacy disclosures, and distribute to testers before Google Play submission. Recheck current store requirements and build-service costs at this stage. Exit: no unresolved Android score, rotation, recovery, private-word, or accessibility blockers; store upload remains a separate release action. iPhone implementation, validation, and release planning form a later phase.

## Verification strategy

- Rule-engine tests cover player/team limits, order, unequal teams, last-round boundaries, simultaneous first guessers, pending confirmation/resume, timeout correction, violation results, tiebreaker participant reduction, no drawer tiebreaker points, shared wins, and score breakdowns.
- Deterministic timing tests use a fake clock to cover delayed UI ticks, pause/resume, background and blur events, repeated expiry signals, a Guessed/timeout race, command timestamps preceding queued writes, and suspension/retry on failed or overdue checkpoints. Device tests check the native events themselves.
- Storage integration tests cover atomic result commits, stale timer-write prevention, one active game, restoration at each phase, migrations, group independence, undo expiry on reveal or explicit departure from final results, final-turn corrections that reopen tiebreakers, and completed-result restoration.
- Word-selection tests cover cross-game avoidance, overlapping Easy/Mixed history, current-game exclusion after history exhaustion, balanced Mixed draws, and repeat-free restoration.
- Component tests cover hidden words being absent from accessibility trees, eligible guesser selection, double taps, Arabic text direction, and confirmation actions. Use React Native Testing Library with Expo-compatible Jest configuration; choose versions at scaffolding.
- Start native automation in T22 against the installed development build: choose a compatible runner such as Maestro and automate one deterministic setup-to-final-results flow with stable test IDs. No permanent release identity is required for this early test. Expand it in T46 to full games in both modes, app restart while drawing, and bilingual setup/play against the signed preview build. Manual device checks remain necessary for sound, hold gestures with assistive technology, and folding.
- Continuous integration should run dependency installation from the lockfile, formatting/lint, type checking, rule tests, content checks, and storage/component tests. Add native builds after the signing/build workflow is ready; do not make every documentation change trigger a cloud build.

## Immediate work and remaining inputs

- Next executable task: M0, beginning with dependency/toolchain setup and the smallest native validation build. This planning task does not install tools, create cloud accounts, or start a paid build.
- Confirmed by the user: Galaxy S23 Ultra, Android 17; defer iPhone implementation. No remaining device question blocks starting M0. Physical Fold access is currently unavailable, so keep T40 and dependent full acceptance open; confirm Expo account availability only if hosted Android builds are needed.
- Before first distributable builds: choose the permanent Android application ID and confirm app ownership/signing account. Use a development identifier until ownership is settled. iOS identifiers and accounts are deferred.
- Proposed technical defaults are Expo/React Native/TypeScript, SQLite, and Android 8+. The current iOS 16.4 framework floor is informational for later work. Framework choice remains an engineering recommendation, distinct from the already approved product specification.
- Pure setup/rule-engine tasks T10-T16 and content tasks T32-T33 can proceed after their tooling/rule dependencies without waiting for native feasibility. T09 remains a gate for production UI integration, not pure game logic.
- No delivery dates are promised before native feasibility and device access are known. Track progress by the acceptance criteria above.

## Sources checked on 2026-11-11

- [1] Expo SDK compatibility and supported OS versions: https://docs.expo.dev/versions/latest/
- [2] Hosted Android/iOS builds: https://docs.expo.dev/build/introduction/
- [3] Local SQLite persistence: https://docs.expo.dev/versions/latest/sdk/sqlite/
- [4] Audio capabilities and configuration: https://docs.expo.dev/versions/latest/sdk/audio/
- [5] Screen wake control: https://docs.expo.dev/versions/latest/sdk/keep-awake/
- [6] Flutter platform integration and local iOS host restriction: https://docs.flutter.dev/platform-integration
- [7] Native development builds: https://docs.expo.dev/develop/development-builds/introduction/
- [8] Build setup and Apple Developer requirement: https://docs.expo.dev/build/setup/
- [9] Native lifecycle and Android blur events: https://reactnative.dev/docs/appstate
- [10] RTL behavior and restart limitations: https://reactnative.dev/docs/i18nmanager

Sources establish platform capabilities and constraints. The architecture, support floor above framework minimums, milestone sequence, and engineering recommendations are project-specific decisions.
