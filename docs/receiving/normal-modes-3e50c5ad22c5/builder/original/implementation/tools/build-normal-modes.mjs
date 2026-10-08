import {readFile, open, rename, unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseDeck} from '../src/deck.mjs';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT_PATH = 'courses/normal-modes-lab.html';
const INPUTS = [
  'courses/normal-modes-lab.template.html',
  'courses/normal-modes-core.mjs',
  'courses/normal-modes-ui.mjs',
  'courses/normal-modes.json',
  'courses/normal-modes.md',
];

function inlineCode(source) {
  const result = source.replace(/^export (?=(?:const|function|class)\b)/gm, '');
  if (/^\s*(?:import|export)\b/m.test(result))
    throw new Error('Standalone inputs must not retain module dependencies.');
  return result.replace(/<\/script/gi, '<\\/script');
}

function inlineString(text) {
  return JSON.stringify(text).replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export async function renderLab(root = REPOSITORY_ROOT) {
  const [template, core, ui, deck, guide] =
    await Promise.all(INPUTS.map(path => readFile(resolve(root, path), 'utf8')));
  const parsed = parseDeck(deck);
  if (parsed.items.length !== 16 || parsed.concepts.length !== 4)
    throw new Error('This original course requires its reviewed sixteen questions and four concepts.');
  const replacements = {
    '{{NORMAL_MODES_CORE}}': inlineCode(core),
    '{{NORMAL_MODES_UI}}': inlineCode(ui),
    '{{NORMAL_MODES_DECK_JSON}}': inlineString(deck),
    '{{NORMAL_MODES_GUIDE_JSON}}': inlineString(guide),
  };
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    if (output.split(token).length !== 2)
      throw new Error('Template must contain exactly one ' + token);
    output = output.replace(token, () => value);
  }
  if (/\{\{NORMAL_MODES_/.test(output)) throw new Error('Unresolved standalone token.');
  return output;
}

export async function buildLab({root = REPOSITORY_ROOT, check = false} = {}) {
  const content = await renderLab(root);
  const output = resolve(root, OUTPUT_PATH);
  if (check) {
    if (await readFile(output, 'utf8') !== content)
      throw new Error('Standalone lab differs from its current source. Run node tools/build-normal-modes.mjs.');
    return {path: output, bytes: Buffer.byteLength(content), checked: true};
  }
  const temporary = output + '.tmp-' + process.pid + '-' + randomUUID();
  let acquired = false;
  try {
    const handle = await open(temporary, 'wx');
    acquired = true;
    try { await handle.writeFile(content, 'utf8'); }
    finally { await handle.close(); }
    await rename(temporary, output);
    acquired = false;
  } finally {
    if (acquired) await unlink(temporary).catch(error => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  return {path: output, bytes: Buffer.byteLength(content), checked: false};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('Usage: node tools/build-normal-modes.mjs [--check]');
    process.exitCode = 2;
  } else {
    try { console.log(JSON.stringify(await buildLab({check: args.includes('--check')}))); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
