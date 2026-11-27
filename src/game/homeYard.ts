import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { WorldCollider } from './npcPhysics';
import { mergeByMaterial } from './kitchenDecor';

/**
 * The home's front yard, rebuilt around whichever house the player owns:
 * a lawn, a paved front walk from the end of the avenue to a proper entrance
 * (porch slab, timber portal with a terracotta awning, house number, lanterns,
 * doormat and planters), a link to the street sidewalk through a hedge, flower
 * beds along the facade, a mailbox, low path lights and a small garden tree.
 */

export const HOME_CENTER = { x: 40, z: -5 } as const;
/** End of the east avenue (the walk starts at its dropped kerb). */
const ROAD_END_X = 31.75;
/** South edge of the yard (street sidewalk with lanterns beyond). */
const YARD_SOUTH_Z = 3.45;

function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D) => void, rx: number, ry: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Lush lawn with mower stripes (one tile = 2 m). */
function lawnTexture(rx: number, ry: number) {
  return canvasTex(
    256,
    (ctx) => {
      const rnd = seeded(5);
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#6fae4a' : '#64a243';
        ctx.fillRect(0, i * 64, 256, 64);
      }
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = rnd() < 0.5 ? 'rgba(40,90,30,0.35)' : 'rgba(160,210,110,0.3)';
        ctx.fillRect(rnd() * 256, rnd() * 256, 1, 2 + rnd() * 2);
      }
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = rnd() < 0.5 ? '#fff6d8' : '#ffd84a';
        ctx.beginPath();
        ctx.arc(rnd() * 256, rnd() * 256, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    rx,
    ry
  );
}

/** Large warm-grey stone pavers (one tile = 1.2 m). */
function paverTexture() {
  return canvasTex(
    256,
    (ctx) => {
      const rnd = seeded(9);
      ctx.fillStyle = '#9b948a';
      ctx.fillRect(0, 0, 256, 256);
      const rows = 4;
      const rh = 256 / rows;
      for (let r = 0; r < rows; r++) {
        let x = r % 2 ? -48 : 0;
        while (x < 256) {
          const w = 70 + rnd() * 40;
          const t = 0.94 + rnd() * 0.1;
          ctx.fillStyle = `rgb(${Math.round(214 * t)},${Math.round(206 * t)},${Math.round(192 * t)})`;
          ctx.beginPath();
          ctx.roundRect(x + 3, r * rh + 3, w - 6, rh - 6, 6);
          ctx.fill();
          for (let k = 0; k < 40; k++) {
            ctx.fillStyle = 'rgba(120,112,100,0.18)';
            ctx.fillRect(x + 6 + rnd() * (w - 12), r * rh + 6 + rnd() * (rh - 12), 2, 2);
          }
          x += w;
        }
      }
    },
    1,
    1
  );
}

