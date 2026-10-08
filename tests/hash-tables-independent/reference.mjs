import assert from 'node:assert/strict';

export const LIMITS = Object.freeze({minCapacity:3,maxCapacity:17,minKey:-9999,maxKey:9999,maxOperations:24});
const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);

export function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) freezeDeep(value[key]);
    Object.freeze(value);
  }
  return value;
}
function record(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype,null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(path+' must be a plain object');
  }
  const names=Reflect.ownKeys(value);
  if (names.length!==keys.length || names.some(x=>typeof x!=='string'||!keys.includes(x)) ||
      keys.some(x=>!own(value,x))) throw new TypeError(path+' has unexpected or missing fields');
}
function integer(value,min,max,path) {
  if(typeof value!=='number'||!Number.isFinite(value)||!Number.isInteger(value)) throw new TypeError(path+' must be a finite integer');
  if(value<min||value>max) throw new RangeError(path+' outside permitted range');
  return value===0?0:value;
}
export function canonicalScenario(value) {
  record(value,['capacity','operations'],'scenario');
  const capacity=integer(value.capacity,3,17,'capacity');
  if(!Array.isArray(value.operations)) throw new TypeError('operations must be an array');
  if(value.operations.length>24) throw new RangeError('operations exceeds 24');
  const operations=[];
  for(let i=0;i<value.operations.length;i++){
    if(!own(value.operations,i)) throw new TypeError('operations['+i+'] must be present');
    const op=value.operations[i];record(op,['type','key'],'operations['+i+']');
    if(!['insert','find','delete'].includes(op.type)) throw new TypeError('operations['+i+'].type is unsupported');
    operations.push({type:op.type,key:integer(op.key,-9999,9999,'operations['+i+'].key')});
  }
  return freezeDeep({capacity,operations});
}
/** Integer arithmetic, independent of the candidate's Number remainder implementation. */
export function mathematicalHome(key,capacity) {
  const k=integer(key,-9999,9999,'key'),m=integer(capacity,3,17,'capacity');
  return Number((BigInt(k)%BigInt(m)+BigInt(m))%BigInt(m));
}
const slotCopy=slot=>slot.kind==='occupied'?{kind:'occupied',key:slot.key}:{kind:slot.kind};
const tableCopy=slots=>slots.map(slotCopy);
export const initialTable=capacity=>Array.from({length:capacity},()=>({kind:'empty'}));
export function referenceStep(slots,operation,operationIndex=0) {
  const before=tableCopy(slots),m=before.length,home=mathematicalHome(operation.key,m);
  const permutation=Array.from({length:m},(_,offset)=>Number((BigInt(home)+BigInt(offset))%BigInt(m)));
  const emptyAt=permutation.findIndex(index=>before[index].kind==='empty');
  const searchable=permutation.slice(0,emptyAt<0?m:emptyAt+1);
  const matchAt=searchable.findIndex(index=>before[index].kind==='occupied'&&before[index].key===operation.key);
  const observed=searchable.slice(0,matchAt<0?searchable.length:matchAt+1);
  const deletedIndex=observed.find(index=>before[index].kind==='deleted');
  const neverUsedIndex=observed.find(index=>before[index].kind==='empty');
  const hit=matchAt<0?null:searchable[matchAt];
  let status,index=null;
  if(hit!==null){index=hit;status=operation.type==='insert'?'present':operation.type==='find'?'found':'deleted';}
  else if(operation.type==='insert'){
    index=deletedIndex!==undefined?deletedIndex:neverUsedIndex!==undefined?neverUsedIndex:null;
    status=index===null?'full':'inserted';
  } else status='absent';
  const after=tableCopy(before);
  if(status==='inserted') after[index]={kind:'occupied',key:operation.key};
  if(status==='deleted') after[index]={kind:'deleted'};
  let firstDeleted=null;
  const probes=observed.map(position=>{
    const slot=slotCopy(before[position]);let decision;
    if(slot.kind==='deleted'){
      if(operation.type==='insert'&&firstDeleted===null){firstDeleted=position;decision='remember-deleted';}
      else decision='skip-deleted';
    }else if(slot.kind==='empty')decision='empty-stop';
    else decision=slot.key===operation.key?'match':'collision';
    return{index:position,slot,decision,firstDeleted:operation.type==='insert'?firstDeleted:null};
  });
  return{operationIndex,operation:{type:operation.type,key:operation.key},home,before,probes,status,index,after};
}
export function assertAbstractStep(result) {
  const beforeKeys=result.before.filter(s=>s.kind==='occupied').map(s=>s.key);
  const expected=new Set(beforeKeys),had=expected.has(result.operation.key);
  assert.equal(expected.size,beforeKeys.length,'duplicate live key before');
  if(result.operation.type==='insert'){
    const want=had?'present':expected.size===result.before.length?'full':'inserted';
    assert.equal(result.status,want,'abstract-set insertion');
    if(want==='inserted')expected.add(result.operation.key);
  }else if(result.operation.type==='find')assert.equal(result.status,had?'found':'absent','abstract-set find');
  else{assert.equal(result.status,had?'deleted':'absent','abstract-set delete');expected.delete(result.operation.key);}
  const afterKeys=result.after.filter(s=>s.kind==='occupied').map(s=>s.key);
  assert.equal(new Set(afterKeys).size,afterKeys.length,'duplicate live key after');
  assert.deepEqual([...new Set(afterKeys)].sort((a,b)=>a-b),[...expected].sort((a,b)=>a-b),'abstract set differs');
  assert.ok(result.probes.length<=result.before.length,'bounded probes');
  assert.equal(new Set(result.probes.map(p=>p.index)).size,result.probes.length,'unique probe positions');
}
export function referenceRun(value) {
  const scenario=canonicalScenario(value),initialSlots=initialTable(scenario.capacity),operations=[];
  const trace=[{kind:'initial',operationIndex:null,probeIndex:null,slots:tableCopy(initialSlots)}];
  let current=tableCopy(initialSlots);
  scenario.operations.forEach((operation,i)=>{
    const result=referenceStep(current,operation,i);assertAbstractStep(result);operations.push(result);
    result.probes.forEach((_,j)=>trace.push({kind:'probe',operationIndex:i,probeIndex:j,slots:tableCopy(result.before)}));
    trace.push({kind:'result',operationIndex:i,probeIndex:null,slots:tableCopy(result.after)});
    current=tableCopy(result.after);
  });
  return freezeDeep({scenario,initialSlots,operations,finalSlots:current,trace});
}
export function stateKey(slots){return JSON.stringify(slots.map(s=>s.kind==='occupied'?s.key:s.kind));}
