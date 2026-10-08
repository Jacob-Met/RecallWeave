import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import crypto from 'node:crypto';
import {parseDeck} from './base-src-deck.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),expected=JSON.parse(fs.readFileSync(path.join(root,'expected.json'),'utf8')),receipt={source:'unchanged canonical validator only',candidateSeen:false,at:new Date().toISOString(),cases:[]};
for(const [expect,names] of [[true,expected.valid_files],[false,expected.invalid_files]])for(const name of names){
 const bytes=fs.readFileSync(path.join(root,'fixtures',name));let accepted=false,error=null,result=null;
 try{result=parseDeck(new TextDecoder('utf-8',{fatal:true}).decode(bytes));accepted=true;}catch(e){error=e.message;}
 if(accepted!==expect)throw Error('Fixture classification mismatch: '+name+' '+error);
 receipt.cases.push({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),accepted,error,itemIds:result?.items.map(x=>x.id)});
}
receipt.passed=true;fs.writeFileSync(path.join(root,'fixture-prequalification.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,cases:receipt.cases.length,node:process.version,receiptSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'fixture-prequalification.json'))).digest('hex')}));
