/**
 * Mascot chef character generator.
 *
 * Builds the player's chef as a real rigged character: smooth organic geometry,
 * one skeleton, smooth skin weights, facial blend shapes and animation clips.
 * Runs in a browser (three.js), and the result is exported to
 * public/models/chef/chef.glb by tools/chef/export.html.
 *
 * Front is +z, up is +y, feet stand on y = 0, units are metres (game scale).
 */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Palette (from the approved laughing-chef artwork)
// ---------------------------------------------------------------------------
const C = {
  skin: '#d9845a',
  blush: '#e4614a',
  nose: '#e06a48',
  hair: '#5a3220',
  jacket: '#f8f4ec',
  toque: '#fbfaf6',
  gold: '#e8962a',
  kerchief: '#b8230e',
  trousers: '#4a403b',
  shoe: '#4a2f22',
  sole: '#e9e1d4',
  sclera: '#ffffff',
  iris: '#7a4422',
  pupil: '#120a06',
  mouth: '#6e1612',
  teeth: '#ffffff',
  tongue: '#e8737a',
  lip: '#5a1d14',
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
export const BONES = [
  'Hips',
  'Spine',
  'Chest',
  'Neck',
  'Head',
  'L_UpperArm',
  'L_LowerArm',
  'L_Hand',
  'R_UpperArm',
  'R_LowerArm',
  'R_Hand',
  'L_UpperLeg',
  'L_LowerLeg',
  'L_Foot',
  'R_UpperLeg',
  'R_LowerLeg',
  'R_Foot',
  'R_HandSocket',
  'L_HandSocket',
] as const;
type BoneName = (typeof BONES)[number];
const B = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

/** World-space joint positions in the modelling pose (arms relaxed down, slightly out). */
const J = {
  Hips: new THREE.Vector3(0, 0.6, 0),
  Spine: new THREE.Vector3(0, 0.78, 0),
  Chest: new THREE.Vector3(0, 0.98, 0),
  Neck: new THREE.Vector3(0, 1.16, 0),
  Head: new THREE.Vector3(0, 1.25, 0),
  L_UpperArm: new THREE.Vector3(0.235, 1.09, 0),
  L_LowerArm: new THREE.Vector3(0.315, 0.865, 0.0),
  L_Hand: new THREE.Vector3(0.345, 0.655, 0.02),
  R_UpperArm: new THREE.Vector3(-0.235, 1.09, 0),
  R_LowerArm: new THREE.Vector3(-0.315, 0.865, 0.0),
  R_Hand: new THREE.Vector3(-0.345, 0.655, 0.02),
  L_UpperLeg: new THREE.Vector3(0.105, 0.56, 0),
  L_LowerLeg: new THREE.Vector3(0.11, 0.32, 0.01),
  L_Foot: new THREE.Vector3(0.11, 0.1, 0),
  R_UpperLeg: new THREE.Vector3(-0.105, 0.56, 0),
  R_LowerLeg: new THREE.Vector3(-0.11, 0.32, 0.01),
  R_Foot: new THREE.Vector3(-0.11, 0.1, 0),
  R_HandSocket: new THREE.Vector3(-0.35, 0.575, 0.05),
  L_HandSocket: new THREE.Vector3(0.35, 0.575, 0.05),
};
const PARENT: Partial<Record<BoneName, BoneName>> = {
  Spine: 'Hips',
  Chest: 'Spine',
  Neck: 'Chest',
  Head: 'Neck',
  L_UpperArm: 'Chest',
  L_LowerArm: 'L_UpperArm',
  L_Hand: 'L_LowerArm',
  R_UpperArm: 'Chest',
  R_LowerArm: 'R_UpperArm',
  R_Hand: 'R_LowerArm',
  L_UpperLeg: 'Hips',
  L_LowerLeg: 'L_UpperLeg',
  L_Foot: 'L_LowerLeg',
  R_UpperLeg: 'Hips',
  R_LowerLeg: 'R_UpperLeg',
  R_Foot: 'R_LowerLeg',
  R_HandSocket: 'R_Hand',
  L_HandSocket: 'L_Hand',
};

function buildSkeleton(): { bones: THREE.Bone[]; root: THREE.Bone } {
  const bones = BONES.map((name) => {
    const b = new THREE.Bone();
    b.name = name;
    return b;
  });
  for (const name of BONES) {
    const b = bones[B[name]];
    const parent = PARENT[name];
    if (parent) {
      bones[B[parent]].add(b);
      b.position.copy(J[name]).sub(J[parent]);
    } else {
      b.position.copy(J[name]);
    }
  }
  return { bones, root: bones[B.Hips] };
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
type Geo = THREE.BufferGeometry;

/** Every part gets the same attribute set so parts can be merged. */
function prep(g: Geo, color = '#ffffff'): Geo {
  let geo = g.index ? g : mergeVertices(g, 1e-5);
  if (!geo.getAttribute('uv')) {
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
  }
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
  geo.computeVertexNormals();
  const n = geo.getAttribute('position').count;
  const col = new THREE.Color(color);
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.toArray(cols, i * 3);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return geo;
}

function ellipsoid(c: THREE.Vector3, r: THREE.Vector3, ws = 28, hs = 20): Geo {
  const g = new THREE.SphereGeometry(1, ws, hs);
  g.scale(r.x, r.y, r.z);
  g.translate(c.x, c.y, c.z);
  return g;
}

/** A smooth tube along a curve whose radius follows `rad(t)` (closed with rounded tips when rad → 0). */
function taperTube(points: THREE.Vector3[], rad: (t: number) => number, tubular = 40, radial = 14, squash = 1, faceAxis?: THREE.Vector3): Geo {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const frames = curve.computeFrenetFrames(tubular, false);
  if (faceAxis) {
    // Flatten toward a chosen axis (e.g. the face normal) instead of the twisting Frenet frame
    for (let i = 0; i <= tubular; i++) {
      const T = curve.getTangentAt(i / tubular);
      const N = new THREE.Vector3().crossVectors(T, faceAxis).normalize();
      frames.normals[i].copy(N);
      frames.binormals[i].crossVectors(T, N).normalize();
    }
  }
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const p = curve.getPointAt(t);
    const N = frames.normals[i];
    const Bn = frames.binormals[i];
    const r = Math.max(1e-4, rad(t));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = Math.cos(a) * r;
      const cy = Math.sin(a) * r * squash;
      pos.push(p.x + N.x * cx + Bn.x * cy, p.y + N.y * cx + Bn.y * cy, p.z + N.z * cx + Bn.z * cy);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < tubular; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      // Custom frames flip the handedness, so flip the winding to keep faces pointing out
      if (faceAxis) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Rounded tips for tubes: radius grows smoothly from 0 and back to 0. */
const capped = (r0: number, r1: number, tip = 0.08) => (t: number) => {
  const base = r0 + (r1 - r0) * t;
  const a = Math.min(1, t / tip);
  const b = Math.min(1, (1 - t) / tip);
  return base * Math.sqrt(Math.max(0, 1 - (1 - a) * (1 - a))) * Math.sqrt(Math.max(0, 1 - (1 - b) * (1 - b)));
};

function lathe(profile: [number, number][], segs = 48, sz = 1): Geo {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segs
  );
  g.scale(1, 1, sz);
  return g;
}

/** Tiny pseudo-random wobble used for cloth folds. */
function hash(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function displace(g: Geo, fn: (p: THREE.Vector3, n: THREE.Vector3) => number) {
  g.computeVertexNormals();
  const p = g.getAttribute('position');
  const n = g.getAttribute('normal');
  const v = new THREE.Vector3();
  const nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nv.fromBufferAttribute(n, i);
    const d = fn(v, nv);
    p.setXYZ(i, v.x + nv.x * d, v.y + nv.y * d, v.z + nv.z * d);
  }
  g.computeVertexNormals();
}

/** Tints vertices facing a direction (blush on cheeks, rosy nose tip). */
function tint(g: Geo, color: string, centre: THREE.Vector3, radius: number, strength = 1) {
  const p = g.getAttribute('position');
  const c = g.getAttribute('color');
  const col = new THREE.Color(color);
  const base = new THREE.Color();
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = v.distanceTo(centre) / radius;
    if (d >= 1) continue;
    const k = (1 - d * d) * (1 - d * d) * strength;
    base.fromBufferAttribute(c, i).lerp(col, k);
    c.setXYZ(i, base.r, base.g, base.b);
  }
}

// ---------------------------------------------------------------------------
// Skin weights
// ---------------------------------------------------------------------------
function setWeights(g: Geo, fn: (p: THREE.Vector3) => [number, number][]) {
  const p = g.getAttribute('position');
  const si = new Uint16Array(p.count * 4);
  const sw = new Float32Array(p.count * 4);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ws = fn(v)
      .filter((w) => w[1] > 1e-4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const total = ws.reduce((s, w) => s + w[1], 0) || 1;
    ws.forEach(([b, w], k) => {
      si[i * 4 + k] = b;
      sw[i * 4 + k] = w / total;
    });
    if (!ws.length) sw[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  return g;
}

const rigid = (g: Geo, bone: BoneName) => setWeights(g, () => [[B[bone], 1]]);

const smooth = (x: number, a: number, b: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Position along a chain of joints → blend between consecutive bones near each joint. */
function chainWeights(g: Geo, joints: THREE.Vector3[], bones: BoneName[], blend = 0.05) {
  const seg = joints.slice(0, -1).map((a, i) => ({ a, b: joints[i + 1] }));
  return setWeights(g, (p) => {
    // Distance along the chain of the closest point
    let best = { s: 0, d: Infinity };
    let acc = 0;
    for (const { a, b } of seg) {
      const ab = b.clone().sub(a);
      const len = ab.length();
      const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / (len * len), 0, 1);
      const d = a.clone().addScaledVector(ab, t).distanceTo(p);
      if (d < best.d) best = { s: acc + t * len, d };
      acc += len;
    }
    const out: [number, number][] = [];
    let jointS = 0;
    let prevW = 1;
    for (let k = 0; k < bones.length; k++) {
      if (k === bones.length - 1) {
        out.push([B[bones[k]], prevW]);
        break;
      }
      jointS += seg[k].a.distanceTo(seg[k].b);
      const next = smooth(best.s, jointS - blend, jointS + blend);
      out.push([B[bones[k]], prevW * (1 - next)]);
      prevW *= next;
    }
    return out;
  });
}

/** Torso: hips → spine → chest by height, with the shoulders easing into the upper arms. */
function torsoWeights(g: Geo) {
  return setWeights(g, (p) => {
    const hs = smooth(p.y, 0.66, 0.76);
    const sc = smooth(p.y, 0.86, 0.98);
    const w: [number, number][] = [
      [B.Hips, 1 - hs],
      [B.Spine, hs * (1 - sc)],
      [B.Chest, hs * sc],
    ];
    for (const side of ['L', 'R'] as const) {
      const sh = J[`${side}_UpperArm`];
      const d = Math.hypot(p.x - sh.x, p.y - sh.y, p.z - sh.z);
      const k = 1 - smooth(d, 0.05, 0.12);
      if (k > 0 && Math.abs(p.x) > 0.16) {
        w.forEach((e) => (e[1] *= 1 - k * 0.6));
        w.push([B[`${side}_UpperArm`], k * 0.6]);
      }
    }
    return w;
  });
}

// ---------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------
const HEAD_C = new THREE.Vector3(0, 1.45, 0);
const HEAD_R = new THREE.Vector3(0.29, 0.27, 0.27);

/** z of the face surface at (x, y), plus `lift`. */
function faceZ(x: number, y: number, lift = 0) {
  const k = 1 - (x / HEAD_R.x) ** 2 - ((y - HEAD_C.y) / HEAD_R.y) ** 2;
  return HEAD_C.z + HEAD_R.z * Math.sqrt(Math.max(0, k)) + lift;
}

/** Front of the cheek bulges (so the moustache can lie over them). */
function cheekZ(x: number, y: number) {
  const cx = Math.sign(x || 1) * 0.145;
  const k = 1 - ((x - cx) / 0.1) ** 2 - ((y - 1.39) / 0.085) ** 2;
  return k > 0 ? 0.15 + 0.1 * Math.sqrt(k) : -1;
}

function buildHeadSkin(): Geo {
  const parts: Geo[] = [];
  const head = prep(ellipsoid(HEAD_C, HEAD_R, 48, 36), C.skin);
  for (const s of [-1, 1]) tint(head, C.blush, new THREE.Vector3(s * 0.16, 1.4, 0.23), 0.08, 0.45);
  parts.push(head);
  // Full cheeks and a soft chin make the face round and jolly
  for (const s of [-1, 1]) {
    const cheek = prep(ellipsoid(new THREE.Vector3(s * 0.145, 1.39, 0.15), new THREE.Vector3(0.1, 0.085, 0.1), 28, 20), C.skin);
    tint(cheek, C.blush, new THREE.Vector3(s * 0.165, 1.4, 0.245), 0.07, 0.55);
    parts.push(cheek);
    const ear = prep(ellipsoid(new THREE.Vector3(s * 0.282, 1.455, -0.01), new THREE.Vector3(0.035, 0.062, 0.05), 16, 12), C.skin);
    tint(ear, C.blush, new THREE.Vector3(s * 0.3, 1.455, -0.01), 0.05, 0.35);
    parts.push(ear);
  }
  const chin = prep(ellipsoid(new THREE.Vector3(0, 1.31, 0.1), new THREE.Vector3(0.12, 0.07, 0.12), 24, 16), C.skin);
  parts.push(chin);
  // Big round nose
  const nose = prep(ellipsoid(new THREE.Vector3(0, 1.425, 0.268), new THREE.Vector3(0.062, 0.054, 0.052), 28, 20), C.skin);
  tint(nose, C.nose, new THREE.Vector3(0, 1.43, 0.33), 0.05, 0.7);
  parts.push(nose);
  for (const s of [-1, 1]) {
    const wing = prep(ellipsoid(new THREE.Vector3(s * 0.042, 1.41, 0.255), new THREE.Vector3(0.03, 0.03, 0.03), 14, 10), C.skin);
    parts.push(wing);
  }
  // Neck
  const neck = prep(new THREE.CylinderGeometry(0.085, 0.095, 0.2, 20, 1, true).translate(0, 1.21, 0.0), C.skin);
  parts.push(neck);
  return mergeGeometries(parts.map((g) => rigid(g, 'Head')))!;
}

function buildHair(): Geo {
  const parts: Geo[] = [];
  // Back of the head and the sides under the toque
  const back = ellipsoid(new THREE.Vector3(0, 1.47, -0.018), new THREE.Vector3(0.302, 0.262, 0.272), 40, 28);
  // Keep only what sits behind the face
  const pos = back.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    if (z > 0.02) pos.setZ(i, 0.02 + (z - 0.02) * 0.1);
  }
  // Soft locks: gentle ridges running down the back of the head and a wavy lower edge
  displace(back, (p, n) => {
    const ang = Math.atan2(p.x, p.z);
    const ridges = Math.sin(ang * 22 + p.y * 18) * 0.0045 + Math.sin(ang * 9 - p.y * 11) * 0.003;
    const low = smooth(1.42 - p.y, 0, 0.08);
    return ridges * (n.z < 0.3 ? 1 : 0.3) + Math.sin(ang * 14) * 0.0025 * low;
  });
  parts.push(prep(back, C.hair));
  for (const s of [-1, 1]) {
    // Puffy hair above the ears, sideburns down to the cheek
    parts.push(prep(ellipsoid(new THREE.Vector3(s * 0.258, 1.545, 0.02), new THREE.Vector3(0.06, 0.07, 0.09), 20, 14), C.hair));
    parts.push(prep(ellipsoid(new THREE.Vector3(s * 0.25, 1.59, -0.04), new THREE.Vector3(0.055, 0.05, 0.08), 20, 14), C.hair));
    parts.push(
      prep(
        taperTube(
          [new THREE.Vector3(s * 0.262, 1.56, 0.07), new THREE.Vector3(s * 0.272, 1.5, 0.085), new THREE.Vector3(s * 0.268, 1.43, 0.09)],
          capped(0.03, 0.022, 0.25),
          16,
          10
        ),
        C.hair
      )
    );
  }
  return mergeGeometries(parts.map((g) => rigid(g, 'Head')))!;
}

function buildToque(): Geo {
  const parts: Geo[] = [];
  // Pleated band
  const band = lathe(
    [
      [0.0, 1.625],
      [0.25, 1.625],
      [0.252, 1.64],
      [0.262, 1.78],
      [0.24, 1.795],
      [0.0, 1.795],
    ],
    72
  );
  displace(band, (p, n) => (Math.abs(n.y) < 0.5 ? Math.cos(Math.atan2(p.z, p.x) * 18) * 0.004 : 0));
  parts.push(prep(band, C.toque));
  // A soft cloud of puffs on top
  parts.push(prep(ellipsoid(new THREE.Vector3(0, 1.95, -0.01), new THREE.Vector3(0.22, 0.17, 0.21), 32, 22), C.toque));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.25;
    parts.push(
      prep(
        ellipsoid(new THREE.Vector3(Math.sin(a) * 0.18, 1.87 + (i % 2) * 0.03, Math.cos(a) * 0.17 - 0.01), new THREE.Vector3(0.14, 0.12, 0.14), 24, 16),
        C.toque
      )
    );
  }
  return mergeGeometries(parts.map((g) => rigid(g, 'Head')))!;
}

// ---------------------------------------------------------------------------
// Face (blend-shape meshes)
// ---------------------------------------------------------------------------
interface FaceParams {
  lid: number; // upper lid coverage, 0 (open) .. 1 (closed)
  eyeSY: number;
  iris: number;
  browY: number;
  browTilt: number;
  browArch: number;
  mouthW: number;
  mouthOpen: number;
  mouthCorner: number;
  stache: number;
  lash: number; // arch of the closed-eye line (happy ^ ^)
}

export const FACE_BASE: FaceParams = {
  lid: 0.14,
  eyeSY: 1,
  iris: 1,
  browY: 0,
  browTilt: 0.12,
  browArch: 0,
  mouthW: 0.13,
  mouthOpen: 0.034,
  mouthCorner: 0.018,
  stache: 0,
  lash: 0,
};

export const FACE_TARGETS: Record<string, Partial<FaceParams>> = {
  Blink: { lid: 1 },
  Smile: { lid: 0.3, mouthW: 0.14, mouthOpen: 0.04, mouthCorner: 0.03, browTilt: 0.22, stache: 0.012 },
  Laugh: { lid: 1, eyeSY: 0.5, lash: 0.022, browY: 0.012, browTilt: 0.26, mouthW: 0.16, mouthOpen: 0.088, mouthCorner: 0.034, stache: 0.022 },
  Focused: { lid: 0.5, browY: -0.012, browTilt: -0.28, mouthW: 0.085, mouthOpen: 0.0, mouthCorner: -0.002 },
  Surprised: { lid: 0.08, iris: 1.12, browY: 0.026, browTilt: 0.06, browArch: 0.01, mouthW: 0.06, mouthOpen: 0.06, mouthCorner: -0.006 },
};

const EYE_X = 0.097;
const EYE_Y = 1.492;
const EYE_R = new THREE.Vector3(0.054, 0.068, 0.03);

function eyeCentre(s: number) {
  return new THREE.Vector3(s * EYE_X, EYE_Y, faceZ(s * EYE_X, EYE_Y) - 0.014);
}

/** Normals straight from the ellipsoid (stay valid where lid vertices bunch up at the edge). */
function ellipsoidNormals(g: Geo, rx: number, ry: number, rz: number) {
  const p = g.getAttribute('position');
  const n = new Float32Array(p.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i) / (rx * rx), p.getY(i) / (ry * ry), p.getZ(i) / (rz * rz)).normalize();
    v.toArray(n, i * 3);
  }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.userData.keepNormals = true;
}

