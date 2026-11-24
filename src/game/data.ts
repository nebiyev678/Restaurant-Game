import {
  AchievementDef,
  CafeThemeDef,
  CafeThemeId,
  CuisineId,
  ExpansionDef,
  ExpansionId,
  CityZone,
  ClothingItem,
  DailyChallenge,
  DailyChallengeKind,
  DailyChallengeState,
  DayStats,
  EquipmentDef,
  EquipmentId,
  FranchiseDef,
  FurnitureDef,
  HiredStaff,
  HouseDef,
  MissionDef,
  QuickGoal,
  QuickGoalState,
  RecipeDef,
  RecipeId,
  SaveState,
  SpecialtyLineDef,
  SpecialtyLineId,
  StaffDef,
  StationType,
  VehicleDef,
} from './types';
import { createEmptyAlbum, CUISINES, getPassiveRestaurantIncomePerMin, WORLD_RECIPES } from './cuisines';

export const CAFE_THEMES: CafeThemeDef[] = [
  {
    id: 'classic_bistro',
    name: 'Classic American Bistro',
    subtitle: 'Warm Diner & Honey Oak',
    description: 'Apricot plaster walls, caramel-oak trim, warm cream-stone tile floors, crimson leather booths, and acoustic bistro jazz.',
    price: 0,
    requiredLevel: 1,
    tipBonus: 0,
    musicMood: 'bistro',
    wallColor: '#f2c79d',
    wainscotColor: '#8f4f2e',
    floorMode: 'checker',
    floorPrimary: '#e8c39b',
    floorSecondary: '#ddb38a',
    kitchenPrimary: '#ebe8e2',
    kitchenSecondary: '#e1ddd5',
    trimColor: '#c9362b',
    cushionColor: '#d93829',
    woodPrimary: '#de944b',
    woodSecondary: '#9e5924',
    lightColor: '#fde68a',
    blossomColor: '#4ade80',
  },
  {
    id: 'french_patisserie',
    name: 'French Patisserie',
    subtitle: 'Parisian Rose Salon',
    description: 'Blush ivory walls, Parisian slate-and-cream floors, dusty-rose velvet seating, and chanson waltz music.',
    price: 450,
    requiredLevel: 2,
    tipBonus: 12,
    musicMood: 'waltz',
    wallColor: '#fff1f2',
    wainscotColor: '#f472b6',
    floorMode: 'checker',
    floorPrimary: '#fdf2f8',
    floorSecondary: '#cbd5e1',
    kitchenPrimary: '#f8fafc',
    kitchenSecondary: '#cbd5e1',
    trimColor: '#db2777',
    cushionColor: '#be185d',
    woodPrimary: '#f3e8d2',
    woodSecondary: '#b08968',
    lightColor: '#fbcfe8',
    blossomColor: '#f472b6',
  },
  {
    id: 'english_tea',
    name: 'English Tea Room',
    subtitle: 'Heritage Sage & Walnut',
    description: 'Sage garden paneling, rich walnut floorboards, forest-emerald upholstery, and serene tea-time melodies.',
    price: 1100,
    requiredLevel: 5,
    tipBonus: 22,
    musicMood: 'tea',
    wallColor: '#ecfdf5',
    wainscotColor: '#047857',
    floorMode: 'wood',
    floorPrimary: '#92400e',
    floorSecondary: '#451a03',
    kitchenPrimary: '#e7e5e4',
    kitchenSecondary: '#a8a29e',
    trimColor: '#059669',
    cushionColor: '#065f46',
    woodPrimary: '#b45309',
    woodSecondary: '#78350f',
    lightColor: '#fef3c7',
    blossomColor: '#fb7185',
  },
  {
    id: 'modern_loft',
    name: 'Modern Urban Loft',
    subtitle: 'Espresso Slate & Copper',
    description: 'Architectural charcoal slate floors, warm walnut accents, burnt-amber seating, and chill lo-fi grooves.',
    price: 2400,
    requiredLevel: 9,
    tipBonus: 32,
    musicMood: 'lofi',
    wallColor: '#e2e8f0',
    wainscotColor: '#334155',
    floorMode: 'checker',
    floorPrimary: '#334155',
    floorSecondary: '#1e293b',
    kitchenPrimary: '#cbd5e1',
    kitchenSecondary: '#64748b',
    trimColor: '#ea580c',
    cushionColor: '#c2410c',
    woodPrimary: '#78350f',
    woodSecondary: '#451a03',
    lightColor: '#fed7aa',
    blossomColor: '#fb923c',
  },
  {
    id: 'royal_salon',
    name: 'Gilded Royal Salon',
    subtitle: 'Sapphire & 24k Gold',
    description: 'Carrara marble floors, royal sapphire velvet booths, gilded brass trim, and grand salon harp chimes.',
    price: 5500,
    requiredLevel: 15,
    tipBonus: 45,
    musicMood: 'royal',
    wallColor: '#eff6ff',
    wainscotColor: '#d97706',
    floorMode: 'checker',
    floorPrimary: '#f8fafc',
    floorSecondary: '#dbeafe',
    kitchenPrimary: '#f1f5f9',
    kitchenSecondary: '#94a3b8',
    trimColor: '#d97706',
    cushionColor: '#1d4ed8',
    woodPrimary: '#fef3c7',
    woodSecondary: '#d97706',
    lightColor: '#fef08a',
    blossomColor: '#93c5fd',
  },
];

export const SPECIALTY_LINES: Record<SpecialtyLineId, SpecialtyLineDef> = {
  desserts: {
    id: 'desserts',
    name: 'Patisserie & Desserts',
    subtitle: 'Specialty Dessert Line',
    description:
      'Unlocks artisan pastries and plated desserts crafted at the Specialty Station.',
    unlockCost: 350,
    requiredLevel: 3,
    accentColor: '#ec4899',
  },
  beverages: {
    id: 'beverages',
    name: 'Craft Beverages & Boba',
    subtitle: 'Specialty Beverage Line',
    description:
      'Unlocks blended smoothies, cream boba teas, and sparkling mocktails at the Specialty Station.',
    unlockCost: 420,
    requiredLevel: 4,
    accentColor: '#14b8a6',
  },
};

