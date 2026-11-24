import React, { useState } from 'react';
import { BookOpen, Check, Gift, Lock, Sparkles, X } from 'lucide-react';
import { AlbumCardDef, AlbumRarity, AlbumState, CuisineId } from '../game/types';
import {
  ALBUM_PAGE_PRICE_BONUS,
  CUISINE_ORDER,
  CUISINES,
  getAlbumPage,
  getAlbumPageReward,
  isAlbumPageComplete,
} from '../game/cuisines';
import { PreviewThumb } from './ItemPreview';

const RARITY_STYLE: Record<AlbumRarity, { frame: string; label: string; chip: string }> = {
  common: { frame: 'border-sky-400/70 from-sky-950 to-slate-900', label: 'Common', chip: 'bg-sky-500/20 text-sky-200' },
  rare: { frame: 'border-violet-400/80 from-violet-950 to-slate-900', label: 'Rare', chip: 'bg-violet-500/25 text-violet-200' },
  gold: { frame: 'border-amber-300 from-amber-900 to-slate-900', label: 'Gold', chip: 'bg-amber-400/25 text-amber-200' },
};

interface CardFaceProps {
  card: AlbumCardDef;
  count: number;
  isNew?: boolean;
  size?: 'grid' | 'toast';
}

export const AlbumCardFace: React.FC<CardFaceProps> = ({ card, count, isNew, size = 'grid' }) => {
  const style = RARITY_STYLE[card.rarity];
  const owned = count > 0;
  const toast = size === 'toast';
  return (
    <div
      className={`relative rounded-xl border-2 bg-gradient-to-b ${style.frame} overflow-hidden ${
        owned ? '' : 'opacity-60 grayscale'
      } ${card.rarity === 'gold' && owned ? 'shadow-[0_0_14px_rgba(251,191,36,0.45)]' : ''} ${toast ? 'w-24' : ''}`}
    >
      <div className={`flex items-center justify-center ${toast ? 'h-16' : 'h-[4.5rem]'} bg-black/20`}>
        {!owned ? (
          <span className="font-display text-3xl font-extrabold text-slate-500">?</span>
        ) : card.recipeId ? (
          <PreviewThumb kind="recipe" id={card.recipeId} alt={card.name} className="w-full h-full" />
        ) : (
          <span className={toast ? 'text-4xl' : 'text-[2.6rem]'} aria-hidden>
            {card.emoji}
          </span>
        )}
      </div>
      <div className="px-1.5 py-1">
        <p className="text-[10px] font-bold text-white leading-tight truncate">{owned ? card.name : '???'}</p>
        <span className={`inline-block mt-0.5 px-1 rounded text-[8px] font-extrabold uppercase ${style.chip}`}>{style.label}</span>
      </div>
      {count > 1 && (
        <span className="absolute top-1 right-1 px-1 rounded bg-slate-950/85 text-[9px] font-mono-num font-bold text-slate-200">×{count}</span>
      )}
      {isNew && (
        <span className="absolute top-1 left-1 px-1 rounded bg-rose-500 text-[8px] font-extrabold text-white uppercase">New</span>
      )}
    </div>
  );
};

interface RecipeAlbumProps {
  album: AlbumState;
  activeCuisine: CuisineId;
  ownedRestaurants: CuisineId[];
  restaurantLevel: number;
  onClaimPage: (cuisine: CuisineId) => void;
  onClose: () => void;
}

