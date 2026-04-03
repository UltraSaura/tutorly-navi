

## Fix: College-Level Students Still See Math Animations

### Root Cause

Two bugs in `src/utils/gradeLevelMapping.ts`:

1. **Accent mismatch**: The French level keys use accented characters (`6ème`, `5ème`, etc.) but the database stores values without accents (`6EME`, `5EME`, `3eme`). After `.toLowerCase()`, `"6eme"` never matches `"6ème"` — the lookup always fails.

2. **Dangerous default**: Line 100 falls back to `isUnder11: true` when no level matches. So any unrecognized level (including all college levels) incorrectly shows animations.

### Fix

**`src/utils/gradeLevelMapping.ts`** — Two changes:

1. Add non-accented variants to the French class map and also add the missing lycée levels:

```typescript
const frenchClassMap: Record<string, GradeLevelInfo> = {
  'cp': { ageRange: [6, 7], isUnder11: true, system: 'French' },
  'ce1': { ageRange: [7, 8], isUnder11: true, system: 'French' },
  'ce2': { ageRange: [8, 9], isUnder11: true, system: 'French' },
  'cm1': { ageRange: [9, 10], isUnder11: true, system: 'French' },
  'cm2': { ageRange: [10, 11], isUnder11: true, system: 'French' },
  '6eme': { ageRange: [11, 12], isUnder11: false, system: 'French' },
  '6ème': { ageRange: [11, 12], isUnder11: false, system: 'French' },
  '5eme': { ageRange: [12, 13], isUnder11: false, system: 'French' },
  '5ème': { ageRange: [12, 13], isUnder11: false, system: 'French' },
  '4eme': { ageRange: [13, 14], isUnder11: false, system: 'French' },
  '4ème': { ageRange: [13, 14], isUnder11: false, system: 'French' },
  '3eme': { ageRange: [14, 15], isUnder11: false, system: 'French' },
  '3ème': { ageRange: [14, 15], isUnder11: false, system: 'French' },
  '2nde': { ageRange: [15, 16], isUnder11: false, system: 'French' },
  '1ere': { ageRange: [16, 17], isUnder11: false, system: 'French' },
  'term': { ageRange: [17, 18], isUnder11: false, system: 'French' },
};
```

2. Change the default fallback (line 100) from `isUnder11: true` to `isUnder11: false`:

```typescript
// Default fallback - assume NOT under 11 if unclear (safer: no animations for unknown levels)
return { ageRange: [6, 18], isUnder11: false, system: 'Generic' };
```

### Why this works
- College levels (`6EME`, `5EME`, `4EME`, `3EME`) now correctly match and return `isUnder11: false` → no animation
- Lycée levels (`2NDE`, `1ERE`, `TERM`) also matched → no animation
- Primary levels (`CP`–`CM2`) still match → animation shown
- Unknown levels default to no animation (safer behavior)

One file, ~15 lines changed.

