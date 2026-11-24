import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RECIPES } from './data';
import type { RecipeId } from './types';

// ---------------------------------------------------------------------------
// Stylized 3D food models (Kenney "Food Kit", CC0, www.kenney.nl) and the
// step-by-step cooking visuals built from them.
// ---------------------------------------------------------------------------

const FILES = [
  'burger',
  'fries',
  'sandwich',
  'salad',
  'cup-coffee',
  'pizza',
  'bowl-soup',
  'sushi-salmon',
  'maki-salmon',
  'maki-roe',
  'meat-cooked',
  'sundae',
  'pie',
  'bowl-broth',
  'chopstick',
  'dim-sum',
  'taco',
  'skewer',
  'cup-tea',
] as const;
type FoodFile = (typeof FILES)[number];

/** One model placed on the plate: footprint `size` (world units), offset and turn. */
interface Part {
  file: FoodFile;
  size: number;
  x?: number;
  z?: number;
  ry?: number;
  /** Lift above the plate (e.g. chopsticks resting on a bowl rim). */
  y?: number;
  /** Height cap for tall models (glasses, cartons). */
  h?: number;
}

const DISHES: Partial<Record<RecipeId, Part[]>> = {
  burger: [{ file: 'burger', size: 0.36, ry: 0.4 }],
  fries: [{ file: 'fries', size: 0.27, ry: -0.5 }],
  sandwich: [{ file: 'sandwich', size: 0.38, ry: 0.5 }],
  salad: [{ file: 'salad', size: 0.42 }],
  coffee: [{ file: 'cup-coffee', size: 0.3, ry: 0.6 }],
  pizza: [{ file: 'pizza', size: 0.5 }],
  soup: [{ file: 'bowl-soup', size: 0.4 }],
  sushi: [
    { file: 'sushi-salmon', size: 0.15, x: -0.08, z: -0.06, ry: 0.3 },
    { file: 'sushi-salmon', size: 0.15, x: 0.09, z: -0.07, ry: -0.2 },
    { file: 'maki-salmon', size: 0.12, x: -0.09, z: 0.1 },
    { file: 'maki-roe', size: 0.12, x: 0.08, z: 0.1 },
  ],
  steak: [{ file: 'meat-cooked', size: 0.36, ry: 0.3 }],
  gelato: [{ file: 'sundae', size: 0.3, h: 0.3 }],
  berry_tart: [{ file: 'pie', size: 0.42 }],
  ramen: [
    { file: 'bowl-broth', size: 0.44 },
    { file: 'chopstick', size: 0.36, y: 0.13, x: 0.02, z: 0.05, ry: 0.5 },
  ],
  gyoza: [
    { file: 'dim-sum', size: 0.15, x: -0.1, z: -0.03, ry: 0.4 },
    { file: 'dim-sum', size: 0.15, x: 0.09, z: -0.06, ry: -0.3 },
    { file: 'dim-sum', size: 0.15, x: 0, z: 0.11, ry: 1.2 },
  ],
  tacos: [
    { file: 'taco', size: 0.26, x: -0.07, z: 0, ry: 0.25 },
    { file: 'taco', size: 0.26, x: 0.08, z: 0.02, ry: -0.25 },
  ],
  lula_kebab: [
    { file: 'skewer', size: 0.44, z: -0.06, ry: 0.15 },
    { file: 'skewer', size: 0.44, z: 0.07, ry: -0.1 },
  ],
  azeri_tea: [{ file: 'cup-tea', size: 0.3, ry: 0.4 }],
};

const templates = new Map<FoodFile, THREE.Object3D>();
let loadPromise: Promise<void> | null = null;
let loaded = false;

function assetBase(): string {
  try {
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
    return base ?? '/';
  } catch {
    return '/';
  }
}

