import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(process.env.POLYNOMIAL_SOURCE_ROOT || new URL('..', import.meta.url).pathname);
const api = () => import(pathToFileURL(join(root, 'src/polynomial-interpolation.mjs')).href);
const input = { points: [{ x:'0', y:'1' }, { x:'2', y:'5' }, { x:'5', y:'26' }], at:['0','3/2','5','7'] };
const cli = (args, source, options={}) => spawnSync(process.execPath, [join(root,'tools/interpolate-polynomial.mjs'), ...args], {
  input: source, encoding:'utf8', ...options
});
const frozen = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
};

test('existing native learner admits and completes the original lesson control', async () => {
  const { parseDeck } = await import(pathToFileURL(join(root,'src/deck.mjs')).href);
  const { runLearnerSimulation } = await import(pathToFileURL(join(root,'src/knowledge.mjs')).href);
  const deck = parseDeck(readFileSync(join(root,'courses/least-squares.json'),'utf8'));
  const result = runLearnerSimulation(deck.items, deck.concepts, {});
  assert.equal(result.trace.length, 16);
  assert.equal(new Set(result.trace.map(row => row.item)).size, 16);
});

test('nonuniform quadratic has complete exact triangle, coefficients and query classes', async () => {
  const { interpolatePolynomial } = await api();
  const result = interpolatePolynomial(input);
  assert.deepEqual(result.dividedDifferences, [['1','5','26'],['2','7'],['1']]);
  assert.deepEqual(result.newtonCoefficients, ['1','2','1']);
  assert.deepEqual(result.monomialCoefficients, ['1','0','1']);
  assert.equal(result.degree, 2);
  assert.deepEqual(result.evaluations.map(x => [x.value,x.relation]), [['1','node'],['13/4','inside'],['26','node'],['50','outside']]);
  assert.ok(result.nodeChecks.every(x => x.ok && x.actual === x.expected));
});

test('authored permutation changes Newton form but preserves the polynomial', async () => {
  const { interpolatePolynomial } = await api();
  const forward = interpolatePolynomial(input);
  const reverse = interpolatePolynomial({...input,points:[...input.points].reverse()});
  assert.deepEqual(reverse.newtonCoefficients, ['26','7','1']);
  assert.deepEqual(reverse.nodes.map(x => x.x), ['5','2','0']);
  assert.deepEqual(reverse.monomialCoefficients, forward.monomialCoefficients);
  assert.deepEqual(reverse.evaluations, forward.evaluations);
});

test('rational and decimal lexemes stay exact and caller-owned data stay unchanged', async () => {
  const { interpolatePolynomial } = await api();
  const source = frozen({points:[{x:' -0 ',y:' 0.1 '},{x:'+0.50',y:'3/5'}],at:[' 1/4 ','1']});
  const before = JSON.stringify(source);
  const result = interpolatePolynomial(source);
  assert.deepEqual(result.monomialCoefficients, ['1/10','1']);
  assert.deepEqual(result.evaluations.map(x=>x.value), ['7/20','11/10']);
  assert.deepEqual(result.input,source);
  result.input.points[0].x='999'; result.limits.maxPoints=1;
  assert.equal(JSON.stringify(source),before);
  assert.equal(interpolatePolynomial(source).limits.maxPoints,8);
});

test('one point, zero polynomial and redundant-degree data have honest degrees', async () => {
  const { interpolatePolynomial } = await api();
  const constant = interpolatePolynomial({points:[{x:'3',y:'-2/3'}],at:['3','4']});
  assert.equal(constant.degree,0);
  assert.deepEqual(constant.evaluations.map(x=>x.relation),['node','outside']);
  const allZero = interpolatePolynomial({points:[{x:'-3',y:'0'},{x:'4',y:'-0'},{x:'9',y:'0/7'}],at:[]});
  assert.equal(allZero.degree,null); assert.deepEqual(allZero.monomialCoefficients,['0']);
  const extra = interpolatePolynomial({...input,points:[...input.points,{x:'3',y:'10'}]});
  assert.equal(extra.degree,2); assert.equal(extra.newtonCoefficients[3],'0');
});

test('eight-point degree-seven reconstruction matches an independent integer power oracle', async () => {
  const { interpolatePolynomial } = await api();
  const expected = [2n,-3n,0n,4n,-1n,0n,2n,-1n];
  const polynomial = x => expected.reduce((sum,c,power)=>sum+c*x**BigInt(power),0n);
  const order=[2,-3,4,0,-1,3,1,-2];
  const points=order.map(x=>({x:String(x),y:String(polynomial(BigInt(x)))}));
  const result=interpolatePolynomial({points,at:['-5','5','6']});
  assert.deepEqual(result.monomialCoefficients,expected.map(String));
  assert.equal(result.degree,7);
  assert.deepEqual(result.dividedDifferences.map(x=>x.length),[8,7,6,5,4,3,2,1]);
  assert.deepEqual(result.evaluations.map(x=>x.value),[-5n,5n,6n].map(x=>String(polynomial(x))));
});

test('duplicate rational nodes refuse regardless of lexical spelling or matching y', async () => {
  const { interpolatePolynomial } = await api();
  for (const pair of [['0','-0'],['0.5','1/2'],['2/4','+00.500000'],['1','1/1']]) {
    const value={points:pair.map(x=>({x,y:'3'})),at:[]}; const before=JSON.stringify(value);
    assert.throws(()=>interpolatePolynomial(value),/duplicate/);
    assert.equal(JSON.stringify(value),before);
  }
});

