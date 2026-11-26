import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { StationType } from './types';

/**
 * Chunky, toy-like kitchen machines: thick rounded bodies on stubby feet, fat grill bars,
 * deep fry baskets, puffy food and warm-tinted stainless steel.
 *
 * Built facing +Z with the work top at y ≈ 0.98 (the engine sets dishes at the front centre,
 * so that strip of the top is kept clear). Footprints match the previous machines so nothing
 * moves in the kitchen. Body materials keep the eq_* names the upgrade looks restyle.
 */

// ------------------------------------------------------------------ materials

function named(name: string, params: THREE.MeshStandardMaterialParameters) {
  const m = new THREE.MeshStandardMaterial(params);
  m.name = name;
  return m;
}

/** Fresh eq_* materials per machine (upgrade looks swap them per stage). */
function eqMats(body = '#f0e6d8') {
  return {
    // Warm-tinted steel: picks up the restaurant's amber light instead of reading cold grey
    steel: named('eq_steel', { color: '#efe7dc', metalness: 0.72, roughness: 0.26 }),
    dark: named('eq_dark', { color: '#3a3330', metalness: 0.45, roughness: 0.45 }),
    body: named('eq_body', { color: body, roughness: 0.5, metalness: 0.08 }),
    cream: named('eq_cream', { color: '#f6ecd9', roughness: 0.5 }),
    accent: named('eq_accent', { color: '#e0352b', roughness: 0.32, metalness: 0.1 }),
    feet: named('eq_feet', { color: '#2b2523', roughness: 0.6 }),
  };
}

type FoodMats = ReturnType<typeof buildFood>;
let FOOD: FoodMats | null = null;
function buildFood() {
  return {
    patty: new THREE.MeshStandardMaterial({ color: '#7a3d1c', roughness: 0.75 }),
    pattyTop: new THREE.MeshStandardMaterial({ color: '#5a2a12', roughness: 0.8 }),
    bun: new THREE.MeshStandardMaterial({ color: '#e7a24a', roughness: 0.55 }),
    seed: new THREE.MeshStandardMaterial({ color: '#fff4d6', roughness: 0.6 }),
    cheese: new THREE.MeshStandardMaterial({ color: '#ffc928', roughness: 0.45 }),
    lettuce: new THREE.MeshStandardMaterial({ color: '#69c23a', roughness: 0.55 }),
    tomato: new THREE.MeshStandardMaterial({ color: '#e5402d', roughness: 0.35 }),
    onion: new THREE.MeshStandardMaterial({ color: '#f2d9e8', roughness: 0.5 }),
    fry: new THREE.MeshStandardMaterial({ color: '#ffc23d', roughness: 0.5 }),
    oil: new THREE.MeshStandardMaterial({ color: '#f0a92a', emissive: '#b8650a', emissiveIntensity: 0.35, roughness: 0.15 }),
    ember: new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a0a', emissiveIntensity: 1.6 }),
    glow: new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff8c1a', emissiveIntensity: 1.3 }),
    pizza: new THREE.MeshStandardMaterial({ color: '#f1c27d', roughness: 0.6 }),
    sauce: new THREE.MeshStandardMaterial({ color: '#d63a22', roughness: 0.4 }),
    mustard: new THREE.MeshStandardMaterial({ color: '#f6c21c', roughness: 0.35 }),
    black: new THREE.MeshStandardMaterial({ color: '#262220', roughness: 0.5 }),
    white: new THREE.MeshStandardMaterial({ color: '#fbf7ef', roughness: 0.45 }),
    glass: new THREE.MeshStandardMaterial({ color: '#d9f0f2', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }),
    cake: new THREE.MeshStandardMaterial({ color: '#ffd3e0', roughness: 0.6 }),
    cream: new THREE.MeshStandardMaterial({ color: '#fff8f0', roughness: 0.5 }),
    berry: new THREE.MeshStandardMaterial({ color: '#d61f4b', roughness: 0.3 }),
    coffee: new THREE.MeshStandardMaterial({ color: '#4a2a17', roughness: 0.3 }),
    wood: new THREE.MeshStandardMaterial({ color: '#d79a5a', roughness: 0.55 }),
  };
}
function food(): FoodMats {
  if (!FOOD) FOOD = buildFood();
  return FOOD;
}

