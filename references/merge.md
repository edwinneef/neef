# Merge branches into main

Invoking `merge` is the user's explicit authorization to merge the branches they choose into main and, unless `--keep` is given, to delete those branches and their clean worktrees. It authorizes nothing else: no push, no force, no history rewrite, no branch the user did not choose.

1. Run helper `merge-candidates`. With no candidates, say every local branch is already in main and stop.
2. When branch names were supplied, use exactly those; refuse names that are not candidates. Otherwise ask one native multi-select question listing each candidate as `branch` with ahead/behind counts, last subject, worktree and a "dirty" warning. Recommend none by default; the user picks.
3. Warn before merging a dirty branch: its uncommitted changes stay in its worktree and are not merged, and that worktree is kept.
4. Run helper `merge <branch...>` with the chosen names in the listed order, adding `--keep` when requested. It fast-forwards when possible, otherwise creates a merge commit in the main worktree, and refuses to start if main has uncommitted tracked changes.
5. On `failed`, main is already restored to its last merged commit. Report the branch, conflicting files and the branches not attempted. Do not resolve conflicts, retry or merge the rest unless the user asks.
6. Report per branch: method, deleted or kept with its reason, and main's new short commit. A branch checked out in the current worktree is kept; tell the user to remove it after leaving that worktree.

Run no project checks or installs. Save no task state.