type FaceMat = 'sclera' | 'iris' | 'pupil' | 'shine' | 'lid' | 'hair' | 'mouth' | 'teeth' | 'tongue' | 'lip';

/** All face geometry for one set of parameters, grouped by material (fixed topology). */
function faceGeometry(P: FaceParams): Record<FaceMat, Geo> {
  const out: Record<FaceMat, Geo[]> = { sclera: [], iris: [], pupil: [], shine: [], lid: [], hair: [], mouth: [], teeth: [], tongue: [], lip: [] };
  for (const s of [-1, 1]) {
    const c = eyeCentre(s);
    const ry = EYE_R.y * P.eyeSY;
    out.sclera.push(ellipsoid(c, new THREE.Vector3(EYE_R.x, ry, EYE_R.z * (0.55 + 0.45 * P.eyeSY) - 0.001), 28, 20));
    // Iris, pupil and two catch-lights sit on the front of the eye
    const front = c.z + EYE_R.z * (0.55 + 0.45 * P.eyeSY) + 0.0005;
    const ir = 0.03 * P.iris;
    const irisG = new THREE.CircleGeometry(1, 28);
    irisG.scale(ir, ir * 1.08 * P.eyeSY, 1);
    irisG.translate(c.x + s * -0.004, c.y - 0.006 * P.eyeSY, front);
    out.iris.push(irisG);
    const pupilG = new THREE.CircleGeometry(1, 24);
    pupilG.scale(ir * 0.52, ir * 0.56 * P.eyeSY, 1);
    pupilG.translate(c.x + s * -0.004, c.y - 0.006 * P.eyeSY, front + 0.0008);
    out.pupil.push(pupilG);
    for (const [dx, dy, r] of [
      [0.012, 0.014, 0.0105],
      [-0.01, -0.012, 0.0055],
    ]) {
      const sh = new THREE.CircleGeometry(1, 14);
      sh.scale(r * P.iris, r * P.iris * P.eyeSY, 1);
      sh.translate(c.x + s * -0.004 + dx, c.y - 0.006 * P.eyeSY + dy * P.eyeSY, front + 0.0016);
      out.shine.push(sh);
    }
    // Upper lid: a shell over the front of the eye whose lower edge slides down (fixed vertex count).
    // The edge is arched (∩) so open eyes look bright and closed happy eyes curve upward.
    const rx = EYE_R.x + 0.004;
    const lry = ry + 0.004;
    const rz = (EYE_R.z + 0.006) * (0.55 + 0.45 * P.eyeSY);
    const arch = P.lash + 0.016 * (1 - P.lid);
    const edgeY = (x: number) => lry * (1 - 1.62 * P.lid) + arch * (1 - Math.min(1, (x / rx) ** 2));
    // Lower lid rises to meet the upper edge only when the eye closes
    const close = smooth(P.lid, 0.7, 1);
    const lowY = (x: number) => -lry - 0.01 + (edgeY(x) - 0.0015 + lry + 0.01) * close;
    const lid = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI, 0, Math.PI);
    const lp = lid.getAttribute('position');
    for (let i = 0; i < lp.count; i++) {
      const x = lp.getX(i) * rx;
      let y = lp.getY(i) * lry;
      const e = edgeY(x);
      if (y < e) y = e;
      // Keep the shell on the eye surface at its new height
      const k = 1 - (x / rx) ** 2 - (y / lry) ** 2;
      const z = rz * Math.sqrt(Math.max(0, k));
      lp.setXYZ(i, x, y, Math.max(z, 0.002));
    }
    ellipsoidNormals(lid, rx, lry, rz);
    lid.translate(c.x, c.y, c.z + 0.001);
    out.lid.push(lid);
    const low = new THREE.SphereGeometry(1, 28, 16, 0, Math.PI, 0, Math.PI);
    const wp = low.getAttribute('position');
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i) * rx;
      let y = wp.getY(i) * lry;
      const e = lowY(x);
      if (y > e) y = e;
      const k = 1 - (x / rx) ** 2 - (y / lry) ** 2;
      wp.setXYZ(i, x, y, Math.max(rz * Math.sqrt(Math.max(0, k)), 0.002));
    }
    ellipsoidNormals(low, rx, lry, rz);
    low.translate(c.x, c.y, c.z + 0.0008);
    out.lid.push(low);
    // Lash line along the lid edge
    const lash: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const x = (-1 + (k / 10) * 2) * rx * 0.98;
      const y = Math.max(edgeY(x), -lry);
      const kk = 1 - (x / rx) ** 2 - (y / lry) ** 2;
      lash.push(new THREE.Vector3(c.x + x, c.y + y, c.z + rz * Math.sqrt(Math.max(0.02, kk)) + 0.003));
    }
    out.hair.push(taperTube(lash, capped(0.0075, 0.0075, 0.18), 30, 6));
    // Thick eyebrow
    const bz = (x: number, y: number) => faceZ(x, y, 0.012);
    const inner = [s * 0.04, 1.585 + P.browY + P.browTilt * 0.03];
    const mid = [s * 0.097, 1.6 + P.browY + P.browArch];
    const outer = [s * 0.15, 1.578 + P.browY - P.browTilt * 0.012];
    out.hair.push(
      taperTube(
        [inner, mid, outer].map(([x, y]) => new THREE.Vector3(x, y, bz(x, y))),
        capped(0.026, 0.018, 0.3),
        24,
        12,
        0.55,
        new THREE.Vector3(0, 0, 1)
      )
    );
  }
  // Big, bushy handlebar moustache that curls up at the tips
  for (const s of [-1, 1]) {
    const lift = P.stache;
    const pts = [
      [0.004, 1.39],
      [0.045, 1.378 + lift * 0.3],
      [0.095, 1.366 + lift * 0.6],
      [0.14, 1.372 + lift],
      [0.168, 1.392 + lift],
      [0.174, 1.414 + lift],
      [0.162, 1.426 + lift],
    ].map(([x, y]) => new THREE.Vector3(s * x, y, Math.max(faceZ(s * x, y, 0.016), cheekZ(s * x, y) + 0.016)));
    out.hair.push(
      taperTube(
        pts,
        (t) => {
          const swell = 0.6 + 0.4 * Math.sin(Math.min(1, t * 3) * Math.PI * 0.5);
          const body = 0.052 * swell * (1 - t * 0.7);
          return Math.max(0.013, body) * Math.min(1, (1 - t) / 0.04 + 0.35);
        },
        56,
        16,
        0.5,
        new THREE.Vector3(0, 0, 1)
      )
    );
  }
  // Mouth: cavity between an upper curve (corners lifted) and a lower curve (opening)
  const N = 24;
  const M = 8;
  const top = 1.344;
  const mx = (u: number) => u * P.mouthW * 0.5;
  const yTop = (u: number) => top + P.mouthCorner * u * u;
  const yBot = (u: number) => top + P.mouthCorner * u * u * 1.15 - P.mouthOpen * (1 - u * u) * (1 - 0.15 * u * u);
  const patch = (yA: (u: number) => number, yB: (u: number) => number, wScale: number, lift: number) => {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * 2 - 1;
      for (let j = 0; j <= M; j++) {
        const t = j / M;
        const x = mx(u) * wScale;
        const y = yA(u * wScale) + (yB(u * wScale) - yA(u * wScale)) * t;
        pos.push(x, y, faceZ(x, y, lift));
      }
    }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < M; j++) {
        const a = i * (M + 1) + j;
        const b = a + M + 1;
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    return g;
  };
  out.mouth.push(patch(yTop, yBot, 1, 0.006));
  const teethH = (u: number) => Math.min(P.mouthOpen * 0.32, 0.016) * (1 - u * u * 0.6);
  out.teeth.push(patch((u) => yTop(u) - 0.002, (u) => yTop(u) - 0.002 - teethH(u), 0.82, 0.0075));
  out.tongue.push(patch((u) => yBot(u) + P.mouthOpen * 0.42 * (1 - u * u), (u) => yBot(u) + 0.002, 0.62, 0.0075));
  // Lip line along the top (stays visible when the mouth closes)
  const lip: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) {
    const u = (k / 12) * 2 - 1;
    const x = mx(u) * 1.04;
    lip.push(new THREE.Vector3(x, yTop(u) + 0.001, faceZ(x, yTop(u), 0.008)));
  }
  out.lip.push(taperTube(lip, capped(0.0042, 0.0042, 0.12), 32, 8));
  const res = {} as Record<FaceMat, Geo>;
  for (const k of Object.keys(out) as FaceMat[]) {
    const geos = out[k].map((g) => {
      const gg = g.index ? g : mergeVertices(g);
      if (!gg.userData.keepNormals) gg.computeVertexNormals();
      for (const a of Object.keys(gg.attributes)) if (a !== 'position' && a !== 'normal') gg.deleteAttribute(a);
      return gg;
    });
    res[k] = mergeGeometries(geos)!;
  }
  return res;
}

