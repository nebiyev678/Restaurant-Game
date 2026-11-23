import React, { useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const maxRadius = 36;

  const updateFromClient = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / maxRadius, dy / maxRadius);
  };

  const reset = () => {
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Movement joystick"
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setActive(true);
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!active) return;
        e.stopPropagation();
        updateFromClient(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        reset();
      }}
      onPointerCancel={reset}
      className="pointer-events-auto relative w-24 h-24 rounded-full bg-slate-950/65 border-2 border-slate-500/50 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing shadow-lg"
    >
      <div className="w-12 h-12 rounded-full border border-slate-400/25 pointer-events-none" />
      <div
        className="absolute w-10 h-10 rounded-full bg-amber-400 border-2 border-amber-100 shadow-md pointer-events-none transition-transform duration-75"
        style={{
          transform: `translate(${knob.x}px, ${knob.y}px) scale(${active ? 1.08 : 1})`,
        }}
      />
    </div>
  );
};
