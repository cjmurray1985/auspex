import type { ReactNode } from 'react';
import type { CoachingMoment, DecisionEval } from '../../coach/types';
import type { RatedCard } from '../../types';
import { hoverProps } from '../CardPreview';
import { gradeColor } from '../Card3D';
import { ManaPip } from '../ManaSymbols';

/**
 * Templated visual for a coaching moment. Each feedback type gets the treatment
 * that reads best: a card comparison (what you took vs the stronger line), the
 * open-colour signal, a commitment gauge + colour-affinity bars, or a hero card
 * for a great pick. Grounded in the actual recorded decision.
 */

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;

function CardThumb({
  card,
  label,
  tone,
}: {
  card: RatedCard;
  label: string;
  tone: 'bad' | 'good' | 'neutral';
}) {
  return (
    <div className={`mv-card mv-${tone}`}>
      <span className="mv-card-label">{label}</span>
      <img
        className="mv-card-img"
        src={card.imageNormal}
        alt={card.name}
        loading="lazy"
        draggable={false}
        {...hoverProps(card, 'full')}
      />
      <span className="mv-card-grade" style={{ color: gradeColor(card.rating.grade) }}>
        {card.rating.grade}
      </span>
    </div>
  );
}

function Pips({ active }: { active: string[] }) {
  const on = new Set(active);
  return (
    <div className="mv-pips">
      {WUBRG.map((c) => (
        <ManaPip key={c} sym={c} dim={!on.has(c)} />
      ))}
    </div>
  );
}

function ColorBars({ affinity, committed }: { affinity: Record<string, number>; committed: string[] }) {
  const max = Math.max(1, ...WUBRG.map((c) => affinity[c] ?? 0));
  const on = new Set(committed);
  return (
    <div className="mv-bars">
      {WUBRG.map((c) => (
        <div key={c} className={`mv-bar${on.has(c) ? ' on' : ''}`}>
          <div className="mv-bar-col">
            <div className="mv-bar-fill" style={{ height: `${Math.round(((affinity[c] ?? 0) / max) * 100)}%` }} />
          </div>
          <ManaPip sym={c} />
        </div>
      ))}
    </div>
  );
}

function Gauge({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="mv-gauge">
      <div className="mv-gauge-track">
        <i style={{ width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%` }} />
      </div>
      <span className="mv-gauge-label">{label}</span>
    </div>
  );
}

function Comparison({ decision, accessory }: { decision: DecisionEval; accessory?: ReactNode }) {
  const gap = decision.valueGap;
  const samePick = decision.picked.card.id === decision.best.card.id;
  return (
    <div className="mv">
      <div className="mv-compare">
        <CardThumb card={decision.picked.card} label="You took" tone="bad" />
        {!samePick && (
          <>
            <div className="mv-delta">
              <span className="mv-delta-arrow" aria-hidden>→</span>
              {gap > 0 && <span className="mv-delta-val">−{gap.toFixed(1)}</span>}
            </div>
            <CardThumb card={decision.best.card} label="Stronger line" tone="good" />
          </>
        )}
      </div>
      {accessory}
    </div>
  );
}

export function MomentVisual({ moment, decision }: { moment: CoachingMoment; decision?: DecisionEval }) {
  if (!decision) return null;
  const ctx = decision.context;

  switch (moment.kind) {
    case 'great-pick':
      return (
        <div className="mv mv-hero">
          <CardThumb card={decision.picked.card} label="Your pick" tone="good" />
          <div className="mv-hero-note">
            Top of the pack — grade <b>{decision.picked.card.rating.grade}</b>. Exactly the pick.
          </div>
        </div>
      );

    case 'over-commit':
    case 'abandoned-lane':
      return (
        <div className="mv mv-commit">
          <Gauge
            pct={ctx.commitmentLevel}
            label={`Commitment ${Math.round(ctx.commitmentLevel * 100)}% at P${ctx.packNumber}P${ctx.pickNumber}`}
          />
          <ColorBars affinity={ctx.colorAffinity} committed={ctx.committedColors} />
          <CardThumb card={decision.picked.card} label="Locked into" tone="neutral" />
        </div>
      );

    case 'missed-signal':
    case 'over-read-signal':
      return (
        <Comparison
          decision={decision}
          accessory={
            <div className="mv-signal">
              <span className="mv-signal-label">
                {moment.kind === 'missed-signal' ? 'Open colours on the table' : 'The signal you read into'}
              </span>
              <Pips active={ctx.openColors} />
            </div>
          }
        />
      );

    case 'power-over-fit':
    case 'fit-over-power':
      return (
        <Comparison
          decision={decision}
          accessory={
            <div className="mv-signal">
              <span className="mv-signal-label">Your colours</span>
              <Pips active={ctx.committedColors} />
            </div>
          }
        />
      );

    default: // card-eval
      return <Comparison decision={decision} />;
  }
}
