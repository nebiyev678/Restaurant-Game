import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFlowerBox, createGlowSprite, GlowMat } from './cozyDecor';
import { DECOR_BY_ID, DecorItemId, FloorId, FLOORS, WallId, WALLS } from './decor';
import { createContactShadow, createDiningTableMesh, createPottedPlantMesh, createWoodTexture, DiningTableParts, TableStyle } from './models';
import type { CafeThemeDef } from './types';

// ---------------------------------------------------------------------------
// 3D models for the design-mode catalog, in the same warm, chunky style as the
// rest of the restaurant (rounded boxes, honey woods, soft cushions).
// Every model is centred on its footprint, stands on y = 0 and faces +z.
// ---------------------------------------------------------------------------

const mat = (color: string, roughness = 0.55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

export const TABLE_STYLES: Partial<Record<DecorItemId, TableStyle>> = {
  table_marble: { woodPrimary: '#4a3324', woodSecondary: '#2a1a10', cushion: '#efe4cf', leg: '#1f2023', legMetal: 0.6, marbleTop: '#f4f1eb' },
  table_rustic: { woodPrimary: '#8a5530', woodSecondary: '#4a2a14', cushion: '#7f9b6e' },
  booth_sky: { woodPrimary: '#ecd1a4', woodSecondary: '#b98d5c', cushion: '#3b82c4' },
  booth_velvet: { woodPrimary: '#6b3f22', woodSecondary: '#3f2412', cushion: '#1f6b4f', leg: '#b8862f', legMetal: 0.8, velvet: true },
};

/** A table set (table + chairs or booth benches) for one seating item. */
export function createSeatingMesh(item: DecorItemId, theme?: CafeThemeDef): DiningTableParts {
  return createDiningTableMesh(!!DECOR_BY_ID[item].booth, theme, TABLE_STYLES[item]);
}

function shadow(g: THREE.Group, rx: number, rz: number, o = 0.5) {
  g.add(createContactShadow(rx, rz, o));
}

function cast(g: THREE.Object3D) {
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });
}

function leafBall(color: string, r: number, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color, 0.6));
  m.scale.set(sx, sy, sz);
  return m;
}

function cactusTrio(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.34, 0.26);
  const tray = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.06, 0.4, 2, 0.02), mat('#c8693f', 0.7));
  tray.position.y = 0.03;
  g.add(tray);
  const green = mat('#4f8a3c', 0.6);
  [
    [-0.18, 0, 0.32],
    [0.02, 0.04, 0.46],
    [0.19, -0.03, 0.26],
  ].forEach(([x, z, h], i) => {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.12, 12), mat(i === 1 ? '#f1e6d2' : '#d9774a', 0.6));
    pot.position.set(x, 0.12, z);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, h - 0.1, 4, 10), green);
    body.position.set(x, 0.18 + h / 2, z);
    g.add(pot, body);
    if (i === 1) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.1, 4, 8), green);
      arm.position.set(x + 0.07, 0.42, z);
      g.add(arm);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('#f472b6', 0.5));
      flower.position.set(x, 0.2 + h, z);
      g.add(flower);
    }
  });
  return g;
}

function fernBasket(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.38, 0.38);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.21, 0.34, 18), mat('#b98a52', 0.85));
  basket.position.y = 0.17;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 20), mat('#8a5f33', 0.8));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.34;
  g.add(basket, rim);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const frond = leafBall(i % 2 ? '#3f8f3a' : '#5aa845', 0.13, 0.55, 0.22, 2.2);
    frond.position.set(Math.cos(a) * 0.2, 0.46 + (i % 3) * 0.04, Math.sin(a) * 0.2);
    frond.rotation.y = -a + Math.PI / 2;
    frond.rotation.x = -0.55;
    g.add(frond);
  }
  return g;
}

