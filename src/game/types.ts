export type GameScreen = 'title' | 'playing' | 'paused';

export type DrawerTab =
  | 'none'
  | 'restaurant'
  | 'kitchen'
  | 'staff'
  | 'city'
  | 'lifestyle'
  | 'missions'
  | 'settings';

export type StationType = 'grill' | 'prep' | 'fryer' | 'oven' | 'bar' | 'specialty';

export type CafeThemeId =
  | 'classic_bistro'
  | 'french_patisserie'
  | 'english_tea'
  | 'modern_loft'
  | 'royal_salon';

export type CafeMusicMood = 'bistro' | 'waltz' | 'tea' | 'lofi' | 'royal';

export interface CafeThemeDef {
  id: CafeThemeId;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  requiredLevel: number;
  tipBonus: number; // percentage e.g. 15 = +15% tips
  musicMood: CafeMusicMood;
  wallColor: string;
  wainscotColor: string;
  floorMode: 'checker' | 'wood';
  floorPrimary: string;
  floorSecondary: string;
  kitchenPrimary: string;
  kitchenSecondary: string;
  trimColor: string;
  cushionColor: string;
  woodPrimary: string;
  woodSecondary: string;
  lightColor: string;
  blossomColor: string;
}

export type SpecialtyLineId = 'desserts' | 'beverages';

export interface SpecialtyLineDef {
  id: SpecialtyLineId;
  name: string;
  subtitle: string;
  description: string;
  unlockCost: number;
  requiredLevel: number;
  accentColor: string;
}

export type RecipeId =
  | 'burger'
  | 'fries'
  | 'pizza'
  | 'sandwich'
  | 'pasta'
  | 'sushi'
  | 'steak'
  | 'salad'
  | 'soup'
  | 'dessert'
  | 'coffee'
  | 'tiramisu'
  | 'gelato'
  | 'berry_tart'
  | 'matcha_boba'
  | 'mango_smoothie'
  | 'berry_mocktail';

export interface RecipeDef {
  id: RecipeId;
  name: string;
  station: StationType;
  recipeLine?: SpecialtyLineId;
  unlockCost: number;
  requiredLevel: number;
  ingredientCost: number;
  sellPrice: number;
  basePrepTime: number; // seconds
  satisfactionBonus: number;
  color: string;
  steps: string[];
  description: string;
}

export type CustomerArchetype =
  | 'regular'
  | 'impatient'
  | 'family'
  | 'business'
  | 'vip'
  | 'critic';

export interface CustomerOrder {
  id: string;
  customerId: string;
  tableId: number; // -1 for takeaway
  /** The next dish still needed (= remaining[0]); kept for display and simple lookups. */
  recipeId: RecipeId;
  /** Full combo (1–3 dishes) and the dishes not delivered yet. */
  items: RecipeId[];
  remaining: RecipeId[];
  /** Sum of delivered dishes' quality (average decides the tip). */
  qualitySum: number;
  archetype: CustomerArchetype;
  customerName: string;
  status: 'waiting' | 'cooking' | 'ready' | 'served';
  patience: number; // 0..100
  maxPatience: number;
  createdAt: number;
  qualityBonus: number; // 1.0 = normal, 1.25 = manual perfect cook
}

export type StaffRole = 'chef' | 'waiter' | 'cashier' | 'cleaner' | 'manager' | 'driver';

export interface StaffDef {
  role: StaffRole;
  title: string;
  description: string;
  hireCost: number;
  dailySalary: number;
  requiredLevel: number;
  accentColor: string;
}

export interface HiredStaff {
  id: string;
  role: StaffRole;
  name: string;
  level: number;
  xp: number;
  speedMultiplier: number;
  assignedStation?: StationType;
}

export type EquipmentId =
  | 'grill'
  | 'prep'
  | 'fryer'
  | 'oven'
  | 'bar'
  | 'specialty'
  | 'register'
  | 'decor';

export interface EquipmentDef {
  id: EquipmentId;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  effectLabel: string;
}

export type ClothingSlot = 'outfit' | 'hat' | 'watch';

