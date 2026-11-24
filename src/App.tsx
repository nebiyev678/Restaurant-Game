import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  Award,
  BookOpen,
  Building2,
  ChefHat,
  ChevronDown,
  Car,
  ChevronUp,
  Clock,
  Coins,
  Hand,
  Home,
  Lock,
  Flame,
  MapPin,
  Music,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Trash2,
  Users,
  Utensils,
  Vibrate,
  Volume2,
  VolumeX,
  Wallet,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CookingMiniGame } from './components/CookingMiniGame';
import { DailyBonusModal } from './components/DailyBonusModal';
import { QuickGoalChip } from './components/QuickGoalChip';
import { GrandOpeningModal } from './components/GrandOpeningModal';
import { RecipeAlbum, NewCardsToast } from './components/RecipeAlbum';
import {
  addAlbumCards,
  createEmptyAlbum,
  CUISINES,
  getAlbumPage,
  getAlbumPageReward,
  getMenuRecipes,
  getNextCuisine,
  getPassiveRestaurantIncomePerMin,
  isAlbumPageComplete,
  rollAlbumCards,
} from './game/cuisines';
import { DayReportCard } from './components/DayReportCard';
import { FloatingJoystick } from './components/FloatingJoystick';
import { PreviewThumb } from './components/ItemPreview';
import { ManagementDrawers } from './components/ManagementDrawers';
import { TitleScreen } from './components/TitleScreen';
import { VirtualJoystick } from './components/VirtualJoystick';
import { WelcomeBackModal } from './components/WelcomeBackModal';
import { sound } from './game/audio';
import {
  ACHIEVEMENTS,
  CAFE_THEMES,
  CLOTHING_CATALOG,
  EQUIPMENT_CATALOG,
  FRANCHISE_CATALOG,
  FURNITURE_CATALOG,
  HOUSE_CATALOG,
  MISSIONS,
  RECIPES,
  SPECIALTY_LINES,
  STAFF_CATALOG,
  MASTERY_TIERS,
  STAFF_MAX_LEVEL,
  STATION_INFO,
  applyChallengeProgress,
  applyQuickGoalProgress,
  describeQuickGoal,
  findNearestMastery,
  generateQuickGoal,
  getQuickGoalChestReward,
  getStarStreakBonusPct,
  goalsUntilChest,
  isQuickGoalDone,
  pickDailySpecial,
  QUICK_GOAL_CHEST_EVERY,
  DAILY_SPECIAL_BONUS,
  computeDayStars,
  countClaimableChallenges,
  generateDailyChallenges,
  getChallengeBonusReward,
  getDailyStarTarget,
  getMasteryTier,
  getStarReward,
  STAFF_XP_PER_TASK,
  VEHICLE_CATALOG,
  computeOfflineEarnings,
  createEmptyDayStats,
  createInitialSaveState,
  formatClock,
  getCleanlinessLabel,
  getDailyLoginStatus,
  getEquipmentUpgradeCost,
  getFranchiseIncomePerMinute,
  getLocalDateKey,
  getRestaurantTier,
  getStaffTrainingCost,
  getStaffXpForNextLevel,
  getTotalDailyPayroll,
  getXpForNextLevel,
  type ChallengeEvent,
  getEffectiveTheme,
} from './game/data';
import {
  AlbumCardDef,
  CuisineId,
  CafeThemeId,
  CustomerOrder,
  DayReport,
  DrawerTab,
  EngineHudSnapshot,
  EquipmentId,
  FloatingPopup,
  GameScreen,
  RecipeId,
  SaveState,
  SpecialtyLineId,
  StaffRole,
  StationType,
} from './game/types';
import { RestaurantWorldEngine } from './game/worldEngine';
import { HAPTIC, haptic, isTouchDevice, resolveQuality, setHapticsEnabled } from './game/mobile';
import { useOnlineStatus } from './hooks/usePWAInstall';

const STORAGE_KEY = 'restaurant_empire_save_v1';

/** Short money for the compact phone HUD: 850 → $850 · 1,574 → $1.57K · 12,400 → $12.4K · 2,300,000 → $2.3M */
function shortMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return `$${Math.round(n)}`;
  // Drop trailing zeros only after a decimal point (1.50 → 1.5, 150 stays 150)
  const fmt = (v: number, digits: number) => {
    const t = v.toFixed(digits);
    return t.includes('.') ? t.replace(/\.?0+$/, '') : t;
  };
  const k = abs / 1000;
  const kDigits = k < 10 ? 2 : k < 100 ? 1 : 0;
  if (Number(k.toFixed(kDigits)) < 1000) return `${n < 0 ? '-' : ''}$${fmt(k, kDigits)}K`;
  const m = abs / 1_000_000;
  return `${n < 0 ? '-' : ''}$${fmt(m, m < 10 ? 2 : 1)}M`;
}

function patienceColor(pct: number): string {
  return pct > 50 ? '#34d399' : pct > 25 ? '#fbbf24' : '#f43f5e';
}

const STAFF_FIRST_NAMES = ['Marco', 'Elena', 'Kenji', 'Nora', 'Mateo', 'Clara', 'Sam', 'Zoe'];

/** Writes the save to localStorage, stamping lastSeenAt for offline-earnings calculation. */
function persistSave(state: SaveState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, lastSeenAt: Date.now() }));
    return true;
  } catch {
    return false; // storage quota / private mode
  }
}

function loadSavedState(): { state: SaveState; hasExisting: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: createInitialSaveState(), hasExisting: false };
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    const base = createInitialSaveState();
    return {
      state: {
        ...base,
        ...parsed,
        unlockedSpecialtyLines: Array.isArray(parsed.unlockedSpecialtyLines)
          ? parsed.unlockedSpecialtyLines
          : base.unlockedSpecialtyLines,
        ownedCafeThemes: Array.isArray(parsed.ownedCafeThemes)
          ? parsed.ownedCafeThemes
          : base.ownedCafeThemes,
        activeCafeThemeId: parsed.activeCafeThemeId ?? base.activeCafeThemeId,
        isMusicMuted:
          typeof parsed.isMusicMuted === 'boolean' ? parsed.isMusicMuted : base.isMusicMuted,
        equipmentLevels: { ...base.equipmentLevels, ...(parsed.equipmentLevels ?? {}) },
        stats: { ...base.stats, ...(parsed.stats ?? {}) },
        dailyLogin: { ...base.dailyLogin, ...(parsed.dailyLogin ?? {}) },
        today: { ...base.today, ...(parsed.today ?? {}) },
        lastSeenAt: typeof parsed.lastSeenAt === 'number' ? parsed.lastSeenAt : null,
        graphicsQuality: ['auto', 'low', 'medium', 'high'].includes(parsed.graphicsQuality as string)
          ? (parsed.graphicsQuality as SaveState['graphicsQuality'])
          : base.graphicsQuality,
        hapticsEnabled:
          typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : base.hapticsEnabled,
        recipeMastery: { ...(parsed.recipeMastery ?? {}) },
        dailyChallenges: parsed.dailyChallenges?.items ? parsed.dailyChallenges : base.dailyChallenges,
        totalStars: typeof parsed.totalStars === 'number' ? parsed.totalStars : 0,
        ...(() => {
          const unlocked = Array.isArray(parsed.unlockedRecipes) && parsed.unlockedRecipes.length > 0
            ? parsed.unlockedRecipes
            : base.unlockedRecipes;
          const activeCuisine =
            parsed.activeCuisine && CUISINES[parsed.activeCuisine] ? parsed.activeCuisine : base.activeCuisine;
          const menu = getMenuRecipes({ activeCuisine, unlockedRecipes: unlocked });
          const special =
            parsed.dailySpecial && menu.includes(parsed.dailySpecial)
              ? parsed.dailySpecial
              : pickDailySpecial(parsed.dayNumber ?? 1, menu, null);
          const qg = parsed.quickGoals;
          const quickGoals =
            qg && typeof qg.completed === 'number' && qg.current
              ? qg
              : {
                  completed: 0,
                  current: generateQuickGoal(0, parsed.restaurantLevel ?? 1, menu, special),
                };
          return {
            dailySpecial: special,
            quickGoals,
            starStreak: typeof parsed.starStreak === 'number' ? parsed.starStreak : 0,
            activeCuisine,
            ownedRestaurants: Array.isArray(parsed.ownedRestaurants)
              ? parsed.ownedRestaurants.filter((c) => CUISINES[c])
              : base.ownedRestaurants,
            album: parsed.album && parsed.album.cards
              ? {
                  cards: { ...parsed.album.cards },
                  claimedPages: Array.isArray(parsed.album.claimedPages) ? parsed.album.claimedPages : [],
                  unseen: Array.isArray(parsed.album.unseen) ? parsed.album.unseen : [],
                }
              : createEmptyAlbum(),
          };
        })(),
        staff: Array.isArray(parsed.staff)
          ? parsed.staff.map((m) => ({ ...m, xp: typeof m.xp === 'number' ? m.xp : 0 }))
          : base.staff,
      },
      hasExisting: true,
    };
  } catch {
    return { state: createInitialSaveState(), hasExisting: false };
  }
}

