import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { WorldCollider } from './npcPhysics';
import { mergeByMaterial } from './kitchenDecor';
import { createVehicleMesh } from './models';
import { VEHICLE_CATALOG } from './data';

/**
 * One distinct building per town shop, all on the same 6.8 x 5.2 footprint
 * (front facing local +z, entrance in the middle) so colliders, pads and the
 * street layout stay exactly where they were:
 *  - Style Atelier: Parisian boutique — cream stone, mansard slate roof with
 *    dormers, striped scalloped awning, arched windows with mannequins, balcony.
 *  - Apex Motors: modern glass showroom — graphite cladding, glass curtain wall
 *    with a car inside, a slanted blue canopy with an LED edge, logo pylon, flags.
 *  - Fresh Wholesale: brick market hall — barrel-vaulted green metal roof, fan
 *    window, wide striped awning, produce stands and a chalkboard.
 *  - Metro Bank: neoclassical — limestone, steps, four columns, a gold frieze,
 *    pediment with a clock, bronze doors and lanterns.
 */

export type ShopZoneId = 'clothing' | 'dealership' | 'supermarket' | 'bank';

export interface ShopBuild {
  group: THREE.Group;
  /** Extra colliders for props in front of the footprint, in local space. */
  colliders: WorldCollider[];
}

const W = 6.8;
const D = 5.2;
const HX = W / 2;
const FZ = D / 2; // front face

// ---------- small helpers ----------
const stdCache = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, roughness = 0.7, metalness = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const key = `${color}|${roughness}|${metalness}|${JSON.stringify(extra)}`;
  let m = stdCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    stdCache.set(key, m);
  }
  return m;
}
function glow(color: string, intensity = 0.8) {
  return mat(color, 0.5, 0, { emissive: color, emissiveIntensity: intensity });
}
function glass(tint = '#9cc4da', opacity = 0.24) {
  return mat(tint, 0.06, 0.2, { transparent: true, opacity, depthWrite: false });
}

function box(g: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}
function cyl(g: THREE.Object3D, rt: number, rb: number, h: number, m: THREE.Material, x: number, y: number, z: number, seg = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

function signTexture(
  text: string,
  opts: { bg: string; fg: string; font: string; border?: string; w?: number; h?: number; sub?: string; transparent?: boolean }
) {
  const c = document.createElement('canvas');
  c.width = opts.w ?? 512;
  c.height = opts.h ?? 128;
  const ctx = c.getContext('2d')!;
  if (!opts.transparent) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, c.width, c.height);
  }
  if (opts.border) {
    ctx.strokeStyle = opts.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  }
  ctx.fillStyle = opts.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = opts.font;
  ctx.fillText(text, c.width / 2, opts.sub ? c.height * 0.42 : c.height / 2);
  if (opts.sub) {
    ctx.font = `600 ${Math.round(c.height * 0.16)}px Outfit, sans-serif`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(opts.sub, c.width / 2, c.height * 0.78);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function signMat(text: string, opts: Parameters<typeof signTexture>[1]) {
  return new THREE.MeshStandardMaterial({
    map: signTexture(text, opts),
    roughness: 0.45,
    transparent: !!opts.transparent,
    emissive: '#ffffff',
    emissiveIntensity: 0.12,
    emissiveMap: null,
  });
}

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, rx: number, ry: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  return t;
}

let brickTex: THREE.Texture | null = null;
function brickMaterial(rx: number, ry: number) {
  if (!brickTex) {
    brickTex = canvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#d9c8b4';
      ctx.fillRect(0, 0, 256, 256);
      const rows = 8;
      const bh = 256 / rows;
      for (let r = 0; r < rows; r++) {
        const off = r % 2 ? 32 : 0;
        for (let i = -1; i < 5; i++) {
          const x = i * 64 + off;
          const shade = 0.85 + ((r * 7 + i * 13) % 5) * 0.05;
          ctx.fillStyle = `rgb(${Math.round(176 * shade)},${Math.round(76 * shade)},${Math.round(52 * shade)})`;
          ctx.fillRect(x + 3, r * bh + 3, 58, bh - 6);
        }
      }
    }, 1, 1);
  }
  const t = brickTex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
}

