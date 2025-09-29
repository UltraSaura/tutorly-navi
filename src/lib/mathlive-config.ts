import { MathfieldElement } from 'mathlive';
import { Capacitor } from '@capacitor/core';

// Configure MathLive globally to use local assets
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = '/mathlive/sounds';

// Enable sounds only on web (disable on mobile to avoid audio issues)
(MathfieldElement as any).soundEnabled = !Capacitor.isNativePlatform();

// Disable virtual keyboards on all platforms for better mobile experience
(MathfieldElement as any).defaultOptions = {
  virtualKeyboardPolicy: 'manual',
  virtualKeyboards: 'none'
};

// Configure global settings to prevent virtual keyboard on mobile
if (Capacitor.isNativePlatform()) {
  // On mobile platforms, completely disable virtual keyboards
  (MathfieldElement as any).virtualKeyboardPolicy = 'manual';
  (MathfieldElement as any).virtualKeyboards = 'none';
}

export { MathfieldElement };