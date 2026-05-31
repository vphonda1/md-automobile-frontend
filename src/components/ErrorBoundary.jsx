import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  resetApp = async () => {
    if (!confirm('App पूरी तरह reset करें?\n\nयह करेगा:\n• सब cached data clear\n• Service worker remove\n• Login data clear\n\nफिर page reload होगा।')) return;

    try {
      // Clear localStorage
      localStorage.clear();
      sessionStorage.clear();

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      // Clear all caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      alert('✅ Reset complete! अब page reload होगा...');
      setTimeout(() => window.location.href = '/', 500);
    } catch (err) {
      alert('Reset error: ' + err.message + '\n\nManually reload करके देखें।');
      window.location.reload();
    }
  };

  hardReload = () => {
    // Force reload bypassing cache
    window.location.reload(true);
  };

  render() {
    if (this.state.error) {
      const errMsg = this.state.error?.message || String(this.state.error) || 'Unknown error';
      const stack = this.state.error?.stack || '';

      return (
        <div style={{ minHeight: '100vh', background: '#020617', color: 'white', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '500px', width: '100%', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
            <div style={{ textAlign: 'center', fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
            <h1 style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>कुछ गलत हो गया</h1>

            <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ color: '#fca5a5', fontSize: '14px', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {errMsg}
              </div>
            </div>

            {stack && (
              <details style={{ marginBottom: '16px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#94a3b8' }}>
                  Technical details देखें
                </summary>
                <pre style={{ fontSize: '10px', background: '#020617', padding: '8px', borderRadius: '4px', marginTop: '8px', overflowX: 'auto', maxHeight: '200px', color: '#94a3b8' }}>
                  {stack}
                </pre>
              </details>
            )}

            <div style={{ background: '#422006', border: '1px solid #ca8a04', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#fde68a' }}>
              <b>💡 Suggested fix order:</b><br/>
              1. पहले "Hard Reload" try करें<br/>
              2. नहीं चले तो "Reset App" से सब clear करें<br/>
              3. फिर भी error हो तो screenshot लेकर भेजें
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={this.hardReload}
                style={{ width: '100%', padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                🔄 Hard Reload (पहले try करें)
              </button>
              <button onClick={this.resetApp}
                style={{ width: '100%', padding: '12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                🧹 Reset App (सब cache clear)
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#64748b' }}>
              MD Automobile • Error caught by ErrorBoundary
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
