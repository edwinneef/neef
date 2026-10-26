import { createContext, Fragment, useContext, useEffect, useRef, useState } from 'react';
import type { Host, ScenarioId } from './content';

export const Page = createContext<{ host: Host; scenario: ScenarioId; reduced: boolean }>({ host: 'claude', scenario: 'new', reduced: false });
export const usePage = () => useContext(Page);

const GLYPHS = '░▒▓<>/\\|*+=#';
const noise = (text: string, done: number) => [...text].map((ch, i) => ch === ' ' || i < text.length * done ? ch : GLYPHS[Math.random() * GLYPHS.length | 0]).join('');

/**
 * Host-dependent text. When the host switches, visible instances resolve left to right out of noise with
 * a short highlight, so readers see exactly what differs between Claude Code and Codex. The noise lives in
 * component state; React keeps owning the text node.
 */
export function Hx({ children }: { children: string }) {
  const { reduced } = usePage();
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(children);
  const [noisy, setNoisy] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (previous.current === children) return;
    previous.current = children;
    const box = ref.current?.getBoundingClientRect();
    if (reduced || !box || !box.width || box.bottom < 0 || box.top > innerHeight) return;
    let frame = 0, timer = 0;
    const tick = () => {
      frame++;
      setNoisy(frame >= 7 ? null : noise(children, frame / 7));
      if (frame < 7) timer = window.setTimeout(tick, 42);
    };
    setFlash(value => value + 1);
    timer = window.setTimeout(tick, Math.max(0, box.top) / innerHeight * 360);
    return () => { window.clearTimeout(timer); setNoisy(null); };
  }, [children, reduced]);
  return <span ref={ref} className={`hx${flash ? ` flash-${flash % 2}` : ''}`}>{noisy ?? children}</span>;
}

export const prefix = (host: Host) => host === 'claude' ? '/neef' : '$neef';
export const hostName = (host: Host) => host === 'claude' ? '✻ Claude Code' : '>_ Codex';

/** Text with {neef} placeholders, rendered with the current host's prefix. */
export function Cmd({ text }: { text: string }) {
  const { host } = usePage();
  const parts = text.split('{neef}');
  return <>{parts.map((part, i) => <Fragment key={i}>{i > 0 && <Hx>{prefix(host)}</Hx>}{part}</Fragment>)}</>;
}

/** Plain-text version for screen-reader summaries and copy buttons. */
export const plain = (text: string, host: Host) => text.replaceAll('{neef}', prefix(host));
