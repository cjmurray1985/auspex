import { describe, it, expect, vi, afterEach } from 'vitest';
import { prefersReducedMotion } from './reducedMotion';

describe('prefersReducedMotion (DA-142)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false when matchMedia is unavailable', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reflects the reduce media query when present', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('reduce') }),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('is false when the user has not requested reduced motion', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    expect(prefersReducedMotion()).toBe(false);
  });
});
