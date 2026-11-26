import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export type PostFxLevel = 'off' | 'lite' | 'full';

/**
 * Warm, glowing "concept art" finish:
 *  - bloom so lamps, LED strips, emissive trims and holograms glow into the air
 *  - a colour grade after tone mapping: a little more saturation and contrast, a warm tint
 *  - a soft vignette that frames the restaurant
 * 'lite' renders bloom at a lower resolution and without MSAA; 'off' skips the composer entirely.
 */
const GradeShader = {
  name: 'WarmGrade',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    saturation: { value: 1.22 },
    contrast: { value: 1.08 },
    warmth: { value: 0.045 },
    vignette: { value: 0.3 },
    aspect: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float warmth;
    uniform float vignette;
    uniform float aspect;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c *= vec3(1.0 + warmth, 1.0 + warmth * 0.35, 1.0 - warmth * 0.7);
      vec2 d = (vUv - 0.5) * vec2(aspect, 1.0);
      float v = smoothstep(0.95, 0.3, length(d) / max(aspect, 1.0) * 1.35);
      c *= mix(1.0 - vignette, 1.0, v);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), tex.a);
    }`,
};

export class PostFx {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private level: PostFxLevel;
  private renderer: THREE.WebGLRenderer;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, level: PostFxLevel) {
    this.renderer = renderer;
    this.level = level;
    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: level === 'full' ? 4 : 2,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    // Bloom made bright steel (fridge top, hoods) flare into white blotches, so it stays off;
    // the pass is kept (disabled) in case a gentler, emissive-only glow is wanted later.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.45, 0.5, 1.8);
    this.bloom.enabled = false;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.setSize(size.x, size.y);
  }

  setLevel(level: PostFxLevel) {
    if (level === this.level) return;
    this.level = level;
    const size = this.renderer.getSize(new THREE.Vector2());
    this.setSize(size.x, size.y);
  }

  getLevel() {
    return this.level;
  }

  setSize(w: number, h: number) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    // Bloom works on a downscaled copy; lite uses an even smaller one
    const k = this.level === 'full' ? 0.5 : 0.33;
    this.bloom.setSize(Math.max(64, Math.round(w * this.renderer.getPixelRatio() * k)), Math.max(64, Math.round(h * this.renderer.getPixelRatio() * k)));
    this.grade.uniforms.aspect.value = w / Math.max(1, h);
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  dispose() {
    this.composer.dispose();
    this.bloom.dispose();
  }
}

/** Soft rounded-rectangle shadow texture used for baked contact shadows under furniture. */
let contactTex: THREE.Texture | null = null;
export function getSoftFootprintTexture(): THREE.Texture {
  if (contactTex) return contactTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const steps = 10;
  // Stacked translucent rounded rects: dense in the middle, feathered edges (no canvas filter needed)
  for (let i = 0; i < steps; i++) {
    const inset = 6 + i * 3.2;
    ctx.fillStyle = `rgba(30,18,10,${0.075})`;
    ctx.beginPath();
    ctx.roundRect(inset, inset, S - inset * 2, S - inset * 2, Math.max(6, 30 - i * 2));
    ctx.fill();
  }
  contactTex = new THREE.CanvasTexture(c);
  contactTex.colorSpace = THREE.SRGBColorSpace;
  return contactTex;
}

/** Linear fade (dark at v = 0) for the soft shadow where floor meets wall. */
let wallTex: THREE.Texture | null = null;
export function getWallBaseShadowTexture(): THREE.Texture {
  if (wallTex) return wallTex;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(30,18,10,0.55)');
  g.addColorStop(0.4, 'rgba(30,18,10,0.18)');
  g.addColorStop(1, 'rgba(30,18,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 64);
  wallTex = new THREE.CanvasTexture(c);
  wallTex.colorSpace = THREE.SRGBColorSpace;
  return wallTex;
}
