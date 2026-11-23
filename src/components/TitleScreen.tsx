import React, { useEffect } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  hasSavedCareer: boolean;
  savedLevel: number;
  savedWealth: number;
  onStart: () => void;
  onResetAndStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedCareer,
  savedLevel,
  savedWealth,
  onStart,
  onResetAndStart,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-none bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/65">
      {/* Top Lockup over calm negative space */}
      <div className="max-w-xl pointer-events-auto">
        <div className="flex items-center gap-3.5 mb-3">
          {/* Bespoke inline SVG Culinary Crown & Cloche emblem */}
          <svg
            width="52"
            height="52"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 drop-shadow-md"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="30" fill="#0F172A" stroke="#F59E0B" strokeWidth="2.5" />
            <path
              d="M16 40C16 29.5 23.2 22 32 22C40.8 22 48 29.5 48 40H16Z"
              fill="#F8FAFC"
            />
            <path d="M13 43H51V46.5C51 47.6 50.1 48.5 49 48.5H15C13.9 48.5 13 47.6 13 46.5V43Z" fill="#F59E0B" />
            <path d="M24 20L27 13L32 17L37 13L40 20H24Z" fill="#FBBF24" />
            <circle cx="32" cy="28" r="2.2" fill="#EA580C" />
          </svg>
          <div>
            <p className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
              3D Tycoon &amp; Life Simulator
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
              Restaurant Empire
            </h1>
          </div>
        </div>
        <p className="text-sm sm:text-base text-slate-200 max-w-md leading-relaxed">
          From street-food grill to culinary billionaire. Cook dishes by hand, hire your brigade,
          and upgrade your wardrobe, garage, and estate.
        </p>
      </div>

      {/* Bottom Primary Action & Single Flat Control Hint */}
      <div className="flex flex-col items-start sm:items-center gap-4 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-display font-bold text-lg shadow-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-5 h-5 fill-current" />
            {hasSavedCareer
              ? `Continue Career · Lv ${savedLevel} ($${savedWealth.toLocaleString()})`
              : 'Start Culinary Career'}
          </button>

          {hasSavedCareer && (
            <button
              onClick={onResetAndStart}
              className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              New Career
            </button>
          )}

          <PWAInstallButton variant="title" />
        </div>

        <p className="text-xs sm:text-sm text-slate-300 font-medium tracking-wide">
          WASD / Joystick Move · Tap Floor to Walk · E / Space Interact · Drag to Orbit · Esc Pause
        </p>
      </div>
    </div>
  );
};
