const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const custody = '/home/jacob/recallweave-offline-pack-receiver-ab529ac65023';
const root = custody + '/candidate-source-v3';
const output = custody + '/browser-v3-first';
const sourceReceipt = JSON.parse(fs.readFileSync(custody + '/source-freeze-v3.json', 'utf8'));
const record = {schema:'recallweave-offline-pack-native-controller-v1', started:new Date().toISOString(),
  pid:process.pid, root, output, sourceCommit:'87238a45b8cf9b1155fc3d0a1325c5985e3516ef',
  producerCommit:sourceReceipt.producerCommit, executable:'/snap/bin/chromium', node:process.version,
  status:'running'};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const check = (ok, message) => { if (!ok) throw new Error(message); };
const git = args => cp.execFileSync('git', args, {cwd:root, encoding:'utf8'}).trim();
let logFd;
try {
  check(sourceReceipt.status === 'passed', 'Native source preparation was not complete');
  check(git(['rev-parse','HEAD']) === record.sourceCommit, 'Frozen source commit changed');
  check(git(['status','--porcelain']) === '', 'Frozen source tree is dirty');
  for (const entry of sourceReceipt.sourcePins)
    check(hash(fs.readFileSync(root+'/'+entry.path)) === entry.sha256, 'Source changed: '+entry.path);
  const disk = fs.statfsSync(custody, {bigint:true});
  record.freeBytes = String(disk.bavail*disk.bsize);
  check(disk.bavail*disk.bsize >= 1024n**3n, 'Hold: less than 1 GiB free');
  record.availableMemoryBytes = Number(fs.readFileSync('/proc/meminfo','utf8').match(/^MemAvailable:\s+(\d+)\s+kB$/m)[1])*1024;
  check(record.availableMemoryBytes >= 512*1024*1024, 'Hold: less than 512 MiB available memory');
  check(!fs.existsSync(output), 'Receiving output already exists');
  const profilesBefore = fs.readdirSync(custody).filter(p=>p.startsWith('recallweave-offline-pack-chrome-'));
  fs.writeFileSync(custody+'/browser-v3-first-start.json',JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:420});
  logFd = fs.openSync(custody+'/browser-v3-first.log','wx',420);
  const args = [root+'/tools/check_offline_pack_browser.mjs','--root',root,'--browser',record.executable,
    '--output',output,'--emit-bundle'];
  record.command = {program:'/usr/bin/node',args};
  const result = cp.spawnSync('/usr/bin/node',args,{cwd:root,stdio:['ignore',logFd,logFd]});
  fs.fsyncSync(logFd);fs.closeSync(logFd);logFd=undefined;
  record.process = {status:result.status,signal:result.signal,error:result.error?.message};
  record.finished = new Date().toISOString();
  const log = fs.readFileSync(custody+'/browser-v3-first.log');
  record.log = {path:'browser-v3-first.log',bytes:log.length,sha256:hash(log)};
  const reportBytes = fs.readFileSync(output+'/offline-pack-receiving.json');
  const report = JSON.parse(reportBytes);
  record.report = {path:'browser-v3-first/offline-pack-receiving.json',bytes:reportBytes.length,sha256:hash(reportBytes),
    status:report.status,error:report.error,checks:report.checks,downloads:report.downloads,
    browser:report.browser,browserExit:report.browserExit,cleanupError:report.cleanupError,
    pageErrors:report.pageErrors,unexpectedRequests:report.unexpectedRequests,harnessErrors:report.harnessErrors};
  const text = log.toString('utf8');
  const begin = [...text.matchAll(/^RECALLWEAVE_OFFLINE_PACK_BUNDLE_BEGIN (.+)$/gm)];
  check(begin.length===1,'Exactly one complete packet header is required');
  const header = JSON.parse(begin[0][1]);
  const chunks = [...text.matchAll(/^RECALLWEAVE_OFFLINE_PACK_BUNDLE_CHUNK (\d+) ([A-Za-z0-9+/=]+)$/gm)];
  check(chunks.length===header.chunks,'All packet chunks must be present');
  check(chunks.every((row,index)=>Number(row[1])===index),'Packet chunks must be ordered and contiguous');
  check([...text.matchAll(/^RECALLWEAVE_OFFLINE_PACK_BUNDLE_END$/gm)].length===1,'Complete packet terminator required');
  const packetBytes = Buffer.from(chunks.map(row=>row[2]).join(''),'base64');
  check(packetBytes.length===header.bytes&&hash(packetBytes)===header.sha256,'Packet size/hash mismatch');
  check(packetBytes.length<=2*1024*1024,'Packet cap exceeded');
  const packet = JSON.parse(packetBytes);
  const seen = new Set();
  let total = 0;
  const inventory=[];
  for (const file of packet.files) {
    check(!seen.has(file.path)&&file.path&&!path.isAbsolute(file.path)&&
      !file.path.split('/').some(x=>!x||x==='.'||x==='..')&&!file.path.includes('\\'),'Invalid evidence path');
    seen.add(file.path);
    const bytes=Buffer.from(file.base64,'base64');total+=bytes.length;
    check(bytes.length===file.bytes&&hash(bytes)===file.sha256,'Packet artifact hash mismatch: '+file.path);
    check(fs.readFileSync(path.join(output,file.path)).equals(bytes),'Packet differs from retained native artifact: '+file.path);
    inventory.push({path:file.path,bytes:file.bytes,sha256:file.sha256});
  }
  check(total===header.fileBytes&&total<=2*1024*1024,'Packet file total/cap mismatch');
  fs.writeFileSync(custody+'/browser-v3-first-packet.json',packetBytes,{flag:'wx',mode:420});
  record.packet={...header,files:inventory};
  record.sourceUnchanged=sourceReceipt.sourcePins.every(entry=>hash(fs.readFileSync(root+'/'+entry.path))===entry.sha256);
  record.newProfilesRemaining=fs.readdirSync(custody).filter(p=>p.startsWith('recallweave-offline-pack-chrome-')&&!profilesBefore.includes(p));
  check(record.sourceUnchanged,'Source changed during receiving');
  check(record.newProfilesRemaining.length===0,'Owned browser profile remains');
  check(result.status===0&&report.status==='passed','Receiver reported failure; original report and log retained');
  record.status='passed';
} catch(error) {
  record.status='failed';record.controllerError=error.stack;
} finally {
  if(logFd!==undefined)fs.closeSync(logFd);
  record.controllerFinished=new Date().toISOString();
  fs.writeFileSync(custody+'/browser-v3-first-controller.json',JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:420});
  console.log(JSON.stringify({status:record.status,process:record.process,error:record.controllerError,
    reportStatus:record.report?.status,checks:record.report?.checks?.length,downloads:record.report?.downloads?.length,
    packet:record.packet?{bytes:record.packet.bytes,sha256:record.packet.sha256,files:record.packet.files.length}:undefined,
    receipt:custody+'/browser-v3-first-controller.json'}));
  process.exitCode=record.status==='passed'?0:1;
}
