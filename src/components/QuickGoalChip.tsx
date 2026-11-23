import React from 'react';
import { Check, Gift, Target } from 'lucide-react';
import { QuickGoalState, RecipeId } from '../game/types';
import { describeQuickGoal, goalsUntilChest, QUICK_GOAL_CHEST_EVERY } from '../game/data';

interface QuickGoalChipProps {
  state: QuickGoalState;
  special: RecipeId | null;
  /** Set for a moment right after a goal pays out. */
  flash: { reward: number; chest: number } | null;
  compact: boolean;
}

/**
 * Always-visible "next goal" chip: one short task, a progress bar,
 * and pips counting down to the next chest.
 */
export const QuickGoalChip: React.FC<QuickGoalChipProps> = ({ state, special, flash, compact }) => {
  const goal = state.current;
  if (!goal) return null;
  const done = goal.progress >= goal.target;
  const pct = Math.round((goal.progress / goal.target) * 100);
  const cyclePos = state.completed % QUICK_GOAL_CHEST_EVERY;
  const chestNext = goalsUntilChest(state.completed) === 1;
  const isMoney = goal.kind === 'earn_cash';
  const progressText = isMoney
    ? `$${Math.min(goal.progress, goal.target).toLocaleString()}`
    : `${goal.progress}/${goal.target}`;
  const featuresSpecial = goal.kind === 'serve_recipe' && goal.recipeId === special;

  return (
    <div
      className={`rounded-xl border shadow-lg transition-colors ${
        flash
          ? 'bg-emerald-600/95 border-emerald-300'
          : done
            ? 'bg-emerald-900/90 border-emerald-400'
            : 'bg-slate-950/88 border-slate-600'
      } ${compact ? 'w-[9.5rem] px-2 py-1' : 'w-48 px-2.5 py-1.5'}`}
      aria-live="polite"
      aria-label={
        flash
          ? `Goal complete, plus ${flash.reward + flash.chest} dollars`
          : `Next goal: ${describeQuickGoal(goal)}, ${progressText}. ${goalsUntilChest(state.completed)} goals to the chest.`
      }
    >
      {flash ? (
        <div className="flex items-center gap-1.5 py-0.5">
          {flash.chest > 0 ? (
            <Gift className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-yellow-200 shrink-0`} />
          ) : (
            <Check className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-white shrink-0`} />
          )}
          <span className={`font-display font-extrabold text-white leading-tight ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {flash.chest > 0 ? 'Chest!' : 'Done!'}{' '}
            <span className="font-mono-num text-yellow-200">+${(flash.reward + flash.chest).toLocaleString()}</span>
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <Target className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-300 shrink-0`} />
            <span
              className={`flex-1 min-w-0 truncate font-semibold leading-tight ${featuresSpecial ? 'text-amber-200' : 'text-white'} ${
                compact ? 'text-[10px]' : 'text-[11px]'
              }`}
            >
              {describeQuickGoal(goal)}
            </span>
            <span className={`font-mono-num font-bold shrink-0 ${done ? 'text-emerald-300' : 'text-slate-300'} ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
              {done ? <Check className="w-3 h-3" /> : progressText}
            </span>
          </div>
          <div className={`mt-1 rounded-full bg-slate-800 overflow-hidden ${compact ? 'h-1' : 'h-1.5'}`}>
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${done ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5" aria-hidden>
              {Array.from({ length: QUICK_GOAL_CHEST_EVERY }, (_, i) => (
                <span
                  key={i}
                  className={`rounded-full ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} ${
                    i < cyclePos ? 'bg-amber-400' : i === cyclePos ? 'bg-amber-400/40 ring-1 ring-amber-300' : 'bg-slate-700'
                  }`}
                />
              ))}
              <Gift className={`ml-0.5 ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${chestNext ? 'text-yellow-300 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <span className={`font-mono-num font-bold text-amber-300 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
              +${goal.reward.toLocaleString()}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
