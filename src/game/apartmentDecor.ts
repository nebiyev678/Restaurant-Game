import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeByMaterial } from './kitchenDecor';

/**
 * "Sunset Loft": the player's starter apartment.
 * Sage-green wainscoting under warm cream walls, a terracotta arch behind the bed,
 * herringbone oak floor, a big arched window onto a sunset skyline, a mint kitchenette,
 * a reading corner, a desk nook and a bookshelf. Arches and round shapes repeat throughout.
 *
 * Coordinates are local to the house (centre of the floor at x = z = 0, open front toward +Z,
 * floor surface at y = 0.16). Spots kept free for furniture bought in the shop:
 * sofa (0.8, -0.3), TV on the back wall at x 0.8, plant in the back-right corner,
 * dining table (-1.3, 1.2), arcade (w/2 - 1.1, 1.2), piano (2.2, -0.8).
 */

const FLOOR_Y = 0.16;

const PAL = {
  cream: '#f6e7d3',
  sage: '#9db89a',
  sageDark: '#7d9a7a',
  terracotta: '#d9774f',
  mustard: '#e8b04a',
  walnut: '#7a4a2c',
  oak: '#c98d55',
  mint: '#a8dcc8',
  black: '#2a2624',
  blush: '#f2b8a2',
  white: '#fbf6ee',
};

type Mats = ReturnType<typeof buildMats>;
let MATS: Mats | null = null;

function std(color: string, roughness = 0.6, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Wide warm-oak planks with staggered joints (one texture tile = 1.2 m). */
function herringboneTexture(w: number, d: number) {
  return canvasTex(
    512,
    512,
    (ctx) => {
      const rnd = seeded(11);
      const rows = 6;
      const ph = 512 / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rnd() * 200;
        while (x < 512) {
          const len = 180 + rnd() * 160;
          const t = 0.92 + rnd() * 0.14;
          const g = ctx.createLinearGradient(0, r * ph, 0, (r + 1) * ph);
          g.addColorStop(0, `rgb(${Math.round(214 * t)},${Math.round(154 * t)},${Math.round(98 * t)})`);
          g.addColorStop(1, `rgb(${Math.round(198 * t)},${Math.round(138 * t)},${Math.round(84 * t)})`);
          ctx.fillStyle = g;
          ctx.fillRect(x, r * ph, len, ph);
          // Soft grain lines
          ctx.strokeStyle = 'rgba(120,70,35,0.10)';
          ctx.lineWidth = 1;
          for (let k = 0; k < 4; k++) {
            const y = r * ph + 8 + rnd() * (ph - 16);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + len * 0.3, y + 3, x + len * 0.7, y - 3, x + len, y);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(70,40,18,0.35)';
          ctx.fillRect(x, r * ph, 2, ph);
          x += len;
        }
        ctx.fillStyle = 'rgba(70,40,18,0.3)';
        ctx.fillRect(0, r * ph, 512, 2);
      }
    },
    [w / 1.2, d / 1.2]
  );
}

