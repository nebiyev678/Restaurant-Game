// Restaurant chain: one country's cuisine per restaurant, plus the Recipe Album cards.
import { AlbumCardDef, AlbumRarity, AlbumState, CuisineDef, CuisineId, RecipeDef, RecipeId } from './types';

type WorldRecipeId =
  | 'bruschetta'
  | 'risotto'
  | 'lasagna'
  | 'ramen'
  | 'gyoza'
  | 'tempura'
  | 'mochi'
  | 'tacos'
  | 'nachos'
  | 'burrito'
  | 'churros'
  | 'lula_kebab'
  | 'qutab'
  | 'plov'
  | 'dolma'
  | 'pakhlava'
  | 'azeri_tea';

function dish(
  id: WorldRecipeId,
  name: string,
  station: RecipeDef['station'],
  requiredLevel: number,
  unlockCost: number,
  sellPrice: number,
  basePrepTime: number,
  color: string,
  steps: string[],
  description: string
): RecipeDef {
  return {
    id,
    name,
    station,
    unlockCost,
    requiredLevel,
    ingredientCost: Math.max(3, Math.round(sellPrice * 0.2)),
    sellPrice,
    basePrepTime,
    satisfactionBonus: Math.round(6 + sellPrice / 15),
    color,
    steps,
    description,
  };
}

