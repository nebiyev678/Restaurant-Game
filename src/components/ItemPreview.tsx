import React, { useEffect, useRef, useState } from 'react';
import { ImageOff, Rotate3d } from 'lucide-react';
import * as THREE from 'three';
import { PreviewKind, buildPreviewModel, previewKey, previewShot } from '../game/previewModels';
import { ShotOptions, previewStudio } from '../game/previewStudio';

// ---------------------------------------------------------------------------
// Static thumbnail of any item, rendered from its real in-game 3D model
// ---------------------------------------------------------------------------
interface PreviewThumbProps {
  kind: PreviewKind;
  id: string;
  alt: string;
  className?: string;
  /** Dim + grayscale for locked items. */
  locked?: boolean;
}

export const PreviewThumb: React.FC<PreviewThumbProps> = ({ kind, id, alt, className = '', locked }) => {
  const key = previewKey(kind, id);
  const [url, setUrl] = useState<string | undefined>(() => previewStudio.getCached(key));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const cached = previewStudio.getCached(key);
    if (cached) {
      setUrl(cached);
      return;
    }
    setUrl(undefined);
    previewStudio
      .thumbnail(key, () => buildPreviewModel(kind, id), previewShot(kind, id))
      .then((u) => {
        if (!alive) return;
        if (u) setUrl(u);
        else setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [key, kind, id]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[radial-gradient(ellipse_at_50%_70%,#334155_0%,#0f172a_75%)] ${className}`}
    >
      {url ? (
        <img
          src={url}
          alt={alt}
          draggable={false}
          className={`absolute inset-0 w-full h-full object-contain transition-[filter,opacity] duration-300 ${
            locked ? 'grayscale opacity-55' : ''
          }`}
        />
      ) : failed ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600">
          <ImageOff className="w-5 h-5" />
        </div>
      ) : (
        <div className="absolute inset-0 animate-pulse bg-slate-800/40" aria-label={`Loading ${alt}`} />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Live 3D viewer: auto-rotates, drag / swipe to spin
// ---------------------------------------------------------------------------
interface LiveModelViewerProps {
  /** Changes whenever the model to show changes. */
  modelKey: string;
  build: () => THREE.Object3D;
  shot?: ShotOptions;
  className?: string;
  autoRotate?: boolean;
  children?: React.ReactNode;
}

export const LiveModelViewer: React.FC<LiveModelViewerProps> = ({
  modelKey,
  build,
  shot = {} as ShotOptions,
  className = '',
  autoRotate = true,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  const yawRef = useRef(shot.yaw ?? 0.7);
  const dragRef = useRef<{ x: number; yaw: number; moved: boolean } | null>(null);
  const idleRef = useRef(0);
  const [unavailable, setUnavailable] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    previewStudio.acquireLive();

    const obj = buildRef.current();
    const framing = previewStudio.frame(obj, shot.focus);
    const pitch = shot.pitch ?? 0.32;
    const padding = shot.padding ?? 0.92;
    // Pop-in animation when switching models
    let appear = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) {
        idleRef.current += dt;
        if (autoRotate && !dragRef.current && idleRef.current > 1.2) yawRef.current += dt * 0.45;
        appear = Math.min(1, appear + dt * 3.5);
        const s = 0.85 + 0.15 * (1 - Math.pow(1 - appear, 3));
        obj.scale.setScalar(s);
        const ok = previewStudio.renderLive(canvas, obj, framing, yawRef.current, pitch, padding);
        if (!ok) {
          setUnavailable(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      previewStudio.releaseLive();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, yaw: yawRef.current, moved: false };
    setHintVisible(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 3) d.moved = true;
    yawRef.current = d.yaw - dx * 0.012;
    idleRef.current = 0;
  };
  const onPointerUp = () => {
    dragRef.current = null;
    idleRef.current = 0;
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Spotlight floor */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_78%,rgba(251,191,36,0.22)_0%,rgba(30,41,59,0.6)_38%,#020617_80%)]" />
      <div className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[70%] h-[14%] rounded-[50%] bg-[radial-gradient(ellipse,rgba(148,163,184,0.25),transparent_70%)]" />
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label="3D preview, drag to rotate"
      />
      {unavailable && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
          3D preview unavailable on this device
        </div>
      )}
      {hintVisible && !unavailable && (
        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-slate-300">
          <Rotate3d className="w-3 h-3" /> Drag to rotate
        </div>
      )}
      {children}
    </div>
  );
};