function tallPalm(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.4, 0.4);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.42, 16), mat('#2f3a40', 0.45));
  pot.position.y = 0.21;
  g.add(pot);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.1, 8), mat('#8a6440', 0.8));
  trunk.position.y = 0.95;
  trunk.rotation.z = 0.06;
  g.add(trunk);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const leaf = leafBall(i % 2 ? '#3d8b40' : '#57a84a', 0.14, 0.5, 0.16, 3);
    leaf.position.set(Math.cos(a) * 0.3, 1.45 - (i % 2) * 0.06, Math.sin(a) * 0.3);
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = 0.45;
    g.add(leaf);
  }
  return g;
}

function oliveTree(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.42, 0.42);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.44, 18), mat('#e9dcc6', 0.6));
  pot.position.y = 0.22;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.305, 0.3, 0.07, 18), mat('#3b6ea5', 0.5));
  band.position.y = 0.38;
  g.add(pot, band);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.9, 7), mat('#7a6a55', 0.85));
  trunk.position.y = 0.85;
  trunk.rotation.z = -0.1;
  g.add(trunk);
  [
    [0, 1.42, 0, 0.3],
    [0.17, 1.3, 0.1, 0.22],
    [-0.16, 1.32, -0.08, 0.22],
    [0.05, 1.55, -0.12, 0.2],
  ].forEach(([x, y, z, r], i) => {
    const c = leafBall(i % 2 ? '#7d9b5f' : '#94ad74', r, 1, 0.8, 1);
    c.position.set(x, y, z);
    g.add(c);
  });
  for (let i = 0; i < 6; i++) {
    const olive = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), mat('#3f4a2a', 0.4));
    olive.position.set(Math.cos(i) * 0.24, 1.3 + (i % 3) * 0.07, Math.sin(i) * 0.24);
    g.add(olive);
  }
  return g;
}

function flowerPlanter(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.62, 0.28);
  const box = createFlowerBox(1.05);
  g.add(box);
  const legs = mat('#6b4a2e', 0.7);
  for (const x of [-0.45, 0.45]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), legs);
    leg.position.set(x, 0.15, 0);
    g.add(leg);
  }
  box.position.y = 0.3;
  return g;
}

function coatRack(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.26, 0.26);
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture('#a8683a', '#6b3d1d', 1), roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.75, 10), wood);
  pole.position.y = 0.9;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 16), wood);
  base.position.y = 0.025;
  g.add(pole, base);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const hook = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 3, 6), wood);
    hook.position.set(Math.cos(a) * 0.08, 1.66, Math.sin(a) * 0.08);
    hook.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    g.add(hook);
  }
  // A coat hanging from a hook: shoulders, body and a collar
  const coat = new THREE.Group();
  const cloth = mat('#7c3a2a', 0.85);
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.55, 0.1, 2, 0.04), cloth);
  body.position.y = -0.3;
  const shoulders = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.08, 0.12, 2, 0.04), cloth);
  shoulders.position.y = -0.04;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 10), mat('#5a2a1e', 0.8));
  collar.rotation.x = Math.PI / 2;
  coat.add(body, shoulders, collar);
  coat.position.set(0.17, 1.62, 0);
  coat.rotation.y = Math.PI / 2;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 12), mat('#e2b33c', 0.7));
  scarf.position.set(-0.08, 1.55, 0.02);
  scarf.rotation.y = Math.PI / 2;
  g.add(coat, scarf);
  return g;
}

