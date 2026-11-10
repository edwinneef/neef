import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { gitMergeReady, modeTable } from '../scripts/neef.mjs';

const passedOutcomes = [{ id: 'fixture', description: 'Complete the fixture task', required: true, status: 'passed', evidence: 'Fixture assertions passed.' }];

const helper = fileURLToPath(new URL('../scripts/neef.mjs', import.meta.url));

test('persisted baseline resumes owned edits without replacing the before-edit snapshot', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'resume-work']);
  f.state(f.run(['status']).revision, 'Resume work', { baseline: begin.baseline });
  f.write('owned.txt', 'unfinished agent work\n');
  const restored = f.run(['status']);
  assert.equal(restored.state.baseline, begin.baseline);
  const reviewed = f.prepare(restored.state.baseline);
  f.run(['commit', reviewed.token]);
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'unfinished agent work');
});

function fixture(t, initialize = true) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'neef-test-'));
  const root = path.join(temporary, 'project');
  const home = path.join(temporary, 'state-home');
  const gitConfig = path.join(temporary, 'empty.gitconfig');
  fs.mkdirSync(root);
  fs.writeFileSync(gitConfig, '');
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const git = (...args) => {
    const result = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: gitConfig, GIT_CONFIG_NOSYSTEM: '1' } });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const write = (name, value) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
  };
  const run = (args, input, error) => {
    const result = spawnSync(process.execPath, [helper, '--project', root, ...args], {
      encoding: 'utf8', input: input === undefined ? undefined : JSON.stringify(input),
      env: { ...process.env, NEEF_HOME: home, GIT_CONFIG_GLOBAL: gitConfig, GIT_CONFIG_NOSYSTEM: '1' },
    });
    assert.equal(result.status, error ? 1 : 0, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout);
    if (error) assert.match(output.error, error);
    return output;
  };
  if (initialize) {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Neef isolated test');
    git('config', 'user.email', 'neef-test@example.invalid');
    git('config', 'core.autocrlf', 'false');
    write('owned.txt', 'before\n');
    write('user.txt', 'user baseline\n');
    git('add', '--', 'owned.txt', 'user.txt');
    git('commit', '-m', 'Initial fixture');
  }
  const prepare = (baseline, files = ['owned.txt'], message = 'Implement change', error) => run(['prepare', baseline], { files, message }, error);
  const state = (revision, task = 'Implement feature', extra = {}, error) => run(['state-write', revision], { task, progress: 'active', ...extra }, error);
  const statePath = () => path.join(home, 'state', fs.readdirSync(path.join(home, 'state')).find(name => name.endsWith('.json') && !name.endsWith('.plan.json')));
  // Direct helper calls share the fixture's isolated Git configuration.
  const env = neefHome => ({ ...process.env, NEEF_HOME: neefHome, GIT_CONFIG_GLOBAL: gitConfig, GIT_CONFIG_NOSYSTEM: '1' });
  return { root, home, git, write, run, prepare, state, statePath, env };
}

test('clean trivial change commits only the reviewed change and consumes its token', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'Fix typo']);
  assert.equal(begin.branch, 'main');
  f.write('owned.txt', 'after\n');
  const prepared = f.prepare(begin.baseline);
  assert.match(prepared.diff, /\+after/);
  assert.equal(prepared.revision, begin.revision);
  assert.equal(f.git('diff', '--cached'), '');
  const committed = f.run(['commit', prepared.token]);
  assert.equal(committed.changes.length, 0);
  assert.equal(committed.revision, begin.revision);
  assert.equal(committed.branch, 'main');
  assert.equal(f.git('branch', '--format=%(refname:short)'), 'main');
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'after');
  f.run(['commit', prepared.token], undefined, /consumed/);
});

test('explanation style defaults read-only and persists globally without touching task state', t => {
  const f = fixture(t, false);
  assert.equal(f.run(['style']).style, 'simple');
  assert.equal(fs.existsSync(f.home), false);
  f.state('missing', 'Keep this task');
  const before = fs.readFileSync(f.statePath(), 'utf8');
  const file = path.join(f.home, 'preferences.json');
  for (const style of ['simple', 'guided', 'technical']) {
    assert.equal(f.run(['style', style]).style, style);
    assert.equal(f.run(['style']).style, style);
  }
  assert.equal(JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')).style, 'guided');
  const saved = fs.readFileSync(file, 'utf8');
  f.run(['style', 'technical']);
  assert.equal(fs.readFileSync(file, 'utf8'), saved);
  assert.equal(JSON.parse(fs.readFileSync(`${file}.bak`, 'utf8')).style, 'guided');
  const other = path.join(path.dirname(f.root), 'other-project');
  fs.mkdirSync(other);
  const read = spawnSync(process.execPath, [helper, '--project', other, 'style'], {
    encoding: 'utf8', env: f.env(f.home),
  });
  assert.equal(read.status, 0, read.stdout + read.stderr);
  assert.equal(JSON.parse(read.stdout).style, 'technical');
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), before);
  assert.deepEqual(fs.readdirSync(f.root), []);
});

test('style saves kid and documents it for a 12-year-old with examples and analogies', t => {
  const f = fixture(t, false);
  assert.equal(f.run(['style', 'kid']).style, 'kid');
  assert.equal(f.run(['style']).style, 'kid');
  assert.ok(f.run(['style']).available.includes('kid'));
  const guide = fs.readFileSync(new URL('../references/explanation-styles.md', import.meta.url), 'utf8');
  assert.match(guide, /## Kid\r?\n\r?\nExplain as you would to a curious 12-year-old\..*example or analogy for each new idea/);
  assert.match(guide, /`\$neef style kid`/);
});

test('style --here overrides the global default for one project only', t => {
  const f = fixture(t, false);
  const other = path.join(path.dirname(f.root), 'other-project');
  fs.mkdirSync(other);
  const elsewhere = args => {
    const result = spawnSync(process.execPath, [helper, '--project', other, ...args], { encoding: 'utf8', env: f.env(f.home) });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  };
  f.run(['style', 'technical']);
  assert.deepEqual(f.run(['style', 'kid', '--here']), { ...f.run(['style']), style: 'kid', scope: 'project', global: 'technical' });
  assert.equal(elsewhere(['style']).style, 'technical');
  assert.equal(elsewhere(['style']).scope, 'global');
  f.run(['style', 'guided']);
  assert.equal(f.run(['style']).style, 'kid');
  assert.equal(elsewhere(['style']).style, 'guided');
  assert.deepEqual(f.run(['style', 'clear', '--here']), { ...f.run(['style']), style: 'guided', scope: 'global' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.home, 'preferences.json'), 'utf8')), { version: 1, style: 'guided' });
  f.run(['style', 'clear'], undefined, /Choose style/);
  f.run(['style', '--here'], undefined, /Usage/);
  fs.writeFileSync(path.join(f.home, 'preferences.json'), '{"version":1,"style":"simple","projects":{"x":"loud"}}');
  f.run(['style'], undefined, /Invalid preferences/);
  assert.deepEqual(fs.readdirSync(f.root), []);
});

test('style rejects invalid input and preserves corrupt or locked preferences', t => {
  const f = fixture(t, false);
  f.run(['style', 'verbose'], undefined, /Choose style/);
  f.run(['style', 'simple', 'extra'], undefined, /Usage/);
  assert.equal(fs.existsSync(f.home), false);
  f.run(['style', 'guided']);
  const file = path.join(f.home, 'preferences.json');
  const saved = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(`${file}.lock`, 'another writer');
  f.run(['style', 'technical'], undefined, /Operation locked/);
  assert.equal(fs.readFileSync(file, 'utf8'), saved);
  fs.unlinkSync(`${file}.lock`);
  for (const contents of ['broken json', '{"version":1,"style":"unknown"}']) {
    fs.writeFileSync(file, contents);
    f.run(['style', 'simple'], undefined, /JSON|Invalid preferences/);
    assert.equal(fs.readFileSync(file, 'utf8'), contents);
  }
});

test('style refuses project-local storage before writing', t => {
  const f = fixture(t, false);
  const result = spawnSync(process.execPath, [helper, '--project', f.root, 'style', 'simple'], {
    encoding: 'utf8', env: f.env(path.join(f.root, 'local-settings')),
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /outside the project/);
  assert.deepEqual(fs.readdirSync(f.root), []);
});

test('style refuses linked storage and preserves other preference fields', t => {
  const f = fixture(t, false);
  f.run(['style', 'guided']);
  const file = path.join(f.home, 'preferences.json');
  fs.writeFileSync(file, JSON.stringify({ version: 1, style: 'guided', personal: 'keep' }));
  f.run(['style', 'technical']);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).personal, 'keep');
  const linked = path.join(path.dirname(f.root), 'linked-home');
  fs.symlinkSync(f.home, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const before = fs.readFileSync(file, 'utf8');
  const result = spawnSync(process.execPath, [helper, '--project', f.root, 'style', 'simple'], {
    encoding: 'utf8', env: f.env(linked),
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Linked preference storage refused/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('importance defaults to normal, saves per project and leaves style intact', t => {
  const f = fixture(t, false);
  const other = path.join(path.dirname(f.root), 'other-project');
  fs.mkdirSync(other);
  const elsewhere = args => {
    const result = spawnSync(process.execPath, [helper, '--project', other, ...args], { encoding: 'utf8', env: f.env(f.home) });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  };
  assert.equal(f.run(['importance']).importance, 'normal');
  assert.equal(fs.existsSync(f.home), false);
  f.run(['style', 'kid']);
  assert.equal(f.run(['importance', 'explore']).importance, 'explore');
  assert.deepEqual(f.run(['importance', 'important', '--here']), { ...f.run(['importance']), importance: 'important', scope: 'project', global: 'explore' });
  assert.equal(elsewhere(['importance']).importance, 'explore');
  assert.equal(f.run(['style']).style, 'kid');
  assert.deepEqual(f.run(['importance', 'clear', '--here']), { ...f.run(['importance']), importance: 'explore', scope: 'global' });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.home, 'preferences.json'), 'utf8')), { version: 1, style: 'kid', importance: 'explore' });
  f.run(['importance', 'critical'], undefined, /Choose importance/);
  f.run(['importance', 'clear'], undefined, /Choose importance/);
  f.run(['importance', '--here'], undefined, /Usage/);
  fs.writeFileSync(path.join(f.home, 'preferences.json'), '{"version":1,"style":"simple","importanceProjects":{"x":"loud"}}');
  f.run(['importance'], undefined, /Invalid preferences/);
});

test('task importance is validated, recorded from the effective default, kept for the same task and wins in status', t => {
  const f = fixture(t, false);
  f.run(['importance', 'explore', '--here']);
  const first = f.run(['status']);
  assert.deepEqual(first.importance, { level: 'explore', scope: 'project' });
  const saved = f.state(first.revision, 'Careful task', { importance: 'important' });
  assert.equal(saved.state.importance, 'important');
  assert.deepEqual(f.run(['status']).importance, { level: 'important', scope: 'task' });
  assert.equal(f.state(saved.revision, 'Careful task', { next: 'continue' }).state.importance, 'important');
  const other = f.state(f.run(['status']).revision, 'Different task');
  assert.equal(other.state.importance, 'explore', 'a new task without a level records the effective one');
  f.run(['importance', 'clear', '--here']);
  assert.deepEqual(f.run(['status']).importance, { level: 'explore', scope: 'task' }, 'a later default change does not shift a saved task');
  f.state(other.revision, 'Different task', { importance: 'critical' }, /importance must be explore, normal or important/);
});

test('normal multi-file feature stays on main and records verification', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'feature']);
  assert.equal(f.run(['begin', 'same feature']).branch, begin.branch);
  const saved = f.state(f.run(['status']).revision, 'Add feature', { verification: 'Focused fixture assertions passed', next: 'Commit implementation' });
  f.write('owned.txt', 'feature\n');
  f.write('new feature.txt', 'new module\n');
  const prepared = f.prepare(begin.baseline, ['owned.txt', 'new feature.txt']);
  f.run(['commit', prepared.token]);
  f.state(saved.revision, 'Add feature', { progress: 'complete', outcomes: passedOutcomes, verification: 'Focused fixture assertions passed', recommendations: { primary: null, alternatives: [], reason: 'The fixture feature is complete; no further user goal is defined.' } });
  const status = f.run(['status']);
  assert.equal(status.state.progress, 'complete');
  assert.equal(status.state.head, status.actual.head);
  assert.deepEqual(status.discrepancies, []);
});

test('successive increments commit on main with fresh baselines', t => {
  const f = fixture(t);
  const first = f.run(['begin', 'first increment']);
  f.write('owned.txt', 'first increment\n');
  f.run(['commit', f.prepare(first.baseline).token]);
  const second = f.run(['begin', 'second increment']);
  assert.notEqual(second.head, first.head);
  assert.equal(second.branch, 'main');
  f.write('owned.txt', 'second increment\n');
  f.prepare(first.baseline, ['owned.txt'], 'Stale increment', /HEAD changed/);
  f.run(['commit', f.prepare(second.baseline).token]);
  assert.equal(f.git('rev-list', '--count', 'HEAD'), '3');
  assert.equal(f.git('branch', '--format=%(refname:short)'), 'main');
  assert.equal(f.git('status', '--porcelain'), '');
});

test('dirty tracked and untracked user work survives selective commit without branch switching', t => {
  const f = fixture(t);
  f.write('user.txt', 'personal tuning\n');
  f.write('personal.txt', 'untracked user data\n');
  const begin = f.run(['begin', 'dirty task']);
  assert.equal(begin.branch, 'main');
  f.write('owned.txt', 'agent change\n');
  const prepared = f.prepare(begin.baseline);
  assert.doesNotMatch(prepared.diff, /personal tuning|untracked user data/);
  f.run(['commit', prepared.token]);
  assert.equal(fs.readFileSync(path.join(f.root, 'user.txt'), 'utf8'), 'personal tuning\n');
  assert.equal(fs.readFileSync(path.join(f.root, 'personal.txt'), 'utf8'), 'untracked user data\n');
  assert.equal(f.git('show', 'HEAD:user.txt'), 'user baseline');
  assert.deepEqual(f.git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n'), ['owned.txt']);
  assert.match(f.git('status', '--porcelain'), /M user.txt/);
});

test('pre-existing overlapping edits and pre-existing untracked selections are rejected', t => {
  const f = fixture(t);
  f.write('owned.txt', 'user edit\n');
  f.write('user-new.txt', 'user draft\n');
  const begin = f.run(['begin', 'overlap']);
  f.write('owned.txt', 'user edit\nagent addition\n');
  const before = f.git('rev-parse', 'HEAD');
  f.prepare(begin.baseline, ['owned.txt'], 'Unsafe overlap', /Pre-existing edits/);
  f.prepare(begin.baseline, ['user-new.txt'], 'Unsafe untracked', /Pre-existing edits/);
  assert.equal(f.git('diff', '--cached'), '');
  assert.equal(f.git('rev-parse', 'HEAD'), before);
  assert.equal(fs.readFileSync(path.join(f.root, 'owned.txt'), 'utf8'), 'user edit\nagent addition\n');
});

test('staged user changes are preserved and reject preparation', t => {
  const f = fixture(t);
  f.write('user.txt', 'staged user change\n');
  f.git('add', '--', 'user.txt');
  const before = f.git('diff', '--cached', '--binary');
  const begin = f.run(['begin', 'staged']);
  f.write('owned.txt', 'agent change\n');
  f.prepare(begin.baseline, ['owned.txt'], 'Keep index', /staged changes/);
  assert.equal(f.git('diff', '--cached', '--binary'), before);
});

test('selected or unrelated changes after review reject stale commit tokens', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'stale']);
  f.write('owned.txt', 'reviewed\n');
  const first = f.prepare(begin.baseline);
  f.write('owned.txt', 'not reviewed\n');
  f.run(['commit', first.token], undefined, /Working tree changed/);
  const second = f.prepare(begin.baseline);
  f.write('user.txt', 'concurrent user edit\n');
  f.run(['commit', second.token], undefined, /Working tree changed/);
  assert.equal(f.git('diff', '--cached'), '');
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'before');
});

