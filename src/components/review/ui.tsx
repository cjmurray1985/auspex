import type { Confidence, PickTier } from '../../coach/types';
import { TIER_COLOR, TIER_LABEL } from './charts';

export function TierChip({ tier }: { tier: PickTier }) {
  return (
    <span className="tier-chip" style={{ color: TIER_COLOR[tier], borderColor: `${TIER_COLOR[tier]}66` }}>
      {TIER_LABEL[tier]}
    </span>
  );
}

const CONF_COLOR: Record<Confidence, string> = { high: '#6ad88a', medium: '#d4af6a', low: '#9a97a8' };

export function ConfidencePill({ level }: { level: Confidence }) {
  return (
    <span className="conf-pill" title="How much the underlying data agrees">
      <i className="conf-dot" style={{ background: CONF_COLOR[level] }} />
      {level} confidence
    </span>
  );
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#6ad88a';
  if (score >= 65) return '#8ad0f0';
  if (score >= 50) return '#d4af6a';
  if (score >= 38) return '#e0a880';
  return '#e05a5a';
}

export function MeterBar({ score, delay = 0 }: { score: number; delay?: number }) {
  return (
    <div className="meter">
      <div
        className="meter-fill"
        style={{ width: `${Math.max(2, score)}%`, background: scoreColor(score), transitionDelay: `${delay}ms` }}
      />
    </div>
  );
}
