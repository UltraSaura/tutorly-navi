

## Add Image Cropping Before Exercise Upload

### How it works today
When a user uploads a photo or captures one via camera, the raw `File` is immediately sent to the OCR pipeline (`handlePhotoUpload` → `chatFileHandlers.ts` → edge function). There is no intermediate step to select a region of the image.

### Proposed approach

Add a **crop dialog** that appears after image selection but before sending to OCR. The user draws a rectangle on the image to isolate the question(s) they want graded. The cropped region is then converted back to a `File` and sent through the existing pipeline unchanged.

**Library**: `react-cropper` (wraps Cropper.js) — lightweight, mobile-friendly, supports touch gestures for pinch-zoom and drag. Already well-suited for the 407px mobile viewport.

### Changes

**1. Install `react-cropper` + `cropperjs`**
- Add both as dependencies

**2. Create `src/components/user/chat/ImageCropDialog.tsx`**
- A dialog/sheet component that:
  - Receives the selected image as a blob URL
  - Renders a `<Cropper>` with free-aspect-ratio selection
  - Has "Crop & Send" and "Cancel" buttons
  - On confirm: extracts the cropped area via `canvas.toBlob()`, creates a new `File`, and calls the provided callback
  - On mobile, uses a bottom Sheet for better UX

**3. Update `src/components/user/chat/MessageInput.tsx`**
- After file selection in `onFileSelected` (for photos) and after camera capture in `handleCameraCapture`:
  - Instead of immediately calling `handlePhotoUpload(file)`, store the file in state and open the crop dialog
  - When the crop dialog confirms, call `handlePhotoUpload(croppedFile)`
  - Add a "Skip crop" option for users who want to send the full image
- For **PDF documents**, skip cropping (not applicable to binary docs)

**4. Flow**

```text
User taps "Upload Photo" / "Take Photo"
  → File selected / Camera captures
  → Crop dialog opens (image preview with draggable crop box)
  → User adjusts crop region
  → "Crop & Send" → cropped File created → handlePhotoUpload(croppedFile)
  → "Send Full Image" → handlePhotoUpload(originalFile)
  → "Cancel" → discard, return to chat
```

### Technical details

- Cropper outputs a `<canvas>` element; call `canvas.toBlob('image/jpeg', 0.9)` to get the cropped image
- Wrap in `new File([blob], originalFile.name, { type: 'image/jpeg' })` so the downstream pipeline sees a normal File
- The existing OCR pipeline needs zero changes — it receives a File/base64 either way
- Mobile touch: Cropper.js natively supports touch drag/pinch-zoom
- The crop dialog should be full-screen on mobile for maximum workspace

### Files affected

| File | Change |
|------|--------|
| `package.json` | Add `react-cropper`, `cropperjs` |
| `src/components/user/chat/ImageCropDialog.tsx` | New component |
| `src/components/user/chat/MessageInput.tsx` | Insert crop step before upload |

