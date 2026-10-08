import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const git = args => execFileSync('git', ['-C', root, ...args], {encoding: 'utf8'}).trim();
const head = git(['rev-parse', 'HEAD']);
assert.equal(head, '8b82cf5bb95fc7faa5e835e2979df703e6e91a7b');
const tree = git(['rev-parse', 'HEAD^{tree}']);
assert.equal(tree, '47063a7cd409d456fcd108ee3557c7451053ef4c');
const leaves = git(['ls-tree', '-r', '--name-only', 'HEAD']).split('\n');
const report = {kind: 'missing-capability baseline', head, tree, node: process.version,
  scope: 'Existing validator control plus committed-path presence; no browser or learner-session run.',
  checks: [], source: {}};
const check = (name, body) => {
  try { body(); report.checks.push({name, pass: true}); }
  catch (error) { report.checks.push({name, pass: false, error: error.message}); }
};
for (const path of ['src/deck.mjs', 'src/knowledge.mjs', 'src/review.mjs', 'src/app.mjs', 'demo.html', 'data/deck.json']) {
  const bytes = readFileSync(join(root, path));
  report.source[path] = {blob: git(['rev-parse', `HEAD:${path}`]), sha256: createHash('sha256').update(bytes).digest('hex')};
}
const {validateDeck} = await import(pathToFileURL(join(root, 'src/deck.mjs')));
check('The unchanged native validator admits the shipped bundled lesson', () => {
  const deck = validateDeck(JSON.parse(readFileSync(join(root, 'data/deck.json'), 'utf8')));
  assert.ok(deck.items.length > 0);
});
for (const path of ['courses/boolean-logic.json', 'src/boolean-logic.mjs', 'courses/boolean-logic-explorer.html']) {
  check(`The Boolean learning capability provides ${path}`, () => {
    assert.ok(leaves.includes(path) && existsSync(join(root, path)), `${path} is absent from the committed source`);
  });
}
report.passed = report.checks.filter(check => check.pass).length;
report.failed = report.checks.length - report.passed;
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({head, tree, passed: report.passed, failed: report.failed, output}));
process.exitCode = report.failed ? 1 : 0;
