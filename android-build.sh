#!/bin/bash

# Android Build Script for Tutorly Math Tutor

echo "🔧 Setting up Android environment..."

# Set Android environment variables (add these to your ~/.zshrc or ~/.bash_profile)
export ANDROID_HOME="/Users/hiroshigawa/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"

echo "📱 Building Android APK for Tutorly Math Tutor..."

# Step 1: Install dependencies
echo "Installing dependencies..."
npm install

# Step 2: Build the React app for production
echo "Building React app..."
npm run build

# Step 3: Initialize Capacitor (run only once)
if [ ! -f "capacitor.config.ts" ]; then
  echo "Initializing Capacitor..."
  npx cap init
fi

# Step 4: Add Android platform (run only once)
if [ ! -d "android" ]; then
  echo "Adding Android platform..."
  npx cap add android
fi

# Step 5: Sync web assets to Android
echo "Syncing web assets..."
npx cap sync android

# Step 6: Open Android project in Android Studio
echo "Opening in Android Studio..."
npx cap open android

echo "✅ Build complete! Next steps:"
echo "1. In Android Studio, select 'Build > Build Bundle(s) / APK(s) > Build APK(s)'"
echo "2. Or run: cd android && ./gradlew assembleDebug"
echo "3. Find the APK in: android/app/build/outputs/apk/debug/"