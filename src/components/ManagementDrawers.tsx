import React, { useEffect, useState } from 'react';
import {
  Award,
  Building2,
  Car,
  Check,
  ChefHat,
  Coffee,
  Home,
  Lock,
  MapPin,
  Music,
  Palette,
  Shirt,
  ShoppingBag,
  Sparkles,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { CarShowroom } from './CarShowroom';
import { LiveModelViewer, PreviewThumb } from './ItemPreview';
import { buildDressedChef, buildHomePreview } from '../game/previewModels';
import {
  ACHIEVEMENTS,
  CAFE_THEMES,
  CITY_ZONES,
  CLOTHING_CATALOG,
  EQUIPMENT_CATALOG,
  FRANCHISE_CATALOG,
  FURNITURE_CATALOG,
  HOUSE_CATALOG,
  MISSIONS,
  RECIPE_LIST,
  SPECIALTY_LINES,
  STAFF_CATALOG,
  STAFF_MAX_LEVEL,
  VEHICLE_CATALOG,
  getEquipmentUpgradeCost,
  getPrestigeTipBonus,
  getRestaurantTier,
  getStaffDailySalary,
  getStaffTrainingCost,
  getStaffXpForNextLevel,
  getTotalDailyPayroll,
  getXpForNextLevel,
} from '../game/data';
import {
  CafeThemeId,
  DrawerTab,
  EquipmentId,
  RecipeId,
  SaveState,
  SpecialtyLineId,
  StaffRole,
} from '../game/types';

interface ManagementDrawersProps {
  activeTab: DrawerTab;
  initialSubTab?: string;
  save: SaveState;
  inVehicle: boolean;
  onClose: () => void;
  onUnlockRecipe: (id: RecipeId) => void;
  onUnlockSpecialtyLine: (lineId: SpecialtyLineId) => void;
  onUpgradeEquipment: (id: EquipmentId) => void;
  onHireStaff: (role: StaffRole) => void;
  onUpgradeStaff: (staffId: string) => void;
  onBuyOrEquipCloth: (itemId: string) => void;
  onBuyOrSelectVehicle: (vehicleId: string) => void;
  onToggleDrive: () => void;
  onBuyOrSelectHouse: (houseId: string) => void;
  onBuyFurniture: (furnId: string) => void;
  onTravelZone: (zoneId: string) => void;
  onWithdrawToWallet: (amount: number) => void;
  onInvestToBusiness: (amount: number) => void;
  onBuyWholesaleUpgrade: () => void;
  onBuyFranchise: (franchiseId: string) => void;
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achId: string) => void;
  onBuyOrEquipCafeTheme: (themeId: CafeThemeId) => void;
  onToggleMute: () => void;
  onToggleMusicMute: () => void;
  onSaveNow: () => void;
  onSetGraphicsQuality: (q: SaveState['graphicsQuality']) => void;
  onToggleHaptics: () => void;
  onResetSave: () => void;
  onAdvanceTimeOfDay: () => void;
}