/** Starts loading the food models once (safe to call many times). */
export function loadFoodModels(): Promise<void> {
  if (loadPromise) return loadPromise;
  const loader = new GLTFLoader();
  const dir = `${assetBase()}models/food/`;
  let shared: THREE.MeshStandardMaterial | null = null;
  loadPromise = Promise.all(
    FILES.map((file) =>
      new Promise<GLTF>((resolve, reject) => loader.load(`${dir}${file}.glb`, resolve, undefined, reject))
        .then((gltf) => {
          gltf.scene.traverse((o: THREE.Object3D) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh) return;
            const src = mesh.material as THREE.MeshStandardMaterial;
            // Every model uses the same colour-map texture: share one material
            if (!shared) {
              if (src.map) src.map.colorSpace = THREE.SRGBColorSpace;
              shared = new THREE.MeshStandardMaterial({ map: src.map, roughness: 0.62, metalness: 0 });
            } else if (src.map && src.map !== shared.map) {
              src.map.dispose();
            }
            src.dispose();
            mesh.material = shared;
            mesh.castShadow = true;
          });
          templates.set(file, gltf.scene);
        })
        .catch(() => {
          /* missing file: that dish keeps its simple model */
        })
    )
  ).then(() => {
    loaded = true;
  });
  return loadPromise;
}

export function foodModelsLoaded(): boolean {
  return loaded;
}

/** True when this dish is drawn with the detailed food models. */
export function hasFoodModel(recipeId: RecipeId): boolean {
  const parts = DISHES[recipeId];
  return !!parts && parts.every((p) => templates.has(p.file));
}

/** A copy of one model, scaled so its widest side is `size`, resting on y = 0. */
function fitted(file: FoodFile, size: number, maxHeight = Infinity): THREE.Group {
  const model = templates.get(file)!.clone(true);
  const box = new THREE.Box3().setFromObject(model);
  const dim = box.getSize(new THREE.Vector3());
  const s = Math.min(size / Math.max(dim.x, dim.z, 1e-3), maxHeight / Math.max(dim.y, 1e-3));
  model.scale.multiplyScalar(s);
  model.position.set(-((box.min.x + box.max.x) / 2) * s, -box.min.y * s, -((box.min.z + box.max.z) / 2) * s);
  const holder = new THREE.Group();
  holder.add(model);
  holder.userData.height = dim.y * s;
  return holder;
}

/**
 * Adds the detailed food for this dish on top of a plate whose top is at `plateTop`.
 * Returns false (adds nothing) when the dish has no detailed model yet.
 */
export function addFoodModel(recipeId: RecipeId, group: THREE.Group, plateTop: number): boolean {
  if (!hasFoodModel(recipeId)) return false;
  const food = new THREE.Group();
  food.name = 'food';
  for (const p of DISHES[recipeId]!) {
    const m = fitted(p.file, p.size, p.h);
    m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    m.rotation.y = p.ry ?? 0;
    m.name = p.file;
    food.add(m);
  }
  food.position.y = plateTop;
  group.add(food);
  return true;
}

// ---------------------------------------------------------------------------
// Cooking steps
// ---------------------------------------------------------------------------

const STEP_OVERRIDES: Partial<Record<RecipeId, string[]>> = {
  burger: ['Pick up bun', 'Cook meat', 'Add cheese & veggies', 'Assemble burger', 'Plate it'],
};

/** The steps the player sees while a dish cooks (the last one is always plating). */
export function getCookSteps(recipeId: RecipeId): string[] {
  return STEP_OVERRIDES[recipeId] ?? [...RECIPES[recipeId].steps, 'Plate it'];
}

/** Where each step starts (0..1 of the cooking time). */
function stepStarts(n: number): number[] {
  if (n === 5) return [0, 0.12, 0.48, 0.7, 0.88];
  const body = n - 1;
  return [...Array.from({ length: body }, (_, i) => (i / body) * 0.88), 0.88];
}

export interface CookVisual {
  group: THREE.Group;
  steps: string[];
  /** Advance the look to progress `p` (0..1). */
  update(p: number): void;
  stepAt(p: number): number;
  dispose(): void;
}

const ease = (u: number) => 1 - Math.pow(1 - THREE.MathUtils.clamp(u, 0, 1), 3);
const pop = (u: number) => {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  return t >= 1 ? 1 : ease(t) + Math.sin(t * Math.PI) * 0.18;
};