function rugTexture(kind: 'round' | 'long'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = kind === 'round' ? 256 : 160;
  const x = c.getContext('2d')!;
  const W = c.width;
  const H = c.height;
  if (kind === 'round') {
    const rings = ['#9f2d2d', '#e9d3a8', '#b8483a', '#f2e2c2', '#2f5d6b', '#e9d3a8'];
    rings.forEach((col, i) => {
      x.fillStyle = col;
      x.beginPath();
      x.arc(W / 2, H / 2, W / 2 - i * 20, 0, Math.PI * 2);
      x.fill();
    });
    x.fillStyle = '#9f2d2d';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.arc(W / 2 + Math.cos(a) * 70, H / 2 + Math.sin(a) * 70, 6, 0, Math.PI * 2);
      x.fill();
    }
  } else {
    x.fillStyle = '#8c2f2a';
    x.fillRect(0, 0, W, H);
    x.fillStyle = '#e8cf9e';
    x.fillRect(10, 10, W - 20, H - 20);
    x.fillStyle = '#2d4f63';
    x.fillRect(22, 22, W - 44, H - 44);
    x.fillStyle = '#c8553d';
    for (let i = 0; i < 5; i++) {
      const cx = 48 + i * 40;
      x.beginPath();
      x.moveTo(cx, H / 2 - 30);
      x.lineTo(cx + 16, H / 2);
      x.lineTo(cx, H / 2 + 30);
      x.lineTo(cx - 16, H / 2);
      x.closePath();
      x.fill();
    }
    x.fillStyle = '#e8cf9e';
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.arc(48 + i * 40, H / 2, 5, 0, Math.PI * 2);
      x.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rug(kind: 'round' | 'long'): THREE.Group {
  const g = new THREE.Group();
  const def = DECOR_BY_ID[kind === 'round' ? 'rug_round' : 'rug_long'];
  const geo = kind === 'round' ? new THREE.CylinderGeometry(def.w / 2, def.w / 2, 0.016, 40) : new THREE.BoxGeometry(def.w, 0.016, def.d);
  const m = new THREE.MeshStandardMaterial({ map: rugTexture(kind), roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const r = new THREE.Mesh(geo, m);
  // Above the floor (top ≈ 0.11) with a clear gap so phones don't flicker
  r.position.y = 0.028;
  r.receiveShadow = true;
  g.add(r);
  return g;
}

function menuEasel(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.3, 0.26);
  const wood = mat('#8a5a33', 0.6);
  for (const x of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.25, 0.04), wood);
    leg.position.set(x, 0.62, 0.05);
    leg.rotation.x = -0.12;
    g.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.2, 0.04), wood);
  back.position.set(0, 0.6, -0.17);
  back.rotation.x = 0.28;
  g.add(back);
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = '#25302b';
  x.fillRect(0, 0, 128, 160);
  x.fillStyle = '#f7f2e4';
  x.font = 'bold 20px sans-serif';
  x.textAlign = 'center';
  x.fillText('TODAY', 64, 30);
  x.font = '14px sans-serif';
  ['Soup  $9', 'Pasta $14', 'Cake  $6'].forEach((s, i) => x.fillText(s, 64, 64 + i * 26));
  x.strokeStyle = '#f7c948';
  x.lineWidth = 2;
  x.strokeRect(6, 6, 116, 148);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.03), [wood, wood, wood, wood, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), wood]);
  board.position.set(0, 0.85, 0.08);
  board.rotation.x = -0.12;
  g.add(board);
  return g;
}

function floorLamp(glows: GlowMat[]): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.24, 0.24);
  const brass = mat('#b8862f', 0.3, 0.8);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.05, 18), brass);
  base.position.y = 0.025;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.45, 8), brass);
  pole.position.y = 0.75;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.22, 0.26, 18, 1, true),
    new THREE.MeshStandardMaterial({ color: '#f6e7c8', emissive: '#ffcf87', emissiveIntensity: 0.55, roughness: 0.8, side: THREE.DoubleSide })
  );
  shade.position.y = 1.52;
  const halo = createGlowSprite('#ffd08a', 1.1, 0.5, glows);
  halo.position.y = 1.5;
  g.add(base, pole, shade, halo);
  return g;
}

function lanternStand(glows: GlowMat[]): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.26, 0.26);
  const iron = mat('#2b2622', 0.4, 0.6);
  const brass = mat('#c89b3c', 0.3, 0.85);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 6), iron);
  base.position.y = 0.04;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.35, 6), iron);
  pole.position.y = 0.72;
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 6), new THREE.MeshStandardMaterial({ color: '#ffe7a8', emissive: '#ffb84d', emissiveIntensity: 1, transparent: true, opacity: 0.85 }));
  cage.position.y = 1.55;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.16, 6), brass);
  cap.position.y = 1.78;
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 6), brass);
  bottom.position.y = 1.39;
  const halo = createGlowSprite('#ffc06a', 1.2, 0.6, glows);
  halo.position.y = 1.55;
  g.add(base, pole, cage, cap, bottom, halo);
  return g;
}

