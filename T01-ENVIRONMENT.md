# T01 development environment — 2026-11-11

Status: environment audit complete; native tooling and device verification remain prerequisites for T04.

- Windows PowerShell workspace: H:\Github\Pictionary_mobile.
- Node v24.18.0; npm 11.16.0. Use npm and a committed package-lock.json.
- npm registry returned HTTP 200 outside the sandbox. Sandboxed access failed through its proxy; dependency installation requires elevated execution in this session.
- java, adb and emulator were not found on PATH. ANDROID_HOME, ANDROID_SDK_ROOT and JAVA_HOME were not set.
- No Android SDK/Studio or Java installation was found in the standard LocalAppData Android, Program Files Android/Java locations checked. Nonstandard installations remain possible.
- CPU: AMD Ryzen 7 9800X3D. Firmware virtualization reports enabled. Windows reported SecondLevelAddressTranslationExtensions=False; emulator acceleration is not yet verified. Check actual emulator acceleration after SDK installation rather than inferring support from this field.
- Present-device inventory returned no Samsung/Galaxy/ADB/Android match. USB authorization and phone connectivity are unverified.

## Selected route

Use local Android development builds with Expo/React Native and TypeScript. Install Android Studio, its bundled compatible JDK, SDK platform/build tools, platform-tools and emulator before T04. This also supplies the emulator needed for adaptive-layout feasibility. Hosted EAS builds remain a fallback if local builds cannot be enabled; no Expo account or hosted credentials were inspected or assumed.

Expo SDK 58 is the current stable release according to the official October 15, 2026 announcement; it uses React Native 0.88. Its Node requirement on the 24 line is 24.3+, satisfied here. Select SDK 58 for scaffolding, then resolve and record exact dependency patches from the registry during T02. Verify its Android minimum and build-tool/JDK requirements before configuring the proposed Android 8 minimum; compatibility is not yet established.

Sources checked:
- https://expo.dev/changelog/sdk-58
- https://docs.expo.dev/get-started/create-a-project/
- https://docs.expo.dev/get-started/set-up-your-environment/?buildEnv=local&device=simulated&mode=development-build&platform=android

## Phone steps and later commands

User physical steps: enable Developer options and USB debugging on the S23 Ultra, connect a data-capable USB cable, and accept the computer RSA prompt. Actual OS remains user-reported Android 17 until adb verification.

After SDK setup, run adb devices -l. If missing, check cable and Samsung USB driver; if unauthorized, accept the phone prompt. Once connected, inspect adb shell getprop ro.build.version.release and adb shell getprop ro.product.model.

After T02 scaffolding and expo-dev-client installation, build with npx expo run:android --device, then reconnect using npx expo start --dev-client. For USB Metro connectivity use adb reverse tcp:8081 tcp:8081. Emulator setup must include an acceleration check and an actual boot; neither has passed yet.

## Next

T02 can scaffold the app with the available Node/npm tooling. Native build acceptance (T04) waits for Android tooling installation and phone authorization. No packages or system tools were installed in T01. Fold hardware remains unavailable.
