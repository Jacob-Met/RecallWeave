import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const input=JSON.parse(process.argv[1]);
const bytes=Buffer.from(input.model.content,'utf8');
assert.equal(createHash('sha256').update(bytes).digest('hex'),input.model.sha256);
const model=await import('data:text/javascript;base64,'+bytes.toString('base64'));
const rows=[];
const normalized=s=>s.includes('/')?s:s+'/1';
const fieldMap={
 decimalIntent:'exact_intended_result',
 storedOperandArithmetic:'exact_stored_input_result',
 actual:'exact_binary64_result',
 conversionContribution:'input_conversion_contribution',
 arithmeticContribution:'operation_rounding_contribution',
 totalDiscrepancy:'total_error'
};
for(const expected of input.oracle.cases) {
 const [a,b]=expected.inputs;
 const record=model.analyzeDecimalOperation(a,expected.operation,b);
 const serialized=model.serializeWorkedExample(a,expected.operation,b);
 assert.equal(serialized.endsWith('\n'),true);
 assert.deepEqual(JSON.parse(serialized),record);
 for(const [field,key] of Object.entries(fieldMap))
   assert.equal(record.result[field].fraction,normalized(expected[key]),expected.id+' '+field);
 assert.equal(record.result.bits,expected.javascript.bits);
 assert.equal(record.result.display,expected.javascript.text);
 assert.equal(record.result.isSafeInteger,expected.javascript.safeInteger);
 assert.equal(record.result.exactMatch,expected.total_error==='0');
 assert.equal(record.identityVerified,true);
 assert.equal(record.a.input,a);assert.equal(record.b.input,b);
 rows.push({id:expected.id,record,serialized});
}
console.log(JSON.stringify({model_sha256:input.model.sha256,cases:rows.length,all_pre_frozen_oracle_fields_match:true,results:rows}));
