import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const reviewRoot = dirname(fileURLToPath(import.meta.url));
const repo = process.argv[2] ?? '/workspace/scratch/6e5752b49b6f/agents/github_integration/recallweave-author';
const head = process.argv[3];
assert.match(head ?? '', /^[a-f0-9]{40}$/, 'An exact frozen commit is required.');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 16 * 1024 * 1024 });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const at = path => git('show', `${head}:${path}`);
const main = JSON.parse(await readFile(join(reviewRoot, 'independent-current-main.json'), 'utf8'));
const entries = git('ls-tree', '-r', '-z', head).toString('utf8').split('\0').filter(Boolean).map(line => {
  const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
  assert.ok(match, 'Readable Git tree entry');
  return { mode: match[1], type: match[2], sha: match[3], path: match[4] };
});
const current = new Map(entries.map(entry => [entry.path, entry]));
const report = { status: 'running', repo, head, tree: git('rev-parse', `${head}^{tree}`).toString().trim(),
  independentlyFetchedMain: main.commit, runtime: process.version, gates: [], programFiles: {}, findings: [] };
const pass = (name, details) => report.gates.push({ name, status: 'passed', ...details });

git('merge-base', '--is-ancestor', main.commit, head);
assert.equal(main.truncated, false);
for (const expected of main.leaves.filter(entry => entry.path !== 'README.md')) {
  const actual = current.get(expected.path);
  assert.ok(actual, `Missing current-main path ${expected.path}`);
  assert.equal(actual.mode, expected.mode, `${expected.path}: mode`);
  assert.equal(actual.sha, expected.sha, `${expected.path}: blob`);
}
pass('All existing non-README main leaves and modes are preserved', { leaves: main.leaves.length - 1 });
const mainPaths = new Set(main.leaves.map(entry => entry.path));
const additions = entries.filter(entry => !mainPaths.has(entry.path)).map(entry => entry.path);
const allowed = new Set(['author.html', 'author/author.css', 'author/index.html', 'src/deck.mjs',
  'src/deck-author.mjs', 'src/deck-author-ui.mjs', 'src/deck-author-loader.mjs',
  'tests/author-bundle.test.mjs', 'tests/deck-author.test.mjs', 'tests/deck-author-loader.test.mjs', 'tools/make_author.py']);
assert.deepEqual(additions.filter(path => !allowed.has(path) && !path.startsWith('docs/qualification/deck-author-6e5752b49b6f/')), []);
pass('Only the agreed authoring files and qualification evidence were added', { productAdditions: additions.filter(path => allowed.has(path)), evidenceAdditions: additions.filter(path => !allowed.has(path)).length });
const proofOnly = git('diff', '--name-only', '6c6ceac0062b9c5fcc53bee8c15184d3df08897f', '8b82395c1730380e8c2cd08933f22d787df66ae6').toString().trim().split('\n');
assert.ok(proofOnly.every(path => path.startsWith('docs/qualification/deck-author-6e5752b49b6f/')));
pass('The first offered successor only added evidence', { evidenceOnlySuccessor: '8b82395c1730380e8c2cd08933f22d787df66ae6', paths: proofOnly.length });

const archive = join(reviewRoot, '../recallweave-author-loader-receiving.tar.gz');
assert.equal(sha256(await readFile(archive)), '0b4aca067f262e3a455f83714d42031c424bfdbea5f74cc2f590c84c8cc8e5e6');
const original = path => execFileSync('tar', ['-xOf', archive, path]);
const oldStatus = 'Deck download started. Keep the JSON file to reopen it here or use it in the learning app.';
const newStatus = 'Deck download started. Keep the JSON file to share or reopen it here.';
function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length, 2, `Exactly one original phrase: ${before}`);
  return text.replace(before, after);
}
for (const path of ['src/deck.mjs', 'src/deck-author.mjs', 'src/deck-author-loader.mjs', 'author/author.css', 'tools/make_author.py', 'src/deck-author-ui.mjs']) {
  const accepted = original(path);
  const bytes = at(path);
  if (path === 'src/deck-author-ui.mjs') assert.equal(bytes.toString('utf8'), replaceOnce(accepted.toString('utf8'), oldStatus, newStatus));
  else assert.deepEqual(bytes, accepted, `${path}: accepted browser source is unchanged`);
  assert.deepEqual(await readFile(join(repo, path)), bytes, `${path}: worktree matches the frozen commit`);
  report.programFiles[path] = { sha256: sha256(bytes), comparedWithAccepted: sha256(accepted), change: path === 'src/deck-author-ui.mjs' ? 'Only the success-status sentence' : 'None' };
}
pass('Accepted editor runtime, loader, validator, styles and builder are retained', { exactFiles: 5, statusOnlyFiles: 1 });
const prose = [
  ['Write questions, connect concepts, and give each answer an explanation. Save a deck you can open in RecallWeave.', 'Write questions, connect concepts, and give each answer an explanation. Save a reusable local deck.'],
  ["Save the JSON file, then choose it in RecallWeave's deck importer to start a lesson. Opening the learning app keeps this editor open.", 'Download the JSON file to save or share your lesson. Reopen it here whenever you want to edit it. Opening the learning demo keeps this editor open.']
];
for (const path of ['author/index.html', 'author.html']) {
  let expected = original(path).toString('utf8');
  for (const [before, after] of prose) expected = replaceOnce(expected, before, after);
  if (path === 'author.html') expected = replaceOnce(expected, oldStatus, newStatus);
  assert.equal(at(path).toString('utf8'), expected, `${path}: only reviewed prose changed`);
  assert.deepEqual(await readFile(join(repo, path)), at(path));
  report.programFiles[path] = { sha256: sha256(at(path)), change: path === 'author.html' ? 'Two instruction sentences and bundled success status' : 'Two instruction sentences' };
}
pass('Static and generated user instructions only contain the intended accurate replacements');

