import {readFile, writeFile, rename, unlink} from 'node:fs/promises';
import {parseDeck} from '../src/deck.mjs';
const root = new URL('../', import.meta.url);
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--check')) throw new Error('Usage: node tools/build-edit-distance.mjs [--check]');
const read = path => readFile(new URL(path, root), 'utf8');
const [model,ui,template,lesson,guide]=await Promise.all([
  read('src/edit-distance.mjs'),read('src/edit-distance-ui.mjs'),
  read('courses/edit-distance-explorer.template.html'),read('courses/edit-distance.json'),read('courses/edit-distance.md')
]);
parseDeck(lesson);
const scriptLiteral=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const combine=source=>source.split('\n').filter(line=>!line.startsWith('import ')).map(line=>line.startsWith('export ')?line.slice(7):line).join('\n');
const moduleText=combine(model)+'\n'+combine(ui);
if (moduleText.toLowerCase().includes('</'+'script')) throw new Error('Unexpected script terminator in module source.');
if (template.split('__EDIT_DISTANCE_SCRIPT__').length!==2) throw new Error('Expected exactly one standalone script slot.');
const script='(()=>{\n'+moduleText+'\nmountEditDistance(document,'+scriptLiteral(lesson)+','+scriptLiteral(guide)+');\n})();';
const output=template.replace('__EDIT_DISTANCE_SCRIPT__',()=>script);
const target=new URL('courses/edit-distance-explorer.html',root);
if(args[0]==='--check'){
  if(await readFile(target,'utf8')!==output)throw new Error('The standalone edit-distance explorer is stale.');
  console.log('Edit-distance standalone parity passed.');
}else{
  const staged=new URL(target.href+'.tmp-'+process.pid);
  try{await writeFile(staged,output,{flag:'wx'});await rename(staged,target);}
  finally{await unlink(staged).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  console.log('Built '+Buffer.byteLength(output)+' bytes of offline edit-distance explorer.');
}
