import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tutorly.learning',
  appName: 'Tutorly Learning',
  webDir: 'dist',
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      spinnerColor: '#999999'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