let stoneTex: THREE.Texture | null = null;
function stoneMaterial(color: string, rx: number, ry: number) {
  if (!stoneTex) {
    stoneTex = canvasTex(256, 256, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(90,70,50,0.22)';
      ctx.lineWidth = 3;
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * 64);
        ctx.lineTo(256, r * 64);
        ctx.stroke();
        const off = r % 2 ? 64 : 0;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(off + i * 128, r * 64);
          ctx.lineTo(off + i * 128, r * 64 + 64);
          ctx.stroke();
        }
      }
    }, 1, 1);
  }
  const t = stoneTex.clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.78 });
}

/** A solid body with a recessed shop window bay across the front of the ground floor. */
function shellWithBay(g: THREE.Group, wallM: THREE.Material, groundH: number, totalH: number, bayDepth: number, bayInner: THREE.Material) {
  // Ground floor body stops short of the front to make the window bay
  box(g, W, groundH, D - bayDepth, wallM, 0, groundH / 2, -bayDepth / 2);
  // Side piers closing the bay
  box(g, 0.42, groundH, bayDepth, wallM, -HX + 0.21, groundH / 2, FZ - bayDepth / 2);
  box(g, 0.42, groundH, bayDepth, wallM, HX - 0.21, groundH / 2, FZ - bayDepth / 2);
  // Upper body, full depth
  if (totalH > groundH) box(g, W, totalH - groundH, D, wallM, 0, groundH + (totalH - groundH) / 2, 0);
  // Lit back wall and floor of the bay
  box(g, W - 0.84, groundH - 0.1, 0.04, bayInner, 0, groundH / 2, FZ - bayDepth + 0.02);
  box(g, W - 0.84, 0.06, bayDepth, mat('#e8dccb', 0.5), 0, 0.03, FZ - bayDepth / 2);
}

