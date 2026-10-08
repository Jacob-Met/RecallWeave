import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('the standalone Lesson focus file matches its actual modular sources', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  execFileSync('python3', ['tools/make_focus.py', '--check'], { cwd: root, encoding: 'utf8' });
  const html = readFileSync(new URL('../focus.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=|<link\b[^>]*rel="stylesheet"/i);
  assert.match(html, /id="download-focus"/);
  assert.match(html, /href="demo\.html"/);
  assert.match(html, /href="author\.html"/);
});
