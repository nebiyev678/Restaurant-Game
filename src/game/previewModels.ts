/**
 * Builds a standalone 3D model for any purchasable / selectable item so menus can
 * show it visually. Everything reuses the same procedural builders the game world
 * uses, so the picture always matches what appears in the 3D city.
 */
import * as THREE from 'three';
import {
  CAFE_THEMES,
  CITY_ZONES,
  CLOTHING_CATALOG,
  FRANCHISE_CATALOG,
  HOUSE_CATALOG,
  RECIPE_LIST,
  RECIPES,
  VEHICLE_CATALOG,
} from './data';
import {
  applyPlayerClothes,
  createCharacterModel,
  createCheckerTexture,
  createDiningTableMesh,
  createDishMesh,
  createEntranceArchwayMesh,
  createHouseStructure,
  createKitchenStationMesh,
  createPendantLampMesh,
  createPottedPlantMesh,
  createRegisterStationMesh,
  createShopBuildingMesh,
  createVehicleMesh,
  createWoodTexture,
  getStaffAppearance,
} from './models';
import { createGableRoofMesh } from './oldTown';
import { createDecorMesh } from './decorModels';
import type { DecorItemId } from './decor';
import type { ShotOptions } from './previewStudio';

/** Badge colours behind dish icons, one per machine (warm for hot food, cool for drinks). */
const FOOD_BADGES: Record<StationType, [string, string]> = {
  grill: ['#fff0dc', '#ff9b54'],
  fryer: ['#fffbe0', '#ffc531'],
  oven: ['#ffe6df', '#ff7461'],
  prep: ['#eefbe3', '#78cc5f'],
  bar: ['#e6f7ff', '#4fb3ee'],
  specialty: ['#ffecf6', '#f27fbf'],
};
import type { RecipeId, SpecialtyLineId, StaffRole, StationType } from './types';

export type PreviewKind =
  | 'vehicle'
  | 'clothing'
  | 'house'
  | 'furniture'
  | 'recipe'
  | 'line'
  | 'staff'
  | 'equipment'
  | 'franchise'
  | 'theme'
  | 'zone'
  | 'decor';

/** The player's base look (matches the in-game chef). */
const PLAYER_LOOK = {
  shirtColor: '#f5efe6',
  pantsColor: '#463b38',
  apronColor: '#dc2626',
  shoeColor: '#dc2626',
  trimColor: '#dc2626',
  hairColor: '#5a3826',
  hasTowel: true,
  apronStyle: 'bib' as const,
};

const FRANCHISE_COLORS = ['#be185d', '#1d4ed8', '#15803d', '#a16207', '#7c3aed'];

function clothing(id: string) {
  return CLOTHING_CATALOG.find((c) => c.id === id) ?? CLOTHING_CATALOG[0];
}

/** Player chef wearing a specific outfit / hat / watch combination. */
export function buildDressedChef(outfitId: string, hatId: string, watchId: string): THREE.Object3D {
  const parts = createCharacterModel(PLAYER_LOOK);
  applyPlayerClothes(parts, clothing(outfitId), clothing(hatId), clothing(watchId));
  // A relaxed pose with the watch arm slightly forward so accessories are visible
  parts.leftArm.rotation.x = -0.35;
  parts.leftArm.rotation.z = 0.12;
  parts.rightArm.rotation.z = -0.08;
  return parts.root;
}

/** A close-up wristwatch model for watch thumbnails. */
function buildWatch(color: string | undefined): THREE.Object3D {
  const g = new THREE.Group();
  const strapColor = color ? '#3b2a20' : '#d6b49a';
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.07, 10, 40),
    new THREE.MeshStandardMaterial({ color: strapColor, roughness: 0.7 })
  );
  band.scale.set(1, 1, 1.6);
  g.add(band);
  if (color) {
    const metal = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.22 });
    const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 32), metal);
    caseMesh.rotation.x = Math.PI / 2;
    caseMesh.position.z = 0.4;
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.165, 32),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
    );
    face.position.z = 0.447;
    const handMat = new THREE.MeshStandardMaterial({ color: '#111827' });
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.005), handMat);
    hourHand.position.set(0.02, 0.035, 0.452);
    hourHand.rotation.z = -0.6;
    const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.005), handMat);
    minHand.position.set(-0.03, 0.05, 0.452);
    minHand.rotation.z = 0.5;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), metal);
    crown.rotation.z = Math.PI / 2;
    crown.position.set(0.22, 0, 0.4);
    g.add(caseMesh, face, hourHand, minHand, crown);
  }
  return g;
}

