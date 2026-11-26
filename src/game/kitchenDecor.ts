import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Kitchen interior kit: stainless and oak counters, a modern hood, ingredient shelves,
 * industrial wall lamps, storage, cream subway tile and terracotta floor textures.
 *
 * Every piece is built facing +Z (its front) with its back at z = 0 and its base at y = 0.
 * Call mergeByMaterial() on a finished group to bake it into one mesh per material
 * (a handful of draw calls for the whole kitchen on phones).
 */

// ---------------------------------------------------------------- textures

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tex(c: HTMLCanvasElement, srgb: boolean, rx: number, ry: number, aniso: number) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = aniso;
  return t;
}

/** Cream glazed subway tile (7.5 × 15 cm, running bond) with a bevel bump. Repeats per metre of wall. */
export function createCreamSubwayTextures(widthM: number, heightM: number, aniso = 4) {
  const W = 512;
  const H = 512;
  const cols = 4; // tiles per texture row (texture = 0.6 m wide)
  const rows = 8; // texture = 0.6 m tall
  const tw = W / cols;
  const th = H / rows;
  const g = 6;
  const color = canvas(W, H);
  const bump = canvas(W, H);
  const rnd = seeded(77);
  color.ctx.fillStyle = '#d9cdb6';
  color.ctx.fillRect(0, 0, W, H);
  bump.ctx.fillStyle = '#3c3c3c';
  bump.ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (tw / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * tw + off + g / 2;
      const y = r * th + g / 2;
      const w = tw - g;
      const h = th - g;
      const v = Math.round((rnd() - 0.5) * 10);
      const grad = color.ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, `rgb(${250 + v},${238 + v},${212 + v})`);
      grad.addColorStop(1, `rgb(${236 + v},${220 + v},${190 + v})`);
      color.ctx.fillStyle = grad;
      color.ctx.beginPath();
      color.ctx.roundRect(x, y, w, h, 5);
      color.ctx.fill();
      // Glaze highlight along the top edge
      color.ctx.fillStyle = 'rgba(255,255,255,0.45)';
      color.ctx.fillRect(x + 4, y + 3, w - 8, 3);
      // Bevel: bright centre, darker rim
      const b = bump.ctx.createLinearGradient(x, y, x, y + h);
      b.addColorStop(0, '#9a9a9a');
      b.addColorStop(0.2, '#e8e8e8');
      b.addColorStop(0.8, '#e8e8e8');
      b.addColorStop(1, '#8a8a8a');
      bump.ctx.fillStyle = b;
      bump.ctx.beginPath();
      bump.ctx.roundRect(x, y, w, h, 5);
      bump.ctx.fill();
    }
  }
  const rx = widthM / 0.6;
  const ry = heightM / 0.6;
  return { map: tex(color.c, true, rx, ry, aniso), bumpMap: tex(bump.c, false, rx, ry, aniso) };
}

