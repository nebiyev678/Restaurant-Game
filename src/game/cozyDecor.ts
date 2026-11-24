// Cozy interior dressing: warm pendant lamps with soft glow, light pools, flower boxes,
// a steaming soup pot, a cutting board and vegetable crates. Glows are cheap additive
// sprites/planes (no extra real-time lights), so they stay light on phones.
import * as THREE from 'three';

let glowTex: THREE.CanvasTexture | null = null;
/** Shared soft radial gradient (white centre → transparent edge). */
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

/** A glow material plus its daytime opacity, so the engine can brighten it at night. */
export interface GlowMat {
  mat: THREE.SpriteMaterial | THREE.MeshBasicMaterial;
  base: number;
}

export function createGlowSprite(color: string, size: number, opacity: number, out: GlowMat[]): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  out.push({ mat, base: opacity });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.renderOrder = 5;
  return s;
}

/** Soft warm pool of light lying flat on a surface (table top or floor). */
export function createLightPool(color: string, radius: number, opacity: number, out: GlowMat[]): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: getGlowTexture(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  out.push({ mat, base: opacity });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  return m;
}

/**
 * Warm pendant lamp: copper dome shade, glowing bulb, halo, and a light pool on the
 * table below. `dropTo` is the height of the surface the light falls on.
 */
export function createCozyPendant(
  lightColor: string,
  opts: { hangY: number; ceilingY: number; dropTo: number; poolRadius?: number },
  glows: GlowMat[],
  bulbs: THREE.MeshStandardMaterial[]
): THREE.Group {
  const g = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: '#b45f2b', metalness: 0.75, roughness: 0.3 });
  const inner = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: lightColor, emissiveIntensity: 0.55, side: THREE.BackSide, roughness: 0.6 });
  const cordLen = Math.max(0.2, opts.ceilingY - opts.hangY);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, cordLen, 6), new THREE.MeshStandardMaterial({ color: '#1c1917' }));
  cord.position.y = opts.hangY + cordLen / 2 + 0.12;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 12), copper);
  cap.position.y = opts.hangY + 0.14;
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), copper);
  shade.position.y = opts.hangY - 0.06;
  shade.scale.y = 0.75;
  shade.castShadow = false;
  const shadeIn = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), inner);
  shadeIn.position.copy(shade.position);
  shadeIn.scale.y = 0.74;
  const bulbMat = new THREE.MeshStandardMaterial({ color: lightColor, emissive: lightColor, emissiveIntensity: 1.2, roughness: 0.2 });
  bulbs.push(bulbMat);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), bulbMat);
  bulb.position.y = opts.hangY - 0.08;
  const halo = createGlowSprite(lightColor, 1.3, 0.6, glows);
  halo.position.y = opts.hangY - 0.14;
  const pool = createLightPool(lightColor, opts.poolRadius ?? 0.85, 0.5, glows);
  pool.position.y = opts.dropTo + 0.012;
  g.add(cord, cap, shade, shadeIn, bulb, halo, pool);
  return g;
}

/** Long planter box with flowers and trailing leaves (sits on a half-wall cap). */
export function createFlowerBox(length: number): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.2, 0.28),
    new THREE.MeshStandardMaterial({ color: '#8a4b2a', roughness: 0.75 })
  );
  box.position.y = 0.1;
  box.castShadow = true;
  g.add(box);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(length - 0.06, 0.02, 0.22), new THREE.MeshStandardMaterial({ color: '#4a3020' }));
  soil.position.y = 0.2;
  g.add(soil);
  const n = Math.max(3, Math.round(length / 0.22));
  const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.1, 0), new THREE.MeshStandardMaterial({ color: '#4f8f3a', roughness: 0.7 }), n);
  const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.055, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), n);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  const colors = ['#ffffff', '#fde047', '#f472b6', '#ffffff', '#fb923c'];
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + 0.11 + (i / Math.max(1, n - 1)) * (length - 0.22);
    const z = (i % 2 ? 0.05 : -0.05);
    m.makeScale(1, 0.8, 1).setPosition(x, 0.27, z);
    leaf.setMatrixAt(i, m);
    m.makeTranslation(x + 0.03, 0.36 + (i % 3) * 0.02, z * 1.4);
    bloom.setMatrixAt(i, m);
    bloom.setColorAt(i, col.set(colors[i % colors.length]));
  }
  leaf.castShadow = true;
  g.add(leaf, bloom);
  return g;
}

/** Stock pot of soup with a lid tilted aside; `SteamPuffs` animates the steam. */
export function createSoupPot(): THREE.Group {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.25 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.26, 20, 1, true), steel);
  (pot.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  pot.position.y = 0.13;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), steel);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.01;
  const soup = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 }));
  soup.rotation.x = -Math.PI / 2;
  soup.position.y = 0.22;
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), steel);
    handle.position.set(s * 0.21, 0.2, 0);
    handle.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    g.add(handle);
  }
  g.add(pot, bottom, soup);
  return g;
}

/** Rising, fading steam puffs above a point. */
export class SteamPuffs {
  readonly group = new THREE.Group();
  private puffs: { s: THREE.Sprite; t: number }[] = [];
  constructor(count = 4, private height = 0.9) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ map: getGlowTexture(), color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(mat);
      this.group.add(s);
      this.puffs.push({ s, t: i / count });
    }
  }
  update(dt: number) {
    for (const p of this.puffs) {
      p.t = (p.t + dt * 0.45) % 1;
      const k = p.t;
      p.s.position.set(Math.sin(k * 6 + p.t * 3) * 0.06, k * this.height, Math.cos(k * 5) * 0.04);
      const size = 0.18 + k * 0.5;
      p.s.scale.set(size, size, 1);
      (p.s.material as THREE.SpriteMaterial).opacity = Math.sin(k * Math.PI) * 0.45;
    }
  }
}