function divider(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.8, 0.2);
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture('#a8683a', '#6b3d1d', 1), roughness: 0.5 });
  const lattice = mat('#e9d8b8', 0.8);
  for (let i = 0; i < 3; i++) {
    const panel = new THREE.Group();
    panel.position.x = (i - 1) * 0.5;
    panel.rotation.y = (i - 1) * 0.18;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.55, 0.05), wood);
    frame.position.y = 0.82;
    const inset = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.2, 0.055), lattice);
    inset.position.y = 0.88;
    panel.add(frame, inset);
    for (let k = 0; k < 4; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.06), wood);
      bar.position.y = 0.4 + k * 0.32;
      panel.add(bar);
    }
    g.add(panel);
  }
  return g;
}

function bookshelf(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.7, 0.3);
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture('#9a5e33', '#5f3519', 1), roughness: 0.5 });
  const W = 1.2;
  const H = 1.8;
  const D = 0.4;
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.04), wood);
  back.position.set(0, H / 2, -D / 2 + 0.02);
  g.add(back);
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, D), wood);
    side.position.set(x, H / 2, 0);
    g.add(side);
  }
  const colors = ['#b23a3a', '#2f5d8a', '#e2b33c', '#3f7a4a', '#7c4a8a', '#d9774a', '#f1e6d2'];
  for (let s = 0; s < 4; s++) {
    const y = 0.06 + s * 0.44;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.04, D - 0.02), wood);
    shelf.position.set(0, y, 0);
    g.add(shelf);
    if (s === 3) continue;
    let x = -W / 2 + 0.1;
    let k = s * 3;
    while (x < W / 2 - 0.12) {
      if (s === 1 && x > 0.1 && x < 0.45) {
        // A jar and a little plant on the middle shelf
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.18, 12), new THREE.MeshStandardMaterial({ color: '#d7eef2', transparent: true, opacity: 0.6, roughness: 0.1 }));
        jar.position.set(x + 0.08, y + 0.11, 0);
        const plant = leafBall('#4f9a44', 0.09);
        plant.position.set(x + 0.26, y + 0.14, 0);
        g.add(jar, plant);
        x += 0.38;
        continue;
      }
      const bw = 0.05 + ((k * 7) % 4) * 0.012;
      const bh = 0.26 + ((k * 5) % 3) * 0.04;
      const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.24), mat(colors[k % colors.length], 0.7));
      book.position.set(x + bw / 2, y + 0.02 + bh / 2, 0.02);
      if (k % 9 === 4) book.rotation.z = 0.25;
      g.add(book);
      x += bw + 0.008;
      k++;
    }
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), wood);
  top.position.y = H;
  g.add(top);
  return g;
}

function dessertCart(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.6, 0.36);
  const brass = mat('#c89b3c', 0.3, 0.85);
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture('#a8683a', '#6b3d1d', 1), roughness: 0.45 });
  for (const y of [0.42, 0.85]) {
    const shelf = new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.05, 0.5, 2, 0.02), wood);
    shelf.position.y = y;
    g.add(shelf);
  }
  for (const x of [-0.44, 0.44])
    for (const z of [-0.21, 0.21]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 6), brass);
      post.position.set(x, 0.5, z);
      g.add(post);
    }
  for (const x of [-0.38, 0.38]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 14), mat('#2b2622', 0.5));
    wheel.position.set(x, 0.1, 0.22);
    g.add(wheel);
  }
  const cake = (x: number, y: number, c1: string, c2: string, r = 0.13) => {
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.03, r + 0.02, 0.02, 16), mat('#f8fafc', 0.2));
    plate.position.set(x, y + 0.035, 0);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.14, 18), mat(c1, 0.6));
    body.position.set(x, y + 0.11, 0);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.005, r + 0.005, 0.03, 18), mat(c2, 0.4));
    top.position.set(x, y + 0.19, 0);
    const berry = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat('#d2263a', 0.3));
    berry.position.set(x, y + 0.22, 0);
    g.add(plate, body, top, berry);
  };
  cake(-0.22, 0.85, '#6b3a23', '#f3e3c6');
  cake(0.22, 0.85, '#f4d7df', '#fdf6ee');
  cake(-0.2, 0.42, '#f2c96b', '#fff4dd', 0.11);
  cake(0.22, 0.42, '#c5e0b4', '#f7f2e4', 0.11);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#e6f4f8', transparent: true, opacity: 0.35, roughness: 0.05 })
  );
  dome.position.set(0.22, 0.89, 0);
  g.add(dome);
  return g;
}

