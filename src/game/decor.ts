// ---------------------------------------------------------------------------
// Interior design: the decor catalog, the saved dining-room layout and Charm.
// Pure data and rules (no three.js) so it can be unit tested.
// ---------------------------------------------------------------------------

export type DecorCategory = 'seating' | 'plants' | 'decor' | 'floors' | 'walls';

export type DecorItemId =
  // Seating (each one is a table for guests and counts toward the room's table limit)
  | 'table_oak'
  | 'booth_red'
  | 'table_marble'
  | 'booth_sky'
  | 'table_rustic'
  | 'booth_velvet'
  // Plants
  | 'plant_classic'
  | 'plant_cactus'
  | 'plant_fern'
  | 'plant_palm'
  | 'plant_flowers'
  | 'plant_olive'
  // Floor decorations
  | 'coat_rack'
  | 'rug_round'
  | 'menu_easel'
  | 'lamp_floor'
  | 'rug_long'
  | 'divider'
  | 'bookshelf'
  | 'lamp_lantern'
  | 'dessert_cart'
  | 'fountain'
  | 'aquarium'
  | 'piano';

export interface DecorItemDef {
  id: DecorItemId;
  name: string;
  category: Exclude<DecorCategory, 'floors' | 'walls'>;
  price: number;
  charm: number;
  level: number;
  /** Footprint in metres before rotation (x = width, z = depth). */
  w: number;
  d: number;
  /** Flat items (rugs) can lie under furniture and people walk over them. */
  flat?: boolean;
  /** Seating: a booth instead of a table with chairs. */
  booth?: boolean;
  blurb: string;
}

export const DECOR_ITEMS: DecorItemDef[] = [
  // Seating: the table with its two chairs (or two booth benches)
  { id: 'table_oak', name: 'Oak table & chairs', category: 'seating', price: 150, charm: 1, level: 1, w: 2.45, d: 1.15, blurb: 'The classic: honey oak with red cushions.' },
  { id: 'booth_red', name: 'Red diner booth', category: 'seating', price: 600, charm: 4, level: 1, w: 2.45, d: 1.2, booth: true, blurb: 'Tufted red leather, very cozy.' },
  { id: 'table_marble', name: 'Marble bistro set', category: 'seating', price: 450, charm: 3, level: 3, w: 2.45, d: 1.15, blurb: 'White marble top, black legs, cream cushions.' },
  { id: 'booth_sky', name: 'Seaside blue booth', category: 'seating', price: 900, charm: 5, level: 6, w: 2.45, d: 1.2, booth: true, blurb: 'Light wood and ocean-blue cushions.' },
  { id: 'table_rustic', name: 'Rustic farmhouse set', category: 'seating', price: 650, charm: 4, level: 5, w: 2.45, d: 1.15, blurb: 'Dark walnut with sage-green cushions.' },
  { id: 'booth_velvet', name: 'Velvet lounge booth', category: 'seating', price: 1400, charm: 7, level: 8, w: 2.45, d: 1.2, booth: true, blurb: 'Emerald velvet and walnut, for VIPs.' },
  // Plants
  { id: 'plant_classic', name: 'Potted plant', category: 'plants', price: 60, charm: 2, level: 1, w: 0.6, d: 0.6, blurb: 'A leafy friend in a cream pot.' },
  { id: 'plant_cactus', name: 'Cactus trio', category: 'plants', price: 90, charm: 2, level: 2, w: 0.6, d: 0.45, blurb: 'Three little cacti on a terracotta tray.' },
  { id: 'plant_fern', name: 'Fern basket', category: 'plants', price: 120, charm: 3, level: 2, w: 0.65, d: 0.65, blurb: 'A big round fern in a woven basket.' },
  { id: 'plant_palm', name: 'Tall palm', category: 'plants', price: 260, charm: 4, level: 3, w: 0.7, d: 0.7, blurb: 'Brings a holiday feeling to any corner.' },
  { id: 'plant_flowers', name: 'Flower planter', category: 'plants', price: 180, charm: 3, level: 4, w: 1.1, d: 0.45, blurb: 'A wooden box full of colourful flowers.' },
  { id: 'plant_olive', name: 'Olive tree', category: 'plants', price: 420, charm: 5, level: 6, w: 0.75, d: 0.75, blurb: 'A Mediterranean olive tree in a big pot.' },
  // Decorations
  { id: 'coat_rack', name: 'Coat stand', category: 'decor', price: 80, charm: 1, level: 1, w: 0.5, d: 0.5, blurb: 'Somewhere for guests to hang their coats.' },
  { id: 'rug_round', name: 'Round rug', category: 'decor', price: 180, charm: 2, level: 2, w: 1.8, d: 1.8, flat: true, blurb: 'Soft round rug. Lies under tables too.' },
  { id: 'menu_easel', name: 'Chalkboard easel', category: 'decor', price: 110, charm: 2, level: 2, w: 0.6, d: 0.5, blurb: "Today's specials, hand-written." },
  { id: 'lamp_floor', name: 'Floor lamp', category: 'decor', price: 200, charm: 3, level: 3, w: 0.5, d: 0.5, blurb: 'A warm glow for a quiet corner.' },
  { id: 'rug_long', name: 'Patterned rug', category: 'decor', price: 260, charm: 3, level: 4, w: 2.6, d: 1.6, flat: true, blurb: 'A big patterned rug. Lies under tables too.' },
  { id: 'divider', name: 'Wooden screen', category: 'decor', price: 260, charm: 2, level: 4, w: 1.5, d: 0.25, blurb: 'A carved screen to make cozy corners.' },
  { id: 'bookshelf', name: 'Bookshelf', category: 'decor', price: 480, charm: 5, level: 5, w: 1.25, d: 0.45, blurb: 'Books, jars and a little plant.' },
  { id: 'lamp_lantern', name: 'Lantern stand', category: 'decor', price: 340, charm: 4, level: 7, w: 0.55, d: 0.55, blurb: 'A tall brass lantern on a stand.' },
  { id: 'dessert_cart', name: 'Dessert cart', category: 'decor', price: 700, charm: 6, level: 8, w: 1.05, d: 0.6, blurb: 'Cakes on display, guests love it.' },
  { id: 'fountain', name: 'Mini fountain', category: 'decor', price: 950, charm: 8, level: 9, w: 1.05, d: 1.05, blurb: 'The calming sound of running water.' },
  { id: 'aquarium', name: 'Aquarium', category: 'decor', price: 1600, charm: 10, level: 12, w: 1.45, d: 0.55, blurb: 'Colourful fish in a glowing tank.' },
  { id: 'piano', name: 'Upright piano', category: 'decor', price: 2400, charm: 12, level: 15, w: 1.55, d: 0.65, blurb: 'The star of a classy restaurant.' },
];

