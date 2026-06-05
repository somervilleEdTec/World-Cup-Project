/** True when the primary input is a touchscreen (phones, most tablets). */
export function isCoarsePointerDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** True when this focus should clear the field (touch tap or coarse-pointer device). */
export function shouldClearScoreInputOnFocus(touchStarted: boolean): boolean {
  return touchStarted || isCoarsePointerDevice();
}
