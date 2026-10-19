/**
 * 町のCanvasの動き。時刻(秒)から、動きの量を出す純粋な関数。
 * globals.css のCSSの動き(spru-bob・spru-hop・tile-pulse・pop-in・cloud-clear・town-foam)と同じ値にそろえる
 */

// CSSの ease-in-out / ease-out を、なめらかな曲線で近づける
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** 上下にゆれる(spru-bob)。period 秒で、0 → −3px → 0。delay の間は止まっている */
export function bobOffset(t: number, delay = 0, period = 2.4): number {
  const local = t - delay;
  if (local < 0) return 0;
  const phase = (local % period) / period;
  return -3 * easeInOut(phase < 0.5 ? phase * 2 : (1 - phase) * 2);
}

const HOP_KEYS: [number, number][] = [
  [0, 0],
  [0.3, -14],
  [0.55, 0],
  [0.75, -5],
  [1, 0],
];
const HOP_DURATION = 0.9;
const HOP_TIMES = 2;

/** 跳ねる(spru-hop。0.9秒を2回)。elapsed は跳ね始めてからの秒。2回のあとは0 */
export function hopOffset(elapsed: number): number {
  if (elapsed < 0 || elapsed >= HOP_DURATION * HOP_TIMES) return 0;
  const phase = (elapsed % HOP_DURATION) / HOP_DURATION;
  for (let i = 1; i < HOP_KEYS.length; i++) {
    const [t1, v1] = HOP_KEYS[i];
    if (phase <= t1) {
      const [t0, v0] = HOP_KEYS[i - 1];
      return lerp(v0, v1, easeOut((phase - t0) / (t1 - t0)));
    }
  }
  return 0;
}

/** 置ける場所の光(tile-pulse。1.1秒周期で不透明度0.55↔0.95) */
export function pulseOpacity(t: number): number {
  const phase = (t % 1.1) / 1.1;
  return lerp(0.55, 0.95, easeInOut(phase < 0.5 ? phase * 2 : (1 - phase) * 2));
}

const POP_DURATION = 0.45;

/** 置いたときの「ぽん」(pop-in。0.45秒)。elapsed は置いてからの秒。大きさ 0.3 → 1.12(60%)→ 1 */
export function popState(elapsed: number): { scale: number; opacity: number } {
  if (elapsed <= 0) return { scale: 0.3, opacity: 0 };
  if (elapsed >= POP_DURATION) return { scale: 1, opacity: 1 };
  const phase = elapsed / POP_DURATION;
  if (phase <= 0.6) {
    const k = phase / 0.6;
    return { scale: lerp(0.3, 1.12, k), opacity: 1 };
  }
  return { scale: lerp(1.12, 1, (phase - 0.6) / 0.4), opacity: 1 };
}

const CLOUD_DURATION = 1.2;

/** 区画が開いたとき、雲が晴れる(cloud-clear。1.2秒)。消えながら、上へ14px・1.18倍 */
export function cloudClear(elapsed: number): { opacity: number; dy: number; scale: number } {
  const k = easeOut(clamp01(elapsed / CLOUD_DURATION));
  return { opacity: 1 - k, dy: -14 * k + 0, scale: lerp(1, 1.18, k) };
}

/** 波の縁(town-foam。6秒周期で不透明度0.55 → 0.9 → 0.55) */
export function foamOpacity(t: number): number {
  const phase = (t % 6) / 6;
  return lerp(0.55, 0.9, easeInOut(phase < 0.5 ? phase * 2 : (1 - phase) * 2));
}