const CLASSIC_RECIPES: Partial<Record<RecipeId, RecipeDef>> = {
  burger: {
    id: 'burger',
    name: 'Classic Burger',
    station: 'grill',
    unlockCost: 0,
    requiredLevel: 1,
    ingredientCost: 4,
    sellPrice: 18,
    basePrepTime: 4.5,
    satisfactionBonus: 6,
    color: '#d97706',
    steps: ['Toast Brioche Bun', 'Sizzle Beef Patty', 'Stack Cheese & Greens'],
    description: 'Flame-grilled beef patty with melted cheddar and crisp greens.',
  },
  fries: {
    id: 'fries',
    name: 'Golden Fries',
    station: 'fryer',
    unlockCost: 0,
    requiredLevel: 1,
    ingredientCost: 2,
    sellPrice: 10,
    basePrepTime: 3.5,
    satisfactionBonus: 4,
    color: '#eab308',
    steps: ['Drop Potato Basket', 'Crisp in Hot Oil', 'Season with Sea Salt'],
    description: 'Crispy golden-brown fries dusted with sea salt.',
  },
  sandwich: {
    id: 'sandwich',
    name: 'Club Sandwich',
    station: 'prep',
    unlockCost: 120,
    requiredLevel: 2,
    ingredientCost: 5,
    sellPrice: 22,
    basePrepTime: 4.0,
    satisfactionBonus: 6,
    color: '#f59e0b',
    steps: ['Slice Sourdough', 'Layer Roast & Avocado', 'Press & Halve'],
    description: 'Triple-decker toasted club with herb mayo and crispy greens.',
  },
  salad: {
    id: 'salad',
    name: 'Caesar Salad',
    station: 'prep',
    unlockCost: 180,
    requiredLevel: 3,
    ingredientCost: 5,
    sellPrice: 24,
    basePrepTime: 3.8,
    satisfactionBonus: 7,
    color: '#16a34a',
    steps: ['Toss Romaine', 'Shave Aged Parmesan', 'Drizzle Dressing'],
    description: 'Crisp garden greens tossed with parmesan and herb croutons.',
  },
  coffee: {
    id: 'coffee',
    name: 'Artisan Latte',
    station: 'bar',
    unlockCost: 220,
    requiredLevel: 4,
    ingredientCost: 3,
    sellPrice: 16,
    basePrepTime: 3.0,
    satisfactionBonus: 5,
    color: '#78350f',
    steps: ['Pull Espresso Shot', 'Steam Silky Milk', 'Pour Rosetta Art'],
    description: 'Single-origin espresso topped with velvety microfoam.',
  },
  pizza: {
    id: 'pizza',
    name: 'Brick-Oven Pizza',
    station: 'oven',
    unlockCost: 350,
    requiredLevel: 5,
    ingredientCost: 7,
    sellPrice: 32,
    basePrepTime: 5.5,
    satisfactionBonus: 9,
    color: '#dc2626',
    steps: ['Stretch Hand-Tossed Dough', 'Spread San Marzano & Toppings', 'Bake in Brick Hearth'],
    description: 'Wood-fired sourdough crust bubbling with mozzarella and pepperoni.',
  },
  soup: {
    id: 'soup',
    name: 'Truffle Bisque',
    station: 'grill',
    unlockCost: 460,
    requiredLevel: 7,
    ingredientCost: 8,
    sellPrice: 36,
    basePrepTime: 5.0,
    satisfactionBonus: 9,
    color: '#ea580c',
    steps: ['Simmer Roasted Base', 'Whisk Velvet Cream', 'Garnish with Herb Oil'],
    description: 'Rich slow-simmered soup finished with truffle cream.',
  },
  pasta: {
    id: 'pasta',
    name: 'Truffle Pasta',
    station: 'grill',
    unlockCost: 650,
    requiredLevel: 9,
    ingredientCost: 10,
    sellPrice: 44,
    basePrepTime: 5.5,
    satisfactionBonus: 11,
    color: '#facc15',
    steps: ['Boil Fresh Tagliatelle', 'Emulsify Garlic Butter', 'Plate & Shave Truffle'],
    description: 'Handmade ribbon pasta glazed in aged parmigiano butter.',
  },
  sushi: {
    id: 'sushi',
    name: 'Omakase Sushi',
    station: 'prep',
    unlockCost: 950,
    requiredLevel: 12,
    ingredientCost: 14,
    sellPrice: 60,
    basePrepTime: 5.8,
    satisfactionBonus: 13,
    color: '#f43f5e',
    steps: ['Season Sushi Rice', 'Slice Sashimi Grade Fish', 'Roll & Plate Precision'],
    description: 'Chef-curated nigiri and maki platter with fresh wasabi.',
  },
  steak: {
    id: 'steak',
    name: 'Wagyu Ribeye',
    station: 'grill',
    unlockCost: 1450,
    requiredLevel: 16,
    ingredientCost: 22,
    sellPrice: 88,
    basePrepTime: 6.2,
    satisfactionBonus: 16,
    color: '#991b1b',
    steps: ['Sear Cast-Iron Crust', 'Baste with Rosemary Butter', 'Rest & Carve'],
    description: 'Prime marbled ribeye seared to perfection with herb butter.',
  },
  dessert: {
    id: 'dessert',
    name: 'Molten Soufflé',
    station: 'oven',
    unlockCost: 1900,
    requiredLevel: 20,
    ingredientCost: 16,
    sellPrice: 74,
    basePrepTime: 5.5,
    satisfactionBonus: 15,
    color: '#7c2d12',
    steps: ['Whip Dark Chocolate Ganache', 'Bake Until Risen', 'Dust Gold Powder'],
    description: 'Warm dark-chocolate soufflé with vanilla bean cream.',
  },
  tiramisu: {
    id: 'tiramisu',
    name: 'Espresso Tiramisu',
    station: 'specialty',
    recipeLine: 'desserts',
    unlockCost: 240,
    requiredLevel: 3,
    ingredientCost: 6,
    sellPrice: 30,
    basePrepTime: 4.2,
    satisfactionBonus: 9,
    color: '#92400e',
    steps: ['Dip Ladyfingers in Espresso', 'Layer Mascarpone Cream', 'Dust Rich Cocoa'],
    description: 'Velvety espresso-soaked sponge layered with whipped mascarpone.',
  },
  gelato: {
    id: 'gelato',
    name: 'Artisan Gelato Trio',
    station: 'specialty',
    recipeLine: 'desserts',
    unlockCost: 420,
    requiredLevel: 6,
    ingredientCost: 8,
    sellPrice: 40,
    basePrepTime: 3.8,
    satisfactionBonus: 11,
    color: '#f472b6',
    steps: ['Chill Coupe Glass', 'Scoop Berry, Pistachio & Vanilla', 'Crown with Crisp Wafer'],
    description: 'Three slow-churned Italian gelato scoops served with a golden wafer.',
  },
  berry_tart: {
    id: 'berry_tart',
    name: 'Gold-Leaf Berry Tart',
    station: 'specialty',
    recipeLine: 'desserts',
    unlockCost: 780,
    requiredLevel: 11,
    ingredientCost: 11,
    sellPrice: 54,
    basePrepTime: 4.8,
    satisfactionBonus: 13,
    color: '#be185d',
    steps: ['Pipe Vanilla Bean Custard', 'Arrange Glazed Berries', 'Finish with Mint & Gold Leaf'],
    description: 'Crisp butter-pastry tartlet crowned with glazed berries and gold leaf.',
  },
  matcha_boba: {
    id: 'matcha_boba',
    name: 'Matcha Cream Boba',
    station: 'specialty',
    recipeLine: 'beverages',
    unlockCost: 260,
    requiredLevel: 4,
    ingredientCost: 5,
    sellPrice: 26,
    basePrepTime: 3.4,
    satisfactionBonus: 8,
    color: '#22c55e',
    steps: ['Simmer Brown Sugar Pearls', 'Whisk Ceremonial Matcha', 'Top with Salted Cream Cap'],
    description: 'Chilled ceremonial matcha latte layered over warm brown-sugar boba.',
  },
  mango_smoothie: {
    id: 'mango_smoothie',
    name: 'Tropical Mango Smoothie',
    station: 'specialty',
    recipeLine: 'beverages',
    unlockCost: 460,
    requiredLevel: 7,
    ingredientCost: 7,
    sellPrice: 36,
    basePrepTime: 3.6,
    satisfactionBonus: 10,
    color: '#f59e0b',
    steps: ['Blend Alphonso Mango & Ice', 'Swirl Coconut Cream', 'Garnish Fresh Mango Wedge'],
    description: 'Silky tropical mango blend swirled with chilled coconut cream.',
  },
  berry_mocktail: {
    id: 'berry_mocktail',
    name: 'Sparkling Berry Fizz',
    station: 'specialty',
    recipeLine: 'beverages',
    unlockCost: 880,
    requiredLevel: 13,
    ingredientCost: 10,
    sellPrice: 50,
    basePrepTime: 4.0,
    satisfactionBonus: 12,
    color: '#e11d48',
    steps: ['Muddle Crushed Blackberries', 'Pour Sparkling Tonic Over Ice', 'Rim with Citrus & Mint'],
    description: 'Botanical blackberry-hibiscus spritz garnished with fresh citrus and mint.',
  },
};

/**
 * The interior style actually shown: a paid cafe style if the player picked one,
 * otherwise the current restaurant's own country look (the bistro keeps its classic style).
 */
export function getEffectiveTheme(save: { activeCafeThemeId?: CafeThemeId; activeCuisine?: CuisineId }): CafeThemeDef {
  const chosen = CAFE_THEMES.find((t) => t.id === (save.activeCafeThemeId ?? 'classic_bistro')) ?? CAFE_THEMES[0];
  const cuisine = CUISINES[save.activeCuisine ?? 'bistro'];
  if (!cuisine || cuisine.id === 'bistro' || chosen.id !== 'classic_bistro') return chosen;
  const p = cuisine.palette;
  return {
    ...chosen,
    name: `${cuisine.name} Style`,
    musicMood: cuisine.musicMood,
    wallColor: p.wall,
    wainscotColor: p.wainscot,
    floorMode: p.floorMode,
    floorPrimary: p.floorPrimary,
    floorSecondary: p.floorSecondary,
    kitchenPrimary: p.kitchenPrimary,
    kitchenSecondary: p.kitchenSecondary,
    trimColor: p.accent,
    cushionColor: p.cushion,
    woodPrimary: p.woodPrimary,
    woodSecondary: p.woodSecondary,
    lightColor: p.light,
  };
}

export const RECIPES: Record<RecipeId, RecipeDef> = { ...CLASSIC_RECIPES, ...WORLD_RECIPES } as Record<RecipeId, RecipeDef>;

export const RECIPE_LIST: RecipeDef[] = Object.values(RECIPES);

