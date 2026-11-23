import React from 'react';
import { Lock, PartyPopper, TrendingUp, X } from 'lucide-react';
import { CuisineDef } from '../game/types';
import { RECIPES } from '../game/data';
import { getPassiveRestaurantIncomePerMin } from '../game/cuisines';
import { PreviewThumb } from './ItemPreview';

interface GrandOpeningModalProps {
  next: CuisineDef;
  current: CuisineDef;
  restaurantLevel: number;
  onOpen: () => void;
  onClose: () => void;
}

/** Preview of the next country's restaurant and the button that moves you there. */
export const GrandOpeningModal: React.FC<GrandOpeningModalProps> = ({ next, current, restaurantLevel, onOpen, onClose }) => {
  const ready = restaurantLevel >= next.requiredLevel;
  const p = next.palette;
  const oldIncome = getPassiveRestaurantIncomePerMin([current.id], restaurantLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3" role="dialog" aria-modal="true" aria-label={`Open ${next.name}`}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl">
        {/* Hero banner in the restaurant's own colours */}
        <div
          className="relative px-5 pt-5 pb-4"
          style={{ background: `linear-gradient(135deg, ${p.wainscot} 0%, ${p.accent} 100%)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/25 text-white/90 hover:bg-black/40 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
            {ready ? 'Grand opening' : 'Coming soon'}
          </p>
          <h2 className="font-display text-2xl font-extrabold text-white leading-tight mt-0.5">
            <span className="mr-1.5" aria-hidden>{next.flag}</span>
            {next.name}
          </h2>
          <p className="text-sm font-semibold text-white/90 italic">{next.tagline}</p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {[p.awningA, p.awningB, p.awningA, p.awningB, p.awningA, p.awningB, p.awningA, p.awningB].map((c, i) => (
              <span key={i} className="flex-1 h-2.5 rounded-b-full" style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">{next.description}</p>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">On the menu</p>
            <div className="grid grid-cols-3 gap-2">
              {next.menu.map((id) => {
                const starter = next.starters.includes(id);
                return (
                  <div key={id} className="rounded-xl bg-slate-900 border border-slate-800 p-1.5 text-center">
                    <PreviewThumb kind="recipe" id={id} alt={RECIPES[id].name} className="w-full h-14 rounded-lg" />
                    <p className="mt-1 text-[10px] font-semibold text-slate-200 leading-tight line-clamp-2">{RECIPES[id].name}</p>
                    {starter && <p className="text-[9px] font-bold text-emerald-300">Free on day 1</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                You keep your level, money, staff and upgrades. <b className="text-white">{current.name}</b> keeps
                running in town and pays you about <b className="text-emerald-300">${oldIncome.toLocaleString()}/min</b>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <PartyPopper className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Opening gift: 3 Recipe Album cards from {next.country}, including a rare one.</span>
            </li>
          </ul>

          {ready ? (
            <button
              onClick={onOpen}
              className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-display font-extrabold text-base cursor-pointer shadow-lg"
            >
              Open {next.name}
            </button>
          ) : (
            <div className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Reach restaurant level {next.requiredLevel} (now {restaurantLevel})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