function fountain(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.6, 0.6);
  const stone = mat('#d8cfc0', 0.75);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.35, 24), stone);
  basin.position.y = 0.18;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 24), new THREE.MeshStandardMaterial({ color: '#6fc3df', emissive: '#2a7a99', emissiveIntensity: 0.25, roughness: 0.05, metalness: 0.1 }));
  water.position.y = 0.33;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.55, 12), stone);
  column.position.y = 0.6;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.12, 18), stone);
  bowl.position.y = 0.9;
  const water2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 18), water.material);
  water2.position.y = 0.96;
  const spout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), stone);
  spout.position.y = 1.02;
  g.add(basin, water, column, bowl, water2, spout);
  // A thin curtain of water falling from the top bowl
  const curtain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.3, 0.6, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: '#bfe8f5', transparent: true, opacity: 0.32, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })
  );
  curtain.position.y = 0.63;
  g.add(curtain);
  for (let i = 0; i < 4; i++) {
    const lily = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 10), mat('#4f9a44', 0.6));
    lily.position.set(Math.cos(i * 1.7) * 0.34, 0.345, Math.sin(i * 1.7) * 0.34);
    g.add(lily);
  }
  return g;
}

function aquarium(glows: GlowMat[]): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.78, 0.32);
  const wood = new THREE.MeshStandardMaterial({ map: createWoodTexture('#5f3a22', '#3a2112', 1), roughness: 0.5 });
  const stand = new THREE.Mesh(new RoundedBoxGeometry(1.4, 0.7, 0.5, 2, 0.03), wood);
  stand.position.y = 0.35;
  const water = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.6, 0.42),
    new THREE.MeshStandardMaterial({ color: '#4fb4d8', emissive: '#1d7fa6', emissiveIntensity: 0.55, transparent: true, opacity: 0.55, roughness: 0.05 })
  );
  water.position.y = 1.02;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.5), wood);
  lid.position.y = 1.35;
  const sand = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.4), mat('#e9d6a8', 0.9));
  sand.position.y = 0.75;
  g.add(stand, water, lid, sand);
  const fishColors = ['#f97316', '#facc15', '#ec4899', '#38bdf8', '#f97316'];
  fishColors.forEach((c, i) => {
    const fish = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 }));
    fish.scale.set(1.6, 1, 0.6);
    fish.position.set(-0.45 + i * 0.22, 0.9 + ((i * 37) % 5) * 0.06, ((i % 2) - 0.5) * 0.15);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.06, 4), fish.material);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(fish.position.x - 0.09, fish.position.y, fish.position.z);
    g.add(fish, tail);
  });
  for (let i = 0; i < 5; i++) {
    const weed = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.2 + (i % 3) * 0.08, 3, 6), mat('#3f8f3a', 0.6));
    weed.position.set(-0.55 + i * 0.27, 0.9, -0.12);
    g.add(weed);
  }
  const glow = createGlowSprite('#7dd3fc', 1.2, 0.35, glows);
  glow.position.y = 1.05;
  g.add(glow);
  return g;
}

