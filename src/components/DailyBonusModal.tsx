import React from 'react';
import { CalendarCheck, Check, Coins, Flame, Gift, X } from 'lucide-react';
import { DAILY_LOGIN_REWARDS, DailyLoginStatus } from '../game/data';

interface DailyBonusModalProps {
  status: DailyLoginStatus;
  totalDaysClaimed: number;
  onClaim: () => void;
  onClose: () => void;
}

export const DailyBonusModal: React.FC<DailyBonusModalProps> = ({
  status,
  totalDaysClaimed,
  onClaim,
  onClose,
}) => {
  const claimedCap = status.canClaim
    ? Math.min(status.effectiveStreak, 6)
    : Math.min(status.effectiveStreak, 7);
  const targetDay = Math.min(status.nextStreak, 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl font-extrabold text-white leading-tight">
                  Daily Login Bonus
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-400/40 text-xs font-mono-num font-bold text-orange-300">
                  <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                  {status.effectiveStreak} Day Streak
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {status.canClaim
                  ? status.streakBroken
                    ? 'Previous streak ended. Claim today to start a fresh Day 1 streak!'
                    : status.nextStreak > 1
                      ? `Consecutive Day ${status.nextStreak} bonus ready for your restaurant.`
                      : 'Log in each day to unlock bigger consecutive cash rewards.'
                  : `Today's bonus collected! Return tomorrow for Day ${status.effectiveStreak + 1}.`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            aria-label="Close daily bonus"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 7-Day Escalating Reward Track */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {DAILY_LOGIN_REWARDS.map((tier) => {
              const isClaimed = tier.day <= claimedCap;
              const isReadyToday = status.canClaim && tier.day === targetDay;
              const isDay7Plus = tier.day === 7;
              const displayCash =
                isDay7Plus && (isReadyToday || (status.alreadyClaimedToday && status.effectiveStreak >= 7))
                  ? status.rewardCash
                  : tier.cash;

              return (
                <div
                  key={tier.day}
                  className={`relative rounded-xl p-3 border transition-colors ${
                    isDay7Plus ? 'col-span-2 sm:col-span-2' : ''
                  } ${
                    isReadyToday
                      ? 'bg-amber-500/15 border-amber-400 shadow-lg'
                      : isClaimed
                        ? 'bg-emerald-950/40 border-emerald-700/60'
                        : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isReadyToday
                          ? 'text-amber-300'
                          : isClaimed
                            ? 'text-emerald-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {isDay7Plus && status.nextStreak > 7
                        ? `Day ${status.nextStreak}`
                        : tier.label}
                    </span>

                    {isClaimed ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : isReadyToday ? (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                        Ready
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Coins
                      className={`w-4 h-4 shrink-0 ${
                        isReadyToday
                          ? 'text-amber-400'
                          : isClaimed
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                      }`}
                    />
                    <span
                      className={`font-mono-num font-extrabold text-sm ${
                        isReadyToday
                          ? 'text-white'
                          : isClaimed
                            ? 'text-emerald-200'
                            : 'text-slate-300'
                      }`}
                    >
                      +${displayCash.toLocaleString()}
                    </span>
                  </div>

                  {isDay7Plus && status.loyaltyBonus > 0 && (
                    <p className="text-[10px] text-amber-300/90 font-medium mt-1">
                      Includes +${status.loyaltyBonus.toLocaleString()} streak loyalty bonus
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="w-3.5 h-3.5 text-slate-400" />
              Total days claimed: <strong className="text-slate-200 font-mono-num">{totalDaysClaimed}</strong>
            </span>
            <span>Resets if a day is missed</span>
          </div>

          {/* Primary Action */}
          {status.canClaim ? (
            <button
              onClick={onClaim}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all"
            >
              <Coins className="w-4 h-4" />
              Claim +${status.rewardCash.toLocaleString()} Restaurant Cash
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-display font-bold text-sm cursor-pointer transition-colors"
            >
              Back to Restaurant
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