// ================= Style Atelier =================
function buildAtelier(): ShopBuild {
  const g = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const stone = stoneMaterial('#f3e6d6', 3, 2);
  const rose = mat('#8e1b4a', 0.5);
  const gold = mat('#d4a640', 0.32, 0.75);
  const white = mat('#fbf7f0', 0.55);
  const groundH = 2.7;
  const totalH = 4.5;
  shellWithBay(g, stone, groundH, totalH, 0.75, glow('#ffe9d2', 0.55));

  // Rose-painted shopfront frame
  box(g, W - 0.5, 0.22, 0.16, rose, 0, groundH - 0.1, FZ + 0.05);
  box(g, W - 0.5, 0.32, 0.16, rose, 0, 0.16, FZ + 0.05);
  for (const x of [-2.9, -0.8, 0.8, 2.9]) box(g, 0.2, groundH, 0.18, rose, x, groundH / 2, FZ + 0.05);
  // Two display windows (arched tops) and a glass door
  for (const side of [-1, 1]) {
    const cx = side * 1.85;
    box(g, 1.9, 1.7, 0.04, glass(), cx, 1.2, FZ + 0.02);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 20, 1, false, -Math.PI / 2, Math.PI), glass('#f8d9e6', 0.45));
    arch.rotation.x = -Math.PI / 2;
    arch.scale.set(1, 1, 0.42);
    arch.position.set(cx, 2.05, FZ + 0.02);
    g.add(arch);
    // Mannequins
    for (const k of [-0.45, 0.45]) {
      const mx = cx + k;
      const dress = side < 0 ? (k < 0 ? '#ec4899' : '#14b8a6') : k < 0 ? '#f59e0b' : '#6366f1';
      cyl(g, 0.03, 0.03, 0.5, gold, mx, 0.32, FZ - 0.38, 6);
      cyl(g, 0.16, 0.05, 0.12, gold, mx, 0.1, FZ - 0.38, 10);
      cyl(g, 0.12, 0.32, 0.75, mat(dress, 0.6), mx, 0.95, FZ - 0.38, 14);
      cyl(g, 0.13, 0.12, 0.28, mat(dress, 0.6), mx, 1.45, FZ - 0.38, 12);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), white);
      head.position.set(mx, 1.72, FZ - 0.38);
      g.add(head);
    }
  }
  box(g, 1.4, 2.2, 0.04, glass('#d7ecf5', 0.5), 0, 1.15, FZ + 0.02);
  box(g, 0.04, 0.5, 0.06, gold, 0.5, 1.15, FZ + 0.08);

  // Striped scalloped awning
  const stripes = 12;
  const aw = W - 0.3;
  const sw = aw / stripes;
  for (let i = 0; i < stripes; i++) {
    const m = i % 2 ? white : mat('#e0447e', 0.6);
    const s = box(g, sw, 0.05, 1.1, m, -aw / 2 + sw * (i + 0.5), groundH - 0.05, FZ + 0.5);
    s.rotation.x = 0.38;
    const scallop = new THREE.Mesh(new THREE.CylinderGeometry(sw / 2, sw / 2, 0.04, 12, 1, false, Math.PI / 2, Math.PI), m);
    scallop.rotation.x = -Math.PI / 2;
    scallop.position.set(-aw / 2 + sw * (i + 0.5), groundH - 0.27, FZ + 1.02);
    g.add(scallop);
  }

  // Script sign on the band between the floors
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 0.52),
    signMat('Style Atelier', { bg: '#8e1b4a', fg: '#f6d27a', font: 'italic 700 74px Georgia, "Times New Roman", serif', border: '#f6d27a' })
  );
  sign.position.set(0, groundH + 0.52, FZ + 0.03);
  g.add(sign);

  // Upper floor: three French windows and a wrought-iron balcony
  for (const x of [-2.2, 0, 2.2]) {
    box(g, 1.0, 1.15, 0.08, white, x, groundH + 1.25 + 0.2, FZ + 0.01);
    box(g, 0.82, 0.98, 0.06, mat('#3b4a63', 0.15, 0.3, { emissive: '#ffd9a8', emissiveIntensity: 0.18 }), x, groundH + 1.45, FZ + 0.04);
    box(g, 0.05, 0.98, 0.08, white, x, groundH + 1.45, FZ + 0.06);
    box(g, 1.15, 0.1, 0.18, white, x, groundH + 2.05, FZ + 0.06); // lintel
  }
  const iron = mat('#1f2937', 0.45, 0.5);
  box(g, W - 0.6, 0.08, 0.5, stone, 0, groundH + 0.86, FZ + 0.25);
  box(g, W - 0.6, 0.04, 0.04, iron, 0, groundH + 1.38, FZ + 0.48);
  for (let i = 0; i <= 24; i++) box(g, 0.025, 0.5, 0.025, iron, -HX + 0.3 + (i * (W - 0.6)) / 24, groundH + 1.13, FZ + 0.48);

  // White cornice + mansard slate roof with dormers
  box(g, W + 0.3, 0.2, D + 0.3, white, 0, totalH + 0.1, 0);
  const slate = mat('#4a5568', 0.55, 0.2);
  const mansardGeo = new THREE.CylinderGeometry(0.62, 1, 1.25, 4, 1);
  mansardGeo.rotateY(Math.PI / 4);
  const mansard = new THREE.Mesh(mansardGeo, slate);
  mansard.scale.set((W + 0.1) / Math.SQRT2, 1, (D + 0.1) / Math.SQRT2);
  mansard.position.y = totalH + 0.2 + 0.62;
  g.add(mansard);
  box(g, (W + 0.1) * 0.62, 0.08, (D + 0.1) * 0.62, mat('#374151', 0.5, 0.3), 0, totalH + 1.49, 0);
  for (const x of [-1.6, 1.6]) {
    box(g, 0.75, 0.75, 0.6, white, x, totalH + 0.8, FZ - 0.25);
    box(g, 0.5, 0.48, 0.04, mat('#3b4a63', 0.15, 0.3, { emissive: '#ffd9a8', emissiveIntensity: 0.2 }), x, totalH + 0.78, FZ + 0.06);
    const roofGeo = new THREE.CylinderGeometry(0.01, 0.55, 0.4, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    const dr = new THREE.Mesh(roofGeo, slate);
    dr.scale.set(1.0, 1, 0.85);
    dr.position.set(x, totalH + 1.36, FZ - 0.25);
    g.add(dr);
  }
  // Chimneys
  for (const x of [-2.4, 2.4]) box(g, 0.45, 0.9, 0.45, stone, x, totalH + 1.7, -1.2);

  // Topiary cones in planters flanking the door
  for (const side of [-1, 1]) {
    const x = side * 2.55;
    box(g, 0.56, 0.5, 0.56, mat('#1f2937', 0.5), x, 0.25, FZ + 0.55, 0.04);
    box(g, 0.6, 0.05, 0.6, gold, x, 0.5, FZ + 0.55);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 10), mat('#2f6b3a', 0.85));
    cone.position.set(x, 1.08, FZ + 0.55);
    g.add(cone);
    colliders.push({ kind: 'circle', x, z: FZ + 0.55, r: 0.38 });
  }
  return { group: g, colliders };
}