type YardMats = ReturnType<typeof buildMats>;
let MATS: YardMats | null = null;
function buildMats() {
  return {
    paver: paverTexture(),
    hedge: new THREE.MeshStandardMaterial({ color: '#3f7f38', roughness: 0.85 }),
    hedgeLight: new THREE.MeshStandardMaterial({ color: '#56994a', roughness: 0.85 }),
    soil: new THREE.MeshStandardMaterial({ color: '#6b4630', roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({ color: '#d8d0c2', roughness: 0.75 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: '#b8afa1', roughness: 0.8 }),
    timber: new THREE.MeshStandardMaterial({ color: '#8a5a36', roughness: 0.6 }),
    terracotta: new THREE.MeshStandardMaterial({ color: '#c96a45', roughness: 0.6 }),
    black: new THREE.MeshStandardMaterial({ color: '#2a2725', roughness: 0.45, metalness: 0.4 }),
    brass: new THREE.MeshStandardMaterial({ color: '#d4a24c', roughness: 0.3, metalness: 0.8 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffc96a', emissiveIntensity: 1.1, roughness: 0.4 }),
    mat: new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.95 }),
    cream: new THREE.MeshStandardMaterial({ color: '#f4e9d6', roughness: 0.6 }),
    mailRed: new THREE.MeshStandardMaterial({ color: '#c8432f', roughness: 0.45 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#7a5636', roughness: 0.8 }),
    flowers: ['#f25c78', '#ffd84a', '#ffffff', '#f59e0b', '#c084fc'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })),
  };
}
function M(): YardMats {
  if (!MATS) MATS = buildMats();
  return MATS;
}

function rb(w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, seg = 2) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
  m.position.set(x, y, z);
  return m;
}

function cyl(rt: number, rbm: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbm, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}

/** Paved strip between two points (flat, 1 cm proud of the lawn). */
function pavedStrip(g: THREE.Group, x0: number, z0: number, x1: number, z1: number, width: number, paverMap: THREE.Texture) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.05) return;
  const map = paverMap.clone();
  map.needsUpdate = true;
  map.repeat.set(width / 1.2, len / 1.2);
  const geo = new THREE.PlaneGeometry(width, len);
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.82 }));
  m.position.set((x0 + x1) / 2, 0.032, (z0 + z1) / 2);
  m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
  m.receiveShadow = true;
  g.add(m);
  // Thin stone edging on both sides
  const edgeGeo = new RoundedBoxGeometry(0.08, 0.05, len, 1, 0.02);
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(edgeGeo, M().stoneDark);
    e.position.set((x0 + x1) / 2 + Math.cos(m.rotation.y) * s * (width / 2 + 0.04), 0.035, (z0 + z1) / 2 - Math.sin(m.rotation.y) * s * (width / 2 + 0.04));
    e.rotation.y = m.rotation.y;
    g.add(e);
  }
}

/** Clipped hedge run along X or Z with leafy bumps on top. */
function hedge(g: THREE.Group, cols: WorldCollider[], x0: number, z0: number, x1: number, z1: number) {
  const m = M();
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
  if (len < 0.4) return;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const T = 0.55;
  const H = 0.62;
  g.add(rb(alongX ? len : T, H, alongX ? T : len, 0.14, m.hedge, cx, H / 2, cz, 3));
  const n = Math.max(2, Math.round(len / 0.45));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), i % 2 ? m.hedgeLight : m.hedge);
    b.scale.set(1.2, 0.6, 1.1);
    b.position.set(cx + (alongX ? t * len : 0), H - 0.02, cz + (alongX ? 0 : t * len));
    g.add(b);
  }
  cols.push({
    kind: 'aabb',
    minX: cx - (alongX ? len : T) / 2,
    maxX: cx + (alongX ? len : T) / 2,
    minZ: cz - (alongX ? T : len) / 2,
    maxZ: cz + (alongX ? T : len) / 2,
  });
}

function flowerBed(g: THREE.Group, cols: WorldCollider[], x0: number, x1: number, z0: number, z1: number, seed: number) {
  const m = M();
  const w = x1 - x0;
  const d = z1 - z0;
  if (w < 0.6 || d < 0.35) return;
  g.add(rb(w, 0.14, d, 0.05, m.stoneDark, (x0 + x1) / 2, 0.07, (z0 + z1) / 2, 2));
  g.add(rb(w - 0.1, 0.06, d - 0.1, 0.03, m.soil, (x0 + x1) / 2, 0.15, (z0 + z1) / 2, 1));
  const rnd = seeded(seed);
  const n = Math.floor((w * d) / 0.035);
  for (let i = 0; i < n; i++) {
    const x = x0 + 0.1 + rnd() * (w - 0.2);
    const z = z0 + 0.1 + rnd() * (d - 0.2);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), rnd() < 0.5 ? m.hedge : m.hedgeLight);
    leaf.scale.y = 0.7;
    leaf.position.set(x, 0.22, z);
    g.add(leaf);
    if (rnd() < 0.7) {
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), m.flowers[Math.floor(rnd() * m.flowers.length)]);
      fl.position.set(x + (rnd() - 0.5) * 0.05, 0.28, z + (rnd() - 0.5) * 0.05);
      g.add(fl);
    }
  }
  cols.push({ kind: 'aabb', minX: x0, maxX: x1, minZ: z0, maxZ: z1 });
}

function pottedShrub(g: THREE.Group, cols: WorldCollider[], x: number, z: number) {
  const m = M();
  g.add(cyl(0.22, 0.17, 0.42, m.terracotta, x, 0.31, z, 16));
  g.add(cyl(0.235, 0.235, 0.05, m.terracotta, x, 0.52, z, 16));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 9), m.hedgeLight);
  ball.position.set(x, 0.82, z);
  g.add(ball);
  cols.push({ kind: 'circle', x, z, r: 0.26 });
}

