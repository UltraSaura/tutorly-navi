
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'

// Make sure the root element exists before trying to render
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Root element not found! The app can't render.");
} else {
  createRoot(rootElement).render(<App />);
}
