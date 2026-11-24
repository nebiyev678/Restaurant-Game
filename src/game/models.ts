import * as THREE from 'three';
import { addWorldDish } from './worldDishes';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  CafeThemeDef,
  ClothingItem,
  CustomerArchetype,
  HouseDef,
  RecipeId,
  StaffRole,
  StationType,
  VehicleDef,
} from './types';

let _sharedShadowTex: THREE.CanvasTexture | null = null;

export function getContactShadowTexture(): THREE.CanvasTexture {
  if (_sharedShadowTex) return _sharedShadowTex;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.48)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.2)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _sharedShadowTex = tex;
  return tex;
}

export function createContactShadow(radiusX = 0.65, radiusZ = 0.65, opacity = 0.75): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radiusX * 2, radiusZ * 2), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

// Procedural Canvas Textures (zero external 404s)
export function createCheckerTexture(
  colorA = '#f8fafc',
  colorB = '#cbd5e1',
  repeat = 6,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const half = 128;
  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);

  // Subtle stone/ceramic speckles
  for (let i = 0; i < 320; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.04)';
    ctx.fillRect((i * 59) % 256, (i * 97) % 256, 3, 3);
  }

  ctx.strokeStyle = 'rgba(120, 68, 36, 0.16)';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, half, half);
  ctx.strokeRect(half, 0, half, half);
  ctx.strokeRect(0, half, half, half);
  ctx.strokeRect(half, half, half, half);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createTileGridTexture(
  colorA = '#f4d7ba',
  colorB = '#edd0b2',
  groutColor = 'rgba(148, 92, 56, 0.24)',
  repeatX = 7,
  repeatY = 7,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const half = 128;

  ctx.fillStyle = colorA;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = colorB;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);

  // Warm ceramic glaze & subtle stone variation
  for (let i = 0; i < 360; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(120,68,36,0.04)';
    ctx.fillRect((i * 53) % 256, (i * 89) % 256, 4, 4);
  }

  ctx.strokeStyle = groutColor;
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, half, half);
  ctx.strokeRect(half, 0, half, half);
  ctx.strokeRect(0, half, half, half);
  ctx.strokeRect(half, half, half, half);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const parse = (h: string) => {
    const clean = h.replace('#', '');
    const n = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(hexA);
  const [r2, g2, b2] = parse(hexB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export function createPrettyDiningFloorTextures(
  theme: CafeThemeDef,
  worldW: number,
  worldD: number,
  maxAnisotropy = 4
): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = size;
  mapCanvas.height = size;
  const ctx = mapCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughSize = 512;
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughSize;
  roughCanvas.height = roughSize;
  const rCtx = roughCanvas.getContext('2d')!;

  const borderPx = 86;
  const innerStart = borderPx;
  const innerSpan = size - borderPx * 2;
  const rScale = roughSize / size;

  // Base grout / sub-surface
  const groutColor =
    theme.id === 'modern_loft'
      ? '#475569'
      : theme.id === 'royal_salon'
        ? '#cbd5e1'
        : theme.id === 'french_patisserie'
          ? '#d6c6cc'
          : '#c9a684';

  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#555555'; // recessed grout
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#dcdcdc'; // matte grout (~0.86 roughness)
  rCtx.fillRect(0, 0, roughSize, roughSize);

  // 1. Inner Dining Field
  ctx.save();
  ctx.beginPath();
  ctx.rect(innerStart, innerStart, innerSpan, innerSpan);
  ctx.clip();

  if (theme.floorMode === 'wood') {
    // Rich Herringbone Parquet Wood (English Tea Room)
    const plankW = 36;
    const plankL = 108;
    ctx.fillStyle = mixHex(theme.floorPrimary, theme.floorSecondary, 0.35);
    ctx.fillRect(innerStart, innerStart, innerSpan, innerSpan);
    bCtx.fillStyle = '#d4d4d4';
    bCtx.fillRect(innerStart, innerStart, innerSpan, innerSpan);
    rCtx.fillStyle = '#686868'; // satin wood varnish (~0.41)
    rCtx.fillRect(
      innerStart * rScale,
      innerStart * rScale,
      innerSpan * rScale,
      innerSpan * rScale
    );

    const drawPlank = (x: number, y: number, w: number, h: number, idx: number) => {
      const shade = ((idx * 37) % 11) / 10;
      const baseCol =
        idx % 3 === 0
          ? mixHex(theme.floorPrimary, theme.floorSecondary, 0.18 + shade * 0.22)
          : mixHex(theme.floorPrimary, '#c08446', 0.1 + shade * 0.25);
      ctx.fillStyle = baseCol;
      ctx.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);

      // Wood grain streaks
      ctx.fillStyle = 'rgba(45, 20, 5, 0.12)';
      for (let g = 0; g < 3; g++) {
        if (w > h) {
          ctx.fillRect(x + 4, y + 6 + g * 10, w - 8, 2);
        } else {
          ctx.fillRect(x + 6 + g * 10, y + 4, 2, h - 8);
        }
      }
      // Subtle top bevel
      ctx.strokeStyle = 'rgba(255, 244, 224, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

      bCtx.fillStyle = '#dcdcdc';
      bCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
      bCtx.strokeStyle = '#606060';
      bCtx.lineWidth = 2;
      bCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    };

    let idx = 0;
    for (let row = -2; row < 28; row++) {
      for (let col = -2; col < 16; col++) {
        const bx = innerStart + col * plankL + (row % 2) * (plankL / 2);
        const by = innerStart + row * (plankW * 2);
        drawPlank(bx, by, plankL, plankW, idx++);
        drawPlank(bx + plankW, by + plankW, plankW, plankL, idx++);
      }
    }
  } else {
    // Luxury Designer Ceramic / Marble / Terrazzo Tile Field with Cabochon Corner Inlays
    const cols = Math.max(7, Math.round((worldW - 1.1) / 0.94));
    const rows = Math.max(9, Math.round((worldD - 1.1) / 0.94));
    const tileW = innerSpan / cols;
    const tileH = innerSpan / rows;
    const groutGap = 3.2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = innerStart + c * tileW;
        const y = innerStart + r * tileH;
        const alt = (r + c) % 2 === 0;
        const toneSeed = ((r * 17 + c * 31) % 9) / 8;
        const baseTile = alt
          ? mixHex(theme.floorPrimary, '#ffffff', toneSeed * 0.14)
          : mixHex(theme.floorSecondary, theme.floorPrimary, toneSeed * 0.25);

        ctx.fillStyle = baseTile;
        ctx.fillRect(x + groutGap / 2, y + groutGap / 2, tileW - groutGap, tileH - groutGap);

        // Organic stone veining / ceramic glaze highlights
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + groutGap / 2, y + groutGap / 2, tileW - groutGap, tileH - groutGap);
        ctx.clip();

        if (theme.id === 'modern_loft') {
          // Terrazzo mineral & copper flecks
          for (let k = 0; k < 16; k++) {
            const fx = x + 6 + (((r * 29 + c * 43 + k * 53) % 88) / 100) * (tileW - 12);
            const fy = y + 6 + (((r * 41 + c * 19 + k * 67) % 88) / 100) * (tileH - 12);
            ctx.fillStyle =
              k % 4 === 0
                ? 'rgba(234, 88, 12, 0.35)'
                : k % 2 === 0
                  ? 'rgba(226, 232, 240, 0.22)'
                  : 'rgba(15, 23, 42, 0.3)';
            ctx.beginPath();
            ctx.arc(fx, fy, 1.5 + (k % 3) * 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Soft travertine / marble organic veins
          ctx.strokeStyle =
            theme.id === 'royal_salon'
              ? 'rgba(148, 163, 184, 0.26)'
              : theme.id === 'french_patisserie'
                ? 'rgba(219, 39, 119, 0.08)'
                : 'rgba(180, 120, 72, 0.11)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          const vx = x + ((r * 13 + c * 23) % 30);
          ctx.moveTo(vx, y);
          ctx.bezierCurveTo(
            x + tileW * 0.35,
            y + tileH * 0.45,
            x + tileW * 0.65,
            y + tileH * 0.55,
            x + tileW,
            y + tileH * (0.4 + toneSeed * 0.4)
          );
          ctx.stroke();

          // Warm ceramic bevel highlight (top & left edge) & soft shadow (bottom & right)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.fillRect(x + groutGap / 2, y + groutGap / 2, tileW - groutGap, 2.5);
          ctx.fillRect(x + groutGap / 2, y + groutGap / 2, 2.5, tileH - groutGap);
          ctx.fillStyle = 'rgba(90, 48, 22, 0.09)';
          ctx.fillRect(x + groutGap / 2, y + tileH - groutGap / 2 - 2.5, tileW - groutGap, 2.5);
          ctx.fillRect(x + tileW - groutGap / 2 - 2.5, y + groutGap / 2, 2.5, tileH - groutGap);
        }
        ctx.restore();

        // Bump & roughness per tile face
        bCtx.fillStyle = '#e8e8e8';
        bCtx.fillRect(x + groutGap / 2, y + groutGap / 2, tileW - groutGap, tileH - groutGap);
        rCtx.fillStyle = theme.id === 'royal_salon' ? '#404040' : '#585858'; // satin-gloss tile (~0.25-0.34)
        rCtx.fillRect(
          (x + groutGap / 2) * rScale,
          (y + groutGap / 2) * rScale,
          (tileW - groutGap) * rScale,
          (tileH - groutGap) * rScale
        );
      }
    }

    // Contrast Diamond Cabochon Corner Inlays at every 4-tile intersection
    const cabSize = Math.min(tileW, tileH) * 0.19;
    const cabOuter =
      theme.id === 'royal_salon'
        ? '#1d4ed8'
        : theme.id === 'modern_loft'
          ? '#c2410c'
          : mixHex(theme.trimColor, theme.wainscotColor, 0.25);
    const cabInner =
      theme.id === 'royal_salon'
        ? '#facc15'
        : theme.id === 'modern_loft'
          ? '#fb923c'
          : '#fff3dc';

    for (let r = 1; r < rows; r++) {
      for (let c = 1; c < cols; c++) {
        const ix = innerStart + c * tileW;
        const iy = innerStart + r * tileH;

        ctx.save();
        ctx.translate(ix, iy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = groutColor;
        ctx.fillRect(-cabSize * 0.72, -cabSize * 0.72, cabSize * 1.44, cabSize * 1.44);
        ctx.fillStyle = cabOuter;
        ctx.fillRect(-cabSize * 0.56, -cabSize * 0.56, cabSize * 1.12, cabSize * 1.12);
        ctx.fillStyle = cabInner;
        ctx.fillRect(-cabSize * 0.22, -cabSize * 0.22, cabSize * 0.44, cabSize * 0.44);
        ctx.restore();
      }
    }

    // Subtle Central Bistro Starburst Mosaic Medallion
    const mCx = size / 2;
    const mCy = size / 2;
    const mRad = 112;
    ctx.save();
    ctx.beginPath();
    ctx.arc(mCx, mCy, mRad + 10, 0, Math.PI * 2);
    ctx.fillStyle = mixHex(theme.floorPrimary, '#fffaf2', 0.35);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = mixHex(theme.wainscotColor, theme.floorPrimary, 0.28);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(mCx, mCy, mRad - 6, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = mixHex(theme.trimColor, theme.floorPrimary, 0.35);
    ctx.stroke();

    // 8-point geometric compass petals
    for (let p = 0; p < 8; p++) {
      ctx.save();
      ctx.translate(mCx, mCy);
      ctx.rotate((p * Math.PI) / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-15, -42);
      ctx.lineTo(0, -mRad + 14);
      ctx.lineTo(15, -42);
      ctx.closePath();
      ctx.fillStyle =
        p % 2 === 0
          ? mixHex(theme.trimColor, theme.floorPrimary, 0.48)
          : mixHex(theme.wainscotColor, theme.floorPrimary, 0.52);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(mCx, mCy, 22, 0, Math.PI * 2);
    ctx.fillStyle = mixHex(theme.floorPrimary, '#ffffff', 0.45);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = mixHex(theme.wainscotColor, theme.floorPrimary, 0.25);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 2. Ornate Perimeter Mosaic Border Frame (all 4 edges + corner rosettes)
  const frameOuter = mixHex(theme.wainscotColor, '#5a321a', 0.28);
  const frameBand = mixHex(theme.floorPrimary, '#fff7ec', 0.45);
  const frameAccent = theme.trimColor;
  const frameGold = theme.id === 'royal_salon' ? '#facc15' : '#e6a855';

  // Outer wood/stone frame border
  ctx.strokeStyle = frameOuter;
  ctx.lineWidth = 34;
  ctx.strokeRect(17, 17, size - 34, size - 34);

  // Cream mosaic runner band
  ctx.strokeStyle = frameBand;
  ctx.lineWidth = 42;
  ctx.strokeRect(55, 55, size - 110, size - 110);

  // Inner pinstripe framing
  ctx.strokeStyle = frameAccent;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, size - 72, size - 72);
  ctx.strokeRect(74, 74, size - 148, size - 148);
  ctx.strokeStyle = frameOuter;
  ctx.lineWidth = 6;
  ctx.strokeRect(82, 82, size - 164, size - 164);

  // Geometric diamond-and-link mosaic along all 4 perimeter bands
  const step = 36;
  const drawBorderMotif = (mx: number, my: number, i: number) => {
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i % 2 === 0 ? frameAccent : frameOuter;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = frameGold;
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();
  };
  let mIdx = 0;
  for (let p = 104; p <= size - 104; p += step) {
    drawBorderMotif(p, 55, mIdx);
    drawBorderMotif(p, size - 55, mIdx);
    drawBorderMotif(55, p, mIdx);
    drawBorderMotif(size - 55, p, mIdx);
    mIdx++;
  }

  // Ornate Corner Rosette Squares
  for (const [cx, cy] of [
    [55, 55],
    [size - 55, 55],
    [55, size - 55],
    [size - 55, size - 55],
  ]) {
    ctx.fillStyle = frameOuter;
    ctx.fillRect(cx - 24, cy - 24, 48, 48);
    ctx.fillStyle = frameBand;
    ctx.fillRect(cx - 19, cy - 19, 38, 38);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = frameAccent;
    ctx.fillRect(-12, -12, 24, 24);
    ctx.fillStyle = frameGold;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
  }

  // Bump & Roughness for border frame
  bCtx.strokeStyle = '#d8d8d8';
  bCtx.lineWidth = 72;
  bCtx.strokeRect(42, 42, size - 84, size - 84);
  bCtx.strokeStyle = '#606060';
  bCtx.lineWidth = 4;
  bCtx.strokeRect(36, 36, size - 72, size - 72);
  bCtx.strokeRect(78, 78, size - 156, size - 156);

  rCtx.strokeStyle = '#626262';
  rCtx.lineWidth = 42 * rScale;
  rCtx.strokeRect(42 * rScale, 42 * rScale, (size - 84) * rScale, (size - 84) * rScale);

  const map = new THREE.CanvasTexture(mapCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, bumpMap, roughnessMap };
}

export function createPrettyKitchenFloorTextures(
  theme: CafeThemeDef,
  repeatX = 3,
  repeatY = 6,
  maxAnisotropy = 4
): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = size;
  mapCanvas.height = size;
  const ctx = mapCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#b8b2a8';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#585858';
  bCtx.fillRect(0, 0, size, size);

  const grid = 4;
  const cell = size / grid;
  const gap = 5;

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const x = c * cell;
      const y = r * cell;
      const alt = (r + c) % 2 === 0;
      ctx.fillStyle = alt ? theme.kitchenPrimary : theme.kitchenSecondary;
      ctx.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);

      // Subtle hygienic porcelain speckles & top highlight
      for (let k = 0; k < 28; k++) {
        ctx.fillStyle = k % 2 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(100,116,139,0.08)';
        ctx.fillRect(
          x + 6 + ((k * 37 + r * 19) % (cell - 12)),
          y + 6 + ((k * 53 + c * 23) % (cell - 12)),
          2.5,
          2.5
        );
      }
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.fillRect(x + gap / 2, y + gap / 2, cell - gap, 2.5);
      ctx.fillRect(x + gap / 2, y + gap / 2, 2.5, cell - gap);

      bCtx.fillStyle = '#e5e5e5';
      bCtx.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
    }
  }

  // Crisp slate diamond dot inlays at corners
  const dot = 15;
  for (let r = 0; r <= grid; r++) {
    for (let c = 0; c <= grid; c++) {
      ctx.save();
      ctx.translate(c * cell, r * cell);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#78716c';
      ctx.fillRect(-dot / 2, -dot / 2, dot, dot);
      ctx.fillStyle = '#d6d3d1';
      ctx.fillRect(-dot * 0.22, -dot * 0.22, dot * 0.44, dot * 0.44);
      ctx.restore();
    }
  }

  const map = new THREE.CanvasTexture(mapCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(repeatX, repeatY);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createSubwayTileTexture(
  repeatX = 6,
  repeatY = 3,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dcd6ce'; // warm light grout
  ctx.fillRect(0, 0, 256, 256);

  const tileW = 60;
  const tileH = 28;
  for (let row = 0; row < 9; row++) {
    const offset = (row % 2) * (tileW / 2);
    for (let col = -1; col < 5; col++) {
      ctx.fillStyle = (row + col) % 3 === 0 ? '#f7f4ef' : '#ffffff';
      ctx.fillRect(col * (tileW + 4) + offset, row * (tileH + 4), tileW, tileH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createWoodTexture(
  base = '#b4692e',
  grain = '#78350f',
  repeat = 4,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    // Alternating subtle plank warmth
    ctx.fillStyle = (y / 32) % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, y, 256, 32);

    ctx.fillStyle = grain;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(0, y, 256, 2);
    ctx.globalAlpha = 0.11;
    ctx.fillRect((y * 3) % 256, y + 7, 130, 3);
    ctx.fillRect((y * 7) % 256, y + 19, 95, 2.5);
    ctx.globalAlpha = 0.18;
    ctx.fillRect(((y * 5) % 200) + 20, y, 2, 32);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createGrassTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5bb368';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 900; i++) {
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(134, 239, 172, 0.25)' : i % 3 === 1 ? 'rgba(21, 128, 61, 0.2)' : 'rgba(163, 230, 53, 0.14)';
    ctx.fillRect((i * 47) % 256, (i * 83) % 256, 3, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSidewalkTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dde3ea';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(51,65,85,0.06)';
    ctx.fillRect((i * 71) % 256, (i * 37) % 256, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 10);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBrickTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#cbd5e1'; // mortar
  ctx.fillRect(0, 0, 256, 256);

  const brickH = 28;
  const brickW = 60;
  for (let row = 0; row < 10; row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < 5; col++) {
      const tones = ['#b91c1c', '#991b1b', '#c2410c', '#a13318'];
      ctx.fillStyle = tones[(row * 3 + col + 4) % tones.length];
      ctx.fillRect(col * (brickW + 4) + offset, row * (brickH + 4), brickW, brickH);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createRoadTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#2b3544';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle asphalt grain
  for (let i = 0; i < 650; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect((i * 73) % 256, (i * 41) % 256, 2.5, 2.5);
  }

  // Center dashed yellow double-line
  ctx.fillStyle = '#facc15';
  ctx.fillRect(118, 16, 7, 88);
  ctx.fillRect(131, 16, 7, 88);
  ctx.fillRect(118, 148, 7, 88);
  ctx.fillRect(131, 148, 7, 88);

  // Clean outer white edge lines & raised stone curbs
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(16, 0, 4, 256);
  ctx.fillRect(236, 0, 4, 256);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 12, 256);
  ctx.fillRect(244, 0, 12, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

let cachedCheckeredTowelTex: THREE.CanvasTexture | null = null;
function getCheckeredTowelTexture(): THREE.CanvasTexture {
  if (cachedCheckeredTowelTex) return cachedCheckeredTowelTex;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const size = 16;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const even = (x + y) % 2 === 0;
      ctx.fillStyle = even ? '#f8fafc' : '#dc2626';
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(0, 0, 64, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.5, 2);
  cachedCheckeredTowelTex = tex;
  return tex;
}

export interface CharacterParts {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torsoMesh: THREE.Mesh;
  apronGroup: THREE.Group;
  apronBibGroup: THREE.Group;
  towelGroup: THREE.Group;
  vestGroup: THREE.Group;
  scarfGroup: THREE.Group;
  suitGroup: THREE.Group;
  goldTrimGroup: THREE.Group;
  buttonsGroup: THREE.Group;
  doubleButtonsGroup: THREE.Group;
  collarTrimMesh: THREE.Mesh;
  tieMesh: THREE.Mesh;
  sleeveCuffMeshes: THREE.Mesh[];
  hatAnchor: THREE.Group;
  watchMesh: THREE.Mesh;
  carryAnchor: THREE.Group;
  trayMesh: THREE.Group;
  headGroup: THREE.Group;
  hairCrestGroup: THREE.Group;
  shirtMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  cuffMat: THREE.MeshStandardMaterial;
  shoeMat: THREE.MeshStandardMaterial;
  apronMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  forearmMat: THREE.MeshStandardMaterial;
  vestMat: THREE.MeshStandardMaterial;
  scarfMat: THREE.MeshStandardMaterial;
  collarTrimMat: THREE.MeshStandardMaterial;
}

export interface CharacterOptions {
  shirtColor?: string;
  pantsColor?: string;
  apronColor?: string;
  shoeColor?: string;
  vestColor?: string;
  scarfColor?: string;
  trimColor?: string;
  apronStyle?: 'bib' | 'waist';
  hasTowel?: boolean;
  longSleeves?: boolean;
  skinColor?: string;
  hairColor?: string;
  hasApron?: boolean;
  hasSuit?: boolean;
  hatStyle?: 'none' | 'cap' | 'toque' | 'fedora' | 'crown' | 'visor' | 'beret';
  hatColor?: string;
  watchColor?: string;
  scale?: number;
}

export function createCharacterModel(opts: CharacterOptions = {}): CharacterParts {
  const root = new THREE.Group();
  const s = opts.scale ?? 1;
  root.scale.setScalar(s);

  // Soft grounded contact shadow
  root.add(createContactShadow(0.45, 0.45, 0.62));

  const skinColor = opts.skinColor ?? '#f4c5a1';
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.64,
    metalness: 0.02,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: opts.shirtColor ?? '#f5efe6',
    roughness: 0.62,
    metalness: 0.03,
  });
  const pantsColor = opts.pantsColor ?? '#463b38';
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColor,
    roughness: 0.78,
    metalness: 0.03,
  });
  const cuffMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pantsColor).multiplyScalar(0.84),
    roughness: 0.76,
    metalness: 0.03,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: opts.shoeColor ?? '#1e293b',
    roughness: 0.42,
    metalness: 0.08,
  });
  const whiteTrimMat = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    roughness: 0.52,
    metalness: 0.04,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    color: opts.apronColor ?? '#dc2626',
    roughness: 0.64,
    metalness: 0.03,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: opts.hairColor ?? '#5a3826',
    roughness: 0.76,
    metalness: 0.04,
  });
  const collarTrimMat = new THREE.MeshStandardMaterial({
    color: opts.trimColor ?? '#dc2626',
    roughness: 0.5,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: opts.vestColor ?? '#f97316',
    roughness: 0.62,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: opts.scarfColor ?? '#dc2626',
    roughness: 0.56,
  });
  const isLongSleeves = opts.longSleeves ?? Boolean(opts.hasSuit);
  const forearmMat = new THREE.MeshStandardMaterial({
    color: isLongSleeves ? shirtMat.color : skinMat.color,
    roughness: isLongSleeves ? 0.62 : 0.64,
    metalness: 0.02,
  });

  // Sculpted Cuffed Trousers & Chunky High-Top Sneakers (hip pivot y = 0.62)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.62, 0);

    const legMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.106, 0.28, 6, 12), pantsMat);
    legMesh.position.y = -0.20;
    legMesh.castShadow = true;
    legPivot.add(legMesh);

    const legCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.065, 14), cuffMat);
    legCuff.position.y = -0.37;
    legCuff.castShadow = true;
    legPivot.add(legCuff);

    const ankleCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.104, 0.112, 0.085, 14),
      whiteTrimMat
    );
    ankleCollar.position.y = -0.435;
    legPivot.add(ankleCollar);

    const shoeUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.108, 0.125, 6, 12), shoeMat);
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.position.set(0, -0.505, 0.045);
    shoeUpper.castShadow = true;
    legPivot.add(shoeUpper);

    const shoeTongue = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.04, 0.11), whiteTrimMat);
    shoeTongue.position.set(0, -0.455, 0.095);
    shoeTongue.rotation.x = 0.28;
    legPivot.add(shoeTongue);

    const shoeToe = new THREE.Mesh(
      new THREE.SphereGeometry(0.104, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
      whiteTrimMat
    );
    shoeToe.rotation.x = Math.PI / 2;
    shoeToe.position.set(0, -0.515, 0.115);
    legPivot.add(shoeToe);

    const shoeSole = new THREE.Mesh(new THREE.CapsuleGeometry(0.114, 0.145, 4, 12), whiteTrimMat);
    shoeSole.rotation.x = Math.PI / 2;
    shoeSole.scale.set(1.04, 1.0, 0.42);
    shoeSole.position.set(0, -0.572, 0.048);
    legPivot.add(shoeSole);

    return legPivot;
  };

  const leftLeg = makeLeg(-0.138);
  const rightLeg = makeLeg(0.138);
  root.add(leftLeg, rightLeg);

  // Tapered Rounded Torso + Crisp Standing Collar (y = 0.64 to 1.32)
  const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.235, 0.64, 18), shirtMat);
  torsoMesh.scale.set(1.06, 1, 0.72);
  torsoMesh.position.y = 0.96;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  root.add(torsoMesh);

  // Shirt collar flaps
  for (const side of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.07, 0.055), shirtMat);
    flap.position.set(side * 0.078, 1.27, 0.125);
    flap.rotation.y = side * -0.42;
    flap.rotation.z = side * -0.22;
    root.add(flap);
  }
  const collarTrimMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.122, 0.017, 8, 16),
    collarTrimMat
  );
  collarTrimMesh.rotation.x = Math.PI / 2;
  collarTrimMesh.position.set(0, 1.285, 0.015);
  collarTrimMesh.visible = Boolean(opts.trimColor) && !opts.hasSuit && !opts.vestColor;
  root.add(collarTrimMesh);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.14, 12), skinMat);
  neck.position.y = 1.34;
  root.add(neck);

  // Twin small red shirt buttons (starter owner-chef)
  const buttonsGroup = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), collarTrimMat);
    btn.position.set(0, 1.225 - i * 0.048, 0.185);
    buttonsGroup.add(btn);
  }
  buttonsGroup.visible = Boolean(opts.trimColor) && !opts.hasSuit && !opts.vestColor && !opts.scarfColor;
  root.add(buttonsGroup);

  // Double-breasted buttons (Smart Uniform Upgrade 2)
  const doubleButtonsGroup = new THREE.Group();
  for (let row = 0; row < 3; row++) {
    for (const bx of [-0.065, 0.065]) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), collarTrimMat);
      btn.position.set(bx, 1.15 - row * 0.08, 0.185);
      doubleButtonsGroup.add(btn);
    }
  }
  doubleButtonsGroup.visible = false;
  root.add(doubleButtonsGroup);

  // Apron Group (Waist Skirt + Bib + Crossed Back X-Straps + Bow + Checkered Towel)
  const apronGroup = new THREE.Group();
  const apronSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.268, 0.292, 0.42, 18),
    apronMat
  );
  apronSkirt.scale.set(1.08, 1, 0.76);
  apronSkirt.position.set(0, 0.79, 0.012);
  apronSkirt.castShadow = true;
  apronGroup.add(apronSkirt);

  const waistBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.272, 0.272, 0.048, 18),
    apronMat
  );
  waistBand.scale.set(1.085, 1, 0.765);
  waistBand.position.set(0, 0.99, 0.012);
  apronGroup.add(waistBand);

  // Back tied apron bow & ribbon tails
  const bowKnot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), apronMat);
  bowKnot.position.set(0, 0.985, -0.205);
  apronGroup.add(bowKnot);
  for (const side of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.068, 4, 8), apronMat);
    loop.position.set(side * 0.06, 0.99, -0.21);
    loop.rotation.z = side * 1.15;
    loop.rotation.x = 0.2;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.135, 0.018), apronMat);
    tail.position.set(side * 0.045, 0.895, -0.212);
    tail.rotation.z = side * 0.28;
    apronGroup.add(loop, tail);
  }

  // Chest bib + shoulder straps + crossed X-straps on back
  const apronBibGroup = new THREE.Group();
  const chestBib = new THREE.Mesh(
    new THREE.CylinderGeometry(0.264, 0.268, 0.23, 14, 1, false, -0.64, 1.28),
    apronMat
  );
  chestBib.scale.set(1.06, 1, 0.74);
  chestBib.position.set(0, 1.105, 0.014);
  chestBib.castShadow = true;
  apronBibGroup.add(chestBib);

  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.02), apronMat);
  pocket.position.set(0.03, 0.86, 0.215);
  apronBibGroup.add(pocket);

  for (const side of [-1, 1]) {
    const frontStrap = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.15, 0.038), apronMat);
    frontStrap.position.set(side * 0.105, 1.24, 0.095);
    frontStrap.rotation.x = -0.34;
    const topLoop = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.036, 0.15), apronMat);
    topLoop.position.set(side * 0.105, 1.285, -0.015);
    apronBibGroup.add(frontStrap, topLoop);
  }

  // Crossed X-straps on back
  for (const side of [-1, 1]) {
    const xStrap = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.33, 0.028), apronMat);
    xStrap.position.set(0, 1.135, -0.178);
    xStrap.rotation.z = side * 0.62;
    apronBibGroup.add(xStrap);
  }
  apronBibGroup.visible = opts.apronStyle !== 'waist';
  apronGroup.add(apronBibGroup);

  apronGroup.visible = opts.hasApron !== false;
  root.add(apronGroup);

  // Red-and-White Checkered Waist Towel on Left Hip
  const towelGroup = new THREE.Group();
  const towelMat = new THREE.MeshStandardMaterial({
    map: getCheckeredTowelTexture(),
    roughness: 0.75,
  });
  const towelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.22, 0.15), towelMat);
  towelMesh.position.set(-0.275, 0.85, 0.04);
  towelMesh.rotation.z = -0.11;
  towelMesh.castShadow = true;
  towelGroup.add(towelMesh);
  towelGroup.visible = Boolean(opts.hasTowel);
  root.add(towelGroup);

  // Upgrade 1: Casual Orange Zip-Hoodie Vest
  const vestGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.272, 0.252, 0.56, 14, 1, false, side < 0 ? 0.38 : -1.55, 1.18),
      vestMat
    );
    panel.scale.set(1.06, 1, 0.74);
    panel.position.set(0, 0.96, 0.006);
    panel.castShadow = true;
    vestGroup.add(panel);
  }
  const vestBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.272, 0.252, 0.56, 14, 1, false, 1.56, Math.PI),
    vestMat
  );
  vestBack.scale.set(1.06, 1, 0.74);
  vestBack.position.set(0, 0.96, -0.005);
  vestGroup.add(vestBack);
  const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.055, 8, 16, Math.PI * 1.25), vestMat);
  hoodRim.rotation.x = Math.PI / 2 + 0.25;
  hoodRim.rotation.z = 1.18;
  hoodRim.position.set(0, 1.29, -0.04);
  vestGroup.add(hoodRim);
  vestGroup.visible = Boolean(opts.vestColor);
  root.add(vestGroup);

  // Upgrade 2: Smart Uniform Crimson Neckerchief
  const scarfGroup = new THREE.Group();
  const scarfRing = new THREE.Mesh(new THREE.TorusGeometry(0.132, 0.036, 8, 16), scarfMat);
  scarfRing.rotation.x = Math.PI / 2 + 0.14;
  scarfRing.position.set(0, 1.275, 0.015);
  const scarfKnot = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 8), scarfMat);
  scarfKnot.position.set(0, 1.235, 0.155);
  const scarfTailL = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.11, 0.02), scarfMat);
  scarfTailL.position.set(-0.03, 1.175, 0.175);
  scarfTailL.rotation.z = -0.35;
  const scarfTailR = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.095, 0.02), scarfMat);
  scarfTailR.position.set(0.032, 1.18, 0.175);
  scarfTailR.rotation.z = 0.42;
  scarfGroup.add(scarfRing, scarfKnot, scarfTailL, scarfTailR);
  scarfGroup.visible = Boolean(opts.scarfColor);
  root.add(scarfGroup);

  // Suit Shirt Placket + Tie + Premium Gold Lapels & Pocket Chain (Upgrade 3)
  const suitGroup = new THREE.Group();
  const dressShirt = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.34, 0.035), whiteTrimMat);
  dressShirt.position.set(0, 1.09, 0.168);
  suitGroup.add(dressShirt);

  const tieMat = new THREE.MeshStandardMaterial({
    color: '#eab308',
    roughness: 0.28,
    metalness: 0.45,
  });
  const tieMesh = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.29, 4), tieMat);
  tieMesh.rotation.z = Math.PI;
  tieMesh.position.set(0, 1.07, 0.192);
  suitGroup.add(tieMesh);

  const goldTrimGroup = new THREE.Group();
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    roughness: 0.22,
    metalness: 0.85,
  });
  const redTieMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.42 });
  const innerTie = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.27, 4), redTieMat);
  innerTie.rotation.z = Math.PI;
  innerTie.position.set(0, 1.075, 0.196);
  goldTrimGroup.add(innerTie);

  for (const side of [-1, 1]) {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.32, 0.03), goldTrimMat);
    lapel.position.set(side * 0.075, 1.09, 0.178);
    lapel.rotation.z = side * -0.18;
    goldTrimGroup.add(lapel);
  }
  const pocketChain = new THREE.Mesh(
    new THREE.TorusGeometry(0.068, 0.007, 6, 12, Math.PI),
    goldTrimMat
  );
  pocketChain.position.set(0.07, 0.91, 0.185);
  pocketChain.rotation.z = Math.PI;
  goldTrimGroup.add(pocketChain);

  goldTrimGroup.visible = Boolean(opts.hasSuit && opts.trimColor);
  suitGroup.add(goldTrimGroup);
  suitGroup.visible = Boolean(opts.hasSuit);
  root.add(suitGroup);

  // Sculpted Capsule Arms with Rolled Short-Sleeve Cuffs & Warm Forearms
  const sleeveCuffMeshes: THREE.Mesh[] = [];
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.23, 0);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.096, 12, 10), shirtMat);
    shoulder.castShadow = true;
    armPivot.add(shoulder);

    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.084, 0.125, 6, 10), shirtMat);
    sleeve.position.y = -0.10;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const cuffRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.082, 0.022, 8, 14),
      shirtMat
    );
    cuffRing.rotation.x = Math.PI / 2;
    cuffRing.position.y = -0.175;
    cuffRing.visible = !isLongSleeves;
    sleeveCuffMeshes.push(cuffRing);
    armPivot.add(cuffRing);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.14, 6, 10), forearmMat);
    forearm.position.y = -0.26;
    forearm.castShadow = true;
    armPivot.add(forearm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), skinMat);
    hand.position.y = -0.39;
    hand.castShadow = true;
    armPivot.add(hand);

    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), skinMat);
    thumb.position.set(xOffset < 0 ? 0.055 : -0.055, -0.375, 0.045);
    armPivot.add(thumb);

    return armPivot;
  };

  const leftArm = makeArm(-0.35);
  const rightArm = makeArm(0.35);
  root.add(leftArm, rightArm);

  // Watch on left wrist
  const watchMat = new THREE.MeshStandardMaterial({
    color: opts.watchColor ?? '#fbbf24',
    metalness: 0.92,
    roughness: 0.16,
  });
  const watchMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.05, 12), watchMat);
  watchMesh.position.y = -0.32;
  watchMesh.visible = Boolean(opts.watchColor);
  leftArm.add(watchMesh);

  // Carry Tray Anchor poised above right palm for Serving Pose
  const carryAnchor = new THREE.Group();
  carryAnchor.position.set(0.475, 1.50, 0.32);
  root.add(carryAnchor);

  const trayMesh = new THREE.Group();
  const trayMat = new THREE.MeshStandardMaterial({
    color: '#3f3029',
    roughness: 0.45,
    metalness: 0.14,
  });
  const trayDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.28, 0.03, 22), trayMat);
  trayDisc.position.y = -0.015;
  trayDisc.castShadow = true;
  const trayRim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.015, 8, 22), trayMat);
  trayRim.rotation.x = Math.PI / 2;
  trayRim.position.y = 0.002;
  trayMesh.add(trayDisc, trayRim);
  trayMesh.visible = false;
  carryAnchor.add(trayMesh);

  // Expressive Stylized Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.58, 0);
  root.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.255, 22, 18), skinMat);
  headMesh.scale.set(1.03, 1.02, 0.97);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Ears
  for (const sx of [-0.25, 0.25]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinMat);
    ear.position.set(sx, -0.015, -0.01);
    headGroup.add(ear);
  }

  // Cute Button Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 8), skinMat);
  nose.position.set(0, -0.02, 0.246);
  headGroup.add(nose);

  // Rosy Cheeks
  const cheekMat = new THREE.MeshStandardMaterial({ color: '#f794a4', roughness: 0.82 });
  for (const sx of [-0.142, 0.142]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), cheekMat);
    cheek.scale.set(1.25, 0.72, 0.4);
    cheek.position.set(sx, -0.062, 0.208);
    headGroup.add(cheek);
  }

  // Expressive Dark Oval Eyes with Crisp Catchlights & Eyebrows
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#1b1310', roughness: 0.18 });
  const catchMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const sx of [-0.088, 0.088]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), eyeMat);
    eye.scale.set(0.86, 1.24, 0.55);
    eye.position.set(sx, 0.022, 0.232);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), catchMat);
    catchlight.position.set(sx + 0.01, 0.038, 0.25);

    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.052, 4, 8), hairMat);
    brow.rotation.z = Math.PI / 2 + (sx < 0 ? 0.12 : -0.12);
    brow.position.set(sx, 0.092, 0.228);

    headGroup.add(eye, catchlight, brow);
  }

  // Cheerful Open Smile Mouth
  const mouthCavity = new THREE.Mesh(
    new THREE.SphereGeometry(0.046, 12, 8, 0, Math.PI, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: '#7f1d1d', roughness: 0.55 })
  );
  mouthCavity.scale.set(1.15, 0.85, 0.4);
  mouthCavity.rotation.x = Math.PI * 0.55;
  mouthCavity.position.set(0, -0.082, 0.228);
  headGroup.add(mouthCavity);

  const tongue = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.6 })
  );
  tongue.scale.set(1.1, 0.6, 0.5);
  tongue.position.set(0, -0.095, 0.235);
  headGroup.add(tongue);

  // Sculpted Swept-Back Wavy Hair
  const hairBase = new THREE.Mesh(
    new THREE.SphereGeometry(0.268, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairBase.position.set(0, 0.022, -0.024);
  hairBase.rotation.x = -0.34;
  hairBase.castShadow = true;
  headGroup.add(hairBase);

  // Full Back Hair Volume & Layered Nape Locks
  const hairBack = new THREE.Mesh(new THREE.SphereGeometry(0.245, 16, 12), hairMat);
  hairBack.scale.set(1.04, 0.92, 0.86);
  hairBack.position.set(0, -0.045, -0.095);
  hairBack.castShadow = true;
  headGroup.add(hairBack);

  for (const sx of [-0.225, 0.225]) {
    const sideLock = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.11, 6, 8), hairMat);
    sideLock.position.set(sx, 0.02, 0.055);
    sideLock.rotation.z = sx < 0 ? 0.18 : -0.18;
    sideLock.rotation.x = 0.22;
    headGroup.add(sideLock);
  }

  // Swept-Up Front Wave & Curl Tufts
  const hairCrestGroup = new THREE.Group();
  const curls: [number, number, number, number, number, number, number][] = [
    [-0.08, 0.23, 0.11, 0.11, 0.18, -0.5, 0.35],
    [0.05, 0.26, 0.08, 0.115, 0.20, -0.42, -0.22],
    [0.16, 0.20, 0.07, 0.085, 0.14, -0.32, -0.55],
    [-0.17, 0.18, 0.09, 0.078, 0.13, -0.25, 0.58],
    [0.0, 0.25, -0.04, 0.12, 0.18, -0.55, 0.0],
  ];
  for (const [cx, cy, cz, cr, cl, rx, rz] of curls) {
    const tuft = new THREE.Mesh(new THREE.CapsuleGeometry(cr, cl, 6, 10), hairMat);
    tuft.position.set(cx, cy, cz);
    tuft.rotation.set(rx, 0, rz);
    tuft.castShadow = true;
    hairCrestGroup.add(tuft);
  }
  headGroup.add(hairCrestGroup);

  // Hat anchor
  const hatAnchor = new THREE.Group();
  hatAnchor.position.set(0, 0.225, -0.01);
  headGroup.add(hatAnchor);

  const parts: CharacterParts = {
    root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torsoMesh,
    apronGroup,
    apronBibGroup,
    towelGroup,
    vestGroup,
    scarfGroup,
    suitGroup,
    goldTrimGroup,
    buttonsGroup,
    doubleButtonsGroup,
    collarTrimMesh,
    tieMesh,
    sleeveCuffMeshes,
    hatAnchor,
    watchMesh,
    carryAnchor,
    trayMesh,
    headGroup,
    hairCrestGroup,
    shirtMat,
    pantsMat,
    cuffMat,
    shoeMat,
    apronMat,
    skinMat,
    forearmMat,
    vestMat,
    scarfMat,
    collarTrimMat,
  };

  applyCharacterHat(parts, opts.hatStyle ?? 'none', opts.hatColor ?? '#ffffff');
  return parts;
}

