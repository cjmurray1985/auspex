import { describe, it, expect } from 'vitest';
import type { CoachProfile, RecurringPattern, WeeklyGoal } from './types';
import { activeNudge, selectNudges } from './nudge';

function profile(recurring: RecurringPattern[], goals: WeeklyGoal[]): CoachProfile {
  return { recurring, goals } as CoachProfile;
}

const habit: RecurringPattern = {
  id: 'pat-early-commit',
  flag: 'early-commit',
  title: 'You commit to colors too early',
  frequency: 0.7,
  description: 'In 70% of recent drafts you locked in early.',
  recommendation: 'Take the best card for the first 4–5 picks.',
  severity: 'focus',
};

const unmetGoal: WeeklyGoal = {
  id: 'goal-early-commit',
  title: 'Stop committing early',
  detail: 'Let your second color be pulled by a signal.',
  targetScore: 72,
  currentScore: 60,
  met: false,
};

const metGoal: WeeklyGoal = { ...unmetGoal, id: 'goal-met', met: true };

describe('ethical nudges (DA-123)', () => {
  it('never manufactures a nudge — none when there is no fact', () => {
    expect(selectNudges(profile([], []))).toHaveLength(0);
    expect(activeNudge(profile([], []))).toBeNull();
  });

  it('grounds every nudge in a real detected fact', () => {
    const n = activeNudge(profile([habit], []));
    expect(n).not.toBeNull();
    expect(n!.source).toBe('habit');
    expect(n!.factId).toBe(habit.id);
    expect(n!.action).toBe(habit.recommendation); // exactly one action
  });

  it('excludes met goals (only unmet goals nudge)', () => {
    expect(selectNudges(profile([], [metGoal]))).toHaveLength(0);
    const n = activeNudge(profile([], [unmetGoal]));
    expect(n?.source).toBe('goal');
    expect(n?.factId).toBe(unmetGoal.id);
  });

  it('prioritizes habits over goals', () => {
    const n = activeNudge(profile([habit], [unmetGoal]));
    expect(n?.source).toBe('habit');
  });

  it('is dismissible — a dismissed nudge falls through to the next', () => {
    const p = profile([habit], [unmetGoal]);
    const dismissed = (id: string) => id === `nudge-${habit.id}`;
    const n = activeNudge(p, dismissed);
    expect(n?.factId).toBe(unmetGoal.id); // fell through to the goal
  });

  it('returns null when everything is dismissed (never nags)', () => {
    const p = profile([habit], []);
    expect(activeNudge(p, () => true)).toBeNull();
  });
});
