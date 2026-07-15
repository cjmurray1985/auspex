import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDraft } from '../../store';
import { fx } from '../../fx/fx';
import { gradeColor } from '../Card3D';
import { EquityChart, CommitmentChart } from './charts';
import { ReplayPanel } from './ReplayPanel';
import { ProgressDashboard } from './ProgressDashboard';
import {
  BranchPanel,
  CategoriesPanel,
  DeckPanelAnalysis,
  MomentsList,
  TablePanel,
} from './panels';
import { ConfidencePill, MeterBar, scoreColor } from './ui';

function useCountUp(target: number, duration = 1300, delay = 500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);
  return value;
}

export function GradingInterstitial() {
  const messages = [
    'Reconstructing every pick in context\u2026',
    'Cross-checking multiple data sources\u2026',
    'Reading the signals you saw\u2026',
    'Measuring decision quality\u2026',
    'Finding your biggest coaching moments\u2026',
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % messages.length), 620);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <div className="grade-screen" style={{ justifyContent: 'center' }}>
      <div className="spinner" />
      <motion.p
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginTop: '1.4rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}
      >
        {messages[i]}
      </motion.p>
    </div>
  );
}

type Tab = 'overview' | 'categories' | 'replay' | 'timeline' | 'branches' | 'deck' | 'progress' | 'table';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'categories', label: 'Categories' },
  { key: 'replay', label: 'Replay' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'branches', label: 'Branches' },
  { key: 'deck', label: 'Deck' },
  { key: 'progress', label: 'Progress' },
  { key: 'table', label: 'Table' },
];