test('owned deletion and rename can be reviewed and committed together', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'rename']);
  fs.renameSync(path.join(f.root, 'owned.txt'), path.join(f.root, 'renamed.txt'));
  const prepared = f.prepare(begin.baseline, ['owned.txt', 'renamed.txt']);
  assert.match(prepared.diff, /rename from owned.txt/);
  f.run(['commit', prepared.token]);
  assert.equal(f.git('show', 'HEAD:renamed.txt'), 'before');
  assert.equal(f.git('status', '--porcelain'), '');
});

test('state revisions, locks, corruption and explicit backup recovery preserve data', t => {
  const f = fixture(t);
  assert.equal(f.run(['status']).revision, 'missing');
  const first = f.state('missing', 'First task');
  const second = f.state(first.revision, 'Current task');
  f.state(first.revision, 'Stale overwrite', {}, /Stale state revision/);
  assert.equal(f.run(['status']).state.task, 'Current task');
  const file = f.statePath();
  fs.writeFileSync(`${file}.lock`, '{"pid":123,"time":"test-owner"}');
  f.state(second.revision, 'Locked overwrite', {}, /Operation locked/);
  assert.equal(fs.readFileSync(`${file}.lock`, 'utf8'), '{"pid":123,"time":"test-owner"}');
  fs.unlinkSync(`${file}.lock`);
  fs.writeFileSync(file, 'corrupt state retained');
  const corrupt = f.run(['status']);
  assert.equal(corrupt.state, null);
  assert.equal(corrupt.backup, true);
  assert.match(corrupt.error, /Invalid state preserved/);
  f.state(corrupt.revision, 'Overwrite corrupt', {}, /Invalid state preserved/);
  const recovered = f.run(['state-recover', corrupt.revision]);
  assert.equal(recovered.state.task, 'First task');
  assert.equal(fs.readFileSync(recovered.preserved, 'utf8'), 'corrupt state retained');
  assert.ok(fs.readFileSync(file, 'utf8').split('\n').length < 40);
  assert.equal(fs.readdirSync(path.dirname(file)).some(name => name.endsWith('.tmp') || name.endsWith('.lock')), false);
});

test('saved branch and HEAD are reconciled and old Git baselines are rejected', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'reconcile']);
  f.state(f.run(['status']).revision);
  f.git('switch', '-c', 'other-task');
  f.write('user.txt', 'independent commit\n');
  f.git('add', '--', 'user.txt');
  f.git('commit', '-m', 'Independent work');
  const status = f.run(['status']);
  assert.equal(status.discrepancies.length, 2);
  f.write('owned.txt', 'uncommitted agent change\n');
  f.prepare(begin.baseline, ['owned.txt'], 'Old baseline', /branch, or HEAD changed/);
  assert.equal(f.git('branch', '--show-current'), 'other-task');
});

test('detached HEAD cannot create a task branch implicitly', t => {
  const f = fixture(t);
  const head = f.git('rev-parse', 'HEAD');
  f.git('switch', '--detach', head);
  f.run(['begin', 'detached'], undefined, /Detached HEAD/);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('branch', '--show-current'), '');
});

test('begin preserves a different branch and refuses development outside main', t => {
  const f = fixture(t);
  f.git('switch', '-c', 'existing-work');
  f.write('user.txt', 'unfinished user work\n');
  f.run(['begin', 'feature'], undefined, /Development requires main/);
  assert.equal(f.git('branch', '--show-current'), 'existing-work');
  assert.equal(fs.readFileSync(path.join(f.root, 'user.txt'), 'utf8'), 'unfinished user work\n');
});

function worktreeFixture(t) {
  const f = fixture(t);
  const root = path.join(path.dirname(f.root), 'feature-worktree');
  f.git('worktree', 'add', '-q', '-b', 'feature', root);
  const run = (args, input, error) => {
    const result = spawnSync(process.execPath, [helper, '--project', root, ...args], { encoding: 'utf8', input: input === undefined ? undefined : JSON.stringify(input), env: f.env(f.home) });
    assert.equal(result.status, error ? 1 : 0, result.stdout + result.stderr);
    const output = JSON.parse(result.stdout);
    if (error) assert.match(output.error, error);
    return output;
  };
  // Commit one owned change on the worktree branch and mark the worktree task complete.
  const finish = (name, value) => {
    const begin = run(['begin', 'worktree task']);
    fs.writeFileSync(path.join(root, name), value);
    const reviewed = run(['prepare', begin.baseline], { files: [name], message: `Change ${name} in worktree` });
    const committed = run(['commit', reviewed.token]);
    run(['state-write', committed.revision], { task: 'Worktree task', progress: 'complete', outcomes: passedOutcomes, verification: 'Fixture assertions passed', recommendations: { primary: null, alternatives: [], reason: 'Fixture worktree task is complete.' } });
  };
  return { ...f, worktree: root, wrun: run, finish };
}

test('a linked worktree develops and commits on its own branch while the main folder still requires main', t => {
  const f = worktreeFixture(t);
  const begin = f.wrun(['begin', 'worktree feature']);
  assert.equal(begin.branch, 'feature');
  assert.equal(begin.worktree, 'linked');
  fs.writeFileSync(path.join(f.worktree, 'owned.txt'), 'worktree change\n');
  const reviewed = f.wrun(['prepare', begin.baseline], { files: ['owned.txt'], message: 'Change on worktree branch' });
  assert.equal(f.wrun(['commit', reviewed.token]).branch, 'feature');
  assert.equal(f.git('show', 'feature:owned.txt'), 'worktree change');
  assert.equal(f.git('show', 'main:owned.txt'), 'before');
  assert.equal(f.run(['begin', 'main folder']).worktree, undefined);
  f.git('switch', '-q', '-c', 'side');
  f.run(['begin', 'side branch'], undefined, /Development requires main outside a linked worktree/);
  assert.equal(spawnSync('git', ['-C', f.worktree, 'switch', '-q', '--detach'], { env: f.env(f.home) }).status, 0);
  f.wrun(['begin', 'detached worktree'], undefined, /Detached HEAD/);
});

test('merge brings a completed worktree branch into main: fast-forward, then one merge commit', t => {
  const f = worktreeFixture(t);
  f.run(['merge'], undefined, /Merge runs from a linked worktree/);
  const begin = f.wrun(['begin', 'unfinished']);
  fs.writeFileSync(path.join(f.worktree, 'owned.txt'), 'first\n');
  f.wrun(['merge'], undefined, /uncommitted changes/);
  f.wrun(['commit', f.wrun(['prepare', begin.baseline], { files: ['owned.txt'], message: 'First change' }).token]);
  f.wrun(['merge'], undefined, /task is not complete/);
  f.finish('worktree.txt', 'from worktree\n');
  const mainHead = f.git('rev-parse', 'main');
  f.write('worktree.txt', 'user draft in main folder\n');
  f.wrun(['merge'], undefined, /Merge refused: .*main folder left as it was/s);
  assert.equal(f.git('rev-parse', 'main'), mainHead);
  assert.equal(fs.readFileSync(path.join(f.root, 'worktree.txt'), 'utf8'), 'user draft in main folder\n');
  fs.rmSync(path.join(f.root, 'worktree.txt'));
  const fast = f.wrun(['merge']);
  assert.equal(fast.merged, true);
  assert.equal(fast.fastForward, true);
  assert.equal(f.git('rev-parse', 'main'), f.git('rev-parse', 'feature'));
  assert.equal(fs.readFileSync(path.join(f.root, 'worktree.txt'), 'utf8'), 'from worktree\n');
  assert.equal(f.wrun(['merge']).reason, 'Already in main');
  f.write('main.txt', 'main moved\n');
  f.git('add', '--', 'main.txt');
  f.git('commit', '-q', '-m', 'Main moves on');
  f.finish('second.txt', 'second\n');
  const merged = f.wrun(['merge']);
  assert.equal(merged.fastForward, false);
  assert.match(merged.recheck, /rerun focused checks/);
  assert.equal(f.git('rev-list', '--parents', '-n', '1', 'main').split(' ').length, 3);
  assert.equal(f.git('show', 'main:second.txt'), 'second');
  assert.equal(f.git('branch', '--format=%(refname:short)'), 'feature\nmain');
});

test('merge refuses conflicts and unsafe main-folder states without touching either side', t => {
  const f = worktreeFixture(t);
  f.write('owned.txt', 'main edit\n');
  f.git('commit', '-q', '-am', 'Main edits owned');
  f.finish('owned.txt', 'worktree edit\n');
  const mainHead = f.git('rev-parse', 'main');
  const featureHead = f.git('rev-parse', 'feature');
  f.wrun(['merge'], undefined, /conflicts with main; nothing merged/);
  assert.equal(f.git('rev-parse', 'main'), mainHead);
  assert.equal(f.git('rev-parse', 'feature'), featureHead);
  assert.equal(f.git('status', '--porcelain'), '');
  f.write('user.txt', 'staged user work\n');
  f.git('add', '--', 'user.txt');
  f.wrun(['merge'], undefined, /staged changes or conflicts/);
  assert.equal(f.git('diff', '--cached', '--name-only'), 'user.txt');
  f.git('switch', '-q', '-c', 'side');
  f.wrun(['merge'], undefined, /Main folder is not on main/);
  assert.equal(f.git('branch', '--show-current'), 'side');
});

test('invalid or oversized state and missing recovery backup fail without overwriting data', t => {
  const f = fixture(t, false);
  f.state('missing', 'Invalid progress', { progress: 'unknown' }, /Invalid state fields: progress must be "active" or "complete"/);
  f.state('missing', 'Array fields', { decisions: [], blockers: ['none'] }, /decisions must be a string \(got array\); blockers must be a string \(got array\)/);
  assert.equal(f.run(['status']).state, null);
  f.state('missing', 'Too large', { decisions: 'x'.repeat(9000) }, /State must stay under 8 KiB and 40 lines \(this write: \d+ bytes, \d+ lines\); shorten/);
  f.state('missing', 'Valid task');
  const file = f.statePath();
  fs.writeFileSync(file, '{broken');
  const corrupt = f.run(['status']);
  assert.equal(corrupt.backup, false);
  f.run(['state-recover', corrupt.revision], undefined, /ENOENT/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken');
});

test('begin prunes stale unreferenced baselines and keeps recent or saved ones', t => {
  const f = fixture(t);
  const saved = f.run(['begin', 'saved task']);
  f.state(saved.revision, 'Saved task', { baseline: saved.baseline });
  const directory = path.join(f.home, 'baselines');
  const stale = path.join(directory, `${crypto.randomUUID()}.json`);
  const recent = path.join(directory, `${crypto.randomUUID()}.json`);
  const unrelated = path.join(directory, 'notes.json');
  for (const file of [stale, recent, unrelated]) fs.writeFileSync(file, '{}');
  const old = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  for (const file of [stale, unrelated, path.join(directory, `${saved.baseline}.json`)]) fs.utimesSync(file, old, old);
  const next = f.run(['begin', 'next increment']);
  assert.equal(fs.existsSync(stale), false);
  for (const file of [recent, unrelated, path.join(directory, `${saved.baseline}.json`)]) assert.equal(fs.existsSync(file), true, file);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, `${next.baseline}.json`), 'utf8')).slug, 'next increment');
});

test('commit tokens hold hashes only, are skipped by task-start scans and are pruned on commit', t => {
  const f = fixture(t);
  const directory = path.join(f.home, 'baselines');
  const begin = f.run(['begin', 'hashed tokens']);
  f.write('owned.txt', 'reviewed secret content\n');
  const prepared = f.prepare(begin.baseline);
  assert.match(prepared.diff, /reviewed secret content/);
  const token = path.join(directory, `${prepared.token}.token.json`);
  assert.ok(fs.existsSync(token), 'token is named apart from baselines');
  assert.equal(fs.existsSync(path.join(directory, `${prepared.token}.json`)), false);
  const stored = fs.readFileSync(token, 'utf8');
  assert.doesNotMatch(stored, /reviewed secret content|"diff"|"actual"/);
  assert.match(stored, /"diffHash":"[a-f0-9]{64}"/);
  assert.match(stored, /"snapshotHash":"[a-f0-9]{64}"/);
  // A token that would move the task start if parsed: same project, an older HEAD, no kind.
  const older = f.git('rev-parse', 'HEAD');
  const decoy = path.join(directory, `${crypto.randomUUID()}.token.json`);
  const stale = path.join(directory, `${crypto.randomUUID()}.token.json`);
  const old = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  fs.writeFileSync(stale, '{}');
  fs.utimesSync(stale, old, old);
  const committed = f.run(['commit', prepared.token]);
  assert.equal(fs.existsSync(stale), false, 'commit prunes stale tokens');
  assert.ok(fs.existsSync(token), 'the consumed token is recent and kept');
  // After a save, only baselines newer than it count; a parsed decoy token would move the next task's start back.
  const previous = f.state(committed.revision, 'Hashed commit task', { progress: 'complete', outcomes: passedOutcomes, recommendations: { primary: null, alternatives: [], reason: 'Fixture task is complete.' } });
  fs.writeFileSync(decoy, JSON.stringify({ project: f.root, head: older }));
  const saved = f.state(previous.revision, 'Task after hashed commit');
  assert.equal(saved.state.start, committed.head, 'task start ignores token files');
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'reviewed secret content');
});

test('every script parses and help lists every catalog mode', () => {
  const scripts = path.dirname(helper);
  for (const name of fs.readdirSync(scripts).filter(name => name.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', path.join(scripts, name)], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  }
  const help = JSON.parse(spawnSync(process.execPath, [helper, 'help'], { encoding: 'utf8' }).stdout);
  for (const usage of ['<task>', 'style [simple|guided|technical|kid] [--here]', 'doctor', 'proto <description> (alias of prototype)']) assert.ok(help.commands.includes(usage), usage);
  assert.equal(help.modes, undefined);
});

test('the README mode table is generated from the catalog and lists the same modes as help', () => {
  const readme = fs.readFileSync(fileURLToPath(new URL('../README.md', import.meta.url)), 'utf8');
  const table = readme.match(/<!-- modes:start -->\n([\s\S]*?)\n<!-- modes:end -->/)?.[1];
  assert.equal(table, modeTable(), 'README mode table is stale; run node scripts/readme-modes.mjs');
  const help = JSON.parse(spawnSync(process.execPath, [helper, 'help'], { encoding: 'utf8' }).stdout);
  const listed = table.split('\n').slice(2).map(row => row.match(/^\| `(.+?)`/)[1].replaceAll('\\|', '|'));
  assert.deepEqual([...listed].sort(), help.groups.flatMap(group => group.commands.map(({ command }) => command)).sort());
  for (const guide of table.matchAll(/\]\((references\/[a-z-]+\.md)\)/g)) assert.ok(fs.existsSync(fileURLToPath(new URL(`../${guide[1]}`, import.meta.url))), guide[1]);
});

test('non-empty non-Git project supports state without creating Git or scaffolding', t => {
  const f = fixture(t, false);
  f.write('notes.txt', 'existing user file\n');
  const status = f.run(['status']);
  assert.equal(status.state, null);
  assert.equal(status.actual.head, null);
  const begin = f.run(['begin', 'outside git']);
  assert.equal(begin.baseline, null);
  assert.match(begin.note, /Ask before running git init/);
  assert.equal(begin.greenfield, undefined);
  f.state(f.run(['status']).revision, 'Non-Git task');
  assert.equal(f.run(['status']).state.task, 'Non-Git task');
  assert.deepEqual(fs.readdirSync(f.root), ['notes.txt']);
});

test('begin starts an empty folder on main and commits its first working version', t => {
  const f = fixture(t, false);
  f.git('config', '--global', 'init.defaultBranch', 'trunk');
  const begin = f.run(['begin', 'new app']);
  assert.ok(begin.baseline);
  assert.equal(begin.branch, 'main');
  assert.equal(begin.head, null);
  assert.equal(begin.gitInitialized, true);
  assert.equal(begin.greenfield, true);
  assert.deepEqual(fs.readdirSync(f.root), ['.git']);
  f.git('config', 'user.name', 'Neef isolated test');
  f.git('config', 'user.email', 'neef-test@example.invalid');
  f.write('index.html', '<h1>Hello</h1>\n');
  const reviewed = f.prepare(begin.baseline, ['index.html'], 'Create first working version');
  f.run(['commit', reviewed.token]);
  assert.equal(f.git('show', 'HEAD:index.html'), '<h1>Hello</h1>');
  const again = f.run(['begin', 'next feature']);
  assert.equal(again.greenfield, undefined);
  assert.equal(again.gitInitialized, undefined);
});

test('existing and empty Git repositories are never reinitialized', t => {
  const existing = fixture(t);
  const head = existing.git('rev-parse', 'HEAD');
  const begin = existing.run(['begin', 'existing work']);
  assert.equal(begin.head, head);
  assert.equal(begin.greenfield, undefined);
  assert.equal(begin.gitInitialized, undefined);
  const empty = fixture(t, false);
  empty.git('init', '-b', 'main');
  const fresh = empty.run(['begin', 'user initialized']);
  assert.equal(fresh.greenfield, true);
  assert.equal(fresh.gitInitialized, undefined);
});

test('literal unusual filenames stage exactly, while traversal and Git metadata are refused', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'literal paths']);
  const name = '- café [1].txt';
  f.write(name, 'selected literal path\n');
  f.write('- café 1.txt', 'unselected path\n');
  f.prepare(begin.baseline, ['../outside.txt'], 'Traversal', /Path escapes project/);
  f.prepare(begin.baseline, ['.git/config'], 'Metadata', /Invalid file path/);
  f.run(['prepare', '../invalid-token'], { files: [name], message: 'Invalid' }, /Invalid baseline/);
  const prepared = f.prepare(begin.baseline, [name]);
  f.run(['commit', prepared.token]);
  assert.equal(f.git('show', `HEAD:${name}`), 'selected literal path');
  assert.match(f.git('status', '--porcelain'), /café|caf\\303/);
});