export function applyCharacterHat(
  parts: CharacterParts,
  hatStyle: 'none' | 'cap' | 'toque' | 'fedora' | 'crown' | 'visor' | 'beret',
  hatColor: string
) {
  while (parts.hatAnchor.children.length > 0) {
    parts.hatAnchor.remove(parts.hatAnchor.children[0]);
  }
  if (hatStyle === 'none') {
    parts.hairCrestGroup.scale.set(1, 1, 1);
    parts.hairCrestGroup.position.set(0, 0, 0);
    return;
  }

  // Gently tuck top wavy crest so hats sit cleanly without clipping
  parts.hairCrestGroup.scale.set(0.86, 0.56, 0.88);
  parts.hairCrestGroup.position.set(0, -0.035, 0.02);

  const mat = new THREE.MeshStandardMaterial({
    color: hatColor,
    roughness: hatStyle === 'crown' ? 0.18 : 0.62,
    metalness: hatStyle === 'crown' ? 0.94 : 0.08,
  });

  if (hatStyle === 'toque') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.13, 16), mat);
    band.position.y = 0.04;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), mat);
    puff.scale.set(1, 0.85, 1);
    puff.position.y = 0.22;
    puff.castShadow = true;
    parts.hatAnchor.add(band, puff);
  } else if (hatStyle === 'cap') {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.272, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.54),
      mat
    );
    crown.position.y = -0.01;
    crown.castShadow = true;
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.255, 0.265, 0.032, 16, 1, false, -0.9, 1.8),
      mat
    );
    brim.position.set(0, 0.0, 0.13);
    parts.hatAnchor.add(crown, brim);

    // Front emblem patch (cream badge with burger icon dot)
    const patch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.018, 12),
      new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.45 })
    );
    patch.rotation.x = Math.PI / 2 - 0.35;
    patch.position.set(0, 0.115, 0.238);
    const burgerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.5 })
    );
    burgerDot.scale.set(1.2, 0.85, 0.55);
    burgerDot.position.set(0, 0.118, 0.25);
    parts.hatAnchor.add(patch, burgerDot);
  } else if (hatStyle === 'fedora') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.035, 18), mat);
    brim.position.y = 0.01;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.2, 18), mat);
    crown.position.y = 0.12;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.225, 0.225, 0.04, 18),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.35 })
    );
    band.position.y = 0.05;
    parts.hatAnchor.add(brim, crown, band);
  } else if (hatStyle === 'crown') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.11, 10), mat);
    base.position.y = 0.05;
    parts.hatAnchor.add(base);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), mat);
      spike.position.set(Math.cos(a) * 0.18, 0.17, Math.sin(a) * 0.18);
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        new THREE.MeshStandardMaterial({
          color: '#ef4444',
          emissive: '#dc2626',
          emissiveIntensity: 0.35,
          roughness: 0.15,
        })
      );
      gem.position.set(Math.cos(a) * 0.22, 0.06, Math.sin(a) * 0.22);
      parts.hatAnchor.add(spike, gem);
    }
  } else if (hatStyle === 'visor') {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.035, 8, 18), mat);
    strap.rotation.x = Math.PI / 2;
    strap.position.y = 0.01;
    const bill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.25, 0.03, 14, 1, false, -0.8, 1.6),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.18, metalness: 0.25 })
    );
    bill.position.set(0, 0.0, 0.12);
    parts.hatAnchor.add(strap, bill);
  } else if (hatStyle === 'beret') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 10), mat);
    cap.scale.set(1.12, 0.45, 1.05);
    cap.position.set(0.03, 0.06, -0.02);
    cap.rotation.z = -0.18;
    parts.hatAnchor.add(cap);
  }
}

