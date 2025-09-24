
import "./i18n";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'mathlive/static.css'    // MathLive core CSS for proper rendering
import './styles/mathlive.css'  // Keep our custom keyboard styles

// Capacitor mobile setup
import { Capacitor } from '@capacitor/core';
import { setMobileViewport } from './lib/mobile-config';

// Set up mobile viewport if on mobile device
if (Capacitor.isNativePlatform()) {
  setMobileViewport();
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error("Error rendering app:", error);
  }
}
