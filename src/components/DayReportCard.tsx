import React, { useEffect, useState } from 'react';
import { AlertTriangle, Moon, TrendingDown, TrendingUp, X } from 'lucide-react';
import { DayReport } from '../game/types';

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
  autoCloseMs = 9000,
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
    </div>
  );
};