/** Raw-to-cooked colour on a set of meshes (each visual gets its own material copies). */
class Tint {
  private mats: { mat: THREE.MeshStandardMaterial; color: THREE.Color; raw: THREE.Color }[] = [];
  constructor(
    roots: THREE.Object3D[],
    private glow: THREE.Color,
    rawMix: THREE.Color
  ) {
    const copies = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    for (const root of roots) {
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || Array.isArray(mesh.material)) return;
        const src = mesh.material as THREE.MeshStandardMaterial;
        let copy = copies.get(src);
        if (!copy) {
          copy = src.clone();
          copies.set(src, copy);
          this.mats.push({ mat: copy, color: src.color.clone(), raw: src.color.clone().multiply(rawMix) });
        }
        mesh.material = copy;
      });
    }
  }
  /** 0 = raw, 1 = fully cooked. */
  set(t: number) {
    const k = THREE.MathUtils.clamp(t, 0, 1);
    for (const m of this.mats) {
      m.mat.color.lerpColors(m.raw, m.color, k);
      m.mat.emissive.copy(this.glow);
      m.mat.emissiveIntensity = (1 - k) * 0.45;
    }
  }
  dispose() {
    this.mats.forEach((m) => m.mat.dispose());
  }
}

const MEAT = { glow: new THREE.Color('#ff7b7b'), mix: new THREE.Color(1, 0.72, 0.72) };
const DOUGH = { glow: new THREE.Color('#fff0d0'), mix: new THREE.Color(1, 0.93, 0.8) };

function findByName(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (o.name === name || o.name.startsWith(`${name}_`) || o.name.replace(/[0-9]+$/, '') === name) out.push(o);
  });
  return out;
}

/** A piece that appears at progress `at`: pops in and drops onto the stack. */
interface Appear {
  obj: THREE.Object3D;
  at: number;
  baseY: number;
  baseScale: THREE.Vector3;
  drop: number;
}

function appear(obj: THREE.Object3D, at: number, drop: number): Appear {
  return { obj, at, baseY: obj.position.y, baseScale: obj.scale.clone(), drop };
}

/**
 * Builds the dish as it looks while cooking on a machine. Pieces appear step by step
 * (bun → patty → cheese → top bun → plate, slices on a pizza, sushi pieces …), meat and
 * dough go from raw to cooked, and the plate arrives last.
 */