// ================= Apex Motors =================
function buildMotors(): ShopBuild {
  const g = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const graphite = mat('#2c3440', 0.55, 0.35);
  const alu = mat('#c9d1db', 0.3, 0.8);
  const blue = mat('#1d4ed8', 0.38, 0.25);
  const H = 3.5;
  const bay = 2.3;
  // Back block + side walls; the front 2.3 m is a glass showroom
  box(g, W, H, D - bay, graphite, 0, H / 2, -bay / 2);
  box(g, 0.3, H, bay, graphite, -HX + 0.15, H / 2, FZ - bay / 2);
  box(g, 0.3, H, bay, graphite, HX - 0.15, H / 2, FZ - bay / 2);
  box(g, W, 0.3, bay, graphite, 0, H - 0.15, FZ - bay / 2);
  // Horizontal aluminium fins on the sides
  for (let i = 0; i < 6; i++) {
    const y = 0.5 + i * 0.5;
    box(g, 0.06, 0.06, D - 0.2, alu, -HX - 0.03, y, 0);
    box(g, 0.06, 0.06, D - 0.2, alu, HX + 0.03, y, 0);
  }
  // Showroom interior: glossy floor, lit back wall, display car on a turntable
  box(g, W - 0.6, 0.05, bay, mat('#f1f5f9', 0.12, 0.1), 0, 0.03, FZ - bay / 2);
  box(g, W - 0.6, H - 0.4, 0.04, glow('#e0ecff', 0.55), 0, (H - 0.3) / 2, FZ - bay + 0.02);
  for (const x of [-2, 0, 2]) box(g, 1.2, 0.04, 0.2, glow('#ffffff', 1.1), x, H - 0.32, FZ - bay / 2);
  cyl(g, 1.0, 1.05, 0.08, mat('#0f172a', 0.25, 0.6), -0.9, 0.08, FZ - bay / 2 - 0.05, 24);
  const car = createVehicleMesh(VEHICLE_CATALOG[5] ?? VEHICLE_CATALOG[0]).group;
  car.scale.setScalar(0.5);
  car.rotation.y = 0.9;
  car.position.set(-0.9, 0.12, FZ - bay / 2 - 0.05);
  g.add(car);
  // Glass curtain wall with mullions
  box(g, W - 0.6, H - 0.3, 0.04, glass('#8fb8d0', 0.2), 0, (H - 0.3) / 2, FZ - 0.05);
  for (let i = 0; i <= 3; i++) box(g, 0.07, H - 0.3, 0.1, alu, -HX + 0.3 + (i * (W - 0.6)) / 3, (H - 0.3) / 2, FZ - 0.02);
  box(g, W - 0.6, 0.06, 0.1, alu, 0, 2.45, FZ - 0.02);
  // Automatic door frame
  box(g, 1.5, 0.08, 0.12, alu, 1.55, 2.25, FZ + 0.01);
  box(g, 0.02, 2.2, 0.1, alu, 1.55, 1.1, FZ + 0.0);

  // Slanted blue canopy rising to the front, with an LED edge
  const prof = new THREE.Shape();
  prof.moveTo(-D / 2 - 0.1, 0);
  prof.lineTo(D / 2 + 1.1, 0.35);
  prof.lineTo(D / 2 + 1.1, 0.95);
  prof.lineTo(-D / 2 - 0.1, 0.32);
  prof.closePath();
  const canopyGeo = new THREE.ExtrudeGeometry(prof, { depth: W + 0.4, bevelEnabled: false });
  canopyGeo.translate(0, 0, -(W + 0.4) / 2);
  canopyGeo.rotateY(-Math.PI / 2);
  const canopy = new THREE.Mesh(canopyGeo, blue);
  canopy.position.y = H;
  g.add(canopy);
  box(g, W + 0.4, 0.06, 0.06, glow('#93c5fd', 1.4), 0, H + 0.36, D / 2 + 1.12);
  // Wordmark on the canopy front
  const word = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.52),
    signMat('APEX MOTORS', { bg: '#1d4ed8', fg: '#ffffff', font: 'italic 800 78px Outfit, sans-serif', w: 768, h: 96 })
  );
  word.position.set(0, H + 0.64, D / 2 + 1.13);
  word.rotation.x = -0.12;
  g.add(word);
  // Slim support posts for the overhang
  for (const x of [-HX + 0.1, HX - 0.1]) cyl(g, 0.05, 0.05, H + 0.3, alu, x, (H + 0.3) / 2, FZ + 1.0, 8);

  // Logo pylon at the front corner
  const px = HX - 0.2;
  const pz = FZ + 1.75;
  box(g, 0.55, 4.2, 0.32, graphite, px, 2.1, pz, 0.05);
  box(g, 0.5, 1.4, 0.34, blue, px, 3.35, pz, 0.04);
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.44),
    signMat('A', { bg: '#1d4ed8', fg: '#ffffff', font: 'italic 900 200px Outfit, sans-serif', w: 256, h: 256 })
  );
  logo.position.set(px, 3.55, pz + 0.18);
  g.add(logo);
  box(g, 0.44, 0.04, 0.02, glow('#93c5fd', 1.2), px, 3.0, pz + 0.18);
  colliders.push({ kind: 'circle', x: px, z: pz, r: 0.4 });
  // Two feather flags at the other corner
  for (const [i, x] of [-HX + 0.25, -HX + 0.95].entries()) {
    cyl(g, 0.025, 0.025, 2.6, alu, x, 1.3, FZ + 1.75, 6);
    const flag = box(g, 0.32, 1.5, 0.02, i ? mat('#ffffff', 0.6) : blue, x + 0.17, 1.8, FZ + 1.75);
    flag.rotation.y = 0.25;
    colliders.push({ kind: 'circle', x, z: FZ + 1.75, r: 0.2 });
  }
  return { group: g, colliders };
}

