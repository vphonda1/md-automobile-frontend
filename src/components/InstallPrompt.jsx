import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { ls } from '../utils/apiConfig';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS (iOS doesn't fire beforeinstallprompt, needs manual instructions)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Check if already running as installed PWA
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsInstalled(installed);

    // Skip if user dismissed within last 7 days
    const dismissedAt = ls.get('md_install_dismissed_at');
    if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    if (installed) return;

    // Listen for install prompt (Chrome / Edge / Android)
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS install help after 5 sec on iOS
    if (ios) {
      setTimeout(() => setShow(true), 5000);
    }

    // Hide if app gets installed
    window.addEventListener('appinstalled', () => {
      setShow(false);
      setIsInstalled(true);
      alert('✅ App install हो गया! Home screen पर देखें');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    ls.set('md_install_dismissed_at', Date.now());
  };

  if (!show || isInstalled) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:w-96 z-40 fade-in">
      <div className="card border-green-500 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg gradient-green">
            <Smartphone size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-green-400">📱 MD Automobile App</div>
            {isIOS ? (
              <div className="text-xs text-slate-300 mt-1 space-y-1">
                <div>iPhone में install करने के लिए:</div>
                <div>1. Safari में <span className="font-mono bg-slate-800 px-1 rounded">Share ⬆️</span> दबाएं</div>
                <div>2. <span className="font-mono bg-slate-800 px-1 rounded">Add to Home Screen</span> चुनें</div>
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-300 mt-1">Phone home screen पर install करें — फास्ट और offline support</div>
                <button onClick={handleInstall} className="btn btn-primary mt-2 flex items-center gap-1 text-sm">
                  <Download size={14} /> Install App
                </button>
              </>
            )}
          </div>
          <button onClick={dismiss} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
