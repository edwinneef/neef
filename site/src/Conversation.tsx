import { useEffect, useMemo, useRef, useState } from 'react';
import type { Message } from './content';

export default function Conversation({ messages, session, reduced, started, paused, onComplete }: {
  messages: Message[]; session: number; reduced: boolean; started: boolean; paused: boolean; onComplete: () => void;
}) {
  const steps = useMemo(() => {
    let end = 0;
    return messages.map((message, index) => {
      if (index === 0) return { start: 0, writing: 0, end: 0 };
      const start = end + (message.kind === 'ai' ? 350 : message.kind === 'live' ? 320 : 260);
      const writing = start + (message.kind === 'ai' ? 500 : 0);
      end = writing + (message.kind === 'ai' ? Math.min(1250, Math.max(650, message.text.length * 9)) : 0);
      return { start, writing, end };
    });
  }, [messages]);
  const duration = steps[steps.length - 1].end;
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef(0);
  const complete = reduced || elapsed >= duration;

  useEffect(() => {
    if (reduced) { clock.current = duration; setElapsed(duration); return; }
    if (!started || paused || clock.current >= duration) return;
    const origin = performance.now();
    const offset = clock.current;
    let lastUpdate = 0;
    let frame: number;
    function advance(now: number) {
      const next = Math.min(duration, offset + now - origin);
      if (now - lastUpdate >= 40 || next === duration) {
        clock.current = next;
        setElapsed(next);
        lastUpdate = now;
      }
      if (next < duration) frame = requestAnimationFrame(advance);
    }
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [duration, paused, reduced, started]);

  useEffect(() => { if (complete) onComplete(); }, [complete, onComplete]);
  const typing = !complete && steps.some(step => elapsed >= step.start && elapsed < step.writing);

  return <div className={`feed${paused ? ' is-paused' : ''}`} id="session-panel" role="tabpanel" aria-labelledby={`session-${session}`} tabIndex={0}>
    <span className="sr-only" role="status">{complete ? 'Example complete' : paused ? 'Example paused' : 'Example playing'}</span>
    {messages.map((message, index) => {
      const step = steps[index];
      if (!reduced && elapsed < step.writing) return null;
      const streaming = !reduced && elapsed < step.end;
      const length = streaming ? Math.max(1, Math.floor(message.text.length * (elapsed - step.writing) / (step.end - step.writing))) : message.text.length;
      return <p className={`message ${message.kind}${streaming ? ' is-streaming' : ''}`} key={index}>
        {message.kind === 'tick' && <span className="check" aria-hidden="true">✓</span>}
        {message.kind === 'live' && <span className="live-dot" aria-hidden="true" />}
        {message.kind === 'ai' ? <>
          <span className="sr-only">{message.text}</span>
          <span className="message-copy" aria-hidden="true">
            <span className="message-reserve">{message.text}</span>
            <span className="message-stream">{message.text.slice(0, length)}{streaming && <span className="stream-cursor" />}</span>
          </span>
        </> : message.text}
      </p>;
    })}
    {typing && <div className="typing-indicator" aria-hidden="true"><span /><span /><span /></div>}
  </div>;
}
