import React from 'react';
import ReactDOM from 'react-dom/client';

// Helper to wait for critical polyfills (Buffer, process, global) to be attached to window
// This prevents PeerJS from crashing by accessing globals before they are ready.
const waitForPolyfills = () => {
  return new Promise<void>((resolve) => {
    // Check if polyfills are already present
    if ((window as any).Buffer && (window as any).process && (window as any).global) {
      resolve();
      return;
    }
    
    // Poll for polyfills (usually takes <50ms)
    const interval = setInterval(() => {
      if ((window as any).Buffer && (window as any).process && (window as any).global) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });
};

// Initialize App only after environment is patched
waitForPolyfills().then(async () => {
  // Dynamically import App to ensure it (and its dependencies like PeerJS) 
  // loads AFTER polyfills are confirmed ready.
  const { default: App } = await import('./App');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});