function buildFaceMeshes(mats: Record<string, THREE.Material>, skeleton: THREE.Skeleton): THREE.SkinnedMesh[] {
  const base = faceGeometry(FACE_BASE);
  const targets = Object.entries(FACE_TARGETS).map(([name, t]) => [name, faceGeometry({ ...FACE_BASE, ...t })] as const);
  const meshes: THREE.SkinnedMesh[] = [];
  for (const key of Object.keys(base) as FaceMat[]) {
    const g = base[key];
    const n = g.getAttribute('position').count;
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    rigid(g, 'Head');
    g.morphAttributes.position = targets.map(([name, tg]) => {
      const tp = tg[key].getAttribute('position');
      const bp = g.getAttribute('position');
      // Deltas (glTF morph targets are relative)
      const d = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) d[i] = (tp.array as Float32Array)[i] - (bp.array as Float32Array)[i];
      const attr = new THREE.Float32BufferAttribute(d, 3);
      attr.name = name;
      return attr;
    });
    // Normal deltas only where shapes change a lot (the eyelids); elsewhere base normals are close enough
    if (key === 'lid') g.morphAttributes.normal = targets.map(([name, tg]) => {
      const tn = tg[key].getAttribute('normal');
      const bn = g.getAttribute('normal');
      const d = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) d[i] = (tn.array as Float32Array)[i] - (bn.array as Float32Array)[i];
      const attr = new THREE.Float32BufferAttribute(d, 3);
      attr.name = name;
      return attr;
    });
    g.morphTargetsRelative = true;
    const mesh = new THREE.SkinnedMesh(g, mats[key]);
    mesh.name = `Face_${key}`;
    mesh.morphTargetDictionary = Object.fromEntries(targets.map(([name], i) => [name, i]));
    mesh.morphTargetInfluences = targets.map(() => 0);
    mesh.bind(skeleton);
    meshes.push(mesh);
  }
  return meshes;
}

