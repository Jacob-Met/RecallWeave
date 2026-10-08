import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseDeck } from "../src/deck.mjs";
import { MAX_STEPS, STATES, PRESETS, parsePercent, validateConfiguration, computeTrace,
  presetFor, absorbingStates, observationJSON } from "../courses/markov-chains-core.mjs";

const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) <= 8e-15,
  label + ": " + actual + " versus " + expected);
const vectorNear = (actual, expected, label) => actual.forEach((value, i) => near(value, expected[i], label + "[" + i + "]"));
const copy = object => JSON.parse(JSON.stringify(object));
const courseURL = new URL("../courses/markov-chains.json", import.meta.url);

// An integer-rational oracle carries all unrounded path weights over 100^(n+1).
// It never calls the production recurrence, matrix validator or normalization.
function rationalTrace(matrix, initial, steps) {
  let weights = initial.map(BigInt), denominator = 100n;
  const result = [{weights, denominator, incoming: null}];
  for (let n = 1; n <= steps; n++) {
    const incoming = [0,1,2].map(i => [0,1,2].map(j => weights[i] * BigInt(matrix[i][j])));
    weights = [0,1,2].map(j => incoming[0][j] + incoming[1][j] + incoming[2][j]);
    denominator *= 100n;
    result.push({weights, denominator, incoming});
  }
  return result;
}
test("the original fourteen-question course passes the real bounded importer and reviewed key", async () => {
  const bytes = await readFile(courseURL);
  const deck = parseDeck(bytes.toString("utf8"));
  assert.ok(bytes.byteLength <= 256 * 1024);
  assert.equal(deck.items.length, 14);
  assert.equal(deck.concepts.length, 5);
  assert.deepEqual(deck.items.map(item => [item.id,item.answer]), [
    ["mc-rule",0],["mc-row",2],["mc-valid-row",3],["mc-mixture",1],
    ["mc-two-steps",0],["mc-path-versus-endpoint",2],["mc-distribution-not-count",3],
    ["mc-step-zero",1],["mc-stationary-test",2],["mc-stationary-does-not-freeze",1],
    ["mc-alternation",0],["mc-mixing-conditions",3],["mc-absorbing",1],["mc-closed-start",2]
  ]);
  assert.match(deck.license,/CC0-1\.0/);
  assert.match(deck.attribution,/ocw\.mit\.edu/);
  assert.ok(Object.isFrozen(deck.items[0].prerequisites));
});
test("integer percentages reject malformed input instead of parsing a numeric prefix", () => {
  for (const [text,value] of [["0",0],["100",100],[" 25 ",25],["005",5]]) assert.equal(parsePercent(text),value);
  for (const bad of ["", " ", "1.5", "1e2", "+25", "-0", "-1", "101", "1000", "0x64", "20%", "NaN", "Infinity", null, undefined, 20]) {
    assert.throws(() => parsePercent(bad), /whole percentage/);
  }
});
test("matrix and initial admission reject shape, type, sparse values and wrong totals", () => {
  const valid = copy(PRESETS[0]);
  const sparse = Array(3); sparse[0] = 100;
  const variants = [
    null, {}, {...valid,matrix:[]}, {...valid,matrix:[valid.matrix[0],valid.matrix[1]]},
    {...valid,matrix:[valid.matrix[0],valid.matrix[1],Array(3)]},
    {...valid,matrix:[sparse,valid.matrix[1],valid.matrix[2]]},
    {...valid,matrix:[...valid.matrix,[100,0,0]]},
    {...valid,initial:sparse}, {...valid,initial:[100,0]}, {...valid,initial:[100,0,0,0]},
    {...valid,initial:[99,0,0]}, {...valid,initial:[101,-1,0]},
    {...valid,initial:["100",0,0]}, {...valid,initial:[NaN,0,0]},
    {...valid,initial:[Infinity,0,0]}, {...valid,initial:[50.5,49.5,0]},
    {...valid,matrix:[[50,20,20],valid.matrix[1],valid.matrix[2]]}
  ];
  const missingRow = Array(3); missingRow[0]=valid.matrix[0]; missingRow[2]=valid.matrix[2];
  variants.push({...valid,matrix:missingRow});
  for (const bad of variants) assert.throws(() => validateConfiguration(bad));
  assert.deepEqual(validateConfiguration(valid), {matrix:valid.matrix,initial:valid.initial});
});
test("every preset and independent custom system agree with exact rational weights through step 30", () => {
  const configurations = [...PRESETS,
    {matrix:[[17,28,55],[0,99,1],[63,0,37]],initial:[19,23,58]},
    {matrix:[[100,0,0],[0,100,0],[0,0,100]],initial:[33,33,34]},
    {matrix:[[0,100,0],[0,0,100],[100,0,0]],initial:[100,0,0]},
    {matrix:[[1,0,99],[23,77,0],[0,61,39]],initial:[0,1,99]}
  ];
  for (const configuration of configurations) {
    const actual = computeTrace(configuration);
    const exact = rationalTrace(configuration.matrix,configuration.initial,MAX_STEPS);
    assert.equal(actual.trace.length, 31);
    actual.trace.forEach((row,n) => {
      assert.equal(row.step,n);
      assert.equal(exact[n].weights.reduce((a,b)=>a+b),exact[n].denominator);
      row.probabilities.forEach((value,j) => near(value,Number(exact[n].weights[j])/Number(exact[n].denominator),"step "+n+" state "+j));
      if (n===0) assert.equal(row.contributions,null);
      else row.contributions.forEach((incoming,i) => incoming.forEach((value,j) =>
        near(value,Number(exact[n].incoming[i][j])/Number(exact[n].denominator),"contribution "+n+"/"+i+"/"+j)));
    });
  }
});
test("mixing has the original worked values and an independent closed-form solution", () => {
  const trace = computeTrace(PRESETS[0]).trace;
  vectorNear(trace[1].probabilities,[.6,.2,.2],"one");
  vectorNear(trace[2].probabilities,[.52,.24,.24],"two");
  vectorNear(trace[3].probabilities,[.504,.248,.248],"three");
  trace.forEach(row => vectorNear(row.probabilities,
    [.5+.5*Math.pow(.2,row.step),.25-.25*Math.pow(.2,row.step),.25-.25*Math.pow(.2,row.step)],"closed form"));
  vectorNear(computeTrace({...PRESETS[0],initial:[50,50,0]},1).trace[1].probabilities,[.5,.35,.15],"mixture");
  // The path A->B->C is one term among all paths ending in C.
  assert.equal(.2*.1,.020000000000000004);
  near(trace[2].contributions[1][2],.02,"one path");
  near(trace[2].probabilities[2],.24,"all endpoints");
});
test("alternation is periodic while its stationary distribution remains fixed", () => {
  const alternating = PRESETS.find(p=>p.id==="alternating");
  computeTrace(alternating).trace.forEach(row =>
    assert.deepEqual(row.probabilities,row.step%2 ? [0,.5,.5] : [1,0,0]));
  const stationary = {...alternating,initial:[50,25,25]};
  computeTrace(stationary).trace.forEach(row => assert.deepEqual(row.probabilities,[.5,.25,.25]));
  assert.ok(alternating.matrix.every((row,i)=>row[i]===0));
  assert.equal(presetFor(stationary).id,"alternating");
});
test("absorbing and two-closed-state systems preserve reachability and initial dependence", () => {
  const absorbing = PRESETS.find(p=>p.id==="absorbing");
  const a = computeTrace(absorbing).trace;
  assert.deepEqual(absorbingStates(absorbing),["A"]);
  assert.deepEqual(a[1].probabilities,[0,.5,.5]);
  assert.deepEqual(a[2].probabilities,[.125,.5,.375]);
  for (let n=1;n<a.length;n++) assert.ok(a[n].probabilities[0]>=a[n-1].probabilities[0]);
  assert.ok(a.at(-1).probabilities[0]<1);
  const closed=PRESETS.find(p=>p.id==="closed");
  assert.deepEqual(absorbingStates(closed),["A","B"]);
  computeTrace(closed).trace.slice(1).forEach(row=>assert.deepEqual(row.probabilities,[.4,.6,0]));
  vectorNear(computeTrace({...closed,initial:[20,30,50]},1).trace[1].probabilities,[.4,.6,0],"closed mixture");
  computeTrace({...closed,initial:[100,0,0]}).trace.forEach(row=>assert.deepEqual(row.probabilities,[1,0,0]));
  computeTrace({...closed,initial:[25,75,0]}).trace.forEach(row=>assert.deepEqual(row.probabilities,[.25,.75,0]));
});
test("step zero, bounds, copied inputs and deep immutability keep an observation coherent", () => {
  const input={matrix:[[17,28,55],[0,99,1],[63,0,37]],initial:[19,23,58]};
  const snapshot=copy(input), result=computeTrace(input,0);
  assert.equal(result.trace.length,1);
  assert.deepEqual(result.trace[0].probabilities,[.19,.23,.58]);
  input.matrix[0][0]=100; input.initial[0]=100;
  assert.deepEqual(result.config,snapshot);
  assert.throws(()=>{result.config.matrix[0][0]=100;},TypeError);
  assert.throws(()=>{result.trace[0].probabilities[0]=1;},TypeError);
  assert.throws(()=>{PRESETS[0].matrix[0][0]=0;},TypeError);
  assert.ok(Object.isFrozen(STATES));
  for(const bad of [-1,31,1.5,NaN,Infinity,"1",null]) assert.throws(()=>computeTrace(PRESETS[0],bad));
});
test("observation export binds applied inputs, selected step and full computed precision", () => {
  const result=computeTrace({matrix:[[17,28,55],[0,99,1],[63,0,37]],initial:[19,23,58]});
  const raw=observationJSON(result,17), observation=JSON.parse(raw);
  assert.ok(raw.endsWith("\n"));
  assert.equal(observation.format,"recallweave-markov-observation/1");
  assert.equal(observation.selectedStep,17);
  assert.deepEqual(observation.transitionPercent,result.config.matrix);
  assert.deepEqual(observation.initialPercent,result.config.initial);
  assert.deepEqual(observation.trace,result.trace);
  assert.equal(observation.trace.length,31);
  assert.notEqual(observation.trace[17].probabilities[0],Number(observation.trace[17].probabilities[0].toFixed(4)));
  const spoofed={config:result.config,trace:result.trace.map(row=>({...row,probabilities:[1,0,0]}))};
  assert.deepEqual(JSON.parse(observationJSON(spoofed,17)).trace,result.trace);
  for(const bad of [-1,31,1.5,NaN,"1"]) assert.throws(()=>observationJSON(result,bad));
});
test("the direct-open explorer contains exact course bytes and matches the maintained builder", async () => {
  const page=await readFile(new URL("../courses/markov-chains-explorer.html",import.meta.url),"utf8");
  const encoded=page.match(/<script id="course-data" type="application\/octet-stream">([^<]+)<\/script>/)?.[1];
  assert.ok(encoded);
  assert.deepEqual(Buffer.from(encoded,"base64"),await readFile(courseURL));
  assert.doesNotMatch(page,/<script[^>]+src=/i);
  assert.doesNotMatch(page,/\bimport\s+(?:\{|\*|["'])/);
  const processResult=spawnSync(process.execPath,[fileURLToPath(new URL("../tools/build-markov-chains.mjs",import.meta.url)),"--check"],{encoding:"utf8"});
  assert.equal(processResult.status,0,processResult.stderr);
});
