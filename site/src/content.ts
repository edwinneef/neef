// Illustrative, synthetic examples. Text uses {neef} where the host's command prefix goes.
export type Host = 'claude' | 'codex';
export type ScenarioId = 'new' | 'existing';

export const PHASES = ['Navigate', 'Execute', 'Evaluate', 'Follow-up'] as const;

export type Tool = 'Bash' | 'Write' | 'Edit';
type ToolFields = { tool: Tool; arg: string; n?: number; add?: number; del?: number; pass?: boolean };
/** One union member per kind, so checking `kind` narrows the step. */
type Text<K extends string> = K extends string ? { kind: K; text: string } : never;

/** A step on the hero timeline: when it happened (seconds), which phase it belongs to, and what it was. */
export type TimelineStep = { t: number; p: number } & (
  | Text<'say' | 'guard' | 'live' | 'next'>
  | ({ kind: 'tool'; res?: string } & ToolFields)
);

/** A line in a terminal session, rendered in the host's dialect. */
export type TermStep =
  | Text<'user' | 'say'>
  | ({ kind: 'tool'; out?: string } & ToolFields);

export type Scenario = {
  label: string; ask: string; url: string; minutes: number; next: string;
  /** One example line per phase for "What the name means". */
  lines: string[];
  neef: string[];
  /** Phase boundaries in seconds: start of each phase plus the end of the job. */
  bounds: number[];
  steps: TimelineStep[];
};

export const scenarios: Record<ScenarioId, Scenario> = {
  new: {
    label: 'New project', ask: '{neef} build a booking page for my hair salon', url: 'localhost:3000', minutes: 6,
    next: '{neef} email a confirmation to the customer',
    lines: ['empty folder → new project · git on main', '+ index.html  + booking.js  + server.mjs  + 1 test file', '✓ 6 checks passed  ✓ the app starts', 'saved a41c9e2 · ● localhost:3000'],
    neef: ['Setting up the project and Git', 'Writing a first working version', 'Running the checks and starting the app', 'Saving each step so it can be undone'],
    bounds: [0, 20, 230, 320, 372],
    steps: [
      { t: 2, p: 0, kind: 'say', text: 'Empty folder: a new project' },
      { t: 12, p: 0, kind: 'tool', tool: 'Bash', arg: 'neef begin salon-booking', res: 'git on main' },
      { t: 60, p: 1, kind: 'tool', tool: 'Write', arg: 'index.html', n: 96 },
      { t: 120, p: 1, kind: 'tool', tool: 'Write', arg: 'booking.js', n: 142 },
      { t: 170, p: 1, kind: 'tool', tool: 'Write', arg: 'server.mjs', n: 54 },
      { t: 215, p: 1, kind: 'tool', tool: 'Write', arg: 'booking.test.mjs', n: 61 },
      { t: 270, p: 2, kind: 'tool', tool: 'Bash', arg: 'node --test', res: '6 passed', pass: true },
      { t: 300, p: 2, kind: 'tool', tool: 'Bash', arg: 'curl localhost:3000', res: '200 OK', pass: true },
      { t: 340, p: 3, kind: 'tool', tool: 'Bash', arg: 'neef commit', res: 'a41c9e2' },
      { t: 352, p: 3, kind: 'live', text: 'Running at localhost:3000' },
      { t: 356, p: 3, kind: 'guard', text: 'Not published: your call' },
      { t: 372, p: 3, kind: 'next', text: '{neef} email a confirmation to the customer' },
    ],
  },
  existing: {
    label: 'Existing project', ask: '{neef} add a cancel button to my booking page', url: 'localhost:5173', minutes: 4,
    next: '{neef} let customers reschedule a booking',
    lines: ['kept: Vite + React · left alone: notes.md, theme.css', '~ src/Booking.tsx +24 −3  ~ src/api.ts +11', '✓ 14 tests  ✓ build  ✓ the slot is freed', 'saved 7f3d210 · ● localhost:5173'],
    neef: ['Reading your code and keeping your style', 'Making only the change you asked for', 'Running your tests and the build', 'Keeping your unsaved work out of its commits'],
    bounds: [0, 40, 150, 225, 246],
    steps: [
      { t: 4, p: 0, kind: 'say', text: 'Vite + React: keeping that' },
      { t: 25, p: 0, kind: 'tool', tool: 'Bash', arg: 'neef begin cancel-booking', res: 'main' },
      { t: 28, p: 0, kind: 'guard', text: 'notes.md, theme.css are yours: left alone' },
      { t: 90, p: 1, kind: 'tool', tool: 'Edit', arg: 'src/Booking.tsx', add: 24, del: 3 },
      { t: 140, p: 1, kind: 'tool', tool: 'Edit', arg: 'src/api.ts', add: 11, del: 0 },
      { t: 190, p: 2, kind: 'tool', tool: 'Bash', arg: 'npm test', res: '14 passed', pass: true },
      { t: 215, p: 2, kind: 'tool', tool: 'Bash', arg: 'npm run build', res: 'built', pass: true },
      { t: 232, p: 3, kind: 'tool', tool: 'Bash', arg: 'neef commit', res: '7f3d210 · 2 files' },
      { t: 238, p: 3, kind: 'live', text: 'Running at localhost:5173' },
      { t: 240, p: 3, kind: 'guard', text: 'Not published: your call' },
      { t: 246, p: 3, kind: 'next', text: '{neef} let customers reschedule a booking' },
    ],
  },
};

