# Draw Party checkpoint

Saved November 25, 2026 after the T30–T35 implementation pass.

## Resume here

T01–T30 and T32–T33 are implemented. T31 has automated recovery coverage and an Android scenario awaiting a successful emulator run. T34–T35 are integrated and await native Egyptian Arabic review. T35 also awaits mixed-script checks on a physical phone. See [T30–T35 verification](T30-T35-CHECKS.md). Physical-phone testing is deferred to final acceptance. Physical Fold access remains unavailable for T40. Android comes first, with iPhone deferred.

T36–T39 are implemented. SQLite persists the interface preference and first-game overview dismissal. A resumed game uses the current interface preference and its saved word bank. Notebook screens use safe-area insets and scroll with the keyboard. During drawing, windows at least 640 dp wide show public scores, with the columns stacking when system text needs more room. The active turn and word stay in the session controller when the layout changes.

The Android bundle exports successfully and the x86_64 debug APK builds with the safe-area module. The Expo config plugin constrains generated CMake object paths on Windows so Ninja can compile that module. All 172 automated tests pass. The Android 17 emulator reached the first-game handoff after skipping the overview. A running turn kept its drawer and word and continued counting down across 690 × 840, 920 × 440, and 410 × 910 dp viewport changes and through portrait–landscape–portrait rotation. Spacing out SQLite checkpoint attempts resolved the emulator pause on rotation back to portrait. Home paused the turn and reopening kept it paused. Narrow and large-text visual checks and physical-phone acceptance remain open.

T40 still requires a physical Fold to verify cover and unfolded layouts, visible transitions, and pause on hide or lock. Cover-screen orientation policy remains subject to that run.

The app opens the Notebook home. See [T21–T25 verification](T21-T25-CHECKS.md) for the M1 gameplay checkpoint and persistence checks.

## Authoritative documents

- DESIGN-INTERVIEW.md: approved release specification, including review clarifications.
- IMPLEMENTATION-PLAN.md: architecture and milestones.
- IMPLEMENTATION-TASKS.md: 49 task dependencies and completion checks.
- HTML copies are readable companions.
- T01-ENVIRONMENT.md through T09-RESIZING-CHECK.md record implementation/verification evidence; read their latest results when earlier investigation notes differ.

## Implemented and verified

Expo 58.0.24, React Native 0.88.1, React 19.3.0, TypeScript 6.0.3. Exact dependencies and npm lockfile saved. Development application ID com.drawparty.dev, Android minimum API 26. Native debug builds installed on emulator and S23 Ultra.

T03: formatting, ESLint, strict types, Expo Android Jest preset and GitHub Actions workflow. npm run check passes; Android export passed during feasibility work. Remote CI is configured but no successful remote run is claimed yet.

T04: native starter, cold restart and Metro reconnection passed on emulator and physical Galaxy S23 Ultra SM-S918B, Android 17/API 37.

T05: all four interface/word language combinations, mixed names and navigation passed on both devices. Native Alert retains system-controlled alignment/theme; T17 must use shared app-owned directional confirmation dialogs.

T06: normal/silent/vibrate, independent feedback switches, actual media volume zero, wake/pause/background and APK permission/service inspection passed. User confirmed normal buzzer/vibration. No microphone/background-audio services. Original synthetic bundled WAV and license included.

T07: monotonic elapsed clock, hold/release/drag-out/reentry, notification blur and background checks passed; emulator sleep/wake/expiry and user-confirmed physical lock/unlock passed. Agent independently verified active TalkBack via emulator hardware-console touch input and screenshots. Swipe navigation establishes focus, double-tap-and-hold reveals, release/drag-out hide, moving back does not reveal. Standard Pressable semantics used. Ordinary emulator regressions passed after that change. Private nonvisual word-reading remains an explicit T17 design requirement; this probe does not speak secret words aloud.

T09: resizable Android 17 emulator checks passed at 411×914 compact portrait, 686×838 wide portrait, and 914×411 wide landscape. A running countdown kept its state/time through visible resize; Home paused and hid the word. See T09-RESIZING-CHECK.md for the M0 issue/remedy summary. The emulator lacks a hinge profile and physical Fold remains T40.

T10: src/game/setup.ts validates free-for-all and team rosters, stable unique IDs, nonempty bounded names, complete turn order, team membership, and every supported setting. Valid setup is copied into an immutable session value; invalid input returns errors without a session. src/game/setup.test.ts covers limits, unequal teams, invalid data, independent languages, and immutability. `npm run check` passed: 2 suites, 9 tests.

