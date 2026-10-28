
import "./i18n";
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
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
  const showBootstrapError = (error: unknown) => {
    console.error("Error loading app:", error);
    const message = error instanceof Error ? error.message : String(error);
    rootElement.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a">
        <section style="max-width:520px;width:100%;padding:24px;border:1px solid #cbd5e1;border-radius:16px;background:#fff;box-shadow:0 8px 30px #0f172a14">
          <h1 style="margin:0 0 12px;font-size:22px">Stuwy n’a pas pu démarrer</h1>
          <p style="margin:0 0 16px;color:#475569">Actualisez la page. Si le problème persiste, partagez ce message avec le support.</p>
          <pre style="white-space:pre-wrap;overflow:auto;padding:12px;border-radius:10px;background:#f1f5f9;color:#334155;font-size:12px">${message.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] ?? char))}</pre>
          <button onclick="location.reload()" style="margin-top:16px;padding:10px 16px;border:0;border-radius:10px;background:#12c6a0;color:#042f2e;font-weight:600;cursor:pointer">Actualiser</button>
        </section>
      </main>`;
  };

  void import('./App.tsx')
    .then(({ default: App }) => createRoot(rootElement).render(<App />))
    .catch(showBootstrapError);
}
