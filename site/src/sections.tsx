import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { COMPARISON_URL, comparisons, meaning, modes, moments, PHASES, questions, scenarios, temptations } from './content';
import { Cmd, Hx, hostName, prefix, usePage } from './host';
import { Mark } from './Logo';
import { order, Reveal, useInView } from './motion';
import { Line, summary } from './Terminal';

function Head({ title, children }: { title: ReactNode; children: ReactNode }) {
  return <Reveal className="head"><h2>{title}</h2><p className="lede">{children}</p></Reveal>;
}

/** The four capitals with their step, a plain explanation and an example from the current scenario. */
export function Meaning() {
  const { scenario, reduced } = usePage();
  const grid = useRef<HTMLDivElement>(null);
  const seen = useInView(grid);
  const [lit, setLit] = useState(-1);
  // The letters light up once, in loop order, the first time the section is reached; the heading mark follows.
  useEffect(() => {
    if (!seen || reduced) return;
    const timers = [0, 1, 2, 3].map(i => window.setTimeout(() => setLit(i), 450 + i * 600));
    timers.push(window.setTimeout(() => setLit(-1), 450 + 4 * 600 + 500));
    return () => timers.forEach(clearTimeout);
  }, [seen, reduced]);
  return <section className="meaning" id="meaning"><div className="wrap">
    <Head title={<><Mark step={lit} />What the<br />name means.</>}>Every job goes through the same four steps, in this order. The last one hands you the next command, and the loop starts again.</Head>
    <div ref={grid}><Reveal group className="letters scn">
      {meaning.map((m, i) => <article key={PHASES[i]} className={`letter${lit === i ? ' on' : ''}`} style={order(i)}>
        <b aria-hidden="true">{PHASES[i][0]}</b>
        <p className="word"><span className="sr-only">{PHASES[i][0]} for </span>{PHASES[i]}</p>
        <h3>{m.title}</h3><p>{m.text}</p>
        <code><span className="sr-only">Example: </span>{scenarios[scenario].lines[i]}</code>
      </article>)}
    </Reveal></div>
  </div></section>;
}

/** Pick a risky situation: the shortcut a hurried assistant would take, struck out, then what NEEF does. */
export function Risky() {
  const { host, reduced } = usePage();
  const [selected, setSelected] = useState(0);
  const [shown, setShown] = useState(Infinity);
  const tabs = useRef<HTMLDivElement>(null);
  const situation = temptations[selected];
  function pick(index: number) {
    setSelected(index);
    setShown(reduced ? Infinity : 0);
  }
  // Lines arrive one by one; a hidden copy of the full reply keeps the terminal's height fixed.
  useEffect(() => {
    if (shown >= situation.steps.length + 1) return;
    const step = situation.steps[shown];
    const wait = shown === 0 ? 200 : !step ? 320 : step.kind === 'tool' && step.tool === 'Bash' ? 560 : step.kind === 'say' ? 460 : 280;
    const timer = window.setTimeout(() => setShown(value => value + 1), wait);
    return () => clearTimeout(timer);
  }, [shown, situation]);
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    const delta = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = (selected + delta + temptations.length) % temptations.length;
    pick(next);
    tabs.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
  }
  const before = <><div className="shortcut"><span className="lbl">The shortcut</span><s>{situation.shortcut}</s><span className="why">{situation.why}</span></div><p className="neef-lbl">What NEEF does</p></>;
  const rule = <span className="rule-tag">⛉ {situation.rule}</span>;
  return <section id="risky"><div className="wrap">
    <Head title={<>Go on. Try to make it<br /><em>do something risky.</em></>}>The moments where a hurried assistant cuts corners. Pick one and see what NEEF does instead. Every answer comes from a rule it always follows.</Head>
    <Reveal group className="playground">
      <div className="tempts" role="tablist" aria-label="Risky situations" ref={tabs} onKeyDown={navigate} style={order(0)}>
        {temptations.map((t, i) => <button key={t.title} type="button" role="tab" id={`risk-${i}`} aria-selected={i === selected} aria-controls="risk-panel" tabIndex={i === selected ? 0 : -1} onClick={() => pick(i)}>
          <span className="ic" aria-hidden="true">{t.icon}</span><span><b>{t.title}</b><span className="sub">{t.sub}</span></span>
        </button>)}
      </div>
      <div className="terminal pg-term" style={order(1)}>
        <div className="term-bar"><span className="dots" aria-hidden="true"><span /><span /><span /></span><span className="term-title"><Hx>{hostName(host)}</Hx> · ~/salon-app</span><span /></div>
        <div className="term-body" id="risk-panel" role="tabpanel" aria-labelledby={`risk-${selected}`}>
          <div className="term-reserve" aria-hidden="true">{before}{situation.steps.map((step, i) => <Line key={i} step={step} />)}{rule}</div>
          <div className="play-live" aria-hidden="true">{before}{situation.steps.slice(0, shown).map((step, i) => <Line key={`${selected}-${i}`} step={step} />)}{shown > situation.steps.length && rule}</div>
          <p className="sr-only">The shortcut: {situation.shortcut}, which {situation.why}. What NEEF does: {summary(situation.steps, prefix(host))}. Rule: {situation.rule}.</p>
        </div>
      </div>
    </Reveal>
  </div></section>;
}

