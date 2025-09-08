
import "./i18n"; // <-- Uncomment this line
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;"><div style="text-align: center;"><h1>App Error</h1><p>Could not find root element</p></div></div>';
} else {
  try {
    console.log('Starting app initialization...');
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error("Error rendering app:", error);
    rootElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;"><div style="text-align: center;"><h1>App Error</h1><p>Failed to initialize app</p><button onclick="window.location.reload()">Refresh</button></div></div>';
  }
}