/** Warm terracotta floor: 25 cm square tiles in sun-baked clay tones, with small cream insets at the corners. */
export function createTerracottaFloorTextures(widthM: number, depthM: number, aniso = 4) {
  const S = 512;
  const n = 4; // tiles per texture side → texture = 1 m
  const cell = S / n;
  const g = 6;
  const color = canvas(S, S);
  const bump = canvas(S, S);
  const rough = canvas(S, S);
  const rnd = seeded(2024);
  color.ctx.fillStyle = '#cdb79a';
  color.ctx.fillRect(0, 0, S, S);
  bump.ctx.fillStyle = '#404040';
  bump.ctx.fillRect(0, 0, S, S);
  rough.ctx.fillStyle = '#e6e6e6';
  rough.ctx.fillRect(0, 0, S, S);
  const tones = [
    [184, 88, 50],
    [194, 98, 56],
    [174, 80, 46],
    [200, 108, 62],
    [182, 94, 58],
  ];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = c * cell + g / 2;
      const y = r * cell + g / 2;
      const s = cell - g;
      const [R, G, B] = tones[Math.floor(rnd() * tones.length)];
      const v = (rnd() - 0.5) * 14;
      const grad = color.ctx.createRadialGradient(x + s * 0.4, y + s * 0.35, s * 0.1, x + s / 2, y + s / 2, s * 0.8);
      grad.addColorStop(0, `rgb(${R + v + 10},${G + v + 6},${B + v + 4})`);
      grad.addColorStop(1, `rgb(${R + v - 16},${G + v - 12},${B + v - 8})`);
      color.ctx.fillStyle = grad;
      color.ctx.beginPath();
      color.ctx.roundRect(x, y, s, s, 6);
      color.ctx.fill();
      for (let k = 0; k < 60; k++) {
        color.ctx.fillStyle = rnd() < 0.5 ? 'rgba(120,50,25,0.25)' : 'rgba(255,210,170,0.22)';
        color.ctx.fillRect(x + 4 + rnd() * (s - 8), y + 4 + rnd() * (s - 8), 2, 2);
      }
      const bb = bump.ctx.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s * 0.75);
      bb.addColorStop(0, '#dcdcdc');
      bb.addColorStop(1, '#b4b4b4');
      bump.ctx.fillStyle = bb;
      bump.ctx.beginPath();
      bump.ctx.roundRect(x, y, s, s, 6);
      bump.ctx.fill();
      rough.ctx.fillStyle = `rgb(${165 + Math.round(rnd() * 35)},${165},${165})`;
      rough.ctx.fillRect(x, y, s, s);
    }
  }
  // Cream diamond insets where four tiles meet
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      const cx = c * cell;
      const cy = r * cell;
      color.ctx.fillStyle = '#efe2c8';
      color.ctx.beginPath();
      color.ctx.moveTo(cx, cy - 12);
      color.ctx.lineTo(cx + 12, cy);
      color.ctx.lineTo(cx, cy + 12);
      color.ctx.lineTo(cx - 12, cy);
      color.ctx.closePath();
      color.ctx.fill();
      bump.ctx.fillStyle = '#d0d0d0';
      bump.ctx.beginPath();
      bump.ctx.moveTo(cx, cy - 11);
      bump.ctx.lineTo(cx + 11, cy);
      bump.ctx.lineTo(cx, cy + 11);
      bump.ctx.lineTo(cx - 11, cy);
      bump.ctx.closePath();
      bump.ctx.fill();
    }
  }
  return {
    map: tex(color.c, true, widthM, depthM, aniso),
    bumpMap: tex(bump.c, false, widthM, depthM, aniso),
    roughnessMap: tex(rough.c, false, widthM, depthM, aniso),
  };
}

function brushedSteelTexture() {
  const { c, ctx } = canvas(256, 64);
  const rnd = seeded(9);
  ctx.fillStyle = '#dde1e5';
  ctx.fillRect(0, 0, 256, 64);
  // Fine, low-contrast brushing lines (reads as satin steel, not marble)
  for (let i = 0; i < 400; i++) {
    const y = rnd() * 64;
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(110,118,128,0.07)';
    ctx.fillRect(rnd() * 256, y, 40 + rnd() * 160, 0.6);
  }
  return tex(c, true, 3, 3, 4);
}

function oakTexture(base: string, grain: string) {
  const { c, ctx } = canvas(256, 256);
  const rnd = seeded(31);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const y = rnd() * 256;
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.05 + rnd() * 0.07;
    ctx.lineWidth = 1 + rnd() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return tex(c, true, 1, 1, 4);
}

function butcherBlockTexture() {
  const { c, ctx } = canvas(256, 64);
  const rnd = seeded(5);
  const strip = 256 / 12;
  for (let i = 0; i < 12; i++) {
    const t = 0.85 + rnd() * 0.25;
    ctx.fillStyle = `rgb(${Math.round(214 * t)},${Math.round(160 * t)},${Math.round(104 * t)})`;
    ctx.fillRect(i * strip, 0, strip, 64);
    ctx.fillStyle = 'rgba(90,50,20,0.25)';
    ctx.fillRect(i * strip, 0, 1, 64);
  }
  return tex(c, true, 1, 1, 4);
}

// ---------------------------------------------------------------- materials (shared)

type Mats = ReturnType<typeof buildMats>;
let MATS: Mats | null = null;