function piano(): THREE.Group {
  const g = new THREE.Group();
  shadow(g, 0.82, 0.38);
  const lacquer = new THREE.MeshPhysicalMaterial({ color: '#1b1716', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.25, 0.45, 2, 0.04), lacquer);
  body.position.set(0, 0.67, -0.1);
  const keybed = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.06, 0.28), lacquer);
  keybed.position.set(0, 0.74, 0.22);
  const keys = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.025, 0.16), mat('#f8f5ee', 0.3));
  keys.position.set(0, 0.785, 0.24);
  g.add(body, keybed, keys);
  for (let i = 0; i < 18; i++) {
    if (i % 7 === 2 || i % 7 === 6) continue;
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.09), lacquer);
    bk.position.set(-0.6 + i * 0.07, 0.805, 0.2);
    g.add(bk);
  }
  for (const x of [-0.68, 0.68]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.07), lacquer);
    leg.position.set(x, 0.36, 0.3);
    g.add(leg);
  }
  const brass = mat('#c89b3c', 0.3, 0.85);
  for (const x of [-0.12, 0, 0.12]) {
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.1), brass);
    pedal.position.set(x, 0.06, 0.18);
    g.add(pedal);
  }
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 10), mat('#f6efe0', 0.5));
  candle.position.set(0.55, 1.37, -0.1);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 12), mat('#c8553d', 0.4));
  vase.position.set(-0.5, 1.39, -0.1);
  const bloom = leafBall('#f472b6', 0.08);
  bloom.position.set(-0.5, 1.53, -0.1);
  const bench = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.08, 0.32, 2, 0.02), lacquer);
  bench.position.set(0, 0.48, 0.62);
  for (const x of [-0.3, 0.3]) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.26), lacquer);
    bl.position.set(x, 0.22, 0.62);
    g.add(bl);
  }
  g.add(candle, vase, bloom, bench);
  return g;
}

/**
 * Builds a non-seating decoration. Lamps and tanks add their glow sprites to `glows`
 * so they brighten at night with the rest of the restaurant.
 */
export function createDecorMesh(item: DecorItemId, glows: GlowMat[] = [], theme?: CafeThemeDef): THREE.Group {
  let g: THREE.Group;
  switch (item) {
    case 'plant_classic':
      g = createPottedPlantMesh(theme?.trimColor ?? '#dc2626');
      shadow(g, 0.34, 0.34);
      break;
    case 'plant_cactus':
      g = cactusTrio();
      break;
    case 'plant_fern':
      g = fernBasket();
      break;
    case 'plant_palm':
      g = tallPalm();
      break;
    case 'plant_flowers':
      g = flowerPlanter();
      break;
    case 'plant_olive':
      g = oliveTree();
      break;
    case 'coat_rack':
      g = coatRack();
      break;
    case 'rug_round':
      g = rug('round');
      break;
    case 'rug_long':
      g = rug('long');
      break;
    case 'menu_easel':
      g = menuEasel();
      break;
    case 'lamp_floor':
      g = floorLamp(glows);
      break;
    case 'lamp_lantern':
      g = lanternStand(glows);
      break;
    case 'divider':
      g = divider();
      break;
    case 'bookshelf':
      g = bookshelf();
      break;
    case 'dessert_cart':
      g = dessertCart();
      break;
    case 'fountain':
      g = fountain();
      break;
    case 'aquarium':
      g = aquarium(glows);
      break;
    case 'piano':
      g = piano();
      break;
    default: {
      // Seating previews (menu pictures)
      const parts = createSeatingMesh(item, theme);
      parts.dirtyMesh.visible = false;
      g = parts.group;
    }
  }
  if (!DECOR_BY_ID[item].flat) cast(g);
  return g;
}

// ---------------------------------------------------------------------------
// Floors and wallpapers (whole-room surfaces)
// ---------------------------------------------------------------------------

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, x: c.getContext('2d')! };
}

function shade(hex: string, amt: number): string {
  const col = new THREE.Color(hex);
  col.offsetHSL(0, 0, amt);
  return `#${col.getHexString()}`;
}

