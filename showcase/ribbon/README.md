# Ribbon showcase: script and recording setup

Status: delivered under the user's autonomous completion request. The standalone app, isolated typography prototype, implemented font section and narrated 60-second video are complete. The edit is 60 seconds; measured development time is displayed separately.

## Delivery

- Four-direction revision: `D:\projects\ribbon-showcase-delivery\NEEF-Four-60s.mp4`. The opening now types one prototype brief and reveals four existing UI directions together: Contact sheet, Projection, Atlas and Proof pair. A seven-second comparison grid makes the alternatives visible before refinement; the rest retains the terminal-led NEEF loop, implementation, CSS proof and typography iteration. This is a shortened reconstruction of an existing four-design batch, with no measured generation-time claim. Earlier cuts remain intact.
- Sources: `terminal-four.json`, `render-reel.mjs` (mode `four`) and `capture-four.mjs`. Capture uses a single isolated headless Chrome profile against the existing localhost prototypes after shared-preview screenshots timed out twice; it never attaches to personal browser data. Captures and provenance: `.test-artifacts/ribbon-showcase/four-20261102`. Generate this storyboard's narration into that directory's `voice`, then render with the original-clips directory, that output directory and `four` as arguments. Inspected all four directions in the rendered grid; verified 60.000-second output.

- Terminal-led revision: `D:\projects\ribbon-showcase-delivery\NEEF-Terminal-60s.mp4`. Full-screen terminal-style prompt typing leads each result; 13 shots alternate prompts and real recorded browser outcomes. The commands are shortened reconstructions, explicitly labeled, and the output lines summarize existing evidence rather than impersonating an unedited agent transcript. NEEF's active phase/logo square remains visible. Original edits are retained.
- Terminal source: `terminal.json`; generate its narration into `<new-render-folder>/voice`, then run `node showcase/ribbon/render-reel.mjs <original-clips-folder> <new-render-folder> terminal`. Evidence: `.test-artifacts/ribbon-showcase/terminal-20261102` (probe and inspected terminal frames). Verified 60.000 seconds, 1920×1080 at 30fps, AAC narration and English subtitles; audio peak -0.5 dB.

- Highlight reel revision: `D:\projects\ribbon-showcase-delivery\NEEF-Ribbon-Reel-60s.mp4`. A separate 17-shot, 60-second edit matching the website's tobacco light/dark colors and Georgia headings. The logo tiles follow Navigate → Execute → Evaluate → Follow-up clockwise, with persistent phase labels, short prompt summaries, the late typography prototype and independent CSS proof. The original walkthrough remains available. Audio uses local synthesized narration and a quiet original synthesized pulse.
- Reel sources: `reel.json` and `render-reel.mjs`. Generate narration with `narrate.ps1 -Storyboard showcase/ribbon/reel.json -OutputDirectory <new-render-folder>/voice`, then run `node showcase/ribbon/render-reel.mjs <original-clips-folder> <new-render-folder>`. Reproduction expects the original `*Clip.mp4` recordings, not the earlier composed video. Evidence: `.test-artifacts/ribbon-showcase/reel-20261102`.

- Ready-to-open delivery folder: `D:\projects\ribbon-showcase-delivery` with the final MP4, subtitles, poster, downloaded CSS, source recordings and START-HERE.md. The delivered MP4 hash matches the render output.
- Video: `D:\projects\neef\.test-artifacts\ribbon-showcase\final-20261102\NEEF-Ribbon-60s.mp4` (1920×1080 H.264, 30fps, AAC narration, optional English subtitles).
- App: `D:\projects\hueprint`, running at http://127.0.0.1:4391. Run `npm run dev` there; stop that terminal with Ctrl+C. Commits `1e710fe` (color app) and `97d694f` (typography).
- Typography prototype: `C:\Users\edwin\.neef\prototypes\a598c2ad35530fc91c7008988992d252\typography-hyMmat`, http://127.0.0.1:4392. Selection made under delegated authority: keep the compact three-pair section, default Clear.
- Actual downloaded color/font CSS and independent proof page: final evidence folder `theme.css` and `proof.html`, served at http://127.0.0.1:4393.
- Source recordings, intermediate scenes, narration WAVs, subtitle SRT, poster and timing receipts are retained in the ignored evidence directories. Nothing was published or pushed to a remote.

### Reproduce the edit

`narrate.ps1` generates local Microsoft Hazel Desktop narration from the storyboard, using installed Windows speech synthesis. No third-party voice or external account is used. `render.mjs` combines actual recordings, prompt-summary captions, matched narration, loudness normalization and optional subtitles. Run with a fresh audio output directory (the script refuses existing narration files), or retain the already generated audio-final-v2 files:

```powershell
powershell.exe -NoProfile -File showcase/ribbon/narrate.ps1 -Storyboard D:\projects\neef\showcase\ribbon\storyboard.json -OutputDirectory D:\projects\neef\.test-artifacts\ribbon-showcase\final-20261102\audio-final-v2
node showcase/ribbon/render.mjs .test-artifacts/ribbon-showcase/final-20261102
```