export function Needed() {
  const { scenario } = usePage();
  return <section id="needed"><div className="wrap">
    <Head title="Where you’re needed.">Only three moments. Everything else it handles without asking for approval at every step.</Head>
    <Reveal as="ol" group className="moments">{moments.map(([title, text], i) => <li key={title} style={order(i)}><b>{title}</b><p>{text}</p></li>)}</Reveal>
    <Reveal className="between scn">Everything in between is NEEF’s job:<div className="chips">{scenarios[scenario].neef.map(x => <span key={x}>{x}</span>)}</div></Reveal>
  </div></section>;
}

export function Tomorrow() {
  const { host } = usePage();
  return <section id="tomorrow"><div className="wrap">
    <Head title={<>Next morning,<br />one command.</>}>It keeps short notes on every job, outside your project, and picks up exactly where it stopped.</Head>
    <Reveal className="mini">
      <p className="lane-l">You</p><p className="bubble"><span className="mk"><Hx>{host === 'claude' ? '>' : '›'}</Hx></span> <Cmd text="{neef} next" /></p>
      <p className="lane-l">NEEF</p><span className="bseg"><i /></span>
      <p className="cap"><b>Picking up · phase 2 of 3</b>Sign-in is saved. Now listing each customer’s bookings.</p>
    </Reveal>
  </div></section>;
}

export function Modes() {
  return <section id="modes"><div className="wrap">
    <Head title="Every way to ask.">Most of the time you just describe the job. These are for when you want something specific.</Head>
    <Reveal as="ul" group className="modes">{modes.map(([command, what, effect], i) => <li key={command} style={order(i)}>
      <code><Cmd text={command} /></code><span>{what}<br /><span className={`badge${effect === 'changes your project' ? ' yes' : ''}`}>{effect}</span></span>
    </li>)}</Reveal>
  </div></section>;
}

/** Fair questions: every answer visible, nothing to open. */
export function Faq() {
  return <section id="faq"><div className="wrap">
    <Head title="Fair questions.">What people usually want to know before they try it.</Head>
    <Reveal as="dl" group className="faq">{questions.map(({ question, answer }, i) => <div key={question} style={order(i)}>
      <dt>{question}</dt><dd>{answer}</dd>
    </div>)}</Reveal>
  </div></section>;
}

/** Where NEEF sits next to similar tools: one row per kind of tool, theirs beside NEEF's. */
export function Compare() {
  return <section id="compare"><div className="wrap">
    <Head title={<>Other tools build apps too.<br />Here’s the difference.</>}>Two kinds of tool do something similar. This is what changes when you use NEEF instead.</Head>
    <Reveal as="ul" group className="compare">{comparisons.map(({ kind, names, they, neef }, i) => <li key={kind} style={order(i)}>
      <p className="c-kind"><b>{kind}</b><small>{names}</small></p>
      <p className="c-they">{they}</p>
      <p className="c-neef"><span className="sr-only">NEEF: </span>{neef}</p>
    </li>)}</Reveal>
    <Reveal><p className="c-more"><a href={COMPARISON_URL}>Read the full comparison, with sources</a></p></Reveal>
  </div></section>;
}

function CopyCommand({ command }: { command: string }) {
  const [status, setStatus] = useState('Copy');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    window.clearTimeout(timer.current);
    try { await navigator.clipboard.writeText(command); setStatus('Copied'); } catch { setStatus('Select it'); }
    timer.current = window.setTimeout(() => setStatus('Copy'), 1600);
  }
  return <button type="button" onClick={copy} aria-label={`Copy ${command}`}><span aria-live="polite">{status}</span></button>;
}

export function Install() {
  return <section id="get"><div className="wrap">
    <Reveal group className="install-grid">
      <div style={order(0)}><h2>Ready in two commands.</h2><p className="lede">You need three things on your computer first.</p>
        <ul className="needs"><li>Claude Code or Codex<small>NEEF works inside the assistant you already use.</small></li><li>Node.js 20 or newer</li><li>Git<small>Used to save every step so it can be undone.</small></li></ul></div>
      <div className="terminal" style={order(1)}><div className="term-body">
        <div className="cmd"><span>$ node scripts/install.mjs <span className="t-dim"># preview, changes nothing</span></span><CopyCommand command="node scripts/install.mjs" /></div>
        <div className="cmd"><span>$ node scripts/install.mjs --apply</span><CopyCommand command="node scripts/install.mjs --apply" /></div>
        <p className="t-acc">then restart your assistant and check it with <Cmd text="{neef} doctor" /></p>
        <p className="t-dim">Installs from NEEF’s source folder; there’s no public download yet.</p>
      </div></div>
    </Reveal>
  </div></section>;
}

export function Footer() {
  return <footer><div className="wrap"><span>NEEF · No-nonsense Engineering &amp; Execution Framework</span><span>Navigate → Execute → Evaluate → Follow-up</span></div></footer>;
}