export function createCookVisual(recipeId: RecipeId, dish: THREE.Group, totalSeconds: number): CookVisual {
  dish.updateMatrixWorld(true);
  const steps = getCookSteps(recipeId);
  const starts = stepStarts(steps.length);
  const plate = dish.children[0];
  const foodParts = dish.children.slice(1);
  const food = dish.getObjectByName('food');
  const animDur = THREE.MathUtils.clamp(0.45 / Math.max(1, totalSeconds), 0.02, 0.12);
  const appears: Appear[] = [];
  const tints: { tint: Tint; from: number; to: number }[] = [];
  let grow: { objs: THREE.Object3D[]; scales: THREE.Vector3[] } | null = null;
  let rise: { obj: THREE.Object3D; baseY: number; depth: number; from: number; to: number } | null = null;
  const plateScale = plate.scale.clone();
  const height = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y || 0.1;

  const layered = (order: [string, number][], cookName: string, cookTo: number) => {
    for (const [name, at] of order) {
      for (const o of findByName(food!, name)) appears.push(appear(o, at, height(o) * 3 + 0.02));
    }
    const meat = findByName(food!, cookName);
    if (meat.length) tints.push({ tint: new Tint(meat, MEAT.glow, MEAT.mix), from: order.find((e) => e[0] === cookName)?.[1] ?? 0.12, to: cookTo });
  };

  if (food && recipeId === 'burger') {
    layered(
      [
        ['bun-bottom', 0.0],
        ['patty', 0.12],
        ['cheese', 0.48],
        ['salad', 0.58],
        ['tomato', 0.62],
        ['bun-top', 0.74],
      ],
      'patty',
      0.46
    );
  } else if (food && recipeId === 'sandwich') {
    const buns = findByName(food, 'bun');
    if (buns[0]) appears.push(appear(buns[0], 0, 0.06));
    for (const o of findByName(food, 'meat')) appears.push(appear(o, 0.25, 0.08));
    for (const o of findByName(food, 'lettuce')) appears.push(appear(o, 0.45, 0.08));
    if (buns[1]) appears.push(appear(buns[1], 0.64, 0.1));
  } else if (food && recipeId === 'pizza') {
    const slices = Array.from({ length: 8 }, (_, i) => findByName(food, `slice${i + 1}`)[0]).filter(Boolean);
    slices.forEach((s, i) => appears.push(appear(s, (i / slices.length) * 0.36, 0.05)));
    tints.push({ tint: new Tint(slices, DOUGH.glow, DOUGH.mix), from: 0.38, to: 0.86 });
  } else if (food && recipeId === 'fries') {
    // The carton mesh comes first; the fries are its child and rise out of it
    const meshes = findByName(food, 'fries').filter((o) => (o as THREE.Mesh).isMesh);
    const [carton, inner] = meshes;
    if (carton) appears.push(appear(carton, 0, 0.05));
    if (inner) {
      const local = height(inner) / Math.max(1e-3, inner.getWorldScale(new THREE.Vector3()).y);
      rise = { obj: inner, baseY: inner.position.y, depth: local * 0.75, from: 0.15, to: 0.82 };
    }
  } else if (food && recipeId === 'steak') {
    // Raw pink steak sears to brown
    tints.push({ tint: new Tint([food], MEAT.glow, MEAT.mix), from: 0.05, to: 0.75 });
  } else if (food && food.children.length > 1) {
    // Several pieces (sushi, gyoza, tacos, kebabs, mochi): one at a time
    const pieces = food.children.filter((c) => c.name !== 'chopstick');
    pieces.forEach((c, i) => appears.push(appear(c, 0.04 + (i / pieces.length) * 0.6, 0.08)));
    for (const c of food.children.filter((c2) => c2.name === 'chopstick')) appears.push(appear(c, 0.8, 0.1));
    if (recipeId === 'lula_kebab') tints.push({ tint: new Tint(pieces, MEAT.glow, MEAT.mix), from: 0.3, to: 0.8 });
  } else {
    // Any other dish: the food grows in and goes from raw to cooked
    grow = { objs: foodParts, scales: foodParts.map((o) => o.scale.clone()) };
    // Only hot machines brown the food; salads, drinks and desserts just come together
    const hot = ['grill', 'fryer', 'oven'].includes(RECIPES[recipeId].station) && !RECIPES[recipeId].recipeLine;
    if (hot) tints.push({ tint: new Tint(foodParts, DOUGH.glow, DOUGH.mix), from: 0.15, to: 0.8 });
  }

  const update = (p: number) => {
    // Plate slides in for the last step
    const plateAt = starts[starts.length - 1];
    const pu = (p - plateAt) / animDur;
    plate.visible = pu > 0;
    plate.scale.copy(plateScale).multiplyScalar(Math.max(0.001, pop(pu)));
    const lift = plate.visible ? ease(pu) : 0;
    for (const f of foodParts) f.position.y = (f.userData.restY ??= f.position.y) - 0.045 * (1 - lift);

    for (const a of appears) {
      const u = (p - a.at) / animDur;
      a.obj.visible = u >= 0;
      if (!a.obj.visible) continue;
      const k = Math.max(0.001, pop(u));
      a.obj.scale.copy(a.baseScale).multiplyScalar(Math.min(1.15, k));
      a.obj.position.y = a.baseY + (1 - ease(u)) * a.drop / Math.max(1e-3, a.obj.parent?.getWorldScale(_v).y ?? 1);
    }
    for (const t of tints) t.tint.set((p - t.from) / Math.max(0.01, t.to - t.from));
    if (grow) {
      const g = 0.45 + 0.55 * ease(p / 0.6);
      grow.objs.forEach((o, i) => o.scale.copy(grow!.scales[i]).multiplyScalar(g));
    }
    if (rise) {
      const u = ease((p - rise.from) / (rise.to - rise.from));
      rise.obj.position.y = rise.baseY - (1 - u) * rise.depth;
      rise.obj.visible = p >= rise.from;
    }
  };

  const stepAt = (p: number) => {
    let i = 0;
    for (let s = 0; s < starts.length; s++) if (p >= starts[s]) i = s;
    return i;
  };

  update(0);
  return {
    group: dish,
    steps,
    update,
    stepAt,
    dispose: () => tints.forEach((t) => t.tint.dispose()),
  };
}

const _v = new THREE.Vector3();
