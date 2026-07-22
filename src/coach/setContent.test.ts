import { describe, expect, it } from 'vitest';
import { setArchetypeFor, setCoaching, setPrimer } from './setContent';

describe('set-tailored coaching content (PRE-43)', () => {
  it('returns a set-specific archetype name + note for a known set/pair', () => {
    const arch = setArchetypeFor('DFT', ['U', 'W']);
    expect(arch).not.toBeNull();
    expect(arch?.name).toBe('Artifacts & Vehicles');
    expect(arch?.note).toMatch(/vehicle/i);
  });

  it('is color-order independent (canonical pair keys)', () => {
    expect(setArchetypeFor('OTJ', ['B', 'R'])).toEqual(setArchetypeFor('OTJ', ['R', 'B']));
  });

  it('exposes a format primer that references the set mechanics', () => {
    expect(setPrimer('DFT')).toMatch(/max speed|Vehicles|race/i);
    expect(setPrimer('OTJ')).toMatch(/Crime|Plot|Outlaw/i);
    expect(setPrimer('ECL')).toMatch(/Lorwyn|tribe|typal/i);
  });

  it('falls back cleanly for unknown sets', () => {
    expect(setArchetypeFor('ZZZ', ['U', 'W'])).toBeNull();
    expect(setArchetypeFor(undefined, ['U', 'W'])).toBeNull();
    expect(setPrimer('ZZZ')).toBeUndefined();
    expect(setPrimer(undefined)).toBeUndefined();
    expect(setCoaching('ZZZ')).toBeUndefined();
  });

  it('covers all ten color pairs for each shipped set', () => {
    for (const code of ['MSH', 'ECL', 'DFT', 'OTJ']) {
      const sc = setCoaching(code);
      expect(sc, code).toBeDefined();
      expect(Object.keys(sc!.archetypes).length, code).toBe(10);
    }
  });
});
