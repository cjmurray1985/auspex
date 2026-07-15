import type { RatedCard } from '../types';

export function gradeColor(grade: string): string {
  if (grade.startsWith('A') || grade === 'S') return '#f0cd8a';
  if (grade.startsWith('B')) return '#8ad0f0';
  if (grade.startsWith('C')) return '#b8bcc8';
  if (grade.startsWith('D')) return '#e0a080';
  return '#e08080';
}

interface Card3DProps {
  card: RatedCard;
  onClick?: () => void;
  showGrade?: boolean;
}

/**
 * A flat card face with a foil shimmer on rares. Hover feedback is a simple
 * highlight (the color-matched stroke/glow is drawn by the hover-preview
 * layer) — no per-frame 3D tilt, which kept re-rendering every card on mouse
 * move and hurt performance.
 */
export function Card3D({ card, onClick, showGrade }: Card3DProps) {
  const foil = card.rarity === 'rare' || card.rarity === 'mythic';

  return (
    <div className="card3d-wrap">
      <div
        className={`card3d${foil ? ' foil' : ''}`}
        style={{ cursor: onClick ? 'pointer' : undefined }}
        onClick={onClick}
      >
        <img src={card.imageNormal} alt={card.name} loading="lazy" draggable={false} />
        {showGrade && (
          <div className="grade-chip" style={{ background: gradeColor(card.rating.grade) }}>
            {card.rating.grade}
          </div>
        )}
      </div>
    </div>
  );
}
