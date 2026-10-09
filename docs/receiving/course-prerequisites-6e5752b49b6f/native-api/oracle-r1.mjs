import assert from 'node:assert/strict';

function frozenTree(value, seen = new Set()) {
  if (value === null || typeof value !== 'object') {
    assert.ok(value === null || ['string','number','boolean'].includes(typeof value));
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
    return;
  }
  assert.ok(!seen.has(value), 'Result must be JSON-safe, without cyclic references');
  seen.add(value);
  assert.ok(Object.isFrozen(value), 'Every result object/array must be frozen');
  assert.ok(Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  for (const key of Reflect.ownKeys(value)) {
    assert.equal(typeof key, 'string');
    if (Array.isArray(value) && key === 'length') continue;
    frozenTree(value[key], seen);
  }
  seen.delete(value); // Frozen shared subobjects remain JSON-safe; only cycles refuse.
}
function equalReport(actual, expected) {
  // JSON-safe shape/key equality; prototype identity is not part of this public format.
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
function mutateClone(x, fn) { const y=structuredClone(x); fn(y); return y; }
function validateExpected(reference, parseDeck) {
  assert.equal(reference.contractGit, '551e3833b6439e475d8566e6727206dcd3e35493');
  assert.equal(reference.cases.length, 6);
  let reports=0;
  for (const c of reference.cases) {
    const admitted=parseDeck(JSON.stringify(c.course));
    assert.deepEqual(admitted.concepts,c.course.concepts);
    for (const e of c.expected) {
      assert.equal(e.concepts.length,c.course.concepts.length);
      assert.equal(e.questions.length,c.course.items.length);
      for (const q of e.questions) assert.equal(q.id,c.course.items[q.index].id);
      for (const row of [...e.selection.requirementPaths,...e.selection.dependentPaths]) {
        assert.ok(row.path.length>=2);
        for(let j=1;j<row.path.length;j++)
          assert.ok(e.concepts[row.path[j-1]].directPrerequisites.includes(row.path[j]));
      }
      frozenTree(freeze(structuredClone(e)));
      equalReport(e,e); reports++;
    }
  }
  assert.equal(reports,25);
  return reports;
}
export function selfTest(reference, parseDeck) {
  const reports=validateExpected(reference,parseDeck);
  const e=reference.cases[1].expected.find(x=>x.selection.index===2);
  const controls=[
    ['reverse-dependent-direction',x=>x.selection.dependentPaths[0].path.reverse()],
    ['wrong-shortest-tie',x=>x.selection.dependentPaths[0].path=[0,3,2]],
    ['missing-witness',x=>x.links.find(l=>l.conceptIndex===0&&l.prerequisiteIndex===1).questionIndices.pop()],
    ['authored-prerequisite-order-lost',x=>x.questions[3].prerequisiteIndices.reverse()],
    ['transitive-made-direct',x=>x.concepts[0].directPrerequisites.splice(1,0,2)],
    ['wrong-depth',x=>x.concepts[5].level--],
    ['source-question-number-shift',x=>x.questions[3].index++],
    ['answer-leak',x=>x.questions[0].answer=1]
  ];
  for(const [name,change] of controls)
    assert.throws(()=>equalReport(mutateClone(e,change),e),undefined,name);
  const literal=reference.cases[2].expected[0];
  assert.throws(()=>equalReport(mutateClone(literal,x=>x.concepts[5].name=x.concepts[5].name.normalize('NFC')),literal));
  assert.throws(()=>frozenTree(structuredClone(e)));
  return {expectedReports:reports,negativeControls:controls.map(x=>x[0]).concat(['unicode-normalization','mutable-result']),passed:true};
}
export function runPrerequisiteReceiving(inspect, parseDeck, reference) {
  assert.equal(typeof inspect,'function');
  const sensitivity=selfTest(reference,parseDeck);
  const groups=[], actualOutputs=[];
  let actualCalls=0;
  const invoke=(...args)=>{ actualCalls++;return inspect(...args); };
  for (const c of reference.cases) {
    const raw=JSON.stringify(c.course), rawBefore=raw;
    const saved=JSON.stringify(c.course);
    for(const expected of c.expected) {
      const result=invoke(raw,expected.selection.index);
      equalReport(result,expected);frozenTree(result);
      const serialized=JSON.stringify(result);
      assert.equal(JSON.stringify(invoke(raw,expected.selection.index)),serialized);
      assert.throws(()=>{result.concepts[0].name='receiver mutation';},TypeError);
      assert.throws(()=>{result.concepts[0].questionIndices.push(999);},TypeError);
      assert.throws(()=>{result.selection.index=999;},TypeError);
      assert.equal(JSON.stringify(result),serialized);
      actualOutputs.push({case:c.name,selection:expected.selection.index,json:serialized});
    }
    assert.equal(raw,rawBefore);assert.equal(JSON.stringify(c.course),saved);
    groups.push({name:c.name,selections:c.expected.map(x=>x.selection.index)});
  }
  const ordinary=reference.cases[0], raw=JSON.stringify(ordinary.course);
  equalReport(invoke(raw),ordinary.expected[0]);
  equalReport(invoke(raw,undefined),ordinary.expected[0]);
  equalReport(invoke(raw,-0),ordinary.expected[0]);
  const badIndices=[null,false,true,'0',' 0 ',1.5,-1,ordinary.course.concepts.length,NaN,Infinity,-Infinity,{},[],0n,Symbol('index')];
  for(const index of badIndices)assert.throws(()=>invoke(raw,index));
  groups.push({name:'selection-admission',badIndexCount:badIndices.length,defaultAndNegativeZero:true});

  const refusals=[];
  function refuse(name,input) {
    let error;
    try{parseDeck(input);}catch(e){error=e;}
    assert.ok(error instanceof Error,'Baseline must refuse '+name);
    const before=typeof input==='object'&&input!==null?JSON.stringify(input):null;
    assert.throws(()=>invoke(input,0),e=>e instanceof Error && e.name===error.name && e.message===error.message,name);
    if(before!==null)assert.equal(JSON.stringify(input),before);
    refusals.push({name,errorName:error.name,errorMessage:error.message});
  }
  for(const [name,value] of [['null',null],['object',{}],['number',42],['boolean',false],['array',[]],['undefined',undefined],['symbol',Symbol('source')]])
    refuse('nonstring-'+name,value);
  refuse('invalid-json','{');
  refuse('bom','\uFEFF'+raw);
  const changed=(name,fn)=>refuse(name,JSON.stringify(mutateClone(ordinary.course,fn)));
  changed('aggregate-cycle',x=>x.items[1].prerequisites=['Finish']);
  changed('self-edge',x=>x.items[2].prerequisites=['Branch']);
  changed('unknown-edge',x=>x.items[2].prerequisites=['Missing']);
  changed('duplicate-edge',x=>x.items[2].prerequisites=['Base','Base']);
  changed('uncovered-concept',x=>x.items=x.items.filter(q=>q.concept!=='Island'));
  changed('duplicate-concept',x=>x.concepts.push('Base'));
  changed('duplicate-id',x=>x.items[1].id=x.items[0].id);
  changed('unknown-question-concept',x=>x.items[0].concept='Missing');
  changed('wrong-answer-type',x=>x.items[0].answer='1');
  changed('empty-options',x=>x.items[0].options=[]);
  changed('duplicate-options',x=>x.items[0].options=['same','same']);
  changed('overlong-prompt',x=>x.items[0].prompt='x'.repeat(2001));
  changed('nonarray-prerequisites',x=>x.items[0].prerequisites={});
  changed('nonstring-concept',x=>x.concepts[0]=3);
  const chain=reference.cases[4].course;
  refuse('33-concepts',JSON.stringify(mutateClone(chain,x=>{
    x.concepts.push('Beyond32');x.items.push({...x.items[31],id:'beyond',concept:'Beyond32'});
  })));
  const hundred=reference.cases[5].course;
  refuse('101-questions',JSON.stringify(mutateClone(hundred,x=>x.items.push({...x.items[0],id:'beyond100'}))));
  const byteCount=Buffer.byteLength(raw,'utf8');
  const edge=raw+' '.repeat(262144-byteCount);
  assert.equal(Buffer.byteLength(edge,'utf8'),262144);
  parseDeck(edge);equalReport(invoke(edge),ordinary.expected[0]);
  refuse('262145-bytes',edge+' ');
  const unicodeRaw=JSON.stringify(reference.cases[2].course);
  const unicodeEdge=unicodeRaw+' '.repeat(262144-Buffer.byteLength(unicodeRaw,'utf8'));
  assert.equal(Buffer.byteLength(unicodeEdge,'utf8'),262144);
  equalReport(invoke(unicodeEdge),reference.cases[2].expected[0]);
  refuse('multibyte-overlimit',unicodeEdge+'é');
  groups.push({name:'unchanged-validator-refusal-and-byte-admission',refusals:refusals.length,acceptedBoundaryBytes:262144});

  const enriched=mutateClone(ordinary.course,x=>{
    x.untrustedExtra='PRIVATE-ROOT-EXTRA';x.items[0].unknown='PRIVATE-ITEM-EXTRA';
  });
  equalReport(invoke(JSON.stringify(enriched)),ordinary.expected[0]);
  const output=JSON.stringify(invoke(JSON.stringify(reference.cases[1].course)));
  for(const secret of ['PRIVATE-OPTION-','PRIVATE-EXPLANATION-','PRIVATE-TRANSFER-'])
    assert.equal(output.includes(secret),false);
  groups.push({name:'exact-public-projection-only'});
  return {passed:true,groups,actualCalls,refusals,sensitivity,actualOutputs};
}
