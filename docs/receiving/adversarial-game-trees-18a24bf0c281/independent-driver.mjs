#!/usr/bin/env node
// Independent receiver. This file is frozen before candidate exposure.
// Execution requires a separately admitted source and exclusive evidence directory.
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ORACLE_SHA = '89bad5c16a7cf1c7ad33b57be3129018d3bcd0d1880e2b027f546f0ee8bde349';
const MAX_CLI_CALLS = 20;
const MAX_API_CALLS = 59;
const CLI_TIMEOUT_MS = 5000;
const MAX_STREAM_BYTES = 65536;
const SOURCE_PATHS = ['src/adversarial-game-trees.mjs', 'tools/adversarial-game-trees.mjs',
  'courses/adversarial-game-trees.json', 'courses/adversarial-game-trees.md'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!['--source-root', '--evidence-root', '--oracle', '--source-manifest'].includes(args[i]) ||
      !args[i + 1] || Object.hasOwn(options, args[i])) throw new Error('Explicit unique receiver paths required');
  options[args[i]] = path.resolve(args[i + 1]);
}
assert.equal(Object.keys(options).length, 4);
const sourceRoot = options['--source-root'];
const evidenceRoot = options['--evidence-root'];
const oracleRaw = fs.readFileSync(options['--oracle']);
assert.equal(sha(oracleRaw), ORACLE_SHA);
const oracle = JSON.parse(oracleRaw);
const sourceManifestRaw = fs.readFileSync(options['--source-manifest']);
const sourceManifest = JSON.parse(sourceManifestRaw);
assert.deepEqual(sourceManifest.files.map(x => x.path).sort(), SOURCE_PATHS.slice().sort());
const sourceBefore = [];
for (const expected of sourceManifest.files) {
  const name = path.join(sourceRoot, expected.path);
  const stat = fs.lstatSync(name);
  assert.ok(stat.isFile() && !stat.isSymbolicLink());
  const bytes = fs.readFileSync(name);
  assert.equal(bytes.length, expected.bytes);
  assert.equal(sha(bytes), expected.sha256);
  sourceBefore.push({ path: expected.path, bytes: bytes.length, sha256: sha(bytes) });
}
assert.ok(!fs.existsSync(evidenceRoot), 'Receiver phase must be new; no replay over old results');
assert.ok(fs.lstatSync(path.dirname(evidenceRoot)).isDirectory());
fs.mkdirSync(evidenceRoot, { mode: 0o700 });
const inputs = path.join(evidenceRoot, 'inputs');
const streams = path.join(evidenceRoot, 'streams');
fs.mkdirSync(inputs, { mode: 0o700 });
fs.mkdirSync(streams, { mode: 0o700 });
function writeNew(file, bytes) {
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
const results = [];
const cliReceipts = [];
let cliCount = 0;
let apiCount = 0;
let getterCalls = 0;
const report = { schema: 'recallweave-minimax-independent-receiving.v1',
  started: new Date().toISOString(), pid: process.pid, node: process.version,
  sourceRoot, evidenceRoot, oracleSha256: sha(oracleRaw), sourceManifestSha256: sha(sourceManifestRaw),
  sourceBefore, results, cliReceipts, limits: {
    maxCliCalls: MAX_CLI_CALLS, maxApiCalls: MAX_API_CALLS, cliTimeoutMs: CLI_TIMEOUT_MS, maxStreamBytes: MAX_STREAM_BYTES,
    semantics: 'Literal expected results; no candidate helper computes an oracle',
    nativeAdmission: 'External controller must enforce phase resource/cgroup/process-group bounds'
  }};
async function check(name, fn, kind = 'api') {
  try { await fn(); results.push({ name, kind, pass: true }); }
  catch (error) { results.push({ name, kind, pass: false, error: String(error?.stack || error) }); }
}
function takeInputSnapshot(root) {
  const seen = new Set(), records = [];
  function visit(value) {
    if ((typeof value !== 'object' && typeof value !== 'function') || value === null || seen.has(value)) return;
    seen.add(value);
    const keys = Reflect.ownKeys(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    let dateValue = null;
    if (Object.getPrototypeOf(value) === Date.prototype) dateValue = Date.prototype.getTime.call(value);
    records.push({ value, prototype: Object.getPrototypeOf(value), keys, descriptors, dateValue });
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (Object.hasOwn(descriptor, 'value')) visit(descriptor.value);
    }
  }
  visit(root);
  return records;
}
function assertInputPreserved(records) {
  for (const record of records) {
    assert.equal(Object.getPrototypeOf(record.value), record.prototype);
    assert.deepEqual(Reflect.ownKeys(record.value), record.keys);
    for (const key of record.keys) {
      const before = record.descriptors[key], after = Object.getOwnPropertyDescriptor(record.value, key);
      assert.deepEqual(Reflect.ownKeys(after).sort(), Reflect.ownKeys(before).sort());
      for (const field of Reflect.ownKeys(before)) assert.equal(after[field], before[field]);
    }
    if (record.dateValue !== null) assert.equal(Date.prototype.getTime.call(record.value), record.dateValue);
  }
}
function deepFreezeData(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (Object.hasOwn(descriptor, 'value')) deepFreezeData(descriptor.value, seen);
  }
  return Object.freeze(value);
}
function plainKeys(value, keys) {
  assert.ok(value && Object.getPrototypeOf(value) === Object.prototype);
  assert.deepEqual(Reflect.ownKeys(value).sort(), keys.slice().sort());
}
function outputShape(output) {
  plainKeys(output, ['profile','rootPlayer','nodeCount','leafCount','maxDepth','minimax','alphaBeta']);
  assert.equal(output.profile, 'recallweave.adversarial-game-trees.v1');
  assert.ok(['MAX','MIN'].includes(output.rootPlayer));
  for (const k of ['nodeCount','leafCount','maxDepth']) assert.ok(Number.isSafeInteger(output[k]));
  assert.ok(output.nodeCount >= 1 && output.nodeCount <= 31);
  assert.ok(output.leafCount >= 1 && output.leafCount <= output.nodeCount);
  assert.ok(output.maxDepth >= 0 && output.maxDepth <= 6);
  const idList = value => {
    assert.ok(Array.isArray(value));
    assert.equal(Object.keys(value).length, value.length);
    for (const id of value) assert.ok(typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(id));
    assert.equal(new Set(value).size, value.length);
  };
  plainKeys(output.minimax, ['value','chosenChild','principalVariation','nodes']);
  plainKeys(output.alphaBeta, ['value','visitedNodeIds','visitedLeafIds','prunedNodeIds',
    'visitedNodeCount','visitedLeafCount','prunedNodeCount','cutoffs']);
  const numericValue = v => assert.ok(Number.isInteger(v) && Number.isFinite(v) && v >= -100 && v <= 100 && !Object.is(v, -0));
  numericValue(output.minimax.value); numericValue(output.alphaBeta.value);
  assert.equal(output.alphaBeta.value, output.minimax.value);
  assert.ok(Array.isArray(output.minimax.nodes));
  assert.ok(Array.isArray(output.alphaBeta.cutoffs));
  idList(output.minimax.principalVariation);
  for (const field of ['visitedNodeIds','visitedLeafIds','prunedNodeIds']) idList(output.alphaBeta[field]);
  for (const node of output.minimax.nodes) {
    plainKeys(node, ['id','role','value','chosenChild']);
    assert.equal(typeof node.id, 'string');
    assert.ok(['MAX','MIN','TERMINAL'].includes(node.role));
    numericValue(node.value);
    assert.ok(node.chosenChild === null || typeof node.chosenChild === 'string');
  }
  for (const cutoff of output.alphaBeta.cutoffs) {
    plainKeys(cutoff, ['nodeId','role','bound','boundValue','alpha','beta','skippedChildIds']);
    numericValue(cutoff.boundValue); numericValue(cutoff.alpha); numericValue(cutoff.beta);
    assert.ok(cutoff.alpha >= cutoff.beta);
    assert.equal(typeof cutoff.nodeId,'string');
    assert.ok(['MAX','MIN'].includes(cutoff.role));
    idList(cutoff.skippedChildIds);
    assert.equal(cutoff.bound, cutoff.role === 'MAX' ? 'lower' : 'upper');
    assert.ok(cutoff.skippedChildIds.length > 0);
  }
  const ab = output.alphaBeta;
  assert.equal(ab.visitedNodeCount, ab.visitedNodeIds.length);
  assert.equal(ab.visitedLeafCount, ab.visitedLeafIds.length);
  assert.equal(ab.prunedNodeCount, ab.prunedNodeIds.length);
  assert.equal(ab.visitedNodeCount + ab.prunedNodeCount, output.nodeCount);
  assert.equal(new Set([...ab.visitedNodeIds,...ab.prunedNodeIds]).size, output.nodeCount);
  assert.equal(output.minimax.nodes.length, output.nodeCount);
  const referenceIds=output.minimax.nodes.map(n=>n.id);
  idList(referenceIds);
  assert.equal(output.minimax.chosenChild,output.minimax.nodes[0].chosenChild);
  assert.equal(output.minimax.principalVariation[0],referenceIds[0]);
  assert.deepEqual(new Set([...ab.visitedNodeIds,...ab.prunedNodeIds]),new Set(referenceIds));
  for(const id of ab.visitedLeafIds) assert.ok(ab.visitedNodeIds.includes(id));
  for(const cutoff of ab.cutoffs) {
    assert.ok(ab.visitedNodeIds.includes(cutoff.nodeId));
    for(const id of cutoff.skippedChildIds) assert.ok(ab.prunedNodeIds.includes(id));
  }
  assert.equal(JSON.parse(JSON.stringify(output)).minimax.value, output.minimax.value);
}
let analyzeGameTree;
try {
  ({ analyzeGameTree } = await import(pathToFileURL(path.join(sourceRoot, SOURCE_PATHS[0])).href));
  assert.equal(typeof analyzeGameTree, 'function');
  function accepted(input, expected) {
    deepFreezeData(input);
    const before = takeInputSnapshot(input);
    assert.ok(++apiCount <= MAX_API_CALLS);
    let output;
    try { output = analyzeGameTree(input); } finally { assertInputPreserved(before); }
    outputShape(output);
    if (expected) assert.deepEqual(output, expected);
    return output;
  }
  function refused(input, extraCheck) {
    const before = takeInputSnapshot(input);
    assert.ok(++apiCount <= MAX_API_CALLS);
    let observed;
    try { analyzeGameTree(input); } catch (error) { observed = error; }
    finally { assertInputPreserved(before); }
    assert.ok(observed instanceof TypeError, 'Unsupported typed input must throw TypeError');
    if (extraCheck) extraCheck();
  }
  await check('literal asymmetric MAX/MIN backup and complete output', () =>
    accepted(structuredClone(oracle.primary.input), oracle.primary.expected));
  await check('literal cutoff upper bound differs from exact reference', () =>
    accepted(structuredClone(oracle.pruning.input), oracle.pruning.expected));
  await check('first-child tie and reversed declared order', () => {
    for (const reverse of [false, true]) {
      const input = structuredClone(oracle.tie.input);
      if (reverse) input.tree.children.reverse();
      const output = accepted(input);
      assert.equal(output.minimax.value, 4);
      assert.equal(output.minimax.chosenChild, reverse ? 'second' : 'first');
      assert.deepEqual(output.minimax.principalVariation, ['Tie', reverse ? 'second' : 'first']);
      assert.deepEqual(output.alphaBeta.visitedNodeIds, ['Tie', ...(reverse ? ['second','first'] : ['first','second'])]);
      assert.deepEqual(output.alphaBeta.cutoffs, []);
    }
  });
  await check('terminal MIN flag preserves MAX utility perspective', () => {
    const output = accepted(structuredClone(oracle.terminalPerspective.input));
    assert.equal(output.minimax.value, -7);
    assert.equal(output.minimax.chosenChild, null);
    assert.deepEqual(output.minimax.principalVariation, ['done']);
    assert.deepEqual(output.minimax.nodes, [{ id:'done', role:'TERMINAL', value:-7, chosenChild:null }]);
    assert.deepEqual([output.nodeCount,output.leafCount,output.maxDepth], [1,1,0]);
    assert.deepEqual(output.alphaBeta.visitedNodeIds, ['done']);
    assert.deepEqual(output.alphaBeta.visitedLeafIds, ['done']);
    assert.deepEqual(output.alphaBeta.prunedNodeIds, []);
    assert.deepEqual(output.alphaBeta.cutoffs, []);
  });
  await check('MIN root makes lower signed choice', () => {
    const input = {rootPlayer:'MIN',tree:{id:'M',children:[{id:'less_bad',utility:-2},{id:'lower',utility:-7}]}};
    const output = accepted(input);
    assert.equal(output.minimax.value,-7); assert.equal(output.minimax.chosenChild,'lower');
    assert.deepEqual(output.minimax.principalVariation,['M','lower']);
    assert.deepEqual(output.minimax.nodes,[
      {id:'M',role:'MIN',value:-7,chosenChild:'lower'},
      {id:'less_bad',role:'TERMINAL',value:-2,chosenChild:null},
      {id:'lower',role:'TERMINAL',value:-7,chosenChild:null}
    ]);
  });
  await check('signed-zero normalization does not mutate input', () => {
    const input={rootPlayer:'MAX',tree:{id:'zero',utility:-0}};
    const output=accepted(input);
    assert.ok(Object.is(input.tree.utility,-0));
    assert.ok(Object.is(output.minimax.value,0));
    assert.ok(Object.is(output.alphaBeta.value,0));
    assert.ok(Object.is(output.minimax.nodes[0].value,0));
  });
  await check('inclusive six-edge depth and utility lower bound', () => {
    let tree={id:'d6',utility:-100};
    for(let d=5;d>=0;d--) tree={id:'d'+d,children:[tree]};
    const output=accepted({rootPlayer:'MAX',tree});
    assert.deepEqual([output.nodeCount,output.leafCount,output.maxDepth],[7,1,6]);
    assert.equal(output.minimax.value,-100);
    assert.deepEqual(output.minimax.principalVariation,['d0','d1','d2','d3','d4','d5','d6']);
    assert.deepEqual(output.alphaBeta.prunedNodeIds,[]);
  });
  await check('inclusive 31 nodes and four-child admission', () => {
    let next=0;
    function fixture(depth) { const id='N'+next++; return depth===4 ? {id,utility:1} :
      {id,children:[fixture(depth+1),fixture(depth+1)]}; }
    const output=accepted({rootPlayer:'MAX',tree:fixture(0)});
    assert.deepEqual([output.nodeCount,output.leafCount,output.maxDepth],[31,16,4]);
    assert.equal(output.minimax.value,1);
    assert.ok(output.minimax.nodes.every(n=>n.value===1));
    assert.deepEqual(output.minimax.principalVariation,['N0','N1','N2','N3','N4']);
    const four=accepted({rootPlayer:'MIN',tree:{id:'F',children:[
      {id:'a',utility:100},{id:'b',utility:99},{id:'c',utility:98},{id:'d',utility:97}]}});
    assert.equal(four.minimax.value,97); assert.equal(four.minimax.chosenChild,'d');
  });
  const valid = () => ({rootPlayer:'MAX',tree:{id:'x',utility:0}});
  const bad = [
    ['null top',()=>null], ['array top',()=>[]], ['string top',()=>'MAX'], ['number top',()=>7],
    ['missing rootPlayer',()=>({tree:{id:'x',utility:0}})],
    ['missing tree',()=>({rootPlayer:'MAX'})],
    ['extra top field',()=>({...valid(),extra:true})],
    ['lowercase player',()=>({...valid(),rootPlayer:'max'})],
    ['non-string player',()=>({...valid(),rootPlayer:1})],
    ['null node',()=>({...valid(),tree:null})],
    ['array node',()=>({...valid(),tree:[]})],
    ['id missing',()=>({...valid(),tree:{utility:0}})],
    ['id numeric',()=>({...valid(),tree:{id:1,utility:0}})],
    ['id empty',()=>({...valid(),tree:{id:'',utility:0}})],
    ['id begins digit',()=>({...valid(),tree:{id:'1bad',utility:0}})],
    ['id too long',()=>({...valid(),tree:{id:'A'.repeat(33),utility:0}})],
    ['id non-ASCII',()=>({...valid(),tree:{id:'É',utility:0}})],
    ['node lacks children and utility',()=>({...valid(),tree:{id:'x'}})],
    ['mixed node',()=>({...valid(),tree:{id:'x',utility:0,children:[{id:'a',utility:1}]}})],
    ['extra leaf field',()=>({...valid(),tree:{id:'x',utility:0,note:'ignored?'}})],
    ['extra internal field',()=>({...valid(),tree:{id:'x',children:[{id:'a',utility:0}],utilityHint:0}})],
    ['nonenumerable extra top field',()=>{const input=valid();Object.defineProperty(input,'hidden',{value:1});return input;}],
    ['children nonarray',()=>({...valid(),tree:{id:'x',children:{id:'a',utility:0}}})],
    ['children empty',()=>({...valid(),tree:{id:'x',children:[]}})],
    ['five children',()=>({...valid(),tree:{id:'x',children:[0,1,2,3,4].map(i=>({id:'a'+i,utility:i}))}})],
    ['children sparse',()=>{const children=new Array(2);children[1]={id:'a',utility:0};return {...valid(),tree:{id:'x',children}};}],
    ['duplicate IDs',()=>({...valid(),tree:{id:'x',children:[{id:'a',utility:0},{id:'a',utility:1}]}})],
    ['shared node identity',()=>{const node={id:'shared',utility:2};return {...valid(),tree:{id:'x',children:[node,node]}};}],
    ['cycle',()=>{const tree={id:'x',children:[]};tree.children.push(tree);return {...valid(),tree};}],
    ['depth seven',()=>{let tree={id:'d7',utility:0};for(let d=6;d>=0;d--)tree={id:'d'+d,children:[tree]};return {...valid(),tree};}],
    ['32 nodes',()=>{let next=0;function fixture(depth){const id='N'+next++;return depth===4?{id,utility:1}:{id,children:[fixture(depth+1),fixture(depth+1)]};}
      return {...valid(),tree:{id:'extra',children:[fixture(0)]}};}],
    ['null prototype top',()=>Object.assign(Object.create(null),valid())],
    ['null prototype node',()=>({...valid(),tree:Object.assign(Object.create(null),{id:'x',utility:0})})],
    ['class instance node',()=>{class Node {constructor(){this.id='x';this.utility=0;}}return {...valid(),tree:new Node()};}],
    ['date node',()=>({...valid(),tree:new Date(0)})],
    ['symbol extra field',()=>{const input=valid();input[Symbol('extra')]=1;return input;}],
    ['utility accessor',()=>{const tree={id:'x'};Object.defineProperty(tree,'utility',{enumerable:true,get(){getterCalls++;return 0;}});return {...valid(),tree};}]
  ];
  for(const utility of ['1',true,null,undefined,1.5,NaN,Infinity,-Infinity,-101,101,1n]) {
    bad.push(['utility type/range '+typeof utility+' '+String(utility),()=>({...valid(),tree:{id:'x',utility}})]);
  }
  for(const [name,make] of bad) await check('refuse '+name,()=>refused(make(),()=>assert.equal(getterCalls,0)));
  await check('exact 32-character ID accepted',()=> {
    const output=accepted({rootPlayer:'MAX',tree:{id:'A'.repeat(32),utility:100}});
    assert.equal(output.minimax.value,100);
  });
  await check('oracle rejects the four predeclared wrong analyses',()=> {
    const greedy=structuredClone(oracle.primary.expected);greedy.minimax.value=11;greedy.minimax.chosenChild='Cliff';
    assert.throws(()=>assert.deepEqual(greedy,oracle.primary.expected));
    const allMin=structuredClone(oracle.primary.expected);allMin.minimax.value=-4;allMin.minimax.nodes[6].value=-2;
    assert.throws(()=>assert.deepEqual(allMin,oracle.primary.expected));
    const exactCutoff=structuredClone(oracle.pruning.expected);exactCutoff.alphaBeta.cutoffs[0].bound='exact';
    assert.throws(()=>assert.deepEqual(exactCutoff,oracle.pruning.expected));
    const conflated=structuredClone(oracle.pruning.expected);conflated.alphaBeta.visitedLeafCount=6;
    assert.throws(()=>assert.deepEqual(conflated,oracle.pruning.expected));
  },'reviewer-sensitivity');

  const primaryRaw=Buffer.from(JSON.stringify(oracle.primary.input)+'\n');
  const pruningRaw=Buffer.from(JSON.stringify(oracle.pruning.input)+'\n');
  const terminalRaw=Buffer.from(JSON.stringify(oracle.terminalPerspective.input));
  const primaryPath=path.join(inputs,'primary.json'),pruningPath=path.join(inputs,'pruning.json');
  const exactLimitPath=path.join(inputs,'exact-limit.json'),overLimitPath=path.join(inputs,'over-limit.json');
  writeNew(primaryPath,primaryRaw);writeNew(pruningPath,pruningRaw);
  const exactLimit=Buffer.concat([terminalRaw,Buffer.alloc(32768-terminalRaw.length,0x20)]);
  writeNew(exactLimitPath,exactLimit);writeNew(overLimitPath,Buffer.concat([exactLimit,Buffer.from(' ')]));
  const linkedPath=path.join(inputs,'linked.json');fs.symlinkSync('primary.json',linkedPath);
  const directoryPath=path.join(inputs,'not-a-file');fs.mkdirSync(directoryPath,{mode:0o700});
  const protectedFiles=[primaryPath,pruningPath,exactLimitPath,overLimitPath,options['--oracle'],options['--source-manifest']];
  function protectedSnapshot() { return protectedFiles.map(file=>({file,sha256:sha(fs.readFileSync(file))})); }
  function runCli(name,argv,input,expectation) {
    assert.ok(++cliCount<=MAX_CLI_CALLS);
    const before=protectedSnapshot();
    const result=spawnSync(process.execPath,[path.join(sourceRoot,SOURCE_PATHS[1]),...argv],{
      input:input===undefined?Buffer.alloc(0):input,cwd:inputs,env:process.env,
      timeout:CLI_TIMEOUT_MS,killSignal:'SIGKILL',maxBuffer:MAX_STREAM_BYTES,encoding:null
    });
    const prefix=String(cliCount).padStart(2,'0');
    const out=result.stdout||Buffer.alloc(0),err=result.stderr||Buffer.alloc(0);
    writeNew(path.join(streams,prefix+'.stdout'),out);writeNew(path.join(streams,prefix+'.stderr'),err);
    const receipt={name,argv,inputBytes:input?.length??0,inputSha256:input===undefined?null:sha(input),
      pid:result.pid,status:result.status,signal:result.signal,error:result.error?String(result.error):null,
      stdout:{bytes:out.length,sha256:sha(out)},stderr:{bytes:err.length,sha256:sha(err)}};
    cliReceipts.push(receipt);
    assert.deepEqual(protectedSnapshot(),before);
    assert.equal(result.signal,null);assert.equal(result.error,undefined);
    const stdout=new TextDecoder('utf-8',{fatal:true}).decode(out),stderr=new TextDecoder('utf-8',{fatal:true}).decode(err);
    if(expectation.refusal){
      assert.equal(result.status,2);assert.equal(out.length,0);
      assert.ok(stderr.startsWith('Game tree refused: '));
      assert.equal(stderr.replace(/\r?\n$/, '').split(/\r?\n/).length,1);
      return;
    }
    assert.equal(result.status,0);assert.equal(err.length,0);
    if(expectation.json){
      assert.ok(stdout.endsWith('\n'));
      const parsed=JSON.parse(stdout);outputShape(parsed);
      if(expectation.expected)assert.deepEqual(parsed,expectation.expected);
      if(expectation.terminal){
        assert.equal(parsed.rootPlayer,'MIN');assert.equal(parsed.minimax.value,-7);
        assert.deepEqual(parsed.minimax.principalVariation,['done']);
      }
    }else if(expectation.help){
      assert.match(stdout,/Usage:/);assert.ok(stdout.includes('--tree')&&stdout.includes('--stdin')&&stdout.includes('--json'));
    }else{
      for(const label of ['Exact minimax value: 3','Chosen root move: Harbor',
        'Principal variation (first optimal child on ties): ','Reference: all ',
        'Alpha-beta: value 3','Cutoff at Cliff (MIN): upper bound -4']) assert.ok(stdout.includes(label),label);
      assert.match(stdout,/timing/i);
    }
  }
  const cliCases=[
    ['file literal primary',[ '--tree',primaryPath,'--json'],undefined,{json:true,expected:oracle.primary.expected}],
    ['stdin literal pruning',['--stdin','--json'],pruningRaw,{json:true,expected:oracle.pruning.expected}],
    ['human pruning explanation',['--tree',pruningPath],undefined,{}],
    ['help',['--help'],undefined,{help:true}],
    ['exact 32768-byte file',['--tree',exactLimitPath,'--json'],undefined,{json:true,terminal:true}],
    ['32769-byte file',['--tree',overLimitPath],undefined,{refusal:true}],
    ['32769-byte stdin',['--stdin'],Buffer.concat([exactLimit,Buffer.from(' ')]),{refusal:true}],
    ['malformed UTF-8',['--stdin'],Buffer.from([0xc3,0x28]),{refusal:true}],
    ['BOM is not stripped',['--stdin'],Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),terminalRaw]),{refusal:true}],
    ['empty input',['--stdin'],Buffer.alloc(0),{refusal:true}],
    ['JSON null',['--stdin'],Buffer.from('null'),{refusal:true}],
    ['symlink input',['--tree',linkedPath],undefined,{refusal:true}],
    ['directory input',['--tree',directoryPath],undefined,{refusal:true}],
    ['missing file',['--tree',path.join(inputs,'absent.json')],undefined,{refusal:true}],
    ['missing selector',[],undefined,{refusal:true}],
    ['both selectors',['--tree',primaryPath,'--stdin'],primaryRaw,{refusal:true}],
    ['duplicate flag',['--tree',primaryPath,'--json','--json'],undefined,{refusal:true}],
    ['unknown flag',['--tree',primaryPath,'--unknown'],undefined,{refusal:true}],
    ['missing path',['--tree'],undefined,{refusal:true}],
    ['ordinary JSON duplicate-member behavior',['--stdin','--json'],
      Buffer.from('{"rootPlayer":"MAX","rootPlayer":"MIN","tree":{"id":"done","utility":-7}}\n'),{json:true,terminal:true}]
  ];
  assert.equal(cliCases.length,MAX_CLI_CALLS);
  for(const [name,argv,input,expectation] of cliCases)
    await check('CLI '+name,()=>runCli(name,argv,input,expectation),'cli');
  assert.equal(fs.readlinkSync(linkedPath),'primary.json');
  assert.deepEqual(fs.readdirSync(inputs).sort(),
    ['primary.json','pruning.json','exact-limit.json','over-limit.json','linked.json','not-a-file'].sort(),
    'CLI must not create output files in its owned working directory');
} catch(error) {
  results.push({name:'receiver bootstrap or unexpected campaign failure',kind:'harness',pass:false,error:String(error?.stack||error)});
} finally {
  report.sourceAfter=SOURCE_PATHS.map(p=>{const bytes=fs.readFileSync(path.join(sourceRoot,p));return{path:p,bytes:bytes.length,sha256:sha(bytes)};});
  report.sourcePreserved=JSON.stringify(report.sourceAfter.slice().sort((a,b)=>a.path.localeCompare(b.path)))===
    JSON.stringify(sourceBefore.slice().sort((a,b)=>a.path.localeCompare(b.path)));
  if(!report.sourcePreserved)results.push({name:'source preserved',kind:'custody',pass:false});
  report.apiCalls=apiCount;report.cliCalls=cliCount;
  report.finished=new Date().toISOString();
  report.groups={total:results.length,passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length};
  const raw=Buffer.from(JSON.stringify(report,null,2)+'\n');
  writeNew(path.join(evidenceRoot,'report.json'),raw);
  process.stdout.write(JSON.stringify({report:path.join(evidenceRoot,'report.json'),bytes:raw.length,sha256:sha(raw),
    ...report.groups,apiCalls:apiCount,cliCalls:cliCount,sourcePreserved:report.sourcePreserved})+'\n');
  process.exitCode=report.groups.failed?1:0;
}