test('linked files or directory ancestors cannot be selected for commits', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'linked']);
  const outside = path.join(path.dirname(f.root), 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'user data\n');
  fs.symlinkSync(outside, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  f.prepare(begin.baseline, ['linked/secret.txt'], 'Linked ancestor', /Linked path refused/);
  assert.equal(fs.readFileSync(path.join(outside, 'secret.txt'), 'utf8'), 'user data\n');
  assert.equal(f.git('diff', '--cached'), '');
});

test('Git commit failures leave working files and user index intact', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'git failure']);
  f.write('owned.txt', 'preserve failed commit\n');
  const prepared = f.prepare(begin.baseline);
  const head = f.git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(f.root, '.git', 'index.lock'), 'independent git owner');
  f.run(['commit', prepared.token], undefined, /index.lock|Unable to create/);
  assert.equal(fs.readFileSync(path.join(f.root, '.git', 'index.lock'), 'utf8'), 'independent git owner');
  assert.equal(fs.readFileSync(path.join(f.root, 'owned.txt'), 'utf8'), 'preserve failed commit\n');
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  fs.unlinkSync(path.join(f.root, '.git', 'index.lock'));
  assert.equal(f.git('diff', '--cached'), '');
});

test('a failing hook after the index lock releases it and leaves HEAD, index and files intact', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'hook failure']);
  f.write('owned.txt', 'kept after hook failure\n');
  const prepared = f.prepare(begin.baseline);
  const head = f.git('rev-parse', 'HEAD');
  const hook = path.join(f.root, '.git', 'hooks', 'pre-commit');
  fs.mkdirSync(path.dirname(hook), { recursive: true });
  fs.writeFileSync(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  f.run(['commit', prepared.token], undefined, /pre-commit|hook|Git failed/);
  assert.equal(fs.existsSync(path.join(f.root, '.git', 'index.lock')), false);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('diff', '--cached'), '');
  assert.equal(fs.readFileSync(path.join(f.root, 'owned.txt'), 'utf8'), 'kept after hook failure\n');
  fs.unlinkSync(hook);
  f.run(['commit', prepared.token]);
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'kept after hook failure');
});

test('prepare refuses missing input, unchanged files and submodules without touching the index', t => {
  const f = fixture(t);
  const sub = f.git('rev-parse', 'HEAD');
  fs.mkdirSync(path.join(f.root, 'sub'));
  f.git('update-index', '--add', '--cacheinfo', `160000,${sub},sub`);
  f.git('commit', '-m', 'Add gitlink');
  const begin = f.run(['begin', 'refusals']);
  f.prepare(begin.baseline, [], 'No files', /Provide files and message/);
  f.write('owned.txt', 'after\n');
  f.prepare(begin.baseline, ['owned.txt'], ' ', /Provide files and message/);
  f.prepare(begin.baseline, ['user.txt'], 'Unchanged', /No change to commit: user.txt/);
  fs.rmdirSync(path.join(f.root, 'sub'));
  f.prepare(begin.baseline, ['sub'], 'Gitlink', /Submodule commit refused/);
  assert.equal(f.git('diff', '--cached'), '');
});

test('a staged diff that differs from the reviewed one is refused at commit', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'filter drift']);
  f.write('owned.txt', 'reviewed\n');
  const prepared = f.prepare(begin.baseline);
  // A clean filter changes what Git stages without changing the working file.
  f.git('config', 'filter.drift.clean', 'cat >/dev/null; echo filtered');
  fs.writeFileSync(path.join(f.root, '.git', 'info', 'attributes'), 'owned.txt filter=drift\n');
  f.run(['commit', prepared.token], undefined, /Staged diff changed after review/);
  assert.equal(fs.existsSync(path.join(f.root, '.git', 'index.lock')), false);
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'before');
  assert.equal(f.git('diff', '--cached'), '');
});

test('state-write refuses a baseline that belongs to another project', t => {
  const f = fixture(t);
  const other = fixture(t);
  const foreign = other.run(['begin', 'other project']).baseline;
  fs.mkdirSync(path.join(f.home, 'baselines'), { recursive: true });
  fs.copyFileSync(path.join(other.home, 'baselines', `${foreign}.json`), path.join(f.home, 'baselines', `${foreign}.json`));
  f.state('missing', 'Foreign baseline', { baseline: foreign }, /another project/);
  assert.equal(f.run(['status']).state, null);
});

const installer = fileURLToPath(new URL('../scripts/install.mjs', import.meta.url));

function installation(t) {
  const f = fixture(t, false);
  const user = path.join(path.dirname(f.root), 'user-home');
  const run = (apply = false, error) => {
    const result = spawnSync(process.execPath, [installer, ...(apply ? ['--apply'] : [])], {
      encoding: 'utf8', env: { ...process.env, NEEF_USER_HOME: user, NEEF_HOME: f.home },
    });
    assert.equal(result.status, error ? 1 : 0, result.stdout + result.stderr);
    if (error) { assert.match(result.stderr, error); return; }
    return JSON.parse(result.stdout);
  };
  return { ...f, user, install: run };
}