export function ReviewScreen() {
  const review = useDraft((s) => s.review);
  const opponents = useDraft((s) => s.opponents);
  const records = useDraft((s) => s.records);
  const profile = useDraft((s) => s.profile);
  const reset = useDraft((s) => s.reset);
  const startDraft = useDraft((s) => s.startDraft);
  const counted = useCountUp(review?.overall ?? 0);
  const [tab, setTab] = useState<Tab>('overview');
  const [replayFocus, setReplayFocus] = useState<number | null>(null);

  const prior = records.slice(0, -1);
  const best = prior.length ? Math.max(...prior.map((h) => h.overall)) : null;
  const isPB = best !== null && review !== null && review.overall > best;

  useEffect(() => {
    if (!review) return;
    const t1 = setTimeout(() => fx.burst({ count: 220, gold: true }), 480);
    const t2 = isPB ? setTimeout(() => fx.burst({ count: 300, gold: true }), 1700) : undefined;
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [review, isPB]);

  if (!review) return null;

  const jump = (decisionIndex: number) => {
    setReplayFocus(null);
    requestAnimationFrame(() => {
      setTab('replay');
      setReplayFocus(decisionIndex);
    });
  };

  const letterColor = gradeColor(review.letter);

  return (
    <div className="review-screen">
      {/* ---------- Hero ---------- */}
      <div className="review-hero">
        <motion.div className="hero-left" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div
            className="hero-letter"
            style={{ color: letterColor }}
            initial={{ scale: 2.6, opacity: 0, rotateX: 55 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 14 }}
          >
            {review.letter}
          </motion.div>
          <div className="hero-score">
            {counted}
            <span>/100</span>
          </div>
        </motion.div>
        <div className="hero-right">
          <div className="hero-eyebrow">
            DRAFT REVIEW · {review.archetype.toUpperCase()}
            {review.archetypeWinRate ? ` · ${(review.archetypeWinRate * 100).toFixed(1)}% FORMAT WR` : ''}
          </div>
          <div className="hero-headline">{review.headline}</div>
          <div className="hero-badges">
            <ConfidencePill level={review.confidence} />
            {isPB && <span className="pb-badge">NEW PERSONAL BEST</span>}
            {best !== null && !isPB && <span className="badge">Best: {best}/100 · {records.length} drafts</span>}
            <span className="rating-chip" style={{ borderColor: profile.rank.color, color: profile.rank.color }}>
              {profile.rank.name} · {profile.rating}
              {profile.ratingDelta !== 0 && (
                <b style={{ color: profile.ratingDelta > 0 ? '#6ad88a' : '#e0a880' }}>
                  {' '}{profile.ratingDelta > 0 ? '+' : ''}{profile.ratingDelta}
                </b>
              )}
            </span>
          </div>
          <div className="tier-summary">
            {(['best', 'strong', 'acceptable', 'weak', 'mistake'] as const).map((t) => (
              <span key={t} className={`tier-count tier-${t}`}>
                <b>{review.tierCounts[t]}</b> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="review-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`review-tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="review-content">
        {tab === 'overview' && (
          <div className="overview">
            <section>
              <h3 className="section-head">Your three biggest coaching moments</h3>
              <MomentsList moments={review.moments.slice(0, 3)} onJump={jump} />
            </section>
            <section>
              <h3 className="section-head">Category snapshot</h3>
              <div className="cat-mini">
                {review.categories.map((c) => (
                  <button key={c.key} className="cat-mini-row" onClick={() => setTab('categories')}>
                    <span className="cat-mini-label">{c.label}</span>
                    <MeterBar score={c.score} />
                    <span className="cat-mini-score" style={{ color: scoreColor(c.score) }}>{Math.round(c.score)}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="section-head">Draft equity over time</h3>
              <EquityChart points={review.equity} />
            </section>
          </div>
        )}

        {tab === 'categories' && (
          <div className="tab-body">
            <p className="tab-intro">
              Your grade is the weighted sum of seven dimensions of decision quality — not just how good
              the final deck is. Each shows a confidence based on how strongly the data agrees.
            </p>
            <CategoriesPanel categories={review.categories} />
          </div>
        )}

        {tab === 'replay' && (
          <div className="tab-body">
            <p className="tab-intro">
              Every pick, judged against the alternatives using the information you actually had. Expand any
              pick to see what you passed, the signals available, and why.
            </p>
            <ReplayPanel decisions={review.decisions} focusIndex={replayFocus} />
          </div>
        )}

        {tab === 'timeline' && (
          <div className="tab-body">
            <h3 className="section-head">Draft equity</h3>
            <p className="tab-intro">
              How strong your pool projected after each pick, versus the best line available. Dots are colored
              by pick quality; a widening gap is the cost of your decisions.
            </p>
            <EquityChart points={review.equity} />
            <h3 className="section-head" style={{ marginTop: '1.6rem' }}>Commitment meter</h3>
            <p className="tab-intro">
              How your pool's colors concentrated over time. The marker shows where your two-color commitment
              first became justified by your picks and the signals.
            </p>
            <CommitmentChart points={review.commitment} />
          </div>
        )}

        {tab === 'branches' && (
          <div className="tab-body">
            <p className="tab-intro">
              The genuine forks in your draft — picks where a real alternative pointed at a different deck.
              Each line is projected against the pool you ultimately saw.
            </p>
            <BranchPanel branches={review.branches} />
          </div>
        )}

        {tab === 'deck' && (
          <div className="tab-body">
            <p className="tab-intro">
              Your final deck, evaluated on its own terms — separate from how you drafted. A great deck can
              come from lucky packs, and a great draft can yield a mediocre deck.
            </p>
            <DeckPanelAnalysis deck={review.deck} />
          </div>
        )}

        {tab === 'progress' && (
          <div className="tab-body">
            <p className="tab-intro">
              Your long-term coaching profile. Every draft feeds a persistent rating built on decision
              quality — not luck — plus the habits and color pairs you're mastering over time.
            </p>
            <ProgressDashboard profile={profile} />
          </div>
        )}

        {tab === 'table' && (
          <div className="tab-body">
            <TablePanel opponents={opponents} />
          </div>
        )}
      </div>

      <div className="review-actions">
        <button className="btn-primary" onClick={startDraft}>
          Draft Again
        </button>
        <button className="btn-ghost" onClick={reset}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
