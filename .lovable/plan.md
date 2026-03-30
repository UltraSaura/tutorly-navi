
Goal: fix the Tutor upload flow so your worksheet image is handled as OCR exercises, not as a generic “Uploaded photo” chat card.

What I confirmed
- Yes: OCR is working and Mistral is being used.
- The edge-function logs show:
  - `🔮 Mistral OCR: Response received, pages: 1`
  - `✅ Mistral OCR succeeded with 262 characters`
  - the extracted text matches your worksheet (`a. 30/63 = 13/23`, `b. 35/85 = 7/17`, etc.)
- So the problem is not “Mistral not running”. The problem is what happens after OCR.

Root causes
1. Wrong post-OCR flow in `src/utils/chatFileHandlers.ts`
   - For photo uploads, when OCR succeeds, the code sends `processingResult.rawText` into the normal chat flow via `handleSendMessage(...)`.
   - That means the app ignores the extracted exercise list from OCR and treats the upload like a plain chat message.

2. Wrong pairing logic in `src/components/user/chat/AIResponse.tsx`
   - `AIResponse` pairs assistant replies with all user messages by index.
   - That includes the image placeholder message: `📷 Uploaded photo: homework SOLV.png`
   - Result: the visible card is built from the upload label instead of the OCR exercise text, which is exactly what your screenshot shows.

3. Exercise extraction is also producing bad math results
   - In `supabase/functions/document-processor/extraction/smartMathExtraction.ts`, RHS fractions like `13/23` and `7/17` are being treated as separate exercises.
   - `findHandwrittenAnswerNear(...)` is also too broad and can reuse the first found answer for multiple fractions.

4. Preprocessing removes worksheet structure
   - `minimalPreprocessing()` in `supabase/functions/document-processor/documentService.ts` collapses line breaks, which makes multi-exercise detection weaker than it should be.

Implementation plan
1. Keep the Mistral OCR extractor as-is
   - No change needed in `extractors/mistral.ts` unless extra logging is useful later.
   - Mistral is already functioning.

2. Preserve worksheet structure before extraction
   - Update `supabase/functions/document-processor/documentService.ts`
   - Keep line breaks and per-line structure instead of flattening the OCR result into one long line.
   - This will help the detector understand `a.`, `b.`, `c.` rows correctly.

3. Fix OCR math parsing so it extracts the right exercises
   - Update `supabase/functions/document-processor/extraction/multiExerciseDetector.ts`
     - correctly detect LaTeX/markdown rows like `a. \frac{30}{63} = \frac{13}{23}`
     - return 5 exercises for your image, not 0
   - Update `supabase/functions/document-processor/extraction/smartMathExtraction.ts`
     - only create exercises from left-hand fractions
     - do not turn solved RHS fractions into standalone exercises
     - only attach an answer if it belongs to that same labeled row
     - leave unanswered rows blank

4. Fix the Tutor upload flow to use OCR exercises directly
   - Update `src/utils/chatFileHandlers.ts`
   - For photo uploads, when OCR returns exercises:
     - use `processingResult.exercises`
     - add them to the exercise flow directly
     - show a success/summary message
   - Do not send raw OCR text through the generic chat path for this case

5. Harden exercise-card pairing in the Tutor UI
   - Update `src/components/user/chat/AIResponse.tsx`
   - Exclude `image` / `file` placeholder messages from exercise pairing
   - Pair assistant cards only with actual text exercise messages
   - This prevents “Uploaded photo: ...” from becoming the exercise title again

Expected result after fix
- Uploading your worksheet image will create the real math exercises instead of one fake “Uploaded photo” exercise card
- The same sample should resolve to:
  - a. Simplifiez la fraction 30/63 → answer `13/23`
  - b. Simplifiez la fraction 35/85 → answer `7/17`
  - c. Simplifiez la fraction 50/58 → blank
  - d. Simplifiez la fraction 48/92 → blank
  - e. Simplifiez la fraction 55/121 → blank

Files to update
- `src/utils/chatFileHandlers.ts`
- `src/components/user/chat/AIResponse.tsx`
- `supabase/functions/document-processor/documentService.ts`
- `supabase/functions/document-processor/extraction/multiExerciseDetector.ts`
- `supabase/functions/document-processor/extraction/smartMathExtraction.ts`

Verification
- Re-upload the same image
- Confirm Mistral still logs as the OCR provider
- Confirm 5 exercises appear
- Confirm the first visible card is not `Uploaded photo: ...`
- Confirm only the first two solved fractions are prefilled and the others remain empty