export const EQUIPMENT_CATALOG: Record<EquipmentId, EquipmentDef> = {
  grill: {
    id: 'grill',
    name: 'Chef Range & Grill',
    description: 'Boosts cooking speed for Burgers, Pasta, Soup & Steak.',
    baseCost: 180,
    maxLevel: 6,
    effectLabel: '-12% cook time / lvl',
  },
  prep: {
    id: 'prep',
    name: 'Prep & Sushi Counter',
    description: 'Speeds up Sandwiches, Salads & Omakase Sushi prep.',
    baseCost: 160,
    maxLevel: 6,
    effectLabel: '-12% prep time / lvl',
  },
  fryer: {
    id: 'fryer',
    name: 'Commercial Fryer',
    description: 'Crisps Golden Fries faster with higher quality.',
    baseCost: 140,
    maxLevel: 6,
    effectLabel: '-12% fry time / lvl',
  },
  oven: {
    id: 'oven',
    name: 'Brick Pizza Oven',
    description: 'Unlocks higher heat for Brick-Oven Pizza & Soufflé.',
    baseCost: 280,
    maxLevel: 6,
    effectLabel: '-12% bake time / lvl',
  },
  bar: {
    id: 'bar',
    name: 'Espresso & Drink Bar',
    description: 'Streamlines Artisan Latte service for extra tips.',
    baseCost: 210,
    maxLevel: 6,
    effectLabel: '+15% drink tips / lvl',
  },
  specialty: {
    id: 'specialty',
    name: 'Specialty Culinary Station',
    description: 'Patisserie & craft drink station for Desserts and Beverages lines.',
    baseCost: 260,
    maxLevel: 6,
    effectLabel: '+10% specialty value & faster craft / lvl',
  },
  register: {
    id: 'register',
    name: 'Smart POS & Takeaway',
    description: 'Increases takeaway order value and tip generosity.',
    baseCost: 240,
    maxLevel: 6,
    effectLabel: '+8% tip rate / lvl',
  },
  decor: {
    id: 'decor',
    name: 'Interior & Seating Decor',
    description: 'Boosts customer patience, tip multiplier, and prestige.',
    baseCost: 300,
    maxLevel: 6,
    effectLabel: '+10% patience & tips / lvl',
  },
};

export const STAFF_CATALOG: StaffDef[] = [
  {
    role: 'chef',
    title: 'Line Chef',
    description: 'Automatically prepares queued orders at kitchen stations.',
    hireCost: 320,
    dailySalary: 65,
    requiredLevel: 1,
    accentColor: '#f97316',
  },
  {
    role: 'waiter',
    title: 'Server / Waiter',
    description: 'Picks up cooked dishes and delivers them directly to tables.',
    hireCost: 260,
    dailySalary: 50,
    requiredLevel: 2,
    accentColor: '#38bdf8',
  },
  {
    role: 'cleaner',
    title: 'Busser / Cleaner',
    description: 'Clears dirty plates and keeps restaurant cleanliness near 100%.',
    hireCost: 210,
    dailySalary: 40,
    requiredLevel: 2,
    accentColor: '#10b981',
  },
  {
    role: 'cashier',
    title: 'Head Cashier',
    description: 'Handles takeaway orders and adds +15% tip efficiency.',
    hireCost: 380,
    dailySalary: 70,
    requiredLevel: 4,
    accentColor: '#a855f7',
  },
  {
    role: 'driver',
    title: 'Delivery Rider',
    description: 'Delivers city takeaway orders continuously for extra revenue.',
    hireCost: 520,
    dailySalary: 85,
    requiredLevel: 6,
    accentColor: '#eab308',
  },
  {
    role: 'manager',
    title: 'Floor Manager',
    description: 'Boosts all staff work speed by +25% and reduces patience drain.',
    hireCost: 950,
    dailySalary: 140,
    requiredLevel: 10,
    accentColor: '#ec4899',
  },
];

export const CLOTHING_CATALOG: ClothingItem[] = [
  {
    id: 'outfit_starter',
    name: 'Owner-Chef Apron',
    slot: 'outfit',
    price: 0,
    shirtColor: '#f5efe6',
    pantsColor: '#463b38',
    apronColor: '#dc2626',
    shoeColor: '#dc2626',
    trimColor: '#dc2626',
    apronStyle: 'bib',
    hasTowel: true,
    longSleeves: false,
    prestigeBonus: 0,
    description: 'Cream rolled-sleeve chef shirt, crimson bib apron with towel, and red sneakers.',
  },
  {
    id: 'outfit_denim',
    name: 'Casual Street Hoodie',
    slot: 'outfit',
    price: 160,
    shirtColor: '#f5efe6',
    pantsColor: '#5c4d42',
    vestColor: '#f97316',
    shoeColor: '#ea580c',
    longSleeves: false,
    prestigeBonus: 3,
    description: 'Vibrant orange zip-hoodie vest over cream tee with cargo pants and orange sneakers.',
  },
  {
    id: 'outfit_bistro',
    name: 'Smart Culinary Uniform',
    slot: 'outfit',
    price: 450,
    shirtColor: '#f8fafc',
    pantsColor: '#292524',
    apronColor: '#3f3533',
    scarfColor: '#dc2626',
    shoeColor: '#292524',
    trimColor: '#dc2626',
    apronStyle: 'waist',
    longSleeves: false,
    prestigeBonus: 7,
    description: 'Double-breasted chef jacket with crimson neckerchief and dark waist apron.',
  },
  {
    id: 'outfit_suit',
    name: 'Savile Navy Suit',
    slot: 'outfit',
    price: 1400,
    shirtColor: '#1e3a8a',
    pantsColor: '#172554',
    shoeColor: '#1e1b18',
    longSleeves: true,
    hasSuit: true,
    prestigeBonus: 14,
    description: 'Tailored navy wool suit for rising restaurant moguls.',
  },
  {
    id: 'outfit_gold_tux',
    name: 'Premium Owner Tux',
    slot: 'outfit',
    price: 4500,
    shirtColor: '#b91c1c',
    pantsColor: '#3b3330',
    shoeColor: '#1c1917',
    trimColor: '#fbbf24',
    longSleeves: true,
    hasSuit: true,
    prestigeBonus: 25,
    description: 'Prestigious crimson blazer with 24k gold lapels, vest chain, and dress trousers.',
  },
  {
    id: 'hat_none',
    name: 'No Hat',
    slot: 'hat',
    price: 0,
    hatStyle: 'none',
    prestigeBonus: 0,
    description: 'Natural wavy swept-back hair.',
  },
  {
    id: 'hat_cap',
    name: 'Burger Street Cap',
    slot: 'hat',
    price: 90,
    hatStyle: 'cap',
    hatColor: '#f97316',
    prestigeBonus: 2,
    description: 'Signature orange & cream street cap with burger emblem.',
  },
  {
    id: 'hat_toque',
    name: 'Master Chef Toque',
    slot: 'hat',
    price: 280,
    hatStyle: 'toque',
    hatColor: '#ffffff',
    prestigeBonus: 6,
    description: 'Tall pleated white chef toque.',
  },
  {
    id: 'hat_fedora',
    name: 'Charcoal Fedora',
    slot: 'hat',
    price: 750,
    hatStyle: 'fedora',
    hatColor: '#1f2937',
    prestigeBonus: 10,
    description: 'Sharp city felt fedora.',
  },
  {
    id: 'hat_crown',
    name: 'Culinary Crown',
    slot: 'hat',
    price: 6000,
    hatStyle: 'crown',
    hatColor: '#fbbf24',
    prestigeBonus: 22,
    description: 'Solid gold crown for true gastronomy billionaires.',
  },
  {
    id: 'watch_none',
    name: 'Bare Wrist',
    slot: 'watch',
    price: 0,
    prestigeBonus: 0,
    description: 'No timepiece equipped.',
  },
  {
    id: 'watch_steel',
    name: 'Steel Chronograph',
    slot: 'watch',
    price: 380,
    watchColor: '#cbd5e1',
    prestigeBonus: 5,
    description: 'Brushed stainless steel mechanical chronograph.',
  },
  {
    id: 'watch_gold',
    name: 'Solid Gold Tourbillon',
    slot: 'watch',
    price: 2800,
    watchColor: '#fbbf24',
    prestigeBonus: 18,
    description: 'Haute horlogerie gold timepiece.',
  },
];

