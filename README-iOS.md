# iOS Setup Guide

## Requirements

- macOS
- Xcode (available from the App Store)
- Node.js and npm
- Capacitor CLI

## First Time Setup

### 1. Install CocoaPods (if not already installed)

```bash
sudo gem install cocoapods
```

### 2. Install iOS dependencies

```bash
cd ios/App
pod install
cd ../..
```

### 3. Open in Xcode

You can either use the build script:
```bash
./ios-build.sh
```

Or manually:
```bash
npm run build
npx cap sync ios
npx cap open ios
```

## Building and Running

### Development Build

1. Open Xcode: `npx cap open ios` or use the `./ios-build.sh` script
2. In Xcode:
   - Select a simulator or device in the top bar
   - Click the Play button or press `Cmd+R`
3. If prompted, sign in with your Apple ID

### Updating After Code Changes

When you make changes to the React/TypeScript code:

```bash
# Quick rebuild
./ios-build.sh

# Or manual steps:
npm run build
npx cap sync ios
# Then rebuild in Xcode
```

## Troubleshooting

### "No such file or directory: Podfile"

Run:
```bash
cd ios/App
pod install
```

### Signing Issues

1. In Xcode, select the project
2. Go to "Signing & Capabilities"
3. Select your team
4. For development, you can use a personal Apple ID

### Web assets not updating

Make sure you run:
```bash
npm run build
npx cap sync ios
```

Before rebuilding in Xcode.

### Clear Cache

If you encounter strange issues:
```bash
# Clean build
npm run build
npx cap sync ios

# In Xcode: Product -> Clean Build Folder (Cmd+Shift+K)
```

## File Structure

```
ios/
├── App/
│   ├── App/              # Main app code
│   ├── App.xcodeproj/    # Xcode project
│   ├── App.xcworkspace/  # Xcode workspace (use this to open!)
│   └── Podfile           # CocoaPods dependencies
└── capacitor-cordova-ios-plugins/
```

## Notes

- Always open `App.xcworkspace`, not `App.xcodeproj`
- The iOS app uses the `dist/` folder for web assets
- After syncing with `npx cap sync ios`, rebuild the app in Xcode