// ------------------------------------------------------------------ helpers

function rb(w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, seg = 3) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt: number, rbtm: number, h: number, mat: THREE.Material, x: number, y: number, z: number, seg = 16) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbtm, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Puffy disc (rounded edge all round): patties, cheese wheels, cake layers. */
function puffDisc(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number) {
  const e = Math.min(h * 0.45, r * 0.4);
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -h / 2)];
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI;
    pts.push(new THREE.Vector2(r - e + Math.cos(a) * e, Math.sin(a) * (h / 2)));
  }
  pts.push(new THREE.Vector2(0, h / 2));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Big round control knob with a white pointer, facing +Z. */
function knob(g: THREE.Group, mat: THREE.Material, x: number, y: number, z: number, r = 0.065) {
  const k = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.12, 0.07, 18), mat);
  k.rotation.x = Math.PI / 2;
  k.position.set(x, y, z + 0.035);
  g.add(k);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(x, y, z + 0.07);
  g.add(cap);
  const tick = new THREE.Mesh(new THREE.BoxGeometry(0.014, r * 0.8, 0.012), food().white);
  tick.position.set(x, y + r * 0.35, z + 0.07 + r * 0.82);
  g.add(tick);
}

/** Thick rounded bar handle across a door (facing +Z). */
function chunkyHandle(g: THREE.Group, mat: THREE.Material, len: number, x: number, y: number, z: number) {
  const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, len, 4, 10), mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(x, y, z + 0.075);
  g.add(bar);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.07, 10), mat);
    post.rotation.x = Math.PI / 2;
    post.position.set(x + (s * len) / 2, y, z + 0.035);
    g.add(post);
  }
}

/** Stubby round feet under a body of half-size hw × hd. */
function feet(g: THREE.Group, mat: THREE.Material, hw: number, hd: number, z0 = 0) {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const f = cyl(0.055, 0.065, 0.1, mat, sx * (hw - 0.1), 0.05, z0 + sz * (hd - 0.1), 12);
      g.add(f);
    }
}

/**
 * The shared chunky chassis: rounded body on feet, a thick rounded work top with a lip,
 * and a back upstand. Returns the y of the work-top surface.
 */
function chassis(g: THREE.Group, m: ReturnType<typeof eqMats>, w: number, d: number, cx = 0, cz = 0, bodyMat?: THREE.Material) {
  const bodyH = 0.8;
  feet(g, m.feet, w / 2, d / 2, cz);
  g.add(rb(w - 0.04, bodyH, d - 0.06, 0.07, bodyMat ?? m.steel, cx, 0.09 + bodyH / 2, cz, 4));
  const topY = 0.09 + bodyH + 0.09;
  g.add(rb(w + 0.04, 0.1, d + 0.02, 0.045, m.steel, cx, topY - 0.05, cz + 0.01, 4));
  g.add(rb(w + 0.04, 0.22, 0.08, 0.035, m.steel, cx, topY + 0.1, cz - d / 2 + 0.04, 3));
  return topY;
}

/** Recessed front door panel with a chunky handle. */
function frontDoor(g: THREE.Group, mat: THREE.Material, handleMat: THREE.Material, w: number, h: number, x: number, y: number, z: number) {
  g.add(rb(w, h, 0.04, 0.03, mat, x, y, z + 0.02, 3));
  chunkyHandle(g, handleMat, w * 0.55, x, y + h / 2 - Math.min(0.09, h * 0.3), z + 0.02);
}

// ------------------------------------------------------------------ machines

