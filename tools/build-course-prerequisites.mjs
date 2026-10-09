import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const prerequisiteModules = [
  'src/deck.mjs',
  'src/course-focus.mjs',
  'src/course-prerequisites.mjs',
  'src/course-prerequisites-ui.mjs'
];

/** Bundle the same local modules; the standalone page has no remote dependencies. */
export async function buildPrerequisitePage(root = new URL('../', import.meta.url)) {
  const read = path => readFile(new URL(path, root), 'utf8');
  const template = await read('prerequisites/index.html');
  const css = await read('prerequisites/styles.css');
  const pieces = [];
  for (const path of prerequisiteModules) {
    const source = await read(path);
    const clean = source.replace(/^import \{[^;\n]+\} from '\.\/[a-z-]+\.mjs';\r?\n/gm, '')
      .replace(/^export (?=(?:const|function|async function) )/gm, '');
    if (/^\s*(?:import|export)\s/m.test(clean)) throw new Error('Unsupported bundle module syntax: ' + path);
    pieces.push('// ' + path + '\n' + clean);
  }
  if (/<\/style/i.test(css) || /<\/script/i.test(pieces.join('\n'))) {
    throw new Error('Bundle source contains a closing raw-text tag.');
  }
  const style = '<link rel="stylesheet" href="styles.css">';
  const script = '<script type="module" src="../src/course-prerequisites-ui.mjs"></script>';
  if (template.split(style).length !== 2 || template.split(script).length !== 2) {
    throw new Error('The prerequisite template must contain one local style and module entry.');
  }
  return template.replace(style, '<style>\n' + css + '</style>')
    .replace(script, '<script type="module">\n' + pieces.join('\n') + '\n</script>');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = new URL('../', import.meta.url);
  const html = await buildPrerequisitePage(root);
  const target = new URL('prerequisites.html', root);
  if (process.argv.length > 3 || (process.argv[2] && process.argv[2] !== '--check')) {
    throw new Error('Usage: node tools/build-course-prerequisites.mjs [--check]');
  }
  if (process.argv[2] === '--check') {
    if (await readFile(target, 'utf8') !== html) throw new Error('prerequisites.html is stale; rebuild it.');
    console.log('Prerequisite standalone page matches its exact modules, template and styles.');
  } else {
    await writeFile(target, html, 'utf8');
    console.log('Wrote prerequisites.html');
  }
}
