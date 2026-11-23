// Food Street plots: each restaurant you move on from reopens here, run by your staff.
import * as THREE from 'three';
import { CUISINES } from './cuisines';
import { createShopBuildingMesh } from './models';
import { createGableRoofMesh, FOOD_STREET } from './oldTown';
import { CuisineDef, CuisineId } from './types';

const SHOP_SCALE = 1.1;

function signTexture(lines: string[], bg: string, fg: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 496, 240);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? 'bold 40px "Trebuchet MS", sans-serif' : 'bold 52px Georgia, serif';
    let size = i === 0 ? 40 : 52;
    while (ctx.measureText(line).width > 470 && size > 22) {
      size -= 3;
      ctx.font = `bold ${size}px ${i === 0 ? '"Trebuchet MS", sans-serif' : 'Georgia, serif'}`;
    }
    ctx.fillText(line, 256, 64 + i * 70);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Free-standing sign board on two posts (faces local +z). */
function signBoard(lines: string[], bg: string, fg: string): THREE.Group {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#5b3a22', roughness: 0.7 });
  for (const x of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.6, 0.1), wood);
    post.position.set(x, 0.8, 0);
    g.add(post);
  }
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.05, 0.06), wood);
  board.position.y = 1.55;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.98), new THREE.MeshStandardMaterial({ map: signTexture(lines, bg, fg), roughness: 0.5 }));
  face.position.set(0, 1.55, 0.035);
  g.add(board, face);
  return g;
}

/** An earlier restaurant, reopened on Food Street in its country's colours. */
function ownedRestaurant(def: CuisineDef): THREE.Group {
  const g = new THREE.Group();
  const shop = createShopBuildingMesh(def.name, def.palette.accent, def.palette.wall);
  shop.scale.setScalar(SHOP_SCALE);
  g.add(shop);
  const roof = createGableRoofMesh(7.3 * SHOP_SCALE, 5.7 * SHOP_SCALE, 1.7, def.palette.trim);
  roof.position.y = 3.46 * SHOP_SCALE;
  g.add(roof);
  // Flag pennants across the shop front (one instanced draw)
  const colors = [def.palette.awningA, def.palette.awningB, def.palette.accent];
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.12, 0, 0, 0.12, 0, 0, 0, -0.24, 0], 3));
  const flags = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide }), 12);
  const col = new THREE.Color();
  const mtx = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12;
    flags.setMatrixAt(i, mtx.makeTranslation(-3.6 + t * 7.2, 3.15 - Math.sin(Math.PI * t) * 0.25, 3.15));
    flags.setColorAt(i, col.set(colors[i % colors.length]));
  }
  g.add(flags);
  // "Run by your staff" placard beside the door
  const placard = signBoard(['Run by your team', def.country], '#14532d', '#fef3c7');
  placard.scale.setScalar(0.6);
  placard.position.set(3.2, 0, 3.6);
  g.add(placard);
  return g;
}

/** Fenced construction site for the next restaurant in the chain. */
function constructionSite(next: CuisineDef): THREE.Group {
  const g = new THREE.Group();
  const w = FOOD_STREET.plotWidth;
  const d = FOOD_STREET.plotDepth;
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.4, d - 0.4), new THREE.MeshStandardMaterial({ color: '#9b7b55', roughness: 1 }));
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.02;
  g.add(dirt);
  // Scaffolding frame where the building will rise
  const pipe = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.6, roughness: 0.4 });
  for (const x of [-2.8, -0.9, 0.9, 2.8]) {
    for (const z of [-1.8, 1.4]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), pipe);
      p.position.set(x, 1.7, z);
      g.add(p);
    }
  }
  for (const y of [1.2, 2.4, 3.3]) {
    for (const z of [-1.8, 1.4]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.7, 6), pipe);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, y, z);
      g.add(bar);
    }
    const plank = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: '#c08a4b', roughness: 0.8 }));
    plank.position.set(0, y + 0.05, 1.4);
    g.add(plank);
  }
  // Wall going up in the new restaurant's colour
  const wall = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 3.0), new THREE.MeshStandardMaterial({ color: next.palette.wall, roughness: 0.85 }));
  wall.position.set(0, 0.55, -0.2);
  g.add(wall);
  // Low hoarding in front with cones
  const hoard = new THREE.MeshStandardMaterial({ color: next.palette.accent, roughness: 0.7 });
  const front = new THREE.Mesh(new THREE.BoxGeometry(w - 0.4, 0.9, 0.08), hoard);
  front.position.set(0, 0.45, d / 2 - 0.25);
  g.add(front);
  const cone = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6 });
  for (const x of [-3.4, 3.4]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 10), cone);
    c.position.set(x, 0.25, d / 2 + 0.3);
    g.add(c);
  }
  const sign = signBoard([`Coming soon · Lv ${next.requiredLevel}`, `${next.name}`], '#1e293b', '#fde68a');
  sign.position.set(0, 0, d / 2 + 0.15);
  g.add(sign);
  return g;
}

function emptyPlot(): THREE.Group {
  const g = new THREE.Group();
  const lawn = new THREE.Mesh(
    new THREE.PlaneGeometry(FOOD_STREET.plotWidth - 0.4, FOOD_STREET.plotDepth - 0.4),
    new THREE.MeshStandardMaterial({ color: '#7fa25a', roughness: 1 })
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.02;
  g.add(lawn);
  const sign = signBoard(['Future expansion', 'Plot for sale'], '#f8fafc', '#1e293b');
  sign.scale.setScalar(0.75);
  sign.position.set(0, 0, FOOD_STREET.plotDepth / 2 - 0.6);
  g.add(sign);
  return g;
}

/** Builds all four plots for the current chain progress. */
export function buildFoodStreetPlots(owned: CuisineId[], next: CuisineDef | null): THREE.Group {
  const group = new THREE.Group();
  FOOD_STREET.plots.forEach((plot, i) => {
    let item: THREE.Group;
    if (owned[i]) item = ownedRestaurant(CUISINES[owned[i]]);
    else if (i === owned.length && next) item = constructionSite(next);
    else item = emptyPlot();
    item.position.set(plot.x, 0, plot.z);
    item.rotation.y = plot.yaw;
    item.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    group.add(item);
  });
  return group;
}

/** Solid footprint of every plot (the same whatever stands on it). */
export function foodStreetColliders() {
  const hx = (FOOD_STREET.plotDepth - 0.6) / 2;
  const hz = (FOOD_STREET.plotWidth - 0.4) / 2;
  return FOOD_STREET.plots.map((p) => ({ kind: 'aabb' as const, minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz }));
}
