// Independent static receiving for RecallWeave170. No product code executes.
// Input: exact Git tree API responses, plus decoded text from the pinned blobs.
// This checks source conservation and reconstructs unchanged-builder output in memory.
export function reviewRecall170({baseTree, candidateTree, files}) {
  const assert = (x, message) => { if (!x) throw new Error(message); };
  assert(!baseTree.truncated && !candidateTree.truncated, 'complete Git trees');
  const b = new Map(baseTree.tree.filter(x => x.type !== 'tree').map(x => [x.path, x]));
  const c = new Map(candidateTree.tree.filter(x => x.type !== 'tree').map(x => [x.path, x]));
  const allowed = ['README.md', 'handout.html', 'handout/handout.css', 'handout/index.html',
    'src/course-handout-ui.mjs', 'src/course-handout.mjs', 'tests/course-handout-selection.test.mjs'];
  const delta = [...new Set([...b.keys(), ...c.keys()])].filter(path =>
    !b.has(path) || !c.has(path) || b.get(path).sha !== c.get(path).sha || b.get(path).mode !== c.get(path).mode);
  assert(JSON.stringify(delta.sort()) === JSON.stringify(allowed.sort()), 'exact seven-path fence');
  assert([...b.keys()].every(path => c.has(path)), 'no removed parent paths');
  assert(delta.filter(path => b.has(path)).length === 6, 'six modifications, one addition');
  for (const path of ['src/deck.mjs', 'tools/make_handout.py']) {
    assert(b.get(path).sha === c.get(path).sha && b.get(path).mode === c.get(path).mode,
      'shared validator and builder unchanged');
  }
  const get = path => files[path];
  const available = new Set();
  const parts = [];
  for (const name of ['deck.mjs', 'course-handout.mjs', 'course-handout-ui.mjs']) {
    let text = get('src/' + name);
    const exports = [...text.matchAll(/^export\s+(?:const|let|function|class)\s+(\w+)/gm)].map(x => x[1]);
    text = text.replace(/^import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];[ \t]*$/gm, (_, names, path) => {
      assert(available.has(path), 'all bundle imports resolve');
      const fields = names.split(',').map(x => x.trim()).filter(Boolean).map(x => x.replace(/\s+as\s+/, ': '));
      return "const { " + fields.join(', ') + " } = __recallweaveHandoutModules['" + path + "'];";
    }).replace(/^export\s+(?=(?:const|let|function|class)\b)/gm, '');
    assert(!/^\s*(?:import|export)\s/m.test(text), 'no unsupported module syntax');
    parts.push("__recallweaveHandoutModules['./" + name + "'] = (() => {\n" + text +
      "\nreturn { " + exports.join(', ') + " };\n})();\n");
    available.add('./' + name);
  }
  const script = ("(() => {\n'use strict';\nconst __recallweaveHandoutModules = Object.create(null);\n" +
    parts.join('\n') + "\n})();").replace(/<\/script/gi, '<\\/script');
  const expected = get('handout/index.html')
    .replace('<link rel="stylesheet" href="./handout.css">', '<style>\n' + get('handout/handout.css') + '\n</style>')
    .replace('<script type="module" src="../src/course-handout-ui.mjs"></script>', '<script>\n' + script + '\n</script>')
    .replaceAll('href="../author.html"', 'href="author.html"')
    .replaceAll('href="../demo.html"', 'href="demo.html"');
  assert(expected === get('handout.html'), 'exact modular/standalone parity');
  const tail = text => text.slice(text.indexOf('export const HANDOUT_CSS'));
  const normalized = tail(get('src/course-handout.mjs'))
    .replace("export function createHandoutDocument(input, kind = 'worksheet', selectedQuestionIds) {",
      "export function createHandoutDocument(input, kind = 'worksheet') {")
    .replace('  const handout = createHandout(input, kind, selectedQuestionIds);',
      '  const handout = createHandout(input, kind);');
  assert(normalized === tail(get('baseline:src/course-handout.mjs')),
    'unchanged CSS/render/filename/serialization body except selection forwarding');
  const lifecycle = text => text.slice(text.indexOf("byId('choose-handout-file')"), text.indexOf("byId('use-handout-deck')"));
  assert(lifecycle(get('src/course-handout-ui.mjs')) === lifecycle(get('baseline:src/course-handout-ui.mjs')),
    'existing file admission/cancel lifecycle unchanged');
  assert(get('src/deck.mjs').includes("if (coveredConcepts.size !== concepts.length) throw new Error('Every concept must have at least one question.');"),
    'all-concept coverage makes full-selection concept filtering equivalent');
  return {status: 'pass', base_leaves: b.size, candidate_leaves: c.size,
    inherited_leaves_and_modes_exact: b.size - 6, changes: delta.map(path => ({
      path, before: b.get(path)?.sha ?? null, after: c.get(path).sha, mode: c.get(path).mode
    })), standalone_parity: true, serializer_renderer_css_preserved: true,
    existing_file_admission_preserved: true, validator_and_builder_preserved: true,
    scope: 'static source/byte admission only; no browser or product runtime execution'};
}
