import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px 0px -10% 0px') {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setSeen(true); observer.disconnect(); }
    }, { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}

/**
 * Basic in-view animation: the block fades and rises once when it scrolls into view.
 * With `group`, its direct children follow one after another (set `--i` on each child for the order).
 * Hidden only while `html.motion` is set, so reduced motion and no-JS show everything at once.
 */
export function Reveal({ as = 'div', children, className = '', group = false, style }: { as?: 'div' | 'ul' | 'ol'; children: ReactNode; className?: string; group?: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref);
  return createElement(as, { ref, style, className: `${group ? 'reveal-group' : 'reveal'}${seen ? ' in' : ''}${className ? ` ${className}` : ''}` }, children);
}

/** Stagger index for a child of a `Reveal group`. */
export const order = (i: number) => ({ '--i': i }) as CSSProperties;
