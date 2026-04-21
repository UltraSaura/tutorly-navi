

## Goal
Make three large libraries load only when needed:
1. **Tesseract.js** — dead dependency, remove from `package.json`.
2. **MathLive** — already dynamic in two components; finish the job by lazy-loading the input shell and deleting unused eager-import files.
3. **cropperjs / react-cropper** — convert `ImageCropDialog` to a `React.lazy` chunk so the cropper only loads when the dialog opens.

No behavior changes — only when code loads.

## Audit findings (important)

- **Tesseract.js**: declared in `package.json` but **zero source imports** anywhere. It's not loaded today; it just sits in `node_modules` and (depending on tree-shaking) is excluded from the bundle. Cleanest fix: remove it from `package.json`. If you actually plan to use it later, we'd add it back behind a dynamic import at that time.
- **react-mathlive**: not in `package.json`. Nothing to do.
- **MathLive**:
  - `MathLiveInput.tsx` and `MathRenderer.tsx` already do `await import('mathlive')` inside `useEffect`. The mathlive module itself is already a separate chunk for them.
  - **Dead files with eager `import { MathfieldElement } from 'mathlive'`** (zero importers, contribute nothing):
    - `src/lib/mathlive-config.ts`
    - `src/components/common/MathInput.tsx`
  - Type-only imports (`import type { MathfieldElement }`) in `useMathField.ts`, `ChatMathField.tsx`, `ChatInput.tsx` are erased at compile time — leave alone.
  - The `MathLiveInput` **component shell** (~270 lines of React code wrapping the dynamic mathlive load) is bundled eagerly via `MessageInput.tsx` and `Exercise.tsx`. Wrapping it in `React.lazy` keeps that shell out of the main chunk too.
- **react-cropper / cropperjs**: `ImageCropDialog.tsx` imports `Cropper` and `cropperjs/dist/cropper.css` at module top, and is statically imported by `MessageInput.tsx`. Both ship in the chat bundle even when the user never opens the crop UI.

## Changes

### 1. Tesseract — remove dead dependency
- **Edit `package.json`**: remove `"tesseract.js": "^6.0.1"` from `dependencies`.
- Lockfiles (`bun.lock`, `package-lock.json`) update on next install.

### 2. MathLive — finish lazy-loading

**Delete dead files** (zero importers, eager-load mathlive):
- `src/lib/mathlive-config.ts`
- `src/components/common/MathInput.tsx`

**Lazy-load the `MathLiveInput` component shell**:
- Update `src/components/math/index.ts` to export a lazy version:
  ```ts
  import { lazy } from 'react';
  export const MathLiveInput = lazy(() =>
    import('./MathLiveInput').then(m => ({ default: m.MathLiveInput }))
  );
  export { MathRenderer } from './MathRenderer';
  export { MathInputToggle } from './MathInputToggle';
  ```
- Update `MathLiveInput.tsx` to `export default MathLiveInput` (in addition to the named export, for the lazy import).
- Wrap the two `<MathLiveInput>` usages in `<Suspense>`:
  - `src/components/user/chat/MessageInput.tsx` (used inside `isMathMode` branch)
  - `src/components/user/chat/Exercise.tsx` (used inside `isMathMode` branch)
  - Fallback: a minimal placeholder matching the input height, e.g.
    ```tsx
    <Suspense fallback={<div className="min-h-[40px] rounded-md border border-input bg-background animate-pulse" />}>
      <MathLiveInput ... />
    </Suspense>
    ```

**Leave `MathRenderer` as a normal export.** It's used in 6+ places (Message, ExplanationTwoCards, Exercise, ExerciseHistoryPage, guardian ExerciseResultCard, etc.). Wrapping it in `React.lazy` would force Suspense boundaries everywhere with no real win — `MathRenderer.tsx` itself is tiny (~90 lines) and the actual heavy `mathlive` module is **already** loaded via `await import('mathlive')` inside its effect. The big chunk is already split; lazy-loading the shell would add complexity for negligible bytes.

### 3. cropperjs / react-cropper — lazy `ImageCropDialog`

In `src/components/user/chat/MessageInput.tsx`:
- Replace static import `import ImageCropDialog from './ImageCropDialog';` with:
  ```tsx
  const ImageCropDialog = lazy(() => import('./ImageCropDialog'));
  ```
- Render it inside `<Suspense fallback={null}>`. Since the dialog is only mounted when `isCropOpen` is true, the chunk fetch starts the moment a user picks/captures an image — exactly when needed.
- `ImageCropDialog.tsx` itself stays unchanged: it remains the only place that imports `react-cropper` + `cropperjs/dist/cropper.css`, so both packages now live in their own lazy chunk.

### 4. Vite chunking note
The existing `manualChunks` in `vite.config.ts` doesn't list cropper or tesseract, so Vite will automatically place the lazy `ImageCropDialog` and its cropper deps in their own dynamic chunk. No vite config edit required for this task.

## Files touched

- **Delete**: `src/lib/mathlive-config.ts`, `src/components/common/MathInput.tsx`
- **Edit**: `package.json` (drop `tesseract.js`)
- **Edit**: `src/components/math/index.ts` (lazy MathLiveInput export)
- **Edit**: `src/components/math/MathLiveInput.tsx` (add `default` export)
- **Edit**: `src/components/user/chat/MessageInput.tsx` (lazy `ImageCropDialog`, Suspense around `MathLiveInput`)
- **Edit**: `src/components/user/chat/Exercise.tsx` (Suspense around `MathLiveInput`)

No DB, no edge function, no behavior changes, no API changes.