export function applyPlayerClothes(
  parts: CharacterParts,
  outfit: ClothingItem,
  hat: ClothingItem,
  watch: ClothingItem
) {
  const shirtHex = outfit.shirtColor ?? '#f5efe6';
  const pantsHex = outfit.pantsColor ?? '#463b38';
  parts.shirtMat.color.set(shirtHex);
  parts.pantsMat.color.set(pantsHex);
  parts.cuffMat.color.set(pantsHex).multiplyScalar(0.84);
  parts.shoeMat.color.set(outfit.shoeColor ?? '#1e293b');

  const isLongSleeves = Boolean(outfit.longSleeves ?? outfit.hasSuit);
  parts.forearmMat.color.copy(isLongSleeves ? parts.shirtMat.color : parts.skinMat.color);
  parts.forearmMat.roughness = isLongSleeves ? parts.shirtMat.roughness : parts.skinMat.roughness;
  for (const cuff of parts.sleeveCuffMeshes) {
    cuff.visible = !isLongSleeves;
  }

  parts.collarTrimMat.color.set(outfit.trimColor ?? shirtHex);
  parts.collarTrimMesh.visible = Boolean(outfit.trimColor) && !outfit.hasSuit && !outfit.vestColor;

  if (outfit.apronColor) {
    parts.apronGroup.visible = true;
    parts.apronMat.color.set(outfit.apronColor);
    parts.apronBibGroup.visible = outfit.apronStyle !== 'waist';
  } else {
    parts.apronGroup.visible = false;
  }

  parts.towelGroup.visible = Boolean(outfit.hasTowel);

  if (outfit.vestColor) {
    parts.vestGroup.visible = true;
    parts.vestMat.color.set(outfit.vestColor);
  } else {
    parts.vestGroup.visible = false;
  }

  if (outfit.scarfColor) {
    parts.scarfGroup.visible = true;
    parts.scarfMat.color.set(outfit.scarfColor);
  } else {
    parts.scarfGroup.visible = false;
  }

  parts.buttonsGroup.visible = Boolean(outfit.trimColor) && !outfit.hasSuit && !outfit.vestColor && !outfit.scarfColor;
  parts.doubleButtonsGroup.visible = Boolean(outfit.scarfColor);

  parts.suitGroup.visible = Boolean(outfit.hasSuit);
  parts.tieMesh.visible = Boolean(outfit.hasSuit && !outfit.trimColor);
  parts.goldTrimGroup.visible = Boolean(outfit.hasSuit && outfit.trimColor);

  applyCharacterHat(parts, hat.hatStyle ?? 'none', hat.hatColor ?? '#ffffff');

  if (watch.watchColor) {
    parts.watchMesh.visible = true;
    (parts.watchMesh.material as THREE.MeshStandardMaterial).color.set(watch.watchColor);
  } else {
    parts.watchMesh.visible = false;
  }
}

export function getStaffAppearance(role: StaffRole): CharacterOptions {
  switch (role) {
    case 'chef':
      return {
        shirtColor: '#ffffff',
        pantsColor: '#1e293b',
        apronColor: '#f97316',
        hasApron: true,
        hatStyle: 'toque',
        hatColor: '#ffffff',
      };
    case 'waiter':
      return {
        shirtColor: '#f8fafc',
        pantsColor: '#0f172a',
        apronColor: '#0284c7',
        hasApron: true,
        hasSuit: true,
        hatStyle: 'none',
      };
    case 'cleaner':
      return {
        shirtColor: '#ecfdf5',
        pantsColor: '#334155',
        apronColor: '#10b981',
        hasApron: true,
        hatStyle: 'cap',
        hatColor: '#059669',
      };
    case 'cashier':
      return {
        shirtColor: '#faf5ff',
        pantsColor: '#1e1b4b',
        apronColor: '#9333ea',
        hasApron: true,
        hatStyle: 'visor',
        hatColor: '#7e22ce',
      };
    case 'driver':
      return {
        shirtColor: '#fef9c3',
        pantsColor: '#1f2937',
        apronColor: '#eab308',
        hasApron: true,
        hatStyle: 'cap',
        hatColor: '#ca8a04',
      };
    case 'manager':
      return {
        shirtColor: '#1e293b',
        pantsColor: '#0f172a',
        hasApron: false,
        hasSuit: true,
        hatStyle: 'fedora',
        hatColor: '#0f172a',
      };
  }
}

export function getCustomerAppearance(archetype: CustomerArchetype, seed: number): CharacterOptions {
  const skins = ['#f3c6a5', '#d99b78', '#8d5524', '#f8d9c0'];
  const hairs = ['#1c1917', '#78350f', '#ca8a04', '#475569'];
  const skinColor = skins[seed % skins.length];
  const hairColor = hairs[(seed + 1) % hairs.length];

  switch (archetype) {
    case 'impatient':
      return {
        shirtColor: '#ef4444',
        pantsColor: '#1e293b',
        hasApron: false,
        skinColor,
        hairColor,
        hatStyle: 'cap',
        hatColor: '#991b1b',
      };
    case 'business':
      return {
        shirtColor: '#1e3a8a',
        pantsColor: '#0f172a',
        hasApron: false,
        hasSuit: true,
        skinColor,
        hairColor,
        hatStyle: 'none',
      };
    case 'vip':
      return {
        shirtColor: '#7c2d12',
        pantsColor: '#09090b',
        hasApron: false,
        hasSuit: true,
        skinColor,
        hairColor,
        hatStyle: 'fedora',
        hatColor: '#fbbf24',
        watchColor: '#fbbf24',
      };
    case 'critic':
      return {
        shirtColor: '#4c1d95',
        pantsColor: '#18181b',
        hasApron: false,
        skinColor,
        hairColor,
        hatStyle: 'beret',
        hatColor: '#be123c',
      };
    case 'family':
      return {
        shirtColor: '#0d9488',
        pantsColor: '#334155',
        hasApron: false,
        skinColor,
        hairColor,
        scale: 0.96,
      };
    default: {
      const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];
      return {
        shirtColor: palette[seed % palette.length],
        pantsColor: '#334155',
        hasApron: false,
        skinColor,
        hairColor,
      };
    }
  }
}