function buildMats() {
  const steelMap = brushedSteelTexture();
  return {
    steel: new THREE.MeshStandardMaterial({ color: '#e4e8ec', map: steelMap, metalness: 0.62, roughness: 0.32 }),
    steelDark: new THREE.MeshStandardMaterial({ color: '#8d959e', metalness: 0.7, roughness: 0.38 }),
    black: new THREE.MeshStandardMaterial({ color: '#2b2a2d', metalness: 0.45, roughness: 0.5 }),
    oak: new THREE.MeshStandardMaterial({ color: '#ffffff', map: oakTexture('#c88a4c', '#7b4422'), roughness: 0.55 }),
    oakDark: new THREE.MeshStandardMaterial({ color: '#ffffff', map: oakTexture('#9a5f33', '#56301a'), roughness: 0.6 }),
    butcher: new THREE.MeshStandardMaterial({ color: '#ffffff', map: butcherBlockTexture(), roughness: 0.5 }),
    toe: new THREE.MeshStandardMaterial({ color: '#3a302b', roughness: 0.8 }),
    cream: new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.55 }),
    creamInside: new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd58a', emissiveIntensity: 0.35, roughness: 0.6, side: THREE.BackSide }),
    bulb: new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6e', emissiveIntensity: 1.6, roughness: 0.3 }),
    led: new THREE.MeshStandardMaterial({ color: '#fff7e0', emissive: '#ffe2a6', emissiveIntensity: 1.2 }),
    copper: new THREE.MeshStandardMaterial({ color: '#c8794a', metalness: 0.8, roughness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: '#cfe6e4', metalness: 0.1, roughness: 0.08 }),
    paper: new THREE.MeshStandardMaterial({ color: '#fbf8f0', roughness: 0.9 }),
    burlap: new THREE.MeshStandardMaterial({ color: '#c9a877', roughness: 0.95 }),
    // Produce and pantry colours
    tomato: new THREE.MeshStandardMaterial({ color: '#e0412b', roughness: 0.35 }),
    lettuce: new THREE.MeshStandardMaterial({ color: '#6fbf3e', roughness: 0.6 }),
    onion: new THREE.MeshStandardMaterial({ color: '#d9a35f', roughness: 0.5 }),
    pepper: new THREE.MeshStandardMaterial({ color: '#f2b62b', roughness: 0.35 }),
    eggplant: new THREE.MeshStandardMaterial({ color: '#5b2c6f', roughness: 0.3 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#3f8f35', roughness: 0.6 }),
    oil: new THREE.MeshStandardMaterial({ color: '#d7b13a', roughness: 0.15, metalness: 0.05 }),
    wine: new THREE.MeshStandardMaterial({ color: '#5e1a26', roughness: 0.15 }),
    sauce: new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.3 }),
    spiceA: new THREE.MeshStandardMaterial({ color: '#c0562a', roughness: 0.8 }),
    spiceB: new THREE.MeshStandardMaterial({ color: '#e0b437', roughness: 0.8 }),
    spiceC: new THREE.MeshStandardMaterial({ color: '#7c8a3a', roughness: 0.8 }),
    flour: new THREE.MeshStandardMaterial({ color: '#f4efe4', roughness: 0.95 }),
  };
}

export function kitchenMats(): Mats {
  if (!MATS) MATS = buildMats();
  return MATS;
}

// ---------------------------------------------------------------- small helpers

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** Rounded box positioned by its centre. */
function rbox(w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, seg = 2) {
  return mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, x, y, z);
}

/** Horizontal bar handle on a cabinet front (front face at z). */
function barHandle(g: THREE.Group, len: number, x: number, y: number, z: number, vertical = false) {
  const M = kitchenMats();
  const bar = mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 6), M.steelDark, x, y, z + 0.032);
  if (!vertical) bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const s of [-1, 1]) {
    const post = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 4), M.steelDark);
    post.rotation.x = Math.PI / 2;
    if (vertical) post.position.set(x, y + (s * len) / 2.6, z + 0.016);
    else post.position.set(x + (s * len) / 2.6, y, z + 0.016);
    g.add(post);
  }
}

/** Shaker-style door: flat frame with a raised centre panel. Front face sits at z. */
function shakerDoor(g: THREE.Group, w: number, h: number, x: number, y: number, z: number, mat: THREE.Material) {
  g.add(rbox(w, h, 0.022, 0.01, mat, x, y, z + 0.011, 1));
  g.add(mesh(new THREE.BoxGeometry(w - 0.1, h - 0.1, 0.012), mat, x, y, z + 0.026));
}

