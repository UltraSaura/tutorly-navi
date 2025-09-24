import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.tutorly',
  appName: 'Tutorly Math Tutor',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
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
  }
};

export default config;