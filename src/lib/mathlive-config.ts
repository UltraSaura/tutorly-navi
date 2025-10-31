import { MathfieldElement } from 'mathlive';
import { Capacitor } from '@capacitor/core';

// Configure MathLive globally to use local assets
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = '/mathlive/sounds';

// Enable sounds only on web (disable on mobile to avoid audio issues)
(MathfieldElement as any).soundEnabled = !Capacitor.isNativePlatform();

// Configure virtual keyboards for layout-aware behavior
(MathfieldElement as any).defaultOptions = {
  virtualKeyboardPolicy: 'auto',
  virtualKeyboards: 'all'
};

// Configure virtual keyboard for all platforms to enable layout-aware behavior
if (Capacitor.isNativePlatform()) {
  // On mobile platforms, allow virtual keyboards but with proper layout handling
  (MathfieldElement as any).virtualKeyboardPolicy = 'auto';
  (MathfieldElement as any).virtualKeyboards = 'all';
}

export { MathfieldElement };