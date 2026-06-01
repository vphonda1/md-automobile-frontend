import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Show visible diagnostic if anything fails
const showError = (title, details) => {
  const root = document.getElementById('root') || document.body;
  root.innerHTML = `
    <div style="padding:20px;color:white;background:#020617;min-height:100vh;font-family:sans-serif;line-height:1.5">
      <h1 style="color:#ef4444">⚠️ ${title}</h1>
      <pre style="background:#1e293b;padding:12px;border-radius:8px;color:#fca5a5;white-space:pre-wrap;word-break:break-word;font-size:13px">${details}</pre>
      <button onclick="window.location.reload()" style="padding:12px 20px;background:#16a34a;color:white;border:none;border-radius:8px;font-weight:bold;margin-top:12px;cursor:pointer">🔄 Reload</button>
      <button onclick="(async()=>{try{const r=await navigator.serviceWorker.getRegistrations();await Promise.all(r.map(x=>x.unregister()));const k=await caches.keys();await Promise.all(k.map(c=>caches.delete(c)));localStorage.clear();alert('Cleaned');window.location.reload(true)}catch(e){alert('Error: '+e.message)}})()" style="padding:12px 20px;background:#dc2626;color:white;border:none;border-radius:8px;font-weight:bold;margin-top:12px;margin-left:8px;cursor:pointer">🧹 Reset</button>
    </div>
  `;
};

// AGGRESSIVELY clean up any stale service workers and caches before mounting
(async () => {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length > 0) {
        await Promise.all(regs.map(r => r.unregister()));
        console.log('[Main] Unregistered', regs.length, 'service worker(s)');
      }
    }
  } catch (e) {
    console.warn('[Main] SW cleanup error:', e);
  }
})();

// Global error logging
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
});

// Mount React
try {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    showError('#root element missing', 'index.html में <div id="root"></div> नहीं है');
  } else {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<App />);
    console.log('[Main] React mounted successfully');
  }
} catch (err) {
  console.error('[Main] React mount failed:', err);
  showError('React Mount Failed', String(err?.stack || err?.message || err));
}