// ---------------------------------------------------------------- furniture

/**
 * Base cabinet run: oak shaker doors (and a drawer row), toe kick, stainless or butcher-block top
 * with a small back upstand. Length runs along X, depth along Z, front at z = depth.
 */
export function createCounterRun(length: number, opts: { depth?: number; height?: number; top?: 'steel' | 'butcher'; drawers?: boolean } = {}) {
  const M = kitchenMats();
  const g = new THREE.Group();
  const D = opts.depth ?? 1.0;
  const H = opts.height ?? 0.92;
  const topT = 0.05;
  const kick = 0.1;
  const bodyH = H - topT - kick;
  // Carcass and recessed toe kick
  g.add(rbox(length - 0.02, bodyH, D - 0.06, 0.025, M.oakDark, 0, kick + bodyH / 2, (D - 0.06) / 2));
  g.add(mesh(new THREE.BoxGeometry(length - 0.06, kick, D - 0.14), M.toe, 0, kick / 2, (D - 0.14) / 2));
  // Fronts
  const n = Math.max(1, Math.round(length / 0.5));
  const segW = (length - 0.04) / n;
  const frontZ = D - 0.06;
  const drawerH = opts.drawers === false ? 0 : 0.17;
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + 0.02 + segW * (i + 0.5);
    if (drawerH) {
      const dy = kick + bodyH - drawerH / 2 - 0.02;
      g.add(rbox(segW - 0.03, drawerH - 0.02, 0.022, 0.008, M.oak, x, dy, frontZ + 0.011, 1));
      barHandle(g, Math.min(0.22, segW * 0.5), x, dy, frontZ);
    }
    const doorH = bodyH - drawerH - 0.05;
    const doorY = kick + 0.02 + doorH / 2;
    shakerDoor(g, segW - 0.03, doorH, x, doorY, frontZ, M.oak);
    barHandle(g, 0.16, x + (i % 2 === 0 ? 1 : -1) * (segW / 2 - 0.07), doorY + doorH * 0.32, frontZ + 0.012, true);
  }
  // Worktop with a slight front overhang, and a back upstand
  const topMat = opts.top === 'butcher' ? M.butcher : M.steel;
  g.add(rbox(length, topT, D + 0.03, 0.015, topMat, 0, H - topT / 2, (D + 0.03) / 2));
  g.add(rbox(length, 0.09, 0.025, 0.008, M.steel, 0, H + 0.045, 0.0125));
  return g;
}

/** Tall two-door pantry with a crown and long handles (w × 2.15 m). */
export function createTallPantry(w = 0.8, d = 0.62) {
  const M = kitchenMats();
  const g = new THREE.Group();
  const H = 2.15;
  g.add(rbox(w, H - 0.08, d, 0.03, M.oakDark, 0, 0.08 + (H - 0.08) / 2, d / 2));
  g.add(mesh(new THREE.BoxGeometry(w - 0.04, 0.08, d - 0.08), M.toe, 0, 0.04, (d - 0.08) / 2));
  const doorW = (w - 0.05) / 2;
  for (const s of [-1, 1]) {
    shakerDoor(g, doorW, H - 0.22, (s * (doorW + 0.01)) / 2, 0.08 + (H - 0.14) / 2, d, M.oak);
    barHandle(g, 0.42, s * 0.035, 1.12, d + 0.012, true);
  }
  g.add(rbox(w + 0.06, 0.06, d + 0.05, 0.02, M.oakDark, 0, H + 0.03, (d + 0.05) / 2));
  return g;
}

/** Upper wall cabinet (shallow) with oak doors and an LED strip underneath. */
export function createWallCabinet(w: number, h = 0.62, d = 0.36) {
  const M = kitchenMats();
  const g = new THREE.Group();
  g.add(rbox(w, h, d, 0.02, M.oakDark, 0, h / 2, d / 2));
  const n = Math.max(1, Math.round(w / 0.45));
  const dw = (w - 0.04) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.02 + dw * (i + 0.5);
    shakerDoor(g, dw - 0.025, h - 0.05, x, h / 2, d, M.oak);
    barHandle(g, 0.12, x + (i % 2 === 0 ? 1 : -1) * (dw / 2 - 0.06), 0.12, d + 0.012, true);
  }
  g.add(mesh(new THREE.BoxGeometry(w - 0.1, 0.012, 0.03), M.led, 0, -0.006, d - 0.06));
  return g;
}