function grill(): THREE.Group {
  const g = new THREE.Group();
  const m = eqMats();
  const F = food();
  const w = 1.72;
  const d = 1.08;
  const top = chassis(g, m, w, d, 0, 0.02);
  // Dark control strip with four big red knobs (kept below the upgrade rail and level stars)
  g.add(rb(w - 0.14, 0.15, 0.05, 0.04, m.dark, 0, 0.565, d / 2 + 0.02, 3));
  for (let i = 0; i < 4; i++) knob(g, m.accent, -0.6 + i * 0.4, 0.565, d / 2 + 0.04, 0.055);
  frontDoor(g, m.steel, m.dark, w * 0.42, 0.25, -w * 0.23, 0.37, d / 2 - 0.02);
  frontDoor(g, m.steel, m.dark, w * 0.42, 0.25, w * 0.23, 0.37, d / 2 - 0.02);
  // Deep grill well with glowing embers and FAT rounded grate bars
  g.add(rb(w - 0.2, 0.08, d - 0.28, 0.03, m.dark, 0, top - 0.02, -0.02, 2));
  // Ember bed sits 2 cm above the well's top face (they used to share a plane and flickered)
  g.add(rb(w - 0.3, 0.02, d - 0.38, 0.01, F.ember, 0, top + 0.03, -0.02, 1));
  for (let i = 0; i < 9; i++) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, d - 0.46, 4, 8), m.dark);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(-0.64 + i * 0.16, top + 0.05, -0.02);
    g.add(bar);
  }
  // Puffy patties with a cheese slice on the back half (front stays free for cooking)
  for (const [x, z, cheese] of [
    [-0.5, -0.22, true],
    [0.5, -0.24, false],
  ] as const) {
    g.add(puffDisc(0.15, 0.075, F.patty, x, top + 0.12, z));
    if (cheese) {
      const c = rb(0.24, 0.018, 0.24, 0.008, F.cheese, x, top + 0.165, z, 1);
      c.rotation.y = 0.5;
      g.add(c);
    }
  }
  // Side shelf with chunky sauce bottles
  g.add(rb(0.3, 0.06, d - 0.22, 0.025, m.steel, w / 2 + 0.17, top - 0.06, 0.0, 2));
  for (const [z, mat] of [
    [-0.18, F.sauce],
    [0.08, F.mustard],
  ] as const) {
    g.add(cyl(0.06, 0.065, 0.2, mat, w / 2 + 0.17, top + 0.07, z, 14));
    g.add(cyl(0.02, 0.045, 0.07, mat, w / 2 + 0.17, top + 0.205, z, 12));
  }
  return g;
}

