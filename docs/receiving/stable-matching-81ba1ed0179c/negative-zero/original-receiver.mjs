import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {traceStableMatching} from '/home/jacob/recall-stable-matching-81ba1ed0179c/source/src/stable-matching.mjs';
const path='/home/jacob/recall-stable-matching-81ba1ed0179c/source/src/stable-matching.mjs';
const profile={leftPreferences:[[-0]],rightPreferences:[[0]],proposingSide:'left'};
const result=traceStableMatching(profile);
let roundTripError=null;
try{assert.deepEqual(JSON.parse(JSON.stringify(result)),result);}catch(error){roundTripError={name:error.name,code:error.code,message:error.message};}
const receipt={at:new Date().toISOString(),sourceSha256:createHash('sha256').update(await readFile(path)).digest('hex'),inputNegativeZeroAdmitted:true,outputRetainsNegativeZero:Object.is(result.profile.leftPreferences[0][0],-0),jsonRoundTripExact:roundTripError===null,roundTripError};
await writeFile('/home/jacob/recall-stable-matching-81ba1ed0179c/evidence/negative-zero-r1.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt));
