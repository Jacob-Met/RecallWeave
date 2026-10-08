import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateDeck,parseDeck,serializeDeck} from '../src/deck.mjs';
import {analyzeCollision,formatFraction,serializeCollision,COLLISION_PRESETS} from '../src/momentum-collisions.mjs';

const courseURL=new URL('../courses/momentum-collisions.json',import.meta.url);
test('original twelve-question course passes the unchanged learner codec and independent key',()=>{
 const text=readFileSync(courseURL,'utf8'), deck=validateDeck(JSON.parse(text));
 assert.equal(deck.items.length,12);
 assert.deepEqual(deck.items.map(item=>item.answer),[1,2,1,3,0,2,3,2,3,0,2,0]);
 assert.deepEqual(parseDeck(serializeDeck(deck)),deck);
 assert.ok(deck.items.every(item=>item.explanation.length>80&&item.transfer.length>40));
});
test('worked unequal-mass event distinguishes the separating branch from unchanged motion',()=>{
 const a=analyzeCollision({mA:'2',mB:'1',uA:'3',uB:'0'});
 assert.equal(a.status,'collision');
 assert.equal(formatFraction(a.elastic.a.velocity),'1');
 assert.equal(formatFraction(a.elastic.b.velocity),'4');
 assert.equal(formatFraction(a.elastic.relativeVelocity),'-3');
 assert.equal(formatFraction(a.completelyInelastic.a.velocity),'2');
 assert.equal(formatFraction(a.completelyInelastic.kineticConverted),'3');
});
test('equal or growing positive gaps do not receive hypothetical collision endpoints',()=>{
 for(const example of COLLISION_PRESETS.filter(p=>['equal-speed','separating'].includes(p.id))){
  const {mA,mB,uA,uB}=example, result=analyzeCollision({mA,mB,uA,uB});
  assert.equal(result.status,'no-collision');
  assert.equal(result.elastic,null);assert.equal(result.completelyInelastic,null);
 }
});
test('saved analysis recomputes accepted entered values and rejects extra physical claims',()=>{
 const inputs={mA:' 01 ',mB:'2',uA:'+3',uB:'-1'};
 const record=JSON.parse(serializeCollision(inputs));
 assert.deepEqual(record.entered,inputs);
 assert.equal(formatFraction(record.completelyInelastic.a.velocity),'1/3');
 assert.equal(formatFraction(record.relativeKineticEnergy),'16/3');
 assert.throws(()=>serializeCollision({...inputs,externalImpulse:2}));
 assert.throws(()=>serializeCollision({...inputs,mA:'0'}));
 assert.throws(()=>serializeCollision({...inputs,uA:'1e1'}));
});
test('committed standalone explorer reproduces exactly from the owned source inputs',()=>{
 const build=fileURLToPath(new URL('../tools/build-momentum-collisions.mjs',import.meta.url));
 assert.match(execFileSync(process.execPath,[build,'--check'],{encoding:'utf8'}),/matches its exact source/);
 const html=readFileSync(new URL('../courses/momentum-collisions-explorer.html',import.meta.url),'utf8');
 assert.ok(!html.includes('@@'));
 assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));
});