export const VEHICLE_CATALOG: VehicleDef[] = [
  {
    id: 'car_used',
    name: 'Rusty Hatchback',
    category: 'Used Car',
    price: 450,
    speed: 11,
    bodyColor: '#64748b',
    accentColor: '#94a3b8',
    style: 'hatch',
    description: 'Reliable starter wheels to zip between home and the bistro.',
  },
  {
    id: 'car_economy',
    name: 'Breeze Compact',
    category: 'Economy',
    price: 1200,
    speed: 13.5,
    bodyColor: '#0ea5e9',
    accentColor: '#e0f2fe',
    style: 'compact',
    description: 'Nimble electric-blue city compact with crisp handling.',
  },
  {
    id: 'car_sedan',
    name: 'Executive Sedan',
    category: 'Sedan',
    price: 3200,
    speed: 16,
    bodyColor: '#1e293b',
    accentColor: '#cbd5e1',
    style: 'sedan',
    description: 'Refined four-door cruiser with chrome trim.',
  },
  {
    id: 'car_suv',
    name: 'Summit Touring SUV',
    category: 'SUV',
    price: 6800,
    speed: 17.5,
    bodyColor: '#065f46',
    accentColor: '#d1fae5',
    style: 'suv',
    description: 'Commanding emerald luxury utility vehicle.',
  },
  {
    id: 'car_sports',
    name: 'Veloce GT Coupe',
    category: 'Sports Car',
    price: 15000,
    speed: 22,
    bodyColor: '#dc2626',
    accentColor: '#18181b',
    style: 'sports',
    description: 'Twin-stripe Rosso Corsa coupe with rear wing.',
  },
  {
    id: 'car_supercar',
    name: 'Aurelia Hypercar',
    category: 'Luxury Supercar',
    price: 45000,
    speed: 27,
    bodyColor: '#f59e0b',
    accentColor: '#09090b',
    style: 'supercar',
    description: 'Mid-engine gilded hypercar that turns every head on the avenue.',
  },
];

export const HOUSE_CATALOG: HouseDef[] = [
  {
    id: 'house_studio',
    name: 'Rented Studio Loft',
    tier: 1,
    price: 0,
    wallColor: '#e2e8f0',
    floorColor: '#b45309',
    roofColor: '#475569',
    sizeScale: 1.0,
    description: 'Your humble starter apartment across the avenue.',
  },
  {
    id: 'house_modern',
    name: 'Modern City Apartment',
    tier: 2,
    price: 1800,
    wallColor: '#f1f5f9',
    floorColor: '#92400e',
    roofColor: '#1e293b',
    sizeScale: 1.18,
    description: 'Open-plan architectural loft with warm oak flooring.',
  },
  {
    id: 'house_suburban',
    name: 'Suburban Family Home',
    tier: 3,
    price: 5500,
    wallColor: '#fef3c7',
    floorColor: '#78350f',
    roofColor: '#991b1b',
    sizeScale: 1.38,
    description: 'Spacious two-wing residence with manicured lawn.',
  },
  {
    id: 'house_villa',
    name: 'Mediterranean Villa',
    tier: 4,
    price: 16500,
    wallColor: '#fffbeb',
    floorColor: '#cbd5e1',
    roofColor: '#c2410c',
    sizeScale: 1.58,
    description: 'Sun-washed marble villa with terrace columns.',
  },
  {
    id: 'house_mansion',
    name: 'Millionaire Grand Mansion',
    tier: 5,
    price: 55000,
    wallColor: '#f8fafc',
    floorColor: '#e2e8f0',
    roofColor: '#0f172a',
    sizeScale: 1.8,
    description: 'Palatial limestone estate worthy of a culinary empire.',
  },
];

export const FURNITURE_CATALOG: FurnitureDef[] = [
  {
    id: 'furn_sofa',
    name: 'Velvet Lounge Sofa',
    price: 350,
    category: 'living',
    color: '#0f766e',
    description: 'Plush three-seater sofa in deep teal velvet.',
  },
  {
    id: 'furn_tv',
    name: 'Cinema OLED Display',
    price: 650,
    category: 'living',
    color: '#18181b',
    description: 'Wall-mounted 85-inch cinema screen on teak console.',
  },
  {
    id: 'furn_plant',
    name: 'Fiddle Leaf Planter',
    price: 180,
    category: 'living',
    color: '#15803d',
    description: 'Tall ceramic planter bringing fresh greenery indoors.',
  },
  {
    id: 'furn_dining',
    name: 'Walnut Dining Table',
    price: 900,
    category: 'dining',
    color: '#78350f',
    description: 'Designer six-seat walnut dining set.',
  },
  {
    id: 'furn_arcade',
    name: 'Retro Arcade Cabinet',
    price: 1400,
    category: 'luxury',
    color: '#7c3aed',
    description: 'Glowing classic arcade machine for late-night unwinds.',
  },
  {
    id: 'furn_piano',
    name: 'Ebony Grand Piano',
    price: 4200,
    category: 'luxury',
    color: '#09090b',
    description: 'Gloss-lacquered concert grand piano.',
  },
];

export const FRANCHISE_CATALOG: FranchiseDef[] = [
  {
    id: 'branch_downtown',
    name: 'Downtown Express Bistro',
    district: 'Financial District',
    cost: 4500,
    requiredLevel: 12,
    incomePerMinute: 240,
    description: 'High-footfall lunch branch generating automated revenue.',
  },
  {
    id: 'branch_marina',
    name: 'Marina Waterfront Grill',
    district: 'Harbor Pier',
    cost: 14000,
    requiredLevel: 20,
    incomePerMinute: 680,
    description: 'Upscale seafood and steak destination on the waterfront.',
  },
  {
    id: 'branch_skyline',
    name: 'Skyview Penthouse Flagship',
    district: 'Crown Tower',
    cost: 42000,
    requiredLevel: 30,
    incomePerMinute: 1900,
    description: 'Flagship Michelin-tier dining empire overlooking the city.',
  },
];

export const MISSIONS: MissionDef[] = [
  {
    id: 'm1',
    title: 'First Lunch Rush',
    description: 'Cook and serve 3 dishes to hungry customers.',
    metric: 'customersServed',
    target: 3,
    rewardRestaurantCash: 150,
    rewardPersonalCash: 60,
    rewardReputation: 0.2,
  },
  {
    id: 'm2',
    title: 'Burger Artisan',
    description: 'Grill and assemble 5 Classic Burgers.',
    metric: 'burgersCooked',
    target: 5,
    rewardRestaurantCash: 220,
    rewardPersonalCash: 80,
    rewardReputation: 0.25,
  },
  {
    id: 'm3',
    title: 'Growing Kitchen',
    description: 'Purchase 2 kitchen or restaurant upgrades.',
    metric: 'upgradesBought',
    target: 2,
    rewardRestaurantCash: 300,
    rewardPersonalCash: 100,
    rewardReputation: 0.25,
  },
  {
    id: 'm4',
    title: 'Hiring Help',
    description: 'Hire your first restaurant employee.',
    metric: 'staffHired',
    target: 1,
    rewardRestaurantCash: 350,
    rewardPersonalCash: 150,
    rewardReputation: 0.3,
  },
  {
    id: 'm5',
    title: 'Neighborhood Favorite',
    description: 'Serve 20 total customers.',
    metric: 'customersServed',
    target: 20,
    rewardRestaurantCash: 600,
    rewardPersonalCash: 250,
    rewardReputation: 0.4,
  },
  {
    id: 'm6',
    title: 'First Wheels',
    description: 'Buy your first car from Apex Motors Dealership.',
    metric: 'carsOwned',
    target: 1,
    rewardRestaurantCash: 400,
    rewardPersonalCash: 300,
    rewardReputation: 0.2,
  },
  {
    id: 'm7',
    title: 'Popular Brasserie',
    description: 'Expand your restaurant to Level 10.',
    metric: 'restaurantLevel',
    target: 10,
    rewardRestaurantCash: 1500,
    rewardPersonalCash: 800,
    rewardReputation: 0.5,
  },
  {
    id: 'm8',
    title: 'Upgrading Roots',
    description: 'Purchase a better home in Real Estate.',
    metric: 'housesOwned',
    target: 2,
    rewardRestaurantCash: 1200,
    rewardPersonalCash: 1000,
    rewardReputation: 0.4,
  },
  {
    id: 'm9',
    title: 'Culinary Empire',
    description: 'Reach $25,000 in lifetime restaurant earnings.',
    metric: 'totalEarned',
    target: 25000,
    rewardRestaurantCash: 5000,
    rewardPersonalCash: 3500,
    rewardReputation: 0.6,
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'ach_1k',
    title: 'First Thousand',
    description: 'Earn $1,000 in cumulative restaurant sales.',
    metric: 'totalEarned',
    target: 1000,
    rewardCash: 250,
  },
  {
    id: 'ach_10k',
    title: 'Restaurateur',
    description: 'Earn $10,000 in cumulative restaurant sales.',
    metric: 'totalEarned',
    target: 10000,
    rewardCash: 1200,
  },
  {
    id: 'ach_100k',
    title: 'Six-Figure Chef',
    description: 'Earn $100,000 in cumulative restaurant sales.',
    metric: 'totalEarned',
    target: 100000,
    rewardCash: 8000,
  },
  {
    id: 'ach_million',
    title: 'Culinary Millionaire',
    description: 'Accumulate $1,000,000 in combined wealth.',
    metric: 'personalWealth',
    target: 1000000,
    rewardCash: 50000,
  },
  {
    id: 'ach_menu',
    title: 'Master Menu',
    description: 'Unlock 8 different culinary recipes.',
    metric: 'recipesUnlocked',
    target: 8,
    rewardCash: 1500,
  },
  {
    id: 'ach_team',
    title: 'Full Brigade',
    description: 'Employ 5 staff members at once.',
    metric: 'staffHired',
    target: 5,
    rewardCash: 2000,
  },
];

