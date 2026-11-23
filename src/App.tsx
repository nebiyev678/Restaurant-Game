import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Building2,
  ChefHat,
  ChevronDown,
  ChevronUp,
  Coins,
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
  Users,
  Utensils,
  Volume2,
  VolumeX,
  Wallet,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CookingMiniGame } from './components/CookingMiniGame';
import { DailyBonusModal } from './components/DailyBonusModal';
import { ManagementDrawers } from './components/ManagementDrawers';
import { TitleScreen } from './components/TitleScreen';
import { VirtualJoystick } from './components/VirtualJoystick';
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
  VEHICLE_CATALOG,
  createInitialSaveState,
  getDailyLoginStatus,
  getEquipmentUpgradeCost,
  getLocalDateKey,
  getRestaurantTier,
  getXpForNextLevel,
} from './game/data';
import {
  CafeThemeId,
  CustomerOrder,
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
import { useOnlineStatus } from './hooks/usePWAInstall';

const STORAGE_KEY = 'restaurant_empire_save_v1';

const STAFF_FIRST_NAMES = ['Marco', 'Elena', 'Kenji', 'Nora', 'Mateo', 'Clara', 'Sam', 'Zoe'];

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
  });

  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [toast, setToast] = useState<{ title: string; subtitle: string } | null>(null);

  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RestaurantWorldEngine | null>(null);

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
    const activeTheme =
      CAFE_THEMES.find((t) => t.id === (save.activeCafeThemeId ?? 'classic_bistro')) ??
      CAFE_THEMES[0];
    sound.setMusicTheme(activeTheme.musicMood);
  }, [save.activeCafeThemeId]);

  // Mount Three.js engine once in isolated container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new RestaurantWorldEngine(mount, saveRef, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onOrderServed: (recipeId, revenue, tip, repDelta, xpGain) => {
        const total = revenue + tip;
        pushPopup(`+$${revenue}${tip > 0 ? ` (+$${tip} tip)` : ''}`, 'emerald');
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
          };
        });
      },
      onOrderFailed: (repDelta) => {
        pushPopup('Customer Left!', 'rose');
        commitSave((prev) => ({
          ...prev,
          reputation: Math.max(1.0, prev.reputation + repDelta),
        }));
      },
      onCookRequested: (station, suggestedOrder) => {
        sound.playClick();
        setCookModal({ station, suggestedOrder });
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
        }));
      },
      onTableCleaned: () => {
        commitSave((prev) => ({
          ...prev,
          cleanliness: Math.min(100, prev.cleanliness + 6),
        }));
      },
      onDirtyChanged: (delta) => {
        commitSave((prev) => ({
          ...prev,
          cleanliness: Math.max(20, Math.min(100, prev.cleanliness + delta)),
        }));
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [commitSave, pushPopup, showToast]);

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
    save.staff,
  ]);

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
      screen === 'paused' || drawerTab !== 'none' || cookModal !== null || showDailyModal;
    engineRef.current?.setTitleMode(isTitle);
    engineRef.current?.setPaused(isPaused);
  }, [screen, drawerTab, cookModal, showDailyModal]);

  // Passive Franchise Income + Daily Salaries + Auto-Save + Day Rollover Check every 10s
  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentKey = getLocalDateKey();
      setTodayKey((prev) => (prev === currentKey ? prev : currentKey));

      const s = saveRef.current;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      } catch {
        // ignore storage quota errors
      }
      if (screen !== 'playing') return;

      // Franchise passive income tick (10s = 1/6th minute)
      if (s.ownedFranchises.length > 0) {
        const perMin = s.ownedFranchises.reduce((sum, id) => {
          const fr = FRANCHISE_CATALOG.find((x) => x.id === id);
          return sum + (fr?.incomePerMinute ?? 0);
        }, 0);
        const tickIncome = Math.round(perMin / 6);
        if (tickIncome > 0) {
          commitSave((prev) => ({
            ...prev,
            restaurantCash: prev.restaurantCash + tickIncome,
            totalEarned: prev.totalEarned + tickIncome,
          }));
        }
      }
    }, 10000);
    return () => window.clearInterval(interval);
  }, [screen, commitSave]);

  // Escape key pause / close drawers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (showDailyModal) {
          setShowDailyModal(false);
        } else if (cookModal) {
          setCookModal(null);
        } else if (drawerTab !== 'none') {
          setDrawerTab('none');
        } else if (screen === 'playing') {
          setScreen('paused');
        } else if (screen === 'paused') {
          setScreen('playing');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, drawerTab, cookModal, showDailyModal]);

  const handleSaveNow = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveRef.current));
      setHasSavedCareer(true);
      showToast('Game Saved', 'Progress stored locally on device.');
    } catch {
      showToast('Save Failed', 'Storage unavailable.');
    }
  }, [showToast]);

  const handleResetCareer = useCallback(() => {
    const fresh = createInitialSaveState();
    saveRef.current = fresh;
    setSave(fresh);
    setHasSavedCareer(false);
    autoPromptedDateRef.current = null;
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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch {
        // ignore storage quota errors
      }
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
    engineRef.current?.addReadyDishToCounter(recipeId, qualityBonus);
    commitSave((prev) => ({
      ...prev,
      restaurantCash: Math.max(0, prev.restaurantCash - ingredientCost),
      tutorialStep: prev.tutorialStep === 0 ? 1 : prev.tutorialStep,
      stats: {
        ...prev.stats,
        dishesCooked: prev.stats.dishesCooked + 1,
        burgersCooked: prev.stats.burgersCooked + (recipeId === 'burger' ? 1 : 0),
      },
    }));
    pushPopup(
      qualityBonus > 1 ? `Perfect ${RECIPES[recipeId].name}!` : `${RECIPES[recipeId].name} Ready`,
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
    if (!member || member.level >= 8) return;
    const cost = Math.round(180 * Math.pow(1.45, member.level - 1));
    if (save.restaurantCash < cost) return;
    sound.playCash();
    commitSave((prev) => ({
      ...prev,
      restaurantCash: prev.restaurantCash - cost,
      staff: prev.staff.map((s) =>
        s.id === staffId ? { ...s, level: s.level + 1, speedMultiplier: s.speedMultiplier + 0.14 } : s
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

  const tutorialMessages = [
    'Walk to the glowing Grill or Fryer and press Space / Cook to prepare a dish.',
    'Carry your cooked dish to the customer table to serve and earn cash + tips!',
    'Open Restaurant or Staff below to upgrade equipment or hire a Chef & Waiter.',
    'Withdraw profits in City > Bank, then buy outfits & cars in Lifestyle!',
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
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
          {/* Projected 3D Order & Clean Bubbles */}
          {hud.bubbles.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                if (b.kind === 'dirty' && b.tableId) {
                  engineRef.current?.teleportToZone('restaurant');
                } else if (b.orderId) {
                  engineRef.current?.openCookForOrder(b.orderId);
                }
              }}
              style={{
                left: `${b.screenX}px`,
                top: `${b.screenY}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="pointer-events-auto absolute px-2.5 py-1 rounded-xl bg-slate-950/92 border border-slate-700 shadow-lg text-left cursor-pointer hover:border-amber-400 transition-colors"
            >
              {b.kind === 'dirty' ? (
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1 whitespace-nowrap">
                  <Sparkles className="w-3 h-3" /> Dirty Table
                </span>
              ) : (
                <div className="min-w-[82px]">
                  <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-white whitespace-nowrap">
                    <span>{b.label}</span>
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
              className={`absolute font-display font-extrabold text-base sm:text-lg drop-shadow-md animate-float-up whitespace-nowrap ${
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

          {/* Top Perimeter Status Bar */}
          <header className="flex items-center justify-between gap-2 p-2.5 sm:px-4 sm:py-3">
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
              <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/92 border border-slate-700/80 text-xs font-semibold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="whitespace-nowrap">{hud.playerZoneLabel}</span>
              </div>

              <button
                onClick={() => engineRef.current?.rotateCamera(-0.45)}
                className="p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title="Rotate Camera Left"
                aria-label="Rotate camera left"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => engineRef.current?.rotateCamera(0.45)}
                className="p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
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
                className="p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
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
                className="p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                title={save.isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
                aria-label={save.isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {save.isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setScreen('paused')}
                className="p-2.5 rounded-xl bg-slate-950/92 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
                aria-label="Pause game"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Compact Top-Left Active Orders Strip */}
          {hud.activeOrders.length > 0 && (
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

          {/* Offline Ready Badge */}
          {!isOnline && (
            <div className="mx-3 mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/92 border border-amber-500/60 text-[11px] font-semibold text-amber-300">
              <span>Offline Mode · Saved Locally</span>
            </div>
          )}

          {/* Celebratory Level-Up / Milestone Toast */}
          {toast && (
            <div className="fixed top-18 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-2xl border border-amber-300 text-center">
              <p className="font-display font-extrabold text-sm leading-tight">{toast.title}</p>
              <p className="text-xs font-semibold text-slate-900">{toast.subtitle}</p>
            </div>
          )}

          {/* Gentle Onboarding Tutorial Tip */}
          {save.tutorialStep < 4 && drawerTab === 'none' && !cookModal && (
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
          <div className="fixed bottom-24 sm:bottom-20 left-3 sm:left-5 flex flex-col items-start gap-2.5">
            {hud.heldRecipe && (
              <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg font-bold text-xs">
                <Utensils className="w-4 h-4" />
                <span>Carrying: {RECIPES[hud.heldRecipe].name}</span>
              </div>
            )}
            <VirtualJoystick onMove={(x, y) => engineRef.current?.setJoystick(x, y)} />
          </div>

          {/* Bottom-Right Context Action Button (Mobile & Desktop) */}
          {hud.nearbyPrompt && (
            <div className="fixed bottom-24 sm:bottom-20 right-3 sm:right-5">
              <button
                onClick={() => engineRef.current?.triggerContextAction()}
                className="pointer-events-auto flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 shadow-2xl border-2 border-amber-200 cursor-pointer transition-transform"
              >
                <Flame className="w-5 h-5 shrink-0" />
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
          <div className="fixed bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 max-w-[96vw]">
            <button
              onClick={() => setDockCollapsed((c) => !c)}
              className="pointer-events-auto inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-950/92 border border-slate-700 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
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
              <nav className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl overflow-x-auto max-w-[96vw]">
                {[
                  { id: 'restaurant', label: 'Restaurant', icon: Store },
                  { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
                  { id: 'staff', label: 'Staff', icon: Users },
                  { id: 'city', label: 'City', icon: Building2 },
                  { id: 'lifestyle', label: 'Lifestyle', icon: ShoppingBag },
                  { id: 'missions', label: 'Missions', icon: Award },
                  { id: 'settings', label: 'Settings', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = drawerTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        sound.playClick();
                        setDrawerSubTab(undefined);
                        setDrawerTab(active ? 'none' : (item.id as DrawerTab));
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
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
          unlockedRecipes={save.unlockedRecipes}
          unlockedSpecialtyLines={save.unlockedSpecialtyLines}
          equipmentLevel={save.equipmentLevels[cookModal.station] ?? 1}
          bulkDiscount={save.bulkIngredientsDiscount}
          restaurantCash={save.restaurantCash}
          pendingOrders={hud.activeOrders}
          suggestedOrder={cookModal.suggestedOrder}
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
        onResetSave={handleResetCareer}
        onAdvanceTimeOfDay={() =>
          commitSave((p) => ({ ...p, timeOfDay: (p.timeOfDay + 0.25) % 1 }))
        }
      />

      {/* Daily Login Bonus Modal */}
      {showDailyModal && screen === 'playing' && (
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
