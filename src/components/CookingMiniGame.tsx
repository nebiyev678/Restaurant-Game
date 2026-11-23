import React, { useEffect, useRef, useState } from 'react';
import { Check, ChefHat, Flame, Lock, Sparkles, X } from 'lucide-react';
import { RECIPES, SPECIALTY_LINES } from '../game/data';
import { sound } from '../game/audio';
import { CustomerOrder, RecipeId, SpecialtyLineId, StationType } from '../game/types';

interface CookingMiniGameProps {
  station: StationType;
  unlockedRecipes: RecipeId[];
  unlockedSpecialtyLines: SpecialtyLineId[];
  equipmentLevel: number;
  bulkDiscount: number;
  restaurantCash: number;
  pendingOrders: CustomerOrder[];
  suggestedOrder: CustomerOrder | null;
  onComplete: (recipeId: RecipeId, qualityBonus: number, ingredientCost: number) => void;
  onOpenSpecialtyMenu: () => void;
  onClose: () => void;
}

export const CookingMiniGame: React.FC<CookingMiniGameProps> = ({
  station,
  unlockedRecipes,
  unlockedSpecialtyLines,
  equipmentLevel,
  bulkDiscount,
  restaurantCash,
  pendingOrders,
  suggestedOrder,
  onComplete,
  onOpenSpecialtyMenu,
  onClose,
}) => {
  // Recipes available on this station (classic stations fall back to unlocked recipes if none yet; specialty shows its dedicated lock/unlock view)
  const stationRecipes = unlockedRecipes.filter((id) => RECIPES[id].station === station);
  const isEmptySpecialty = station === 'specialty' && stationRecipes.length === 0;
  const selectableIds =
    stationRecipes.length > 0 ? stationRecipes : isEmptySpecialty ? [] : unlockedRecipes;

  const initialRecipe: RecipeId =
    suggestedOrder && selectableIds.includes(suggestedOrder.recipeId)
      ? suggestedOrder.recipeId
      : selectableIds[0] ?? 'burger';

  const [selectedRecipe, setSelectedRecipe] = useState<RecipeId>(initialRecipe);
  const [stepIndex, setStepIndex] = useState<number>(0); // 0 = prep, 1 = sizzle timing, 2 = plate
  const [gaugePos, setGaugePos] = useState<number>(0); // 0..100
  const [qualityBonus, setQualityBonus] = useState<number>(1.0);
  const [timingResult, setTimingResult] = useState<'none' | 'perfect' | 'good'>('none');
  const dirRef = useRef<number>(1);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const def = RECIPES[selectedRecipe];
  const actualCost = Math.max(1, Math.round(def.ingredientCost * (1 - bulkDiscount)));
  const canAfford = restaurantCash >= actualCost;
  const specialtyMult = station === 'specialty' ? 1 + (equipmentLevel - 1) * 0.1 : 1;
  const displayPrice = Math.round(def.sellPrice * specialtyMult);

  // Sweet spot widens with equipment level
  const sweetWidth = Math.min(36, 18 + (equipmentLevel - 1) * 3.5);
  const sweetStart = 50 - sweetWidth / 2;
  const sweetEnd = 50 + sweetWidth / 2;

  useEffect(() => {
    if (stepIndex !== 1 || isEmptySpecialty) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const speed = Math.max(55, 115 - (equipmentLevel - 1) * 8); // % per sec
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      setGaugePos((prev) => {
        let next = prev + dirRef.current * speed * dt;
        if (next >= 100) {
          next = 100;
          dirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          dirRef.current = 1;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [stepIndex, equipmentLevel, isEmptySpecialty]);

  const handleStepAction = () => {
    if (!canAfford || isEmptySpecialty) return;
    if (stepIndex === 0) {
      sound.playClick();
      setStepIndex(1);
    } else if (stepIndex === 1) {
      const inSweet = gaugePos >= sweetStart && gaugePos <= sweetEnd;
      if (inSweet) {
        sound.playPerfectCook();
      } else {
        sound.playSizzle();
      }
      setQualityBonus(inSweet ? 1.25 : 1.0);
      setTimingResult(inSweet ? 'perfect' : 'good');
      setStepIndex(2);
    } else if (stepIndex === 2) {
      onComplete(selectedRecipe, qualityBonus, actualCost);
    }
  };

  const handleQuickPrep = () => {
    if (!canAfford || isEmptySpecialty) return;
    sound.playSizzle();
    onComplete(selectedRecipe, 1.0, actualCost);
  };

  const stationNames: Record<StationType, string> = {
    grill: 'Grill & Range',
    prep: 'Prep & Sushi Counter',
    fryer: 'Commercial Fryer',
    oven: 'Brick Pizza Oven',
    bar: 'Espresso & Drink Bar',
    specialty: 'Specialty Station',
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl p-4 sm:p-5 text-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-semibold text-amber-400">
              {stationNames[station]} · Equipment Lv {equipmentLevel}
            </p>
            <h2 className="font-display text-lg font-bold text-white leading-tight">
              {station === 'specialty'
                ? 'Specialty Desserts & Beverages'
                : 'Interactive Cooking Station'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
            aria-label="Close cooking station"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isEmptySpecialty ? (
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-300 shrink-0">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-white">
                  Unlock a Specialty Recipe Line First
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  Craft high-margin Patisserie Desserts and Craft Beverages here once you unlock a
                  Specialty Line and at least one recipe in the Kitchen menu.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(SPECIALTY_LINES) as SpecialtyLineId[]).map((lineId) => {
                const line = SPECIALTY_LINES[lineId];
                const lineUnlocked = unlockedSpecialtyLines.includes(lineId);
                return (
                  <div
                    key={lineId}
                    className={`rounded-lg border p-2.5 text-xs ${
                      lineUnlocked
                        ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 font-bold">
                      <span>{line.name}</span>
                      {lineUnlocked ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lineUnlocked
                        ? 'Line active · Unlock a recipe in Kitchen'
                        : `Lv ${line.requiredLevel} · $${line.unlockCost}`}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onOpenSpecialtyMenu}
              className="w-full py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Open Specialty Lines in Kitchen
            </button>
          </div>
        ) : (
          <>
            {/* Dish Picker */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
              {selectableIds.map((id) => {
                const r = RECIPES[id];
                const waitingCount = pendingOrders.filter(
                  (o) => o.status === 'waiting' && o.recipeId === id
                ).length;
                const active = selectedRecipe === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedRecipe(id);
                      setStepIndex(0);
                      setTimingResult('none');
                      sound.playClick();
                    }}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-900 text-slate-200 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span>{r.name}</span>
                    {r.recipeLine && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          active
                            ? 'bg-slate-950/20 text-slate-950'
                            : r.recipeLine === 'desserts'
                              ? 'bg-pink-500/20 text-pink-300'
                              : 'bg-teal-500/20 text-teal-300'
                        }`}
                      >
                        {r.recipeLine === 'desserts' ? 'Dessert' : 'Drink'}
                      </span>
                    )}
                    {waitingCount > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold ${
                          active ? 'bg-slate-950 text-amber-400' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {waitingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Recipe Info & Steps */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 mb-3">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
                <span>{def.description}</span>
                <span className="font-mono-num text-emerald-400 font-bold shrink-0 ml-2">
                  +${displayPrice} · Cost ${actualCost}
                </span>
              </div>

              {/* 3-Step Visual Progress */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {def.steps.map((label, idx) => {
                  const done = idx < stepIndex;
                  const current = idx === stepIndex;
                  return (
                    <div
                      key={label}
                      className={`rounded-lg p-2 text-xs border ${
                        done
                          ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300'
                          : current
                            ? 'bg-amber-950/50 border-amber-500 text-amber-200 font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        {done ? <Check className="w-3.5 h-3.5" /> : <span className="font-mono-num">{idx + 1}.</span>}
                        <span className="truncate">{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 1 Interactive Heat / Sizzle Timing Bar */}
              {stepIndex === 1 && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Tap inside the golden zone for +25% Perfect Quality!</span>
                    <span className="font-mono-num text-amber-400">{Math.round(gaugePos)}%</span>
                  </div>
                  <div className="relative h-7 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden">
                    <div
                      className="absolute inset-y-0 bg-emerald-500/35 border-x-2 border-emerald-400"
                      style={{ left: `${sweetStart}%`, width: `${sweetWidth}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-2 bg-amber-400 shadow-md"
                      style={{ left: `calc(${gaugePos}% - 4px)` }}
                    />
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-950 border border-slate-800">
                  <Sparkles className={`w-4 h-4 ${timingResult === 'perfect' ? 'text-amber-400' : 'text-emerald-400'}`} />
                  <span>
                    {timingResult === 'perfect'
                      ? 'Perfect Finish! +25% Dish Value & Bonus Tips unlocked.'
                      : 'Crafted nicely! Ready to plate & serve.'}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  disabled={!canAfford}
                  onClick={handleStepAction}
                  className={`flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  {!canAfford
                    ? `Need $${actualCost} for Ingredients`
                    : stepIndex === 0
                      ? `Start: ${def.steps[0]}`
                      : stepIndex === 1
                        ? station === 'specialty'
                          ? 'Lock Perfect Finish!'
                          : 'Stop Heat & Flip!'
                        : 'Plate & Pick Up Dish'}
                </button>

                <button
                  disabled={!canAfford}
                  onClick={handleQuickPrep}
                  className="py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                  title="Skip timing step at standard 1.0x quality"
                >
                  Quick Cook
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
