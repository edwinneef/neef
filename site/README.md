# NEEF landing page

The approved calm-timeline design with the "four steps" logo, in Tobacco light and dark, built with React, TypeScript and Vite. Fonts are local system fonts; the page makes no requests to AI services or production data.

Building the frontend requires Node.js 20.19+ (20.x) or 22.12+. The NEEF helper itself still requires Node.js 20+.

From the repository root:

```powershell
npm --prefix site ci
npm run site:dev
```

Open http://127.0.0.1:4378. Stop the server with Ctrl+C.

```powershell
npm run site:build
npm run site:preview
```

The build type-checks the frontend and writes a static site to `site/dist/`. The preview serves that build on the same local port, so only run one server on that port. The build uses relative asset paths, so the output can be served at a host root or under a subdirectory. No hosting account or publishing configuration is included.

## Page

- **Nav:** the four-steps logo, two page-wide switches and a theme toggle.
  - The logo's tiles follow the job while the timeline plays, and run through the loop once on hover.
  - Claude Code / Codex switches every command, marker and tool verb. Visible text resolves out of glyph noise, so readers see what differs.
  - New / Existing project cross-fades every example and replays the timeline.
  - The theme follows the system until a visitor picks one.
- **Hero timeline:** every step NEEF ran sits under its phase, with a timestamp and a tick on the bar.
  - The playhead moves continuously, slowing near each step, while the clock counts with it.
  - Rows brighten as the playhead approaches and keep a fading glow behind it.
  - The bar can be dragged (an invisible range input, so keyboards and screen readers work), clicking a row glides there, and Replay rewinds smoothly.
- **Sections:**
  - What the name means (N·E·E·F with examples from the current scenario);
  - Go on, try to make it do something risky (six situations as a tab list, each playing NEEF's reply line by line in a terminal that keeps its height);
  - Where you're needed;
  - Next morning;
  - Every way to ask;
  - Install (copy buttons).

Code: data lives in `src/content.ts`. The other files are:
- `src/host.tsx`: page context and the host-text morph;
- `src/Logo.tsx`;
- `src/Nav.tsx`;
- `src/Timeline.tsx`;
- `src/Terminal.tsx`: host-dialect terminal lines;
- `src/sections.tsx`;
- `src/motion.tsx`: reduced motion, in-view and `Reveal`.

## In-view animations

Every section uses one basic pattern: content fades and rises once, the first time it scrolls into view.

- `Reveal` wraps a block. It gets the class `in` when an `IntersectionObserver` sees it (`useInView`).
- `Reveal group` brings its direct children in one after another. Give each child `style={order(i)}` to set its place in the sequence (80 ms apart). Use `as="ul"`/`as="ol"` when the group is the list itself.
- The hero uses a load-time entrance instead (`hero-enter` with `order(i)`).
- Content is hidden only while `html.motion` is set. `App` sets it only when the visitor allows motion, so reduced motion (also when the preference changes while the page is open) and no-JS show everything at once.

To animate a new component, wrap its block in `<Reveal>`, or its list in `<Reveal as="ul" group>` with `order(i)` on each item. No other setup is needed.

## Notes

- **Installation:** the copy is intentionally source-only, because this repository has no public remote or download URL. The buttons copy the real installer dry-run and apply commands; they don't run them.
- **Illustrative content:** sessions and local app addresses are illustrative, not live NEEF output.
- **Design source:** `~/.neef/prototypes/d7c0586df05c493d147609563b94228a/landing-page-85cWur/README.md` ("Timeline round 3", "What the name means", "risky playground" and "Logo lab"). This frontend is separate from the installed NEEF skill and runtime, and needs no skill reinstall.
- **Firefox alignment:** the logo lockup aligns on cap height with CSS `text-box`. In browsers without it (Firefox at the time of writing) the mark may sit 1–2 px off.
