import { useEffect, useRef, useState } from 'react';

const TILES = [[0, 0], [16, 0], [16, 16], [0, 16]] as const;

/**
 * The "four steps" mark: one tile per step, clockwise from the top left.
 * At rest the tiles use accent tones; while a job runs (step 0–3) the current tile lights and later ones dim.
 */
export function Mark({ step = -1, className = '' }: { step?: number; className?: string }) {
  return <svg className={`mark${step >= 0 ? ' live' : ''}${className ? ` ${className}` : ''}`} viewBox="0 0 28 28" aria-hidden="true">
    {TILES.map(([x, y], i) => <rect key={i} x={x} y={y} width="12" height="12" rx="2"
      className={`tile${(step < 0 ? i === 0 : i === step) ? ' on' : ''}${step >= 0 && i > step ? ' ahead' : ''}`} />)}
  </svg>;
}

/** Runs the mark through the loop once and back to rest; returns the step to show (or null when idle). */
export function useLoopOnce(reduced: boolean) {
  const [step, setStep] = useState<number | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function play() {
    if (reduced) return;
    timers.current.forEach(clearTimeout);
    timers.current = [0, 1, 2, 3].map(i => window.setTimeout(() => setStep(i), i * 520));
    timers.current.push(window.setTimeout(() => setStep(null), 4 * 520 + 300));
  }
  return [step, play] as const;
}

/** Nav lockup. The word's box is trimmed to its cap height, so centring the mark aligns it with the letters. */
export function Logo({ step, reduced }: { step: number; reduced: boolean }) {
  const [hoverStep, play] = useLoopOnce(reduced);
  return <a href="#top" className="logo" aria-label="NEEF, back to top" onMouseEnter={play}>
    <Mark step={hoverStep ?? step} /><span className="word">NEEF</span>
  </a>;
}
