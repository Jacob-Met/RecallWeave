import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const PLAN={"blocks":[{"index":1,"start":1,"end":1,"lowbit":1},{"index":2,"start":1,"end":2,"lowbit":2},{"index":3,"start":3,"end":3,"lowbit":1},{"index":4,"start":1,"end":4,"lowbit":4},{"index":5,"start":5,"end":5,"lowbit":1},{"index":6,"start":5,"end":6,"lowbit":2},{"index":7,"start":7,"end":7,"lowbit":1},{"index":8,"start":1,"end":8,"lowbit":8},{"index":9,"start":9,"end":9,"lowbit":1},{"index":10,"start":9,"end":10,"lowbit":2},{"index":11,"start":11,"end":11,"lowbit":1},{"index":12,"start":9,"end":12,"lowbit":4},{"index":13,"start":13,"end":13,"lowbit":1},{"index":14,"start":13,"end":14,"lowbit":2},{"index":15,"start":15,"end":15,"lowbit":1},{"index":16,"start":1,"end":16,"lowbit":16}],"prefixPaths":[[],[1],[2],[3,2],[4],[5,4],[6,4],[7,6,4],[8],[9,8],[10,8],[11,10,8],[12,8],[13,12,8],[14,12,8],[15,14,12,8],[16]],"examples":[{"name":"signed-eight-mixed","initial":[3,-1,4,0,2,-5,6,1],"operations":[{"kind":"prefix","end":0},{"kind":"prefix","end":7},{"kind":"range","start":3,"end":6},{"kind":"add","index":4,"delta":5},{"kind":"prefix","end":7},{"kind":"add","index":1,"delta":-3},{"kind":"range","start":1,"end":8},{"kind":"add","index":8,"delta":0},{"kind":"range","start":8,"end":8}],"expected":{"initial":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"steps":[{"operation":{"kind":"prefix","end":0},"before":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"after":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"visitIndices":[[]],"result":0},{"operation":{"kind":"prefix","end":7},"before":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"after":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"visitIndices":[[7,6,4]],"result":9},{"operation":{"kind":"range","start":3,"end":6},"before":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"after":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"visitIndices":[[6,4],[2]],"result":1},{"operation":{"kind":"add","index":4,"delta":5},"before":{"values":[3,-1,4,0,2,-5,6,1],"tree":[3,2,4,6,2,-3,6,10]},"after":{"values":[3,-1,4,5,2,-5,6,1],"tree":[3,2,4,11,2,-3,6,15]},"visitIndices":[4,8],"result":null},{"operation":{"kind":"prefix","end":7},"before":{"values":[3,-1,4,5,2,-5,6,1],"tree":[3,2,4,11,2,-3,6,15]},"after":{"values":[3,-1,4,5,2,-5,6,1],"tree":[3,2,4,11,2,-3,6,15]},"visitIndices":[[7,6,4]],"result":14},{"operation":{"kind":"add","index":1,"delta":-3},"before":{"values":[3,-1,4,5,2,-5,6,1],"tree":[3,2,4,11,2,-3,6,15]},"after":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"visitIndices":[1,2,4,8],"result":null},{"operation":{"kind":"range","start":1,"end":8},"before":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"after":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"visitIndices":[[8],[]],"result":12},{"operation":{"kind":"add","index":8,"delta":0},"before":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"after":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"visitIndices":[8],"result":null},{"operation":{"kind":"range","start":8,"end":8},"before":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"after":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]},"visitIndices":[[8],[7,6,4]],"result":1}],"final":{"values":[0,-1,4,5,2,-5,6,1],"tree":[0,-1,4,8,2,-3,6,12]}}},{"name":"non-power-six","initial":[2,7,-3,4,-6,5],"operations":[{"kind":"add","index":5,"delta":-4},{"kind":"prefix","end":6},{"kind":"range","start":4,"end":6},{"kind":"add","index":6,"delta":7},{"kind":"range","start":6,"end":6}],"expected":{"initial":{"values":[2,7,-3,4,-6,5],"tree":[2,9,-3,10,-6,-1]},"steps":[{"operation":{"kind":"add","index":5,"delta":-4},"before":{"values":[2,7,-3,4,-6,5],"tree":[2,9,-3,10,-6,-1]},"after":{"values":[2,7,-3,4,-10,5],"tree":[2,9,-3,10,-10,-5]},"visitIndices":[5,6],"result":null},{"operation":{"kind":"prefix","end":6},"before":{"values":[2,7,-3,4,-10,5],"tree":[2,9,-3,10,-10,-5]},"after":{"values":[2,7,-3,4,-10,5],"tree":[2,9,-3,10,-10,-5]},"visitIndices":[[6,4]],"result":5},{"operation":{"kind":"range","start":4,"end":6},"before":{"values":[2,7,-3,4,-10,5],"tree":[2,9,-3,10,-10,-5]},"after":{"values":[2,7,-3,4,-10,5],"tree":[2,9,-3,10,-10,-5]},"visitIndices":[[6,4],[3,2]],"result":-1},{"operation":{"kind":"add","index":6,"delta":7},"before":{"values":[2,7,-3,4,-10,5],"tree":[2,9,-3,10,-10,-5]},"after":{"values":[2,7,-3,4,-10,12],"tree":[2,9,-3,10,-10,2]},"visitIndices":[6],"result":null},{"operation":{"kind":"range","start":6,"end":6},"before":{"values":[2,7,-3,4,-10,12],"tree":[2,9,-3,10,-10,2]},"after":{"values":[2,7,-3,4,-10,12],"tree":[2,9,-3,10,-10,2]},"visitIndices":[[6,4],[5,4]],"result":12}],"final":{"values":[2,7,-3,4,-10,12],"tree":[2,9,-3,10,-10,2]}}},{"name":"single-index-and-zero","initial":[-99],"operations":[{"kind":"prefix","end":0},{"kind":"range","start":1,"end":1},{"kind":"add","index":1,"delta":99},{"kind":"add","index":1,"delta":99},{"kind":"prefix","end":1}],"expected":{"initial":{"values":[-99],"tree":[-99]},"steps":[{"operation":{"kind":"prefix","end":0},"before":{"values":[-99],"tree":[-99]},"after":{"values":[-99],"tree":[-99]},"visitIndices":[[]],"result":0},{"operation":{"kind":"range","start":1,"end":1},"before":{"values":[-99],"tree":[-99]},"after":{"values":[-99],"tree":[-99]},"visitIndices":[[1],[]],"result":-99},{"operation":{"kind":"add","index":1,"delta":99},"before":{"values":[-99],"tree":[-99]},"after":{"values":[0],"tree":[0]},"visitIndices":[1],"result":null},{"operation":{"kind":"add","index":1,"delta":99},"before":{"values":[0],"tree":[0]},"after":{"values":[99],"tree":[99]},"visitIndices":[1],"result":null},{"operation":{"kind":"prefix","end":1},"before":{"values":[99],"tree":[99]},"after":{"values":[99],"tree":[99]},"visitIndices":[[1]],"result":99}],"final":{"values":[99],"tree":[99]}}},{"name":"blank-script-construction","initial":[0,-2,0,2,0],"operations":[],"expected":{"initial":{"values":[0,-2,0,2,0],"tree":[0,-2,0,0,0]},"steps":[],"final":{"values":[0,-2,0,2,0],"tree":[0,-2,0,0,0]}}}]};