// 3D Composite Food Dish Mesh (5-9 parts per dish)
export function createDishMesh(recipeId: RecipeId): THREE.Group {
  const group = new THREE.Group();

  // Rim-beveled Porcelain Plate
  const plateMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2, metalness: 0.08 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.21, 0.045, 20), plateMat);
  plate.position.y = 0.022;
  plate.receiveShadow = true;
  group.add(plate);

  // Country-restaurant dishes (Italy, Japan, Mexico, Azerbaijan)
  if (addWorldDish(recipeId, group)) return group;

  if (recipeId === 'burger' || recipeId === 'sandwich') {
    const bunMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.6 });
    const meatMat = new THREE.MeshStandardMaterial({ color: '#5c2c16', roughness: 0.75 });
    const cheeseMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35 });
    const lettuceMat = new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.68 });
    const tomatoMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 });

    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.15, 0.05, 16), bunMat);
    b1.position.y = 0.068;
    const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.055, 16), meatMat);
    patty.position.y = 0.12;
    const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.02, 0.27), cheeseMat);
    cheese.position.y = 0.15;
    cheese.rotation.y = 0.38;
    const tomato = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.022, 14), tomatoMat);
    tomato.position.y = 0.168;
    const lettuce = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.17, 0.024, 12), lettuceMat);
    lettuce.position.y = 0.188;
    const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), bunMat);
    topBun.position.y = 0.19;
    group.add(b1, patty, cheese, tomato, lettuce, topBun);
  } else if (recipeId === 'fries') {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.09, 0.19, 14),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45 })
    );
    cup.position.y = 0.13;
    group.add(cup);
    const fryMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.58 });
    for (let i = 0; i < 7; i++) {
      const fry = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.19, 0.032), fryMat);
      const a = (i / 7) * Math.PI * 2;
      fry.position.set(Math.cos(a) * 0.052, 0.22 + (i % 2) * 0.03, Math.sin(a) * 0.052);
      fry.rotation.z = (i - 3) * 0.06;
      group.add(fry);
    }
  } else if (recipeId === 'pizza') {
    const board = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.025, 20),
      new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.72 })
    );
    board.position.y = 0.05;
    const crust = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.032, 8, 20),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.65 })
    );
    crust.rotation.x = Math.PI / 2;
    crust.position.y = 0.072;
    const cheese = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.21, 0.022, 18),
      new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.42 })
    );
    cheese.position.y = 0.068;
    group.add(board, crust, cheese);
    const pepMat = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.52 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const pep = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.015, 10), pepMat);
      pep.position.set(Math.cos(a) * 0.11, 0.083, Math.sin(a) * 0.11);
      group.add(pep);
    }
  } else if (recipeId === 'steak') {
    const steak = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.08, 0.14, 6, 10),
      new THREE.MeshStandardMaterial({ color: '#7c2d12', roughness: 0.62 })
    );
    steak.rotation.z = Math.PI / 2;
    steak.scale.set(0.65, 1, 1.3);
    steak.position.y = 0.075;
    const butter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.025, 10),
      new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.28 })
    );
    butter.position.y = 0.125;
    const herb = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.78 })
    );
    herb.position.set(0.14, 0.075, 0.06);
    group.add(steak, butter, herb);
  } else if (recipeId === 'coffee') {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.085, 0.18, 16),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22 })
    );
    mug.position.y = 0.12;
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.018, 8, 12, Math.PI),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.22 })
    );
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.11, 0.12, 0);
    const foam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14),
      new THREE.MeshStandardMaterial({ color: '#d6a97b', roughness: 0.5 })
    );
    foam.position.y = 0.205;
    group.add(mug, handle, foam);
  } else if (recipeId === 'tiramisu') {
    const spongeMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.72 });
    const creamMat = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.42 });
    const cocoaMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.85 });
    const baseLayer = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.2), spongeMat);
    baseLayer.position.y = 0.068;
    const creamLayer = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.055, 0.2), creamMat);
    creamLayer.position.y = 0.123;
    const cocoaTop = new THREE.Mesh(new THREE.BoxGeometry(0.244, 0.018, 0.204), cocoaMat);
    cocoaTop.position.y = 0.158;
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.011, 8, 12), cocoaMat);
    curl.position.set(0.02, 0.185, 0);
    curl.rotation.y = 0.5;
    group.add(baseLayer, creamLayer, cocoaTop, curl);
  } else if (recipeId === 'gelato') {
    const coupeMat = new THREE.MeshStandardMaterial({ color: '#fce7f3', roughness: 0.22 });
    const coupe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.12, 16), coupeMat);
    coupe.position.y = 0.095;
    const scoop1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.48 })
    );
    scoop1.position.set(-0.06, 0.17, 0.03);
    const scoop2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#86efac', roughness: 0.48 })
    );
    scoop2.position.set(0.06, 0.17, 0.03);
    const scoop3 = new THREE.Mesh(
      new THREE.SphereGeometry(0.078, 12, 10),
      new THREE.MeshStandardMaterial({ color: '#fef9c3', roughness: 0.45 })
    );
    scoop3.position.set(0, 0.21, -0.04);
    const wafer = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.17, 0.015),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.65 })
    );
    wafer.position.set(0.05, 0.25, -0.05);
    wafer.rotation.z = -0.35;
    group.add(coupe, scoop1, scoop2, scoop3, wafer);
  } else if (recipeId === 'berry_tart') {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.15, 0.065, 18),
      new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.62 })
    );
    shell.position.y = 0.072;
    const custard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.155, 0.155, 0.025, 16),
      new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.35 })
    );
    custard.position.y = 0.105;
    group.add(shell, custard);
    const berryColors = ['#e11d48', '#4c1d95', '#be185d'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 10, 8),
        new THREE.MeshStandardMaterial({ color: berryColors[i % 3], roughness: 0.28 })
      );
      berry.position.set(Math.cos(a) * 0.085, 0.132, Math.sin(a) * 0.085);
      group.add(berry);
    }
    const goldLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.012, 0.04),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 })
    );
    goldLeaf.position.set(0, 0.145, 0);
    goldLeaf.rotation.y = 0.4;
    group.add(goldLeaf);
  } else if (recipeId === 'matcha_boba') {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.078, 0.24, 16),
      new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.28, transparent: true, opacity: 0.92 })
    );
    cup.position.y = 0.15;
    const pearls = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.076, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.35 })
    );
    pearls.position.y = 0.065;
    const creamCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.106, 0.106, 0.035, 16),
      new THREE.MeshStandardMaterial({ color: '#fffbeb', roughness: 0.4 })
    );
    creamCap.position.y = 0.265;
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: '#14532d', roughness: 0.35 })
    );
    straw.position.set(0.03, 0.32, 0);
    straw.rotation.z = -0.22;
    group.add(cup, pearls, creamCap, straw);
  } else if (recipeId === 'mango_smoothie') {
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.075, 0.24, 16),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.26 })
    );
    glass.position.y = 0.15;
    const whip = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: '#fffbeb', roughness: 0.45 })
    );
    whip.position.y = 0.31;
    const wedge = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, 0.025),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.4 })
    );
    wedge.position.set(-0.08, 0.27, 0);
    wedge.rotation.z = 0.5;
    const straw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.35 })
    );
    straw.position.set(0.03, 0.33, 0);
    straw.rotation.z = -0.25;
    group.add(glass, whip, wedge, straw);
  } else if (recipeId === 'berry_mocktail') {
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.09, 10),
      new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.18, metalness: 0.2 })
    );
    stem.position.y = 0.08;
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.05, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.22, transparent: true, opacity: 0.9 })
    );
    bowl.position.y = 0.19;
    const citrus = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.014, 12),
      new THREE.MeshStandardMaterial({ color: '#fb923c', roughness: 0.4 })
    );
    citrus.rotation.x = Math.PI / 2;
    citrus.position.set(0.11, 0.27, 0);
    const mint = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 6),
      new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.55 })
    );
    mint.position.set(-0.03, 0.27, 0.02);
    group.add(stem, bowl, citrus, mint);
  } else {
    const bowlColor =
      recipeId === 'salad'
        ? '#22c55e'
        : recipeId === 'sushi'
          ? '#f43f5e'
          : recipeId === 'dessert'
            ? '#581c87'
            : '#f59e0b';
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      new THREE.MeshStandardMaterial({ color: bowlColor, roughness: 0.52 })
    );
    mound.scale.set(1, 0.58, 1);
    mound.position.y = 0.085;
    const garnish = new THREE.Mesh(
      new THREE.SphereGeometry(0.048, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.38 })
    );
    garnish.position.y = 0.155;
    group.add(mound, garnish);
  }

  return group;
}

// Procedural Stylized Prop Textures matching reference sheets
function createGinghamTexture(color = '#dc2626'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 64; i += 16) {
    ctx.fillRect(i, 0, 8, 64);
    ctx.fillRect(0, i, 64, 8);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMenuBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Matte warm charcoal chalkboard
  ctx.fillStyle = '#262426';
  ctx.fillRect(0, 0, 512, 384);

  // Subtle cream chalk border
  ctx.strokeStyle = 'rgba(248, 240, 224, 0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 484, 356);

  // Script-style MENU header + leafy flourishes
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'italic bold 42px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Menu', 256, 54);

  ctx.strokeStyle = '#d6c7b2';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(132, 54);
  ctx.quadraticCurveTo(154, 42, 174, 54);
  ctx.moveTo(338, 54);
  ctx.quadraticCurveTo(358, 42, 378, 54);
  ctx.stroke();

  // Burger icon
  ctx.fillStyle = '#e59a38';
  ctx.beginPath();
  ctx.arc(106, 134, 28, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(77, 135, 58, 6);
  ctx.fillStyle = '#7c3416';
  ctx.fillRect(79, 142, 54, 11);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(83, 140, 46, 4);
  ctx.fillStyle = '#e59a38';
  ctx.fillRect(80, 154, 52, 10);

  // Fries icon
  ctx.fillStyle = '#facc15';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(84 + i * 9, 198 + (i % 2) * 5, 6, 26);
  }
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(80, 220, 52, 32);

  // Plated roast / combo icon
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(106, 316, 36, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(104, 308, 22, 12, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(82, 312, 7, 0, Math.PI * 2);
  ctx.fill();

  // Chalk item lines + dashed prices
  const rows = [138, 224, 310];
  rows.forEach((ry) => {
    ctx.fillStyle = '#f5ebd8';
    ctx.fillRect(172, ry - 8, 178, 9);
    ctx.fillStyle = '#b8aa99';
    ctx.fillRect(172, ry + 8, 126, 6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(386, ry - 4, 52, 9);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTrashDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d3cbc3';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(80, 32, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(72, 44, 16, 34);
  ctx.fillRect(54, 48, 20, 7);
  ctx.fillRect(36, 68, 24, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChefCrestTexture(bgColor = '#b93226'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 160);

  ctx.strokeStyle = '#fef3c7';
  ctx.lineWidth = 7;
  ctx.strokeRect(8, 8, 240, 144);

  // Crossed golden fork & spoon beneath chef hat
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(82, 126);
  ctx.lineTo(174, 86);
  ctx.moveTo(174, 126);
  ctx.lineTo(82, 86);
  ctx.stroke();

  // Cream chef hat
  ctx.fillStyle = '#fff8ee';
  ctx.beginPath();
  ctx.arc(104, 56, 20, 0, Math.PI * 2);
  ctx.arc(128, 46, 24, 0, Math.PI * 2);
  ctx.arc(152, 56, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(100, 62, 56, 28);
  ctx.fillStyle = '#f3d7b8';
  ctx.fillRect(100, 82, 56, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBurgerPosterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fdf4e7';
  ctx.fillRect(0, 0, 192, 256);

  ctx.strokeStyle = '#e5cba8';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 172, 236);

  // Top bun
  ctx.fillStyle = '#e59a38';
  ctx.beginPath();
  ctx.arc(96, 118, 52, Math.PI, 0);
  ctx.fill();
  // Sesame seeds
  ctx.fillStyle = '#fef3c7';
  for (const [sx, sy] of [[74, 88], [98, 80], [118, 92], [88, 100]]) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 4, 2.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lettuce + tomato + cheese + patty + bottom bun
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(42, 118, 108, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(46, 130, 100, 10);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(44, 140, 104, 8);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(46, 148, 100, 20);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(48, 168, 96, 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addCabinetFeet(group: THREE.Group, halfW: number, halfD: number) {
  const footMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });
  for (const sx of [-halfW + 0.1, halfW - 0.1]) {
    for (const sz of [-halfD + 0.1, halfD - 0.1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), footMat);
      foot.position.set(sx, 0.06, sz);
      foot.castShadow = true;
      group.add(foot);
    }
  }
}

// 3D Kitchen Station Models styled after reference prop sheets (oak, cream, crimson & brushed steel)
export function createKitchenStationMesh(type: StationType): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#dce3eb', metalness: 0.65, roughness: 0.28 });
  const darkMetalMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.5, roughness: 0.45 });
  const oakMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture('#d98236', '#9a4d12', 2),
    roughness: 0.58,
  });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.55 });
  const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.36, metalness: 0.08 });

  if (type === 'grill') {
    // Grill Station: Oak lower cabinet + brushed steel top shroud + red knobs + ribbed grill + burgers + side shelf & bottles
    addCabinetFeet(group, 0.85, 0.48);

    const oakCab = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.5, 0.96), oakMat);
    oakCab.position.y = 0.36;
    oakCab.castShadow = true;
    oakCab.receiveShadow = true;
    group.add(oakCab);

    const steelApron = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.32, 1.04), steelMat);
    steelApron.position.y = 0.77;
    steelApron.castShadow = true;
    group.add(steelApron);

    // Side & Back Steel Splash Walls
    const backSplash = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.44, 0.09), steelMat);
    backSplash.position.set(0, 1.12, -0.47);
    const leftGuard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.98), steelMat);
    leftGuard.position.set(-0.83, 1.06, -0.02);
    const rightGuard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.98), steelMat);
    rightGuard.position.set(0.83, 1.06, -0.02);
    group.add(backSplash, leftGuard, rightGuard);

    // Ribbed Dark Grates + Glowing Embers Underneath
    const emberBed = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.04, 0.76),
      new THREE.MeshStandardMaterial({ color: '#ea580c', emissive: '#f97316', emissiveIntensity: 0.9 })
    );
    emberBed.position.set(0, 0.92, 0);
    group.add(emberBed);

    for (let gx = -0.64; gx <= 0.64; gx += 0.16) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.82), darkMetalMat);
      bar.position.set(gx, 0.95, 0);
      group.add(bar);
    }

    // Sizzling Burger Patties & Grilled Chicken Fillet
    const pattyMat = new THREE.MeshStandardMaterial({ color: '#6b3416', roughness: 0.7 });
    const chickenMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.55 });
    for (const [px, pz] of [[-0.3, -0.14], [-0.24, 0.2]]) {
      const patty = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.055, 14), pattyMat);
      patty.position.set(px, 0.99, pz);
      group.add(patty);
    }
    const chicken = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.16, 6, 10), chickenMat);
    chicken.rotation.z = Math.PI / 2;
    chicken.scale.set(0.65, 1, 1.15);
    chicken.position.set(0.28, 0.99, 0.06);
    group.add(chicken);

    // 2 Red Control Knobs on Front Apron
    for (const sx of [-0.36, 0.36]) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.07, 14), redMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(sx, 0.76, 0.54);
      group.add(knob);
    }

    // Oak Side Shelf with Ketchup/Mustard Bottles + Hanging Spatula
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.65), oakMat);
    shelf.position.set(1.04, 0.84, 0);
    group.add(shelf);
    const kBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.24, 12), redMat);
    kBottle.position.set(1.02, 1.0, -0.14);
    const mBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.07, 0.24, 12),
      new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35 })
    );
    mBottle.position.set(1.05, 1.0, 0.12);
    const spatulaBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.13), steelMat);
    spatulaBlade.position.set(1.18, 0.56, 0.2);
    const spatulaHandle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.18, 0.03), darkMetalMat);
    spatulaHandle.position.set(1.18, 0.73, 0.2);
    group.add(kBottle, mBottle, spatulaBlade, spatulaHandle);
  } else if (type === 'prep') {
    // Food Prep Counter: Oak frame + twin cream cabinet doors + stainless top + cutting board w/ tomatoes + lettuce bowl + topping bins + green checkered towel
    addCabinetFeet(group, 0.85, 0.5);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.78, 0.98), oakMat);
    frame.position.y = 0.48;
    frame.castShadow = true;
    frame.receiveShadow = true;
    group.add(frame);

    for (const sx of [-0.37, 0.37]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.6, 0.06), creamMat);
      door.position.set(sx, 0.48, 0.49);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.05), steelMat);
      handle.position.set(sx + (sx < 0 ? 0.24 : -0.24), 0.5, 0.53);
      group.add(door, handle);
    }

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.1, 1.1), steelMat);
    top.position.y = 0.92;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Oak Cutting Board with Sliced Tomatoes & Chef Knife
    const cutBoard = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.045, 0.48), oakMat);
    cutBoard.position.set(0.04, 0.99, 0.16);
    group.add(cutBoard);

    const tomMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 });
    for (const [tx, tz] of [[-0.08, 0.12], [0.06, 0.22]]) {
      const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12), tomMat);
      slice.position.set(tx, 1.025, tz);
      group.add(slice);
    }
    const knifeBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.015, 0.06), steelMat);
    knifeBlade.position.set(0.16, 1.03, 0.12);
    knifeBlade.rotation.y = 0.4;
    group.add(knifeBlade);

    // Bowl of Crisp Green Lettuce
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.12, 14), creamMat);
    bowl.position.set(-0.62, 1.03, 0.18);
    const lettuce = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.65 })
    );
    lettuce.position.set(-0.62, 1.12, 0.18);
    group.add(bowl, lettuce);

    // 3 Recessed Topping Bins (Purple, Green, Yellow) + Red/Yellow Bottles
    const binRack = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.28), steelMat);
    binRack.position.set(0.32, 1.03, -0.32);
    group.add(binRack);
    const binColors = ['#a855f7', '#4ade80', '#facc15'];
    binColors.forEach((bc, idx) => {
      const fill = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.05, 0.2),
        new THREE.MeshStandardMaterial({ color: bc, roughness: 0.55 })
      );
      fill.position.set(0.02 + idx * 0.3, 1.08, -0.32);
      group.add(fill);
    });

    const bRed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.2, 10), redMat);
    bRed.position.set(-0.46, 1.07, -0.32);
    const bYel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.055, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35 })
    );
    bYel.position.set(-0.32, 1.07, -0.32);
    group.add(bRed, bYel);

    // Green Checkered Towel Draped on Right Side
    const towel = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.34, 0.28),
      new THREE.MeshStandardMaterial({ map: createGinghamTexture('#16a34a'), roughness: 0.85 })
    );
    towel.position.set(0.88, 0.72, 0.1);
    group.add(towel);
  } else if (type === 'fryer') {
    // Deep Fryer: Brushed steel front + oak sides + dark feet + raised control panel + dual baskets with red handles & fries
    addCabinetFeet(group, 0.84, 0.48);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.74, 0.96), steelMat);
    body.position.y = 0.48;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Oak side accent panels
    for (const sx of [-0.81, 0.81]) {
      const sideOak = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.86), oakMat);
      sideOak.position.set(sx, 0.46, 0);
      group.add(sideOak);
    }

    // Raised Back Control Panel with Green/Red LEDs & Red Dial
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.38, 0.22), steelMat);
    backPanel.position.set(0, 1.04, -0.37);
    backPanel.castShadow = true;
    group.add(backPanel);

    const ledGreen = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 0.9 })
    );
    ledGreen.position.set(-0.42, 1.06, -0.25);
    const ledRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.9 })
    );
    ledRed.position.set(-0.26, 1.06, -0.25);
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.06, 14), redMat);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.36, 1.06, -0.24);
    group.add(ledGreen, ledRed, dial);

    // Hot Golden Oil Vat + Twin Wire Baskets with Red Handles + Fries & Rings
    const vat = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.06, 0.64),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.18, metalness: 0.15 })
    );
    vat.position.set(0, 0.86, 0.08);
    group.add(vat);

    const fryColor = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.55 });
    for (const [idx, sx] of ([-0.36, 0.36] as const).entries()) {
      const basket = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.5), steelMat);
      basket.position.set(sx, 0.94, 0.1);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.34), redMat);
      handle.position.set(sx, 1.01, 0.45);
      handle.rotation.x = -0.22;
      group.add(basket, handle);

      if (idx === 0) {
        for (let f = 0; f < 6; f++) {
          const fry = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.05), fryColor);
          fry.position.set(sx - 0.15 + f * 0.06, 1.03, 0.08 + (f % 2) * 0.08);
          fry.rotation.z = (f - 2.5) * 0.12;
          group.add(fry);
        }
      } else {
        for (let r = 0; r < 4; r++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 8, 12), fryColor);
          ring.rotation.x = Math.PI / 2;
          ring.position.set(sx + ((r % 2) - 0.5) * 0.16, 1.03, 0.02 + Math.floor(r / 2) * 0.16);
          group.add(ring);
        }
      }
    }
  } else if (type === 'oven') {
    // Small Oven on Oak Stand: Cream & Crimson-Red Oven with glowing amber baking window + golden rolls + red side dials
    addCabinetFeet(group, 0.82, 0.46);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.42, 0.88), oakMat);
    stand.position.y = 0.31;
    stand.castShadow = true;
    stand.receiveShadow = true;
    group.add(stand);

    const ovenBody = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.96, 0.92), creamMat);
    ovenBody.position.y = 0.98;
    ovenBody.castShadow = true;
    ovenBody.receiveShadow = true;
    group.add(ovenBody);

    // Bold Crimson-Red Top Roof Cap
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.14, 0.96), redMat);
    roofCap.position.y = 1.48;
    roofCap.castShadow = true;
    group.add(roofCap);

    // Red Door Frame + Glowing Amber Interior Window + Steel Handle
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.68, 0.07), redMat);
    doorFrame.position.set(-0.16, 0.96, 0.46);
    const windowGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.46),
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#f97316',
        emissiveIntensity: 1.4,
        roughness: 0.2,
      })
    );
    windowGlow.position.set(-0.16, 0.94, 0.5);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.72, 10), steelMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.16, 1.24, 0.53);
    group.add(doorFrame, windowGlow, handle);

    // Golden baked buns visible on tray inside window
    const bunMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#d97706', emissiveIntensity: 0.5 });
    for (const bx of [-0.34, -0.16, 0.02]) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), bunMat);
      bun.scale.set(1, 0.65, 0.7);
      bun.position.set(bx, 0.85, 0.49);
      group.add(bun);
    }

    // Twin Red Dials on Right Front Panel
    for (const dy of [1.1, 0.82]) {
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.09, 0.07, 14), redMat);
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0.52, dy, 0.48);
      group.add(dial);
    }
  } else if (type === 'bar') {
    // Espresso & Drink Bar: Oak/Cream counter with Coffee Machine + Drink Dispenser
    addCabinetFeet(group, 0.88, 0.52);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.76, 1.02), oakMat);
    body.position.y = 0.48;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.09, 1.12), creamMat);
    counterTop.position.y = 0.9;
    counterTop.receiveShadow = true;
    group.add(counterTop);

    // Left Half: Coffee Machine (Red + Cream + Bean Hopper + White Mugs)
    const coffeeShell = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.54, 0.46), redMat);
    coffeeShell.position.set(-0.46, 1.21, -0.05);
    coffeeShell.castShadow = true;
    const coffeeFace = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.44, 0.49), creamMat);
    coffeeFace.position.set(-0.46, 1.2, -0.05);
    const hopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.09, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.4 })
    );
    hopper.position.set(-0.24, 1.56, -0.08);
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.09, 10), creamMat);
    mug.position.set(-0.46, 1.02, 0.14);
    const topMug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.08, 10), creamMat);
    topMug.position.set(-0.56, 1.52, -0.06);
    group.add(coffeeShell, coffeeFace, hopper, mug, topMug);

    // Right Half: 4-Flavor Drink Dispenser (Steel + Red Header + 4 Colorful Levers + Cup Stack)
    const dispBody = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.44), steelMat);
    dispBody.position.set(0.38, 1.23, -0.05);
    dispBody.castShadow = true;
    const dispHeader = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.22, 0.46), redMat);
    dispHeader.position.set(0.38, 1.46, -0.03);
    group.add(dispBody, dispHeader);

    const leverColors = ['#ef4444', '#f97316', '#facc15', '#22c55e'];
    leverColors.forEach((lc, idx) => {
      const lever = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.1, 0.06),
        new THREE.MeshStandardMaterial({ color: lc, roughness: 0.3 })
      );
      lever.position.set(0.18 + idx * 0.13, 1.24, 0.19);
      group.add(lever);
    });
    const cupStack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.24, 10), creamMat);
    cupStack.position.set(0.76, 1.07, 0.08);
    group.add(cupStack);
  } else if (type === 'specialty') {
    // Specialty Culinary Station: Patisserie Glass Display Case + Craft Beverage & Boba Bar
    addCabinetFeet(group, 0.88, 0.52);

    const berryMat = new THREE.MeshStandardMaterial({ color: '#be185d', roughness: 0.38 });
    const brassMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.72, roughness: 0.28 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#e0f2fe',
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.42,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.76, 1.02), oakMat);
    body.position.y = 0.48;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Rose-berry front trim panel + brass plaque
    const frontAccent = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.48, 0.05), berryMat);
    frontAccent.position.set(0, 0.49, 0.51);
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.03), brassMat);
    plaque.position.set(0, 0.58, 0.54);
    group.add(frontAccent, plaque);

    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.09, 1.12), creamMat);
    counterTop.position.y = 0.9;
    counterTop.receiveShadow = true;
    group.add(counterTop);

    // Left Half: Chilled Glass Patisserie Display Case with Tiered Berry Cake & Macarons
    const caseBase = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.68), steelMat);
    caseBase.position.set(-0.42, 0.97, -0.02);
    const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.48, 0.64), glassMat);
    caseGlass.position.set(-0.42, 1.24, -0.02);
    const caseCap = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.05, 0.66), brassMat);
    caseCap.position.set(-0.42, 1.5, -0.02);
    group.add(caseBase, caseGlass, caseCap);

    // Mini Dessert Display Inside Case
    const cakeTier1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.15, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: '#fbcfe8', roughness: 0.45 })
    );
    cakeTier1.position.set(-0.56, 1.05, 0);
    const cakeTier2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.1, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: '#fdf2f8', roughness: 0.4 })
    );
    cakeTier2.position.set(-0.56, 1.14, 0);
    const cakeBerry = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      berryMat
    );
    cakeBerry.position.set(-0.56, 1.2, 0);
    group.add(cakeTier1, cakeTier2, cakeBerry);

    const macaronColors = ['#f472b6', '#4ade80', '#facc15'];
    macaronColors.forEach((mc, idx) => {
      const mac = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.055, 10),
        new THREE.MeshStandardMaterial({ color: mc, roughness: 0.45 })
      );
      mac.position.set(-0.22, 1.03 + idx * 0.06, -0.1 + (idx % 2) * 0.14);
      group.add(mac);
    });

    // Right Half: Craft Beverage Blender + Syrup Rack + Chilled Boba Cups
    const blenderBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.14, 12), steelMat);
    blenderBase.position.set(0.28, 1.02, 0.04);
    const blenderJar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.085, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.22, transparent: true, opacity: 0.85 })
    );
    blenderJar.position.set(0.28, 1.23, 0.04);
    const blenderLid = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), berryMat);
    blenderLid.position.set(0.28, 1.39, 0.04);
    group.add(blenderBase, blenderJar, blenderLid);

    const syrupColors = ['#ec4899', '#22c55e', '#f59e0b'];
    syrupColors.forEach((sc, idx) => {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.046, 0.22, 10),
        new THREE.MeshStandardMaterial({ color: sc, roughness: 0.3 })
      );
      bottle.position.set(0.52 + idx * 0.12, 1.06, -0.22);
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8), creamMat);
      pump.position.set(0.52 + idx * 0.12, 1.2, -0.22);
      group.add(bottle, pump);
    });

    const bobaCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.05, 0.18, 12),
      new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.35 })
    );
    bobaCup.position.set(0.68, 1.04, 0.18);
    group.add(bobaCup);
  }

  return group;
}

