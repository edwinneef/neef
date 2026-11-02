# Ribbon showcase: script and recording setup

Status: preparation only. The selected Ribbon prototype exists; the standalone app and final video have not been built. No claim that this app takes 60 seconds to build: the edit is 60 seconds.

## Selected direction

Use the approved Ribbon handoff at `C:\Users\edwin\.neef\prototypes\d7c0586df05c493d147609563b94228a\screenshot-theme-tGAIHt\README.md`. Preview: http://127.0.0.1:4390/?v=7#ribbon. Default Balanced 65, Quiet 35, Vivid 90. Preserve the fully themeable map, vertical before/after reveal, local extraction and working CSS export. No additional image generation. Proposed app destination: `D:\projects\hueprint`; inspect it first rather than overwriting existing work.

## Sixty-second edit

`storyboard.json` is the timing and narration source of truth. Segments cover 0–5 hook, 5–11 NEEF introduction, 11–20 prototype, 20–28 feedback, 28–37 implementation, 37–49 second prototype, 49–56 export/proof, 56–60 closing reveal. Read each narration line into its matching segment; allow short pauses. Record narration after the picture edit, and adjust delivery or copy if it overruns. Do not squeeze speech to preserve every draft word.

The second prototype is central: demonstrate that NEEF can reconsider one section after the app works. Keep the first build's export simple so there is an honest before/after improvement to show.

## Prompts and footage

Already used in this thread; use labeled transcript inserts, never fabricated live typing:

1. `$neef-prototype build the local screenshot-to-theme demo with a polished live preview, editable colors, and working CSS export`
2. Feedback: `i think we need even harder colors and for ribbon it's annoying the half of the preview is an image which doesnt change color. so the slide reveal makes little sense, dont you think?`
3. Selection: `$neef-prototype select the updated Ribbon as the final direction`

The existing prototypes were not recorded while they were built. Any new capture of them is an earlier-prototype demonstration, not retrospective build footage. Source/history screenshots may be used with that context. The generated-image design exploration is outside the 60-second story.

Upcoming implementation prompt (not executed by this preparation task):

> $neef implement the approved Ribbon app in D:\projects\hueprint using the prototype README handoff and showcase/ribbon recording brief in D:\projects\neef; begin timing before the first build action, capture genuine app interactions, verify local image extraction and CSS export, and keep the initial export section simple for the later prototype comparison

Upcoming second prototype prompt (run only once the app exists; use that app as the source project):

> $neef-prototype prototype a replacement for Ribbon's export section: a live CSS panel that updates with the palette and includes copy and download controls; keep the working app unchanged and show the current section beside the proposal

Then request implementation explicitly, selecting the demonstrated section. Example after selection:

> $neef apply the approved live CSS export section to Ribbon, preserve the selected canvas and color behavior, and verify the downloaded CSS in an independent fixture

## Capture setup

- Capture only the intended app tab with T3's `preview_recording_start` and `preview_recording_stop`, using its exact tab ID from `preview_status`. If the user is driving a tab, open a separate owned recording tab. Stop and save each take; do not leave recordings running between tasks.
- The browser recorder captures tab content, not T3's composer, agent terminal, desktop, microphone or narration. Pair real app footage with plainly labeled prompt inserts from actual transcript text. Build logs must be actual retained output if shown; do not synthesize terminal progress or present prompt cards as screen recordings of typing. Full-host recording is optional and has not been configured here.
- Target a landscape 16:9 capture if the preview exposes a supported viewport setting; otherwise preserve its measured dimensions and fit/pad to 1920×1080. Never stretch the UI. The capture smoke records its actual dimensions. Set UI scale deliberately for readable controls, then keep it constant through takes.
- Make short takes: 6–12 seconds for upload/reveal, 6–12 seconds for presets, 8–15 seconds for export-section comparison, 6–12 seconds for export/fixture. Leave roughly one second at either end for editing. Long build waits belong in logs/timing, not an hours-long tab recording.
- Separate three time measurements: preparation/setup wall time; actual app-build wall time (first build action through required verification); individual command/test runtimes. Measure the export-section iteration separately. Editing, narration and video encoding are not app-build time. Preserve failures and delays in the timing record; never use a faster isolated check as a build-speed claim.
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
