import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildConditionalLab, conditionalLabPath } from '../tools/build-conditional-probability-lab.mjs';

test('the committed standalone lab includes exactly its current source and unchanged course', () => {
  assert.equal(readFileSync(conditionalLabPath, 'utf8'), buildConditionalLab());
});
