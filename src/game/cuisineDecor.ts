// Country-specific exterior dressing for the restaurant entrance: name sign, bunting and props.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CUISINES } from './cuisines';
import { CuisineId } from './types';

const FLAG_COLORS: Record<CuisineId, string[]> = {
  bistro: ['#ef4444', '#ffffff', '#f59e0b'],
  italian: ['#16a34a', '#ffffff', '#dc2626'],
  japanese: ['#ffffff', '#dc2626', '#f9a8d4'],
  mexican: ['#ec4899', '#22c55e', '#f97316', '#facc15', '#3b82f6', '#a855f7'],
  azerbaijani: ['#0ea5e9', '#dc2626', '#16a34a'],
};

const SIGN_STYLE: Record<CuisineId, { bg: string; border: string; text: string; font: string }> = {
  bistro: { bg: '#3b2314', border: '#f59e0b', text: '#fff7ed', font: 'bold 64px Georgia, serif' },
  italian: { bg: '#1f3d1c', border: '#e7c27a', text: '#fff7e6', font: 'italic bold 64px Georgia, serif' },
  japanese: { bg: '#1c1917', border: '#dc2626', text: '#fef2f2', font: 'bold 60px "Trebuchet MS", sans-serif' },
  mexican: { bg: '#1e3a8a', border: '#f97316', text: '#fde047', font: 'bold 62px "Trebuchet MS", sans-serif' },
  azerbaijani: { bg: '#5b1a10', border: '#eab308', text: '#fef3c7', font: 'bold 60px Georgia, serif' },
};

function nameSignTexture(cuisine: CuisineId): THREE.CanvasTexture {
  const def = CUISINES[cuisine];
  const style = SIGN_STYLE[cuisine];
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, 1024, 192);
  ctx.strokeStyle = style.border;
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 1004, 172);
  // Flag-colour stripe along the bottom edge
  const colors = FLAG_COLORS[cuisine];
  const sw = 1004 / colors.length;
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(10 + i * sw, 162, sw, 14);
  });
  ctx.fillStyle = style.text;
  ctx.font = style.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 64;
  while (ctx.measureText(def.name).width > 900 && size > 36) {
    size -= 4;
    ctx.font = style.font.replace(/\d+px/, `${size}px`);
  }
  ctx.fillText(def.name, 512, 88);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Collects pennant strings so all flags draw as one instanced mesh and all cords as one line set. */
class BuntingBatch {
  private flags: { m: THREE.Matrix4; color: string }[] = [];
  private cord: number[] = [];

  add(a: THREE.Vector3, b: THREE.Vector3, colors: string[], count: number, flagH = 0.26) {
    const sag = 0.28;
    const at = (t: number) => {
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(Math.PI * t) * sag;
      return p;
    };
    for (let i = 0; i < 16; i++) {
      const p0 = at(i / 16);
      const p1 = at((i + 1) / 16);
      this.cord.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    }
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-dir.z, dir.x));
    for (let i = 0; i < count; i++) {
      const m = new THREE.Matrix4().compose(at((i + 0.5) / count), q, new THREE.Vector3(1, flagH / 0.26, 1));
      this.flags.push({ m, color: colors[i % colors.length] });
    }
  }

  build(): THREE.Object3D[] {
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.26, 0], 3));
    tri.computeVertexNormals();
    const inst = new THREE.InstancedMesh(
      tri,
      new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide, roughness: 0.7 }),
      this.flags.length
    );
    const col = new THREE.Color();
    this.flags.forEach((f, i) => {
      inst.setMatrixAt(i, f.m);
      inst.setColorAt(i, col.set(f.color));
    });
    const cordGeo = new THREE.BufferGeometry();
    cordGeo.setAttribute('position', new THREE.Float32BufferAttribute(this.cord, 3));
    return [inst, new THREE.LineSegments(cordGeo, new THREE.LineBasicMaterial({ color: '#3f3f46' }))];
  }
}

/** Hanging paper / brass lantern that glows at night. */
function hangingLantern(kind: 'paper' | 'brass', color: string): { group: THREE.Group; glow: THREE.MeshStandardMaterial } {
  const g = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.6 });
  const capMat = new THREE.MeshStandardMaterial({ color: kind === 'paper' ? '#1c1917' : '#b45309', metalness: kind === 'brass' ? 0.7 : 0, roughness: 0.4 });
  if (kind === 'paper') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), glow);
    body.scale.set(1, 1.25, 1);
    g.add(body);
    for (const y of [0.25, -0.25]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12), capMat);
      cap.position.y = y;
      g.add(cap);
    }
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.34, 6), glow);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 6), capMat);
    top.position.y = 0.25;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.06, 6), capMat);
    base.position.y = -0.2;
    g.add(body, top, base);
  }
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.4, 4), capMat);
  cord.position.y = 0.48;
  g.add(cord);
  return { group: g, glow };
}

