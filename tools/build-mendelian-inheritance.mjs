#!/usr/bin/env node
/** Additive deterministic direct-file lab build; the existing learner build is unchanged. */
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDeck } from '../src/deck.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const inheritanceLabPath = join(root, 'courses/mendelian-inheritance-lab.html');

export function buildInheritanceLab() {
  const deckText = readFileSync(join(root, 'courses/mendelian-inheritance.json'), 'utf8');
  parseDeck(deckText);
  const model = readFileSync(join(root, 'src/mendelian-inheritance.mjs'), 'utf8')
    .replace(/^export (?=(?:const|function) )/gm, '');
  const ui = readFileSync(join(root, 'src/mendelian-inheritance-ui.mjs'), 'utf8')
    .replace(/^import \{ INHERITANCE_ASSUMPTIONS, INHERITANCE_PRESETS, parentGenotypes, crossGenotypes \} from '\.\/mendelian-inheritance\.mjs';\n/, '');
  if (/^\s*(?:import|export)\s/m.test(model + '\n' + ui)) throw new Error('Unsupported standalone module declaration.');
  if (/<\/script\b/i.test(model + ui)) throw new Error('Source contains an HTML script closing tag.');
  let html = readFileSync(join(root, 'templates/mendelian-inheritance-lab.html'), 'utf8');
  for (const [marker, value] of [
    ['/* INHERITANCE_DECK_TEXT */', JSON.stringify(deckText).replaceAll('<', '\\u003c')],
    ['/* INHERITANCE_MODEL */', model],
    ['/* INHERITANCE_UI */', ui]
  ]) {
    if (html.split(marker).length !== 2) throw new Error('Expected one marker: ' + marker);
    html = html.replace(marker, () => value);
  }
  return html;
}

// Node canonicalizes import.meta.url when a script is invoked through a symlink.
function invokedDirectly() {
  try { return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
}

if (invokedDirectly()) {
  const html = buildInheritanceLab();
  if (process.argv.includes('--check')) {
    if (readFileSync(inheritanceLabPath, 'utf8') !== html) throw new Error('Rebuild the inheritance lab; its generated file is stale.');
    console.log('Inheritance lab matches its current source and exact course bytes.');
  } else {
    writeFileSync(inheritanceLabPath, html);
    console.log('Built courses/mendelian-inheritance-lab.html (' + Buffer.byteLength(html) + ' bytes).');
  }
}
