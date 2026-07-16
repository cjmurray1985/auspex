/**
 * Lightweight 2D-canvas layer for one-shot spark bursts at delight moments
 * (mythic pulls, grade reveals). No ambient particles — just the discrete
 * celebration flourishes.
 */

import { prefersReducedMotion } from './reducedMotion';

export type Mood = 'menu' | 'draft' | 'build' | 'grading' | 'grade';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

class AtmosphereFX {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private sparks: Particle[] = [];
  private last = 0;
  private raf = 0;
  private started = false;
  private running = false;
  private w = 0;
  private h = 0;

  init(canvas: HTMLCanvasElement) {
    if (this.started) return;
    this.started = true;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', this.resize);
    // No idle loop — the animation frame only runs while sparks are alive.
  }

  private resize = () => {
    if (!this.canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private startLoop() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    const ctx = this.ctx;
    if (!ctx) {
      this.running = false;
      return;
    }
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.sparks.length) {
      // Last spark finished — stop scheduling frames until the next burst.
      this.running = false;
      return;
    }

    ctx.globalCompositeOperation = 'lighter';
    this.sparks = this.sparks.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy += 180 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const alpha = Math.min(1, p.life / p.maxLife) * 0.9;
      this.draw(ctx, p, alpha);
      return true;
    });
    ctx.globalCompositeOperation = 'source-over';
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(ctx: CanvasRenderingContext2D, p: Particle, alpha: number) {
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
    grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`);
    grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Retained for API compatibility; phase mood is now handled by CSS on the
  // background scrim, not by particles.
  setMood(_mood: Mood) {}

  /** One-shot spark fountain — grade reveals and mythic pulls. */
  burst(opts?: { count?: number; gold?: boolean }) {
    if (!this.started) return;
    if (prefersReducedMotion()) return; // no celebratory motion for these users
    const count = opts?.count ?? 200;
    const gold = opts?.gold ?? true;
    const cx = this.w / 2;
    const cy = this.h * 0.52;
    for (let i = 0; i < count; i++) {
      const angle = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      const speed = rand(180, 520);
      const maxLife = rand(0.8, 2.0);
      this.sparks.push({
        x: cx + rand(-40, 40),
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        size: rand(1.2, 3.6),
        // Brand sparks: gold (#f0cd8a) for milestones, foresight-blue (#6cc6ff)
        // for general delight — matches docs/BRAND.md role discipline.
        r: gold ? 240 : 108,
        g: gold ? (rand(190, 215) | 0) : 198,
        b: gold ? (rand(120, 150) | 0) : 255,
      });
    }
    this.startLoop();
  }

  packFlare() {
    this.burst({ count: 70, gold: false });
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    window.removeEventListener('resize', this.resize);
    this.started = false;
  }
}

export const atmosphere = new AtmosphereFX();
