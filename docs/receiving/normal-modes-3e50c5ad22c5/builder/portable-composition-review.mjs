import assert from 'node:assert/strict';
import {readFile,writeFile,lstat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const [sourceArg,receiptArg,publicationListArg]=process.argv.slice(2);
assert.ok(sourceArg&&receiptArg,'Supply source root and fresh receipt path; optional explicit publication path-list JSON.');
const root=resolve(sourceArg),receiptPath=resolve(receiptArg);
const packet=dirname(fileURLToPath(import.meta.url));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const treeBytes=await readFile(join(packet,'composition-base-tree.json'));
const baseTree=JSON.parse(treeBytes);
assert.equal(baseTree.commit,'567425f209cdf8e8cf9767faac9bfd3003af3e65');
assert.equal(baseTree.sha,'a877e5d5eb1953aa2389ea75ef7cad96da321c1a');
assert.equal(baseTree.truncated,false);
const base=new Map(baseTree.tree.map(item=>[item.path,item]));
const pins={'README.md':'4cfb9bacd5ce3dfe4851a81615307cc694943f0d','demo.html':'42f991e0ceab6144e24b667f59905777d9659246','src/deck.mjs':'f0f8a4b234489c2388f427633f548d56c6ed4c03'};
for(const [path,pin] of Object.entries(pins))assert.equal(base.get(path)?.sha,pin,path+' base pin');
const baseReadme=await readFile(join(packet,'composition-readme-base.md'));
assert.equal(gitBlob(baseReadme),pins['README.md']);
const currentReadme=await readFile(join(root,'README.md'));
const text=currentReadme.toString('utf8');
const start='## Explore coupled motion\n',end='## Explore coherent waves\n';
assert.equal(text.split(start).length,2,'Exactly one coupled motion section');
assert.equal(text.split(end).length,2,'Exactly one coherent waves anchor');
const startAt=text.indexOf(start),endAt=text.indexOf(end);
assert.ok(startAt>=0&&endAt>startAt,'Single additive README range');
const section=text.slice(startAt,endAt);
assert.deepEqual(Buffer.from(text.slice(0,startAt)+text.slice(endAt)),baseReadme,'Removing only the new section must restore every byte of current main README');
assert.ok(text.includes("## Explore Euclid's algorithm")&&text.includes('## Mathematical induction: a base, a bridge, every integer'));
for(const target of ['courses/normal-modes-lab.html','courses/normal-modes.json','courses/normal-modes.md'])assert.ok(section.includes(target));
const dependencies=[];
for(const path of ['demo.html','src/deck.mjs']){
 const bytes=await readFile(join(root,path));
 assert.equal(gitBlob(bytes),pins[path],path+' must remain the pinned current-main dependency');
 dependencies.push({path,bytes:bytes.length,gitBlob:gitBlob(bytes),sha256:sha256(bytes),publishAsEdit:false});
}
const productPaths=['README.md','courses/normal-modes-core.mjs','courses/normal-modes-ui.mjs','courses/normal-modes-lab.template.html','courses/normal-modes-lab.html','courses/normal-modes.json','courses/normal-modes.md','tools/build-normal-modes.mjs','tests/normal-modes.test.mjs'];
const products=[];
for(const path of productPaths){
 assert.equal((await lstat(join(root,path))).isFile(),true,path+' must be a regular file');
 const bytes=await readFile(join(root,path));
 if(path!=='README.md')assert.equal(base.has(path),false,path+' collides with pinned main');
 products.push({path,bytes:bytes.length,gitBlob:gitBlob(bytes),sha256:sha256(bytes),status:path==='README.md'?'modified':'added'});
}
const receiptPrefix='docs/receiving/normal-modes-3e50c5ad22c5/';
const receiptPaths=[];
async function visit(path){for(const entry of await readdir(join(root,path),{withFileTypes:true})){const name=path+'/'+entry.name;if(entry.isDirectory())await visit(name);else{assert.ok(entry.isFile(),'Receipt must be a regular file: '+name);receiptPaths.push(name);}}}
await visit(receiptPrefix.slice(0,-1));
for(const path of receiptPaths)assert.equal(base.has(path),false,path+' receipt collides with pinned main');
const prospectivePaths=[...productPaths,...receiptPaths].sort();
let explicitPublication=null;
if(publicationListArg){
 const raw=JSON.parse(await readFile(resolve(publicationListArg),'utf8'));
 const paths=(Array.isArray(raw)?raw:raw.paths).map(item=>typeof item==='string'?item:item.path);
 assert.equal(new Set(paths).size,paths.length,'Duplicate publication paths');
 for(const path of paths)assert.ok(productPaths.includes(path)||path.startsWith(receiptPrefix),'Unexpected publication path '+path);
 for(const path of productPaths)assert.ok(paths.includes(path),'Missing product publication path '+path);
 explicitPublication={path:resolve(publicationListArg),count:paths.length,allProductPathsIncluded:true,preparationHelpersAndReceivingDependenciesExcluded:true,paths:[...paths].sort()};
}
for(const item of products)assert.equal(sha256(await readFile(join(root,item.path))),item.sha256,item.path+' changed during review');
assert.equal(sha256(await readFile(join(packet,'composition-base-tree.json'))),sha256(treeBytes),'Base tree changed during review');
const receipt={checkedAt:new Date().toISOString(),node:process.version,pass:true,baseCommit:baseTree.commit,baseTree:baseTree.sha,baseTreeEntries:baseTree.tree.length,baseTreeSHA256:sha256(treeBytes),readme:{allCurrentMainBytesPreserved:true,euclidAndInductionAdditionsPreserved:true,addedSection:section,baseGitBlob:gitBlob(baseReadme),candidateGitBlob:gitBlob(currentReadme)},receivingDependencies:dependencies,products,prospectiveReceiptCount:receiptPaths.length,prospectivePaths,explicitPublication,scope:'Read-only native source composition at pinned main. Prospective list does not itself claim Git publication; an explicit list is checked only when supplied. Browser and numerical physics behavior are outside this check.'};
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({checkedAt:receipt.checkedAt,pass:true,readmeAllCurrentBytesPreserved:true,productPaths:products.length,receiptPaths:receiptPaths.length,explicitPublicationChecked:Boolean(explicitPublication)},null,2));
