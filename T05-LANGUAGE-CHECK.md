# T05 language and RTL feasibility — 2026-11-12

Status: complete, with the native-dialog limitation and production remedy recorded below.

Added src/feasibility/LanguageScreen.tsx as the development entry screen. It is a bounded validation probe, not production game setup. Sample Arabic is Egyptian Arabic; final translation review remains T35.

## Verified on emulator and physical phone

Android 17/API 37 Medium Phone x86_64 emulator and Samsung Galaxy S23 Ultra SM-S918B:
- English interface/English word, English interface/Arabic word, Arabic interface/English word, Arabic interface/Arabic word.
- Word sample is Bicycle or عجلة; its writing direction follows word language independently of interface language.
- Interface controls reverse row order and Arabic text aligns right. Screenshots visually inspected after correcting initial inherited-direction/double-alignment behavior.
- Mixed-script name نور Alex ٢ retained intact through switches and navigation; native Arabic shaping and bidirectional display visually inspected.
- Forward and return navigation, including Android hardware Back, preserve name, reveal state, selected languages and confirmation count in memory.
- Arabic native Alert title/message/button labels render; confirming updates state, and switching back to English preserves the confirmation count.
- No process restart or native rebuild required for these app-owned layout switches. Existing development builds loaded the changes through Metro.

Local adb harness: .local/t05-device-check.cjs. It parses fresh UI hierarchies, taps controls, checks word/name text and row bounds, exercises navigation and dialog confirmation, and captures screenshots. Both device matrices passed. Repeated-run assertion was corrected to check a counter increment rather than a fixed counter value. Screenshots live in .local/t05-<serial>-<interface>-<word>.png and .local/t05-<serial>-dialog.png.

npm run check passed (format, lint, types; Jest still has no game behavior tests). Git whitespace check passed. Device integration harness provides the behavioral verification for this feasibility probe.

## Direction strategy and limitations

Use an explicit LTR layout boundary with per-row row/row-reverse and explicit textAlign/writingDirection derived from interface language. This avoids platform-wide I18nManager toggles, preserves React state, and avoids inherited RTL swapping explicit left/right alignment. Mixed-script names use automatic text direction. Apply this through shared directional components in T17 rather than scattering conditional styles throughout production screens.

React Native documents that I18nManager global direction changes require restart. The chosen local strategy avoids it for these app-owned controls; it does not establish behavior of future third-party navigation components, native pickers, or OS dialogs. Language/session persistence across process death is separate future storage work; the probe stores state in memory only.

Native Alert limitation observed on both devices: Arabic labels and content work, but title alignment/button arrangement and light/dark theme remain system/native-context controlled, rather than following the selected app language/style fully. Production remedy at T17: build a shared app-owned confirmation dialog with React Native Modal, explicit directional text/actions, Android Back/cancel handling, screen-reader focus, and selected theme. Revalidate it on both devices. Avoid relying on native Alert for language-sensitive product confirmations. System permission dialogs continue to follow Android's language.

Current screen is development-only; it is not a private-word lifecycle implementation and does not satisfy T07. Navigation here is a two-screen local state probe; final app navigation and RTL accessibility require later checks. Expo's floating development-menu control overlaps part of the heading in screenshots; it is development-client chrome.

## Next

T06: sound, vibration and screen-wake feasibility. Continue initial emulator testing and use the physical phone for actual sound/silent/vibrate behavior.

Sources:
- https://reactnative.dev/docs/i18nmanager
- https://docs.expo.dev/guides/localization/
