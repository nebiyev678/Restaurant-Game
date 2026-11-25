import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { StationType } from './types';

// ---------------------------------------------------------------------------
// Upgrade looks for kitchen machines. The six upgrade levels show as four stages:
//   Lv 1     Basic  - honey oak cabinet, plain steel (the original look)
//   Lv 2–3   Steel  - brushed stainless body, chrome handle rail and kick plate
//   Lv 4–5   Pro    - navy enamel with copper trim, brass knobs, warm LED strip,
//                     a glowing digital display
//   Lv 6     Master - black lacquer with gold trim and corner caps, gold knobs,
//                     a glowing chef's-hat badge
// Every stage also gets softly bevelled edges and a row of level stars.
// ---------------------------------------------------------------------------

export type EquipmentStage = 0 | 1 | 2 | 3;

export const STAGE_NAMES = ['Basic', 'Steel', 'Pro', 'Master'] as const;

export function equipmentStage(level: number): EquipmentStage {
  if (level >= 6) return 3;
  if (level >= 4) return 2;
  if (level >= 2) return 1;
  return 0;
}

let brushedTex: THREE.CanvasTexture | null = null;

/** Fine horizontal brushing streaks for stainless steel (shared). */
function brushedSteelTexture(): THREE.CanvasTexture | null {
  if (brushedTex) return brushedTex;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#d9dee4';
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256;
    const v = 200 + Math.floor(Math.random() * 55);
    x.strokeStyle = `rgba(${v},${v + 2},${v + 6},${0.25 + Math.random() * 0.35})`;
    x.lineWidth = Math.random() < 0.85 ? 1 : 2;
    x.beginPath();
    const x0 = Math.random() * 256;
    x.moveTo(x0, y);
    x.lineTo(x0 + 40 + Math.random() * 160, y + (Math.random() - 0.5) * 0.6);
    x.stroke();
  }
  brushedTex = new THREE.CanvasTexture(c);
  brushedTex.wrapS = brushedTex.wrapT = THREE.RepeatWrapping;
  brushedTex.repeat.set(2, 2);
  brushedTex.colorSpace = THREE.SRGBColorSpace;
  return brushedTex;
}

function metal(color: string, roughness: number, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 1, roughness, clearcoat: 0.4, clearcoatRoughness: 0.2, ...extra });
}

const COPPER = '#c8794a';
const BRASS = '#d4a64a';
const GOLD = '#e0b54a';

/** Materials for each named part of a machine at a given stage (null = keep the original). */
function stageMaterials(stage: EquipmentStage) {
  const brushed = brushedSteelTexture();
  const stainless = () =>
    new THREE.MeshPhysicalMaterial({ color: '#f2f5f8', map: brushed, metalness: 0.92, roughness: 0.24, clearcoat: 0.25, clearcoatRoughness: 0.3 });
  switch (stage) {
    case 1:
      return {
        body: stainless(),
        steel: stainless(),
        dark: new THREE.MeshPhysicalMaterial({ color: '#2a3340', metalness: 0.7, roughness: 0.3, clearcoat: 0.6 }),
        accent: new THREE.MeshPhysicalMaterial({ color: '#e11d2e', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
        cream: null,
        feet: metal('#cfd6de', 0.2),
      };
    case 2:
      return {
        body: new THREE.MeshPhysicalMaterial({ color: '#1d3557', roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 }),
        steel: stainless(),
        dark: new THREE.MeshPhysicalMaterial({ color: '#1f2630', metalness: 0.8, roughness: 0.22, clearcoat: 0.8 }),
        accent: metal(BRASS, 0.22),
        cream: new THREE.MeshPhysicalMaterial({ color: '#faf6ee', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
        feet: metal(COPPER, 0.25),
      };
    case 3:
      return {
        body: new THREE.MeshPhysicalMaterial({ color: '#15110e', roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 }),
        steel: stainless(),
        dark: new THREE.MeshPhysicalMaterial({ color: '#141414', metalness: 0.85, roughness: 0.18, clearcoat: 1 }),
        accent: metal(GOLD, 0.16),
        cream: new THREE.MeshPhysicalMaterial({ color: '#fbf8f1', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 }),
        feet: metal(GOLD, 0.18),
      };
    default:
      return null;
  }
}

/** Replaces plain boxes with softly bevelled ones: every machine reads as more finished. */
function bevelBoxes(group: THREE.Group) {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || mesh.geometry.type !== 'BoxGeometry') return;
    const p = (mesh.geometry as THREE.BoxGeometry).parameters;
    const min = Math.min(p.width, p.height, p.depth);
    if (min < 0.06) return;
    const r = Math.min(0.03, min * 0.22);
    mesh.geometry.dispose();
    mesh.geometry = new RoundedBoxGeometry(p.width, p.height, p.depth, 2, r);
  });
}

/** Front face, width and top of the machine's cabinet (the parts below the work top). */
function bodyBounds(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.material as THREE.Material).name;
    if (name !== 'eq_body' && name !== 'eq_steel' && name !== 'eq_cream') return;
    tmp.setFromObject(mesh);
    if ((tmp.min.y + tmp.max.y) / 2 > 1.0) return;
    if (tmp.max.x - tmp.min.x < 0.5) return;
    box.union(tmp);
  });
  if (box.isEmpty()) box.set(new THREE.Vector3(-0.8, 0.1, -0.45), new THREE.Vector3(0.8, 0.95, 0.45));
  return { minX: box.min.x, maxX: box.max.x, front: box.max.z, top: box.max.y, bottom: Math.max(0.12, box.min.y) };
}

