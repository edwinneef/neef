import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

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
  const statePath = () => path.join(home, 'state', fs.readdirSync(path.join(home, 'state')).find(name => name.endsWith('.json')));
  return { root, home, git, write, run, prepare, state, statePath };
}

test('clean trivial change commits only the reviewed change and consumes its token', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'Fix typo']);
  assert.match(begin.branch, /^neef\/fix-typo-[a-f0-9]{8}$/);
  f.write('owned.txt', 'after\n');
  const prepared = f.prepare(begin.baseline);
  assert.match(prepared.diff, /\+after/);
  assert.equal(f.git('diff', '--cached'), '');
  const committed = f.run(['commit', prepared.token]);
  assert.equal(committed.changes.length, 0);
  assert.equal(f.git('show', 'HEAD:owned.txt'), 'after');
  f.run(['commit', prepared.token], undefined, /consumed/);
});

test('normal multi-file feature reuses its task branch and records verification', t => {
  const f = fixture(t);
  const begin = f.run(['begin', 'feature']);
  assert.equal(f.run(['begin', 'same feature']).branch, begin.branch);
  const saved = f.state(f.run(['status']).revision, 'Add feature', { verification: 'Focused fixture assertions passed', next: 'Commit implementation' });
  f.write('owned.txt', 'feature\n');
  f.write('new feature.txt', 'new module\n');
  const prepared = f.prepare(begin.baseline, ['owned.txt', 'new feature.txt']);
  f.run(['commit', prepared.token]);
  f.state(saved.revision, 'Add feature', { progress: 'complete', verification: 'Focused fixture assertions passed' });
  const status = f.run(['status']);
  assert.equal(status.state.progress, 'complete');
  assert.equal(status.state.head, status.actual.head);
  assert.deepEqual(status.discrepancies, []);
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

test('invalid or oversized state and missing recovery backup fail without overwriting data', t => {
  const f = fixture(t, false);
  f.state('missing', 'Invalid progress', { progress: 'unknown' }, /Invalid state fields/);
  assert.equal(f.run(['status']).state, null);
  f.state('missing', 'Too large', { decisions: 'x'.repeat(9000) }, /State must stay under/);
  f.state('missing', 'Valid task');
  const file = f.statePath();
  fs.writeFileSync(file, '{broken');
  const corrupt = f.run(['status']);
  assert.equal(corrupt.backup, false);
  f.run(['state-recover', corrupt.revision], undefined, /ENOENT/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken');
});

test('non-Git project supports state without creating project scaffolding', t => {
  const f = fixture(t, false);
  const status = f.run(['status']);
  assert.equal(status.state, null);
  assert.equal(status.actual.head, null);
  assert.equal(f.run(['begin', 'outside git']).baseline, null);
  f.state(f.run(['status']).revision, 'Non-Git task');
  assert.equal(f.run(['status']).state.task, 'Non-Git task');
  assert.deepEqual(fs.readdirSync(f.root), []);
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
  }
  assert.match(shared, /disable-model-invocation: true/);
  assert.match(fs.readFileSync(path.join(f.user, '.agents/skills/neef/agents/openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
  assert.equal(fs.readFileSync(path.join(f.home, 'neef.mjs'), 'utf8'), fs.readFileSync(helper, 'utf8'));
  assert.ok(fs.existsSync(path.join(f.home, 'state')));
  const state = f.state('missing', 'Shared task');
  assert.equal(f.run(['status']).state.task, state.state.task);
  const repeated = f.install(true);
  assert.ok(fs.existsSync(path.join(repeated.backup, 'install.json.bak')));
  assert.equal(f.run(['status']).state.task, 'Shared task');
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

test('setup discovers reusable project facts without running commands or changing a dirty project', t => {
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
  assert.equal(f.git('status', '--porcelain'), before);
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
  assert.deepEqual(setup.context.instructions, []);
  assert.equal(setup.safety.git, false);
  assert.equal(setup.safety.selectiveCommitAvailable, false);
  const result = spawnSync(process.execPath, [helper, '--project', f.root, 'setup'], {
    encoding: 'utf8', env: { ...process.env, NEEF_HOME: path.join(f.root, '..cache') },
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