/** Round rug: terracotta and cream rings with a scalloped border. */
function rugTexture() {
  return canvasTex(256, 256, (ctx) => {
    const c = 128;
    const rings = ['#e8b04a', '#f6e7d3', '#d9774f', '#f6e7d3', '#9db89a', '#f6e7d3', '#d9774f'];
    rings.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(c, c, 126 - i * 16, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#d9774f';
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * 112, c + Math.sin(a) * 112, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Sunset sky behind the window, with a soft sun. */
function skyTexture() {
  return canvasTex(128, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#5b6fb8');
    g.addColorStop(0.45, '#f29e7a');
    g.addColorStop(0.8, '#ffd39a');
    g.addColorStop(1, '#ffe9c2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    const s = ctx.createRadialGradient(80, 175, 2, 80, 175, 40);
    s.addColorStop(0, 'rgba(255,250,220,1)');
    s.addColorStop(1, 'rgba(255,230,170,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 100, 128, 156);
  });
}

/** Small abstract print (arches and suns) for the frames. */
function artTexture(seed: number) {
  return canvasTex(128, 160, (ctx) => {
    const rnd = seeded(seed);
    const cols = [PAL.terracotta, PAL.mustard, PAL.sage, PAL.blush, '#5b6fb8'];
    ctx.fillStyle = '#f8efe2';
    ctx.fillRect(0, 0, 128, 160);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
      const x = 20 + rnd() * 88;
      const y = 40 + rnd() * 90;
      const r = 18 + rnd() * 26;
      ctx.beginPath();
      if (i === 1) {
        ctx.arc(x, y, r, Math.PI, 0);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
      } else ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function buildMats() {
  return {
    sage: std(PAL.sage, 0.65),
    sageDark: std(PAL.sageDark, 0.6),
    terracotta: std(PAL.terracotta, 0.7),
    mustard: std(PAL.mustard, 0.75),
    walnut: std(PAL.walnut, 0.55),
    oak: std(PAL.oak, 0.55),
    mint: std(PAL.mint, 0.4, { metalness: 0.1 }),
    black: std(PAL.black, 0.45, { metalness: 0.35 }),
    blush: std(PAL.blush, 0.75),
    white: std(PAL.white, 0.55),
    linen: std('#efe4d2', 0.85),
    brass: std('#d4a24c', 0.3, { metalness: 0.8 }),
    steel: std('#d9dcdf', 0.3, { metalness: 0.7 }),
    leaf: std('#4e9a47', 0.6),
    leafLight: std('#78b85c', 0.6),
    pot: std('#e3d3bf', 0.7),
    glow: std('#fff1cf', 0.4, { emissive: '#ffcf7a', emissiveIntensity: 1.1 }),
    bulb: std('#fff6dc', 0.3, { emissive: '#ffd27f', emissiveIntensity: 1.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe6f0', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false }),
    skyline: std('#4b4f7a', 0.9),
    skylineFar: std('#7a74a8', 0.9),
    windowLit: std('#ffd98a', 0.5, { emissive: '#ffbf5a', emissiveIntensity: 0.9 }),
    book: [std('#d9774f', 0.7), std('#e8b04a', 0.7), std('#7d9a7a', 0.7), std('#5b6fb8', 0.7), std('#f2b8a2', 0.7), std('#f6e7d3', 0.7)],
  };
}

function M(): Mats {
  if (!MATS) MATS = buildMats();
  return MATS;
}

// ---------------------------------------------------------------- helpers

function rb(w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, seg = 2) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
  m.position.set(x, y, z);
  return m;
}

function cyl(rt: number, rbm: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbm, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}

/** Arch outline (rectangle with a semicircular top), base at y = 0, centred on x. */
function archShape(w: number, h: number) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  s.absarc(0, h - r, r, Math.PI, 0, true);
  s.lineTo(r, 0);
  s.closePath();
  return s;
}

function plant(g: THREE.Group, x: number, z: number, scale = 1, y = FLOOR_Y) {
  const m = M();
  g.add(cyl(0.16 * scale, 0.12 * scale, 0.26 * scale, m.pot, x, y + 0.13 * scale, z, 14));
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 8, 6), i % 2 ? m.leaf : m.leafLight);
    leaf.scale.set(0.55, 1.6, 0.3);
    leaf.position.set(x + Math.cos(a) * 0.07 * scale, y + (0.42 + (i % 3) * 0.06) * scale, z + Math.sin(a) * 0.07 * scale);
    leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
    g.add(leaf);
  }
}

function trailingPlant(g: THREE.Group, x: number, y: number, z: number) {
  const m = M();
  g.add(cyl(0.12, 0.09, 0.16, m.terracotta, x, y, z, 12));
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const len = 0.15 + (i % 3) * 0.1;
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), k % 2 ? m.leaf : m.leafLight);
      leaf.position.set(x + Math.cos(a) * (0.1 + k * 0.02), y + 0.05 - k * len * 0.6, z + Math.sin(a) * (0.1 + k * 0.02));
      g.add(leaf);
    }
  }
}

function frame(g: THREE.Group, w: number, h: number, tex: THREE.Texture, x: number, y: number, z: number, rotY = 0) {
  const m = M();
  const f = new THREE.Group();
  f.add(rb(w + 0.06, h + 0.06, 0.03, 0.01, m.walnut, 0, 0, 0, 1));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  art.position.z = 0.017;
  f.add(art);
  f.position.set(x, y, z);
  f.rotation.y = rotY;
  g.add(f);
}

// ---------------------------------------------------------------- the apartment

export interface ApartmentBuild {
  group: THREE.Group;
  /** Walkable-space blockers, local to the house. */
  colliders: ({ kind: 'aabb'; minX: number; maxX: number; minZ: number; maxZ: number } | { kind: 'circle'; x: number; z: number; r: number })[];
}

export function createStarterApartment(w: number, d: number, wallH: number): ApartmentBuild {
  const m = M();
  const g = new THREE.Group();
  const wallTop = FLOOR_Y + wallH;
  const backZ = -d / 2 + 0.26; // inner face of the back wall
  const leftX = -w / 2 + 0.26;
  const rightX = w / 2 - 0.26;
  const colliders: ApartmentBuild['colliders'] = [];

  // ---- Shell finishes: herringbone floor, sage wainscot with a walnut rail, cream upper walls
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.5, d - 0.26), new THREE.MeshStandardMaterial({ map: herringboneTexture(w, d), roughness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR_Y + 0.003, 0.13);
  floor.receiveShadow = true;
  g.add(floor);
  const wainH = 1.0;
  const walls: [number, number, number, number, number][] = [
    // w, d, x, z, rotY
    [w - 0.52, 0.03, 0, backZ + 0.015, 0],
    [d - 0.26, 0.03, leftX + 0.015, 0.13, Math.PI / 2],
    [d - 0.26, 0.03, rightX - 0.015, 0.13, Math.PI / 2],
  ];
  const shell = new THREE.Group();
  for (const [len, , x, z, rot] of walls) {
    const panel = rb(len, wainH, 0.03, 0.01, m.sage, 0, 0, 0, 1);
    const rail = rb(len, 0.05, 0.06, 0.015, m.walnut, 0, wainH / 2, 0, 1);
    const base = rb(len, 0.1, 0.05, 0.01, m.white, 0, -wainH / 2 + 0.05, 0.01, 1);
    const wg = new THREE.Group();
    wg.add(panel, rail, base);
    // Vertical batten strips on the wainscot
    const n = Math.floor(len / 0.45);
    for (let i = 1; i < n; i++) wg.add(rb(0.03, wainH - 0.16, 0.02, 0.005, m.sageDark, -len / 2 + i * (len / n), 0.02, 0.022, 1));
    wg.position.set(x, FLOOR_Y + wainH / 2, z);
    wg.rotation.y = rot;
    shell.add(wg);
  }

  // ---- Terracotta arch painted behind the bed, with an arched upholstered headboard
  const bedX = -w / 2 + 1.4;
  const bedZ = -d / 2 + 1.4;
  const archPaint = new THREE.Mesh(new THREE.ShapeGeometry(archShape(2.3, 2.35), 24), m.terracotta);
  archPaint.position.set(bedX, FLOOR_Y + 0.0, backZ + 0.035);
  shell.add(archPaint);
  const bed = new THREE.Group();
  bed.add(rb(1.74, 0.26, 2.2, 0.06, m.walnut, 0, 0.13, 0, 3));
  bed.add(rb(1.6, 0.22, 2.02, 0.08, m.white, 0, 0.36, 0.04, 3));
  bed.add(rb(1.66, 0.12, 1.3, 0.06, m.mustard, 0, 0.47, 0.42, 3));
  bed.add(rb(1.68, 0.06, 0.36, 0.03, m.sage, 0, 0.53, 0.95, 2));
  for (const px of [-0.42, 0.42]) {
    const pillow = rb(0.62, 0.16, 0.36, 0.08, m.linen, px, 0.55, -0.72, 3);
    pillow.rotation.x = -0.25;
    bed.add(pillow);
  }
  const cushion = rb(0.38, 0.3, 0.12, 0.06, m.blush, 0, 0.6, -0.6, 3);
  cushion.rotation.x = -0.3;
  bed.add(cushion);
  const headboard = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape(1.7, 1.25), { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3, curveSegments: 20 }), m.sage);
  headboard.position.set(0, 0.0, -1.16);
  bed.add(headboard);
  bed.position.set(bedX, FLOOR_Y, bedZ);
  g.add(bed);
  colliders.push({ kind: 'aabb', minX: bedX - 0.88, maxX: bedX + 0.88, minZ: bedZ - 1.2, maxZ: bedZ + 1.12 });
  // Round nightstand with a mushroom lamp, and a print above
  const nsX = bedX + 1.18;
  const nsZ = backZ + 0.32;
  g.add(cyl(0.24, 0.24, 0.05, m.oak, nsX, FLOOR_Y + 0.55, nsZ, 20));
  g.add(cyl(0.05, 0.08, 0.5, m.oak, nsX, FLOOR_Y + 0.27, nsZ, 10));
  g.add(cyl(0.18, 0.2, 0.03, m.oak, nsX, FLOOR_Y + 0.015, nsZ, 16));
  g.add(cyl(0.025, 0.05, 0.22, m.mustard, nsX, FLOOR_Y + 0.69, nsZ, 10));
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.glow);
  shade.position.set(nsX, FLOOR_Y + 0.78, nsZ);
  g.add(shade);
  colliders.push({ kind: 'circle', x: nsX, z: nsZ, r: 0.27 });
  frame(g, 0.42, 0.52, artTexture(3), bedX, FLOOR_Y + 1.75, backZ + 0.05);

  // ---- Big arched window onto a sunset skyline (between the nightstand and the TV spot)
  const winX = -0.8;
  const winW = 1.1;
  const winH = 1.6;
  const winY = FLOOR_Y + 0.85;
  const win = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.ShapeGeometry(archShape(winW, winH), 24), new THREE.MeshBasicMaterial({ map: skyTexture(), toneMapped: true }));
  // ShapeGeometry UVs are in shape units: normalise them to 0..1
  const uv = sky.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + winW / 2) / winW, uv.getY(i) / winH);
  sky.position.z = 0.04;
  win.add(sky);
  // Skyline silhouettes (far and near) with a few lit windows
  const rnd = seeded(7);
  for (const [mat, depthZ, hMax] of [
    [m.skylineFar, 0.045, 0.8],
    [m.skyline, 0.05, 0.55],
  ] as const) {
    let x = -winW / 2 + 0.03;
    while (x < winW / 2 - 0.05) {
      const bw = 0.1 + rnd() * 0.12;
      const bh = 0.2 + rnd() * hMax;
      const bwClamped = Math.min(bw, winW / 2 - 0.03 - x);
      win.add(new THREE.Mesh(new THREE.PlaneGeometry(bwClamped, bh), mat).translateX(x + bwClamped / 2).translateY(bh / 2).translateZ(depthZ));
      if (mat === m.skyline)
        for (let k = 0; k < 3; k++)
          if (rnd() < 0.6) win.add(new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.025), m.windowLit).translateX(x + 0.025 + rnd() * (bwClamped - 0.05)).translateY(0.05 + rnd() * (bh - 0.1)).translateZ(depthZ + 0.002));
      x += bwClamped + 0.01;
    }
  }
  // Frame, mullions, sill, glass
  const frameGeo = new THREE.ExtrudeGeometry(
    (() => {
      const outer = archShape(winW + 0.16, winH + 0.08);
      outer.holes.push(new THREE.Path(archShape(winW, winH).getPoints(24).map((p) => new THREE.Vector2(p.x, p.y + 0.04))));
      return outer;
    })(),
    { depth: 0.08, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 24 }
  );
  const winFrame = new THREE.Mesh(frameGeo, m.white);
  winFrame.position.set(0, -0.04, 0.02);
  win.add(winFrame);
  win.add(rb(0.035, winH - 0.05, 0.04, 0.01, m.white, 0, (winH - 0.05) / 2, 0.08, 1));
  win.add(rb(winW, 0.035, 0.04, 0.01, m.white, 0, winH * 0.42, 0.08, 1));
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(archShape(winW, winH), 24), m.glass);
  glass.position.z = 0.07;
  win.add(glass);
  win.add(rb(winW + 0.3, 0.05, 0.22, 0.02, m.white, 0, -0.03, 0.1, 2));
  win.position.set(winX, winY, backZ);
  g.add(win);
  trailingPlant(g, winX + 0.35, winY + 0.05, backZ + 0.14);
  g.add(cyl(0.07, 0.06, 0.12, m.pot, winX - 0.35, winY + 0.06, backZ + 0.14, 12));
  plant(g, winX - 0.35, backZ + 0.14, 0.5, winY);

  // ---- Mint kitchenette along the left wall (front half)
  const kz0 = 0.25;
  const kz1 = 2.55;
  const kLen = kz1 - kz0;
  const kc = (kz0 + kz1) / 2;
  const kitchen = new THREE.Group();
  kitchen.add(rb(kLen, 0.78, 0.58, 0.04, m.mint, 0, 0.08 + 0.39, 0.29, 3));
  kitchen.add(rb(kLen - 0.04, 0.08, 0.5, 0.02, m.black, 0, 0.04, 0.27, 1));
  const doors = Math.round(kLen / 0.46);
  for (let i = 0; i < doors; i++) {
    const x = -kLen / 2 + (i + 0.5) * (kLen / doors);
    kitchen.add(rb(kLen / doors - 0.04, 0.62, 0.025, 0.015, m.mint, x, 0.47, 0.59, 2));
    kitchen.add(cyl(0.022, 0.022, 0.03, m.brass, x + (i % 2 ? -1 : 1) * (kLen / doors / 2 - 0.08), 0.68, 0.615, 10).rotateX(Math.PI / 2));
  }
  kitchen.add(rb(kLen + 0.04, 0.05, 0.64, 0.02, m.oak, 0, 0.885, 0.31, 2));
  // Sink with a brass tap, two-ring hob with a little pan
  kitchen.add(rb(0.44, 0.03, 0.34, 0.03, m.steel, -0.55, 0.9, 0.3, 2));
  kitchen.add(cyl(0.015, 0.015, 0.24, m.brass, -0.55, 1.02, 0.12, 8));
  kitchen.add(rb(0.03, 0.03, 0.14, 0.01, m.brass, -0.55, 1.13, 0.18, 1));
  kitchen.add(rb(0.5, 0.02, 0.38, 0.01, m.black, 0.35, 0.92, 0.3, 1));
  for (const x of [0.24, 0.46]) kitchen.add(cyl(0.08, 0.08, 0.008, m.steel, x, 0.935, 0.3, 16));
  kitchen.add(cyl(0.11, 0.09, 0.07, m.terracotta, 0.24, 0.975, 0.3, 16));
  kitchen.add(rb(0.22, 0.02, 0.03, 0.01, m.walnut, 0.06, 0.995, 0.3, 1));
  // Open shelves with jars, bowls and a plant; a brass rail with utensils
  for (const [y, items] of [
    [1.55, 'jars'],
    [1.95, 'bowls'],
  ] as const) {
    kitchen.add(rb(kLen - 0.2, 0.04, 0.24, 0.012, m.oak, 0, y, 0.12, 1));
    for (let i = 0; i < 6; i++) {
      const x = -kLen / 2 + 0.3 + i * ((kLen - 0.6) / 5);
      if (items === 'jars') {
        kitchen.add(cyl(0.05, 0.05, 0.14, m.glass, x, y + 0.09, 0.12, 10));
        kitchen.add(cyl(0.045, 0.045, 0.09, [m.mustard, m.terracotta, m.sage][i % 3], x, y + 0.065, 0.12, 10));
        kitchen.add(cyl(0.052, 0.052, 0.02, m.oak, x, y + 0.17, 0.12, 10));
      } else if (i !== 2) {
        for (let k = 0; k < 3; k++) kitchen.add(cyl(0.09 - k * 0.008, 0.06 - k * 0.006, 0.04, [m.white, m.blush, m.sage][i % 3], x, y + 0.04 + k * 0.04, 0.12, 14));
      }
    }
  }
  kitchen.add(cyl(0.012, 0.012, kLen - 0.5, m.brass, 0, 1.25, 0.06, 8).rotateZ(Math.PI / 2));
  for (let i = 0; i < 4; i++) {
    const x = -kLen / 2 + 0.5 + i * 0.35;
    kitchen.add(cyl(0.006, 0.006, 0.2, m.steel, x, 1.14, 0.06, 6));
    kitchen.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), i % 2 ? m.walnut : m.steel).translateX(x).translateY(1.03).translateZ(0.06));
  }
  kitchen.rotation.y = Math.PI / 2;
  kitchen.position.set(leftX, FLOOR_Y, kc);
  g.add(kitchen);
  plant(g, leftX + 0.14, kc + 0.25, 0.45, FLOOR_Y + 1.99);
  colliders.push({ kind: 'aabb', minX: leftX, maxX: leftX + 0.66, minZ: kz0 - 0.02, maxZ: kz1 + 0.02 });
  // Retro mint fridge at the front end of the kitchenette
  const fr = new THREE.Group();
  fr.add(rb(0.66, 1.62, 0.62, 0.12, m.mint, 0, 0.88, 0, 4));
  fr.add(rb(0.62, 0.02, 0.02, 0.01, m.sageDark, 0, 1.16, 0.315, 1));
  for (const y of [0.85, 1.38]) fr.add(rb(0.04, 0.22, 0.05, 0.02, m.brass, 0.24, y, 0.33, 2));
  for (const x of [-0.22, 0.22]) fr.add(cyl(0.035, 0.04, 0.08, m.black, x, 0.04, 0.0, 10));
  fr.rotation.y = Math.PI / 2;
  fr.position.set(leftX + 0.34, FLOOR_Y, kz1 + 0.42);
  g.add(fr);
  colliders.push({ kind: 'aabb', minX: leftX, maxX: leftX + 0.68, minZ: kz1 + 0.08, maxZ: kz1 + 0.76 });
  // Pendant lamp over the kitchenette
  g.add(cyl(0.004, 0.004, 0.7, m.black, leftX + 0.9, wallTop - 0.35, kc, 4));
  const pend = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.terracotta);
  pend.rotation.x = Math.PI;
  pend.position.set(leftX + 0.9, wallTop - 0.7, kc);
  g.add(pend);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), m.bulb).translateX(leftX + 0.9).translateY(wallTop - 0.74).translateZ(kc));

  // ---- Desk nook on the right wall: oak desk, mustard chair, laptop, lamp, pinboard
  const dz = -1.95;
  const desk = new THREE.Group();
  desk.add(rb(1.1, 0.05, 0.56, 0.02, m.oak, 0, 0.74, 0.28, 2));
  for (const sx of [-0.5, 0.5]) for (const sz of [0.06, 0.5]) desk.add(cyl(0.02, 0.02, 0.72, m.black, sx, 0.36, sz, 8));
  desk.add(rb(0.34, 0.02, 0.24, 0.01, m.black, -0.1, 0.775, 0.32, 1));
  const screen = rb(0.34, 0.22, 0.015, 0.01, m.black, -0.1, 0.89, 0.2, 1);
  screen.rotation.x = -0.25;
  desk.add(screen);
  const screenLit = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.18), m.windowLit);
  screenLit.position.set(-0.1, 0.89, 0.21);
  screenLit.rotation.x = -0.25;
  desk.add(screenLit);
  desk.add(cyl(0.012, 0.012, 0.32, m.black, 0.38, 0.92, 0.12, 6));
  const dl = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 14, 1, true), m.mustard);
  dl.position.set(0.38, 1.1, 0.18);
  dl.rotation.x = 0.6;
  desk.add(dl);
  desk.add(cyl(0.012, 0.03, 0.06, m.glass, 0.25, 0.8, 0.4, 8));
  desk.rotation.y = -Math.PI / 2;
  desk.position.set(rightX, FLOOR_Y, dz);
  g.add(desk);
  colliders.push({ kind: 'aabb', minX: rightX - 0.6, maxX: rightX, minZ: dz - 0.58, maxZ: dz + 0.58 });
  const chair = new THREE.Group();
  chair.add(rb(0.44, 0.08, 0.44, 0.04, m.mustard, 0, 0.46, 0, 3));
  chair.add(rb(0.44, 0.4, 0.08, 0.04, m.mustard, 0, 0.72, 0.2, 3));
  for (const sx of [-0.18, 0.18]) for (const sz of [-0.18, 0.18]) chair.add(cyl(0.018, 0.018, 0.44, m.black, sx, 0.22, sz, 6));
  chair.rotation.y = Math.PI / 2 + 0.25;
  chair.position.set(rightX - 0.85, FLOOR_Y, dz + 0.05);
  g.add(chair);
  colliders.push({ kind: 'circle', x: rightX - 0.85, z: dz + 0.05, r: 0.26 });

  // ---- Bookshelf on the right wall (front half), books and trinkets
  const bz = 0.65;
  const shelf = new THREE.Group();
  const SW = 1.1;
  const SH = 1.9;
  shelf.add(rb(SW, SH, 0.04, 0.01, m.walnut, 0, SH / 2, 0.02, 1));
  for (const sx of [-1, 1]) shelf.add(rb(0.04, SH, 0.34, 0.01, m.walnut, (sx * (SW - 0.04)) / 2, SH / 2, 0.17, 1));
  const shelfYs = [0.06, 0.5, 0.94, 1.38, 1.86];
  shelfYs.forEach((y) => shelf.add(rb(SW, 0.04, 0.34, 0.01, m.walnut, 0, y, 0.17, 1)));
  const rb2 = seeded(3);
  for (let s = 0; s < 4; s++) {
    let x = -SW / 2 + 0.06;
    const y = shelfYs[s] + 0.02;
    const end = SW / 2 - 0.06;
    while (x < end - 0.05) {
      if (rb2() < 0.15 && x < end - 0.2) {
        plant(shelf, x + 0.08, 0.17, 0.4, y);
        x += 0.18;
        continue;
      }
      const bw = 0.035 + rb2() * 0.035;
      const bh = 0.24 + rb2() * 0.14;
      const book = rb(bw, bh, 0.24, 0.006, m.book[Math.floor(rb2() * m.book.length)], x + bw / 2, y + bh / 2, 0.16, 1);
      if (rb2() < 0.12) book.rotation.z = 0.25;
      shelf.add(book);
      x += bw + 0.006;
    }
  }
  shelf.rotation.y = -Math.PI / 2;
  shelf.position.set(rightX, FLOOR_Y, bz);
  g.add(shelf);
  colliders.push({ kind: 'aabb', minX: rightX - 0.38, maxX: rightX, minZ: bz - 0.58, maxZ: bz + 0.58 });

  // ---- Reading corner by the entrance: round armchair, arc floor lamp, side table
  const ax = w / 2 - 1.55;
  const az = d / 2 - 1.1;
  const arm = new THREE.Group();
  arm.add(cyl(0.48, 0.44, 0.34, m.terracotta, 0, 0.27, 0, 24));
  arm.add(cyl(0.42, 0.42, 0.1, m.linen, 0, 0.47, 0.04, 24));
  const back = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.13, 10, 24, Math.PI * 1.25), m.terracotta);
  back.rotation.set(Math.PI / 2, 0, -Math.PI * 0.125 + Math.PI);
  back.position.set(0, 0.56, 0);
  arm.add(back);
  arm.add(rb(0.34, 0.26, 0.1, 0.05, m.mustard, 0, 0.66, -0.2, 3).rotateX(-0.2));
  for (const a of [0.5, 2.6, 4.2]) arm.add(cyl(0.025, 0.02, 0.12, m.walnut, Math.cos(a) * 0.32, 0.06, Math.sin(a) * 0.32, 8));
  arm.rotation.y = Math.PI * 0.8;
  arm.position.set(ax, FLOOR_Y, az);
  g.add(arm);
  colliders.push({ kind: 'circle', x: ax, z: az, r: 0.5 });
  // Arc lamp curving over the chair
  const lampX = ax + 0.75;
  const lampZ = az + 0.45;
  g.add(cyl(0.16, 0.18, 0.05, m.black, lampX, FLOOR_Y + 0.025, lampZ, 18));
  const arc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(lampX, FLOOR_Y + 0.05, lampZ),
    new THREE.Vector3(lampX, FLOOR_Y + 1.5, lampZ),
    new THREE.Vector3(lampX - 0.35, FLOOR_Y + 2.0, lampZ - 0.25),
    new THREE.Vector3(ax + 0.05, FLOOR_Y + 1.75, az + 0.02),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 20, 0.018, 6, false), m.brass));
  const arcShade = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.brass);
  arcShade.position.set(ax + 0.05, FLOOR_Y + 1.72, az + 0.02);
  g.add(arcShade);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), m.bulb).translateX(ax + 0.05).translateY(FLOOR_Y + 1.66).translateZ(az + 0.02));
  colliders.push({ kind: 'circle', x: lampX, z: lampZ, r: 0.18 });
  // Side table with a book and a mug
  const stX = ax - 0.7;
  const stZ = az + 0.25;
  g.add(cyl(0.2, 0.2, 0.04, m.oak, stX, FLOOR_Y + 0.5, stZ, 18));
  g.add(cyl(0.03, 0.03, 0.48, m.black, stX, FLOOR_Y + 0.25, stZ, 8));
  g.add(rb(0.16, 0.035, 0.22, 0.008, m.terracotta, stX - 0.04, FLOOR_Y + 0.54, stZ, 1));
  g.add(cyl(0.04, 0.035, 0.08, m.white, stX + 0.09, FLOOR_Y + 0.56, stZ - 0.04, 12));
  colliders.push({ kind: 'circle', x: stX, z: stZ, r: 0.2 });

  // ---- Round rug in the middle of the living area
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.95 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.6, FLOOR_Y + 0.008, 0.25);
  rug.receiveShadow = true;
  g.add(rug);

  // ---- String lights along the top of the back wall
  const bulbs = 18;
  for (let i = 0; i < bulbs; i++) {
    const t = i / (bulbs - 1);
    const x = -w / 2 + 0.6 + t * (w - 1.2);
    const sag = Math.sin(((t * 3) % 1) * Math.PI) * 0.16;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), m.bulb).translateX(x).translateY(wallTop - 0.25 - sag).translateZ(backZ + 0.06));
  }
  for (let seg = 0; seg < 3; seg++) {
    const x0 = -w / 2 + 0.6 + (seg / 3) * (w - 1.2);
    const x1 = -w / 2 + 0.6 + ((seg + 1) / 3) * (w - 1.2);
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, wallTop - 0.24, backZ + 0.05), new THREE.Vector3((x0 + x1) / 2, wallTop - 0.56, backZ + 0.05), new THREE.Vector3(x1, wallTop - 0.24, backZ + 0.05));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.005, 3, false), m.black));
  }

  // Bake everything static into a few meshes; keep the window glass and floor/rug textures separate
  const baked = mergeByMaterial(g);
  const bakedShell = mergeByMaterial(shell, { castShadow: false });
  const out = new THREE.Group();
  out.add(baked.group, bakedShell.group);
  lastColliders.set(`${w.toFixed(2)},${d.toFixed(2)}`, colliders);
  return { group: out, colliders };
}

const lastColliders = new Map<string, ApartmentBuild['colliders']>();

/** Colliders of the starter apartment last built at this size (house-local). */
export function starterApartmentColliders(w: number, d: number): ApartmentBuild['colliders'] {
  return lastColliders.get(`${w.toFixed(2)},${d.toFixed(2)}`) ?? createStarterApartment(w, d, 2.65).colliders;
}

/** Warm spots of light in the apartment (lamp positions), for glow sprites and a fill light. */
export function starterApartmentLamps(w: number, d: number) {
  const backZ = -d / 2 + 0.26;
  return [
    { x: -w / 2 + 1.4 + 1.18, y: FLOOR_Y + 0.78, z: backZ + 0.32 },
    { x: w / 2 - 1.55 + 0.05, y: FLOOR_Y + 1.66, z: d / 2 - 1.1 + 0.02 },
    { x: -w / 2 + 0.26 + 0.9, y: FLOOR_Y + 2.65 - 0.74, z: (0.25 + 2.55) / 2 },
  ];
}