export const CITY_ZONES: CityZone[] = [
  {
    id: 'restaurant',
    name: 'Your Restaurant',
    subtitle: 'Kitchen & Dining Floor',
    x: -2.4,
    z: 1.0,
    color: '#f97316',
  },
  {
    id: 'clothing',
    name: 'Style Atelier',
    subtitle: 'Outfits, Hats & Watches',
    x: 10.5,
    z: -9.4,
    color: '#ec4899',
  },
  {
    id: 'dealership',
    name: 'Apex Motors',
    subtitle: 'Car Dealership & Showroom',
    x: 24.5,
    z: -9.4,
    color: '#3b82f6',
  },
  {
    id: 'supermarket',
    name: 'Fresh Wholesale',
    subtitle: 'Bulk Ingredient Discounts',
    x: 10.5,
    z: 10.4,
    color: '#10b981',
  },
  {
    id: 'bank',
    name: 'Metro Bank',
    subtitle: 'Owner Withdrawals & Franchises',
    x: 24.5,
    z: 10.4,
    color: '#eab308',
  },
  {
    id: 'home',
    name: 'Your Residence',
    subtitle: 'Home Interior & Garage',
    x: 40,
    z: -1.5,
    color: '#8b5cf6',
  },
  {
    id: 'foodstreet',
    name: 'Food Street',
    subtitle: 'Your earlier restaurants',
    x: 13.6,
    z: -31,
    color: '#f43f5e',
  },
  {
    id: 'townsquare',
    name: 'Town Square',
    subtitle: 'Clock tower & market',
    x: 17.5,
    z: -52,
    color: '#0ea5e9',
  },
  {
    id: 'park',
    name: 'Riverside Park',
    subtitle: 'Pond, gazebo & flowers',
    x: 17.5,
    z: 27,
    color: '#22c55e',
  },
];

export function getRestaurantTier(level: number): {
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  tableCount: number;
} {
  if (level >= 35) return { tier: 5, title: 'Restaurant Empire Flagship', tableCount: 12 };
  if (level >= 20) return { tier: 4, title: 'Premium Fine Dining', tableCount: 10 };
  if (level >= 10) return { tier: 3, title: 'Popular Brasserie', tableCount: 8 };
  if (level >= 5) return { tier: 2, title: 'Growing Bistro', tableCount: 5 };
  return { tier: 1, title: 'Small Street-Food Bistro', tableCount: 3 };
}

/** Size and table count of each restaurant tier. */
export const TIER_INFO: Record<1 | 2 | 3 | 4 | 5, { title: string; tableCount: number }> = {
  1: { title: 'Small Street-Food Bistro', tableCount: 3 },
  2: { title: 'Growing Bistro', tableCount: 5 },
  3: { title: 'Popular Brasserie', tableCount: 8 },
  4: { title: 'Premium Fine Dining', tableCount: 10 },
  5: { title: 'Restaurant Empire Flagship', tableCount: 12 },
};

export const EXPANSIONS: ExpansionDef[] = [
  {
    id: 'takeaway',
    name: 'Takeaway Counter',
    icon: '🥡',
    description: 'A proper to-go counter by the register with a queue for four.',
    effects: ['Up to 4 takeaway guests at once', 'Some guests order to go even when tables are free', 'No table to clean afterwards'],
    requiredLevel: 3,
    cost: 1200,
  },
  {
    id: 'terrace',
    name: 'Outdoor Terrace',
    icon: '⛱️',
    description: 'Open the terraces by the entrance for real guests, under striped umbrellas.',
    effects: ['+4 outdoor tables', 'More guests at the same time', 'Cozy string lights at night'],
    requiredLevel: 4,
    cost: 2500,
  },
  {
    id: 'dining_2',
    name: 'Dining Room II',
    icon: '🪑',
    description: 'Knock through to the shop next door for a bigger dining room.',
    effects: ['5 indoor tables (from 3)', 'Bigger restaurant'],
    requiredLevel: 5,
    cost: 1800,
  },
  {
    id: 'pro_kitchen',
    name: 'Professional Kitchen',
    icon: '👨‍🍳',
    description: 'Commercial burners and double-capacity machines.',
    effects: ['Every machine cooks 2 dishes at once', 'Cooking is 20% faster'],
    requiredLevel: 7,
    cost: 4500,
  },
  {
    id: 'dining_3',
    name: 'Dining Room III',
    icon: '🍽️',
    description: 'A full brasserie floor with room for big groups.',
    effects: ['8 indoor tables', 'Bigger restaurant'],
    requiredLevel: 10,
    cost: 7000,
    requires: 'dining_2',
  },
  {
    id: 'dining_4',
    name: 'Fine Dining Hall',
    icon: '🥂',
    description: 'An elegant hall with extra booths for premium guests.',
    effects: ['10 indoor tables', 'Extra booth seating'],
    requiredLevel: 20,
    cost: 28000,
    requires: 'dining_3',
  },
  {
    id: 'dining_5',
    name: 'Flagship Hall',
    icon: '🏛️',
    description: 'The grand flagship floor of your restaurant empire.',
    effects: ['12 indoor tables', 'The biggest restaurant'],
    requiredLevel: 35,
    cost: 95000,
    requires: 'dining_4',
  },
];

export function getExpansion(id: ExpansionId): ExpansionDef {
  return EXPANSIONS.find((e) => e.id === id)!;
}

/** The dining tier the player has actually built (level only makes the next one available). */
export function getEffectiveTier(save: { restaurantLevel: number; expansions?: ExpansionId[] }): {
  tier: 1 | 2 | 3 | 4 | 5;
  title: string;
  tableCount: number;
} {
  const owned = save.expansions ?? [];
  const built: 1 | 2 | 3 | 4 | 5 = owned.includes('dining_5')
    ? 5
    : owned.includes('dining_4')
      ? 4
      : owned.includes('dining_3')
        ? 3
        : owned.includes('dining_2')
          ? 2
          : 1;
  const levelTier = getRestaurantTier(save.restaurantLevel).tier;
  const tier = Math.min(built, levelTier) as 1 | 2 | 3 | 4 | 5;
  return { tier, ...TIER_INFO[tier] };
}

/** Why an expansion can't be bought yet, or null if it can. */
export function getExpansionBlocker(
  save: { restaurantLevel: number; restaurantCash: number; expansions?: ExpansionId[] },
  id: ExpansionId
): 'owned' | 'level' | 'requires' | 'cash' | null {
  const def = getExpansion(id);
  const owned = save.expansions ?? [];
  if (owned.includes(id)) return 'owned';
  if (save.restaurantLevel < def.requiredLevel) return 'level';
  if (def.requires && !owned.includes(def.requires)) return 'requires';
  if (save.restaurantCash < def.cost) return 'cash';
  return null;
}

/** Dining expansions a save already "has" from the old automatic growth (so nobody's restaurant shrinks). */
export function getLegacyDiningExpansions(restaurantLevel: number): ExpansionId[] {
  const tier = getRestaurantTier(restaurantLevel).tier;
  const out: ExpansionId[] = [];
  if (tier >= 2) out.push('dining_2');
  if (tier >= 3) out.push('dining_3');
  if (tier >= 4) out.push('dining_4');
  if (tier >= 5) out.push('dining_5');
  return out;
}

export function getXpForNextLevel(level: number): number {
  return Math.round(100 * Math.pow(1.22, level - 1));
}

export function getEquipmentUpgradeCost(id: EquipmentId, currentLevel: number): number {
  const def = EQUIPMENT_CATALOG[id];
  return Math.round(def.baseCost * Math.pow(1.55, currentLevel - 1));
}

// ---------------------------------------------------------------------------
// Kitchen stations & early-game difficulty
// ---------------------------------------------------------------------------