test('type, shape, sparse/accessor and pre-reduction limits refuse visibly', async () => {
  const { interpolatePolynomial } = await api();
  const invalid=[null,{},[],{points:[],at:[]},{points:input.points,at:[],extra:true},
    {points:Array(9).fill({x:'0',y:'0'}),at:[]},{points:input.points,at:Array(17).fill('0')}];
  for(const value of invalid) assert.throws(()=>interpolatePolynomial(value));
  for(const value of [1,null,true,'NaN','Infinity','1e3','1/0','1/-2','.5','1.','0.0000001','1000000001/2','1/1000001','1000.000001','0'.repeat(33)]) {
    assert.throws(()=>interpolatePolynomial({points:[{x:value,y:'0'}],at:[]}));
  }
  let reads=0; const getter={get x(){reads++;return '0';},y:'0'};
  assert.throws(()=>interpolatePolynomial({points:[getter],at:[]}));
  const array=[]; Object.defineProperty(array,'0',{get(){reads++;return {x:'0',y:'0'};},enumerable:true});
  assert.throws(()=>interpolatePolynomial({points:array,at:[]}));
  assert.throws(()=>interpolatePolynomial({points:new Array(1),at:[]}));
  assert.equal(reads,0);
});

test('input magnitude boundaries stay exact without floating-point coercion', async () => {
  const { interpolatePolynomial } = await api();
  const result=interpolatePolynomial({points:[{x:'-1000000000',y:'1000000000'},{x:'1000000000',y:'-1000000000'}],at:['1/1000000']});
  assert.deepEqual(result.monomialCoefficients,['0','-1']);
  assert.equal(result.evaluations[0].value,'-1/1000000');
});

test('real file, stdin and literal dash filename return identical JSON without source writes', async () => {
  const { interpolatePolynomial } = await api();
  const temp=mkdtempSync(join(tmpdir(),'poly-author-'));
  try {
    const contents=JSON.stringify(input); writeFileSync(join(temp,'-'),contents);
    const stdin=cli(['-'],contents); const file=cli(['./-'],undefined,{cwd:temp});
    for(const result of [stdin,file]) { assert.equal(result.status,0,result.stderr); assert.equal(result.stderr,''); assert.deepEqual(JSON.parse(result.stdout),interpolatePolynomial(input)); }
    assert.equal(file.stdout,stdin.stdout); assert.ok(file.stdout.endsWith('\n'));
    assert.equal(readFileSync(join(temp,'-'),'utf8'),contents);
  } finally { rmSync(temp,{recursive:true,force:true}); }
});

test('real CLI text retains exact values, complete differences and interpretation limits', () => {
  const result=cli(['-','--format','text'],JSON.stringify(input));
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/13\/4 \[inside\]/);
  assert.match(result.stdout,/2: 1\n/);
  assert.match(result.stdout,/not an error bound/);
  assert.equal(result.stderr,'');
});

test('real CLI rejects argument, read, JSON, UTF-8, size and coordinate failures without stdout', () => {
  const results=[
    [cli([],''),2], [cli(['--help','x'],''),2], [cli(['-','--format','xml'],'{}'),2],
    [cli(['/definitely-missing-e827-polynomial/input.json']),1], [cli(['-'],'{'),2],
    [cli(['-'],Buffer.from([0xc3,0x28])),2], [cli(['-'],' '.repeat(65537)),2],
    [cli(['-'],JSON.stringify({...input,at:['1e2']})),2]
  ];
  for(const [result,status] of results) { assert.equal(result.status,status,result.stderr); assert.equal(result.stdout,''); assert.notEqual(result.stderr,''); }
  const exact=cli(['-'],JSON.stringify(input).padEnd(65536,' '));
  assert.equal(exact.status,0,exact.stderr);
  const help=cli(['--help']); assert.equal(help.status,0); assert.match(help.stdout,/Usage:/);
});

test('original course passes native admission, full adaptive review and one bounded retry', async () => {
  const { parseDeck } = await import(pathToFileURL(join(root,'src/deck.mjs')).href);
  const { selectNextItem,initialMastery,updateMastery } = await import(pathToFileURL(join(root,'src/knowledge.mjs')).href);
  const { createReview,beginPractice,currentPracticeItem,answerPractice } = await import(pathToFileURL(join(root,'src/review.mjs')).href);
  const deck=parseDeck(readFileSync(join(root,'courses/polynomial-interpolation.json'),'utf8'));
  assert.equal(deck.items.length,18); assert.equal(deck.concepts.length,6);
  const mastery=initialMastery(deck.concepts), asked=new Set(), answers=[];
  while(asked.size<deck.items.length) {
    const item=selectNextItem(deck.items,asked,mastery); assert.ok(item);
    const choice=asked.size===0?(item.answer+1)%item.options.length:item.answer;
    answers.push({item:item.id,choice}); asked.add(item.id);
    mastery[item.concept]=updateMastery(mastery[item.concept],choice===item.answer);
  }
  assert.equal(selectNextItem(deck.items,asked,mastery),null);
  const review=createReview(deck.items,answers), before=JSON.stringify(review);
  let round=beginPractice(review); assert.equal(round.items.length,1);
  const current=currentPracticeItem(round); round=answerPractice(round,current.id,current.answer);
  assert.equal(currentPracticeItem(round),null); assert.equal(round.answers[0].correct,true);
  assert.equal(JSON.stringify(review),before);
});
