import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Script} from 'node:vm';
const directory=dirname(fileURLToPath(import.meta.url)),root=resolve(directory,'../../../..');
const expected={
 'src/momentum-collisions-ui.mjs':'134aa6593a8d2e499887da50fd4f6d4eb04cd835938eed2d59bd9edf8d8d930d',
 'templates/momentum-collisions-explorer.html':'ab6eb598a9658af2affcd8dd943e83e59482f1367471292c57f7de05efb1dd17',
 'courses/momentum-collisions-explorer.html':'7621706db71f3cb871d26c35eeae22b8965d54a92204f768629bfd522454628c',
 'courses/momentum-collisions.md':'6ec1befff684d0a44f677d5c28df4dd38ffc14582d5e2c4155854fb1d8f985d0',
 'courses/momentum-collisions.json':'883141a7b5990633fe9ea27bce0065362f24a6c2966a9a5d6f9afefd844b8003',
 'tools/build-momentum-collisions.mjs':'c76f924d21e88794d11ae72b9103539677815ef7b9614b4c1f4b423b342392fe',
 'src/momentum-collisions.mjs':'ba6e652a68b9018bb6ed59d671c43b04dfc4c617c0dc893c9f59a7197b8948cd'
};
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(resolve(root,p),'utf8');
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
function checkPins(){for(const[p,s]of Object.entries(expected))assert.equal(sha(readFileSync(resolve(root,p))),s,p);}
checkPins();assert.equal(git('diff','--name-only','HEAD'),'','Tracked baseline source was modified.');
const parity=execFileSync(process.execPath,['tools/build-momentum-collisions.mjs','--check'],{cwd:root,encoding:'utf8'}).trim();
const html=read('courses/momentum-collisions-explorer.html'),template=read('templates/momentum-collisions-explorer.html'),ui=read('src/momentum-collisions-ui.mjs');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
assert.equal(scripts.length,1);assert.match(scripts[0][1],/type="module"/);
const script=scripts[0][2];assert(!/^\s*(?:import|export)\b/m.test(script));
new Script(script,{filename:'reviewed-generated-script.js'}); // Compile only; never execute the DOM application.
function embedded(name){const m=script.match(new RegExp('^const '+name+' = (.*);$','m'));assert(m);return JSON.parse(m[1]);}
assert.equal(embedded('COURSE_TEXT'),read('courses/momentum-collisions.json'));
assert.equal(embedded('GUIDE_TEXT'),read('courses/momentum-collisions.md'));
const {validateDeck}=await import(new URL('../../../../src/deck.mjs',import.meta.url));
const course=JSON.parse(embedded('COURSE_TEXT'));validateDeck(course);assert.equal(course.items.length,12);
const ids=[...template.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
const called=[...ui.matchAll(/\bbyId\('([^']+)'\)/g)].map(x=>x[1]);
for(const id of [...called,'mc-mA','mc-mB','mc-uA','mc-uB'])assert(ids.includes(id),'Missing DOM binding '+id);
for(const id of ['mc-mA','mc-mB','mc-uA','mc-uB'])assert(template.includes('for="'+id+'"'));
assert(!/<(?:script|link|img|iframe|audio|video|source)\b[^>]*\b(?:src|href)\s*=/i.test(template));
assert(!/@import\b|\burl\s*\(/i.test(template));
assert(!/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/.test(ui));
for(const p of ['src/deck.mjs','src/app.mjs','demo.html'])assert.equal(git('hash-object',p),git('rev-parse','HEAD:'+p));
checkPins();assert.equal(git('diff','--name-only','HEAD'),'');
const receipt={at:new Date().toISOString(),reviewer:'chatgpt-0378a7b6b7c2/mac_product',head:git('rev-parse','HEAD'),sourcePins:expected,node:process.version,accepted:true,
 checks:{parity,embeddedCourseExact:true,embeddedGuideExact:true,questionCount:course.items.length,inlineScriptCompiles:true,noResidualModuleImports:true,templateIdsUnique:true,allStaticUiBindingsPresent:true,allInputsLabeled:true,noTemplateResourceDependencies:true,noUiHtmlParsingSinks:true,learnerDependenciesUnchanged:true,trackedSourceUnchanged:true,productionHashesStable:true},
 boundary:'Independent source/build/data-binding review and read-only structural checks. Root owns arithmetic and blind questions. This is not a second browser, visual, actual download or learner run. README registration and current-main composition remain later author steps.',
 setup:'Initial writer refused because this unique review directory did not exist; plain node was absent from the RDC PowerShell PATH. No checker or production mutation occurred. The directory was then created and the existing runtime was selected explicitly.'
};
writeFileSync(resolve(directory,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({passed:true,head:receipt.head,node:process.version,sourceFiles:Object.keys(expected).length,questionCount:12,output:resolve(directory,'receipt.json')}));