/** Extracts one furniture piece from the house builder (it appends owned pieces last). */
function buildFurniture(id: string): THREE.Object3D {
  const studio = HOUSE_CATALOG[0];
  const baseCount = createHouseStructure(studio, []).children.length;
  const withPiece = createHouseStructure(studio, [id]);
  const g = new THREE.Group();
  withPiece.children.slice(baseCount).forEach((child) => g.add(child));
  // Small floor rug so the piece doesn't float in the thumbnail
  const box = new THREE.Box3().setFromObject(g);
  const center = box.getCenter(new THREE.Vector3());
  g.children.forEach((c) => c.position.sub(new THREE.Vector3(center.x, 0, center.z)));
  const size = box.getSize(new THREE.Vector3());
  const rug = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(size.x, size.z) * 0.62, Math.max(size.x, size.z) * 0.62, 0.03, 32),
    new THREE.MeshStandardMaterial({ color: '#e7dccb', roughness: 0.95 })
  );
  rug.position.y = box.min.y - 0.015;
  g.add(rug);
  return g;
}

/** Miniature corner of a dining room styled with a cafe theme. */
function buildThemeDiorama(themeId: string): THREE.Object3D {
  const theme = CAFE_THEMES.find((t) => t.id === themeId) ?? CAFE_THEMES[0];
  const g = new THREE.Group();
  const floorTex =
    theme.floorMode === 'wood'
      ? createWoodTexture(theme.floorPrimary, theme.floorSecondary, 2)
      : createCheckerTexture(theme.floorPrimary, theme.floorSecondary, 4);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.12, 3.4),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 })
  );
  floor.position.y = -0.06;
  g.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: theme.wallColor, roughness: 0.85 });
  const wainMat = new THREE.MeshStandardMaterial({ color: theme.wainscotColor, roughness: 0.6 });
  const trimMat = new THREE.MeshStandardMaterial({ color: theme.trimColor, roughness: 0.4, metalness: 0.2 });
  for (const [w, x, z, ry] of [
    [3.4, 0, -1.65, 0],
    [3.4, -1.65, 0, Math.PI / 2],
  ] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.6, 0.1), wallMat);
    wall.position.set(x, 1.3, z);
    wall.rotation.y = ry;
    const wain = new THREE.Mesh(new THREE.BoxGeometry(w, 0.95, 0.14), wainMat);
    wain.position.set(x, 0.475, z);
    wain.rotation.y = ry;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.18), trimMat);
    trim.position.set(x, 0.97, z);
    trim.rotation.y = ry;
    g.add(wall, wain, trim);
  }
  const table = createDiningTableMesh(false, theme).group;
  table.position.set(0.25, 0, 0.2);
  g.add(table);
  const lamp = createPendantLampMesh(theme.lightColor);
  lamp.position.set(0.25, 2.55, 0.2);
  g.add(lamp);
  const plant = createPottedPlantMesh(theme.blossomColor);
  plant.position.set(-1.15, 0, -1.15);
  g.add(plant);
  return g;
}

function buildShop(name: string, color: string): THREE.Object3D {
  const shop = createShopBuildingMesh(name, color, '#f1e4cf');
  const roof = createGableRoofMesh(7.3, 5.7, 1.7, '#b4532a');
  roof.position.y = 3.46;
  shop.add(roof);
  return shop;
}

