# Stuwy staging mobile build

This checkout is the `parent` branch. The staging build targets Supabase
project `sibprjxhbxahouejygeu` at `https://sibprjxhbxahouejygeu.supabase.co`
using the publishable client key from the local environment. No service-role
key or seeded account is part of the build.

## Build inputs

```sh
VITE_SUPABASE_URL=https://sibprjxhbxahouejygeu.supabase.co \
VITE_AUTH_REDIRECT_URL=stuwy-staging://auth/callback \
VITE_AUTH_RESET_REDIRECT_URL=stuwy-staging://auth/callback \
npm run build
```

The app displays `STAGING · Supabase` whenever this project URL is active.
Signup remains the normal self-service flow; the build does not create or
import accounts.

## Android internal APK

The `staging` flavor has the separate identifier
`com.tutorly.learning.staging` and app name `Stuwy Staging`. Build with Java
21 (the Android toolchain in this checkout targets Java 21):

```sh
npx cap sync android
cd android
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
  ./gradlew assembleStagingDebug
```

If the native config has not been synced yet, run
`bash scripts/sync-staging-native.sh android` first. The script restores the
production Capacitor config when it exits.

Artifact:
`android/app/build/outputs/apk/staging/debug/app-staging-debug.apk`.

Install on an internal Android device with:

```sh
adb install -r android/app/build/outputs/apk/staging/debug/app-staging-debug.apk
```

For Google Play Internal Testing, build a signed `bundleStagingRelease` with
the organization’s upload key and upload that AAB to an internal-only track.
Do not use the production application ID or production track.

## iOS internal distribution

The staging Capacitor config uses app ID `com.tutorly.learning.staging` and
display name `Stuwy Staging`. `ios/App/Staging.xcconfig` contains the
build-only bundle/name overrides. The current checkout has no verified Apple
signing/export session, and the local Xcode build was blocked by the host’s
CoreSimulator/DerivedData permission service. A TestFlight build therefore
still requires an Apple Developer team, registered staging App ID, signing
certificate and provisioning profile. In Xcode, select the `App` scheme and
apply `ios/App/Staging.xcconfig` for the staging archive, then upload that archive to an internal TestFlight group
only. Never submit it to the production App Store track.

The reproducible archive command (with signing supplied by the operator) is:

```sh
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -xcconfig ios/App/Staging.xcconfig \
  -archivePath build/StuwyStaging.xcarchive archive
```

Before tester signup, the staging Supabase Auth URL allowlist must include the
staging web origin and `stuwy-staging://auth/callback`; confirmation and reset
templates must preserve `{{ .ConfirmationURL }}`. Those dashboard settings and
the real email/deep-link path were not changed or tested here.

## Acceptance flow for a newly registered tester

1. Install the staging build and create an account through the normal signup.
2. Complete email confirmation if staging Auth requires it.
3. Confirm the app opens `/family`, then open the mobile hamburger menu.
4. Confirm `Changer de profil` is visible, select each linked child, and
   verify the child data is isolated.
5. Return to the parent portal, enter the parent PIN, and verify that leaving
   parent mode relocks the portal.
6. Sign out and sign back in; confirm the chooser and linked profiles remain.

No real account was created or reset during this preparation.
