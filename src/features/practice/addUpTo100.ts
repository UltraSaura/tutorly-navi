/** Shared bounded counter increment used by the separate Numbers after ten activity. */
export function nextAddUpValue(current: number, increment: 1 | 10, target: number): number {
  return Math.min(target, current + increment);
}
