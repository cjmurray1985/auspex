import { useEffect, useRef } from 'react';
import { useDraft } from '../store';
import { fx, type Mood } from '../fx/fx';
import { Background } from './Background';
import type { Phase } from '../types';

const PHASE_TO_MOOD: Record<Phase, Mood> = {
  menu: 'menu',
  loading: 'menu',
  draft: 'draft',
  build: 'build',
  grading: 'grading',
  grade: 'grade',
};

/** Hi-res art background + a light canvas particle layer, behind the UI. */
export function AtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useDraft((s) => s.phase);

  useEffect(() => {
    if (!canvasRef.current) return;
    fx.init(canvasRef.current);
  }, []);

  useEffect(() => {
    fx.setMood(PHASE_TO_MOOD[phase]);
  }, [phase]);

  return (
    <>
      <Background />
      <canvas ref={canvasRef} className="fx-canvas" aria-hidden />
    </>
  );
}