/** Paints one metre-square tile of a floor pattern (tiled across the room). */
function paintFloorTile(id: FloorId, size: number): HTMLCanvasElement {
  const { c, x } = canvasOf(size, size);
  const [a, b] = FLOORS.find((f) => f.id === id)!.colors;
  const s = size;
  switch (id) {
    case 'checker': {
      const n = 2;
      const t = s / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          x.fillStyle = (i + j) % 2 ? b : a;
          x.fillRect(i * t, j * t, t, t);
        }
      x.strokeStyle = 'rgba(0,0,0,0.12)';
      x.lineWidth = 1;
      for (let i = 0; i <= n; i++) {
        x.beginPath();
        x.moveTo(i * t, 0);
        x.lineTo(i * t, s);
        x.moveTo(0, i * t);
        x.lineTo(s, i * t);
        x.stroke();
      }
      break;
    }
    case 'oak_parquet': {
      const rows = 6;
      const h = s / rows;
      for (let r = 0; r < rows; r++) {
        let px = r % 2 ? -s / 3 : 0;
        let k = r;
        while (px < s) {
          const len = s * (0.45 + ((k * 13) % 5) * 0.08);
          x.fillStyle = shade(k % 2 ? a : b, ((k * 7) % 5) * 0.012 - 0.02);
          x.fillRect(px, r * h, len - 1, h - 1);
          x.fillStyle = 'rgba(80,40,10,0.12)';
          for (let g = 0; g < 3; g++) x.fillRect(px + 4, r * h + 2 + g * (h / 3), len - 10, 1);
          px += len;
          k++;
        }
      }
      break;
    }
    case 'terracotta': {
      x.fillStyle = b;
      x.fillRect(0, 0, s, s);
      const n = 3;
      const t = s / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          x.fillStyle = shade(a, (((i * 3 + j * 5) % 4) - 1.5) * 0.025);
          x.fillRect(i * t + 2, j * t + 2, t - 4, t - 4);
        }
      break;
    }
    case 'herringbone': {
      // Chevron planks: columns slanting up and down alternately
      x.fillStyle = b;
      x.fillRect(0, 0, s, s);
      const cols = 4;
      const cw = s / cols;
      const t = s / 8;
      for (let k = 0; k < cols; k++) {
        const x0 = k * cw;
        const dir = k % 2 ? 1 : -1;
        const rise = cw * 0.5 * dir;
        for (let j = -2; j < 10; j++) {
          const y = j * t;
          x.fillStyle = shade(a, (((j * 3 + k * 5) % 5) - 2) * 0.025);
          x.beginPath();
          x.moveTo(x0 + 1, y + (dir > 0 ? 0 : -rise));
          x.lineTo(x0 + cw - 1, y + (dir > 0 ? rise : 0));
          x.lineTo(x0 + cw - 1, y + (dir > 0 ? rise : 0) + t - 2);
          x.lineTo(x0 + 1, y + (dir > 0 ? 0 : -rise) + t - 2);
          x.closePath();
          x.fill();
        }
      }
      break;
    }
    case 'marble': {
      const n = 2;
      const t = s / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          x.fillStyle = (i + j) % 2 ? '#ebe7df' : a;
          x.fillRect(i * t, j * t, t, t);
          x.strokeStyle = 'rgba(150,140,125,0.35)';
          x.lineWidth = 1.2;
          for (let v = 0; v < 3; v++) {
            x.beginPath();
            let vx = i * t + ((i * 31 + j * 17 + v * 23) % t);
            let vy = j * t;
            x.moveTo(vx, vy);
            for (let k = 0; k < 6; k++) {
              vx += ((k * 37 + v * 11) % 15) - 7;
              vy += t / 6;
              x.lineTo(vx, vy);
            }
            x.stroke();
          }
          x.strokeStyle = b;
          x.lineWidth = 1;
          x.strokeRect(i * t + 0.5, j * t + 0.5, t - 1, t - 1);
        }
      break;
    }
    default:
      x.fillStyle = a;
      x.fillRect(0, 0, s, s);
  }
  return c;
}

