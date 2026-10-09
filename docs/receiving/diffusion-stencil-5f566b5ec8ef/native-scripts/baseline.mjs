import fs from 'node:fs';
import assert from 'node:assert/strict';
import {parseDeck} from './source/src/deck.mjs';
import {initialMastery,selectNextItem,updateMastery} from './source/src/knowledge.mjs';
import {createReview,beginPractice,currentPracticeItem,answerPractice} from './source/src/review.mjs';
const deck=parseDeck(fs.readFileSync(new URL('./source/data/deck.json',import.meta.url),'utf8'));
const mastery=initialMastery(deck.concepts), asked=new Set(), answers=[];
while(asked.size<deck.items.length){const q=selectNextItem(deck.items,asked,mastery);const choice=answers.length===0?(q.answer+1)%q.options.length:q.answer;answers.push({item:q.id,choice});asked.add(q.id);mastery[q.concept]=updateMastery(mastery[q.concept],choice===q.answer);}
const review=createReview(deck.items,answers);let practice=beginPractice(review);assert.equal(practice.items.length,1);const q=currentPracticeItem(practice);practice=answerPractice(practice,q.id,q.answer);assert.equal(currentPracticeItem(practice),null);assert.equal(review[0].correct,false);
const absent=['src/diffusion-stencil.mjs','courses/diffusion-stencil.json','courses/diffusion-stencil-lab.html'].map(p=>({path:p,absent:!fs.existsSync(new URL('./source/'+p,import.meta.url))}));assert.ok(absent.every(x=>x.absent));
console.log(JSON.stringify({native:process.version,deck:deck.title,questions:asked.size,review:review.length,practice:practice.answers.length,absent}));
