import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import * as model from './candidate-core-fd27.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const sha = x => createHash('sha256').update(x).digest('hex');
const primaryBytes = await readFile(join(here, 'oracle_vectors.json'));
assert.equal(sha(primaryBytes), '901b83a0eaf12074f424085dafffec41da062c6c35dc2ae9647bdb6dc5174fbf');
const nearBytes = await readFile(join(here, 'near-independence-before-source.json'));
assert.equal(sha(nearBytes), '8a55f7040bd5d61fb7cf44526f464579baf0a68c59ea538a78c281bcf32f827b');
const primary = JSON.parse(primaryBytes), near = JSON.parse(nearBytes);
const acceptance = JSON.parse(await readFile(join(here,'acceptance_before_source.json')));
const matrixCases = [...primary.cases, ...near.cases];
const maxima = {};
let assertions = 0;
function exact(a,b,label) { assertions++; assert.deepEqual(a,b,label); }
function bits(a,b,label,tolerance=5e-13) {
  assertions++;
  assert.equal(typeof a, 'number', label+' number');
  assert(Number.isFinite(a), label+' finite');
  const expected=Number(b), error=Math.abs(a-expected),group=label.replace(/^[^:]+:/,'');
  if (!maxima[group] || maxima[group].error<error) maxima[group]={error,actual:a,expected};
  assert(error<=tolerance,label+': actual='+a+', expected='+expected+', absolute error='+error);
}
function fraction(a,b,label) {
  exact(Number.isSafeInteger(a.numerator),true,label+' numerator');
  exact(Number.isSafeInteger(a.denominator)&&a.denominator>0,true,label+' denominator');
  exact(a.numerator*b.denominator,b.numerator*a.denominator,label+' exact fraction');
  bits(a.value,b.numerator/b.denominator,label+' approximate value',2e-15);
}
function condition(actual, expected, weight, total, label) {
  if (!expected.givenCount) {
    exact(actual.defined,false,label+' undefined');
    exact(actual.probabilities,null,label+' distribution');
    exact(actual.entropyBits,null,label+' entropy');
    exact(actual.weightedEntropyBits,0,label+' zero weight');
  } else {
    exact(actual.defined,true,label+' defined');
    exact(actual.probabilities.length,expected.distribution.length,label+' all values');
    expected.distribution.forEach((p,i)=>fraction(actual.probabilities[i],p,label+' p'+i));
    bits(actual.entropyBits,expected.entropyBits,label+' conditional bits');
    bits(actual.weightedEntropyBits,(weight/total)*Number(expected.entropyBits),label+' weighted conditional bits');
  }
}
function frozen(value,label) {
  if (value && typeof value==='object') {
    exact(Object.isFrozen(value),true,label+' frozen');
    Object.entries(value).forEach(([k,v])=>frozen(v,label+'.'+k));
  }
}
const metricKeys={hX:'entropyXBits',hY:'entropyYBits',hXY:'jointEntropyBits',
  hYGivenX:'conditionalYGivenXBits',hXGivenY:'conditionalXGivenYBits',mutualInformation:'mutualInformationBits'};