export const STATION_INFO: Record<StationType, { name: string; short: string }> = {
  grill: { name: 'Grill & Range', short: 'Grill' },
  fryer: { name: 'Deep Fryer', short: 'Fryer' },
  prep: { name: 'Prep Counter', short: 'Prep' },
  oven: { name: 'Pizza Oven', short: 'Oven' },
  bar: { name: 'Espresso Bar', short: 'Bar' },
  specialty: { name: 'Specialty Station', short: 'Specialty' },
};

/**
 * Only machines that cook at least one unlocked recipe are installed in the kitchen.
 * A new player starts with just the Grill (burger) and the Fryer (fries); every
 * other machine appears the moment a recipe that needs it is unlocked.
 */
export function getActiveStations(unlockedRecipes: RecipeId[]): StationType[] {
  const set = new Set<StationType>();
  unlockedRecipes.forEach((id) => {
    const def = RECIPES[id];
    if (def) set.add(def.station);
  });
  return (['grill', 'fryer', 'prep', 'oven', 'bar', 'specialty'] as StationType[]).filter((s) => set.has(s));
}

/** Customers are much more patient while the player is learning (level 1-9). */
export function getEarlyPatienceMult(restaurantLevel: number): number {
  if (restaurantLevel <= 3) return 0.5;
  if (restaurantLevel <= 6) return 0.65;
  if (restaurantLevel <= 9) return 0.82;
  return 1;
}

/** Extra seconds between arrivals early on, so new players are never swamped. */
export function getEarlySpawnDelay(restaurantLevel: number): number {
  if (restaurantLevel <= 2) return 5;
  if (restaurantLevel <= 4) return 3;
  if (restaurantLevel <= 6) return 1.5;
  return 0;
}

/**
 * Seconds between new guests. Relaxed by default (about 15 s at the start, 7-10 s later);
 * better reputation brings guests a little faster and each chef/waiter you hire speeds it up slightly.
 */
export function getCustomerSpawnInterval(restaurantLevel: number, reputation: number, helpers: number): number {
  const base = 11 - reputation * 0.8; // rep 1 → 10.2 s, rep 5 → 7 s
  const staffBoost = Math.min(helpers, 6) * 0.45;
  return Math.max(5.5, base - staffBoost) + getEarlySpawnDelay(restaurantLevel);
}

/** Most orders that can be open at once before new guests wait to come in. */
export function getMaxOpenOrders(restaurantLevel: number, helpers: number): number {
  return 2 + Math.floor(restaurantLevel / 6) + helpers;
}

// ---------------------------------------------------------------------------
// Combos, streaks, daily stars, daily challenges & recipe mastery
// ---------------------------------------------------------------------------

/** How many dishes a new order contains (combos appear from level 3). */
export function rollComboSize(restaurantLevel: number, unlockedCount: number, rnd = Math.random): number {
  if (unlockedCount < 2 || restaurantLevel < 3) return 1;
  const r = rnd();
  if (restaurantLevel >= 6 && unlockedCount >= 3 && r < 0.15) return 3;
  if (r < 0.4) return 2;
  return 1;
}

/** Revenue bonus for bigger combos: +15% per extra dish. */
export function getComboBonusMult(items: number): number {
  return 1 + Math.max(0, items - 1) * 0.15;
}

/** Seconds a streak survives without completing another order. */
export const STREAK_WINDOW = 35;

/** Tip multiplier for the current serving streak. */
export function getStreakMult(count: number): number {
  if (count >= 10) return 2;
  if (count >= 6) return 1.5;
  if (count >= 3) return 1.2;
  return 1;
}

/** Orders to serve in one in-game day for 2 stars (3 stars needs 30% more). */
export function getDailyStarTarget(restaurantLevel: number): number {
  return Math.round(6 + restaurantLevel * 1.2);
}

/** 0–3 stars from served orders, walk-outs and cleanliness at closing time. */
export function computeDayStars(served: number, lost: number, cleanliness: number, target: number): number {
  const total = served + lost;
  const lostRate = total > 0 ? lost / total : 0;
  if (served >= Math.ceil(target * 1.3) && lostRate <= 0.1 && cleanliness >= 70) return 3;
  if (served >= target && lostRate <= 0.2) return 2;
  if (served >= Math.ceil(target * 0.5)) return 1;
  return 0;
}

export function getStarReward(stars: number, restaurantLevel: number): number {
  return stars * (50 + restaurantLevel * 20);
}

export const MASTERY_TIERS = [
  { name: 'Bronze', at: 10, bonus: 0.05, color: '#d97706' },
  { name: 'Silver', at: 30, bonus: 0.12, color: '#cbd5e1' },
  { name: 'Gold', at: 75, bonus: 0.2, color: '#facc15' },
] as const;

/** -1 = no medal yet, 0 = Bronze, 1 = Silver, 2 = Gold. */
export function getMasteryTier(count: number): number {
  let tier = -1;
  MASTERY_TIERS.forEach((t, i) => {
    if (count >= t.at) tier = i;
  });
  return tier;
}

export function getMasteryPriceMult(count: number): number {
  const tier = getMasteryTier(count);
  return 1 + (tier >= 0 ? MASTERY_TIERS[tier].bonus : 0);
}

const CHALLENGE_TEMPLATES: { kind: DailyChallengeKind; base: number; perLevel: number }[] = [
  { kind: 'serve_orders', base: 8, perLevel: 1.2 },
  { kind: 'serve_combos', base: 2, perLevel: 0.35 },
  { kind: 'perfect_cooks', base: 5, perLevel: 0.6 },
  { kind: 'clean_tables', base: 4, perLevel: 0.5 },
  { kind: 'earn_cash', base: 300, perLevel: 120 },
  { kind: 'reach_streak', base: 3, perLevel: 0.25 },
  { kind: 'serve_recipe', base: 4, perLevel: 0.4 },
];

/**
 * Three challenges for a real-world date, the same for every reload that day.
 * Targets and rewards grow with restaurant level; combos only appear once they exist (Lv3+).
 */
export function generateDailyChallenges(
  dateKey: string,
  restaurantLevel: number,
  unlockedRecipes: RecipeId[]
): DailyChallengeState {
  // FNV-1a hash of the date + avalanche mix, so neighbouring days get unrelated challenge sets
  let seed = 2166136261;
  for (const ch of dateKey) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x85ebca6b) >>> 0;
  seed ^= seed >>> 13;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pool = CHALLENGE_TEMPLATES.filter((t) => t.kind !== 'serve_combos' || restaurantLevel >= 3);
  const picked: typeof pool = [];
  while (picked.length < 3 && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  }
  const items: DailyChallenge[] = picked.map((t, i) => {
    const target = Math.max(1, Math.round(t.base + t.perLevel * (restaurantLevel - 1)));
    const c: DailyChallenge = {
      id: `${dateKey}_${t.kind}_${i}`,
      kind: t.kind,
      target: t.kind === 'earn_cash' ? Math.round(target / 50) * 50 : target,
      progress: 0,
      reward: Math.round((120 + restaurantLevel * 45) * (t.kind === 'reach_streak' || t.kind === 'serve_combos' ? 1.3 : 1)),
      claimed: false,
    };
    if (t.kind === 'serve_recipe') {
      c.recipeId = unlockedRecipes[Math.floor(rnd() * unlockedRecipes.length)] ?? 'burger';
    }
    return c;
  });
  return { date: dateKey, items, bonusClaimed: false };
}

export type ChallengeEvent =
  | { kind: 'serve_orders' | 'serve_combos' | 'perfect_cooks' | 'clean_tables' | 'earn_cash'; amount: number }
  | { kind: 'reach_streak'; value: number }
  | { kind: 'serve_recipe'; recipeIds: RecipeId[] };

/** Progress a single goal/challenge by one gameplay event (returns the same object if nothing changed). */
export function applyGoalEvent<T extends { kind: DailyChallengeKind; recipeId?: RecipeId; target: number; progress: number }>(
  c: T,
  ev: ChallengeEvent
): T {
  if (c.kind !== ev.kind || c.progress >= c.target) return c;
  let progress = c.progress;
  if (ev.kind === 'reach_streak') progress = Math.max(progress, ev.value);
  else if (ev.kind === 'serve_recipe') progress += ev.recipeIds.filter((r) => r === c.recipeId).length;
  else progress += ev.amount;
  progress = Math.min(c.target, progress);
  return progress === c.progress ? c : { ...c, progress };
}

