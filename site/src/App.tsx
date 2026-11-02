import { useEffect, useRef, useState } from 'react';
import type { Host, ScenarioId } from './content';
import { scenarios } from './content';
import { Page } from './host';
import { order, Reveal, useReducedMotion } from './motion';
import { Nav } from './Nav';
import { Compare, Faq, Footer, Install, Meaning, Modes, Needed, Risky, Tomorrow } from './sections';
import { Timeline } from './Timeline';

export default function App() {
  const reduced = useReducedMotion();
  const [theme, setTheme] = useState<'light' | 'dark'>(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  const manualTheme = useRef(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#211d18' : '#efe8da');
  }, [theme]);
  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const update = () => { if (!manualTheme.current) setTheme(query.matches ? 'dark' : 'light'); };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  // In-view animations only run with motion allowed; without this class every section is simply visible.
  useEffect(() => { document.documentElement.classList.toggle('motion', !reduced); }, [reduced]);

  const [host, setHost] = useState<Host>('claude');
  const [scenario, setScenario] = useState<ScenarioId>('new');
  const [swapping, setSwapping] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [navStep, setNavStep] = useState(-1);
  const swapTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(swapTimer.current), []);
  function chooseHost(next: Host) {
    setHost(next);
    setAnnounce(`Showing ${next === 'claude' ? 'Claude Code' : 'Codex'}`);
  }
  // Switching the example fades scenario-specific content out, swaps it, and fades it back in.
  function chooseScenario(next: ScenarioId) {
    if (next === scenario) return;
    setAnnounce(`Showing the ${scenarios[next].label.toLowerCase()} example`);
    if (reduced) { setScenario(next); return; }
    setSwapping(true);
    window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => { setScenario(next); setSwapping(false); }, 220);
  }

  return <Page.Provider value={{ host, scenario, reduced }}>
    <a className="skip-link" href="#main">Skip to content</a>
    <Nav host={host} scenario={scenario} theme={theme} step={navStep} reduced={reduced}
      setHost={chooseHost} setScenario={chooseScenario} toggleTheme={() => { manualTheme.current = true; setTheme(value => value === 'dark' ? 'light' : 'dark'); }} />
    <p className="sr-only" role="status">{announce}</p>
    <main id="main" tabIndex={-1} data-swapping={swapping || undefined}>
      <header className="hero" id="top"><div className="wrap">
        <div className="hero-top">
          <h1 className="hero-enter" style={order(0)}>You decide what it’s for.<br /><em>NEEF does the legwork.</em></h1>
          <div className="hero-enter" style={order(1)}>
            <p className="lede">Say what you want in one sentence. While it builds, checks and saves, your time is free for the people it’s for.</p>
            <div className="actions"><a className="button primary" href="#get">Get NEEF</a><a className="button" href="#needed">Where you’re needed</a></div>
          </div>
        </div>
        <div className="scn hero-enter" style={order(2)}><Timeline onStep={setNavStep} /></div>
      </div></header>
      <Meaning />
      <Risky />
      <Needed />
      <Tomorrow />
      <Modes />
      <Compare />
      <Faq />
      <Install />
    </main>
    <Reveal><Footer /></Reveal>
  </Page.Provider>;
}