const passed=[];
let failure=null;
try {
  for (const test of matrixCases) {
    const e=test.expected,input=structuredClone(e.counts),original=JSON.stringify(input);
    const a=model.analyzeInformationTable(input),name=test.name+':';
    exact(JSON.stringify(input),original,name+' input untouched');
    exact(a.counts,e.counts,name+' complete counts');
    exact(a.total,e.total,name+' total');
    exact(a.rows.length,e.rowCount,name+' row count');
    exact(a.columns.length,e.columnCount,name+' column count');
    exact(a.cells.length,e.cells.length,name+' all cells');
    exact(a.independence.exact,e.independentExactly,name+' exact independence');
    const differences=e.cells.filter(c=>c.crossProducts[0]!==c.crossProducts[1]).map(c=>({
      row:c.row,column:c.column,jointCrossProduct:c.crossProducts[0],marginalCrossProduct:c.crossProducts[1],
      difference:c.crossProducts[0]-c.crossProducts[1]}));
    exact(a.independence.factorizationDifferences,differences,name+' all exact differences');
    a.rows.forEach((row,i)=>{
      exact(row.count,e.rowTotals[i],name+' row count'+i);
      exact(row.label,'X'+(i+1),name+' row label'+i);
      fraction(row.probability,e.rowProbabilities[i],name+' marginal X'+i);
      condition(row.conditionalY,e.yGivenX[i],e.rowTotals[i],e.total,name+' Y|X'+i);
    });
    a.columns.forEach((col,i)=>{
      exact(col.count,e.columnTotals[i],name+' column count'+i);
      exact(col.label,'Y'+(i+1),name+' column label'+i);
      fraction(col.probability,e.columnProbabilities[i],name+' marginal Y'+i);
      condition(col.conditionalX,e.xGivenY[i],e.columnTotals[i],e.total,name+' X|Y'+i);
    });
    a.cells.forEach((cell,i)=>{
      const ref=e.cells[i];
      exact([cell.row,cell.column,cell.count],[ref.row,ref.column,ref.count],name+' cell identity'+i);
      exact([cell.jointCrossProduct,cell.marginalCrossProduct],ref.crossProducts,name+' cross products'+i);
      exact(cell.zeroProbability,ref.zeroCell,name+' zero flag'+i);
      fraction(cell.probability,ref.jointProbability,name+' joint p'+i);
      fraction(cell.independentProbability,ref.independentProductProbability,name+' product p'+i);
      if (ref.zeroCell) {
        exact(cell.surprisalBits,null,name+' zero surprisal'+i);
        exact(cell.pointwiseInformationBits,null,name+' zero pointwise'+i);
        exact(cell.entropyContributionBits,0,name+' zero entropy term'+i);
        exact(cell.signedContributionBits,0,name+' zero signed MI term'+i);
      } else {
        bits(cell.surprisalBits,ref.surprisalBits,name+' surprisal'+i);
        bits(cell.pointwiseInformationBits,ref.pointwiseMutualInformationBits,name+' pointwise MI'+i);
        bits(cell.entropyContributionBits,ref.entropyContributionBits,name+' entropy term'+i);
        bits(cell.signedContributionBits,ref.mutualInformationContributionBits,name+' signed MI term'+i);
      }
      exact(Number.isFinite(cell.stabilizedContributionBits)&&cell.stabilizedContributionBits>=0,true,name+' stable nonnegative contribution'+i);
    });
    for(const [reference,key] of Object.entries(metricKeys))bits(a.metrics[key],e.metrics[reference],name+key);
    bits(a.metrics.signedContributionSumBits,e.metrics.mutualInformation,name+' raw signed MI sum');
    if(test.name.startsWith('near_independent')){
      assert(a.metrics.mutualInformationBits>0,name+' positive unrounded MI');
      const relative=Math.abs(a.metrics.mutualInformationBits/Number(e.metrics.mutualInformation)-1);
      assert(relative<1e-12,name+' stable near-independent relative error '+relative);
    }
    frozen(a,name+' output');
    input[0][0]=input[0][0]===999?0:999;
    exact(a.counts,e.counts,name+' detached');
    assert.throws(()=>{a.counts[0][0]=17;},TypeError);
    assert.throws(()=>{a.metrics.mutualInformationBits=100;},TypeError);
    passed.push(test.name);
  }
  for(const invalid of primary.invalidJSONMatrices) assert.throws(()=>model.analyzeInformationTable(invalid),RangeError);
  const extraInvalid=[[[NaN,0],[0,1]],[[Infinity,0],[0,1]],[[1,,],[0,1]],new Uint8Array([1,1,1,1])];
  for(const invalid of extraInvalid)assert.throws(()=>model.analyzeInformationTable(invalid),RangeError);
  for(const text of acceptance.parser.valid){
    const result=model.parseInformationCounts(text);frozen(result,'parser output');
    model.analyzeInformationTable(result);
  }
  for(const text of acceptance.parser.invalid)assert.throws(()=>model.parseInformationCounts(text),RangeError);
  for(const value of [null,1,{},[],true])assert.throws(()=>model.parseInformationCounts(value),RangeError);
  for(const original of primary.cases.slice(0,10)){
    const a=original.expected.counts, ref=model.analyzeInformationTable(a);
    const transposed=model.analyzeInformationTable(a[0].map((_,j)=>a.map(row=>row[j])));
    bits(transposed.metrics.entropyXBits,ref.metrics.entropyYBits,'transpose hX');
    bits(transposed.metrics.conditionalYGivenXBits,ref.metrics.conditionalXGivenYBits,'transpose condition');
    const reverse=model.analyzeInformationTable([...a].reverse().map(row=>[...row].reverse()));
    for(const key of Object.values(metricKeys))bits(reverse.metrics[key],ref.metrics[key],'relabel '+key);
    if(Math.max(...a.flat())<=333){
      const scale=model.analyzeInformationTable(a.map(row=>row.map(n=>3*n)));
      for(const key of Object.values(metricKeys))bits(scale.metrics[key],ref.metrics[key],'scale '+key);
      exact(scale.independence.exact,ref.independence.exact,'scale exact independence');
    }
  }
} catch(error) {failure={message:error.message,stack:error.stack};}
const source=await readFile(join(here,'candidate-core-fd27.mjs'));
const receipt={schema:'recallweave.information-theory.peer-oracle-challenge.v1',
 sourceSHA256:sha(source),oracleSHA256:sha(primaryBytes),nearSHA256:sha(nearBytes),
 casesPlanned:matrixCases.length,casesPassed:passed.length,passed,assertions,
 invalidMatrices:primary.invalidJSONMatrices.length+4,validParserCases:acceptance.parser.valid.length,
 invalidParserCases:acceptance.parser.invalid.length+5,manualMetamorphicCases:10,
 maxima,failure,passedAll:failure===null,
 scope:'Independent pre-source315-case90-digit oracle and frozen admission controls against exact private copy of owner first source; no product edit, browser launch or Actions.'};
console.log(JSON.stringify({passedAll:receipt.passedAll,casesPassed:passed.length,assertions,failure}));
await writeFile(join(here,'core-fd27-oracle-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
process.exitCode=failure?1:0;