test('isolated installation dry run writes nothing and both agents receive explicit-only shared behavior', t => {
  const f = installation(t);
  const dry = f.install();
  assert.equal(dry.apply, false);
  assert.equal(fs.existsSync(f.home), false);
  assert.equal(fs.existsSync(f.user), false);
  const installed = f.install(true);
  assert.equal(installed.verified, true);
  const shared = fs.readFileSync(path.join(f.home, 'SKILL.md'), 'utf8');
  for (const agent of ['.agents', '.claude']) {
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills', 'neef', 'SKILL.md'), 'utf8'), shared);
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills/neef/references/explanation-styles.md'), 'utf8'),
      fs.readFileSync(path.join(f.home, 'references/explanation-styles.md'), 'utf8'));
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills/neef/references/status.md'), 'utf8'),
      fs.readFileSync(new URL('../references/status.md', import.meta.url), 'utf8'));
  }
  assert.match(shared, /disable-model-invocation: true/);
  assert.match(fs.readFileSync(path.join(f.user, '.agents/skills/neef/agents/openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
  assert.equal(fs.readFileSync(path.join(f.home, 'neef.mjs'), 'utf8'), fs.readFileSync(helper, 'utf8'));
  assert.ok(fs.existsSync(path.join(f.home, 'state')));
  const state = f.state('missing', 'Shared task');
  f.run(['style', 'technical']);
  assert.equal(f.run(['status']).state.task, state.state.task);
  const repeated = f.install(true);
  assert.ok(fs.existsSync(path.join(repeated.backup, 'install.json.bak')));
  assert.equal(f.run(['status']).state.task, 'Shared task');
  assert.equal(f.run(['style']).style, 'technical');
});

test('installer preserves edited managed files and unrelated agent content', t => {
  const f = installation(t);
  f.install(true);
  const unrelated = path.join(f.user, '.claude', 'settings.json');
  fs.writeFileSync(unrelated, '{"keep":"personal configuration"}');
  const target = path.join(f.user, '.claude/skills/neef/SKILL.md');
  fs.writeFileSync(target, 'personal skill edit');
  f.install(true, /Unmanaged or edited file preserved/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'personal skill edit');
  assert.equal(fs.readFileSync(unrelated, 'utf8'), '{"keep":"personal configuration"}');
  assert.equal(fs.existsSync(path.join(f.home, 'install.lock')), false);
});

test('help groups every command and alias by intent without bootstrapping a project', t => {
  const f = fixture(t, false);
  const help = f.run(['help']);
  assert.equal(help.groups.length, 4);
  const commands = help.groups.flatMap(group => {
    assert.ok(group.intent);
    assert.ok(group.commands.length);
    return group.commands;
  });
  assert.equal(new Set(commands.map(item => item.command)).size, commands.length);
  const covered = commands.flatMap(({ command, changes, stops, aliases }) => {
    assert.ok(changes && stops, `Missing behavior for ${command}`);
    const name = command.split(' ')[0];
    return [command, ...aliases.map(alias => `${command.replace(name, alias)} (alias of ${name})`)];
  });
  assert.deepEqual(new Set(covered), new Set(help.commands));
  const row = name => commands.find(item => item.command.split(' ')[0] === name);
  assert.equal(row('shape').command, 'shape [--deep] [--discuss] [idea]');
  assert.match(row('shape').changes, /read-only starters.*--discuss: external decisions only/);
  assert.match(row('shape').stops, /implemented.*unless discussion-only/);
  assert.match(row('plan').stops, /sign-off.*until complete or blocked/);
  assert.match(row('prototype').changes, /scratch.*task state unchanged/);
  assert.deepEqual(row('prototype').aliases, ['proto']);
  assert.match(row('options').changes, /read-only/);
  assert.match(row('options').stops, /later explicit selection/);
  assert.match(row('options').stops, /never invokes/);
  assert.deepEqual(row('options').aliases, ['ask', 'prompt']);
  assert.equal(row('prompt'), undefined);
  assert.match(row('options').stops, /full request/);
  assert.match(row('next').stops, /resumed until complete or blocked/);
  assert.deepEqual(row('next').aliases, ['continue']);
  assert.equal(row('ask'), undefined);
  assert.equal(row('continue'), undefined);
  assert.equal(fs.existsSync(f.home), false);
  assert.deepEqual(fs.readdirSync(f.root), []);
});

test('grouped help preserves dirty files, active progress and saved recommendations', t => {
  const f = fixture(t);
  f.state('missing', 'Unfinished feature', { decisions: 'Preserve these choices', next: 'Finish the existing task', recommendations: { primary: { kind: 'RECOMMENDED', action: 'Add a named greeting.', reason: 'The greeting fixture currently supports only the default.' }, alternatives: [] } });
  f.write('user.txt', 'Personal tuning\n');
  const before = f.run(['status']);
  f.run(['help']);
  assert.deepEqual(f.run(['status']), before);
});

test('every main command installs a described subskill that routes through canonical Neef instructions', t => {
  const f = installation(t);
  const plan = f.install();
  assert.equal(fs.existsSync(f.user), false);
  f.install(true);
  const commands = ['task', 'shape', 'plan', 'challenge', 'review', 'docs', 'prototype', 'options', 'setup', 'merge', 'next', 'status', 'help'];
  for (const command of ['proto', 'ask', 'continue', 'doctor']) for (const agent of ['.agents', '.claude']) assert.equal(fs.existsSync(path.join(f.user, agent, 'skills', `neef-${command}`)), false);
  assert.match(fs.readFileSync(path.join(f.user, '.claude/skills/neef-next/SKILL.md'), 'utf8'), /description: "Resume unfinished work, or do the next useful thing. Use only when explicitly invoked."/);
  assert.doesNotMatch(fs.readFileSync(path.join(f.user, '.claude/skills/neef-plan/SKILL.md'), 'utf8'), /Run Neef's/);
  for (const command of commands) {
    for (const agent of ['.agents', '.claude']) {
      const root = path.join(f.user, agent, 'skills', `neef-${command}`);
      const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
      assert.match(skill, new RegExp(`name: neef-${command}\\n`));
      assert.match(skill, /disable-model-invocation: true/);
      assert.match(skill, /\.\.\/neef\/SKILL\.md/);
      assert.match(skill, /supplied arguments/);
      assert.ok(plan.files.some(file => file.target === path.join(root, 'SKILL.md')));
    }
    const metadata = fs.readFileSync(path.join(f.user, '.agents/skills', `neef-${command}`, 'agents/openai.yaml'), 'utf8');
    assert.match(metadata, new RegExp(`\\$neef-${command}`));
    assert.match(metadata, /allow_implicit_invocation: false/);
  }
  assert.deepEqual(f.run(['help']).aliases.codex, commands.map(command => `$neef-${command}`));
  assert.deepEqual(f.run(['help']).aliases.claude, commands.map(command => `/neef-${command}`));
});

test('prototype allocation is isolated, unique and preserves active work and Git', t => {
  const f = fixture(t);
  const empty = f.run(['prototype-workspace']);
  assert.deepEqual(empty.workspaces, []);
  assert.equal(fs.existsSync(f.home), false);
  const saved = f.state('missing', 'Production feature', { decisions: 'Keep my task', next: 'Finish production work' });
  f.write('user.txt', 'Uncommitted user tuning\n');
  const before = f.run(['status']);
  const first = f.run(['prototype-workspace', 'algorithm-demo']);
  fs.writeFileSync(first.readme, '# Algorithm comparison\nRun: node demo.mjs\n');
  const second = f.run(['prototype-workspace', 'algorithm-demo']);
  assert.notEqual(first.workspace, second.workspace);
  assert.ok(first.workspace.startsWith(`${empty.root}${path.sep}`));
  assert.ok(!first.workspace.startsWith(`${f.root}${path.sep}`));
  const listed = f.run(['prototype-workspace']);
  assert.deepEqual(new Set(listed.workspaces.map(item => item.workspace)), new Set([first.workspace, second.workspace]));
  assert.equal(fs.readFileSync(first.readme, 'utf8'), '# Algorithm comparison\nRun: node demo.mjs\n');
  assert.deepEqual(f.run(['status']), before);
  assert.equal(f.run(['status']).revision, saved.revision);
  const other = { ...f, root: path.join(path.dirname(f.root), 'other-project') };
  fs.mkdirSync(other.root);
  const result = spawnSync(process.execPath, [helper, '--project', other.root, 'prototype-workspace'], {
    encoding: 'utf8', env: f.env(f.home),
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).workspaces, []);
});

test('prototype slugs cannot escape scratch storage or overwrite files', t => {
  const f = fixture(t, false);
  for (const slug of ['../project', 'C:\\escape', 'with space', '', 'x'.repeat(49)]) {
    f.run(['prototype-workspace', slug], undefined, /Provide a prototype slug/);
    assert.equal(fs.existsSync(f.home), false);
  }
});

test('prototype storage refuses directory links and ignores linked demo entries', t => {
  const f = fixture(t);
  const { root } = f.run(['prototype-workspace']);
  const parent = path.dirname(root);
  fs.mkdirSync(parent, { recursive: true });
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(f.root, root, linkType);
  f.run(['prototype-workspace', 'blocked'], undefined, /storage must be outside the project/);
  fs.unlinkSync(root);
  fs.mkdirSync(root);
  const linked = path.join(root, 'linked-demo');
  fs.symlinkSync(f.root, linked, linkType);
  assert.deepEqual(f.run(['prototype-workspace']).workspaces, []);
  fs.unlinkSync(linked);
  fs.rmdirSync(root);
  fs.rmdirSync(parent);
  const external = path.join(path.dirname(f.root), 'foreign-prototypes');
  fs.mkdirSync(external);
  fs.symlinkSync(external, parent, linkType);
  f.run(['prototype-workspace', 'blocked'], undefined, /Linked prototype storage refused/);
  assert.deepEqual(fs.readdirSync(external), []);
  fs.unlinkSync(parent);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('both prototype aliases share installed guidance, backups and preserve demo artifacts', t => {
  const f = installation(t);
  f.install(true);
  const demo = f.run(['prototype-workspace', 'api-demo']);
  fs.writeFileSync(demo.readme, 'Keep this prototype and its findings');
  const guidance = fs.readFileSync(path.join(f.home, 'references/prototype.md'), 'utf8');
  for (const agent of ['.agents', '.claude']) {
    const root = path.join(f.user, agent, 'skills');
    assert.equal(fs.readFileSync(path.join(root, 'neef/references/prototype.md'), 'utf8'), guidance);
    assert.match(fs.readFileSync(path.join(root, 'neef-prototype/SKILL.md'), 'utf8'), /Follow its `prototype` route/);
  }
  const updated = f.install(true);
  assert.ok(fs.existsSync(path.join(updated.backup, 'install.json.bak')));
  assert.equal(fs.readFileSync(demo.readme, 'utf8'), 'Keep this prototype and its findings');
  const reference = path.join(f.user, '.agents/skills/neef/references/prototype.md');
  fs.writeFileSync(reference, 'Personal prototype rules');
  f.install(true, /Unmanaged or edited file preserved/);
  assert.equal(fs.readFileSync(reference, 'utf8'), 'Personal prototype rules');
});

test('advisor aliases install shared read-only guidance without replacing unfinished work', t => {
  const f = installation(t);
  const saved = f.state('missing', 'Unfinished feature', { decisions: 'Preserve this task', next: 'Finish the feature' });
  const before = f.run(['status']);
  f.install(true);
  const guidance = fs.readFileSync(path.join(f.home, 'references/advisor.md'), 'utf8');
  const followUp = fs.readFileSync(path.join(f.home, 'references/follow-up.md'), 'utf8');
  for (const agent of ['.agents', '.claude']) {
    const root = path.join(f.user, agent, 'skills/neef');
    const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
    assert.equal(fs.readFileSync(path.join(root, 'references/advisor.md'), 'utf8'), guidance);
    assert.equal(fs.readFileSync(path.join(root, 'references/follow-up.md'), 'utf8'), followUp);
    assert.match(skill, /`options \[goal\]`, `ask <goal>` or `prompt <idea>`: read `references\/advisor.md`/);
    assert.match(skill, /Advice is read-only, including external state/);
    assert.equal(fs.existsSync(path.join(root, 'references/prompt.md')), false);
    assert.match(guidance, /write the full request inside the exact command/);
    assert.match(followUp, /Finish each task with `state-write`, saving progress and this evaluation atomically/);
    assert.match(skill, /read `references\/follow-up.md` to save progress/);
  }
  const help = f.run(['help']);
  assert.ok(help.commands.includes('options [goal]'));
  assert.ok(help.commands.includes('ask [goal] (alias of options)'));
  assert.ok(help.commands.includes('prototype <description>'));
  assert.ok(help.commands.includes('prompt [goal] (alias of options)'));
  assert.deepEqual(f.run(['status']), before);
  assert.equal(f.run(['next']).state.task, saved.state.task);
  assert.match(guidance, /Advice ends before work begins/);
  assert.match(guidance, /stop without a menu or selection prompt/);
  assert.match(guidance, /explicit selection.*authorizes only/);
  assert.match(guidance, /A question about a choice is still advice/);
  assert.match(followUp, /alternatives: at most two|at most two useful alternatives/);
});

test('advisor installation refuses local edits to its managed reference', t => {
  const f = installation(t);
  f.install(true);
  const target = path.join(f.user, '.agents/skills/neef/references/advisor.md');
  fs.writeFileSync(target, 'Personal advisor constraints');
  f.install(true, /Unmanaged or edited file preserved/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'Personal advisor constraints');
});

test('alias updates preserve edits, unowned folder content and shared task state', t => {
  const f = installation(t);
  f.install(true);
  const saved = f.state('missing', 'Personal unfinished task');
  const target = path.join(f.user, '.agents/skills/neef-next/SKILL.md');
  const original = fs.readFileSync(target, 'utf8');
  fs.writeFileSync(target, 'Personal alias edit');
  f.install(true, /Unmanaged or edited file preserved/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'Personal alias edit');
  fs.writeFileSync(target, original);
  const extra = path.join(f.user, '.claude/skills/neef-setup/personal.txt');
  fs.writeFileSync(extra, 'Personal guidance');
  f.install(true, /Unmanaged skill content preserved/);
  assert.equal(fs.readFileSync(extra, 'utf8'), 'Personal guidance');
  assert.equal(f.run(['status']).revision, saved.revision);
});

test('reinstall retires owned subskills for aliases and doctor but preserves edited ones', t => {
  const f = installation(t);
  f.install(true);
  const receiptPath = path.join(f.home, 'install.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const old = path.join(f.user, '.agents/skills/neef-continue');
  for (const [file, text] of [['SKILL.md', 'old continue alias'], ['agents/openai.yaml', 'old metadata']]) {
    fs.mkdirSync(path.dirname(path.join(old, file)), { recursive: true });
    fs.writeFileSync(path.join(old, file), text);
    receipt.files[path.join(old, file)] = crypto.createHash('sha256').update(text).digest('hex');
  }
  fs.writeFileSync(receiptPath, JSON.stringify(receipt));
  const updated = f.install(true);
  assert.equal(fs.existsSync(old), false);
  assert.ok(updated.files.some(file => file.target === path.join(old, 'SKILL.md')));
  const edited = path.join(f.user, '.claude/skills/neef-doctor/SKILL.md');
  fs.mkdirSync(path.dirname(edited), { recursive: true });
  fs.writeFileSync(edited, 'Personal doctor alias');
  f.install(true, /Unmanaged or edited file preserved/);
  assert.equal(fs.readFileSync(edited, 'utf8'), 'Personal doctor alias');
});

test('installer covers every reference file without a separate list', t => {
  const f = installation(t);
  const targets = new Set(f.install().files.map(file => file.target));
  const references = fs.readdirSync(fileURLToPath(new URL('../references', import.meta.url))).filter(name => name.endsWith('.md') && name !== 'command-alias.md');
  for (const name of references) for (const root of [f.home, path.join(f.user, '.claude/skills/neef'), path.join(f.user, '.agents/skills/neef')]) {
    assert.ok(targets.has(path.join(root, 'references', name)), path.join(root, name));
  }
  assert.ok(![...targets].some(target => target.endsWith('command-alias.md')));
});

test('doctor reports a healthy isolated install, then edited files, locks and corrupt state', t => {
  const f = installation(t);
  f.install(true);
  const doctor = () => {
    const result = spawnSync(process.execPath, [helper, 'doctor'], { encoding: 'utf8', env: { ...process.env, NEEF_USER_HOME: f.user, NEEF_HOME: f.home } });
    assert.equal(result.status, 0, result.stderr);
    return Object.fromEntries(JSON.parse(result.stdout).checks.map(check => [check.name, check]));
  };
  const healthy = doctor();
  for (const name of ['Node 20+', 'shared utility', 'installed file hashes', '.claude skill', '.agents skill', '.claude synchronized instructions', '.agents synchronized instructions', 'Claude explicit-only', 'Codex explicit-only', 'state directory permissions', 'legacy ED absent']) {
    assert.equal(healthy[name]?.ok, true, name);
  }
  fs.appendFileSync(path.join(f.user, '.claude/skills/neef/SKILL.md'), '\nlocal edit\n');
  fs.writeFileSync(path.join(f.home, 'state', 'abc.json.lock'), '{}');
  fs.writeFileSync(path.join(f.home, 'state', 'abc.json'), '{not json');
  const broken = doctor();
  for (const name of ['installed file hashes', '.claude synchronized instructions', 'state lock abc.json.lock', 'state abc.json']) {
    assert.equal(broken[name]?.ok, false, name);
    assert.ok(broken[name].fix, name);
  }
});

test('doctor warns, without failing, when Git is older than 2.38 for merge', () => {
  for (const version of ['git version 2.38.0', 'git version 2.54.0.windows.1', 'git version 2.39.3 (Apple Git-146)', 'git version 3.0.0']) assert.equal(gitMergeReady(version), true, version);
  for (const version of ['git version 2.37.9', 'git version 1.99.0', '', null]) assert.equal(gitMergeReady(version), false, String(version));
  const result = spawnSync(process.execPath, [helper, 'doctor'], { encoding: 'utf8' });
  const check = JSON.parse(result.stdout).checks.find(item => item.name === 'Git 2.38+ for merge');
  assert.equal(check.severity, 'warning');
  assert.equal(check.ok, gitMergeReady(spawnSync('git', ['--version'], { encoding: 'utf8' }).stdout));
});

test('installer refuses unowned skill files and an existing installation lock', t => {
  const f = installation(t);
  f.install(true);
  const extra = path.join(f.user, '.agents/skills/neef/extra.txt');
  fs.writeFileSync(extra, 'unmanaged data');
  f.install(true, /Unmanaged skill content preserved/);
  assert.equal(fs.readFileSync(extra, 'utf8'), 'unmanaged data');
  fs.unlinkSync(extra);
  const lock = path.join(f.home, 'install.lock');
  fs.writeFileSync(lock, 'existing install owner');
  f.install(true, /EEXIST/);
  assert.equal(fs.readFileSync(lock, 'utf8'), 'existing install owner');
});

test('installer rejects linked installation ancestors without writing the destination', t => {
  const f = installation(t);
  fs.mkdirSync(f.user);
  const outside = path.join(path.dirname(f.root), 'outside-skill-root');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(f.user, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  f.install(true, /Linked installation path refused/);
  assert.deepEqual(fs.readdirSync(outside), []);
  assert.equal(fs.existsSync(f.home), false);
});

test('installer rejects linked backup directories before dry-run success or apply writes', t => {
  for (const existing of [false, true]) {
    const f = installation(t);
    const protectedFiles = [];
    if (existing) {
      const installed = f.install(true);
      protectedFiles.push(...installed.files.map(entry => entry.target), path.join(f.home, 'install.json'));
      f.state('missing', 'Keep this task', { decisions: 'Preserve saved data.' });
      f.run(['style', 'guided']);
      protectedFiles.push(f.statePath(), path.join(f.home, 'preferences.json'));
      const backupRoot = path.join(f.home, 'backups');
      const retained = path.join(f.home, 'retained-backups');
      assert.equal(path.dirname(path.resolve(backupRoot)), path.resolve(f.home));
      assert.equal(path.dirname(path.resolve(retained)), path.resolve(f.home));
      fs.renameSync(backupRoot, retained);
    } else {
      fs.mkdirSync(f.home);
    }
    const before = new Map(protectedFiles.map(file => [file, fs.readFileSync(file)]));
    const outside = path.join(path.dirname(f.root), 'redirected-backups');
    fs.mkdirSync(outside);
    const marker = path.join(outside, 'personal.txt');
    fs.writeFileSync(marker, 'Do not change redirected data.');
    fs.symlinkSync(outside, path.join(f.home, 'backups'), process.platform === 'win32' ? 'junction' : 'dir');
    const homeEntries = fs.readdirSync(f.home);
    for (const apply of [false, true]) {
      f.install(apply, /Linked installation path refused/);
      assert.deepEqual(fs.readdirSync(outside), ['personal.txt']);
      assert.equal(fs.readFileSync(marker, 'utf8'), 'Do not change redirected data.');
      assert.deepEqual(fs.readdirSync(f.home), homeEntries);
      assert.equal(fs.existsSync(path.join(f.home, 'install.lock')), false);
      for (const [file, bytes] of before) assert.deepEqual(fs.readFileSync(file), bytes, file);
      if (!existing) assert.equal(fs.existsSync(f.user), false);
    }
  }
});

test('setup discovers facts and adds directions while preserving dirty project content and task state', t => {
  const f = fixture(t);
  f.write('package.json', JSON.stringify({ type: 'module', packageManager: 'pnpm@10', main: 'src/main.tsx',
    dependencies: { react: '1', vite: '1', typescript: '1' },
    scripts: { build: 'node expensive.mjs', test: 'node expensive.mjs', lint: 'node expensive.mjs', deploy: 'node expensive.mjs' } }));
  f.write('src/main.tsx', 'export const App = () => null;\n');
  f.write('src/AGENTS.md', 'Keep components separate from API clients.\n');
  f.write('AGENTS.md', 'Use existing React patterns. Never deploy during setup.\n');
  f.write('tsconfig.json', '{"compilerOptions":{"strict":true,"paths":{"@/*":["src/*"]}}}');
  f.write('tools/deploy.ps1', 'throw "must not run"\n');
  f.write('.github/workflows/deploy.yml', 'name: Deployment\n');
  f.write('expensive.mjs', 'throw new Error("must not run");\n');
  f.write('node_modules/ignored/package.json', '{"dependencies":{"next":"1"}}');
  f.write('.env', 'USER_SECRET=must-not-be-stored\n');
  const saved = f.state('missing', 'Unfinished user task', { next: 'Keep working', verification: 'Not run' });
  const before = f.git('status', '--porcelain');
  const index = fs.readFileSync(path.join(f.root, '.git/index'));
  const setup = f.run(['setup']);
  assert.equal(setup.context.depth, 'full');
  assert.ok(setup.context.languages.includes('TypeScript'));
  assert.deepEqual(setup.context.frameworks, ['React', 'Vite']);
  assert.ok(setup.context.entryPoints.includes('src/main.tsx'));
  assert.ok(setup.context.instructions.includes('src/AGENTS.md'));
  assert.ok(setup.context.conventions.some(value => value.includes('strict TypeScript')));
  for (const kind of ['build', 'test', 'lint', 'deployment']) assert.ok(setup.context.commands.some(command => command.kind === kind));
  assert.ok(setup.context.commands.some(command => command.run === 'pnpm run build'));
  assert.ok(setup.context.commands.some(command => command.run.includes('tools/deploy.ps1')));
  assert.ok(setup.context.deployment.includes('.github/workflows/deploy.yml'));
  assert.equal(setup.safety.commandsExecuted, false);
  assert.equal(setup.safety.dirty, true);
  assert.equal(setup.safety.branch, 'main');
  assert.equal(setup.safety.projectWritable, true);
  assert.equal(setup.safety.externalStateWritable, true);
  const after = f.run(['status']).state;
  const { context, ...task } = after;
  assert.deepEqual(task, saved.state);
  assert.doesNotMatch(JSON.stringify(context), /must-not-be-stored|node_modules\/ignored/);
  assert.equal(fs.readFileSync(path.join(f.root, 'AGENTS.md'), 'utf8').startsWith('Use existing React patterns. Never deploy during setup.\n'), true);
  assert.deepEqual(setup.directions.files, ['AGENTS.md', 'CLAUDE.md']);
  assert.equal(fs.readFileSync(path.join(setup.directions.backup, '0.bak'), 'utf8'), 'Use existing React patterns. Never deploy during setup.\n');
  assert.equal(f.git('status', '--porcelain').replace('?? CLAUDE.md\n', ''), before);
  assert.deepEqual(fs.readFileSync(path.join(f.root, '.git/index')), index);
  assert.equal(fs.existsSync(path.join(f.root, '.neef')), false);
});

test('setup and architecture enrichment are idempotent and task writes preserve shared context', t => {
  const f = fixture(t);
  const first = f.run(['setup']);
  const note = 'owned.txt contains the fixture behavior; user.txt is independent user data.';
  const enriched = f.run(['context-write', first.revision], { architecture: note });
  const raw = fs.readFileSync(f.statePath(), 'utf8');
  const second = f.run(['setup']);
  assert.equal(second.initialized, false);
  assert.equal(second.revision, enriched.revision);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
  f.run(['context-write', first.revision], { architecture: 'stale' }, /Stale state revision/);
  const task = f.state(second.revision, 'Another task');
  assert.equal(task.state.context.architecture, note);
  assert.equal(f.run(['bootstrap']).initialized, false);
  assert.equal(f.run(['status']).state.context.depth, 'full');
  assert.ok(fs.readFileSync(f.statePath(), 'utf8').split('\n').length < 40);
});

test('setup directions preserve bytes, back up originals and remain idempotent', t => {
  const f = fixture(t);
  const original = Buffer.from('\ufeff# Personal rules\r\nKeep my settings.');
  f.write('CLAUDE.md', original);
  const first = f.run(['setup']);
  const agent = fs.readFileSync(path.join(f.root, 'AGENTS.md'));
  const claude = fs.readFileSync(path.join(f.root, 'CLAUDE.md'));
  assert.deepEqual(claude.subarray(0, original.length), original);
  assert.ok(claude.toString().includes('settings.\r\n\r\n<!-- neef:'));
  assert.match(agent.toString(), /ordinary prompts without a NEEF invocation/);
  assert.match(agent.toString(), /Suggestions are advisory/);
  assert.match(agent.toString(), /always a copyable NEEF skill command/);
  assert.deepEqual(fs.readFileSync(path.join(first.directions.backup, '1.bak')), original);
  const second = f.run(['setup']);
  assert.deepEqual(second.directions, { files: [], backup: null });
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'CLAUDE.md')), claude);
  assert.deepEqual(fs.readFileSync(path.join(f.root, 'AGENTS.md')), agent);
});

test('setup upgrades an unedited earlier direction block in place', t => {
  const f = fixture(t);
  const legacy = '<!-- neef:next-prompt:start -->\r\n## Next prompt\r\n\r\nEnd each final reply about this project with one useful next-prompt direction, including replies to ordinary prompts without a NEEF invocation. Give a concrete, copyable prompt or the appropriate NEEF command in the current host\'s syntax, with enough detail to explain its intended result. Base it on current work and established goals; prefer the actual action over a bare "neef next". When waiting for input, make the needed answer the direction. When no useful work remains, say so and invite the next goal rather than inventing work. Use one closing direction, without repeating it elsewhere.\r\n\r\nSuggestions are advisory. Invoke NEEF only when the user explicitly requests it; setup does not authorize automatic workflows or executing suggested prompts.\r\n<!-- neef:next-prompt:end -->';
  const original = `# Mine\r\n\r\n${legacy}\r\nAfter.\r\n`;
  f.write('CLAUDE.md', original);
  const first = f.run(['setup']);
  assert.deepEqual(first.directions.files, ['AGENTS.md', 'CLAUDE.md']);
  const claude = fs.readFileSync(path.join(f.root, 'CLAUDE.md'), 'utf8');
  assert.ok(claude.startsWith('# Mine\r\n\r\n<!-- neef:next-prompt:start -->\r\n'));
  assert.ok(claude.endsWith('<!-- neef:next-prompt:end -->\r\nAfter.\r\n'));
  assert.match(claude, /always a copyable NEEF skill command/);
  assert.doesNotMatch(claude, /one useful next-prompt direction/);
  assert.equal(fs.readFileSync(path.join(first.directions.backup, '1.bak'), 'utf8'), original);
  assert.deepEqual(f.run(['setup']).directions, { files: [], backup: null });
});

// Reverts the direction block to the release that wrote modes as `/neef next` instead of `/neef-next`.
const spacedModes = text => {
  const spaced = text.replace(/current host's syntax, never a bare prose prompt: .*? or `\$neef \.\.\.`\./, () => "current host's syntax (`/neef ...` in Claude Code, `$neef ...` in Codex), never a bare prose prompt.")
    .replace('bare `neef-next`', 'bare `neef next`').replace('`/neef-shape <next goal>`', '`/neef shape <next goal>`');
  assert.notEqual(spaced, text);
  return spaced;
};

test('setup adds user-unblock guidance to the previous NEEF-command direction block', t => {
  const f = fixture(t);
  const unblock = / When only the user can unblock the work[^\n]*?policy denial\./;
  const current = fs.readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.match(current, unblock);
  const previous = spacedModes(current.replace(unblock, ''));
  f.write('CLAUDE.md', previous);
  assert.deepEqual(f.run(['setup']).directions.files, ['AGENTS.md', 'CLAUDE.md']);
  const claude = fs.readFileSync(path.join(f.root, 'CLAUDE.md'), 'utf8');
  assert.equal(claude, current);
  assert.match(claude, /placeholders list what NEEF needs reported back/);
});

test('setup upgrades the spaced-mode direction block to hyphenated mode skills', t => {
  const f = fixture(t);
  const current = fs.readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.match(current, /`\$neef-next \.\.\.` in Codex/);
  f.write('CLAUDE.md', spacedModes(current));
  f.run(['setup']);
  assert.equal(fs.readFileSync(path.join(f.root, 'CLAUDE.md'), 'utf8'), current);
});

test('setup refuses unsafe or edited instructions before changing either instruction file', t => {
  const f = fixture(t);
  f.write('CLAUDE.md', '<!-- neef:next-prompt:start -->\nPersonal edit\n');
  f.run(['setup'], undefined, /Edited or malformed/);
  assert.equal(fs.existsSync(path.join(f.root, 'AGENTS.md')), false);
  fs.unlinkSync(path.join(f.root, 'CLAUDE.md'));
  const outside = path.join(path.dirname(f.root), 'outside');
  fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(f.root, 'CLAUDE.md'), process.platform === 'win32' ? 'junction' : 'dir');
  f.run(['setup'], undefined, /Linked path refused/);
  assert.equal(fs.existsSync(path.join(f.root, 'AGENTS.md')), false);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('a failed instruction write rolls back the instruction file already written', { skip: process.platform !== 'win32' && 'read-only files block replacement only on Windows' }, t => {
  const f = fixture(t);
  const claude = path.join(f.root, 'CLAUDE.md');
  f.write('CLAUDE.md', 'Personal rules\n');
  fs.chmodSync(claude, 0o444);
  f.run(['setup'], undefined, /EPERM|operation not permitted/);
  assert.equal(fs.existsSync(path.join(f.root, 'AGENTS.md')), false);
  assert.equal(fs.readFileSync(claude, 'utf8'), 'Personal rules\n');
  assert.deepEqual(fs.readdirSync(f.root).filter(name => name.endsWith('.tmp')), []);
});

test('setup refuses a backup directory linked into the project', t => {
  const f = fixture(t);
  fs.mkdirSync(f.home, { recursive: true });
  fs.symlinkSync(f.root, path.join(f.home, 'backups'), process.platform === 'win32' ? 'junction' : 'dir');
  f.run(['setup'], undefined, /outside the project/);
  assert.equal(fs.existsSync(path.join(f.root, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(f.root, 'CLAUDE.md')), false);
});

test('begin revisions support direct state writes and reject intervening updates', t => {
  for (const initialize of [true, false]) {
    const f = fixture(t, initialize);
    const begin = f.run(['begin', 'revision-handoff']);
    assert.match(begin.revision, /^[a-f0-9]{64}$/);
    const saved = f.state(begin.revision, 'Revision handoff', { baseline: begin.baseline });
    const resumed = f.run(['begin', 'reuse-context']);
    assert.equal(resumed.context.initialized, false);
    assert.equal(resumed.revision, saved.revision);
    const updated = f.state(resumed.revision, 'Revision handoff', { verification: 'Updated state' });
    f.state(resumed.revision, 'Stale handoff', {}, /Stale state revision/);
    assert.equal(f.run(['status']).revision, updated.revision);
  }
});

test('ordinary begin bootstraps minimal context and optional setup deepens it', t => {
  const f = fixture(t);
  f.write('package.json', '{"scripts":{"test":"exit 1"}}');
  f.write('packages/ui/src/main.tsx', 'export const App = () => null;\n');
  const begin = f.run(['begin', 'automatic bootstrap']);
  assert.equal(begin.context.initialized, true);
  assert.equal(begin.branch, 'main');
  const first = f.run(['status']);
  assert.equal(first.state.context.depth, 'minimal');
  assert.equal(first.state.task, '');
  assert.deepEqual(first.discrepancies, []);
  assert.equal(f.run(['begin', 'rerun']).context.initialized, false);
  const full = f.run(['setup']);
  assert.equal(full.context.depth, 'full');
  assert.ok(full.context.entryPoints.includes('packages/ui/src/main.tsx'));
  assert.equal(f.run(['bootstrap']).initialized, false);
});

test('setup preserves corrupt or locked state while failed bootstrap does not gate development', t => {
  const f = fixture(t);
  f.state('missing', 'Saved user work');
  const file = f.statePath();
  fs.writeFileSync(file, 'preserve corrupt context');
  f.run(['setup'], undefined, /Invalid state preserved/);
  const begin = f.run(['begin', 'still useful']);
  assert.match(begin.context.warning, /bootstrap skipped/);
  assert.equal(Object.hasOwn(begin, 'revision'), false);
  assert.equal(fs.readFileSync(file, 'utf8'), 'preserve corrupt context');
  fs.unlinkSync(file);
  const setup = f.run(['setup']);
  const before = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(`${file}.lock`, 'another state writer');
  f.run(['setup'], undefined, /Operation locked/);
  f.run(['context-write', setup.revision], { architecture: 'Blocked update' }, /Operation locked/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});

test('setup skips linked project trees and storage inside the project', t => {
  const f = fixture(t, false);
  const outside = path.join(path.dirname(f.root), 'linked-source');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'AGENTS.md'), 'Private outside instructions');
  fs.symlinkSync(outside, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  const setup = f.run(['setup']);
  assert.deepEqual(setup.context.instructions, ['AGENTS.md', 'CLAUDE.md']);
  assert.equal(setup.safety.git, false);
  assert.equal(setup.safety.selectiveCommitAvailable, false);
  const result = spawnSync(process.execPath, [helper, '--project', f.root, 'setup'], {
    encoding: 'utf8', env: f.env(path.join(f.root, '..cache')),
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /outside the project/);
  assert.equal(fs.existsSync(path.join(f.root, '..cache')), false);
});

test('setup refreshes changed manifests and reports limits without executing malformed or large inputs', t => {
  const f = fixture(t, false);
  f.write('package.json', '{broken');
  const first = f.run(['setup']);
  assert.ok(first.warnings.some(warning => warning.includes('Invalid manifest')));
  f.write('package.json', '{"dependencies":{"react":"1"},"scripts":{"build":"throw expensive"}}');
  f.write('AGENTS.md', 'a'.repeat(40000));
  for (let i = 0; i < 105; i++) f.write(`source/file-${i}.ts`, 'export {};\n');
  const minimal = f.run(['status']);
  f.run(['context-write', minimal.revision], { architecture: 'Old facts' });
  const refreshed = f.run(['setup']);
  assert.notEqual(refreshed.context.fingerprint, first.context.fingerprint);
  assert.deepEqual(refreshed.context.frameworks, ['React']);
  assert.equal(refreshed.context.architecture, '');
  assert.ok(refreshed.warnings.some(warning => warning.includes('Large file')));
  assert.ok(refreshed.context.instructions.includes('AGENTS.md'));
  assert.equal(refreshed.safety.commandsExecuted, false);
});

const recommendation = (action = 'Add a named greeting to owned.txt and verify its default behavior.', kind = 'RECOMMENDED') => ({
  kind, action, reason: 'The established fixture goal uses owned.txt for behavior while user.txt holds unrelated data.',
});
const noRecommendation = { primary: null, alternatives: [], reason: 'The requested fixture goal is complete and no supported follow-up remains.' };

test('completion requires an explicit recommendation evaluation and refuses unfinished required scope', t => {
  const f = fixture(t);
  const saved = f.state('missing', 'Original task');
  const raw = fs.readFileSync(f.statePath(), 'utf8');
  f.state(saved.revision, 'Original task', { progress: 'complete', outcomes: passedOutcomes }, /require evaluated recommendations/);
  f.state(saved.revision, 'Original task', { progress: 'complete', outcomes: passedOutcomes, recommendations: { primary: recommendation('Finish the original behavior.', 'REQUIRED'), alternatives: [] } }, /unfinished original task/);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
  const active = f.state(saved.revision, 'Original task', { next: 'Finish owned.txt', recommendations: {
    primary: recommendation(), alternatives: [recommendation('Finish the original behavior.', 'REQUIRED')],
  } });
  assert.equal(active.state.recommendations.primary.kind, 'REQUIRED');
  const next = f.run(['next']);
  assert.deepEqual(next.candidates, []);
  assert.equal(next.resume, 'continue');
  assert.equal(next.state.next, 'Finish owned.txt');
});

test('four-zone completion rejects missing or malformed outcome records without changing saved state', t => {
  const f = fixture(t, false);
  const saved = f.state('missing', 'Check requested behavior');
  const raw = fs.readFileSync(f.statePath(), 'utf8');
  const complete = { progress: 'complete', recommendations: noRecommendation };
  f.state(saved.revision, saved.state.task, complete, /Completed tasks require outcomes/);
  for (const outcomes of [null, [], {}, [null], [{ ...passedOutcomes[0], required: 'yes' }],
    [{ ...passedOutcomes[0], status: 'complete' }], [{ ...passedOutcomes[0], id: ' ' }],
    [{ ...passedOutcomes[0], description: '' }], [{ ...passedOutcomes[0], evidence: [] }],
    [{ ...passedOutcomes[0], evidence: ' ' }], [{ ...passedOutcomes[0], required: false }],
    [passedOutcomes[0], passedOutcomes[0]]]) {
    f.state(saved.revision, saved.state.task, { ...complete, outcomes }, /Invalid outcomes/);
    assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
  }
  for (const [field, limit] of [['id', 60], ['description', 400], ['evidence', 800]]) {
    f.state(saved.revision, saved.state.task, { outcomes: [{ ...passedOutcomes[0], [field]: 'x'.repeat(limit + 1) }] }, /Invalid outcomes/);
  }
  assert.equal(fs.existsSync(`${f.statePath()}.bak`), false);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
});

test('four-zone completion requires every required outcome to pass but allows optional unfinished checks', t => {
  const f = fixture(t, false);
  const saved = f.state('missing', 'Check requested behavior');
  for (const status of ['pending', 'failed', 'blocked']) {
    f.state(saved.revision, saved.state.task, {
      progress: 'complete', recommendations: noRecommendation,
      outcomes: [...passedOutcomes, { id: 'second', description: 'Second required behavior', required: true, status, evidence: 'Still unverified.' }],
    }, /Unfinished required outcomes/);
  }
  const outcomes = [...passedOutcomes, { id: 'optional', description: 'Optional additional check', required: false, status: 'failed', evidence: '' }];
  const complete = f.state(saved.revision, saved.state.task, { progress: 'complete', outcomes, recommendations: noRecommendation });
  assert.equal(complete.state.progress, 'complete');
  assert.deepEqual(f.run(['status']).state.outcomes, outcomes);
});

test('four-zone records survive checkpoints and prevent implicit clearing of unresolved blockers', t => {
  const f = fixture(t, false);
  const first = f.state('missing', 'Check requested behavior', { outcomes: passedOutcomes, blockers: 'Required result is missing.' });
  const checkpoint = f.state(first.revision, first.state.task, { verification: 'Rechecked current evidence.' });
  assert.deepEqual(checkpoint.state.outcomes, first.state.outcomes);
  f.state(checkpoint.revision, first.state.task, { progress: 'complete', recommendations: noRecommendation }, /Unresolved blockers/);
  const complete = f.state(checkpoint.revision, first.state.task, { progress: 'complete', blockers: '', recommendations: noRecommendation });
  assert.deepEqual(complete.state.outcomes, passedOutcomes);
  const next = f.state(complete.revision, 'Another task');
  assert.equal(next.state.outcomes, undefined);
  assert.equal(next.state.blockers, '');
  f.state(next.revision, next.state.task, { progress: 'complete', recommendations: noRecommendation }, /Completed tasks require outcomes/);
});

test('legacy completed states remain readable and require outcome records on their next completion write', t => {
  const f = fixture(t, false);
  const first = f.state('missing', 'Legacy task');
  const legacy = { ...first.state, progress: 'complete', verification: 'Historical check.' };
  const raw = JSON.stringify(legacy);
  fs.writeFileSync(f.statePath(), raw);
  const current = f.run(['status']);
  assert.equal(current.error, undefined);
  assert.equal(f.run(['next']).state.progress, 'complete');
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
  f.state(current.revision, legacy.task, { progress: 'complete', recommendations: noRecommendation }, /Completed tasks require outcomes/);
  const upgraded = f.state(current.revision, legacy.task, { progress: 'complete', outcomes: passedOutcomes, recommendations: noRecommendation });
  assert.deepEqual(upgraded.state.outcomes, passedOutcomes);
  assert.equal(upgraded.state.verification, legacy.verification);
});

test('outcomes remain compact and survive setup, recommendation refresh and recovery', t => {
  const f = fixture(t, false);
  const outcomes = Array.from({ length: 8 }, (_, index) => ({ ...passedOutcomes[0], id: `outcome-${index}` }));
  f.state('missing', 'Preserve outcomes', { outcomes });
  const setup = f.run(['setup']);
  const advice = f.run(['recommendations-write', setup.revision], noRecommendation);
  assert.deepEqual(advice.state.outcomes, outcomes);
  const raw = fs.readFileSync(f.statePath(), 'utf8');
  assert.ok(Buffer.byteLength(raw) <= 8192);
  assert.ok(raw.split('\n').length <= 40);
  const bad = { ...advice.state, outcomes: [{ ...passedOutcomes[0], evidence: '' }] };
  fs.writeFileSync(f.statePath(), JSON.stringify(bad));
  const corrupt = f.run(['status']);
  assert.match(corrupt.error, /Invalid state preserved/);
  const recovered = f.run(['state-recover', corrupt.revision]);
  assert.deepEqual(recovered.state.outcomes, outcomes);
});

test('both hosts install the same adaptive four-zone contract and completion schema', t => {
  const f = installation(t);
  f.install(true);
  const source = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  for (const agent of ['.agents', '.claude']) {
    const root = path.join(f.user, agent, 'skills/neef');
    assert.equal(fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8'), source);
    assert.match(source, /headings only when useful/);
    assert.match(source, /Each mode's write permissions and stop boundary govern every zone/);
    assert.match(fs.readFileSync(path.join(root, 'references/completion.md'), 'utf8'), /helper checks record consistency/);
  }
  assert.match(f.run(['help']).outcomes, /required.*passed|Required outcomes must pass/);
});

test('next returns ordered advisory candidates and inspects changed Git state without mutating it', t => {
  const f = fixture(t);
  const primary = recommendation();
  const alternative = recommendation('Add an optional export to owned.txt.', 'OPTIONAL');
  const saved = f.state('missing', 'Completed feature', { progress: 'complete', outcomes: passedOutcomes, recommendations: { primary, alternatives: [alternative] } });
  const raw = fs.readFileSync(f.statePath(), 'utf8');
  f.write('user.txt', 'concurrent personal tuning\n');
  const before = f.git('status', '--porcelain');
  const next = f.run(['next']);
  assert.deepEqual(next.candidates, [primary, alternative]);
  assert.equal(next.requiresRevalidation, true);
  assert.equal(next.state.progress, 'complete');
  assert.equal(next.state.recommendations.basis.head, saved.state.head);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
  assert.equal(f.git('status', '--porcelain'), before);
  f.git('switch', '-c', 'another-task');
  f.git('add', '--', 'user.txt');
  f.git('commit', '-m', 'Independent user work');
  const changed = f.run(['next']);
  assert.deepEqual(changed.candidates, [primary, alternative]);
  assert.ok(changed.discrepancies.some(message => message.includes('recommendations were saved')));
  assert.equal(changed.requiresRevalidation, true);
});

test('recommendation refresh preserves task and context, supports alternatives and no-action evaluation', t => {
  const f = fixture(t);
  const setup = f.run(['setup']);
  const saved = f.state(setup.revision, 'Completed feature', { progress: 'complete', outcomes: passedOutcomes, recommendations: { primary: recommendation(), alternatives: [] } });
  const replacement = { primary: recommendation('Add a focused greeting export in owned.txt.'), alternatives: [recommendation('Add an optional fixture example.', 'OPTIONAL')] };
  const updated = f.run(['recommendations-write', saved.revision], replacement);
  const { recommendations, ...task } = updated.state;
  const { recommendations: oldRecommendations, ...oldTask } = saved.state;
  assert.deepEqual(task, oldTask);
  assert.equal(recommendations.primary.action, replacement.primary.action);
  assert.equal(f.run(['setup']).context.depth, 'full');
  assert.deepEqual(f.run(['status']).state.recommendations, recommendations);
  const current = f.run(['status']);
  f.run(['recommendations-write', saved.revision], noRecommendation, /Stale state revision/);
  const cleared = f.run(['recommendations-write', current.revision], noRecommendation);
  assert.equal(cleared.state.recommendations.primary, null);
  assert.equal(f.run(['recommendations-write', cleared.revision], noRecommendation).revision, cleared.revision);
  const next = f.run(['next']);
  assert.deepEqual(next.candidates, []);
  assert.equal(next.savedReason, noRecommendation.reason);
  assert.equal(next.discoveryRequired, true);
  assert.ok(fs.readFileSync(f.statePath(), 'utf8').split('\n').length < 40);
});

// The agent executes next; these guard its shipped contract and helper handoff,
// not model judgment. Live host checks are separate from deterministic tests.
const nextGuidance = () => fs.readFileSync(new URL('../references/next.md', import.meta.url), 'utf8');

test('next stays read-only beside an unplanned roadmap, and its guidance calls for research', t => {
  const f = fixture(t);
  f.write('.planning/ROADMAP.md', '# Goal: named greetings\nPhase 2: support names. No plan yet; inspect the greeting API.\n');
  const before = f.git('status', '--porcelain');
  const next = f.run(['next']);
  assert.equal(next.discoveryRequired, true);
  assert.match(next.reason, /inspect.*goals/i);
  assert.match(nextGuidance(), /missing plan.*research/i);
  assert.equal(f.git('status', '--porcelain'), before);
  assert.equal(fs.existsSync(f.home), false);
});

test('next keeps orchestrator advice as a readable candidate, and its guidance treats it as a goal', t => {
  const f = fixture(t);
  const advice = recommendation('Run /gsd:verify-work and /gsd:plan-phase 2, then /neef next.');
  f.run(['recommendations-write', 'missing'], { primary: advice, alternatives: [] });
  const next = f.run(['next']);
  assert.equal(next.requiresRevalidation, true);
  assert.equal(next.discoveryRequired, true);
  assert.deepEqual(next.candidates, [advice]); // Legacy advice stays advisory and readable.
  assert.match(nextGuidance(), /Extract the intended outcome.*external orchestrator/i);
  assert.match(nextGuidance(), /mandatory project instructions/i);
});

test('investigation evidence and its follow-up persist, and next guidance treats dependencies as work', t => {
  const f = fixture(t);
  const saved = f.run(['recommendations-write', 'missing'], { primary: recommendation('Determine whether owned.txt supports names before implementing named greetings.'), alternatives: [] });
  assert.equal(f.run(['next']).discoveryRequired, true);
  assert.match(nextGuidance(), /Resolve technical dependencies through code inspection.*focused verification/i);
  const investigated = f.state(saved.revision, 'Investigate greeting support', {
    progress: 'complete', outcomes: passedOutcomes, verification: 'Inspected owned.txt: it contains only before; no greeting API exists.',
    recommendations: { primary: recommendation('Implement a greeting API with default and named-output tests.'), alternatives: [] },
  });
  assert.match(investigated.state.verification, /Inspected owned.txt/);
  assert.match(f.run(['next']).candidates[0].action, /Implement a greeting API/);
});

test('a genuine user blocker stays active with the smallest required input', t => {
  const f = fixture(t);
  const saved = f.state('missing', 'Integrate private greeting service', {
    blockers: 'The service endpoint is absent from code, configuration and project documents. User must supply its URL.',
    next: 'Provide the greeting service URL.',
  });
  const before = fs.readFileSync(f.statePath(), 'utf8');
  const next = f.run(['next']);
  assert.equal(next.resume, 'continue');
  assert.equal(next.discoveryRequired, undefined);
  assert.equal(next.state.blockers, saved.state.blockers);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), before);
  assert.match(nextGuidance(), /smallest user action/i);
  assert.match(nextGuidance(), /Never invent findings/i);
});

test('a host permission or policy denial is handed to the user instead of diagnosed or retried', t => {
  const f = fixture(t);
  const saved = f.state('missing', 'Run bounded native checks', {
    blockers: 'Automatic approval review rejected the input-capable session: blocked by policy.',
    next: 'User runs check 1 on P3 and reports pass/fail and the log path.',
  });
  const next = f.run(['next']);
  assert.equal(next.resume, 'continue');
  assert.equal(next.state.blockers, saved.state.blockers);
  const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  const followUp = fs.readFileSync(new URL('../references/follow-up.md', import.meta.url), 'utf8');
  const plan = fs.readFileSync(new URL('../references/plan.md', import.meta.url), 'utf8');
  assert.match(skill, /name the exact input or user step needed and what to report back/);
  assert.match(skill, /never diagnose, retry or bypass a permission or policy denial, or repeat an unchanged blocker/);
  assert.match(followUp, /resume command whose placeholders list what NEEF needs back/);
  assert.match(nextGuidance(), /Chat authorization does not override a host decision/);
  assert.match(followUp, /reason in one line, keep preconditions in prose/);
  assert.match(followUp, /Never suggest diagnosing or retrying a permission or policy denial/);
  assert.match(nextGuidance(), /policy denial.*do not diagnose it, retry it or seek another route/);
  assert.match(nextGuidance(), /same saved blocker, report it unchanged and stop/);
  assert.match(plan, /denial is never resolved by another `neef next`/);
});

test('repeated next calls without progress require discovery instead of repeating a no-action conclusion', t => {
  const f = fixture(t);
  f.run(['recommendations-write', 'missing'], noRecommendation);
  const before = fs.readFileSync(f.statePath(), 'utf8');
  for (let i = 0; i < 2; i++) {
    const next = f.run(['next']);
    assert.equal(next.discoveryRequired, true);
    assert.equal(next.savedReason, noRecommendation.reason);
    assert.match(next.reason, /execute/i);
  }
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), before);
  assert.match(nextGuidance(), /Never recommend.*neef next.*no meaningful action/i);
  const skill = fs.readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  assert.doesNotMatch(skill, /no action is supported.*retain `Run`/i);
});

test('recommendations enforce concise shape, two-alternative limit, kinds and uniqueness without overwriting state', t => {
  const f = fixture(t);
  const saved = f.state('missing');
  const raw = fs.readFileSync(f.statePath(), 'utf8');
  const invalid = [
    { primary: recommendation(), alternatives: [recommendation('A'), recommendation('B'), recommendation('C')] },
    { primary: recommendation('Unsupported category', 'URGENT'), alternatives: [] },
    { primary: recommendation(), alternatives: [recommendation()] },
    { primary: null, alternatives: [], reason: '' },
    { primary: recommendation('x'.repeat(601)), alternatives: [] },
  ];
  for (const input of invalid) f.run(['recommendations-write', saved.revision], input, /Provide primary|Duplicate recommendations/);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
  fs.writeFileSync(`${f.statePath()}.lock`, 'another writer');
  f.run(['recommendations-write', saved.revision], noRecommendation, /Operation locked/);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), raw);
});

test('missing and legacy recommendation state stays read-only; recovery preserves saved advice', t => {
  const f = fixture(t);
  const missing = f.run(['next']);
  assert.deepEqual(missing.candidates, []);
  assert.equal(fs.existsSync(f.home), false);
  const first = f.state('missing', 'Previous completed task', { progress: 'complete', outcomes: passedOutcomes, recommendations: { primary: recommendation(), alternatives: [] } });
  const second = f.state(first.revision, 'Current active task');
  assert.deepEqual(second.state.recommendations, first.state.recommendations);
  const file = f.statePath();
  fs.writeFileSync(file, 'corrupt recommendation state');
  const corrupt = f.run(['next']);
  assert.match(corrupt.reason, /Invalid state preserved/);
  assert.deepEqual(corrupt.candidates, []);
  const recovered = f.run(['state-recover', corrupt.revision]);
  assert.deepEqual(recovered.state.recommendations, first.state.recommendations);
  const legacy = { ...recovered.state };
  delete legacy.recommendations;
  fs.writeFileSync(file, JSON.stringify(legacy));
  assert.deepEqual(f.run(['next']).candidates, []);
  assert.equal(fs.readFileSync(file, 'utf8'), JSON.stringify(legacy));
});

test('agreed decisions survive same-task progress and completion, without leaking into new tasks', t => {
  const f = fixture(t);
  const setup = f.run(['setup']);
  const first = f.state(setup.revision, 'Shape greeting behavior', {
    decisions: 'Preserve greet() output. Accept an optional name.', next: 'shape standard: 1/5 asked; awaiting choice of empty-name behavior',
  });
  const checkpoint = f.state(first.revision, 'Shape greeting behavior', { verification: 'Rechecked the relevant source' });
  assert.equal(checkpoint.state.next, first.state.next);
  const resumed = f.state(checkpoint.revision, 'Shape greeting behavior', { next: 'Implement agreed greeting behavior' });
  assert.equal(resumed.state.decisions, first.state.decisions);
  assert.deepEqual(resumed.state.context, first.state.context);
  const answered = f.state(resumed.revision, 'Shape greeting behavior', { decisions: `${resumed.state.decisions} Empty names use the default.` });
  const completed = f.state(answered.revision, 'Shape greeting behavior', { progress: 'complete', outcomes: passedOutcomes, recommendations: noRecommendation });
  assert.equal(completed.state.decisions, answered.state.decisions);
  const newTask = f.state(completed.revision, 'Unrelated task');
  assert.equal(newTask.state.decisions, '');
  assert.equal(newTask.state.next, '');
  f.state(completed.revision, 'Shape greeting behavior', { decisions: 'Stale answer' }, /Stale state revision/);
  assert.equal(f.run(['status']).state.task, 'Unrelated task');
});

test('same-task checkpoints retain evidence and blockers across resume and changed HEAD', t => {
  const f = fixture(t);
  const first = f.state('missing', 'Long feature', {
    decisions: 'Keep the existing API: callers depend on it.',
    verification: 'Existing API assertions passed at the first checkpoint.',
    next: 'Finish the independent documentation while awaiting owner output.',
    blockers: 'Owner-device output is still required.',
  });
  const checkpoint = f.state(first.revision, first.state.task);
  for (const field of ['decisions', 'verification', 'next', 'blockers']) {
    assert.equal(checkpoint.state[field], first.state[field]);
  }
  const beforeResume = fs.readFileSync(f.statePath(), 'utf8');
  const resumed = f.run(['next']);
  assert.equal(resumed.resume, 'continue');
  assert.equal(resumed.state.verification, first.state.verification);
  assert.equal(resumed.state.blockers, first.state.blockers);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), beforeResume);
  f.write('owned.txt', 'changed outside the saved task\n');
  f.git('add', '--', 'owned.txt');
  f.git('commit', '-m', 'External change');
  const changed = f.run(['status']);
  assert.ok(changed.discrepancies.some(item => /HEAD changed/.test(item)));
  assert.equal(changed.state.verification, first.state.verification);
  assert.equal(changed.state.blockers, first.state.blockers);
  const updated = f.state(changed.revision, first.state.task, {
    verification: 'Affected API assertions rerun after the external change; passed.',
    blockers: '', next: 'Finish documentation.',
  });
  assert.equal(updated.state.verification, 'Affected API assertions rerun after the external change; passed.');
  assert.equal(updated.state.blockers, '');
  assert.equal(updated.state.decisions, first.state.decisions);
});

test('continuity notes clear explicitly and never leak into another task', t => {
  const f = fixture(t);
  const setup = f.run(['setup']);
  const first = f.state(setup.revision, 'Long feature', {
    decisions: 'Keep the public API.', verification: 'API behavior checked.',
    next: 'Await owner output.', blockers: 'Owner output missing.',
  });
  const completed = f.state(first.revision, first.state.task, { progress: 'complete', outcomes: passedOutcomes, blockers: '', recommendations: noRecommendation });
  assert.equal(completed.state.verification, first.state.verification);
  assert.equal(completed.state.next, '');
  assert.equal(completed.state.blockers, '');
  const cleared = f.state(completed.revision, first.state.task, { decisions: '', verification: '', next: '', blockers: '' });
  for (const field of ['decisions', 'verification', 'next', 'blockers']) assert.equal(cleared.state[field], '');
  const restored = f.state(cleared.revision, first.state.task, {
    decisions: first.state.decisions, verification: first.state.verification,
    next: first.state.next, blockers: first.state.blockers,
  });
  const unrelated = f.state(restored.revision, 'Another feature');
  for (const field of ['decisions', 'verification', 'next', 'blockers']) assert.equal(unrelated.state[field], '');
  assert.deepEqual(unrelated.state.context, first.state.context);
});

test('both agent installations receive self-contained shaping guidance and preserve unmanaged references', t => {
  const f = installation(t);
  f.install(true);
  const guidance = fs.readFileSync(path.join(f.home, 'references/shape.md'), 'utf8');
  const next = fs.readFileSync(path.join(f.home, 'references/next.md'), 'utf8');
  const start = fs.readFileSync(path.join(f.home, 'references/start.md'), 'utf8');
  const completion = fs.readFileSync(path.join(f.home, 'references/completion.md'), 'utf8');
  for (const agent of ['.claude', '.agents']) {
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills/neef/references/shape.md'), 'utf8'), guidance);
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills/neef/references/next.md'), 'utf8'), next);
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills/neef/references/start.md'), 'utf8'), start);
    assert.equal(fs.readFileSync(path.join(f.user, agent, 'skills/neef/references/completion.md'), 'utf8'), completion);
    const skill = fs.readFileSync(path.join(f.user, agent, 'skills/neef/SKILL.md'), 'utf8');
    assert.match(skill, /next.*read `references\/next.md`/);
    assert.match(skill, /reports `greenfield`, read `references\/start.md`/);
    assert.match(skill, /Keep existing stacks, patterns and tooling/);
  }
  assert.match(start, /without asking/);
  assert.match(start, /leave the app running on localhost/);
  assert.match(guidance, /at most two rounds of questions/);
  assert.match(guidance, /two-round cap applies/);
  assert.match(guidance, /batches every independent open decision/);
  assert.match(guidance, /implement.*automatically/);
  assert.match(guidance, /three small project-specific starter ideas, one line each/);
  assert.match(guidance, /read-only, including external state/);
  assert.match(guidance, /Carry supplied flags into the selected idea/);
  assert.match(guidance, /`--discuss` makes shaping discussion-only/);
  assert.match(guidance, /`--deep` in either order/);
  assert.match(guidance, /including `next` or `continue`, until the user explicitly requests implementation/);
  assert.match(guidance, /Every discussion-only task save.*`decisions` and `next`/);
  assert.ok(fs.statSync(path.join(path.dirname(installer), '../SKILL.md')).size < 8100);
  const extra = path.join(f.user, '.agents/skills/neef/references/personal.md');
  fs.writeFileSync(extra, 'Unrelated user guidance');
  f.install(true, /Unmanaged skill reference/);
  assert.equal(fs.readFileSync(extra, 'utf8'), 'Unrelated user guidance');
});

function featurePlan() {
  return { goal: 'Add named greetings and a public entry point', scale: 'large', rationale: 'The public entry point depends on the greeting API.', phases: [
    { id: 'api', task: 'Add optional name support', dependsOn: [], acceptance: ['Default and named greeting assertions pass'], status: 'pending' },
    { id: 'entry', task: 'Expose the named greeting through an entry point', dependsOn: ['api'], acceptance: ['The entry point returns a named greeting'], status: 'pending' },
  ] };
}

test('a full feature plan survives separate phase commits and keeps the feature active until accepted', t => {
  const f = fixture(t);
  const original = f.run(['status']).actual;
  const plan = featurePlan();
  const saved = f.state('missing', 'Named greetings feature', { plan, baseline: null, next: 'Plan saved; continue executes api only.' });
  assert.deepEqual(f.run(['status']).actual, original);
  assert.deepEqual(f.run(['status']).state.plan, plan);
  assert.equal(f.run(['next']).resume, 'continue');
  f.state(saved.revision, saved.state.task, { progress: 'complete', outcomes: passedOutcomes, recommendations: noRecommendation }, /Unfinished plan phases/);
  assert.equal(f.run(['status']).revision, saved.revision);

  const first = f.run(['begin', 'greeting-api']);
  plan.phases[0].status = 'active';
  const working = f.state(f.run(['status']).revision, saved.state.task, { plan, baseline: first.baseline });
  f.write('owned.txt', 'named greeting API\n');
  f.run(['commit', f.prepare(first.baseline).token]);
  plan.phases[0].status = 'complete';
  plan.phases[0].verification = 'Default and named greeting assertions passed.';
  const accepted = f.state(working.revision, saved.state.task, { plan, baseline: null, next: 'Continue entry only.' });
  assert.equal(accepted.state.baseline, null);
  assert.equal(accepted.state.progress, 'active');
  assert.equal(accepted.state.plan.phases[1].status, 'pending');
  assert.equal(f.run(['next']).resume, 'continue');

  const second = f.run(['begin', 'public-entry']);
  assert.notEqual(second.baseline, first.baseline);
  plan.phases[1].status = 'active';
  const resumed = f.state(f.run(['status']).revision, saved.state.task, { plan, baseline: second.baseline });
  f.write('owned.txt', 'named greeting API with public entry point\n');
  f.run(['commit', f.prepare(second.baseline).token]);
  plan.phases[1].status = 'complete';
  plan.phases[1].verification = 'The entry point returned the named greeting.';
  const completed = f.state(resumed.revision, saved.state.task, { plan, baseline: null, progress: 'complete', outcomes: passedOutcomes, recommendations: noRecommendation });
  assert.equal(completed.state.progress, 'complete');
  assert.equal(completed.state.plan.phases[0].verification, accepted.state.plan.phases[0].verification);
  assert.deepEqual(completed.state.plan, plan);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('plans preserve continuity through setup, advice, recovery and same-task writes without leaking to another task', t => {
  const f = fixture(t);
  const plan = featurePlan();
  const saved = f.state('missing', 'Plan feature', { plan });
  f.run(['setup']);
  const current = f.run(['status']);
  const advice = f.run(['recommendations-write', current.revision], { primary: recommendation(), alternatives: [] });
  assert.deepEqual(advice.state.plan, plan);
  const checkpoint = f.state(advice.revision, saved.state.task, { verification: 'Inspected API' });
  assert.deepEqual(checkpoint.state.plan, plan);
  assert.deepEqual(checkpoint.state.context, current.state.context);
  const file = f.statePath();
  fs.writeFileSync(file, '{broken');
  const recovered = f.run(['state-recover', f.run(['status']).revision]);
  assert.deepEqual(recovered.state.plan, plan);
  const newTask = f.state(recovered.revision, 'Different feature');
  assert.equal(newTask.state.plan, undefined);
});

test('a six-phase plan lives in its own file beside a near-full state and survives recovery', t => {
  const f = fixture(t);
  const ids = ['schema', 'store', 'api', 'cli', 'docs', 'release'];
  const plan = { goal: 'Ship a six-phase feature', scale: 'large', rationale: 'Each phase depends on the one before it.',
    phases: ids.map((id, index) => ({ id, task: `Phase ${id}: ${'t'.repeat(500)}`, dependsOn: index ? [ids[index - 1]] : [],
      acceptance: Array(5).fill(`Criterion for ${id}: ${'a'.repeat(300)}`), status: index ? 'pending' : 'active' })) };
  const outcomes = [{ id: 'feature', description: 'd'.repeat(400), required: true, status: 'pending', evidence: 'e'.repeat(800) }];
  f.run(['setup']);
  const advice = f.run(['recommendations-write', f.run(['status']).revision], { primary: recommendation(), alternatives: [] });
  const saved = f.state(advice.revision, 'Six-phase feature', { plan, outcomes, decisions: 'x'.repeat(2500) });
  assert.deepEqual(saved.state.plan, plan);
  assert.ok(saved.state.context && saved.state.recommendations);
  const stored = JSON.parse(fs.readFileSync(f.statePath(), 'utf8'));
  assert.equal(stored.plan, undefined);
  const planPath = f.statePath().replace(/.json$/, '.plan.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(planPath, 'utf8')), plan);
  assert.ok(fs.statSync(planPath).size > 8192);
  // A plan change alone moves the shared revision.
  const changed = structuredClone(plan);
  changed.phases[0].verification = 'Schema checks pass';
  changed.phases[0].status = 'complete';
  changed.phases[1].status = 'active';
  const updated = f.state(saved.revision, saved.state.task, { plan: changed });
  assert.notEqual(updated.revision, saved.revision);
  f.state(saved.revision, saved.state.task, { plan }, /Stale state revision/);
  fs.writeFileSync(planPath, '{}');
  assert.match(f.run(['status']).error, /Plan file missing or does not match state/);
  fs.writeFileSync(f.statePath(), '{broken');
  const recovered = f.run(['state-recover', f.run(['status']).revision]);
  assert.deepEqual(recovered.state.plan, plan);
  assert.deepEqual(recovered.state.outcomes, outcomes);
  const newTask = f.state(recovered.revision, 'Different feature');
  assert.equal(newTask.state.plan, undefined);
  assert.equal(newTask.state.outcomes, undefined);
  assert.equal(f.run(['status']).state.plan, undefined);
});

test('plan phases can name the input only the user can supply', t => {
  const f = fixture(t);
  const plan = featurePlan();
  plan.phases[1].userInput = 'Choose the public entry point name';
  const saved = f.state('missing', 'Plan feature', { plan });
  assert.equal(saved.state.plan.phases[1].userInput, 'Choose the public entry point name');
  assert.equal(saved.state.plan.phases[0].userInput, undefined);
});

test('invalid roadmap dependencies, phase statuses and acceptance evidence cannot overwrite saved work', t => {
  const f = fixture(t);
  const saved = f.state('missing', 'Plan feature', { plan: featurePlan() });
  const before = fs.readFileSync(f.statePath(), 'utf8');
  const mutations = [
    plan => { plan.phases[1].id = 'api'; },
    plan => { plan.phases[1].dependsOn = ['missing']; },
    plan => { plan.phases[0].dependsOn = ['entry']; },
    plan => { plan.phases[0].dependsOn = ['api']; },
    plan => { plan.phases[1].status = 'active'; },
    plan => { plan.phases[1].status = 'complete'; plan.phases[1].verification = 'Claimed complete before dependency'; },
    plan => { plan.phases.forEach(phase => { phase.dependsOn = []; phase.status = 'active'; }); },
    plan => { plan.phases[0].acceptance = []; },
    plan => { plan.phases[0].status = 'complete'; },
    plan => { plan.scale = 'small'; },
    plan => { plan.phases = plan.phases.slice(0, 1); },
    plan => { plan.phases = []; },
    plan => { plan.phases[1].userInput = ''; },
    plan => { plan.phases[1].userInput = 'x'.repeat(301); },
  ];
  for (const mutate of mutations) {
    const plan = featurePlan();
    mutate(plan);
    f.state(saved.revision, saved.state.task, { plan }, /Invalid plan/);
    assert.equal(fs.readFileSync(f.statePath(), 'utf8'), before);
  }
  const oversized = featurePlan();
  oversized.phases[0].acceptance = Array(90).fill('x'.repeat(400));
  f.state(saved.revision, saved.state.task, { plan: oversized }, /Plan must stay under 32 KiB/);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), before);
  const small = featurePlan();
  small.scale = 'small';
  small.phases = small.phases.slice(0, 1);
  const updated = f.state(saved.revision, saved.state.task, { plan: small });
  assert.deepEqual(updated.state.plan, small);
  f.state(saved.revision, saved.state.task, { plan: featurePlan() }, /Stale state revision/);
  assert.deepEqual(f.run(['status']).state.plan, small);
});

test('planning guidance and aliases are installed together with managed backups and untouched task state', t => {
  const f = installation(t);
  f.install(true);
  const saved = f.state('missing', 'Planned feature', { plan: featurePlan() });
  const guidance = fs.readFileSync(path.join(f.home, 'references/plan.md'), 'utf8');
  for (const agent of ['.claude', '.agents']) {
    const root = path.join(f.user, agent, 'skills/neef');
    assert.equal(fs.readFileSync(path.join(root, 'references/plan.md'), 'utf8'), guidance);
    assert.match(fs.readFileSync(path.join(f.user, agent, 'skills/neef-plan/SKILL.md'), 'utf8'), /Follow its `plan` route/);
  }
  const installed = f.install(true);
  assert.equal(installed.verified, true);
  assert.ok(fs.existsSync(path.join(installed.backup, 'install.json.bak')));
  assert.equal(f.run(['status']).revision, saved.revision);
  assert.deepEqual(f.run(['status']).state.plan, saved.state.plan);
  assert.ok(f.run(['help']).commands.includes('plan <feature>'));
});


test('challenge advice preserves active work and becomes advisory next candidates', t => {
  const f = fixture(t);
  const first = f.state('missing', 'Existing task', { decisions: 'Keep the API', next: 'Finish existing work' });
  const before = f.git('status', '--porcelain');
  const head = f.git('rev-parse', 'HEAD');
  const advice = { primary: recommendation(), alternatives: [] };
  const saved = f.run(['recommendations-write', first.revision], advice);
  for (const key of ['task', 'progress', 'decisions', 'next', 'baseline', 'context']) assert.deepEqual(saved.state[key], first.state[key]);
  assert.equal(f.run(['next']).resume, 'continue');
  assert.equal(f.git('status', '--porcelain'), before);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  const complete = f.state(saved.revision, 'Existing task', { progress: 'complete', outcomes: passedOutcomes, recommendations: advice });
  assert.equal(f.run(['next']).candidates[0].action, complete.state.recommendations.primary.action);
});

test('challenge routing stops before development in both installed copies', t => {
  const f = installation(t);
  f.install(true);
  for (const agent of ['.claude', '.agents']) {
    const root = path.join(f.user, agent, 'skills/neef');
    const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
    const guidance = fs.readFileSync(path.join(root, 'references/challenge.md'), 'utf8');
    assert.match(skill, /challenge.*Project files and Git are read-only/);
    assert.match(skill, /then report and stop/);
    assert.match(guidance, /External recommendation state is the only permitted write/);
    assert.match(guidance, /next revalidates advice/);
  }
});

test('review scopes the last task\'s commits from its first save and stays read-only', t => {
  const f = fixture(t);
  f.run(['review'], undefined, /No saved NEEF task; pass a ref/);
  const before = f.git('rev-parse', 'HEAD');
  const shaped = f.state('missing', 'Review me', { decisions: 'Owned file says after' });
  assert.equal(shaped.state.start, before);
  const begin = f.run(['begin', 'review me']);
  f.write('owned.txt', 'after\n');
  const committed = f.run(['commit', f.prepare(begin.baseline, ['owned.txt'], 'Make owned say after').token]);
  const kept = f.state(committed.revision, 'Review me', { progress: 'complete', outcomes: passedOutcomes, recommendations: noRecommendation });
  assert.equal(kept.state.start, before);
  f.write('user.txt', 'later user commit\n');
  f.git('commit', '-qam', 'Later user commit');
  const stateBefore = fs.readFileSync(f.statePath(), 'utf8');
  const scoped = f.run(['review']);
  assert.equal(scoped.range, `${before}..${kept.state.head}`);
  assert.deepEqual(scoped.commits.map(commit => commit.subject), ['Make owned say after']);
  assert.equal(scoped.agreed.decisions, 'Owned file says after');
  assert.match(scoped.diffstat, /owned\.txt/);
  assert.deepEqual(f.run(['review', before]).commits.map(commit => commit.subject), ['Later user commit', 'Make owned say after']);
  f.run(['review', 'no-such-ref'], undefined, /Unknown ref/);
  f.run(['review', '--all'], undefined, /Invalid ref/);
  assert.equal(fs.readFileSync(f.statePath(), 'utf8'), stateBefore);
  assert.equal(f.git('status', '--porcelain'), '');
  assert.equal(f.state(kept.revision, 'Next task').state.start, f.git('rev-parse', 'HEAD'));
});

test('review starts at the task\'s first begin when it commits before its first save', t => {
  const f = fixture(t);
  f.run(['begin', 'before previous save']);
  const previous = f.state(f.run(['status']).revision, 'Previous task', { progress: 'complete', outcomes: passedOutcomes, recommendations: noRecommendation });
  f.write('user.txt', 'unrelated earlier commit\n');
  f.git('commit', '-qam', 'Earlier commit between tasks');
  const before = f.git('rev-parse', 'HEAD');
  const begin = f.run(['begin', 'commit first']);
  f.write('owned.txt', 'committed before saving\n');
  const committed = f.run(['commit', f.prepare(begin.baseline, ['owned.txt'], 'Commit before first save').token]);
  const saved = f.state(committed.revision, 'Commit first');
  assert.notEqual(previous.state.head, before);
  assert.equal(saved.state.start, before);
  assert.deepEqual(f.run(['review']).commits.map(commit => commit.subject), ['Commit before first save']);
  f.write('owned.txt', 'later\n');
  f.git('commit', '-qam', 'Later commit');
  assert.equal(f.state(saved.revision, 'Brand new task').state.start, f.git('rev-parse', 'HEAD'));
});

test('review routing keeps the challenge boundary in both installed copies', t => {
  const f = installation(t);
  f.install(true);
  for (const agent of ['.claude', '.agents']) {
    const root = path.join(f.user, agent, 'skills/neef');
    const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
    const guidance = fs.readFileSync(path.join(root, 'references/review.md'), 'utf8');
    assert.match(skill, /`review \[ref\]`: read `references\/review\.md`; challenge boundary/);
    assert.match(guidance, /External recommendation state is the only permitted write/);
    assert.match(guidance, /project source and Git must stay unchanged/);
    assert.match(guidance, /fresh native delegate/);
  }
});

test('docs lists agent instruction files first, skips history and ignored files, and stays read-only', t => {
  const f = fixture(t);
  for (const name of ['AGENTS.md', 'pkg/CLAUDE.md', '.claude/commands/run.md', 'skills/x/SKILL.md', 'README.md', 'docs/api.md', 'CHANGELOG.md', 'LICENSE.md', 'ignored/notes.md', 'code.js']) f.write(name, 'x\n');
  f.write('.gitignore', 'ignored/\n');
  f.git('add', 'AGENTS.md', 'README.md', '.gitignore');
  f.git('commit', '-qm', 'Add docs');
  const stateDir = path.join(f.home, 'state');
  const statusBefore = f.git('status', '--porcelain');
  const result = f.run(['docs']);
  assert.deepEqual(result.agent, ['.claude/commands/run.md', 'AGENTS.md', 'pkg/CLAUDE.md', 'skills/x/SKILL.md']);
  assert.deepEqual(result.docs, ['README.md', 'docs/api.md']);
  assert.deepEqual(result.skipped, ['CHANGELOG.md', 'LICENSE.md']);
  assert.equal(f.git('status', '--porcelain'), statusBefore);
  assert.equal(fs.existsSync(stateDir) && fs.readdirSync(stateDir).length > 0, false);
});

test('docs routing keeps the challenge boundary in both installed copies', t => {
  const f = installation(t);
  f.install(true);
  for (const agent of ['.claude', '.agents']) {
    const root = path.join(f.user, agent, 'skills/neef');
    const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
    const guidance = fs.readFileSync(path.join(root, 'references/docs.md'), 'utf8');
    assert.match(skill, /`docs`: read `references\/docs\.md`; challenge boundary/);
    assert.match(guidance, /External recommendation state is the only permitted write/);
    assert.match(guidance, /leave project files and Git unchanged/);
  }
});

test('plan routing (alias auto) gates execution on one explicit sign-off in both installed copies', t => {
  const f = installation(t);
  f.install(true);
  for (const agent of ['.claude', '.agents']) {
    const root = path.join(f.user, agent, 'skills/neef');
    const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
    const guidance = fs.readFileSync(path.join(root, 'references/plan.md'), 'utf8');
    assert.match(skill, /`plan <feature>` or `auto <feature>`: read `references\/plan\.md`/);
    assert.equal(fs.existsSync(path.join(root, 'references/auto.md')), false);
    assert.doesNotMatch(skill, /auto.md/);
    assert.match(guidance, /Only an explicit approval signs off/);
    assert.match(guidance, /never executes phases/);
    assert.match(guidance, /no pushing, new branches or destructive actions/);
    assert.match(guidance, /Do not ask the user to confirm phases/);
    assert.match(guidance, /A bare `next` or `continue`.*is not approval/);
    assert.match(guidance, /sign-off are mandatory, however clear or small the request/);
    assert.match(guidance, /each phase's `userInput`/);
    assert.match(guidance, /A saved `auto:` marker/);
  }
  const help = f.run(['help']);
  assert.ok(help.commands.includes('plan <feature>'));
  assert.ok(help.commands.includes('auto <feature> (alias of plan)'));
  assert.ok(!help.aliases.claude.includes('/neef-auto'));
  for (const agent of ['.claude', '.agents']) assert.equal(fs.existsSync(path.join(f.user, agent, 'skills/neef-auto')), false);
});

test('reinstall retires an unedited neef-auto subskill and auto.md', t => {
  const f = installation(t);
  f.install(true);
  const receiptPath = path.join(f.home, 'install.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath));
  const old = [path.join(f.user, '.claude/skills/neef-auto/SKILL.md'), path.join(f.user, '.claude/skills/neef/references/auto.md')];
  for (const target of old) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'Old auto');
    receipt.files[target] = crypto.createHash('sha256').update('Old auto').digest('hex');
  }
  fs.writeFileSync(receiptPath, JSON.stringify(receipt));
  f.install(true);
  for (const target of old) assert.equal(fs.existsSync(target), false);
  assert.equal(fs.existsSync(path.join(f.user, '.claude/skills/neef-auto')), false);
});

test('installer retires only receipt-owned unchanged references and backs them up', t => {
  const f = installation(t);
  f.install(true);
  const receiptPath = path.join(f.home, 'install.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath));
  const target = path.join(f.user, '.agents/skills/neef/references/grill.md');
  fs.writeFileSync(target, 'Old managed reference');
  f.install(true, /Unmanaged or edited file preserved/);
  receipt.files[target] = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt));
  const raw = fs.readFileSync(receiptPath, 'utf8');
  f.install();
  assert.equal(fs.readFileSync(receiptPath, 'utf8'), raw);
  assert.equal(fs.readFileSync(target, 'utf8'), 'Old managed reference');
  const installed = f.install(true);
  assert.equal(fs.existsSync(target), false);
  const restored = JSON.parse(fs.readFileSync(path.join(installed.backup, 'restore.json'))).find(entry => entry.target === target);
  assert.equal(fs.readFileSync(path.join(installed.backup, restored.backup), 'utf8'), 'Old managed reference');
  assert.equal(JSON.parse(fs.readFileSync(receiptPath)).files[target], undefined);
  assert.ok(f.install(true).verified);
});

test('first challenge can save external advice without a task, context or Git changes', t => {
  const f = fixture(t);
  const head = f.git('rev-parse', 'HEAD');
  const branch = f.git('branch', '--show-current');
  const saved = f.run(['recommendations-write', 'missing'], { primary: recommendation(), alternatives: [] });
  assert.equal(saved.state.task, '');
  assert.equal(saved.state.progress, 'complete');
  assert.equal(saved.state.baseline, null);
  assert.equal(saved.state.context, undefined);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('branch', '--show-current'), branch);
  assert.equal(f.git('status', '--porcelain'), '');
  assert.equal(f.run(['next']).candidates.length, 1);
  f.run(['recommendations-write', 'missing'], noRecommendation, /Stale state revision/);
});


