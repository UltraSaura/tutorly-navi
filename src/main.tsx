
import "./i18n"; // <-- add this import before rendering the app
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Make sure the root element exists before trying to render
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found! The app can't render.");
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error("Error rendering app:", error);
    // Fallback UI
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; font-family: system-ui;">
        <div style="text-align: center; max-width: 500px;">
          <h2 style="color: #dc2626; margin-bottom: 16px;">Application Error</h2>
          <p style="color: #6b7280; margin-bottom: 20px;">There was an error loading the application. Please check the console for more details.</p>
          <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
