import React, { useRef, useState } from 'react';

interface FloatingJoystickProps {
  onMove: (x: number, y: number) => void;
  /** Short taps (no drag) are forwarded so tap-to-walk still works inside the zone. */
  onTap: (clientX: number, clientY: number) => void;
  /** Pixels reserved at the bottom (management dock) where the zone should not reach. */
  bottomInset?: number;
}

const RADIUS = 44; // max knob travel in px
const DEAD_ZONE = 0.12;
const TAP_MAX_MS = 260;
const TAP_MAX_MOVE = 10;

/**
 * Mobile-game style floating joystick: touching anywhere in the left part of the
 * screen drops the stick under your thumb. At rest a faded hint shows where it is.
 * The right side of the screen stays free for drag-to-rotate and pinch-to-zoom.
 */
export const FloatingJoystick: React.FC<FloatingJoystickProps> = ({ onMove, onTap, bottomInset = 96 }) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ id: number; ox: number; oy: number; t: number; maxMove: number } | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const toLocal = (clientX: number, clientY: number) => {
    const rect = zoneRef.current!.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (pointerRef.current) return; // one thumb at a time
    e.preventDefault();
    e.stopPropagation();
    zoneRef.current?.setPointerCapture(e.pointerId);
    const p = toLocal(e.clientX, e.clientY);
    pointerRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, t: performance.now(), maxMove: 0 };
    setOrigin(p);
    setKnob({ x: 0, y: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const ptr = pointerRef.current;
    if (!ptr || e.pointerId !== ptr.id) return;
    e.stopPropagation();
    let dx = e.clientX - ptr.ox;
    let dy = e.clientY - ptr.oy;
    const dist = Math.hypot(dx, dy);
    ptr.maxMove = Math.max(ptr.maxMove, dist);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / RADIUS;
    const ny = dy / RADIUS;
    const mag = Math.hypot(nx, ny);
    if (mag < DEAD_ZONE) onMove(0, 0);
    else {
      // Rescale so movement starts smoothly just outside the dead zone
      const k = (mag - DEAD_ZONE) / (1 - DEAD_ZONE) / mag;
      onMove(nx * k, ny * k);
    }
  };

  const end = (e: React.PointerEvent) => {
    const ptr = pointerRef.current;
    if (!ptr || e.pointerId !== ptr.id) return;
    e.stopPropagation();
    const quick = performance.now() - ptr.t < TAP_MAX_MS && ptr.maxMove < TAP_MAX_MOVE;
    pointerRef.current = null;
    setOrigin(null);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
    if (quick && e.type === 'pointerup') onTap(e.clientX, e.clientY);
  };

  return (
    <div
      ref={zoneRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      className="pointer-events-auto fixed left-0 w-[46%] touch-none select-none"
      style={{ top: '22%', bottom: `calc(${bottomInset}px + env(safe-area-inset-bottom))` }}
      aria-label="Movement area: touch and drag to walk"
      role="application"
    >
      {/* Resting hint */}
      {!origin && (
        <div
          className="pointer-events-none absolute w-20 h-20 rounded-full border border-white/15 bg-slate-950/20 flex items-center justify-center"
          style={{ left: 'calc(20px + env(safe-area-inset-left))', bottom: 16 }}
        >
          <div className="w-8 h-8 rounded-full bg-amber-400/35 border border-amber-100/30" />
        </div>
      )}
      {/* Active stick under the thumb */}
      {origin && (
        <div
          className="pointer-events-none absolute"
          style={{ left: origin.x, top: origin.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="relative w-28 h-28 rounded-full bg-slate-950/45 border border-slate-300/40 shadow-xl flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-white/15" />
            <div
              className="absolute w-12 h-12 rounded-full bg-amber-400 border-2 border-amber-100 shadow-lg"
              style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
