#!/usr/bin/env bash
set -euo pipefail

# Capacitor 7 does not expose a --config flag for sync. Swap only for the
# duration of the sync and always restore the production config afterwards.
backup="$(mktemp)"
cp capacitor.config.ts "$backup"
restore() {
  cp "$backup" capacitor.config.ts
  rm -f "$backup"
}
trap restore EXIT

cp capacitor.config.staging.ts capacitor.config.ts
npx cap sync "${1:-android}"