/** Floor texture covering a `w` × `d` metre room. */
export function createDecorFloorTexture(id: FloorId, w: number, d: number, maxAniso = 4): THREE.CanvasTexture {
  const tile = paintFloorTile(id, 128);
  const t = new THREE.CanvasTexture(tile);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w * (id === 'herringbone' ? 1.1 : 0.85), d * (id === 'herringbone' ? 1.1 : 0.85));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function paintWallTile(id: WallId, size: number): HTMLCanvasElement {
  const { c, x } = canvasOf(size, size);
  const [a, b] = WALLS.find((w) => w.id === id)!.colors;
  const s = size;
  x.fillStyle = a;
  x.fillRect(0, 0, s, s);
  switch (id) {
    case 'stripes': {
      const n = 6;
      for (let i = 0; i < n; i++) {
        x.fillStyle = b;
        x.fillRect((i * s) / n, 0, s / n / 2.2, s);
      }
      break;
    }
    case 'brick': {
      x.fillStyle = b;
      x.fillRect(0, 0, s, s);
      const rows = 8;
      const h = s / rows;
      const bw = s / 4;
      for (let r = 0; r < rows; r++)
        for (let k = -1; k < 5; k++) {
          x.fillStyle = shade(a, (((r * 5 + k * 3) % 5) - 2) * 0.03);
          x.fillRect(k * bw + (r % 2) * (bw / 2) + 2, r * h + 2, bw - 4, h - 4);
        }
      break;
    }
    case 'azure_tile': {
      const n = 4;
      const t = s / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const cx = i * t + t / 2;
          const cy = j * t + t / 2;
          x.strokeStyle = b;
          x.lineWidth = 2;
          x.strokeRect(i * t + 1, j * t + 1, t - 2, t - 2);
          x.fillStyle = b;
          x.beginPath();
          x.moveTo(cx, cy - t * 0.3);
          x.lineTo(cx + t * 0.3, cy);
          x.lineTo(cx, cy + t * 0.3);
          x.lineTo(cx - t * 0.3, cy);
          x.closePath();
          x.fill();
          x.fillStyle = a;
          x.beginPath();
          x.arc(cx, cy, t * 0.1, 0, Math.PI * 2);
          x.fill();
        }
      break;
    }
    case 'damask': {
      const n = 2;
      const t = s / n;
      x.fillStyle = b;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const cx = i * t + t / 2 + (j % 2) * (t / 2);
          const cy = j * t + t / 2;
          for (let p = 0; p < 6; p++) {
            const ang = (p / 6) * Math.PI * 2;
            x.beginPath();
            x.ellipse(cx + Math.cos(ang) * t * 0.14, cy + Math.sin(ang) * t * 0.14, t * 0.1, t * 0.045, ang, 0, Math.PI * 2);
            x.fill();
          }
          x.beginPath();
          x.arc(cx, cy, t * 0.06, 0, Math.PI * 2);
          x.fill();
        }
      break;
    }
    case 'wood_panel': {
      const n = 4;
      const t = s / n;
      for (let i = 0; i < n; i++) {
        x.fillStyle = shade(a, ((i % 3) - 1) * 0.02);
        x.fillRect(i * t + 3, 3, t - 6, s - 6);
        x.strokeStyle = b;
        x.lineWidth = 3;
        x.strokeRect(i * t + 8, 10, t - 16, s - 20);
      }
      break;
    }
    default:
      break;
  }
  return c;
}

/** Wallpaper for a wall `w` metres long and `h` tall. */
export function createDecorWallTexture(id: WallId, w: number, h: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(paintWallTile(id, 128));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / 1.2, h / 1.2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const swatchCache = new Map<string, string>();

/** Small picture of a floor or wallpaper for the shop menu. */
export function surfaceSwatch(kind: 'floor' | 'wall', id: string): string {
  const key = `${kind}:${id}`;
  const hit = swatchCache.get(key);
  if (hit) return hit;
  let url = '';
  try {
    const tile = kind === 'floor' ? paintFloorTile(id as FloorId, 96) : paintWallTile(id as WallId, 96);
    url = tile.toDataURL('image/png');
  } catch {
    url = '';
  }
  swatchCache.set(key, url);
  return url;
}