const [modelArg,outArg]=process.argv.slice(2);
if(!modelArg||!outArg)throw Error('Usage: node independent-fenwick.mjs MODEL.mjs RECEIPT.json');
const identity=b=>({bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),git_blob:createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex')});
const modelPath=resolve(modelArg),output=resolve(outArg),beforeBytes=await readFile(modelPath);
const receipt={schema:'recallweave-fenwick-independent-native/v1',reviewer:'estate_source',executionAttribution:'Executed by the invoker; independent expectations and receiver authored by estate_source.',plan:'71a2d88781ba683b0afcdbb4f0a53db7d37e22e0',startedAt:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,model:{path:modelPath,before:identity(beforeBytes)},receiver:identity(await readFile(new URL(import.meta.url))),groups:[],assertions:0};
let model;
const eq=(a,b,label)=>{receipt.assertions++;assert.deepEqual(a,b,label);};
const ok=(x,label)=>{receipt.assertions++;assert(x,label);};
const refuses=(fn,label)=>{receipt.assertions++;assert.throws(fn,undefined,label);};
async function group(name,fn){try{await fn();receipt.groups.push({name,status:'passed'});console.log('PASS '+name);}catch(e){receipt.groups.push({name,status:'failed',error:e.stack});console.log('FAIL '+name+': '+e.message);}}
const clone=x=>JSON.parse(JSON.stringify(x));
const sum=a=>a.reduce((x,y)=>x+y,0);
const blocks=n=>PLAN.blocks.slice(0,n);
const snap=a=>({values:a.slice(),tree:blocks(a.length).map(b=>sum(a.slice(b.start-1,b.end)))});
function query(a,end,sign){
 const values=snap(a),path=PLAN.prefixPaths[end];let total=0;
 const visits=path.map((index,pos)=>{const b=PLAN.blocks[index-1],stored=values.tree[index-1],accumulatorBefore=total;total+=stored;return {...b,stored,accumulatorBefore,accumulatorAfter:total,next:path[pos+1]??0};});
 eq(total,sum(a.slice(0,end)),'independent query decomposition');
 return{end,sign,visits,sum:total};
}
function expected(spec){
 const a=spec.initial.slice(),steps=[],initial=snap(a),bs=blocks(a.length);
 for(const [offset,operation] of spec.operations.entries()){
  const before=snap(a);let visits=[],queries=[],result=null;
  if(operation.kind==='add'){
   const changed=bs.filter(b=>b.start<=operation.index&&operation.index<=b.end);
   a[operation.index-1]+=operation.delta;const after=snap(a);
   visits=changed.map(b=>({...b,before:before.tree[b.index-1],after:after.tree[b.index-1],next:b.index+b.lowbit}));
  }else{
   queries=[query(a,operation.end,1)];
   if(operation.kind==='range')queries.push(query(a,operation.start-1,-1));
   result=sum(a.slice(operation.kind==='range'?operation.start-1:0,operation.end));
   eq(result,queries.reduce((v,q)=>v+q.sign*q.sum,0),'direct range oracle');
  }
  steps.push({sequence:offset+1,operation:clone(operation),before,after:snap(a),visits,queries,result});
 }
 return{format:'recallweave-fenwick-trace/1',input:clone(spec),blocks:clone(bs),initial,steps,final:snap(a)};
}
function frozen(value,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return;
 seen.add(value);ok(Object.isFrozen(value),'every record frozen');
 for(const child of Object.values(value))frozen(child,seen);
}
function receive(spec,label){
 const caller=clone(spec),old=clone(caller),want=expected(caller),got=model.buildFenwickTrace(caller);
 eq(caller,old,label+' caller unchanged');eq(got,want,label+' complete direct-array trace');frozen(got);
 const text=model.serializeFenwickTrace(got);
 eq(text,JSON.stringify(got,null,2)+'\n','exact serializer');eq(model.serializeFenwickTrace(got),text,'deterministic repeat');eq(JSON.parse(text),want,'complete export');
 caller.initial[0]+=1;if(caller.operations.length)caller.operations[0].unrelated=1;
 eq(got,want,'retained trace cannot alias mutable caller');
 refuses(()=>{got.final.values[0]=123;},'frozen array cannot be assigned');return got;
}
try{
 model=await import(pathToFileURL(modelPath).href+'?independent='+receipt.model.before.sha256);
 for(const c of PLAN.examples)await group(c.name,()=>{
  const got=receive({initial:c.initial,operations:c.operations},c.name);
  eq(got.initial,c.expected.initial,'pre-source literal initial');eq(got.final,c.expected.final,'pre-source literal final');eq(got.steps.map(s=>s.result),c.expected.steps.map(s=>s.result),'pre-source literal answers');
 });
 for(const sign of [1,-1])await group(sign>0?'maximum7920':'minimum-7920',()=>{
  const index=sign>0?1:16;
  const got=receive({initial:Array(16).fill(sign*99),operations:Array.from({length:64},()=>({kind:'add',index,delta:sign*99}))},'extreme');
  eq(got.final.tree[15],sign*7920,'exact maximum total');eq(got.final.values[index-1],sign*6435,'represented value may exceed99');
 });
 for(let n=1;n<=16;n++)await group('all-prefix-range-update n='+n,()=>{
  const initial=Array.from({length:n},(_,j)=>((7*(j+1))%13)-6);
  receive({initial,operations:Array.from({length:n+1},(_,end)=>({kind:'prefix',end}))},'allprefix');
  const ranges=[];for(let start=1;start<=n;start++)for(let end=start;end<=n;end++)ranges.push({kind:'range',start,end});
  for(let i=0;i<ranges.length;i+=64)receive({initial,operations:ranges.slice(i,i+64)},'allranges');
  for(let index=1;index<=n;index++)receive({initial,operations:[{kind:'add',index,delta:9},{kind:'add',index,delta:-9}]},'roundtrip');
 });
 await group('numeric type and boundary refusal',()=>{
  const base=()=>({initial:[1,2,3],operations:[]});
  for(const bad of ['1',true,false,null,undefined,NaN,Infinity,-Infinity,1.5]){
   refuses(()=>model.buildFenwickTrace({initial:[bad],operations:[]}),'initial type');
   for(const field of ['index','delta']){const op={kind:'add',index:1,delta:1};op[field]=bad;refuses(()=>model.buildFenwickTrace({...base(),operations:[op]}),'add '+field);}
   for(const kind of ['prefix','range'])for(const field of kind==='prefix'?['end']:['start','end']){const op=kind==='prefix'?{kind,end:1}:{kind,start:1,end:1};op[field]=bad;refuses(()=>model.buildFenwickTrace({...base(),operations:[op]}),kind+' '+field);}
  }
  for(const initial of [[],Array(17).fill(0),[-100],[100]])refuses(()=>model.buildFenwickTrace({initial,operations:[]}));
  refuses(()=>model.buildFenwickTrace({...base(),operations:Array.from({length:65},()=>({kind:'prefix',end:0}))}));
  for(const operation of [{kind:'add',index:0,delta:1},{kind:'add',index:4,delta:1},{kind:'add',index:1,delta:100},{kind:'add',index:1,delta:-100},{kind:'prefix',end:-1},{kind:'prefix',end:4},{kind:'range',start:0,end:1},{kind:'range',start:1,end:4},{kind:'range',start:3,end:2}])refuses(()=>model.buildFenwickTrace({...base(),operations:[operation]}));
 });
 await group('whole admission exact fields sparse arrays unchanged caller',()=>{
  for(const spec of [null,[],{}, {initial:[1]}, {initial:[1],operations:[],extra:1}, {initial:[1],operations:[{kind:'unknown'}]}, {initial:[1],operations:[{kind:'prefix',end:1,extra:0}]}, {initial:[1],operations:[{kind:'add',index:1}]}, {initial:Array(1),operations:[]}, {initial:[1],operations:Array(1)}])refuses(()=>model.buildFenwickTrace(spec));
  const spec={initial:[4,-2],operations:[{kind:'add',index:1,delta:9},{kind:'range',start:2,end:1}]},old=clone(spec);
  refuses(()=>model.buildFenwickTrace(spec));eq(spec,old,'invalid later op never mutates caller');
  let reads=0;const op={get kind(){reads++;return'prefix';},end:1};
  refuses(()=>model.buildFenwickTrace({initial:[1],operations:[op]}));eq(reads,0,'plain data means no getter invocation');
 });
 await group('draft valid signed whitespace blank and parser immutability',()=>{
  const got=model.parseFenwickDraft(' +03, -01, 0 ','\r\nprefix 0\r\nadd 2 +01\nrange 1 3\n');
  eq(got,{initial:[3,-1,0],operations:[{kind:'prefix',end:0},{kind:'add',index:2,delta:1},{kind:'range',start:1,end:3}]});frozen(got);receive(got,'parsed');
  eq(model.parseFenwickDraft('1',' \r\n\t '),{initial:[1],operations:[]});
 });
 await group('draft rejects nondecimal ignored syntax and count overflow',()=>{
  for(const s of ['','1,','1,,2','1e1','0x10','1.0','1x','--1','NaN','Infinity'])refuses(()=>model.parseFenwickDraft(s,''));
  for(const s of ['ADD 1 1','prefix 1 extra','prefix 1 #x','add 1 1.0','add 0x1 2','range 1 1x','prefix 1e0','unknown 1','add 1','prefix'])refuses(()=>model.parseFenwickDraft('1',s));
  refuses(()=>model.parseFenwickDraft(Array(17).fill('1').join(','),''));
  refuses(()=>model.parseFenwickDraft('1',Array(65).fill('prefix 0').join('\n')));
  eq(model.parseFenwickDraft('1',Array(64).fill('prefix 0').join('\n')).operations.length,64);
 });
 await group('draft independent exact character limits',()=>{
  eq(model.parseFenwickDraft('1'+' '.repeat(511),'').initial,[1]);refuses(()=>model.parseFenwickDraft('1'+' '.repeat(512),''));
  eq(model.parseFenwickDraft('1','prefix 1'+' '.repeat(4088)).operations,[{kind:'prefix',end:1}]);refuses(()=>model.parseFenwickDraft('1','prefix 1'+' '.repeat(4089)));
  for(const x of [null,1,[],undefined]){refuses(()=>model.parseFenwickDraft(x,''));refuses(()=>model.parseFenwickDraft('1',x));}
 });
}catch(e){receipt.unexpected=e.stack;}
receipt.model.after=identity(await readFile(modelPath));
await group('source unchanged',()=>eq(receipt.model.after,receipt.model.before));
receipt.finishedAt=new Date().toISOString();receipt.status=!receipt.unexpected&&receipt.groups.every(g=>g.status==='passed')?'passed':'failed';
receipt.summary={groups:receipt.groups.length,passed:receipt.groups.filter(g=>g.status==='passed').length,failed:receipt.groups.filter(g=>g.status==='failed').length,assertions:receipt.assertions};
await writeFile(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:receipt.status,...receipt.summary,model:receipt.model,output}));
process.exitCode=receipt.status==='passed'?0:1;