function fryer(): THREE.Group {
  const g = new THREE.Group();
  const m = eqMats();
  const F = food();
  const w = 1.66;
  const d = 1.12;
  const top = chassis(g, m, w, d, 0, 0.03);
  frontDoor(g, m.steel, m.dark, w * 0.42, 0.46, -w * 0.23, 0.42, d / 2 - 0.02);
  frontDoor(g, m.steel, m.dark, w * 0.42, 0.46, w * 0.23, 0.42, d / 2 - 0.02);
  // Control panel on the back upstand
  g.add(rb(w - 0.2, 0.2, 0.1, 0.04, m.dark, 0, top + 0.18, -d / 2 + 0.1, 3));
  for (const x of [-0.45, 0.45]) knob(g, m.accent, x, top + 0.18, -d / 2 + 0.14, 0.05);
  // Two deep oil wells
  for (const x of [-0.4, 0.4]) {
    g.add(rb(0.66, 0.08, 0.66, 0.05, m.dark, x, top - 0.01, -0.08, 3));
    g.add(rb(0.58, 0.02, 0.58, 0.04, F.oil, x, top + 0.025, -0.08, 2));
  }
  // Deep fry baskets resting on the back rail, overflowing with chunky fries
  for (const x of [-0.4, 0.4]) {
    const b = new THREE.Group();
    const wire = m.steel;
    const bw = 0.46;
    const bd = 0.36;
    const bh = 0.24;
    // Wire basket: solid base, top and bottom rims, and an open lattice of thin bars
    b.add(rb(bw, 0.02, bd, 0.01, m.dark, 0, 0, 0, 1));
    for (const y of [0.01, bh]) {
      for (const sgn of [-1, 1]) {
        b.add(rb(bw + 0.02, 0.025, 0.025, 0.01, wire, 0, y, (sgn * bd) / 2, 1));
        b.add(rb(0.025, 0.025, bd + 0.02, 0.01, wire, (sgn * bw) / 2, y, 0, 1));
      }
    }
    const barGeo = new THREE.CylinderGeometry(0.007, 0.007, bh, 4);
    for (let i = 0; i <= 7; i++) {
      const t = -bw / 2 + (i / 7) * bw;
      for (const sgn of [-1, 1]) b.add(new THREE.Mesh(barGeo, wire).translateX(t).translateY(bh / 2).translateZ((sgn * bd) / 2));
    }
    for (let i = 1; i < 6; i++) {
      const t = -bd / 2 + (i / 6) * bd;
      for (const sgn of [-1, 1]) b.add(new THREE.Mesh(barGeo, wire).translateX((sgn * bw) / 2).translateY(bh / 2).translateZ(t));
    }
    b.add(rb(bw - 0.04, 0.012, bd - 0.04, 0.005, m.dark, 0, bh * 0.5, 0, 1));
    const rnd = (k: number) => Math.sin(k * 12.9898 + x * 78.233) * 0.5 + 0.5;
    for (let k = 0; k < 14; k++) {
      const fry = rb(0.035, 0.2 + rnd(k) * 0.08, 0.035, 0.01, F.fry, (rnd(k + 1) - 0.5) * (bw - 0.08), bh * 0.75, (rnd(k + 2) - 0.5) * (bd - 0.08), 1);
      fry.rotation.set((rnd(k + 3) - 0.5) * 0.6, rnd(k + 4) * 3, (rnd(k + 5) - 0.5) * 0.6);
      b.add(fry);
    }
    // Long handle with a red grip, hooked on the back
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 8), wire);
    handle.rotation.x = Math.PI / 2 - 0.5;
    handle.position.set(0, bh + 0.05, -bd / 2 - 0.12);
    b.add(handle);
    const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8), m.accent);
    grip.rotation.x = Math.PI / 2 - 0.5;
    grip.position.set(0, bh + 0.15, -bd / 2 - 0.27);
    b.add(grip);
    b.position.set(x, top + 0.07, -0.12);
    b.rotation.x = -0.12;
    g.add(b);
  }
  return g;
}

function prep(): THREE.Group {
  const g = new THREE.Group();
  const m = eqMats('#d98a45');
  const F = food();
  const w = 1.78;
  const d = 1.1;
  // Wood body, butcher-block style top
  feet(g, m.feet, w / 2, d / 2, 0.01);
  g.add(rb(w - 0.04, 0.8, d - 0.06, 0.07, m.body, 0, 0.49, 0.01, 4));
  const top = 0.98;
  g.add(rb(w + 0.04, 0.1, d + 0.02, 0.045, m.steel, 0, top - 0.05, 0.02, 4));
  g.add(rb(w + 0.04, 0.22, 0.08, 0.035, m.steel, 0, top + 0.1, -d / 2 + 0.05, 3));
  for (const x of [-0.6, 0, 0.6]) frontDoor(g, m.cream, m.steel, 0.52, 0.5, x, 0.43, d / 2 - 0.02);
  // Row of chunky ingredient tubs along the back
  const fills: [THREE.Material, 'leaf' | 'slice' | 'cube'][] = [
    [F.lettuce, 'leaf'],
    [F.tomato, 'slice'],
    [F.cheese, 'cube'],
    [F.onion, 'slice'],
  ];
  fills.forEach(([mat, kind], i) => {
    const x = -0.66 + i * 0.44;
    const z = -0.25;
    g.add(rb(0.38, 0.1, 0.28, 0.035, m.steel, x, top + 0.05, z, 2));
    for (let k = 0; k < 5; k++) {
      const ox = (k % 3) * 0.1 - 0.1;
      const oz = Math.floor(k / 3) * 0.1 - 0.05;
      if (kind === 'leaf') {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 7), mat);
        l.scale.set(1, 0.45, 0.9);
        l.position.set(x + ox, top + 0.12, z + oz);
        g.add(l);
      } else if (kind === 'slice') {
        const s = cyl(0.05, 0.05, 0.025, mat, x + ox, top + 0.115, z + oz, 12);
        s.rotation.x = 0.3;
        g.add(s);
      } else g.add(rb(0.06, 0.06, 0.06, 0.012, mat, x + ox, top + 0.12, z + oz, 1));
    }
  });
  // Puffy bun stack on the right side
  for (let k = 0; k < 3; k++) {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 9, 0, Math.PI * 2, 0, Math.PI / 2), F.bun);
    bun.scale.y = 0.75;
    bun.position.set(0.72, top + 0.02 + k * 0.08, 0.26 - k * 0.02);
    bun.castShadow = true;
    g.add(bun);
  }
  return g;
}

