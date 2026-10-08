import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('prefix-coding standalone contains the exact current model, interface and lesson', () => {
  execFileSync(process.execPath, [
    fileURLToPath(new URL('../tools/build-prefix-coding.mjs', import.meta.url)), '--check',
  ], { encoding: 'utf8' });
});