// ---------------------------------------------------------------------------
// Body and outfit
// ---------------------------------------------------------------------------
function jacketSurfaceZ(y: number) {
  // Front of the jacket lathe at height y (matches the torso profile below)
  const prof = TORSO;
  for (let i = 0; i < prof.length - 1; i++) {
    const [r0, y0] = prof[i];
    const [r1, y1] = prof[i + 1];
    if (y >= y0 && y <= y1) return (r0 + ((y - y0) / (y1 - y0)) * (r1 - r0)) * TORSO_Z;
  }
  return 0.2;
}

const TORSO: [number, number][] = [
  [0.0, 0.545],
  [0.205, 0.545],
  [0.24, 0.58],
  [0.28, 0.68],
  [0.305, 0.8],
  [0.3, 0.9],
  [0.275, 1.0],
  [0.24, 1.07],
  [0.185, 1.13],
  [0.12, 1.165],
  [0.0, 1.17],
];
const TORSO_Z = 0.86;

function buildJacket(): Geo {
  const parts: Geo[] = [];
  const torso = lathe(TORSO, 64, TORSO_Z);
  // Soft cloth folds: gentle wrinkles at the waist and under the arms
  displace(torso, (p, n) => {
    if (Math.abs(n.y) > 0.8) return 0;
    const ang = Math.atan2(p.x, p.z);
    const waist = Math.exp(-(((p.y - 0.7) / 0.08) ** 2)) * Math.sin(ang * 9 + p.y * 30) * 0.004;
    const side = Math.exp(-(((Math.abs(ang) - 1.5) / 0.35) ** 2)) * Math.sin(p.y * 70) * 0.003;
    return waist + side + (hash(p.x, p.y, p.z) - 0.5) * 0.0008;
  });
  parts.push(torsoWeights(prep(torso, C.jacket)));
  // Stand collar
  const collar = new THREE.TorusGeometry(0.112, 0.034, 14, 40);
  collar.rotateX(Math.PI / 2);
  collar.scale(1, 1, 0.92);
  collar.translate(0, 1.163, 0.004);
  parts.push(rigid(prep(collar, C.jacket), 'Chest'));
  // Double-breasted flap edge running down the front
  const flapPts: THREE.Vector3[] = [];
  for (let k = 0; k <= 10; k++) {
    const y = 1.11 - k * 0.05;
    flapPts.push(new THREE.Vector3(0.045 - (k / 10) * 0.01, y, jacketSurfaceZ(y) + 0.002));
  }
  parts.push(torsoWeights(prep(taperTube(flapPts, capped(0.008, 0.007, 0.05), 40, 8, 0.6), C.jacket)));
  // Sleeves (with an elbow fold) and turned-back cuffs
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1;
    const sh = J[`${side}_UpperArm`];
    const el = J[`${side}_LowerArm`];
    const wr = J[`${side}_Hand`];
    const sleeve = taperTube(
      [sh.clone().add(new THREE.Vector3(-s * 0.02, 0.02, 0)), sh.clone().lerp(el, 0.5), el, el.clone().lerp(wr, 0.5), wr.clone().add(new THREE.Vector3(0, 0.02, 0))],
      (t) => 0.088 - t * 0.026 + Math.exp(-(((t - 0.5) / 0.06) ** 2)) * 0.004,
      48,
      18
    );
    displace(sleeve, (p) => Math.sin(p.y * 90) * 0.0018 * Math.exp(-(((p.y - el.y) / 0.06) ** 2)));
    parts.push(chainWeights(prep(sleeve, C.jacket), [sh, el, wr], [`${side}_UpperArm`, `${side}_LowerArm`, `${side}_Hand`], 0.05));
    const shoulder = ellipsoid(sh.clone().add(new THREE.Vector3(-s * 0.03, -0.005, 0)), new THREE.Vector3(0.085, 0.08, 0.085), 24, 16);
    parts.push(torsoWeights(prep(shoulder, C.jacket)));
    const cuff = new THREE.TorusGeometry(0.064, 0.02, 12, 28);
    const dir = wr.clone().sub(el).normalize();
    cuff.lookAt(dir);
    cuff.translate(wr.x, wr.y + 0.012, wr.z);
    parts.push(rigid(prep(cuff, C.jacket), `${side}_LowerArm`));
  }
  return mergeGeometries(parts)!;
}