/** Modern stainless canopy hood with rounded edges, filter panels, a light strip and a chimney. */
export function createVentHood(w: number, d = 0.95) {
  const M = kitchenMats();
  const g = new THREE.Group();
  // Side profile (Z forward, Y up): sloped front canopy
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(d, 0);
  shape.lineTo(d, 0.16);
  shape.lineTo(d * 0.55, 0.5);
  shape.lineTo(0, 0.5);
  shape.closePath();
  const canopy = new THREE.ExtrudeGeometry(shape, { depth: w - 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, steps: 1 });
  canopy.rotateY(-Math.PI / 2);
  canopy.translate((w - 0.06) / 2, 0, 0);
  const cm = new THREE.Mesh(canopy, M.steel);
  // After rotateY(-90°) the profile's X became +Z: front is at z = d
  g.add(cm);
  // Under-side filter panels with slats
  const panels = Math.max(2, Math.round(w / 0.55));
  const pw = (w - 0.16) / panels;
  for (let i = 0; i < panels; i++) {
    const x = -w / 2 + 0.08 + pw * (i + 0.5);
    g.add(mesh(new THREE.BoxGeometry(pw - 0.03, 0.012, d - 0.22), M.steelDark, x, -0.004, d / 2 - 0.02));
    for (let k = 0; k < 6; k++) {
      g.add(mesh(new THREE.BoxGeometry(pw - 0.06, 0.006, 0.012), M.black, x, -0.012, 0.16 + k * ((d - 0.36) / 5)));
    }
  }
  // Warm light strip along the front lip
  g.add(mesh(new THREE.BoxGeometry(w - 0.2, 0.014, 0.04), M.led, 0, -0.01, d - 0.07));
  // Chimney up to the ceiling line
  g.add(rbox(Math.min(0.6, w * 0.35), 0.45, 0.42, 0.02, M.steel, 0, 0.725, 0.21));
  return g;
}

/** Industrial wall lamp: round plate, curved black arm, enamel shade, warm bulb in a wire cage. Bulb ends ~0.35 m in front. */
export function createIndustrialLamp() {
  const M = kitchenMats();
  const g = new THREE.Group();
  const plate = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 16), M.black, 0, 0, 0.012);
  plate.rotation.x = Math.PI / 2;
  g.add(plate);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.02),
    new THREE.Vector3(0, 0.08, 0.14),
    new THREE.Vector3(0, 0.1, 0.28),
    new THREE.Vector3(0, 0.06, 0.34),
  ]);
  g.add(mesh(new THREE.TubeGeometry(curve, 8, 0.013, 5, false), M.black));
  const shadePts = [
    new THREE.Vector2(0.012, 0.05),
    new THREE.Vector2(0.03, 0.045),
    new THREE.Vector2(0.06, 0.0),
    new THREE.Vector2(0.11, -0.07),
    new THREE.Vector2(0.115, -0.08),
  ];
  const shade = mesh(new THREE.LatheGeometry(shadePts, 12), M.black, 0, 0.02, 0.34);
  g.add(shade);
  g.add(mesh(new THREE.LatheGeometry(shadePts.map((p) => new THREE.Vector2(p.x * 0.95, p.y - 0.004)), 12), M.creamInside, 0, 0.02, 0.34));
  g.add(mesh(new THREE.SphereGeometry(0.04, 10, 7), M.bulb, 0, -0.05, 0.34));
  for (let k = 0; k < 3; k++) {
    const wire = mesh(new THREE.TorusGeometry(0.05, 0.003, 3, 10, Math.PI), M.black, 0, -0.05, 0.34);
    wire.rotation.y = (k * Math.PI) / 3;
    wire.rotation.z = Math.PI;
    g.add(wire);
  }
  return g;
}

// ---------------------------------------------------------------- shelf contents