export const DECOR_BY_ID = Object.fromEntries(DECOR_ITEMS.map((d) => [d.id, d])) as Record<DecorItemId, DecorItemDef>;

export type FloorId = 'theme' | 'checker' | 'oak_parquet' | 'terracotta' | 'herringbone' | 'marble';
export type WallId = 'theme' | 'stripes' | 'brick' | 'azure_tile' | 'damask' | 'wood_panel';

export interface SurfaceDef<T extends string> {
  id: T;
  name: string;
  price: number;
  charm: number;
  level: number;
  /** Swatch colours for the menu (and the texture painter). */
  colors: [string, string];
}

export const FLOORS: SurfaceDef<FloorId>[] = [
  { id: 'theme', name: 'Style floor', price: 0, charm: 0, level: 1, colors: ['#e8d9bf', '#c98b5a'] },
  { id: 'checker', name: 'Black & white checker', price: 600, charm: 3, level: 2, colors: ['#f4efe6', '#26282c'] },
  { id: 'oak_parquet', name: 'Oak parquet', price: 800, charm: 4, level: 3, colors: ['#d39a5c', '#a96a35'] },
  { id: 'terracotta', name: 'Terracotta tiles', price: 900, charm: 4, level: 5, colors: ['#c8693f', '#e7c39a'] },
  { id: 'herringbone', name: 'Walnut herringbone', price: 1500, charm: 6, level: 7, colors: ['#8a5530', '#5f3519'] },
  { id: 'marble', name: 'White marble', price: 2200, charm: 8, level: 10, colors: ['#f3f1ec', '#c9c4ba'] },
];

export const WALLS: SurfaceDef<WallId>[] = [
  { id: 'theme', name: 'Style paint', price: 0, charm: 0, level: 1, colors: ['#f2e6d0', '#d8c4a4'] },
  { id: 'stripes', name: 'Cream stripes', price: 500, charm: 3, level: 2, colors: ['#f6ead2', '#e3c79a'] },
  { id: 'brick', name: 'Red brick', price: 900, charm: 4, level: 4, colors: ['#b4583a', '#e6d6c3'] },
  { id: 'azure_tile', name: 'Azure tiles', price: 1000, charm: 5, level: 5, colors: ['#f2f6f8', '#2f6fa5'] },
  { id: 'damask', name: 'Green damask', price: 1200, charm: 5, level: 6, colors: ['#2f5d4a', '#c8b273'] },
  { id: 'wood_panel', name: 'Wood panels', price: 1400, charm: 6, level: 8, colors: ['#9b6438', '#6f4223'] },
];

