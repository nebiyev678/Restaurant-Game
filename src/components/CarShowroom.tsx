import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Gauge, KeyRound, Lock, Wallet } from 'lucide-react';
import { VEHICLE_CATALOG } from '../game/data';
import { buildPreviewModel, previewShot } from '../game/previewModels';
import { SaveState } from '../game/types';
import { LiveModelViewer, PreviewThumb } from './ItemPreview';

interface CarShowroomProps {
  save: SaveState;
  inVehicle: boolean;
  onBuyOrSelectVehicle: (id: string) => void;
  onToggleDrive: () => void;
  onClose: () => void;
}

const MAX_SPEED = Math.max(...VEHICLE_CATALOG.map((v) => v.speed));
const MAX_PRICE = Math.max(...VEHICLE_CATALOG.map((v) => v.price));

const STYLE_LABEL: Record<string, string> = {
  hatch: 'Hatchback',
  compact: 'Compact',
  sedan: 'Sedan',
  suv: 'SUV',
  sports: 'Sports',
  supercar: 'Supercar',
};

/** Apex Motors showroom: browse cars as rotating 3D models instead of a text list. */
export const CarShowroom: React.FC<CarShowroomProps> = ({
  save,
  inVehicle,
  onBuyOrSelectVehicle,
  onToggleDrive,
  onClose,
}) => {
  const initialIndex = useMemo(() => {
    const i = VEHICLE_CATALOG.findIndex((v) => v.id === save.activeVehicleId);
    if (i >= 0) return i;
    // Otherwise open on the best car the player can afford right now
    let best = 0;
    VEHICLE_CATALOG.forEach((v, idx) => {
      if (v.price <= save.personalWallet) best = idx;
    });
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(initialIndex);
  const stripRef = useRef<HTMLDivElement>(null);

  const car = VEHICLE_CATALOG[index];
  const owned = save.ownedVehicles.includes(car.id);
  const active = save.activeVehicleId === car.id;
  const canBuy = !owned && save.personalWallet >= car.price;
  const shortfall = Math.max(0, car.price - save.personalWallet);

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + VEHICLE_CATALOG.length) % VEHICLE_CATALOG.length);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Keep the selected thumbnail scrolled into view
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-car="${car.id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [car.id]);

  return (
    <div className="space-y-3">
      {/* Stage */}
      <LiveModelViewer
        modelKey={car.id}
        build={() => buildPreviewModel('vehicle', car.id)}
        shot={{ ...previewShot('vehicle', car.id), pitch: 0.28, padding: 0.82 }}
        className="h-56 sm:h-72 rounded-2xl border border-slate-800"
      >
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-slate-950/75 px-2 py-1 text-[11px] font-bold text-slate-200">
            {car.category}
          </span>
          {active ? (
            <span className="rounded-md bg-emerald-500 px-2 py-1 text-[11px] font-bold text-slate-950">
              {inVehicle ? 'Driving' : 'Your car'}
            </span>
          ) : owned ? (
            <span className="rounded-md bg-sky-500 px-2 py-1 text-[11px] font-bold text-slate-950">Owned</span>
          ) : null}
        </div>
        <span className="pointer-events-none absolute top-3 right-3 rounded-md bg-slate-950/75 px-2 py-1 font-mono-num text-[11px] font-bold text-slate-300">
          {index + 1} / {VEHICLE_CATALOG.length}
        </span>
        <button
          onClick={() => go(-1)}
          aria-label="Previous car"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Next car"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-white flex items-center justify-center cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </LiveModelViewer>

      {/* Details + action */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-xl font-extrabold text-white leading-tight">{car.name}</h3>
            <p className="text-xs text-slate-400">{STYLE_LABEL[car.style] ?? car.style}</p>
          </div>
          <p className="font-mono-num text-lg font-extrabold text-amber-300">
            {car.price === 0 ? 'Free' : `$${car.price.toLocaleString()}`}
          </p>
        </div>
        <p className="text-xs text-slate-300">{car.description}</p>

        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-sky-400" /> Top speed
              </span>
              <span className="font-mono-num font-bold text-slate-200">{Math.round(car.speed * 7)} km/h</span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-500"
                style={{ width: `${(car.speed / MAX_SPEED) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Prestige
              </span>
              <span className="font-mono-num font-bold text-slate-200">
                {'★'.repeat(Math.max(1, Math.ceil((car.price / MAX_PRICE) * 5)))}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-[width] duration-500"
                style={{ width: `${Math.max(6, Math.sqrt(car.price / MAX_PRICE) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            disabled={!owned && !canBuy}
            onClick={() => onBuyOrSelectVehicle(car.id)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-display font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              active
                ? 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 cursor-default'
                : owned
                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                  : canBuy
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {active ? (
              <>
                <Check className="w-4 h-4" /> Parked outside
              </>
            ) : owned ? (
              'Park this car outside'
            ) : canBuy ? (
              <>
                <Wallet className="w-4 h-4" /> Buy for ${car.price.toLocaleString()}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Need ${shortfall.toLocaleString()} more
              </>
            )}
          </button>
          {active && (
            <button
              onClick={() => {
                onToggleDrive();
                onClose();
              }}
              className="sm:w-44 py-3 px-4 rounded-xl text-sm font-display font-extrabold bg-sky-500 hover:bg-sky-400 text-slate-950 cursor-pointer"
            >
              {inVehicle ? 'Park & exit' : 'Hop in & drive'}
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1">
          <Wallet className="w-3 h-3" /> Wallet: ${save.personalWallet.toLocaleString()}
        </p>
      </div>

      {/* Thumbnail strip of the whole lineup */}
      <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-1 snap-x">
        {VEHICLE_CATALOG.map((v, i) => {
          const isOwned = save.ownedVehicles.includes(v.id);
          const affordable = isOwned || save.personalWallet >= v.price;
          return (
            <button
              key={v.id}
              data-car={v.id}
              onClick={() => setIndex(i)}
              aria-label={v.name}
              className={`relative shrink-0 snap-center w-28 rounded-xl border-2 p-1 text-left cursor-pointer transition-colors ${
                i === index ? 'border-amber-400 bg-slate-900' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
              }`}
            >
              <PreviewThumb kind="vehicle" id={v.id} alt={v.name} locked={!affordable} className="h-16 w-full" />
              <p className="mt-1 truncate text-[11px] font-bold text-white">{v.name}</p>
              <p className="font-mono-num text-[10px] text-slate-400">
                {isOwned ? 'Owned' : `$${v.price.toLocaleString()}`}
              </p>
              {isOwned && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
              {!affordable && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-950/80 text-slate-400 flex items-center justify-center">
                  <Lock className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
