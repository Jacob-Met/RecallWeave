import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDeck} from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const uiImport = "import {RC_LIMITS, RC_EXAMPLES, RC_HORIZON_TAU, parseRcNumber, calculateRc, buildRcTrace, rcObservation} from './rc-transients.mjs';";

function replaceOnce(text, marker, value) {
  if (text.split(marker).length !== 2) throw new Error('Expected exactly one template marker: ' + marker);
  return text.replace(marker, () => value);
}

/** Bundle only this lab's two local modules and original text payloads. */
export function buildRcLab() {
  const courseText = readFileSync(join(root, 'courses/rc-transients.json'), 'utf8');
  const guideText = readFileSync(join(root, 'courses/rc-transients.md'), 'utf8');
  parseDeck(courseText);
  if (!guideText.trim()) throw new Error('The RC study guide is empty.');
  const model = readFileSync(join(root, 'src/rc-transients.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const uiText = readFileSync(join(root, 'src/rc-transients-ui.mjs'), 'utf8');
  if (uiText.split(uiImport).length !== 2) throw new Error('The RC UI must use its one known local import.');
  const ui = uiText.replace(uiImport, '');
  const source = model + '\n' + ui;
  if (/^\s*(?:import|export)\s/m.test(source)) throw new Error('Unexpected module syntax in the standalone RC bundle.');
  if (/<\/script\b/i.test(source)) throw new Error('Script-closing text is forbidden in the RC source bundle.');
  let html = readFileSync(join(root, 'templates/rc-transients-lab.html'), 'utf8');
  html = replaceOnce(html, '__RC_COURSE_JSON__', JSON.stringify(courseText).replaceAll('<', '\\u003c'));
  html = replaceOnce(html, '__RC_GUIDE_JSON__', JSON.stringify(guideText).replaceAll('<', '\\u003c'));
  html = replaceOnce(html, '__RC_BUNDLE__', "(() => {\n'use strict';\n" + source + '\n})();');
  if (/__RC_[A-Z_]+__/.test(html)) throw new Error('An RC template marker remains unfilled.');
  return html;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Usage: node tools/build-rc-transients.mjs [--check]');
    const html = buildRcLab();
    const output = join(root, 'courses/rc-transients-lab.html');
    if (args[0] === '--check') {
      if (readFileSync(output, 'utf8') !== html) throw new Error('RC lab is stale. Run node tools/build-rc-transients.mjs.');
      process.stdout.write('RC standalone lab matches its source files.\n');
    } else {
      writeFileSync(output, html, 'utf8');
      process.stdout.write('Built courses/rc-transients-lab.html.\n');
    }
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 1;
  }
}