function jar(g: THREE.Group, x: number, y: number, z: number, h: number, fill: THREE.Material) {
  const M = kitchenMats();
  g.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, h, 10), M.glass, x, y + h / 2, z));
  g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, h * 0.7, 8, 1, true), fill, x, y + h * 0.36, z));
  g.add(mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.025, 10), M.copper, x, y + h + 0.012, z));
}

function bottle(g: THREE.Group, x: number, y: number, z: number, mat: THREE.Material, scale = 1) {
  const M = kitchenMats();
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.035, 0),
    new THREE.Vector2(0.038, 0.02),
    new THREE.Vector2(0.038, 0.17),
    new THREE.Vector2(0.016, 0.22),
    new THREE.Vector2(0.013, 0.28),
    new THREE.Vector2(0, 0.28),
  ].map((p) => new THREE.Vector2(p.x * scale, p.y * scale));
  g.add(mesh(new THREE.LatheGeometry(pts, 10), mat, x, y, z));
  g.add(mesh(new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.03 * scale, 8), M.black, x, y + 0.29 * scale, z));
  g.add(mesh(new THREE.CylinderGeometry(0.0385 * scale, 0.0385 * scale, 0.07 * scale, 12, 1, true), M.paper, x, y + 0.09 * scale, z));
}

function produceBowl(g: THREE.Group, x: number, y: number, z: number, kind: 'tomato' | 'onion' | 'pepper' | 'lettuce' | 'eggplant') {
  const M = kitchenMats();
  const bowl = mesh(new THREE.SphereGeometry(0.13, 12, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.cream, x, y + 0.11, z);
  bowl.scale.y = 0.75;
  g.add(bowl);
  const mat = M[kind];
  const rnd = seeded(Math.round(x * 100 + z * 10));
  const r = kind === 'lettuce' ? 0.075 : kind === 'eggplant' ? 0.05 : 0.048;
  const count = kind === 'lettuce' ? 2 : 5;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd();
    const rad = count === 2 ? 0.045 : 0.055;
    const p = mesh(new THREE.SphereGeometry(r, 8, 6), mat, x + Math.cos(a) * rad, y + 0.12 + rnd() * 0.02, z + Math.sin(a) * rad);
    if (kind === 'eggplant') p.scale.set(1, 1, 1.6);
    if (kind === 'onion') p.scale.y = 1.1;
    g.add(p);
    if (kind === 'tomato' || kind === 'pepper') g.add(mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 5), M.leaf, p.position.x, p.position.y + r, p.position.z));
  }
}

function crate(g: THREE.Group, x: number, y: number, z: number, w: number, d: number, fill: 'tomato' | 'onion' | 'pepper' | 'lettuce') {
  const M = kitchenMats();
  const h = 0.16;
  for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(w, h, 0.015), M.oak, x, y + h / 2, z + (sz * (d - 0.015)) / 2));
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.015, h, d), M.oak, x + (sx * (w - 0.015)) / 2, y + h / 2, z));
  g.add(mesh(new THREE.BoxGeometry(w, 0.012, d), M.oakDark, x, y + 0.006, z));
  const r = fill === 'lettuce' ? 0.07 : 0.055;
  const nx = Math.max(1, Math.floor((w - 0.04) / (r * 2)));
  const nz = Math.max(1, Math.floor((d - 0.04) / (r * 2)));
  for (let i = 0; i < nx; i++)
    for (let k = 0; k < nz; k++) {
      g.add(mesh(new THREE.SphereGeometry(r, 7, 5), M[fill], x - w / 2 + 0.02 + r + i * r * 2, y + h - r * 0.6, z - d / 2 + 0.02 + r + k * r * 2));
    }
}

/**
 * Wall shelf: oak plank on black brackets, filled with jars, bottles and produce.
 * `style` picks the mix: spices, bottles or produce.
 */
