/**
 * Cozy European old-town exterior: cobbled streets, a fan-paved piazza, a fountain
 * roundabout, cast-iron lanterns with night light pools, plane trees, benches,
 * planters, bollards, a gabled-house skyline with lit windows, and the
 * restaurant's street terrace.
 *
 * Repeated props use InstancedMesh so the whole street costs a handful of draw
 * calls, which keeps mid-range Android phones smooth.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WorldCollider } from './npcPhysics';
import { PARKING } from './parking';

// ---------------------------------------------------------------------------
// Layout (world units = metres). Kept in one place so gameplay code can share it.
// ---------------------------------------------------------------------------
export const OLD_TOWN = {
  roundabout: { x: 17.5, z: 0, roadR: 5.2, islandR: 2.4 },
  /** East avenue between the roundabout and the home courtyard. */
  eastRoad: { minX: 21.0, maxX: 31.5, halfW: 3.2 },
  /** North/South avenue (x = 17.5). */
  nsRoad: { x: 17.5, halfW: 2.8, inner: 3.0, outer: 18 },
  /** Pedestrian piazza in front of the restaurant entrance (customers walk here). */
  piazza: { minX: 2.6, maxX: 12.2, minZ: -8.4, maxZ: 8.4 },
  /** Brick courtyard in front of the player's home. */
  courtyard: { minX: 31.5, maxX: 48.5, minZ: -3.6, maxZ: 3.6 },
  /** Where the player's car is parked at game start (parallel bay on the east avenue). */
  carSpawn: { x: 27.3, z: 4.55 },
} as const;

/** Where a car lands when the player fast-travels while driving (always on a road / open paving). */
export const CAR_TRAVEL_SPOTS: Record<string, { x: number; z: number }> = {
  restaurant: { x: 13.4, z: 0 },
  clothing: { x: 16.2, z: -8.5 },
  supermarket: { x: 16.2, z: 8.5 },
  dealership: { x: 18.8, z: -8.5 },
  bank: { x: 18.8, z: 8.5 },
  home: { x: 33.5, z: 0 },
  foodstreet: { x: 17.5, z: -30 },
  townsquare: { x: 17.5, z: -47 },
  park: { x: 17.5, z: 20 },
};

/** Walkable / drivable extent of the whole town. */
export const TOWN_BOUNDS = { minX: -27.4, maxX: 60, minZ: -64, maxZ: 53 } as const;

/** Food Street: the north avenue and its four restaurant plots (your earlier restaurants move here). */
export const FOOD_STREET = {
  road: { x: 17.5, halfW: 2.8, minZ: -50, maxZ: -18 },
  /** Plot centres; `yaw` turns the shop front (+z) to face the avenue. */
  plots: [
    { x: 9.35, z: -27.5, yaw: Math.PI / 2 },
    { x: 25.65, z: -27.5, yaw: -Math.PI / 2 },
    { x: 9.35, z: -40.5, yaw: Math.PI / 2 },
    { x: 25.65, z: -40.5, yaw: -Math.PI / 2 },
  ],
  plotWidth: 7.8,
  plotDepth: 6.4,
  square: { minX: 5, maxX: 30, minZ: -63, maxZ: -50 },
  clockTower: { x: 17.5, z: -60.2 },
} as const;

/** Outdoor Terrace expansion: guest table x positions (relative to the restaurant front) and terrace depth. */
export const TERRACE_TABLE_X = [1.7, 4.3] as const;
export const TERRACE_TABLE_Z = 5.25;
export const TERRACE_OPEN_X_OUT = 5.8;

/** Riverside park south of the customer parking street. */
export const TOWN_PARK = {
  pond: { x: 31, z: 39, rx: 6.5, rz: 4.2 },
  gazebo: { x: 5, z: 38 },
} as const;

/** Canal west of the restaurant, crossed by two footbridges. */
export const TOWN_CANAL = { minX: -24, maxX: -19.6, minZ: -63, maxZ: 52, bridges: [0, -35], bridgeHalf: 1.6 } as const;

const EXTRA_TREES: [number, number][] = [
  // Food Street & square
  [13.2, -22.5], [21.8, -22.5], [13.2, -34], [21.8, -34], [13.2, -46.5], [21.8, -46.5],
  [6.4, -51.6], [28.6, -51.6], [6.2, -62], [28.8, -62],
  // Lawn between the canal and Food Street
  [-12, -22], [-6, -27], [-13, -33], [-4, -40], [-11, -46], [-3, -54], [-12, -58],
  // Park
  [-5, 27.5], [2, 32], [-4, 44], [10, 45.5], [13.5, 33], [22, 46.5], [25, 30.5], [40, 31], [44, 44.5], [38, 48],
  [47, 27.5], [-6, 50], [6, 50.5], [52, 36],
  // Canal promenade
  [-17.2, -12], [-17.2, -26], [-17.2, -44], [-17.2, 28], [-17.2, 42], [-26.2, -18], [-26.2, 14], [-26.2, 34],
];

const EXTRA_LANTERNS: [number, number][] = [
  [13.6, -24.6], [21.4, -24.6], [13.6, -37.2], [21.4, -37.2], [13.6, -48.6], [21.4, -48.6],
  [5.6, -56.5], [29.4, -56.5],
  [17.5, 26.6], [5.5, 30.4], [29.5, 30.4], [43, 30.4], [-3, 30.4],
  [-17.4, -3.2], [-17.4, 3.2], [-26.2, -3.2], [-26.2, 3.2], [-17.4, -32], [-26.2, -38],
];

const EXTRA_BENCHES: [number, number, number][] = [
  [12.4, -53.2, 0], [22.6, -53.2, 0],
  [10, 29, Math.PI], [24.5, 29, Math.PI], [36, 29, Math.PI],
  [31, 33.9, Math.PI], [31, 44.2, 0],
  [-17.3, -7, Math.PI / 2], [-17.3, 8, Math.PI / 2],
];

// ---------------------------------------------------------------------------
// Procedural canvas textures
// ---------------------------------------------------------------------------
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function finishTexture(canvas: HTMLCanvasElement, aniso: number, repeatX = 1, repeatY = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = aniso;
  return tex;
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Grey-brown granite setts in staggered rows (one tile ≈ 2 m). */
function createSettsTexture(aniso: number) {
  const { c, ctx } = makeCanvas(256, 256);
  const rnd = seeded(11);
  ctx.fillStyle = '#4a4540';
  ctx.fillRect(0, 0, 256, 256);
  const rows = 9;
  const rh = 256 / rows;
  const tones = ['#7c7469', '#8a8176', '#6f675e', '#948a7d', '#857b6f', '#5f5852'];
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -14 : 0;
    while (x < 256) {
      const w = 24 + rnd() * 14;
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      roundRect(ctx, x + 1.5, r * rh + 1.5, w - 3, rh - 3, 4);
      ctx.fill();
      // soft highlight on the top edge of each stone
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x + 4, r * rh + 3, w - 8, 2);
      x += w;
    }
  }
  return finishTexture(c, aniso);
}

/** Warm-grey asphalt with fine aggregate, a few darker repair patches and hairline cracks (one tile ≈ 4 m). */
function createAsphaltTexture(aniso: number) {
  const { c, ctx } = makeCanvas(512, 512);
  const rnd = seeded(23);
  ctx.fillStyle = '#55555a';
  ctx.fillRect(0, 0, 512, 512);
  // Large soft tonal variation
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 40 + rnd() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.5;
    g.addColorStop(0, dark ? 'rgba(40,40,44,0.18)' : 'rgba(120,118,112,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Aggregate speckle
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    ctx.fillStyle = v < 0.5 ? `rgba(30,30,34,${0.25 + rnd() * 0.3})` : `rgba(160,156,148,${0.18 + rnd() * 0.25})`;
    const sz = rnd() < 0.85 ? 1 : 2;
    ctx.fillRect(rnd() * 512, rnd() * 512, sz, sz);
  }
  // Repair patches
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(38,38,42,0.35)';
    const w = 50 + rnd() * 80;
    const h = 30 + rnd() * 50;
    roundRect(ctx, rnd() * (512 - w), rnd() * (512 - h), w, h, 6);
    ctx.fill();
  }
  // Hairline cracks
  ctx.strokeStyle = 'rgba(25,25,28,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    let x = rnd() * 512;
    let y = rnd() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (rnd() - 0.5) * 40;
      y += (rnd() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finishTexture(c, aniso);
}

