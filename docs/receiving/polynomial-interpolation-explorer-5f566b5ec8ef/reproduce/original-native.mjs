import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {interpolatePolynomial} from './source/src/polynomial-interpolation.mjs';
import {parseDeck} from './source/src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from './source/src/knowledge.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const report=interpolatePolynomial({points:[{x:'2',y:'4'},{x:'0',y:'0'},{x:'1',y:'1'}],at:['1/2','3']});
assert.deepEqual(report.monomialCoefficients,['0','0','1']);assert.deepEqual(report.evaluations.map(x=>[x.value,x.relation]),[['1/4','inside'],['9','outside']]);
const deck=parseDeck(fs.readFileSync(new URL('./source/courses/polynomial-interpolation.json',import.meta.url),'utf8'));
assert.equal(deck.items.length,18);const seen=new Set(),mastery=initialMastery(deck.concepts);
while(seen.size<18){const item=selectNextItem(deck.items,seen,mastery);assert(item&&!seen.has(item.id));seen.add(item.id);mastery[item.concept]=updateMastery(mastery[item.concept],true);}
assert.equal(selectNextItem(deck.items,seen,mastery),null);
const missing=['src/polynomial-interpolation-ui.mjs','courses/polynomial-interpolation-explorer.html'].map(p=>({path:p,absent:!fs.existsSync(root+'source/'+p)}));assert(missing.every(x=>x.absent));
const receipt={at:new Date().toISOString(),node:process.version,checks:['Accepted unchanged core actual Windows unsorted-square witness','Corrected accepted lesson through current parser/adaptive18firstanswers','New explorer/UI absence established'],modelReport:report,deckTitle:deck.title,questions:seen.size,missing,scope:'New Windows receiving baseline, not a replay of historical13author/6independent mathematical suite or a new content review.'};
fs.writeFileSync(root+'evidence/original-native.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({passed:3,questions:18,missing}));
