# T09 resizing and M0 closure — 2026-11-15

## Result

Passed the resizable-emulator feasibility check on Android 17/API 37, emulator-5554. The emulator has a phone AVD rather than a hinge profile; Android `wm size` changes exercised compact, wide portrait, and wide landscape configurations. Physical Fold acceptance remains T40.

The interruption probe now reports viewport dimensions in logical pixels and arranges the sample timer beside turn information when width reaches 600 dp. The `TurnProbe` instance is created once per mounted screen and is independent of viewport dimensions. The same AppState/blur handling from T07 pauses hidden transitions.

## Observed sequence

- Original 1080×2400 physical-pixel viewport rendered at 411×914 dp, compact portrait.
- Resized to 1800×2200 physical pixels: 686×838 dp, wide portrait.
- Started a 30,000 ms sample turn. Resized back to 1080×2400; the screen remained **Running** with 22,000 ms, hidden word, and the same sample turn label.
- Resized to 2400×1080: 914×411 dp, wide landscape. It remained **Running**, reached 13,000 ms, and kept the word hidden. The short viewport scrolls to reach lower controls; final layout polish belongs to T39.
- Restored 1080×2400. Reset and started a new turn, pressed Home, and brought the existing MainActivity forward. It returned **Paused** at 29,928 ms, with the word hidden and an explicit Start / Resume action available.
- Restored the emulator's original 1080×2400 size after the check.
- `npm run check` passed: formatting, lint, strict TypeScript, and three behavioral tests.

## M0 findings and tracked remedies

- Native Android startup/reconnection on emulator and S23 Ultra: T04 passed.
- Interface/word language combinations and RTL layout feasibility: T05 passed. Native Alert alignment/theme is system-owned; T17 will use app-owned directional confirmations.
- Audio, vibration, wake control, and permission inspection: T06 passed. Final controls and artifact checks remain T41.
- Monotonic clock, hidden-word gesture, background/blur, lock, and active TalkBack feasibility: T07 passed. Private nonvisual word access remains T17/T42.
- SQLite snapshot recovery and transaction rollback: T08 passed on the emulator. Production persistence remains T23–T26.
- Visible viewport changes and hidden transition behavior: T09 passed on the resizable emulator. Full adaptive composition remains T39.

For production, derive layout from live window dimensions, keep session and clock state outside the layout subtree, and pause only on actual visibility loss or explicit action. The proposed orientation policy is portrait on phones and cover screens, with portrait/landscape on unfolded screens. Dimensions alone cannot reliably identify a physical fold posture. T39 should test the policy with emulator configurations; T40 must verify real Fold hinge/lifecycle behavior and decide whether a native fold-state adapter is necessary. No physical Fold is available, so T40 stays blocked and full release acceptance remains open.

## Next

M1 can begin with T10 setup validation. The app entry is the development interruption/resize probe, not production gameplay.