/** Dishes added by the country restaurants (classic dishes live in data.ts). */
export const WORLD_RECIPES: Record<WorldRecipeId, RecipeDef> = {
  // --- Italy ---
  bruschetta: dish('bruschetta', 'Bruschetta', 'prep', 8, 0, 28, 3.8, '#dc2626',
    ['Toast Ciabatta', 'Rub Garlic', 'Top Tomato & Basil'], 'Grilled ciabatta with garlic, ripe tomato, basil and olive oil.'),
  risotto: dish('risotto', 'Mushroom Risotto', 'grill', 10, 900, 50, 5.0, '#d6b370',
    ['Toast Arborio Rice', 'Ladle Warm Stock', 'Fold Parmesan & Porcini'], 'Creamy arborio rice slow-stirred with porcini and parmesan.'),
  lasagna: dish('lasagna', 'Lasagna al Forno', 'oven', 12, 1300, 62, 5.4, '#c2410c',
    ['Layer Fresh Pasta', 'Spread Ragù & Béchamel', 'Bake Until Golden'], 'Layers of pasta, slow-cooked ragù and béchamel, baked bubbling.'),
  // --- Japan ---
  ramen: dish('ramen', 'Tonkotsu Ramen', 'grill', 13, 0, 48, 4.6, '#f59e0b',
    ['Simmer Rich Broth', 'Boil Fresh Noodles', 'Top Egg, Pork & Nori'], 'Silky pork-bone broth, springy noodles, soft egg and chashu.'),
  gyoza: dish('gyoza', 'Pan-Fried Gyoza', 'fryer', 14, 1200, 42, 4.0, '#e7c08a',
    ['Pleat Dumplings', 'Sear Until Crisp', 'Steam & Glaze'], 'Crispy-bottomed pork and cabbage dumplings with dipping sauce.'),
  tempura: dish('tempura', 'Shrimp Tempura', 'fryer', 16, 1700, 64, 4.8, '#fbbf24',
    ['Mix Ice-Cold Batter', 'Dip Tiger Shrimp', 'Fry Light & Crisp'], 'Feather-light battered shrimp and vegetables with tentsuyu.'),
  mochi: dish('mochi', 'Strawberry Mochi', 'prep', 15, 1500, 46, 4.0, '#f9a8d4',
    ['Steam Rice Dough', 'Wrap Sweet Bean & Berry', 'Dust with Starch'], 'Soft rice cakes filled with sweet bean paste and fresh strawberry.'),
  // --- Mexico ---
  tacos: dish('tacos', 'Tacos al Pastor', 'grill', 18, 0, 54, 4.4, '#ea580c',
    ['Shave Marinated Pork', 'Warm Corn Tortillas', 'Top Pineapple & Cilantro'], 'Spit-roasted pork with pineapple, onion and cilantro on corn tortillas.'),
  nachos: dish('nachos', 'Loaded Nachos', 'oven', 18, 0, 50, 4.2, '#facc15',
    ['Spread Tortilla Chips', 'Melt Cheese & Beans', 'Add Salsa & Jalapeños'], 'Crunchy chips under melted cheese, beans, salsa and jalapeños.'),
  burrito: dish('burrito', 'Grande Burrito', 'prep', 19, 2200, 72, 4.8, '#a16207',
    ['Warm Flour Tortilla', 'Fill Rice, Beans & Carne', 'Roll Tight & Toast'], 'A big flour tortilla packed with rice, beans, carne asada and salsa.'),
  churros: dish('churros', 'Churros con Chocolate', 'fryer', 21, 2600, 58, 4.2, '#b45309',
    ['Pipe Choux Dough', 'Fry Until Golden', 'Roll in Cinnamon Sugar'], 'Golden cinnamon-sugar churros with thick hot chocolate for dipping.'),
  // --- Azerbaijan ---
  lula_kebab: dish('lula_kebab', 'Lula Kebab', 'grill', 24, 0, 80, 4.8, '#9a3412',
    ['Season Minced Lamb', 'Shape on Skewers', 'Grill over Embers'], 'Juicy minced-lamb skewers grilled over coals, with sumac onions and lavash.'),
  azeri_tea: dish('azeri_tea', 'Azerbaijani Tea', 'bar', 24, 0, 34, 3.2, '#b91c1c',
    ['Brew Strong Black Tea', 'Pour into Armudu Glass', 'Serve with Jam & Lemon'], 'Fragrant black tea in a pear-shaped armudu glass with cherry jam and lemon.'),
  qutab: dish('qutab', 'Qutab', 'oven', 25, 3000, 62, 4.2, '#65a30d',
    ['Roll Thin Dough', 'Fill Herbs or Meat', 'Cook on the Saj'], 'Thin half-moon flatbreads filled with fresh greens or meat, brushed with butter.'),
  dolma: dish('dolma', 'Yarpaq Dolma', 'prep', 25, 3400, 86, 5.0, '#4d7c0f',
    ['Blanch Vine Leaves', 'Roll Spiced Lamb & Rice', 'Simmer Gently'], 'Tender vine leaves rolled around spiced lamb and rice, with garlic yogurt.'),
  pakhlava: dish('pakhlava', 'Baku Pakhlava', 'oven', 26, 3800, 76, 4.6, '#d97706',
    ['Layer Thin Pastry', 'Fill Walnuts & Cardamom', 'Bake & Soak in Honey'], 'Diamond-cut layers of pastry, walnuts and cardamom soaked in honey syrup.'),
  plov: dish('plov', 'Shah Plov', 'grill', 27, 4600, 118, 6.0, '#ca8a04',
    ['Steam Saffron Rice', 'Cook Lamb, Chestnut & Apricot', 'Bake in Lavash Crown'], 'The king of plovs: saffron rice, lamb, chestnuts and dried fruit baked inside a golden lavash crown.'),
};

