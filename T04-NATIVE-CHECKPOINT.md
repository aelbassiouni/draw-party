# T04 emulator-first checkpoint — 2026-11-12

User directed initial testing to the emulator. Initial native starter testing passed. Physical S23 Ultra launch/reconnection acceptance remains pending.

## Verified

- ARM64 and x86_64 debug builds succeeded with Gradle 9.4.1 and OpenJDK 25.0.4. Toolchain: compile SDK 37, target 36, minimum 26, Build Tools 37.0.0, NDK 27.1.12297006.
- Medium_Phone_API_37.0 booted with WHPX acceleration, Android 17/API 37, x86_64, emulator-5554. Runs headlessly, no snapshots, SwiftShader graphics.
- Installed com.drawparty.dev, forwarded port 8081 with adb reverse, and launched the development-client deep link.
- Dismissed nearby-device permission and developer-menu introduction. Metro served the Android bundle. Fresh UI hierarchy confirmed Draw Party — development starter.
- Force-stop and cold relaunch reconnected and displayed the same starter text. An immediate transition-time hierarchy dump failed; repeated with a fresh filename after startup to exclude stale results.

## Local setup and recovery

C: filled during Gradle dependency downloads; the first build failed with insufficient disk space. H: had about 211 GB free. Copied Gradle wrapper/cache files to .local/android-build/gradle, preserving originals; active lock files were skipped. The redirected build succeeded. Copied AVD writable data to .local/android-build/avd. C: remains full; no unrelated files were deleted.

Metro status responded, but Android manifest requests timed out and the app stayed blank. Restarting Metro with EXPO_OFFLINE=1 made the same request return immediately and enabled startup. This is a development-server workaround. Direct HTTP manifest checks plus fresh emulator UI hierarchy provide the regression check; no production-code test was appropriate.

Set process variables before local commands:

```powershell
$env:GRADLE_USER_HOME = 'H:\Github\Pictionary_mobile\.local\android-build\gradle'
$env:TEMP = 'H:\Github\Pictionary_mobile\.local\android-build\temp'
$env:TMP = $env:TEMP
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'H:\Andriod_Studio'
$env:ANDROID_AVD_HOME = 'H:\Github\Pictionary_mobile\.local\android-build\avd'
$env:EXPO_OFFLINE = '1'
```

Build: android\gradlew.bat -p android :app:assembleDebug -PreactNativeArchitectures=x86_64 --console=plain

Start Metro: node node_modules/expo/bin/cli start --dev-client --localhost --port 8081

Install: adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk

Connect: adb -s emulator-5554 reverse tcp:8081 tcp:8081

Launch: adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "exp+draw-party://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" com.drawparty.dev

Use arm64-v8a when rebuilding for the physical phone. Each architecture build overwrites the APK output. Metro and emulator were left running for continued testing.

## Remaining acceptance

T02 starter-load acceptance is verified on emulator. T04 physical-device acceptance remains open: ARM APK installed, but physical starter rendering/reconnection was not verified. Continue initial feasibility checks on emulator per user preference; preserve physical sound/vibration/lifecycle and release checks. Minimum Android 8 runtime and physical Fold coverage remain unverified.

## Physical acceptance completed — 2026-11-12

T04 passed on Samsung Galaxy S23 Ultra SM-S918B, Android 17 (API 37 previously verified). Existing ARM64 development APK com.drawparty.dev launched through the development-client deep link with adb reverse tcp:8081 tcp:8081 and offline-mode Metro. Dismissed development menu; a fresh UI hierarchy confirmed the starter text. A second force-stop/cold launch reconnected and another fresh hierarchy confirmed the same text. Physical starter rendering and reconnection are now verified. Initial future tests can still use emulator as requested; hardware-specific checks remain separate tasks. Next: T05 Arabic/RTL feasibility.
