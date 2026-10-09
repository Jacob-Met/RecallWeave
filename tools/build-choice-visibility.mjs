import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const orig=read('src/deck.mjs');
if(orig.includes('import ') || orig.includes('</script'))throw new Error('Native importer cannot be safely embedded as-is.');
const parser=orig.replace(/\bexport\s+/gu,'');
const origAudit=read('src/choice-visibility.mjs');
if(origAudit.includes('import ') || origAudit.includes('</script'))throw new Error('Audit module cannot be safely embedded as-is.');
const audit=origAudit.replace(/\bexport\s+/gu,'');
const html=read('templates/choice-visibility.html');
for(const mark of ['/*__NATIVE_DECK__*/','/*__CHOICE_AUDIT__*/'])if(html.split(mark).length!==2)throw new Error('Missing or duplicate template marker '+mark);
const output=html.replace('/*__NATIVE_DECK__*/',parser).replace('/*__CHOICE_AUDIT__*/',audit);
const out=path.join(root,'courses/choice-visibility-review.html');
if(process.argv.includes('--check')){
 if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==output)throw new Error('Stale standalone output. Rebuild before receiving.');
 console.log('Stand-alone artifact reproduces exactly.');
}else{
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,output);console.log('Built',out,Buffer.byteLength(output));
}
