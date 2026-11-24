import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

interface Topic {
  icon: string;
  title: string;
  points: string[];
}

const topics = (isTouch: boolean, side: 'left' | 'right'): Topic[] => [
  {
    icon: '🎯',
    title: 'The goal',
    points: [
      'Cook dishes, serve guests and earn money.',
      'Spend it to grow your bistro: new dishes, better machines and staff.',
      'Level up to open restaurants in Italy, Japan, Mexico and Azerbaijan.',
    ],
  },
  {
    icon: '🕹️',
    title: 'Moving',
    points: isTouch
      ? [
          `Drag on the ${side} half of the screen to walk (change the side in Settings).`,
          'Tap the floor to walk there, or tap a table to go to it.',
          'Near a machine, guest or table an action button appears: tap it to Cook, Serve or Clean.',
          'Pinch with two fingers to zoom the camera.',
        ]
      : [
          'Walk with W A S D or the arrow keys, or click the floor.',
          'Press Space (or click the action button) to Cook, Serve or Clean.',
          'Scroll the mouse wheel to zoom the camera.',
        ],
  },
  {
    icon: '🙋',
    title: 'Guests & orders',
    points: [
      'The bubble above a guest shows the dish they want. Some order a combo of two or three dishes.',
      'The bar under it is their patience. If it runs out, they leave without paying.',
      'When every table is taken, some guests order takeaway and wait at the counter instead.',
    ],
  },
  {
    icon: '🔥',
    title: 'Machines & cooking',
    points: [
      'Each dish is made on its own machine (grill, fryer, oven…). The sign above a machine shows what it makes.',
      'Stand in the machine’s circle and tap Cook, or tap the sign above it.',
      'A machine cooks one dish at a time. Covered machines unlock when you reach the level shown.',
    ],
  },
  {
    icon: '⏳',
    title: 'Collecting the dish',
    points: [
      'Stay in the machine’s circle and the finished dish goes straight into your hands.',
      'If you walk away, the dish waits on the machine with a “Take!” sign. Step back into the circle to pick it up.',
      'The machine can’t cook again until the dish is taken.',
    ],
  },
  {
    icon: '🍽️',
    title: 'Serving & tips',
    points: [
      'Carry the dish to the guest and tap Serve.',
      'Fast service and perfect cooks earn bigger tips. Serving orders in a row builds a tip streak (up to ×2).',
      'Made the wrong dish? Put it on the counter for later, or throw it in the bin.',
    ],
  },
  {
    icon: '🧽',
    title: 'Cleaning',
    points: [
      'Guests leave a dirty table when they go. Nobody can sit there until you tap Clean.',
      'Cleanliness affects tips. Waiters you hire clean tables for you.',
    ],
  },
  {
    icon: '💰',
    title: 'Two wallets',
    points: [
      'Green = restaurant money. Spend it on dishes, machine upgrades and staff.',
      'Blue = your own wallet. Spend it on clothes, cars and a home.',
      'Move money between them at the Bank (City menu).',
      'Staff wages are paid at the end of each day.',
    ],
  },
  {
    icon: '📈',
    title: 'Growing',
    points: [
      'Kitchen: unlock new dishes and upgrade machines so they cook faster.',
      'Staff: hire chefs (cook for you), waiters (serve and clean) and a manager.',
      'Serving earns XP. New levels add tables and unlock machines.',
      'At level 8 you can open your next restaurant in a new country. Old ones keep earning.',
    ],
  },
  {
    icon: '🎁',
    title: 'Rewards',
    points: [
      'Short goals (top right) pay out every minute or two, and every 5th one opens a chest.',
      'Daily challenges and the daily login bonus reset every day.',
      'End each day with ★★ or better to build a star streak.',
      'Collect Recipe Album cards: a full page adds +3% to every dish.',
    ],
  },
];

interface HowToPlayProps {
  isTouch: boolean;
  joystickSide?: 'left' | 'right';
  onClose: () => void;
  onReplayTutorial: () => void;
}

export const HowToPlay: React.FC<HowToPlayProps> = ({ isTouch, joystickSide = 'left', onClose, onReplayTutorial }) => {
  const list = topics(isTouch, joystickSide);
  const [i, setI] = useState(0);
  const t = list[i];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-3"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
    >
      <div className="w-full max-w-md max-h-full flex flex-col rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800">
          <h2 className="font-display text-lg font-extrabold text-white">How to play</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Topic chips */}
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-slate-800">
          {list.map((tp, k) => (
            <button
              key={tp.title}
              onClick={() => setI(k)}
              className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                k === i ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-900 text-slate-300 border-slate-800'
              }`}
            >
              <span aria-hidden className="mr-1">{tp.icon}</span>
              {tp.title}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-3xl" aria-hidden>
              {t.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {i + 1} of {list.length}
              </p>
              <h3 className="font-display text-xl font-extrabold text-white leading-tight">{t.title}</h3>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {t.points.map((p) => (
              <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-slate-200">
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-800">
          <button
            onClick={onReplayTutorial}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-300 hover:text-sky-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Replay tutorial
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setI((k) => Math.max(0, k - 1))}
              disabled={i === 0}
              className="p-2 rounded-lg bg-slate-800 text-white disabled:opacity-40 cursor-pointer"
              aria-label="Previous topic"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {i < list.length - 1 ? (
              <button
                onClick={() => setI((k) => k + 1)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-400 text-slate-950 text-sm font-extrabold cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={onClose} className="px-3 py-2 rounded-lg bg-amber-400 text-slate-950 text-sm font-extrabold cursor-pointer">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
