#!/bin/bash

# iOS Build Script for Stuwy App
# This script builds the web app and syncs it to iOS

set -e

echo "🚀 Building iOS app..."

# Step 1: Build the web app
echo "📦 Building web assets..."
npm run build

# Step 2: Sync to iOS
echo "🔄 Syncing to iOS..."
npx cap sync ios

# Step 3: Open in Xcode
echo "🍎 Opening in Xcode..."
npx cap open ios

echo "✅ Done! Xcode should now be open."
echo ""
echo "📝 Next steps:"
echo "1. In Xcode, select your target device or simulator"
echo "2. Click the Play button or press Cmd+R to run"
echo "3. If you get signing errors, configure your Apple Developer account in Signing & Capabilities"
echo ""
echo "💡 Note: You may need to install CocoaPods first:"
echo "   sudo gem install cocoapods"
echo "   Then run: cd ios/App && pod install"