export function createWallShelf(w: number, style: 'spices' | 'bottles' | 'produce' | 'mixed', seed = 1) {
  const M = kitchenMats();
  const g = new THREE.Group();
  const d = 0.26;
  g.add(rbox(w, 0.035, d, 0.012, M.oak, 0, 0, d / 2));
  for (const sx of [-1, 1]) {
    const bx = sx * (w / 2 - 0.1);
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), M.black, bx, -0.09, 0.012));
    g.add(mesh(new THREE.BoxGeometry(0.02, 0.02, d - 0.04), M.black, bx, -0.03, d / 2));
    const brace = mesh(new THREE.BoxGeometry(0.016, 0.2, 0.016), M.black, bx, -0.085, 0.09);
    brace.rotation.x = -0.75;
    g.add(brace);
  }
  const rnd = seeded(seed * 97 + Math.round(w * 10));
  const y0 = 0.018;
  let x = -w / 2 + 0.08;
  const spices = [M.spiceA, M.spiceB, M.spiceC, M.sauce, M.flour];
  while (x < w / 2 - 0.08) {
    const pick = style === 'mixed' ? ['spices', 'bottles', 'produce'][Math.floor(rnd() * 3)] : style;
    if (pick === 'spices') {
      jar(g, x, y0, d * 0.45, 0.12 + rnd() * 0.06, spices[Math.floor(rnd() * spices.length)]);
      x += 0.11;
    } else if (pick === 'bottles') {
      bottle(g, x, y0, d * 0.45, [M.oil, M.wine, M.sauce][Math.floor(rnd() * 3)], 0.85 + rnd() * 0.25);
      x += 0.1;
    } else {
      if (x + 0.14 > w / 2 - 0.06) break;
      produceBowl(g, x + 0.06, y0, d * 0.5, (['tomato', 'onion', 'pepper', 'lettuce', 'eggplant'] as const)[Math.floor(rnd() * 5)]);
      x += 0.3;
    }
  }
  return g;
}

/** Free-standing metal ingredient rack: three oak shelves with crates, sacks, jars and bottles. */
export function createIngredientRack(w = 1.05, d = 0.46) {
  const M = kitchenMats();
  const g = new THREE.Group();
  const H = 1.85;
  for (const sx of [-1, 1])
    for (const sz of [0, 1]) g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, H, 8), M.black, sx * (w / 2 - 0.02), H / 2, 0.03 + sz * (d - 0.06)));
  const levels = [0.12, 0.62, 1.1, 1.58];
  levels.forEach((y) => g.add(rbox(w, 0.03, d, 0.01, M.oak, 0, y, d / 2)));
  // Bottom: flour sacks
  for (const sx of [-0.25, 0.22]) {
    const sack = mesh(new THREE.CapsuleGeometry(0.13, 0.16, 4, 10), M.burlap, sx * w, 0.12 + 0.24, d / 2);
    sack.scale.set(1, 1, 0.8);
    g.add(sack);
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.06, 8), M.burlap, sx * w, 0.12 + 0.47, d / 2));
  }
  // Middle: produce crates
  crate(g, -w * 0.24, 0.635, d / 2, w * 0.44, d - 0.08, 'tomato');
  crate(g, w * 0.24, 0.635, d / 2, w * 0.44, d - 0.08, 'onion');
  // Upper: jars
  for (let i = 0; i < 6; i++) jar(g, -w / 2 + 0.1 + i * ((w - 0.2) / 5), 1.115, d / 2, 0.16, [M.spiceA, M.spiceB, M.spiceC, M.flour, M.sauce, M.spiceB][i]);
  // Top: bottles and a crate of peppers
  for (let i = 0; i < 4; i++) bottle(g, -w / 2 + 0.1 + i * 0.1, 1.595, d / 2, [M.oil, M.wine, M.oil, M.sauce][i]);
  crate(g, w * 0.22, 1.595, d / 2, w * 0.4, d - 0.1, 'pepper');
  return g;
}

