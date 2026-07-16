import { describe, it, expect } from 'vitest';
import type { DecisionFacts } from './types';
import { TemplateExplainer } from './narrate';
import { LLMExplainer, type LLMClient } from './llm';

/**
 * DA-111 · LLM adapter behavior
 * Proves the adapter (1) falls back to deterministic text on model failure and
 * (2) only changes *tone* — the facts (and therefore grades) are never mutated.
 */

const facts: DecisionFacts = {
  pickedName: 'Lightning Strike',
  bestName: 'Lightning Strike',
  tier: 'best',
  valueGap: 0,
  openColors: [],
  committedColors: [],
  commitmentLevel: 0.5,
  reasons: [],
};

const baseline = new TemplateExplainer().decision(facts);

describe('LLMExplainer (DA-111)', () => {
  it('falls back to deterministic text when the model throws', () => {
    const throwing: LLMClient = { complete: () => Promise.reject(new Error('offline')) };
    const adapter = new LLMExplainer(throwing);
    expect(adapter.decision(facts)).toBe(baseline);
  });

  it('returns deterministic text before any enhancement (sync first paint)', () => {
    const upper: LLMClient = { complete: (req) => Promise.resolve(req.baseline.toUpperCase()) };
    const adapter = new LLMExplainer(upper);
    expect(adapter.decision(facts)).toBe(baseline);
  });

  it('changes tone only after prewarm, never the facts', async () => {
    const upper: LLMClient = { complete: (req) => Promise.resolve(req.baseline.toUpperCase()) };
    const adapter = new LLMExplainer(upper);

    const before = { tier: facts.tier, pickedName: facts.pickedName, bestName: facts.bestName };
    await adapter.prewarm([{ key: facts, kind: 'decision', baseline, facts }]);
    const phrased = adapter.decision(facts);

    expect(phrased).toBe(baseline.toUpperCase()); // tone changed
    expect(phrased).not.toBe(baseline);
    // facts (and therefore the grade) are untouched by narration
    expect(facts.tier).toBe(before.tier);
    expect(facts.pickedName).toBe(before.pickedName);
    expect(facts.bestName).toBe(before.bestName);
  });

  it('keeps deterministic text when the model times out', async () => {
    const slow: LLMClient = {
      complete: () => new Promise((resolve) => setTimeout(() => resolve('too late'), 50)),
    };
    const adapter = new LLMExplainer(slow, { timeoutMs: 5 });
    await adapter.prewarm([{ key: facts, kind: 'decision', baseline, facts }]);
    expect(adapter.decision(facts)).toBe(baseline);
  });
});