function buildButtons(): Geo {
  const parts: Geo[] = [];
  for (const y of [1.04, 0.92, 0.8]) {
    for (const x of [-0.075, 0.075]) {
      const z = jacketSurfaceZ(y) * Math.cos(Math.asin(Math.min(0.9, x / 0.28))) + 0.004;
      const b = ellipsoid(new THREE.Vector3(x, y, z), new THREE.Vector3(0.024, 0.024, 0.012), 16, 10);
      parts.push(torsoWeights(prep(b, C.gold)));
    }
  }
  return mergeGeometries(parts)!;
}

function buildKerchief(): Geo {
  const parts: Geo[] = [];
  const ring = new THREE.TorusGeometry(0.12, 0.028, 12, 40);
  ring.rotateX(Math.PI / 2 + 0.18);
  ring.translate(0, 1.162, 0.012);
  parts.push(prep(ring, C.kerchief));
  // Knot
  parts.push(prep(ellipsoid(new THREE.Vector3(0, 1.128, 0.19), new THREE.Vector3(0.05, 0.042, 0.035), 20, 14), C.kerchief));
  // Two floppy tails with soft bevelled edges
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.03, 0);
    shape.quadraticCurveTo(-0.045, -0.07, -0.012, -0.135);
    shape.lineTo(0.022, -0.118);
    shape.quadraticCurveTo(0.04, -0.06, 0.03, 0);
    shape.lineTo(-0.03, 0);
    const tail = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.006, bevelSegments: 3, curveSegments: 10 });
    tail.rotateZ(s * 0.42);
    tail.rotateX(-0.32);
    tail.translate(s * 0.022, 1.115, 0.19);
    parts.push(prep(tail, C.kerchief));
    // Bow loops beside the knot
    const loop = ellipsoid(new THREE.Vector3(s * 0.06, 1.138, 0.175), new THREE.Vector3(0.045, 0.026, 0.02), 16, 10);
    parts.push(prep(loop, C.kerchief));
  }
  return mergeGeometries(parts.map((g) => rigid(g, 'Chest')))!;
}