// Refrigerator (Sleek brushed stainless steel double-door commercial fridge with snowflake emblem)
export function createRefrigeratorMesh(): THREE.Group {
  const g = new THREE.Group();
  const bodySteelMat = new THREE.MeshStandardMaterial({
    color: '#d4dce6',
    metalness: 0.72,
    roughness: 0.28,
  });
  const trimSteelMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.8,
    roughness: 0.22,
  });
  const handleMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.88,
    roughness: 0.16,
  });

  addCabinetFeet(g, 0.56, 0.4);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.56, 0.82), bodySteelMat);
  body.position.y = 0.88;
  body.castShadow = true;
  body.receiveShadow = true;

  // Double door split line + top crown bevel
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 1.48, 0.03),
    new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.5 })
  );
  seam.position.set(0, 0.88, 0.415);
  const crown = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.1, 0.85), trimSteelMat);
  crown.position.y = 1.69;
  crown.castShadow = true;
  g.add(body, seam, crown);

  for (const sx of [-0.09, 0.09]) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.62, 0.07), handleMat);
    handle.position.set(sx, 0.96, 0.435);
    g.add(handle);
  }

  // Blue circular snowflake badge on upper right door
  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.025, 16),
    new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.28 })
  );
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.32, 1.38, 0.42);
  const snowDot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.03, 6),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 })
  );
  snowDot.rotation.x = Math.PI / 2;
  snowDot.position.set(0.32, 1.38, 0.425);
  g.add(badge, snowDot);
  return g;
}

// Sink Station (Caramel-oak cabinet with stainless double sink, gooseneck faucet & red checkered towel)
export function createSinkStationMesh(): THREE.Group {
  const g = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({ map: createWoodTexture('#cf8042', '#8f4d1e', 2), roughness: 0.55 });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.5 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#dce3eb', metalness: 0.72, roughness: 0.24 });

  addCabinetFeet(g, 0.72, 0.44);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.76, 0.88), oakMat);
  cab.position.y = 0.48;
  cab.castShadow = true;
  cab.receiveShadow = true;
  for (const sx of [-0.32, 0.32]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.58, 0.05), creamMat);
    door.position.set(sx, 0.48, 0.44);
    g.add(door);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.09, 0.96), steelMat);
  top.position.y = 0.9;
  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.03, 0.56),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.65, roughness: 0.3 })
  );
  basin.position.set(0, 0.94, 0.02);
  const faucetStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.36, 10), steelMat);
  faucetStem.position.set(0, 1.12, -0.32);
  const faucetArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.03, 8, 12, Math.PI),
    steelMat
  );
  faucetArc.rotation.y = Math.PI / 2;
  faucetArc.position.set(0, 1.3, -0.18);
  const plates = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.14, 14), creamMat);
  plates.position.set(-0.54, 1.01, 0.08);
  const soap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.06, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.35 })
  );
  soap.position.set(0.56, 1.03, -0.22);
  const towel = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.32, 0.04),
    new THREE.MeshStandardMaterial({ map: createGinghamTexture('#dc2626'), roughness: 0.85 })
  );
  towel.position.set(0.45, 0.7, 0.47);
  g.add(cab, top, basin, faucetStem, faucetArc, plates, soap, towel);
  return g;
}

// Ingredient Shelf (3-tier caramel-oak & dark-iron open rack with spice jars and fresh produce crates)
export function createIngredientShelfMesh(): THREE.Group {
  const g = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({ map: createWoodTexture('#cf8042', '#8f4d1e', 2), roughness: 0.55 });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.55, roughness: 0.45 });

  for (const sx of [-0.7, 0.7]) {
    for (const sz of [-0.28, 0.28]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.56, 0.06), ironMat);
      post.position.set(sx, 0.78, sz);
      post.castShadow = true;
      g.add(post);
    }
  }
  for (const sy of [0.22, 0.76, 1.32]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.07, 0.64), oakMat);
    shelf.position.y = sy;
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    g.add(shelf);
  }
  // Top shelf: 5 glass spice jars with golden lids
  const jarColors = ['#eab308', '#f59e0b', '#84cc16', '#dc2626', '#fb923c'];
  for (let j = 0; j < 5; j++) {
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: jarColors[j], roughness: 0.3 })
    );
    jar.position.set(-0.48 + j * 0.24, 1.46, 0);
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.45, roughness: 0.35 })
    );
    lid.position.set(-0.48 + j * 0.24, 1.58, 0);
    g.add(jar, lid);
  }
  // Middle shelf: 3 wooden crates with limes, red tomatoes, and purple eggplants
  for (const [cx, itemColor] of [[-0.44, '#65a30d'], [0, '#ef4444'], [0.44, '#7e22ce']] as const) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.42), oakMat);
    crate.position.set(cx, 0.88, 0);
    const produce = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 8, 8),
      new THREE.MeshStandardMaterial({ color: itemColor, roughness: 0.55 })
    );
    produce.scale.set(1.25, 0.65, 1.15);
    produce.position.set(cx, 0.96, 0);
    g.add(crate, produce);
  }
  // Bottom shelf: flour sack + tomato cans
  const sack = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.3, 0.26),
    new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.85 })
  );
  sack.position.set(-0.42, 0.4, 0);
  g.add(sack);
  for (const cx of [0.22, 0.44]) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.18, 10),
      new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 })
    );
    can.position.set(cx, 0.34, 0);
    g.add(can);
  }
  return g;
}

// Wall Menu Board (Caramel-oak frame + dark chalkboard + script Menu header & dual brass lamps)
export function createMenuBoardMesh(): THREE.Group {
  const g = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({ map: createWoodTexture('#cf8042', '#8f4d1e', 2), roughness: 0.52 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.9, 0.14), oakMat);
  frame.castShadow = true;
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(2.36, 1.66),
    new THREE.MeshStandardMaterial({ map: createMenuBoardTexture(), roughness: 0.78 })
  );
  board.position.z = 0.075;
  g.add(frame, board);

  const brassMat = new THREE.MeshStandardMaterial({ color: '#451a03', metalness: 0.55, roughness: 0.35 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fef08a', emissive: '#fbbf24', emissiveIntensity: 0.9 });
  for (const sx of [-0.72, 0.72]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 8), brassMat);
    arm.rotation.x = Math.PI / 2;
    arm.position.set(sx, 0.96, 0.14);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.14, 12), brassMat);
    shade.position.set(sx, 0.9, 0.24);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bulbMat);
    bulb.position.set(sx, 0.84, 0.24);
    g.add(arm, shade, bulb);
  }
  return g;
}

// Service Tray Station (Steel frame + cream cabinet + stacked red trays & white plates)
export function createTrayStationMesh(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#dce3eb', metalness: 0.65, roughness: 0.28 });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.55 });
  const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.38 });

  addCabinetFeet(g, 0.68, 0.36);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.52, 0.74), creamMat);
  lower.position.y = 0.36;
  lower.castShadow = true;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 0.8), steelMat);
  frame.position.y = 0.66;
  const midShelf = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.8), steelMat);
  midShelf.position.y = 1.06;
  for (const sx of [-0.66, 0.66]) {
    for (const sz of [-0.34, 0.34]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.04, 0.08), steelMat);
      post.position.set(sx, 0.62, sz);
      g.add(post);
    }
  }
  for (const sx of [-0.34, 0.34]) {
    const trays = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.42), redMat);
    trays.position.set(sx, 1.16, 0);
    g.add(trays);
  }
  const plateStack = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.18, 14), creamMat);
  plateStack.position.set(-0.34, 0.8, 0);
  const cups = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.2, 12), creamMat);
  cups.position.set(0.32, 0.81, 0);
  g.add(lower, frame, midShelf, plateStack, cups);
  return g;
}

