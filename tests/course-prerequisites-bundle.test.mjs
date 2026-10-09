import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { buildPrerequisitePage } from '../tools/build-course-prerequisites.mjs';
import { inspectCoursePrerequisites } from '../src/course-prerequisites.mjs';

test('standalone output is exact, self-contained and preserves the real core behavior', async () => {
  const built = await buildPrerequisitePage();
  assert.equal(await readFile(new URL('../prerequisites.html', import.meta.url), 'utf8'), built);
  assert.equal((built.match(/<script\b/g) || []).length, 1);
  assert.doesNotMatch(built, /<(?:script|link)\b[^>]+(?:src|href)=/i);
  const script = built.match(/<script type="module">([\s\S]*)<\/script>/)[1];
  const context = vm.createContext({ TextEncoder, TextDecoder });
  vm.runInContext(script, context);
  const fixture = JSON.stringify({
    title: 'A <literal> course', attribution: 'Original author', license: 'CC0',
    concepts: ['Root', 'Branch'],
    items: [
      { id: 'q0', concept: 'Root', prerequisites: [], prompt: 'First?',
        options: ['A','B'], answer: 1, explanation: 'Reason', transfer: 'Try' },
      { id: 'q1', concept: 'Branch', prerequisites: ['Root'], prompt: 'Second?',
        options: ['A','B'], answer: 0, explanation: 'Reason', transfer: 'Try' }
    ]
  });
  context.fixture = fixture;
  const bundled = vm.runInContext('JSON.stringify(inspectCoursePrerequisites(fixture, 1))', context);
  assert.deepEqual(JSON.parse(bundled), inspectCoursePrerequisites(fixture, 1));
  context.fixture = fixture.replace('"Root","Branch"', '"Root","Unknown"');
  assert.throws(() => vm.runInContext('inspectCoursePrerequisites(fixture)', context), /concept/);
});
