import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join,dirname,relative} from 'node:path';
import {spawnSync} from 'node:child_process';

const [sourceRoot,physicsPacket,builderPacket,workRoot]=process.argv.slice(2).map(p=>resolve(p));
assert.ok(sourceRoot&&physicsPacket&&builderPacket&&workRoot,'Supply source root, physics packet, builder packet, and fresh work directory');
await mkdir(workRoot);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const frozenPhysicsManifest=hash(await readFile(join(physicsPacket,'evidence-manifest.json')));
const frozenBuilderManifest=hash(await readFile(join(builderPacket,'manifest.json')));
const physics=join(workRoot,'renamed physics packet'),builder=join(workRoot,'renamed builder packet'),caller=join(workRoot,'foreign caller');
await cp(physicsPacket,physics,{recursive:true,force:false,errorOnExist:true});
await cp(builderPacket,builder,{recursive:true,force:false,errorOnExist:true});
await mkdir(caller);
const startedAt=new Date().toISOString();
const importedReferences=[];
for(const name of ['run-review.mjs','run-supported-review.mjs','diagnostic-review.mjs','physics-oracle.mjs','physics-oracle-supported.mjs','portable-adapter.mjs']){
 const path=join(physics,name),source=await readFile(path,'utf8');
 assert.doesNotMatch(source,/(?:\/home\/jacob|\/workspace\/scratch|\/tmp\/hamon)/,name+' has a fixed host execution path');
 for(const [,specifier] of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)){
  if(specifier.startsWith('.')){await access(resolve(dirname(path),specifier));importedReferences.push({file:name,specifier,resolves:true});}
  else assert.ok(specifier.startsWith('node:'),name+' has an unexpected runtime dependency '+specifier);
 }
 const syntax=spawnSync(process.execPath,['--check',path],{cwd:caller,encoding:'utf8',timeout:5000});
 assert.equal(syntax.status,0,name+': '+syntax.stderr);
}
const supported=JSON.parse(await readFile(join(physics,'supported-controls.json'),'utf8'));
assert.equal(hash(await readFile(join(physics,'physics-oracle-supported.mjs'))),supported.sourceSHA256);
const legacyAdapter=await readFile(join(physics,'candidate-adapter.mjs'),'utf8');
assert.ok(legacyAdapter.includes('../hamon-normal-modes-3e50c5ad22c5/'),'Historical adapter identity changed');
const readme=await readFile(join(physics,'README.md'),'utf8');
assert.ok(readme.includes('portable-adapter.mjs')&&readme.includes('historical'),'Portable replay distinction is missing');
const stubPath=join(workRoot,'authored candidate stub.mjs');
await writeFile(stubPath,"export function makeExperiment(raw){ return {raw,stub:true}; }\nexport function stateAt(experiment,time){ return {experiment,time,stub:true}; }\n",{flag:'wx'});
const probePath=join(workRoot,'adapter-probe.mjs');
await writeFile(probePath,`import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {sample}=await import(pathToFileURL(resolve(process.argv[2])).href);
const result=sample({m:1.25,k:5,c:.3},{x1:.1,x2:-.2,v1:.3,v2:-.4},-.25);
assert.deepEqual(result,{experiment:{raw:{mass:1.25,wallStiffness:5,coupling:.3,x1:.1,x2:-.2,v1:.3,v2:-.4,duration:20},stub:true},time:-.25,stub:true});
console.log(JSON.stringify({pass:true,onlyAuthoredStubExecuted:true,candidatePath:resolve(process.argv[3])}));
`,{flag:'wx'});
const adapterProbe=spawnSync(process.execPath,[relative(caller,probePath),relative(caller,join(physics,'portable-adapter.mjs')),relative(caller,stubPath)],{cwd:caller,encoding:'utf8',timeout:5000});
assert.equal(adapterProbe.status,0,adapterProbe.stderr);
const adapterResult=JSON.parse(adapterProbe.stdout.trim());
const builderSource=await readFile(join(builder,'builder-review.mjs'),'utf8');
assert.doesNotMatch(builderSource,/(?:\/home\/jacob|\/workspace\/scratch|\/tmp\/hamon)/,'Builder replay has a fixed host execution path');
const replay=spawnSync(process.execPath,[relative(caller,join(builder,'builder-review.mjs')),relative(caller,sourceRoot),'relocated-replay'],{cwd:caller,encoding:'utf8',timeout:20000});
assert.equal(replay.status,0,replay.stderr+'\n'+replay.stdout);
const builderResult=JSON.parse(replay.stdout.trim());
assert.equal(builderResult.pass,true);
assert.equal(builderResult.builderSHA256,'cf70e91c7f64c60395cb1c7045d34946caf47a8bb1b7af45fd5c724c64f8ebef');
assert.equal(hash(await readFile(join(physicsPacket,'evidence-manifest.json'))),frozenPhysicsManifest);
assert.equal(hash(await readFile(join(builderPacket,'manifest.json'))),frozenBuilderManifest);
const receipt={startedAt,completedAt:new Date().toISOString(),node:process.version,pass:true,
 sourceRoot,physicsPacket,builderPacket,workRoot,relativeImports:importedReferences,
 relocatedDirectoryNamesContainSpaces:true,foreignWorkingDirectory:true,
 physicsEntryPointsSyntaxChecked:6,physicsPortableAdapterProbe:adapterResult,
 physicsNumericalSuitesExecuted:false,historicalAdapter:'Retained unchanged as execution provenance; documented replay uses portable-adapter.mjs.',
 supportedOracleHashPreserved:true,originalPacketManifestHashesUnchanged:true,
 originalPhysicsManifestSHA256:frozenPhysicsManifest,originalBuilderManifestSHA256:frozenBuilderManifest,
 builderReplay:builderResult};
await writeFile(join(workRoot,'portability-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({completedAt:receipt.completedAt,pass:true,physicsEntryPointsSyntaxChecked:6,physicsNumericalSuitesExecuted:false,relativeImports:importedReferences,builderReplayGroups:builderResult.results.length,builderReplayPass:builderResult.pass,originalPacketManifestHashesUnchanged:true},null,2));
