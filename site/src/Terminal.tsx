import type { TermStep } from './content';
import { Cmd, CODEX_VERB, Hx, usePage } from './host';

/** NEEF's own helper calls show the path dimmed and the NEEF command in the accent colour. */
function Arg({ arg }: { arg: string }) {
  const helper = arg.match(/^(node ~\/\.neef\/neef\.mjs )(.*)$/);
  return helper ? <><span className="neefpath">{helper[1]}</span><span className="neefcmd">{helper[2]}</span></> : <>{arg}</>;
}

/** One terminal line in the current host's dialect (Claude Code: ⏺ Write(…) ⎿ …; Codex: • Added … (+n)). */
export function Line({ step }: { step: TermStep }) {
  const { host } = usePage();
  const claude = host === 'claude';
  const bullet = <span className="bullet"><Hx>{claude ? '⏺' : '•'}</Hx></span>;
  if (step.kind === 'user') return <div className="ln user"><span className="mk"><Hx>{claude ? '>' : '›'}</Hx></span> <Cmd text={step.text} /></div>;
  if (step.kind === 'say') return <div className="ln say">{bullet} <Cmd text={step.text} /></div>;
  let head, out = step.out ?? '';
  if (claude) {
    head = <><span className="name"><Hx>{step.tool}</Hx></span>(<Arg arg={step.arg} />)</>;
    if (step.tool === 'Write') out = `Wrote ${step.n} lines to ${step.arg}`;
    if (step.tool === 'Edit') out = `Updated ${step.arg} with ${step.add} additions and ${step.del} removals`;
  } else {
    head = <><span className="name"><Hx>{CODEX_VERB[step.tool]}</Hx></span> <Arg arg={step.arg} /></>;
    if (step.tool === 'Write') { head = <>{head} (+{step.n})</>; out = ''; }
    if (step.tool === 'Edit') { head = <>{head} (+{step.add} −{step.del})</>; out = ''; }
  }
  return <div className="ln tool">{bullet} {head}{out && <span className={`out${step.pass ? ' pass' : ''}`}><Hx>{`${claude ? '⎿' : '└'}  ${out}`}</Hx></span>}</div>;
}

/** Plain-text summary of a session for screen readers. */
export const summary = (steps: TermStep[], prefix: string) =>
  steps.map(s => s.kind === 'tool' ? [s.tool, s.arg, s.out].filter(Boolean).join(' ') : s.text.replaceAll('{neef}', prefix)).join('. ');