// ================= Fresh Wholesale =================
function buildMarket(): ShopBuild {
  const g = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const brick = brickMaterial(3, 1.4);
  const green = mat('#2f7d4f', 0.5, 0.35);
  const cream = mat('#f4ead6', 0.6);
  const H = 2.9;
  shellWithBay(g, brick, H, H, 0.6, glow('#fff3d6', 0.6));
  // Barrel-vault corrugated roof
  const ribs = canvasTex(64, 64, (ctx) => {
    ctx.fillStyle = '#2f7d4f';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) ctx.fillRect(0, i * 16, 64, 5);
  }, 1, 18);
  const roofMat = new THREE.MeshStandardMaterial({ map: ribs, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide });
  const vault = new THREE.Mesh(new THREE.CylinderGeometry(HX + 0.15, HX + 0.15, D + 0.5, 22, 1, true, -Math.PI / 2, Math.PI), roofMat);
  vault.rotation.x = -Math.PI / 2;
  vault.scale.set(1, 1, 0.5);
  vault.position.set(0, H, 0);
  g.add(vault);
  // Gable ends: brick half-discs, the front one with a fan window
  for (const z of [-D / 2, D / 2]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(HX, HX, 0.1, 22, 1, false, -Math.PI / 2, Math.PI), brick);
    disc.rotation.x = -Math.PI / 2;
    disc.scale.set(1, 1, 0.5);
    disc.position.set(0, H, z);
    g.add(disc);
  }
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.04, 20, 1, false, -Math.PI / 2, Math.PI), glow('#fde9b8', 0.45));
  fan.rotation.x = -Math.PI / 2;
  fan.scale.set(1, 1, 0.5);
  fan.position.set(0, H + 0.02, D / 2 + 0.06);
  g.add(fan);
  for (let i = 1; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    const len = Math.hypot(2.5 * Math.cos(a), 1.25 * Math.sin(a));
    const bar = box(g, 0.05, len, 0.05, cream, 1.25 * Math.cos(a), H + 0.625 * Math.sin(a), D / 2 + 0.09);
    bar.rotation.z = Math.atan2(1.25 * Math.sin(a), 2.5 * Math.cos(a)) - Math.PI / 2;
  }
  box(g, 5.1, 0.08, 0.08, cream, 0, H + 0.02, D / 2 + 0.09);

  // Shopfront: green frame, glass sliding doors and windows
  for (const x of [-2.95, -0.85, 0.85, 2.95]) box(g, 0.16, H - 0.4, 0.14, green, x, (H - 0.4) / 2, FZ + 0.04);
  box(g, W - 0.5, 0.14, 0.14, green, 0, H - 0.45, FZ + 0.04);
  box(g, W - 0.84, H - 0.55, 0.04, glass('#d9f2e4', 0.35), 0, (H - 0.55) / 2, FZ + 0.01);
  box(g, 0.03, H - 0.6, 0.06, green, 0, (H - 0.6) / 2, FZ + 0.04);
  // Shelves of produce visible inside
  for (const x of [-1.9, 1.9]) {
    for (const y of [0.55, 1.15, 1.75]) {
      box(g, 1.6, 0.05, 0.35, cream, x, y, FZ - 0.4);
      for (let k = 0; k < 6; k++) {
        const col = ['#f97316', '#ef4444', '#84cc16', '#facc15', '#a855f7', '#22c55e'][(k + Math.round(y * 3)) % 6];
        box(g, 0.2, 0.18, 0.22, mat(col, 0.7), x - 0.65 + k * 0.26, y + 0.12, FZ - 0.4);
      }
    }
  }
  // Wide green-and-white striped awning
  const stripes = 14;
  const aw = W + 0.2;
  const sw = aw / stripes;
  for (let i = 0; i < stripes; i++) {
    const s = box(g, sw, 0.05, 1.25, i % 2 ? mat('#ffffff', 0.6) : green, -aw / 2 + sw * (i + 0.5), H - 0.15, FZ + 0.55);
    s.rotation.x = 0.32;
  }
  box(g, aw, 0.22, 0.04, green, 0, H - 0.47, FZ + 1.15);
  // Sign board with a leaf mark, between awning and fan window
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 0.56),
    signMat('🍃 FRESH WHOLESALE', { bg: '#1f5d3a', fg: '#ffffff', font: '800 62px Outfit, sans-serif', border: '#f4ead6', w: 768, h: 116 })
  );
  sign.position.set(0, H + 0.3, D / 2 + 0.13);
  g.add(sign);

  // Produce stands out front
  const wood = mat('#a0703f', 0.8);
  const fruit: [string, number][] = [
    ['#f97316', 0.11],
    ['#dc2626', 0.1],
    ['#84cc16', 0.09],
    ['#7c3aed', 0.07],
  ];
  for (const side of [-1, 1]) {
    const sx = side * 2.45;
    const sz = FZ + 0.85;
    box(g, 1.3, 0.62, 0.8, wood, sx, 0.31, sz, 0.03);
    for (let c = 0; c < 2; c++) {
      const [col, r] = fruit[(c + (side > 0 ? 2 : 0)) % 4];
      const cx = sx - 0.32 + c * 0.64;
      const crate = box(g, 0.58, 0.18, 0.66, mat('#c99a62', 0.8), cx, 0.72, sz, 0.02);
      crate.rotation.x = -0.2;
      const fm = mat(col, 0.55);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), fm);
          f.position.set(cx - 0.17 + i * 0.17, 0.84 + j * 0.035, sz - 0.2 + j * 0.2);
          g.add(f);
        }
    }
    colliders.push({ kind: 'aabb', minX: sx - 0.7, maxX: sx + 0.7, minZ: sz - 0.45, maxZ: sz + 0.45 });
  }
  return { group: g, colliders };
}

