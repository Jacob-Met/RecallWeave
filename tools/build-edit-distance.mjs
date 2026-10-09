import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(root, file), 'utf8');
export async function buildExplorer() {
  const [core, ui, template, course, guide] = await Promise.all([
    read('src/edit-distance.mjs'), read('src/edit-distance-ui.mjs'),
    read('courses/edit-distance-explorer.template.html'), read('courses/edit-distance.json'), read('courses/edit-distance.md')
  ]);
  const resources = JSON.stringify({ course, guide }).replaceAll('<', '\\u003c');
  const script = core.replace(/^export /gm, '') + '\n' + ui.replace(/^import [^\n]+\n/, '');
  if (script.toLowerCase().includes('</script')) throw new Error('Inline source contains a script closing tag.');
  return template.replace('__RESOURCES__', () => resources).replace('__SCRIPT__', () => script);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const built = await buildExplorer();
  const output = path.join(root, 'courses/edit-distance-explorer.html');
  if (process.argv.includes('--check')) {
    if (await readFile(output, 'utf8') !== built) throw new Error('Explorer is stale; run the builder.');
    console.log('Standalone explorer matches its sources.');
  } else {
    await writeFile(output, built);
    console.log('Built courses/edit-distance-explorer.html (' + Buffer.byteLength(built) + ' bytes).');
  }
}
