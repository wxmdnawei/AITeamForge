import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';

// --- CRITICAL POLYFILLS ---
// These must be set BEFORE any other modules (like PeerJS) are evaluated.
(window as any).Buffer = Buffer;
(window as any).global = window;
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: { NODE_ENV: 'production' } };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Dynamic import ensures App.tsx (and its dependencies) are loaded AFTER polyfills are active.
import('./App').then(({ default: App }) => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(err => {
  console.error("Failed to load application:", err);
  rootElement.innerText = "Error loading application. Please refresh.";
});