// ================= Metro Bank =================
function buildBank(): ShopBuild {
  const g = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const lime = stoneMaterial('#ece4d2', 3, 2);
  const limeTrim = mat('#f5efe2', 0.6);
  const gold = mat('#d4a640', 0.3, 0.8);
  const bronze = mat('#6b4423', 0.4, 0.6);
  const H = 3.9;
  const recess = 0.9;
  // Body set back behind the colonnade
  box(g, W, H, D - recess, lime, 0, H / 2, -recess / 2);
  // Rusticated base band
  box(g, W + 0.08, 0.5, D - recess + 0.08, mat('#cfc3ab', 0.8), 0, 0.25, -recess / 2);
  // Portico floor and three steps
  box(g, W, 0.36, recess, limeTrim, 0, 0.18, FZ - recess / 2);
  for (let i = 0; i < 3; i++) box(g, W - 0.6 - i * 0.2, 0.12, 0.16, limeTrim, 0, 0.3 - i * 0.12, FZ + 0.08 + i * 0.15);
  // Bronze double door with a fanlight, tall barred windows
  const fz = FZ - recess;
  box(g, 1.5, 2.5, 0.12, limeTrim, 0, 1.6, fz + 0.04);
  box(g, 1.2, 2.2, 0.08, bronze, 0, 1.46, fz + 0.1);
  box(g, 0.03, 2.2, 0.1, gold, 0, 1.46, fz + 0.14);
  for (const x of [-0.18, 0.18]) cyl(g, 0.03, 0.03, 0.3, gold, x, 1.4, fz + 0.16, 8);
  const fanlight = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 16, 1, false, -Math.PI / 2, Math.PI), glow('#ffe7b0', 0.5));
  fanlight.rotation.x = -Math.PI / 2;
  fanlight.position.set(0, 2.62, fz + 0.1);
  g.add(fanlight);
  for (const x of [-2.3, 2.3]) {
    box(g, 0.95, 1.9, 0.08, limeTrim, x, 1.75, fz + 0.04);
    box(g, 0.75, 1.7, 0.06, mat('#33415c', 0.15, 0.3, { emissive: '#ffe1a8', emissiveIntensity: 0.25 }), x, 1.75, fz + 0.08);
    for (let i = 0; i < 4; i++) box(g, 0.03, 1.7, 0.04, mat('#1f2937', 0.4, 0.6), x - 0.28 + i * 0.187, 1.75, fz + 0.13);
    box(g, 1.1, 0.14, 0.2, limeTrim, x, 2.8, fz + 0.1);
  }
  // Four columns: base, fluted shaft, capital
  const colH = H - 0.36 - 0.55;
  for (const x of [-2.55, -0.95, 0.95, 2.55]) {
    const cz = FZ - 0.35;
    box(g, 0.62, 0.16, 0.62, limeTrim, x, 0.44, cz);
    cyl(g, 0.24, 0.27, colH - 0.3, mat('#f7f2e7', 0.55), x, 0.52 + (colH - 0.3) / 2, cz, 16);
    box(g, 0.66, 0.2, 0.66, limeTrim, x, 0.52 + colH - 0.2, cz);
    colliders.push({ kind: 'circle', x, z: cz, r: 0.3 });
  }
  // Entablature with a gold frieze
  box(g, W + 0.2, 0.6, recess + 0.25, limeTrim, 0, H - 0.25, FZ - recess / 2 + 0.05);
  const frieze = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 0.42),
    signMat('METRO  BANK', { bg: '#f5efe2', fg: '#a87b1f', font: '700 82px Georgia, "Times New Roman", serif', w: 768, h: 96 })
  );
  frieze.position.set(0, H - 0.25, FZ + 0.19);
  g.add(frieze);
  box(g, W + 0.3, 0.1, recess + 0.35, mat('#ddd3bf', 0.6), 0, H + 0.08, FZ - recess / 2 + 0.05);
  // Pediment with a clock
  const tri = new THREE.Shape();
  tri.moveTo(-(W + 0.2) / 2, 0);
  tri.lineTo((W + 0.2) / 2, 0);
  tri.lineTo(0, 1.05);
  tri.closePath();
  const pedGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: false });
  const ped = new THREE.Mesh(pedGeo, limeTrim);
  ped.position.set(0, H + 0.13, FZ - 0.31);
  g.add(ped);
  cyl(g, 0.32, 0.32, 0.06, gold, 0, H + 0.5, FZ + 0.21, 20).rotation.x = Math.PI / 2;
  cyl(g, 0.26, 0.26, 0.04, mat('#fffaf0', 0.4), 0, H + 0.5, FZ + 0.25, 20).rotation.x = Math.PI / 2;
  box(g, 0.025, 0.2, 0.02, mat('#1f2937', 0.4), 0, H + 0.57, FZ + 0.28);
  const hand = box(g, 0.025, 0.15, 0.02, mat('#1f2937', 0.4), 0.05, H + 0.48, FZ + 0.28);
  hand.rotation.z = -1.1;
  // Roof: parapet with a balustrade along the sides
  box(g, W + 0.2, 0.18, D - recess + 0.2, limeTrim, 0, H + 0.09, -recess / 2);
  for (let i = 0; i < 14; i++) {
    const z = -D / 2 + 0.2 + i * ((D - recess - 0.4) / 13);
    for (const x of [-HX + 0.05, HX - 0.05]) cyl(g, 0.05, 0.07, 0.35, limeTrim, x, H + 0.36, z, 8);
  }
  for (const x of [-HX + 0.05, HX - 0.05]) box(g, 0.16, 0.08, D - recess, limeTrim, x, H + 0.57, -recess / 2);
  // Lead-grey roof deck and a copper-green dome on a drum (reads from the gameplay camera)
  box(g, W - 0.1, 0.03, D - recess - 0.1, mat('#8a8f96', 0.75), 0, H + 0.195, -recess / 2);
  const dz = -recess / 2 - 0.2;
  cyl(g, 1.05, 1.1, 0.55, limeTrim, 0, H + 0.48, dz, 24);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(g, 0.12, 0.38, 0.06, mat('#33415c', 0.2, 0.3, { emissive: '#ffe1a8', emissiveIntensity: 0.2 }), Math.sin(a) * 1.08, H + 0.48, dz + Math.cos(a) * 1.08).rotation.y = a;
  }
  cyl(g, 1.12, 1.12, 0.08, limeTrim, 0, H + 0.79, dz, 24);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#5f9e8f', 0.5, 0.35));
  dome.position.set(0, H + 0.82, dz);
  g.add(dome);
  cyl(g, 0.12, 0.16, 0.3, limeTrim, 0, H + 1.95, dz, 10);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), gold);
  finial.position.set(0, H + 2.17, dz);
  g.add(finial);
  // Bronze lanterns beside the door
  for (const x of [-0.95, 0.95]) {
    box(g, 0.2, 0.32, 0.2, bronze, x, 2.35, fz + 0.25, 0.03);
    box(g, 0.14, 0.22, 0.14, glow('#ffd58a', 1.0), x, 2.35, fz + 0.25);
  }
  return { group: g, colliders };
}