/** Wooden cutting board with tomato slices, lettuce and a knife. */
export function createCuttingBoard(): THREE.Group {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.34), new THREE.MeshStandardMaterial({ color: '#c08a4b', roughness: 0.7 }));
  board.position.y = 0.018;
  board.castShadow = true;
  g.add(board);
  const red = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 });
  for (let i = 0; i < 4; i++) {
    const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 14), red);
    slice.position.set(-0.12 + i * 0.06, 0.045, 0.06);
    slice.rotation.z = 0.2;
    g.add(slice);
  }
  const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), red);
  tomato.position.set(0.15, 0.08, 0.07);
  g.add(tomato);
  const lettuce = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), lettuce);
    l.scale.set(1.3, 0.45, 1);
    l.position.set(-0.1 + i * 0.07, 0.05, -0.07);
    g.add(l);
  }
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.04), new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 }));
  blade.position.set(0.05, 0.04, -0.13);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.035), new THREE.MeshStandardMaterial({ color: '#1c1917' }));
  handle.position.set(0.2, 0.045, -0.13);
  g.add(blade, handle);
  return g;
}

/** Wall shelf with three crates of vegetables (faces +z). */
export function createVeggieCrateShelf(woodColor: string): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.7 });
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.36), wood);
  g.add(plank);
  for (const x of [-0.7, 0.7]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.3), wood);
    bracket.position.set(x, -0.12, -0.02);
    g.add(bracket);
  }
  const crateMat = new THREE.MeshStandardMaterial({ color: '#c58b4e', roughness: 0.8 });
  const produce: [string, number][] = [['#dc2626', 0.07], ['#65a30d', 0.08], ['#f97316', 0.065]];
  produce.forEach(([color, r], i) => {
    const x = -0.5 + i * 0.5;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.28), crateMat);
    crate.position.set(x, 0.105, 0);
    crate.castShadow = true;
    g.add(crate);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
    for (let k = 0; k < 6; k++) {
      const v = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      v.position.set(x - 0.13 + (k % 3) * 0.13, 0.2 + Math.floor(k / 3) * 0.03, -0.05 + Math.floor(k / 3) * 0.1);
      g.add(v);
    }
  });
  return g;
}

// ---------------------------------------------------------------------------
// Expansion props
// ---------------------------------------------------------------------------

/** Hanging "TAKEAWAY" lightbox sign (faces +z). */
export function createTakeawaySign(glows: GlowMat[]): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = '#fff7ed';
  ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🥡 TAKEAWAY', 256, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.56, 0.08), new THREE.MeshStandardMaterial({ color: '#3f2a1c', roughness: 0.6 }));
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.62, 0.5),
    new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.5 })
  );
  face.position.z = 0.045;
  const back = face.clone();
  back.rotation.y = Math.PI;
  back.position.z = -0.045;
  g.add(frame, face, back);
  for (const x of [-0.6, 0.6]) {
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 4), new THREE.MeshStandardMaterial({ color: '#27272a' }));
    chain.position.set(x, 0.53, 0);
    g.add(chain);
  }
  const halo = createGlowSprite('#fbbf24', 1.9, 0.25, glows);
  halo.position.z = 0.2;
  g.add(halo);
  return g;
}

/** Stack of brown paper takeaway bags. */
export function createBagStack(): THREE.Group {
  const g = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: '#c9a36b', roughness: 0.9 });
  const label = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.6 });
  [[0, 0, 0], [0.24, 0, 0.04], [0.12, 0, -0.16]].forEach(([x, , z], i) => {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26 + (i % 2) * 0.04, 0.13), paper);
    bag.position.set(x, 0.13, z);
    bag.rotation.y = i * 0.4;
    bag.castShadow = true;
    const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), label);
    sticker.position.set(x, 0.15, z + 0.066);
    sticker.rotation.y = i * 0.4;
    g.add(bag, sticker);
  });
  return g;
}

/** Numbered floor spots showing where takeaway guests queue. */
export function createQueueMarkers(xs: readonly number[]): THREE.Group {
  const g = new THREE.Group();
  xs.forEach((x, i) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(180,83,9,0.9)';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#fff7ed';
    ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), 64, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const spot = new THREE.Mesh(
      new THREE.CircleGeometry(0.3, 24),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, depthWrite: false })
    );
    spot.rotation.x = -Math.PI / 2;
    spot.position.set(x, 0.122, 0);
    g.add(spot);
  });
  return g;
}

/** Chrome heat-lamp bar with two glowing lamps (Professional Kitchen, over the pass). */
export function createHeatLampBar(length: number, glows: GlowMat[], bulbs: THREE.MeshStandardMaterial[]): THREE.Group {
  const g = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, length), chrome);
  g.add(bar);
  for (const z of [-length / 2 + 0.05, length / 2 - 0.05]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), chrome);
    rod.position.set(0, 0.38, z);
    g.add(rod);
  }
  for (const z of [-length / 4, length / 4]) {
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 14, 1, true), chrome);
    (shade.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    shade.position.set(0, -0.12, z);
    const bulbMat = new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a00', emissiveIntensity: 1.3 });
    bulbs.push(bulbMat);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), bulbMat);
    bulb.position.set(0, -0.17, z);
    const glow = createGlowSprite('#ff7a1a', 0.7, 0.55, glows);
    glow.position.set(0, -0.25, z);
    const pool = createLightPool('#ff8a3d', 0.45, 0.35, glows);
    pool.position.set(0, -1.38, z);
    g.add(shade, bulb, glow, pool);
  }
  return g;
}
