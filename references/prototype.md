# Discover what works

Done means one of two results. For an open idea, the user gets distinct option cards and the rejected space. For a bounded design question, the user gets a runnable demonstration to inspect or try. Either way, its location, findings and limits are recorded. Shape resolves what to build; prototype discovers what works; NEEF implements the production solution.

Card runs and demos share one workspace. Cards come first when the invocation gives a count or asks for alternatives, variants, names or other options. `visualise <n>` then builds the picked cards as a demo. A request naming one concrete thing to demonstrate, or refining an existing demo, skips cards and builds directly.

## Demo-first routing

Within an explicitly invoked NEEF task, a request only to demonstrate a concept uses this route; state the isolated scope briefly and build. Explicit named modes keep their permissions and stop boundaries. Requests to ship, deploy or change production stay in development. An empty folder or "first version" alone does not imply a prototype. Ask one targeted question only when conflicting intent changes write authority.

## Scope and workspace

Inspect applicable instructions, helper `status` and the relevant source before choosing the smallest useful demonstration. Ask for a missing description, or one essential decision when no safe assumption can settle the scope. Otherwise build immediately; no Shape interview, formal plan or independent review is required. Prefer an interactive prototype for visual or interaction questions. An executable algorithm comparison, API example or architecture spike is equally valid; do not add a UI when it would not help the decision. Explore 2–3 distinct approaches when they test meaningful alternatives, otherwise build one. For visual alternatives, put the variants in one self-contained page with a switcher (tabs or keys 1–3) and pin the design question and each variant's name at the top, so they compare in place; keep separate files only when variants cannot share a page.

Project files, Git, user data and existing NEEF task state remain unchanged. Perform all prototype writes, dependency installs and runs inside an external scratch workspace. Use synthetic data and small copied examples rather than runtime imports from production. Avoid starting production services or connecting to live systems. If a useful demonstration needs authority beyond this boundary, explain the concrete constraint and finish independent safe work first. Do not run the normal begin, state-write, recommendation, commit or deployment workflow for a prototype.

Run helper `prototype-workspace` with `--project <absolute-source-project>` to list recent workspaces without writing. For a new concept, run `prototype-workspace <short-slug>` with the same project to allocate a unique directory under NEEF_HOME (default `~/.neef/prototypes/<project-id>/`). Use the returned absolute path; never substitute the project as a fallback when allocation fails. These are internal helper commands, not user skill invocations. Keep build output, caches and any local dependencies inside that workspace, favoring built-ins or a self-contained HTML file over scaffolding.

For a refinement, reuse the workspace established in this chat. In a fresh chat, inspect the listed demo READMEs and match the goal before choosing one; ask only when the intended prototype is ambiguous. Verify the workspace and edited paths stay outside the source project and do not follow links into production. Preserve other concepts and user edits. Natural follow-ups such as “make it more compact” or “combine concepts 1 and 3” continue the prototype scope; they do not authorize production changes. `neef next` retains its existing production-task behavior.

## Option cards

Produces `count` distinct cards for an idea, plus the rejected space. Judge this workflow after five runs against a new domain, not one. The first run is calibration and the taste file starts empty.

- `prototype <count> <noun> for <idea>`: full run.
- `--bare`: skip scope and axes; still reflect, then clichés and generate.
- `prototype develop <n>`: push one card's mechanism into 3 variations plus a fuller sketch.
- `prototype visualise <n>`: build the picked cards as a demo from their visual briefs, following the demo sections below in the card run's workspace.

Allocate a workspace with `prototype-workspace <short-slug>` before step 3. Its README holds `Status: open`, the idea and the resolved scope. Write cards, the Cut list and clichés to `cards.md` there. `develop` and `visualise` take a card number from the last run only. That is the card workspace established in this chat or, in a fresh chat, the newest listed workspace that has a `cards.md`. The helper's returned `taste` path is the taste file, shared across projects. Create it with the lines `# Taste`, `Append-only. One line per decision. Loaded at the axis step.`, `## Kept` and `## Killed` when it is missing.

### 1. Scope

Skip entirely if the invocation names artifact, length/format and audience, or if `--bare` is set.

Otherwise ask up to 2 rounds of 2–3 questions from the bank, as one native question batch per round; never drip. **Stop the moment you can write 4 axes without hedging.** Stop early if the user skips twice or says "just go."

Every question carries a default. A skip applies the default; say which. Ask about the shell, never the vision. Ask for facts and taste exemplars, never adjectives. Never ask what the invocation already implies.

Question bank, highest-yield first; pick by artifact type.

- All: What would make you reject a card on sight? What's fixed that I shouldn't touch (platform, brand, length, stack)? What's explicitly out of scope? Name something in this space you like, and something you hate.
- Prose: One paragraph or several? Whose voice? Where does it publish? Hard cap?
- Design: Wireframe or full mock? Which breakpoint is real? What must stay? Existing brand tokens?
- Features: What system does it plug into? Power budget? Solo or group? What already exists that this must not duplicate?

Defaults when skipped: match the noun's most common form, 1 card ≈ 1 unit of the obvious length, general audience, nothing fixed, nothing banned.

### 2. Reflect

Write the resolved scope in ≤5 lines: artifact, count, format, audience, must-nots, fixed constraints, applied defaults. A wrong read is cheap to fix here and expensive after 14 cards.

### 3. Clichés

Write the 10 most obvious versions to the clichés section of `cards.md`. Don't show them yet. Nothing downstream may reproduce one.