export const CUISINES: Record<CuisineId, CuisineDef> = {
  bistro: {
    id: 'bistro',
    name: 'Old Town Bistro',
    country: 'Old Town',
    flag: '🏡',
    requiredLevel: 1,
    tagline: 'Where it all began',
    description: 'Your first little bistro on the fountain square: burgers, fries and coffee.',
    menu: [
      'burger', 'fries', 'sandwich', 'salad', 'coffee', 'pizza', 'soup', 'pasta', 'sushi', 'steak', 'dessert',
      'tiramisu', 'gelato', 'berry_tart', 'matcha_boba', 'mango_smoothie', 'berry_mocktail',
    ],
    starters: ['burger', 'fries'],
    palette: {
      wall: '#f4e3cf', wainscot: '#c2703d', trim: '#c2703d', floorPrimary: '#f5efe6', floorSecondary: '#e8d3bd',
      floorMode: 'checker', kitchenPrimary: '#b4533a', kitchenSecondary: '#d46b4c', cushion: '#ef4444',
      woodPrimary: '#e6c38f', woodSecondary: '#b98a52', light: '#fff4e0', accent: '#ef4444', awningA: '#ef4444', awningB: '#ffffff',
    },
    musicMood: 'bistro',
    passivePerMin: 40,
  },
  italian: {
    id: 'italian',
    name: 'Trattoria Roma',
    country: 'Italy',
    flag: '🇮🇹',
    requiredLevel: 8,
    tagline: 'Pasta, pizza & amore',
    description: 'A rustic trattoria with terracotta floors, olive-green walls and wood-fired dishes.',
    menu: ['pizza', 'bruschetta', 'pasta', 'risotto', 'lasagna', 'coffee', 'tiramisu', 'gelato'],
    starters: ['pizza', 'bruschetta'],
    palette: {
      wall: '#efe2c4', wainscot: '#5f7a3a', trim: '#7a5230', floorPrimary: '#c8734a', floorSecondary: '#a85a37',
      floorMode: 'checker', kitchenPrimary: '#e9e3d4', kitchenSecondary: '#3f6b35', cushion: '#2f7d32',
      woodPrimary: '#8b5a2b', woodSecondary: '#5e3a1a', light: '#ffe9c2', accent: '#16a34a', awningA: '#16a34a', awningB: '#ffffff',
    },
    musicMood: 'italian',
    passivePerMin: 70,
  },
  japanese: {
    id: 'japanese',
    name: 'Sakura Ramen House',
    country: 'Japan',
    flag: '🇯🇵',
    requiredLevel: 13,
    tagline: 'Slurp, smile, repeat',
    description: 'Paper lanterns, pale wood and cherry-blossom pink. Ramen, gyoza and sushi.',
    menu: ['ramen', 'sushi', 'gyoza', 'tempura', 'mochi', 'matcha_boba'],
    starters: ['ramen', 'sushi'],
    palette: {
      wall: '#f7efe3', wainscot: '#3b2f2a', trim: '#2b2522', floorPrimary: '#d9bf94', floorSecondary: '#c8a978',
      floorMode: 'wood', kitchenPrimary: '#efe9df', kitchenSecondary: '#3b3b3b', cushion: '#be123c',
      woodPrimary: '#e3c99a', woodSecondary: '#a9825a', light: '#ffefe6', accent: '#e11d48', awningA: '#991b1b', awningB: '#fde7ef',
    },
    musicMood: 'japanese',
    passivePerMin: 110,
  },
  mexican: {
    id: 'mexican',
    name: 'Casa Fiesta',
    country: 'Mexico',
    flag: '🇲🇽',
    requiredLevel: 18,
    tagline: '¡Viva la comida!',
    description: 'Talavera tiles, sunny colours and papel picado. Tacos, nachos and churros.',
    menu: ['tacos', 'nachos', 'burrito', 'churros', 'mango_smoothie', 'berry_mocktail'],
    starters: ['tacos', 'nachos'],
    palette: {
      wall: '#fde9c8', wainscot: '#1d4ed8', trim: '#c2410c', floorPrimary: '#e9b44c', floorSecondary: '#1e40af',
      floorMode: 'checker', kitchenPrimary: '#f3efe6', kitchenSecondary: '#2563eb', cushion: '#db2777',
      woodPrimary: '#c58b4e', woodSecondary: '#8a5a2c', light: '#fff1d6', accent: '#f97316', awningA: '#f97316', awningB: '#fde047',
    },
    musicMood: 'mexican',
    passivePerMin: 160,
  },
  azerbaijani: {
    id: 'azerbaijani',
    name: 'Caravanserai Baku',
    country: 'Azerbaijan',
    flag: '🇦🇿',
    requiredLevel: 24,
    tagline: 'Hospitality of the Silk Road',
    description: 'Arched brick, carpet reds and brass tea sets. Kebab, qutab, dolma and the royal Shah Plov.',
    menu: ['lula_kebab', 'azeri_tea', 'qutab', 'dolma', 'pakhlava', 'plov'],
    starters: ['lula_kebab', 'azeri_tea'],
    palette: {
      wall: '#ecd7b8', wainscot: '#8c2f1c', trim: '#6b2a17', floorPrimary: '#9f2d20', floorSecondary: '#1d4e5f',
      floorMode: 'checker', kitchenPrimary: '#e7dccb', kitchenSecondary: '#7c2d12', cushion: '#b91c1c',
      woodPrimary: '#9a6b3c', woodSecondary: '#5c3a1e', light: '#ffe2b8', accent: '#0ea5e9', awningA: '#0e7490', awningB: '#b91c1c',
    },
    musicMood: 'azeri',
    passivePerMin: 230,
  },
};

