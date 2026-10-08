import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

test('the direct-file handout page is generated from the current validator, document and UI sources', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = spawnSync('python3', ['-B', 'tools/make_handout.py', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
  const page = readFileSync(new URL('../handout.html', import.meta.url), 'utf8');
  assert.equal(page.match(/<\/script>/g)?.length, 1);
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet|type="module"/);
  assert.match(page, /href="author\.html"/);
  assert.match(page, /href="demo\.html"/);
  assert.doesNotThrow(() => new Script(page.match(/<script>([\s\S]*?)<\/script>/)[1]));
});