const BUILDERS: Record<ShopZoneId, () => ShopBuild> = {
  clothing: buildAtelier,
  dealership: buildMotors,
  supermarket: buildMarket,
  bank: buildBank,
};

/** A unique building for a town shop, baked into one mesh per material. */
export function createShopBuilding(zone: ShopZoneId): ShopBuild {
  const raw = BUILDERS[zone]();
  raw.group.name = `shop_${zone}`;
  const { group } = mergeByMaterial(raw.group, { castShadow: true });
  // Glass and see-through bits should not throw solid shadows
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.material as THREE.Material).transparent) m.castShadow = false;
  });
  return { group, colliders: raw.colliders };
}

/** Colliders moved from a building's local space into the world (rotY 0 or PI). */
export function placeShopColliders(colliders: WorldCollider[], x: number, z: number, rotY: number): WorldCollider[] {
  const flip = Math.abs(Math.sin(rotY / 2)) > 0.7 ? -1 : 1;
  return colliders.map((c) => {
    if (c.kind === 'circle') return { ...c, x: x + c.x * flip, z: z + c.z * flip };
    const a = c as Extract<WorldCollider, { kind: 'aabb' }>;
    const xs = [x + a.minX * flip, x + a.maxX * flip];
    const zs = [z + a.minZ * flip, z + a.maxZ * flip];
    return { ...a, minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  });
}
