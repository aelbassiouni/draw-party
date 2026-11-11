# T06 feedback and screen-wake feasibility — 2026-11-12

Status: complete on Android 17 emulator and physical Galaxy S23 Ultra SM-S918B.

## Implementation

The development entry is src/feasibility/FeedbackScreen.tsx. It has a five-second countdown, independent sound/vibration switches, explicit pause/resume/reset, playback diagnostics and foreground/interruption handling. It is a feasibility probe, not the production timer/session controller.

Pinned expo-audio 58.0.12 and expo-keep-awake 58.0.4. Bundled assets/timeout-buzzer.wav is an original synthetic 440 Hz tone, 0.6 seconds, mono PCM. Its source/license notice is included. It downloads to a local asset before Start is enabled in the development client; export verification includes the WAV in the bundle for offline installed use.

Audio configuration explicitly disables playsInSilentMode, allowsRecording, allowsBackgroundRecording and shouldPlayInBackground. The expo-audio plugin disables recordAudioAndroid, microphonePermission, enableBackgroundRecording and enableBackgroundPlayback. Android blockedPermissions additionally excludes microphone and foreground-audio permissions. No microphone permission request is made.

Native source inspection confirmed this SDK's Android player checks AudioManager ringer mode before playback and observes ringer changes. No custom native audio adapter was needed for the tested matrix.

Wake is acquired only by a component mounted while the probe timer runs; pause, timeout and interruption unmount it. AppState change/Android blur freeze time, stop audio/vibration and require explicit resume. A generation token invalidates delayed seek/play work across pause/interruption. Sound-off pauses current playback and vibration-off cancels current vibration.

The Expo development wrapper normally keeps the screen awake. index.ts imports Expo for runtime/asset initialization, then registers the native root directly to avoid that wrapper during wake testing. This project currently targets native Android only. Retain runtime initialization if refactoring the root.

## Verified results

Both devices passed the following matrix with actual ringer-mode verification, timer completion, native playback/vibration observations, and wake released afterward:

| Case | Native playback | Vibration request |
| --- | --- | --- |
| Normal mode, switches on | Started | Recorded |
| Silent mode | Suppressed | Recorded |
| Vibrate mode | Suppressed | Recorded |
| Media volume zero | Starts at verified system volume 0 | Recorded |
| Sound switch off | Suppressed | Recorded |
| Vibration switch off | Started | No new request |

The user confirmed hearing the short buzzer and feeling vibration in the physical normal-mode test. Native playback-start events and Android vibration histories verify gating in other modes; a zero-volume player can still enter playing state while Android applies zero output volume. This does not claim microphone/acoustic measurement or tactile confirmation for every matrix row.

Both devices also passed: bundled audio ready; no idle wake; running holds the screen; pause releases wake; background releases wake and stops audio; returning through normal activity foregrounding preserves paused state and requires Resume; timeout releases wake. These checks inspect Android window hold-screen state; they do not change the user's screen-timeout preference or establish lock/unlock acceptance for T07.

Local adb harnesses and diagnostic artifacts are under ignored .local/t06-*. The initial media_session volume setter silently failed to change levels, so its zero-volume row was discarded. Corrected with cmd audio set-volume 3 0 and explicitly verified cmd media_session volume --stream 3 --get returned 0; reran zero-volume on both devices. Restored original NORMAL ringer modes and media levels (emulator 5/15; phone 8/15) with native volume control. Temporary switch changes reset to both on and the timer reset.

Harness timing was corrected to allow native wake flags to settle. Deep-link reopen reloads a development session, so the background-preservation check instead uses normal MainActivity foregrounding. Runtime initialization and local asset loading were verified after a full reload. Metro was restarted with a cleared cache after dependency installation.

## Artifact and code checks

- Combined x86_64/arm64-v8a debug APK built successfully and installed on emulator and phone.
- Merged manifest and packaged APK manifest contain no RECORD_AUDIO, audio FOREGROUND_SERVICE permissions, AudioControlsService, RecordingService or foregroundServiceType declarations. APK permission dump also verified absence of microphone permission. Debug tooling retains its unrelated development permissions; release permission inspection is still required later.
- npm run check passed. Jest still has no game behavior tests; device integration checks are the feasibility evidence.
- Final Android export succeeded and includes the bundled WAV. Git whitespace check passed.

## Remaining scope

Validate other supported OS versions and release artifacts later. This screen does not implement storage recovery or the full private-word lifecycle; those remain T07/T08 and subsequent game tasks. Production strings are to be externalized at T17, with final Egyptian Arabic review at T35. Existing dependency audit findings remain tracked in T03-CHECKS.md.

Next: T07 interruption handling and private-word hold gestures.

Sources consulted:
- https://docs.expo.dev/versions/latest/sdk/audio/
- https://docs.expo.dev/versions/latest/sdk/keep-awake/
- https://android.googlesource.com/platform/frameworks/base/+/HEAD/services/core/java/com/android/server/audio/AudioManagerShellCommand.java