export interface ClothingItem {
  id: string;
  name: string;
  slot: ClothingSlot;
  price: number;
  shirtColor?: string;
  pantsColor?: string;
  apronColor?: string;
  shoeColor?: string;
  vestColor?: string;
  scarfColor?: string;
  trimColor?: string;
  apronStyle?: 'bib' | 'waist';
  hasTowel?: boolean;
  longSleeves?: boolean;
  hasSuit?: boolean;
  hatStyle?: 'none' | 'cap' | 'toque' | 'fedora' | 'crown';
  hatColor?: string;
  watchColor?: string;
  prestigeBonus: number;
  description: string;
}

export interface VehicleDef {
  id: string;
  name: string;
  category: string;
  price: number;
  speed: number;
  bodyColor: string;
  accentColor: string;
  style: 'hatch' | 'compact' | 'sedan' | 'suv' | 'sports' | 'supercar';
  description: string;
}

export interface HouseDef {
  id: string;
  name: string;
  tier: number;
  price: number;
  wallColor: string;
  floorColor: string;
  roofColor: string;
  sizeScale: number;
  description: string;
}

export interface FurnitureDef {
  id: string;
  name: string;
  price: number;
  category: 'living' | 'dining' | 'luxury';
  color: string;
  description: string;
}

export interface FranchiseDef {
  id: string;
  name: string;
  district: string;
  cost: number;
  requiredLevel: number;
  incomePerMinute: number;
  description: string;
}

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  metric:
    | 'customersServed'
    | 'dishesCooked'
    | 'burgersCooked'
    | 'totalEarned'
    | 'staffHired'
    | 'upgradesBought'
    | 'carsOwned'
    | 'housesOwned'
    | 'restaurantLevel';
  target: number;
  rewardRestaurantCash: number;
  rewardPersonalCash: number;
  rewardReputation: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric:
    | 'customersServed'
    | 'totalEarned'
    | 'personalWealth'
    | 'restaurantLevel'
    | 'recipesUnlocked'
    | 'staffHired'
    | 'carsOwned'
    | 'housesOwned';
  target: number;
  rewardCash: number;
}

export interface CityZone {
  id: 'restaurant' | 'clothing' | 'dealership' | 'home' | 'bank' | 'supermarket';
  name: string;
  subtitle: string;
  x: number;
  z: number;
  color: string;
}

/** Running totals for the current in-game business day (reset at midnight). */
export interface DayStats {
  revenue: number;
  tips: number;
  deliveryIncome: number;
  franchiseIncome: number;
  ingredientCost: number;
  customersServed: number;
  customersLost: number;
  dishesCooked: number;
}

/** Summary produced when an in-game day closes at midnight. */
export interface DayReport {
  dayNumber: number;
  stats: DayStats;
  payrollDue: number;
  payrollPaid: number;
  unpaidWages: boolean;
  netProfit: number;
  staffCount: number;
  /** Daily star rating (0–3), the served-orders goal and the cash reward for the stars. */
  stars: number;
  starTarget: number;
  starReward: number;
}

