import { describe, it, expect } from 'vitest';
import type {
  BranchPoint,
  CategoryScore,
  CoachingMoment,
  DecisionFacts,
  DraftReview,
} from './types';
import type { RatedCard } from '../types';
import type { TrendFact } from './narrate';
import { LLMExplainer, sanitizeFacts, type LLMClient, type LLMRequest } from './llm';

/**
 * DA-112 · Fact-contract test (narration-only guarantee)
 * Snapshots the exact payloads the adapter sends to a model and fails if any
 * re-evaluable card data (oracle text, ratings, images, mana cost, the pool)
 * leaks in. The model may see identifiers (names) and computed facts only.
 */

// Keys that must NEVER appear in a narration payload.
const FORBIDDEN = [
  'oracleText',
  'imageNormal',
  'imageLarge',
  'artCrop',
  'backImage',
  'tokenImages',
  'manaCost',
  'colorIdentity',
  'keywords',
  'creatureTypes',
  'producedMana',
  'gihwr',
  'gihSamples',
  'rating',
  'cardPool',
];

function ratedCard(name: string): RatedCard {
  return {
    id: name,
    collectorNumber: '1',
    name,
    manaCost: '{1}{U}',
    cmc: 2,
    colors: ['U'],
    colorIdentity: ['U'],
    rarity: 'rare',
    typeLine: 'Creature — Wizard',
    oracleText: 'Draw a card. This is re-evaluable text a model must not see.',
    imageNormal: 'https://img/normal.jpg',
    imageLarge: 'https://img/large.jpg',
    keywords: ['Flying'],
    creatureTypes: ['Wizard'],
    power: '2',
    toughness: '2',
    rating: { gihwr: 0.58, gihSamples: 4000, score: 6.5, grade: 'B+', source: 'winrate' },
  };
}

const decisionFacts: DecisionFacts = {
  pickedName: 'Chosen Card',
  bestName: 'Best Card',
  tier: 'acceptable',
  valueGap: 0.7,
  openColors: ['U'],
  committedColors: ['U', 'R'],
  commitmentLevel: 0.6,
  reasons: [{ kind: 'on-color', delta: 0.3, text: 'fits your colors' }],
};

const moment: CoachingMoment = {
  id: 'm1',
  title: 'Missed an open lane',
  packNumber: 1,
  pickNumber: 5,
  impact: 0.8,
  kind: 'missed-signal',
  lesson: 'Move into open colors.',
  decisionIndex: 4,
};

const category: CategoryScore = {
  key: 'card-eval',
  label: 'Card Evaluation',
  score: 80,
  weight: 0.22,
  confidence: 'high',
  summary: 'You spotted the strong cards.',
  detail: ['Took the bomb P1P1'],
  recommendation: 'Keep naming the best card first.',
};

const branch: BranchPoint = {
  packNumber: 1,
  pickNumber: 4,
  decisionIndex: 3,
  chosen: {
    label: 'UR Spells',
    colors: ['U', 'R'],
    archetype: 'UR Spells',
    quality: 78,
    winRate: 0.56,
    strengths: ['tempo'],
    weaknesses: ['clunky'],
    card: ratedCard('Chosen Card'),
  },
  alternative: {
    label: 'GW Counters',
    colors: ['G', 'W'],
    archetype: 'GW Counters',
    quality: 74,
    strengths: ['go-wide'],
    weaknesses: ['no reach'],
    card: ratedCard('Alt Card'),
  },
  narrative: 'A real fork.',
};

const review: Pick<DraftReview, 'overall' | 'letter' | 'archetype' | 'categories' | 'tierCounts'> = {
  overall: 75,
  letter: 'B',
  archetype: 'UR Spells',
  categories: [category],
  tierCounts: { best: 1, strong: 2, acceptable: 3, weak: 1, mistake: 0 },
};

const trend: TrendFact = { label: 'signal reading', delta: 5 };

describe('fact contract (DA-112)', () => {
  it('never sends re-evaluable card data to the model, across every method', async () => {
    const captured: LLMRequest[] = [];
    const client: LLMClient = {
      complete: async (req) => {
        captured.push(req);
        return 'ok';
      },
    };
    const adapter = new LLMExplainer(client, { timeoutMs: 1000 });

    adapter.decision(decisionFacts);
    adapter.moment(moment, decisionFacts);
    adapter.category(category);
    adapter.branch(branch);
    adapter.headline(review);
    adapter.progress(trend);
    await new Promise((r) => setTimeout(r, 0)); // flush fire-and-forget enhancements

    expect(captured).toHaveLength(6);
    for (const req of captured) {
      const json = JSON.stringify(req.facts);
      for (const forbidden of FORBIDDEN) {
        expect(json, `${req.kind} payload leaked "${forbidden}"`).not.toContain(forbidden);
      }
    }
  });

  it('keeps card *names* (identifiers) in the branch payload', async () => {
    const captured: LLMRequest[] = [];
    const client: LLMClient = {
      complete: async (req) => {
        captured.push(req);
        return 'ok';
      },
    };
    const adapter = new LLMExplainer(client);
    adapter.branch(branch);
    await new Promise((r) => setTimeout(r, 0));

    const json = JSON.stringify(captured.find((r) => r.kind === 'branch')?.facts);
    expect(json).toContain('Chosen Card');
    expect(json).toContain('Alt Card');
    expect(json).toContain('archetype');
  });

  it('sanitizeFacts collapses a raw card to just its name', () => {
    const safe = sanitizeFacts({ card: ratedCard('Bolt'), note: 'keep me' }) as {
      card: Record<string, unknown>;
      note: string;
    };
    expect(safe.card).toEqual({ name: 'Bolt' });
    expect(safe.note).toBe('keep me');
  });
});