// Stylized Trash Bin (Brushed steel body with crimson-red angled flip lid & trash decal)
export function createTrashBinMesh(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: '#d3cbc3', metalness: 0.42, roughness: 0.38 });
  const redMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.36 });

  addCabinetFeet(g, 0.32, 0.32);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.78, 0.64), steelMat);
  body.position.y = 0.48;
  body.castShadow = true;
  body.receiveShadow = true;
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshStandardMaterial({ map: createTrashDecalTexture(), roughness: 0.45 })
  );
  decal.position.set(0, 0.5, 0.325);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.68), redMat);
  lid.position.y = 0.96;
  lid.castShadow = true;
  const chute = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.08, 0.34),
    new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.8 })
  );
  chute.position.y = 1.05;
  g.add(body, decal, lid, chute);
  return g;
}

// Cashier Counter styled after reference image (caramel-oak base, warm LED under-lip strip, chef crest plaque, marble top, POS, card terminal & yellow bouquet)
export function createRegisterStationMesh(theme?: CafeThemeDef): THREE.Group {
  const group = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(theme?.woodPrimary ?? '#cf8042', theme?.woodSecondary ?? '#8f4d1e', 2),
    roughness: 0.52,
  });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f6efe4', roughness: 0.3 });
  const posMat = new THREE.MeshStandardMaterial({ color: '#27272a', roughness: 0.34, metalness: 0.42 });

  addCabinetFeet(group, 1.0, 0.44);

  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.78, 0.88), oakMat);
  desk.position.y = 0.47;
  desk.castShadow = true;
  desk.receiveShadow = true;
  group.add(desk);

  // Warm LED glow strip under the countertop lip
  const ledStrip = new THREE.Mesh(
    new THREE.BoxGeometry(2.12, 0.035, 0.96),
    new THREE.MeshStandardMaterial({
      color: '#fde68a',
      emissive: '#fbbf24',
      emissiveIntensity: 0.95,
      roughness: 0.2,
    })
  );
  ledStrip.position.y = 0.845;
  group.add(ledStrip);

  // Crimson Chef Crest Emblem Plaque on Front Panel
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.44, 0.06),
    new THREE.MeshStandardMaterial({ map: createChefCrestTexture(theme?.trimColor ?? '#c9362b'), roughness: 0.38 })
  );
  plaque.position.set(0, 0.48, 0.45);
  group.add(plaque);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.1, 1.02), creamMat);
  counterTop.position.y = 0.91;
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  group.add(counterTop);

  // Touchscreen POS Monitor
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.14), posMat);
  stand.position.set(-0.08, 1.06, -0.04);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.06), posMat);
  screen.position.set(-0.08, 1.24, 0.02);
  screen.rotation.x = -0.22;
  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.28),
    new THREE.MeshBasicMaterial({ color: '#475569' })
  );
  screenGlow.position.set(-0.08, 1.24, 0.055);
  screenGlow.rotation.x = -0.22;
  group.add(stand, screen, screenGlow);

  // Card Payment Reader Terminal + Menu Flyer Stand
  const regBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.28), posMat);
  regBox.position.set(0.42, 1.05, 0.08);
  const regScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.04),
    new THREE.MeshStandardMaterial({ color: '#1e293b', emissive: '#38bdf8', emissiveIntensity: 0.55 })
  );
  regScreen.position.set(0.42, 1.2, 0.04);
  regScreen.rotation.x = -0.35;
  const flyerStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.28, 0.08),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 })
  );
  flyerStand.position.set(-0.68, 1.1, 0.08);
  flyerStand.rotation.x = -0.18;
  group.add(regBox, regScreen, flyerStand);

  // Yellow Blossom Bouquet Vase on Right Corner (matching reference image!)
  const sPot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.18, 12), creamMat);
  sPot.position.set(0.82, 1.05, 0.08);
  const sLeaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.55 })
  );
  sLeaves.position.set(0.82, 1.2, 0.08);
  const sBlooms = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 })
  );
  sBlooms.position.set(0.82, 1.28, 0.08);
  group.add(sPot, sLeaves, sBlooms);

  return group;
}

export interface DiningTableParts {
  group: THREE.Group;
  plateAnchor: THREE.Group;
  dirtyMesh: THREE.Group;
  seatOffsets: THREE.Vector3[];
}

export function createDiningTableMesh(isVip = false, theme?: CafeThemeDef): DiningTableParts {
  const group = new THREE.Group();
  group.add(createContactShadow(1.25, 0.95, 0.55));

  const oakMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(theme?.woodPrimary ?? '#de944b', theme?.woodSecondary ?? '#9e5924', 2),
    roughness: 0.45,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(theme?.woodSecondary ?? '#8f4d1e', '#5c2d10', 2),
    roughness: 0.52,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: theme?.id === 'royal_salon' ? '#b45309' : '#323438',
    roughness: 0.38,
    metalness: theme?.id === 'royal_salon' ? 0.65 : 0.42,
  });
  const cushionMat = new THREE.MeshStandardMaterial({
    color: theme?.cushionColor ?? '#d93829',
    roughness: 0.56,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: theme?.trimColor ?? '#c9362b',
    roughness: 0.5,
  });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f6efe4', roughness: 0.35 });

  // Square Honey-Oak Tabletop with beveled trim & dark charcoal square pedestal
  const topW = isVip ? 0.96 : 1.16;
  const topD = isVip ? 1.18 : 1.12;
  // Soft rounded edges for a chunky, cozy look
  const top = new THREE.Mesh(new RoundedBoxGeometry(topW, 0.09, topD, 3, 0.035), oakMat);
  top.position.y = 0.76;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), legMat);
  ped.position.y = 0.38;
  ped.castShadow = true;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.065, 0.64), legMat);
  base.position.y = 0.032;
  group.add(ped, base);

  // Centerpiece from Reference Image: Crimson rectangular mat + square cream mini herb planter + twin salt & pepper shakers
  const centerMat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.014, 0.4), trimMat);
  centerMat.position.set(0, 0.808, 0);
  group.add(centerMat);

  const miniPot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), creamMat);
  miniPot.position.set(0, 0.87, -0.02);
  const herbMat = new THREE.MeshStandardMaterial({ color: '#4ade80', roughness: 0.55 });
  const herbDarkMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 });
  for (let h = 0; h < 5; h++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), h % 2 === 0 ? herbMat : herbDarkMat);
    const a = (h / 5) * Math.PI * 2;
    puff.position.set(Math.cos(a) * 0.045, 0.96 + (h === 0 ? 0.04 : 0), -0.02 + Math.sin(a) * 0.045);
    group.add(puff);
  }
  const herbCenter = new THREE.Mesh(
    new THREE.SphereGeometry(0.072, 8, 8),
    new THREE.MeshStandardMaterial({ color: theme?.blossomColor ?? '#4ade80', roughness: 0.5 })
  );
  herbCenter.position.set(0, 1.0, -0.02);
  group.add(miniPot, herbCenter);

  // Twin Salt & Pepper Shakers flanking the plant
  for (const sx of [-0.14, 0.14]) {
    const shaker = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.075, 10), creamMat);
    shaker.position.set(sx, 0.85, 0.08);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.018, 10), legMat);
    cap.position.set(sx, 0.892, 0.08);
    group.add(shaker, cap);
  }

  const seatOffsets = [new THREE.Vector3(-0.98, 0, 0), new THREE.Vector3(0.98, 0, 0)];

  if (isVip) {
    // Bordered Crimson Area Rug under VIP Booth
    const rugOuter = new THREE.Mesh(
      new THREE.BoxGeometry(2.58, 0.018, 1.54),
      new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.85 })
    );
    rugOuter.position.y = 0.012;
    rugOuter.receiveShadow = true;
    const rugInner = new THREE.Mesh(
      new THREE.BoxGeometry(2.34, 0.022, 1.32),
      cushionMat
    );
    rugInner.position.y = 0.014;
    rugInner.receiveShadow = true;
    group.add(rugOuter, rugInner);

    // Tufted Crimson Leather Diner Booths with Dark Caramel-Oak Framing
    seatOffsets.forEach((off, idx) => {
      const booth = new THREE.Group();
      booth.position.set(off.x * 0.92, 0, 0);
      booth.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;

      const shellBase = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.26, 0.56), darkWoodMat);
      shellBase.position.set(0, 0.14, 0);
      const seatCushion = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.18, 0.48, 3, 0.06), cushionMat);
      seatCushion.position.set(0, 0.35, 0.02);
      seatCushion.castShadow = true;
      const backShell = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.96, 0.14, 2, 0.05), darkWoodMat);
      backShell.position.set(0, 0.52, -0.24);
      backShell.castShadow = true;

      // Tufted vertical ribs on booth backrest
      for (let t = -2; t <= 2; t++) {
        const rib = new THREE.Mesh(new RoundedBoxGeometry(0.19, 0.56, 0.12, 2, 0.045), cushionMat);
        rib.position.set(t * 0.21, 0.66, -0.14);
        rib.castShadow = true;
        booth.add(rib);
      }

      booth.add(shellBase, seatCushion, backShell);
      group.add(booth);
    });
  } else {
    // Honey-Oak Slatted Dining Chairs with Crimson Cushions
    seatOffsets.forEach((off, idx) => {
      const chair = new THREE.Group();
      chair.position.copy(off);
      chair.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;

      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.075, 0.48), oakMat);
      frame.position.y = 0.42;
      frame.castShadow = true;
      const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.09, 0.42, 3, 0.035), cushionMat);
      cushion.position.y = 0.49;
      cushion.castShadow = true;

      for (const lx of [-0.19, 0.19]) {
        for (const lz of [-0.19, 0.19]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.42, 0.065), oakMat);
          leg.position.set(lx, 0.21, lz);
          chair.add(leg);
        }
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), oakMat);
        post.position.set(lx, 0.69, -0.2);
        chair.add(post);
      }
      const backPad = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.06), cushionMat);
      backPad.position.set(0, 0.76, -0.18);
      chair.add(frame, cushion, backPad);
      group.add(chair);
    });
  }

  const plateAnchor = new THREE.Group();
  plateAnchor.position.set(0, 0.8, 0.24);
  group.add(plateAnchor);

  const dirtyMesh = new THREE.Group();
  dirtyMesh.position.set(0, 0.8, 0.24);
  const dPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.18, 0.04, 14),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.45 })
  );
  dPlate.position.y = 0.02;
  const scrap = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.03, 0.12),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.85 })
  );
  scrap.position.set(0.03, 0.05, -0.02);
  dirtyMesh.add(dPlate, scrap);
  dirtyMesh.visible = false;
  group.add(dirtyMesh);

  return { group, plateAnchor, dirtyMesh, seatOffsets };
}

// Sculpted Beveled 3D Vehicle Model (ExtrudeGeometry silhouette + alloy rims + clearcoat paint)
export interface VehicleParts {
  group: THREE.Group;
  wheels: THREE.Mesh[];
}

export function createVehicleMesh(def: VehicleDef): VehicleParts {
  const group = new THREE.Group();
  group.add(createContactShadow(1.15, 2.0, 0.75));

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: def.bodyColor,
    metalness: def.style === 'hatch' ? 0.35 : 0.75,
    roughness: def.style === 'hatch' ? 0.45 : 0.2,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const cabinGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#0f172a',
    metalness: 0.35,
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const wheelMat = new THREE.MeshStandardMaterial({ color: '#18181b', roughness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.92, roughness: 0.18 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.12 });

  const isTall = def.style === 'suv';
  const isSleek = def.style === 'sports' || def.style === 'supercar';
  const len = isSleek ? 3.55 : 3.25;
  const halfLen = len / 2;
  const deckH = isTall ? 0.65 : isSleek ? 0.44 : 0.54;
  const roofH = isTall ? 1.24 : isSleek ? 0.88 : 1.06;

  // Side silhouette profile extruded across vehicle width
  const shape = new THREE.Shape();
  shape.moveTo(-halfLen, 0.25);
  shape.lineTo(halfLen, 0.25);
  shape.lineTo(halfLen - 0.06, deckH * 0.88);
  shape.lineTo(halfLen - 0.78, deckH); // hood
  shape.lineTo(halfLen - 1.18, roofH); // sloped windshield
  shape.lineTo(-halfLen + (def.style === 'hatch' || isTall ? 0.35 : 0.75), roofH); // roof
  shape.lineTo(-halfLen + 0.15, deckH + 0.08); // rear glass
  shape.lineTo(-halfLen, 0.32);
  shape.closePath();

  const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.54,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  extrudeGeo.center();
  // Rotate so length aligns along Z axis
  extrudeGeo.rotateY(-Math.PI / 2);

  const hull = new THREE.Mesh(extrudeGeo, bodyMat);
  hull.position.y = 0.22 + roofH / 2;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // Tinted Cabin Window Band
  const cabinW = 1.46;
  const cabinLen = isTall ? 1.95 : isSleek ? 1.38 : 1.65;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, (roofH - deckH) * 0.72, cabinLen), cabinGlassMat);
  cabin.position.set(0, 0.25 + deckH + (roofH - deckH) * 0.42, -0.18);
  group.add(cabin);

  // Chrome front & rear bumpers
  for (const bz of [halfLen + 0.04, -halfLen - 0.04]) {
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 0.1), chromeMat);
    bumper.position.set(0, 0.38, bz);
    group.add(bumper);
  }

  // Sports rear wing
  if (isSleek) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.06, 0.28),
      new THREE.MeshStandardMaterial({ color: def.accentColor, metalness: 0.8, roughness: 0.2 })
    );
    wing.position.set(0, 0.94, -halfLen + 0.24);
    group.add(wing);
  }

  // Headlights & Taillights
  const headMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fef08a',
    emissiveIntensity: 1.1,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 0.95,
  });
  for (const sx of [-0.56, 0.56]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.08), headMat);
    hl.position.set(sx, 0.54, halfLen + 0.01);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.11, 0.08), tailMat);
    tl.position.set(sx, 0.58, -halfLen - 0.01);
    group.add(hl, tl);
  }

  // Wheels + Alloy Rims
  const wheels: THREE.Mesh[] = [];
  const wheelOffsets: [number, number][] = [
    [-0.86, 1.02],
    [0.86, 1.02],
    [-0.86, -1.02],
    [0.86, -1.02],
  ];
  wheelOffsets.forEach(([wx, wz]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.34, wz);
    wheel.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.26, 12), rimMat);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 8), chromeMat);
    wheel.add(rim, hub);
    group.add(wheel);
    wheels.push(wheel);
  });

  return { group, wheels };
}

// 3D House with Open-Top Cutaway Interior + Spawnable Furniture
export function createHouseStructure(house: HouseDef, ownedFurniture: string[]): THREE.Group {
  const group = new THREE.Group();
  const s = house.sizeScale;
  const w = 8.4 * s;
  const d = 7.4 * s;
  const wallH = 2.65;

  const floorMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(house.floorColor, '#451a03', 4),
    roughness: 0.5,
  });
  const wallMat = new THREE.MeshStandardMaterial({ color: house.wallColor, roughness: 0.7 });
  const trimMat = new THREE.MeshStandardMaterial({ color: house.roofColor, roughness: 0.42 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), floorMat);
  floor.position.y = 0.08;
  floor.receiveShadow = true;
  group.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.26), wallMat);
  backWall.position.set(0, wallH / 2 + 0.16, -d / 2 + 0.13);
  backWall.castShadow = true;
  backWall.receiveShadow = true;
  group.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.26, wallH, d), wallMat);
  leftWall.position.set(-w / 2 + 0.13, wallH / 2 + 0.16, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.26, wallH, d), wallMat);
  rightWall.position.set(w / 2 - 0.13, wallH / 2 + 0.16, 0);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  const roofRim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.24, 0.55), trimMat);
  roofRim.position.set(0, wallH + 0.24, -d / 2 + 0.12);
  roofRim.castShadow = true;
  group.add(roofRim);

  if (house.tier >= 4) {
    const colMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
    for (const sx of [-w / 2 + 0.42, w / 2 - 0.42]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.25, wallH, 16), colMat);
      col.position.set(sx, wallH / 2 + 0.16, d / 2 - 0.3);
      col.castShadow = true;
      group.add(col);
    }
  }

  // Starter Bed
  const bed = new THREE.Group();
  bed.position.set(-w / 2 + 1.4, 0.16, -d / 2 + 1.4);
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.32, 2.2),
    new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.58 })
  );
  frame.position.y = 0.16;
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.22, 2.0),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 })
  );
  mattress.position.y = 0.38;
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(1.58, 0.14, 1.2),
    new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.72 })
  );
  blanket.position.set(0, 0.44, 0.35);
  bed.add(frame, mattress, blanket);
  group.add(bed);

  if (ownedFurniture.includes('furn_sofa')) {
    const sofa = new THREE.Group();
    sofa.position.set(0.8, 0.16, -0.3);
    const sofaMat = new THREE.MeshStandardMaterial({ color: '#0f766e', roughness: 0.78 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 0.9), sofaMat);
    base.position.y = 0.21;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.22), sofaMat);
    back.position.set(0, 0.62, 0.34);
    sofa.add(base, back);
    group.add(sofa);
  }

  if (ownedFurniture.includes('furn_tv')) {
    const tvGroup = new THREE.Group();
    tvGroup.position.set(0.8, 0.16, -d / 2 + 0.55);
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.45, 0.45),
      new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.55 })
    );
    stand.position.y = 0.225;
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 1.05, 0.08),
      new THREE.MeshStandardMaterial({ color: '#09090b', emissive: '#1e3a8a', emissiveIntensity: 0.5 })
    );
    screen.position.set(0, 1.15, -0.1);
    tvGroup.add(stand, screen);
    group.add(tvGroup);
  }

  if (ownedFurniture.includes('furn_plant')) {
    const plant = createPottedPlantMesh();
    plant.position.set(w / 2 - 0.85, 0.16, -d / 2 + 0.85);
    group.add(plant);
  }

  if (ownedFurniture.includes('furn_dining')) {
    const dt = createDiningTableMesh(true);
    dt.group.position.set(-1.3, 0.16, 1.2);
    group.add(dt.group);
  }

  if (ownedFurniture.includes('furn_arcade')) {
    const arc = new THREE.Group();
    arc.position.set(w / 2 - 1.1, 0.16, 1.2);
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 1.65, 0.75),
      new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.4 })
    );
    cab.position.y = 0.825;
    const crt = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.45, 0.08),
      new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.95 })
    );
    crt.position.set(0, 1.2, 0.36);
    arc.add(cab, crt);
    group.add(arc);
  }

  if (ownedFurniture.includes('furn_piano')) {
    const piano = new THREE.Group();
    piano.position.set(2.2, 0.16, -0.8);
    const glossMat = new THREE.MeshPhysicalMaterial({ color: '#09090b', metalness: 0.35, roughness: 0.1, clearcoat: 1.0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 1.3), glossMat);
    body.position.y = 0.78;
    const keys = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.08, 0.3),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.2 })
    );
    keys.position.set(0, 0.76, 0.65);
    piano.add(body, keys);
    group.add(piano);
  }

  return group;
}

