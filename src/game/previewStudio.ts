/**
 * Preview Studio: renders the game's own procedural 3D models into shop thumbnails
 * and live, rotatable showroom views.
 *
 * - One small offscreen WebGLRenderer is shared by every preview on screen.
 * - Thumbnails are rendered one per animation frame (no UI jank) and cached as
 *   image data URLs, so each item is drawn only once per session.
 * - When nothing needs it, the renderer and its GL context are released, which
 *   frees every GPU resource it uploaded without touching the main game renderer.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ShotOptions {
  /** Horizontal camera angle in radians (0 = looking at the model's front, +z). */
  yaw?: number;
  /** Camera elevation in radians. */
  pitch?: number;
  /** Frame the whole model, or zoom on its upper part (hats, faces). */
  focus?: 'full' | 'upper' | 'head';
  /** >1 adds space around the model, <1 zooms in. */
  padding?: number;
  /** Colourful round badge behind the model: [centre colour, edge colour]. */
  backdrop?: [string, string];
}

interface Framing {
  center: THREE.Vector3;
  radius: number;
}

interface Job {
  key: string;
  build: () => THREE.Object3D;
  opts: ShotOptions;
  size: number;
  resolve: (url: string) => void;
}

const _box = new THREE.Box3();
const _sphere = new THREE.Sphere();
const _size = new THREE.Vector3();

class PreviewStudio {
  private renderer: THREE.WebGLRenderer | null = null;
  private envTexture: THREE.Texture | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
  private readonly cache = new Map<string, string>();
  private readonly pending = new Map<string, Promise<string>>();
  private queue: Job[] = [];
  private pumping = false;
  private liveUsers = 0;
  private releaseTimer = 0;
  private failed = false;

  constructor() {
    // Bright, warm "food photo" lighting: strong key, soft fill and a cool rim to pop the edges
    const hemi = new THREE.HemisphereLight('#ffffff', '#9a8070', 1.25);
    const key = new THREE.DirectionalLight('#fff1d6', 2.4);
    key.position.set(4, 7, 6);
    const fill = new THREE.DirectionalLight('#ffe9f0', 0.6);
    fill.position.set(-5, 3, 4);
    const rim = new THREE.DirectionalLight('#d6e8ff', 1.0);
    rim.position.set(-6, 4, -5);
    this.scene.add(hemi, key, fill, rim);
  }

  /** True when WebGL is unavailable; callers should fall back to an icon. */
  get unavailable() {
    return this.failed;
  }

  getCached(key: string): string | undefined {
    return this.cache.get(key);
  }

  /** Renders (or returns the cached) thumbnail for `key`. */
  thumbnail(key: string, build: () => THREE.Object3D, opts: ShotOptions = {}, size = 256): Promise<string> {
    const cached = this.cache.get(key);
    if (cached) return Promise.resolve(cached);
    const inflight = this.pending.get(key);
    if (inflight) return inflight;
    const p = new Promise<string>((resolve) => {
      this.queue.push({ key, build, opts, size, resolve });
    });
    this.pending.set(key, p);
    this.pump();
    return p;
  }

  /** Call when a live viewer mounts / unmounts so the renderer stays alive while needed. */
  acquireLive() {
    this.liveUsers++;
    window.clearTimeout(this.releaseTimer);
  }

  releaseLive() {
    this.liveUsers = Math.max(0, this.liveUsers - 1);
    this.scheduleRelease();
  }

  /** Computes a yaw-independent framing (bounding sphere) for an object. */
  frame(obj: THREE.Object3D, focus: ShotOptions['focus'] = 'full'): Framing {
    obj.updateMatrixWorld(true);
    // A model can ask to be framed on some of its parts (e.g. the food, not the whole plate)
    const parts = obj.userData.frameOn as THREE.Object3D[] | undefined;
    if (parts?.length) {
      _box.makeEmpty();
      for (const p of parts) _box.expandByObject(p, true);
    } else {
      _box.setFromObject(obj, true);
    }
    if (_box.isEmpty()) return { center: new THREE.Vector3(), radius: 1 };
    if (focus !== 'full') {
      _box.getSize(_size);
      _box.min.y = _box.max.y - _size.y * (focus === 'head' ? 0.24 : 0.46);
    }
    _box.getBoundingSphere(_sphere);
    return { center: _sphere.center.clone(), radius: Math.max(0.05, _sphere.radius) };
  }

