import { MathfieldElement } from 'mathlive';

// Configure MathLive globally to use local assets
MathfieldElement.fontsDirectory = '/mathlive/fonts';
MathfieldElement.soundsDirectory = '/mathlive/sounds';

// Enable sounds since we're using local assets
MathfieldElement.soundEnabled = true;

export { MathfieldElement }; 