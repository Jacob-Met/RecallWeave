import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const metadata={title:'  Independent CSV / 雪  ',attribution:'Original independent fixture.\nNo teacher data.',license:'Synthetic receiving only.'};
export const headers=['prerequisites','explanation','option_6','id','prompt','option_2','transfer','correct_option','option_5','concept','option_1','option_4','option_3'];
export const fixture=[
 {id:'0007',concept:'Foundations',prompt:'Quoted "comma, record"\r\nLiteral <img src=x onerror="window.__csvProbe=1"> & end',options:['keep',' change '],answer:1,explanation:'Line one\r\nLine two\nfinal',transfer:'Compare x,y < b',prerequisites:[]},
 {id:'__proto__',concept:'Graphs',prompt:'Literal [a-z]+ ||, never a pattern',options:['α','β','γ','δ','ε','ζ'],answer:5,explanation:'Sixth, exactly.',transfer:'Retain the option identity.',prerequisites:['Foundations']},
 {id:'constructor',concept:'Foundations',prompt:'Numeric identifiers are text',options:['001','1',' 1 '],answer:0,explanation:'Keep leading zeroes and spaces.',transfer:'Describe an exact identifier.',prerequisites:[]},
 {id:'雪-4',concept:'Finish',prompt:'Connect two earlier ideas.',options:['return','continue','break','throw'],answer:2,explanation:'The third option is authored as correct.',transfer:'List both links.',prerequisites:['Graphs','Foundations']}
];
export function csvCell(v){return '"'+String(v).replaceAll('"','""')+'"';}
export function rowsFor(items){return items.map(q=>({id:q.id,concept:q.concept,prompt:q.prompt,option_1:q.options[0],option_2:q.options[1],option_3:q.options[2]??'',option_4:q.options[3]??'',option_5:q.options[4]??'',option_6:q.options[5]??'',correct_option:String(q.answer+1),explanation:q.explanation,transfer:q.transfer,prerequisites:JSON.stringify(q.prerequisites)}));}
export function makeCsv(rows,cols=headers,eol='\r\n',bom=false){return (bom?'\uFEFF':'')+[cols,...rows.map(row=>cols.map(k=>row[k]??''))].map(r=>r.map(csvCell).join(',')).join(eol)+eol;}
export function rawDeck(items=fixture,meta=metadata){return {format:'recallweave-deck/1',...meta,concepts:[...new Set(items.map(x=>x.concept))],items:structuredClone(items)};}
export function identity(text){const b=Buffer.from(text);return{bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};}
function deepFrozen(deck){assert(Object.isFrozen(deck));assert(Object.isFrozen(deck.items));assert(Object.isFrozen(deck.concepts));for(const q of deck.items){assert(Object.isFrozen(q));assert(Object.isFrozen(q.options));assert(Object.isFrozen(q.prerequisites));}}
export async function makeOracle(source){
 const shared=path.resolve(source,'src/deck.mjs'),raw=fs.readFileSync(shared);
 assert.equal(createHash('sha256').update(raw).digest('hex'),'621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b');
 const native=await import(pathToFileURL(shared).href);
 const expected=native.parseDeck(native.serializeDeck(rawDeck()));
 assert.deepEqual(expected.items.map(x=>x.id),['0007','__proto__','constructor','雪-4']);
 assert.deepEqual(expected.items.map(x=>x.answer),[1,5,0,2]);
 assert.deepEqual(expected.concepts,['Foundations','Graphs','Finish']);
 return {native,expected,json:native.serializeDeck(expected),csv:makeCsv(rowsFor(fixture),headers,'\r\n',true),primary:identity(raw)};
}
export async function run(source,output,phase){
 const oracle=await makeOracle(source), results=[];
 const modulePath=path.resolve(source,'src/course-csv.mjs');
 const converter=fs.existsSync(modulePath)?(await import(pathToFileURL(modulePath).href)).convertCourseCsv:null;
 let assertions=0;
 function need(){assert.equal(typeof converter,'function','Independent before: CSV converter capability is absent.');}
 function accepts(text,meta=metadata,expected=oracle.json){need();const before=JSON.stringify(meta),out=converter(text,meta);assert(Object.isFrozen(out));assert.equal(typeof out.json,'string');assert.equal(out.json,expected);assert.deepEqual(out.deck,oracle.native.parseDeck(expected));assert.equal(out.json,oracle.native.serializeDeck(out.deck));deepFrozen(out.deck);assert.equal(JSON.stringify(meta),before);assertions++;return out;}
 function refuses(text,meta=metadata){need();let error;try{converter(text,meta);}catch(e){error=e;}assert(error instanceof Error,'The complete invalid conversion must refuse.');assert(error.message.length>0);assertions++;}
 async function group(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:String(e.stack||e)});}}
 await group('primary native checked-deck and manual identity control',()=>{assert.equal(oracle.expected.items.length,4);deepFrozen(oracle.expected);assert.equal(oracle.expected.items[0].prompt,fixture[0].prompt);assert.equal(oracle.expected.items[0].explanation,fixture[0].explanation);assert.equal(oracle.json.endsWith('\n'),true);});
 await group('primary native invalid graph control',()=>{const d=rawDeck();d.items[0].prerequisites=['Finish'];assert.throws(()=>oracle.native.parseDeck(JSON.stringify(d)),/cycle/);});
 await group('permuted BOM CSV preserves all exact fields and answers',()=>accepts(oracle.csv));
 await group('LF and CRLF record endings preserve internal field endings',()=>{for(const eol of ['\n','\r\n'])accepts(makeCsv(rowsFor(fixture),headers,eol));});
 const minimalHeaders=['id','concept','prompt','option_1','option_2','correct_option','explanation','transfer'];
 const one=[{id:'A',concept:'C',prompt:'P',options:['yes','no'],answer:0,explanation:'E',transfer:'T',prerequisites:[]}];
 const oneRows=rowsFor(one),oneJson=oracle.native.serializeDeck(rawDeck(one));
 await group('minimum headers and optional prerequisites preserve native empty list',()=>accepts(makeCsv(oneRows,minimalHeaders),metadata,oneJson));
 await group('mixed two through six options omit only trailing empty cells',()=>{const out=accepts(oracle.csv);assert.deepEqual(out.deck.items.map(q=>q.options.length),[2,6,3,4]);});
 await group('case-sensitive IDs concepts and option text remain distinct',()=>{const q=structuredClone(one);q.push({...structuredClone(q[0]),id:'a',concept:'c',options:['A','a']});accepts(makeCsv(rowsFor(q)),metadata,oracle.native.serializeDeck(rawDeck(q)));});
 await group('return and nested native data are frozen',()=>{const out=accepts(oracle.csv);assert.throws(()=>{out.deck.items[0].options.push('mutate');},TypeError);assert.throws(()=>{out.json='changed';},TypeError);assert.equal(accepts(oracle.csv).json,oracle.json);});
 await group('all required headers are required',()=>{for(const h of minimalHeaders)refuses(makeCsv(oneRows,minimalHeaders.filter(x=>x!==h)));});
 await group('duplicate unknown case-changed and gapped headers refuse',()=>{for(const h of [[...headers,'id'],[...headers,'extra'],headers.map(x=>x==='id'?'ID':x),minimalHeaders.concat('option_4'),minimalHeaders.concat('option_3','option_5'),headers.concat('option_3')])refuses(makeCsv(rowsFor(fixture),h));});
 await group('short extra and malformed later records cannot partially convert',()=>{const base=makeCsv(oneRows,minimalHeaders);refuses(base+'a,b\n');refuses(base+'"a","b","c","d","e","f","g","h","extra"\n');refuses(base+'"unterminated\n');});
 await group('strict quote and record grammar',()=>{const valid=makeCsv(oneRows,minimalHeaders);for(const text of ['',minimalHeaders.join(',')+'\n',valid+'\n',valid.replace('\r\n','\r'),valid.replace('"A"','A"B'),valid.replace('"A"','"A"x'),'\uFEFF'+ '\uFEFF'+valid])refuses(text);});
 await group('required and internal option gaps refuse without trimming',()=>{for(const edit of [{option_1:''},{option_2:''},{option_3:'',option_4:'later'},{option_3:'   '}])refuses(makeCsv([{...oneRows[0],...edit}]));});
 await group('answer syntax is exactly one supported ASCII digit',()=>{for(const value of ['0','7',' 1','1 ','1.0','01','+1','１','-1','a','','"1"'])refuses(makeCsv([{...oneRows[0],correct_option:value}]));refuses(makeCsv([{...oneRows[0],correct_option:'3'}]));});
 await group('prerequisite JSON and native graph constraints refuse',()=>{for(const value of ['null','{}','[','[1]','["missing"]','["C"]','["C","C"]'])refuses(makeCsv([{...oneRows[0],prerequisites:value}]));const rows=rowsFor(fixture);rows[0].prerequisites='["Finish"]';refuses(makeCsv(rows));});
 await group('duplicate question IDs and native duplicate options refuse',()=>{const rows=rowsFor(fixture);rows[1].id=rows[0].id;refuses(makeCsv(rows));refuses(makeCsv([{...oneRows[0],option_2:oneRows[0].option_1}]));});
 await group('native exact field bounds and explicit metadata are retained',()=>{for(const [key,limit] of [['title',160],['attribution',2000],['license',2000]]){const m={...metadata,[key]:'x'.repeat(limit)};accepts(makeCsv(oneRows,minimalHeaders),m,oracle.native.serializeDeck(rawDeck(one,m)));refuses(makeCsv(oneRows,minimalHeaders),{...m,[key]:'x'.repeat(limit+1)});refuses(makeCsv(oneRows,minimalHeaders),{...metadata,[key]:'  '});}for(const [key,limit]of [['id',80],['concept',80],['prompt',2000],['explanation',4000],['transfer',2000],['option_1',1000]])refuses(makeCsv([{...oneRows[0],[key]:'x'.repeat(limit+1)}]));});
 const hundred=Array.from({length:100},(_,i)=>({...structuredClone(one[0]),id:String(i).padStart(3,'0'),concept:'C'+(i%32)}));
 await group('100 questions and 32 first-seen concepts are fully retained',()=>{const out=accepts(makeCsv(rowsFor(hundred)),metadata,oracle.native.serializeDeck(rawDeck(hundred)));assert.equal(out.deck.items.length,100);assert.equal(out.deck.concepts.length,32);});
 await group('question and concept counts beyond native bounds refuse',()=>{refuses(makeCsv(rowsFor([...hundred,{...one[0],id:'extra'}])));refuses(makeCsv(rowsFor(hundred.map((q,i)=>({...q,concept:'C'+(i%33)}))))});
 const cap=oracle.native.MAX_DECK_BYTES;
 let inputRows=structuredClone(oneRows);inputRows[0].prerequisites='[]';let exactInput=makeCsv(inputRows);
 inputRows[0].prerequisites='['+' '.repeat(cap-Buffer.byteLength(exactInput))+']';exactInput=makeCsv(inputRows);
 assert.equal(Buffer.byteLength(exactInput),cap);
 await group('valid exact input byte cap admits and one extra byte refuses',()=>{accepts(exactInput,metadata,oneJson);const larger=exactInput.replace('['+' '.repeat(20),'['+' '.repeat(21));assert.equal(Buffer.byteLength(larger),cap+1);refuses(larger);});
 let lo=0,hi=2000;
 function largeDeck(n){return hundred.map(q=>({...q,prompt:'雪'.repeat(n)}));}
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(Buffer.byteLength(oracle.native.serializeDeck(rawDeck(largeDeck(mid))))<=cap)lo=mid;else hi=mid-1;}
 const large=largeDeck(lo);let exactJson=oracle.native.serializeDeck(rawDeck(large));large[0].prompt+='X'.repeat(cap-Buffer.byteLength(exactJson));exactJson=oracle.native.serializeDeck(rawDeck(large));
 assert.equal(Buffer.byteLength(exactJson),cap);const exactOutputCsv=makeCsv(rowsFor(large));assert(Buffer.byteLength(exactOutputCsv)<cap);
 await group('exact native serialized output byte cap admits and one extra byte refuses',()=>{accepts(exactOutputCsv,metadata,exactJson);const overflow=structuredClone(large);overflow[0].prompt+='X';assert.equal(Buffer.byteLength(oracle.native.serializeDeck(rawDeck(overflow))),cap+1);const input=makeCsv(rowsFor(overflow));assert(Buffer.byteLength(input)<cap);refuses(input);});
 await group('invalid types cannot become implicit text or inferred metadata',()=>{for(const v of [null,undefined,{},[],123])refuses(v);for(const v of [null,undefined,{}, {title:metadata.title,attribution:metadata.attribution}])refuses(oracle.csv,v);});
 const source=[{path:'src/deck.mjs',...identity(fs.readFileSync(path.resolve(sourceDirPlaceholder(source),'src/deck.mjs')))}];
 if(fs.existsSync(modulePath))source.push({path:'src/course-csv.mjs',...identity(fs.readFileSync(modulePath))});
 const receipt={schema:'recall-csv-root-native.v1',phase,at:new Date().toISOString(),node:process.version,platform:process.platform,source,oracle:{csv:identity(oracle.csv),json:identity(oracle.json),answer_indices:[1,5,0,2],concept_order:['Foundations','Graphs','Finish'],input_cap:identity(exactInput),output_cap:identity(exactJson),output_cap_csv:identity(exactOutputCsv)},groups:results,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,successful_converter_observations:assertions};
 if(output){fs.mkdirSync(output,{recursive:false});fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');fs.writeFileSync(path.join(output,'independent-question-bank.csv'),oracle.csv);fs.writeFileSync(path.join(output,'expected-deck.json'),oracle.json);}
 console.log(JSON.stringify(receipt));return receipt;
}
function sourceDirPlaceholder(value){return value;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
 const result=await run(arg('--source','/tmp/ultra-20b27c2e-memory-recall-csv/baseline'),arg('--output',null),arg('--phase','baseline'));
 process.exitCode=result.failed?1:0;
}