/** Hanging flower basket, merged into one vertex-coloured mesh (a single draw call). */
function flowerBasket(flowerColors: string[]): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const paint = (geo: THREE.BufferGeometry, color: string) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.deleteAttribute('uv');
    parts.push(g);
  };
  paint(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#7c4a21');
  paint(new THREE.SphereGeometry(0.19, 10, 8).scale(1, 0.6, 1).translate(0, 0.02, 0), '#3f7d2c');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    paint(new THREE.SphereGeometry(0.05, 6, 5).translate(Math.cos(a) * 0.15, 0.08 + (i % 2) * 0.04, Math.sin(a) * 0.15), flowerColors[i % flowerColors.length]);
  }
  paint(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 4).translate(0, 0.3, 0), '#27272a');
  const merged = mergeGeometries(parts)!;
  return new THREE.Mesh(merged, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }));
}

function carpetTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#9f1d1d';
  ctx.fillRect(0, 0, 128, 192);
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 12;
  ctx.strokeRect(8, 8, 112, 176);
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 92, 156);
  // Central medallions (buta / diamond motifs)
  for (const y of [56, 96, 136]) {
    ctx.fillStyle = y === 96 ? '#1e3a5f' : '#eab308';
    ctx.beginPath();
    ctx.moveTo(64, y - 18);
    ctx.lineTo(84, y);
    ctx.lineTo(64, y + 18);
    ctx.lineTo(44, y);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface CuisineDecorResult {
  group: THREE.Group;
  /** Lantern materials that should glow at night. */
  glowMats: THREE.MeshStandardMaterial[];
}

/**
 * Dresses the restaurant entrance for its country. `frontX` is the facade line
 * (the archway sits there); terraces span z = ±3.7..6.9 out to frontX + 5.2.
 */
export function createCuisineDecor(cuisine: CuisineId, frontX: number): CuisineDecorResult {
  const group = new THREE.Group();
  const glowMats: THREE.MeshStandardMaterial[] = [];
  const colors = FLAG_COLORS[cuisine];

  // Name sign mounted above the entrance archway, facing the piazza
  const postMat = new THREE.MeshStandardMaterial({ color: '#3f2a1c', roughness: 0.6 });
  const signTex = nameSignTexture(cuisine);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.82, 4.15), postMat);
  board.position.set(frontX + 0.12, 3.42, 0);
  group.add(board);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(4.05, 0.76),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.4, emissive: '#ffffff', emissiveMap: signTex, emissiveIntensity: 0.08 })
  );
  face.rotation.y = Math.PI / 2;
  face.position.set(frontX + 0.185, 3.42, 0);
  group.add(face);
  for (const z of [-1.95, 1.95]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), postMat);
    post.position.set(frontX + 0.05, 2.85, z);
    group.add(post);
  }

  // Pennant bunting over both terraces (one batched draw for every flag)
  const bunting = new BuntingBatch();
  for (const side of [-1, 1]) {
    for (const zEdge of [3.7, 6.9]) {
      bunting.add(
        new THREE.Vector3(frontX + 0.6, 2.42, zEdge * side),
        new THREE.Vector3(frontX + 5.2, 2.42, zEdge * side),
        colors,
        cuisine === 'mexican' ? 11 : 9,
        cuisine === 'mexican' ? 0.3 : 0.24
      );
    }
    bunting.add(new THREE.Vector3(frontX + 5.2, 2.42, 3.7 * side), new THREE.Vector3(frontX + 5.2, 2.42, 6.9 * side), colors, 6);
  }
  group.add(...bunting.build());

  // Country props hung from the archway (no colliders: all above head height)
  if (cuisine === 'japanese' || cuisine === 'azerbaijani') {
    for (const z of [-2.35, 2.35]) {
      const l = hangingLantern(cuisine === 'japanese' ? 'paper' : 'brass', cuisine === 'japanese' ? '#dc2626' : '#f59e0b');
      l.group.position.set(frontX + 0.75, 2.05, z);
      group.add(l.group);
      glowMats.push(l.glow);
    }
  }
  if (cuisine === 'japanese') {
    // Noren curtain strips over the doorway
    const noren = new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.85, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), noren);
      strip.rotation.y = Math.PI / 2;
      strip.position.set(frontX + 0.02, 2.2, -1.05 + i * 0.7);
      group.add(strip);
    }
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.13, 16),
      new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide })
    );
    dot.rotation.y = Math.PI / 2;
    dot.position.set(frontX + 0.035, 2.2, 0);
    group.add(dot);
  }
  if (cuisine === 'italian' || cuisine === 'mexican' || cuisine === 'bistro') {
    const flowers =
      cuisine === 'mexican' ? ['#f97316', '#fbbf24', '#f59e0b'] : cuisine === 'italian' ? ['#dc2626', '#ffffff', '#f43f5e'] : ['#f472b6', '#fde047'];
    for (const z of [-2.4, 2.4]) {
      const b = flowerBasket(flowers);
      b.position.set(frontX + 0.7, 1.95, z);
      group.add(b);
    }
  }
  if (cuisine === 'azerbaijani') {
    // Carpets draped over the terrace railings either side of the entrance
    const carpetMat = new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: 0.9, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const carpet = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), carpetMat);
      carpet.position.set(frontX + 5.28, 0.72, 5.3 * side);
      carpet.rotation.y = Math.PI / 2;
      group.add(carpet);
    }
  }

  return { group, glowMats };
}