const baselineReadme = git('show', `${main.commit}:README.md`).toString('utf8');
const readme = at('README.md').toString('utf8');
const course = /^## Build a course deck\n[\s\S]*?(?=^## Demo deck provenance\n)/m;
assert.match(readme, course);
const testsOpening = /^## Tests\n[\s\S]*?(?=^Review tests also)/m;
assert.match(readme, testsOpening);
assert.match(readme.match(testsOpening)[0], /Node 20\+/);
assert.match(readme.match(testsOpening)[0], /Python 3/);
assert.match(readme.match(testsOpening)[0], /standalone|parity|generated/i);
assert.equal(readme.replace(course, '').replace(testsOpening, baselineReadme.match(testsOpening)[0]), baselineReadme,
  'Existing README sections remain unchanged apart from the needed test-prerequisite correction');
const courseText = readme.match(course)[0];
assert.match(courseText, /author\.html/);
assert.match(courseText, /Open a deck to edit/);
assert.match(courseText, /Replace draft/);
assert.match(courseText, /before refreshing or closing/);
assert.match(courseText, /separate local lesson importer is tracked in \[issue 7\]/);
assert.equal(current.has('src/deck-picker.mjs'), false, 'The current learner importer is still absent and must not be represented as available.');
pass('README accurately describes save/reopen and current importer availability, with corrected prerequisites', { testInstructions: readme.match(testsOpening)[0].trim() });

const parity = execFileSync('python3', ['-B', 'tools/make_author.py', '--check'], { cwd: repo, encoding: 'utf8' });
const page = at('author.html').toString('utf8');
assert.equal((page.match(/<script>/g) ?? []).length, 1);
assert.equal((page.match(/<\/script>/g) ?? []).length, 1);
assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet|type="module"/);
pass('Standalone author HTML is generated exactly from the frozen modules and has no external script or stylesheet dependency', { output: parity.trim() });

let absentFile;
try { runInNewContext('new File(["{}"], "deck.json")', {}); }
catch (error) { absentFile = `${error.name}: ${error.message}`; }
assert.equal(absentFile, 'ReferenceError: File is not defined');
report.findings.push({ status: 'resolved', kind: 'Test prerequisite documentation', originalClaim: 'Node 18+ suffices for the complete default suite', source: 'tests/deck-author-loader.test.mjs constructs the global File; tests/author-bundle.test.mjs invokes python3', officialGlobalFileHistory: 'https://nodejs.org/api/globals.html#class-file (Added in v20.0.0)', observation: absentFile, diagnosticScope: `A missing-global capability control executed on ${process.version}; this is not a Node 18 execution claim.`, resolution: 'Node 20+ and Python 3 are now explicit; runtime and tests unchanged.' });

const included = at('docs/qualification/deck-author-6e5752b49b6f/loader-receiving.tar.gz');
assert.equal(sha256(included), sha256(await readFile(archive)));
pass('Original loader receiving archive remains byte-identical');
report.status = 'accepted';
report.repeatedBrowserSuites = 0;
report.finalInstructions = { staticPage: 'Save/share JSON and reopen it in the author editor', successStatus: newStatus, importer: 'Tracked separately; not claimed as present in current main' };
await writeFile(join(reviewRoot, 'final-composition-receipt.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, head, tree: report.tree, gates: report.gates.length, mainLeavesPreserved: main.leaves.length - 1, sourceFiles: Object.keys(report.programFiles).length, repeatedBrowserSuites: 0 }));