function pathLight(g: THREE.Group, x: number, z: number) {
  const m = M();
  g.add(cyl(0.05, 0.06, 0.42, m.black, x, 0.24, z, 10));
  g.add(cyl(0.075, 0.075, 0.1, m.lamp, x, 0.5, z, 12));
  g.add(cyl(0.09, 0.09, 0.03, m.black, x, 0.565, z, 12));
}

/** House number plaque (canvas lettering on a cream enamel plate). */
function numberPlaque(num: string) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f4e9d6';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#2a2725';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 120, 56);
  ctx.fillStyle = '#2a2725';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(num, 64, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
}

export interface HomeYardBuild {
  group: THREE.Group;
  colliders: WorldCollider[];
}

/** Builds the yard for a house of the given footprint (w × d metres, centred on HOME_CENTER, front facing +Z). */
export function buildHomeYard(w: number, d: number): HomeYardBuild {
  const m = M();
  const g = new THREE.Group();
  const cols: WorldCollider[] = [];
  const cx = HOME_CENTER.x;
  const front = HOME_CENTER.z + d / 2; // z of the open house front
  // The lawn runs from the end of the avenue so the walk crosses garden, not bare paving
  const x0 = ROAD_END_X + 0.3;
  const x1 = Math.min(48.4, cx + w / 2 + 1.3);
  const zS = YARD_SOUTH_Z;

  // Lawn
  const lw = x1 - x0;
  const ld = zS - front;
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(lw, ld), new THREE.MeshStandardMaterial({ map: lawnTexture(lw / 2, ld / 2), roughness: 0.95 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set((x0 + x1) / 2, 0.026, (front + zS) / 2);
  lawn.receiveShadow = true;
  g.add(lawn);

  // Front walk: from the road's dropped kerb to the entrance, plus a link south to the street
  const walkW = 1.5;
  const zWalk = Math.min(front + 1.45, zS - 0.95);
  const walk = new THREE.Group();
  pavedStrip(walk, ROAD_END_X, 0, x0 + 1.0, zWalk, walkW, m.paver);
  pavedStrip(walk, x0 + 1.0 - 0.3, zWalk, cx + walkW / 2, zWalk, walkW, m.paver);
  pavedStrip(walk, cx, zWalk - walkW / 2 + 0.05, cx, front + 0.6, 1.7, m.paver);
  pavedStrip(walk, cx, zWalk + walkW / 2 - 0.05, cx, zS + 0.35, 1.3, m.paver);
  g.add(walk);

  // Entrance: porch slab with a step, timber portal with a terracotta awning, number, lanterns, doormat
  const entrance = new THREE.Group();
  entrance.add(rb(3.0, 0.1, 0.75, 0.04, m.stone, cx, 0.05, front + 0.375, 3));
  entrance.add(rb(2.2, 0.05, 0.36, 0.03, m.stoneDark, cx, 0.035, front + 0.9, 2));
  entrance.add(rb(1.0, 0.015, 0.5, 0.01, m.mat, cx, 0.108, front + 0.35, 1));
  const postH = 2.45;
  for (const s of [-1, 1]) {
    const px = cx + s * 1.32;
    const pz = front + 0.62;
    entrance.add(rb(0.16, 0.12, 0.16, 0.03, m.stoneDark, px, 0.16, pz, 2));
    entrance.add(rb(0.12, postH, 0.12, 0.03, m.timber, px, 0.1 + postH / 2, pz, 2));
    // Lantern on each post
    entrance.add(rb(0.05, 0.12, 0.08, 0.01, m.black, px, 1.75, pz + 0.1, 1));
    entrance.add(rb(0.14, 0.2, 0.14, 0.03, m.black, px, 1.62, pz + 0.16, 2));
    entrance.add(rb(0.1, 0.15, 0.1, 0.02, m.lamp, px, 1.62, pz + 0.16, 1));
    cols.push({ kind: 'circle', x: px, z: pz, r: 0.12 });
  }
  // Lintel and awning (sloping toward the yard)
  entrance.add(rb(2.9, 0.14, 0.16, 0.03, m.timber, cx, 0.1 + postH, front + 0.62, 2));
  const awning = rb(3.1, 0.06, 1.0, 0.025, m.terracotta, cx, 0.1 + postH + 0.12, front + 0.55, 2);
  awning.rotation.x = 0.22;
  entrance.add(awning);
  for (let i = 0; i < 9; i++) {
    const rib = rb(0.05, 0.05, 1.0, 0.02, m.terracotta, cx - 1.4 + i * 0.35, 0.1 + postH + 0.16, front + 0.55, 1);
    rib.rotation.x = 0.22;
    entrance.add(rib);
  }
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), numberPlaque('12'));
  plaque.position.set(cx, 0.1 + postH - 0.2, front + 0.71);
  entrance.add(plaque);
  entrance.add(rb(0.44, 0.24, 0.02, 0.01, m.black, cx, 0.1 + postH - 0.2, front + 0.695, 1));
  g.add(entrance);
  pottedShrub(g, cols, cx - 1.85, front + 0.45);
  pottedShrub(g, cols, cx + 1.85, front + 0.45);

  // Flower beds along the facade (when the yard is deep enough)
  const bedZ0 = front + 0.1;
  const bedZ1 = Math.min(front + 0.62, zWalk - walkW / 2 - 0.1);
  if (bedZ1 - bedZ0 > 0.35) {
    // Only in front of the facade, so the lawn beside the house stays open to walk across
    flowerBed(g, cols, Math.max(x0 + 0.25, cx - w / 2 + 0.25), cx - 2.25, bedZ0, bedZ1, 3);
    flowerBed(g, cols, cx + 2.25, Math.min(x1 - 0.85, cx + w / 2 - 0.25), bedZ0, bedZ1, 7);
  }

  // Hedges: along the street (gap for the walk) and the east side
  const hz = zS - 0.3;
  hedge(g, cols, x0 + 0.3, hz, cx - 0.95, hz);
  hedge(g, cols, cx + 0.95, hz, x1 - 0.3, hz);
  hedge(g, cols, x1 - 0.3, front + 0.2, x1 - 0.3, hz - 0.3);

  // Mailbox by the street gap
  const mbx = cx + 1.25;
  const mbz = zS - 0.85;
  g.add(cyl(0.04, 0.04, 1.0, m.timber, mbx, 0.5, mbz, 8));
  g.add(rb(0.26, 0.24, 0.42, 0.1, m.mailRed, mbx, 1.1, mbz, 3));
  g.add(rb(0.03, 0.12, 0.04, 0.01, m.brass, mbx + 0.14, 1.18, mbz + 0.1, 1));
  cols.push({ kind: 'circle', x: mbx, z: mbz, r: 0.18 });

  // Low path lights along the walk
  for (let x = x0 + 2.0; x < cx - 1.4; x += 2.4) pathLight(g, x, zWalk + walkW / 2 + 0.25);
  pathLight(g, cx - 1.05, zS - 0.75);

  // A small garden tree in the east corner
  if (x1 - (cx + 2.4) > 1.6 && ld > 2.2) {
    const tx = x1 - 1.3;
    const tz = Math.min(zWalk + 0.4, zS - 1.3);
    g.add(cyl(0.08, 0.11, 1.3, m.trunk, tx, 0.65, tz, 8));
    for (const [ox, oy, oz, r] of [
      [0, 1.65, 0, 0.6],
      [0.3, 1.5, 0.2, 0.42],
      [-0.3, 1.55, -0.15, 0.45],
      [0.05, 2.0, 0.05, 0.4],
    ] as const) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), ox > 0 ? m.hedgeLight : m.hedge);
      b.position.set(tx + ox, oy, tz + oz);
      g.add(b);
    }
    cols.push({ kind: 'circle', x: tx, z: tz, r: 0.18 });
  }

  // Bake the props (the lawn and walk keep their own repeating textures)
  const props = new THREE.Group();
  for (const child of [...g.children]) {
    if (child === lawn || child === walk) continue;
    props.add(child);
  }
  const baked = mergeByMaterial(props);
  g.add(baked.group);
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.receiveShadow = true;
  });
  return { group: g, colliders: cols };
}