export const ManagementDrawers: React.FC<ManagementDrawersProps> = ({
  activeTab,
  initialSubTab,
  save,
  inVehicle,
  onClose,
  onUnlockRecipe,
  onUnlockSpecialtyLine,
  onUpgradeEquipment,
  onHireStaff,
  onUpgradeStaff,
  onBuyOrEquipCloth,
  onBuyOrSelectVehicle,
  onToggleDrive,
  onBuyOrSelectHouse,
  onBuyFurniture,
  onTravelZone,
  onWithdrawToWallet,
  onInvestToBusiness,
  onBuyWholesaleUpgrade,
  onBuyFranchise,
  onClaimMission,
  onClaimAchievement,
  onBuyOrEquipCafeTheme,
  onToggleMute,
  onToggleMusicMute,
  onSaveNow,
  onSetGraphicsQuality,
  onToggleHaptics,
  onResetSave,
  onAdvanceTimeOfDay,
}) => {
  const [restaurantSub, setRestaurantSub] = useState<'equipment' | 'themes'>('equipment');
  const [lifestyleSub, setLifestyleSub] = useState<'clothing' | 'cars' | 'housing'>('clothing');
  const [citySub, setCitySub] = useState<'travel' | 'bank' | 'market' | 'franchises'>('travel');
  // Wardrobe try-on (tap a thumbnail to see it on your chef before buying)
  const [tryOn, setTryOn] = useState<{ outfit: string; hat: string; watch: string } | null>(null);
  // Housing showroom: which property is shown in the live 3D viewer
  const [previewHouseId, setPreviewHouseId] = useState<string | null>(null);
  const [kitchenSub, setKitchenSub] = useState<'all' | 'classic' | 'specialty' | 'desserts' | 'beverages'>('all');

  useEffect(() => {
    if (activeTab === 'restaurant' && initialSubTab && ['equipment', 'themes'].includes(initialSubTab)) {
      setRestaurantSub(initialSubTab as 'equipment' | 'themes');
    }
    if (activeTab === 'lifestyle' && initialSubTab && ['clothing', 'cars', 'housing'].includes(initialSubTab)) {
      setLifestyleSub(initialSubTab as 'clothing' | 'cars' | 'housing');
    }
    if (activeTab === 'city' && initialSubTab && ['travel', 'bank', 'market', 'franchises'].includes(initialSubTab)) {
      setCitySub(initialSubTab as 'travel' | 'bank' | 'market' | 'franchises');
    }
    if (
      activeTab === 'kitchen' &&
      initialSubTab &&
      ['all', 'classic', 'specialty', 'desserts', 'beverages'].includes(initialSubTab)
    ) {
      setKitchenSub(initialSubTab as 'all' | 'classic' | 'specialty' | 'desserts' | 'beverages');
    }
  }, [activeTab, initialSubTab]);

  if (activeTab === 'none') return null;

  const tierInfo = getRestaurantTier(save.restaurantLevel);
  const nextXp = getXpForNextLevel(save.restaurantLevel);

  const getMetricValue = (metric: string): number => {
    switch (metric) {
      case 'customersServed':
        return save.stats.customersServed;
      case 'dishesCooked':
        return save.stats.dishesCooked;
      case 'burgersCooked':
        return save.stats.burgersCooked;
      case 'totalEarned':
        return save.totalEarned;
      case 'personalWealth':
        return save.personalWallet + save.restaurantCash;
      case 'staffHired':
        return save.staff.length;
      case 'upgradesBought':
        return save.stats.upgradesBought;
      case 'carsOwned':
        return save.ownedVehicles.length;
      case 'housesOwned':
        return save.ownedHouses.length;
      case 'restaurantLevel':
        return save.restaurantLevel;
      case 'recipesUnlocked':
        return save.unlockedRecipes.length;
      default:
        return 0;
    }
  };

  const tabTitles: Record<Exclude<DrawerTab, 'none'>, string> = {
    restaurant: 'Restaurant & Equipment',
    kitchen: 'Culinary Menu & Recipes',
    staff: 'Staff Brigade Management',
    city: 'City World, Bank & Franchises',
    lifestyle: 'Personal Lifestyle & Assets',
    missions: 'Missions & Achievements',
    settings: 'Game Settings & Save',
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-slate-950/70 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[82vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl overflow-hidden text-slate-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800 bg-slate-900">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              {tabTitles[activeTab]}
            </h2>
            <p className="text-xs text-slate-400 font-mono-num">
              Business: ${save.restaurantCash.toLocaleString()} · Personal: $
              {save.personalWallet.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 drawer-scroll">
          {/* RESTAURANT, EQUIPMENT & CAFE STYLE THEMES */}
          {activeTab === 'restaurant' && (
            <>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setRestaurantSub('equipment')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    restaurantSub === 'equipment'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Equipment &amp; Growth</span>
                </button>
                <button
                  onClick={() => setRestaurantSub('themes')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    restaurantSub === 'themes'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>Cafe Style Themes</span>
                </button>
              </div>

              {restaurantSub === 'equipment' ? (
                <>
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-semibold text-amber-400">
                          Tier {tierInfo.tier} · {tierInfo.tableCount} Dining Tables
                        </span>
                        <h3 className="font-display text-base font-bold text-white">{tierInfo.title}</h3>
                      </div>
                      <span className="font-mono-num text-sm font-bold text-slate-200">
                        Level {save.restaurantLevel} ({save.xp}/{nextXp} XP)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-950 overflow-hidden mb-3">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, (save.xp / nextXp) * 100)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-[11px] text-center">
                      {[
                        { lv: 1, label: 'Small Bistro' },
                        { lv: 5, label: 'Growing' },
                        { lv: 10, label: 'Popular' },
                        { lv: 20, label: 'Premium' },
                        { lv: 35, label: 'Empire' },
                      ].map((m) => (
                        <div
                          key={m.lv}
                          className={`py-1.5 px-1 rounded-lg border ${
                            save.restaurantLevel >= m.lv
                              ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          Lv {m.lv} · {m.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(EQUIPMENT_CATALOG) as EquipmentId[]).map((eqId) => {
                      const def = EQUIPMENT_CATALOG[eqId];
                      const lv = save.equipmentLevels[eqId] ?? 1;
                      const maxed = lv >= def.maxLevel;
                      const cost = getEquipmentUpgradeCost(eqId, lv);
                      const canBuy = !maxed && save.restaurantCash >= cost;

                      return (
                        <div
                          key={eqId}
                          className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col justify-between gap-3"
                        >
                          <div>
                            <PreviewThumb kind="equipment" id={eqId} alt={def.name} className="h-28 w-full mb-2.5" />
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-sm text-white">{def.name}</span>
                              <span className="font-mono-num text-xs text-amber-400">
                                Lv {lv}/{def.maxLevel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1.5">{def.description}</p>
                            <p className="text-xs font-medium text-emerald-400">{def.effectLabel}</p>
                          </div>
                          <button
                            disabled={!canBuy || maxed}
                            onClick={() => onUpgradeEquipment(eqId)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                              maxed
                                ? 'bg-emerald-950/60 text-emerald-300 cursor-default'
                                : canBuy
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            {maxed ? 'Max Upgraded' : `Upgrade · $${cost.toLocaleString()}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-bold text-white">
                        Interior Style &amp; Acoustic Atmosphere
                      </h3>
                      <p className="text-xs text-slate-400">
                        Restyle your 3D walls, floors, furniture &amp; live background music while boosting guest tips.
                      </p>
                    </div>
                    <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CAFE_THEMES.map((theme) => {
                      const owned = (save.ownedCafeThemes ?? ['classic_bistro']).includes(theme.id);
                      const isActive = (save.activeCafeThemeId ?? 'classic_bistro') === theme.id;
                      const levelMet = save.restaurantLevel >= theme.requiredLevel;
                      const canBuy = !owned && levelMet && save.restaurantCash >= theme.price;
                      const moodLabels: Record<typeof theme.musicMood, string> = {
                        bistro: 'Acoustic Bistro Jazz',
                        waltz: 'Parisian Chanson Waltz',
                        tea: 'Serene Tea Garden',
                        lofi: 'Espresso Lo-Fi Chill',
                        royal: 'Grand Salon Harp',
                      };

                      return (
                        <div
                          key={theme.id}
                          className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                            isActive
                              ? 'bg-amber-950/25 border-amber-500/70'
                              : owned
                                ? 'bg-slate-900 border-emerald-700/50'
                                : 'bg-slate-900 border-slate-800'
                          }`}
                        >
                          <div>
                            <PreviewThumb
                              kind="theme"
                              id={theme.id}
                              alt={`${theme.name} interior`}
                              locked={!owned && !levelMet}
                              className="h-36 w-full mb-2.5"
                            />
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-sm text-white">{theme.name}</span>
                                  {isActive && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-medium text-amber-300">{theme.subtitle}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {[
                                  theme.wallColor,
                                  theme.floorPrimary,
                                  theme.cushionColor,
                                  theme.trimColor,
                                ].map((swatch, idx) => (
                                  <span
                                    key={idx}
                                    className="w-3.5 h-3.5 rounded-full border border-white/25"
                                    style={{ backgroundColor: swatch }}
                                  />
                                ))}
                              </div>
                            </div>

                            <p className="text-xs text-slate-400 mb-2 leading-relaxed">{theme.description}</p>

                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-700/40 text-emerald-300 font-semibold">
                                {theme.tipBonus > 0 ? `+${theme.tipBonus}% Customer Tips` : 'Classic Baseline'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-300 inline-flex items-center gap-1">
                                <Music className="w-3 h-3" />
                                {moodLabels[theme.musicMood]}
                              </span>
                            </div>
                          </div>

                          <button
                            disabled={isActive || (!owned && !canBuy)}
                            onClick={() => onBuyOrEquipCafeTheme(theme.id)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-default'
                                : owned
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : canBuy
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Currently Styled
                              </>
                            ) : owned ? (
                              <>
                                <Palette className="w-3.5 h-3.5" />
                                Apply Style &amp; Music
                              </>
                            ) : !levelMet ? (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                Requires Level {theme.requiredLevel}
                              </>
                            ) : (
                              <>
                                <Palette className="w-3.5 h-3.5" />
                                Unlock Style · ${theme.price.toLocaleString()}
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* KITCHEN RECIPES & SPECIALTY STATION LINES */}
          {activeTab === 'kitchen' && (
            <div className="space-y-4">
              {/* Category Filter Bar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
                {[
                  { id: 'all', label: 'All Recipes' },
                  { id: 'classic', label: 'Classic Kitchen' },
                  { id: 'specialty', label: 'Specialty Station' },
                  { id: 'desserts', label: 'Desserts Line' },
                  { id: 'beverages', label: 'Beverages Line' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setKitchenSub(tab.id as typeof kitchenSub)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      kitchenSub === tab.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Specialty Station Recipe Line Unlocks */}
              {kitchenSub !== 'classic' && (
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                      <div>
                        <h3 className="font-display text-sm font-bold text-white">
                          Specialty Station · Advanced Recipe Lines
                        </h3>
                        <p className="text-xs text-slate-400">
                          Unlock specialized Desserts &amp; Beverages tracks to craft high-margin recipes.
                        </p>
                      </div>
                    </div>
                    <span className="font-mono-num text-xs text-pink-300 font-semibold">
                      Station Lv {save.equipmentLevels.specialty ?? 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(SPECIALTY_LINES) as SpecialtyLineId[]).map((lineId) => {
                      const line = SPECIALTY_LINES[lineId];
                      const unlocked = save.unlockedSpecialtyLines.includes(lineId);
                      const levelMet = save.restaurantLevel >= line.requiredLevel;
                      const canUnlock =
                        !unlocked && levelMet && save.restaurantCash >= line.unlockCost;
                      const lineRecipes = RECIPE_LIST.filter((r) => r.recipeLine === lineId);
                      const isDesserts = lineId === 'desserts';

                      return (
                        <div
                          key={lineId}
                          className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                            unlocked
                              ? isDesserts
                                ? 'bg-pink-950/25 border-pink-500/40'
                                : 'bg-teal-950/25 border-teal-500/40'
                              : 'bg-slate-950/80 border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex gap-1.5 mb-2.5">
                              {lineRecipes.map((lr) => (
                                <PreviewThumb
                                  key={lr.id}
                                  kind="recipe"
                                  id={lr.id}
                                  alt={lr.name}
                                  locked={!unlocked}
                                  className="h-20 flex-1"
                                />
                              ))}
                            </div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                                {isDesserts ? (
                                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                                ) : (
                                  <Coffee className="w-3.5 h-3.5 text-teal-400" />
                                )}
                                {line.name}
                              </span>
                              <span className="text-[11px] font-mono-num text-slate-400">
                                {lineRecipes.length} recipes
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-1.5">{line.description}</p>
                            <p className="text-[11px] text-slate-300">
                              Includes: {lineRecipes.map((x) => x.name).join(' · ')}
                            </p>
                          </div>

                          {unlocked ? (
                            <div className="py-2 px-3 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Recipe Line Unlocked
                            </div>
                          ) : (
                            <button
                              disabled={!canUnlock}
                              onClick={() => onUnlockSpecialtyLine(lineId)}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                                canUnlock
                                  ? 'bg-pink-500 hover:bg-pink-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {!levelMet ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" /> Requires Lv {line.requiredLevel}
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" /> Unlock Line · $
                                  {line.unlockCost.toLocaleString()}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filtered Recipes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RECIPE_LIST.filter((r) => {
                  if (kitchenSub === 'classic') return !r.recipeLine;
                  if (kitchenSub === 'specialty') return r.station === 'specialty';
                  if (kitchenSub === 'desserts') return r.recipeLine === 'desserts';
                  if (kitchenSub === 'beverages') return r.recipeLine === 'beverages';
                  return true;
                }).map((r) => {
                  const unlocked = save.unlockedRecipes.includes(r.id);
                  const lineUnlocked =
                    !r.recipeLine || save.unlockedSpecialtyLines.includes(r.recipeLine);
                  const levelMet = save.restaurantLevel >= r.requiredLevel;
                  const canUnlock =
                    !unlocked && lineUnlocked && levelMet && save.restaurantCash >= r.unlockCost;
                  const actualCost = Math.max(
                    1,
                    Math.round(r.ingredientCost * (1 - save.bulkIngredientsDiscount))
                  );
                  const specialtyMult =
                    r.station === 'specialty'
                      ? 1 + ((save.equipmentLevels.specialty ?? 1) - 1) * 0.1
                      : 1;
                  const effectiveSell = Math.round(r.sellPrice * specialtyMult);

                  return (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 ${
                        unlocked
                          ? 'bg-slate-900 border-emerald-700/40'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div>
                        <PreviewThumb
                          kind="recipe"
                          id={r.id}
                          alt={r.name}
                          locked={!unlocked && !canUnlock}
                          className="h-28 w-full mb-2.5"
                        />
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-sm text-white truncate">
                              {r.name}
                            </span>
                            {r.recipeLine && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                  r.recipeLine === 'desserts'
                                    ? 'bg-pink-500/20 text-pink-300'
                                    : 'bg-teal-500/20 text-teal-300'
                                }`}
                              >
                                {r.recipeLine === 'desserts' ? 'Dessert' : 'Beverage'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono-num text-emerald-400 shrink-0">
                            Sell ${effectiveSell} · Cost ${actualCost}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{r.description}</p>
                        <p className="text-[11px] text-slate-500">
                          Station: {r.station === 'specialty' ? 'SPECIALTY STATION' : r.station.toUpperCase()} · Unlocks at Level {r.requiredLevel}
                        </p>
                      </div>

                      {unlocked ? (
                        <div className="py-2 px-3 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" /> On Active Menu
                        </div>
                      ) : (
                        <button
                          disabled={!canUnlock}
                          onClick={() => onUnlockRecipe(r.id)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            canUnlock
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {!lineUnlocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" /> Unlock{' '}
                              {r.recipeLine === 'desserts' ? 'Desserts' : 'Beverages'} Line First
                            </>
                          ) : !levelMet ? (
                            <>
                              <Lock className="w-3.5 h-3.5" /> Requires Lv {r.requiredLevel}
                            </>
                          ) : (
                            <>
                              <ChefHat className="w-3.5 h-3.5" /> Unlock Recipe · $
                              {r.unlockCost.toLocaleString()}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAFF MANAGEMENT */}
          {activeTab === 'staff' && (
            <>
              {save.staff.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Active Brigade ({save.staff.length})
                    </h3>
                    <span className="text-[11px] font-mono-num text-amber-400">
                      Payroll ${getTotalDailyPayroll(save.staff).toLocaleString()}/day · paid at midnight
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {save.staff.map((s) => {
                      const upgCost = getStaffTrainingCost(s.level);
                      const maxed = s.level >= STAFF_MAX_LEVEL;
                      const canUpg = !maxed && save.restaurantCash >= upgCost;
                      const xpNeed = getStaffXpForNextLevel(s.level);
                      const xpPct = maxed ? 100 : Math.min(100, ((s.xp ?? 0) / xpNeed) * 100);
                      return (
                        <div
                          key={s.id}
                          className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3"
                        >
                          <PreviewThumb kind="staff" id={s.role} alt={s.name} className="w-14 h-16 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white">{s.name}</p>
                            <p className="text-xs text-slate-400 font-mono-num">
                              Lv {s.level} · Speed {Math.round((1 + (s.level - 1) * 0.14) * 100)}% · $
                              {getStaffDailySalary(s)}/day
                            </p>
                            <div
                              className="mt-1.5 h-1.5 rounded-full bg-slate-950 overflow-hidden"
                              title={maxed ? 'Max level' : `${s.xp ?? 0}/${xpNeed} XP to next level`}
                            >
                              <div
                                className={`h-full ${maxed ? 'bg-emerald-500' : 'bg-sky-400'}`}
                                style={{ width: `${xpPct}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono-num">
                              {maxed ? 'Fully trained' : `${s.xp ?? 0}/${xpNeed} XP · levels up by working`}
                            </p>
                          </div>
                          <button
                            disabled={!canUpg}
                            onClick={() => onUpgradeStaff(s.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                              maxed
                                ? 'bg-emerald-950/60 text-emerald-300'
                                : canUpg
                                  ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {maxed ? 'Max Lv' : `Train $${upgCost}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Hire New Staff (Visible in 3D Restaurant)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STAFF_CATALOG.map((st) => {
                    const levelMet = save.restaurantLevel >= st.requiredLevel;
                    const count = save.staff.filter((x) => x.role === st.role).length;
                    const cost = Math.round(st.hireCost * Math.pow(1.35, count));
                    const canHire = levelMet && save.restaurantCash >= cost;

                    return (
                      <div
                        key={st.role}
                        className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <PreviewThumb
                            kind="staff"
                            id={st.role}
                            alt={st.title}
                            locked={!levelMet}
                            className="h-32 w-full mb-2.5"
                          />
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-white">{st.title}</span>
                            <span className="text-xs font-mono-num text-slate-400">
                              Hired: {count}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1.5">{st.description}</p>
                          <p className="text-[11px] font-mono-num text-amber-400">
                            Salary: ${st.dailySalary}/day · Req Lv {st.requiredLevel}
                          </p>
                        </div>
                        <button
                          disabled={!canHire}
                          onClick={() => onHireStaff(st.role)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            canHire
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          {!levelMet ? `Unlocks at Lv ${st.requiredLevel}` : `Hire · $${cost.toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* CITY, BANK, MARKET & FRANCHISES */}
          {activeTab === 'city' && (
            <>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
                {[
                  { id: 'travel', label: 'City Map' },
                  { id: 'bank', label: 'Metro Bank' },
                  { id: 'market', label: 'Wholesale Market' },
                  { id: 'franchises', label: 'Empire Branches' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCitySub(t.id as typeof citySub)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      citySub === t.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {citySub === 'travel' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CITY_ZONES.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => {
                        onTravelZone(z.id);
                        onClose();
                      }}
                      className="text-left rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <PreviewThumb kind="zone" id={z.id} alt={z.name} className="w-20 h-16 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-white">{z.name}</p>
                        <p className="text-xs text-slate-400">{z.subtitle}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 text-amber-400 text-xs font-bold shrink-0">
                        <MapPin className="w-3.5 h-3.5" /> Go
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {citySub === 'bank' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                    <h3 className="font-display text-base font-bold text-white mb-1">
                      Owner Profit Withdrawals
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Transfer earnings from your Restaurant Business account to your Personal Wallet
                      to purchase designer clothing, luxury cars, and mansions.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {[100, 500, 2000, 10000].map((amt) => (
                        <button
                          key={amt}
                          disabled={save.restaurantCash < amt}
                          onClick={() => onWithdrawToWallet(amt)}
                          className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold font-mono-num cursor-pointer"
                        >
                          Withdraw ${amt.toLocaleString()}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <span className="text-xs text-slate-400">Need capital back in the business?</span>
                      <button
                        disabled={save.personalWallet < 250}
                        onClick={() => onInvestToBusiness(250)}
                        className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-200 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Invest $250 to Restaurant
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {citySub === 'market' && (
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-white">
                        Fresh Wholesale Supply Contracts
                      </h3>
                      <p className="text-xs text-slate-400">
                        Lower ingredient costs across every dish in your restaurant.
                      </p>
                    </div>
                    <span className="font-mono-num text-sm font-bold text-emerald-400">
                      -{Math.round(save.bulkIngredientsDiscount * 100)}% Cost
                    </span>
                  </div>
                  <button
                    disabled={save.bulkIngredientsDiscount >= 0.35 || save.restaurantCash < 450}
                    onClick={onBuyWholesaleUpgrade}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold cursor-pointer"
                  >
                    {save.bulkIngredientsDiscount >= 0.35
                      ? 'Maximum Wholesale Discount Reached (-35%)'
                      : 'Sign Bulk Supply Contract (-5% Ingredient Cost) · $450'}
                  </button>
                </div>
              )}

              {citySub === 'franchises' && (
                <div className="space-y-3">
                  {FRANCHISE_CATALOG.map((fr) => {
                    const owned = save.ownedFranchises.includes(fr.id);
                    const lvlOk = save.restaurantLevel >= fr.requiredLevel;
                    const canBuy = !owned && lvlOk && save.restaurantCash >= fr.cost;
                    return (
                      <div
                        key={fr.id}
                        className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <PreviewThumb
                          kind="franchise"
                          id={fr.id}
                          alt={fr.name}
                          locked={!owned && !lvlOk}
                          className="h-28 w-full sm:w-36 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Building2 className="w-4 h-4 text-amber-400" />
                            <span className="font-bold text-sm text-white">{fr.name}</span>
                            <span className="text-xs text-slate-400">· {fr.district}</span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1">{fr.description}</p>
                          <p className="text-xs font-mono-num text-emerald-400 font-semibold">
                            +${fr.incomePerMinute}/min passive empire revenue · Req Lv {fr.requiredLevel}
                          </p>
                        </div>
                        {owned ? (
                          <span className="px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-xs font-bold whitespace-nowrap shrink-0">
                            Operating Branch
                          </span>
                        ) : (
                          <button
                            disabled={!canBuy}
                            onClick={() => onBuyFranchise(fr.id)}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {!lvlOk ? `Req Lv ${fr.requiredLevel}` : `Open Branch · $${fr.cost.toLocaleString()}`}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* LIFESTYLE: CLOTHING, CARS, HOUSING & FURNITURE */}
          {activeTab === 'lifestyle' && (
            <>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
                {[
                  { id: 'clothing', label: 'Wardrobe', icon: Shirt },
                  { id: 'cars', label: 'Dealership', icon: Car },
                  { id: 'housing', label: 'Real Estate & Decor', icon: Home },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setLifestyleSub(t.id as typeof lifestyleSub)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        lifestyleSub === t.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {lifestyleSub === 'clothing' && (
                <p className="text-xs text-slate-300 rounded-lg bg-slate-900 border border-amber-500/30 px-3 py-2">
                  Active tip prestige from equipped outfit, hat &amp; watch:{' '}
                  <strong className="text-amber-300 font-mono-num">
                    +{getPrestigeTipBonus(save)}%
                  </strong>{' '}
                  on every tip.
                </p>
              )}

              {lifestyleSub === 'clothing' && (() => {
                const look = tryOn ?? {
                  outfit: save.equippedOutfitId,
                  hat: save.equippedHatId,
                  watch: save.equippedWatchId,
                };
                const changed =
                  look.outfit !== save.equippedOutfitId ||
                  look.hat !== save.equippedHatId ||
                  look.watch !== save.equippedWatchId;
                return (
                  <LiveModelViewer
                    modelKey={`${look.outfit}|${look.hat}|${look.watch}`}
                    build={() => buildDressedChef(look.outfit, look.hat, look.watch)}
                    shot={{ yaw: 0.35, pitch: 0.1, padding: 0.86 }}
                    className="h-64 sm:h-72 rounded-2xl border border-slate-800"
                  >
                    <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-slate-950/75 px-2 py-1 text-[11px] font-bold text-slate-200">
                      {changed ? 'Trying on' : 'Your current look'}
                    </div>
                    {changed && (
                      <button
                        onClick={() => setTryOn(null)}
                        className="absolute top-3 right-3 rounded-md bg-slate-950/80 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </LiveModelViewer>
                );
              })()}

              {lifestyleSub === 'clothing' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLOTHING_CATALOG.map((item) => {
                    const owned = save.ownedClothes.includes(item.id);
                    const equipped =
                      save.equippedOutfitId === item.id ||
                      save.equippedHatId === item.id ||
                      save.equippedWatchId === item.id;
                    const canBuy = !owned && save.personalWallet >= item.price;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <button
                            onClick={() => {
                              const base = tryOn ?? {
                                outfit: save.equippedOutfitId,
                                hat: save.equippedHatId,
                                watch: save.equippedWatchId,
                              };
                              setTryOn({ ...base, [item.slot]: item.id });
                            }}
                            className="block w-full mb-2.5 cursor-pointer group"
                            aria-label={`Try on ${item.name}`}
                          >
                            <PreviewThumb
                              kind="clothing"
                              id={item.id}
                              alt={item.name}
                              className="h-32 w-full ring-0 group-hover:ring-2 ring-amber-400/70 transition"
                            />
                            <span className="mt-1 block text-[10px] font-semibold text-amber-300/90">
                              Tap to try on
                            </span>
                          </button>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-white">{item.name}</span>
                            <span className="text-[11px] uppercase tracking-wider text-slate-400">
                              {item.slot}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1.5">{item.description}</p>
                          <p className="text-xs text-amber-400 font-medium">
                            +{item.prestigeBonus}% Tip Prestige · Visible on 3D Chef
                          </p>
                        </div>
                        <button
                          disabled={!owned && !canBuy}
                          onClick={() => onBuyOrEquipCloth(item.id)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                            equipped
                              ? 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-300'
                              : owned
                                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                                : canBuy
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {equipped
                            ? 'Equipped'
                            : owned
                              ? 'Wear Now'
                              : `Buy · $${item.price.toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {lifestyleSub === 'cars' && (
                <CarShowroom
                  save={save}
                  inVehicle={inVehicle}
                  onBuyOrSelectVehicle={onBuyOrSelectVehicle}
                  onToggleDrive={onToggleDrive}
                  onClose={onClose}
                />
              )}

              {lifestyleSub === 'housing' && (
                <div className="space-y-4">
                  {(() => {
                    const shownId = previewHouseId ?? save.activeHouseId;
                    const shown = HOUSE_CATALOG.find((h) => h.id === shownId) ?? HOUSE_CATALOG[0];
                    const isHome = shown.id === save.activeHouseId;
                    return (
                      <LiveModelViewer
                        modelKey={`${shown.id}|${save.ownedFurniture.slice().sort().join(',')}`}
                        build={() => buildHomePreview(shown.id, save.ownedFurniture)}
                        shot={{ yaw: 0.6, pitch: 0.62, padding: 0.84 }}
                        className="h-60 sm:h-72 rounded-2xl border border-slate-800"
                      >
                        <div className="pointer-events-none absolute top-3 left-3 rounded-md bg-slate-950/75 px-2 py-1 text-[11px] font-bold text-slate-200">
                          {shown.name} · {isHome ? 'Your home' : 'Viewing'}
                        </div>
                      </LiveModelViewer>
                    );
                  })()}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Properties (Live 3D Interior at Residence)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {HOUSE_CATALOG.map((h) => {
                        const owned = save.ownedHouses.includes(h.id);
                        const active = save.activeHouseId === h.id;
                        const canBuy = !owned && save.personalWallet >= h.price;
                        return (
                          <div
                            key={h.id}
                            className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col justify-between gap-3"
                          >
                            <div>
                              <button
                                onClick={() => setPreviewHouseId(h.id)}
                                className="block w-full mb-2.5 cursor-pointer group"
                                aria-label={`View ${h.name} in 3D`}
                              >
                                <PreviewThumb
                                  kind="house"
                                  id={h.id}
                                  alt={h.name}
                                  className="h-32 w-full group-hover:ring-2 ring-amber-400/70 transition"
                                />
                              </button>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm text-white">{h.name}</span>
                                <span className="text-xs font-mono-num text-amber-400">
                                  Tier {h.tier}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{h.description}</p>
                            </div>
                            <button
                              disabled={!owned && !canBuy}
                              onClick={() => onBuyOrSelectHouse(h.id)}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                                active
                                  ? 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-300'
                                  : owned
                                    ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                                    : canBuy
                                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {active
                                ? 'Current Residence'
                                : owned
                                  ? 'Move In'
                                  : `Buy Property · $${h.price.toLocaleString()}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Interior Furniture (Spawns inside your 3D Home)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {FURNITURE_CATALOG.map((f) => {
                        const owned = save.ownedFurniture.includes(f.id);
                        const canBuy = !owned && save.personalWallet >= f.price;
                        return (
                          <div
                            key={f.id}
                            className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex items-center justify-between gap-3"
                          >
                            <PreviewThumb kind="furniture" id={f.id} alt={f.name} className="w-20 h-20 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-white">{f.name}</p>
                              <p className="text-xs text-slate-400">{f.description}</p>
                            </div>
                            <button
                              disabled={owned || !canBuy}
                              onClick={() => onBuyFurniture(f.id)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                                owned
                                  ? 'bg-emerald-950/60 text-emerald-300'
                                  : canBuy
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              {owned ? 'Placed' : `$${f.price.toLocaleString()}`}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MISSIONS & ACHIEVEMENTS */}
          {activeTab === 'missions' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Career Missions
                </h3>
                {MISSIONS.map((m) => {
                  const claimed = save.completedMissions.includes(m.id);
                  const val = getMetricValue(m.metric);
                  const done = val >= m.target;
                  return (
                    <div
                      key={m.id}
                      className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-sm text-white">{m.title}</span>
                          <span className="font-mono-num text-xs text-slate-300">
                            {Math.min(val, m.target).toLocaleString()} / {m.target.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-1.5">{m.description}</p>
                        <p className="text-[11px] font-mono-num text-emerald-400">
                          Reward: +${m.rewardRestaurantCash} Biz · +${m.rewardPersonalCash} Wallet · +
                          {m.rewardReputation.toFixed(1)} Rep
                        </p>
                      </div>
                      <button
                        disabled={claimed || !done}
                        onClick={() => onClaimMission(m.id)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
                          claimed
                            ? 'bg-emerald-950/60 text-emerald-300'
                            : done
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Claimed' : done ? 'Claim Reward' : 'In Progress'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Milestones &amp; Achievements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACHIEVEMENTS.map((a) => {
                    const claimed = save.claimedAchievements.includes(a.id);
                    const val = getMetricValue(a.metric);
                    const done = val >= a.target;
                    return (
                      <div
                        key={a.id}
                        className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-semibold text-sm text-white">{a.title}</span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1">{a.description}</p>
                          <p className="text-xs font-mono-num text-emerald-400">
                            Bonus: +${a.rewardCash.toLocaleString()} Personal Wallet
                          </p>
                        </div>
                        <button
                          disabled={claimed || !done}
                          onClick={() => onClaimAchievement(a.id)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                            claimed
                              ? 'bg-emerald-950/60 text-emerald-300'
                              : done
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed ? 'Unlocked' : done ? 'Claim Bonus' : `${Math.min(val, a.target).toLocaleString()}/${a.target.toLocaleString()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-white">Sound Effects</p>
                  <p className="text-xs text-slate-400">Procedural kitchen sizzles, chimes &amp; engine audio</p>
                </div>
                <button
                  onClick={onToggleMute}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                >
                  {save.isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  {save.isMuted ? 'Muted' : 'Enabled'}
                </button>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-white">Background Cafe Music</p>
                  <p className="text-xs text-slate-400">Adaptive melodies matched to your active Cafe Style Theme</p>
                </div>
                <button
                  onClick={onToggleMusicMute}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white cursor-pointer"
                >
                  <Music className={`w-4 h-4 ${save.isMusicMuted ? 'text-slate-500' : 'text-amber-400'}`} />
                  {save.isMusicMuted ? 'Muted' : 'Playing'}
                </button>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm text-white">Graphics Quality</p>
                  <p className="text-xs text-slate-400">
                    Lower settings run smoother and save battery on phones. Auto adjusts itself if the game slows down.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
                  {(['auto', 'low', 'medium', 'high'] as const).map((q) => {
                    const active = (save.graphicsQuality ?? 'auto') === q;
                    return (
                      <button
                        key={q}
                        onClick={() => onSetGraphicsQuality(q)}
                        aria-pressed={active}
                        className={`min-h-[44px] rounded-lg text-xs font-bold capitalize cursor-pointer transition-colors ${
                          active ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-white">Vibration</p>
                  <p className="text-xs text-slate-400">Feel taps, perfect cooks, served orders and level-ups (Android)</p>
                </div>
                <button
                  onClick={onToggleHaptics}
                  aria-pressed={save.hapticsEnabled ?? true}
                  className={`min-w-[72px] min-h-[44px] px-4 rounded-lg text-xs font-bold cursor-pointer ${
                    save.hapticsEnabled ?? true ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {save.hapticsEnabled ?? true ? 'On' : 'Off'}
                </button>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-white">Day &amp; Night Lighting</p>
                  <p className="text-xs text-slate-400">Switch between sunlit afternoon, sunset, and starry bistro night</p>
                </div>
                <button
                  onClick={onAdvanceTimeOfDay}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 cursor-pointer"
                >
                  Cycle Time
                </button>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-white">Local Offline Save</p>
                  <p className="text-xs text-slate-400">Auto-saves every 10s to device storage</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onSaveNow();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer"
                  >
                    Save Now
                  </button>
                  <button
                    onClick={onResetSave}
                    className="px-4 py-2 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-xs font-bold text-rose-100 cursor-pointer"
                  >
                    Reset Career
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-white">Android App &amp; APK Packaging</p>
                  <p className="text-xs text-slate-400">
                    Install directly on Android or package for Google Play (.apk / .aab)
                  </p>
                </div>
                <PWAInstallButton variant="settings" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