### 4. Axes

Name 4 axes along which options differ. Assign each card an extreme position on two. No card may sit at the midpoint of all four.

Load the taste file if present. Killed moves take a penalty; kept moves seed axis suggestions.

### 5. Constraints

User-stated constraints outrank the lottery and are used first. Fill remaining slots from the cycle: cost, material, banned tool, hostile user, time limit, inverted premise.

### 6. Generate

Generate `count × 1.4` cards, rounded up, minimum `count + 4`. Card template:

    ### <name>
    **Move:** <the verb + what it does that a default wouldn't>
    **Constraint:** <the draw or stated constraint it honors>
    **Sketch:** <2–3 sentences, or ASCII wireframe>
    **Closest existing thing:** <name it, or "none">
    **Fails if:** <the condition that kills it>
    **Visual brief:** <one sentence: composition, palette, one focal element>

No move, no card. The sketch is capped; bloat hides emptiness.

Move verbs form a closed list, one card per verb:

- open: lead with the concrete instance before any frame.
- split: divide one thing into two that must be handled separately.
- invert: reverse the expected direction, or who benefits.
- stack: fuse two functions into one element.
- withhold: remove something expected until later.
- nest: put the payload inside an existing step.
- swap: trade one dimension for another (cost↔speed, space↔time).
- delay: make the effect arrive after a gap.

### 7. Merge

- No two cards share a move verb.
- At most two cards per axis pair.
- One card must violate a stated fixed constraint; flag it.
- One card must be worse but more interesting; label it.
- Above 8 cards, add one wildcard that ignores the brief.
- Same move in two cards: merge, or cut the weaker.
- Reject anything matching the clichés.

### 8. Audit

Name the two most obvious survivors. Defend each in one line or cut it. If both are cut, permute the axes, regenerate once, and say that it happened.

### 9. Output

Show the cards, numbered. Then a collapsed `Cut` section with one line per killed card (name + move). Then the collapsed clichés. Then one line offering visuals as a `visualise <n>` command.

Append kept and killed to the taste file, one line each, with a short reason.

Rules:

- Never auto-render images or build a demo before `visualise`.
- Never reproduce a cliché.
- Never let a card lack a move.
- Never exceed 2 scope rounds.
- Never skip the reflect step.
- Never hide a regeneration.

## Demonstrate and iterate

Build one end-to-end example answering the bounded question. Essential checks establish that it starts and its concept-critical interaction works; check persistence or restart only when that answers the question. Use existing syntax/build checks as needed, without introducing a test framework just for the demo. For visual work, check script syntax, and open or preview the actual prototype and exercise its key interaction when a viewing tool is available. Check inline JavaScript in memory with Node's `vm.Script`; keep any check files in the workspace. An unavailable preview does not prevent the syntax check; record which interactions remain unverified. For nonvisual work, run representative inputs and show the observable results or comparison. Fix failures in the demonstration; avoid the production test suite, exhaustive edge-case coverage or mandatory reviews. Start a preview server only when needed, bind it locally, keep it tied to the scratch directory, and state its URL and how to stop it. Give checks and server waits finite timeouts; retain and stop only owned test-server handles. Leave the preview running when intentionally handing it over; stop unnecessary background processes.

Hand over the usable artifact once essential checks pass, before optional polish. Defer broad regression, exhaustive edge cases, cross-browser matrices, load testing and production integrations unless they answer the concept question. Preserve data protection and scope boundaries, and fix known failures that invalidate the demonstration. Unavailable interaction checks remain explicit limits, never passing evidence.

Keep `README.md` in the workspace as the continuity record: source project, question, concepts, files and exact run command, decisions and refinements, checks actually performed, known shortcuts and limits, and the proposed production acceptance criteria. Update it as the same demo evolves rather than creating project planning files or replacing the source project's task state. Its first lines include `Status: open`; set `Status: chosen (<variant>)` when the user selects one, naming that variant, or `Status: rejected` when the whole demo is dropped. Helper listings read this line.

Report the artifact or working preview, how to use it and what decision it informs; distinguish executed checks from unverified assumptions. Show the result in the reply rather than only its path: use the host's inline preview or rendering tool, or embed a screenshot, when available. Otherwise, when a browser or preview tool can capture one, save a screenshot in the workspace and give its path. Otherwise give the file path and exact run command.

## Clean up old demos

Only on the user's request, run `prototype-workspace --all` with the project and show each demo's name, status and question from its README. Ask one native question naming the exact folders to delete, recommending rejected and long-untouched ones; never infer consent from status. Delete only the folders the user confirmed in that answer with `prototype-delete <name...>`; a cancelled, partial or unanswered question deletes nothing. Report deleted paths and any reported failure. Deletion is permanent, so confirm again each time; earlier approvals never carry over.

## Production handoff

When asking the user to approve a concept, also offer the second-opinion choice in `references/peer-check.md`. Approval selects a concept and records its findings; it does not automatically promote experimental code. Save the selected concept and its `Status` line, source/demo paths, agreed behavior, constraints, limits and acceptance criteria in the demo README. Provide one concrete `$neef <implementation task>` command in Codex or `/neef <implementation task>` in Claude that references that handoff, then stop. If the user explicitly requests production implementation, follow NEEF's canonical development route with those constraints and its normal baseline, verification and Git safeguards. Rebuild or adapt the approved design to project patterns; prototype approval does not make its code production-ready.
