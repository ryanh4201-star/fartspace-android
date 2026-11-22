#!/bin/bash
# Copy the latest FartSpace website files into the Capacitor www/ folder
# and sync them into the Android project. Run from fartspace-android/.
set -e
cd "$(dirname "$0")"
SRC=~/workspace/fartspace-public
cp "$SRC/index.html" "$SRC/app.js" "$SRC/config.js" "$SRC/admin.html" \
   "$SRC/manifest.webmanifest" "$SRC/sw.js" www/
cp -r "$SRC/icons" www/
npx cap sync android
echo "Synced. Rebuild with: cd android && ./gradlew assembleDebug"
