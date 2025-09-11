
import "./i18n";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'mathlive/static.css'    // MathLive core CSS for proper rendering
import './styles/mathlive.css'  // Keep our custom keyboard styles

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