export const RecipeAlbum: React.FC<RecipeAlbumProps> = ({
  album,
  activeCuisine,
  ownedRestaurants,
  restaurantLevel,
  onClaimPage,
  onClose,
}) => {
  const [page, setPage] = useState<CuisineId>(activeCuisine);
  const reached = (c: CuisineId) => c === activeCuisine || ownedRestaurants.includes(c);
  const cards = getAlbumPage(page);
  const owned = cards.filter((c) => (album.cards[c.id] ?? 0) > 0).length;
  const complete = isAlbumPageComplete(album, page);
  const claimed = album.claimedPages.includes(page);
  const totalOwned = (Object.values(album.cards) as number[]).filter((n) => n > 0).length;
  const cuisine = CUISINES[page];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-2 sm:px-4" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }} role="dialog" aria-modal="true" aria-label="Recipe Album">
      <div className="w-full sm:max-w-lg max-h-full flex flex-col rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-white leading-tight">Recipe Album</h2>
              <p className="text-[11px] text-slate-400">
                {totalOwned}/{CUISINE_ORDER.length * 9} cards · {album.claimedPages.length} pages complete (+
                {Math.round(album.claimedPages.length * ALBUM_PAGE_PRICE_BONUS * 100)}% dish prices)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close album">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Country tabs */}
        <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-slate-800">
          {CUISINE_ORDER.map((c) => {
            const def = CUISINES[c];
            const pageOwned = getAlbumPage(c).filter((x) => (album.cards[x.id] ?? 0) > 0).length;
            const ready = isAlbumPageComplete(album, c) && !album.claimedPages.includes(c);
            return (
              <button
                key={c}
                onClick={() => setPage(c)}
                className={`relative shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                  page === c ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                <span aria-hidden>{reached(c) ? def.flag : '🔒'}</span>
                <span className="font-mono-num">{pageOwned}/9</span>
                {ready && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500" />}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display font-extrabold text-white truncate">
                {cuisine.flag} {cuisine.name}
              </p>
              <p className="text-[11px] text-slate-400">{cuisine.country} page · {owned}/9 collected</p>
            </div>
            {claimed ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-300">
                <Check className="w-4 h-4" /> Complete
              </span>
            ) : complete ? (
              <button
                onClick={() => onClaimPage(page)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer animate-pulse"
              >
                <Gift className="w-4 h-4" /> Claim ${getAlbumPageReward(restaurantLevel).toLocaleString()}
              </button>
            ) : (
              <span className="text-[10px] text-slate-400 text-right leading-tight">
                Finish for ${getAlbumPageReward(restaurantLevel).toLocaleString()}
                <br />+3% on every dish
              </span>
            )}
          </div>

          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(owned / 9) * 100}%` }} />
          </div>

          {!reached(page) && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-[11px] text-slate-300">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Open {cuisine.name} (restaurant level {cuisine.requiredLevel}) to start finding these cards.
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {cards.map((c) => (
              <AlbumCardFace key={c.id} card={c} count={album.cards[c.id] ?? 0} isNew={album.unseen.includes(c.id)} />
            ))}
          </div>

          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3 text-[11px] text-slate-300 space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> How to find cards
            </p>
            <p>• Serving orders sometimes drops a card (combos drop more often).</p>
            <p>• Goal chests give 2 cards, the daily challenge chest gives 3, and a ★★★ day gives 1.</p>
            <p>• Duplicates turn into cash. Old restaurants' pages still drop sometimes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Small pop-in card when a new album card is found during play. */
export const NewCardsToast: React.FC<{ card: AlbumCardDef; compact: boolean }> = ({ card, compact }) => (
  <div
    className={`fixed z-40 pointer-events-none flex items-center gap-2 rounded-2xl bg-slate-950/95 border border-amber-400/60 shadow-2xl p-2 animate-slide-in ${
      compact ? 'left-2' : 'left-4'
    }`}
    style={{ top: compact ? 'calc(max(0.5rem, env(safe-area-inset-top)) + 6.5rem)' : '6rem' }}
    role="status"
  >
    <AlbumCardFace card={card} count={1} size="toast" />
    <div className="pr-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">New album card!</p>
      <p className="font-display font-extrabold text-white text-sm leading-tight">{card.name}</p>
      <p className="text-[10px] text-slate-400 max-w-[9rem] leading-snug">{card.blurb}</p>
    </div>
  </div>
);