function oven(): THREE.Group {
  const g = new THREE.Group();
  const m = eqMats();
  const F = food();
  const w = 1.56;
  const d = 1.06;
  feet(g, m.feet, w / 2, d / 2, 0.02);
  // Big rounded red body
  g.add(rb(w, 1.12, d - 0.04, 0.12, m.accent, 0, 0.1 + 0.56, 0.02, 5));
  // Warm steel top slab and chunky crown
  g.add(rb(w + 0.04, 0.09, d, 0.04, m.steel, 0, 1.25, 0.02, 3));
  g.add(rb(w * 0.7, 0.18, d * 0.5, 0.07, m.accent, 0, 1.38, -0.14, 4));
  // Door: steel frame with a glowing window and a pizza inside
  g.add(rb(w * 0.8, 0.6, 0.06, 0.06, m.steel, 0, 0.62, d / 2 + 0.01, 4));
  g.add(rb(w * 0.64, 0.4, 0.03, 0.04, F.glow, 0, 0.62, d / 2 + 0.045, 2));
  const pizza = puffDisc(0.2, 0.03, F.pizza, 0, 0.55, d / 2 + 0.02);
  pizza.rotation.x = Math.PI / 2 - 0.3;
  g.add(pizza);
  chunkyHandle(g, m.steel, w * 0.5, 0, 0.98, d / 2 + 0.02);
  // Dials and a little temperature lamp
  for (const x of [-0.5, 0.5]) knob(g, m.steel, x, 1.12, d / 2 + 0.0, 0.055);
  g.add(cyl(0.03, 0.03, 0.03, F.ember, 0, 1.12, d / 2 + 0.03, 10).rotateX(Math.PI / 2));
  return g;
}

function specialty(): THREE.Group {
  const g = new THREE.Group();
  const m = eqMats('#ef5a93');
  const F = food();
  const w = 1.82;
  const d = 1.1;
  feet(g, m.feet, w / 2, d / 2, 0.01);
  g.add(rb(w - 0.04, 0.8, d - 0.06, 0.08, m.body, 0, 0.49, 0.01, 4));
  const top = 0.98;
  g.add(rb(w + 0.04, 0.1, d + 0.02, 0.045, m.cream, 0, top - 0.05, 0.02, 4));
  // Gold drawer pull on the front
  g.add(rb(w * 0.55, 0.12, 0.05, 0.04, m.cream, 0, 0.6, d / 2 - 0.0, 3));
  // Cake under a glass dome on the left back
  g.add(cyl(0.24, 0.26, 0.04, F.white, -0.55, top + 0.02, -0.2, 20));
  g.add(puffDisc(0.18, 0.12, F.cake, -0.55, top + 0.1, -0.2));
  g.add(puffDisc(0.13, 0.1, F.cream, -0.55, top + 0.2, -0.2));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), F.berry).translateX(-0.55 + Math.cos(a) * 0.09).translateY(top + 0.26).translateZ(-0.2 + Math.sin(a) * 0.09));
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), F.glass);
  dome.scale.y = 1.25;
  dome.position.set(-0.55, top + 0.04, -0.2);
  g.add(dome);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), m.steel).translateX(-0.55).translateY(top + 0.36).translateZ(-0.2));
  // Chunky blender on the right back
  g.add(rb(0.22, 0.14, 0.22, 0.05, m.dark, 0.6, top + 0.07, -0.24, 3));
  g.add(cyl(0.1, 0.075, 0.28, F.glass, 0.6, top + 0.28, -0.24, 16));
  g.add(cyl(0.085, 0.07, 0.17, F.berry, 0.6, top + 0.23, -0.24, 16));
  g.add(cyl(0.105, 0.105, 0.04, m.dark, 0.6, top + 0.44, -0.24, 16));
  // Sauce bottles
  for (const [x, mat] of [
    [0.25, F.berry],
    [0.36, F.mustard],
  ] as const) {
    g.add(cyl(0.045, 0.05, 0.18, mat, x, top + 0.09, -0.32, 12));
    g.add(cyl(0.015, 0.035, 0.06, mat, x, top + 0.21, -0.32, 10));
  }
  return g;
}

