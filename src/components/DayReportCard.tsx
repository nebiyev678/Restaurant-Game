import React, { useEffect, useState } from 'react';
import { AlertTriangle, Flame, Gift, Medal, Moon, Star, Target, TrendingDown, TrendingUp, X } from 'lucide-react';
import { DayReport } from '../game/types';
import { DAILY_SPECIAL_BONUS, describeQuickGoal, getStarStreakBonusPct, RECIPES } from '../game/data';

interface DayReportCardProps {
  report: DayReport;
  onClose: () => void;
  /** Auto-dismiss delay in ms; the card never blocks gameplay. */
  autoCloseMs?: number;
  /** Phone layout: small card above the bottom menu, breakdown behind a tap. */
  compact?: boolean;
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/**
 * Non-blocking end-of-day summary shown when the in-game clock passes midnight.
 * Slides in at the top-right, auto-dismisses, and can be closed with a tap.
 */
export const DayReportCard: React.FC<DayReportCardProps> = ({
  report,
  onClose,
  autoCloseMs = 12000,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  useEffect(() => {
    // Opening the breakdown keeps the card until the player closes it
    if (compact && expanded) return;
    const t = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(t);
  }, [report, onClose, autoCloseMs, compact, expanded]);

  const s = report.stats;
  const income = s.revenue + s.tips + s.deliveryIncome + s.franchiseIncome;
  const positive = report.netProfit >= 0;

  const rows: { label: string; value: string; tone?: 'plus' | 'minus' }[] = [
    { label: 'Dish sales', value: `+${money(s.revenue)}`, tone: 'plus' },
    { label: 'Tips', value: `+${money(s.tips)}`, tone: 'plus' },
  ];
  if (s.deliveryIncome > 0) rows.push({ label: 'Deliveries', value: `+${money(s.deliveryIncome)}`, tone: 'plus' });
  if (s.franchiseIncome > 0) rows.push({ label: 'Franchises', value: `+${money(s.franchiseIncome)}`, tone: 'plus' });
  rows.push({ label: 'Ingredients', value: `-${money(s.ingredientCost)}`, tone: 'minus' });
  if (report.staffCount > 0) {
    rows.push({
      label: `Payroll (${report.staffCount} staff)`,
      value: `-${money(report.payrollPaid)}`,
      tone: 'minus',
    });
  }

  // Phone: one slim card. Day, stars, served and profit on one line, plus the best reason to
  // come back tomorrow. Tapping it opens the full breakdown.
  if (compact && !expanded) {
    const t = report.tomorrow;
    const hook = t?.special
      ? `${RECIPES[t.special].name} Day · +${Math.round(DAILY_SPECIAL_BONUS * 100)}%`
      : report.starStreak > 0
        ? `${report.starStreak}-day ★★ streak: keep it going`
        : t?.goal
          ? describeQuickGoal(t.goal)
          : null;
    return (
      <div
        role="status"
        className="fixed z-40 left-1/2 -translate-x-1/2 w-[min(84vw,300px)] pointer-events-auto rounded-xl bg-slate-950/90 border border-indigo-400/40 shadow-xl animate-slide-in flex items-stretch"
        style={{ top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 2.75rem)' }}
      >
        <button
          onClick={() => setExpanded(true)}
          className="flex-1 min-w-0 pl-2.5 pr-1 py-1.5 text-left cursor-pointer"
          aria-label={`Day ${report.dayNumber} closed, ${report.stars} of 3 stars, ${s.customersServed} served. Tap for details`}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-white whitespace-nowrap">
            <Moon className="w-3 h-3 text-indigo-300 shrink-0" />
            Day {report.dayNumber}
            <span className="flex" aria-hidden>
              {[0, 1, 2].map((i) => (
                <Star key={i} className={`w-3 h-3 ${i < report.stars ? 'fill-amber-400 text-amber-300' : 'text-slate-600'}`} />
              ))}
            </span>
            <span className="font-normal text-slate-400">{s.customersServed} served</span>
            <span className={`ml-auto font-mono-num font-extrabold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
              {positive ? '+' : '-'}
              {money(Math.abs(report.netProfit))}
            </span>
          </span>
          {hook && (
            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-300 truncate">
              <span className="text-indigo-300 font-bold uppercase tracking-wide">Tomorrow</span>
              <span className="truncate">{hook}</span>
            </span>
          )}
        </button>
        <button
          onClick={onClose}
          className="px-2 text-slate-400 hover:text-white cursor-pointer shrink-0"
          aria-label="Close day report"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`fixed z-40 pointer-events-auto rounded-2xl bg-slate-950/95 border border-indigo-400/50 shadow-2xl overflow-hidden animate-slide-in ${
        compact ? 'left-1/2 -translate-x-1/2 w-[min(92vw,340px)]' : 'top-20 right-3 sm:right-5 w-[min(92vw,300px)]'
      }`}
      style={compact ? { top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 2.75rem)' } : undefined}
    >
      <div
        className={`flex items-center justify-between gap-2 bg-indigo-950/60 border-b border-slate-800 ${
          compact ? 'px-3.5 py-1.5' : 'px-3.5 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4 text-indigo-300" />
          <span className="font-display font-extrabold text-sm text-white">
            Day {report.dayNumber} Closed
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          aria-label="Close day report"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Daily star rating */}
      <div className={`flex items-center justify-between gap-2 px-3.5 ${compact && !expanded ? 'pt-2' : 'pt-3'}`}>
        <div className="flex items-center gap-0.5" aria-label={`${report.stars} of 3 stars`}>
          {[0, 1, 2].map((i) => (
            <Star
              key={i}
              className={`${compact && !expanded ? 'w-5 h-5' : 'w-7 h-7'} ${
                i < report.stars ? 'fill-amber-400 text-amber-300' : 'text-slate-600'
              }`}
            />
          ))}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">
            {s.customersServed}/{report.starTarget} served for ★★
          </p>
          {report.starReward > 0 && (
            <p className="font-mono-num text-xs font-bold text-amber-300">
              +${report.starReward.toLocaleString()} bonus
              {report.starStreakBonusPct > 0 && <span className="text-orange-300"> (+{report.starStreakBonusPct}%)</span>}
            </p>
          )}
        </div>
      </div>

      {compact && !expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left cursor-pointer"
        >
          <span className="text-[11px] text-slate-300">
            {s.customersServed} served{s.customersLost > 0 ? ` · ${s.customersLost} left` : ''} ·{' '}
            <span className="underline decoration-dotted">details</span>
          </span>
          <span className={`font-mono-num font-extrabold text-sm ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
            {positive ? '+' : '-'}
            {money(Math.abs(report.netProfit))}
          </span>
        </button>
      ) : (
      <div className="px-3.5 py-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-slate-900 border border-slate-800 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Served</p>
            <p className="font-mono-num font-bold text-emerald-300 text-sm">{s.customersServed}</p>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-800 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Walked out</p>
            <p className={`font-mono-num font-bold text-sm ${s.customersLost > 0 ? 'text-rose-300' : 'text-slate-300'}`}>
              {s.customersLost}
            </p>
          </div>
        </div>

        <ul className="space-y-1 text-xs">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-2">
              <span className="text-slate-300">{r.label}</span>
              <span
                className={`font-mono-num font-semibold ${
                  r.tone === 'plus' ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                {r.value}
              </span>
            </li>
          ))}
        </ul>

        {report.unpaidWages && (
          <div className="flex items-start gap-1.5 rounded-lg bg-rose-950/50 border border-rose-700/60 px-2.5 py-1.5 text-[11px] text-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              Couldn't cover full payroll ({money(report.payrollDue)} due). Unhappy staff hurt your
              reputation.
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
            {positive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
            Net profit
          </span>
          <span
            className={`font-mono-num font-extrabold text-base ${
              positive ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {positive ? '+' : '-'}
            {money(Math.abs(report.netProfit))}
          </span>
        </div>
        {income === 0 && (
          <p className="text-[10px] text-slate-500">Quiet day. Cook and serve to grow tomorrow's profit.</p>
        )}
      </div>
      )}

      <TomorrowHooks report={report} />
    </div>
  );
};

/** "Come back tomorrow" reasons: dish of the day, star streak, the open goal, a medal within reach. */
const TomorrowHooks: React.FC<{ report: DayReport }> = ({ report }) => {
  const t = report.tomorrow;
  if (!t) return null;
  const nextStreakPct = getStarStreakBonusPct(report.starStreak + 1);
  const rows: { icon: React.ReactNode; text: React.ReactNode }[] = [];

  if (t.special) {
    rows.push({
      icon: <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-300" />,
      text: (
        <>
          <b className="text-amber-200">{RECIPES[t.special].name} Day</b> · sells +{Math.round(DAILY_SPECIAL_BONUS * 100)}% and more guests order it
        </>
      ),
    });
  }
  rows.push({
    icon: <Flame className={`w-3.5 h-3.5 ${report.starStreak > 0 ? 'fill-orange-400 text-orange-300' : 'text-slate-500'}`} />,
    text:
      report.starStreak > 0 ? (
        <>
          <b className="text-orange-200">{report.starStreak}-day ★★ streak</b> · ★★ tomorrow = +{nextStreakPct}% star bonus
        </>
      ) : (
        <>Get ★★ tomorrow to start a star streak (up to +100% bonus)</>
      ),
  });
  if (t.goal) {
    const left = t.goal.target - t.goal.progress;
    rows.push({
      icon: t.goalsToChest === 1 ? <Gift className="w-3.5 h-3.5 text-yellow-300" /> : <Target className="w-3.5 h-3.5 text-amber-300" />,
      text: (
        <>
          {describeQuickGoal(t.goal)}
          {t.goal.progress > 0 && left > 0 && <span className="text-emerald-300"> · almost there</span>}
          {' · '}
          {t.goalsToChest === 1 ? 'opens a chest!' : `${t.goalsToChest} goals to a chest`}
        </>
      ),
    });
  }
  if (t.mastery) {
    rows.push({
      icon: <Medal className="w-3.5 h-3.5 text-sky-300" />,
      text: (
        <>
          {RECIPES[t.mastery.recipeId].name}: {t.mastery.remaining} more for {t.mastery.tierName}
        </>
      ),
    });
  }

  return (
    <div className="px-3.5 pb-2.5 pt-2 border-t border-slate-800 bg-slate-900/50">
      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-1">Tomorrow</p>
      <ul className="space-y-1">
        {rows.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-200">
            <span className="shrink-0 mt-px">{r.icon}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
