# Draw Party

An offline, in-person drawing and guessing game launching on Android, with iPhone implementation deferred. Share one phone, draw on paper or a whiteboard, and guess aloud.

## Project status

Android feasibility implementation is underway using Expo/React Native and TypeScript. T01–T07 are complete; next is T08 SQLite persistence. Production gameplay has not been built.

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

## Next step

The first-release specification was approved on 2026-11-11. The implementation plan proposes Expo/React Native with TypeScript, SQLite, and Android 8+. Start task T01 (development-environment check), then follow the implementation backlog toward a native build on the user's Galaxy S23 Ultra running Android 17. iPhone implementation is deferred. Production implementation has not started. Approved review changes are recorded in the plan and backlog; physical Fold testing is blocked by unavailable hardware.

## Mobile starter

The Expo SDK 58 TypeScript starter now lives at the repository root. Run `npm ci`, `npm run android`, then `npm start`. See [scaffold verification](T02-SCAFFOLD.md) for versions, checks, and remaining acceptance. Next: T03 repeatable checks; device launch is T04.

## Project checks

Run `npm ci`, then `npm run check`. Individual commands: `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test`. Jest uses the Expo Android preset; no game behavior tests exist yet. GitHub Actions runs checks and an Android bundle export. See [T03 verification](T03-CHECKS.md). Next: T04 native phone build.

## Emulator testing

Native starter startup and cold restart/reconnection passed on the Android 17 emulator. See [native checkpoint](T04-NATIVE-CHECKPOINT.md) for commands and required local environment settings. Initial testing uses emulator; physical acceptance remains pending.

Physical S23 Ultra startup and cold-restart/Metro reconnection now pass as well. T04 is complete; next is T05 Arabic/RTL feasibility.

T05 language/RTL feasibility passed on emulator and S23 Ultra. The development entry now shows the validation screen. See [language check](T05-LANGUAGE-CHECK.md) for evidence and native-dialog limitations. Next: T06 sound/vibration/screen wake.

T06 feedback/wake feasibility passed on emulator and S23 Ultra. The current development entry is the feedback probe. See [feedback verification](T06-FEEDBACK-CHECK.md) for the matrix, restored device settings and APK inspection. Next: T07 interruptions/private-word gestures.

T07 touch/interruption and physical lock/unlock checks pass; TalkBack gesture verification remains open because the user cannot test it now. See [interruption check](T07-INTERRUPTION-CHECK.md). T08 SQLite feasibility can proceed independently.

T07 feasibility is now complete after agent-run active TalkBack emulator testing. Reveal/release/cancel passed; see the latest section in T07-INTERRUPTION-CHECK.md. Next: T08 SQLite.
