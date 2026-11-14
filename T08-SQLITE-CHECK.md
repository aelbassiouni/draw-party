# T08 SQLite persistence check — 2026-11-15

## Result

Passed on the Android 17/API 37 x86_64 emulator. The production storage model remains T23–T26; this is a versioned feasibility sample.

- Installed `expo-sqlite` 58.0.16, the version listed for Expo SDK 58.
- Added `SampleSnapshotStore` as the only layer issuing SQL. The screen calls `open`, `read`, and `save` without SQL.
- The table stores a version column and JSON payload. Unknown versions and malformed payloads produce explicit read errors.
- `save` uses an exclusive SQLite transaction. An injected exception after the write caused rollback.

## Verification

- `npm run check`: format, ESLint, TypeScript, and three existing behavioral tests passed.
- Native x86_64 debug APK built and installed on emulator-5554.
- Initial launch showed “No saved snapshot” and “Empty.” Saved revision 1 with player `Ada / آدا` and 30,000 ms.
- Injected the post-write failure: screen reported `Injected failure after write`; reread still showed revision 1.
- Force-stopped `com.drawparty.dev`, relaunched through the development client, and observed “Restored saved snapshot” with revision 1 and the same fields.

The emulator had to launch outside the filesystem sandbox to access its user configuration. Gradle and Metro also ran outside the sandbox after sandboxed native build/file watching stalled or failed. No physical S23 SQLite check was performed; the task's native persistence behavior was observed on the emulator.

## Next

T09: resizable/foldable emulator and M0 closure. The development storage probe remains available under `src/feasibility`; T09 switched the app entry to the interruption/resize probe.
