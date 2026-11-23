import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'title' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'title' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
          variant === 'title'
            ? 'px-4 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm shadow-lg'
            : 'px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold'
        }`}
      >
        <Download className="w-4 h-4" />
        Install Android App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowGuide(true)}
          className={`inline-flex items-center gap-2 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            variant === 'title'
              ? 'px-4 py-3.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-100 text-sm'
              : 'px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Install App
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 p-5 shadow-2xl text-left">
              <h3 className="font-display text-lg font-bold text-white">Install on iPhone / iPad</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> icon in the Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Settings tab always shows an Android / Play Store packaging guide button if browser prompt isn't active yet
  if (variant === 'settings') {
    return (
      <>
        <button
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          Android Install Guide
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-950 border border-slate-700 p-5 shadow-2xl text-left space-y-3">
              <h3 className="font-display text-lg font-bold text-white">
                Install on Android / Build .APK
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Option 1 (Instant on Android Chrome):</strong> Open the Shared App URL in
                Chrome on Android and tap <strong>Menu ⋮ → Install app</strong> to play fullscreen
                offline.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>Option 2 (Google Play Store .APK / .AAB):</strong> Export the project files
                and run <code className="text-amber-300">npx cap add android</code> using the
                included <code className="text-amber-300">capacitor.config.ts</code>, or package the
                PWA URL with <strong>PWABuilder.com</strong> / Google <strong>Bubblewrap</strong>.
              </p>
              <button
                onClick={() => setShowGuide(false)}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