export interface PlacedDecor {
  uid: string;
  item: DecorItemId;
  /** Centre on the floor (world metres) and quarter turns. */
  x: number;
  z: number;
  rot: number;
  /** Seating only: stable table number guests are seated by. */
  tableNo?: number;
}

export interface RestaurantLayout {
  v: 1;
  items: PlacedDecor[];
  floor: FloorId;
  wall: WallId;
  ownedFloors: FloorId[];
  ownedWalls: WallId[];
  /** Tables the restaurant has handed out for free (one per table the room size allows). */
  tablesGranted: number;
}

export function createEmptyLayout(): RestaurantLayout {
  return { v: 1, items: [], floor: 'theme', wall: 'theme', ownedFloors: ['theme'], ownedWalls: ['theme'], tablesGranted: 0 };
}

export const SELL_BACK = 0.5;

export function sellValue(item: DecorItemId): number {
  return Math.floor(DECOR_BY_ID[item].price * SELL_BACK);
}

export function isSeating(item: DecorItemId): boolean {
  return DECOR_BY_ID[item].category === 'seating';
}

export function seatingCount(layout: RestaurantLayout): number {
  return layout.items.filter((i) => isSeating(i.item)).length;
}

export function nextTableNo(layout: RestaurantLayout): number {
  return layout.items.reduce((m, i) => Math.max(m, i.tableNo ?? 0), 0) + 1;
}

export function newDecorUid(): string {
  return `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Footprint half-sizes after rotation (odd quarter turns swap width and depth). */
export function footprintHalf(item: DecorItemId, rot: number): { hx: number; hz: number } {
  const def = DECOR_BY_ID[item];
  const swap = ((rot % 4) + 4) % 2 === 1;
  return { hx: (swap ? def.d : def.w) / 2, hz: (swap ? def.w : def.d) / 2 };
}

/**
 * Charm from the room's decorations. Each extra copy of the same item counts a bit less,
 * so a varied room beats twenty identical plants.
 */
export function computeCharm(layout: RestaurantLayout | undefined): number {
  if (!layout) return 0;
  const copies = new Map<DecorItemId, number>();
  let charm = 0;
  for (const p of layout.items) {
    const n = copies.get(p.item) ?? 0;
    copies.set(p.item, n + 1);
    charm += DECOR_BY_ID[p.item].charm * Math.pow(0.7, n);
  }
  charm += FLOORS.find((f) => f.id === layout.floor)?.charm ?? 0;
  charm += WALLS.find((w) => w.id === layout.wall)?.charm ?? 0;
  return Math.round(charm);
}

/**
 * What Charm does. Kept small on purpose: a pretty room helps, but fast service and good
 * dishes matter far more (tips depend on patience, quality and streaks).
 */
export function getCharmBonus(charm: number): { guests: number; tips: number; patience: number } {
  const k = 1 - Math.exp(-Math.max(0, charm) / 50);
  return { guests: 0.1 * k, tips: 0.08 * k, patience: 0.06 * k };
}

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function decorRect(p: { item: DecorItemId; x: number; z: number; rot: number }, inflate = 0): Rect {
  const { hx, hz } = footprintHalf(p.item, p.rot);
  return { minX: p.x - hx - inflate, maxX: p.x + hx + inflate, minZ: p.z - hz - inflate, maxZ: p.z + hz + inflate };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Snap a centre to the 25 cm grid. */
export function snapToGrid(v: number): number {
  return Math.round(v * 4) / 4;
}

/** Seating points for a table: the two seats and, beside each, the aisle spots guests walk to. */
export function seatingPoints(p: { x: number; z: number; rot: number; item: DecorItemId }) {
  const alongZ = ((p.rot % 4) + 4) % 2 === 1;
  const seatOff = DECOR_BY_ID[p.item].booth ? 0.88 : 0.96;
  const seats = [-1, 1].map((s) => (alongZ ? { x: p.x, z: p.z + s * seatOff } : { x: p.x + s * seatOff, z: p.z }));
  const aisles = seats.map((seat) =>
    [-1, 1].map((s) => (alongZ ? { x: seat.x + s * 0.96, z: seat.z } : { x: seat.x, z: seat.z + s * 0.96 }))
  );
  return { alongZ, seats, aisles };
}