function starShape(r: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return s;
}

function displayTexture(text: string, color: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 48;
  const x = c.getContext('2d')!;
  x.fillStyle = '#071018';
  x.fillRect(0, 0, 128, 48);
  x.font = 'bold 30px monospace';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.shadowColor = color;
  x.shadowBlur = 8;
  x.fillStyle = color;
  x.fillText(text, 64, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function badgeTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 54, 6, 64, 64, 62);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(0.55, '#f0c24f');
  g.addColorStop(1, '#9a6a12');
  x.fillStyle = g;
  x.beginPath();
  x.arc(64, 64, 60, 0, Math.PI * 2);
  x.fill();
  // Chef's hat
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(46, 52, 16, 0, Math.PI * 2);
  x.arc(64, 42, 19, 0, Math.PI * 2);
  x.arc(82, 52, 16, 0, Math.PI * 2);
  x.fill();
  x.fillRect(46, 52, 36, 26);
  x.fillStyle = '#f5e6c0';
  x.fillRect(44, 76, 40, 9);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const DISPLAY_TEXT: Record<StationType, string> = {
  grill: '230°',
  fryer: '180°',
  oven: '',
  prep: 'READY',
  bar: 'BREW',
  specialty: '-4°',
};

/**
 * Restyles a freshly built kitchen machine for its upgrade level. Front is +z, the
 * cabinet stands on y ≈ 0.12.
 */
export function applyEquipmentLook(group: THREE.Group, type: StationType, level: number) {
  const stage = equipmentStage(level);
  bevelBoxes(group);

  const b = bodyBounds(group);
  const mats = stageMaterials(stage);
  if (mats) {
    const tmp = new THREE.Box3();
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const name = (mesh.material as THREE.Material).name;
      // Pro and Master: the big lower steel cabinet panels take the enamel / lacquer finish too
      let lowerPanel = false;
      if (stage >= 2 && name === 'eq_steel') {
        tmp.setFromObject(mesh);
        lowerPanel = tmp.max.y < b.top - 0.12 && tmp.max.y - tmp.min.y > 0.22 && tmp.max.x - tmp.min.x > 0.5;
      }
      // Big red parts (oven hood, espresso machine) take the body finish; only knobs turn brass / gold
      let bigAccent = false;
      if (stage >= 2 && name === 'eq_accent') {
        tmp.setFromObject(mesh);
        const sz = tmp.getSize(new THREE.Vector3());
        bigAccent = Math.max(sz.x, sz.y, sz.z) > 0.3;
      }
      const swap = lowerPanel || bigAccent
        ? mats.body
        : name === 'eq_body'
          ? mats.body
          : name === 'eq_steel'
            ? mats.steel
            : name === 'eq_dark'
              ? mats.dark
              : name === 'eq_accent'
                ? mats.accent
                : name === 'eq_cream'
                  ? mats.cream
                  : name === 'eq_feet'
                    ? mats.feet
                    : null;
      if (swap) mesh.material = swap;
    });
  }

  const w = b.maxX - b.minX;
  const cx = (b.minX + b.maxX) / 2;
  const addOns = new THREE.Group();
  addOns.name = 'upgradeLook';

  if (stage >= 1) {
    // Chrome towel / handle rail across the front on two stand-offs
    const chrome = metal(stage === 3 ? GOLD : '#e9eef3', 0.12);
    const railY = b.top - 0.16;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, w * 0.82, 12), chrome);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(cx, railY, b.front + 0.07);
    addOns.add(rail);
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), chrome);
      post.rotation.x = Math.PI / 2;
      post.position.set(cx + s * w * 0.38, railY, b.front + 0.035);
      addOns.add(post);
    }
    // Polished kick plate along the bottom
    const kick = new THREE.Mesh(new RoundedBoxGeometry(w * 0.96, 0.09, 0.03, 2, 0.012), stage >= 2 ? metal(stage === 3 ? GOLD : COPPER, 0.22) : metal('#cfd6de', 0.18));
    kick.position.set(cx, b.bottom + 0.06, b.front + 0.012);
    addOns.add(kick);
  }

  if (stage >= 2) {
    // Copper (Pro) or gold (Master) trim band along the front edge of the work top
    const trimMat = metal(stage === 3 ? GOLD : COPPER, 0.18);
    const trim = new THREE.Mesh(new RoundedBoxGeometry(w + 0.04, 0.045, 0.035, 2, 0.015), trimMat);
    trim.position.set(cx, b.top - 0.03, b.front + 0.02);
    addOns.add(trim);
    // Warm LED strip glowing just under it
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.9, 0.012, 0.012),
      new THREE.MeshStandardMaterial({ color: '#fff1c9', emissive: stage === 3 ? '#ffd27a' : '#ffb35c', emissiveIntensity: 2.2, toneMapped: false })
    );
    led.position.set(cx, b.top - 0.065, b.front + 0.03);
    addOns.add(led);
    // Glowing digital display on the right of the front panel (the oven has its window instead)
    if (DISPLAY_TEXT[type]) {
      const tex = displayTexture(DISPLAY_TEXT[type], stage === 3 ? '#ffd27a' : '#5cf2a6');
      const bezel = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.13, 0.03, 2, 0.012), trimMat);
      bezel.position.set(b.maxX - 0.3, b.top - 0.3, b.front + 0.015);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.09), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      screen.position.set(b.maxX - 0.3, b.top - 0.3, b.front + 0.032);
      addOns.add(bezel, screen);
    }
  }

  if (stage === 3) {
    // Gold corner caps on the work top
    const gold = metal(GOLD, 0.14);
    for (const x of [b.minX + 0.02, b.maxX - 0.02]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), gold);
      cap.position.set(x, b.top - 0.02, b.front + 0.01);
      addOns.add(cap);
    }
    // Glowing chef's-hat badge in the middle of the front
    const tex = badgeTexture();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 28), gold);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(cx, b.top - 0.3, b.front + 0.015);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.095, 28), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.set(cx, b.top - 0.3, b.front + 0.03);
    addOns.add(disc, face);
    // Soft golden glow around the badge
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d')!;
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,220,120,0.9)');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
      const glowTex = new THREE.CanvasTexture(c);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
      glow.scale.setScalar(0.5);
      glow.position.set(cx, b.top - 0.3, b.front + 0.06);
      addOns.add(glow);
    }
  }

  // Level stars on the left of the front panel (1 to 6)
  const starMat = new THREE.MeshStandardMaterial({
    color: stage === 0 ? '#f5c542' : GOLD,
    emissive: '#f5b400',
    emissiveIntensity: stage >= 2 ? 0.8 : 0.45,
    metalness: 0.4,
    roughness: 0.3,
    side: THREE.DoubleSide,
  });
  const starGeo = new THREE.ShapeGeometry(starShape(0.045));
  const n = Math.max(1, Math.min(6, level));
  for (let i = 0; i < n; i++) {
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(b.minX + 0.13 + i * 0.1, b.top - 0.3, b.front + 0.022);
    addOns.add(star);
  }

  addOns.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = false;
  });
  group.add(addOns);
  group.userData.equipmentStage = stage;
}