export const CUISINE_ORDER: CuisineId[] = ['bistro', 'italian', 'japanese', 'mexican', 'azerbaijani'];

/** Next restaurant in the chain after `current`, or null at the end. */
export function getNextCuisine(current: CuisineId): CuisineDef | null {
  const i = CUISINE_ORDER.indexOf(current);
  const next = CUISINE_ORDER[i + 1];
  return next ? CUISINES[next] : null;
}

/** Dishes the current restaurant can serve right now (unlocked and on its menu). */
export function getMenuRecipes(save: { activeCuisine?: CuisineId; unlockedRecipes: RecipeId[] }): RecipeId[] {
  const cuisine = CUISINES[save.activeCuisine ?? 'bistro'] ?? CUISINES.bistro;
  const menu = cuisine.menu.filter((r) => save.unlockedRecipes.includes(r));
  return menu.length > 0 ? menu : cuisine.starters;
}

/** Money per real minute from restaurants you've moved on from. */
export function getPassiveRestaurantIncomePerMin(owned: CuisineId[], restaurantLevel: number): number {
  const scale = 1 + Math.max(0, restaurantLevel - 1) * 0.06;
  return Math.round(owned.reduce((sum, id) => sum + (CUISINES[id]?.passivePerMin ?? 0), 0) * scale);
}

// ---------------------------------------------------------------------------
// Recipe Album
// ---------------------------------------------------------------------------

function card(cuisine: CuisineId, id: string, name: string, rarity: AlbumRarity, art: RecipeId | string, blurb: string): AlbumCardDef {
  const isRecipe = /^[a-z_]+$/.test(art);
  return {
    id: `${cuisine}_${id}`,
    cuisine,
    name,
    rarity,
    ...(isRecipe ? { recipeId: art as RecipeId } : { emoji: art }),
    blurb,
  };
}

