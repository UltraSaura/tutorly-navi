import { CapacitorConfig } from '@capacitor/cli';

// Native staging identifiers intentionally differ from the production app so
// testers can install both builds without replacing the public app.
const config: CapacitorConfig = {
  appId: 'com.tutorly.learning.staging',
  appName: 'Stuwy Staging',
  webDir: 'dist',
  plugins: {
    Camera: { permissions: ['camera', 'photos'] },
    StatusBar: { style: 'default', backgroundColor: '#ffffff' },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      spinnerColor: '#999999',
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: { contentInset: 'automatic' },
};

export default config;