  /**
   * Live render of `obj` into a visible 2D canvas (used by showroom viewers).
   * Returns false if WebGL is unavailable.
   */
  renderLive(
    target: HTMLCanvasElement,
    obj: THREE.Object3D,
    framing: Framing,
    yaw: number,
    pitch: number,
    padding = 1
  ): boolean {
    const r = this.ensureRenderer();
    if (!r) return false;
    const w = target.width;
    const h = target.height;
    if (w === 0 || h === 0) return true;
    r.setSize(w, h, false);
    this.placeCamera(framing, yaw, pitch, w / h, padding);
    this.scene.add(obj);
    r.render(this.scene, this.camera);
    this.scene.remove(obj);
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(r.domElement, 0, 0, w, h);
    }
    return true;
  }

  // ---------------------------------------------------------------------------

  private ensureRenderer(): THREE.WebGLRenderer | null {
    if (this.renderer) return this.renderer;
    if (this.failed) return null;
    try {
      const canvas = document.createElement('canvas');
      const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      r.setPixelRatio(1);
      r.setClearColor(0x000000, 0);
      r.outputColorSpace = THREE.SRGBColorSpace;
      // Neutral tone mapping keeps food colours rich (ACES washes reds and yellows out)
      r.toneMapping = THREE.NeutralToneMapping;
      r.toneMappingExposure = 1.05;
      const pmrem = new THREE.PMREMGenerator(r);
      this.envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      this.scene.environment = this.envTexture;
      this.renderer = r;
      return r;
    } catch {
      this.failed = true;
      return null;
    }
  }

  private placeCamera(f: Framing, yaw: number, pitch: number, aspect: number, padding: number) {
    const cam = this.camera;
    cam.aspect = aspect;
    const vFov = THREE.MathUtils.degToRad(cam.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const fitFov = Math.min(vFov, hFov);
    const dist = (f.radius / Math.sin(fitFov / 2)) * padding;
    cam.position.set(
      f.center.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      f.center.y + Math.sin(pitch) * dist,
      f.center.z + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    cam.near = Math.max(0.01, dist - f.radius * 2.5);
    cam.far = dist + f.radius * 3;
    cam.lookAt(f.center);
    cam.updateProjectionMatrix();
  }

  private pump() {
    if (this.pumping) return;
    this.pumping = true;
    window.clearTimeout(this.releaseTimer);
    const step = () => {
      const job = this.queue.shift();
      if (!job) {
        this.pumping = false;
        this.scheduleRelease();
        return;
      }
      let url = '';
      try {
        const r = this.ensureRenderer();
        if (r) {
          const obj = job.build();
          const framing = this.frame(obj, job.opts.focus);
          r.setSize(job.size, job.size, false);
          this.placeCamera(framing, job.opts.yaw ?? 0.65, job.opts.pitch ?? 0.38, 1, job.opts.padding ?? 0.95);
          this.scene.add(obj);
          r.render(this.scene, this.camera);
          this.scene.remove(obj);
          url = job.opts.backdrop ? this.withBackdrop(r.domElement, job.size, job.opts.backdrop) : r.domElement.toDataURL('image/webp', 0.9);
        }
      } catch {
        url = '';
      }
      if (url) this.cache.set(job.key, url);
      this.pending.delete(job.key);
      job.resolve(url);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Draws the render on a glossy coloured disc, like an app icon. */
  private withBackdrop(src: HTMLCanvasElement, size: number, [inner, outer]: [string, string]): string {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    if (!x) return src.toDataURL('image/webp', 0.9);
    const r = size / 2;
    const g = x.createRadialGradient(r * 0.8, r * 0.7, r * 0.1, r, r, r);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    x.fillStyle = g;
    x.beginPath();
    x.arc(r, r, r - 1, 0, Math.PI * 2);
    x.fill();
    // Soft glossy highlight in the top-left
    const hl = x.createRadialGradient(r * 0.62, r * 0.45, 0, r * 0.62, r * 0.45, r * 0.75);
    hl.addColorStop(0, 'rgba(255,255,255,0.55)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = hl;
    x.beginPath();
    x.arc(r, r, r - 1, 0, Math.PI * 2);
    x.fill();
    // Food shadow on the disc, then the food
    x.save();
    x.beginPath();
    x.arc(r, r, r - 1, 0, Math.PI * 2);
    x.clip();
    // Juicier colours where the browser supports canvas filters
    if ('filter' in x) x.filter = 'saturate(1.35) contrast(1.06)';
    x.drawImage(src, 0, 0, size, size);
    x.restore();
    x.lineWidth = Math.max(2, size * 0.02);
    x.strokeStyle = 'rgba(255,255,255,0.7)';
    x.beginPath();
    x.arc(r, r, r - x.lineWidth / 2 - 1, 0, Math.PI * 2);
    x.stroke();
    return c.toDataURL('image/webp', 0.92);
  }

  private scheduleRelease() {
    window.clearTimeout(this.releaseTimer);
    if (this.liveUsers > 0 || this.queue.length > 0) return;
    this.releaseTimer = window.setTimeout(() => {
      if (this.liveUsers > 0 || this.queue.length > 0 || !this.renderer) return;
      this.scene.environment = null;
      this.envTexture?.dispose();
      this.envTexture = null;
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }, 4000);
  }
}

export const previewStudio = new PreviewStudio();