export const ALBUM_CARDS: AlbumCardDef[] = [
  // Old Town Bistro
  card('bistro', 'burger', 'Classic Burger', 'common', 'burger', 'The burger that started your empire.'),
  card('bistro', 'fries', 'Golden Fries', 'common', 'fries', 'Crispy, salty, impossible to share.'),
  card('bistro', 'coffee', 'Artisan Latte', 'common', 'coffee', 'Morning regulars swear by it.'),
  card('bistro', 'fountain', 'Fountain Square', 'common', '⛲', 'The roundabout fountain everyone meets at.'),
  card('bistro', 'salad', 'Caesar Salad', 'rare', 'salad', 'Crunchy, creamy, classic.'),
  card('bistro', 'lanterns', 'Lantern Night', 'rare', '🏮', 'When the old-town lanterns glow at dusk.'),
  card('bistro', 'delivery', 'Morning Delivery', 'rare', '🚲', 'Fresh bread arrives before sunrise.'),
  card('bistro', 'steak', 'Prime Steak', 'gold', 'steak', 'Your first fine-dining triumph.'),
  card('bistro', 'star', 'First Star', 'gold', '🏆', 'The night a critic gave you a star.'),
  // Italy
  card('italian', 'pizza', 'Pizza Margherita', 'common', 'pizza', 'Red, white and green, like the flag.'),
  card('italian', 'bruschetta', 'Bruschetta', 'common', 'bruschetta', 'Summer on toasted bread.'),
  card('italian', 'tomatoes', 'San Marzano Tomatoes', 'common', '🍅', 'Grown in volcanic soil near Naples.'),
  card('italian', 'vespa', 'Vespa Courier', 'common', '🛵', 'Deliveries buzzing through narrow streets.'),
  card('italian', 'pasta', 'Fresh Pasta', 'rare', 'pasta', 'Rolled by hand every morning.'),
  card('italian', 'risotto', 'Mushroom Risotto', 'rare', 'risotto', 'Patience in every stir.'),
  card('italian', 'colosseum', 'Colosseum', 'rare', '🏛️', 'Two thousand years of Roman history.'),
  card('italian', 'lasagna', 'Lasagna al Forno', 'gold', 'lasagna', "Nonna's secret Sunday recipe."),
  card('italian', 'carnival', 'Venice Carnival', 'gold', '🎭', 'Masks, music and gondolas.'),
  // Japan
  card('japanese', 'ramen', 'Tonkotsu Ramen', 'common', 'ramen', 'Slurping loudly is a compliment.'),
  card('japanese', 'sushi', 'Omakase Sushi', 'common', 'sushi', "Trust the chef's choice."),
  card('japanese', 'tea', 'Tea Ceremony', 'common', '🍵', 'Matcha whisked with quiet grace.'),
  card('japanese', 'lantern', 'Izakaya Lantern', 'common', '🏮', 'A red lantern means "come on in".'),
  card('japanese', 'gyoza', 'Pan-Fried Gyoza', 'rare', 'gyoza', 'Crispy bottoms, juicy middles.'),
  card('japanese', 'tempura', 'Shrimp Tempura', 'rare', 'tempura', 'Light as a cloud.'),
  card('japanese', 'fuji', 'Mount Fuji', 'rare', '🗻', 'Snow-capped and sacred.'),
  card('japanese', 'mochi', 'Strawberry Mochi', 'gold', 'mochi', 'Soft, chewy, perfect.'),
  card('japanese', 'sakura', 'Cherry Blossoms', 'gold', '🌸', 'Hanami picnics under pink skies.'),
  // Mexico
  card('mexican', 'tacos', 'Tacos al Pastor', 'common', 'tacos', 'Carved straight from the spit.'),
  card('mexican', 'nachos', 'Loaded Nachos', 'common', 'nachos', 'Every chip fully loaded.'),
  card('mexican', 'chili', 'Chili Basket', 'common', '🌶️', 'From mild poblano to fiery habanero.'),
  card('mexican', 'mariachi', 'Mariachi Band', 'common', '🎸', 'Trumpets, violins and big sombreros.'),
  card('mexican', 'burrito', 'Grande Burrito', 'rare', 'burrito', 'Bring both hands.'),
  card('mexican', 'churros', 'Churros', 'rare', 'churros', 'Dunk in thick chocolate.'),
  card('mexican', 'cactus', 'Desert Cactus', 'rare', '🌵', 'The nopal is on the national flag.'),
  card('mexican', 'pinata', 'Piñata Party', 'gold', '🪅', 'Swing for the sweets!'),
  card('mexican', 'marigold', 'Marigold Festival', 'gold', '🌼', 'Golden flowers for Día de Muertos.'),
  // Azerbaijan
  card('azerbaijani', 'kebab', 'Lula Kebab', 'common', 'lula_kebab', 'Grilled over glowing embers.'),
  card('azerbaijani', 'tea', 'Armudu Tea', 'common', 'azeri_tea', 'Served in a pear-shaped glass with jam.'),
  card('azerbaijani', 'qutab', 'Qutab', 'common', 'qutab', 'Thin, herby and buttery.'),
  card('azerbaijani', 'flame', 'Flame Towers', 'common', '🔥', "Baku's skyline glowing at night."),
  card('azerbaijani', 'dolma', 'Yarpaq Dolma', 'rare', 'dolma', 'Rolled one leaf at a time.'),
  card('azerbaijani', 'pakhlava', 'Baku Pakhlava', 'rare', 'pakhlava', 'A Novruz holiday favourite.'),
  card('azerbaijani', 'mugham', 'Mugham Evening', 'rare', '🎶', 'Tar and kamancha fill the caravanserai.'),
  card('azerbaijani', 'plov', 'Shah Plov', 'gold', 'plov', 'A golden crown of lavash and saffron rice.'),
  card('azerbaijani', 'carpet', 'Azerbaijani Carpet', 'gold', '🧶', 'Woven patterns centuries old.'),
];

