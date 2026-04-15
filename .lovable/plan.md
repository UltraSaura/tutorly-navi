

## Plan: Add Missing `nav.learning` Translation Key

### Problem
The "Learning" tab in the mobile bottom navigation shows the raw key `nav.learning` instead of a translated label. This key exists in `src/locales/*/common.json` (SimpleLanguageContext) but is **missing** from `src/i18n/locales/*/common.json` (i18next), which is what `MobileBottomTabs` actually uses via `useTranslation()`.

### Fix

**File 1: `src/i18n/locales/en/common.json`**
Add after line 16 (`"nav.support": "Support",`):
```json
"nav.learning": "Learning",
```

**File 2: `src/i18n/locales/fr/common.json`**
Add after line 16 (`"nav.support": "Support",`):
```json
"nav.learning": "Apprentissage",
```

### That's it
One missing key in two files. No other changes needed.