function buildHands(): Geo {
  const parts: Geo[] = [];
  for (const side of ['L', 'R'] as const) {
    const s = side === 'L' ? 1 : -1;
    const wr = J[`${side}_Hand`];
    const palmC = wr.clone().add(new THREE.Vector3(s * 0.004, -0.065, 0.008));
    const hand: Geo[] = [];
    hand.push(prep(ellipsoid(palmC, new THREE.Vector3(0.05, 0.058, 0.038), 22, 16), C.skin));
    // Four plump fingers curled slightly forward
    for (let f = 0; f < 4; f++) {
      const fz = 0.022 - f * 0.015;
      const base = palmC.clone().add(new THREE.Vector3(s * 0.006, -0.04, fz));
      hand.push(
        prep(
          taperTube([base, base.clone().add(new THREE.Vector3(s * 0.006, -0.028, 0.006)), base.clone().add(new THREE.Vector3(s * 0.0, -0.046, 0.02))], capped(0.018, 0.016, 0.35), 12, 10),
          C.skin
        )
      );
    }
    const tb = palmC.clone().add(new THREE.Vector3(-s * 0.032, -0.005, 0.02));
    hand.push(prep(taperTube([tb, tb.clone().add(new THREE.Vector3(-s * 0.012, -0.025, 0.018)), tb.clone().add(new THREE.Vector3(-s * 0.006, -0.045, 0.026))], capped(0.016, 0.012, 0.3), 12, 8), C.skin));
    parts.push(...hand.map((g) => rigid(g, `${side}_Hand`)));
    // Wrist
    parts.push(chainWeights(prep(taperTube([J[`${side}_LowerArm`].clone().lerp(wr, 0.7), wr.clone().add(new THREE.Vector3(0, -0.03, 0.004))], capped(0.045, 0.042, 0.02), 8, 12), C.skin), [J[`${side}_LowerArm`], wr], [`${side}_LowerArm`, `${side}_Hand`], 0.03));
  }
  return mergeGeometries(parts)!;
}

function buildTrousers(): Geo {
  const parts: Geo[] = [];
  const pelvis = lathe(
    [
      [0.0, 0.42],
      [0.15, 0.42],
      [0.2, 0.47],
      [0.215, 0.56],
      [0.2, 0.6],
      [0.0, 0.6],
    ],
    48,
    0.85
  );
  parts.push(rigid(prep(pelvis, C.trousers), 'Hips'));
  for (const side of ['L', 'R'] as const) {
    const hip = J[`${side}_UpperLeg`];
    const knee = J[`${side}_LowerLeg`];
    const ankle = J[`${side}_Foot`];
    const leg = taperTube([hip.clone().add(new THREE.Vector3(0, 0.03, 0)), hip.clone().lerp(knee, 0.5), knee, knee.clone().lerp(ankle, 0.5), ankle.clone().add(new THREE.Vector3(0, -0.01, 0))], (t) => 0.108 - t * 0.022, 40, 16);
    displace(leg, (p) => Math.sin(p.y * 80 + p.x * 20) * 0.0015 * Math.exp(-(((p.y - 0.13) / 0.05) ** 2)));
    parts.push(chainWeights(prep(leg, C.trousers), [hip, knee, ankle], [`${side}_UpperLeg`, `${side}_LowerLeg`, `${side}_Foot`], 0.05));
  }
  return mergeGeometries(parts)!;
}

function buildShoes(): { upper: Geo; sole: Geo } {
  const up: Geo[] = [];
  const so: Geo[] = [];
  for (const side of ['L', 'R'] as const) {
    const a = J[`${side}_Foot`];
    up.push(rigid(prep(ellipsoid(new THREE.Vector3(a.x, 0.064, 0.045), new THREE.Vector3(0.08, 0.062, 0.135), 26, 18), C.shoe), `${side}_Foot`));
    up.push(rigid(prep(ellipsoid(new THREE.Vector3(a.x, 0.09, -0.02), new THREE.Vector3(0.062, 0.05, 0.07), 20, 14), C.shoe), `${side}_Foot`));
    const sole = ellipsoid(new THREE.Vector3(a.x, 0.018, 0.04), new THREE.Vector3(0.078, 0.02, 0.132), 26, 10);
    so.push(rigid(prep(sole, C.sole), `${side}_Foot`));
  }
  return { upper: mergeGeometries(up)!, sole: mergeGeometries(so)! };
}

// ---------------------------------------------------------------------------
// Textures and materials
// ---------------------------------------------------------------------------
function fabricTexture(base: string, line: string, scale = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 256, 256);
  x.globalAlpha = 0.07;
  x.strokeStyle = line;
  for (let i = -256; i < 256; i += 4) {
    x.beginPath();
    x.moveTo(i, 0);
    x.lineTo(i + 256, 256);
    x.stroke();
  }
  x.globalAlpha = 0.05;
  for (let i = 0; i < 2500; i++) {
    x.fillStyle = Math.random() > 0.5 ? '#ffffff' : line;
    x.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6 * scale, 6 * scale);
  t.colorSpace = THREE.SRGBColorSpace;
  t.name = `fabric_${base}`;
  return t;
}

