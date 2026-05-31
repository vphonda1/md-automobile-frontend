import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
    this.setState({ errorInfo });
  }

  copyDiagnostics = () => {
    const e = this.state.error;
    const text = `MD Automobile Error Report
================================
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Time: ${new Date().toISOString()}

Error Name: ${e?.name || '(none)'}
Error Message: ${e?.message || '(empty)'}
Error toString: ${String(e)}

Stack:
${e?.stack || '(no stack)'}

Component Stack:
${this.state.errorInfo?.componentStack || '(no component stack)'}

LocalStorage Keys: ${Object.keys(localStorage).join(', ')}
`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => alert('✅ Error details copied to clipboard! WhatsApp/email में paste करें'))
        .catch(() => alert(text));
    } else {
      alert(text);
    }
  };

  resetApp = async () => {
    if (!confirm('App पूरी तरह reset करें?')) return;
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      alert('✅ Reset complete!');
      setTimeout(() => window.location.href = '/login', 500);
    } catch (err) {
      alert('Reset error: ' + err.message);
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      const e = this.state.error;
      const componentStack = this.state.errorInfo?.componentStack || '';
      // Extract the LAST component name that's NOT a React-internal — that's likely the broken one
      const components = componentStack.split('\n')
        .map(s => s.trim())
        .filter(s => s.startsWith('at '))
        .map(s => s.replace(/^at /, '').split(' ')[0]);
      const culprit = components[0] || 'Unknown';

      return (
        <div style={{ minHeight: '100vh', background: '#020617', color: 'white', padding: '16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '40px' }}>⚠️</div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold' }}>App में Error</h1>
            </div>

            {/* The culprit component - MOST IMPORTANT */}
            <div style={{ background: '#dc2626', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>Probably broken component:</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{culprit}</div>
            </div>

            {/* Error message */}
            <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Error Message:</div>
              <div style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: '13px', wordBreak: 'break-word' }}>
                {e?.message || '(empty message)'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Type:</div>
              <div style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: '13px' }}>{e?.name || 'Error'}</div>
            </div>

            {/* Component Stack - shows WHERE the error happened */}
            {componentStack && (
              <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>📍 Component Stack (top = where error happened):</div>
                <pre style={{ fontSize: '10px', color: '#fde68a', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
                  {componentStack}
                </pre>
              </div>
            )}

            {/* JS Stack */}
            {e?.stack && (
              <details style={{ marginBottom: '12px', background: '#1e293b', padding: '8px', borderRadius: '8px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#94a3b8' }}>JS Stack Trace</summary>
                <pre style={{ fontSize: '9px', color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '6px' }}>
                  {e.stack}
                </pre>
              </details>
            )}

            {/* Buttons */}
            <div style={{ display: 'grid', gap: '8px' }}>
              <button onClick={this.copyDiagnostics}
                style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                📋 Copy Error Details (paste to share)
              </button>
              <button onClick={() => window.location.reload()}
                style={{ padding: '12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                🔄 Reload
              </button>
              <button onClick={this.resetApp}
                style={{ padding: '12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                🧹 Reset App (cache clear)
              </button>
              <button onClick={() => window.location.href = '/login'}
                style={{ padding: '12px', background: '#475569', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                🔑 Go to Login
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px', color: '#64748b' }}>
              📋 "Copy Error Details" दबा कर पूरा error message copy करें और WhatsApp/chat में भेजें
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
