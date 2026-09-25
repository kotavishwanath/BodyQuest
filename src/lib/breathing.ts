/**
 * Shared timing for the "Breathe with me" guide so the on-screen prompt and
 * the 3D lungs move together. One breath = 4 s in + 4 s out.
 */
export const BREATH_SECONDS = 8;

/** 0 (empty lungs) … 1 (full lungs), eased, for time `t` seconds into the guide. */
export function breathAmount(t: number): number {
  const phase = (t % BREATH_SECONDS) / BREATH_SECONDS; // 0..1
  return (1 - Math.cos(phase * Math.PI * 2)) / 2;
}

export function isInhaling(t: number): boolean {
  return t % BREATH_SECONDS < BREATH_SECONDS / 2;
}