function makeMaterials() {
  const std = (name: string, p: THREE.MeshStandardMaterialParameters) => {
    // Body parts carry their colour in vertex colours (material stays white); face parts use the material colour
    const face = ['EyeWhite', 'Iris', 'Pupil', 'EyeShine', 'Eyelid', 'FaceHair', 'Mouth', 'Teeth', 'Tongue', 'LipLine'].includes(name);
    const m = new THREE.MeshStandardMaterial({ vertexColors: !face, ...p });
    if (!face) m.color.set('#ffffff');
    m.name = name;
    return m;
  };
  return {
    skin: std('Skin', { color: C.skin, roughness: 0.55 }),
    hair: std('Hair', { color: C.hair, roughness: 0.85 }),
    toque: std('Toque', { color: '#ffffff', roughness: 0.85, map: fabricTexture(C.toque, '#c9c2b4', 0.8) }),
    jacket: std('Jacket', { color: '#ffffff', roughness: 0.78, map: fabricTexture(C.jacket, '#b9ae9c') }),
    gold: std('Buttons', { color: C.gold, roughness: 0.3, metalness: 0.7 }),
    kerchief: std('Neckerchief', { color: '#ffffff', roughness: 0.6, map: fabricTexture(C.kerchief, '#7a1a0c', 1.5) }),
    trousers: std('Trousers', { color: '#ffffff', roughness: 0.82, map: fabricTexture(C.trousers, '#15110f') }),
    shoe: std('Shoes', { color: C.shoe, roughness: 0.38 }),
    sole: std('Soles', { color: C.sole, roughness: 0.6 }),
    sclera: std('EyeWhite', { color: C.sclera, roughness: 0.2 }),
    iris: std('Iris', { color: C.iris, roughness: 0.15 }),
    pupil: std('Pupil', { color: C.pupil, roughness: 0.1 }),
    shine: std('EyeShine', { color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.1 }),
    lid: std('Eyelid', { color: '#cf7a50', roughness: 0.65 }),
    faceHair: std('FaceHair', { color: '#3e2214', roughness: 0.9 }),
    mouth: std('Mouth', { color: C.mouth, roughness: 0.5 }),
    teeth: std('Teeth', { color: C.teeth, roughness: 0.3 }),
    tongue: std('Tongue', { color: C.tongue, roughness: 0.45 }),
    lip: std('LipLine', { color: C.lip, roughness: 0.5 }),
  };
}

// ---------------------------------------------------------------------------
// Animation clips (sampled at 30 fps from procedural motion)
// ---------------------------------------------------------------------------
type Pose = Partial<Record<BoneName, [number, number, number]>> & { hipsY?: number };

function clipFrom(name: string, duration: number, pose: (t: number) => Pose, restHipsY: number, fps = 30): THREE.AnimationClip {
  const frames = Math.round(duration * fps);
  const times: number[] = [];
  const quats: Partial<Record<BoneName, number[]>> = {};
  const hipsPos: number[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const used = new Set<BoneName>();
  const samples: Pose[] = [];
  for (let f = 0; f <= frames; f++) {
    const t = (f / frames) * duration;
    times.push(t);
    const p = pose(t);
    samples.push(p);
    for (const k of Object.keys(p)) if (k !== 'hipsY') used.add(k as BoneName);
  }
  for (const b of used) quats[b] = [];
  samples.forEach((p) => {
    for (const b of used) {
      const r = p[b] ?? [0, 0, 0];
      e.set(r[0], r[1], r[2], 'YXZ');
      q.setFromEuler(e);
      quats[b]!.push(q.x, q.y, q.z, q.w);
    }
    hipsPos.push(J.Hips.x, restHipsY + (p.hipsY ?? 0), J.Hips.z);
  });
  const tracks: THREE.KeyframeTrack[] = [...used].map((b) => new THREE.QuaternionKeyframeTrack(`${b}.quaternion`, times, quats[b]!));
  tracks.push(new THREE.VectorKeyframeTrack('Hips.position', times, hipsPos));
  return new THREE.AnimationClip(name, duration, tracks);
}

const TAU = Math.PI * 2;

/** Legs and body for a walk or run cycle (phase in radians). */
function gait(ph: number, amp: number, run = false): Pose {
  const hip = (p: number) => Math.sin(p) * (run ? 0.75 : 0.5) * amp;
  const knee = (p: number) => amp * ((run ? 0.25 : 0.1) + (run ? 1.4 : 0.95) * Math.max(0, -Math.cos(p)));
  const L = ph;
  const R = ph + Math.PI;
  const lean = run ? 0.16 : 0.05;
  return {
    hipsY: Math.abs(Math.cos(ph)) * (run ? 0.055 : 0.03) - (run ? 0.03 : 0.01),
    Hips: [0, Math.sin(ph) * 0.09 * amp, Math.sin(ph) * 0.03 * amp],
    Spine: [lean, -Math.sin(ph) * 0.07 * amp, 0],
    Chest: [0.02, -Math.sin(ph) * 0.07 * amp, -Math.sin(ph) * 0.02 * amp],
    Neck: [-lean * 0.6, 0, 0],
    Head: [-Math.abs(Math.cos(ph)) * 0.03, Math.sin(ph) * 0.04 * amp, 0],
    L_UpperLeg: [hip(L), 0, 0],
    R_UpperLeg: [hip(R), 0, 0],
    L_LowerLeg: [knee(L), 0, 0],
    R_LowerLeg: [knee(R), 0, 0],
    L_Foot: [-knee(L) * 0.35 + Math.max(0, Math.sin(L)) * 0.25 * amp, 0, 0],
    R_Foot: [-knee(R) * 0.35 + Math.max(0, Math.sin(R)) * 0.25 * amp, 0, 0],
  };
}

function swingArms(ph: number, amp: number, run = false): Pose {
  const a = run ? 0.8 : 0.5;
  return {
    L_UpperArm: [-Math.sin(ph) * a * amp, 0, -0.06],
    R_UpperArm: [Math.sin(ph) * a * amp, 0, 0.06],
    L_LowerArm: [-(run ? 1.2 : 0.22) - Math.max(0, -Math.sin(ph)) * 0.35 * amp, 0, 0],
    R_LowerArm: [-(run ? 1.2 : 0.22) - Math.max(0, Math.sin(ph)) * 0.35 * amp, 0, 0],
  };
}

/** Both forearms up holding a tray at chest height. */
const CARRY_ARMS: Pose = {
  L_UpperArm: [-0.55, 0, -0.18],
  R_UpperArm: [-0.55, 0, 0.18],
  L_LowerArm: [-1.25, 0.2, 0],
  R_LowerArm: [-1.25, -0.2, 0],
  L_Hand: [0.25, 0, 0],
  R_Hand: [0.25, 0, 0],
};

function buildClips(): THREE.AnimationClip[] {
  const hy = J.Hips.y;
  const clips: THREE.AnimationClip[] = [];
  clips.push(
    clipFrom('Idle', 3, (t) => {
      const b = Math.sin((t / 3) * TAU);
      const look = Math.sin((t / 3) * TAU) * 0.5 + Math.sin((t / 1.5) * TAU) * 0.15;
      return {
        hipsY: b * 0.004,
        Spine: [0.01 + b * 0.012, 0, 0],
        Chest: [b * 0.015, 0, 0],
        Head: [0.02 - b * 0.02, look * 0.18, 0],
        L_UpperArm: [0.02, 0, -0.05 - b * 0.02],
        R_UpperArm: [0.02, 0, 0.05 + b * 0.02],
        L_LowerArm: [-0.15, 0, 0],
        R_LowerArm: [-0.15, 0, 0],
      };
    }, hy)
  );
  clips.push(clipFrom('Walk', 0.9, (t) => ({ ...gait((t / 0.9) * TAU, 1), ...swingArms((t / 0.9) * TAU, 1) }), hy));
  clips.push(clipFrom('Run', 0.6, (t) => ({ ...gait((t / 0.6) * TAU, 1, true), ...swingArms((t / 0.6) * TAU, 1, true) }), hy));
  clips.push(
    clipFrom('Cook', 1.6, (t) => {
      // Left hand steadies the pan, right hand stirs, and a quick flip every cycle
      const p = (t / 1.6) * TAU;
      const stir = (t / 0.8) * TAU;
      const flip = Math.max(0, Math.sin(p * 1)) ** 6;
      return {
        hipsY: -0.01 + Math.sin(stir) * 0.003,
        Spine: [0.08, 0.06, 0],
        Chest: [0.04, Math.sin(stir) * 0.04, 0],
        Head: [0.22, -0.05, 0],
        L_UpperArm: [-0.75 - flip * 0.25, 0, -0.12],
        L_LowerArm: [-0.85 - flip * 0.35, 0.25, 0],
        L_Hand: [flip * -0.5, 0, 0],
        R_UpperArm: [-0.8 + Math.sin(stir) * 0.14, 0, 0.12 + Math.cos(stir) * 0.12],
        R_LowerArm: [-0.75 + Math.cos(stir) * 0.1, -0.2, 0],
        R_Hand: [0.2, 0, 0],
      };
    }, hy)
  );
  clips.push(clipFrom('CarryIdle', 3, (t) => ({ ...CARRY_ARMS, hipsY: Math.sin((t / 3) * TAU) * 0.004, Head: [0.05, Math.sin((t / 3) * TAU) * 0.08, 0] }), hy));
  clips.push(clipFrom('CarryWalk', 0.9, (t) => ({ ...gait((t / 0.9) * TAU, 0.9), ...CARRY_ARMS }), hy));
  clips.push(
    clipFrom('Serve', 1.4, (t) => {
      // Lean in, set the plate down with both hands, straighten with a proud little nod
      const k = t / 1.4;
      const reach = Math.sin(Math.min(1, k / 0.55) * Math.PI * 0.5) * (k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3));
      const nod = Math.max(0, Math.sin(((k - 0.7) / 0.3) * Math.PI)) * (k > 0.7 ? 1 : 0);
      const lerp = (a: number, b: number) => a + (b - a) * reach;
      return {
        hipsY: -0.02 * reach,
        Spine: [lerp(0.02, 0.22), 0, 0],
        Chest: [lerp(0, 0.08), 0, 0],
        Head: [lerp(0.05, 0.15) + nod * 0.15, 0, 0],
        L_UpperArm: [lerp(-0.55, -1.0), 0, lerp(-0.18, -0.1)],
        R_UpperArm: [lerp(-0.55, -1.0), 0, lerp(0.18, 0.1)],
        L_LowerArm: [lerp(-1.25, -0.45), 0.15, 0],
        R_LowerArm: [lerp(-1.25, -0.45), -0.15, 0],
        L_Hand: [lerp(0.25, 0.1), 0, 0],
        R_Hand: [lerp(0.25, 0.1), 0, 0],
      };
    }, hy)
  );
  return clips;
}

