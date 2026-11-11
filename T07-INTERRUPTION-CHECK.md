# T07 interruption and private-word feasibility — 2026-11-12

Status: complete as a feasibility checkpoint. Agent-run active-TalkBack gesture checks passed on the emulator; ordinary-touch/lifecycle checks passed on emulator and phone, and the user confirmed physical lock/unlock.

## Implementation

Current development entry: src/feasibility/InterruptionScreen.tsx. It uses src/platform/turn-probe.ts with an injected performance.now clock. Remaining time derives from a deadline rather than counting render ticks. Pause/interruption freezes the exact remaining time; foreground/focus never resumes automatically. The private word is stable within this in-memory probe.

The hold button uses standard Pressable accessibility semantics and reveals only while running, hides on release/termination/touch cancellation, and latches hidden when a move leaves its bounds. Moving back does not reveal again until a fresh press. Android blur and AppState background/inactive hide and pause. Timer expiry also hides. Wake is active only while running. No recent-apps-preview protection was added.

The display refreshes every 1.5 seconds to allow Android UI hierarchy inspection to settle; a separate deadline timeout handles expiry. This diagnostic cadence is not a production timer design. State is in memory; process-death recovery is T08 and subsequent persistence work.

## Automated evidence

Emulator: Medium Phone Android 17/API 37 x86_64. Physical: Galaxy S23 Ultra SM-S918B, Android 17/API 37.

Both devices passed:
- Hold reveals; release hides; timer continues while held.
- Moving outside the control hides; moving back inside does not reveal.
- Opening the notification shade while holding pauses and hides; collapsing it leaves time frozen.
- Home/background cancels reveal and pauses; normal activity foregrounding retains the frozen time.
- Elapsed background time is excluded, and explicit Resume advances time again.

Emulator additionally passed sleep/wake recovery and expiry while held. Fresh UI hierarchies confirmed paused/hidden state after wake and expiry. The held-word screenshot was visually inspected. Local adb harnesses and captures are in ignored .local/t07-*.

Jest: three behavioral tests pass, covering elapsed-clock accounting, explicit resume/fresh gesture after interruption, and hide behavior on release/leave/pause/expiry. The empty-suite allowance was removed from npm test now that behavioral tests exist. npm run check, Android bundle export, and git whitespace checks passed.

Probe focus initialization was corrected for development refresh. The drag-out injection was corrected to stay inside the app window; moving into the OS status bar is tested separately through actual shade opening. Native UI inspection cannot obtain an idle hierarchy while a millisecond label changes continuously, so diagnostic display cadence was slowed without changing clock accounting.

## Accessibility findings and remaining checks

The hold control has a button role and a TalkBack double-tap-and-hold hint. The secret text is excluded from the accessibility tree to avoid involuntarily speaking it to the group. This visual-only reveal does not provide a word-reading path for a blind drawer; an intentional private audio/headphone interaction or another user-approved accessible alternative must be designed before the final control. Do not add a sticky reveal toggle as an implicit workaround.

TalkBack was temporarily enabled on the emulator; Android reported the service bound and touch exploration enabled. First-run notification UI intervened, and the probe's reader-status indicator did not reliably reflect that setup. ADB-injected touch checks are not a substitute for genuine screen-reader gesture validation. Hands-on physical TalkBack verification was requested. Do not claim screen-reader acceptance until its result is recorded.

Emulator accessibility state was restored (no enabled services, accessibility disabled; temporary TalkBack notification permission revoked). Phone plugged-in stay-awake was temporarily enabled for the test session; original stay_on_while_plugged_in was 0 and must be restored after manual checks.

Sources:
- https://reactnative.dev/docs/appstate
- https://reactnative.dev/docs/accessibility

Next independent milestone task: T08 SQLite feasibility. T07 completion waits for the pending physical results or a recorded explicit accessibility feasibility limitation/remedy.

Physical lock/unlock result: user confirmed Paused, Word hidden, and frozen remaining time until explicit Resume on the S23 Ultra.

Final handoff: user cannot test TalkBack now. No TalkBack gesture pass is claimed. Retain this explicit verification gap and the private screen-reader word-access design decision before the final production control. Temporary phone stay-awake restored to its original 0; emulator enabled accessibility services restored to null and accessibility_enabled to 0. Next independent task is T08.

## Agent-run TalkBack acceptance completed

The user delegated accessibility testing to the agent and does not want to perform it manually. Treat prior pending/verification-unavailable notes above as investigation history, superseded by this result. Do not request manual TalkBack testing again merely to repeat these checks.

The earlier inspection method was invalid for active TalkBack: Android UIAutomator sessions can suppress accessibility services. The agent instead used emulator console hardware touchscreen input (adb emu event mouse) and screencap, without UIAutomator during the screen-reader runs. Android dumpsys confirmed TalkBack bound and touch exploration enabled; the app reported TalkBack on and screenshots showed its green focus outline. A single tap focused a normal button; double tap activated it, demonstrating the screen reader was handling gestures.

The control now uses Pressable with standard click/long-click semantics, while reveal is tied to touch start/end/cancel and boundary checks; accessibility click alone does not latch reveal. Reliable tested navigation was swipe-right from Start to Pause and then the hold button. Initial direct-touch exploration attempts did not establish hold-button focus, so no claim is made that those attempts passed.

With TalkBack focus on the enabled control, hardware double-tap-and-hold revealed Bicycle / عجلة; release hid it. A second run showed drag-out hides and moving back does not reveal again. Screenshots visually verified: .local/tb-focused-held.png, .local/tb-focused-held-released.png, .local/tb-cancel.png, .local/tb-cancel-outside.png, .local/tb-cancel-returned.png. Helper scripts are .local/tb-hardware.cjs and .local/tb-swipe.cjs. These checks required no user interaction.

After restoring accessibility settings, the full ordinary-touch, drag-out, notification blur, Home/background, frozen-time and explicit-resume emulator regression passed with the new Pressable. npm run check passes all three tests. Physical ordinary-touch/lifecycle results above were obtained before the wrapper change; active TalkBack acceptance here is emulator coverage, not a physical TalkBack claim. Emulator enabled services restored to null and accessibility_enabled to 0; temporary notification permission revoked. Phone settings were left at their restored defaults.

The private nonvisual word-reading interaction remains a production design requirement at T17: this probe intentionally does not speak the secret word to the group. The feasibility result verifies TalkBack-compatible hold/release/cancel mechanics, not complete accessibility of the finished game.
