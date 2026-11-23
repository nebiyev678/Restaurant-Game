/**
 * Mobile helpers: touch detection, haptic feedback and automatic graphics quality.
 */

export type GraphicsQuality = 'auto' | 'low' | 'medium' | 'high';
export type ResolvedQuality = Exclude<GraphicsQuality, 'auto'>;

/** True on phones/tablets (coarse pointer, no hover). */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0)
    );
  } catch {
    return false;
  }
}

/**
 * Picks a starting quality from device hints. The engine also watches the frame
 * rate and steps down automatically if the device struggles.
 */
export function detectAutoQuality(): ResolvedQuality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const touch = isTouchDevice();
  if (!touch) return cores >= 4 ? 'high' : 'medium';
  if (memory <= 2 || cores <= 4) return 'low';
  if (memory <= 4 || cores <= 6) return 'medium';
  return 'high';
}

export function resolveQuality(q: GraphicsQuality | undefined): ResolvedQuality {
  return !q || q === 'auto' ? detectAutoQuality() : q;
}

/** Render settings for each quality level. */
export const QUALITY_PRESETS: Record<
  ResolvedQuality,
  { pixelRatioCap: number; shadows: boolean; shadowMapSize: number; softShadows: boolean }
> = {
  low: { pixelRatioCap: 1, shadows: false, shadowMapSize: 512, softShadows: false },
  medium: { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024, softShadows: false },
  high: { pixelRatioCap: 2, shadows: true, shadowMapSize: 2048, softShadows: true },
};

// ---------------------------------------------------------------------------
// Haptics (Android WebView supports navigator.vibrate; iOS Safari ignores it)
// ---------------------------------------------------------------------------
let hapticsEnabled = true;

export function setHapticsEnabled(on: boolean) {
  hapticsEnabled = on;
}

export const HAPTIC = {
  tap: 10,
  action: 18,
  success: [14, 40, 22],
  perfect: [12, 30, 12, 30, 28],
  warning: [40, 60, 40],
  levelUp: [20, 50, 20, 50, 60],
} as const;

export function haptic(pattern: number | readonly number[]) {
  if (!hapticsEnabled) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch {
    // vibration not supported / blocked
  }
}
