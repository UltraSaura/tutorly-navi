import { MathfieldElement } from 'mathlive';
import { Capacitor } from '@capacitor/core';

// Configure MathLive globally to use local assets
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = '/mathlive/sounds';

// Enable sounds only on web (disable on mobile to avoid audio issues)
(MathfieldElement as any).soundEnabled = !Capacitor.isNativePlatform();

export { MathfieldElement };