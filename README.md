# Neef

One explicit skill for autonomous development in Claude Code (`/neef`) and Codex (`$neef`). Modes: task, continue, status, help, doctor. Node 20+ and Git are required. No dependencies, daemon, or project setup.

Maintain this source here. Run `node scripts/install.mjs` for a read-only installation plan, then `node scripts/install.mjs --apply` to synchronize the two skill copies and shared runtime. Existing managed files are hash checked and backed up before replacement; edited or unmanaged files stop installation. Unrelated agent configuration is untouched. Reinstall after source changes. Restart an agent session to refresh discovery.

The runtime lives at `~/.neef/neef.mjs`; `node <absolute-runtime-path> help` describes its commands. Shared state and Git baselines live outside projects under `~/.neef`. Set `NEEF_HOME` and `NEEF_USER_HOME` to isolated directories for tests. State uses canonical repository paths, SHA-256 identifiers, revision checks, exclusive locks, atomic replacement, and one recovery backup. Never remove a lock without checking its recorded owner.

Git commits require a before-edit baseline and inspection of a prepared diff. Files dirty at baseline are refused. A reviewed token expires on any visible working-tree or HEAD change. Explicit selected files are committed through a private Git index while the real index is locked; unrelated edits remain outside the commit, and failed commits leave the real index intact. The helper cannot identify the author of edits made after a baseline: the calling agent must confirm ownership. Overlapping changes are preserved and left uncommitted. Hooks remain enabled and run as trusted project code. No push or merge is performed.

Run `npm run check` for focused disposable-repository tests. Installed configuration checks do not prove fresh agent discovery or native invocation; those require separate host smoke tests.

Explicit-only metadata follows [Claude Code skills](https://code.claude.com/docs/en/skills) and [OpenAI skill conventions](https://learn.chatgpt.com/docs/build-skills). The two installations share the same instructions and runtime. Native agent delegation is chosen by the agent when independent work benefits from it.
