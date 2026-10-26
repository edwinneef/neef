import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { examples, questions, sessions } from './content';
import Conversation from './Conversation';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function TabList({ id, label, names, selected, select, className }: {
  id: string; label: string; names: string[]; selected: number;
  select: (index: number) => void; className: string;
}) {
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    let next = selected;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (selected + 1) % names.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (selected + names.length - 1) % names.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = names.length - 1;
    else return;
    event.preventDefault();
    select(next);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }
  return <div className={className} role="tablist" aria-label={label} aria-orientation={id === 'example' ? 'vertical' : undefined} onKeyDown={navigate}>
    {names.map((name, index) => <button key={name} id={`${id}-${index}`} type="button" role="tab"
      aria-selected={selected === index} aria-controls={`${id}-panel`} tabIndex={selected === index ? 0 : -1}
      onClick={() => select(index)}>
      <span>{name}</span>{id === 'example' && <code>{examples[index].command}</code>}
    </button>)}
  </div>;
}

function Replay({ reduced }: { reduced: boolean }) {
  const [selected, setSelected] = useState(0);
  const [replay, setReplay] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [complete, setComplete] = useState(false);
  const finish = useCallback(() => setComplete(true), []);
  function selectSession(index: number) {
    if (index === selected) return;
    setSelected(index); setPaused(false); setComplete(false);
  }
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setStarted(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    if (card.current) observer.observe(card.current);
    return () => observer.disconnect();
  }, []);
  return <div className="replay-card" ref={card}>
    <TabList id="session" label="Example project" names={sessions.map(session => session.name)}
      selected={selected} select={selectSession} className="session-tabs" />
    <div className="replay-caption">
      <p className="small-label">Illustrative session</p>
      <p className="session-title">{sessions[selected].title}</p>
      <div className="replay-controls"><button className="replay-button" type="button" onClick={() => { setStarted(true); setPaused(false); setComplete(false); setReplay(value => value + 1); }}>
        <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 7a6 6 0 1 1-1 5M3 3v5h5" /></svg>
        Replay
      </button>
      {!reduced && <button className="replay-button playback-toggle" type="button" disabled={complete} onClick={() => setPaused(value => !value)}>{paused ? 'Resume' : 'Pause'}</button>}
      </div>
    </div>
    <Conversation key={`${selected}-${replay}`} messages={sessions[selected].messages} session={selected}
      reduced={reduced} started={started} paused={paused} onComplete={finish} />
  </div>;
}

function Examples() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  return <div className="examples-grid">
    <TabList id="example" label="Things you can ask NEEF" names={examples.map(example => example.name)}
      selected={selected} select={setSelected} className="example-tabs" />
    <div className="example-panel" id="example-panel" role="tabpanel" aria-labelledby={`example-${selected}`} tabIndex={0}>
      <p className="small-label">{example.title}</p>
      <div key={selected} className="example-conversation">
        <p className="message you">{example.request}</p>
        <p className="message ai">{example.reply}</p>
        <p className="example-result">{example.result}</p>
      </div>
    </div>
  </div>;
}

