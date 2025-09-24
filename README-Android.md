# Tutorly Math Tutor - Android Build Guide

## Prerequisites
- Node.js 18+ ✅ (You have 22.11.0)
- npm ✅ (You have 10.9.0)
- Java JDK 17+ ✅ (You have 23.0.1)
- Android Studio ✅ (Installed)
- Android SDK ✅ (Located at `/Users/hiroshigawa/Library/Android/sdk`)

## Environment Setup

Add these to your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
export ANDROID_HOME="/Users/hiroshigawa/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Then reload your shell: `source ~/.zshrc`

## Quick Build (Automated)

```bash
# Make the build script executable
chmod +x android-build.sh

# Run the automated build
./android-build.sh
```

## Manual Build Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the React app:**
   ```bash
   npm run build
   ```

3. **Add Android platform (first time only):**
   ```bash
   npx cap add android
   ```

4. **Sync web assets to Android:**
   ```bash
   npx cap sync android
   ```

5. **Open in Android Studio:**
   ```bash
   npx cap open android
   ```

6. **Build APK in Android Studio:**
   - Select `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - Or use terminal: `cd android && ./gradlew assembleDebug`

## Testing the APK

The debug APK will be generated at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## App Features on Mobile

✅ **Admin Panel** - Fully functional on tablets and phones
✅ **AI Chat** - Works with all configured AI models
✅ **Math Input** - Optimized for touch interfaces
✅ **Camera OCR** - Native camera integration for problem solving
✅ **Multi-language** - Full internationalization support
✅ **Gamification** - XP, coins, streaks system
✅ **Offline Ready** - Basic navigation works without internet

## Troubleshooting

- **Build fails:** Ensure ANDROID_HOME is set correctly
- **APK won't install:** Enable "Unknown sources" in Android settings
- **Camera not working:** Check camera permissions in Android settings
- **Math input issues:** The app uses optimized touch-friendly math input

## Production Deployment

For production APK:
1. Generate a signing key in Android Studio
2. Build signed APK: `./gradlew assembleRelease`
3. The signed APK will be ready for Google Play Store