T11–T12: The regular turn schedule respects configured order and cycles team drawers independently. The development word selector has 16 bilingual concepts, balances Mixed draws, excludes used concepts, and reports exhaustion. `npm run check` passed with 4 suites and 12 tests.

T13–T15: The platform-independent engine in src/game/engine.ts implements regular turn phases, stale-command rejection, private-word visibility, elapsed-time countdowns, and result scoring. Timed commands carry the monotonic timestamp captured at input. The future session controller must apply input in capture order and publish pause/guess state immediately before awaiting persistence. The engine reaches regular completion or reports word exhaustion. T16 adds tiebreakers and T19 connects drawing to the app. Local checks passed with 5 suites and 19 tests.

T16: Complete tiebreaker rounds use tied leaders in their configured order, rotate team drawers, and count only distinct unused eligible concepts. Recent history can be recycled, and insufficient capacity yields shared winners. Score breakdowns preserve regular, tiebreaker, and total points.

T17–T20: The Notebook home, rules, setup, order review, private reveal, timed drawing, guess confirmation, and between-turn scoreboard form the Android development flow. Interface and word languages are independent. The in-memory controller commits actions in input order. The development bank has 16 concepts per language and setup refuses regular schedules larger than the eligible pool. Private reading is available during reveal through explicit screen-reader opt-in with headphones or Braille guidance.

Verification: `npm run check` passed with 25 tests. On the Android 17 emulator, home worked at 1.5× text size and switched to Arabic. The free-for-all flow covered the chosen order, notification-shade pause and explicit resume, hold/release and drag-out, simultaneous first guesses, timeout correction, a confirmed no-points turn, and scoreboard advancement. A 3-vs-2 team game verified the chosen starting team and correct team scoring.

## User preferences and open acceptance

The user delegates TalkBack testing to the agent; do not ask the user to repeat it. Use emulator first, with physical hardware checks where needed. No Fold access: keep T40/release verification gap open. Egyptian Arabic content review remains T34/T35; release identity/signing remains T45. Do not add recent-apps preview protection; the user declined it.

T08 SQLite sample snapshot, transaction rollback, and force-stop recovery passed on Android 17 emulator. The storage probe remains under src/feasibility. Production SQLite storage and paused recovery snapshots are available. The home screen offers recovery and confirms replacement of existing sessions.

## Windows tooling and local build route

Workspace H:\Github\Pictionary_mobile. Remote https://github.com/aelbassiouni/draw-party, branch main. Node v24.18.0; npm 11.16.0. SDK H:\Andriod_Studio; bundled Java C:\Program Files\Android\Android Studio\jbr (OpenJDK 25.0.4). Gradle 9.4.1, SDK/Build Tools 37, NDK 27.1.12297006. WHPX works.

C: filled during the first native build. Original files were preserved; caches/temp and emulator writable data were copied to ignored .local/android-build on H:. Set process variables:

- GRADLE_USER_HOME=H:\Github\Pictionary_mobile\.local\android-build\gradle
- TEMP and TMP=H:\Github\Pictionary_mobile\.local\android-build\temp
- ANDROID_HOME=H:\Andriod_Studio
- JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
- ANDROID_AVD_HOME=H:\Github\Pictionary_mobile\.local\android-build\avd
- EXPO_OFFLINE=1 for Metro (remote metadata lookup caused manifest timeouts).

Build from root: android\gradlew.bat -p android :app:assembleDebug '-PreactNativeArchitectures=x86_64,arm64-v8a' --console=plain.

Server: node node_modules/expo/bin/cli start --dev-client --localhost --port 8081. Use adb reverse tcp:8081 tcp:8081 per device. See T04 notes for deep link. Deep-link reopen reloads the development session; use normal MainActivity foregrounding to test retained in-memory state.

Emulator: Medium_Phone_API_37.0 / emulator-5554, headless with SwiftShader. Local harnesses/screenshots remain ignored in .local and are not uploaded. UIAutomator can suppress TalkBack during inspection; active TalkBack checks use adb emu event mouse and screencap instead. Emulator accessibility and temporary notification permission were restored. Phone plugged-in stay-awake restored to 0; original ringer/media settings restored.

index.ts imports Expo runtime initialization but registers the native root directly, avoiding Expo's development always-awake wrapper. Preserve this distinction when testing wake behavior.

## Outstanding limits

Home-screen recovery, saved-group screens, full word banks and localization review, released APK, store submission, and physical Fold acceptance remain open. Dependency audit findings remain documented in T03-CHECKS.md (28 entries at T06: 1 low, 27 moderate). Full release security/device acceptance remains later work.

## Git handoff

Generated native directories, credentials, dependencies, and local diagnostics stay ignored.
