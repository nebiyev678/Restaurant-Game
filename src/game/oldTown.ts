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
};

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
    this.buildSkyline();
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

    // Granite-sett roads
    const setts = createSettsTexture(aniso);
    const roadMat = (w: number, d: number) =>
      new THREE.MeshStandardMaterial({ map: textured(setts, w / 2, d / 2), roughness: 0.86 });
    const ewLen = eastRoad.maxX - eastRoad.minX;
    g.add(flatPlane(ewLen, eastRoad.halfW * 2, roadMat(ewLen, eastRoad.halfW * 2), (eastRoad.minX + eastRoad.maxX) / 2, 0.02, 0));
    const nsLen = nsRoad.outer - nsRoad.inner;
    for (const side of [-1, 1]) {
      g.add(
        flatPlane(nsRoad.halfW * 2, nsLen, roadMat(nsRoad.halfW * 2, nsLen), nsRoad.x, 0.02, side * (nsRoad.inner + nsLen / 2))
      );
    }

    // Roundabout ring (sits on top of the road ends)
    const ringTex = textured(setts, rb.roadR, rb.roadR);
    const ring = new THREE.Mesh(
      new THREE.CircleGeometry(rb.roadR, 48),
      new THREE.MeshStandardMaterial({ map: ringTex, roughness: 0.86 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rb.x, 0.024, rb.z);
    ring.receiveShadow = true;
    g.add(ring);

    // Brick herringbone courtyard in front of home
    const cw = courtyard.maxX - courtyard.minX;
    const cd = courtyard.maxZ - courtyard.minZ;
    g.add(
      flatPlane(
        cw,
        cd,
        new THREE.MeshStandardMaterial({ map: textured(createHerringboneTexture(aniso), cw / 1.6, cd / 1.6), roughness: 0.85 }),
        (courtyard.minX + courtyard.maxX) / 2,
        0.018,
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
  private buildSkyline() {
    const houses: { x: number; z: number; w: number; h: number; d: number; yaw: number }[] = [];
    const rnd = seeded(101);
    // North row (fronts face +z)
    let x = -28;
    while (x < 52) {
      const w = 4.2 + rnd() * 2.6;
      houses.push({ x: x + w / 2, z: -31 - rnd() * 1.5, w, h: 6.5 + rnd() * 4, d: 5, yaw: 0 });
      x += w + 0.15;
    }
    // West row (fronts face +x)
    let z = -27;
    while (z < 26) {
      const w = 4.2 + rnd() * 2.6;
      houses.push({ x: -29 - rnd() * 1.5, z: z + w / 2, w, h: 6 + rnd() * 4, d: 5, yaw: Math.PI / 2 });
      z += w + 0.15;
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
  withMenuBoard: boolean
): { group: THREE.Group; colliders: WorldCollider[] } {
  const g = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const zIn = 3.7 * side;
  const zOut = 6.9 * side;
  const xIn = 0.6;
  const xOut = 5.2;

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
  for (const bx of [1.6, 3.8]) {
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
  for (const tx of [1.75, 3.95]) {
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