// Decorative Plant styled after Picture 2 (cream pot with themed rim stripe + lush broad-leaf rosette)
export function createPottedPlantMesh(bandColor = '#dc2626'): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.19, 0.38, 16),
    new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.45 })
  );
  pot.position.y = 0.19;
  pot.castShadow = true;
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.272, 0.264, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.4 })
  );
  band.position.y = 0.31;
  g.add(pot, band);

  const leafMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.48 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.52 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), i % 2 === 0 ? leafMat : leafDarkMat);
    leaf.scale.set(0.7, 0.25, 1.75);
    leaf.position.set(Math.cos(a) * 0.22, 0.48 + (i % 2) * 0.08, Math.sin(a) * 0.22);
    leaf.rotation.y = -a + Math.PI / 2;
    leaf.rotation.x = -0.38;
    leaf.castShadow = true;
    g.add(leaf);
  }
  const crownLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), leafMat);
  crownLeaf.scale.set(0.8, 0.9, 0.8);
  crownLeaf.position.y = 0.56;
  g.add(crownLeaf);
  return g;
}

export function createCityTreeMesh(): THREE.Group {
  const g = new THREE.Group();
  g.add(createContactShadow(1.3, 1.3, 0.6));

  const trunkMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.9 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.29, 1.65, 10), trunkMat);
  trunk.position.y = 0.825;
  trunk.castShadow = true;
  g.add(trunk);

  const foliageColors = ['#15803d', '#16a34a', '#22c55e'];
  const puffs: [number, number, number, number][] = [
    [0, 2.2, 0, 1.05],
    [0.55, 1.95, 0.35, 0.72],
    [-0.52, 2.05, -0.3, 0.75],
    [0.15, 2.8, -0.1, 0.76],
  ];
  puffs.forEach(([px, py, pz, r], i) => {
    const leaf = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r, 1),
      new THREE.MeshStandardMaterial({ color: foliageColors[i % 3], roughness: 0.74 })
    );
    leaf.position.set(px, py, pz);
    leaf.castShadow = true;
    g.add(leaf);
  });

  return g;
}

export function createStreetLampMesh(): { group: THREE.Group; bulbMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.75, roughness: 0.32 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.35, 12), poleMat);
  base.position.y = 0.175;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 3.7, 12), poleMat);
  pole.position.y = 1.85;
  pole.castShadow = true;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 0.08), poleMat);
  arm.position.set(0.32, 3.65, 0);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    emissive: '#f59e0b',
    emissiveIntensity: 0.4,
  });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), bulbMat);
  lamp.position.set(0.64, 3.55, 0);
  group.add(base, pole, arm, lamp);
  return { group, bulbMat };
}

export function createShopBuildingMesh(
  name: string,
  accentColor: string,
  wallColor = '#f1f5f9'
): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 3.3, 5.2),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.68 })
  );
  body.position.y = 1.65;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  // Roof cornice trim
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(7.1, 0.24, 5.5),
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45 })
  );
  cornice.position.y = 3.35;
  cornice.castShadow = true;
  g.add(cornice);

  // Storefront glass window + warm interior glow
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 1.85, 0.15),
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      emissive: '#fef3c7',
      emissiveIntensity: 0.18,
      metalness: 0.2,
      roughness: 0.08,
      clearcoat: 1.0,
    })
  );
  glass.position.set(0, 1.25, 2.58);
  g.add(glass);

  // Awning / Signband
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 0.55, 1.1),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.45 })
  );
  awning.position.set(0, 2.55, 2.8);
  awning.rotation.x = 0.22;
  awning.castShadow = true;
  g.add(awning);

  // Procedural Canvas Signboard
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 128;
  const ctx = signCanvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), 256, 64);

  const tex = new THREE.CanvasTexture(signCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.95, 0.18),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 })
  );
  sign.position.set(0, 3.55, 2.6);
  g.add(sign);

  return g;
}

// Warm Bistro String Lights across Patio / Entrance
export function createBistroStringLights(
  start: THREE.Vector3,
  end: THREE.Vector3,
  bulbCount = 7,
  bulbColor = '#fef08a',
  emissiveColor = '#fbbf24'
): { group: THREE.Group; bulbMats: THREE.MeshStandardMaterial[] } {
  const group = new THREE.Group();
  const bulbMats: THREE.MeshStandardMaterial[] = [];
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    p.y -= Math.sin(t * Math.PI) * 0.45; // natural catenary sag
    points.push(p);
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 16, 0.02, 6, false),
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 })
  );
  group.add(wire);

  for (let i = 1; i <= bulbCount; i++) {
    const t = i / (bulbCount + 1);
    const pt = curve.getPoint(t);
    const mat = new THREE.MeshStandardMaterial({
      color: bulbColor,
      emissive: emissiveColor,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), mat);
    bulb.position.copy(pt).add(new THREE.Vector3(0, -0.07, 0));
    group.add(bulb);
    bulbMats.push(mat);
  }

  return { group, bulbMats };
}

// Brushed Stainless Range Hood mounted over kitchen cooking line
export function createRangeHoodMesh(): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    metalness: 0.78,
    roughness: 0.24,
  });
  const darkVentMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.6,
    roughness: 0.42,
  });

  // Trapezoidal Exhaust Canopy (pre-rotate diamond 45deg before scaling so footprint stays axis-aligned)
  const canopyGeo = new THREE.CylinderGeometry(0.62, 1.0, 0.5, 4);
  canopyGeo.rotateY(Math.PI / 4);
  const canopy = new THREE.Mesh(canopyGeo, steelMat);
  canopy.scale.set(1.75, 1, 0.62);
  canopy.castShadow = true;
  g.add(canopy);

  // Upper Chimney Duct (kept cleanly below wall cap molding)
  const duct = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.44, 0.46), steelMat);
  duct.position.y = 0.45;
  duct.castShadow = true;
  g.add(duct);

  // Recessed Dark Grease Filter & Warm Light Bar Underneath
  const filter = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.04, 0.82), darkVentMat);
  filter.position.y = -0.26;
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.03, 0.12),
    new THREE.MeshStandardMaterial({ color: '#fef3c7', emissive: '#fde68a', emissiveIntensity: 0.9 })
  );
  glow.position.set(0, -0.27, -0.24);
  g.add(filter, glow);
  return g;
}

// Glass Sneeze-Guard Service Pass-Through Counter (separates kitchen line & dining room)
export function createPassThroughCounterMesh(theme?: CafeThemeDef): THREE.Group {
  const g = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({
    map: createWoodTexture(theme?.woodPrimary ?? '#cf8042', theme?.woodSecondary ?? '#8f4d1e', 2),
    roughness: 0.5,
  });
  const marbleMat = new THREE.MeshStandardMaterial({ color: '#f6efe4', roughness: 0.26 });
  const steelMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.78, roughness: 0.22 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#e0f2fe',
    transparent: true,
    opacity: 0.34,
    roughness: 0.08,
    depthWrite: false,
  });

  addCabinetFeet(g, 1.32, 0.34);

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.68, 0.76, 0.68), oakMat);
  base.position.y = 0.46;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  // Recessed Cabinet Door Panels
  for (const sx of [-0.82, 0, 0.82]) {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.58, 0.04),
      new THREE.MeshStandardMaterial({ color: '#e8d7c3', roughness: 0.5 })
    );
    door.position.set(sx, 0.46, 0.34);
    g.add(door);
  }

  const top = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.09, 0.78), marbleMat);
  top.position.y = 0.88;
  top.castShadow = true;
  top.receiveShadow = true;
  g.add(top);

  // Chrome Sneeze-Guard Frame & Clear Glass Panels
  for (const sx of [-1.2, 1.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.48, 8), steelMat);
    post.position.set(sx, 1.15, -0.18);
    const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), steelMat);
    frontPost.position.set(sx, 1.1, 0.24);
    g.add(post, frontPost);
  }
  const topGlass = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.025, 0.46), glassMat);
  topGlass.position.set(0, 1.38, 0.03);
  const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.42, 0.025), glassMat);
  frontGlass.position.set(0, 1.14, 0.25);
  g.add(topGlass, frontGlass);

  // Condiments & stacked plates only: no display food, so it never looks like dishes collect here
  const mustard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35 })
  );
  mustard.position.set(0.58, 1.03, 0.04);
  const ketchup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35 })
  );
  ketchup.position.set(0.44, 1.03, 0.04);
  const plates = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.16, 14), marbleMat);
  plates.position.set(1.02, 1.0, 0.02);
  g.add(mustard, ketchup, plates);

  return g;
}

// Low Cutaway Perimeter Half-Wall (Cream stone block base + caramel wood cap + flower planter boxes)
export function createCutawayHalfWallSegment(
  length: number,
  woodColor = '#9e5a37',
  stoneColor = '#ede3d7',
  withPlanter = true
): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: stoneColor, roughness: 0.78 });
  const groutMat = new THREE.MeshStandardMaterial({ color: '#d4c6b6', roughness: 0.85 });
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.48 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(length, 0.56, 0.26), stoneMat);
  base.position.y = 0.28;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const mortarLine = new THREE.Mesh(new THREE.BoxGeometry(length + 0.01, 0.03, 0.27), groutMat);
  mortarLine.position.y = 0.28;
  g.add(mortarLine);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(length + 0.06, 0.11, 0.34), woodMat);
  cap.position.y = 0.61;
  cap.castShadow = true;
  g.add(cap);

  if (withPlanter && length >= 2.2) {
    const planterCount = length >= 6 ? 2 : 1;
    for (let p = 0; p < planterCount; p++) {
      const px = planterCount === 1 ? 0 : (p === 0 ? -length * 0.26 : length * 0.26);
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 0.38), woodMat);
      box.position.set(px, 0.74, 0);
      box.castShadow = true;
      g.add(box);

      const leafMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.58 });
      const brightLeafMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.52 });
      const flowerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 });
      const centerMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.35 });

      for (let i = -2; i <= 2; i++) {
        const lx = px + i * 0.26;
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 8),
          i % 2 === 0 ? leafMat : brightLeafMat
        );
        bush.position.set(lx, 0.9, (i % 2) * 0.04);
        bush.castShadow = true;
        g.add(bush);

        if (i % 2 === 0) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), flowerMat);
          fl.position.set(lx, 1.04, 0.06);
          const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), centerMat);
          ctr.position.set(lx, 1.07, 0.07);
          g.add(fl, ctr);
        }
      }
    }
  }

  return g;
}

// Grand Diner Entrance Archway (Open glass double doors + scalloped striped awning + chef crest sign + sconces + topiary pots + doormat)
export function createEntranceArchwayMesh(
  trimColor = '#c9362b',
  woodColor = '#9e5a37'
): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.45 });
  const creamMat = new THREE.MeshStandardMaterial({ color: '#f8efe4', roughness: 0.42 });
  const redMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.38 });
  const brassMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.8, roughness: 0.24 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#bae6fd',
    transparent: true,
    opacity: 0.38,
    roughness: 0.08,
    depthWrite: false,
  });

  // Flanking Caramel-Oak Entrance Pillars (3.9 units apart so center doorway is 100% clear)
  for (const sz of [-1.95, 1.95]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.5, 0.36), woodMat);
    pillar.position.set(0, 1.25, sz);
    pillar.castShadow = true;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.14, 0.44), woodMat);
    cap.position.set(0, 2.52, sz);
    g.add(pillar, cap);

    // Wall Sconces flanking entrance
    const sconce = createWallSconceMesh('#fde68a');
    sconce.rotation.y = Math.PI / 2;
    sconce.position.set(0.22, 1.55, sz > 0 ? sz - 0.1 : sz + 0.1);
    g.add(sconce);

    // Cream Square Topiary Planters outside entrance
    const pot = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.42, 0.44), creamMat);
    pot.position.set(0.55, 0.21, sz * 1.05);
    pot.castShadow = true;
    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.58 })
    );
    shrub.position.set(0.55, 0.62, sz * 1.05);
    shrub.castShadow = true;
    g.add(pot, shrub);
  }

  // Open Double Glass Doors swung wide open so walk-through path stays clear
  for (const side of [-1, 1]) {
    const doorPivot = new THREE.Group();
    doorPivot.position.set(0, 0, side * 1.72);
    doorPivot.rotation.y = side * 1.38;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.08, 0.82), woodMat);
    frame.position.set(0, 1.04, -side * 0.41);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.78, 0.64), glassMat);
    pane.position.set(0, 1.04, -side * 0.41);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.05), brassMat);
    handle.position.set(0, 1.02, -side * 0.7);
    doorPivot.add(frame, pane, handle);
    g.add(doorPivot);
  }

  // Red & Cream Striped Scalloped Awning
  const stripeCount = 9;
  const stripeW = 3.6 / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    const sz = -1.8 + (i + 0.5) * stripeW;
    const mat = i % 2 === 0 ? redMat : creamMat;
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.14, stripeW - 0.01), mat);
    slat.position.set(0.55, 2.38, sz);
    slat.rotation.z = -0.34;
    slat.castShadow = true;
    const scallop = new THREE.Mesh(new THREE.CylinderGeometry(stripeW * 0.48, stripeW * 0.48, 0.12, 10), mat);
    scallop.rotation.z = Math.PI / 2;
    scallop.position.set(1.08, 2.15, sz);
    g.add(slat, scallop);
  }

  // Arched Chef-Crest Signboard above Awning
  const signFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 1.85), woodMat);
  signFrame.position.set(0.22, 2.84, 0);
  signFrame.castShadow = true;
  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.68, 0.58),
    new THREE.MeshStandardMaterial({ map: createChefCrestTexture(trimColor), roughness: 0.36 })
  );
  signFace.rotation.y = Math.PI / 2;
  signFace.position.set(0.315, 2.84, 0);
  g.add(signFrame, signFace);

  // Red Chef-Hat Welcome Doormat outside entrance
  const matMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.025, 1.85),
    new THREE.MeshStandardMaterial({ map: createChefCrestTexture(trimColor), roughness: 0.85 })
  );
  matMesh.position.set(0.88, 0.015, 0);
  matMesh.receiveShadow = true;
  g.add(matMesh);

  return g;
}

// Overhead Dark-Bronze Dome Pendant Lamp
export function createPendantLampMesh(lightColor = '#fde68a'): THREE.Group {
  const g = new THREE.Group();
  const bronzeMat = new THREE.MeshStandardMaterial({ color: '#292524', metalness: 0.65, roughness: 0.34 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: lightColor,
    emissive: lightColor,
    emissiveIntensity: 1.0,
    roughness: 0.2,
  });

  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), bronzeMat);
  cord.position.y = 0.42;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.24, 16, 1, true), bronzeMat);
  shade.material.side = THREE.DoubleSide;
  shade.castShadow = true;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bulbMat);
  bulb.position.y = -0.06;
  g.add(cord, shade, bulb);
  return g;
}

// Warm Brass & Charcoal Wall Sconce
export function createWallSconceMesh(lightColor = '#fde68a'): THREE.Group {
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.65, roughness: 0.34 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: lightColor,
    emissive: lightColor,
    emissiveIntensity: 1.0,
  });

  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.04), metalMat);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 8), metalMat);
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 0.04, 0.08);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.12, 12), metalMat);
  shade.position.set(0, -0.01, 0.15);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bulbMat);
  bulb.position.set(0, -0.07, 0.15);
  g.add(mount, arm, shade, bulb);
  return g;
}

// Wall-Mounted Hanging Trailing Ivy Shelf
export function createHangingIvyShelfMesh(woodColor = '#9e5a37'): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.52 });
  const leafMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.55 });
  const darkLeafMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.6 });

  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 0.34), woodMat);
  shelf.castShadow = true;
  g.add(shelf);

  for (let i = -2; i <= 2; i++) {
    const topPuff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), i % 2 === 0 ? leafMat : darkLeafMat);
    topPuff.position.set(i * 0.22, 0.14, 0.04);
    g.add(topPuff);

    const dropLen = 2 + (Math.abs(i) % 2);
    for (let d = 1; d <= dropLen; d++) {
      const vine = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), d % 2 === 0 ? leafMat : darkLeafMat);
      vine.position.set(i * 0.22 + (d % 2) * 0.04, 0.06 - d * 0.14, 0.15);
      g.add(vine);
    }
  }
  return g;
}

// Framed Burger Artwork Poster on Interior Wall
export function createFramedBurgerArtMesh(woodColor = '#9e5a37'): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: woodColor, roughness: 0.48 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.16, 0.08), woodMat);
  frame.castShadow = true;
  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 1.0),
    new THREE.MeshStandardMaterial({ map: createBurgerPosterTexture(), roughness: 0.42 })
  );
  art.position.z = 0.045;
  g.add(frame, art);
  return g;
}

