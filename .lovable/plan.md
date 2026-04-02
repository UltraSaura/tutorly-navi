

## Fix: Registration Form Resets When Selecting Country

### Problem
When selecting a country during registration, `setLanguageFromCountry()` is called, which changes the language state. This triggers the translation loading effect in `SimpleLanguageContext`, which sets `isLoading = true`. The provider (line 437-443) renders a full-screen "Loading translations..." placeholder instead of its children, **unmounting the entire component tree** including the registration form. When translations finish loading, the form remounts fresh with `step` reset to `'login'`.

### Root cause
`SimpleLanguageContext.tsx` line 437-443 — the provider blocks rendering of all children while translations load:
```tsx
if (isLoading) {
  return <div>Loading translations...</div>;
}
```

### Fix (1 file)

**`src/context/SimpleLanguageContext.tsx`** — Stop unmounting children during translation reloads. Instead, always render children and only show the loading screen on the very first load (when no translations have been loaded yet).

Replace lines 437-443:
```tsx
if (isLoading && Object.keys(translations).length === 0) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading translations...</div>
    </div>
  );
}
```

This way:
- First page load with no cached translations: shows loading screen (correct)
- Language change mid-session (e.g., country selection): keeps children mounted, translations update seamlessly once loaded (form state preserved)

### Expected result
- User selects country during registration → language may change in background but form stays visible and form state is preserved
- No more unexpected "refresh" when filling out registration forms