export interface SaveState {
  version: number;
  restaurantCash: number;
  personalWallet: number;
  totalEarned: number;
  restaurantLevel: number;
  xp: number;
  reputation: number; // 1.0 to 5.0
  cleanliness: number; // 0 to 100
  dayNumber: number;
  timeOfDay: number; // 0..1 (0.25 morning, 0.5 noon, 0.75 sunset, 0.9 night)
  unlockedRecipes: RecipeId[];
  unlockedSpecialtyLines: SpecialtyLineId[];
  ownedCafeThemes: CafeThemeId[];
  activeCafeThemeId: CafeThemeId;
  equipmentLevels: Record<EquipmentId, number>;
  staff: HiredStaff[];
  ownedClothes: string[];
  equippedOutfitId: string;
  equippedHatId: string;
  equippedWatchId: string;
  ownedVehicles: string[];
  activeVehicleId: string | null;
  ownedHouses: string[];
  activeHouseId: string;
  ownedFurniture: string[];
  ownedFranchises: string[];
  bulkIngredientsDiscount: number; // 0 to 0.35
  completedMissions: string[];
  claimedAchievements: string[];
  stats: {
    customersServed: number;
    dishesCooked: number;
    burgersCooked: number;
    upgradesBought: number;
    tipsEarned: number;
  };
  tutorialStep: number; // 0..4, 5 = complete
  isMuted: boolean;
  isMusicMuted: boolean;
  dailyLogin: {
    streak: number;
    lastClaimDate: string | null;
    totalDaysClaimed: number;
  };
  /** Stats for the in-game day currently in progress. */
  today: DayStats;
  /** Epoch ms of the last auto-save; used to compute offline franchise earnings. */
  lastSeenAt: number | null;
  /** 'auto' picks a level from the device and steps down if the frame rate drops. */
  graphicsQuality: 'auto' | 'low' | 'medium' | 'high';
  /** Vibration feedback on supported (Android) devices. */
  hapticsEnabled: boolean;
  /** Orders served per recipe (drives Bronze / Silver / Gold mastery). */
  recipeMastery: Partial<Record<RecipeId, number>>;
  /** Today's three challenges (refresh each real day). */
  dailyChallenges: DailyChallengeState;
  /** Lifetime stars earned from daily ratings. */
  totalStars: number;
}

export type DailyChallengeKind =
  | 'serve_orders'
  | 'serve_combos'
  | 'perfect_cooks'
  | 'clean_tables'
  | 'earn_cash'
  | 'reach_streak'
  | 'serve_recipe';

export interface DailyChallenge {
  id: string;
  kind: DailyChallengeKind;
  recipeId?: RecipeId;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface DailyChallengeState {
  date: string | null;
  items: DailyChallenge[];
  bonusClaimed: boolean;
}

export interface ProjectedBubble {
  id: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  kind: 'order' | 'eating' | 'dirty' | 'takeaway' | 'zone' | 'cookReady' | 'station';
  recipeId?: RecipeId;
  patience?: number;
  label: string;
  archetype?: CustomerArchetype;
  tableId?: number;
  orderId?: string;
  /** Station signs: the machine type, the dishes it makes, and how many orders wait for it. */
  stationType?: StationType;
  recipeIds?: RecipeId[];
  pendingCount?: number;
  /** Machine currently cooking: which dish and how far along (0..1). */
  cookingRecipeId?: RecipeId;
  cookProgress?: number;
  /** World-space point the bubble follows; the HUD re-projects it every rendered frame. */
  anchor?: { x: number; y: number; z: number };
  /** Covered machine the player hasn't unlocked yet, and the level that unlocks it. */
  locked?: boolean;
  unlockLevel?: number;
}

export interface FloatingPopup {
  id: string;
  screenX: number;
  screenY: number;
  text: string;
  color: 'emerald' | 'amber' | 'sky' | 'rose';
  createdAt: number;
}

export interface NearbyPrompt {
  id: string;
  label: string;
  sublabel?: string;
  actionType:
    | 'cook_station'
    | 'serve_table'
    | 'clean_table'
    | 'serve_takeaway'
    | 'enter_car'
    | 'exit_car'
    | 'open_shop'
    | 'open_bank'
    | 'open_supermarket'
    | 'open_home'
    | 'put_down'
    | 'pick_up'
    | 'trash';
  stationType?: StationType;
  tableId?: number;
  shopTab?: DrawerTab;
  shopSubTab?: string;
}

export interface EngineHudSnapshot {
  playerZoneLabel: string;
  inVehicle: boolean;
  heldRecipe: RecipeId | null;
  heldQuality: number;
  activeOrders: CustomerOrder[];
  readyDishes: { id: string; recipeId: RecipeId; qualityBonus: number }[];
  dirtyTableCount: number;
  nearbyPrompt: NearbyPrompt | null;
  bubbles: ProjectedBubble[];
  playerPos: { x: number; z: number };
  /** Serving streak: orders completed in a row, tip multiplier, and time left before it cools (0..1). */
  streak: { count: number; mult: number; timeLeft: number };
}
