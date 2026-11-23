// Procedural 3D models for the country-restaurant dishes (Italy, Japan, Mexico, Azerbaijan).
// Each builder adds meshes on top of the standard porcelain plate (radius ~0.3).
import * as THREE from 'three';
import { RecipeId } from './types';

const matCache = new Map<string, THREE.MeshStandardMaterial>();
function m(color: string, roughness = 0.6, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}`;
  let mat = matCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    matCache.set(key, mat);
  }
  return mat;
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(geo, mat);
  me.position.set(x, y, z);
  me.castShadow = true;
  return me;
}

function bowl(g: THREE.Group, outer: string, inner: string, r = 0.21, h = 0.13): number {
  const shell = mesh(new THREE.CylinderGeometry(r, r * 0.62, h, 22, 1, true), m(outer, 0.35));
  (shell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  shell.position.y = 0.045 + h / 2;
  const base = mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.02, 18), m(outer, 0.35), 0, 0.055, 0);
  g.add(shell, base);
  // Contents surface
  const surface = mesh(new THREE.CircleGeometry(r * 0.94, 22), m(inner, 0.5), 0, 0.045 + h * 0.82, 0);
  surface.rotation.x = -Math.PI / 2;
  g.add(surface);
  return 0.045 + h * 0.82;
}

function smallDipBowl(g: THREE.Group, x: number, z: number, sauce: string) {
  g.add(mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.04, 14), m('#f8fafc', 0.25), x, 0.065, z));
  const s = mesh(new THREE.CircleGeometry(0.052, 14), m(sauce, 0.3), x, 0.086, z);
  s.rotation.x = -Math.PI / 2;
  g.add(s);
}

function herb(g: THREE.Group, x: number, y: number, z: number, color = '#16a34a', s = 0.035) {
  const leaf = mesh(new THREE.SphereGeometry(s, 6, 4), m(color, 0.6), x, y, z);
  leaf.scale.set(1.4, 0.35, 0.8);
  leaf.rotation.y = x * 20;
  g.add(leaf);
}

export function addWorldDish(recipeId: RecipeId, g: THREE.Group): boolean {
  switch (recipeId) {
    // ------------------------------------------------------------------ Italy
    case 'bruschetta': {
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.15;
        const bread = mesh(new THREE.BoxGeometry(0.12, 0.04, 0.22), m('#c98a46', 0.8), x, 0.07, 0);
        bread.rotation.y = (i - 1) * 0.12;
        g.add(bread);
        for (let k = 0; k < 5; k++) {
          g.add(mesh(new THREE.BoxGeometry(0.028, 0.025, 0.028), m('#dc2626', 0.4), x + ((k % 2) - 0.5) * 0.04, 0.1, -0.07 + k * 0.035));
        }
        herb(g, x, 0.115, 0.02, '#15803d', 0.03);
      }
      return true;
    }
    case 'risotto': {
      const top = bowl(g, '#f8fafc', '#e8d6a8', 0.22, 0.08);
      const mound = mesh(new THREE.SphereGeometry(0.17, 16, 10), m('#ead9ae', 0.55), 0, top - 0.02, 0);
      mound.scale.set(1, 0.32, 1);
      g.add(mound);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const mush = mesh(new THREE.SphereGeometry(0.035, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), m('#7c4a21', 0.7), Math.cos(a) * 0.09, top + 0.03, Math.sin(a) * 0.09);
        mush.scale.y = 0.6;
        g.add(mush);
      }
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.008, 0.03), m('#fde68a', 0.4), 0.02, top + 0.06, 0));
      herb(g, -0.03, top + 0.06, 0.03);
      return true;
    }
    case 'lasagna': {
      g.add(mesh(new THREE.BoxGeometry(0.4, 0.07, 0.3), m('#b45309', 0.55), 0, 0.075, 0));
      const layers = ['#f1c27d', '#b91c1c', '#fff7ed', '#f1c27d', '#b91c1c', '#fff7ed'];
      layers.forEach((c, i) => g.add(mesh(new THREE.BoxGeometry(0.2, 0.022, 0.16), m(c, 0.55), 0.04, 0.12 + i * 0.022, 0)));
      g.add(mesh(new THREE.BoxGeometry(0.21, 0.02, 0.17), m('#c2410c', 0.65), 0.04, 0.12 + layers.length * 0.022, 0));
      herb(g, 0.04, 0.27, 0, '#16a34a', 0.04);
      return true;
    }
    // ------------------------------------------------------------------ Japan
    case 'ramen': {
      const top = bowl(g, '#991b1b', '#e9c98f', 0.23, 0.16);
      // Noodles peeking through the broth
      for (let i = 0; i < 6; i++) {
        const n = mesh(new THREE.TorusGeometry(0.05 + i * 0.012, 0.008, 4, 14, Math.PI * 0.9), m('#fde68a', 0.5), -0.04, top + 0.006, 0.02);
        n.rotation.x = -Math.PI / 2;
        n.rotation.z = i * 0.6;
        g.add(n);
      }
      // Soft egg halves
      for (const x of [0.07, 0.12]) {
        const white = mesh(new THREE.SphereGeometry(0.04, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), m('#fffbeb', 0.4), x, top, -0.06);
        const yolk = mesh(new THREE.CircleGeometry(0.022, 12), m('#f59e0b', 0.3), x, top + 0.041, -0.06);
        yolk.rotation.x = -Math.PI / 2;
        g.add(white, yolk);
      }
      // Chashu slices
      for (const z of [0.05, 0.09]) {
        const pork = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 14), m('#f9c4a5', 0.6), 0.06, top + 0.01, z);
        pork.rotation.z = 0.25;
        g.add(pork);
      }
      // Nori sheet
      const nori = mesh(new THREE.BoxGeometry(0.008, 0.12, 0.09), m('#14532d', 0.7), -0.15, top + 0.05, -0.04);
      nori.rotation.z = 0.25;
      g.add(nori);
      for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.006, 6), m('#4ade80', 0.5), -0.06 + (i % 3) * 0.03, top + 0.012, -0.07 + Math.floor(i / 3) * 0.03));
      // Chopsticks resting on the rim
      for (const z of [-0.012, 0.012]) {
        const stick = mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.42, 6), m('#7c2d12', 0.5), 0.02, top + 0.09, z + 0.14);
        stick.rotation.z = Math.PI / 2;
        stick.rotation.y = 0.15;
        g.add(stick);
      }
      return true;
    }
    case 'gyoza': {
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.095;
        const d = mesh(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI), m('#f3dfb8', 0.55), x, 0.06, -0.02);
        d.scale.set(0.75, 0.75, 1.3);
        d.rotation.y = Math.PI / 2;
        g.add(d);
        const crust = mesh(new THREE.BoxGeometry(0.075, 0.01, 0.14), m('#a16207', 0.7), x, 0.052, -0.02);
        g.add(crust);
      }
      smallDipBowl(g, 0.17, 0.16, '#3f1d0b');
      herb(g, 0, 0.12, -0.02, '#4ade80', 0.02);
      return true;
    }
    case 'tempura': {
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * 0.1;
        const body = mesh(new THREE.CapsuleGeometry(0.035, 0.2, 4, 8), m('#f2c463', 0.75), -0.02, 0.085, z);
        body.rotation.z = Math.PI / 2 - 0.25;
        body.rotation.y = (i - 1) * 0.2;
        const tail = mesh(new THREE.ConeGeometry(0.03, 0.06, 6), m('#ef4444', 0.5), 0.13, 0.12, z);
        tail.rotation.z = -Math.PI / 2;
        g.add(body, tail);
      }
      const lemon = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12, 1, false, 0, Math.PI), m('#fde047', 0.4), -0.16, 0.075, 0.14);
      lemon.rotation.x = Math.PI / 2;
      g.add(lemon);
      smallDipBowl(g, 0.17, 0.17, '#78350f');
      return true;
    }
    case 'mochi': {
      g.add(mesh(new THREE.BoxGeometry(0.4, 0.03, 0.18), m('#d6b98c', 0.75), 0, 0.06, 0));
      const cols = ['#fbcfe8', '#ffffff', '#bbf7d0'];
      cols.forEach((c, i) => {
        const ball = mesh(new THREE.SphereGeometry(0.06, 14, 10), m(c, 0.45), (i - 1) * 0.13, 0.115, 0);
        ball.scale.y = 0.85;
        g.add(ball);
      });
      const berry = mesh(new THREE.ConeGeometry(0.03, 0.06, 10), m('#dc2626', 0.4), -0.13, 0.19, 0);
      berry.rotation.x = Math.PI;
      g.add(berry, mesh(new THREE.ConeGeometry(0.02, 0.015, 6), m('#16a34a', 0.6), -0.13, 0.225, 0));
      return true;
    }
    // ------------------------------------------------------------------ Mexico
    case 'tacos': {
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * 0.12;
        // U-shaped corn tortilla lying along x, opening upwards
        const shellMat = new THREE.MeshStandardMaterial({ color: '#f5c542', roughness: 0.65, side: THREE.DoubleSide });
        const shell = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 16, 1, true, Math.PI, Math.PI), shellMat, 0, 0.125, z);
        shell.rotation.z = Math.PI / 2;
        const meat = mesh(new THREE.BoxGeometry(0.16, 0.035, 0.05), m('#c2410c', 0.7), 0, 0.1, z);
        const pine = mesh(new THREE.BoxGeometry(0.03, 0.025, 0.03), m('#fde047', 0.4), 0.04, 0.13, z);
        g.add(shell, meat, pine);
        herb(g, -0.04, 0.13, z, '#22c55e', 0.03);
        g.add(mesh(new THREE.BoxGeometry(0.025, 0.012, 0.02), m('#f5f5f4', 0.5), 0.0, 0.13, z + 0.01));
      }
      const lime = mesh(new THREE.SphereGeometry(0.04, 10, 8, 0, Math.PI), m('#84cc16', 0.45), 0.2, 0.07, 0.14);
      g.add(lime);
      return true;
    }
    case 'nachos': {
      const chipMat = m('#fbbf24', 0.6);
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39;
        const r = 0.04 + (i % 5) * 0.035;
        const chip = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.008, 3), chipMat, Math.cos(a) * r, 0.065 + (i % 4) * 0.022, Math.sin(a) * r);
        chip.rotation.set(0.4 * Math.sin(i), a, 0.35 * Math.cos(i));
        g.add(chip);
      }
      for (let i = 0; i < 7; i++) {
        const blob = mesh(new THREE.SphereGeometry(0.035, 8, 6), m('#f59e0b', 0.3), Math.cos(i * 0.9) * 0.08, 0.13, Math.sin(i * 0.9) * 0.08);
        blob.scale.y = 0.4;
        g.add(blob);
      }
      for (let i = 0; i < 4; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.018, 0.007, 4, 10), m('#15803d', 0.5), Math.cos(i * 1.7) * 0.06, 0.15, Math.sin(i * 1.7) * 0.06);
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
      }
      smallDipBowl(g, 0.19, -0.15, '#dc2626');
      return true;
    }
    case 'burrito': {
      for (const side of [-1, 1]) {
        const half = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 16), m('#e9d3a3', 0.75), side * 0.09, 0.115, 0);
        half.rotation.z = Math.PI / 2;
        half.rotation.y = side * 0.25;
        g.add(half);
        const fill = mesh(new THREE.CircleGeometry(0.058, 16), m('#92400e', 0.6), side * 0.009, 0.115, side * 0.02);
        fill.rotation.y = side > 0 ? -Math.PI / 2 + 0.25 : Math.PI / 2 + 0.25;
        g.add(fill);
        for (const [c, dy] of [['#facc15', 0.02], ['#16a34a', -0.02], ['#f5f5f4', 0]] as const) {
          const bit = mesh(new THREE.SphereGeometry(0.014, 6, 4), m(c, 0.5), side * 0.012, 0.115 + dy, side * 0.02 + dy);
          g.add(bit);
        }
      }
      smallDipBowl(g, 0, 0.17, '#b91c1c');
      return true;
    }
    case 'churros': {
      for (let i = 0; i < 4; i++) {
        const stick = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), m('#b45309', 0.75), -0.06 + i * 0.04, 0.08 + (i % 2) * 0.01, -0.03);
        stick.rotation.z = Math.PI / 2;
        stick.rotation.y = 0.3 + i * 0.05;
        g.add(stick);
      }
      const cup = mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.1, 16), m('#fef3c7', 0.35), 0.15, 0.1, 0.13);
      const choc = mesh(new THREE.CircleGeometry(0.06, 16), m('#3f1d0b', 0.3), 0.15, 0.151, 0.13);
      choc.rotation.x = -Math.PI / 2;
      g.add(cup, choc);
      return true;
    }
    // ------------------------------------------------------------------ Azerbaijan
    case 'lula_kebab': {
      const lavash = mesh(new THREE.BoxGeometry(0.46, 0.012, 0.3), m('#efd9a7', 0.85), 0, 0.055, 0);
      g.add(lavash);
      for (const z of [-0.06, 0.06]) {
        const skewer = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.52, 6), m('#d4d4d8', 0.25, 0.8), 0, 0.09, z);
        skewer.rotation.z = Math.PI / 2;
        const meat = mesh(new THREE.CapsuleGeometry(0.03, 0.28, 4, 10), m('#7c2d12', 0.7), 0, 0.09, z);
        meat.rotation.z = Math.PI / 2;
        g.add(skewer, meat);
      }
      for (let i = 0; i < 4; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.03, 0.008, 4, 12), m('#a21caf', 0.5), -0.16 + i * 0.1, 0.07, 0.13);
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
      }
      const tomato = mesh(new THREE.SphereGeometry(0.035, 10, 8), m('#dc2626', 0.35), 0.17, 0.09, -0.12);
      g.add(tomato);
      herb(g, -0.15, 0.075, -0.13, '#15803d', 0.04);
      return true;
    }
    case 'azeri_tea': {
      const saucer = mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.015, 18), m('#f8fafc', 0.2), -0.05, 0.055, 0);
      g.add(saucer);
      // Pear-shaped armudu glass
      const profile = [
        new THREE.Vector2(0.0, 0),
        new THREE.Vector2(0.03, 0),
        new THREE.Vector2(0.045, 0.03),
        new THREE.Vector2(0.03, 0.08),
        new THREE.Vector2(0.04, 0.13),
        new THREE.Vector2(0.048, 0.15),
      ];
      const glass = mesh(
        new THREE.LatheGeometry(profile, 18),
        new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, roughness: 0.05 }),
        -0.05, 0.063, 0
      );
      const teaProfile = profile.slice(0, 5).map((v) => new THREE.Vector2(v.x * 0.9, v.y));
      const tea = mesh(new THREE.LatheGeometry(teaProfile, 18), m('#9a1b0d', 0.2), -0.05, 0.064, 0);
      g.add(tea, glass);
      const lemon = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 12), m('#fde047', 0.4), 0.13, 0.065, 0.1);
      g.add(lemon);
      const jarBowl = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.035, 14), m('#e0f2fe', 0.15), 0.13, 0.07, -0.09);
      const jam = mesh(new THREE.CircleGeometry(0.045, 14), m('#7f1d1d', 0.25), 0.13, 0.089, -0.09);
      jam.rotation.x = -Math.PI / 2;
      g.add(jarBowl, jam);
      return true;
    }
    case 'qutab': {
      for (let i = 0; i < 3; i++) {
        const q = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.018, 18, 1, false, 0, Math.PI), m('#d9a55a', 0.75), (i - 1) * 0.05, 0.065 + i * 0.012, (i - 1) * 0.06);
        q.rotation.y = 0.5 + i * 0.4;
        g.add(q);
        const edge = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 18, 1, true, 0, Math.PI), m('#65a30d', 0.6), (i - 1) * 0.05, 0.066 + i * 0.012, (i - 1) * 0.06);
        edge.rotation.y = 0.5 + i * 0.4;
        g.add(edge);
      }
      // Sumac dusting
      for (let i = 0; i < 8; i++) g.add(mesh(new THREE.SphereGeometry(0.008, 4, 3), m('#991b1b', 0.6), Math.cos(i) * 0.08, 0.1, Math.sin(i * 1.3) * 0.08));
      smallDipBowl(g, 0.18, 0.15, '#f8fafc');
      return true;
    }
    case 'dolma': {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const roll = mesh(new THREE.CapsuleGeometry(0.03, 0.06, 4, 8), m(i % 2 ? '#4d7c0f' : '#3f6212', 0.65), Math.cos(a) * 0.14, 0.08, Math.sin(a) * 0.14);
        roll.rotation.z = Math.PI / 2;
        roll.rotation.y = -a;
        g.add(roll);
      }
      // Garlic yogurt in the middle
      const yog = mesh(new THREE.SphereGeometry(0.07, 12, 8), m('#fafaf9', 0.35), 0, 0.07, 0);
      yog.scale.y = 0.45;
      g.add(yog);
      herb(g, 0, 0.1, 0, '#16a34a', 0.025);
      return true;
    }
    case 'pakhlava': {
      for (let i = 0; i < 6; i++) {
        const x = ((i % 3) - 1) * 0.12;
        const z = (Math.floor(i / 3) - 0.5) * 0.13;
        const piece = mesh(new THREE.OctahedronGeometry(0.07, 0), m('#d97706', 0.45), x, 0.075, z);
        piece.scale.set(1, 0.35, 0.7);
        piece.rotation.y = Math.PI / 4;
        g.add(piece);
        g.add(mesh(new THREE.SphereGeometry(0.014, 6, 4), m('#78350f', 0.7), x, 0.1, z));
      }
      return true;
    }
    case 'plov': {
      // Golden lavash crown (gazmag) cut open to show saffron rice
      const crown = mesh(new THREE.SphereGeometry(0.17, 20, 12, 0, Math.PI * 1.45, 0, Math.PI / 2), m('#c2771f', 0.6), 0, 0.05, 0);
      (crown.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      crown.scale.y = 0.85;
      g.add(crown);
      const rice = mesh(new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), m('#facc15', 0.75), 0, 0.05, 0);
      rice.scale.y = 0.7;
      g.add(rice);
      for (let i = 0; i < 10; i++) {
        const a = i * 0.63;
        const c = i % 3 === 0 ? '#f97316' : i % 3 === 1 ? '#7c2d12' : '#fef3c7';
        g.add(mesh(new THREE.SphereGeometry(0.018, 6, 4), m(c, 0.6), Math.cos(a) * 0.2, 0.065, Math.sin(a) * 0.2));
      }
      g.add(mesh(new THREE.SphereGeometry(0.02, 6, 4), m('#b91c1c', 0.4), 0.02, 0.16, 0.03));
      return true;
    }
    default:
      return false;
  }
}