/** Applies one gameplay event to today's challenges (pure; returns the same object if nothing changed). */
export function applyChallengeProgress(state: DailyChallengeState, ev: ChallengeEvent): DailyChallengeState {
  let changed = false;
  const items = state.items.map((c) => {
    const next = applyGoalEvent(c, ev);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...state, items } : state;
}

/** Challenges finished but not claimed yet (+1 for the all-done bonus when available). */
export function countClaimableChallenges(state: DailyChallengeState): number {
  const ready = state.items.filter((c) => c.progress >= c.target && !c.claimed).length;
  const allClaimed = state.items.length > 0 && state.items.every((c) => c.claimed);
  return ready + (allClaimed && !state.bonusClaimed ? 1 : 0);
}

/** Extra reward for finishing all three challenges in a day. */
export function getChallengeBonusReward(restaurantLevel: number): number {
  return 250 + restaurantLevel * 90;
}

export function describeChallenge(c: DailyChallenge): string {
  switch (c.kind) {
    case 'serve_orders':
      return `Serve ${c.target} orders`;
    case 'serve_combos':
      return `Serve ${c.target} combo orders`;
    case 'perfect_cooks':
      return `Cook ${c.target} perfect dishes`;
    case 'clean_tables':
      return `Clean ${c.target} tables`;
    case 'earn_cash':
      return `Earn $${c.target.toLocaleString()} from customers`;
    case 'reach_streak':
      return `Reach a ${c.target}× serving streak`;
    case 'serve_recipe':
      return `Serve ${c.target} × ${c.recipeId ? RECIPES[c.recipeId].name : 'dish'}`;
  }
}

// ---------------------------------------------------------------------------
// "One more day" hooks: quick goal chain, daily special, star streak
// ---------------------------------------------------------------------------

/** Every Nth quick goal also opens a chest with a bigger reward. */
export const QUICK_GOAL_CHEST_EVERY = 5;
/** Price bonus for the dish of the day. */
export const DAILY_SPECIAL_BONUS = 0.25;
/** Chance that a new order leads with the dish of the day. */
export const DAILY_SPECIAL_ORDER_CHANCE = 0.35;

function seededRandom(key: string): () => number {
  let seed = 2166136261;
  for (const ch of key) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x85ebca6b) >>> 0;
  seed ^= seed >>> 13;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * The next short goal in the chain: small targets (about a minute or two of play),
 * never the same kind twice in a row, and often featuring the dish of the day.
 */
export function generateQuickGoal(
  index: number,
  restaurantLevel: number,
  unlockedRecipes: RecipeId[],
  special: RecipeId | null,
  previousKind?: DailyChallengeKind
): QuickGoal {
  const rnd = seededRandom(`qg_${index}`);
  const lv = Math.max(1, restaurantLevel);
  const kinds: DailyChallengeKind[] = ['serve_orders', 'perfect_cooks', 'clean_tables', 'earn_cash', 'reach_streak', 'serve_recipe'];
  if (lv >= 3) kinds.push('serve_combos');
  // The first goals teach the basics
  const pool = index < 2 ? (['serve_orders', 'perfect_cooks'] as DailyChallengeKind[]) : kinds;
  const choices = pool.filter((k) => k !== previousKind);
  const kind = choices[Math.floor(rnd() * choices.length)] ?? 'serve_orders';

  let target: number;
  let recipeId: RecipeId | undefined;
  switch (kind) {
    case 'serve_orders':
      target = Math.min(6, 2 + Math.floor(lv / 3));
      break;
    case 'perfect_cooks':
      target = Math.min(5, 2 + Math.floor(lv / 4));
      break;
    case 'clean_tables':
      target = Math.min(4, 2 + Math.floor(lv / 5));
      break;
    case 'earn_cash':
      target = Math.round((80 + lv * 45) / 10) * 10;
      break;
    case 'reach_streak':
      target = Math.min(6, 3 + Math.floor(lv / 4));
      break;
    case 'serve_combos':
      target = lv >= 8 ? 2 : 1;
      break;
    case 'serve_recipe':
    default: {
      target = Math.min(4, 2 + Math.floor(lv / 6));
      const list = unlockedRecipes.length > 0 ? unlockedRecipes : (['burger'] as RecipeId[]);
      recipeId = special && list.includes(special) && rnd() < 0.6 ? special : list[Math.floor(rnd() * list.length)];
      break;
    }
  }
  const harder = kind === 'reach_streak' || kind === 'serve_combos';
  const goal: QuickGoal = {
    id: `qg_${index}`,
    kind,
    target,
    progress: 0,
    reward: Math.round((40 + lv * 18) * (harder ? 1.3 : 1)),
  };
  if (recipeId) goal.recipeId = recipeId;
  return goal;
}

/** Bonus for finishing the last goal of a chest cycle. */
export function getQuickGoalChestReward(restaurantLevel: number): number {
  return 200 + Math.max(1, restaurantLevel) * 80;
}

/** Goals left until the next chest (1 = the current goal opens it). */
export function goalsUntilChest(completed: number): number {
  return QUICK_GOAL_CHEST_EVERY - (completed % QUICK_GOAL_CHEST_EVERY);
}

export function isQuickGoalDone(state: QuickGoalState): boolean {
  return !!state.current && state.current.progress >= state.current.target;
}

/** Applies a gameplay event to the active quick goal (same object back if nothing changed). */
export function applyQuickGoalProgress(state: QuickGoalState, ev: ChallengeEvent): QuickGoalState {
  if (!state.current) return state;
  const next = applyGoalEvent(state.current, ev);
  return next === state.current ? state : { ...state, current: next };
}

/** Short label for the HUD chip. */
export function describeQuickGoal(g: QuickGoal): string {
  switch (g.kind) {
    case 'serve_orders':
      return `Serve ${g.target} orders`;
    case 'serve_combos':
      return g.target === 1 ? 'Serve a combo' : `Serve ${g.target} combos`;
    case 'perfect_cooks':
      return `${g.target} perfect cooks`;
    case 'clean_tables':
      return `Clean ${g.target} tables`;
    case 'earn_cash':
      return `Earn $${g.target.toLocaleString()}`;
    case 'reach_streak':
      return `Hit a ${g.target}× streak`;
    case 'serve_recipe':
      return `Serve ${g.target} ${g.recipeId ? RECIPES[g.recipeId].name : 'dishes'}`;
  }
}

/** Picks the dish of the day for a given in-game day, avoiding yesterday's special when possible. */
export function pickDailySpecial(dayNumber: number, unlockedRecipes: RecipeId[], previous: RecipeId | null): RecipeId | null {
  if (unlockedRecipes.length === 0) return null;
  const options = unlockedRecipes.length > 1 ? unlockedRecipes.filter((r) => r !== previous) : unlockedRecipes;
  const rnd = seededRandom(`special_${dayNumber}`);
  return options[Math.floor(rnd() * options.length)];
}

/** Extra star reward from consecutive 2+ star days: +20% per extra day, up to +100%. */
export function getStarStreakBonusPct(streak: number): number {
  return Math.min(100, Math.max(0, streak - 1) * 20);
}

/** The recipe closest to its next medal, if within `maxRemaining` orders. */
export function findNearestMastery(
  mastery: Partial<Record<RecipeId, number>>,
  unlockedRecipes: RecipeId[],
  maxRemaining = 6
): { recipeId: RecipeId; tierName: string; remaining: number } | null {
  let best: { recipeId: RecipeId; tierName: string; remaining: number } | null = null;
  for (const r of unlockedRecipes) {
    const count = mastery[r] ?? 0;
    const next = MASTERY_TIERS[getMasteryTier(count) + 1];
    if (!next) continue;
    const remaining = next.at - count;
    if (remaining <= maxRemaining && (!best || remaining < best.remaining)) {
      best = { recipeId: r, tierName: next.name, remaining };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Day cycle & economy helpers
// ---------------------------------------------------------------------------

/** Max staff level reachable by on-the-job XP or paid training. */
export const STAFF_MAX_LEVEL = 8;

/** XP a staff member gains for finishing one task (cook, serve, clean, checkout). */
export const STAFF_XP_PER_TASK = 5;

/** XP needed to go from `level` to `level + 1`. */
export function getStaffXpForNextLevel(level: number): number {
  return 60 * level;
}

/** Cost of paid training (skips the XP grind for one level). */
export function getStaffTrainingCost(level: number): number {
  return Math.round(180 * Math.pow(1.45, level - 1));
}

/** Daily wage for a hired staff member; experienced staff earn 12% more per level. */
export function getStaffDailySalary(member: HiredStaff): number {
  const def = STAFF_CATALOG.find((s) => s.role === member.role);
  const base = def?.dailySalary ?? 0;
  return Math.round(base * (1 + (member.level - 1) * 0.12));
}

export function getTotalDailyPayroll(staff: HiredStaff[]): number {
  return staff.reduce((sum, m) => sum + getStaffDailySalary(m), 0);
}

/** Sum of the tip prestige (%) granted by the currently equipped outfit, hat and watch. */
export function getPrestigeTipBonus(
  save: Pick<SaveState, 'equippedOutfitId' | 'equippedHatId' | 'equippedWatchId'>
): number {
  return [save.equippedOutfitId, save.equippedHatId, save.equippedWatchId].reduce((sum, id) => {
    const item = CLOTHING_CATALOG.find((c) => c.id === id);
    return sum + (item?.prestigeBonus ?? 0);
  }, 0);
}

/**
 * Patience drain multiplier from restaurant cleanliness.
 * >= 80% clean has no penalty; at the 20% floor customers lose patience 60% faster.
 */
export function getCleanlinessPatienceMult(cleanliness: number): number {
  if (cleanliness >= 80) return 1;
  return 1 + (80 - Math.max(20, cleanliness)) / 100;
}

/** Multiplier applied to positive reputation gains; a dirty dining room earns less goodwill. */
export function getCleanlinessReputationMult(cleanliness: number): number {
  if (cleanliness >= 70) return 1;
  if (cleanliness >= 45) return 0.6;
  return 0.3;
}

export function getCleanlinessLabel(cleanliness: number): { label: string; tone: 'good' | 'ok' | 'bad' } {
  if (cleanliness >= 80) return { label: 'Spotless', tone: 'good' };
  if (cleanliness >= 50) return { label: 'Messy', tone: 'ok' };
  return { label: 'Filthy', tone: 'bad' };
}

export function createEmptyDayStats(): DayStats {
  return {
    revenue: 0,
    tips: 0,
    deliveryIncome: 0,
    franchiseIncome: 0,
    ingredientCost: 0,
    customersServed: 0,
    customersLost: 0,
    dishesCooked: 0,
  };
}

/** Offline franchise earnings: 50% efficiency, capped at 8 hours away, ignored under 2 minutes. */
export const OFFLINE_EFFICIENCY = 0.5;
export const OFFLINE_CAP_MINUTES = 8 * 60;
export const OFFLINE_MIN_MINUTES = 2;

export function getFranchiseIncomePerMinute(ownedFranchises: string[]): number {
  return ownedFranchises.reduce((sum, id) => {
    const fr = FRANCHISE_CATALOG.find((x) => x.id === id);
    return sum + (fr?.incomePerMinute ?? 0);
  }, 0);
}

export function computeOfflineEarnings(
  save: Pick<SaveState, 'ownedFranchises' | 'lastSeenAt'> & Partial<Pick<SaveState, 'ownedRestaurants' | 'restaurantLevel'>>,
  now: number = Date.now()
): { minutesAway: number; cappedMinutes: number; amount: number } | null {
  const restaurantsPerMin = getPassiveRestaurantIncomePerMin(save.ownedRestaurants ?? [], save.restaurantLevel ?? 1);
  if (!save.lastSeenAt || (save.ownedFranchises.length === 0 && restaurantsPerMin === 0)) return null;
  const minutesAway = Math.floor((now - save.lastSeenAt) / 60000);
  if (minutesAway < OFFLINE_MIN_MINUTES) return null;
  const cappedMinutes = Math.min(minutesAway, OFFLINE_CAP_MINUTES);
  const amount = Math.round(
    (getFranchiseIncomePerMinute(save.ownedFranchises) + restaurantsPerMin) * cappedMinutes * OFFLINE_EFFICIENCY
  );
  if (amount <= 0) return null;
  return { minutesAway, cappedMinutes, amount };
}

/** Converts timeOfDay (0..1) into a 24h clock string, e.g. 0.5 -> "12:00". */
export function formatClock(timeOfDay: number): string {
  const totalMinutes = Math.floor((((timeOfDay % 1) + 1) % 1) * 24 * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor((totalMinutes % 60) / 10) * 10;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export interface DailyBonusTier {
  day: number;
  label: string;
  cash: number;
}

export const DAILY_LOGIN_REWARDS: DailyBonusTier[] = [
  { day: 1, label: 'Day 1', cash: 150 },
  { day: 2, label: 'Day 2', cash: 250 },
  { day: 3, label: 'Day 3', cash: 400 },
  { day: 4, label: 'Day 4', cash: 600 },
  { day: 5, label: 'Day 5', cash: 850 },
  { day: 6, label: 'Day 6', cash: 1200 },
  { day: 7, label: 'Day 7+', cash: 2000 },
];

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateKey(date: Date = new Date()): string {
  const prev = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
  return getLocalDateKey(prev);
}

export interface DailyLoginStatus {
  todayKey: string;
  canClaim: boolean;
  alreadyClaimedToday: boolean;
  effectiveStreak: number;
  nextStreak: number;
  rewardCash: number;
  loyaltyBonus: number;
  streakBroken: boolean;
}

export function getDailyLoginStatus(
  dailyLogin: SaveState['dailyLogin'],
  now: Date = new Date()
): DailyLoginStatus {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getYesterdayDateKey(now);
  const alreadyClaimedToday = dailyLogin.lastClaimDate === todayKey;

  if (alreadyClaimedToday) {
    const activeDayIndex = Math.min(Math.max(dailyLogin.streak, 1), 7) - 1;
    const baseCash = DAILY_LOGIN_REWARDS[activeDayIndex].cash;
    const loyaltyBonus = dailyLogin.streak > 7 ? (dailyLogin.streak - 7) * 150 : 0;
    return {
      todayKey,
      canClaim: false,
      alreadyClaimedToday: true,
      effectiveStreak: dailyLogin.streak,
      nextStreak: dailyLogin.streak,
      rewardCash: baseCash + loyaltyBonus,
      loyaltyBonus,
      streakBroken: false,
    };
  }

  const isConsecutive = dailyLogin.lastClaimDate === yesterdayKey && dailyLogin.streak > 0;
  const streakBroken = Boolean(dailyLogin.lastClaimDate) && !isConsecutive;
  const effectiveStreak = isConsecutive ? dailyLogin.streak : 0;
  const nextStreak = effectiveStreak + 1;
  const tierIdx = Math.min(nextStreak, 7) - 1;
  const baseCash = DAILY_LOGIN_REWARDS[tierIdx].cash;
  const loyaltyBonus = nextStreak > 7 ? (nextStreak - 7) * 150 : 0;

  return {
    todayKey,
    canClaim: true,
    alreadyClaimedToday: false,
    effectiveStreak,
    nextStreak,
    rewardCash: baseCash + loyaltyBonus,
    loyaltyBonus,
    streakBroken,
  };
}

export function createInitialSaveState(): SaveState {
  return {
    version: 1,
    restaurantCash: 500,
    personalWallet: 120,
    totalEarned: 0,
    restaurantLevel: 1,
    xp: 0,
    reputation: 2.4,
    cleanliness: 100,
    dayNumber: 1,
    timeOfDay: 0.34, // Sunny morning-noon
    unlockedRecipes: ['burger', 'fries'],
    unlockedSpecialtyLines: [],
    ownedCafeThemes: ['classic_bistro'],
    activeCafeThemeId: 'classic_bistro',
    equipmentLevels: {
      grill: 1,
      prep: 1,
      fryer: 1,
      oven: 1,
      bar: 1,
      specialty: 1,
      register: 1,
      decor: 1,
    },
    staff: [],
    ownedClothes: ['outfit_starter', 'hat_none', 'watch_none'],
    equippedOutfitId: 'outfit_starter',
    equippedHatId: 'hat_none',
    equippedWatchId: 'watch_none',
    ownedVehicles: [],
    activeVehicleId: null,
    ownedHouses: ['house_studio'],
    activeHouseId: 'house_studio',
    ownedFurniture: [],
    ownedFranchises: [],
    bulkIngredientsDiscount: 0,
    completedMissions: [],
    claimedAchievements: [],
    stats: {
      customersServed: 0,
      dishesCooked: 0,
      burgersCooked: 0,
      upgradesBought: 0,
      tipsEarned: 0,
    },
    tutorialStep: 0,
    guideStep: 0,
    isMuted: false,
    isMusicMuted: false,
    dailyLogin: {
      streak: 0,
      lastClaimDate: null,
      totalDaysClaimed: 0,
    },
    today: createEmptyDayStats(),
    lastSeenAt: null,
    graphicsQuality: 'high',
    hapticsEnabled: true,
    joystickSide: 'left',
    expansions: [],
    recipeMastery: {},
    dailyChallenges: { date: null, items: [], bonusClaimed: false },
    totalStars: 0,
    quickGoals: { completed: 0, current: generateQuickGoal(0, 1, ['burger', 'fries'], 'burger') },
    dailySpecial: 'burger',
    starStreak: 0,
    activeCuisine: 'bistro',
    ownedRestaurants: [],
    album: createEmptyAlbum(),
  };
}
