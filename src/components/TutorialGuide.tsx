import React, { useEffect, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp } from 'lucide-react';
import { GUIDE_STEPS } from '../game/tutorial';

interface TutorialGuideProps {
  step: number;
  isTouch: boolean;
  joystickSide?: 'left' | 'right';
  compact: boolean;
  /** True when the step's condition is met and its button can be pressed. */
  ready: boolean;
  onNext: () => void;
  onSkip: () => void;
  /** Joystick-side step: the player picked a side. */
  onChooseSide?: (side: 'left' | 'right') => void;
  skipLabel?: string;
  onHowToPlay: () => void;
}

/** Step card for the guided beginner tutorial. */
export const TutorialGuide: React.FC<TutorialGuideProps> = ({ step, isTouch, joystickSide = 'left', compact, ready, onNext, onSkip, onChooseSide, skipLabel = 'Skip tutorial', onHowToPlay }) => {
  const s = GUIDE_STEPS[step];
  // Players can fold the card into a slim pill; a new step opens it again
  const [folded, setFolded] = useState(false);
  useEffect(() => setFolded(false), [step]);
  if (!s) return null;
  const hasButton = s.advance === 'button' || s.advance === 'order';
  const isLast = step === GUIDE_STEPS.length - 1;
  const canFold = s.advance !== 'choose_side';
  const nextButton = hasButton ? (
    <button
      onClick={onNext}
      disabled={!ready}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-extrabold ${
        ready ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-400 cursor-default'
      }`}
    >
      {ready ? s.buttonLabel ?? 'Next' : s.waitingHint ?? 'Wait…'}
    </button>
  ) : null;
  const top = compact ? 'calc(max(0.5rem, env(safe-area-inset-top)) + 5.6rem)' : '5.25rem';

  if (folded && canFold) {
    return (
      <div className="fixed z-30 left-1/2 -translate-x-1/2 pointer-events-none" style={{ top }} role="dialog" aria-label={`Tutorial step ${step + 1}: ${s.title}`}>
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-slate-950/90 border border-amber-400/70 shadow-lg pl-2 pr-1 py-1">
          <button onClick={() => setFolded(false)} className="flex items-center gap-1.5 cursor-pointer" aria-label="Show tutorial tip">
            <span className="text-base leading-none" aria-hidden>{s.icon}</span>
            <span className="text-[12px] font-bold text-white max-w-[44vw] truncate">{s.title}</span>
            <span className="font-mono-num text-[10px] font-bold text-amber-300">{step + 1}/{GUIDE_STEPS.length}</span>
            <ChevronDown className="w-4 h-4 text-slate-300" />
          </button>
          {nextButton ?? <span className="w-1" />}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-30 left-1/2 -translate-x-1/2 pointer-events-none w-[min(86vw,330px)]"
      style={{ top }}
      role="dialog"
      aria-label={`Tutorial step ${step + 1} of ${GUIDE_STEPS.length}: ${s.title}`}
    >
      <div className="pointer-events-auto rounded-xl bg-slate-950/90 border border-amber-400/70 shadow-xl px-2.5 py-2 animate-slide-in">
        <div className="flex items-center gap-1.5">
          <span className="text-lg leading-none" aria-hidden>{s.icon}</span>
          <p className="flex-1 min-w-0 font-display font-extrabold text-white text-[13px] leading-tight truncate">{s.title}</p>
          <span className="shrink-0 font-mono-num text-[10px] font-bold text-amber-300">
            {step + 1}/{GUIDE_STEPS.length}
          </span>
          {canFold && (
            <button onClick={() => setFolded(true)} className="shrink-0 -mr-1 p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Hide tutorial tip">
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-slate-200">{(isTouch ? s.body.touch : s.body.desktop).replace('{side}', joystickSide)}</p>

        {s.advance === 'choose_side' && (
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Joystick side">
            {(['left', 'right'] as const).map((side) => (
              <button
                key={side}
                role="radio"
                aria-checked={joystickSide === side}
                onClick={() => onChooseSide?.(side)}
                className={`relative h-20 rounded-xl border-2 cursor-pointer overflow-hidden ${
                  joystickSide === side ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900'
                }`}
              >
                {/* Mini phone: joystick on one side, action button on the other */}
                <span className="absolute inset-x-3 top-2 bottom-7 rounded-lg border border-slate-600 bg-slate-800/80">
                  <span
                    className={`absolute bottom-1.5 w-7 h-7 rounded-full border border-white/30 bg-slate-950/40 flex items-center justify-center ${
                      side === 'left' ? 'left-1.5' : 'right-1.5'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                  </span>
                  <span
                    className={`absolute bottom-2 h-4 px-1.5 rounded-full bg-amber-500 text-[8px] font-extrabold text-slate-950 flex items-center ${
                      side === 'left' ? 'right-1.5' : 'left-1.5'
                    }`}
                  >
                    Cook
                  </span>
                </span>
                <span className="absolute inset-x-0 bottom-1.5 text-center text-sm font-extrabold text-white">
                  {side === 'left' ? 'Left thumb' : 'Right thumb'}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2">
          {isLast ? (
            <button onClick={onHowToPlay} className="text-[11px] font-bold text-sky-300 hover:text-sky-200 cursor-pointer">
              How to play
            </button>
          ) : (
            <button onClick={onSkip} className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-200 cursor-pointer">
              {skipLabel}
            </button>
          )}
          {nextButton ??
            (s.advance === 'choose_side' ? null : (
              <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-amber-200 min-w-0">
                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                <span className="truncate">{s.waitingHint}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};

/** Arrow at the screen edge pointing toward a tutorial target that is off-screen. */
export const GuideEdgePointer: React.FC<{ x: number; y: number; angle: number }> = ({ x, y, angle }) => (
  <div
    className="fixed z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
    style={{ left: x, top: y }}
    aria-hidden
  >
    <div
      className="w-11 h-11 rounded-full bg-amber-400 border-2 border-white shadow-xl flex items-center justify-center animate-pulse"
      style={{ transform: `rotate(${angle + Math.PI / 2}rad)` }}
    >
      <ArrowUp className="w-6 h-6 text-slate-950" strokeWidth={3} />
    </div>
  </div>
);