/** Hanging utensil rail with ladles, a whisk and copper pans. */
export function createUtensilRail(w: number) {
  const M = kitchenMats();
  const g = new THREE.Group();
  const bar = mesh(new THREE.CylinderGeometry(0.012, 0.012, w, 8), M.steel, 0, 0, 0.07);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  for (const sx of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.02, 0.02, 0.07), M.steel, sx * (w / 2 - 0.03), 0, 0.035));
  const n = Math.max(3, Math.floor(w / 0.16));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.1 + i * ((w - 0.2) / (n - 1));
    g.add(mesh(new THREE.TorusGeometry(0.014, 0.003, 4, 10), M.steelDark, x, -0.02, 0.07));
    const kind = i % 4;
    if (kind === 0 || kind === 2) {
      g.add(mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.24, 6), M.steel, x, -0.15, 0.07));
      const cup = mesh(new THREE.SphereGeometry(0.035, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel, x, -0.25, 0.07);
      g.add(cup);
    } else if (kind === 1) {
      const pan = mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.04, 18), M.copper, x, -0.16, 0.085);
      pan.rotation.x = Math.PI / 2;
      g.add(pan);
      g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), M.copper, x, -0.07, 0.085));
    } else {
      const whisk = mesh(new THREE.LatheGeometry([new THREE.Vector2(0, -0.12), new THREE.Vector2(0.03, -0.07), new THREE.Vector2(0.008, 0)], 8), M.steel, x, -0.08, 0.07);
      g.add(whisk);
      g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 6), M.black, x, -0.04, 0.07));
    }
  }
  return g;
}

/** Ticket rail and plate shelf over the pass (the "serving" side of the kitchen). */
export function createPassGantry(len: number) {
  const M = kitchenMats();
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 10), M.steel, sx * (len / 2 - 0.05), 0.5, 0));
  g.add(rbox(len, 0.03, 0.3, 0.01, M.steel, 0, 1.0, 0));
  // Plate stacks on the shelf
  for (const sx of [-0.3, 0, 0.3]) {
    for (let k = 0; k < 6; k++) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.014, 18), M.paper, sx * len, 1.022 + k * 0.016, 0));
  }
  // Ticket rail under the shelf with order tickets
  g.add(mesh(new THREE.BoxGeometry(len - 0.1, 0.03, 0.04), M.steelDark, 0, 0.94, 0.15));
  const rnd = seeded(4);
  const n = Math.floor(len / 0.18);
  for (let i = 0; i < n; i++) {
    const t = mesh(new THREE.BoxGeometry(0.08, 0.14, 0.004), M.paper, -len / 2 + 0.15 + i * ((len - 0.3) / Math.max(1, n - 1)), 0.86, 0.172);
    t.rotation.z = (rnd() - 0.5) * 0.12;
    g.add(t);
  }
  return g;
}

/** Cutting board with a knife and a few chopped vegetables (sits on a worktop). */
export function createCuttingBoard() {
  const M = kitchenMats();
  const g = new THREE.Group();
  g.add(rbox(0.42, 0.03, 0.28, 0.012, M.butcher, 0, 0.015, 0));
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.004, 0.035), M.steel, 0.05, 0.034, 0.08));
  g.add(mesh(new THREE.BoxGeometry(0.09, 0.016, 0.022), M.black, -0.1, 0.038, 0.08));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 10), i % 2 ? M.tomato : M.pepper, -0.12 + (i % 3) * 0.05, 0.036, -0.06 + Math.floor(i / 3) * 0.05));
  return g;
}

// ---------------------------------------------------------------- baking

/**
 * Bakes a static group into one mesh per material (world transforms applied relative to `group`).
 * Optionally clones the materials so the result can fade with its wall independently.
 */
export function mergeByMaterial(group: THREE.Group, opts: { cloneMaterials?: boolean; castShadow?: boolean } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    let geo = m.geometry.clone();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!geo.index) {
      const idx = new Uint32Array(geo.attributes.position.count);
      for (let i = 0; i < idx.length; i++) idx[i] = i;
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    geo.clearGroups();
    geo.morphAttributes = {};
    const list = buckets.get(m.material) ?? [];
    list.push(geo);
    buckets.set(m.material, list);
  });
  const out = new THREE.Group();
  out.name = group.name;
  const materials: THREE.MeshStandardMaterial[] = [];
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const useMat = opts.cloneMaterials ? mat.clone() : mat;
    if (opts.cloneMaterials && (useMat as THREE.MeshStandardMaterial).isMeshStandardMaterial) materials.push(useMat as THREE.MeshStandardMaterial);
    const mm = new THREE.Mesh(merged, useMat);
    mm.castShadow = opts.castShadow ?? true;
    mm.receiveShadow = true;
    out.add(mm);
  }
  return { group: out, materials };
}
