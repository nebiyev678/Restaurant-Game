import React from 'react';
import { Check, Clock, Coins, Lock, Sparkles, TrendingUp, X } from 'lucide-react';
import { RECIPE_LIST, SPECIALTY_LINES, STATION_INFO } from '../game/data';
import { CUISINES } from '../game/cuisines';
import type { SaveState as GameSaveState, RecipeId, StationType } from '../game/types';
import { PreviewThumb } from './ItemPreview';

interface Props {
  station: StationType;
  save: GameSaveState;
  onUnlock: (recipe: RecipeId) => void;
  onOpenKitchen: () => void;
  onClose: () => void;
}

const money = (n: number) => `$${n.toLocaleString()}`;

/** Card shown when a locked machine (its blue hologram or its sign) is tapped. */
export const LockedEquipmentPopup: React.FC<Props> = ({ station, save, onUnlock, onOpenKitchen, onClose }) => {
  const menu = CUISINES[save.activeCuisine ?? 'bistro'].menu;
  const recipes = RECIPE_LIST.filter((r) => r.station === station && menu.includes(r.id) && !save.unlockedRecipes.includes(r.id)).sort(
    (a, b) => a.requiredLevel - b.requiredLevel || a.unlockCost - b.unlockCost
  );
  const first = recipes[0];
  if (!first) return null;
  const later = recipes.slice(1, 4);
  const levelOk = save.restaurantLevel >= first.requiredLevel;
  const line = first.recipeLine ? SPECIALTY_LINES[first.recipeLine] : null;
  const lineOk = !line || save.unlockedSpecialtyLines.includes(line.id);
  const cashOk = save.restaurantCash >= first.unlockCost;
  const canUnlock = levelOk && lineOk && cashOk;
  const profit = first.sellPrice - first.ingredientCost;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 p-3" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`${STATION_INFO[station].name} is locked`}
        onClick={(e) => e.stopPropagation()}
        className="w-[min(94vw,360px)] rounded-2xl bg-slate-950 border border-sky-400/40 shadow-2xl overflow-hidden animate-slide-in"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="relative px-4 pt-4 pb-3 bg-gradient-to-b from-sky-500/25 to-transparent">
          <button onClick={onClose} aria-label="Close" className="absolute right-2 top-2 p-2 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <PreviewThumb kind="recipe" id={first.id} alt={first.name} className="w-14 h-14 rounded-xl ring-2 ring-sky-400/60" />
              <span className="absolute -right-1.5 -bottom-1.5 w-6 h-6 rounded-full bg-amber-400 border-2 border-slate-950 flex items-center justify-center">
                <Lock className="w-3 h-3 text-slate-950" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-sky-300">Locked equipment</p>
              <h2 className="font-display font-extrabold text-white text-lg leading-tight">{STATION_INFO[station].name}</h2>
              <p className="text-[12px] text-slate-300 truncate">Cooks {first.name}</p>
            </div>
          </div>
        </div>

        <div className="px-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
            <p className="text-[10px] text-slate-400 font-semibold">Price</p>
            <p className={`font-mono-num font-extrabold text-base ${cashOk ? 'text-emerald-300' : 'text-rose-300'}`}>{money(first.unlockCost)}</p>
          </div>
          <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
            <p className="text-[10px] text-slate-400 font-semibold">Required level</p>
            <p className={`font-extrabold text-base flex items-center gap-1 ${levelOk ? 'text-emerald-300' : 'text-amber-300'}`}>
              Lv {first.requiredLevel} {levelOk && <Check className="w-4 h-4" />}
            </p>
          </div>
        </div>

        <ul className="px-4 mt-3 space-y-1.5 text-[12.5px] text-slate-200">
          <li className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-300 shrink-0" />
            Adds {first.name} to your menu
          </li>
          <li className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300 shrink-0" />
            Sells for {money(first.sellPrice)} · {money(profit)} profit each
          </li>
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-300 shrink-0" />
            About {first.basePrepTime}s to cook
          </li>
          {later.length > 0 && (
            <li className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-300 shrink-0 mt-px" />
              <span>
                Later also cooks{' '}
                {later.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 ? ', ' : ''}
                    {r.name} <span className="text-slate-400">(Lv {r.requiredLevel})</span>
                  </span>
                ))}
              </span>
            </li>
          )}
        </ul>

        <div className="p-4 pt-3">
          {!lineOk && line ? (
            <button
              onClick={onOpenKitchen}
              className="w-full min-h-11 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-extrabold text-sm cursor-pointer"
            >
              Unlock {line.name} first
            </button>
          ) : (
            <button
              onClick={() => canUnlock && onUnlock(first.id)}
              disabled={!canUnlock}
              className={`w-full min-h-11 rounded-xl font-extrabold text-sm ${
                canUnlock ? 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950 cursor-pointer shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 cursor-default'
              }`}
            >
              {!levelOk
                ? `Reach level ${first.requiredLevel} to unlock`
                : !cashOk
                  ? `Need ${money(first.unlockCost - save.restaurantCash)} more`
                  : `Unlock for ${money(first.unlockCost)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