test('every mutation rejects project-local storage before creating files or switching branches', t => {
  const f = fixture(t);
  const branch = f.git('branch', '--show-current');
  const head = f.git('rev-parse', 'HEAD');
  const paths = [f.root, path.join(f.root, 'new', 'shared')];
  const alias = path.join(path.dirname(f.root), 'project-alias');
  fs.symlinkSync(f.root, alias, process.platform === 'win32' ? 'junction' : 'dir');
  paths.push(path.join(alias, 'new', 'shared'));
  const mutations = ['setup', 'bootstrap', 'context-write', 'begin', 'prepare', 'commit', 'state-write', 'recommendations-write', 'state-recover', 'prototype-workspace'];
  for (const home of paths) for (const command of mutations) {
    const result = spawnSync(process.execPath, [helper, '--project', f.root, command], {
      encoding: 'utf8', input: '{}', env: f.env(home),
    });
    assert.equal(result.status, 1, `${command}: ${result.stdout}${result.stderr}`);
    assert.match(result.stdout, /storage must be outside the project/, command);
  }
  assert.deepEqual(fs.readdirSync(f.root).sort(), ['.git', 'owned.txt', 'user.txt']);
  assert.equal(f.git('branch', '--show-current'), branch);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('status', '--porcelain'), '');
  for (const command of ['status', 'next', 'help']) {
    const result = spawnSync(process.execPath, [helper, '--project', f.root, command], {
      encoding: 'utf8', env: f.env(path.join(f.root, 'new', 'shared')),
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  assert.equal(fs.existsSync(path.join(f.root, 'new')), false);
});

test('external storage cannot redirect state or baselines into the project', t => {
  const f = fixture(t);
  fs.mkdirSync(f.home);
  for (const name of ['state', 'baselines']) {
    const link = path.join(f.home, name);
    fs.symlinkSync(f.root, link, process.platform === 'win32' ? 'junction' : 'dir');
    f.run(['recommendations-write', 'missing'], noRecommendation, /storage must be outside the project/);
    f.run(['begin', 'blocked'], undefined, /storage must be outside the project/);
    fs.unlinkSync(link);
  }
  assert.deepEqual(fs.readdirSync(f.home), []);
  assert.equal(f.git('branch', '--show-current'), 'main');
  assert.equal(f.git('status', '--porcelain'), '');
});

test('a linked external home outside the project still supports continuity', t => {
  const f = fixture(t);
  const target = path.join(path.dirname(f.root), 'actual-storage');
  fs.mkdirSync(target);
  fs.symlinkSync(target, f.home, process.platform === 'win32' ? 'junction' : 'dir');
  const saved = f.run(['recommendations-write', 'missing'], noRecommendation);
  assert.equal(saved.state.recommendations.primary, null);
  assert.ok(fs.existsSync(path.join(target, 'state')));
  assert.equal(f.git('status', '--porcelain'), '');
});

test('merge with chosen branches lists candidates, fast-forwards or merges, and deletes branches and worktrees', t => {
  const f = fixture(t);
  const tree = name => path.join(path.dirname(f.root), name);
  const commitIn = (dir, file, value) => {
    fs.writeFileSync(path.join(dir, file), value);
    f.git('-C', dir, 'add', '--', file);
    f.git('-C', dir, 'commit', '-m', `Change ${file}`);
  };
  f.git('worktree', 'add', '-b', 'diverged', tree('diverged'));
  commitIn(tree('diverged'), 'diverged.txt', 'diverged\n');
  f.git('branch', 'merged-already');
  commitIn(f.root, 'main.txt', 'main\n');
  f.git('worktree', 'add', '-b', 'linear', tree('linear'));
  commitIn(tree('linear'), 'linear.txt', 'linear\n');
  f.git('worktree', 'add', '-b', 'kept', tree('kept'));
  commitIn(tree('kept'), 'kept.txt', 'kept\n');
  fs.writeFileSync(path.join(tree('kept'), 'scratch.txt'), 'untracked\n');
  const listed = f.run(['merge-candidates']).candidates;
  const row = name => listed.find(item => item.branch === name);
  assert.deepEqual(listed.map(item => item.branch).sort(), ['diverged', 'kept', 'linear']);
  assert.equal(row('diverged').fastForward, false);
  assert.equal(row('linear').fastForward, true);
  assert.equal(row('kept').dirty, true);
  assert.equal(row('linear').taskComplete, null);
  f.run(['merge', 'linear', 'kept'], undefined, /kept has uncommitted changes/);
  assert.equal(f.git('show', 'HEAD:main.txt'), 'main');
  assert.equal(fs.existsSync(path.join(f.root, 'linear.txt')), false);
  const result = f.run(['merge', 'linear', 'diverged']);
  assert.deepEqual(result.merged.map(({ branch, fastForward, deleted }) => [branch, fastForward, deleted]), [['linear', true, true], ['diverged', false, true]]);
  assert.equal(fs.existsSync(tree('linear')), false);
  assert.equal(fs.existsSync(tree('diverged')), false);
  assert.equal(f.git('show', 'HEAD:diverged.txt'), 'diverged');
  assert.equal(f.git('show', 'HEAD:linear.txt'), 'linear');
  assert.equal(f.git('branch', '--list', 'linear', 'diverged'), '');
  fs.rmSync(path.join(tree('kept'), 'scratch.txt'));
  assert.equal(f.run(['merge', 'kept', '--keep']).merged[0].deleted, false);
  assert.match(f.git('branch', '--list', 'kept'), /kept/);
  assert.equal(fs.existsSync(tree('kept')), true);
});

test('merge with chosen branches stops at a conflict with main untouched and refuses bad names', t => {
  const f = fixture(t);
  f.git('branch', 'conflict');
  f.git('branch', 'later');
  f.write('owned.txt', 'main side\n');
  f.git('commit', '-am', 'Main side');
  f.git('checkout', '-q', 'conflict');
  f.write('owned.txt', 'branch side\n');
  f.git('commit', '-am', 'Branch side');
  f.git('checkout', '-q', 'later');
  f.write('later.txt', 'later\n');
  f.git('add', 'later.txt');
  f.git('commit', '-m', 'Later');
  f.git('checkout', '-q', 'main');
  const head = f.git('rev-parse', 'HEAD');
  const result = f.run(['merge', 'conflict', 'later']);
  assert.equal(result.failed.branch, 'conflict');
  assert.match(result.failed.error, /conflicts with main/);
  assert.deepEqual(result.notAttempted, ['later']);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.git('status', '--porcelain'), '');
  f.run(['merge', 'nope', 'later'], undefined, /No such branch: nope/);
  f.run(['merge', 'main', 'later'], undefined, /Invalid branch/);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
});

test('reply layout is defined once in follow-up and referenced by plan, challenge and styles', () => {
  const read = n => fs.readFileSync(new URL(`../references/${n}.md`, import.meta.url), 'utf8');
  const followUp = read('follow-up');
  for (const h of ['N · Narrative', 'E · Edits', 'E · Evaluation', 'F · Follow-up']) assert.ok(followUp.includes(`**${h}:**`), h);
  assert.match(followUp, /Size is a guideline/);
  for (const n of ['plan', 'challenge', 'explanation-styles']) assert.match(read(n), /follow-up\.md` \(Report layout\)/, n);
});

test('approval prompts offer a read-only check with the other agent', () => {
  const read = n => fs.readFileSync(new URL(`../references/${n}.md`, import.meta.url), 'utf8');
  const peer = read('peer-check');
  assert.match(peer, /Claude Code checks with Codex; Codex checks with Claude/);
  assert.match(peer, /Choosing it is not approval/);
  assert.match(peer, /codex exec --sandbox read-only/);
  assert.match(peer, /claude -p --permission-mode plan/);
  for (const n of ['plan', 'prototype']) assert.match(read(n), /`references\/peer-check\.md`/, n);
});

test('installer --dry-run lists each target with its action and writes nothing', t => {
  const f = installation(t);
  const run = (...args) => spawnSync(process.execPath, [installer, ...args], {
    encoding: 'utf8', env: { ...process.env, NEEF_USER_HOME: f.user, NEEF_HOME: f.home },
  });
  const first = run('--dry-run');
  assert.equal(first.status, 0, first.stderr);
  const lines = first.stdout.trim().split('\n');
  assert.equal(lines.length, f.install().files.length);
  assert.ok(lines.every(line => /^create .+/.test(line)), first.stdout);
  assert.equal(fs.existsSync(f.home), false);
  assert.equal(fs.existsSync(f.user), false);
  f.install(true);
  const again = run('--dry-run');
  assert.ok(again.stdout.trim().split('\n').every(line => line.startsWith('unchanged ')), again.stdout);
  const both = run('--dry-run', '--apply');
  assert.equal(both.status, 1);
  assert.match(both.stderr, /Usage: node scripts\/install\.mjs \[--apply \| --dry-run\]/);
});