function CopyCommand({ command, label }: { command: string; label: string }) {
  const [status, setStatus] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    window.clearTimeout(timer.current);
    try { await navigator.clipboard.writeText(command); setStatus('Copied'); }
    catch { setStatus('Select the command to copy it.'); }
    timer.current = window.setTimeout(() => setStatus(''), 2400);
  }
  return <div className="install-command">
    <div className="command-heading"><span>{label}</span><button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()} command`}>Copy</button></div>
    <code>{command}</code>
    <span className="copy-status" role="status">{status}</span>
  </div>;
}

export default function App() {
  const reduced = useReducedMotion();
  const [theme, setTheme] = useState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
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
  useEffect(() => {
    const sections = document.querySelectorAll('.reveal');
    document.documentElement.classList.toggle('motion-enabled', !reduced);
    if (reduced || !('IntersectionObserver' in window)) {
      sections.forEach(section => section.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [reduced]);
  function chooseTheme(value: string) { manualTheme.current = true; setTheme(value); }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <nav className="navigation" aria-label="Main navigation">
      <div className="wrap nav-inner">
        <a href="#top" className="logo" aria-label="NEEF home">NEEF.</a>
        <ul><li><a href="#start">Get started</a></li><li><a href="#why">Why it’s fast</a></li><li><a href="#ask">What you can ask</a></li><li><a href="#faq">Questions</a></li></ul>
        <div className="nav-actions"><div className="theme-controls" role="group" aria-label="Color mode">
          <button type="button" aria-pressed={theme === 'light'} onClick={() => chooseTheme('light')}>Light</button>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => chooseTheme('dark')}>Dark</button>
        </div><a href="#get" className="button small">Get NEEF</a></div>
      </div>
    </nav>
    <main id="main" tabIndex={-1}>
      <header className="hero" id="top">
        <div className="wrap">
          <div className="hero-intro">
            <p className="eyebrow hero-enter">For new ideas and projects already underway</p>
            <h1 className="hero-enter">From idea to a working app. <em>Fast.</em></h1>
            <div className="hero-copy hero-enter">
              <p className="lead">Describe what you want in plain words. NEEF gets your AI assistant (<strong>Claude Code</strong> or <strong>Codex</strong>) building it right away. Start something new or improve a project you already have. It builds, checks and saves your work, then gives you a running app or the exact command to start it.</p>
              <div className="hero-actions"><a href="#start" className="button primary">Start in 3 steps <span aria-hidden="true">↗</span></a><a href="#why" className="button">Why it’s fast</a></div>
              <ul className="hero-facts"><li>Starts in an empty folder</li><li>Fits your existing project</li><li>Keeps going by itself</li></ul>
            </div>
          </div>
          <Replay reduced={reduced} />
        </div>
      </header>

      <section id="speed"><div className="wrap reveal">
        <p className="eyebrow">The difference</p><h2>Less talking about the work.<br />More work getting done.</h2>
        <p className="section-intro">Less back-and-forth on routine decisions. More attention on the result you came for.</p>
        <div className="comparison"><div className="comparison-usual"><h3>The usual way</h3><ol><li>Explain your project to the AI. Again.</li><li>Answer a list of questions before it starts</li><li>Approve each small step</li><li>Discover it never checked whether the app starts</li><li>Work out where you left off tomorrow</li></ol><p className="panel-note">A lot of direction for every change.</p></div>
          <div className="comparison-neef"><h3>With NEEF</h3><ol><li>Say what you want, in normal words</li><li>It builds, checks and saves a working version</li><li>Open the result, then choose the next improvement</li></ol><p className="panel-note">It asks when a real decision needs you, with a suggested answer.</p></div></div>
      </div></section>

      <section id="start"><div className="wrap reveal"><p className="eyebrow">Get started</p><h2>Up and running in three steps.</h2><p className="section-intro">Install NEEF once. Start in an empty folder or open a project you already have. You describe the result; it handles the everyday decisions.</p>
        <ol className="start-steps"><li><h3>Open your project folder</h3><p>Open Claude Code or Codex there. Starting fresh? NEEF sets up Git automatically in a completely empty folder, so it can save your work in steps you can undo.</p></li><li><h3>Say what you want</h3><p>For a new project, it picks a simple way to build it. For an existing one, it follows the tools and style already there.</p><code className="terminal">$neef build a booking page for my salon</code></li><li><h3>Open the working result</h3><p>It checks that the app starts and saves a working version. You get a local address or the exact command to run it. Ready for another improvement? Use <code>$neef next</code>.</p></li></ol>
        <p className="host-note">Examples use Codex. In Claude Code, use <code>/neef</code> in place of <code>$neef</code>.</p>
      </div></section>

      <section id="why"><div className="wrap reveal"><p className="eyebrow">Why it’s fast</p><h2>Fast, because it cuts the waiting,<br />not the corners.</h2><p className="section-intro">Navigate, Execute, Evaluate, Follow-up. Four habits that keep the work moving.</p>
        <div className="reasons">
          <article><p className="eyebrow">Navigate</p><h3>It fits the project you have</h3><p>Adding a feature or fixing a bug? It reads your project first and keeps its existing tools, code style and way of working.</p></article>
          <article><p className="eyebrow">Execute</p><h3>It handles everyday decisions</h3><p>It makes routine choices itself and works toward the smallest useful result. You don’t have to direct every small step.</p></article>
          <article><p className="eyebrow">Evaluate</p><h3>It checks its own work</h3><p>It runs relevant checks and fixes what it broke before handing the result back. Runnable work gets checked to start.</p></article>
          <article><p className="eyebrow">Follow-up</p><h3>You know what comes next</h3><p>It leaves one useful next direction and keeps notes on the work, so a later session can pick up where you left off.</p></article>
        </div>
      </div></section>

      <section id="ask"><div className="wrap reveal"><p className="eyebrow">What you can ask</p><h2>Normal words.<br />A clear way forward.</h2><p className="section-intro">Most of the time, just describe the job. Pick an example to see how the other modes work.</p><Examples /><p className="host-note">Illustrative conversations, not live assistant output.</p></div></section>

      <section id="safe"><div className="wrap reveal"><p className="eyebrow">Care built in</p><h2>Move quickly.<br />Keep your footing.</h2><div className="safeguards">
        <article><h3>Your changes stay yours</h3><p>It preserves unfinished edits and touches only what the job needs.</p></article>
        <article><h3>Small, reviewable saves</h3><p>Completed changes are saved in labelled Git commits when safe.</p></article>
        <article><h3>Publishing is your call</h3><p>NEEF doesn’t push or publish the project without your instruction.</p></article>
        <article><h3>Room to try things</h3><p>Prototypes live in a separate scratch folder, away from your real project.</p></article>
      </div></div></section>

      <section id="faq"><div className="wrap reveal"><p className="eyebrow">Questions</p><h2>Fair questions.</h2><div className="faq">{questions.map(({ question, answer }, index) => <details key={question} open={index === 0 ? true : undefined}><summary>{question}<span aria-hidden="true" className="faq-mark" /></summary><p>{answer}</p></details>)}</div></div></section>

      <section id="get" className="get-section"><div className="wrap reveal"><p className="eyebrow">Start from the source</p><h2>Your next idea could<br />be running today.</h2><p className="lead">NEEF currently installs from its source folder. Already have it? Open a terminal there and preview the installation first.</p><div className="install-commands"><CopyCommand label="Preview installation" command="node scripts/install.mjs" /><CopyCommand label="Install NEEF" command="node scripts/install.mjs --apply" /></div><p className="install-note">The preview changes nothing. Applying a safe install backs up previous managed files. You’ll need Node.js 20+, Git, and Claude Code or Codex.</p><p className="install-note">After installing, start requests with <code>$neef</code> in Codex or <code>/neef</code> in Claude Code. A public source/download link will appear here when one is available.</p></div></section>
    </main>
    <footer><div className="wrap"><a href="#top" className="logo">NEEF.</a><p>No-nonsense Engineering &amp; Execution Framework<br /><span>Navigate → Execute → Evaluate → Follow-up</span></p><a href="#top" className="back-top">Back to top <span aria-hidden="true">↑</span></a></div></footer>
  </>;
}