export default function App() {
  const initialLoad = useRef(loadSavedState());
  const [save, setSave] = useState<SaveState>(initialLoad.current.state);
  const [hasSavedCareer, setHasSavedCareer] = useState<boolean>(initialLoad.current.hasExisting);
  const saveRef = useRef<SaveState>(save);

  const [screen, setScreen] = useState<GameScreen>('title');
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('none');
  const [drawerSubTab, setDrawerSubTab] = useState<string | undefined>(undefined);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());
  const autoPromptedDateRef = useRef<string | null>(null);
  const isOnline = useOnlineStatus();
  // Phones/tablets get the floating joystick and a decluttered HUD
  const [isTouch] = useState(() => isTouchDevice());
  // Compact HUD on phones/tablets: smaller text, icons instead of words, nothing covering the play area
  const compact = isTouch;

  const [cookModal, setCookModal] = useState<{
    station: StationType;
    suggestedOrder: CustomerOrder | null;
  } | null>(null);

  const [hud, setHud] = useState<EngineHudSnapshot>({
    playerZoneLabel: 'Restaurant',
    inVehicle: false,
    heldRecipe: null,
    heldQuality: 1.0,
    activeOrders: [],
    readyDishes: [],
    dirtyTableCount: 0,
    nearbyPrompt: null,
    bubbles: [],
    playerPos: { x: -4, z: 2 },
    streak: { count: 0, mult: 1, timeLeft: 0 },
  });

  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);
  const [dayReport, setDayReport] = useState<DayReport | null>(null);
  const [offlineReward, setOfflineReward] = useState(() =>
    computeOfflineEarnings(initialLoad.current.state)
  );
  const hiddenAtRef = useRef<number | null>(null);

  // Latest-handler refs so the once-mounted engine always calls current logic
  const dayEndedRef = useRef<() => void>(() => {});
  const albumDropRef = useRef<(items: RecipeId[]) => void>(() => {});
  const albumGrantRef = useRef<(cards: AlbumCardDef[]) => void>(() => {});
  const staffTaskDoneRef = useRef<(staffId: string) => void>(() => {});

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RestaurantWorldEngine | null>(null);

  // 3D-anchored HUD icons (order bubbles, machine signs) are positioned every rendered
  // frame by the engine's frame listener, so they never lag behind a moving camera.
  const bubbleEls = useRef(new Map<string, HTMLElement>());
  const bubbleAnchors = useRef(new Map<string, { x: number; y: number; z: number }>());
  // Stable ref callback per bubble id (an inline ref would detach/reattach every render)
  const bubbleRefCallbacks = useRef(new Map<string, (el: HTMLElement | null) => void>());
  const bubbleStartPos = useRef(new Map<string, { x: number; y: number }>());
  const bindBubble = (id: string, sx: number, sy: number) => {
    bubbleStartPos.current.set(id, { x: sx, y: sy });
    let cb = bubbleRefCallbacks.current.get(id);
    if (!cb) {
      cb = (el: HTMLElement | null) => {
        if (el) {
          const p = bubbleStartPos.current.get(id);
          if (p && !el.style.transform) {
            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -100%)`;
          }
          bubbleEls.current.set(id, el);
        } else {
          bubbleEls.current.delete(id);
          bubbleRefCallbacks.current.delete(id);
          bubbleStartPos.current.delete(id);
        }
      };
      bubbleRefCallbacks.current.set(id, cb);
    }
    return cb;
  };

  const commitSave = useCallback((updater: (prev: SaveState) => SaveState) => {
    setSave((prev) => {
      const next = updater(prev);
      saveRef.current = next;
      return next;
    });
  }, []);

  const showToast = useCallback((title: string, subtitle: string) => {
    setToast({ title, subtitle });
    window.setTimeout(() => {
      setToast((curr) => (curr?.title === title ? null : curr));
    }, 3400);
  }, []);

  const pushPopup = useCallback(
    (text: string, color: FloatingPopup['color']) => {
      const id = `pop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPopups((prev) => [
        ...prev.slice(-6),
        {
          id,
          screenX: w * 0.5 + (Math.random() - 0.5) * 90,
          screenY: h * 0.42,
          text,
          color,
          createdAt: Date.now(),
        },
      ]);
      window.setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }, 1300);
    },
    []
  );

  // Apply mute state & cafe music theme
  useEffect(() => {
    sound.setMuted(save.isMuted);
  }, [save.isMuted]);

  useEffect(() => {
    sound.setMusicMuted(save.isMusicMuted);
  }, [save.isMusicMuted]);

  useEffect(() => {
    sound.setMusicTheme(getEffectiveTheme(save).musicMood);
  }, [save.activeCafeThemeId, save.activeCuisine]);

  // Mount Three.js engine once in isolated container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new RestaurantWorldEngine(mount, saveRef, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onOrderServed: (recipeId, revenue, tip, repDelta, xpGain, _pos, info) => {
        const total = revenue + tip;
        albumDropRef.current(info.items);
        haptic(HAPTIC.success);
        pushPopup(
          `${info.comboSize > 1 ? `Combo ×${info.comboSize}! ` : ''}+$${revenue}${tip > 0 ? ` (+$${tip} tip)` : ''}`,
          'emerald'
        );

        // Recipe mastery: announce new medals (checked against the current save)
        const before = saveRef.current.recipeMastery ?? {};
        const counts = new Map<RecipeId, number>();
        info.items.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1));
        counts.forEach((n, r) => {
          const oldTier = getMasteryTier(before[r] ?? 0);
          const newTier = getMasteryTier((before[r] ?? 0) + n);
          if (newTier > oldTier) {
            const t = MASTERY_TIERS[newTier];
            haptic(HAPTIC.levelUp);
            showToast(`${RECIPES[r].name}: ${t.name} Mastery!`, `+${Math.round(t.bonus * 100)}% price on every ${RECIPES[r].name}`);
          }
        });

        commitSave((prev) => {
          let nextXp = prev.xp + xpGain;
          let nextLevel = prev.restaurantLevel;
          let leveledUp = false;
          while (nextXp >= getXpForNextLevel(nextLevel)) {
            nextXp -= getXpForNextLevel(nextLevel);
            nextLevel += 1;
            leveledUp = true;
          }
          if (leveledUp) {
            sound.playLevelUp();
            haptic(HAPTIC.levelUp);
            const tier = getRestaurantTier(nextLevel);
            showToast(`Restaurant Level ${nextLevel}!`, `${tier.title} · ${tier.tableCount} Tables`);
          }
          const nextTut = prev.tutorialStep === 1 ? 2 : prev.tutorialStep;
          return {
            ...prev,
            restaurantCash: prev.restaurantCash + total,
            totalEarned: prev.totalEarned + total,
            xp: nextXp,
            restaurantLevel: nextLevel,
            reputation: Math.min(5.0, Math.max(1.0, prev.reputation + repDelta)),
            tutorialStep: nextTut,
            stats: {
              ...prev.stats,
              customersServed: prev.stats.customersServed + 1,
              tipsEarned: prev.stats.tipsEarned + tip,
            },
            today: {
              ...prev.today,
              revenue: prev.today.revenue + revenue,
              tips: prev.today.tips + tip,
              customersServed: prev.today.customersServed + 1,
            },
            recipeMastery: (() => {
              const m = { ...(prev.recipeMastery ?? {}) };
              info.items.forEach((r) => (m[r] = (m[r] ?? 0) + 1));
              return m;
            })(),
            ...(() => {
              const events: ChallengeEvent[] = [
                { kind: 'serve_orders', amount: 1 },
                { kind: 'serve_combos', amount: info.comboSize > 1 ? 1 : 0 },
                { kind: 'earn_cash', amount: total },
                { kind: 'serve_recipe', recipeIds: info.items },
                { kind: 'reach_streak', value: info.streak },
              ];
              return {
                dailyChallenges: events.reduce((st, ev) => applyChallengeProgress(st, ev), prev.dailyChallenges),
                quickGoals: events.reduce((st, ev) => applyQuickGoalProgress(st, ev), prev.quickGoals),
              };
            })(),
          };
        });
      },
      onItemServed: (recipeId, remaining) => {
        haptic(HAPTIC.tap);
        pushPopup(`${RECIPES[recipeId].name} ✓ · ${remaining} more`, 'sky');
      },
      onStreakChanged: (count, mult) => {
        // Celebrate each new multiplier tier
        if (count === 3 || count === 6 || count === 10) {
          haptic(HAPTIC.perfect);
          showToast(`🔥 ${count}× Streak!`, `Tips ×${mult} while you keep serving`);
        }
      },
      onOrderFailed: (repDelta) => {
        pushPopup('Customer Left!', 'rose');
        haptic(HAPTIC.warning);
        commitSave((prev) => ({
          ...prev,
          reputation: Math.max(1.0, prev.reputation + repDelta),
          today: { ...prev.today, customersLost: prev.today.customersLost + 1 },
        }));
      },
      onCookRequested: (station, suggestedOrder) => {
        if (engineRef.current?.isStationBusy(station)) {
          haptic(HAPTIC.tap);
          showToast(`${STATION_INFO[station].short} is busy`, 'Wait a few seconds for the dish to finish.');
          return;
        }
        sound.playClick();
        setCookModal({ station, suggestedOrder });
      },
      onDishReady: (recipeId, qualityBonus, toPass) => {
        sound.playBell();
        haptic(HAPTIC.success);
        const name = RECIPES[recipeId].name;
        pushPopup(
          toPass ? `${name} ready on the pass` : qualityBonus > 1 ? `Perfect ${name}!` : `${name} ready!`,
          toPass ? 'sky' : 'amber'
        );
      },
      onShopRequested: (tab, subTab) => {
        sound.playClick();
        setDrawerSubTab(subTab);
        setDrawerTab(tab);
      },
      onDeliveryIncome: (amount) => {
        pushPopup(`Delivery +$${amount}`, 'amber');
        commitSave((prev) => ({
          ...prev,
          restaurantCash: prev.restaurantCash + amount,
          totalEarned: prev.totalEarned + amount,
          today: { ...prev.today, deliveryIncome: prev.today.deliveryIncome + amount },
        }));
      },
      onTableCleaned: () => {
        commitSave((prev) => ({
          ...prev,
          cleanliness: Math.min(100, prev.cleanliness + 6),
          dailyChallenges: applyChallengeProgress(prev.dailyChallenges, { kind: 'clean_tables', amount: 1 }),
          quickGoals: applyQuickGoalProgress(prev.quickGoals, { kind: 'clean_tables', amount: 1 }),
        }));
      },
      onDirtyChanged: (delta) => {
        commitSave((prev) => ({
          ...prev,
          cleanliness: Math.max(20, Math.min(100, prev.cleanliness + delta)),
        }));
      },
      onDayEnded: () => dayEndedRef.current(),
      onStaffTaskDone: (staffId) => staffTaskDoneRef.current(staffId),
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [commitSave, pushPopup, showToast]);

  // Only roster/level changes matter to the 3D world, not per-task XP ticks
  const staffSyncKey = save.staff.map((m) => `${m.id}:${m.level}`).join('|');

  // Sync 3D world whenever tier, cafe theme, clothes, house, furniture, vehicle, or staff change
  useEffect(() => {
    engineRef.current?.syncDynamicWorld(false);
  }, [
    save.restaurantLevel,
    save.activeCafeThemeId,
    save.equippedOutfitId,
    save.equippedHatId,
    save.equippedWatchId,
    save.activeVehicleId,
    save.activeHouseId,
    save.ownedFurniture,
    staffSyncKey,
    save.unlockedRecipes,
    save.activeCuisine,
  ]);

  useEffect(() => {
    const m = bubbleAnchors.current;
    m.clear();
    for (const b of hud.bubbles) if (b.anchor) m.set(b.id, b.anchor);
  }, [hud.bubbles]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setFrameListener(() => {
      bubbleEls.current.forEach((el, id) => {
        const a = bubbleAnchors.current.get(id);
        if (!a) return;
        const p = engine.projectWorld(a.x, a.y, a.z);
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.visibility = p.visible ? '' : 'hidden';
      });
    });
    return () => engine.setFrameListener(null);
  }, []);

  // Graphics quality (Settings → Graphics); 'auto' also lets the engine step down if FPS drops
  useEffect(() => {
    const q = save.graphicsQuality ?? 'auto';
    engineRef.current?.setGraphicsQuality(resolveQuality(q), q === 'auto');
  }, [save.graphicsQuality]);

  useEffect(() => {
    setHapticsEnabled(save.hapticsEnabled ?? true);
  }, [save.hapticsEnabled]);

  // Block long-press context menus / callouts that break touch gameplay
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener('contextmenu', prevent);
    return () => window.removeEventListener('contextmenu', prevent);
  }, []);

  // --- Day cycle: midnight closes the books, pays staff, and starts a new day ---
  const handleDayEnded = useCallback(() => {
    const s = saveRef.current;
    const payrollDue = getTotalDailyPayroll(s.staff);
    const payrollPaid = Math.min(payrollDue, s.restaurantCash);
    const t = s.today;
    const starTarget = getDailyStarTarget(s.restaurantLevel);
    const stars = computeDayStars(t.customersServed, t.customersLost, s.cleanliness, starTarget);
    const starStreak = stars >= 2 ? (s.starStreak ?? 0) + 1 : 0;
    const starStreakBonusPct = stars >= 2 ? getStarStreakBonusPct(starStreak) : 0;
    const starReward = Math.round(getStarReward(stars, s.restaurantLevel) * (1 + starStreakBonusPct / 100));
    const nextSpecial = pickDailySpecial(s.dayNumber + 1, getMenuRecipes(s), s.dailySpecial);
    const report: DayReport = {
      dayNumber: s.dayNumber,
      stats: { ...t },
      payrollDue,
      payrollPaid,
      unpaidWages: payrollPaid < payrollDue,
      netProfit:
        t.revenue + t.tips + t.deliveryIncome + t.franchiseIncome - t.ingredientCost - payrollPaid,
      staffCount: s.staff.length,
      stars,
      starTarget,
      starReward,
      starStreak,
      starStreakBonusPct,
      tomorrow: {
        special: nextSpecial,
        goal: s.quickGoals.current,
        goalsToChest: goalsUntilChest(s.quickGoals.completed),
        mastery: findNearestMastery(s.recipeMastery ?? {}, getMenuRecipes(s)),
      },
    };

    commitSave((prev) => {
      const due = getTotalDailyPayroll(prev.staff);
      const paid = Math.min(due, prev.restaurantCash);
      return {
        ...prev,
        restaurantCash: prev.restaurantCash - paid + starReward,
        totalEarned: prev.totalEarned + starReward,
        totalStars: (prev.totalStars ?? 0) + stars,
        starStreak,
        dailySpecial: nextSpecial,
        // Missing payroll upsets the team, which customers notice
        reputation: paid < due ? Math.max(1.0, prev.reputation - 0.15) : prev.reputation,
        dayNumber: prev.dayNumber + 1,
        today: createEmptyDayStats(),
      };
    });
    sound.playBell();
    setDayReport(report);
    if (stars >= 3) {
      window.setTimeout(() => albumGrantRef.current(rollAlbumCards(1, s.activeCuisine, s.ownedRestaurants)), 1500);
    }
  }, [commitSave]);
  dayEndedRef.current = handleDayEnded;

  // --- Staff earn XP on the job and level up for free (paid training is a shortcut) ---
  const handleStaffTaskDone = useCallback(
    (staffId: string) => {
      const member = saveRef.current.staff.find((m) => m.id === staffId);
      if (!member || member.level >= STAFF_MAX_LEVEL) return;
      const willLevel = member.xp + STAFF_XP_PER_TASK >= getStaffXpForNextLevel(member.level);

      commitSave((prev) => ({
        ...prev,
        staff: prev.staff.map((m) => {
          if (m.id !== staffId || m.level >= STAFF_MAX_LEVEL) return m;
          let xp = m.xp + STAFF_XP_PER_TASK;
          let level = m.level;
          const need = getStaffXpForNextLevel(level);
          if (xp >= need) {
            xp -= need;
            level += 1;
          }
          return {
            ...m,
            level,
            xp: level >= STAFF_MAX_LEVEL ? 0 : xp,
            speedMultiplier: 1 + (level - 1) * 0.14,
          };
        }),
      }));

      if (willLevel) {
        sound.playLevelUp();
        showToast(`${member.name} Leveled Up!`, `Lv ${member.level + 1} from on-the-job experience.`);
      }
    },
    [commitSave, showToast]
  );
  staffTaskDoneRef.current = handleStaffTaskDone;

  const closeDayReport = useCallback(() => setDayReport(null), []);

  // Wrong dish? Put it on the pass counter (serve later) or throw it away — from anywhere
  const handlePutDishOnPass = useCallback(() => {
    const ok = engineRef.current?.putHeldDishOnCounter();
    haptic(HAPTIC.tap);
    if (ok) pushPopup('On the pass', 'sky');
    else showToast('Pass Counter Full', 'Serve or throw away a dish first.');
  }, [pushPopup, showToast]);

  const handleTrashDish = useCallback(() => {
    if (engineRef.current?.trashHeldDish()) {
      haptic(HAPTIC.warning);
      pushPopup('Dish thrown away', 'rose');
    }
  }, [pushPopup]);

  const handleClaimOfflineReward = useCallback(() => {
    if (!offlineReward) return;
    const amount = offlineReward.amount;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash + amount,
      totalEarned: prev.totalEarned + amount,
    }));
    setOfflineReward(null);
    pushPopup(`+$${amount.toLocaleString()} Offline`, 'emerald');
  }, [offlineReward, commitSave, pushPopup]);

  // Daily challenges: a fresh set of three every real day
  useEffect(() => {
    const check = () => {
      const today = getLocalDateKey();
      if (saveRef.current.dailyChallenges?.date === today) return;
      commitSave((prev) => ({
        ...prev,
        dailyChallenges: generateDailyChallenges(today, prev.restaurantLevel, getMenuRecipes(prev)),
      }));
    };
    check();
    const t = window.setInterval(check, 60000);
    return () => window.clearInterval(t);
  }, [commitSave]);

  const handleClaimChallenge = useCallback(
    (id: string) => {
      const c = saveRef.current.dailyChallenges.items.find((x) => x.id === id);
      if (!c || c.claimed || c.progress < c.target) return;
      sound.playCash();
      haptic(HAPTIC.success);
      commitSave((prev) => ({
        ...prev,
        restaurantCash: prev.restaurantCash + c.reward,
        totalEarned: prev.totalEarned + c.reward,
        dailyChallenges: {
          ...prev.dailyChallenges,
          items: prev.dailyChallenges.items.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
        },
      }));
      pushPopup(`+$${c.reward.toLocaleString()} Challenge`, 'amber');
    },
    [commitSave, pushPopup]
  );

  const handleClaimChallengeBonus = useCallback(() => {
    const st = saveRef.current.dailyChallenges;
    if (st.bonusClaimed || st.items.length === 0 || !st.items.every((c) => c.claimed)) return;
    const reward = getChallengeBonusReward(saveRef.current.restaurantLevel);
    sound.playLevelUp();
    haptic(HAPTIC.levelUp);
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash + reward,
      totalEarned: prev.totalEarned + reward,
      dailyChallenges: { ...prev.dailyChallenges, bonusClaimed: true },
    }));
    showToast('Daily Chest Opened!', `+$${reward.toLocaleString()} and 3 album cards`);
    const cs = saveRef.current;
    window.setTimeout(() => albumGrantRef.current(rollAlbumCards(3, cs.activeCuisine, cs.ownedRestaurants, Math.random, { minRarity: 'rare' })), 1000);
  }, [commitSave, showToast]);

  // --- Recipe Album: cards drop from orders, chests and 3-star days ---
  const [showAlbum, setShowAlbum] = useState(false);
  const [newCards, setNewCards] = useState<AlbumCardDef[]>([]);
  const grantAlbumCards = useCallback(
    (cards: AlbumCardDef[]) => {
      if (cards.length === 0) return;
      const lv = saveRef.current.restaurantLevel;
      const result = addAlbumCards(saveRef.current.album, cards, lv);
      commitSave((prev) => {
        const r = addAlbumCards(prev.album, cards, prev.restaurantLevel);
        return {
          ...prev,
          album: r.album,
          restaurantCash: prev.restaurantCash + r.duplicateCash,
          totalEarned: prev.totalEarned + r.duplicateCash,
        };
      });
      if (result.newCards.length > 0) {
        haptic(HAPTIC.success);
        sound.playUnlock();
        setNewCards((q) => [...q, ...result.newCards]);
      } else if (result.duplicateCash > 0) {
        pushPopup(`Duplicate card +$${result.duplicateCash}`, 'sky');
      }
    },
    [commitSave, pushPopup]
  );
  albumGrantRef.current = grantAlbumCards;
  albumDropRef.current = (items: RecipeId[]) => {
    const s = saveRef.current;
    const chance = 0.1 + (items.length - 1) * 0.05;
    if (Math.random() >= chance) return;
    grantAlbumCards(rollAlbumCards(1, s.activeCuisine, s.ownedRestaurants, Math.random, { preferRecipe: items[0] }));
  };
  useEffect(() => {
    if (newCards.length === 0) return;
    const t = window.setTimeout(() => setNewCards((q) => q.slice(1)), 2600);
    return () => window.clearTimeout(t);
  }, [newCards]);

  const handleClaimAlbumPage = useCallback(
    (cuisine: CuisineId) => {
      const s = saveRef.current;
      if (s.album.claimedPages.includes(cuisine) || !isAlbumPageComplete(s.album, cuisine)) return;
      const reward = getAlbumPageReward(s.restaurantLevel);
      sound.playLevelUp();
      haptic(HAPTIC.levelUp);
      commitSave((prev) => ({
        ...prev,
        restaurantCash: prev.restaurantCash + reward,
        totalEarned: prev.totalEarned + reward,
        album: { ...prev.album, claimedPages: [...prev.album.claimedPages, cuisine] },
      }));
      showToast(`${CUISINES[cuisine].flag} Album page complete!`, `+$${reward.toLocaleString()} and +3% on every dish forever`);
    },
    [commitSave, showToast]
  );
  const openAlbum = useCallback(() => {
    sound.playClick();
    setShowAlbum(true);
  }, []);
  const closeAlbum = useCallback(() => {
    setShowAlbum(false);
    commitSave((prev) => (prev.album.unseen.length ? { ...prev, album: { ...prev.album, unseen: [] } } : prev));
  }, [commitSave]);
  const albumBadge =
    save.album.unseen.length +
    (Object.keys(CUISINES) as CuisineId[]).filter(
      (c) => !save.album.claimedPages.includes(c) && isAlbumPageComplete(save.album, c)
    ).length;

  // --- Quick goal chain: a finished goal pays out after a short beat, then the next one appears ---
  const [goalFlash, setGoalFlash] = useState<{ reward: number; chest: number } | null>(null);
  const quickGoalDone = isQuickGoalDone(save.quickGoals);
  const quickGoalId = save.quickGoals.current?.id;
  useEffect(() => {
    if (!quickGoalDone || !quickGoalId) return;
    const timer = window.setTimeout(() => {
      const st = saveRef.current.quickGoals;
      if (!st.current || st.current.id !== quickGoalId || st.current.progress < st.current.target) return;
      const lv = saveRef.current.restaurantLevel;
      const reward = st.current.reward;
      const chest = goalsUntilChest(st.completed) === 1 ? getQuickGoalChestReward(lv) : 0;
      const completed = st.completed + 1;
      commitSave((prev) => ({
        ...prev,
        restaurantCash: prev.restaurantCash + reward + chest,
        totalEarned: prev.totalEarned + reward + chest,
        quickGoals: {
          completed,
          current: generateQuickGoal(completed, prev.restaurantLevel, getMenuRecipes(prev), prev.dailySpecial, prev.quickGoals.current?.kind),
        },
      }));
      setGoalFlash({ reward, chest });
      if (chest > 0) {
        const cs = saveRef.current;
        window.setTimeout(() => grantAlbumCards(rollAlbumCards(2, cs.activeCuisine, cs.ownedRestaurants)), 900);
        sound.playLevelUp();
        haptic(HAPTIC.levelUp);
        showToast('🎁 Goal Chest!', `+$${(reward + chest).toLocaleString()} for ${QUICK_GOAL_CHEST_EVERY} goals in a row`);
      } else {
        sound.playBell();
        haptic(HAPTIC.success);
        pushPopup(`Goal done! +$${reward.toLocaleString()}`, 'amber');
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [quickGoalDone, quickGoalId, commitSave, pushPopup, showToast, grantAlbumCards]);
  useEffect(() => {
    if (!goalFlash) return;
    const t = window.setTimeout(() => setGoalFlash(null), 1600);
    return () => window.clearTimeout(t);
  }, [goalFlash]);

  // --- Moving to the next country's restaurant ---
  const nextCuisine = getNextCuisine(save.activeCuisine);
  const canOpenNext = !!nextCuisine && save.restaurantLevel >= nextCuisine.requiredLevel;
  const [showGrandOpening, setShowGrandOpening] = useState(false);
  const handleOpenNextRestaurant = useCallback(() => {
    const s = saveRef.current;
    const next = getNextCuisine(s.activeCuisine);
    if (!next || s.restaurantLevel < next.requiredLevel) return;
    const previous = CUISINES[s.activeCuisine];
    const unlocked = Array.from(new Set([...s.unlockedRecipes, ...next.starters]));
    const menu = getMenuRecipes({ activeCuisine: next.id, unlockedRecipes: unlocked });
    const special = pickDailySpecial(s.dayNumber, menu, null);
    commitSave((prev) => ({
      ...prev,
      activeCuisine: next.id,
      ownedRestaurants: prev.ownedRestaurants.includes(prev.activeCuisine)
        ? prev.ownedRestaurants
        : [...prev.ownedRestaurants, prev.activeCuisine],
      unlockedRecipes: Array.from(new Set([...prev.unlockedRecipes, ...next.starters])),
      // The new place shows its own country style (paid styles can be re-applied in the Restaurant menu)
      activeCafeThemeId: 'classic_bistro',
      dailySpecial: special,
      quickGoals: {
        ...prev.quickGoals,
        current: generateQuickGoal(prev.quickGoals.completed, prev.restaurantLevel, menu, special),
      },
      // Today's "serve X" challenges switch to a dish the new kitchen actually makes
      dailyChallenges: {
        ...prev.dailyChallenges,
        items: prev.dailyChallenges.items.map((c, i) =>
          c.kind === 'serve_recipe' && c.recipeId && !menu.includes(c.recipeId) && c.progress < c.target
            ? { ...c, recipeId: menu[i % menu.length], progress: 0 }
            : c
        ),
      },
    }));
    engineRef.current?.startNewRestaurant();
    setShowGrandOpening(false);
    setDrawerTab('none');
    sound.playLevelUp();
    haptic(HAPTIC.levelUp);
    showToast(`${next.flag} ${next.name} is open!`, `${previous.name} keeps earning money for you in town`);
    // Opening gift: three album cards from the new country
    window.setTimeout(() => grantAlbumCards(rollAlbumCards(3, next.id, [], Math.random, { minRarity: 'rare' })), 1200);
  }, [commitSave, showToast, grantAlbumCards]);

  const claimableChallenges = countClaimableChallenges(save.dailyChallenges);
  const starTarget = getDailyStarTarget(save.restaurantLevel);

  const dailyStatus = getDailyLoginStatus(save.dailyLogin);
  // Keep dailyStatus sensitive to calendar day changes while open
  void todayKey;

  // Auto-open Daily Login Bonus when entering gameplay with an unclaimed daily reward
  useEffect(() => {
    if (
      screen === 'playing' &&
      dailyStatus.canClaim &&
      autoPromptedDateRef.current !== dailyStatus.todayKey
    ) {
      autoPromptedDateRef.current = dailyStatus.todayKey;
      setShowDailyModal(true);
    }
  }, [screen, dailyStatus.canClaim, dailyStatus.todayKey]);

  // Pause simulation when pause screen or modals are open
  useEffect(() => {
    const isTitle = screen === 'title';
    const isPaused =
      screen === 'paused' ||
      drawerTab !== 'none' ||
      cookModal !== null ||
      showDailyModal ||
      offlineReward !== null;
    engineRef.current?.setTitleMode(isTitle);
    engineRef.current?.setPaused(isPaused);
  }, [screen, drawerTab, cookModal, showDailyModal, offlineReward]);

  // Passive Franchise Income + Daily Salaries + Auto-Save + Day Rollover Check every 10s
  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentKey = getLocalDateKey();
      setTodayKey((prev) => (prev === currentKey ? prev : currentKey));

      const s = saveRef.current;
      persistSave(s);
      // Backgrounded time is paid out via the Welcome Back offline reward instead
      if (screen !== 'playing' || document.hidden) return;

      // Franchise passive income tick (10s = 1/6th minute)
      if (s.ownedFranchises.length > 0 || s.ownedRestaurants.length > 0) {
        const tickIncome = Math.round(
          (getFranchiseIncomePerMinute(s.ownedFranchises) +
            getPassiveRestaurantIncomePerMin(s.ownedRestaurants, s.restaurantLevel)) /
            6
        );
        if (tickIncome > 0) {
          commitSave((prev) => ({
            ...prev,
            restaurantCash: prev.restaurantCash + tickIncome,
            totalEarned: prev.totalEarned + tickIncome,
            today: { ...prev.today, franchiseIncome: prev.today.franchiseIncome + tickIncome },
          }));
        }
      }

      // Busser / Cleaner staff steadily restore dining-room cleanliness
      const cleaners = s.staff.filter((m) => m.role === 'cleaner').length;
      if (cleaners > 0 && s.cleanliness < 100) {
        commitSave((prev) => ({
          ...prev,
          cleanliness: Math.min(100, prev.cleanliness + 2 * cleaners),
        }));
      }
    }, 10000);
    return () => window.clearInterval(interval);
  }, [screen, commitSave]);

  // Android/PWA lifecycle: save when backgrounded, offer offline earnings on return
  useEffect(() => {
    const onHide = () => {
      persistSave(saveRef.current);
    };
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        onHide();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (!hiddenAt) return;
      const reward = computeOfflineEarnings({
        ownedFranchises: saveRef.current.ownedFranchises,
        ownedRestaurants: saveRef.current.ownedRestaurants,
        restaurantLevel: saveRef.current.restaurantLevel,
        lastSeenAt: hiddenAt,
      });
      if (reward) setOfflineReward((curr) => curr ?? reward);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  // Back action shared by Escape and the Android back button: close the top-most
  // overlay first, otherwise toggle pause (never drops the player out of the game).
  const handleBack = useCallback(() => {
    if (offlineReward) return; // must be collected
    if (showDailyModal) setShowDailyModal(false);
    else if (cookModal) setCookModal(null);
    else if (drawerTab !== 'none') setDrawerTab('none');
    else if (screen === 'playing') setScreen('paused');
    else if (screen === 'paused') setScreen('playing');
  }, [offlineReward, showDailyModal, cookModal, drawerTab, screen]);
  const handleBackRef = useRef(handleBack);
  handleBackRef.current = handleBack;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') handleBackRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Android back button (Capacitor & PWA): while in a game we keep one guard entry in
  // history, so "back" closes menus / pauses instead of exiting the app.
  const inGame = screen !== 'title';
  useEffect(() => {
    if (!inGame) return;
    window.history.pushState({ restaurantGuard: true }, '');
    const onPop = () => {
      handleBackRef.current();
      window.history.pushState({ restaurantGuard: true }, '');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [inGame]);

  // Auto-pause when the app goes to the background (phone call, home button, app switch)
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setScreen((s) => (s === 'playing' ? 'paused' : s));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const handleSaveNow = useCallback(() => {
    if (persistSave(saveRef.current)) {
      setHasSavedCareer(true);
      showToast('Game Saved', 'Progress stored locally on device.');
    } else {
      showToast('Save Failed', 'Storage unavailable.');
    }
  }, [showToast]);

  const handleResetCareer = useCallback(() => {
    const fresh = createInitialSaveState();
    saveRef.current = fresh;
    setSave(fresh);
    setHasSavedCareer(false);
    autoPromptedDateRef.current = null;
    setDayReport(null);
    setOfflineReward(null);
    localStorage.removeItem(STORAGE_KEY);
    engineRef.current?.clearHeldDish();
    engineRef.current?.syncDynamicWorld(true);
    setDrawerTab('none');
    setScreen('playing');
    showToast('New Career Started', 'Welcome to your street-food bistro!');
  }, [showToast]);

  const handleClaimDailyBonus = useCallback(() => {
    const status = getDailyLoginStatus(saveRef.current.dailyLogin);
    if (!status.canClaim) return;
    sound.playLevelUp();
    haptic(HAPTIC.success);
    commitSave((prev) => {
      const current = getDailyLoginStatus(prev.dailyLogin);
      if (!current.canClaim) return prev;
      const nextState: SaveState = {
        ...prev,
        restaurantCash: prev.restaurantCash + current.rewardCash,
        dailyLogin: {
          streak: current.nextStreak,
          lastClaimDate: current.todayKey,
          totalDaysClaimed: prev.dailyLogin.totalDaysClaimed + 1,
        },
      };
      persistSave(nextState);
      return nextState;
    });
    setHasSavedCareer(true);
    setShowDailyModal(false);
    pushPopup(`+$${status.rewardCash.toLocaleString()} Daily Bonus!`, 'amber');
    showToast(
      `Day ${status.nextStreak} Streak Bonus!`,
      `+$${status.rewardCash.toLocaleString()} added to restaurant cash.`
    );
  }, [commitSave, pushPopup, showToast]);

  const handleCookingComplete = (
    recipeId: RecipeId,
    qualityBonus: number,
    ingredientCost: number
  ) => {
    setCookModal(null);
    // The dish now cooks on its machine for a few seconds (progress shows on the machine sign)
    if (!engineRef.current?.startCookJob(recipeId, qualityBonus)) {
      showToast(`${STATION_INFO[RECIPES[recipeId].station].short} is busy`, 'Wait for the current dish to finish.');
      return;
    }
    haptic(qualityBonus > 1 ? HAPTIC.perfect : HAPTIC.action);
    commitSave((prev) => ({
      ...prev,
      dailyChallenges:
        qualityBonus > 1
          ? applyChallengeProgress(prev.dailyChallenges, { kind: 'perfect_cooks', amount: 1 })
          : prev.dailyChallenges,
      quickGoals:
        qualityBonus > 1
          ? applyQuickGoalProgress(prev.quickGoals, { kind: 'perfect_cooks', amount: 1 })
          : prev.quickGoals,
      restaurantCash: Math.max(0, prev.restaurantCash - ingredientCost),
      tutorialStep: prev.tutorialStep === 0 ? 1 : prev.tutorialStep,
      stats: {
        ...prev.stats,
        dishesCooked: prev.stats.dishesCooked + 1,
        burgersCooked: prev.stats.burgersCooked + (recipeId === 'burger' ? 1 : 0),
      },
      today: {
        ...prev.today,
        dishesCooked: prev.today.dishesCooked + 1,
        ingredientCost: prev.today.ingredientCost + Math.min(ingredientCost, prev.restaurantCash),
      },
    }));
    pushPopup(
      qualityBonus > 1 ? `Perfect timing! Cooking…` : `Cooking ${RECIPES[recipeId].name}…`,
      'amber'
    );
  };

  // Management Action Handlers
  const handleUnlockSpecialtyLine = (lineId: SpecialtyLineId) => {
    const line = SPECIALTY_LINES[lineId];
    if (
      save.restaurantLevel < line.requiredLevel ||
      save.restaurantCash < line.unlockCost ||
      save.unlockedSpecialtyLines.includes(lineId)
    ) {
      return;
    }
    sound.playUnlock();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - line.unlockCost,
      unlockedSpecialtyLines: [...prev.unlockedSpecialtyLines, lineId],
    }));
    showToast('Specialty Line Unlocked!', `${line.name} is now open in Kitchen.`);
  };

  const handleUnlockRecipe = (id: RecipeId) => {
    const def = RECIPES[id];
    const lineOk = !def.recipeLine || save.unlockedSpecialtyLines.includes(def.recipeLine);
    if (
      !lineOk ||
      save.restaurantLevel < def.requiredLevel ||
      save.restaurantCash < def.unlockCost ||
      save.unlockedRecipes.includes(id)
    ) {
      return;
    }
    sound.playUnlock();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - def.unlockCost,
      unlockedRecipes: [...prev.unlockedRecipes, id],
    }));
    showToast('Recipe Unlocked!', `${def.name} added to your menu.`);
  };

  const handleBuyOrEquipCafeTheme = (themeId: CafeThemeId) => {
    const theme = CAFE_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    const ownedList = save.ownedCafeThemes ?? ['classic_bistro'];
    const owned = ownedList.includes(themeId);
    if (!owned && (save.restaurantLevel < theme.requiredLevel || save.restaurantCash < theme.price)) {
      return;
    }
    sound.playThemeApply();
    commitSave((prev) => {
      const prevOwned = prev.ownedCafeThemes ?? ['classic_bistro'];
      return {
        ...prev,
        restaurantCash: owned ? prev.restaurantCash : prev.restaurantCash - theme.price,
        ownedCafeThemes: owned ? prevOwned : [...prevOwned, themeId],
        activeCafeThemeId: themeId,
      };
    });
    showToast(
      owned ? 'Cafe Theme Applied!' : 'New Cafe Style Unlocked!',
      `${theme.name}${theme.tipBonus > 0 ? ` · +${theme.tipBonus}% Tips` : ''}`
    );
  };

  const handleUpgradeEquipment = (id: EquipmentId) => {
    const lv = save.equipmentLevels[id] ?? 1;
    const def = EQUIPMENT_CATALOG[id];
    const cost = getEquipmentUpgradeCost(id, lv);
    if (lv >= def.maxLevel || save.restaurantCash < cost) return;
    sound.playLevelUp();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - cost,
      equipmentLevels: { ...prev.equipmentLevels, [id]: lv + 1 },
      tutorialStep: prev.tutorialStep === 2 ? 3 : prev.tutorialStep,
      stats: { ...prev.stats, upgradesBought: prev.stats.upgradesBought + 1 },
    }));
  };

  const handleHireStaff = (role: StaffRole) => {
    const def = STAFF_CATALOG.find((s) => s.role === role);
    if (!def) return;
    const count = save.staff.filter((s) => s.role === role).length;
    const cost = Math.round(def.hireCost * Math.pow(1.35, count));
    if (save.restaurantCash < cost) return;
    sound.playLevelUp();
    const name = `${STAFF_FIRST_NAMES[(save.staff.length + count) % STAFF_FIRST_NAMES.length]} (${def.title.split(' ')[0]})`;
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - cost,
      staff: [
        ...prev.staff,
        {
          id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          role,
          name,
          level: 1,
          xp: 0,
          speedMultiplier: 1,
        },
      ],
      tutorialStep: prev.tutorialStep === 2 ? 3 : prev.tutorialStep,
    }));
    showToast('Staff Hired!', `${name} is now working in your restaurant.`);
  };

  const handleUpgradeStaff = (staffId: string) => {
    const member = save.staff.find((s) => s.id === staffId);
    if (!member || member.level >= STAFF_MAX_LEVEL) return;
    const cost = getStaffTrainingCost(member.level);
    if (save.restaurantCash < cost) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - cost,
      staff: prev.staff.map((s) =>
        s.id === staffId
          ? { ...s, level: s.level + 1, xp: 0, speedMultiplier: 1 + s.level * 0.14 }
          : s
      ),
    }));
  };

  const handleBuyOrEquipCloth = (itemId: string) => {
    const item = CLOTHING_CATALOG.find((c) => c.id === itemId);
    if (!item) return;
    const owned = save.ownedClothes.includes(itemId);
    if (!owned && save.personalWallet < item.price) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      personalWallet: owned ? prev.personalWallet : prev.personalWallet - item.price,
      ownedClothes: owned ? prev.ownedClothes : [...prev.ownedClothes, itemId],
      equippedOutfitId: item.slot === 'outfit' ? itemId : prev.equippedOutfitId,
      equippedHatId: item.slot === 'hat' ? itemId : prev.equippedHatId,
      equippedWatchId: item.slot === 'watch' ? itemId : prev.equippedWatchId,
      tutorialStep: prev.tutorialStep === 3 ? 4 : prev.tutorialStep,
    }));
  };

  const handleBuyOrSelectVehicle = (vehicleId: string) => {
    const car = VEHICLE_CATALOG.find((v) => v.id === vehicleId);
    if (!car) return;
    const owned = save.ownedVehicles.includes(vehicleId);
    if (!owned && save.personalWallet < car.price) return;
    sound.playEngineStart();
    commitSave((prev) => ({
      ...prev,
      personalWallet: owned ? prev.personalWallet : prev.personalWallet - car.price,
      ownedVehicles: owned ? prev.ownedVehicles : [...prev.ownedVehicles, vehicleId],
      activeVehicleId: vehicleId,
      tutorialStep: prev.tutorialStep === 3 ? 4 : prev.tutorialStep,
    }));
    showToast(owned ? 'Vehicle Selected' : 'New Car Purchased!', `${car.name} parked on the avenue.`);
  };

  const handleBuyOrSelectHouse = (houseId: string) => {
    const house = HOUSE_CATALOG.find((h) => h.id === houseId);
    if (!house) return;
    const owned = save.ownedHouses.includes(houseId);
    if (!owned && save.personalWallet < house.price) return;
    sound.playLevelUp();
    commitSave((prev) => ({
      ...prev,
      personalWallet: owned ? prev.personalWallet : prev.personalWallet - house.price,
      ownedHouses: owned ? prev.ownedHouses : [...prev.ownedHouses, houseId],
      activeHouseId: houseId,
    }));
    showToast(owned ? 'Moved In!' : 'Property Purchased!', house.name);
  };

  const handleBuyFurniture = (furnId: string) => {
    const furn = FURNITURE_CATALOG.find((f) => f.id === furnId);
    if (!furn || save.ownedFurniture.includes(furnId) || save.personalWallet < furn.price) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      personalWallet: prev.personalWallet - furn.price,
      ownedFurniture: [...prev.ownedFurniture, furnId],
    }));
    showToast('Furniture Placed!', `${furn.name} added to your 3D residence.`);
  };

  const handleWithdrawToWallet = (amount: number) => {
    if (save.restaurantCash < amount) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - amount,
      personalWallet: prev.personalWallet + amount,
    }));
    pushPopup(`+$${amount.toLocaleString()} Wallet`, 'sky');
  };

  const handleInvestToBusiness = (amount: number) => {
    if (save.personalWallet < amount) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      personalWallet: prev.personalWallet - amount,
      restaurantCash: prev.restaurantCash + amount,
    }));
  };

  const handleBuyWholesale = () => {
    if (save.bulkIngredientsDiscount >= 0.35 || save.restaurantCash < 450) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - 450,
      bulkIngredientsDiscount: Math.min(0.35, Number((prev.bulkIngredientsDiscount + 0.05).toFixed(2))),
    }));
  };

  const handleBuyFranchise = (franchiseId: string) => {
    const fr = FRANCHISE_CATALOG.find((x) => x.id === franchiseId);
    if (!fr || save.ownedFranchises.includes(franchiseId) || save.restaurantCash < fr.cost) return;
    sound.playLevelUp();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - fr.cost,
      ownedFranchises: [...prev.ownedFranchises, franchiseId],
    }));
    showToast('Empire Expanded!', `${fr.name} is now open!`);
  };

  const handleClaimMission = (missionId: string) => {
    const m = MISSIONS.find((x) => x.id === missionId);
    if (!m || save.completedMissions.includes(missionId)) return;
    sound.playLevelUp();
    commitSave((prev) => ({
      ...prev,
      completedMissions: [...prev.completedMissions, missionId],
      restaurantCash: prev.restaurantCash + m.rewardRestaurantCash,
      personalWallet: prev.personalWallet + m.rewardPersonalCash,
      reputation: Math.min(5.0, prev.reputation + m.rewardReputation),
    }));
    showToast('Mission Complete!', m.title);
  };

  const handleClaimAchievement = (achId: string) => {
    const a = ACHIEVEMENTS.find((x) => x.id === achId);
    if (!a || save.claimedAchievements.includes(achId)) return;
    sound.playLevelUp();
    commitSave((prev) => ({
      ...prev,
      claimedAchievements: [...prev.claimedAchievements, achId],
      personalWallet: prev.personalWallet + a.rewardCash,
    }));
    showToast('Achievement Unlocked!', `${a.title} (+$${a.rewardCash.toLocaleString()})`);
  };

  const nextXp = getXpForNextLevel(save.restaurantLevel);
  const cleanInfo = getCleanlinessLabel(save.cleanliness);
  const dailyPayroll = getTotalDailyPayroll(save.staff);

  const tutorialMessages = [
    isTouch
      ? 'Drag on the left side to walk to the glowing Grill or Fryer, then tap the Cook button.'
      : 'Walk to the glowing Grill or Fryer and press Space / Cook to prepare a dish.',
    isTouch
      ? 'Carry the dish to the customer’s table and tap Serve to earn cash + tips!'
      : 'Carry your cooked dish to the customer table to serve and earn cash + tips!',
    'Open Restaurant or Staff below to upgrade equipment or hire a Chef & Waiter.',
    'Withdraw profits in City > Bank, then buy outfits & cars in Lifestyle!',
  ];

  return (
    <div className="relative w-screen h-dvh overflow-hidden bg-slate-950">
      {/* Dedicated Isolated 3D Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Title Screen */}
      {screen === 'title' && (
        <TitleScreen
          hasSavedCareer={hasSavedCareer}
          savedLevel={save.restaurantLevel}
          savedWealth={save.restaurantCash + save.personalWallet}
          onStart={() => {
            sound.unlock();
            sound.startMusic();
            sound.playClick();
            setScreen('playing');
          }}
          onResetAndStart={() => {
            sound.unlock();
            sound.startMusic();
            handleResetCareer();
          }}
        />
      )}

      {/* Active Gameplay HUD (pointer-events-none wrapper, >=85% viewport unobstructed) */}
      {screen !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none">
          {/* Touch: floating joystick zone on the left (right side stays for camera drag/pinch) */}
          {isTouch && drawerTab === 'none' && !cookModal && (
            <FloatingJoystick
              onMove={(x, y) => engineRef.current?.setJoystick(x, y)}
              onTap={(x, y) => engineRef.current?.tapAt(x, y)}
              bottomInset={compact ? (dockCollapsed ? 40 : 84) : dockCollapsed ? 48 : 104}
            />
          )}

          {/* Projected 3D Order & Clean Bubbles */}
          {/* Floating machine signs: dish pictures show what each machine makes */}
          {hud.bubbles
            .filter((b) => b.kind === 'station' && b.stationType)
            .map((b) => {
              const pending = b.pendingCount ?? 0;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    haptic(HAPTIC.tap);
                    if (b.locked) {
                      // Covered machine: show the recipes it will unlock
                      sound.playClick();
                      setDrawerSubTab(undefined);
                      setDrawerTab('kitchen');
                    } else {
                      engineRef.current?.openCookAtStation(b.stationType!);
                    }
                  }}
                  aria-label={
                    b.locked
                      ? `Locked machine, unlocks at level ${b.unlockLevel}: ${(b.recipeIds ?? []).map((id) => RECIPES[id].name).join(', ')}`
                      : `${b.label}: ${(b.recipeIds ?? []).map((id) => RECIPES[id].name).join(', ')}${
                          pending ? `, ${pending} waiting` : ''
                        }`
                  }
                  ref={bindBubble(b.id, b.screenX, b.screenY)}
                  style={{ left: 0, top: 0, willChange: 'transform' }}
                  className={`pointer-events-auto absolute flex items-center gap-1 rounded-full border shadow-md cursor-pointer ${
                    compact ? 'pl-0.5 pr-1.5 py-0.5' : 'pl-1 pr-2 py-1'
                  } ${
                    b.locked
                      ? 'bg-stone-800/85 border-stone-500/60 opacity-90'
                      : pending
                        ? 'bg-emerald-600/95 border-emerald-300'
                        : 'bg-slate-950/80 border-slate-600/70'
                  }`}
                >
                  {b.locked && <Lock className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-amber-300 ml-1`} />}
                  <span className={`flex -space-x-1.5 ${b.locked ? 'grayscale opacity-70' : ''}`}>
                    {(b.recipeIds ?? []).slice(0, 3).map((id) => (
                      <PreviewThumb
                        key={id}
                        kind="recipe"
                        id={id}
                        alt={RECIPES[id].name}
                        locked={b.locked}
                        className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full ring-1 ring-slate-900`}
                      />
                    ))}
                  </span>
                  <span className={`font-bold text-white whitespace-nowrap ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                    {b.label}
                  </span>
                  {pending > 0 && b.cookProgress === undefined && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-white text-emerald-700 text-[9px] font-extrabold flex items-center justify-center">
                      {pending}
                    </span>
                  )}
                  {b.cookProgress !== undefined && b.cookingRecipeId && (
                    <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 flex items-center gap-1 rounded-full bg-slate-950/90 border border-amber-400/70 pl-0.5 pr-1.5 py-0.5">
                      <PreviewThumb kind="recipe" id={b.cookingRecipeId} alt={RECIPES[b.cookingRecipeId].name} className="w-4 h-4 rounded-full" />
                      <span className="block w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-amber-400 transition-[width] duration-100"
                          style={{ width: `${Math.round(b.cookProgress * 100)}%` }}
                        />
                      </span>
                    </span>
                  )}
                </button>
              );
            })}

          {compact &&
            hud.bubbles.filter((b) => b.kind !== 'station').map((b) => {
              const pct = Math.max(0, Math.min(100, b.patience ?? 100));
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    if (b.kind === 'dirty' && b.tableId) engineRef.current?.walkToTable(b.tableId);
                    else if (b.orderId) engineRef.current?.openCookForOrder(b.orderId);
                  }}
                  aria-label={b.kind === 'dirty' ? 'Dirty table' : `${b.label} order`}
                  ref={bindBubble(b.id, b.screenX, b.screenY)}
                  style={{
                    left: 0,
                    top: 0,
                    willChange: 'transform',
                    background:
                      b.kind === 'dirty'
                        ? '#0f172a'
                        : `conic-gradient(${patienceColor(pct)} ${pct}%, rgba(30,41,59,0.9) 0)`,
                  }}
                  className="pointer-events-auto absolute w-9 h-9 rounded-full p-[3px] shadow-lg cursor-pointer"
                >
                  {b.kind === 'dirty' ? (
                    <span className="w-full h-full rounded-full bg-slate-950 border border-amber-400/70 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </span>
                  ) : (
                    <span className="block w-full h-full rounded-full bg-slate-950 overflow-hidden">
                      {b.recipeId && (
                        <PreviewThumb kind="recipe" id={b.recipeId} alt={b.label} className="w-full h-full rounded-full" />
                      )}
                    </span>
                  )}
                  {b.recipeIds && b.recipeIds.length > 1 && (
                    <span className="absolute -bottom-1 -right-2 flex">
                      {b.recipeIds.slice(1, 3).map((r, k) => (
                        <PreviewThumb
                          key={`${r}_${k}`}
                          kind="recipe"
                          id={r}
                          alt={RECIPES[r].name}
                          className="w-4 h-4 rounded-full ring-1 ring-slate-900 -ml-1"
                        />
                      ))}
                    </span>
                  )}
                  {(b.archetype === 'vip' || b.archetype === 'critic') && (
                    <span
                      className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border border-slate-950 flex items-center justify-center ${
                        b.archetype === 'vip' ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                    >
                      <Star className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
                    </span>
                  )}
                </button>
              );
            })}
          {!compact && hud.bubbles.filter((b) => b.kind !== 'station').map((b) => (
            <button
              key={b.id}
              onClick={() => {
                if (b.kind === 'dirty' && b.tableId) {
                  engineRef.current?.walkToTable(b.tableId);
                } else if (b.orderId) {
                  engineRef.current?.openCookForOrder(b.orderId);
                }
              }}
              ref={bindBubble(b.id, b.screenX, b.screenY)}
              style={{ left: 0, top: 0, willChange: 'transform' }}
              className="pointer-events-auto absolute px-2.5 py-1 rounded-xl bg-slate-950/92 border border-slate-700 shadow-lg text-left cursor-pointer hover:border-amber-400 transition-colors"
            >
              {b.kind === 'dirty' ? (
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-3 h-3" /> Dirty Table
                </span>
              ) : (
                <div className="min-w-[82px]">
                  <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-white whitespace-nowrap">
                    <span>
                      {b.label}
                      {b.recipeIds && b.recipeIds.length > 1 ? ` +${b.recipeIds.length - 1}` : ''}
                    </span>
                    {b.archetype === 'vip' && <span className="text-amber-400">VIP</span>}
                    {b.archetype === 'critic' && <span className="text-rose-400">Critic</span>}
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        (b.patience ?? 100) > 50
                          ? 'bg-emerald-400'
                          : (b.patience ?? 100) > 25
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(4, b.patience ?? 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          ))}

          {/* Floating Cash Popups */}
          {popups.map((p) => (
            <div
              key={p.id}
              style={{ left: `${p.screenX}px`, top: `${p.screenY}px` }}
              className={`absolute font-display font-extrabold ${compact ? 'text-sm' : 'text-base sm:text-lg'} drop-shadow-md animate-float-up whitespace-nowrap ${
                p.color === 'emerald'
                  ? 'text-emerald-400'
                  : p.color === 'amber'
                    ? 'text-amber-300'
                    : p.color === 'sky'
                      ? 'text-sky-300'
                      : 'text-rose-400'
              }`}
            >
              {p.text}
            </div>
          ))}

          {/* Compact phone top stack: status row → order chips → guide tip (never overlapping) */}
          {compact && (
            <div
              className="flex flex-col gap-1.5"
              style={{
                paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
                paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
                paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
              }}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="pointer-events-auto flex items-center gap-2 min-w-0 overflow-hidden rounded-full bg-slate-950/85 border border-slate-700/70 pl-2.5 pr-1 py-1 shadow-md">
                  <span className="flex items-center gap-1 font-mono-num text-xs font-bold text-white" aria-label="Restaurant cash">
                    <Coins className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {shortMoney(save.restaurantCash)}
                  </span>
                  <span className="flex items-center gap-1 font-mono-num text-xs font-bold text-white" aria-label="Wallet">
                    <Wallet className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    {shortMoney(save.personalWallet)}
                  </span>
                  <span className="flex items-center gap-0.5 font-mono-num text-[11px] font-bold text-amber-300" aria-label="Reputation">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {save.reputation.toFixed(1)}
                  </span>
                  {cleanInfo.tone !== 'good' && (
                  <span
                    aria-label="Cleanliness"
                    className={`flex items-center gap-0.5 font-mono-num text-[11px] font-bold ${
                      cleanInfo.tone === 'ok' ? 'text-amber-300' : 'text-rose-400'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {Math.round(save.cleanliness)}%
                  </span>
                  )}
                  <button
                    onClick={() => {
                      sound.playClick();
                      setShowDailyModal(true);
                    }}
                    aria-label={`Daily streak ${dailyStatus.effectiveStreak} days`}
                    className={`flex items-center gap-0.5 h-6 px-1.5 rounded-full font-mono-num text-[11px] font-bold cursor-pointer ${
                      dailyStatus.canClaim ? 'bg-amber-500 text-slate-950 animate-pulse' : 'text-orange-300'
                    }`}
                  >
                    <Flame className={`w-3 h-3 ${dailyStatus.canClaim ? 'fill-slate-950' : 'fill-orange-400 text-orange-400'}`} />
                    {dailyStatus.effectiveStreak}
                  </button>
                </div>
                <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
                  <span
                    className="flex items-center gap-1 h-8 px-2 rounded-full bg-slate-950/85 border border-slate-700/70 font-mono-num text-[11px] font-bold text-slate-200"
                    aria-label={`Day ${save.dayNumber}, ${formatClock(saveRef.current.timeOfDay)}`}
                  >
                    <span className="text-[9px] text-indigo-300">D{save.dayNumber}</span>
                    {formatClock(saveRef.current.timeOfDay)}
                    <span
                      className="flex items-center gap-0.5 ml-0.5 pl-1.5 border-l border-slate-700 text-amber-300"
                      aria-label={`Today's goal: ${save.today.customersServed} of ${starTarget} orders for 2 stars`}
                    >
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {save.today.customersServed}/{starTarget}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      haptic(HAPTIC.tap);
                      setScreen('paused');
                    }}
                    className="w-9 h-9 rounded-full bg-slate-950/85 border border-slate-700/70 text-slate-200 flex items-center justify-center cursor-pointer"
                    aria-label="Pause game"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {hud.activeOrders.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {hud.activeOrders.slice(0, 5).map((ord) => {
                    const pct = Math.max(0, Math.round((ord.patience / ord.maxPatience) * 100));
                    return (
                      <button
                        key={ord.id}
                        onClick={() => engineRef.current?.openCookForOrder(ord.id)}
                        aria-label={`${RECIPES[ord.recipeId].name}, ${ord.tableId === -1 ? 'takeaway' : `table ${ord.tableId}`}, ${pct}% patience`}
                        className="pointer-events-auto relative w-11 rounded-lg bg-slate-950/85 border border-slate-700/70 p-0.5 cursor-pointer"
                      >
                        <PreviewThumb kind="recipe" id={ord.recipeId} alt={RECIPES[ord.recipeId].name} className="w-full h-8 rounded-md" />
                        <span className="absolute top-0.5 left-0.5 px-1 rounded bg-slate-950/80 text-[8px] font-bold text-slate-200 leading-tight">
                          {ord.tableId === -1 ? 'TO GO' : `T${ord.tableId}`}
                        </span>
                        {ord.items.length > 1 && (
                          <span className="absolute top-0.5 right-0.5 px-1 rounded bg-amber-500 text-[8px] font-extrabold text-slate-950 leading-tight">
                            {ord.items.length - ord.remaining.length}/{ord.items.length}
                          </span>
                        )}
                        <span className="block mt-0.5 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <span className="block h-full" style={{ width: `${Math.max(6, pct)}%`, background: patienceColor(pct) }} />
                        </span>
                      </button>
                    );
                  })}
                  {hud.activeOrders.length > 5 && (
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-950/80 rounded-md px-1.5 py-1">
                      +{hud.activeOrders.length - 5}
                    </span>
                  )}
                </div>
              )}

              {save.tutorialStep < 4 && drawerTab === 'none' && !cookModal && (
                <div className="pointer-events-auto self-start max-w-[min(92vw,340px)] flex items-start gap-2 rounded-xl bg-slate-950/85 border border-amber-500/40 pl-2.5 pr-1 py-1.5 shadow-md">
                  <span className="mt-px shrink-0 rounded bg-amber-500/20 px-1 text-[9px] font-extrabold text-amber-300">
                    {save.tutorialStep + 1}/4
                  </span>
                  <p className="text-[11px] leading-snug text-slate-200">{tutorialMessages[save.tutorialStep]}</p>
                  <button
                    onClick={() => commitSave((p) => ({ ...p, tutorialStep: 5 }))}
                    aria-label="Dismiss guide"
                    className="shrink-0 w-6 h-6 -my-0.5 rounded-full text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Top Perimeter Status Bar */}
          {!compact && (
          <header
            className="flex items-start justify-between gap-2 p-2.5 sm:px-4 sm:py-3"
            style={{
              paddingTop: 'max(0.625rem, env(safe-area-inset-top))',
              paddingLeft: 'max(0.625rem, env(safe-area-inset-left))',
              paddingRight: 'max(0.625rem, env(safe-area-inset-right))',
            }}
          >
            {/* Financials & Level Cluster */}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-950/92 border border-slate-700/80 rounded-xl px-3 py-2 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[10px] leading-none text-slate-400">Restaurant</p>
                  <p className="font-mono-num text-sm font-bold text-white leading-tight">
                    ${save.restaurantCash.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-800" />

              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <p className="text-[10px] leading-none text-slate-400">Wallet</p>
                  <p className="font-mono-num text-sm font-bold text-white leading-tight">
                    ${save.personalWallet.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-800 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-2">
                <div>
                  <p className="text-[10px] leading-none text-amber-400 font-semibold">
                    Level {save.restaurantLevel}
                  </p>
                  <div className="w-20 h-1.5 rounded-full bg-slate-800 mt-1 overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${Math.min(100, (save.xp / nextXp) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="w-px h-6 bg-slate-800" />

              <div className="flex items-center gap-1 text-xs font-mono-num font-bold text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{save.reputation.toFixed(1)}</span>
              </div>

              <div className="w-px h-6 bg-slate-800" />

              <div
                title={`Cleanliness: ${cleanInfo.label}${
                  cleanInfo.tone === 'good' ? '' : ' · customers lose patience faster'
                }`}
                className={`flex items-center gap-1 text-xs font-mono-num font-bold ${
                  cleanInfo.tone === 'good'
                    ? 'text-emerald-300'
                    : cleanInfo.tone === 'ok'
                      ? 'text-amber-300'
                      : 'text-rose-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{Math.round(save.cleanliness)}%</span>
              </div>

              <div className="w-px h-6 bg-slate-800" />

              <button
                onClick={() => {
                  sound.playClick();
                  setShowDailyModal(true);
                }}
                title={`Daily Login Streak: ${dailyStatus.effectiveStreak} day${dailyStatus.effectiveStreak === 1 ? '' : 's'}`}
                aria-label={`Daily login streak ${dailyStatus.effectiveStreak} days`}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-mono-num font-bold cursor-pointer transition-colors ${
                  dailyStatus.canClaim
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-slate-900/90 border-slate-700/80 text-orange-300 hover:border-slate-500'
                }`}
              >
                <Flame
                  className={`w-3.5 h-3.5 shrink-0 ${
                    dailyStatus.effectiveStreak > 0
                      ? 'text-orange-400 fill-orange-400'
                      : 'text-slate-400'
                  }`}
                />
                <span>{dailyStatus.effectiveStreak}d</span>
                <span className="hidden md:inline text-[10px] font-sans uppercase tracking-wider text-slate-300">
                  {dailyStatus.canClaim ? '· Claim' : 'Streak'}
                </span>
              </button>
            </div>

            {/* Zone & Camera / Audio / Pause Controls */}
            <div className="pointer-events-auto flex items-center gap-1.5">
              <div
                title={`Day ${save.dayNumber} · staff are paid at midnight ($${dailyPayroll.toLocaleString()}/day)`}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-950/92 border border-slate-700/80 text-xs font-semibold text-slate-200"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-300" />
                <span className="font-mono-num whitespace-nowrap">
                  <span className="hidden sm:inline">Day </span>
                  <span className="sm:hidden">D</span>
                  {save.dayNumber} · {formatClock(saveRef.current.timeOfDay)}
                </span>
                <span
                  className="flex items-center gap-1 pl-1.5 border-l border-slate-700 font-mono-num text-amber-300"
                  title="Orders served today / goal for 2 stars"
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {save.today.customersServed}/{starTarget}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/92 border border-slate-700/80 text-xs font-semibold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="whitespace-nowrap">{hud.playerZoneLabel}</span>
              </div>

              <button
                onClick={() => engineRef.current?.rotateCamera(-0.45)}
                className="hidden [@media(pointer:fine)]:inline-flex p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title="Rotate Camera Left"
                aria-label="Rotate camera left"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => engineRef.current?.rotateCamera(0.45)}
                className="hidden [@media(pointer:fine)]:inline-flex p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title="Rotate Camera Right"
                aria-label="Rotate camera right"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => engineRef.current?.adjustZoom(-2.5)}
                className="hidden sm:inline-flex p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title="Zoom In"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => engineRef.current?.adjustZoom(2.5)}
                className="hidden sm:inline-flex p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title="Zoom Out"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const nextMusicMuted = !save.isMusicMuted;
                  sound.unlock();
                  if (!nextMusicMuted) sound.startMusic();
                  sound.setMusicMuted(nextMusicMuted);
                  commitSave((p) => ({ ...p, isMusicMuted: nextMusicMuted }));
                }}
                className="hidden [@media(pointer:fine)]:inline-flex p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title={save.isMusicMuted ? 'Unmute Cafe Music' : 'Mute Cafe Music'}
                aria-label={save.isMusicMuted ? 'Unmute cafe music' : 'Mute cafe music'}
              >
                <Music
                  className={`w-4 h-4 ${
                    save.isMusicMuted || save.isMuted ? 'text-slate-500' : 'text-amber-400'
                  }`}
                />
              </button>

              <button
                onClick={() => {
                  const nextMuted = !save.isMuted;
                  sound.setMuted(nextMuted);
                  commitSave((p) => ({ ...p, isMuted: nextMuted }));
                }}
                className="hidden [@media(pointer:fine)]:inline-flex p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title={save.isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
                aria-label={save.isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {save.isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  haptic(HAPTIC.tap);
                  setScreen('paused');
                }}
                className="p-3 sm:p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                aria-label="Pause game"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </header>
          )}

          {/* Compact Top-Left Active Orders Strip */}
          {!compact && hud.activeOrders.length > 0 && (
            <div className="px-3 sm:px-4 flex flex-col gap-1.5 max-w-[230px]">
              {hud.activeOrders.slice(0, 3).map((ord) => {
                const pct = Math.max(0, Math.round((ord.patience / ord.maxPatience) * 100));
                return (
                  <button
                    key={ord.id}
                    onClick={() => engineRef.current?.openCookForOrder(ord.id)}
                    className="pointer-events-auto flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {RECIPES[ord.recipeId].name}
                        {ord.items.length > 1 && (
                          <span className="ml-1 text-amber-300">
                            +{ord.remaining.length - 1} · combo {ord.items.length - ord.remaining.length}/{ord.items.length}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {ord.tableId === -1 ? 'Takeaway' : `Table ${ord.tableId}`} · {ord.customerName}
                      </p>
                    </div>
                    <span
                      className={`font-mono-num text-[11px] font-bold shrink-0 ${
                        pct > 50 ? 'text-emerald-400' : pct > 25 ? 'text-amber-400' : 'text-rose-400'
                      }`}
                    >
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right column: serving streak, next quick goal, dish of the day */}
          {drawerTab === 'none' && !dayReport && (
            <div
              className={`fixed z-20 pointer-events-none flex flex-col items-end gap-1 ${compact ? 'right-2' : 'right-4'}`}
              style={{ top: compact ? 'calc(max(0.5rem, env(safe-area-inset-top)) + 2.9rem)' : '4.5rem' }}
            >
              {/* Serving streak meter: tips multiply while you keep serving */}
              {hud.streak.count >= 2 && (
                <div
                  className={`flex items-center gap-1.5 rounded-full border shadow-lg ${
                    compact ? 'px-2 py-1' : 'px-3 py-1.5'
                  } ${hud.streak.mult > 1 ? 'bg-orange-600/90 border-orange-300' : 'bg-slate-950/85 border-slate-600'}`}
                  aria-label={`Serving streak ${hud.streak.count}, tips times ${hud.streak.mult}`}
                >
                  <Flame className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-yellow-200 fill-yellow-300`} />
                  <span className={`font-mono-num font-extrabold text-white ${compact ? 'text-[11px]' : 'text-xs'}`}>
                    {hud.streak.count}
                    {hud.streak.mult > 1 && <span className="text-yellow-200"> · ×{hud.streak.mult}</span>}
                  </span>
                  <span className="block w-10 h-1 rounded-full bg-black/30 overflow-hidden">
                    <span className="block h-full bg-yellow-200" style={{ width: `${Math.round(hud.streak.timeLeft * 100)}%` }} />
                  </span>
                </div>
              )}
              {save.tutorialStep >= 4 && (
                <QuickGoalChip state={save.quickGoals} special={save.dailySpecial} flash={goalFlash} compact={compact} />
              )}
              {save.dailySpecial && save.tutorialStep >= 4 && (
                <span
                  className={`flex items-center gap-1 rounded-full bg-amber-500/90 border border-amber-200 text-slate-950 font-bold shadow ${
                    compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
                  }`}
                  aria-label={`Dish of the day: ${RECIPES[save.dailySpecial].name}, plus ${Math.round(DAILY_SPECIAL_BONUS * 100)} percent price`}
                >
                  <Star className="w-2.5 h-2.5 fill-slate-950" />
                  {RECIPES[save.dailySpecial].name} +{Math.round(DAILY_SPECIAL_BONUS * 100)}%
                </span>
              )}
              {canOpenNext && nextCuisine && (
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowGrandOpening(true);
                  }}
                  className={`pointer-events-auto flex items-center gap-1 rounded-full bg-indigo-600 border border-indigo-200 text-white font-extrabold shadow-lg animate-pulse cursor-pointer ${
                    compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
                  }`}
                  aria-label={`Open ${nextCuisine.name}`}
                >
                  <span aria-hidden>{nextCuisine.flag}</span> New restaurant!
                </button>
              )}
            </div>
          )}

          {/* Offline Ready Badge */}
          {!isOnline && (
            <div className="mx-3 mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/92 border border-amber-500/60 text-[11px] font-semibold text-amber-300">
              <span>Offline Mode · Saved Locally</span>
            </div>
          )}

          {/* Celebratory Level-Up / Milestone Toast */}
          {toast && (
            <div
              className={`fixed left-1/2 -translate-x-1/2 z-30 rounded-xl bg-amber-500 text-slate-950 shadow-2xl border border-amber-300 text-center ${
                compact ? 'px-3 py-1.5 max-w-[86vw]' : 'top-18 px-4 py-2.5'
              }`}
              style={compact ? { top: 'calc(max(0.5rem, env(safe-area-inset-top)) + 2.75rem)' } : undefined}
            >
              <p className={`font-display font-extrabold leading-tight ${compact ? 'text-xs' : 'text-sm'}`}>{toast.title}</p>
              <p className={`font-semibold text-slate-900 ${compact ? 'text-[10px] truncate' : 'text-xs'}`}>{toast.subtitle}</p>
            </div>
          )}

          {/* Gentle Onboarding Tutorial Tip */}
          {!compact && save.tutorialStep < 4 && drawerTab === 'none' && !cookModal && !dayReport && (
            <div className="fixed top-20 right-3 sm:right-5 max-w-[260px] pointer-events-auto rounded-xl bg-slate-950/92 border border-amber-500/50 p-3 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Chef Guide · {save.tutorialStep + 1}/4
                </span>
                <button
                  onClick={() => commitSave((p) => ({ ...p, tutorialStep: 5 }))}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-slate-200 leading-snug">
                {tutorialMessages[save.tutorialStep]}
              </p>
            </div>
          )}

          {/* Bottom-Left Touch Joystick + Held Dish Tray */}
          <div
            className="fixed left-3 sm:left-5 flex flex-col items-start gap-2.5"
            style={{
              bottom: isTouch ? 'calc(16.5rem + env(safe-area-inset-bottom))' : 'calc(5rem + env(safe-area-inset-bottom))',
              marginLeft: 'env(safe-area-inset-left)',
            }}
          >
            {!compact && hud.heldRecipe && (
              <div className="pointer-events-auto flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 shadow-lg font-bold text-xs">
                <Utensils className="w-4 h-4" />
                <span>Carrying: {RECIPES[hud.heldRecipe].name}</span>
                <button
                  onClick={handlePutDishOnPass}
                  title="Put on the pass counter (serve later)"
                  className="ml-1 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950/15 hover:bg-slate-950/25 cursor-pointer"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Pass
                </button>
                <button
                  onClick={handleTrashDish}
                  title="Throw away"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-950/15 hover:bg-rose-600 hover:text-white cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!isTouch && <VirtualJoystick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} />}
          </div>

          {/* Bottom-Right Context Action Button (Mobile & Desktop) */}
          {compact && (hud.nearbyPrompt || hud.heldRecipe) && (
            <div
              className="fixed right-2 flex flex-col items-end gap-1.5"
              style={{
                bottom: `calc(${dockCollapsed ? '3.25rem' : '6rem'} + env(safe-area-inset-bottom))`,
                marginRight: 'env(safe-area-inset-right)',
              }}
            >
              {hud.heldRecipe && (
                <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-950/85 border border-amber-500/60 pl-0.5 pr-0.5 py-0.5 shadow-md">
                  <PreviewThumb kind="recipe" id={hud.heldRecipe} alt={RECIPES[hud.heldRecipe].name} className="w-7 h-7 rounded-full" />
                  <span className="text-[10px] font-bold text-amber-200 max-w-[30vw] truncate">
                    {RECIPES[hud.heldRecipe].name}
                  </span>
                  <button
                    onClick={handlePutDishOnPass}
                    aria-label="Put dish on the pass counter"
                    className="w-8 h-8 rounded-full bg-slate-800 active:bg-slate-700 text-sky-300 flex items-center justify-center cursor-pointer"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleTrashDish}
                    aria-label="Throw dish away"
                    className="w-8 h-8 rounded-full bg-slate-800 active:bg-slate-700 text-rose-300 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              {hud.nearbyPrompt && (
                <button
                  onClick={() => {
                    haptic(HAPTIC.action);
                    engineRef.current?.triggerContextAction();
                  }}
                  className="pointer-events-auto flex items-center gap-2 h-12 pl-1.5 pr-3.5 rounded-full bg-amber-500 active:bg-amber-400 active:scale-95 text-slate-950 shadow-xl border-2 border-amber-200 cursor-pointer transition-transform animate-action-pop max-w-[62vw]"
                >
                  {(() => {
                    const t = hud.nearbyPrompt.actionType;
                    const Icon =
                      t === 'cook_station' ? ChefHat
                      : t === 'serve_table' || t === 'serve_takeaway' ? Utensils
                      : t === 'clean_table' ? Sparkles
                      : t === 'enter_car' || t === 'exit_car' ? Car
                      : t === 'open_bank' ? Wallet
                      : t === 'open_supermarket' ? Store
                      : t === 'open_home' ? Home
                      : t === 'open_shop' ? ShoppingBag
                      : t === 'put_down' ? ArrowDownToLine
                      : t === 'pick_up' ? Hand
                      : t === 'trash' ? Trash2
                      : Flame;
                    return (
                      <span className="w-9 h-9 rounded-full bg-slate-950/15 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </span>
                    );
                  })()}
                  <span className="min-w-0 text-left">
                    <span className="block font-display font-extrabold text-[13px] leading-tight truncate">
                      {hud.nearbyPrompt.label}
                    </span>
                    {hud.nearbyPrompt.sublabel && (
                      <span className="block text-[10px] font-semibold text-slate-900/80 leading-tight truncate">
                        {hud.nearbyPrompt.sublabel}
                      </span>
                    )}
                  </span>
                </button>
              )}
            </div>
          )}

          {!compact && hud.nearbyPrompt && (
            <div
              className="fixed right-3 sm:right-5"
              style={{
                bottom: 'calc(6.5rem + env(safe-area-inset-bottom))',
                marginRight: 'env(safe-area-inset-right)',
              }}
            >
              <button
                onClick={() => {
                  haptic(HAPTIC.action);
                  engineRef.current?.triggerContextAction();
                }}
                className="pointer-events-auto flex items-center gap-3 min-h-[64px] px-5 sm:px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-2xl border-2 border-amber-200 cursor-pointer transition-transform animate-action-pop"
              >
                {(() => {
                  const t = hud.nearbyPrompt.actionType;
                  const Icon =
                    t === 'cook_station'
                      ? ChefHat
                      : t === 'serve_table' || t === 'serve_takeaway'
                        ? Utensils
                        : t === 'clean_table'
                          ? Sparkles
                          : t === 'enter_car' || t === 'exit_car'
                            ? Car
                            : t === 'open_bank'
                              ? Wallet
                              : t === 'open_supermarket'
                                ? Store
                                : t === 'open_home'
                                  ? Home
                                  : t === 'open_shop'
                                    ? ShoppingBag
                                    : t === 'put_down'
                                      ? ArrowDownToLine
                                      : t === 'pick_up'
                                        ? Hand
                                        : t === 'trash'
                                          ? Trash2
                                          : Flame;
                  return (
                    <span className="w-10 h-10 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6" />
                    </span>
                  );
                })()}
                <div className="text-left">
                  <p className="font-display font-extrabold text-sm leading-tight whitespace-nowrap">
                    {hud.nearbyPrompt.label}
                  </p>
                  {hud.nearbyPrompt.sublabel && (
                    <p className="text-[11px] font-semibold text-slate-900 leading-tight whitespace-nowrap">
                      {hud.nearbyPrompt.sublabel}
                    </p>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Bottom-Center Collapsible Management Dock */}
          <div
            className="fixed left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[96vw]"
            style={{ bottom: `calc(${compact ? '0.375rem' : '0.75rem'} + env(safe-area-inset-bottom))` }}
          >
            <button
              onClick={() => setDockCollapsed((c) => !c)}
              aria-label={dockCollapsed ? 'Show menu' : 'Hide menu'}
              className={`pointer-events-auto inline-flex items-center gap-1 rounded-full bg-slate-950/92 border border-slate-700 font-semibold text-slate-300 hover:text-white cursor-pointer ${
                compact ? 'h-5 px-2.5 text-[10px]' : 'px-3 py-1 text-[11px]'
              }`}
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Show Menu
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Hide
                </>
              )}
            </button>

            {!dockCollapsed && (
              <nav
                className={`pointer-events-auto flex items-center rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl overflow-x-auto max-w-[96vw] ${
                  compact ? 'gap-0.5 p-1' : 'gap-1 p-1.5'
                }`}
              >
                {[
                  { id: 'restaurant', label: 'Restaurant', icon: Store },
                  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
                  { id: 'staff', label: 'Staff', icon: Users },
                  { id: 'city', label: 'City', icon: Building2 },
                  { id: 'lifestyle', label: 'Lifestyle', icon: ShoppingBag },
                  { id: 'missions', label: 'Missions', icon: Award },
                  { id: 'album', label: 'Album', icon: BookOpen },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = drawerTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === 'album') {
                          setDrawerTab('none');
                          openAlbum();
                          return;
                        }
                        sound.playClick();
                        setDrawerSubTab(undefined);
                        setDrawerTab(active ? 'none' : (item.id as DrawerTab));
                      }}
                      aria-label={item.label}
                      className={`shrink-0 cursor-pointer transition-colors font-bold whitespace-nowrap ${
                        compact
                          ? 'flex flex-col items-center justify-center gap-0.5 w-[43px] h-11 rounded-xl text-[9px]'
                          : 'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs'
                      } ${active ? 'bg-amber-500 text-slate-950' : 'text-slate-200 hover:bg-slate-800'}`}
                    >
                      <span className="relative">
                        <Icon className={`${compact ? 'w-[18px] h-[18px]' : 'w-4 h-4'} shrink-0`} />
                        {item.id === 'missions' && claimableChallenges > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                            {claimableChallenges}
                          </span>
                        )}
                        {item.id === 'album' && albumBadge > 0 && (
                          <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                            {albumBadge}
                          </span>
                        )}
                      </span>
                      <span>{compact && item.id === 'restaurant' ? 'Cafe' : compact && item.id === 'lifestyle' ? 'Shop' : compact && item.id === 'settings' ? 'Setup' : item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      )}

      {/* Interactive Cooking Mini-Game */}
      {cookModal && (
        <CookingMiniGame
          station={cookModal.station}
          unlockedRecipes={getMenuRecipes(save)}
          unlockedSpecialtyLines={save.unlockedSpecialtyLines}
          equipmentLevel={save.equipmentLevels[cookModal.station] ?? 1}
          bulkDiscount={save.bulkIngredientsDiscount}
          restaurantCash={save.restaurantCash}
          pendingOrders={hud.activeOrders}
          suggestedOrder={cookModal.suggestedOrder}
          dailySpecial={save.dailySpecial}
          onComplete={handleCookingComplete}
          onOpenSpecialtyMenu={() => {
            setCookModal(null);
            setDrawerSubTab('specialty');
            setDrawerTab('kitchen');
          }}
          onClose={() => setCookModal(null)}
        />
      )}

      {/* Management & Lifestyle Drawers */}
      <ManagementDrawers
        onOpenGrandOpening={() => {
          sound.playClick();
          setShowGrandOpening(true);
        }}
        activeTab={drawerTab}
        initialSubTab={drawerSubTab}
        save={save}
        inVehicle={hud.inVehicle}
        onClose={() => setDrawerTab('none')}
        onUnlockRecipe={handleUnlockRecipe}
        onUnlockSpecialtyLine={handleUnlockSpecialtyLine}
        onUpgradeEquipment={handleUpgradeEquipment}
        onHireStaff={handleHireStaff}
        onUpgradeStaff={handleUpgradeStaff}
        onBuyOrEquipCloth={handleBuyOrEquipCloth}
        onBuyOrSelectVehicle={handleBuyOrSelectVehicle}
        onToggleDrive={() => engineRef.current?.toggleVehicle()}
        onBuyOrSelectHouse={handleBuyOrSelectHouse}
        onBuyFurniture={handleBuyFurniture}
        onTravelZone={(zoneId) => engineRef.current?.teleportToZone(zoneId)}
        onWithdrawToWallet={handleWithdrawToWallet}
        onInvestToBusiness={handleInvestToBusiness}
        onBuyWholesaleUpgrade={handleBuyWholesale}
        onBuyFranchise={handleBuyFranchise}
        onClaimMission={handleClaimMission}
        onClaimAchievement={handleClaimAchievement}
        onBuyOrEquipCafeTheme={handleBuyOrEquipCafeTheme}
        onToggleMute={() => {
          const next = !save.isMuted;
          sound.setMuted(next);
          commitSave((p) => ({ ...p, isMuted: next }));
        }}
        onToggleMusicMute={() => {
          const next = !save.isMusicMuted;
          sound.unlock();
          if (!next) sound.startMusic();
          sound.setMusicMuted(next);
          commitSave((p) => ({ ...p, isMusicMuted: next }));
        }}
        onSaveNow={handleSaveNow}
        onSetGraphicsQuality={(q) => commitSave((p) => ({ ...p, graphicsQuality: q }))}
        onClaimChallenge={handleClaimChallenge}
        onClaimChallengeBonus={handleClaimChallengeBonus}
        onToggleHaptics={() => {
          const next = !(save.hapticsEnabled ?? true);
          setHapticsEnabled(next);
          if (next) haptic(HAPTIC.action);
          commitSave((p) => ({ ...p, hapticsEnabled: next }));
        }}
        onResetSave={handleResetCareer}
        onAdvanceTimeOfDay={() =>
          commitSave((p) => ({ ...p, timeOfDay: (p.timeOfDay + 0.25) % 1 }))
        }
      />

      {/* End-of-Day Report (non-blocking) */}
      {showGrandOpening && nextCuisine && (
        <GrandOpeningModal
          next={nextCuisine}
          current={CUISINES[save.activeCuisine]}
          restaurantLevel={save.restaurantLevel}
          onOpen={handleOpenNextRestaurant}
          onClose={() => setShowGrandOpening(false)}
        />
      )}

      {showAlbum && (
        <RecipeAlbum
          album={save.album}
          activeCuisine={save.activeCuisine}
          ownedRestaurants={save.ownedRestaurants}
          restaurantLevel={save.restaurantLevel}
          onClaimPage={handleClaimAlbumPage}
          onClose={closeAlbum}
        />
      )}

      {newCards.length > 0 && screen === 'playing' && <NewCardsToast card={newCards[0]} compact={compact} />}

      {dayReport && screen === 'playing' && (
        <DayReportCard report={dayReport} onClose={closeDayReport} compact={compact} />
      )}

      {/* Offline Franchise Earnings */}
      {offlineReward && screen === 'playing' && (
        <WelcomeBackModal
          minutesAway={offlineReward.minutesAway}
          cappedMinutes={offlineReward.cappedMinutes}
          amount={offlineReward.amount}
          franchiseCount={save.ownedFranchises.length}
          onClaim={handleClaimOfflineReward}
        />
      )}

      {/* Daily Login Bonus Modal */}
      {showDailyModal && screen === 'playing' && !offlineReward && (
        <DailyBonusModal
          status={dailyStatus}
          totalDaysClaimed={save.dailyLogin.totalDaysClaimed}
          onClaim={handleClaimDailyBonus}
          onClose={() => setShowDailyModal(false)}
        />
      )}

      {/* Pause Modal */}
      {screen === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-700 p-6 shadow-2xl text-center space-y-4">
            <h2 className="font-display text-2xl font-extrabold text-white">Game Paused</h2>
            <p className="text-xs text-slate-400 font-mono-num">
              Level {save.restaurantLevel} · Total Earned ${save.totalEarned.toLocaleString()}
            </p>
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => setScreen('playing')}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" /> Resume Game
              </button>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: 'Sound',
                    on: !save.isMuted,
                    icon: save.isMuted ? VolumeX : Volume2,
                    toggle: () => {
                      const next = !save.isMuted;
                      sound.setMuted(next);
                      commitSave((p) => ({ ...p, isMuted: next }));
                    },
                  },
                  {
                    label: 'Music',
                    on: !save.isMusicMuted,
                    icon: Music,
                    toggle: () => {
                      const next = !save.isMusicMuted;
                      sound.unlock();
                      if (!next) sound.startMusic();
                      sound.setMusicMuted(next);
                      commitSave((p) => ({ ...p, isMusicMuted: next }));
                    },
                  },
                  {
                    label: 'Vibration',
                    on: save.hapticsEnabled ?? true,
                    icon: Vibrate,
                    toggle: () => {
                      const next = !(save.hapticsEnabled ?? true);
                      setHapticsEnabled(next);
                      if (next) haptic(HAPTIC.action);
                      commitSave((p) => ({ ...p, hapticsEnabled: next }));
                    },
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.label}
                      onClick={opt.toggle}
                      aria-pressed={opt.on}
                      className={`min-h-[64px] rounded-xl border flex flex-col items-center justify-center gap-1 text-xs font-bold cursor-pointer ${
                        opt.on
                          ? 'bg-slate-900 border-amber-500/60 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {opt.label} {opt.on ? 'on' : 'off'}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleSaveNow}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-semibold text-sm cursor-pointer"
              >
                Save Progress
              </button>
              <button
                onClick={() => setScreen('title')}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-sm cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
