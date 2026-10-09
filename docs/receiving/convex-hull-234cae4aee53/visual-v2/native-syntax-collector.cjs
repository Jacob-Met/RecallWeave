const c=require('node:crypto'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const inputs=JSON.parse(process.argv[1]),sha=b=>c.createHash('sha256').update(b).digest('hex');
const ui=inputs.find(x=>x.path==='src/convex-hull-ui.mjs');
const page=inputs.find(x=>x.path==='courses/convex-hull-explorer.html');
const marker='<script type="module">\n',start=page.content.indexOf(marker);
assert(start>=0);assert.equal(page.content.split(marker).length,2);
const finish=page.content.lastIndexOf('</script>');assert(finish>start);
const script=page.content.slice(start+marker.length,finish),rows=[];
for(const item of [{name:'ordinary-ui-module',source:ui.content},{name:'generated-page-module',source:script}]){
 const begun=new Date().toISOString(),result=spawnSync(process.execPath,['--check','--input-type=module'],{input:Buffer.from(item.source),timeout:10000,maxBuffer:1024*1024,env:{...process.env,NODE_OPTIONS:'',NODE_COMPILE_CACHE:'',NODE_V8_COVERAGE:''}});
 const stdout=result.stdout??Buffer.alloc(0),stderr=result.stderr??Buffer.alloc(0);
 rows.push({name:item.name,argv:[process.execPath,'--check','--input-type=module'],stdinBytes:Buffer.byteLength(item.source),stdinSha256:sha(Buffer.from(item.source)),startedAt:begun,finishedAt:new Date().toISOString(),exitCode:result.status,signal:result.signal,error:result.error?{name:result.error.name,message:result.error.message,code:result.error.code}:null,stdout:{bytes:stdout.length,base64:stdout.toString('base64'),sha256:sha(stdout)},stderr:{bytes:stderr.length,base64:stderr.toString('base64'),sha256:sha(stderr)}});
 if(result.status!==0||result.signal||result.error)break;
}
console.log(JSON.stringify({schema:'recallweave.convex-hull.visual-native-syntax/1',runtime:{execPath:process.execPath,version:process.version,platform:process.platform,arch:process.arch},sourceFiles:inputs.map(x=>({path:x.path,bytes:Buffer.byteLength(x.content),sha256:sha(Buffer.from(x.content))})),checks:rows,productCodeExecuted:false,nativeBuilderExecuted:false,browserExecuted:false}));
process.exitCode=rows.length===2&&rows.every(x=>x.exitCode===0&&!x.signal&&!x.error)?0:1;