export const meaning = [
  { title: 'It looks before it builds.', text: 'It reads what’s there first. An empty folder becomes a new project; an existing one keeps its stack, its style and your unsaved work.' },
  { title: 'It does the work, straight away.', text: 'Only what the job needs, without asking you to approve every file. Routine choices are its job, not yours.' },
  { title: 'It proves it works.', text: 'Tests run and the app has to actually start. No “done” until the checks pass.' },
  { title: 'It saves, and says what’s next.', text: 'One commit you can undo, the app running, and one suggested next step. Publishing stays your call.' },
];

export const temptations: { icon: string; title: string; sub: string; shortcut: string; why: string; rule: string; steps: TermStep[] }[] = [
  { icon: '✎', title: 'You have unsaved edits', sub: 'and ask for a change in the same project',
    shortcut: 'git add -A && git commit', why: 'takes your half-finished notes.md and theme.css along', rule: 'It never takes your work into its commits',
    steps: [{ kind: 'user', text: '{neef} add a cancel button to my booking page' }, { kind: 'tool', tool: 'Bash', arg: 'node ~/.neef/neef.mjs begin cancel-booking', out: 'notes.md, theme.css already modified (yours)' },
      { kind: 'say', text: 'notes.md and theme.css had your edits before I started. Leaving them alone, and out of my commit.' }, { kind: 'tool', tool: 'Bash', arg: 'node ~/.neef/neef.mjs commit 9b1e…', out: '[main 7f3d210] Let customers cancel a booking · 2 files' }] },
  { icon: '⑂', title: 'You’re on a feature branch', sub: 'and forgot to switch back',
    shortcut: 'commit straight onto feature/colors', why: 'mixes the new button into unrelated work', rule: 'It never switches branches behind your back',
    steps: [{ kind: 'user', text: '{neef} add a cancel button to my booking page' }, { kind: 'tool', tool: 'Bash', arg: 'node ~/.neef/neef.mjs begin cancel-booking', out: 'Development requires main' },
      { kind: 'say', text: 'You’re on feature/colors. I’ve left that branch exactly as it is and paused before editing. Switch to main and say {neef} next.' }] },
  { icon: '✗', title: 'Its change breaks a test', sub: 'and it’s tempting to say “done” anyway',
    shortcut: '“Done! Everything works.”', why: 'with 2 booking tests still failing', rule: 'No “done” without passing checks',
    steps: [{ kind: 'user', text: '{neef} let customers pick a stylist' }, { kind: 'tool', tool: 'Bash', arg: 'npm test', out: '2 failed · 15 passed' },
      { kind: 'say', text: 'My change broke 2 booking tests. Fixing that before anything is saved.' }, { kind: 'tool', tool: 'Edit', arg: 'src/booking.ts', add: 6, del: 2 }, { kind: 'tool', tool: 'Bash', arg: 'npm test', out: '17 passed · 0 failed', pass: true }] },
  { icon: '!', title: 'A test was already failing', sub: 'before it even started',
    shortcut: 'skip date-format.test to get a green run', why: 'the real problem disappears from view', rule: 'Old problems are reported, not buried',
    steps: [{ kind: 'user', text: '{neef} add opening hours to the homepage' }, { kind: 'tool', tool: 'Bash', arg: 'npm test', out: '1 failed: date-format.test (also failing before my change)' },
      { kind: 'say', text: 'That failure was there before I started, so it isn’t hidden or blamed on this change. Opening hours checked separately and saved.' }, { kind: 'say', text: 'Next: {neef} fix the failing date-format test' }] },
  { icon: '↺', title: 'You ask it to tidy history', sub: 'the commit log looks messy',
    shortcut: 'git rebase -i && git push --force', why: 'rewrites history you or others may rely on', rule: 'History is never rewritten',
    steps: [{ kind: 'user', text: '{neef} clean up the git history' },
      { kind: 'say', text: 'I don’t rewrite history, force-push, reset or delete branches. I can summarise what each commit did, or add a clean follow-up commit instead.' }] },
  { icon: '⇡', title: 'It’s finished', sub: 'and the app could go online',
    shortcut: 'git push  → live site updated', why: 'online before you’ve even looked at it', rule: 'Publishing is always your call',
    steps: [{ kind: 'user', text: '{neef} add a reminder email the day before' }, { kind: 'tool', tool: 'Bash', arg: 'npm test', out: '19 passed · 0 failed', pass: true }, { kind: 'tool', tool: 'Bash', arg: 'node ~/.neef/neef.mjs commit 2c8d…', out: '[main 4a1f6b0] Send a reminder email the day before' },
      { kind: 'say', text: 'Saved on your computer. Nothing pushed or published. When you want it online, say {neef} push to origin.' }] },
];

export const moments = [
  ['At the start', 'Say what you want in normal words. One sentence is enough.'],
  ['When only you can answer', 'A missing detail or a real choice. At most two questions, each with a suggested answer.'],
  ['Before anything goes public', 'Everything is saved on your computer. Pushing and publishing wait for you.'],
] as const;

export type Effect = 'changes your project' | 'scratch folder only' | 'changes nothing';
export const modes: [command: string, what: string, effect: Effect][] = [
  ['{neef} <what you want>', 'Build or change something.', 'changes your project'],
  ['{neef} next', 'Finish what’s open, or do the most useful next thing.', 'changes your project'],
  ['{neef} shape <idea>', 'A few sharp questions, then it builds.', 'changes your project'],
  ['{neef} prototype <idea>', 'A clickable demo in a scratch folder.', 'scratch folder only'],
  ['{neef} plan <feature>', 'A saved, phased plan. Then it stops.', 'changes nothing'],
  ['{neef} challenge <topic>', 'An honest, ranked review.', 'changes nothing'],
  ['{neef} options', 'A few good choices with reasons.', 'changes nothing'],
  ['{neef} ask <goal>', 'Not sure which one? It tells you.', 'changes nothing'],
];