// Brushed Brass & Oak Floor Threshold Divider Strip between Kitchen and Dining Zones
export function createFloorThresholdStrip(
  length: number,
  woodColor = '#9e5a37'
): THREE.Group {
  const g = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({
    color: woodColor,
    roughness: 0.46,
    metalness: 0.06,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#d4a348',
    roughness: 0.25,
    metalness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.008, length), oakMat);
  base.position.y = 0.004;
  base.receiveShadow = true;

  const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, length - 0.06), brassMat);
  inlay.position.y = 0.005;
  inlay.receiveShadow = true;

  g.add(base, inlay);
  return g;
}

// Cozy Woven Entrance Gallery Runner Rug placed inside the double glass doors
export function createEntranceRunnerRugMesh(
  trimColor = '#c9362b',
  woodColor = '#9e5a37',
  maxAnisotropy = 4
): THREE.Group {
  const g = new THREE.Group();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = mixHex(trimColor, '#7f1d1d', 0.25);
  ctx.fillRect(0, 0, 256, 512);

  // Subtle woven textile weave
  for (let y = 0; y < 512; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(0, y, 256, 2);
  }
  for (let x = 0; x < 256; x += 6) {
    ctx.fillStyle = 'rgba(255,250,240,0.04)';
    ctx.fillRect(x, 0, 2, 512);
  }

  // Ornate woven cream & caramel borders
  ctx.strokeStyle = '#f6e7d2';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 22, 220, 468);
  ctx.strokeStyle = mixHex(woodColor, '#eab308', 0.35);
  ctx.lineWidth = 5;
  ctx.strokeRect(32, 36, 192, 440);

  // Inner subtle diamond medallion pattern
  ctx.strokeStyle = 'rgba(255, 243, 220, 0.35)';
  ctx.lineWidth = 4;
  for (const cy of [128, 256, 384]) {
    ctx.save();
    ctx.translate(128, cy);
    ctx.rotate(Math.PI / 4);
    ctx.strokeRect(-26, -26, 52, 52);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
  }

  const rugTex = new THREE.CanvasTexture(canvas);
  rugTex.colorSpace = THREE.SRGBColorSpace;
  rugTex.anisotropy = maxAnisotropy;

  const rugMat = new THREE.MeshStandardMaterial({
    map: rugTex,
    roughness: 0.9,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const fringeMat = new THREE.MeshStandardMaterial({
    color: '#efe3d2',
    roughness: 0.92,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.014, 2.7), rugMat);
  body.position.y = 0.007;
  body.receiveShadow = true;

  const fringeTop = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.008, 0.08), fringeMat);
  fringeTop.position.set(0, 0.004, -1.39);
  const fringeBot = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.008, 0.08), fringeMat);
  fringeBot.position.set(0, 0.004, 1.39);

  g.add(body, fringeTop, fringeBot);
  return g;
}



// ---------------------------------------------------------------------------
// Locked kitchen machine: the real machine shape under a draped canvas cover,
// strapped like a delivered package, with a paper tag (dish + unlock level).
// ---------------------------------------------------------------------------
let coverFabricTexture: THREE.CanvasTexture | null = null;

function getCoverFabricTexture(): THREE.CanvasTexture {
  if (coverFabricTexture) return coverFabricTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#c9b48f';
  ctx.fillRect(0, 0, 256, 256);
  // Canvas weave
  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(80,60,30,0.07)';
    ctx.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 3) {
    ctx.fillStyle = x % 6 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(80,60,30,0.06)';
    ctx.fillRect(x, 0, 1, 256);
  }
  // Soft vertical fold shading
  for (let i = 0; i < 9; i++) {
    const x = 14 + i * 28 + Math.sin(i * 2.1) * 6;
    const g = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    g.addColorStop(0, 'rgba(60,45,25,0)');
    g.addColorStop(0.5, 'rgba(60,45,25,0.18)');
    g.addColorStop(1, 'rgba(60,45,25,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, 0, 20, 256);
  }
  coverFabricTexture = new THREE.CanvasTexture(c);
  coverFabricTexture.colorSpace = THREE.SRGBColorSpace;
  coverFabricTexture.wrapS = coverFabricTexture.wrapT = THREE.RepeatWrapping;
  return coverFabricTexture;
}

function createUnlockTagTexture(dishName: string, unlockLevel: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(192, 0);
  ctx.lineTo(192, 128);
  ctx.lineTo(24, 128);
  ctx.lineTo(0, 64);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c9b48f';
  ctx.beginPath();
  ctx.arc(22, 64, 7, 0, Math.PI * 2);
  ctx.fill();
  // Padlock
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(62, 46, 11, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#b45309';
  ctx.fillRect(46, 46, 32, 26);
  ctx.fillStyle = '#7c2d12';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Lv ${unlockLevel}`, 90, 70);
  ctx.font = 'bold 19px Arial, sans-serif';
  ctx.fillStyle = '#44403c';
  ctx.textAlign = 'center';
  const name = dishName.length > 15 ? `${dishName.slice(0, 14)}…` : dishName;
  ctx.fillText(name, 108, 108);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCoveredMachineMesh(type: StationType, dishName: string, unlockLevel: number): THREE.Group {
  const g = new THREE.Group();

  // Measure the real machine so the cover follows its shape
  const machine = createKitchenStationMesh(type);
  const box = new THREE.Box3().setFromObject(machine);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const w = size.x + 0.08;
  const h = Math.max(0.6, size.y - 0.02);
  const d = size.z + 0.08;

  // Draped cover: subdivided box, flared at the bottom, sagging on top, with wrinkles
  const geo = new THREE.BoxGeometry(w, h, d, 10, 8, 10);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + h / 2) / h; // 0 bottom → 1 top
    const flare = 1 + (1 - t) * 0.09;
    v.x *= flare;
    v.z *= flare;
    // Rounded top edges
    if (t > 0.92) {
      const k = (t - 0.92) / 0.08;
      v.x *= 1 - k * 0.05;
      v.z *= 1 - k * 0.05;
    }
    // Top sags between the machine's high points
    if (t > 0.99) v.y -= 0.035 * Math.cos((v.x / w) * Math.PI) * Math.cos((v.z / d) * Math.PI);
    // Vertical wrinkles + slight hem wave
    v.x += Math.sin(v.z * 11 + v.y * 3) * 0.012 * (1 - t * 0.6);
    v.z += Math.sin(v.x * 11 - v.y * 2) * 0.012 * (1 - t * 0.6);
    if (t < 0.05) v.y += Math.sin(v.x * 9 + v.z * 7) * 0.02;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const fabric = getCoverFabricTexture().clone();
  fabric.repeat.set(Math.max(1, w), Math.max(1, h));
  fabric.needsUpdate = true;
  const cover = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: fabric, color: '#e8dcc4', roughness: 0.95 })
  );
  cover.position.set(center.x, box.min.y + h / 2 + 0.01, center.z);
  cover.castShadow = true;
  cover.receiveShadow = true;
  g.add(cover);

  // Two cargo straps crossing over the top, like a wrapped package
  const strapMat = new THREE.MeshStandardMaterial({ color: '#c2410c', roughness: 0.6 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 0.8, roughness: 0.3 });
  const topY = box.min.y + h + 0.012;
  const strapT = 0.012;
  const strapW = 0.08;
  const sx = w * 1.05;
  const sz = d * 1.05;
  // Strap running along X (over the top and down both ends)
  const strapX = new THREE.Mesh(new THREE.BoxGeometry(sx, strapT, strapW), strapMat);
  strapX.position.set(center.x, topY, center.z);
  const strapXEndA = new THREE.Mesh(new THREE.BoxGeometry(strapT, h * 0.98, strapW), strapMat);
  strapXEndA.position.set(center.x - sx / 2, box.min.y + h / 2, center.z);
  const strapXEndB = strapXEndA.clone();
  strapXEndB.position.x = center.x + sx / 2;
  // Strap running along Z
  const strapZ = new THREE.Mesh(new THREE.BoxGeometry(strapW, strapT, sz), strapMat);
  strapZ.position.set(center.x, topY + 0.004, center.z);
  const strapZEndA = new THREE.Mesh(new THREE.BoxGeometry(strapW, h * 0.98, strapT), strapMat);
  strapZEndA.position.set(center.x, box.min.y + h / 2, center.z - sz / 2);
  const strapZEndB = strapZEndA.clone();
  strapZEndB.position.z = center.z + sz / 2;
  // Ratchet buckle on the front strap
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.03), buckleMat);
  buckle.position.set(center.x, box.min.y + h * 0.55, center.z + sz / 2 + 0.015);
  g.add(strapX, strapXEndA, strapXEndB, strapZ, strapZEndA, strapZEndB, buckle);

  // Paper tag hanging from the front strap: lock + unlock level + dish
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.28),
    new THREE.MeshStandardMaterial({
      map: createUnlockTagTexture(dishName, unlockLevel),
      roughness: 0.9,
      side: THREE.DoubleSide,
    })
  );
  tag.position.set(center.x + 0.2, box.min.y + h * 0.72, center.z + sz / 2 + 0.03);
  tag.rotation.z = -0.12;
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4),
    new THREE.MeshStandardMaterial({ color: '#57534e' })
  );
  string.position.set(center.x + 0.04, box.min.y + h * 0.72 + 0.04, center.z + sz / 2 + 0.03);
  string.rotation.z = 1.2;
  g.add(tag, string);

  return g;
}

/** Rounded rectangle path with a fallback for older WebViews without ctx.roundRect. */
function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const c = ctx as CanvasRenderingContext2D & { roundRect?: (...a: number[]) => void };
  ctx.beginPath();
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

// ---------------------------------------------------------------------------
// Realistic commercial kitchen floor: unglazed red quarry tile (15 cm) with dark
// epoxy grout, per-tile colour variation, worn sheen and anti-slip texture.
// One texture tile covers 1.2 m × 1.2 m (8 × 8 tiles); repeats are world-scaled.
// ---------------------------------------------------------------------------
export function createQuarryTileFloorTextures(
  widthM: number,
  depthM: number,
  maxAnisotropy = 4
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 512;
  const tiles = 8;
  const cell = size / tiles;
  const grout = 4;

  const make = () => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    return { c, ctx: c.getContext('2d')! };
  };
  const color = make();
  const bump = make();
  const rough = make();

  // Deterministic random so the floor looks the same every rebuild
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Grout
  color.ctx.fillStyle = '#3a3330';
  color.ctx.fillRect(0, 0, size, size);
  bump.ctx.fillStyle = '#2a2a2a';
  bump.ctx.fillRect(0, 0, size, size);
  rough.ctx.fillStyle = '#f0f0f0'; // grout is matte
  rough.ctx.fillRect(0, 0, size, size);

  const baseTones = [
    [148, 62, 42],
    [158, 70, 46],
    [139, 56, 38],
    [166, 78, 52],
    [152, 66, 40],
    [131, 54, 40],
  ];

  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      const x = c * cell + grout / 2;
      const y = r * cell + grout / 2;
      const s = cell - grout;
      const [br, bg, bb] = baseTones[Math.floor(rnd() * baseTones.length)];
      const v = (rnd() - 0.5) * 16;
      const tile = (k: number) => `rgb(${Math.round(br + v + k)},${Math.round(bg + v * 0.6 + k * 0.6)},${Math.round(bb + v * 0.4 + k * 0.4)})`;

      // Body with a soft darker rim (clay fired unevenly)
      const g = color.ctx.createRadialGradient(x + s / 2, y + s / 2, s * 0.15, x + s / 2, y + s / 2, s * 0.75);
      g.addColorStop(0, tile(6));
      g.addColorStop(1, tile(-14));
      color.ctx.fillStyle = g;
      roundedRectPath(color.ctx, x, y, s, s, 3);
      color.ctx.fill();

      // Clay speckles and small pits
      for (let k = 0; k < 40; k++) {
        const px = x + 2 + rnd() * (s - 4);
        const py = y + 2 + rnd() * (s - 4);
        const dark = rnd() < 0.6;
        color.ctx.fillStyle = dark ? 'rgba(60,25,15,0.35)' : 'rgba(230,170,130,0.28)';
        color.ctx.fillRect(px, py, 1.5, 1.5);
        if (dark && rnd() < 0.3) {
          bump.ctx.fillStyle = '#9a9a9a';
          bump.ctx.fillRect(px, py, 2, 2);
        }
      }

      // Raised tile face for the bump map (slightly domed)
      const bg2 = bump.ctx.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s * 0.72);
      bg2.addColorStop(0, '#d8d8d8');
      bg2.addColorStop(1, '#bcbcbc');
      bump.ctx.fillStyle = bg2;
      roundedRectPath(bump.ctx, x, y, s, s, 3);
      bump.ctx.fill();

      // Roughness: unglazed (fairly matte) with polished, worn patches from foot traffic
      const base = 150 + Math.round(rnd() * 40);
      rough.ctx.fillStyle = `rgb(${base},${base},${base})`;
      rough.ctx.fillRect(x, y, s, s);
    }
  }

  // Worn traffic sheen + faint scuffs across tiles
  for (let k = 0; k < 14; k++) {
    const cx = rnd() * size;
    const cy = rnd() * size;
    const rr = 30 + rnd() * 70;
    const g = rough.ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    g.addColorStop(0, 'rgba(70,70,70,0.55)');
    g.addColorStop(1, 'rgba(70,70,70,0)');
    rough.ctx.fillStyle = g;
    rough.ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  }
  color.ctx.strokeStyle = 'rgba(40,20,12,0.18)';
  color.ctx.lineWidth = 1;
  for (let k = 0; k < 22; k++) {
    const x0 = rnd() * size;
    const y0 = rnd() * size;
    color.ctx.beginPath();
    color.ctx.moveTo(x0, y0);
    color.ctx.quadraticCurveTo(x0 + (rnd() - 0.5) * 40, y0 + (rnd() - 0.5) * 40, x0 + (rnd() - 0.5) * 70, y0 + (rnd() - 0.5) * 70);
    color.ctx.stroke();
  }

  const finish = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(widthM / 1.2, depthM / 1.2);
    t.anisotropy = maxAnisotropy;
    return t;
  };
  return {
    map: finish(color.c, true),
    bumpMap: finish(bump.c, false),
    roughnessMap: finish(rough.c, false),
  };
}

let antiFatigueTexture: THREE.CanvasTexture | null = null;

/** Black rubber anti-fatigue mat with drainage holes and bevelled edges. */
export function createAntiFatigueMatMesh(width: number, depth: number): THREE.Group {
  if (!antiFatigueTexture) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, 128, 128);
    // Staggered drainage holes (transparent → floor shows through)
    ctx.globalCompositeOperation = 'destination-out';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * 16 + (row % 2 ? 8 : 0) + 4;
        const y = row * 16 + 4;
        roundedRectPath(ctx, x, y, 9, 9, 2.5);
        ctx.fill();
      }
    }
    antiFatigueTexture = new THREE.CanvasTexture(c);
    antiFatigueTexture.colorSpace = THREE.SRGBColorSpace;
    antiFatigueTexture.wrapS = antiFatigueTexture.wrapT = THREE.RepeatWrapping;
  }
  const tex = antiFatigueTexture.clone();
  tex.repeat.set(width / 0.22, depth / 0.22);
  tex.needsUpdate = true;
  const rubber = new THREE.MeshStandardMaterial({ color: '#2a2a2c', roughness: 0.92 });

  const g = new THREE.Group();
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.08, depth - 0.08),
    new THREE.MeshStandardMaterial({ map: tex, transparent: false, alphaTest: 0.5, roughness: 0.9 })
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.016;
  top.receiveShadow = true;
  g.add(top);
  // Solid bevelled border
  const edge = 0.05;
  for (const [w, d, x, z] of [
    [width, edge, 0, depth / 2 - edge / 2],
    [width, edge, 0, -depth / 2 + edge / 2],
    [edge, depth, width / 2 - edge / 2, 0],
    [edge, depth, -width / 2 + edge / 2, 0],
  ] as const) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, d), rubber);
    b.position.set(x, 0.008, z);
    b.receiveShadow = true;
    g.add(b);
  }
  return g;
}

/** Square stainless-steel floor drain with slotted grate. */
export function createFloorDrainMesh(): THREE.Group {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#b8bcc2', metalness: 0.85, roughness: 0.32 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111315', roughness: 0.8 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.008, 0.34), steel);
  frame.position.y = 0.004;
  const pit = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.009, 0.28), dark);
  pit.position.y = 0.0045;
  g.add(frame, pit);
  for (let i = 0; i < 7; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.01, 0.27), steel);
    bar.position.set(-0.12 + i * 0.04, 0.006, 0);
    g.add(bar);
  }
  return g;
}

/** Stainless-steel pedal bin for the kitchen (throw away wrong dishes). */
export function createKitchenBinMesh(): THREE.Group {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#c3c7cc', metalness: 0.85, roughness: 0.3 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: '#6b7280', metalness: 0.7, roughness: 0.4 });
  const black = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.66, 24), steel);
  body.position.y = 0.33;
  body.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.014, 6, 24), darkSteel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.66;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.05, 24), steel);
  lid.position.y = 0.69;
  lid.castShadow = true;
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.05), darkSteel);
  hinge.position.set(0, 0.68, -0.24);
  const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.12), black);
  pedal.position.set(0, 0.04, 0.26);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.22, 0.04, 24), black);
  base.position.y = 0.02;
  // Little "waste" label
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(0, 0, 64, 32);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('WASTE', 32, 22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  label.position.set(0, 0.45, 0.226);
  g.add(body, rim, lid, hinge, pedal, base, label);
  return g;
}
