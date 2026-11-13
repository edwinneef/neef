# Personal design reference

Whenever creating an interactive prototype or design, apply the available `frontend-design` skill unless the user explicitly says not to. This applies across all NEEF modes. The current brief and explicit user instructions determine the result. Carry forward the communication principles here; choose a visual identity for each subject.

## NEEF website: One Morning

On 2026-11-10, the user said they love the look of the round 4 **One Morning** prototype and the direction. Inspect `C:\Users\edwin\.neef\prototypes\d7c0586df05c493d147609563b94228a\four-worlds-nK7UhS\round4\one-morning.html` when working on the NEEF site. If that file is missing, work from the description below; do not search for it or recreate it as a finished design. This is an approved visual direction, not approval of a finished site.

The prototype uses a pale warm background (`#f9f1e9`), dark brown text (`#392b27`), a deep rust work panel (`#873d2c`) and a soft peach timeline (`#f4d6b2`). DM Sans carries the bold, tightly spaced headings and simple body copy. A quiet, light personal lane sits beside the dark work lane; a large time readout, the salon app and the shared morning timeline make the story tangible. These are observations of the liked design, not separate confirmed preferences for every detail.

For the NEEF site only, One Morning replaces the Tobacco page's visual identity (palette, Georgia, layout); the heading and communication principles below still apply. For other subjects, its palette, DM Sans, lanes and morning timeline are available choices, not defaults.

The user wants the logo developed further and believes important parts of NEEF are missing from the page. Keep both open: preserve the liked visual direction while improving the logo and checking content against the current product. The prototype's copy and scope are not a complete or approved specification.

## Earlier NEEF anchor

The user previously preferred the original NEEF Tobacco landing page over comparison sketches and especially praised its headings for conveying the correct message. Source examples: `site/src/App.tsx`, `site/src/sections.tsx`, `site/src/Timeline.tsx` and `site/src/styles.css` in the NEEF source repository. Consult these when available; the examples below make this reference usable without that checkout.

The following heading preference is explicit. The visual strengths below are observations of the Tobacco page, not independently confirmed universal preferences.

## Headings do real work

- State the useful promise and who does what. “You decide what it’s for. NEEF does the legwork.” establishes the user's control and the product's job in two short sentences.
- Answer the reader's next question. “Where you’re needed.” explains involvement; “Next morning, one command.” explains returning to work; “Ready in two commands.” explains getting started.
- Make the following content deliver on the heading. “Go on. Try to make it do something risky.” introduces an interactive demonstration, rather than an unsupported claim of trustworthiness.
- Write the message before styling it. Prefer familiar verbs, concrete outcomes and the reader's perspective. Check that the headings alone convey the page's story, then use supporting copy for the details.

These are examples of effective communication, not reusable slogans. Write fresh headings for the actual audience, product and evidence. Match the certainty of the promise to what the product can demonstrate.

## What supports that message

- Clear hierarchy: expressive, readable headings contrast with quiet body text. On the Tobacco page, Georgia headlines, system sans body copy and monospace commands have distinct jobs.
- Space and pacing: generous gaps separate ideas; related explanations stay together. The page moves from promise to demonstration, involvement, continuity, questions and installation.
- A subject-specific focal point: the timeline makes Navigate → Execute → Evaluate → Follow-up visible through a concrete booking example. Interaction helps the visitor understand the work.
- A coherent atmosphere: the Tobacco page's colors, restrained rules and the four-step mark tie the page together. They support the content without competing with it.

## Motion and interaction

The user requested motion guidance with an interactive emphasis. A particular pace, animation style or amount of motion has not been selected as a universal preference.

- Give motion a job: show what changed, connect an action to its result, or explain a process. Prefer user-triggered feedback, such as a newly added booking becoming easy to find, an expanded detail keeping its relationship to its trigger, or a timeline responding to scrubbing.
- Keep the main action responsive. Motion must not delay saving, add artificial waiting, or prevent another action. Loading and progress indicators reflect actual work; a visual demo must be identified as illustrative.
- Choose the movement and duration for the subject and the size of the change. Keep surrounding elements quiet so attention lands on the useful change. The first build needs only the feedback that makes its core flow clear; extra choreography can wait for a brief that needs it.
- Respect `prefers-reduced-motion` and preserve understandable states without animation. Support keyboard interaction and visible focus; do not make essential information depend on hover, movement or color alone.
- Reuse the current stack and native CSS/browser capabilities when enough. Judge the interaction by trying it, including its reduced-motion state when changed; a stylesheet containing transitions is not evidence that the experience works.

### Interactive reference

When a motion reference would help, inspect the Tobacco page's [NEEF timeline](https://neef-landing.netlify.app/#top). Try Replay, dragging the playhead or picking a log step: the movement connects elapsed time, phase and the work being shown. Claude/Codex and New/Existing project switches show how a changed choice updates the example. This is an optional interactive explanation of NEEF's subject, not a template every product should copy or a browsing step for every task. Its autoplay is an existing page choice, not a requirement for future work. Source and local run instructions are in `site/README.md` in the NEEF checkout.

## Adapt rather than clone

For each new brief, decide the message, information order, visual focal point, type and palette from that subject. Keep the clarity and hierarchy; choose the appropriate layout and interaction. A timeline fits a process, while a different subject may need a comparison, editor, image or no interactive centerpiece.

The Tobacco palette, Georgia, warm backgrounds, pill buttons, exact wording and four-column timeline belong to this example. They are available choices, not defaults for future projects. For an existing product, its established design system remains the starting point.

Earlier feedback: Original rhythm and Bookish split sketches were liked; Open humanist and Compact journal received mixed ratings. The original page was preferred at that time. This does not establish a blanket rejection of sans-serif typography, centered layouts, compact pages or any color family.

Before handoff, check: do the headings communicate the right promise, does the content demonstrate it, and does the visual identity make sense for this particular subject? Capture further preferences only when the user actually expresses them.
