import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, writeFileSync, readFileSync, lstatSync, readdirSync, symlinkSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = mkdtempSync(join(tmpdir(), 'recall-negative-cli-'));
const cli = fileURLToPath(new URL('../tools/negative-weight-paths.mjs', import.meta.url));
const source = fileURLToPath(new URL('../src/negative-weight-paths.mjs', import.meta.url));
const fixture = name => readFileSync(new URL('../examples/negative-weight-paths/' + name + '.json', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBefore = [cli,source].map(path => [path, hash(readFileSync(path))]);
function put(name, bytes) { const path=join(root,name);writeFileSync(path,bytes,{flag:'wx',mode:0o600});return path; }
function identity(path) {
  const s=lstatSync(path,{bigint:true});
  return {bytes:hash(readFileSync(path)),dev:s.dev,ino:s.ino,size:s.size,mtimeNs:s.mtimeNs,mode:s.mode};
}
function run(args, input) {
  const before = readdirSync(root).sort();
  const r = spawnSync(process.execPath, [cli,...args], {input,timeout:10000,maxBuffer:512*1024,encoding:'utf8'});
  assert.equal(r.error, undefined, 'native CLI must finish within its containment deadline');
  assert.equal(r.signal, null);
  assert.deepEqual(readdirSync(root).sort(), before, 'CLI creates no fixture or output files');
  for (const [path, digest] of sourceBefore) assert.equal(hash(readFileSync(path)), digest);
  return r;
}
const finite = put('finite.json',fixture('finite'));
const mixed = fixture('reachable-cycle');

test('native file, stdin and human reports are actual admitted consumer outputs', () => {
  const before=identity(finite);
  const file=run(['--graph',finite,'--json']);
  assert.equal(file.status,0);assert.equal(file.stderr,'');
  const report=JSON.parse(file.stdout);
  assert.equal(report.results.T.distance,1);
  assert.deepEqual(report.results.T.path,['S','A','T']);
  const stdin=run(['--stdin','--json'],mixed);
  assert.equal(stdin.status,0);assert.equal(stdin.stderr,'');
  const r=JSON.parse(stdin.stdout);
  assert.deepEqual(r.witnesses,['A','T']);
  assert.deepEqual(r.affected,['A','B','T']);
  assert.equal(r.results.U.distance,7);
  const human=run(['--graph',finite]);
  assert.equal(human.status,0);assert.match(human.stdout,/T: finite 1 via S → A → T/);
  assert.deepEqual(identity(finite),before);
  const help=run(['--help']);
  assert.equal(help.status,0);assert.match(help.stdout,/--stdin/);
});
test('native usage/admission failures have no partial report or input mutations', () => {
  const invalidUtf8=put('invalid-utf8.json',Buffer.from([0xc3,0x28]));
  const oversized=put('oversized.json',Buffer.alloc(32769,0x20));
  const invalid=put('invalid.json','{"nodes":["S"],"edges":[],"source":"S","extra":1}');
  const paths=[finite,invalidUtf8,oversized,invalid];
  const before=paths.map(identity);
  const cases=[
    {args:[]},
    {args:['--graph',finite,'--stdin']},
    {args:['--stdin','--json','--json'],input:fixture('finite')},
    {args:['--graph']},
    {args:['--help','--json']},
    {args:['--graph',root]},
    {args:['--graph',invalidUtf8]},
    {args:['--graph',oversized]},
    {args:['--graph',invalid]},
    {args:['--stdin'],input:'{'},
    {args:['--stdin'],input:Buffer.alloc(32769,0x20)}
  ];
  for(const c of cases){const r=run(c.args,c.input);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/negative-weight-paths:/);}
  assert.deepEqual(paths.map(identity),before);
});
test('native symlink and FIFO admission refuses without opening a blocking stream', {skip:process.platform==='win32'}, () => {
  const link=join(root,'linked.json');symlinkSync(finite,link);
  const fifo=join(root,'pipe.json');
  const mk=spawnSync('mkfifo',[fifo],{timeout:2000,encoding:'utf8'});
  assert.equal(mk.error,undefined);assert.equal(mk.status,0,'POSIX receiver requires existing mkfifo');
  const before=identity(finite), linkBefore=lstatSync(link,{bigint:true}), fifoBefore=lstatSync(fifo,{bigint:true});
  for(const path of [link,fifo]){const r=run(['--graph',path]);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,/nonsymlink regular file/);}
  assert.deepEqual(identity(finite),before);
  assert.equal(lstatSync(link,{bigint:true}).ino,linkBefore.ino);
  assert.equal(lstatSync(fifo,{bigint:true}).ino,fifoBefore.ino);
});
