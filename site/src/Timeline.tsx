import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { PHASES, scenarios, type TimelineStep } from './content';
import { Cmd, Hx, usePage } from './host';
import { Mark } from './Logo';
import { useInView } from './motion';

/** Bar position u (0–4, one unit per phase) paired with clock time; steps sit evenly inside their phase in list order. */
type Anchor = { u: number; t: number; step?: TimelineStep };

function buildAnchors(bounds: number[], steps: TimelineStep[]) {
  const anchors: Anchor[] = [{ u: 0, t: 0 }];
  for (let p = 0; p < 4; p++) {
    const own = steps.filter(step => step.p === p);
    if (p > 0) anchors.push({ u: p, t: bounds[p] });
    own.forEach((step, j) => anchors.push({ u: p + (j + 1) / (own.length + 1), t: step.t, step }));
  }
  anchors.push({ u: 4, t: bounds[4] });
  return anchors;
}
function timeAt(anchors: Anchor[], u: number) {
  let i = 1;
  while (i < anchors.length - 1 && anchors[i].u < u) i++;
  const a = anchors[i - 1], b = anchors[i];
  return b.u === a.u ? b.t : a.t + (u - a.u) / (b.u - a.u) * (b.t - a.t);
}
const clock = (seconds: number) => { const s = Math.floor(seconds); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const duration = (s: number) => s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60} s` : ''}`;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const sine = (p: number) => .5 - Math.cos(Math.PI * p) / 2;
/** Left offset on the track for u, skipping the gaps between phase segments. */
const left = (u: number) => { const seg = Math.min(3, Math.floor(u)); return `calc(${seg} * (var(--col) + var(--gap)) + ${Math.min(1, u - seg).toFixed(4)} * var(--col))`; };

const CODEX_VERB = { Bash: 'Ran', Write: 'Added', Edit: 'Edited' } as const;

function StepText({ step }: { step: TimelineStep }) {
  const { host } = usePage();
  const claude = host === 'claude';
  if (step.kind === 'say') return <span>{step.text}</span>;
  if (step.kind === 'guard') return <span>⛉ {step.text}</span>;
  if (step.kind === 'live') return <span><span className="dot" aria-hidden="true" />{step.text}</span>;
  if (step.kind === 'next') return <span>Next: <code><Cmd text={step.text} /></code></span>;
  const arg = step.arg.startsWith('neef ') ? <><span className="brand">neef</span>{step.arg.slice(4)}</> : step.arg;
  const result = step.tool === 'Write' ? <Hx>{claude ? `${step.n} lines` : `+${step.n}`}</Hx> : step.tool === 'Edit' ? `+${step.add} −${step.del}` : step.res;
  return <span><span className="v"><Hx>{claude ? step.tool : CODEX_VERB[step.tool]}</Hx></span> {arg} <span className={`r${step.pass ? ' pass' : ''}`}>· {result}</span></span>;
}

/**
 * The hero timeline: every step NEEF ran, under its phase, always visible. Playback is one continuous motion
 * that slows near each step (a linear/sine blend) without stopping; rows brighten as the playhead approaches and
 * keep a glow that fades behind it. The bar can be dragged, and clicking a row glides there.
 */