Rendering overwrites only the documented managed intermediate/final names inside the supplied render directory. Source clips and actual downloaded CSS are preserved. The audio-folder command above is for a fresh reproduction; it intentionally refuses when these delivered files already exist.

### What the video establishes

All app footage is a real local browser capture. Earlier prototypes are labeled as later-recorded demonstrations. Prompt captions summarize real earlier requests and the autonomous implementation/prototype brief; they are not fabricated composer recordings or verbatim new user turns. Build-result notes report actual measurements, not a fake accelerated terminal.

The color build plus desktop/unit validation took 287.382 seconds; mobile layout validation and recording followed separately. The typography prototype, implementation and checks took 321.587 seconds. Recording, speech synthesis, encoding and editing are outside those measurements. Timing receipts are retained unchanged in `production-20261102` and `typography-20261102` evidence folders. No general speed benchmark is claimed.

App verification: TypeScript/Vite production build and three focused theme/font tests pass; real PNG/JPEG/WebP uploads, hue/role edits, strengths, comparison endpoints, native drag/release, copy/download, font switching, matching layers and independent exported-CSS application checked. All three pairings stay aligned and avoid overflow at 390px. Actual touch gestures and cross-browser coverage were not performed.

Final media verification: exactly 60.000 seconds, 1800 video frames, H.264 1920×1080 at 30fps, AAC audio and English subtitle track. Eight phase frames plus the separate CSS proof at 54 seconds inspected. Narration normalized without clipping (measured peak -1.9 dB). The final prototype upload take uses a real local screenshot via the browser file input; a rejected 404 take was replaced before delivery. The final narration is 100 words; source timings remain unchanged.

The script/recording preparation below is retained as the production brief; its future-tense prompts were carried out under the user's later instruction to finish autonomously.

## Selected direction

Use the approved Ribbon handoff at `C:\Users\edwin\.neef\prototypes\d7c0586df05c493d147609563b94228a\screenshot-theme-tGAIHt\README.md`. Preview: http://127.0.0.1:4390/?v=7#ribbon. Default Balanced 65, Quiet 35, Vivid 90. Preserve the fully themeable map, vertical before/after reveal, local extraction and working CSS export. No additional image generation. Proposed app destination: `D:\projects\hueprint`; inspect it first rather than overwriting existing work.

## Sixty-second edit

`storyboard.json` is the timing and narration source of truth. Segments cover 0–5 hook, 5–11 NEEF introduction, 11–20 prototype, 20–28 feedback, 28–37 implementation, 37–49 second prototype, 49–56 export/proof, 56–60 closing reveal. Read each narration line into its matching segment; allow short pauses. Record narration after the picture edit, and adjust delivery or copy if it overruns. Do not squeeze speech to preserve every draft word.

The second prototype is central: demonstrate that NEEF can add a useful section after the app works. Build the approved color tool first, then prototype a typography section with three heading/body pairings. This replaces the earlier export-panel redesign idea.

### Closing typography prototype

Show three distinct choices on the same interface and palette:

- Clear: Segoe UI headings + Segoe UI body.
- Editorial: Georgia headings + Segoe UI body.
- Compact: Bahnschrift headings + Segoe UI body.

These fonts are installed on the recording machine. Use explicit system fallback stacks; do not fetch fonts or bundle proprietary font files. Typography is chosen by the user, not inferred from the screenshot. Keep the app controls in their established UI font. Apply each selected pair to both comparison layers so text wraps consistently and the color reveal remains aligned. Show pairing samples and the full preview changing live, while preserving the palette and reveal position.

After explicit approval, implement the chosen section with all three options and export the selected heading/body font-family variables alongside colors. Verify them in the independent CSS fixture. Test default, switching, reset and narrow layouts; font changes must not create clipped controls or break the comparison layers. The section design is what gets approved; do not assume the demo-selected pairing is a permanent user preference.

### Short prompt captions

`storyboard.json` includes five timed `promptCaptions`: the first prototype, visual feedback, implementation, the second prototype, and applying the selected section. Show them as concise captions over the matching footage, with the supplied `Prompt (shortened)` or `Feedback (shortened)` label. Keep the real `$neef-prototype` and `$neef` names visible so the workflow is recognizable.

Each caption replaces the generic segment caption while it is visible. Use no more than two lines, break after the command name if needed, and keep it clear of upload, reveal and export controls. Restore the generic caption afterward where time remains. Preserve the exact full prompts below as the source record. Upcoming captions are planned copy: reconcile them with the requests actually executed before the final edit. They are summaries, not verbatim quotes or simulated live typing.

## Prompts and footage

Already used in this thread; use labeled transcript inserts, never fabricated live typing:

1. `$neef-prototype build the local screenshot-to-theme demo with a polished live preview, editable colors, and working CSS export`
2. Feedback: `i think we need even harder colors and for ribbon it's annoying the half of the preview is an image which doesnt change color. so the slide reveal makes little sense, dont you think?`
3. Selection: `$neef-prototype select the updated Ribbon as the final direction`

