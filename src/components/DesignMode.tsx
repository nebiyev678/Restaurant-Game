import React, { useMemo, useState } from 'react';
import { Check, Lock, Move, Palette, RotateCw, Sparkles, Trash2, X } from 'lucide-react';
import {
  computeCharm,
  DECOR_BY_ID,
  DECOR_ITEMS,
  DecorCategory,
  DecorItemId,
  FLOORS,
  FloorId,
  getCharmBonus,
  RestaurantLayout,
  seatingCount,
  sellValue,
  WALLS,
  WallId,
} from '../game/decor';
import { surfaceSwatch } from '../game/decorModels';
import { PreviewThumb } from './ItemPreview';

export interface DesignSelection {
  uid: string;
  item: DecorItemId;
  busy: boolean;
  problem: string | null;
}

interface DesignModeProps {
  layout: RestaurantLayout | undefined;
  cash: number;
  level: number;
  /** Tables the dining room has space for (grows with dining-room expansions). */
  tableLimit: number;
  selection: DesignSelection | null;
  compact: boolean;
  onBuy: (item: DecorItemId) => void;
  onRotate: () => void;
  onSell: () => void;
  onDeselect: () => void;
  onSurface: (kind: 'floor' | 'wall', id: string) => void;
  onDone: () => void;
}

const TABS: { id: DecorCategory; label: string; icon: string }[] = [
  { id: 'seating', label: 'Tables', icon: '🪑' },
  { id: 'plants', label: 'Plants', icon: '🪴' },
  { id: 'decor', label: 'Decor', icon: '🛋️' },
  { id: 'floors', label: 'Floors', icon: '🟫' },
  { id: 'walls', label: 'Walls', icon: '🧱' },
];

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