function bar(): THREE.Group {
  const g = new THREE.Group();
  const m = eqMats('#c9773b');
  const F = food();
  const w = 1.84;
  const d = 1.1;
  feet(g, m.feet, w / 2, d / 2, 0.02);
  g.add(rb(w - 0.04, 0.8, d - 0.06, 0.07, m.body, 0, 0.49, 0.02, 4));
  const top = 0.98;
  g.add(rb(w + 0.04, 0.1, d + 0.02, 0.045, m.cream, 0, top - 0.05, 0.03, 4));
  for (let i = 0; i < 3; i++) g.add(rb(0.5, 0.5, 0.04, 0.04, m.cream, -0.58 + i * 0.58, 0.44, d / 2 - 0.0, 3));
  // Chunky espresso machine on the back
  const ex = -0.35;
  const ez = -0.22;
  g.add(rb(0.78, 0.5, 0.42, 0.09, m.accent, ex, top + 0.25, ez, 4));
  g.add(rb(0.82, 0.07, 0.46, 0.03, m.steel, ex, top + 0.53, ez, 3));
  g.add(rb(0.64, 0.06, 0.12, 0.025, m.steel, ex, top + 0.37, ez + 0.24, 2));
  for (const x of [-0.18, 0.18]) {
    g.add(cyl(0.04, 0.05, 0.08, m.steel, ex + x, top + 0.3, ez + 0.28, 12));
    const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.14, 4, 8), F.black);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(ex + x, top + 0.27, ez + 0.4);
    g.add(handle);
  }
  knob(g, m.steel, ex, top + 0.44, ez + 0.21, 0.045);
  // Cups on top of the machine
  for (let k = 0; k < 3; k++) {
    g.add(cyl(0.05, 0.04, 0.08, F.white, ex - 0.22 + k * 0.22, top + 0.6, ez, 14));
    g.add(cyl(0.042, 0.042, 0.01, F.coffee, ex - 0.22 + k * 0.22, top + 0.635, ez, 12));
  }
  // Syrup bottles and a jar of beans on the right
  for (const [x, mat] of [
    [0.35, F.berry],
    [0.47, F.mustard],
    [0.59, F.sauce],
  ] as const) {
    g.add(cyl(0.04, 0.045, 0.24, mat, x, top + 0.12, -0.3, 12));
    g.add(cyl(0.013, 0.03, 0.07, mat, x, top + 0.27, -0.3, 10));
  }
  g.add(cyl(0.09, 0.09, 0.2, F.glass, 0.72, top + 0.1, -0.12, 16));
  g.add(cyl(0.08, 0.08, 0.14, F.coffee, 0.72, top + 0.08, -0.12, 16));
  return g;
}

const BUILDERS: Record<StationType, () => THREE.Group> = { grill, fryer, prep, oven, specialty, bar };

export function createChunkyStation(type: StationType): THREE.Group {
  const g = (BUILDERS[type] ?? prep)();
  g.name = `station_${type}`;
  return g;
}