/** Classic fan / scallop cobble pattern ("Bogenpflaster") for the piazza (one tile ≈ 2.4 m). */
function createFanCobbleTexture(aniso: number) {
  const S = 512;
  const { c, ctx } = makeCanvas(S, S);
  const rnd = seeded(23);
  ctx.fillStyle = '#6b5f52';
  ctx.fillRect(0, 0, S, S);
  const R = 128;
  const tones = ['#b8a58c', '#a8957d', '#c4b49c', '#9d8a73', '#b0a088', '#cbbba2'];
  for (let row = -1; row <= 4; row++) {
    for (let col = -1; col <= 2; col++) {
      const cx = col * 2 * R + (row % 2 ? R : 0);
      const cy = row * R;
      for (let ring = R - 6; ring > 10; ring -= 13) {
        const stone = 13;
        const steps = Math.max(4, Math.floor((Math.PI * ring) / stone));
        for (let i = 0; i < steps; i++) {
          const a = Math.PI + (i + 0.5) * (Math.PI / steps);
          const x = cx + Math.cos(a) * ring;
          const y = cy - Math.sin(a) * ring + R;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
          roundRect(ctx, -stone / 2 + 1, -5.5, stone - 2, 11, 3);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
  return finishTexture(c, aniso);
}

/** Warm sandstone sidewalk slabs (one tile ≈ 3 m). */
function createSandstoneTexture(aniso: number) {
  const { c, ctx } = makeCanvas(256, 256);
  const rnd = seeded(5);
  ctx.fillStyle = '#a99779';
  ctx.fillRect(0, 0, 256, 256);
  const tones = ['#dccbab', '#d4c19f', '#e3d4b6', '#cfbb98', '#d9c6a3'];
  const rowH = [70, 56, 74, 56];
  let y = 0;
  rowH.forEach((h, r) => {
    let x = r % 2 ? -40 : 0;
    while (x < 256) {
      const w = 60 + rnd() * 50;
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      for (let k = 0; k < 18; k++) {
        ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(90,70,40,0.07)';
        ctx.fillRect(x + 4 + rnd() * (w - 10), y + 4 + rnd() * (h - 10), 3, 3);
      }
      x += w;
    }
    y += h;
  });
  return finishTexture(c, aniso);
}

/** Red brick herringbone for the home courtyard (one tile ≈ 1.6 m). */
function createHerringboneTexture(aniso: number) {
  const { c, ctx } = makeCanvas(256, 256);
  const rnd = seeded(41);
  ctx.fillStyle = '#6e4a3a';
  ctx.fillRect(0, 0, 256, 256);
  const tones = ['#b5654a', '#a85a41', '#c0715a', '#9c5039', '#b86b4f'];
  const L = 64;
  const W = 32;
  for (let i = -8; i < 16; i++) {
    for (let j = -8; j < 16; j++) {
      const bx = i * W + j * W;
      const by = j * W - i * W;
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.fillRect(bx + 2, by + 2, L - 4, W - 4);
      ctx.fillStyle = tones[Math.floor(rnd() * tones.length)];
      ctx.fillRect(bx + L - W + 2, by + W + 2, W - 4, L - 4);
    }
  }
  return finishTexture(c, aniso);
}

/** Soft warm radial glow used for lantern light pools on the ground. */
function createGlowTexture() {
  const { c, ctx } = makeCanvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,140,1)');
  g.addColorStop(0.45, 'rgba(255,190,110,0.45)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Old-town facade: shuttered windows and a door on a transparent background (+ lit-window map). */
function createFacadeTextures() {
  const S = 256;
  const base = makeCanvas(S, S);
  const lit = makeCanvas(S, S);
  const rnd = seeded(77);
  lit.ctx.fillStyle = '#000';
  lit.ctx.fillRect(0, 0, S, S);
  const cols = 3;
  const rows = 3;
  const cw = S / cols;
  const rh = S / (rows + 0.6);
  for (let r = 0; r < rows; r++) {
    for (let cIdx = 0; cIdx < cols; cIdx++) {
      const isDoor = r === rows - 1 && cIdx === 1;
      const ww = cw * 0.42;
      const wh = isDoor ? rh * 1.05 : rh * 0.58;
      const x = cIdx * cw + (cw - ww) / 2;
      const y = r * rh + rh * 0.3 + (isDoor ? rh * 0.15 : 0);
      const { ctx } = base;
      // stone frame
      ctx.fillStyle = '#efe6d6';
      ctx.fillRect(x - 4, y - 4, ww + 8, wh + 8);
      // glass / door
      ctx.fillStyle = isDoor ? '#5b3a29' : '#3b4a5a';
      ctx.fillRect(x, y, ww, wh);
      if (!isDoor) {
        ctx.fillStyle = '#efe6d6';
        ctx.fillRect(x + ww / 2 - 1.5, y, 3, wh);
        ctx.fillRect(x, y + wh / 2 - 1.5, ww, 3);
        // green shutters
        ctx.fillStyle = '#3f6b4f';
        ctx.fillRect(x - 4 - ww * 0.38, y, ww * 0.34, wh);
        ctx.fillRect(x + ww + 4 + ww * 0.04, y, ww * 0.34, wh);
        // flower box on the lower rows
        if (r > 0) {
          ctx.fillStyle = '#7a4a2e';
          ctx.fillRect(x - 3, y + wh + 2, ww + 6, 6);
          for (let f = 0; f < 5; f++) {
            ctx.fillStyle = ['#e11d48', '#f59e0b', '#f472b6'][f % 3];
            ctx.beginPath();
            ctx.arc(x + 2 + f * (ww / 4), y + wh, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (rnd() < 0.55) {
          lit.ctx.fillStyle = rnd() < 0.5 ? '#ffd38a' : '#ffbf66';
          lit.ctx.fillRect(x, y, ww, wh);
        }
      }
    }
  }
  const map = new THREE.CanvasTexture(base.c);
  map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(lit.c);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

/** Alternating stripes for umbrella canopies. */
function createStripeTexture(colorA: string, colorB: string) {
  const { c, ctx } = makeCanvas(128, 4);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? colorB : colorA;
    ctx.fillRect(i * 16, 0, 16, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Shared geometry helpers
// ---------------------------------------------------------------------------
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _col = new THREE.Color();

function compose(x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1) {
  _q.setFromAxisAngle(_yAxis, rotY);
  return _m4.compose(_pos.set(x, y, z), _q, _scl.set(sx, sy, sz));
}

/** Unit triangular prism: base 1 wide (x), 1 deep (z), 1 tall, ridge along X, base at y = 0. */
function createUnitGableGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  geo.translate(0, 0, -0.5);
  geo.rotateY(Math.PI / 2); // triangle now spans z, ridge along x
  return geo;
}

/** Pitched terracotta roof for a single building (ridge along local X). */
export function createGableRoofMesh(width: number, depth: number, height: number, color = '#b4532a') {
  const roof = new THREE.Mesh(
    createUnitGableGeometry(),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78 })
  );
  roof.scale.set(width, height, depth);
  roof.castShadow = true;
  return roof;
}

function flatPlane(width: number, depth: number, mat: THREE.Material, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

function textured(base: THREE.Texture, repeatX: number, repeatY: number) {
  const t = base.clone();
  t.repeat.set(repeatX, repeatY);
  t.needsUpdate = true;
  return t;
}


/** Roman-numeral clock face for the town-square tower. */
function createClockFaceTexture() {
  const { c, ctx } = makeCanvas(256, 256);
  ctx.fillStyle = '#fbf6ea';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2b2522';
  ctx.stroke();
  ctx.fillStyle = '#2b2522';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  numerals.forEach((n, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.fillText(n, 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92);
  });
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + 48, 128 - 28);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 - 12, 128 - 78);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 9, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Small low-poly duck that paddles around the park pond. */
function createDuck(bodyColor: string) {
  const duck = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 }));
  body.scale.set(1.3, 0.75, 0.9);
  body.position.y = 0.08;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 10, 8),
    new THREE.MeshStandardMaterial({ color: bodyColor === '#f8fafc' ? '#f8fafc' : '#166534', roughness: 0.5 })
  );
  head.position.set(0.2, 0.25, 0);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.5 }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.32, 0.24, 0);
  duck.add(body, head, beak);
  return duck;
}

// ---------------------------------------------------------------------------
// Old town exterior
// ---------------------------------------------------------------------------
export interface OldTownBuildResult {
  colliders: WorldCollider[];
  /** Lantern glass materials; the engine drives their emissive intensity with the day/night cycle. */
  lanternMats: THREE.MeshStandardMaterial[];
}

export class OldTownExterior {
  readonly group = new THREE.Group();
  private poolMat!: THREE.MeshBasicMaterial;
  private facadeMat!: THREE.MeshStandardMaterial;
  private fountainJet!: THREE.Mesh;
  private fountainWater!: THREE.Mesh;
  private night = 0;
  private time = 0;
  private clockMat: THREE.MeshStandardMaterial | null = null;
  private pondWater: THREE.Mesh | null = null;
  private ducks: THREE.Group[] = [];

  build(maxAniso: number): OldTownBuildResult {
    const colliders: WorldCollider[] = [];
    const lanternMats: THREE.MeshStandardMaterial[] = [];
    this.buildGround(maxAniso);
    this.buildCurbs();
    this.buildFountain(colliders);
    lanternMats.push(this.buildLanterns(colliders));
    this.buildTrees(colliders);
    this.buildBenches(colliders);
    this.buildPlantersAndBollards(colliders);
    this.buildParkingProps(colliders);
    this.buildNorthDistrict(colliders, maxAniso);
    this.buildPark(colliders, maxAniso);
    this.buildCanal(colliders, maxAniso);
    this.buildSkyline(colliders);
    return { colliders, lanternMats };
  }

  /** Called every frame. `nightTarget` is 0 (day) .. 1 (night). */
  update(dt: number, nightTarget: number) {
    this.time += dt;
    this.night = THREE.MathUtils.damp(this.night, nightTarget, 1.6, dt);
    if (this.poolMat) this.poolMat.opacity = 0.05 + this.night * 0.6;
    if (this.facadeMat) this.facadeMat.emissiveIntensity = this.night * 1.25;
    if (this.fountainJet) {
      const s = 1 + Math.sin(this.time * 3.1) * 0.06;
      this.fountainJet.scale.set(1, s, 1);
      (this.fountainWater.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.12 + Math.sin(this.time * 1.7) * 0.04 + this.night * 0.25;
    }
    // Clock faces glow after dark; ducks paddle lazy ellipses around the pond
    if (this.clockMat) this.clockMat.emissiveIntensity = this.night * 0.7;
    const P = TOWN_PARK.pond;
    this.ducks.forEach((duck, i) => {
      const a = this.time * (0.12 + i * 0.03) + i * 2.1;
      const r = 0.55 + i * 0.12;
      duck.position.set(P.x + Math.cos(a) * P.rx * r, 0.03 + Math.sin(this.time * 2 + i) * 0.01, P.z + Math.sin(a) * P.rz * r);
      duck.rotation.y = -a - Math.PI / 2;
    });
  }

  // -- Ground: sidewalks, piazza, roads, roundabout, courtyard, markings ------
  private buildGround(aniso: number) {
    const g = this.group;
    const { roundabout: rb, eastRoad, nsRoad, piazza, courtyard } = OLD_TOWN;

    // Sandstone sidewalk base across the whole district
    g.add(
      flatPlane(
        72,
        42,
        new THREE.MeshStandardMaterial({ map: textured(createSandstoneTexture(aniso), 24, 14), roughness: 0.9 }),
        14,
        0.008,
        0
      )
    );

    // Fan-cobbled piazza in front of the restaurant
    const pw = piazza.maxX - piazza.minX;
    const pd = piazza.maxZ - piazza.minZ;
    g.add(
      flatPlane(
        pw,
        pd,
        new THREE.MeshStandardMaterial({ map: textured(createFanCobbleTexture(aniso), pw / 2.4, pd / 2.4), roughness: 0.88 }),
        (piazza.minX + piazza.maxX) / 2,
        0.014,
        0
      )
    );

    // Asphalt roads (the parking lot keeps granite setts)
    const setts = createSettsTexture(aniso);
    const asphalt = createAsphaltTexture(aniso);
    const roadMat = (w: number, d: number) =>
      new THREE.MeshStandardMaterial({ map: textured(asphalt, w / 4, d / 4), roughness: 0.92 });
    const ewLen = eastRoad.maxX - eastRoad.minX;
    g.add(flatPlane(ewLen, eastRoad.halfW * 2, roadMat(ewLen, eastRoad.halfW * 2), (eastRoad.minX + eastRoad.maxX) / 2, 0.02, 0));
    const nsLen = nsRoad.outer - nsRoad.inner;
    for (const side of [-1, 1]) {
      g.add(
        flatPlane(nsRoad.halfW * 2, nsLen, roadMat(nsRoad.halfW * 2, nsLen), nsRoad.x, 0.02, side * (nsRoad.inner + nsLen / 2))
      );
    }

    // Roundabout ring (sits on top of the road ends)
    const ringTex = textured(asphalt, rb.roadR / 2, rb.roadR / 2);
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(rb.roadR, 48),
      new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.92 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rb.x, 0.024, rb.z);
    ring.receiveShadow = true;
    g.add(ring);

    // The avenue ends at the player's home: a dropped-kerb apron leads onto the home's front walk
    // (the old brick courtyard is replaced by the home's front yard, built with the house)
    void courtyard;
    g.add(
      flatPlane(
        0.5,
        3.2,
        new THREE.MeshStandardMaterial({ color: '#bdb6aa', roughness: 0.85 }),
        eastRoad.maxX + 0.25,
        0.021,
        0
      )
    );

    // Back street (customer cars) + restaurant parking lot
    const st = PARKING.street;
    const stLen = st.maxX - st.minX;
    const stDepth = st.maxZ - st.minZ;
    g.add(flatPlane(stLen, stDepth, roadMat(stLen, stDepth), (st.minX + st.maxX) / 2, 0.021, (st.minZ + st.maxZ) / 2));
    const lotMinX = PARKING.bays[0] - PARKING.bayWidth / 2 - 0.3;
    const lotMaxX = PARKING.bays[PARKING.bays.length - 1] + PARKING.bayWidth / 2 + 0.3;
    const lotDepth = PARKING.bayBackZ - PARKING.bayFrontZ + 0.2;
    g.add(
      flatPlane(
        lotMaxX - lotMinX,
        lotDepth,
        new THREE.MeshStandardMaterial({
          map: textured(setts, (lotMaxX - lotMinX) / 2, lotDepth / 2),
          color: '#d6d0c6',
          roughness: 0.88,
        }),
        (lotMinX + lotMaxX) / 2,
        0.019,
        (PARKING.bayFrontZ + PARKING.bayBackZ) / 2
      )
    );

    // Markings: crosswalks at the three road mouths and parallel parking bays
    const paint = new THREE.MeshStandardMaterial({ color: '#f1ede4', roughness: 0.7 });
    const stripeGeo = new THREE.PlaneGeometry(1, 1);
    stripeGeo.rotateX(-Math.PI / 2);
    const stripes: THREE.Matrix4[] = [];
    // East mouth: stripes run along x, stacked across the road (z)
    for (let z = -2.6; z <= 2.61; z += 0.75) stripes.push(compose(23.7, 0.032, z, 0, 1.3, 1, 0.38).clone());
    // North & south mouths: stripes run along z, stacked across the road (x)
    for (const side of [-1, 1]) {
      for (let x = nsRoad.x - 2.25; x <= nsRoad.x + 2.26; x += 0.75) {
        stripes.push(compose(x, 0.032, side * 6.4, 0, 0.38, 1, 1.3).clone());
      }
    }
    // Parking bays on the +z kerb of the east avenue
    const bayZ0 = 3.4;
    const bayZ1 = 5.7;
    stripes.push(compose(27.3, 0.032, bayZ1, 0, 7.8, 1, 0.08).clone());
    for (const x of [23.4, 26.0, 28.6, 31.2]) {
      stripes.push(compose(x, 0.032, (bayZ0 + bayZ1) / 2, 0, 0.08, 1, bayZ1 - bayZ0).clone());
    }
    // Restaurant lot: white bay lines + a dashed centre line on the back street
    const bayLen = PARKING.bayBackZ - PARKING.bayFrontZ;
    const bayMidZ = (PARKING.bayFrontZ + PARKING.bayBackZ) / 2;
    PARKING.bays.forEach((bx, i) => {
      if (i === 0) stripes.push(compose(bx - PARKING.bayWidth / 2, 0.033, bayMidZ, 0, 0.1, 1, bayLen).clone());
      stripes.push(compose(bx + PARKING.bayWidth / 2, 0.033, bayMidZ, 0, 0.1, 1, bayLen).clone());
    });
    for (let x = PARKING.street.minX + 1; x < PARKING.street.maxX - 1; x += 3) {
      if (x > 14.2 && x < 20.8) continue; // junction with the N/S avenue
      stripes.push(compose(x, 0.033, (PARKING.street.westLaneZ + PARKING.street.eastLaneZ) / 2, 0, 1.4, 1, 0.1).clone());
    }
    // Lane markings: dashed centre lines and solid edge lines on the avenues
    const ringMeetX = rb.x + Math.sqrt(rb.roadR ** 2 - eastRoad.halfW ** 2);
    for (let x = ringMeetX + 3.6; x < eastRoad.maxX - 1.2; x += 2.6) stripes.push(compose(x, 0.033, 0, 0, 1.3, 1, 0.12).clone());
    for (const zs of [-1, 1]) {
      const z = zs * (eastRoad.halfW - 0.28);
      const x0 = ringMeetX + 3.0;
      const x1 = eastRoad.maxX - 0.3;
      stripes.push(compose((x0 + x1) / 2, 0.033, z, 0, x1 - x0, 1, 0.09).clone());
    }
    for (const side of [-1, 1]) {
      for (let z = 8.2; z < nsRoad.outer - 0.5; z += 2.6) stripes.push(compose(nsRoad.x, 0.033, side * z, 0, 0.12, 1, 1.3).clone());
      for (const xs of [-1, 1]) {
        const z0 = 7.4;
        const z1 = nsRoad.outer;
        stripes.push(compose(nsRoad.x + xs * (nsRoad.halfW - 0.28), 0.033, side * ((z0 + z1) / 2), 0, 0.09, 1, z1 - z0).clone());
      }
    }
    // Give-way line where the avenues enter the roundabout
    stripes.push(compose(ringMeetX + 0.35, 0.034, -eastRoad.halfW / 2, 0, 0.14, 1, eastRoad.halfW - 0.2).clone());
    const marks = new THREE.InstancedMesh(stripeGeo, paint, stripes.length);
    stripes.forEach((m, i) => marks.setMatrixAt(i, m));
    marks.receiveShadow = true;
    g.add(marks);

    // Darker parking bay surface so the bays read clearly
    g.add(
      flatPlane(
        7.8,
        bayZ1 - bayZ0,
        new THREE.MeshStandardMaterial({ map: textured(setts, 3.9, 1.15), color: '#c9c2b8', roughness: 0.88 }),
        27.3,
        0.016,
        (bayZ0 + bayZ1) / 2
      )
    );
  }

  // -- Raised stone curbs (instanced) ------------------------------------------
  private buildCurbs() {
    const { roundabout: rb, eastRoad, nsRoad } = OLD_TOWN;
    const mats: THREE.Matrix4[] = [];
    const H = 0.09;
    const addLine = (x1: number, z1: number, x2: number, z2: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 1.0));
      const yaw = Math.atan2(-(z2 - z1), x2 - x1);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        mats.push(compose(x1 + (x2 - x1) * t, H / 2, z1 + (z2 - z1) * t, yaw, len / n - 0.02, 1, 1).clone());
      }
    };
    const addArc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
      const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / 0.6));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((i + 0.5) / n) * (a1 - a0);
        const seg = (Math.abs(a1 - a0) * r) / n;
        // segment tangent: rotate so its long side follows the circle
        mats.push(compose(cx + Math.cos(a) * r, H / 2, cz - Math.sin(a) * r, a + Math.PI / 2, seg + 0.02, 1, 1).clone());
      }
    };

    // East avenue kerbs (from where they meet the ring to the courtyard)
    const ringMeetX = rb.x + Math.sqrt(rb.roadR ** 2 - eastRoad.halfW ** 2);
    for (const s of [-1, 1]) addLine(ringMeetX, s * (eastRoad.halfW + 0.11), eastRoad.maxX, s * (eastRoad.halfW + 0.11));
    // Road end: kerb across the avenue, open in the middle where the dropped apron meets the home walk
    for (const s of [-1, 1]) addLine(eastRoad.maxX + 0.11, s * 1.6, eastRoad.maxX + 0.11, s * (eastRoad.halfW + 0.11));
    // N/S avenue kerbs
    const ringMeetZ = Math.sqrt(rb.roadR ** 2 - nsRoad.halfW ** 2);
    for (const s of [-1, 1]) {
      for (const xs of [-1, 1]) {
        const x = nsRoad.x + xs * (nsRoad.halfW + 0.11);
        addLine(x, s * ringMeetZ, x, s * nsRoad.outer);
      }
    }
    // Outer roundabout ring, broken at the east, north and south mouths
    const r = rb.roadR + 0.11;
    const eastGap = Math.asin(eastRoad.halfW / rb.roadR);
    const nsGap = Math.asin(nsRoad.halfW / rb.roadR);
    // angles measured counter-clockwise from +x in the x/(-z) plane
    addArc(rb.x, rb.z, r, eastGap, Math.PI / 2 - nsGap);
    addArc(rb.x, rb.z, r, Math.PI / 2 + nsGap, (3 * Math.PI) / 2 - nsGap);
    addArc(rb.x, rb.z, r, (3 * Math.PI) / 2 + nsGap, 2 * Math.PI - eastGap);
    // Island rim
    addArc(rb.x, rb.z, rb.islandR, 0, Math.PI * 2);

    // Back street kerbs (open where the lot and the N/S avenue join it)
    const stz = PARKING.street;
    addLine(stz.minX, stz.maxZ + 0.11, stz.maxX, stz.maxZ + 0.11);
    const lotEnd = PARKING.bays[PARKING.bays.length - 1] + PARKING.bayWidth / 2 + 0.3;
    addLine(lotEnd, stz.minZ - 0.11, nsRoad.x - nsRoad.halfW - 0.11, stz.minZ - 0.11);
    addLine(nsRoad.x + nsRoad.halfW + 0.11, stz.minZ - 0.11, stz.maxX, stz.minZ - 0.11);
    addLine(stz.minX - 0.11, stz.minZ, stz.minX - 0.11, stz.maxZ);

    const geo = new THREE.BoxGeometry(1, H, 0.22);
    const curbs = new THREE.InstancedMesh(
      geo,
      new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: 0.8 }),
      mats.length
    );
    mats.forEach((m, i) => curbs.setMatrixAt(i, m));
    curbs.castShadow = false;
    curbs.receiveShadow = true;
    this.group.add(curbs);
  }

  // -- Fountain on the roundabout island ---------------------------------------
  private buildFountain(colliders: WorldCollider[]) {
    const { roundabout: rb } = OLD_TOWN;
    const f = new THREE.Group();
    f.position.set(rb.x, 0, rb.z);
    const stone = new THREE.MeshStandardMaterial({ color: '#d8cfbf', roughness: 0.72 });
    const darkStone = new THREE.MeshStandardMaterial({ color: '#b9ad98', roughness: 0.78 });

    // Grass island with flowers
    const grassCanvas = makeCanvas(64, 64);
    grassCanvas.ctx.fillStyle = '#4f9a59';
    grassCanvas.ctx.fillRect(0, 0, 64, 64);
    const rnd = seeded(9);
    for (let i = 0; i < 220; i++) {
      grassCanvas.ctx.fillStyle = rnd() > 0.5 ? 'rgba(134,239,172,0.25)' : 'rgba(21,94,45,0.25)';
      grassCanvas.ctx.fillRect(rnd() * 64, rnd() * 64, 1.5, 3);
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas.c);
    grassTex.colorSpace = THREE.SRGBColorSpace;
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(3, 3);
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(rb.islandR, rb.islandR, 0.1, 40),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 })
    );
    island.position.y = 0.05;
    island.receiveShadow = true;
    f.add(island);

    // Ring of flowers around the basin (instanced)
    const flowerGeo = new THREE.IcosahedronGeometry(0.13, 0);
    const flowerColors = ['#e11d48', '#f59e0b', '#f472b6', '#fde047', '#a855f7'];
    const flowerCount = 36;
    const flowers = new THREE.InstancedMesh(
      flowerGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
      flowerCount
    );
    for (let i = 0; i < flowerCount; i++) {
      const a = (i / flowerCount) * Math.PI * 2;
      const rr = 1.95 + (i % 2) * 0.18;
      flowers.setMatrixAt(i, compose(Math.cos(a) * rr, 0.16, Math.sin(a) * rr, 0, 1, 0.8, 1));
      flowers.setColorAt(i, _col.set(flowerColors[i % flowerColors.length]));
    }
    f.add(flowers);

    // Basin, pedestal, upper bowl
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.5, 32, 1, true), stone);
    basin.position.y = 0.3;
    basin.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.09, 8, 40), darkStone);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.55;
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#5fb4d6',
      emissive: '#2a7fa8',
      emissiveIntensity: 0.12,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    this.fountainWater = new THREE.Mesh(new THREE.CircleGeometry(1.48, 32), waterMat);
    this.fountainWater.rotation.x = -Math.PI / 2;
    this.fountainWater.position.y = 0.46;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.25, 16), darkStone);
    pedestal.position.y = 0.95;
    pedestal.castShadow = true;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.25, 0.28, 24), stone);
    bowl.position.y = 1.62;
    bowl.castShadow = true;
    const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(0.68, 24), waterMat);
    bowlWater.rotation.x = -Math.PI / 2;
    bowlWater.position.y = 1.75;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), darkStone);
    finial.position.y = 1.92;
    // Water jet + falling curtain
    const jetMat = new THREE.MeshStandardMaterial({
      color: '#bfe8f7',
      emissive: '#7cc7e4',
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.55,
      roughness: 0.1,
      depthWrite: false,
    });
    this.fountainJet = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7, 10, 1, true), jetMat);
    this.fountainJet.geometry.translate(0, 0.35, 0);
    this.fountainJet.position.y = 1.96;
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 1.15, 24, 1, true), jetMat);
    curtain.position.y = 1.05;
    f.add(basin, rim, this.fountainWater, pedestal, bowl, bowlWater, finial, this.fountainJet, curtain);
    this.group.add(f);

    colliders.push({ kind: 'circle', x: rb.x, z: rb.z, r: rb.islandR + 0.1 });
  }

  // -- Cast-iron lanterns + ground light pools ----------------------------------
  private buildLanterns(colliders: WorldCollider[]): THREE.MeshStandardMaterial {
    const spots: [number, number][] = [
      ...EXTRA_LANTERNS,
      [11.9, 7.7],
      [11.9, -7.7],
      [13.3, 5.3],
      [13.3, -5.3],
      [21.7, 5.3],
      [21.7, -5.3],
      [25.0, 6.4],
      [31.0, 6.4],
      [28.5, -4.1],
      [34.0, 4.6],
      [42.0, 4.6],
    ];

    const iron = mergeGeometries([
      new THREE.CylinderGeometry(0.2, 0.26, 0.3, 10).translate(0, 0.15, 0), // plinth
      new THREE.CylinderGeometry(0.11, 0.13, 0.25, 10).translate(0, 0.42, 0), // collar
      new THREE.CylinderGeometry(0.055, 0.075, 2.7, 10).translate(0, 1.85, 0), // post
      new THREE.CylinderGeometry(0.16, 0.1, 0.12, 10).translate(0, 3.22, 0), // lantern seat
      new THREE.ConeGeometry(0.3, 0.32, 4).rotateY(Math.PI / 4).translate(0, 3.84, 0), // lantern cap
      new THREE.SphereGeometry(0.06, 8, 6).translate(0, 4.04, 0), // cap knob
    ])!;
    const ironMesh = new THREE.InstancedMesh(
      iron,
      new THREE.MeshStandardMaterial({ color: '#1f2421', metalness: 0.55, roughness: 0.45 }),
      spots.length
    );
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#fff1c4',
      emissive: '#ffb347',
      emissiveIntensity: 0.25,
      roughness: 0.3,
    });
    // Lantern housing: a tapered square glass box
    const glassGeo = new THREE.CylinderGeometry(0.26, 0.17, 0.42, 4).rotateY(Math.PI / 4).translate(0, 3.49, 0);
    const glass = new THREE.InstancedMesh(glassGeo, glassMat, spots.length);

    const poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.poolMat = new THREE.MeshBasicMaterial({
      map: createGlowTexture(),
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pools = new THREE.InstancedMesh(poolGeo, this.poolMat, spots.length);
    pools.renderOrder = 2;

    spots.forEach(([x, z], i) => {
      ironMesh.setMatrixAt(i, compose(x, 0, z));
      glass.setMatrixAt(i, compose(x, 0, z));
      pools.setMatrixAt(i, compose(x, 0.04, z, 0, 5.2, 1, 5.2));
      colliders.push({ kind: 'circle', x, z, r: 0.24 });
    });
    ironMesh.castShadow = true;
    this.group.add(ironMesh, glass, pools);
    return glassMat;
  }

  // -- Plane trees in iron grates (instanced) ----------------------------------
  private buildTrees(colliders: WorldCollider[]) {
    const spots: [number, number][] = [
      ...EXTRA_TREES,
      [27.0, 7.4],
      [35.5, 7.4],
      [40.5, 7.4],
      [45.5, 7.4],
      [30.0, -6.2],
      [7.6, 9.6],
      [7.6, -9.6],
      [13.6, 9.0],
      [13.6, -9.0],
      [21.4, 9.0],
      [21.4, -9.0],
      [-17, 13.5],
      [-17, -13.5],
      [-9.6, 15.2],
      [-8, -12.5],
      [0, -12.5],
    ];
    const rnd = seeded(3);
    const n = spots.length;
    const puffs: [number, number, number, number][] = [
      [0, 2.75, 0, 1.15],
      [0.62, 2.45, 0.3, 0.82],
      [-0.6, 2.55, -0.25, 0.86],
      [0.1, 3.35, -0.1, 0.8],
      [-0.25, 2.4, 0.62, 0.7],
    ];

    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.22, 2.3, 8).translate(0, 1.15, 0),
      new THREE.MeshStandardMaterial({ color: '#8b7b63', roughness: 0.92 }),
      n
    );
    const leaves = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }),
      n * puffs.length
    );
    const grate = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.2, 0.03, 1.2),
      new THREE.MeshStandardMaterial({ color: '#2b2f2c', metalness: 0.5, roughness: 0.5 }),
      n
    );
    const shadow = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1.6, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.16, depthWrite: false }),
      n
    );
    const greens = ['#4d7c3a', '#5e8f45', '#6b9b4e', '#3f6e33', '#76a457'];
    spots.forEach(([x, z], i) => {
      const s = 0.9 + rnd() * 0.25;
      const rot = rnd() * Math.PI * 2;
      trunk.setMatrixAt(i, compose(x, 0, z, rot, s, s, s));
      grate.setMatrixAt(i, compose(x, 0.03, z));
      shadow.setMatrixAt(i, compose(x + 0.4, 0.035, z + 0.3, 0, s, 1, s));
      puffs.forEach(([px, py, pz, r], k) => {
        const c = Math.cos(rot);
        const sn = Math.sin(rot);
        leaves.setMatrixAt(
          i * puffs.length + k,
          compose(x + (px * c - pz * sn) * s, py * s, z + (px * sn + pz * c) * s, rot, r * s, r * s * 0.9, r * s)
        );
        leaves.setColorAt(i * puffs.length + k, _col.set(greens[(i + k) % greens.length]));
      });
      colliders.push({ kind: 'circle', x, z, r: 0.34 });
    });
    trunk.castShadow = true;
    leaves.castShadow = true;
    this.group.add(shadow, grate, trunk, leaves);
  }

  // -- Wooden benches with iron legs -------------------------------------------
  private buildBenches(colliders: WorldCollider[]) {
    // [x, z, yaw] — yaw 0 means the bench faces +z
    const spots: [number, number, number][] = [
      [7.6, 8.1, Math.PI],
      [7.6, -8.1, 0],
      [38.0, 5.5, Math.PI],
      ...EXTRA_BENCHES,
    ];
    const wood = mergeGeometries([
      new THREE.BoxGeometry(1.6, 0.06, 0.42).translate(0, 0.45, 0), // seat
      new THREE.BoxGeometry(1.6, 0.32, 0.05).translate(0, 0.72, -0.21).rotateX(0), // back
    ])!;
    const iron = mergeGeometries([
      new THREE.BoxGeometry(0.06, 0.45, 0.42).translate(-0.7, 0.225, 0),
      new THREE.BoxGeometry(0.06, 0.45, 0.42).translate(0.7, 0.225, 0),
      new THREE.BoxGeometry(0.06, 0.5, 0.05).translate(-0.7, 0.7, -0.21),
      new THREE.BoxGeometry(0.06, 0.5, 0.05).translate(0.7, 0.7, -0.21),
    ])!;
    const woodMesh = new THREE.InstancedMesh(
      wood,
      new THREE.MeshStandardMaterial({ color: '#9a6a43', roughness: 0.75 }),
      spots.length
    );
    const ironMesh = new THREE.InstancedMesh(
      iron,
      new THREE.MeshStandardMaterial({ color: '#1f2421', metalness: 0.5, roughness: 0.5 }),
      spots.length
    );
    spots.forEach(([x, z, yaw], i) => {
      woodMesh.setMatrixAt(i, compose(x, 0, z, yaw));
      ironMesh.setMatrixAt(i, compose(x, 0, z, yaw));
      colliders.push({ kind: 'aabb', minX: x - 0.85, maxX: x + 0.85, minZ: z - 0.3, maxZ: z + 0.3 });
    });
    woodMesh.castShadow = true;
    this.group.add(woodMesh, ironMesh);
  }

  // -- Stone flower planters + bollards at the piazza edge ---------------------
  private buildPlantersAndBollards(colliders: WorldCollider[]) {
    const planterSpots: [number, number][] = [
      [12.0, 4.4],
      [12.0, -4.4],
      [44.5, 4.6],
      [31.8, 4.6],
    ];
    const box = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.0, 0.5, 0.7).translate(0, 0.25, 0),
      new THREE.MeshStandardMaterial({ color: '#cbbfa8', roughness: 0.85 }),
      planterSpots.length
    );
    const soil = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.88, 0.04, 0.58).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 1 }),
      planterSpots.length
    );
    const perPlanter = 9;
    const blooms = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.14, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }),
      planterSpots.length * perPlanter
    );
    const colors = ['#e11d48', '#f59e0b', '#f472b6', '#fde047', '#6b9b4e', '#6b9b4e'];
    planterSpots.forEach(([x, z], i) => {
      box.setMatrixAt(i, compose(x, 0, z));
      soil.setMatrixAt(i, compose(x, 0, z));
      for (let k = 0; k < perPlanter; k++) {
        const bx = x - 0.32 + (k % 3) * 0.32;
        const bz = z - 0.18 + Math.floor(k / 3) * 0.18;
        blooms.setMatrixAt(i * perPlanter + k, compose(bx, 0.6 + (k % 2) * 0.06, bz));
        blooms.setColorAt(i * perPlanter + k, _col.set(colors[(i * 3 + k) % colors.length]));
      }
      colliders.push({ kind: 'aabb', minX: x - 0.55, maxX: x + 0.55, minZ: z - 0.4, maxZ: z + 0.4 });
    });
    box.castShadow = true;
    this.group.add(box, soil, blooms);

    // Cast-iron bollards keep cars out of the piazza (people walk between them)
    const bollardSpots: [number, number][] = [];
    for (let z = -3; z <= 3.01; z += 1.5) bollardSpots.push([12.0, z]);
    const bollardGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.09, 0.11, 0.8, 10).translate(0, 0.4, 0),
      new THREE.SphereGeometry(0.11, 10, 8).translate(0, 0.82, 0),
      new THREE.TorusGeometry(0.1, 0.02, 6, 12).rotateX(Math.PI / 2).translate(0, 0.62, 0),
    ])!;
    const bollards = new THREE.InstancedMesh(
      bollardGeo,
      new THREE.MeshStandardMaterial({ color: '#1f2421', metalness: 0.55, roughness: 0.45 }),
      bollardSpots.length
    );
    bollardSpots.forEach(([x, z], i) => {
      bollards.setMatrixAt(i, compose(x, 0, z));
      colliders.push({ kind: 'circle', x, z, r: 0.14 });
    });
    bollards.castShadow = true;
    this.group.add(bollards);
  }

  // -- Restaurant parking: wheel stops and a blue "P" sign ----------------------
  private buildParkingProps(colliders: WorldCollider[]) {
    const stops = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.5, 0.12, 0.22).translate(0, 0.06, 0),
      new THREE.MeshStandardMaterial({ color: '#d4d0c8', roughness: 0.85 }),
      PARKING.bays.length
    );
    PARKING.bays.forEach((bx, i) => stops.setMatrixAt(i, compose(bx, 0.02, PARKING.bayFrontZ + 0.45)));
    stops.receiveShadow = true;
    this.group.add(stops);

    // Sign post at the lot entrance
    const sx = PARKING.bays[PARKING.bays.length - 1] + PARKING.bayWidth / 2 + 0.75;
    const sz = PARKING.bayBackZ - 0.2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 2.4, 10),
      new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.6, roughness: 0.4 })
    );
    post.position.set(sx, 1.2, sz);
    post.castShadow = true;
    const { c, ctx } = makeCanvas(128, 128);
    ctx.fillStyle = '#1d4ed8';
    roundRect(ctx, 4, 4, 120, 120, 16);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    roundRect(ctx, 12, 12, 104, 104, 12);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 64, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    face.position.set(sx, 2.15, sz + 0.06);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshStandardMaterial({ color: '#9ca3af' }));
    back.position.set(sx, 2.15, sz + 0.055);
    back.rotation.y = Math.PI;
    this.group.add(post, back, face);
    colliders.push({ kind: 'circle', x: sx, z: sz, r: 0.12 });
  }

  // -- Gabled old-town skyline with lit windows at night -----------------------
  // -- Food Street avenue + Town Square with clock tower and market stalls -------
  private buildNorthDistrict(colliders: WorldCollider[], aniso: number) {
    const g = this.group;
    const F = FOOD_STREET;
    const sand = createSandstoneTexture(aniso);
    const sandMat = (w: number, d: number) =>
      new THREE.MeshStandardMaterial({ map: textured(sand, w / 3, d / 3), roughness: 0.9 });

    // Sidewalks over the whole district (alleys behind the plots included)
    g.add(flatPlane(36.2, 45, sandMat(36.2, 45), 15.4, 0.008, -43.5));

    // Granite-sett avenue continuing north from the roundabout road
    const len = F.road.maxZ - F.road.minZ;
    g.add(
      flatPlane(
        F.road.halfW * 2,
        len,
        new THREE.MeshStandardMaterial({ map: textured(createAsphaltTexture(aniso), F.road.halfW / 2, len / 4), roughness: 0.92 }),
        F.road.x,
        0.02,
        (F.road.minZ + F.road.maxZ) / 2
      )
    );
    // Kerbs along both sides of the avenue
    const kerbMats: THREE.Matrix4[] = [];
    for (const xs of [-1, 1]) {
      for (let z = F.road.minZ + 0.5; z < F.road.maxZ; z += 1) {
        kerbMats.push(compose(F.road.x + xs * (F.road.halfW + 0.11), 0.045, z, Math.PI / 2, 0.98, 1, 1).clone());
      }
    }
    const kerbs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.09, 0.22),
      new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: 0.8 }),
      kerbMats.length
    );
    kerbMats.forEach((m, i) => kerbs.setMatrixAt(i, m));
    kerbs.receiveShadow = true;
    g.add(kerbs);

    // Fan-cobbled Town Square
    const sq = F.square;
    const sw = sq.maxX - sq.minX;
    const sd = sq.maxZ - sq.minZ;
    g.add(
      flatPlane(
        sw,
        sd,
        new THREE.MeshStandardMaterial({ map: textured(createFanCobbleTexture(aniso), sw / 2.4, sd / 2.4), roughness: 0.88 }),
        (sq.minX + sq.maxX) / 2,
        0.014,
        (sq.minZ + sq.maxZ) / 2
      )
    );

    // Clock tower closing the north end of the square
    const ct = F.clockTower;
    const stone = new THREE.MeshStandardMaterial({ color: '#e5d2ae', roughness: 0.85 });
    const trim = new THREE.MeshStandardMaterial({ color: '#c9b38c', roughness: 0.8 });
    const copper = new THREE.MeshStandardMaterial({ color: '#4f8f7c', roughness: 0.55, metalness: 0.25 });
    const tower = new THREE.Group();
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 3.6), trim);
    plinth.position.y = 0.4;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(2.9, 8.2, 2.9), stone);
    shaft.position.y = 4.9;
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.35, 3.3), trim);
    cornice.position.y = 9.15;
    const belfry = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.9, 2.5), new THREE.MeshStandardMaterial({ color: '#3a2f27', roughness: 0.9 }));
    belfry.position.y = 10.25;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 3.2, 4), copper);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 12.8;
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 1.2, 6), new THREE.MeshStandardMaterial({ color: '#d4a017', metalness: 0.8, roughness: 0.3 }));
    spire.position.y = 15;
    tower.add(plinth, shaft, cornice, belfry, roof, spire);
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.9, 0.42), stone);
      post.position.set(dx * 1.25, 10.25, dz * 1.25);
      tower.add(post);
    }
    // Door at the foot of the tower
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.08), new THREE.MeshStandardMaterial({ color: '#5b3a22', roughness: 0.7 }));
    door.position.set(0, 1.75, 1.47);
    tower.add(door);
    const clockTex = createClockFaceTexture();
    const clockMat = new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.5, emissive: '#fff4d6', emissiveMap: clockTex, emissiveIntensity: 0 });
    this.clockMat = clockMat;
    for (let k = 0; k < 4; k++) {
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), clockMat);
      const a = (k * Math.PI) / 2;
      face.position.set(Math.sin(a) * 1.47, 7.2, Math.cos(a) * 1.47);
      face.rotation.y = a;
      tower.add(face);
    }
    tower.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    tower.position.set(ct.x, 0, ct.z);
    g.add(tower);
    colliders.push({ kind: 'aabb', minX: ct.x - 1.8, maxX: ct.x + 1.8, minZ: ct.z - 1.8, maxZ: ct.z + 1.8 });

    // Market stalls along the square's sides
    const stalls: { x: number; z: number; yaw: number; a: string; b: string }[] = [
      { x: 8.6, z: -54.6, yaw: Math.PI / 2, a: '#dc2626', b: '#fef3c7' },
      { x: 8.6, z: -59.2, yaw: Math.PI / 2, a: '#2563eb', b: '#f8fafc' },
      { x: 26.4, z: -54.6, yaw: -Math.PI / 2, a: '#16a34a', b: '#fefce8' },
      { x: 26.4, z: -59.2, yaw: -Math.PI / 2, a: '#ea580c', b: '#fff7ed' },
    ];
    const woodMat = new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 0.8 });
    const produceColors = ['#ef4444', '#f97316', '#facc15', '#84cc16', '#a855f7', '#22c55e'];
    const produce = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), stalls.length * 18);
    let pi = 0;
    const frameGeo = mergeGeometries([
      new THREE.BoxGeometry(2.4, 0.85, 1.1).translate(0, 0.425, 0),
      ...[[-1.15, -0.5], [1.15, -0.5], [-1.15, 0.5], [1.15, 0.5]].map(([px, pz]) =>
        new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6).translate(px, 1.1, pz)
      ),
    ])!;
    const slatGeo = (odd: boolean) =>
      mergeGeometries(
        [0, 1, 2, 3, 4, 5]
          .filter((i) => (i % 2 === 1) === odd)
          .map((i) => new THREE.BoxGeometry(0.42, 0.05, 1.5).rotateX(0.18).translate(-1.05 + i * 0.42, 2.25, 0.1))
      )!;
    const slatsA = slatGeo(false);
    const slatsB = slatGeo(true);
    for (const st of stalls) {
      const stall = new THREE.Group();
      stall.add(new THREE.Mesh(frameGeo, woodMat));
      stall.add(new THREE.Mesh(slatsA, new THREE.MeshStandardMaterial({ color: st.a, roughness: 0.7 })));
      stall.add(new THREE.Mesh(slatsB, new THREE.MeshStandardMaterial({ color: st.b, roughness: 0.7 })));
      stall.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
      });
      stall.position.set(st.x, 0, st.z);
      stall.rotation.y = st.yaw;
      g.add(stall);
      // Produce piles on the table (world space)
      const c = Math.cos(st.yaw);
      const sn = Math.sin(st.yaw);
      for (let k = 0; k < 18; k++) {
        const lx = -0.95 + (k % 9) * 0.24;
        const lz = -0.22 + Math.floor(k / 9) * 0.3;
        produce.setMatrixAt(pi, compose(st.x + lx * c + lz * sn, 0.95, st.z - lx * sn + lz * c));
        produce.setColorAt(pi, _col.set(produceColors[(Math.floor(k / 3) + pi) % produceColors.length]));
        pi++;
      }
      const sideways = Math.abs(sn) > 0.5;
      colliders.push({
        kind: 'aabb',
        minX: st.x - (sideways ? 0.6 : 1.25),
        maxX: st.x + (sideways ? 0.6 : 1.25),
        minZ: st.z - (sideways ? 1.25 : 0.6),
        maxZ: st.z + (sideways ? 1.25 : 0.6),
      });
    }
    produce.castShadow = true;
    g.add(produce);
  }

  // -- Riverside park: paths, pond with ducks, gazebo and flower beds ----------
  private buildPark(colliders: WorldCollider[], aniso: number) {
    const g = this.group;
    const sand = createSandstoneTexture(aniso);
    // Pavement along the south side of the parking street
    g.add(
      flatPlane(66.6, 2.6, new THREE.MeshStandardMaterial({ map: textured(sand, 22, 0.9), roughness: 0.9 }), 24.7, 0.008, 23.5)
    );
    // Gravel paths
    const gravel = new THREE.MeshStandardMaterial({ color: '#d8c59c', roughness: 0.95 });
    g.add(flatPlane(62, 2.4, gravel, 23, 0.012, 30.4));
    g.add(flatPlane(2.4, 29, gravel, 17.5, 0.012, 39.3));
    g.add(flatPlane(2.4, 13.5, gravel, 5, 0.012, 37.2));
    const P = TOWN_PARK.pond;
    const ringPath = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.32, 48), gravel);
    ringPath.rotation.x = -Math.PI / 2;
    ringPath.scale.set(P.rx + 0.4, P.rz + 0.4, 1);
    ringPath.position.set(P.x, 0.012, P.z);
    ringPath.receiveShadow = true;
    g.add(ringPath);

    // Pond with a stone rim, lily pads and three ducks
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      new THREE.MeshStandardMaterial({ color: '#5aa6c8', roughness: 0.12, metalness: 0.15 })
    );
    water.rotation.x = -Math.PI / 2;
    water.scale.set(P.rx, P.rz, 1);
    water.position.set(P.x, 0.02, P.z);
    g.add(water);
    this.pondWater = water;
    const rim = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.07, 48), new THREE.MeshStandardMaterial({ color: '#bfb39b', roughness: 0.85 }));
    rim.rotation.x = -Math.PI / 2;
    rim.scale.set(P.rx, P.rz, 1);
    rim.position.set(P.x, 0.05, P.z);
    g.add(rim);
    const pad = new THREE.MeshStandardMaterial({ color: '#3f7d3a', roughness: 0.7 });
    for (const [dx, dz] of [[-3.5, 1.2], [-2.6, -1.6], [3.8, 1.8], [2.2, -2.2], [-4.6, -0.4]]) {
      const lily = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12, 0.3, Math.PI * 1.8), pad);
      lily.rotation.x = -Math.PI / 2;
      lily.position.set(P.x + dx, 0.03, P.z + dz);
      g.add(lily);
    }
    this.ducks = [];
    for (let i = 0; i < 3; i++) {
      const duck = createDuck(i === 0 ? '#f8fafc' : '#8b6b4a');
      duck.position.set(P.x, 0.03, P.z);
      g.add(duck);
      this.ducks.push(duck);
    }
    colliders.push(
      { kind: 'circle', x: P.x - 3, z: P.z, r: 3.7 },
      { kind: 'circle', x: P.x, z: P.z, r: 4.1 },
      { kind: 'circle', x: P.x + 3, z: P.z, r: 3.7 }
    );

    // Octagonal gazebo
    const gz = TOWN_PARK.gazebo;
    const white = new THREE.MeshStandardMaterial({ color: '#f5f1e8', roughness: 0.6 });
    const gazebo = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.8, 0.22, 8), new THREE.MeshStandardMaterial({ color: '#cdb892', roughness: 0.8 }));
    floor.position.y = 0.11;
    gazebo.add(floor);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8), white);
      post.position.set(Math.cos(a) * 2.4, 1.45, Math.sin(a) * 2.4);
      gazebo.add(post);
      colliders.push({ kind: 'circle', x: gz.x + Math.cos(a) * 2.4, z: gz.z + Math.sin(a) * 2.4, r: 0.14 });
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.2, 8, 1, true), white);
    (beam.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    beam.position.y = 2.75;
    const groof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.6, 8), new THREE.MeshStandardMaterial({ color: '#4f8f7c', roughness: 0.6 }));
    groof.position.y = 3.65;
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: '#d4a017', metalness: 0.7, roughness: 0.3 }));
    finial.position.y = 4.55;
    gazebo.add(beam, groof, finial);
    gazebo.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    gazebo.position.set(gz.x, 0, gz.z);
    g.add(gazebo);

    // Flower beds
    const beds: [number, number][] = [[11.5, 36.5], [23.5, 42], [41.5, 38], [-1.5, 37.5], [28, 49.5]];
    const soil = new THREE.MeshStandardMaterial({ color: '#5a3d26', roughness: 1 });
    const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), beds.length * 22);
    const bloomColors = ['#e11d48', '#f59e0b', '#f472b6', '#fde047', '#a855f7', '#ffffff', '#5e8f45'];
    let bi = 0;
    for (const [bx, bz] of beds) {
      const bed = new THREE.Mesh(new THREE.CircleGeometry(1, 24), soil);
      bed.rotation.x = -Math.PI / 2;
      bed.scale.set(1.9, 1.2, 1);
      bed.position.set(bx, 0.03, bz);
      g.add(bed);
      for (let k = 0; k < 22; k++) {
        const a = k * 2.4;
        const r = Math.sqrt((k + 0.5) / 22);
        blooms.setMatrixAt(bi, compose(bx + Math.cos(a) * r * 1.6, 0.16 + (k % 3) * 0.05, bz + Math.sin(a) * r * 1.0));
        blooms.setColorAt(bi, _col.set(bloomColors[(k + bi) % bloomColors.length]));
        bi++;
      }
      colliders.push({ kind: 'circle', x: bx, z: bz, r: 1.1 });
    }
    blooms.castShadow = true;
    g.add(blooms);
  }

  // -- Canal west of the restaurant with two arched footbridges ----------------
  private buildCanal(colliders: WorldCollider[], aniso: number) {
    const g = this.group;
    const C = TOWN_CANAL;
    const len = C.maxZ - C.minZ;
    const midZ = (C.minZ + C.maxZ) / 2;
    const sand = createSandstoneTexture(aniso);
    // Promenades on both banks
    for (const [x0, x1] of [[-27.6, -24], [C.maxX, -16]] as const) {
      const w = x1 - x0;
      g.add(flatPlane(w, len, new THREE.MeshStandardMaterial({ map: textured(sand, w / 3, len / 3), roughness: 0.9 }), (x0 + x1) / 2, 0.009, midZ));
    }
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(C.maxX - C.minX, len),
      new THREE.MeshStandardMaterial({ color: '#3f88a8', roughness: 0.1, metalness: 0.2 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set((C.minX + C.maxX) / 2, 0.016, midZ);
    g.add(water);
    // Stone coping along both edges
    const copeMat = new THREE.MeshStandardMaterial({ color: '#c8bca4', roughness: 0.85 });
    for (const x of [C.minX, C.maxX]) {
      const cope = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, len), copeMat);
      cope.position.set(x, 0.09, midZ);
      cope.receiveShadow = true;
      g.add(cope);
    }
    // Footbridges: arched stone with parapets
    const deckMat = new THREE.MeshStandardMaterial({ color: '#d6c7a8', roughness: 0.85 });
    const span = C.maxX - C.minX + 1.4;
    for (const bz of C.bridges) {
      const bridge = new THREE.Group();
      const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 0.2, C.bridgeHalf * 2), deckMat);
      deck.position.y = 0.14;
      bridge.add(deck);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(span / 2 - 0.2, 0.28, 6, 18, Math.PI), copeMat);
      arch.position.y = -span / 2 + 0.6;
      for (const side of [-1, 1]) {
        const a = arch.clone();
        a.position.z = side * (C.bridgeHalf - 0.05);
        bridge.add(a);
        const parapet = new THREE.Mesh(new THREE.BoxGeometry(span, 0.6, 0.22), copeMat);
        parapet.position.set(0, 0.5, side * (C.bridgeHalf - 0.11));
        bridge.add(parapet);
      }
      bridge.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
      });
      bridge.position.set((C.minX + C.maxX) / 2, 0, bz);
      g.add(bridge);
      for (const side of [-1, 1]) {
        const pz = bz + side * (C.bridgeHalf - 0.11);
        colliders.push({ kind: 'aabb', minX: C.minX - 0.7, maxX: C.maxX + 0.7, minZ: pz - 0.12, maxZ: pz + 0.12 });
      }
    }
    // Water is off-limits except over the bridges
    const gaps = C.bridges.map((b) => [b - C.bridgeHalf + 0.25, b + C.bridgeHalf - 0.25] as const).sort((a, b) => a[0] - b[0]);
    let z0: number = C.minZ;
    for (const [a, b] of gaps) {
      colliders.push({ kind: 'aabb', minX: C.minX - 0.15, maxX: C.maxX + 0.15, minZ: z0, maxZ: a });
      z0 = b;
    }
    colliders.push({ kind: 'aabb', minX: C.minX - 0.15, maxX: C.maxX + 0.15, minZ: z0, maxZ: C.maxZ });
  }

  private buildSkyline(colliders: WorldCollider[]) {
    const houses: { x: number; z: number; w: number; h: number; d: number; yaw: number }[] = [];
    const rnd = seeded(101);
    /** A terrace of houses along one line; `skip` leaves lanes open (in the row's own axis). */
    const row = (
      axis: 'x' | 'z',
      fixed: number,
      from: number,
      to: number,
      yaw: number,
      jitterSign: number,
      skip: [number, number][] = [],
      minH = 6,
      maxH = 10
    ) => {
      let t = from;
      while (t < to) {
        const w = 4.2 + rnd() * 2.6;
        const mid = t + w / 2;
        if (skip.some(([a, b]) => mid + w / 2 > a && mid - w / 2 < b)) {
          t += 1;
          continue;
        }
        if (mid + w / 2 > to) break;
        const off = jitterSign * rnd() * 1.2;
        const h = minH + rnd() * (maxH - minH);
        if (axis === 'x') houses.push({ x: mid, z: fixed + off, w, h, d: 5, yaw });
        else houses.push({ x: fixed + off, z: mid, w, h, d: 5, yaw });
        t += w + 0.15;
      }
    };
    // Town edge: north behind the square, east past the home, south past the park
    row('x', -69, -30, 62, 0, -1, [], 7, 11);
    row('z', 63.5, -21, 56, -Math.PI / 2, 1);
    row('x', 57.5, -30, 62, Math.PI, 1);
    // West quarter across the canal (lanes at both footbridges)
    row('z', -30.5, -66, 56, Math.PI / 2, -1, [
      [-3.2, 3.2],
      [-38.2, -31.8],
    ]);
    // Behind Food Street: alleys run between these houses and the restaurant plots
    row('z', 35.5, -66, -21, -Math.PI / 2, 1);
    row('z', 0.2, -48, -21, -Math.PI / 2, -1, [], 5.5, 8);
    // North-east block between Food Street and the home
    row('x', -19.5, 38, 62, Math.PI, -1, [], 5.5, 8.5);

    for (const hs of houses) {
      const sideways = Math.abs(Math.sin(hs.yaw)) > 0.5;
      const hx = (sideways ? hs.d : hs.w) / 2;
      const hz = (sideways ? hs.w : hs.d) / 2;
      colliders.push({ kind: 'aabb', minX: hs.x - hx, maxX: hs.x + hx, minZ: hs.z - hz, maxZ: hs.z + hz });
    }

    const bodyColors = ['#f2d7b6', '#e9b9a0', '#f6e7c1', '#cfe0d1', '#e8d1e0', '#d7e3ef', '#f1c9a5', '#e4d4b0'];
    const roofColors = ['#b4532a', '#9a3f22', '#c0643a', '#7c3a26', '#a8492a', '#5b5f66'];
    const n = houses.length;
    const body = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }),
      n
    );
    const roof = new THREE.InstancedMesh(
      createUnitGableGeometry(),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }),
      n
    );
    const { map, emissiveMap } = createFacadeTextures();
    this.facadeMat = new THREE.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: '#ffcf8a',
      emissiveIntensity: 0,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.8,
    });
    const facade = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), this.facadeMat, n);

    houses.forEach((hs, i) => {
      body.setMatrixAt(i, compose(hs.x, 0, hs.z, hs.yaw, hs.w, hs.h, hs.d));
      body.setColorAt(i, _col.set(bodyColors[Math.floor(rnd() * bodyColors.length)]));
      roof.setMatrixAt(i, compose(hs.x, hs.h, hs.z, hs.yaw, hs.w + 0.35, 1.6 + rnd() * 1.2, hs.d + 0.5));
      roof.setColorAt(i, _col.set(roofColors[Math.floor(rnd() * roofColors.length)]));
      // Facade plane on the front face
      const fx = hs.x + Math.sin(hs.yaw) * (hs.d / 2 + 0.02);
      const fz = hs.z + Math.cos(hs.yaw) * (hs.d / 2 + 0.02);
      facade.setMatrixAt(i, compose(fx, hs.h * 0.05, fz, hs.yaw, hs.w * 0.92, hs.h * 0.88, 1));
    });
    this.group.add(body, roof, facade);
  }
}