/** Interior design mode: drag furniture around, turn or sell it, and shop for more. */
export const DesignMode: React.FC<DesignModeProps> = ({
  layout,
  cash,
  level,
  tableLimit,
  selection,
  compact,
  onBuy,
  onRotate,
  onSell,
  onDeselect,
  onSurface,
  onDone,
}) => {
  const [tab, setTab] = useState<DecorCategory>('seating');
  const [confirm, setConfirm] = useState<string | null>(null);
  const charm = computeCharm(layout);
  const bonus = getCharmBonus(charm);
  const tables = layout ? seatingCount(layout) : 0;
  const roomFull = tables >= tableLimit;

  const items = useMemo(() => DECOR_ITEMS.filter((d) => d.category === tab), [tab]);
  const selDef = selection ? DECOR_BY_ID[selection.item] : null;

  const pct = (v: number) => `+${Math.round(v * 100)}%`;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between">
      {/* Top bar: charm and money */}
      <div
        className="pointer-events-auto mx-2 mt-2 flex items-center gap-2 rounded-2xl bg-slate-950/92 border border-slate-700 shadow-xl px-3 py-2"
        style={{ marginTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <Palette className="w-4 h-4 text-amber-300 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold text-sm text-white leading-tight">Design mode</p>
          <p className="text-[10px] text-slate-300 truncate">
            <span className="text-pink-300 font-bold">Charm {charm}</span> · {pct(bonus.guests)} guests · {pct(bonus.tips)} tips
          </p>
        </div>
        <span className="font-mono-num text-xs font-bold text-emerald-300 shrink-0">{money(cash)}</span>
        <button
          onClick={onDone}
          className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold px-3 py-1.5 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" /> Done
        </button>
      </div>

      {!selection && (
        <p className="self-center mt-1 rounded-full bg-slate-950/70 px-3 py-1 text-[10px] text-slate-200">
          Drag furniture to move it · drag the floor to look around
        </p>
      )}
      <div className="flex-1" />

      {/* Bottom: the selected item, or the shop */}
      <div className="pointer-events-auto mx-2 mb-2" style={{ marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {selection && selDef ? (
          <div className="rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl p-2.5 flex items-center gap-2.5">
            <PreviewThumb kind="decor" id={selection.item} alt={selDef.name} className="w-12 h-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm text-white truncate">{selDef.name}</p>
              {selection.problem ? (
                <p className="text-[11px] font-semibold text-rose-300 truncate">{selection.problem}</p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Move className="w-3 h-3" /> Drag to move · Charm +{selDef.charm}
                </p>
              )}
            </div>
            <button
              onClick={onRotate}
              disabled={selection.busy}
              aria-label="Turn"
              className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-[9px] font-bold cursor-pointer"
            >
              <RotateCw className="w-4 h-4" /> Turn
            </button>
            <button
              onClick={onSell}
              disabled={selection.busy}
              aria-label={`Sell for ${money(sellValue(selection.item))}`}
              className="shrink-0 flex flex-col items-center justify-center w-14 h-12 rounded-xl bg-rose-600/90 hover:bg-rose-500 disabled:opacity-40 text-white text-[9px] font-bold cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> +{money(sellValue(selection.item))}
            </button>
            <button onClick={onDeselect} aria-label="Close" className="shrink-0 p-1.5 text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-950/95 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1 px-1.5 pt-1.5 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTab(t.id);
                    setConfirm(null);
                  }}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                    tab === t.id ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
              {tab === 'seating' && (
                <span className={`ml-auto shrink-0 pr-1.5 text-[10px] font-semibold ${roomFull ? 'text-amber-300' : 'text-slate-400'}`}>
                  Tables {tables}/{tableLimit}
                </span>
              )}
            </div>

            <div className={`flex gap-1.5 overflow-x-auto p-1.5 ${compact ? '' : 'pb-2'}`}>
              {(tab === 'floors' || tab === 'walls'
                ? (tab === 'floors' ? FLOORS : WALLS).map((sdef) => {
                    const kind = tab === 'floors' ? 'floor' : 'wall';
                    const owned =
                      kind === 'floor'
                        ? (layout?.ownedFloors ?? ['theme']).includes(sdef.id as FloorId)
                        : (layout?.ownedWalls ?? ['theme']).includes(sdef.id as WallId);
                    const active = kind === 'floor' ? (layout?.floor ?? 'theme') === sdef.id : (layout?.wall ?? 'theme') === sdef.id;
                    const locked = level < sdef.level;
                    const key = `${kind}:${sdef.id}`;
                    const asking = confirm === key;
                    const swatch = sdef.id === 'theme' ? '' : surfaceSwatch(kind, sdef.id);
                    return (
                      <button
                        key={key}
                        disabled={locked}
                        onClick={() => {
                          if (active) return;
                          if (owned) {
                            onSurface(kind, sdef.id);
                            return;
                          }
                          if (!asking) {
                            setConfirm(key);
                            return;
                          }
                          setConfirm(null);
                          onSurface(kind, sdef.id);
                        }}
                        className={`relative shrink-0 w-[84px] rounded-xl border p-1 text-left cursor-pointer ${
                          active ? 'border-amber-400 bg-amber-500/10' : asking ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'
                        } ${locked ? 'opacity-50' : ''}`}
                      >
                        <span
                          className="block w-full h-12 rounded-lg border border-slate-700"
                          style={
                            swatch
                              ? { backgroundImage: `url(${swatch})`, backgroundSize: '48px 48px' }
                              : { background: `linear-gradient(135deg, ${sdef.colors[0]}, ${sdef.colors[1]})` }
                          }
                        />
                        <span className="block mt-1 text-[10px] font-bold text-white leading-tight line-clamp-2">{sdef.name}</span>
                        <span className="block text-[10px] font-semibold">
                          {locked ? (
                            <span className="text-slate-400 inline-flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Lv {sdef.level}
                            </span>
                          ) : active ? (
                            <span className="text-amber-300">In use</span>
                          ) : owned ? (
                            <span className="text-sky-300">Use</span>
                          ) : asking ? (
                            <span className="text-emerald-300">Tap to buy</span>
                          ) : (
                            <span className={cash >= sdef.price ? 'text-emerald-300' : 'text-rose-300'}>{money(sdef.price)}</span>
                          )}
                          {sdef.charm > 0 && <span className="text-pink-300"> · +{sdef.charm}</span>}
                        </span>
                      </button>
                    );
                  })
                : items.map((d) => {
                    const locked = level < d.level;
                    const full = d.category === 'seating' && roomFull;
                    const asking = confirm === d.id;
                    return (
                      <button
                        key={d.id}
                        disabled={locked}
                        onClick={() => {
                          if (!asking) {
                            setConfirm(d.id);
                            return;
                          }
                          setConfirm(null);
                          onBuy(d.id);
                        }}
                        className={`relative shrink-0 w-[84px] rounded-xl border p-1 text-left cursor-pointer ${
                          asking ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'
                        } ${locked ? 'opacity-50' : ''}`}
                        title={d.blurb}
                      >
                        <PreviewThumb kind="decor" id={d.id} alt={d.name} locked={locked} className="w-full h-14" />
                        <span className="block mt-1 text-[10px] font-bold text-white leading-tight line-clamp-2 min-h-[2.4em]">{d.name}</span>
                        <span className="block text-[10px] font-semibold">
                          {locked ? (
                            <span className="text-slate-400 inline-flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Lv {d.level}
                            </span>
                          ) : full ? (
                            <span className="text-amber-300">Room full</span>
                          ) : asking ? (
                            <span className="text-emerald-300">Tap to buy</span>
                          ) : (
                            <span className={cash >= d.price ? 'text-emerald-300' : 'text-rose-300'}>{money(d.price)}</span>
                          )}
                          <span className="text-pink-300"> · +{d.charm}</span>
                        </span>
                      </button>
                    );
                  }))}
            </div>
            {tab === 'seating' && (
              <p className="px-2.5 pb-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-300" />
                Each table seats guests. Bigger dining rooms (Cafe → Expansions) fit more tables.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
