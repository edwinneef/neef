# NEEF landing page

The approved Paper + Signal layout with Tobacco light and dark palettes, built with React, TypeScript and Vite. Fonts are local system fonts; the page makes no requests to AI services or production data.

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

The build type-checks the frontend and writes a static site to `site/dist/`. The preview serves that build on the same local port. Only run one server on that port. The build uses relative asset paths so the output can be served at a host root or under a subdirectory. No hosting account or publishing configuration is included.

The header follows the system color scheme until Light or Dark is chosen. That choice lasts for the page session. Switching does not reset the conversation or scroll position. The site provides entrance animations, one-time scroll reveals and an animated sample conversation. Reduced-motion mode shows the complete conversation and removes the animations, including when the preference changes while the page is open.

Installation copy is intentionally source-only: this repository has no public remote/download URL. The buttons copy the real installer dry-run and apply commands; they do not run them. Add a verified source/download link when one exists. Assistant conversations and local app addresses are labelled illustrative, not live NEEF output.

Design source: `~/.neef/prototypes/d7c0586df05c493d147609563b94228a/landing-page-85cWur/README.md`. Earlier prototypes are preserved there. This frontend is separate from the installed NEEF skill/runtime; it needs no skill reinstall.

Verification: the frontend type-check/build and the existing 69 NEEF tests pass. The built page was checked at 1280px and 360px in both themes, including keyboard tabs, replay, FAQ, scroll reveals and copy success/denial feedback. A browser fixture simulated reduced-motion changes with the authored reduced-motion CSS: all eight messages appeared immediately, sections stayed visible and animations stopped. No operating-system preference was changed by that fixture.
