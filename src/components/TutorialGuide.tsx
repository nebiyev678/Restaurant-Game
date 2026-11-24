import React from 'react';
import { ArrowUp } from 'lucide-react';
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
  skipLabel?: string;
  onHowToPlay: () => void;
}

/** Step card for the guided beginner tutorial. */
export const TutorialGuide: React.FC<TutorialGuideProps> = ({ step, isTouch, joystickSide = 'left', compact, ready, onNext, onSkip, skipLabel = 'Skip tutorial', onHowToPlay }) => {
  const s = GUIDE_STEPS[step];
  if (!s) return null;
  const hasButton = s.advance === 'button' || s.advance === 'order';
  const isLast = step === GUIDE_STEPS.length - 1;
  return (
    <div
      className="fixed z-30 left-1/2 -translate-x-1/2 pointer-events-none w-[min(92vw,380px)]"
      style={{ top: compact ? 'calc(max(0.5rem, env(safe-area-inset-top)) + 6rem)' : '5.25rem' }}
      role="dialog"
      aria-label={`Tutorial step ${step + 1} of ${GUIDE_STEPS.length}: ${s.title}`}
    >
      <div className="pointer-events-auto rounded-2xl bg-slate-950/95 border-2 border-amber-400/80 shadow-2xl p-3 animate-slide-in">
        <div className="flex items-start gap-2.5">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/50 flex items-center justify-center text-2xl" aria-hidden>
            {s.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-extrabold text-white text-[15px] leading-tight">{s.title}</p>
              <span className="shrink-0 font-mono-num text-[10px] font-bold text-amber-300">
                {step + 1}/{GUIDE_STEPS.length}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-snug text-slate-200">{(isTouch ? s.body.touch : s.body.desktop).replace('{side}', joystickSide)}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="mt-2.5 flex items-center gap-1" aria-hidden>
          {GUIDE_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i < step ? 'w-3 bg-amber-400' : i === step ? 'w-6 bg-amber-300' : 'w-3 bg-slate-700'}`}
            />
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          {isLast ? (
            <button onClick={onHowToPlay} className="text-[11px] font-bold text-sky-300 hover:text-sky-200 cursor-pointer">
              How to play
            </button>
          ) : (
            <button onClick={onSkip} className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer">
              {skipLabel}
            </button>
          )}
          {hasButton ? (
            <button
              onClick={onNext}
              disabled={!ready}
              className={`px-4 py-2 rounded-xl text-sm font-extrabold ${
                ready ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-400 cursor-default'
              }`}
            >
              {ready ? s.buttonLabel ?? 'Next' : s.waitingHint ?? 'Wait…'}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {s.waitingHint}
            </span>
          )}
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
