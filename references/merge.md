# Merge branches into main

Invoking `merge` is the user's explicit authorization to merge the branches they choose into main and, unless `--keep` is given, to delete those branches and their worktrees. It authorizes nothing else: no push, no force, no history rewrite, no branch the user did not choose. The completion-gated `merge` helper in `references/completion.md` is the separate agent path and is unchanged.

1. Run helper `merge-candidates`. With no candidates, say every local branch is already in main and stop.
2. When branch names were supplied, use exactly those; refuse names that are not candidates. "All" means every candidate. Otherwise ask one native multi-select question listing each candidate as `branch` with ahead/behind counts, last subject, worktree, and warnings for `dirty` and for `taskComplete: false` (a NEEF task there is unfinished). Recommend none by default; the user picks.
3. Dirty branches are refused before anything merges; report them and let the user commit or drop them from the selection.
4. Run helper `merge <branch...>` with the chosen names in the listed order, adding `--keep` when requested. Each branch fast-forwards when possible, otherwise gets one merge commit; conflicts are detected before main changes.
5. On `failed`, main keeps every earlier merge and nothing of the failed branch. Report the branch, its error and the branches not attempted. Do not resolve conflicts, retry or merge the rest unless the user asks.
6. Report per branch: fast-forward or merge commit, deleted or kept with its reason, and main's new short commit. A branch checked out in the current worktree is kept; tell the user to remove it after leaving that worktree. After any merge commit, tell the user to rerun focused checks in the main folder.

Run no project checks or installs. Save no task state.
