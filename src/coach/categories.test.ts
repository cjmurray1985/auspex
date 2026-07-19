import { describe, it, expect } from 'vitest';
import type { EvaluationEngine } from './evaluation';
import type { CategoryKey, CategoryScore } from './types';
import { buildCategories } from './categories';

// buildCategories doesn't touch the engine (it's passed through unused), so a
// stub is fine for exercising the mode-aware weighting.
const engine = {} as unknown as EvaluationEngine;
const weightOf = (cats: CategoryScore[], key: CategoryKey) =>
  cats.find((c) => c.key === key)!.weight;
const sum = (cats: CategoryScore[]) => cats.reduce((a, c) => a + c.weight, 0);

describe('mode-aware coach weighting', () => {
  const human = buildCategories([], [], [], [], engine, 'human');
  const quick = buildCategories([], [], [], [], engine, 'quick');

  it('down-weights signal reading vs Quick Draft bots', () => {
    expect(weightOf(quick, 'signal-reading')).toBeLessThan(weightOf(human, 'signal-reading'));
  });

  it('leans harder on raw card evaluation + efficiency vs bots', () => {
    expect(weightOf(quick, 'card-eval')).toBeGreaterThan(weightOf(human, 'card-eval'));
    expect(weightOf(quick, 'pick-efficiency')).toBeGreaterThan(weightOf(human, 'pick-efficiency'));
  });

  it('keeps weights normalized to 1 in both modes', () => {
    expect(sum(human)).toBeCloseTo(1, 5);
    expect(sum(quick)).toBeCloseTo(1, 5);
  });
});