function faceClips(faceMeshes: THREE.SkinnedMesh[]): THREE.AnimationClip[] {
  const clip = (name: string, dur: number, target: string, curve: (k: number) => number) => {
    const times: number[] = [];
    for (let f = 0; f <= 12; f++) times.push((f / 12) * dur);
    const tracks = faceMeshes.map((m) => {
      const idx = m.morphTargetDictionary![target];
      const n = Object.keys(m.morphTargetDictionary!).length;
      const values: number[] = [];
      times.forEach((t) => {
        for (let i = 0; i < n; i++) values.push(i === idx ? curve(t / dur) : 0);
      });
      return new THREE.NumberKeyframeTrack(`${m.name}.morphTargetInfluences`, times, values);
    });
    return new THREE.AnimationClip(name, dur, tracks);
  };
  return [
    clip('Face_Blink', 0.22, 'Blink', (k) => Math.sin(k * Math.PI)),
    clip('Face_Smile', 1.0, 'Smile', () => 1),
    clip('Face_Laugh', 1.0, 'Laugh', () => 1),
    clip('Face_Focused', 1.0, 'Focused', () => 1),
    clip('Face_Surprised', 1.0, 'Surprised', () => 1),
  ];
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
export function buildChef(): { scene: THREE.Group; clips: THREE.AnimationClip[]; stats: Record<string, number> } {
  const { bones, root } = buildSkeleton();
  const scene = new THREE.Group();
  scene.name = 'MascotChef';
  const armature = new THREE.Group();
  armature.name = 'Armature';
  armature.add(root);
  scene.add(armature);
  scene.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const mats = makeMaterials();
  const body: [string, Geo, THREE.Material][] = [
    ['Body_Skin', buildHeadSkin(), mats.skin],
    ['Body_Hands', buildHands(), Object.assign(mats.skin.clone(), { name: 'Hands' })],
    ['Body_Hair', buildHair(), mats.hair],
    ['Body_Toque', buildToque(), mats.toque],
    ['Body_Jacket', buildJacket(), mats.jacket],
    ['Body_Buttons', buildButtons(), mats.gold],
    ['Body_Neckerchief', buildKerchief(), mats.kerchief],
    ['Body_Trousers', buildTrousers(), mats.trousers],
  ];
  const shoes = buildShoes();
  body.push(['Body_Shoes', shoes.upper, mats.shoe], ['Body_Soles', shoes.sole, mats.sole]);
  let tris = 0;
  for (const [name, g, m] of body) {
    // Single-colour parts: move the colour into the material and drop the per-vertex colours (smaller file)
    if (name !== 'Body_Skin') {
      const col = g.getAttribute('color');
      const mat = m as THREE.MeshStandardMaterial;
      mat.color.setRGB(col.getX(0), col.getY(0), col.getZ(0), THREE.LinearSRGBColorSpace);
      mat.vertexColors = false;
      g.deleteAttribute('color');
    }
    const mesh = new THREE.SkinnedMesh(g, m);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.bind(skeleton);
    scene.add(mesh);
    tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  }
  const faceMats: Record<string, THREE.Material> = {
    sclera: mats.sclera,
    iris: mats.iris,
    pupil: mats.pupil,
    shine: mats.shine,
    lid: mats.lid,
    hair: mats.faceHair,
    mouth: mats.mouth,
    teeth: mats.teeth,
    tongue: mats.tongue,
    lip: mats.lip,
  };
  const face = buildFaceMeshes(faceMats, skeleton);
  for (const m of face) {
    scene.add(m);
    tris += m.geometry.index!.count / 3;
  }
  const clips = [...buildClips(), ...faceClips(face)];
  return { scene, clips, stats: { triangles: Math.round(tris), bones: bones.length, meshes: body.length + face.length, clips: clips.length } };
}
