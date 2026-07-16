import type { BranchPoint, CategoryScore, CoachingMoment, DecisionFacts } from './types';
import {
  TemplateExplainer,
  setExplainer,
  type Explainer,
  type HabitCopy,
  type HabitFact,
  type TrendFact,
} from './narrate';

/**
 * LLM narration adapter (DA-111)
 * ==============================
 * A drop-in `Explainer` that lets a language model *phrase* the coaching, while
 * the deterministic engines still *decide* everything. It obeys three rules:
 *
 *  1. **Deterministic fallback, always.** Every method falls back to
 *     `TemplateExplainer` on a cache miss, a model error, a timeout, or when
 *     offline. Grades and gating never wait on a model.
 *  2. **Facts only.** The model receives the same structured fact objects the
 *     template layer receives — never a re-evaluable card pool. It cannot change
 *     a pick, a tier, or a score. (Enforced by the DA-112 fact-contract test.)
 *  3. **No secrets in the bundle.** The transport is an injected `LLMClient`;
 *     the production client posts to a same-origin backend that holds the key.
 *
 * The `Explainer` interface is synchronous, so on the first render a phrase
 * returns the deterministic baseline and an enhancement is fetched in the
 * background (or via `prewarm`) for subsequent renders. This keeps the UI and
 * engines untouched: toggling the adapter changes *tone*, never outcomes.
 */

export type NarrationKind =
  | 'decision'
  | 'moment'
  | 'category'
  | 'branch'
  | 'headline'
  | 'progress';

export interface LLMRequest {
  kind: NarrationKind;
  /** The deterministic baseline — a safe default and a style anchor. */
  baseline: string;
  /** Structured facts, already free of re-evaluable card pools. */
  facts: unknown;
}

/**
 * Transport to a narration model. Production implementations route through a
 * backend (no API key in the client). Must reject on any failure so the caller
 * can fall back deterministically.
 */
export interface LLMClient {
  complete(req: LLMRequest): Promise<string>;
}

export interface LLMExplainerOptions {
  /** Per-call budget before we give up and keep the deterministic text. */
  timeoutMs?: number;
  /** Fallback explainer (defaults to a fresh deterministic `TemplateExplainer`). */
  fallback?: Explainer;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('llm-timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export class LLMExplainer implements Explainer {
  private readonly client: LLMClient;
  private readonly fallback: Explainer;
  private readonly timeoutMs: number;
  /** Phrased results keyed by the (stable) fact object they describe. */
  private readonly cache = new WeakMap<object, string>();
  private readonly inflight = new WeakSet<object>();

  constructor(client: LLMClient, opts: LLMExplainerOptions = {}) {
    this.client = client;
    this.fallback = opts.fallback ?? new TemplateExplainer();
    this.timeoutMs = opts.timeoutMs ?? 4000;
  }

  private phrase(key: object, kind: NarrationKind, baseline: string, facts: unknown): string {
    const hit = this.cache.get(key);
    if (hit != null) return hit;
    void this.enhance(key, kind, baseline, facts); // fire-and-forget; never blocks
    return baseline; // deterministic until (and unless) the model responds
  }

  private async enhance(
    key: object,
    kind: NarrationKind,
    baseline: string,
    facts: unknown,
  ): Promise<void> {
    if (this.cache.has(key) || this.inflight.has(key)) return;
    this.inflight.add(key);
    try {
      const text = await withTimeout(this.client.complete({ kind, baseline, facts }), this.timeoutMs);
      if (text && text.trim()) this.cache.set(key, text.trim());
    } catch {
      /* keep the deterministic baseline — never throw into the UI */
    } finally {
      this.inflight.delete(key);
    }
  }

  /**
   * Optionally pre-populate the cache before rendering (e.g. from the review
   * orchestrator) so the first paint already shows model tone. Never throws.
   */
  async prewarm(
    items: Array<{ key: object; kind: NarrationKind; baseline: string; facts: unknown }>,
  ): Promise<void> {
    await Promise.all(items.map((i) => this.enhance(i.key, i.kind, i.baseline, i.facts)));
  }

  decision(facts: DecisionFacts): string {
    return this.phrase(facts, 'decision', this.fallback.decision(facts), facts);
  }

  moment(moment: CoachingMoment, facts: DecisionFacts): string {
    return this.phrase(moment, 'moment', this.fallback.moment(moment, facts), { moment, facts });
  }

  category(cat: CategoryScore): string {
    return this.phrase(cat, 'category', this.fallback.category(cat), cat);
  }

  branch(branch: BranchPoint): string {
    return this.phrase(branch, 'branch', this.fallback.branch(branch), branch);
  }

  headline(review: Parameters<Explainer['headline']>[0]): string {
    return this.phrase(review, 'headline', this.fallback.headline(review), review);
  }

  // Habit copy is structured (title/description/recommendation), not a single
  // string, so it stays deterministic in v1 — the model rephrases prose, not
  // structured guidance.
  habit(fact: HabitFact): HabitCopy {
    return this.fallback.habit(fact);
  }

  progress(fact: TrendFact): string {
    return this.phrase(fact, 'progress', this.fallback.progress(fact), fact);
  }
}

/**
 * Production transport: POST the fact payload to a same-origin backend endpoint
 * that owns the model credentials. No secrets ship in the client bundle. The
 * endpoint itself is a Phase-2 backend task; this is the client seam for it.
 */
export function createHttpLLMClient(endpoint = '/api/narrate'): LLMClient {
  return {
    async complete(req: LLMRequest): Promise<string> {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`narrate ${res.status}`);
      const data = (await res.json()) as { text?: string };
      if (!data.text) throw new Error('empty narration');
      return data.text;
    },
  };
}

/** Install an LLM narrator. Off by default — the app stays deterministic until
 * this is called with a client. Returns the adapter (for `prewarm`). */
export function installLLMNarration(client: LLMClient, opts?: LLMExplainerOptions): LLMExplainer {
  const adapter = new LLMExplainer(client, opts);
  setExplainer(adapter);
  return adapter;
}
