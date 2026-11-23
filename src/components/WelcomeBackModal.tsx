import React from 'react';
import { Building2, Clock, Coins } from 'lucide-react';
import { OFFLINE_CAP_MINUTES, OFFLINE_EFFICIENCY } from '../game/data';

interface WelcomeBackModalProps {
  minutesAway: number;
  cappedMinutes: number;
  amount: number;
  franchiseCount: number;
  onClaim: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? '' : 's'} ${h % 24}h`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Shown on resume when franchises earned passive income while the app was closed. */
export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  minutesAway,
  cappedMinutes,
  amount,
  franchiseCount,
  onClaim,
}) => {
  const capped = minutesAway > cappedMinutes;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden text-center">
        <div className="px-5 pt-6 pb-4 bg-gradient-to-b from-emerald-950/60 to-slate-950">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7 text-emerald-300" />
          </div>
          <h2 className="font-display text-xl font-extrabold text-white">Welcome Back, Chef!</h2>
          <p className="text-xs text-slate-300 mt-1.5">
            Your {franchiseCount} franchise{franchiseCount === 1 ? '' : 's'} kept serving while you
            were away.
          </p>
        </div>

        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Away for <strong className="text-slate-200 font-mono-num">{formatDuration(minutesAway)}</strong>
          </div>

          <div className="rounded-xl bg-slate-900 border border-emerald-700/50 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Offline earnings</p>
            <p className="font-mono-num font-extrabold text-2xl text-emerald-300">
              +${amount.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {Math.round(OFFLINE_EFFICIENCY * 100)}% of normal franchise income
              {capped ? ` · capped at ${OFFLINE_CAP_MINUTES / 60}h` : ''}
            </p>
          </div>

          <button
            onClick={onClaim}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all"
          >
            <Coins className="w-4 h-4" />
            Collect to Restaurant Cash
          </button>
        </div>
      </div>
    </div>
  );
};
