

## Add Mistral OCR to Document Processor

### Step 0: Add MISTRAL_API_KEY as Supabase Secret
The key you added in the admin UI is stored in the database — edge functions can't see it. I'll prompt you to add it as a Supabase secret so the edge function can access it via `Deno.env.get('MISTRAL_API_KEY')`.

### Step 1: Create `supabase/functions/document-processor/extractors/mistral.ts`
- Export `extractTextWithMistralOCR(fileData: string, fileType: string): Promise<string>`
- Strip data URL prefix, reconstruct as `data:<mime>;base64,...` for Mistral's `image_url` type
- Call `POST https://api.mistral.ai/v1/ocr` with:
  - `model: "mistral-ocr-latest"`
  - `document: { type: "image_url", image_url: "<data_url>" }`
  - `include_image_base64: false`
- Concatenate all `pages[].markdown` into structured text

### Step 2: Create `supabase/functions/document-processor/extractors/mathpix.ts`
- Stubbed provider — checks for `MATHPIX_APP_ID` / `MATHPIX_APP_KEY`, throws "not configured" if missing
- Ready for future activation

### Step 3: Update `supabase/functions/document-processor/extractors.ts`
- Import Mistral and MathPix extractors
- Reorder OCR chain:
  1. **Mistral OCR** (active, primary)
  2. **MathPix** (stubbed, falls through)
  3. **SimpleTex** (existing)
  4. **Google Vision** (existing)
  5. **Azure** (existing)
  6. **Emergency** (existing)

### No frontend changes needed
The existing Tutor upload flow calls `document-processor` already — only the backend OCR layer changes.

### Files

| File | Action |
|------|--------|
| `supabase/functions/document-processor/extractors/mistral.ts` | Create |
| `supabase/functions/document-processor/extractors/mathpix.ts` | Create |
| `supabase/functions/document-processor/extractors.ts` | Modify — new chain order |