export function Timeline({ onStep }: { onStep: (step: number) => void }) {
  const { host, scenario, reduced } = usePage();
  const s = scenarios[scenario];
  const anchors = useMemo(() => buildAnchors(s.bounds, s.steps), [s]);
  const anchorsRef = useRef(anchors);
  anchorsRef.current = anchors;

  const [u, setUState] = useState(4);
  const uRef = useRef(4);
  const raf = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(-1);
  const setU = useCallback((value: number) => { uRef.current = Math.max(0, Math.min(4, value || 0)); setUState(uRef.current); }, []);
  const stop = useCallback(() => { cancelAnimationFrame(raf.current); raf.current = 0; setPlaying(false); }, []);
  const glideTo = useCallback((target: number, ms: number, done?: () => void) => {
    stop();
    if (reduced) { setU(target); done?.(); return; }
    const from = uRef.current;
    let start = 0;
    const frame = (now: number) => {
      start ||= now;
      const p = clamp((now - start) / ms);
      setU(from + (target - from) * sine(p));
      if (p < 1) raf.current = requestAnimationFrame(frame); else { raf.current = 0; done?.(); }
    };
    raf.current = requestAnimationFrame(frame);
  }, [reduced, setU, stop]);
  const run = useCallback(() => {
    stop();
    if (reduced) { setU(4); return; }
    setU(0);
    const stops = [0, ...anchorsRef.current.filter(a => a.step).map(a => a.u), 4];
    const durations = stops.slice(1).map((value, i) => 240 + (value - stops[i]) * 1000);
    const ease = (p: number) => .4 * p + .6 * sine(p);
    let start = 0;
    setPlaying(true);
    const frame = (now: number) => {
      start ||= now;
      let t = now - start, i = 0;
      while (i < durations.length && t > durations[i]) { t -= durations[i]; i++; }
      if (i >= durations.length) { setU(4); raf.current = 0; setPlaying(false); return; }
      setU(stops[i] + (stops[i + 1] - stops[i]) * ease(t / durations[i]));
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  }, [reduced, setU, stop]);
  // Replay rewinds smoothly rather than snapping back to 0:00.
  const replay = () => uRef.current > 0 ? glideTo(0, Math.min(600, 250 + uRef.current * 90), run) : run();

  const wrap = useRef<HTMLDivElement>(null);
  const seen = useInView(wrap, '0px');
  useEffect(() => { if (seen) run(); }, [seen, run]);
  const firstScenario = useRef(scenario);
  useEffect(() => {
    if (firstScenario.current === scenario) return;
    firstScenario.current = scenario;
    if (seen) run(); else setU(4);
  }, [scenario, seen, run, setU]);
  useEffect(() => stop, [stop]);

  const phase = Math.min(3, Math.floor(u));
  const navStep = playing ? phase : -1;
  useEffect(() => onStep(navStep), [navStep, onStep]);

  const t = timeAt(anchors, u);
  let now = -1;
  anchors.forEach((a, i) => { if (a.step && a.u <= u + 1e-6) now = i; });
  const at = u <= 0 ? 'start' : u >= 4 ? 'end' : 'mid';
  const claude = host === 'claude';

  return <div ref={wrap}>
    <div className="tl" data-at={at} aria-label="Illustrative job, step by step">
      <div className="tl-you">
        <p className="lane-l">You</p>
        <p className="bubble you-start"><span className="mk"><Hx>{claude ? '>' : '›'}</Hx></span> <Cmd text={s.ask} /></p>
        <p className="free">About {s.minutes} minutes of your time, free for something else</p>
        <p className="bubble you-end">You open {s.url}</p>
      </div>
      <div className="tl-bar">
        <p className="lane-l"><Mark step={u < 4 ? phase : -1} />NEEF</p>
        <div className="tl-track">
          {PHASES.map((name, i) => <span key={name} className="bseg"><i style={{ width: `${clamp(u - i) * 100}%` }} /></span>)}
          {anchors.map((a, i) => {
            if (!a.step) return null;
            const d = u - a.u;
            return <span key={i} className={`tick${d >= -1e-6 ? ' hit' : ''}${hover === i ? ' hover' : ''}`}
              style={{ left: left(a.u), '--s': (1 + .4 * clamp(1 - Math.abs(d) / .07)).toFixed(3) } as CSSProperties} />;
          })}
          <span className="playhead" style={{ left: left(u) }} aria-hidden="true"><b className="clock">{clock(t)}</b></span>
          <input className="scrub" type="range" min="0" max="1000" step="1" value={Math.round(u * 250)} aria-label="Step through the job"
            aria-valuetext={`${clock(t)}, ${PHASES[phase]}`} onChange={event => { stop(); setU(+event.target.value / 250); }} />
        </div>
      </div>
      <div className="tl-cols">
        <span />
        {PHASES.map((name, p) => <div key={name} className={`col${u >= p + 1 ? ' done' : ''}${u > 0 && u < 4 && p === phase ? ' on' : ''}`}>
          <p className="ph">{name}<span>{duration(s.bounds[p + 1] - s.bounds[p])}</span></p>
          <ul className="steps">
            {anchors.map((a, i) => {
              if (!a.step || a.step.p !== p) return null;
              // Proximity d: how far the playhead is past this step (negative: not reached yet).
              const d = u - a.u;
              const style = { '--o': d >= 0 ? 1 : (.42 + .58 * clamp(1 + d / .07)).toFixed(3), '--g': u >= 4 ? 0 : (d >= 0 ? clamp(1 - d / .3) : clamp(1 + d / .07) * .6).toFixed(3) } as CSSProperties;
              return <li key={i} className={`st ${a.step.kind}${i === now && u < 4 ? ' now' : ''}`} style={style}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                onClick={() => glideTo(a.u, 420 + Math.abs(a.u - uRef.current) * 120)}>
                <span className="ts">{clock(a.step.t)}</span><StepText step={a.step} />
              </li>;
            })}
          </ul>
        </div>)}
      </div>
    </div>
    <div className="tl-foot"><span>Illustrative job, {clock(s.bounds[4])} from sentence to running app. Drag the timeline, or pick a step, to see that moment.</span>
      <button type="button" className="linkish" onClick={replay}>↺ Replay</button></div>
  </div>;
}
