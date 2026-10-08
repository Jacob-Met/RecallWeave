import {createHash} from 'node:crypto';
const p=JSON.parse(process.argv[1]);
const hash=(s,algorithm='sha256')=>createHash(algorithm).update(s).digest('hex');
const gitBlob=s=>createHash('sha1').update('blob '+Buffer.byteLength(s)+'\0').update(s).digest('hex');
const source={bytes:Buffer.byteLength(p.core),sha256:hash(p.core),blob:gitBlob(p.core)};
const receiver={bytes:Buffer.byteLength(p.receiver),sha256:hash(p.receiver)};
if(source.bytes!==5564 || source.sha256!=='0b1f9edeb1d490f3b7961b6f24d7ca87bbbfcaaaa0e1a1bb7a962f226b6bffa9' ||
   source.blob!=='fc90571541ee46587d59903fc941d50b5c4a38f0') throw Error('core pin mismatch');
if(receiver.bytes!==12305 || receiver.sha256!=='98c85836972d6ecfef442ff0ac9c577c86d4a99900760a133c393e796fe95fcc') throw Error('receiver pin mismatch');
const began=new Date().toISOString();
const core=await import('data:text/javascript;base64,'+Buffer.from(p.core).toString('base64'));
const oracle=await import('data:text/javascript;base64,'+Buffer.from(p.receiver).toString('base64'));
let lastCall=null,invocations=0;
const api=Object.fromEntries(['analyzeHull','parseHullPoints','serializeHullRecord'].map(name=>[name,(...args)=>{
  invocations++; lastCall={name,args}; return core[name](...args);
}]));
let result;
try { result={status:'passed',...oracle.receiveHull(api)}; }
catch(error) { result={status:'failed',error:{name:error.name,message:error.message,
  stack:error.stack,actual:error.actual,expected:error.expected},lastCall}; process.exitCode=1; }
console.log(JSON.stringify({format:'hull-independent-native-result/1',runtime:{node:process.version,platform:process.platform,arch:process.arch},
  began,ended:new Date().toISOString(),source,receiver,invocations,result,
  sourceAfter:{sha256:hash(p.core),blob:gitBlob(p.core)},receiverAfter:hash(p.receiver),
  boundary:'Exact source data URLs in native Node; no import rewriting, filesystem source loading, browser, or Actions.'}));
