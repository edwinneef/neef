import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Host, ScenarioId } from './content';
import { Logo } from './Logo';

/** Two-option switch with a sliding thumb under the pressed button. */
function Pill<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: ReactNode }[]; onChange: (value: T) => void;
}) {
  const group = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number; animate: boolean } | null>(null);
  useLayoutEffect(() => {
    const measure = (animate: boolean) => {
      const button = group.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
      if (button) setThumb({ x: button.offsetLeft, w: button.offsetWidth, animate });
    };
    measure(thumb !== null);
    const resize = () => measure(false);
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
    // Re-measure only when the selection changes; the first measurement skips the slide.
  }, [value]);
  return <div className="pill" role="group" aria-label={label} ref={group}>
    <span className="thumb" aria-hidden="true" style={thumb ? { width: thumb.w, transform: `translateX(${thumb.x}px)`, transition: thumb.animate ? undefined : 'none' } : { opacity: 0 }} />
    {options.map(option => <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>{option.label}</button>)}
  </div>;
}

export function Nav({ host, scenario, theme, step, reduced, setHost, setScenario, toggleTheme }: {
  host: Host; scenario: ScenarioId; theme: 'light' | 'dark'; step: number; reduced: boolean;
  setHost: (host: Host) => void; setScenario: (scenario: ScenarioId) => void; toggleTheme: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(scrollY > 8);
    update();
    addEventListener('scroll', update, { passive: true });
    return () => removeEventListener('scroll', update);
  }, []);
  return <nav className={`navigation${scrolled ? ' scrolled' : ''}`} aria-label="Main navigation">
    <div className="wrap nav-inner">
      <Logo step={step} reduced={reduced} />
      <div className="controls">
        <Pill label="Show it in" value={host} onChange={setHost} options={[
          { value: 'claude', label: <><span className="hg" aria-hidden="true">✻</span>Claude<span className="long"> Code</span></> },
          { value: 'codex', label: <><span className="hg" aria-hidden="true">&gt;_</span>Codex</> },
        ]} />
        <Pill label="Example" value={scenario} onChange={setScenario} options={[
          { value: 'new', label: <>New<span className="long"> project</span></> },
          { value: 'existing', label: <>Existing<span className="long"> project</span></> },
        ]} />
        <button type="button" className="theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>◐</button>
      </div>
    </div>
  </nav>;
}
