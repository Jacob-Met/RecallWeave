import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUnitExplorer, unitExplorerPath } from '../tools/build-unit-conversion-explorer.mjs';

test('the checked-in offline explorer contains the current source and exact admitted lesson', () => {
  assert.equal(
    readFileSync(unitExplorerPath, 'utf8'),
    buildUnitExplorer(),
    'Run node tools/build-unit-conversion-explorer.mjs after changing the explorer or its lesson.',
  );
});
