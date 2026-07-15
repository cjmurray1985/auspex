import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Candidate, DecisionEval } from '../../coach/types';
import { COLOR_NAMES } from '../../coach/context';
import { hoverProps } from '../CardPreview';
import { TierChip, ConfidencePill } from './ui';
import { TIER_COLOR } from './charts';

const colorText = (cols: string[]) => cols.map((c) => COLOR_NAMES[c] ?? c).join('/') || 'open';

function AltRow({ cand, maxVal, isPicked }: { cand: Candidate; maxVal: number; isPicked: boolean }) {
  return (
    <div className={`alt-row${isPicked ? ' picked' : ''}`} {...hoverProps(cand.card, 'full')}>
      <img src={cand.card.imageNormal} alt={cand.card.name} className="alt-thumb" />
      <div className="alt-body">
        <div className="alt-name">
          {cand.card.name}
          {isPicked && <span className="alt-you">your pick</span>}
        </div>
        <div className="alt-bar">
          <div className="alt-bar-fill" style={{ width: `${(cand.contextValue / maxVal) * 100}%` }} />
          <span className="alt-val">{cand.contextValue.toFixed(1)}</span>
        </div>
        <div className="alt-tags">
          <span className="alt-power">power {cand.power.toFixed(1)}</span>
          {cand.fitReasons.slice(0, 3).map((r, i) => (
            <span key={i} className={`fit-tag ${r.delta >= 0 ? 'pos' : 'neg'}`}>
              {r.delta >= 0 ? '+' : ''}
              {r.delta.toFixed(1)} {r.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionCard({ d, open, onToggle }: { d: DecisionEval; open: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const maxVal = Math.max(...d.alternatives.map((a) => a.contextValue), d.picked.contextValue, 1);
  const passed = d.alternatives.filter((a) => a.card.id !== d.picked.card.id).slice(0, 3);

  return (
    <div className={`decision-card tier-${d.tier}`} ref={ref}>
      <button className="decision-head" onClick={onToggle}>
        <span className="pick-ref">
          P{d.context.packNumber}
          <b>P{d.context.pickNumber}</b>
        </span>
        <img src={d.picked.card.imageNormal} alt={d.picked.card.name} className="decision-thumb" {...hoverProps(d.picked.card, 'full')} />
        <span className="decision-main">
          <span className="decision-name">{d.picked.card.name}</span>
          <span className="decision-sub">{d.narrative}</span>
        </span>
        <span className="decision-tier">
          <TierChip tier={d.tier} />
          {d.contested && <span className="contested-badge" title="Top cards were within noise — reasonable to differ">contested</span>}
        </span>
      </button>
      {open && (
        <motion.div className="decision-body" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <div className="decision-context">
            <span className="ctx-item">
              <label>Committed</label>
              {colorText(d.context.committedColors)}
            </span>
            <span className="ctx-item">
              <label>Signals open</label>
              {d.context.openColors.length ? colorText(d.context.openColors) : 'none clear'}
            </span>
            <span className="ctx-item">
              <label>Commitment</label>
              <span className="ctx-meter"><i style={{ width: `${d.context.commitmentLevel * 100}%` }} /></span>
            </span>
            <ConfidencePill level={d.confidenceBand} />
          </div>
          {d.facts.opportunityCost && <div className="opp-cost">Opportunity cost: {d.facts.opportunityCost}</div>}
          <div className="alt-list">
            <div className="alt-head">Your pick vs. the best alternatives</div>
            <AltRow cand={d.picked} maxVal={maxVal} isPicked />
            {passed.map((a) => (
              <AltRow key={a.card.id} cand={a} maxVal={maxVal} isPicked={false} />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export function ReplayPanel({ decisions, focusIndex }: { decisions: DecisionEval[]; focusIndex?: number | null }) {
  const [filter, setFilter] = useState<'all' | 'issues'>('all');
  const [open, setOpen] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusIndex == null) return;
    setOpen((s) => new Set(s).add(focusIndex));
    const el = containerRef.current?.querySelector(`[data-idx="${focusIndex}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusIndex]);

  const shown = decisions.filter((d) => (filter === 'all' ? true : d.tier === 'weak' || d.tier === 'mistake'));

  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="replay-panel" ref={containerRef}>
      <div className="replay-filters">
        <button className={`chip-btn${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
          All {decisions.length} picks
        </button>
        <button className={`chip-btn${filter === 'issues' ? ' on' : ''}`} onClick={() => setFilter('issues')}>
          Misplays only
        </button>
        <span className="replay-legend">
          {(['best', 'strong', 'acceptable', 'weak', 'mistake'] as const).map((t) => (
            <span key={t}><i style={{ background: TIER_COLOR[t] }} /> {t}</span>
          ))}
        </span>
      </div>
      <div className="decision-list">
        {shown.map((d) => (
          <div key={d.context.index} data-idx={d.context.index}>
            <DecisionCard d={d} open={open.has(d.context.index)} onToggle={() => toggle(d.context.index)} />
          </div>
        ))}
      </div>
    </div>
  );
}
