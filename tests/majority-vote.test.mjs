import test from 'node:test';
import assert from 'node:assert/strict';
import { traceMajority, parseMajorityLines } from '../src/majority-vote.mjs';

test('the proposal remains separate from occurrence count and the final decision', () => {
  const t = traceMajority(['A', 'A', 'B', 'A', 'B']);
  assert.deepEqual(t.cancellation.map(x => [x.candidate,x.balance,x.action]), [
    [null,0,'initial'],['A',1,'choose'],['A',2,'increment'],['A',1,'decrement'],['A',2,'increment'],['A',1,'decrement']
  ]);
  assert.equal(t.balance,1);
  assert.equal(t.candidateCount,3);
  assert.equal(t.majority,'A');
  assert.deepEqual(t.verification.map(x=>x.matches),[0,1,2,2,3,3]);
  const no = traceMajority(['red','blue','green']);
  assert.equal(no.candidate,'green');
  assert.equal(no.balance,1);
  assert.equal(no.hasMajority,false);
  assert.equal(no.majority,null);
  const tie=traceMajority(['P','Q']);
  assert.equal(tie.candidate,'P');
  assert.equal(tie.balance,0);
  assert.equal(tie.candidateCount,1);
  assert.equal(tie.threshold,2);
  assert.equal(tie.hasMajority,false);
});

test('empty, singleton and forty entries have exact boundaries', () => {
  assert.deepEqual(traceMajority([]),{
    schema:'recallweave-majority-vote/1',values:[],
    cancellation:[{position:0,candidate:null,balance:0,action:'initial',lastValue:null}],
    candidate:null,balance:0,
    verification:[{position:0,matches:0,lastValue:null,matched:null}],
    candidateCount:0,threshold:1,hasMajority:false,majority:null
  });
  assert.equal(traceMajority(['only']).majority,'only');
  assert.equal(traceMajority(Array(40).fill('x')).candidateCount,40);
  const exactHalf=traceMajority([...Array(20).fill('a'),...Array(20).fill('b')]);
  assert.equal(exactHalf.hasMajority,false);
});

test('all ternary sequences through length eight agree with full frequency counts', () => {
  let checked=0;
  const visit=values=>{
    const t=traceMajority(values);
    const counts=new Map();
    values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
    const majority=[...counts].find(([,count])=>count>values.length/2)?.[0] ?? null;
    assert.equal(t.majority,majority);
    assert.equal(t.hasMajority,majority!==null);
    assert.equal(t.candidateCount,counts.get(t.candidate)||0);
    assert.equal(t.threshold,Math.floor(values.length/2)+1);
    for(let i=0;i<=values.length;i++){
      const step=t.cancellation[i];
      assert.equal(step.position,i);
      assert.equal((i-step.balance)%2,0);
      assert.ok(step.balance>=0 && step.balance<=i);
      assert.equal(t.verification[i].matches,values.slice(0,i).filter(v=>v===t.candidate).length);
    }
    checked++;
    if(values.length<8) for(const next of ['a','b','c']) visit([...values,next]);
  };
  visit([]);
  assert.equal(checked,9841);
});

test('literal strings, Unicode code units and newline parsing are preserved', () => {
  const values=['m','M','m ','\0','\ud800','e\u0301','é','null','<script>'];
  assert.deepEqual(traceMajority(values).values,values);
  assert.equal(traceMajority(['😀'.repeat(24)]).candidate.length,48);
  assert.deepEqual(parseMajorityLines('a\r\nb\rc\n d '),['a','b','c',' d ']);
  assert.deepEqual(parseMajorityLines(''),[]);
  assert.deepEqual(parseMajorityLines('\0'),['\0']);
  assert.equal(Object.isFrozen(parseMajorityLines('a')),true);
});

test('invalid arrays, labels and raw line drafts refuse without caller mutation', () => {
  for(const input of [null,'a',{},42,true,[1],[null],[''],['  '],['a\nb'],['a\rb'],['x'.repeat(49)],Array(41).fill('x'),Array(1)]){
    assert.throws(()=>traceMajority(input),error=>error instanceof TypeError||error instanceof RangeError);
  }
  for(const input of [null,1,{},'a\n','\na','a\n\nb',' '.repeat(4),'x'.repeat(4097)]){
    assert.throws(()=>parseMajorityLines(input),error=>error instanceof TypeError||error instanceof RangeError);
  }
  const v=['a','b'];v.extra='not a sequence item';
  assert.deepEqual(traceMajority(v).values,['a','b']);
  assert.equal(v.length,2); assert.equal(v[0],'a'); assert.equal(v[1],'b'); assert.equal(v.extra,'not a sequence item');
});

test('snapshots are copied and recursively frozen; scans do not use randomness', () => {
  const original=['x','x','y'];
  const oldRandom=Math.random;
  let t;
  Math.random=()=>{throw new Error('RNG forbidden');};
  try{t=traceMajority(original);}finally{Math.random=oldRandom;}
  original[0]='changed'; original.push('changed');
  assert.deepEqual(t.values,['x','x','y']);
  const visit=value=>{
    if(value && typeof value==='object'){
      assert.equal(Object.isFrozen(value),true);
      for(const child of Object.values(value)) visit(child);
    }
  };
  visit(t);
  assert.throws(()=>t.cancellation[1].balance=9,TypeError);
  assert.throws(()=>t.values.push('z'),TypeError);
  assert.deepEqual(traceMajority(['x','x','y']),t);
});
