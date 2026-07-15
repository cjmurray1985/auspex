import { motion } from 'framer-motion';
import type {
  BranchPoint,
  CategoryScore,
  CoachingMoment,
  DeckAnalysis,
} from '../../coach/types';
import type { Persona } from '../../engine/bot';
import type { RatedCard } from '../../types';
import { hoverProps } from '../CardPreview';
import { ConfidencePill, MeterBar, scoreColor } from './ui';

// ---------- Categories ----------

export function CategoriesPanel({ categories }: { categories: CategoryScore[] }) {
  return (
    <div className="cat-grid">
      {categories.map((c, i) => (
        <motion.div
          key={c.key}
          className="cat-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className="cat-top">
            <span className="cat-label">
              {c.label} <span className="cat-weight">{Math.round(c.weight * 100)}%</span>
            </span>
            <span className="cat-score" style={{ color: scoreColor(c.score) }}>{Math.round(c.score)}</span>
          </div>
          <MeterBar score={c.score} delay={i * 40} />
          <div className="cat-summary">{c.summary}</div>
          <ul className="cat-detail">
            {c.detail.map((d, j) => (
              <li key={j}>{d}</li>
            ))}
          </ul>
          <ConfidencePill level={c.confidence} />
        </motion.div>
      ))}
    </div>
  );
}

// ---------- Coaching moments ----------

export function MomentsList({
  moments,
  onJump,
  compact,
}: {
  moments: CoachingMoment[];
  onJump: (decisionIndex: number) => void;
  compact?: boolean;
}) {
  if (!moments.length)
    return <div className="empty-note">No standout swings — a steady, mistake-free draft.</div>;
  return (
    <div className={`moments-list${compact ? ' compact' : ''}`}>
      {moments.map((m, i) => (
        <motion.div
          key={m.id}
          className={`moment-card kind-${m.kind}`}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.12 }}
        >
          <div className="moment-rank">{i + 1}</div>
          <div className="moment-body">
            <div className="moment-title">
              {m.title}
              <span className="moment-ref">P{m.packNumber}P{m.pickNumber}</span>
            </div>
            <div className="moment-lesson">{m.lesson}</div>
            <button className="link-btn" onClick={() => onJump(m.decisionIndex)}>
              Review this pick →
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ---------- Branch analysis ----------

function BranchSide({
  side,
  best,
}: {
  side: BranchPoint['chosen'] | BranchPoint['alternative'];
  best: boolean;
}) {
  return (
    <div className={`branch-side${best ? ' winner' : ''}`}>
      <div className="branch-label">{side.label}</div>
      <img src={side.card.imageNormal} alt={side.card.name} className="branch-card" {...hoverProps(side.card, 'full')} />
      <div className="branch-arch">{side.archetype}</div>
      <div className="branch-quality">
        <MeterBar score={side.quality} />
        <span>{Math.round(side.quality)}/100{side.winRate ? ` · ${(side.winRate * 100).toFixed(1)}% WR` : ''}</span>
      </div>
      <ul className="branch-points">
        {side.strengths.map((s, i) => (
          <li key={`s${i}`} className="pos">+ {s}</li>
        ))}
        {side.weaknesses.map((s, i) => (
          <li key={`w${i}`} className="neg">− {s}</li>
        ))}
      </ul>
    </div>
  );
}

export function BranchPanel({ branches }: { branches: BranchPoint[] }) {
  if (!branches.length)
    return <div className="empty-note">No major forks — your lane was clear throughout.</div>;
  return (
    <div className="branch-list">
      {branches.map((b) => (
        <div key={b.decisionIndex} className="branch-card-wrap">
          <div className="branch-head">
            Fork at P{b.packNumber}P{b.pickNumber}
          </div>
          <div className="branch-sides">
            <BranchSide side={b.chosen} best={b.chosen.quality >= b.alternative.quality} />
            <div className="branch-vs">vs</div>
            <BranchSide side={b.alternative} best={b.alternative.quality > b.chosen.quality} />
          </div>
          <div className="branch-narrative">{b.narrative}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Deck analysis ----------

export function DeckPanelAnalysis({ deck }: { deck: DeckAnalysis }) {
  return (
    <div className="deck-analysis">
      <div className="deck-plan">{deck.gamePlan}</div>
      <div className="metric-grid">
        {deck.metrics.map((m) => (
          <div key={m.key} className="metric-card">
            <div className="metric-top">
              <span>{m.label}</span>
              <span style={{ color: scoreColor(m.score) }}>{Math.round(m.score)}</span>
            </div>
            <MeterBar score={m.score} />
            <div className="metric-vals">
              <span>{m.value}</span>
              <span className="metric-ideal">ideal {m.ideal}</span>
            </div>
          </div>
        ))}
      </div>

      {deck.bestCards.length > 0 && (
        <>
          <div className="section-subhead">Your best cards</div>
          <div className="best-cards">
            {deck.bestCards.map((c: RatedCard) => (
              <img key={c.id} src={c.imageNormal} alt={c.name} {...hoverProps(c, 'full')} />
            ))}
          </div>
        </>
      )}

      {deck.alternatives.length > 0 && (
        <>
          <div className="section-subhead">Decks you could also have built from this seat</div>
          <div className="alt-decks">
            {deck.alternatives.map((a) => (
              <div key={a.archetype} className="alt-deck">
                <div className="alt-deck-top">
                  <b>{a.archetype}</b>
                  <span style={{ color: scoreColor(a.quality) }}>{Math.round(a.quality)}/100</span>
                </div>
                <MeterBar score={a.quality} />
                <div className="alt-deck-note">
                  {a.playableCount} playables{a.winRate ? ` · ${(a.winRate * 100).toFixed(1)}% format WR` : ''}. {a.note}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Table ----------

function rankColor(rank: string): string {
  return (
    {
      Bronze: '#c08457',
      Silver: '#c3cad4',
      Gold: '#e6c463',
      Platinum: '#7fd6d0',
      Diamond: '#8ab6ff',
      Mythic: '#ff8a4c',
    }[rank] ?? 'var(--text-dim)'
  );
}

export function TablePanel({ opponents }: { opponents: Persona[] }) {
  if (!opponents.length) return null;
  return (
    <div className="table-panel">
      <div className="table-intro">
        Your seven opponents were a mixed-rank Arena-style pod. Their habits shaped which cards wheeled
        back to you.
      </div>
      <div className="opp-grid">
        {opponents.map((o, i) => (
          <div key={i} className="opp-card" style={{ borderLeftColor: rankColor(o.rank) }}>
            <span className="opp-rank" style={{ color: rankColor(o.rank) }}>{o.rank}</span>
            <span className="opp-style">{o.styleLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
