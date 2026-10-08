import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the direct-file author page is generated from all current author modules', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = spawnSync('python3', ['-B', 'tools/make_author.py', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const page = readFileSync(new URL('../author.html', import.meta.url), 'utf8');
  assert.equal(page.match(/<script>/g)?.length, 1);
  assert.equal(page.match(/<\/script>/g)?.length, 1);
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+stylesheet|type="module"/);
});
