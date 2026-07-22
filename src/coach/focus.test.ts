import { describe, expect, it } from 'vitest';
import type { CoachProfile, RecurringPattern } from './types';
import { nextDraftFocus } from './focus';

function pattern(over: Partial<RecurringPattern> = {}): RecurringPattern {
  return {
    id: 'pat-missed-signals',
    flag: 'missed-signals',
    title: 'You miss open signals',
    frequency: 0.5,
    description: 'In half of recent drafts you read signals late.',
    recommendation: 'Track which colors wheel and pivot toward them.',
    severity: 'watch',
    ...over,
  };
}

function profile(recurring: RecurringPattern[]): CoachProfile {
  return { recurring } as CoachProfile;
}

describe('next-draft focus (PRE-52)', () => {
  it('returns null when there is no recurring fact (never manufactured)', () => {
    expect(nextDraftFocus(profile([]))).toBeNull();
  });

  it('carries the recurring habit forward as a single focus with one action', () => {
    const f = nextDraftFocus(profile([pattern()]));
    expect(f).not.toBeNull();
    expect(f?.id).toBe('focus-pat-missed-signals');
    expect(f?.action).toBe('Track which colors wheel and pivot toward them.');
  });

  it('prioritizes a focus-severity habit over a watch-severity one', () => {
    const watch = pattern({ id: 'pat-a', severity: 'watch' });
    const focus = pattern({ id: 'pat-b', severity: 'focus', title: 'You commit too early' });
    const f = nextDraftFocus(profile([watch, focus]));
    expect(f?.id).toBe('focus-pat-b');
  });
});