// ---------------------------------------------------------------------------
// Restaurant street terrace (rebuilt with the restaurant so it follows tier & theme)
// ---------------------------------------------------------------------------
export interface TerraceTheme {
  umbrellaColor: string;
  cushionColor: string;
  woodColor: string;
}

/**
 * Builds one terrace beside the entrance. Local space: x = 0 is the restaurant's
 * east wall, `side` = +1 builds on the +z side and -1 mirrors it. The customer
 * corridor (|z| < 3.4) is always kept clear.
 */
export function createStreetTerrace(
  side: 1 | -1,
  theme: TerraceTheme,
  withMenuBoard: boolean,
  /**
   * Outdoor Terrace expansion: the terrace grows a little and only umbrellas are built
   * here; the engine places real guest tables at TERRACE_TABLE_X.
   */
  realSeating = false
): { group: THREE.Group; colliders: WorldCollider[] } {
  const g = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const zIn = 3.7 * side;
  const zOut = 6.9 * side;
  const xIn = 0.6;
  const xOut = realSeating ? TERRACE_OPEN_X_OUT : 5.2;

  const iron = new THREE.MeshStandardMaterial({ color: '#1f2421', metalness: 0.5, roughness: 0.5 });
  const wood = new THREE.MeshStandardMaterial({ color: theme.woodColor, roughness: 0.7 });
  const cushion = new THREE.MeshStandardMaterial({ color: theme.cushionColor, roughness: 0.85 });

  // Deck: slightly warmer paving under the terrace
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(xOut - xIn + 0.2, Math.abs(zOut - zIn) + 0.2),
    new THREE.MeshStandardMaterial({ color: '#c9b08a', roughness: 0.9 })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.set((xIn + xOut) / 2, 0.026, (zIn + zOut) / 2);
  deck.receiveShadow = true;
  g.add(deck);

  // Low iron railing on the outer and street sides, with wooden flower boxes
  const railGeo: THREE.BufferGeometry[] = [];
  const addRail = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const yaw = Math.atan2(-(z2 - z1), x2 - x1);
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(cx, 0, cz),
      new THREE.Quaternion().setFromAxisAngle(_yAxis, yaw),
      new THREE.Vector3(1, 1, 1)
    );
    railGeo.push(new THREE.BoxGeometry(len, 0.05, 0.05).translate(0, 0.85, 0).applyMatrix4(m));
    railGeo.push(new THREE.BoxGeometry(len, 0.03, 0.03).translate(0, 0.25, 0).applyMatrix4(m));
    const posts = Math.max(2, Math.round(len / 0.25));
    for (let i = 0; i <= posts; i++) {
      const t = i / posts - 0.5;
      railGeo.push(new THREE.BoxGeometry(0.025, 0.85, 0.025).translate(t * len, 0.425, 0).applyMatrix4(m));
    }
  };
  addRail(xIn, zOut, xOut, zOut);
  addRail(xOut, zOut, xOut, zIn);
  const rail = new THREE.Mesh(mergeGeometries(railGeo)!, iron);
  rail.castShadow = true;
  g.add(rail);

  const boxMat = new THREE.MeshStandardMaterial({ color: '#7a4a2e', roughness: 0.8 });
  const bloomColors = ['#e11d48', '#f59e0b', '#f472b6', '#fde047'];
  const bloomGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const bloomMats = bloomColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  const leafMat = new THREE.MeshStandardMaterial({ color: '#4d7c3a', roughness: 0.8 });
  for (const bx of realSeating ? [1.7, 4.3] : [1.6, 3.8]) {
    const fb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.32, 0.34), boxMat);
    fb.position.set(bx, 0.16, zOut - 0.22 * side);
    fb.castShadow = true;
    g.add(fb);
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(bloomGeo, k % 3 === 2 ? leafMat : bloomMats[k % bloomMats.length]);
      b.position.set(bx - 0.55 + k * 0.18, 0.38 + (k % 2) * 0.05, zOut - 0.22 * side);
      g.add(b);
    }
  }
  colliders.push(
    { kind: 'aabb', minX: xIn, maxX: xOut + 0.1, minZ: Math.min(zOut, zOut - 0.4 * side), maxZ: Math.max(zOut, zOut - 0.4 * side) + 0.05 },
    { kind: 'aabb', minX: xOut - 0.1, maxX: xOut + 0.1, minZ: Math.min(zIn, zOut), maxZ: Math.max(zIn, zOut) }
  );

  // Two bistro tables with chairs and striped umbrellas
  const stripe = createStripeTexture(theme.umbrellaColor, '#f8f1e4');
  const canopyMat = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.75, side: THREE.DoubleSide });
  const tableZ = 5.25 * side;
  if (realSeating) {
    // Umbrellas only: the guest tables themselves come from the engine
    for (const tx of TERRACE_TABLE_X) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), iron);
      pole.position.set(tx, 1.15, tableZ);
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.45, 8, 1, true), canopyMat);
      canopy.position.set(tx, 2.38, tableZ);
      pole.castShadow = canopy.castShadow = true;
      g.add(pole, canopy);
    }
  }
  for (const tx of realSeating ? [] : [1.75, 3.95]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), wood);
    top.position.set(tx, 0.74, tableZ);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 8), iron);
    leg.position.set(tx, 0.36, tableZ);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.04, 16), iron);
    foot.position.set(tx, 0.02, tableZ);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), iron);
    pole.position.set(tx, 1.15, tableZ);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.45, 8, 1, true), canopyMat);
    canopy.position.set(tx, 2.38, tableZ);
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#e0f2fe', roughness: 0.2 }));
    vase.position.set(tx + 0.12, 0.84, tableZ - 0.08);
    const rose = new THREE.Mesh(bloomGeo, bloomMats[0]);
    rose.scale.setScalar(0.6);
    rose.position.set(tx + 0.12, 0.95, tableZ - 0.08);
    [top, leg, foot, pole, canopy].forEach((m) => (m.castShadow = true));
    g.add(top, leg, foot, pole, canopy, vase, rose);

    // Bistro chairs either side
    for (const cs of [-1, 1]) {
      const cx = tx + cs * 0.68;
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), cushion);
      seat.position.set(cx, 0.46, tableZ);
      const back = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.022, 6, 14, Math.PI), iron);
      back.rotation.y = Math.PI / 2;
      back.position.set(cx + cs * 0.18, 0.62, tableZ);
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.44, 4, 1, true), iron);
      legs.position.set(cx, 0.22, tableZ);
      seat.castShadow = true;
      g.add(seat, back, legs);
    }
    colliders.push({ kind: 'aabb', minX: tx - 0.95, maxX: tx + 0.95, minZ: tableZ - 0.45, maxZ: tableZ + 0.45 });
  }

  // Corner posts that carry the string lights
  const postGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.6, 8);
  for (const [px, pz] of [
    [xIn, zIn],
    [xIn, zOut],
    [xOut, zIn],
    [xOut, zOut],
  ]) {
    const p = new THREE.Mesh(postGeo, wood);
    p.position.set(px, 1.3, pz);
    p.castShadow = true;
    g.add(p);
    colliders.push({ kind: 'circle', x: px, z: pz, r: 0.1 });
  }

  // A-frame chalkboard menu beside the door
  if (withMenuBoard) {
    const board = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: '#6b4428', roughness: 0.75 });
    const { c, ctx } = makeCanvas(128, 160);
    ctx.fillStyle = '#1f2a24';
    ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('MENU', 64, 30);
    ctx.font = '13px Georgia, serif';
    ['Soup du jour', 'Burger frites', 'Tiramisu', 'Espresso'].forEach((t, i) => ctx.fillText(t, 64, 62 + i * 22));
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('~ Welcome ~', 64, 150);
    const chalk = new THREE.CanvasTexture(c);
    chalk.colorSpace = THREE.SRGBColorSpace;
    const faceMat = new THREE.MeshStandardMaterial({ map: chalk, roughness: 0.9 });
    for (const s of [-1, 1]) {
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.03), [frameMat, frameMat, frameMat, frameMat, faceMat, faceMat]);
      face.position.set(0, 0.42, s * 0.14);
      face.rotation.x = s * 0.2;
      face.castShadow = true;
      board.add(face);
    }
    board.position.set(1.15, 0, 3.2 * side);
    board.rotation.y = Math.PI / 2;
    g.add(board);
    colliders.push({ kind: 'circle', x: 1.15, z: 3.2 * side, r: 0.3 });
  }

  return { group: g, colliders };
}