export const ALBUM_RARITY_WEIGHT: Record<AlbumRarity, number> = { common: 15, rare: 10, gold: 5 };

export function getAlbumPage(cuisine: CuisineId): AlbumCardDef[] {
  return ALBUM_CARDS.filter((c) => c.cuisine === cuisine);
}

export function isAlbumPageComplete(album: AlbumState, cuisine: CuisineId): boolean {
  return getAlbumPage(cuisine).every((c) => (album.cards[c.id] ?? 0) > 0);
}

/** Each completed and claimed page adds +3% to every dish's price. */
export const ALBUM_PAGE_PRICE_BONUS = 0.03;

export function getAlbumPriceMult(album: AlbumState | undefined): number {
  return 1 + (album?.claimedPages.length ?? 0) * ALBUM_PAGE_PRICE_BONUS;
}

export function getAlbumPageReward(restaurantLevel: number): number {
  return 500 + restaurantLevel * 120;
}

/** Cash a duplicate card turns into. */
export function getDuplicateCardValue(rarity: AlbumRarity, restaurantLevel: number): number {
  const lv = Math.max(1, restaurantLevel);
  return rarity === 'gold' ? 60 + lv * 8 : rarity === 'rare' ? 30 + lv * 4 : 15 + lv * 2;
}

/**
 * Rolls `count` cards. Pages come from the active restaurant (and, 25% of the time,
 * a restaurant you already moved on from). `preferRecipe` makes that dish's card
 * more likely (only for common/rare cards); `minRarity` guarantees the first card.
 */
export function rollAlbumCards(
  count: number,
  activeCuisine: CuisineId,
  ownedRestaurants: CuisineId[],
  rnd: () => number = Math.random,
  opts: { preferRecipe?: RecipeId; minRarity?: AlbumRarity } = {}
): AlbumCardDef[] {
  const out: AlbumCardDef[] = [];
  for (let i = 0; i < count; i++) {
    const page = ownedRestaurants.length > 0 && rnd() < 0.25
      ? ownedRestaurants[Math.floor(rnd() * ownedRestaurants.length)]
      : activeCuisine;
    let pool = getAlbumPage(page);
    if (i === 0 && opts.minRarity && opts.minRarity !== 'common') {
      const ok: AlbumRarity[] = opts.minRarity === 'gold' ? ['gold'] : ['rare', 'gold'];
      pool = pool.filter((c) => ok.includes(c.rarity));
    }
    if (opts.preferRecipe && page === activeCuisine && rnd() < 0.5) {
      const fav = pool.find((c) => c.recipeId === opts.preferRecipe && c.rarity !== 'gold');
      if (fav) {
        out.push(fav);
        continue;
      }
    }
    const total = pool.reduce((s, c) => s + ALBUM_RARITY_WEIGHT[c.rarity], 0);
    let r = rnd() * total;
    let pick = pool[pool.length - 1];
    for (const c of pool) {
      r -= ALBUM_RARITY_WEIGHT[c.rarity];
      if (r <= 0) {
        pick = c;
        break;
      }
    }
    out.push(pick);
  }
  return out;
}

/** Adds cards to the album; returns the new state, which were new, and cash from duplicates. */
export function addAlbumCards(
  album: AlbumState,
  cards: AlbumCardDef[],
  restaurantLevel: number
): { album: AlbumState; newCards: AlbumCardDef[]; duplicateCash: number } {
  const counts = { ...album.cards };
  const unseen = album.unseen.slice();
  const newCards: AlbumCardDef[] = [];
  let duplicateCash = 0;
  for (const c of cards) {
    const had = counts[c.id] ?? 0;
    counts[c.id] = had + 1;
    if (had === 0) {
      newCards.push(c);
      if (!unseen.includes(c.id)) unseen.push(c.id);
    } else {
      duplicateCash += getDuplicateCardValue(c.rarity, restaurantLevel);
    }
  }
  return { album: { ...album, cards: counts, unseen }, newCards, duplicateCash };
}

export function createEmptyAlbum(): AlbumState {
  return { cards: {}, claimedPages: [], unseen: [] };
}
