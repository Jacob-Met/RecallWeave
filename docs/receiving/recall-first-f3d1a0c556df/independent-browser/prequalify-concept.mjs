import fs from 'node:fs';
import {parseDeck} from './base-src-deck.mjs';
const deck=parseDeck(fs.readFileSync(new URL('./fixtures/long-unbroken-concept80.json',import.meta.url),'utf8'));
const receipt={fixture:'long-unbroken-concept80.json',valid:true,concept_length:deck.concepts[0].length};
fs.writeFileSync(new URL('./concept-prequalification.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
