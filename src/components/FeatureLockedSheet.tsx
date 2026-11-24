import React from 'react';
import { Lock, X } from 'lucide-react';
import { FEATURE_UNLOCKS, FeatureId, getXpForNextLevel } from '../game/data';

interface FeatureLockedSheetProps {
  feature: FeatureId;
  restaurantLevel: number;
  xp: number;
  onClose: () => void;
}

/** Shown when a locked menu is tapped: what's inside and how far away it is. */
export const FeatureLockedSheet: React.FC<FeatureLockedSheetProps> = ({ feature, restaurantLevel, xp, onClose }) => {
  const f = FEATURE_UNLOCKS[feature];
  const levelsLeft = Math.max(0, f.level - restaurantLevel);
  const levelProgress = Math.min(1, xp / getXpForNextLevel(restaurantLevel));
  const overall = Math.min(1, (restaurantLevel - 1 + levelProgress) / Math.max(1, f.level - 1));
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 px-3"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))', paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${f.title} unlocks at level ${f.level}`}
    >
      <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl grayscale-[40%]" aria-hidden>
              {f.icon}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center">
                <Lock className="w-3 h-3 text-slate-950" strokeWidth={3} />
              </span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Unlocks at level {f.level}</p>
              <h3 className="font-display text-xl font-extrabold text-white leading-tight">{f.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">What you'll get</p>
        <ul className="mt-1.5 space-y-1.5">
          {f.perks.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-slate-200">
              <span className="text-emerald-400 font-bold">+</span>
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
            <span>You're level {restaurantLevel}</span>
            <span>
              {levelsLeft} level{levelsLeft === 1 ? '' : 's'} to go
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.round(overall * 100)}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Serve guests to earn XP and level up.</p>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-extrabold cursor-pointer">
          Got it
        </button>
      </div>
    </div>
  );
};
