/**
 * True when the user has asked the OS to reduce motion. Used to gate imperative
 * (canvas/JS) animation; CSS handles the rest via a media query and framer-motion
 * via <MotionConfig reducedMotion="user">.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
