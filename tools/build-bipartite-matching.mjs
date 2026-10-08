#!/usr/bin/env node
/** Build the direct-file lab from exact original sources; no runtime dependencies. */
import {readFile,writeFile} from 'node:fs/promises';
import {parseDeck,serializeDeck} from '../src/deck.mjs';
const args=process.argv.slice(2);
if(args.length>1 || args.some(arg=>arg!=='--check')) throw new Error('Usage: node tools/build-bipartite-matching.mjs [--check]');
const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const [template,core,ui,course,guide]=await Promise.all([
  read('courses/bipartite-matching-explorer.template.html'),read('src/bipartite-matching.mjs'),
  read('src/bipartite-matching-ui.mjs'),read('courses/bipartite-matching.json'),read('courses/bipartite-matching.md')
]);
if(serializeDeck(parseDeck(course))!==course) throw new Error('The course must use canonical serializeDeck formatting.');
if(!guide.trim())throw new Error('The worked guide is empty.');
for(const marker of ['<!-- BIPARTITE_DATA -->','<!-- BIPARTITE_SCRIPT -->']){
  if(template.split(marker).length!==2)throw new Error('Expected one template marker '+marker);
}
if(/<\/script/i.test(core+ui)||/^\s*import\s/m.test(core+ui))throw new Error('Standalone modules may not import another file or close their script element.');
const assets={
  course:{name:'bipartite-matching.json',mime:'application/json;charset=utf-8',base64:Buffer.from(course).toString('base64')},
  guide:{name:'bipartite-matching.md',mime:'text/markdown;charset=utf-8',base64:Buffer.from(guide).toString('base64')}
};
const html=template.replace('<!-- BIPARTITE_DATA -->','<script type="application/json" id="matching-assets">'+JSON.stringify(assets)+'</script>')
  .replace('<!-- BIPARTITE_SCRIPT -->','<script type="module">\n'+core+'\n'+ui+'</script>');
const target=new URL('courses/bipartite-matching-explorer.html',root);
if(args.includes('--check')){
  if(await readFile(target,'utf8')!==html)throw new Error('The generated matching explorer is stale. Rebuild it.');
  console.log('PASS: matching explorer retains exact core, UI, template, lesson and guide.');
}else{
  await writeFile(target,html);console.log('Built matching explorer: '+Buffer.byteLength(html)+' bytes.');
}