The existing prototypes were not recorded while they were built. Any new capture of them is an earlier-prototype demonstration, not retrospective build footage. Source/history screenshots may be used with that context. The generated-image design exploration is outside the 60-second story.

Upcoming implementation prompt (not executed by this preparation task):

> $neef implement the approved Ribbon app in D:\projects\hueprint using the prototype README handoff and showcase/ribbon recording brief in D:\projects\neef; begin timing before the first build action, capture genuine app interactions, verify local image extraction and CSS export, and leave the typography section for the later isolated prototype

Upcoming second prototype prompt (run only once the app exists; use that app as the source project):

> $neef-prototype add an isolated typography-section prototype for Ribbon with three live heading/body pairings: Segoe UI with Segoe UI, Georgia with Segoe UI, and Bahnschrift with Segoe UI; preserve the palette and reveal position, update both comparison layers together, and keep the working app unchanged

Then request implementation explicitly, selecting the demonstrated section. Example after selection:

> $neef implement the approved typography section in Ribbon with all three pairings, preserve the selected canvas and color behavior, export the selected heading/body font-family variables with the palette, and verify the downloaded CSS in an independent fixture

## Capture setup

- Capture only the intended app tab with T3's `preview_recording_start` and `preview_recording_stop`, using its exact tab ID from `preview_status`. If the user is driving a tab, open a separate owned recording tab. Stop and save each take; do not leave recordings running between tasks.
- The browser recorder captures tab content, not T3's composer, agent terminal, desktop, microphone or narration. Pair real app footage with plainly labeled prompt inserts from actual transcript text. Build logs must be actual retained output if shown; do not synthesize terminal progress or present prompt cards as screen recordings of typing. Full-host recording is optional and has not been configured here.
- Target a landscape 16:9 capture if the preview exposes a supported viewport setting; otherwise preserve its measured dimensions and fit/pad to 1920×1080. Never stretch the UI. The capture smoke records its actual dimensions. Set UI scale deliberately for readable controls, then keep it constant through takes.
- Make short takes: 6–12 seconds for upload/reveal, 6–12 seconds for presets, 8–15 seconds for the three typography pairings, 6–12 seconds for export/fixture. Leave roughly one second at either end for editing. Long build waits belong in logs/timing, not an hours-long tab recording.
- Separate three time measurements: preparation/setup wall time; actual app-build wall time (first build action through required verification); individual command/test runtimes. Measure the typography-section iteration separately. Editing, narration and video encoding are not app-build time. Preserve failures and delays in the timing record; never use a faster isolated check as a build-speed claim.
- Use synthetic samples or a screenshot already approved for the demo. No account logins or unrelated desktop windows are needed. Keep generated footage and timing receipts under `.test-artifacts/ribbon-showcase/<session>/` (Git ignored).

## Local commands

From `D:\projects\neef`:

```powershell
node scripts/ribbon-showcase.mjs check
node scripts/ribbon-showcase.mjs start .test-artifacts/ribbon-showcase/build-01
# Execute the explicitly requested standalone app build and required checks.
node scripts/ribbon-showcase.mjs finish .test-artifacts/ribbon-showcase/build-01
node scripts/ribbon-showcase.mjs probe <raw-recording-path>
node scripts/ribbon-showcase.mjs normalize <raw-recording-path> .test-artifacts/ribbon-showcase/<session>/capture-check.mp4
```

`start` writes a new immutable start receipt. `finish` writes a separate finish receipt; repeat starts/finishes refuse to overwrite evidence. Use a new directory for another take/build. Markers measure elapsed wall time; retain separate command runtimes in the build log. `normalize` only converts the input to a padded H.264/30fps editing intermediate; it does not assemble or publish the final video, add narration or claim verification. Output files must not already exist.

## Completion for preparation

Ready means: contiguous 60-second storyboard; honest source/prompt plan; approved prototype accessible; a short browser recording successfully saved, probed and normalized to a readable MP4; FFmpeg/FFprobe available; build markers exercised outside production. Save actual smoke results in the ignored session folder. The final narration, full app-build footage, second prototype, production checks and edited 60-second MP4 remain future work.

## Preparation evidence (2026-11-02)

Passed: 8 contiguous shots totaling 60 seconds, 115 narration words, installed FFmpeg/FFprobe 8.1.2; timing start/finish and duplicate-write refusal; actual T3 browser recording saved (148,131 bytes, 2560×1600, 3.586 seconds); conversion to a silent 1920×1080 H.264/30fps editing intermediate (3.6 seconds); extracted frame inspected. Aspect ratio is preserved with padding. Recorder stopped after the take, reveal/palette restored to selected values. The marker exercise was preflight wall time, not an app-build measurement.

Evidence folder: `D:\projects\neef\.test-artifacts\ribbon-showcase\preflight-20261102`. Files include raw-capture.mp4, capture-check.mp4, frame-check.png, and timing receipts. The capture check is a technical smoke, not the final video or proof of an app build. No production app folder was created.