export function buildPreviewModel(kind: PreviewKind, id: string): THREE.Object3D {
  switch (kind) {
    case 'vehicle': {
      const def = VEHICLE_CATALOG.find((v) => v.id === id) ?? VEHICLE_CATALOG[0];
      return createVehicleMesh(def).group;
    }
    case 'clothing': {
      const item = clothing(id);
      if (item.slot === 'watch') return buildWatch(item.watchColor);
      if (item.slot === 'hat') return buildDressedChef('outfit_starter', item.id, 'watch_none');
      return buildDressedChef(item.id, 'hat_none', 'watch_none');
    }
    case 'house': {
      const def = HOUSE_CATALOG.find((h) => h.id === id) ?? HOUSE_CATALOG[0];
      return createHouseStructure(def, []);
    }
    case 'furniture':
      return buildFurniture(id);
    case 'decor':
      return createDecorMesh(id as DecorItemId);
    case 'recipe': {
      // Frame the icon on the food: the plate may run off the edge of the badge
      const dish = createDishMesh(id as RecipeId);
      const food = dish.children.slice(1).filter((c) => (c as THREE.Mesh).isMesh || c.children.length);
      if (food.length) dish.userData.frameOn = food;
      // A slightly smaller plate lets more of the colourful badge show around it
      dish.children[0]?.scale.multiplyScalar(0.8);
      return dish;
    }
    case 'line': {
      const first = RECIPE_LIST.find((r) => r.recipeLine === (id as SpecialtyLineId));
      return createDishMesh(first?.id ?? 'dessert');
    }
    case 'staff':
      return createCharacterModel(getStaffAppearance(id as StaffRole)).root;
    case 'equipment': {
      if (id === 'register') return createRegisterStationMesh();
      if (id === 'decor') {
        const g = new THREE.Group();
        g.add(createDiningTableMesh(true).group);
        const plant = createPottedPlantMesh('#dc2626');
        plant.position.set(1.5, 0, -0.6);
        g.add(plant);
        return g;
      }
      // "grill@4" shows the machine's look at that upgrade level
      const [type, lv] = id.split('@');
      return createKitchenStationMesh(type as StationType, Number(lv) || 1);
    }
    case 'franchise': {
      const idx = Math.max(0, FRANCHISE_CATALOG.findIndex((f) => f.id === id));
      const fr = FRANCHISE_CATALOG[idx];
      return buildShop(fr?.name ?? 'Franchise', FRANCHISE_COLORS[idx % FRANCHISE_COLORS.length]);
    }
    case 'theme':
      return buildThemeDiorama(id);
    case 'zone': {
      const zone = CITY_ZONES.find((z) => z.id === id);
      if (id === 'home') return createHouseStructure(HOUSE_CATALOG[0], []);
      if (id === 'restaurant') return createEntranceArchwayMesh('#dc2626', '#7c2d12');
      return buildShop(zone?.name ?? 'Shop', zone?.color ?? '#64748b');
    }
  }
}

/** Camera framing per item kind. */
export function previewShot(kind: PreviewKind, id: string): ShotOptions {
  switch (kind) {
    case 'vehicle':
      return { yaw: 0.85, pitch: 0.32, padding: 0.88 };
    case 'clothing': {
      const slot = clothing(id).slot;
      if (slot === 'watch') return { yaw: 0.25, pitch: 0.35, padding: 0.9 };
      if (slot === 'hat') return { yaw: 0.45, pitch: 0.18, focus: 'head', padding: 0.95 };
      return { yaw: 0.45, pitch: 0.12, padding: 0.86 };
    }
    case 'house':
    case 'zone':
      return { yaw: 0.6, pitch: 0.55, padding: 0.86 };
    case 'recipe':
    case 'line': {
      // Food icons: a bit lower so the food's height shows, zoomed in, on a colour badge per machine
      const recipe = kind === 'recipe' ? RECIPES[id as RecipeId] : RECIPE_LIST.find((r) => r.recipeLine === (id as SpecialtyLineId));
      return { yaw: 0.5, pitch: 0.55, padding: 1.12, backdrop: FOOD_BADGES[recipe?.station ?? 'prep'] };
    }
    case 'staff':
      return { yaw: 0.35, pitch: 0.12, padding: 0.86 };
    case 'theme':
      return { yaw: 0.78, pitch: 0.42, padding: 0.82 };
    case 'franchise':
      return { yaw: 0.55, pitch: 0.3, padding: 0.86 };
    case 'decor':
      return { yaw: 0.6, pitch: 0.5, padding: 0.88 };
    default:
      return { yaw: 0.65, pitch: 0.38, padding: 0.9 };
  }
}

export function previewKey(kind: PreviewKind, id: string) {
  return `${kind}:${id}`;
}

/** The player's home with their owned furniture, for the housing showroom. */
export function buildHomePreview(houseId: string, ownedFurniture: string[]): THREE.Object3D {
  const def = HOUSE_CATALOG.find((h) => h.id === houseId) ?? HOUSE_CATALOG[0];
  return createHouseStructure(def, ownedFurniture);
}
